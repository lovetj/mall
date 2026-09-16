package com.mall.service.impl;

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.dto.OrderVO;
import com.mall.entity.*;
import com.mall.service.AddressService;
import com.mall.service.OrderService;
import com.mall.common.PageResult;
import com.mall.dto.OrderCheckoutDTO;
import com.mall.dto.OrderDTO;
import com.mall.entity.*;
import com.mall.mapper.CartMapper;
import com.mall.mapper.OrderItemMapper;
import com.mall.mapper.OrderMapper;
import com.mall.mapper.ProductMapper;
import com.mall.mapper.ProductTierMapper;
import com.mall.util.UrlUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderServiceImpl extends ServiceImpl<OrderMapper, Order> implements OrderService {

    @Autowired
    private ProductMapper productMapper;

    @Autowired
    private ProductTierMapper productTierMapper;

    @Autowired
    private OrderItemMapper orderItemMapper;

    @Autowired
    private CartMapper cartMapper;

    @Autowired
    private AddressService addressService;

    @Autowired
    private UrlUtil urlUtil;

    // ==================== 核心：购物车结算 ====================

    @Override
    @Transactional(rollbackFor = Exception.class)
    public OrderVO checkout(OrderCheckoutDTO dto, String userId) {
        // 1. 校验用户
        if (!org.springframework.util.StringUtils.hasText(userId)) {
            throw new RuntimeException("用户未登录");
        }

        // 2. 根据 cartItemIds 查询购物车记录(必须属于当前用户)
        List<Cart> cartList = cartMapper.selectList(
                new LambdaQueryWrapper<Cart>()
                        .eq(Cart::getUserId, userId)
                        .in(Cart::getId, dto.getCartItemIds())
        );
        if (cartList.isEmpty()) {
            throw new RuntimeException("未找到要结算的购物车商品");
        }

        // 3. 批量查询商品和规格
        List<String> productIds = cartList.stream().map(Cart::getProductId).distinct().collect(Collectors.toList());
        List<Product> products = productMapper.selectBatchIds(productIds);
        Map<String, Product> productMap = products.stream()
                .collect(Collectors.toMap(Product::getId, p -> p, (k1, k2) -> k1));

        List<String> tierIds = cartList.stream()
                .map(Cart::getTierId)
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.toList());
        Map<String, ProductTier> tierMap = tierIds.isEmpty() ? Collections.emptyMap() :
                productTierMapper.selectBatchIds(tierIds).stream()
                        .collect(Collectors.toMap(ProductTier::getId, t -> t, (t1, t2) -> t1));

        // 4. 校验购物车中每个商品及规格是否存在、在售、库存足够
        BigDecimal productTotal = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();
        for (Cart cart : cartList) {
            Product product = productMap.get(cart.getProductId());
            if (product == null) {
                throw new RuntimeException("购物车中存在已下架的商品(id=" + cart.getProductId() + ")");
            }
            if (product.getIsDel() != null && product.getIsDel() == 1) {
                throw new RuntimeException("商品已删除: " + product.getName());
            }
            if (product.getStatus() != null && product.getStatus() != 1) {
                throw new RuntimeException("商品已下架: " + product.getName());
            }

            ProductTier tier = StringUtils.hasText(cart.getTierId()) ? tierMap.get(cart.getTierId()) : null;
            if (tier != null) {
                if (tier.getStatus() != null && tier.getStatus() != 1) {
                    throw new RuntimeException("商品规格已下架: " + product.getName() + " - " + tier.getName());
                }
                if (tier.getStock() != null && cart.getQuantity() > tier.getStock()) {
                    throw new RuntimeException("商品规格库存不足: " + product.getName() + " (" + tier.getName() + ") 仅剩 " + tier.getStock());
                }
            } else if (product.getStock() != null && cart.getQuantity() > product.getStock()) {
                throw new RuntimeException("商品库存不足: " + product.getName() + " 库存" + product.getStock());
            }

            BigDecimal itemPrice = (tier != null && tier.getPrice() != null) ? tier.getPrice() : product.getPrice();
            BigDecimal itemAmount = itemPrice.multiply(BigDecimal.valueOf(cart.getQuantity()));
            productTotal = productTotal.add(itemAmount);

            OrderItem oi = new OrderItem();
            oi.setProductId(product.getId());
            oi.setProductName(product.getName());
            oi.setProductImage(tier != null && StringUtils.hasText(tier.getImage()) ? tier.getImage() : product.getImage());
            oi.setProductUnit(tier != null && StringUtils.hasText(tier.getUnit()) ? tier.getUnit() : product.getUnit());
            oi.setTierId(tier != null ? tier.getId() : cart.getTierId());
            oi.setTierName(tier != null ? tier.getName() : "默认规格");
            oi.setPrice(itemPrice);
            oi.setQuantity(cart.getQuantity());
            oi.setAmount(itemAmount);
            orderItems.add(oi);
        }

        // 5. 根据 addressId 查地址并组装完整收货地址
        Address address = addressService.getDetail(userId, dto.getAddressId());
        if (address == null) {
            throw new RuntimeException("收货地址不存在");
        }
        String fullAddress = buildFullAddress(address);

        // 6. 快递费(前端可传, 默认0)
        BigDecimal freightAmount = dto.getFreightAmount() != null
                ? dto.getFreightAmount() : BigDecimal.ZERO;

        // 7. 创建订单
        Order order = new Order();
        String orderNo = IdUtil.getSnowflakeNextIdStr();
        order.setOrderNo(orderNo);
        order.setUserId(userId);
        order.setAddressId(address.getId());
        order.setProductTotal(productTotal);
        order.setFreightAmount(freightAmount);
        order.setPayAmount(productTotal.add(freightAmount));
        order.setStatus(0); // 待付款
        order.setReceiverName(address.getReceiverName());
        order.setReceiverPhone(address.getPhone());
        order.setReceiverAddress(fullAddress);
        order.setRemark(dto.getRemark());
        save(order);

        // 8. 批量插入订单项
        for (OrderItem oi : orderItems) {
            oi.setOrderId(order.getId());
            orderItemMapper.insert(oi);
        }

        // 9. 删除已结算的购物车项
        List<String> cartIds = cartList.stream().map(Cart::getId).collect(Collectors.toList());
        cartMapper.deleteBatchIds(cartIds);

        // 10. 组装 OrderVO 返回给前端 (含 id/orderNo/payAmount, 方便直接跳支付页)
        OrderVO vo = new OrderVO();
        vo.setId(order.getId());
        vo.setOrderNo(order.getOrderNo());
        vo.setPayAmount(order.getPayAmount());
        vo.setStatus(order.getStatus());
        vo.setProductTotal(order.getProductTotal());
        vo.setFreightAmount(order.getFreightAmount());
        vo.setPayType(order.getPayType());
        return vo;
    }

    // ==================== 直接创建订单(兼容旧接口) ====================

    @Override
    @Transactional(rollbackFor = Exception.class)
    public String createOrder(OrderDTO dto, String userId) {
        if (!org.springframework.util.StringUtils.hasText(userId)) {
            throw new RuntimeException("用户未登录");
        }

        BigDecimal freightAmount = dto.getFreightAmount() != null ? dto.getFreightAmount() : BigDecimal.ZERO;
        BigDecimal productTotal = BigDecimal.ZERO;

        Order order = new Order();
        order.setOrderNo(IdUtil.getSnowflakeNextIdStr());
        order.setUserId(userId);
        order.setAddressId(dto.getAddressId());
        order.setStatus(0); // 待付款
        order.setReceiverName(dto.getReceiverName());
        order.setReceiverPhone(dto.getReceiverPhone());
        order.setReceiverAddress(dto.getReceiverAddress());
        order.setRemark(dto.getRemark());

        List<OrderItem> orderItems = new ArrayList<>();
        for (OrderDTO.OrderItemDTO itemDTO : dto.getItems()) {
            Product product = productMapper.selectById(itemDTO.getProductId());
            if (product == null) {
                throw new RuntimeException("商品不存在: " + itemDTO.getProductId());
            }
            if (product.getIsDel() != null && product.getIsDel() == 1) {
                throw new RuntimeException("商品已删除: " + product.getName());
            }

            ProductTier tier = null;
            if (StringUtils.hasText(itemDTO.getTierId())) {
                tier = productTierMapper.selectById(itemDTO.getTierId());
            }

            if (tier != null) {
                if (tier.getStatus() != null && tier.getStatus() != 1) {
                    throw new RuntimeException("商品规格已下架: " + product.getName() + " - " + tier.getName());
                }
                if (tier.getStock() != null && itemDTO.getQuantity() > tier.getStock()) {
                    throw new RuntimeException("商品规格库存不足: " + product.getName() + " (" + tier.getName() + ") 仅剩 " + tier.getStock());
                }
            } else if (product.getStock() != null && itemDTO.getQuantity() > product.getStock()) {
                throw new RuntimeException("商品库存不足: " + product.getName() + " 库存" + product.getStock());
            }

            BigDecimal itemPrice = (tier != null && tier.getPrice() != null) ? tier.getPrice() :
                    (itemDTO.getPrice() != null ? itemDTO.getPrice() : product.getPrice());
            BigDecimal itemAmount = itemPrice.multiply(BigDecimal.valueOf(itemDTO.getQuantity()));
            productTotal = productTotal.add(itemAmount);

            OrderItem oi = new OrderItem();
            oi.setProductId(product.getId());
            oi.setProductName(product.getName());
            oi.setProductImage(tier != null && StringUtils.hasText(tier.getImage()) ? tier.getImage() : product.getImage());
            oi.setProductUnit(tier != null && StringUtils.hasText(tier.getUnit()) ? tier.getUnit() : product.getUnit());
            oi.setTierId(tier != null ? tier.getId() : itemDTO.getTierId());
            oi.setTierName(tier != null ? tier.getName() : (StringUtils.hasText(itemDTO.getTierName()) ? itemDTO.getTierName() : "默认规格"));
            oi.setPrice(itemPrice);
            oi.setQuantity(itemDTO.getQuantity());
            oi.setAmount(itemAmount);
            orderItems.add(oi);
        }

        order.setProductTotal(productTotal);
        order.setFreightAmount(freightAmount);
        order.setPayAmount(productTotal.add(freightAmount));
        save(order);

        for (OrderItem oi : orderItems) {
            oi.setOrderId(order.getId());
            orderItemMapper.insert(oi);
        }

        return order.getOrderNo();
    }

    // ==================== 订单分页列表 ====================

    @Override
    public PageResult<OrderVO> pageList(Integer pageNum, Integer pageSize, Integer status, String userId) {
        Page<Order> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<>();
        if (org.springframework.util.StringUtils.hasText(userId)) {
            wrapper.eq(Order::getUserId, userId);
        }
        if (status != null && status >= 0) {
            wrapper.eq(Order::getStatus, status);
        }
        wrapper.orderByDesc(Order::getCreateTime);
        Page<Order> result = page(page, wrapper);

        // 批量查订单项
        List<Order> records = result.getRecords();
        List<String> orderIds = records.stream().map(Order::getId).collect(Collectors.toList());
        Map<String, List<OrderItem>> itemsMap;
        if (!orderIds.isEmpty()) {
            List<OrderItem> allItems = orderItemMapper.selectList(
                    new LambdaQueryWrapper<OrderItem>().in(OrderItem::getOrderId, orderIds));
            itemsMap = allItems.stream().collect(Collectors.groupingBy(OrderItem::getOrderId));
        } else {
            itemsMap = Collections.emptyMap();
        }

        List<OrderVO> voList = records.stream().map(o -> {
            OrderVO vo = new OrderVO();
            vo.setId(o.getId());
            vo.setOrderNo(o.getOrderNo());
            vo.setUserId(o.getUserId());
            vo.setAddressId(o.getAddressId());
            vo.setProductTotal(o.getProductTotal());
            vo.setFreightAmount(o.getFreightAmount());
            vo.setPayAmount(o.getPayAmount());
            vo.setPayType(o.getPayType());
            vo.setStatus(o.getStatus());
            vo.setReceiverName(o.getReceiverName());
            vo.setReceiverPhone(o.getReceiverPhone());
            vo.setReceiverAddress(o.getReceiverAddress());
            vo.setRemark(o.getRemark());
            vo.setPayTime(o.getPayTime());
            vo.setShipTime(o.getShipTime());
            vo.setReceiveTime(o.getReceiveTime());
            vo.setCreateTime(o.getCreateTime());
            vo.setUpdateTime(o.getUpdateTime());
            List<OrderItem> items = itemsMap.getOrDefault(o.getId(), Collections.emptyList());
            urlUtil.resolveOrderItems(items);
            vo.setItems(items);
            return vo;
        }).collect(Collectors.toList());

        return new PageResult<>(voList, result.getTotal(), result.getPages(), result.getCurrent(), result.getSize());
    }

    // ==================== 订单详情 ====================

    @Override
    public OrderVO getDetail(String id, String userId) {
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Order::getId, id);
        if (org.springframework.util.StringUtils.hasText(userId)) {
            wrapper.eq(Order::getUserId, userId);
        }
        Order order = getOne(wrapper);
        if (order == null) {
            return null;
        }

        List<OrderItem> items = orderItemMapper.selectList(
                new LambdaQueryWrapper<OrderItem>().eq(OrderItem::getOrderId, order.getId()));
        urlUtil.resolveOrderItems(items);

        OrderVO vo = new OrderVO();
        vo.setId(order.getId());
        vo.setOrderNo(order.getOrderNo());
        vo.setUserId(order.getUserId());
        vo.setAddressId(order.getAddressId());
        vo.setProductTotal(order.getProductTotal());
        vo.setFreightAmount(order.getFreightAmount());
        vo.setPayAmount(order.getPayAmount());
        vo.setPayType(order.getPayType());
        vo.setStatus(order.getStatus());
        vo.setReceiverName(order.getReceiverName());
        vo.setReceiverPhone(order.getReceiverPhone());
        vo.setReceiverAddress(order.getReceiverAddress());
        vo.setRemark(order.getRemark());
        vo.setPayTime(order.getPayTime());
        vo.setShipTime(order.getShipTime());
        vo.setReceiveTime(order.getReceiveTime());
        vo.setCreateTime(order.getCreateTime());
        vo.setUpdateTime(order.getUpdateTime());
        vo.setItems(items);
        return vo;
    }

    // ==================== 工具方法 ====================

    /** 组装完整收货地址: 省 市 区 + 详细地址 + 门牌号 */
    private String buildFullAddress(Address address) {
        StringBuilder sb = new StringBuilder();
        if (address.getProvince() != null) sb.append(address.getProvince());
        if (address.getCity() != null) sb.append(address.getCity());
        if (address.getDistrict() != null) sb.append(address.getDistrict());
        if (address.getDetailAddress() != null) sb.append(address.getDetailAddress());
        if (address.getHouseNumber() != null && !address.getHouseNumber().isEmpty()) {
            sb.append(address.getHouseNumber());
        }
        return sb.toString();
    }

    @Override
    public Map<Integer, Long> countByUserIdGroupByStatus(String userId) {
        // SELECT status, COUNT(*) FROM `order` WHERE user_id = ? GROUP BY status
        List<Map<String, Object>> rows = baseMapper.selectMaps(
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<Order>()
                        .select("status AS s", "COUNT(*) AS c")
                        .eq("user_id", userId)
                        .groupBy("status"));
        Map<Integer, Long> result = new HashMap<>();
        for (Map<String, Object> row : rows) {
            Object s = row.get("s");
            Object c = row.get("c");
            if (s instanceof Number) {
                result.put(((Number) s).intValue(), ((Number) c).longValue());
            }
        }
        return result;
    }
}
