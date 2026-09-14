package com.mall.service.impl;

import cn.hutool.crypto.digest.BCrypt;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.dto.LoginDTO;
import com.mall.service.AdminService;
import com.mall.entity.Admin;
import com.mall.mapper.AdminMapper;
import com.mall.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AdminServiceImpl extends ServiceImpl<AdminMapper, Admin> implements AdminService {

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    public String login(LoginDTO dto) {
        Admin admin = getByUsername(dto.getUsername());
        if (admin == null) {
            throw new RuntimeException("用户名或密码错误");
        }
        if (!BCrypt.checkpw(dto.getPassword(), admin.getPassword())) {
            throw new RuntimeException("用户名或密码错误");
        }
        if (admin.getStatus() != 1) {
            throw new RuntimeException("账号已被禁用");
        }
        return jwtUtil.generateToken(admin.getId(), admin.getUsername());
    }

    @Override
    public Admin getByUsername(String username) {
        LambdaQueryWrapper<Admin> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Admin::getUsername, username);
        return getOne(wrapper);
    }
}
