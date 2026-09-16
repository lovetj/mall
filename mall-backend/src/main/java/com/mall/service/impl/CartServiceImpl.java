package com.mall.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.dto.CartDTO;
import com.mall.dto.CartVO;
import com.mall.entity.Cart;
import com.mall.entity.Product;
import com.mall.entity.ProductTier;
import com.mall.mapper.CartMapper;
import com.mall.mapper.ProductMapper;
import com.mall.mapper.ProductTierMapper;
import com.mall.service.CartService;
import com.mall.util.UrlUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CartServiceImpl extends ServiceImpl<CartMapper, Cart> implements CartService {

    @Autowired
    private CartMapper cartMapper;

    @Autowired
    private ProductMapper productMapper;

    @Autowired
    private ProductTierMapper productTierMapper;

    @Autowired
    private UrlUtil urlUtil;

    @Override
    public List<CartVO> getCartList(String userId) {
        if (userId == null) {
            return Collections.emptyList();
        }

        List<Cart> cartList = cartMapper.selectList(
                new LambdaQueryWrapper<Cart>()
                        .eq(Cart::getUserId, userId)
                        .orderByDesc(Cart::getCreateTime)
        );

        if (cartList.isEmpty()) {
            return Collections.emptyList();
        }

        List<String> productIds = cartList.stream()
                .map(Cart::getProductId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        Map<String, Product> productMap = productIds.isEmpty() ? Collections.emptyMap() :
                productMapper.selectBatchIds(productIds).stream()
                        .collect(Collectors.toMap(Product::getId, p -> p, (k1, k2) -> k1));

        List<String> tierIds = cartList.stream()
                .map(Cart::getTierId)
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.toList());

        Map<String, ProductTier> tierMap = tierIds.isEmpty() ? Collections.emptyMap() :
                productTierMapper.selectBatchIds(tierIds).stream()
                        .collect(Collectors.toMap(ProductTier::getId, t -> t, (k1, k2) -> k1));

        List<CartVO> result = new ArrayList<>();
        for (Cart cart : cartList) {
            Product product = productMap.get(cart.getProductId());
            ProductTier tier = StringUtils.hasText(cart.getTierId()) ? tierMap.get(cart.getTierId()) : null;

            CartVO vo = new CartVO();
            vo.setId(cart.getId());
            vo.setCartId(cart.getId());
            vo.setProductId(cart.getProductId());
            vo.setTierId(cart.getTierId());
            vo.setQuantity(cart.getQuantity());
            vo.setCreateTime(cart.getCreateTime());
            vo.setSelected(true);

            if (product != null) {
                vo.setName(product.getName());
                vo.setImage(product.getImage());
                vo.setPrice(product.getPrice());
                vo.setUnit(product.getUnit());
                vo.setStock(product.getStock());
                vo.setStatus(product.getStatus());

                if (tier != null) {
                    vo.setTierName(tier.getName());
                    if (tier.getPrice() != null) {
                        vo.setPrice(tier.getPrice());
                    }
                    if (StringUtils.hasText(tier.getUnit())) {
                        vo.setUnit(tier.getUnit());
                    }
                    if (tier.getStock() != null) {
                        vo.setStock(tier.getStock());
                    }
                    if (StringUtils.hasText(tier.getImage())) {
                        vo.setImage(tier.getImage());
                    }
                    if (tier.getStatus() != null && tier.getStatus() != 1) {
                        vo.setStatus(0);
                    }
                }
            } else {
                vo.setName("商品已下架或不存在");
                vo.setStatus(0);
                vo.setStock(0);
            }
            result.add(vo);
        }

        urlUtil.resolveCartVOs(result);
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void addToCart(String userId, CartDTO dto) {
        if (userId == null) {
            throw new RuntimeException("用户未登录");
        }
        if (dto.getProductId() == null) {
            throw new RuntimeException("商品ID不能为空");
        }

        Product product = productMapper.selectById(dto.getProductId());
        if (product == null) {
            throw new RuntimeException("商品不存在");
        }
        if (product.getStatus() != null && product.getStatus() != 1) {
            throw new RuntimeException("商品已下架");
        }

        String targetTierId = dto.getTierId();
        ProductTier tier = null;

        if (StringUtils.hasText(targetTierId)) {
            tier = productTierMapper.selectById(targetTierId);
            if (tier == null || !dto.getProductId().equals(tier.getProductId())) {
                throw new RuntimeException("商品规格不存在");
            }
            if (tier.getStatus() != null && tier.getStatus() != 1) {
                throw new RuntimeException("该规格已下架");
            }
        } else {
            List<ProductTier> tiers = productTierMapper.selectList(
                    new LambdaQueryWrapper<ProductTier>()
                            .eq(ProductTier::getProductId, dto.getProductId())
                            .eq(ProductTier::getStatus, 1)
                            .orderByAsc(ProductTier::getSort)
                            .orderByAsc(ProductTier::getPrice)
            );
            if (!tiers.isEmpty()) {
                tier = tiers.get(0);
                targetTierId = tier.getId();
            }
        }

        int availableStock = tier != null && tier.getStock() != null ? tier.getStock() :
                (product.getStock() != null ? product.getStock() : 0);

        int addQuantity = (dto.getQuantity() != null && dto.getQuantity() > 0) ? dto.getQuantity() : 1;

        LambdaQueryWrapper<Cart> query = new LambdaQueryWrapper<Cart>()
                .eq(Cart::getUserId, userId)
                .eq(Cart::getProductId, dto.getProductId());

        if (StringUtils.hasText(targetTierId)) {
            query.eq(Cart::getTierId, targetTierId);
        } else {
            query.isNull(Cart::getTierId);
        }

        Cart existCart = cartMapper.selectOne(query);

        if (existCart != null) {
            int newQuantity = existCart.getQuantity() + addQuantity;
            if (newQuantity > availableStock) {
                throw new RuntimeException("库存不足，当前库存: " + availableStock);
            }
            existCart.setQuantity(newQuantity);
            existCart.setUpdateTime(LocalDateTime.now());
            cartMapper.updateById(existCart);
        } else {
            if (addQuantity > availableStock) {
                throw new RuntimeException("库存不足，当前库存: " + availableStock);
            }
            Cart cart = new Cart();
            cart.setUserId(userId);
            cart.setProductId(dto.getProductId());
            cart.setTierId(targetTierId);
            cart.setQuantity(addQuantity);
            cart.setCreateTime(LocalDateTime.now());
            cart.setUpdateTime(LocalDateTime.now());
            cartMapper.insert(cart);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateQuantity(String userId, String idOrProductId, Integer quantity) {
        if (userId == null) {
            throw new RuntimeException("用户未登录");
        }
        if (idOrProductId == null) {
            throw new RuntimeException("商品或购物车项标识不能为空");
        }

        if (quantity == null || quantity <= 0) {
            deleteCartItem(userId, idOrProductId);
            return;
        }

        Cart targetCart = cartMapper.selectOne(
                new LambdaQueryWrapper<Cart>()
                        .eq(Cart::getUserId, userId)
                        .and(w -> w.eq(Cart::getId, idOrProductId)
                                .or().eq(Cart::getTierId, idOrProductId)
                                .or().eq(Cart::getProductId, idOrProductId))
        );

        if (targetCart == null) {
            throw new RuntimeException("购物车项不存在");
        }

        int availableStock = 999999;
        if (StringUtils.hasText(targetCart.getTierId())) {
            ProductTier tier = productTierMapper.selectById(targetCart.getTierId());
            if (tier != null && tier.getStock() != null) {
                availableStock = tier.getStock();
            }
        } else if (StringUtils.hasText(targetCart.getProductId())) {
            Product product = productMapper.selectById(targetCart.getProductId());
            if (product != null && product.getStock() != null) {
                availableStock = product.getStock();
            }
        }

        if (quantity > availableStock) {
            throw new RuntimeException("库存不足，当前库存: " + availableStock);
        }

        targetCart.setQuantity(quantity);
        targetCart.setUpdateTime(LocalDateTime.now());
        cartMapper.updateById(targetCart);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void changeQuantity(String userId, String idOrProductId, Integer delta) {
        if (userId == null) {
            throw new RuntimeException("用户未登录");
        }
        if (idOrProductId == null) {
            throw new RuntimeException("商品或购物车项标识不能为空");
        }
        if (delta == null || delta == 0) {
            return;
        }

        Cart existCart = cartMapper.selectOne(
                new LambdaQueryWrapper<Cart>()
                        .eq(Cart::getUserId, userId)
                        .and(w -> w.eq(Cart::getId, idOrProductId)
                                .or().eq(Cart::getTierId, idOrProductId)
                                .or().eq(Cart::getProductId, idOrProductId))
        );

        int currentQty = existCart != null ? existCart.getQuantity() : 0;
        int targetQty = currentQty + delta;

        if (targetQty <= 0) {
            if (existCart != null) {
                cartMapper.deleteById(existCart.getId());
            }
        } else {
            updateQuantity(userId, existCart != null ? existCart.getId() : idOrProductId, targetQty);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteCartItem(String userId, String idOrProductId) {
        if (userId == null) {
            throw new RuntimeException("用户未登录");
        }
        if (idOrProductId == null) {
            return;
        }
        cartMapper.delete(
                new LambdaQueryWrapper<Cart>()
                        .eq(Cart::getUserId, userId)
                        .and(w -> w.eq(Cart::getId, idOrProductId)
                                .or().eq(Cart::getTierId, idOrProductId)
                                .or().eq(Cart::getProductId, idOrProductId))
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteById(String userId, String cartId) {
        if (userId == null) {
            throw new RuntimeException("用户未登录");
        }
        if (cartId == null) {
            return;
        }
        cartMapper.delete(
                new LambdaQueryWrapper<Cart>()
                        .eq(Cart::getUserId, userId)
                        .eq(Cart::getId, cartId)
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void clearCart(String userId) {
        if (userId == null) {
            throw new RuntimeException("用户未登录");
        }
        cartMapper.delete(
                new LambdaQueryWrapper<Cart>()
                        .eq(Cart::getUserId, userId)
        );
    }

    @Override
    public Integer getCartCount(String userId) {
        if (userId == null) {
            return 0;
        }
        List<Cart> cartList = cartMapper.selectList(
                new LambdaQueryWrapper<Cart>().eq(Cart::getUserId, userId)
        );
        return cartList.stream().mapToInt(Cart::getQuantity).sum();
    }
}
