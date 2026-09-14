package com.mall.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mall.entity.Logistics;

import java.util.List;

public interface LogisticsService extends IService<Logistics> {
    List<Logistics> listAll();
}
