package com.mall.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;

@Data
@TableName("order_item")
public class OrderItem implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(value = "id", type = IdType.ASSIGN_UUID)
    private String id;

    private String orderId;

    private String productId;

    /** 商品名称(下单时快照) */
    private String productName;

    /** 商品图片(下单时快照) */
    private String productImage;

    /** 商品单位(下单时快照,如斤/只) */
    private String productUnit;

    /** 单价(下单时快照) */
    private BigDecimal price;

    private Integer quantity;

    /** 小计 = price * quantity */
    private BigDecimal amount;
}
