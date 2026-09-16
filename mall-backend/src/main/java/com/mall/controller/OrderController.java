package com.mall.controller;

import com.mall.common.PageResult;
import com.mall.dto.OrderCheckoutDTO;
import com.mall.dto.OrderDTO;
import com.mall.dto.OrderVO;
import com.mall.service.OrderService;
import com.mall.util.JwtUtil;
import com.mall.common.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

import javax.validation.Valid;

@RestController
@RequestMapping("/api/order")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private JwtUtil jwtUtil;

    private String resolveUserId(String authorization, String headerUserId) {
        if (authorization != null && !authorization.trim().isEmpty()) {
            if (jwtUtil.validateToken(authorization)) {
                return jwtUtil.getUserId(authorization);
            }
        }
        if (headerUserId != null && !headerUserId.trim().isEmpty()) {
            return headerUserId.trim();
        }
        return null;
    }

    /** 购物车结算 —— 前端传 cartItemIds + addressId + remark */
    @PostMapping("/checkout")
    public Result<OrderVO> checkout(@Valid @RequestBody OrderCheckoutDTO dto,
                                    @RequestHeader(value = "Authorization", required = false) String authorization,
                                    @RequestHeader(value = "userId", required = false) String headerUserId) {
        String userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }
        OrderVO order = orderService.checkout(dto, userId);
        return Result.success(order);
    }

    /** 直接创建订单(兼容旧接口) */
    @PostMapping("/create")
    public Result<String> create(@Valid @RequestBody OrderDTO dto,
                                 @RequestHeader(value = "Authorization", required = false) String authorization,
                                 @RequestHeader(value = "userId", required = false) String headerUserId) {
        String userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }
        String orderNo = orderService.createOrder(dto, userId);
        return Result.success(orderNo);
    }

    /** 订单分页列表(含订单项) */
    @GetMapping("/list")
    public Result<PageResult<OrderVO>> list(
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize,
            @RequestParam(required = false) Integer status,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestHeader(value = "userId", required = false) String headerUserId) {
        String userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }
        return Result.success(orderService.pageList(pageNum, pageSize, status, userId));
    }

    /**
     * 订单各状态数量汇总(给"我的"页入口 / 订单列表页签用)
     * 返回: { pendingPay, pendingShip, pendingReceive, completed, cancelled }
     */
    @GetMapping("/counts")
    public Result<Map<String, Long>> counts(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestHeader(value = "userId", required = false) String headerUserId) {
        String userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }
        Map<String, Long> result = new HashMap<>();
        // 一次查全: GROUP BY status
        Map<Integer, Long> grouped = orderService.countByUserIdGroupByStatus(userId);
        result.put("pendingPay",    grouped.getOrDefault(0, 0L)); // 待付款
        result.put("pendingShip",   grouped.getOrDefault(1, 0L)); // 待发货
        result.put("pendingReceive",grouped.getOrDefault(2, 0L)); // 待收货
        result.put("completed",     grouped.getOrDefault(3, 0L)); // 已完成
        result.put("cancelled",     grouped.getOrDefault(4, 0L)); // 已取消
        return Result.success(result);
    }

    /** 订单详情(含订单项) */
    @GetMapping("/{id}")
    public Result<OrderVO> detail(@PathVariable String id,
                                  @RequestHeader(value = "Authorization", required = false) String authorization,
                                  @RequestHeader(value = "userId", required = false) String headerUserId) {
        String userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }
        OrderVO vo = orderService.getDetail(id, userId);
        if (vo == null) {
            return Result.error(404, "订单不存在");
        }
        return Result.success(vo);
    }
}
