package com.mall.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.dto.CartDTO;
import com.mall.dto.CartVO;
import com.mall.service.CartService;
import com.mall.entity.Cart;
import com.mall.entity.Product;
import com.mall.mapper.CartMapper;
import com.mall.mapper.ProductMapper;
import com.mall.util.UrlUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private UrlUtil urlUtil;

    @Override
    public List<CartVO> getCartList(Long userId) {
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

        List<Long> productIds = cartList.stream()
                .map(Cart::getProductId)
                .distinct()
                .collect(Collectors.toList());

        List<Product> products = productMapper.selectBatchIds(productIds);
        Map<Long, Product> productMap = products.stream()
                .collect(Collectors.toMap(Product::getId, p -> p, (k1, k2) -> k1));

        List<CartVO> result = new ArrayList<>();
        for (Cart cart : cartList) {
            Product product = productMap.get(cart.getProductId());
            CartVO vo = new CartVO();
            vo.setId(cart.getId());
            vo.setCartId(cart.getId());
            vo.setProductId(cart.getProductId());
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
    public void addToCart(Long userId, CartDTO dto) {
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

        int addQuantity = (dto.getQuantity() != null && dto.getQuantity() > 0) ? dto.getQuantity() : 1;

        Cart existCart = cartMapper.selectOne(
                new LambdaQueryWrapper<Cart>()
                        .eq(Cart::getUserId, userId)
                        .eq(Cart::getProductId, dto.getProductId())
        );

        if (existCart != null) {
            int newQuantity = existCart.getQuantity() + addQuantity;
            if (product.getStock() != null && newQuantity > product.getStock()) {
                throw new RuntimeException("库存不足，当前库存: " + product.getStock());
            }
            existCart.setQuantity(newQuantity);
            existCart.setUpdateTime(LocalDateTime.now());
            cartMapper.updateById(existCart);
        } else {
            if (product.getStock() != null && addQuantity > product.getStock()) {
                throw new RuntimeException("库存不足，当前库存: " + product.getStock());
            }
            Cart cart = new Cart();
            cart.setUserId(userId);
            cart.setProductId(dto.getProductId());
            cart.setQuantity(addQuantity);
            cart.setCreateTime(LocalDateTime.now());
            cart.setUpdateTime(LocalDateTime.now());
            cartMapper.insert(cart);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateQuantity(Long userId, Long productId, Integer quantity) {
        if (userId == null) {
            throw new RuntimeException("用户未登录");
        }
        if (productId == null) {
            throw new RuntimeException("商品ID不能为空");
        }

        if (quantity == null || quantity <= 0) {
            deleteCartItem(userId, productId);
            return;
        }

        Product product = productMapper.selectById(productId);
        if (product == null) {
            throw new RuntimeException("商品不存在");
        }
        if (product.getStock() != null && quantity > product.getStock()) {
            throw new RuntimeException("库存不足，当前库存: " + product.getStock());
        }

        Cart existCart = cartMapper.selectOne(
                new LambdaQueryWrapper<Cart>()
                        .eq(Cart::getUserId, userId)
                        .eq(Cart::getProductId, productId)
        );

        if (existCart != null) {
            existCart.setQuantity(quantity);
            existCart.setUpdateTime(LocalDateTime.now());
            cartMapper.updateById(existCart);
        } else {
            Cart cart = new Cart();
            cart.setUserId(userId);
            cart.setProductId(productId);
            cart.setQuantity(quantity);
            cart.setCreateTime(LocalDateTime.now());
            cart.setUpdateTime(LocalDateTime.now());
            cartMapper.insert(cart);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void changeQuantity(Long userId, Long productId, Integer delta) {
        if (userId == null) {
            throw new RuntimeException("用户未登录");
        }
        if (productId == null) {
            throw new RuntimeException("商品ID不能为空");
        }
        if (delta == null || delta == 0) {
            return;
        }

        Cart existCart = cartMapper.selectOne(
                new LambdaQueryWrapper<Cart>()
                        .eq(Cart::getUserId, userId)
                        .eq(Cart::getProductId, productId)
        );

        int currentQty = existCart != null ? existCart.getQuantity() : 0;
        int targetQty = currentQty + delta;

        if (targetQty <= 0) {
            if (existCart != null) {
                cartMapper.deleteById(existCart.getId());
            }
        } else {
            updateQuantity(userId, productId, targetQty);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteCartItem(Long userId, Long productId) {
        if (userId == null) {
            throw new RuntimeException("用户未登录");
        }
        if (productId == null) {
            return;
        }
        cartMapper.delete(
                new LambdaQueryWrapper<Cart>()
                        .eq(Cart::getUserId, userId)
                        .eq(Cart::getProductId, productId)
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteById(Long userId, Long cartId) {
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
    public void clearCart(Long userId) {
        if (userId == null) {
            throw new RuntimeException("用户未登录");
        }
        cartMapper.delete(
                new LambdaQueryWrapper<Cart>()
                        .eq(Cart::getUserId, userId)
        );
    }

    @Override
    public Integer getCartCount(Long userId) {
        if (userId == null) {
            return 0;
        }
        List<Cart> cartList = cartMapper.selectList(
                new LambdaQueryWrapper<Cart>()
                        .eq(Cart::getUserId, userId)
        );
        return cartList.stream().mapToInt(Cart::getQuantity).sum();
    }
}
