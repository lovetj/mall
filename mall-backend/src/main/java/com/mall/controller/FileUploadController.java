package com.mall.controller;

import com.mall.config.FileConfigProperties;
import com.mall.common.Result;
import com.mall.entity.User;
import com.mall.service.UserService;
import com.mall.util.JwtUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
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

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserService userService;

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
     * @param module 目录/模块，例如 "product", "product/images", "category", "avatar"
     * @param customFileName 自定义固定文件名（可选，传该值时保持文件名不变覆盖写入）
     * @param openidParam 用户微信 openid（可选，用于 avatar 模块固定文件名）
     * @param authorization 登录凭证（可选，用于识别用户并固定头像文件名）
     * @return 包含相对路径与完整URL的结果
     */
    @PostMapping("/upload")
    public Result<Map<String, String>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "module", defaultValue = "common") String module,
            @RequestParam(value = "fileName", required = false) String customFileName,
            @RequestParam(value = "openid", required = false) String openidParam,
            @RequestHeader(value = "Authorization", required = false) String authorization
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

            String uniqueName;
            String userKey = null;
            User currentUser = null;

            if (StringUtils.hasText(customFileName)) {
                String sanitized = new File(customFileName.trim()).getName();
                if (StringUtils.hasText(sanitized)) {
                    uniqueName = sanitized;
                    if (!uniqueName.contains(".") && StringUtils.hasText(ext)) {
                        uniqueName = uniqueName + ext;
                    }
                } else {
                    uniqueName = customFileName.trim();
                }
            } else if ("avatar".equalsIgnoreCase(cleanModule)) {
                if (StringUtils.hasText(authorization) && jwtUtil.validateToken(authorization)) {
                    try {
                        String userId = jwtUtil.getUserId(authorization);
                        if (StringUtils.hasText(userId)) {
                            currentUser = userService.getById(userId);
                            if (currentUser != null) {
                                userKey = StringUtils.hasText(currentUser.getOpenid()) ? currentUser.getOpenid() : currentUser.getId();
                            }
                        }
                    } catch (Exception ignored) {
                    }
                }
                if (!StringUtils.hasText(userKey) && StringUtils.hasText(openidParam)) {
                    userKey = openidParam.trim();
                }

                if (StringUtils.hasText(userKey)) {
                    String cleanUserKey = userKey.replaceAll("[^a-zA-Z0-9_-]", "");
                    String fileExt = StringUtils.hasText(ext) ? ext : ".png";
                    uniqueName = "avatar_" + cleanUserKey + fileExt;
                } else {
                    String datePrefix = new SimpleDateFormat("yyyyMMdd").format(new Date());
                    uniqueName = datePrefix + "_" + UUID.randomUUID().toString().replace("-", "") + ext;
                }
            } else {
                String datePrefix = new SimpleDateFormat("yyyyMMdd").format(new Date());
                uniqueName = datePrefix + "_" + UUID.randomUUID().toString().replace("-", "") + ext;
            }

            // 存储目标物理目录与文件
            String basePath = fileConfigProperties.getBasePath();
            File destFolder = new File(basePath + File.separator + cleanModule.replace("/", File.separator));
            if (!destFolder.exists()) {
                destFolder.mkdirs();
            }

            // 头像场景若按 userKey 固定命名，清理旧的不同扩展名历史文件，防止冗余残留
            if ("avatar".equalsIgnoreCase(cleanModule) && StringUtils.hasText(userKey)) {
                String cleanUserKey = userKey.replaceAll("[^a-zA-Z0-9_-]", "");
                String baseAvatarPrefix = "avatar_" + cleanUserKey + ".";
                final String targetFileName = uniqueName;
                File[] oldFiles = destFolder.listFiles((dir, name) -> name.startsWith(baseAvatarPrefix) && !name.equals(targetFileName));
                if (oldFiles != null) {
                    for (File oldFile : oldFiles) {
                        try {
                            oldFile.delete();
                        } catch (Exception ignored) {
                        }
                    }
                }
            }

            File destFile = new File(destFolder, uniqueName);
            file.transferTo(destFile);

            String relativePath = "/" + cleanModule + "/" + uniqueName;

            // 若当前已获取到登录用户且为头像上传，自动同步更新用户头像字段
            if (currentUser != null && "avatar".equalsIgnoreCase(cleanModule)) {
                currentUser.setAvatar(relativePath);
                userService.updateById(currentUser);
            }

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
