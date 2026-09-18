package com.mall.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 支付相关配置(Mock模式 + 真实微信支付V3配置)
 *
 * 真实商户号接入流程:
 * 1. 在微信商户平台(mch.weixin.qq.com)注册商户号, 完成微信认证
 * 2. 在商户平台 -> 账户中心 -> API安全 中:
 *    - 设置 APIv3 密钥(32位随机字符串, 自己保存好)
 *    - 下载 API证书 (apiclient_key.pem / apiclient_cert.pem)
 *    - 设置 支付回调通知URL (必须是 https 公网地址, 不能用 localhost)
 * 3. 去微信开放平台/公众平台绑定你的 MchID 和 APPID
 * 4. 把以下配置填到 application.yml, 把 mock.enabled 改成 false
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "pay")
public class PayConfig {

    /** ======= Mock模式(开发/测试用) ======= */
    private Mock mock = new Mock();

    /** ======= 真实微信支付V3配置 ======= */
    private Wechat wechat = new Wechat();

    @Data
    public static class Mock {
        /** 是否开启Mock模式(默认true, 不依赖真实商户号) */
        private boolean enabled = true;
        /** Mock 支付成功概率 0~100, 默认100%(全部成功) */
        private int successRate = 100;
        /** Mock 支付延迟ms(模拟真实拉起支付的体验) */
        private int delayMs = 1500;
    }

    @Data
    public static class Wechat {
        /** 商户号 MchID */
        private String mchId = "";
        /** 应用APPID(公众号/小程序/开放平台) */
        private String appId = "";
        /** APIv3 密钥(32位, 商户平台自己设置的那个) */
        private String apiV3Key = "";
        /** API证书私钥文件路径(.pem) */
        private String privateKeyPath = "";
        /** API证书序列号 */
        private String certSerialNo = "";
        /** 微信支付公钥ID (若使用平台公钥模式) */
        private String publicKeyId = "";
        /** 平台证书/平台公钥文件路径 (回调验签用, 与商户私钥路径同风格 classpath: 或本地路径) */
        private String platformCertPath = "";
        /** 平台证书/平台公钥对应的序列号 (公钥模式下等于 publicKeyId) */
        private String platformCertSerialNo = "";
        /** 支付回调通知URL(必须是 https 公网地址, 微信POST过来) */
        private String notifyUrl = "";
        /** 退款回调URL */
        private String refundNotifyUrl = "";
        /** 支付下单接口: JSAPI / APP / H5 / NATIVE */
        private String tradeType = "APP";
    }
}
