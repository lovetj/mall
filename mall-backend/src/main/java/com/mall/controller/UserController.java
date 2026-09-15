package com.mall.controller;

import com.mall.common.PageResult;
import com.mall.dto.BatchStatusDTO;
import com.mall.dto.LoginDTO;
import com.mall.dto.UserDTO;
import com.mall.dto.WxLoginDTO;
import com.mall.entity.User;
import com.mall.service.UserService;
import com.mall.util.JwtUtil;
import com.mall.util.UrlUtil;
import com.mall.common.Result;
import com.mall.dto.PageDTO;
import cn.hutool.crypto.digest.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UrlUtil urlUtil;

    @PostMapping("/login")
    public Result<Map<String, Object>> login(@Valid @RequestBody LoginDTO dto) {
        String token = userService.login(dto);
        User user = userService.getByUsername(dto.getUsername());
        if (user != null) {
            user.setPassword(null);
            urlUtil.resolveUser(user);
        }
        Map<String, Object> data = new HashMap<>();
        data.put("token", token);
        data.put("user", user);
        return Result.success(data);
    }

    @PostMapping("/wx-login")
    public Result<Map<String, Object>> wxLogin(@Valid @RequestBody WxLoginDTO dto) {
        Map<String, Object> data = userService.wxLogin(dto);
        return Result.success(data);
    }

    @PostMapping("/register")
    public Result<Void> register(@RequestBody LoginDTO dto) {
        userService.register(dto);
        return Result.success();
    }

    @GetMapping("/info")
    public Result<User> info(@RequestHeader(value = "Authorization", required = false) String authorization,
                             @RequestParam(required = false) String username) {
        User user = null;
        if (authorization != null && jwtUtil.validateToken(authorization)) {
            Long userId = jwtUtil.getUserId(authorization);
            user = userService.getById(userId);
        } else if (username != null && !username.trim().isEmpty()) {
            user = userService.getByUsername(username);
        }
        if (user != null) {
            user.setPassword(null);
            urlUtil.resolveUser(user);
            return Result.success(user);
        }
        return Result.error(401, "用户未登录");
    }

    @GetMapping("/list")
    public Result<List<User>> list() {
        return Result.success(userService.listAll());
    }

    @GetMapping("/page")
    public Result<PageResult<User>> page(PageDTO pageDTO) {
        return Result.success(userService.pageList(pageDTO));
    }

    @GetMapping("/{id}")
    public Result<User> detail(@PathVariable Long id) {
        User user = userService.getById(id);
        if (user != null) {
            user.setPassword(null);
            urlUtil.resolveUser(user);
        }
        return Result.success(user);
    }

    @PostMapping
    public Result<Void> add(@Valid @RequestBody UserDTO dto) {
        userService.addUser(dto);
        return Result.success();
    }

    @PutMapping
    public Result<Void> update(@Valid @RequestBody UserDTO dto) {
        userService.updateUser(dto);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        userService.deleteUser(id);
        return Result.success();
    }

    @DeleteMapping("/batch")
    public Result<Void> batchDelete(@RequestBody List<Long> ids) {
        userService.deleteBatch(ids);
        return Result.success();
    }

    @PostMapping("/batch-delete")
    public Result<Void> batchDeletePost(@RequestBody List<Long> ids) {
        userService.deleteBatch(ids);
        return Result.success();
    }

    /**
     * 更新当前登录用户的基本信息（昵称、头像）
     */
    @PutMapping("/profile")
    public Result<User> updateProfile(@RequestHeader(value = "Authorization", required = false) String authorization,
                                      @RequestBody Map<String, String> body) {
        if (authorization == null || !jwtUtil.validateToken(authorization)) {
            return Result.error(401, "用户未登录");
        }
        Long userId = jwtUtil.getUserId(authorization);
        User user = userService.getById(userId);
        if (user == null) {
            return Result.error("用户不存在");
        }
        if (body.containsKey("nickname")) {
            user.setNickname(body.get("nickname"));
        }
        if (body.containsKey("avatar")) {
            user.setAvatar(body.get("avatar"));
        }
        userService.updateById(user);
        user.setPassword(null);
        urlUtil.resolveUser(user);
        return Result.success(user);
    }
    @PutMapping("/password")
    public Result<Void> updatePassword(@RequestHeader(value = "Authorization", required = false) String authorization,
                                       @RequestBody Map<String, String> body) {
        if (authorization == null || !jwtUtil.validateToken(authorization)) {
            return Result.error(401, "用户未登录");
        }
        Long userId = jwtUtil.getUserId(authorization);
        User user = userService.getById(userId);
        if (user == null) {
            return Result.error("用户不存在");
        }

        String password = body.get("password");
        String confirmPassword = body.get("confirmPassword");
        if (password == null || password.trim().isEmpty()) {
            return Result.error("密码不能为空");
        }
        if (password.length() < 6) {
            return Result.error("密码长度不能少于6位");
        }
        if (!password.equals(confirmPassword)) {
            return Result.error("两次输入的密码不一致");
        }

        user.setPassword(BCrypt.hashpw(password.trim()));
        userService.updateById(user);
        return Result.success();
    }

    @PutMapping("/{id}/status/{status}")
    public Result<Void> updateStatus(@PathVariable Long id, @PathVariable Integer status) {
        userService.updateStatus(id, status);
        return Result.success();
    }

    @PostMapping("/batch-status")
    public Result<Void> batchUpdateStatus(@Valid @RequestBody BatchStatusDTO dto) {
        userService.updateStatusBatch(dto.getIds(), dto.getStatus());
        return Result.success();
    }
}
