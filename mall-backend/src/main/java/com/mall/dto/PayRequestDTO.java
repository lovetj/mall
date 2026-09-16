package com.mall.dto;

import lombok.Data;

import javax.validation.constraints.NotNull;

/**
 * 拉起支付请求
 */
@Data
public class PayRequestDTO {

    /** 订单ID(必传) */
    @NotNull(message = "订单ID不能为空")
    private String orderId;

    /** 支付方式: 1微信 2支付宝 3货到付款(必传) */
    @NotNull(message = "支付方式不能为空")
    private Integer payType;

    /**
     * 客户端平台: 传给后端判断走哪种微信支付通道
     * app   - 原生APP (APP支付)
     * mp    - 微信小程序 (JSAPI支付, 需用户 openid)
     * h5wx  - 微信内H5   (JSAPI支付, 需用户 openid)
     * h5    - 普通H5      (H5支付/MWEB, 生成 mweb_url)
     * pc    - PC浏览器    (Native支付, 生成二维码)
     */
    private String platform;

    /** 微信 openid(JSAPI场景必传) */
    private String openid;

    /** 前端页面来源URL(H5支付场景回跳用) */
    private String h5Info;
}
