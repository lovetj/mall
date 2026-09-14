package com.mall.dto;

import lombok.Data;

import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

/**
 * 购物车结算请求DTO
 * 传入购物车选中项ID列表 + 地址ID + 备注，由后端原子化完成：
 *   1. 根据 cartItemIds 查购物车 → 查商品 → 计算金额
 *   2. 根据 addressId 查地址 → 快照收货人信息
 *   3. 创建 order + 批量插入 order_item
 *   4. 删除已结算的购物车项
 */
@Data
public class OrderCheckoutDTO {

    /** 购物车选中项ID列表 */
    @NotEmpty(message = "请选择要结算的商品")
    private List<Long> cartItemIds;

    /** 收货地址ID */
    @NotNull(message = "请选择收货地址")
    private Long addressId;

    /** 买家备注(可选) */
    private String remark;

    /**
     * 快递费(可选, 前端展示用, 后端可按规则覆盖)
     * 若不传或为null, 后端默认为 0
     */
    private BigDecimal freightAmount;
}
