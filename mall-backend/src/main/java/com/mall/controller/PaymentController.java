package com.mall.controller;

import com.mall.config.PayConfig;
import com.mall.dto.PayRequestDTO;
import com.mall.dto.PayResponseDTO;
import com.mall.entity.User;
import com.mall.service.PaymentService;
import com.mall.service.UserService;
import com.mall.util.JwtUtil;
import com.mall.common.Result;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;

/**
 * 支付相关接口
 *
 * 前端调用链路:
 *   1. POST /api/payment/create  拉起支付 (创建支付流水 + 返回 payParams)
 *   2. POST /api/payment/mock-success  仅 Mock 模式: 前端手动确认支付成功
 *   3. GET  /api/payment/status    轮询支付状态(或等前端 App 支付回调后主动查)
 *   4. POST /api/payment/wechat/notify  微信异步回调(真实模式用, Mock 不需要)
 */
@Slf4j
@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final PayConfig payConfig;

    private User resolveUser(String authorization) {
        if (authorization != null && jwtUtil.validateToken(authorization)) {
            String userId = jwtUtil.getUserId(authorization);
            return userService.getById(userId);
        }
        return null;
    }

    /**
     * 拉起支付
     * POST /api/payment/create
     * Body: { orderId, payType(1微信/2支付宝), platform, openid }
     */
    @PostMapping("/create")
    public Result<PayResponseDTO> create(@Validated @RequestBody PayRequestDTO request,
                                         @RequestHeader(value = "Authorization", required = false) String authorization,
                                         HttpServletRequest httpRequest) {
        User user = resolveUser(authorization);
        if (user == null) {
            return Result.error(401, "请先登录");
        }
        String clientIp = getClientIp(httpRequest);
        log.info("[支付] 发起支付 orderId={} payType={} userId={} ip={}",
                request.getOrderId(), request.getPayType(), user.getId(), clientIp);

        PayResponseDTO resp = paymentService.createPayment(request, user.getId(), clientIp);
        if (!resp.isSuccess()) {
            return Result.error(resp.getMessage());
        }
        return Result.success(resp);
    }

    /**
     * Mock 模式: 手动确认支付成功
     * 真实模式下不用这个接口(由微信异步回调 notify 接口处理)
     */
    @PostMapping("/mock-success")
    public Result<PayResponseDTO> mockSuccess(@RequestBody Map<String, String> body,
                                                @RequestHeader(value = "Authorization", required = false) String authorization) {
        User user = resolveUser(authorization);
        if (user == null) {
            return Result.error(401, "请先登录");
        }
        String paymentNo = body.get("paymentNo");
        if (paymentNo == null || paymentNo.isEmpty()) {
            return Result.error("paymentNo 不能为空");
        }
        PayResponseDTO resp = paymentService.mockPaySuccess(paymentNo, user.getId());
        if (!resp.isSuccess()) {
            return Result.error(resp.getMessage());
        }
        return Result.success(resp);
    }

    /**
     * 查询支付状态(前端轮询)
     */
    @GetMapping("/status")
    public Result<PayResponseDTO> status(@RequestParam String paymentNo,
                                          @RequestHeader(value = "Authorization", required = false) String authorization) {
        User user = resolveUser(authorization);
        if (user == null) {
            return Result.error(401, "请先登录");
        }
        PayResponseDTO resp = paymentService.queryPaymentStatus(paymentNo, user.getId());
        if (!resp.isSuccess()) {
            return Result.error(resp.getMessage());
        }
        return Result.success(resp);
    }

    /**
     * 微信支付异步通知回调
     * 真实模式下: 微信POST过来, content-type: application/json, 含签名
     * Mock模式下不会调用到这里
     *
     * 微信签名头: Wechatpay-Signature / Wechatpay-Timestamp / Wechatpay-Nonce / Wechatpay-Serial
     */
    @PostMapping("/wechat/notify")
    public String wechatNotify(@RequestBody String body,
                               @RequestHeader(value = "Wechatpay-Signature", required = false) String signature,
                               @RequestHeader(value = "Wechatpay-Timestamp", required = false) String timestamp,
                               @RequestHeader(value = "Wechatpay-Nonce", required = false) String nonce) {
        log.info("[微信回调] signature={} timestamp={} nonce={}", signature, timestamp, nonce);
        log.info("[微信回调] body={}", body);

        boolean ok = paymentService.handleWechatNotify(body, signature, timestamp, nonce);
        if (ok) {
            return "{\"code\":\"SUCCESS\",\"message\":\"成功\"}";
        }
        // 微信会按策略重试(15秒/15分钟/1小时...)
        return "{\"code\":\"FAIL\",\"message\":\"处理失败\"}";
    }

    /**
     * 退款回调(预留)
     */
    @PostMapping("/wechat/refund-notify")
    public String wechatRefundNotify(@RequestBody String body) {
        log.info("[微信退款回调] body={}", body);
        return "{\"code\":\"SUCCESS\",\"message\":\"成功\"}";
    }

    /** 查询当前是否开启Mock模式 (前端可选调用, 用来显示/隐藏Mock提示) */
    @GetMapping("/config")
    public Result<Map<String, Object>> config() {
        Map<String, Object> m = new HashMap<>();
        m.put("mock", payConfig.getMock().isEnabled());
        m.put("mockSuccessRate", payConfig.getMock().getSuccessRate());
        return Result.success(m);
    }

    private String getClientIp(HttpServletRequest request) {
        String[] headers = {"X-Forwarded-For", "X-Real-IP", "Proxy-Client-IP", "WL-Proxy-Client-IP", "HTTP_CLIENT_IP", "HTTP_X_FORWARDED_FOR"};
        for (String h : headers) {
            String v = request.getHeader(h);
            if (v != null && !v.isEmpty() && !"unknown".equalsIgnoreCase(v)) {
                int comma = v.indexOf(',');
                return comma > 0 ? v.substring(0, comma).trim() : v.trim();
            }
        }
        return request.getRemoteAddr();
    }
}
