package com.mall.controller;

import cn.hutool.crypto.digest.BCrypt;
import com.mall.common.Result;
import com.mall.dto.LoginDTO;
import com.mall.entity.Admin;
import com.mall.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @PostMapping("/login")
    public Result<Map<String, Object>> login(@Valid @RequestBody LoginDTO dto) {
        String token = adminService.login(dto);
        Admin admin = adminService.getByUsername(dto.getUsername());
        Map<String, Object> data = new HashMap<>();
        data.put("token", token);
        data.put("admin", admin);
        return Result.success(data);
    }

    @GetMapping("/info")
    public Result<Admin> info(@RequestParam String username) {
        return Result.success(adminService.getByUsername(username));
    }

    @PostMapping("/register")
    public Result<Void> register(@RequestBody LoginDTO dto) {
        Admin existAdmin = adminService.getByUsername(dto.getUsername());
        if (existAdmin != null) {
            return Result.error("用户名已存在");
        }
        Admin admin = new Admin();
        admin.setUsername(dto.getUsername());
        admin.setPassword(BCrypt.hashpw(dto.getPassword()));
        admin.setRealName(dto.getUsername());
        admin.setStatus(1);
        adminService.save(admin);
        return Result.success();
    }
}
