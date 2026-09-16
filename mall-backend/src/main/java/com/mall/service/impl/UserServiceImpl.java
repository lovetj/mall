package com.mall.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.crypto.digest.BCrypt;
import cn.hutool.crypto.digest.DigestUtil;
import cn.hutool.http.HttpUtil;
import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.config.WechatProperties;
import com.mall.service.UserService;
import com.mall.common.PageResult;
import com.mall.dto.LoginDTO;
import com.mall.dto.PageDTO;
import com.mall.dto.UserDTO;
import com.mall.dto.WxLoginDTO;
import com.mall.entity.Order;
import com.mall.entity.User;
import com.mall.mapper.OrderMapper;
import com.mall.mapper.UserMapper;
import com.mall.util.JwtUtil;
import com.mall.util.UrlUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    @Autowired
    private OrderMapper orderMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UrlUtil urlUtil;

    @Autowired
    private WechatProperties wechatProperties;

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
    public User getByOpenid(String openid) {
        if (!StringUtils.hasText(openid)) {
            return null;
        }
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getOpenid, openid.trim());
        return getOne(wrapper);
    }

    @Override
    public Map<String, Object> wxLogin(WxLoginDTO dto) {
        // 0. 昵称必填强校验（必须为微信原生授权返回的真实昵称，禁止假数据）
        if (!StringUtils.hasText(dto.getNickname())) {
            throw new RuntimeException("微信授权登录昵称不能为空");
        }

        String code = dto.getCode().trim();
        String openid = null;
        String unionid = null;
        String sessionKey = null;

        String appId = wechatProperties.getMiniapp().getAppId();
        String secret = wechatProperties.getMiniapp().getSecret();
        boolean mockEnabled = wechatProperties.getMiniapp().isMock();

        // 1. 若配置了真实 appId 与 secret，优先调用微信官方 jscode2session 接口
        if (StringUtils.hasText(appId) && StringUtils.hasText(secret)) {
            try {
                String wxUrl = String.format("https://api.weixin.qq.com/sns/jscode2session?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code",
                        appId.trim(), secret.trim(), code);
                String resp = HttpUtil.get(wxUrl, 5000);
                JSONObject json = JSON.parseObject(resp);
                Integer errcode = json.getInteger("errcode");
                if (errcode == null || errcode == 0) {
                    openid = json.getString("openid");
                    unionid = json.getString("unionid");
                    sessionKey = json.getString("session_key");
                } else {
                    log.warn("[微信登录] 微信官方接口返回错误 errcode={}, errmsg={}", errcode, json.getString("errmsg"));
                    if (!mockEnabled) {
                        throw new RuntimeException("微信授权登录失败: " + json.getString("errmsg"));
                    }
                }
            } catch (Exception e) {
                log.warn("[微信登录] 请求微信官方接口异常: {}", e.getMessage());
                if (!mockEnabled) {
                    throw new RuntimeException("请求微信服务失败: " + e.getMessage());
                }
            }
        }

        // 2. Mock 模式降级（未配置 appId/secret 或开发测试环境）
        if (!StringUtils.hasText(openid)) {
            if (mockEnabled) {
                log.info("[微信登录] 处于本地/Mock开发模式，使用模拟openid");
                openid = "mock_wx_openid_" + DigestUtil.md5Hex(code).substring(0, 16);
            } else {
                throw new RuntimeException("微信小程序配置未就绪，请联系管理员");
            }
        }

        // 3. 查询是否已存在该 openid 用户
        User user = getByOpenid(openid);
        boolean isNewUser = false;
        if (user == null) {
            isNewUser = true;
            user = new User();
            user.setOpenid(openid);
            user.setUnionid(unionid);
            user.setSessionKey(sessionKey);

            // 微信号为 username 作为用户名（优先使用传入的微信号，未传则以微信openid作为微信号用户名）
            String candidateUsername = StringUtils.hasText(dto.getUsername()) ? dto.getUsername().trim() : openid;
            if (candidateUsername.length() > 50) {
                candidateUsername = candidateUsername.substring(0, 50);
            }
            String finalUsername = candidateUsername;
            int counter = 1;
            while (count(new LambdaQueryWrapper<User>().eq(User::getUsername, finalUsername)) > 0) {
                String suffix = "_" + counter;
                int maxLen = 50 - suffix.length();
                finalUsername = (candidateUsername.length() > maxLen ? candidateUsername.substring(0, maxLen) : candidateUsername) + suffix;
                counter++;
            }
            user.setUsername(finalUsername);
            // 昵称已通过上方强校验，必为微信原生授权返回的真实昵称
            user.setNickname(dto.getNickname().trim());
            user.setAvatar(StringUtils.hasText(dto.getAvatar()) ? dto.getAvatar().trim() : null);
            user.setStatus(1);
            save(user);
        } else {
            // 已存在用户
            if (user.getStatus() != null && user.getStatus() != 1) {
                throw new RuntimeException("账号已被禁用");
            }
            boolean changed = false;
            // 若传入了自定义微信号且与当前不同，校验无重名后更新
            if (StringUtils.hasText(dto.getUsername()) && !dto.getUsername().trim().equals(user.getUsername())) {
                String newName = dto.getUsername().trim();
                if (count(new LambdaQueryWrapper<User>().eq(User::getUsername, newName).ne(User::getId, user.getId())) == 0) {
                    user.setUsername(newName);
                    changed = true;
                }
            }
            if (StringUtils.hasText(dto.getNickname()) && !dto.getNickname().trim().equals(user.getNickname())) {
                user.setNickname(dto.getNickname().trim());
                changed = true;
            }
            if (StringUtils.hasText(dto.getAvatar()) && !dto.getAvatar().trim().equals(user.getAvatar())) {
                user.setAvatar(dto.getAvatar().trim());
                changed = true;
            }
            if (StringUtils.hasText(unionid) && !StringUtils.hasText(user.getUnionid())) {
                user.setUnionid(unionid);
                changed = true;
            }
            // session_key 每次登录都会刷新，直接覆盖
            if (StringUtils.hasText(sessionKey) && !sessionKey.equals(user.getSessionKey())) {
                user.setSessionKey(sessionKey);
                changed = true;
            }
            if (changed) {
                updateById(user);
            }
        }

        // 4. 生成 JWT Token
        String token = jwtUtil.generateToken(user.getId(), user.getUsername());
        user.setPassword(null);
        // session_key 属最高敏感信息，仅服务端保存，严禁下发前端
        user.setSessionKey(null);
        urlUtil.resolveUser(user);

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("user", user);
        result.put("isNewUser", isNewUser);
        return result;
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
                    .or().like(User::getPhone, kw)
                    .or().like(User::getOpenid, kw));
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

    private void checkUniqueUsername(String username, String excludeId) {
        if (StringUtils.hasText(username)) {
            LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<User>()
                    .eq(User::getUsername, username.trim());
            if (StringUtils.hasText(excludeId)) {
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
        // 显式将 id 置空，确保由 MyBatis-Plus (ASSIGN_UUID) 统一自动生成 UUID
        user.setId(null);
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
        if (!StringUtils.hasText(dto.getId())) {
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
    public void deleteUser(String id) {
        LambdaQueryWrapper<Order> orderWrapper = new LambdaQueryWrapper<>();
        orderWrapper.eq(Order::getUserId, id);
        Long orderCount = orderMapper.selectCount(orderWrapper);
        if (orderCount != null && orderCount > 0) {
            throw new RuntimeException("该用户存在 " + orderCount + " 笔关联订单，无法直接删除！");
        }
        removeById(id);
    }

    @Override
    public void deleteBatch(List<String> ids) {
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
    public void updateStatus(String id, Integer status) {
        User user = new User();
        user.setId(id);
        user.setStatus(status);
        updateById(user);
    }

    @Override
    public void updateStatusBatch(List<String> ids, Integer status) {
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
