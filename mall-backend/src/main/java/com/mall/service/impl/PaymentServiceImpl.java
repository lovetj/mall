package com.mall.service.impl;

import com.alibaba.fastjson2.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.mall.service.PaymentService;
import com.mall.config.PayConfig;
import com.mall.dto.PayRequestDTO;
import com.mall.dto.PayResponseDTO;
import com.mall.entity.Order;
import com.mall.entity.Payment;
import com.mall.entity.User;
import com.mall.mapper.OrderMapper;
import com.mall.mapper.PaymentMapper;
import com.mall.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.mall.util.WechatPayUtil;
import java.security.PrivateKey;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.PublicKey;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 支付服务实现
 *
 * 两种模式:
 *   1. Mock 模式 (pay.mock.enabled=true) - 默认, 不依赖真实商户号
 *      - 拉起支付只创建支付流水, 不调微信
 *      - 前端可以点"模拟支付成功", 把流水和订单状态流转
 *
 *   2. 真实微信支付模式 (pay.mock.enabled=false)
 *      - 根据 pay.wechat.trade-type 和 platform 参数选通道
 *      - 微信支付 V3 API (REST + RSA 签名)
 *      - 回调接口 handleWechatNotify 处理异步通知
 *
 * 真实微信支付V3接入步骤(上线前):
 *   a) 商户平台设置 APIv3Key(32位) + 下载证书
 *   b) 填 application.yml pay.wechat 所有字段
 *   c) 把 mock.enabled 改成 false
 *   d) 把 handleWechatNotify 里的验签逻辑替换为真正的微信签名验证
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PaymentMapper paymentMapper;
    private final OrderMapper orderMapper;
    private final UserMapper userMapper;
    private final PayConfig payConfig;

    /** 订单状态常量 */
    private static final int ORDER_STATUS_PENDING_PAY = 0;    // 待付款
    private static final int ORDER_STATUS_PENDING_SHIP = 1;  // 待发货(已支付)

    /** 支付状态常量 */
    private static final int PAY_STATUS_PENDING = 0;   // 待支付
    private static final int PAY_STATUS_SUCCESS = 1;   // 支付成功
    private static final int PAY_STATUS_FAIL = 2;      // 支付失败

    /** 支付方式常量 */
    private static final int PAY_TYPE_WECHAT = 1;
    private static final int PAY_TYPE_ALIPAY = 2;
    private static final int PAY_TYPE_MOCK = 99;

    /** 回调时间窗(秒): 超过该范围视为重放/异常, 拒绝处理 */
    private static final long NOTIFY_MAX_AGE_SECONDS = 300;

    /** 按订单 ID 粒度的锁, 防止同一订单并发创建多条待支付流水 */
    private final Map<String, Object> orderLocks = new ConcurrentHashMap<>();

    private Object lockForOrder(String orderId) {
        return orderLocks.computeIfAbsent(orderId, k -> new Object());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PayResponseDTO createPayment(PayRequestDTO request, String userId, String clientIp) {
        PayResponseDTO resp = new PayResponseDTO();

        // 1. 校验订单
        Order order = orderMapper.selectById(request.getOrderId());
        if (order == null) {
            resp.setSuccess(false);
            resp.setMessage("订单不存在");
            return resp;
        }
        if (!order.getUserId().equals(userId)) {
            resp.setSuccess(false);
            resp.setMessage("无权操作该订单");
            return resp;
        }
        if (order.getStatus() != ORDER_STATUS_PENDING_PAY) {
            resp.setSuccess(false);
            resp.setMessage("订单当前状态不可支付");
            return resp;
        }

        // 2. 生成支付流水号
        String paymentNo = generatePaymentNo();

        // 3. 查是否已有进行中的支付流水(同一订单待支付状态, 避免重复下单)
        //    用订单粒度锁保证"查重+insert"原子性, 避免并发同订单生成多条待支付流水
        Payment payment;
        synchronized (lockForOrder(order.getId())) {
            Payment exist = paymentMapper.selectOne(
                    new LambdaQueryWrapper<Payment>()
                            .eq(Payment::getOrderId, order.getId())
                            .eq(Payment::getPayStatus, PAY_STATUS_PENDING)
                            .last("LIMIT 1"));

            if (exist != null) {
                // 已有待支付流水, 如果切换了支付方式则更新支付方式后复用
                if (request.getPayType() != null && !request.getPayType().equals(exist.getPayType())) {
                    exist.setPayType(request.getPayType());
                }
                // 重新生成新的支付流水号, 避免重复提交微信时出现商户单号冲突或参数不一致报错
                exist.setPaymentNo(generatePaymentNo());
                paymentMapper.updateById(exist);
                log.info("[支付] 更新已有待支付流水 paymentNo={}, payType={}", exist.getPaymentNo(), exist.getPayType());
                return buildPayResponse(exist, request);
            }

            if (request.getPayType() == null || (request.getPayType() != PAY_TYPE_WECHAT && request.getPayType() != PAY_TYPE_ALIPAY)) {
                request.setPayType(PAY_TYPE_WECHAT);
            }

            // 4. 创建新支付流水
            payment = new Payment();
            payment.setPaymentNo(paymentNo);
            payment.setOrderId(order.getId());
            payment.setOrderNo(order.getOrderNo());
            payment.setUserId(userId);
            payment.setPayAmount(order.getPayAmount());
            payment.setPayType(request.getPayType());
            payment.setPayStatus(PAY_STATUS_PENDING);
            payment.setRequestParam(JSON.toJSONString(request));
            payment.setClientIp(clientIp);
            // 支付有效期: 30分钟
            payment.setExpireTime(LocalDateTime.now().plusMinutes(30));

            paymentMapper.insert(payment);
        }

        boolean isMock = payConfig.getMock().isEnabled();
        Map<String, Object> payParams;

        if (isMock) {
            // Mock 模式: 不调真实微信/支付宝, 前端可以点"模拟支付成功"
            payParams = buildMockParams();
            log.info("[支付] Mock模式 拉起支付 paymentNo={} orderNo={} amount={}",
                    paymentNo, order.getOrderNo(), order.getPayAmount());
        } else {
            // 真实支付: 根据 payType + platform 调支付接口
            try {
                payParams = callWechatPayApi(payment, request);
                paymentMapper.updateById(payment);
                log.info("[支付] 真实支付 流水={} 通道={}", paymentNo, request.getPlatform());
            } catch (Exception e) {
                log.error("[支付] 调用支付接口失败", e);
                payment.setPayStatus(PAY_STATUS_FAIL);
                payment.setFailReason("支付接口调用失败: " + e.getMessage());
                paymentMapper.updateById(payment);
                resp.setSuccess(false);
                resp.setMessage("支付发起失败, 请稍后重试");
                return resp;
            }
        }

        resp.setSuccess(true);
        resp.setPaymentNo(paymentNo);
        resp.setOrderNo(order.getOrderNo());
        resp.setPayAmount(order.getPayAmount());
        resp.setPayType(request.getPayType());
        resp.setPayParams(payParams);
        return resp;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean handleWechatNotify(String notifyBody, String signature, String timestamp, String nonce, String serialNo) {
        try {
            // 0. 入参 & 平台签名校验(先于业务处理, 任何一项不满足即拒绝, 让微信按策略重试)
            if (!org.springframework.util.StringUtils.hasText(notifyBody)
                    || !org.springframework.util.StringUtils.hasText(signature)
                    || !org.springframework.util.StringUtils.hasText(timestamp)
                    || !org.springframework.util.StringUtils.hasText(nonce)
                    || !org.springframework.util.StringUtils.hasText(serialNo)) {
                log.warn("[微信回调] 回调缺少必要参数(signature/timestamp/nonce/serial/body)");
                return false;
            }

            PayConfig.Wechat wx = payConfig.getWechat();

            // 时间窗校验(防重放): |now - timestamp| 不超过 NOTIFY_MAX_AGE_SECONDS
            long nowSec = System.currentTimeMillis() / 1000;
            long ts;
            try {
                ts = Long.parseLong(timestamp.trim());
            } catch (NumberFormatException e) {
                log.warn("[微信回调] 时间戳非法 timestamp={}", timestamp);
                return false;
            }
            if (Math.abs(nowSec - ts) > NOTIFY_MAX_AGE_SECONDS) {
                log.warn("[微信回调] 回调时间戳超出时间窗, 疑似重放 news={}, ts={}", nowSec, ts);
                return false;
            }

            // 序列号校验: 必须与配置的平台公钥/证书序列号一致
            String expectSerial = org.springframework.util.StringUtils.hasText(wx.getPlatformCertSerialNo())
                    ? wx.getPlatformCertSerialNo().trim() : wx.getPublicKeyId();
            if (!org.springframework.util.StringUtils.hasText(expectSerial) || !expectSerial.equals(serialNo.trim())) {
                log.warn("[微信回调] 平台序列号不匹配 serial={}, expect={}", serialNo, expectSerial);
                return false;
            }

            // 平台签名验签: 报文 = timestamp\nnonce\nbody\n
            PublicKey platformPublicKey = WechatPayUtil.loadPublicKey(wx.getPlatformCertPath());
            String verifyMessage = timestamp + "\n" + nonce + "\n" + notifyBody + "\n";
            if (!WechatPayUtil.verifySha256Rsa(verifyMessage, signature, platformPublicKey)) {
                log.warn("[微信回调] 平台签名验签失败, 拒绝处理");
                return false;
            }

            Map<String, Object> rootMap = JSON.parseObject(notifyBody);
            String eventType = (String) rootMap.get("event_type");
            if (!"TRANSACTION.SUCCESS".equals(eventType)) {
                log.info("[微信回调] 非支付成功事件, eventType={}", eventType);
                return true;
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> resource = (Map<String, Object>) rootMap.get("resource");
            if (resource == null) {
                log.warn("[微信回调] 缺少 resource 节点");
                return false;
            }

            String ciphertext = (String) resource.get("ciphertext");
            String associatedData = (String) resource.get("associated_data");
            String resourceNonce = (String) resource.get("nonce");

            String plainJson = WechatPayUtil.decryptAesGcm(wx.getApiV3Key(), associatedData, resourceNonce, ciphertext);

            Map<String, Object> plainMap = JSON.parseObject(plainJson);
            String outTradeNo = (String) plainMap.get("out_trade_no");
            String transactionId = (String) plainMap.get("transaction_id");
            String tradeState = (String) plainMap.get("trade_state");

            if ("SUCCESS".equalsIgnoreCase(tradeState)) {
                Payment payment = paymentMapper.selectOne(
                        new LambdaQueryWrapper<Payment>()
                                .eq(Payment::getPaymentNo, outTradeNo));
                if (payment == null) {
                    log.error("[微信回调] 未找到对应支付流水 outTradeNo={}", outTradeNo);
                    return false;
                }

                // 金额二次对账: 回调金额(单位分)必须与本地流水金额一致, 防止金额错配
                int expectFen = payment.getPayAmount().multiply(new BigDecimal(100)).intValue();
                @SuppressWarnings("unchecked")
                Map<String, Object> cbAmount = (Map<String, Object>) plainMap.get("amount");
                Object totalObj = cbAmount == null ? null : cbAmount.get("total");
                if (totalObj == null || Integer.parseInt(String.valueOf(totalObj)) != expectFen) {
                    log.error("[微信回调] 金额不一致, 拒绝入账 outTradeNo={}, cbAmountFen={}, expectFen={}",
                            outTradeNo, totalObj, expectFen);
                    return false;
                }

                if (PAY_STATUS_SUCCESS != payment.getPayStatus()) {
                    payment.setPayStatus(PAY_STATUS_SUCCESS);
                    payment.setTransactionId(transactionId);
                    payment.setPayTime(LocalDateTime.now());
                    payment.setNotifyData(plainJson);
                    paymentMapper.updateById(payment);

                    Order order = orderMapper.selectById(payment.getOrderId());
                    if (order != null && ORDER_STATUS_PENDING_PAY == order.getStatus()) {
                        order.setStatus(ORDER_STATUS_PENDING_SHIP);
                        order.setPayTime(LocalDateTime.now());
                        order.setPayType(payment.getPayType());
                        orderMapper.updateById(order);
                        log.info("[微信回调] 订单支付成功 流水={} 订单号={}", outTradeNo, order.getOrderNo());
                    }
                }
            }
            return true;
        } catch (Exception e) {
            log.error("[微信回调] 处理异常: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public PayResponseDTO queryPaymentStatus(String paymentNo, String userId) {
        PayResponseDTO resp = new PayResponseDTO();
        Payment payment = paymentMapper.selectOne(
                new LambdaQueryWrapper<Payment>()
                        .eq(Payment::getPaymentNo, paymentNo)
                        .eq(Payment::getUserId, userId));
        if (payment == null) {
            resp.setSuccess(false);
            resp.setMessage("支付流水不存在");
            return resp;
        }

        resp.setPaymentNo(paymentNo);
        resp.setOrderNo(payment.getOrderNo());
        resp.setPayAmount(payment.getPayAmount());
        resp.setPayType(payment.getPayType());

        Map<String, Object> params = new HashMap<>();
        params.put("payStatus", payment.getPayStatus());
        params.put("paid", PAY_STATUS_SUCCESS == payment.getPayStatus());
        resp.setPayParams(params);
        resp.setSuccess(true);
        return resp;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PayResponseDTO mockPaySuccess(String paymentNo, String userId) {
        PayResponseDTO resp = new PayResponseDTO();
        if (!payConfig.getMock().isEnabled()) {
            resp.setSuccess(false);
            resp.setMessage("当前不是 Mock 模式");
            return resp;
        }

        Payment payment = paymentMapper.selectOne(
                new LambdaQueryWrapper<Payment>()
                        .eq(Payment::getPaymentNo, paymentNo)
                        .eq(Payment::getUserId, userId));
        if (payment == null) {
            resp.setSuccess(false);
            resp.setMessage("支付流水不存在");
            return resp;
        }
        if (PAY_STATUS_PENDING != payment.getPayStatus()) {
            resp.setSuccess(false);
            resp.setMessage("该流水已处理过");
            return resp;
        }

        // 模拟成功率
        Random rand = new Random();
        int successRate = payConfig.getMock().getSuccessRate();
        boolean success = rand.nextInt(100) < successRate;

        if (success) {
            payment.setPayStatus(PAY_STATUS_SUCCESS);
            payment.setPayTime(LocalDateTime.now());
            payment.setTransactionId("MOCK-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16));
            payment.setFailReason(null);
            paymentMapper.updateById(payment);

            // 更新订单
            Order order = orderMapper.selectById(payment.getOrderId());
            if (order != null && ORDER_STATUS_PENDING_PAY == order.getStatus()) {
                order.setStatus(ORDER_STATUS_PENDING_SHIP);
                order.setPayTime(LocalDateTime.now());
                order.setPayType(payment.getPayType());
                orderMapper.updateById(order);
            }
            log.info("[Mock支付] 成功 paymentNo={} order={}", paymentNo, payment.getOrderNo());
        } else {
            payment.setPayStatus(PAY_STATUS_FAIL);
            payment.setFailReason("模拟支付失败");
            paymentMapper.updateById(payment);
            log.warn("[Mock支付] 模拟失败 paymentNo={}", paymentNo);
        }

        Map<String, Object> params = new HashMap<>();
        params.put("payStatus", payment.getPayStatus());
        params.put("paid", PAY_STATUS_SUCCESS == payment.getPayStatus());
        resp.setSuccess(true);
        resp.setPaymentNo(paymentNo);
        resp.setOrderNo(payment.getOrderNo());
        resp.setPayAmount(payment.getPayAmount());
        resp.setPayType(payment.getPayType());
        resp.setPayParams(params);
        return resp;
    }

    // ==================== 内部工具方法 ====================

    private PayResponseDTO buildPayResponse(Payment payment, PayRequestDTO request) {
        PayResponseDTO resp = new PayResponseDTO();
        resp.setPaymentNo(payment.getPaymentNo());
        resp.setOrderNo(payment.getOrderNo());
        resp.setPayAmount(payment.getPayAmount());
        resp.setPayType(payment.getPayType());

        if (payConfig.getMock().isEnabled()) {
            resp.setSuccess(true);
            resp.setPayParams(buildMockParams());
            return resp;
        }

        try {
            Map<String, Object> payParams = callWechatPayApi(payment, request);
            paymentMapper.updateById(payment);
            resp.setSuccess(true);
            resp.setPayParams(payParams);
            log.info("[支付] 复用流水成功拉起真实支付 流水={}", payment.getPaymentNo());
            return resp;
        } catch (Exception e) {
            log.error("[支付] 复用流水调用支付接口失败", e);
            resp.setSuccess(false);
            resp.setMessage("支付发起失败, 请稍后重试");
            return resp;
        }
    }

    /** Mock 模式的 payParams: 前端展示模拟拉起支付, 然后让用户手动点"已付款" */
    private Map<String, Object> buildMockParams() {
        Map<String, Object> map = new HashMap<>();
        map.put("mock", true);
        map.put("tips", "模拟支付中... 请点击下方「模拟支付成功」按钮确认");
        return map;
    }

    /**
     * 真实微信支付 V3 下单
     * 根据 tradeType + platform 选通道, 调微信 REST API
     *
     * 微信支付V3接口文档: pay.weixin.qq.com/docs/merchant/products/jsapi-payment/development/
     * 微信支付API基础: HTTPS POST /v3/pay/transactions/{trade_type}
     *
     * @return 前端拉起支付需要的参数
     */
    private Map<String, Object> callWechatPayApi(Payment payment, PayRequestDTO request) throws Exception {
        PayConfig.Wechat wx = payConfig.getWechat();
        if (wx.getMchId() == null || wx.getMchId().isEmpty()) {
            throw new IllegalStateException("微信支付商户号未配置");
        }

        BigDecimal amountFen = payment.getPayAmount().multiply(new BigDecimal(100)); // 单位分

        // 根据 platform 或 tradeType 选交易类型
        String tradeType = wx.getTradeType();
        if (request.getPlatform() != null) {
            switch (request.getPlatform()) {
                case "mp":    // 微信小程序
                case "h5wx":  // 微信内H5
                    tradeType = "JSAPI";
                    break;
                case "app":
                    tradeType = "APP";
                    break;
                case "h5":
                    tradeType = "H5";
                    break;
                case "pc":
                    tradeType = "NATIVE";
                    break;
            }
        }

        // === 1. 组装请求体 ===
        Map<String, Object> body = new HashMap<>();
        body.put("appid", wx.getAppId());
        body.put("mchid", wx.getMchId());
        body.put("description", "商城-订单:" + payment.getOrderNo());
        body.put("out_trade_no", payment.getPaymentNo());
        body.put("notify_url", wx.getNotifyUrl());
        Map<String, Object> amount = new HashMap<>();
        amount.put("total", amountFen.intValue());
        amount.put("currency", "CNY");
        body.put("amount", amount);

        // 各交易类型特有字段
        switch (tradeType) {
            case "JSAPI":
                String openid = request.getOpenid();
                if (!org.springframework.util.StringUtils.hasText(openid)) {
                    User user = userMapper.selectById(payment.getUserId());
                    if (user != null && org.springframework.util.StringUtils.hasText(user.getOpenid())) {
                        openid = user.getOpenid();
                    }
                }
                if (!org.springframework.util.StringUtils.hasText(openid)) {
                    throw new IllegalStateException("JSAPI微信支付缺少用户openid, 请通过微信授权登录后再支付");
                }
                log.info("[微信JSAPI下单] 付款用户 openid={}, paymentNo={}, orderNo={}", openid, payment.getPaymentNo(), payment.getOrderNo());
                Map<String, Object> payer = new HashMap<>();
                payer.put("openid", openid);
                body.put("payer", payer);
                break;
            case "H5":
                Map<String, Object> sceneInfo = new HashMap<>();
                sceneInfo.put("payer_client_ip", payment.getClientIp() != null ? payment.getClientIp() : "127.0.0.1");
                body.put("scene_info", sceneInfo);
                Map<String, Object> h5Info = new HashMap<>();
                h5Info.put("type", "Wap");
                body.put("h5_info", h5Info);
                break;
            case "NATIVE":
                // 无额外字段
                break;
            case "APP":
                // 无额外字段
                break;
        }

        String reqBodyJson = JSON.toJSONString(body);
        log.info("[微信下单] tradeType={} body={}", tradeType, reqBodyJson);

        // === 2. 生成 Authorization 头 ===
        PrivateKey privateKey = WechatPayUtil.loadPrivateKey(wx.getPrivateKeyPath());
        String canonicalUrl = "/v3/pay/transactions/" + tradeType.toLowerCase();
        String authorization = WechatPayUtil.buildAuthorizationHeader(
                wx.getMchId(),
                wx.getCertSerialNo(),
                "POST",
                canonicalUrl,
                reqBodyJson,
                privateKey);

        // === 3. 发请求 ===
        // 用 hutool HttpRequest 调微信 REST API
        String url = "https://api.mch.weixin.qq.com" + canonicalUrl;
        cn.hutool.http.HttpRequest httpReq = cn.hutool.http.HttpRequest.post(url)
                .header("Authorization", authorization)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .body(reqBodyJson)
                .timeout(10000);

        String respBody = httpReq.execute().body();

        log.info("[微信下单] 响应={}", respBody);

        Map<String, Object> wxResp = JSON.parseObject(respBody);
        if (wxResp.get("code") != null) {
            throw new RuntimeException("微信返回错误: " + wxResp.get("code") + " - " + wxResp.get("message"));
        }

        // === 4. 按交易类型提取前端参数 ===
        Map<String, Object> payParams = new HashMap<>();
        switch (tradeType) {
            case "APP":
                // APP支付: 前端需要 appid/partnerid/prepayid/package/noncestr/timestamp/sign
                payParams.put("appid", wxResp.get("appid"));
                payParams.put("partnerid", wxResp.get("partnerid"));
                payParams.put("prepayid", wxResp.get("prepay_id"));
                payParams.put("package", "Sign=WXPay");
                payParams.put("noncestr", UUID.randomUUID().toString().replace("-", ""));
                payParams.put("timestamp", String.valueOf(System.currentTimeMillis() / 1000));
                payParams.put("signType", "RSA");
                payment.setPrepayId((String) wxResp.get("prepay_id"));
                break;

            case "JSAPI":
                // JSAPI支付: 微信返回 prepay_id, 前端调 wx.requestPayment 需要签名参数
                String prepayId = (String) wxResp.get("prepay_id");
                String timeStamp = String.valueOf(System.currentTimeMillis() / 1000);
                String nonceStr = UUID.randomUUID().toString().replace("-", "");
                String packageVal = "prepay_id=" + prepayId;
                String paySign = WechatPayUtil.buildJsapiPaySign(wx.getAppId(), timeStamp, nonceStr, packageVal, privateKey);

                payParams.put("appId", wx.getAppId());
                payParams.put("timeStamp", timeStamp);
                payParams.put("nonceStr", nonceStr);
                payParams.put("package", packageVal);
                payParams.put("signType", "RSA");
                payParams.put("paySign", paySign);
                payment.setPrepayId(prepayId);
                break;

            case "H5":
                // H5支付: 返回 mweb_url, 前端直接跳转
                payParams.put("mweb_url", wxResp.get("mweb_url"));
                payment.setMwebUrl((String) wxResp.get("mweb_url"));
                break;

            case "NATIVE":
                // Native支付: 返回 code_url, 前端生成二维码
                payParams.put("code_url", wxResp.get("code_url"));
                payment.setQrCodeUrl((String) wxResp.get("code_url"));
                break;
        }

        payment.setRequestParam(reqBodyJson);
        return payParams;
    }

    /** 生成支付流水号: P + yyyyMMddHHmmss + 4位随机 */
    private String generatePaymentNo() {
        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String rand = String.format("%04d", new Random().nextInt(10000));
        return "P" + ts + rand;
    }
}
