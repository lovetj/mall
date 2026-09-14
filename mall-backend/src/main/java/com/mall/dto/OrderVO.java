package com.mall.dto;

import com.mall.entity.Order;
import com.mall.entity.OrderItem;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

/**
 * 订单VO —— 返回订单 + 订单项列表
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class OrderVO extends Order {

    /** 订单项列表 */
    private List<OrderItem> items;
}
