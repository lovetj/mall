package com.mall.controller;

import com.mall.service.ConfigService;
import com.mall.common.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/config")
public class ConfigController {

    @Autowired
    private ConfigService configService;

    @GetMapping("/{key}")
    public Result<String> get(@PathVariable String key) {
        return Result.success(configService.getValueByKey(key));
    }

    @PostMapping
    public Result<Void> set(
            @RequestParam(value = "key", required = false) String paramKey,
            @RequestParam(value = "value", required = false) String paramValue,
            @RequestBody(required = false) Map<String, Object> body) {
        String finalKey = paramKey;
        String finalValue = paramValue;

        if (body != null) {
            if (body.get("key") != null) {
                finalKey = String.valueOf(body.get("key"));
            }
            if (body.get("value") != null) {
                finalValue = String.valueOf(body.get("value"));
            }
        }

        if (finalKey == null || finalKey.trim().isEmpty()) {
            return Result.error("配置键不能为空");
        }

        configService.setValueByKey(finalKey.trim(), finalValue == null ? "" : finalValue.trim());
        return Result.success();
    }
}
