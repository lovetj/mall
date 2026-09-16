package com.mall.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("`order`")
public class Order implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(value = "id", type = IdType.ASSIGN_UUID)
    private String id;

    private String orderNo;

    private String userId;

    /** 收货地址ID(关联address表) */
    private String addressId;

    /** 商品小计 */
    private BigDecimal productTotal;

    /** 快递费 */
    private BigDecimal freightAmount;

    /** 实付金额 = productTotal + freightAmount */
    private BigDecimal payAmount;

    /** 支付方式 1微信 2支付宝 */
    private Integer payType;

    /** 状态 0待付款 1待发货 2待收货 3已完成 4已取消 */
    private Integer status;

    /** 收货人(下单时快照) */
    private String receiverName;

    /** 收货电话(下单时快照) */
    private String receiverPhone;

    /** 完整收货地址(下单时快照) */
    private String receiverAddress;

    /** 买家备注 */
    private String remark;

    /** 支付时间 */
    private LocalDateTime payTime;

    /** 发货时间 */
    private LocalDateTime shipTime;

    /** 确认收货时间 */
    private LocalDateTime receiveTime;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
