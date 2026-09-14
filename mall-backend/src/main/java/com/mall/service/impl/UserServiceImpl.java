package com.mall.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.crypto.digest.BCrypt;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.service.UserService;
import com.mall.common.PageResult;
import com.mall.dto.LoginDTO;
import com.mall.dto.PageDTO;
import com.mall.dto.UserDTO;
import com.mall.entity.Order;
import com.mall.entity.User;
import com.mall.mapper.OrderMapper;
import com.mall.mapper.UserMapper;
import com.mall.util.JwtUtil;
import com.mall.util.UrlUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    @Autowired
    private OrderMapper orderMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UrlUtil urlUtil;

    @Override
    public String login(LoginDTO dto) {
        User user = getByUsername(dto.getUsername());
        if (user == null) {
            throw new RuntimeException("用户名或密码错误");
        }
        if (!BCrypt.checkpw(dto.getPassword(), user.getPassword())) {
            throw new RuntimeException("用户名或密码错误");
        }
        if (user.getStatus() != null && user.getStatus() != 1) {
            throw new RuntimeException("账号已被禁用");
        }
        return jwtUtil.generateToken(user.getId(), user.getUsername());
    }

    @Override
    public User getByUsername(String username) {
        if (!StringUtils.hasText(username)) {
            return null;
        }
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getUsername, username.trim());
        return getOne(wrapper);
    }

    @Override
    public void register(LoginDTO dto) {
        if (!StringUtils.hasText(dto.getUsername()) || !StringUtils.hasText(dto.getPassword())) {
            throw new RuntimeException("用户名和密码不能为空");
        }
        User existUser = getByUsername(dto.getUsername());
        if (existUser != null) {
            throw new RuntimeException("用户名已存在");
        }
        User user = new User();
        user.setUsername(dto.getUsername().trim());
        user.setPassword(BCrypt.hashpw(dto.getPassword().trim()));
        user.setNickname(dto.getUsername().trim());
        user.setStatus(1);
        save(user);
    }

    @Override
    public List<User> listAll() {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByDesc(User::getCreateTime);
        List<User> list = list(wrapper);
        list.forEach(u -> u.setPassword(null));
        urlUtil.resolveUsers(list);
        return list;
    }

    @Override
    public PageResult<User> pageList(PageDTO pageDTO) {
        Page<User> page = new Page<>(pageDTO.getPageNum(), pageDTO.getPageSize());
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(pageDTO.getKeyword())) {
            String kw = pageDTO.getKeyword().trim();
            wrapper.and(w -> w.like(User::getUsername, kw)
                    .or().like(User::getNickname, kw)
                    .or().like(User::getPhone, kw));
        }
        if (pageDTO.getStatus() != null) {
            wrapper.eq(User::getStatus, pageDTO.getStatus());
        }
        wrapper.orderByDesc(User::getCreateTime);
        Page<User> result = page(page, wrapper);
        List<User> records = result.getRecords();
        records.forEach(u -> u.setPassword(null));
        urlUtil.resolveUsers(records);
        return new PageResult<>(records, result.getTotal(), result.getPages(), result.getCurrent(), result.getSize());
    }

    private void checkUniqueUsername(String username, Long excludeId) {
        if (StringUtils.hasText(username)) {
            LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<User>()
                    .eq(User::getUsername, username.trim());
            if (excludeId != null) {
                wrapper.ne(User::getId, excludeId);
            }
            if (count(wrapper) > 0) {
                throw new RuntimeException("用户名 [" + username.trim() + "] 已存在");
            }
        }
    }

    @Override
    public void addUser(UserDTO dto) {
        checkUniqueUsername(dto.getUsername(), null);
        User user = new User();
        BeanUtil.copyProperties(dto, user);
        if (StringUtils.hasText(dto.getPassword())) {
            user.setPassword(BCrypt.hashpw(dto.getPassword().trim()));
        } else {
            user.setPassword(BCrypt.hashpw("123456"));
        }
        if (user.getStatus() == null) {
            user.setStatus(1);
        }
        save(user);
    }

    @Override
    public void updateUser(UserDTO dto) {
        if (dto.getId() == null) {
            throw new RuntimeException("用户ID不能为空");
        }
        checkUniqueUsername(dto.getUsername(), dto.getId());
        User user = getById(dto.getId());
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }
        user.setUsername(dto.getUsername());
        user.setNickname(dto.getNickname());
        user.setPhone(dto.getPhone());
        user.setAvatar(dto.getAvatar());
        if (dto.getStatus() != null) {
            user.setStatus(dto.getStatus());
        }
        if (StringUtils.hasText(dto.getPassword())) {
            user.setPassword(BCrypt.hashpw(dto.getPassword().trim()));
        }
        updateById(user);
    }

    @Override
    public void deleteUser(Long id) {
        LambdaQueryWrapper<Order> orderWrapper = new LambdaQueryWrapper<>();
        orderWrapper.eq(Order::getUserId, id);
        Long orderCount = orderMapper.selectCount(orderWrapper);
        if (orderCount != null && orderCount > 0) {
            throw new RuntimeException("该用户存在 " + orderCount + " 笔关联订单，无法直接删除！");
        }
        removeById(id);
    }

    @Override
    public void deleteBatch(List<Long> ids) {
        if (ids != null && !ids.isEmpty()) {
            LambdaQueryWrapper<Order> orderWrapper = new LambdaQueryWrapper<>();
            orderWrapper.in(Order::getUserId, ids);
            Long orderCount = orderMapper.selectCount(orderWrapper);
            if (orderCount != null && orderCount > 0) {
                throw new RuntimeException("所选用户中存在关联订单，无法直接删除！");
            }
            removeByIds(ids);
        }
    }

    @Override
    public void updateStatus(Long id, Integer status) {
        User user = new User();
        user.setId(id);
        user.setStatus(status);
        updateById(user);
    }

    @Override
    public void updateStatusBatch(List<Long> ids, Integer status) {
        if (ids != null && !ids.isEmpty()) {
            List<User> list = ids.stream().map(id -> {
                User u = new User();
                u.setId(id);
                u.setStatus(status);
                return u;
            }).collect(Collectors.toList());
            updateBatchById(list);
        }
    }
}
