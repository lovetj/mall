package com.mall.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "wechat")
public class WechatProperties {

    private Miniapp miniapp = new Miniapp();

    @Data
    public static class Miniapp {
        /** 小程序 app-id */
        private String appId = "";
        /** 小程序 app-secret */
        private String secret = "";
        /** 是否启用 Mock/本地兼容模式（未配置秘钥或特定mock code时降级使用） */
        private boolean mock = true;
    }
}
