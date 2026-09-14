package com.mall.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

/**
 * 拉起支付响应(后端返回给前端, 前端用这些参数调起支付)
 */
@Data
public class PayResponseDTO {

    /** 是否成功创建支付单 */
    private boolean success;

    /** 错误信息(失败时) */
    private String message;

    /** 本系统支付流水号(前端查支付状态用) */
    private String paymentNo;

    /** 关联订单号 */
    private String orderNo;

    /** 订单金额 */
    private BigDecimal payAmount;

    /**
     * 支付方式 1微信 2支付宝 3货到付款 99Mock
     * 用于前端展示支付中状态的图标
     */
    private Integer payType;

    /**
     * 前端拉起支付需要的参数, 不同场景不同内容:
     *
     * Mock场景:       { mock: true, tips: "模拟支付中..." }
     * 微信APP支付:    { appid, partnerid(商户号), prepayid, package, noncestr, timestamp, sign }
     * 微信JSAPI支付:  { appId, timeStamp, nonceStr, package, signType, paySign }
     * 微信H5支付:     { mweb_url: "https://..." }  (前端直接 location.href = mweb_url)
     * 微信Native支付: { code_url: "weixin://wxpay/bizpayurl?..." }  (前端生成二维码显示)
     */
    private Map<String, Object> payParams;
}
