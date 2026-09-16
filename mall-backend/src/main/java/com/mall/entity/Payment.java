package com.mall.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 支付流水表
 */
@Data
@TableName("payment")
public class Payment implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(value = "id", type = IdType.ASSIGN_UUID)
    private String id;

    /** 本系统支付流水号(P开头, 唯一) */
    private String paymentNo;

    /** 关联订单ID */
    private String orderId;

    /** 关联订单号(冗余) */
    private String orderNo;

    /** 用户ID */
    private String userId;

    /** 支付金额(单位元) */
    private BigDecimal payAmount;

    /** 支付方式 1微信 2支付宝 3货到付款 99Mock */
    private Integer payType;

    /** 支付状态 0待支付 1已支付成功 2支付失败 3已关闭 4已退款 */
    private Integer payStatus;

    /** 微信/支付宝第三方交易号 */
    private String transactionId;

    /** 微信预支付ID(JSAPI/APP场景) */
    private String prepayId;

    /** 二维码链接(Native/扫码场景) */
    private String qrCodeUrl;

    /** H5支付跳转链接(MWEB场景) */
    private String mwebUrl;

    /** 下单请求参数(JSON快照) */
    private String requestParam;

    /** 第三方回调原始报文(JSON) */
    private String notifyData;

    /** 失败原因 */
    private String failReason;

    /** 下单客户端IP */
    private String clientIp;

    /** 支付完成时间 */
    private LocalDateTime payTime;

    /** 订单过期时间(通常30分钟) */
    private LocalDateTime expireTime;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
