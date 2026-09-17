package com.mall.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.FileCopyUtils;
import org.springframework.util.StringUtils;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
public class WechatPayUtil {

    private static final String SCHEMA = "WECHATPAY2-SHA256-RSA2048";
    private static final Map<String, PrivateKey> PRIVATE_KEY_CACHE = new ConcurrentHashMap<>();

    /**
     * 加载商户私钥（支持 classpath: 与本地绝对/相对路径）
     */
    public static PrivateKey loadPrivateKey(String privateKeyPath) throws Exception {
        if (!StringUtils.hasText(privateKeyPath)) {
            throw new IllegalArgumentException("微信支付私钥路径 privateKeyPath 不能为空");
        }

        PrivateKey cached = PRIVATE_KEY_CACHE.get(privateKeyPath);
        if (cached != null) {
            return cached;
        }

        byte[] keyBytes;
        if (privateKeyPath.startsWith("classpath:")) {
            String path = privateKeyPath.substring("classpath:".length());
            if (path.startsWith("/")) {
                path = path.substring(1);
            }
            ClassPathResource resource = new ClassPathResource(path);
            try (InputStream is = resource.getInputStream()) {
                keyBytes = FileCopyUtils.copyToByteArray(is);
            }
        } else {
            File file = new File(privateKeyPath);
            if (!file.exists()) {
                ClassPathResource resource = new ClassPathResource(privateKeyPath);
                if (resource.exists()) {
                    try (InputStream is = resource.getInputStream()) {
                        keyBytes = FileCopyUtils.copyToByteArray(is);
                    }
                } else {
                    throw new IllegalArgumentException("未找到私钥文件: " + privateKeyPath);
                }
            } else {
                try (InputStream is = new FileInputStream(file)) {
                    keyBytes = FileCopyUtils.copyToByteArray(is);
                }
            }
        }

        String keyStr = new String(keyBytes, StandardCharsets.UTF_8);
        String cleanKey = keyStr
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s+", "");

        byte[] decoded = Base64.getDecoder().decode(cleanKey);
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(decoded);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        PrivateKey privateKey = keyFactory.generatePrivate(keySpec);

        PRIVATE_KEY_CACHE.put(privateKeyPath, privateKey);
        return privateKey;
    }

    /**
     * 对数据进行 SHA256-RSA 签名并返回 Base64 字符串
     */
    public static String signSha256Rsa(String message, PrivateKey privateKey) throws Exception {
        Signature signature = Signature.getInstance("SHA256withRSA");
        signature.initSign(privateKey);
        signature.update(message.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(signature.sign());
    }

    /**
     * 生成微信支付 V3 请求 Authorization 认证请求头
     * 格式: WECHATPAY2-SHA256-RSA2048 mchid="...",nonce_str="...",timestamp="...",serial_no="...",signature="..."
     */
    public static String buildAuthorizationHeader(String mchId,
                                                  String certSerialNo,
                                                  String method,
                                                  String canonicalUrl,
                                                  String body,
                                                  PrivateKey privateKey) throws Exception {
        String nonceStr = UUID.randomUUID().toString().replace("-", "");
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        String message = method + "\n" + canonicalUrl + "\n" + timestamp + "\n" + nonceStr + "\n" + (body == null ? "" : body) + "\n";
        String signature = signSha256Rsa(message, privateKey);

        return SCHEMA + " " +
                "mchid=\"" + mchId + "\"," +
                "nonce_str=\"" + nonceStr + "\"," +
                "timestamp=\"" + timestamp + "\"," +
                "serial_no=\"" + certSerialNo + "\"," +
                "signature=\"" + signature + "\"";
    }

    /**
     * 计算微信小程序 JSAPI 前端调起支付所需的 paySign 签名
     * 格式:
     * appId\n
     * timeStamp\n
     * nonceStr\n
     * package\n
     */
    public static String buildJsapiPaySign(String appId,
                                           String timeStamp,
                                           String nonceStr,
                                           String packageValue,
                                           PrivateKey privateKey) throws Exception {
        String message = appId + "\n" + timeStamp + "\n" + nonceStr + "\n" + packageValue + "\n";
        return signSha256Rsa(message, privateKey);
    }

    /**
     * AES-256-GCM 解密微信回调通知中的 resource.ciphertext
     *
     * @param apiV3Key       商户平台设置的 32 字符 APIv3Key
     * @param associatedData 回调报文里的 associated_data
     * @param nonce          回调报文里的 nonce
     * @param ciphertext     Base64 编码的密文
     * @return 解密后的 JSON 明文字符串
     */
    public static String decryptAesGcm(String apiV3Key, String associatedData, String nonce, String ciphertext) throws Exception {
        if (!StringUtils.hasText(apiV3Key)) {
            throw new IllegalArgumentException("APIv3Key 未配置，无法解密微信回调");
        }
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        SecretKeySpec keySpec = new SecretKeySpec(apiV3Key.getBytes(StandardCharsets.UTF_8), "AES");
        GCMParameterSpec parameterSpec = new GCMParameterSpec(128, nonce.getBytes(StandardCharsets.UTF_8));
        cipher.init(Cipher.DECRYPT_MODE, keySpec, parameterSpec);

        if (StringUtils.hasText(associatedData)) {
            cipher.updateAAD(associatedData.getBytes(StandardCharsets.UTF_8));
        }

        byte[] plainBytes = cipher.doFinal(Base64.getDecoder().decode(ciphertext));
        return new String(plainBytes, StandardCharsets.UTF_8);
    }
}
