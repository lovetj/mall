package com.mall.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotEmpty;
import java.math.BigDecimal;
import java.util.List;

/**
 * 直接创建订单DTO（兼容旧接口，推荐使用 OrderCheckoutDTO 从购物车结算）
 */
@Data
public class OrderDTO {

    /** 订单明细(直接下单用) */
    @NotEmpty(message = "商品列表不能为空")
    private List<OrderItemDTO> items;

    @NotBlank(message = "收货人不能为空")
    private String receiverName;

    @NotBlank(message = "收货电话不能为空")
    private String receiverPhone;

    @NotBlank(message = "收货地址不能为空")
    private String receiverAddress;

    /** 关联地址ID(可选) */
    private String addressId;

    /** 快递费(可选, 默认0) */
    private BigDecimal freightAmount;

    private String remark;

    @Data
    public static class OrderItemDTO {
        private String productId;
        private String tierId;
        private String tierName;
        private BigDecimal price;
        private Integer quantity;
    }
}
