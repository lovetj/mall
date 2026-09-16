package com.mall.service;

import com.mall.dto.PayRequestDTO;
import com.mall.dto.PayResponseDTO;

/**
 * 支付服务接口
 */
public interface PaymentService {

    /**
     * 拉起支付: 创建支付流水 + 调起对应通道
     *
     * @param request   前端传来的支付参数
     * @param userId    当前登录用户ID
     * @param clientIp  客户端IP
     * @return 支付响应(含前端需要拉起的参数)
     */
    PayResponseDTO createPayment(PayRequestDTO request, String userId, String clientIp);

    /**
     * 处理微信支付回调通知
     * (真实模式使用, Mock模式不需要)
     */
    boolean handleWechatNotify(String notifyBody, String signature, String timestamp, String nonce);

    /**
     * 主动查询支付状态(轮询兜底)
     *
     * @param paymentNo 本系统支付流水号
     */
    PayResponseDTO queryPaymentStatus(String paymentNo, String userId);

    /**
     * Mock支付完成(前端点"已付款"时调用, 把支付流水从"待支付"变"已支付", 同时变更订单状态)
     * 仅在 mock.enabled=true 时生效
     */
    PayResponseDTO mockPaySuccess(String paymentNo, String userId);
}
