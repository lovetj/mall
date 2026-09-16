# 微信支付真实环境落地文档

> 文档版本：v1.0 | 更新时间：2026-09-13
> 适用项目：mall 农产品电商平台（uni-app 前端 + Spring Boot 后端）
> 微信支付版本：APIv3

---

## 目录

1. [整体架构概览](#1-整体架构概览)
2. [阶段一：开通微信支付商户号](#2-阶段一开通微信支付商户号)
3. [阶段二：获取 API 安全凭证](#3-阶段二获取-api-安全凭证)
4. [阶段三：按平台申请 AppID](#4-阶段三按平台申请-appid)
5. [阶段四：绑定 MchID 与 AppID 并开通支付产品](#5-阶段四绑定-mchid-与-appid-并开通支付产品)
6. [阶段五：后端代码完善清单](#6-阶段五后端代码完善清单)
7. [阶段六：前端代码完善清单](#7-阶段六前端代码完善清单)
8. [阶段七：本地联调与测试](#8-阶段七本地联调与测试)
9. [阶段八：上线前检查清单](#9-阶段八上线前检查清单)
10. [常见问题 FAQ](#10-常见问题-faq)
11. [官方文档链接汇总](#11-官方文档链接汇总)

---

## 1. 整体架构概览

### 1.1 项目支付流程

```
用户点击"立即支付"
    │
    ▼
前端 uni.requestPayment / 跳转
    │
    ▼
后端 POST /api/payment/create ──► 微信V3下单接口 /v3/pay/transactions/{trade_type}
    │                                      │
    │◄──────── prepay_id / mweb_url ───────┘
    │
    ▼
前端调起微信支付 SDK / 跳转微信收银台
    │
    ▼
用户完成支付
    │
    ├──► 微信异步回调后端 POST /api/payment/wechat/notify（主要通知通道）
    │
    └──► 前端轮询 GET /api/payment/status（兜底查询，20秒超时）
```

### 1.2 各平台对应的微信支付类型

| 你的前端平台 | 微信支付类型 | trade_type | 客户端调用方式 | 需要的 AppID 来源 |
|---|---|---|---|---|
| uni-app App 端 | APP 支付 | `APP` | `uni.requestPayment({ provider: 'wxpay' })` | 微信开放平台 移动应用 |
| 微信小程序 | JSAPI 支付 | `JSAPI` | `uni.requestPayment({ provider: 'wxpay' })` | 微信公众平台 小程序 |
| H5（微信内置浏览器） | JSAPI 支付 | `JSAPI` | 引入 WeixinJSBridge 调起 | 微信公众平台 公众号 |
| H5（外部浏览器） | H5 支付 | `H5` | 跳转 `mweb_url` | 不需要 AppID（用 MchID） |
| PC 网页扫码 | Native 支付 | `NATIVE` | 生成 `code_url` 二维码 | 不需要 AppID（用 MchID） |

> **重点**：每个支付类型都需要在微信商户平台单独开通，审核时间和资质要求不同。

### 1.3 后端需要完成的微信 API V3 核心工作

| 序号 | 工作项 | 代码位置 | 当前状态 |
|---|---|---|---|
| ① | RSA 私钥签名（请求签名） | `PaymentServiceImpl.signWithRSA()` | ❌ 未实现（throw） |
| ② | 微信下单接口调用 | `PaymentServiceImpl.callWechatPayApi()` | ⚠️ 伪代码框架，签名依赖① |
| ③ | 异步回调验签（SHA256-RSA2048） | `PaymentServiceImpl.handleWechatNotify()` | ❌ Mock 占位逻辑 |
| ④ | 回调报文明文解密（AES-256-GCM） | 同上 | ❌ 未实现 |
| ⑤ | JSAPI 二次签名（前端 paySign） | `callWechatPayApi()` JSAPI 分支 | ❌ 返回占位符 `"...代码略..."` |

---

## 2. 阶段一：开通微信支付商户号

### 2.1 前置条件

- 一个已完成 **ICP 备案** 的域名（H5 支付必需）
- 一个 **已认证** 的主体（企业营业执照 / 个体工商户营业执照）
- 法人身份证、对公账户（结算账户）

### 2.2 注册流程

1. 打开 [微信支付商户平台](https://pay.weixin.qq.com/)
2. 点击「立即注册」，按页面提示选择主体类型：
   - **个体工商户**：用个人营业执照，法人本人操作可免账户验证
   - **企业**：用公司营业执照，可选择汇款验证或法人扫码验证
3. 填写资料（主体信息、经营信息、结算规则、结算账户、超级管理员）
4. 超级管理员扫码确认 → 账户验证 → 签约
5. 微信审核（1~3 个工作日）

### 2.3 审核通过后你会得到

- **MchID（商户号）**：一串 10 位左右的数字，在「账户中心 → 商户信息」可查看
- 商户平台登录账号密码

---

## 3. 阶段二：获取 API 安全凭证

> 这一步拿到 3 个关键东西：**APIv3 密钥**、**API 证书（私钥）**、**证书序列号**

### 3.1 设置 APIv3 密钥

APIv3 密钥用于：
- 解密微信回调中的敏感信息（AES-256-GCM）
- 下载微信支付平台证书

**操作步骤**：
1. 登录 [微信支付商户平台](https://pay.weixin.qq.com/)
2. 进入「账户中心 → API 安全」
3. 找到「API v3 密钥」，点击「设置」
4. 输入 **32 位随机字符**（数字 + 大小写字母，不要有特殊符号）
5. **重要**：设置后无法再次查看，只能修改。请用文档保存好！

**示例密钥**（不要直接用，自己生成）：
```
SunnyFarm2026WxPayV3KeySecureABC
```

**生成工具**：[在线密码生成器](https://www.random.org/strings/)（选 32 chars、Alphanumeric）

### 3.2 下载 API 证书

API 证书用于：
- 对请求进行 **SHA256-RSA2048 签名**（防止请求被篡改）
- 微信平台用证书公钥验证你的请求

**操作步骤**：
1. 登录商户平台 → 账户中心 → API 安全
2. 找到「API 证书」，点击「申请证书」
3. 下载证书工具：
   - Windows: https://wx.gtimg.com/mch/files/WXCertUtil.exe
   - Mac: https://wx.gtimg.com/mch/files/WXCertUtil.dmg
4. 运行证书工具：
   - 填写商户号 + 商户名称（**必须和营业执照完全一致**）
   - 工具生成「证书请求串」→ 复制
5. 回到商户平台，粘贴「证书请求串」→ 操作密码 + 短信验证码 → 生成「证书串」
6. 将证书串粘贴回证书工具 → 完成 → 导出证书文件

### 3.3 你会得到的证书文件

| 文件名 | 用途 | 项目中的位置 |
|---|---|---|
| `apiclient_key.pem` | **商户私钥**（最关键，不能泄露！） | `mall-backend/src/main/resources/cert/apiclient_key.pem` |
| `apiclient_cert.pem` | 商户证书（公钥部分，可公开） | `mall-backend/src/main/resources/cert/apiclient_cert.pem` |
| `apiclient_cert.p12` | PKCS#12 格式证书（含私钥） | 可选保留 |

### 3.4 获取证书序列号

在商户平台「账户中心 → API 安全 → API 证书 → 管理证书」可直接看到 证书序列号，复制保存。

---

## 4. 阶段三：按平台申请 AppID

### 4.1 你需要哪些 AppID？

根据你的 uni-app 项目发布目标，按需申请：

| 发布目标 | AppID 来源 | 用途 |
|---|---|---|
| uni-app App 端（Android/iOS） | [微信开放平台](https://open.weixin.qq.com/) → 移动应用 | APP 支付、App 登录 |
| 微信小程序 | [微信公众平台](https://mp.weixin.qq.com/) → 小程序 | JSAPI 支付 |
| H5（微信内浏览器） | [微信公众平台](https://mp.weixin.qq.com/) → 公众号（服务号） | JSAPI 支付 |
| H5（外部浏览器） | 不需要 AppID | H5 支付 |

### 4.2 APP 端：微信开放平台移动应用

**操作步骤**：
1. 登录 [微信开放平台](https://open.weixin.qq.com/)（需先完成开发者资质认证，300元/年）
2. 「管理中心 → 移动应用 → 创建移动应用」
3. 填写应用信息：
   - 应用名称、应用简介、应用官网、应用图标
   - **Android 开发信息**：应用包名（如 `com.mall.farm`）、应用签名（MD5 32位，不含冒号）
   - **iOS 开发信息**：Bundle ID、Universal Link
4. 等待审核（1~3 个工作日）
5. 审核通过后获取 **AppID**

**Android 应用签名获取方法**：
- 下载签名工具 [Gen_Signature_Android.apk](https://open.weixin.qq.com/zh_CN/htmledition/res/dev/download/sdk/Gen_Signature_Android.apk)
- 安装到手机 → 输入包名 → 得到 MD5 签名
- 或者用命令行：`keytool -list -v -keystore your.keystore`（取 MD5 值，去掉冒号转小写）

### 4.3 微信小程序

**操作步骤**：
1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 点击「立即注册」→ 选择「小程序」
3. 完成主体认证（300元/年）
4. 开发管理 → 开发设置 → 获取 **AppID**
5. 在「支付」栏关联你的商户号

**uni-app 配置**：在 `manifest.json` 的 `mp-weixin.appid` 填入

### 4.4 H5 微信内：公众号（服务号）

**操作步骤**：
1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 注册公众号（选择服务号类型，个人只能注册订阅号，服务号必须企业主体）
3. 完成认证
4. 「开发 → 基本配置」获取 **AppID**
5. 「设置与开发 → 公众号设置 → 功能设置 → 网页授权域名」填入你的前端 H5 域名

### 4.5 H5 外部浏览器：不需要 AppID

H5 支付（trade_type=H5）直接用 MchID，不需要 AppID，但需要在商户平台单独开通 H5 支付产品权限（见下一节）。

---

## 5. 阶段四：绑定 MchID 与 AppID 并开通支付产品

### 5.1 绑定 AppID

拿到 AppID 后，必须在商户平台绑定才能用于支付：

1. 登录 [微信支付商户平台](https://pay.weixin.qq.com/)
2. 「产品中心 → AppID 账号管理 → 关联 AppID」
3. 选择 AppID 来源（开放平台 / 公众平台 / 小程序）
4. 输入 AppID → 确认绑定

> **重要**：一个 MchID 可以绑定多个 AppID；一个 AppID 也可以绑定多个 MchID。绑定关系确立后，这个 AppID 下的用户才能在你的应用中发起支付。

### 5.2 开通支付产品

每个支付通道都需要单独在商户平台开通：

| 支付产品 | 开通位置 | 审核时间 | 特殊要求 |
|---|---|---|---|
| **JSAPI 支付**（小程序/公众号） | 产品中心 → JSAPI → 申请开通 | 秒开/1个工作日 | 需要关联 AppID |
| **APP 支付** | 产品中心 → APP支付 → 申请开通 | 1~3 个工作日 | 需先在开放平台注册移动应用 |
| **H5 支付**（外部浏览器） | 产品中心 → H5支付 → 申请开通 | 1~7 个工作日 | **必须有 ICP 备案域名**，需要上传域名截图、经营场所简介 |
| **Native 支付**（扫码） | 产品中心 → Native支付 → 申请开通 | 秒开/1个工作日 | 无特殊要求 |

### 5.3 设置支付回调通知 URL

**必做**：所有支付类型都需要设置回调 URL，微信支付成功后会主动 POST 通知你的后端。

1. 商户平台 → 账户中心 → API 安全
2. 找到「回调通知 URL」
3. 填入：`https://your-domain.com/api/payment/wechat/notify`
4. **注意**：必须是 HTTPS 公网地址，不能用 localhost

> 本地开发调试时，可用内网穿透工具（ngrok、cpolar、花生壳）临时暴露本地后端端口。

---

## 6. 阶段五：后端代码完善清单

> 代码位置：`mall-backend/src/main/java/com/mall/service/impl/PaymentServiceImpl.java`

### 6.1 引入微信支付官方 SDK（推荐）

官方维护的 SDK 已经封装好了签名、验签、证书管理，比自己手写更可靠。

**Maven 依赖**（pom.xml 添加）：
```xml
<!-- 微信支付 V3 Java SDK (Apache HttpClient 实现) -->
<dependency>
    <groupId>com.github.wechatpay-apiv3</groupId>
    <artifactId>wechatpay-apache-httpclient</artifactId>
    <version>0.4.9</version>
</dependency>
```

**官方 GitHub**：https://github.com/wechatpay-apiv3/wechatpay-java

### 6.2 完善 RSA 签名（signWithRSA 方法）

当前代码是 `throw new UnsupportedOperationException`，需要替换为真正的 RSA 签名实现。

**方案 A：用官方 SDK（推荐）**
```java
// 加载商户私钥
PrivateKey merchantPrivateKey = PemUtil.loadPrivateKey(
    new FileInputStream("src/main/resources/cert/apiclient_key.pem"));

// 初始化签名器
PrivateKeySigner signer = new PrivateKeySigner(certSerialNo, merchantPrivateKey);

// 构造 HttpClient（带签名和验签）
AutoUpdateCertificatesVerifier verifier = new AutoUpdateCertificatesVerifier(
    new WechatPay2Credentials(mchId, signer),
    apiV3Key.getBytes(StandardCharsets.UTF_8));

CloseableHttpClient httpClient = WechatPayHttpClientBuilder.create()
    .withMerchant(mchId, certSerialNo, merchantPrivateKey)
    .withValidator(new WechatPay2Validator(verifier))
    .build();

// 后续所有请求都用这个 httpClient，自动处理签名和验签
```

**方案 B：自己实现（不推荐，但了解原理）**
```java
private String signWithRSA(String message) throws Exception {
    // 1. 读取 apiclient_key.pem 内容
    String keyContent = Files.readString(
        Paths.get(payConfig.getWechat().getPrivateKeyPath()));
    
    // 2. 去掉 PEM 文件头尾，Base64 解码
    String keyBody = keyContent
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
        .replaceAll("\\s", "");
    byte[] keyBytes = Base64.getDecoder().decode(keyBody);
    
    // 3. 构造 PKCS8EncodedKeySpec
    KeyFactory kf = KeyFactory.getInstance("RSA");
    PrivateKey privateKey = kf.generatePrivate(new PKCS8EncodedKeySpec(keyBytes));
    
    // 4. SHA256withRSA 签名
    Signature signature = Signature.getInstance("SHA256withRSA");
    signature.initSign(privateKey);
    signature.update(message.getBytes(StandardCharsets.UTF_8));
    byte[] signBytes = signature.sign();
    
    // 5. Base64 编码返回
    return Base64.getEncoder().encodeToString(signBytes);
}
```

### 6.3 完善 JSAPI 支付的二次签名

微信 JSAPI / 小程序支付在拿到 `prepay_id` 后，还需要对参数再次签名返回给前端。

```java
// 在 callWechatPayApi() 的 JSAPI 分支中：
case "JSAPI":
    String appId = wx.getAppId();
    String timeStamp = String.valueOf(System.currentTimeMillis() / 1000);
    String nonceStr = UUID.randomUUID().toString().replace("-", "");
    String packageVal = "prepay_id=" + wxResp.get("prepay_id");
    String signType = "RSA";
    
    // 二次签名字符串格式: appId={appId}&timeStamp={ts}&nonceStr={ns}&package={pkg}&signType=RSA
    String signMessage = String.format(
        "appId=%s&timeStamp=%s&nonceStr=%s&package=%s&signType=%s",
        appId, timeStamp, nonceStr, packageVal, signType);
    String paySign = signWithRSA(signMessage);  // 复用同一个 RSA 签名方法
    
    payParams.put("appId", appId);
    payParams.put("timeStamp", timeStamp);
    payParams.put("nonceStr", nonceStr);
    payParams.put("package", packageVal);
    payParams.put("signType", signType);
    payParams.put("paySign", paySign);
    break;
```

### 6.4 完善 APP 支付的二次签名

```java
// 在 callWechatPayApi() 的 APP 分支中：
case "APP":
    String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
    String noncestr = UUID.randomUUID().toString().replace("-", "");
    
    // 签名字符串: appid={}&partnerid={}&prepayid={}&package=Sign=WXPay&noncestr={}&timestamp={}
    String signMessage = String.format(
        "appid=%s&partnerid=%s&prepayid=%s&package=Sign=WXPay&noncestr=%s&timestamp=%s",
        wxResp.get("appid"), wxResp.get("partnerid"),
        wxResp.get("prepay_id"), noncestr, timestamp);
    String sign = signWithRSA(signMessage);
    
    payParams.put("appid", wxResp.get("appid"));
    payParams.put("partnerid", wxResp.get("partnerid"));
    payParams.put("prepayid", wxResp.get("prepay_id"));
    payParams.put("package", "Sign=WXPay");
    payParams.put("noncestr", noncestr);
    payParams.put("timestamp", timestamp);
    payParams.put("signType", "RSA");
    payParams.put("sign", sign);
    break;
```

### 6.5 实现回调验签 + 报文解密 + 业务处理

`handleWechatNotify()` 方法目前是 Mock 占位，需要完整实现。

**微信 V3 回调报文结构**：
```json
{
  "id": "通知ID",
  "event_type": "TRANSACTION.SUCCESS",
  "resource": {
    "algorithm": "AES-GCM",
    "ciphertext": "加密数据",
    "nonce": "随机串",
    "associated_data": "附加数据"
  }
}
```

**处理流程**：
```java
@Override
public boolean handleWechatNotify(String notifyBody, String signature, String timestamp, String nonce) {
    try {
        // ========== 步骤1：验签 ==========
        // 签名串 = timestamp + "\n" + nonce + "\n" + body + "\n"
        String signMessage = timestamp + "\n" + nonce + "\n" + notifyBody + "\n";
        
        // 用微信平台证书公钥验签（SHA256-RSA2048）
        // 平台证书可通过 /v3/certificates 接口自动下载并缓存
        boolean valid = verifyWechatSignature(signMessage, signature, 
            getWechatPlatformCert(serialNoFromHeader));
        if (!valid) {
            log.warn("[微信回调] 签名验证失败");
            return false;
        }
        
        // ========== 步骤2：解密 resource ==========
        JSONObject body = JSON.parseObject(notifyBody);
        JSONObject resource = body.getJSONObject("resource");
        String ciphertext = resource.getString("ciphertext");
        String nonceVal = resource.getString("nonce");
        String associatedData = resource.getString("associated_data");
        
        // AES-256-GCM 解密
        String decryptedJson = decryptAesGcm(
            payConfig.getWechat().getApiV3Key(),
            ciphertext, nonceVal, associatedData);
        
        JSONObject event = JSON.parseObject(decryptedJson);
        String tradeState = event.getString("trade_state");   // SUCCESS / REFUND / PAYERROR
        String outTradeNo = event.getString("out_trade_no");   // 你的 paymentNo
        String transactionId = event.getString("transaction_id"); // 微信支付单号
        
        // ========== 步骤3：更新业务状态 ==========
        Payment payment = paymentMapper.selectOne(
            new LambdaQueryWrapper<Payment>()
                .eq(Payment::getPaymentNo, outTradeNo)
                .last("LIMIT 1"));
        
        if (payment == null) {
            log.warn("[微信回调] 找不到支付流水 paymentNo={}", outTradeNo);
            return true; // 找不到流水也返回成功，避免微信反复重试
        }
        
        if ("SUCCESS".equals(tradeState)) {
            // 幂等：已成功就不再处理
            if (PAY_STATUS_SUCCESS == payment.getPayStatus()) {
                log.info("[微信回调] 流水已处理过 paymentNo={}", outTradeNo);
                return true;
            }
            
            payment.setPayStatus(PAY_STATUS_SUCCESS);
            payment.setPayTime(LocalDateTime.now());
            payment.setTransactionId(transactionId);
            paymentMapper.updateById(payment);
            
            // 更新订单状态
            Order order = orderMapper.selectById(payment.getOrderId());
            if (order != null && ORDER_STATUS_PENDING_PAY == order.getStatus()) {
                order.setStatus(ORDER_STATUS_PENDING_SHIP);
                order.setPayTime(LocalDateTime.now());
                orderMapper.updateById(order);
            }
            log.info("[微信回调] 支付成功 paymentNo={} orderNo={}", outTradeNo, payment.getOrderNo());
            
        } else if ("REFUND".equals(tradeState)) {
            // 退款处理
            log.info("[微信回调] 收到退款通知 paymentNo={}", outTradeNo);
            
        } else {
            log.warn("[微信回调] 其他状态 tradeState={}", tradeState);
        }
        
        return true;
        
    } catch (Exception e) {
        log.error("[微信回调] 处理异常", e);
        return false; // 返回失败让微信重试
    }
}
```

**AES-256-GCM 解密工具方法**：
```java
private String decryptAesGcm(String apiV3Key, String ciphertextB64, String nonce, String associatedData) throws Exception {
    byte[] key = apiV3Key.getBytes(StandardCharsets.UTF_8);
    byte[] nonceBytes = nonce.getBytes(StandardCharsets.UTF_8);
    byte[] associatedBytes = associatedData != null ? associatedData.getBytes(StandardCharsets.UTF_8) : new byte[0];
    byte[] ciphertextBytes = Base64.getDecoder().decode(ciphertextB64);
    
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    SecretKeySpec keySpec = new SecretKeySpec(key, "AES");
    GCMParameterSpec gcmSpec = new GCMParameterSpec(128, nonceBytes); // 128 bit tag length
    
    cipher.init(Cipher.DECRYPT_MODE, keySpec, gcmSpec);
    cipher.updateAAD(associatedBytes);
    byte[] decrypted = cipher.doFinal(ciphertextBytes);
    
    return new String(decrypted, StandardCharsets.UTF_8);
}
```

### 6.6 application.yml 最终配置模板

```yaml
# ==================== 支付配置 ====================
pay:
  mock:
    enabled: false    # ← 上线时改为 false
    success-rate: 100
    delay-ms: 1500
  wechat:
    # ====== 真实微信支付V3参数 ======
    mch-id: "1600000000"                    # 你的商户号
    app-id: "wx1234567890abcdef"           # 你的 AppID（根据 trade-type 选对应平台的）
    api-v3-key: "SunnyFarm2026WxPayV3KeySecureABC"  # 32位密钥
    private-key-path: "src/main/resources/cert/apiclient_key.pem"  # 私钥路径
    cert-serial-no: "7A5E063A3C548B13F2A19F0E0C1A2B3C4D5E6F78"    # 证书序列号
    
    # 回调通知 URL（必须是 https 公网地址）
    notify-url: "https://api.yourdomain.com/api/payment/wechat/notify"
    refund-notify-url: "https://api.yourdomain.com/api/payment/wechat/refund-notify"
    
    # 交易类型: APP / JSAPI / H5 / NATIVE
    # uni-app App端用 APP, 小程序用 JSAPI, H5外部浏览器用 H5
    trade-type: "APP"
```

### 6.7 证书文件放置

```
mall-backend/src/main/resources/
├── application.yml
├── cert/
│   ├── apiclient_key.pem      ← 商户私钥（从证书工具导出）
│   └── apiclient_cert.pem     ← 商户证书（可选）
└── mapper/
```

---

## 7. 阶段六：前端代码完善清单

### 7.1 uni-app App 端配置

在 `manifest.json` 中配置微信支付：

```json
{
  "app-plus": {
    "distribute": {
      "sdkConfigs": {
        "payment": {
          "wxpay": {
            "appid": "wx1234567890abcdef"
          }
        }
      }
    },
    "modules": {
      "Payment": {}   // 勾选支付模块
    }
  }
}
```

**HBuilderX 图形化界面**：
1. 打开 `manifest.json`
2. 「App 原生插件配置」→ 勾选「Payment(支付)」模块
3. 「第三方服务配置」→「支付配置」→ 勾选「微信支付」→ 填入 AppID
4. **必须重新打包**（云打包或本地打包）才能生效，H5 运行不支持 App 支付

### 7.2 微信小程序配置

在 `manifest.json` 中：

```json
{
  "mp-weixin": {
    "appid": "wxabcdef1234567890",  // 小程序 AppID
    "setting": {
      "urlCheck": false,
      "es6": true,
      "postcss": true
    },
    "usingComponents": true
  }
}
```

**开发者工具中还需要**：
- 「详情 → 本地设置」→ 不校验合法域名（开发阶段）
- 「详情 → 功能设置」→ 开启「微信支付」功能（开发阶段需在商户平台关联）

### 7.3 前端 pay.vue 当前状态

文件位置：[pay.vue](../mall-frontend/src/pages/pay.vue)

已实现：
- ✅ 支付方式选择（微信/支付宝）
- ✅ Mock 模式检测 + 模拟支付成功
- ✅ 轮询支付状态（真实模式兜底）
- ✅ 平台自动检测（APP / 小程序 / H5微信内 / H5外部 / PC扫码）

需要完善：
- ⚠️ APP 支付的 `uni.requestPayment` 参数名大小写需对齐后端返回
- ⚠️ JSAPI 支付需要用户 openid，当前未实现获取逻辑

### 7.4 APP 支付参数对齐检查

uni-app APP 端 `uni.requestPayment` 参数 vs 微信官方字段名对照：

| uni.requestPayment 参数 | 后端 APP 分支返回的字段名 | 是否匹配 |
|---|---|---|
| `provider` | — | `"wxpay"` |
| `timeStamp` | `timestamp` | ⚠️ 名称不同，需要前端转换 |
| `nonceStr` | `noncestr` | ⚠️ 名称不同 |
| `package` | `package` | ✅ |
| `signType` | `signType` | ✅ |
| `paySign` | `sign` | ⚠️ 名称不同 |

**建议**：在 pay.vue 的 `callRealPay` 方法中增加一层映射：
```javascript
if (platform === 'app') {
  return new Promise((resolve, reject) => {
    uni.requestPayment({
      provider: 'wxpay',
      timeStamp: payParams.timestamp,       // 后端返回 timestamp，直接用
      nonceStr: payParams.noncestr,         // 后端返回 noncestr
      package: payParams.package,
      signType: payParams.signType || 'RSA',
      paySign: payParams.sign,              // 后端返回 sign
      success: () => resolve(),
      fail: (err) => reject(new Error(err.errMsg))
    })
  })
}
```

或者更简洁地在后端 APP 分支返回时统一命名为前端期望的格式。

---

## 8. 阶段七：本地联调与测试

### 8.1 关闭 Mock 模式

```yaml
# application.yml
pay:
  mock:
    enabled: false    # 关键！
```

重启后端。访问 `GET /api/payment/config`，确认返回 `{"mock": false}`。

### 8.2 后端自测：手动调用微信下单接口

写一个 Controller 临时接口或用 curl/Postman 直接验证：

```bash
# 发送下单请求（替换你的真实参数）
curl -X POST https://api.mch.weixin.qq.com/v3/pay/transactions/app \
  -H "Authorization: WECHATPAY2-SHA256-RSA2048 mchid=\"你的mchId\",..." \
  -H "Content-Type: application/json" \
  -d '{
    "appid": "你的appId",
    "mchid": "你的mchId",
    "description": "测试订单",
    "out_trade_no": "TEST20260913001",
    "notify_url": "https://your-domain/api/payment/wechat/notify",
    "amount": {"total": 1, "currency": "CNY"}
  }'
```

**期望结果**：
- 成功：返回 `{"prepay_id": "wx201410272009395522657a690389285100", ...}`
- 失败：返回 `{"code": "PARAM_ERROR", "message": "参数错误"}` 之类，根据 code 排查

### 8.3 常见微信返回码

| code | 含义 | 排查方向 |
|---|---|---|
| `MCH_NOT_EXISTS` | 商户号不存在 | 检查 mch-id 填错 |
| `APPID_MCHID_NOT_MATCH` | AppID 和 MchID 未绑定 | 商户平台「AppID账号管理」中绑定 |
| `PARAM_ERROR` | 参数错误 | 检查必填字段是否都有、金额单位是否为分 |
| `ORDER_NOT_EXIST` | 订单号不存在（查单时） | out_trade_no 是否正确 |
| `NOTENOUGH` | 商户余额不足（退款时） | 商户号充值 |
| `SIGN_ERROR` | 签名错误 | 检查 RSA 私钥、签名串格式、时间戳 |
| `INVALID_REQUEST` | 请求参数非法 | 检查 notify_url 是否 https |
| `TRADE_ERROR` | 交易错误 | 用户当天交易异常，建议换时间再试 |

### 8.4 测试异步回调

微信支付成功后会 POST 到你的 notify_url。本地开发没有公网地址时：

**方案 A：内网穿透**
```bash
# ngrok 为例（注册免费账号）
ngrok http 8080
# 得到 https://xxxx.ngrok-free.app
# 把 https://xxxx.ngrok-free.app/api/payment/wechat/notify 填到微信商户平台回调设置
```

**方案 B：手动模拟回调**
```bash
curl -X POST http://localhost:8080/api/payment/wechat/notify \
  -H "Content-Type: application/json" \
  -H "Wechatpay-Signature: test" \
  -H "Wechatpay-Timestamp: $(date +%s)" \
  -H "Wechatpay-Nonce: testnonce" \
  -d '{
    "id": "test-notify-id",
    "event_type": "TRANSACTION.SUCCESS",
    "resource": {
      "algorithm": "AES-GCM",
      "ciphertext": "...加密内容...",
      "nonce": "testnonce",
      "associated_data": ""
    }
  }'
```

### 8.5 APP 支付完整测试流程

1. 后端配置完成 → `pay.mock.enabled = false`
2. uni-app 打包 Android APK（云打包，确保 manifest.json 中 SDK 配置生效）
3. 真机安装 APK
4. 启动后端（公网可访问）
5. 在 APP 中创建订单 → 点击「立即支付」
6. 期望：微信 APP 支付界面拉起 → 输入密码/指纹 → 支付成功
7. 检查后端日志：是否收到微信异步回调
8. 检查数据库：Payment 表 pay_status 是否变为 1，Order 表 status 是否变为 1

### 8.6 小程序支付测试

1. HBuilderX 运行到微信开发者工具
2. 在开发者工具中使用真机调试（扫码在手机上打开）
3. 确保用户已登录（拿到用户 openid）
4. 创建订单 → 立即支付 → 微信支付界面拉起

---

## 9. 阶段八：上线前检查清单

### 9.1 商户平台检查

- [ ] 商户号已注册并完成审核
- [ ] APIv3 密钥已设置，保存在安全的地方
- [ ] API 证书已下载，私钥文件有备份
- [ ] 证书序列号已记录
- [ ] 所有需要的支付产品已开通（APP / JSAPI / H5 / Native）
- [ ] AppID 已在「AppID账号管理」中绑定
- [ ] 支付回调 URL 已设置（HTTPS 公网）
- [ ] 结算账户已配置

### 9.2 后端检查

- [ ] `application.yml` 中 `pay.mock.enabled = false`
- [ ] `pay.wechat` 所有字段已填入真实值
- [ ] API 证书私钥文件已放到 `resources/cert/` 下
- [ ] RSA 签名方法已完整实现
- [ ] 回调验签 + 解密 + 业务处理已完整实现
- [ ] JSAPI / APP 二次签名已正确实现
- [ ] 所有接口 HTTPS 可访问（微信回调必须 HTTPS）
- [ ] 回调接口幂等性已处理（防止微信重试导致重复更新）
- [ ] 回调 URL 后端有访问日志（排查问题用）

### 9.3 前端检查

- [ ] manifest.json 中 AppID 已正确配置
- [ ] uni.requestPayment 参数名与后端返回字段对齐
- [ ] 真机端已重新打包（App 支付不支持 H5 运行）
- [ ] Mock 模式提示条在真实模式下不会误导用户

### 9.4 测试检查

- [ ] APP 支付完整流程测试通过（创建订单 → 拉起支付 → 支付成功 → 回调入库）
- [ ] 小程序支付完整流程测试通过
- [ ] 微信外 H5 支付流程测试通过（如需）
- [ ] 支付失败场景测试（余额不足、用户取消）
- [ ] 回调重试幂等测试（手动重复调用回调接口，不应重复更新）
- [ ] 轮询兜底测试（断网后再连，前端能正确拿到支付结果）

---

## 10. 常见问题 FAQ

### Q1: 为什么下单报 `APPID_MCHID_NOT_MATCH`？
**A**: AppID 和 MchID 没有绑定。登录微信商户平台 → 产品中心 → AppID账号管理 → 关联 AppID。

### Q2: 为什么下单报 `SIGN_ERROR`？
**A**: 签名问题。检查：
1. 证书私钥文件路径是否正确、文件内容是否完整
2. 证书序列号（cert-serial-no）是否和当前私钥匹配
3. 签名字符串格式是否正确（注意换行符、字段顺序）
4. APIv3 密钥是否 32 位

### Q3: H5 支付为什么拉起失败 / 报当前浏览器不支持？
**A**: 
- H5 支付只能在**微信外部浏览器**使用（Safari/Chrome等）
- 微信内置浏览器打开的 H5 必须用 **JSAPI 支付**（需要公众号）
- H5 支付域名必须在商户平台「产品中心 → 开发配置 → H5支付域名」中配置

### Q4: JSAPI 支付为什么报 `openid` 相关错误？
**A**: JSAPI 支付需要 `openid`（用户在该公众号/小程序下的唯一标识）。你需要通过微信的 OAuth2.0 网页授权流程获取 openid，传给后端再下单。

### Q5: 微信异步回调不到怎么办？
**A**: 
1. 检查回调 URL 是否是 **HTTPS 公网地址**（不能是 localhost、不能是 HTTP）
2. 检查服务器防火墙/安全组是否放行微信 IP 段
3. 检查回调接口返回值格式是否正确：`{"code":"SUCCESS","message":"成功"}`
4. 用前端轮询接口 `GET /api/payment/status` 兜底

### Q6: 微信支付的金额单位是元还是分？
**A**: **分**。微信 APIv3 中 `amount.total` 单位为分。你的代码里已经做了转换：`payment.getPayAmount().multiply(new BigDecimal(100))`。**注意使用 intValue() 或 longValue()，不能有小数。**

### Q7: 订单号可以重复吗？
**A**: 不能。微信要求 `out_trade_no` 在商户号下 **唯一**。你的支付流水号生成逻辑是 `P + 时间戳 + 4位随机`，理论上不会重复，但并发场景下建议加分布式锁或用 UUID。

### Q8: 微信回调超时 / 重试机制？
**A**: 微信在以下时间点重试：15s、15min、1h、2h、6h、12h、24h、48h。最长重试 8 次，48 小时后不再重试。所以你的回调处理必须**幂等**。

### Q9: 为什么 APP 支付拉起失败 / 没有反应？
**A**: 
1. manifest.json 中没有配置微信支付 SDK 的 AppID，需要重新打包
2. 手机上没有安装微信 App
3. Android：开放平台包名/签名和你打出来的 APK 不一致
4. iOS：Info.plist 中没有配置 URL Scheme（AppID）

### Q10: 如何申请退款？
**A**: 退款是另一个 API：`POST /v3/refund/domestic/refunds`，需要同样的签名，还需要退款单号（out_refund_no）。当前代码只预留了退款回调接口，退款功能需要后续开发。

---

## 11. 官方文档链接汇总

| 内容 | 链接 |
|---|---|
| 微信支付商户平台 | https://pay.weixin.qq.com/ |
| 微信开放平台（APP端 AppID） | https://open.weixin.qq.com/ |
| 微信公众平台（小程序/公众号 AppID） | https://mp.weixin.qq.com/ |
| APIv3 接口规则 | https://pay.weixin.qq.com/doc/v3/merchant/4012081606 |
| JSAPI 支付开发指引 | https://pay.weixin.qq.com/doc/v3/merchant/4012791835 |
| APP 支付开发指引 | https://pay.weixin.qq.com/doc/v3/merchant/4012791840 |
| H5 支付开发指引 | https://pay.weixin.qq.com/doc/v3/merchant/4012791841 |
| Native 支付开发指引 | https://pay.weixin.qq.com/doc/v3/merchant/4012791842 |
| 异步通知回调 | https://pay.weixin.qq.com/doc/v3/merchant/4012791867 |
| 微信支付 Java SDK (Apache HttpClient) | https://github.com/wechatpay-apiv3/wechatpay-java |
| uni.requestPayment API | https://uniapp.dcloud.net.cn/api/plugins/payment.html |
| uni-app manifest.json | https://uniapp.dcloud.net.cn/collocation/manifest.html |
| API 证书下载工具（Windows） | https://wx.gtimg.com/mch/files/WXCertUtil.exe |
| API 证书下载工具（Mac） | https://wx.gtimg.com/mch/files/WXCertUtil.dmg |
| ICP 备案查询 | https://beian.miit.gov.cn/ |
| Android 应用签名工具 | https://open.weixin.qq.com/zh_CN/htmledition/res/dev/download/sdk/Gen_Signature_Android.apk |

---

## 附录：时间线预估

| 阶段 | 预计耗时 | 是否可并行 |
|---|---|---|
| 开通微信支付商户号 | 1~3 个工作日 | — |
| 申请 AppID（开放平台认证 + 移动应用注册） | 1~3 个工作日 | 与商户号可并行 |
| 下载证书 + 设置 APIv3 密钥 | 15 分钟 | 商户号通过后 |
| 绑定 AppID + 开通支付产品权限 | 1~7 个工作日（H5 支付最慢） | 商户号 + AppID 都拿到后 |
| 后端代码完善 + 自测 | 1~2 天 | — |
| 前端打包 + 真机测试 | 1 天 | — |
| **总计** | **1~2 周** | 尽量并行压缩 |

---

> 祝你接入顺利！遇到问题先查官方文档的错误码说明，90% 的问题都能找到答案。
