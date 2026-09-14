package com.mall.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "file")
public class FileConfigProperties {
    private String baseServer = "http://localhost:8081/sunny_file";
    private String basePath = "D:\\soft\\apache-tomcat-8.5.63\\webapps\\sunny_file";
}
