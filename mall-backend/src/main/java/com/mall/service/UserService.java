package com.mall.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mall.common.PageResult;
import com.mall.dto.LoginDTO;
import com.mall.dto.PageDTO;
import com.mall.dto.UserDTO;
import com.mall.entity.User;

import java.util.List;

public interface UserService extends IService<User> {
    String login(LoginDTO dto);

    User getByUsername(String username);

    void register(LoginDTO dto);

    List<User> listAll();

    PageResult<User> pageList(PageDTO pageDTO);

    void addUser(UserDTO dto);

    void updateUser(UserDTO dto);

    void deleteUser(Long id);

    void deleteBatch(List<Long> ids);

    void updateStatus(Long id, Integer status);

    void updateStatusBatch(List<Long> ids, Integer status);
}
