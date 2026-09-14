package com.mall.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mall.dto.LoginDTO;
import com.mall.entity.Admin;

public interface AdminService extends IService<Admin> {
    String login(LoginDTO dto);

    Admin getByUsername(String username);
}
