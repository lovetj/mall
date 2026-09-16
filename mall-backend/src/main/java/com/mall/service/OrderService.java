package com.mall.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mall.common.PageResult;
import com.mall.dto.OrderCheckoutDTO;
import com.mall.dto.OrderDTO;
import com.mall.dto.OrderVO;
import com.mall.entity.Order;

import java.util.Map;

public interface OrderService extends IService<Order> {

    /** 直接创建订单(兼容旧接口) */
    String createOrder(OrderDTO dto, String userId);

    /**
     * 购物车结算 —— 原子化完成：
     * 查购物车选中项 → 查地址 → 算金额 → 创订单+订单项 → 删购物车项
     * @return 新创建的订单(含 id/orderNo/payAmount 等全部字段, 方便前端直接跳支付页)
     */
    OrderVO checkout(OrderCheckoutDTO dto, String userId);

    /** 订单分页列表(含订单项) */
    PageResult<OrderVO> pageList(Integer pageNum, Integer pageSize, Integer status, String userId);

    /** 订单详情(含订单项) */
    OrderVO getDetail(String id, String userId);

    /**
     * 按用户 + status 分组统计各状态订单数量 (一次 SQL 搞定)
     * @return Map<status, count>  status=0待付款 1待发货 2待收货 3已完成 4已取消
     */
    Map<Integer, Long> countByUserIdGroupByStatus(String userId);
}
