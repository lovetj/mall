package com.mall.controller;

import com.mall.config.FileConfigProperties;
import com.mall.common.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/file")
public class FileUploadController {

    @Autowired
    private FileConfigProperties fileConfigProperties;

    /**
     * 获取文件服务器基础配置（域名/前缀）
     */
    @GetMapping("/config")
    public Result<Map<String, String>> getFileConfig() {
        Map<String, String> map = new HashMap<>();
        map.put("baseServer", fileConfigProperties.getBaseServer());
        return Result.success(map);
    }

    /**
     * 通用文件上传接口
     * @param file 上传的文件
     * @param module 目录/模块，例如 "product", "product/images", "category"
     * @return 包含相对路径与完整URL的结果
     */
    @PostMapping("/upload")
    public Result<Map<String, String>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "module", defaultValue = "common") String module
    ) {
        if (file.isEmpty()) {
            return Result.error("上传文件不能为空");
        }

        try {
            // 获取原始文件名并处理编码
            String originalFilename = file.getOriginalFilename();
            if (originalFilename != null) {
                // 确保中文文件名编码正常
                try {
                    byte[] bytes = originalFilename.getBytes(StandardCharsets.ISO_8859_1);
                    String utf8Name = new String(bytes, StandardCharsets.UTF_8);
                    if (!utf8Name.contains("\uFFFD")) {
                        originalFilename = utf8Name;
                    }
                } catch (Exception ignored) {
                }
            } else {
                originalFilename = "unknown";
            }

            // 清理 module 路径中的首尾斜杠与非法字符
            String cleanModule = module.trim().replaceAll("^[/\\\\]+|[/\\\\]+$", "");
            if (cleanModule.isEmpty()) {
                cleanModule = "common";
            }

            // 获取文件扩展名
            String ext = "";
            int dotIndex = originalFilename.lastIndexOf('.');
            if (dotIndex >= 0) {
                ext = originalFilename.substring(dotIndex);
            }

            // 生成唯一文件名，防止重名与特殊字符问题
            String datePrefix = new SimpleDateFormat("yyyyMMdd").format(new Date());
            String uniqueName = datePrefix + "_" + UUID.randomUUID().toString().replace("-", "") + ext;

            // 相对路径，如 /product/20260912_xxx.jpg
            String relativePath = "/" + cleanModule + "/" + uniqueName;

            // 存储目标物理目录与文件
            String basePath = fileConfigProperties.getBasePath();
            File destFolder = new File(basePath + File.separator + cleanModule.replace("/", File.separator));
            if (!destFolder.exists()) {
                destFolder.mkdirs();
            }

            File destFile = new File(destFolder, uniqueName);
            file.transferTo(destFile);

            // 注意：后端不再拼接 baseServer，url 字段直接用 relativePath
            // 前端会通过 formatImageUrl(fileBaseServer + relativePath) 自行拼接完整地址
            Map<String, String> res = new HashMap<>();
            res.put("relativePath", relativePath);
            res.put("url", relativePath);
            res.put("originalName", originalFilename);

            return Result.success(res);
        } catch (IOException e) {
            log.error("文件上传IO异常: module={}, originalFilename={}", module, file.getOriginalFilename(), e);
            return Result.error("文件上传失败: " + e.getMessage());
        } catch (Exception e) {
            log.error("文件上传系统异常: module={}, originalFilename={}", module, file.getOriginalFilename(), e);
            return Result.error("文件上传异常: " + e.getMessage());
        }
    }
}
