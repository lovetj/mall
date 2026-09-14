package com.mall.controller;

import com.mall.entity.Logistics;
import com.mall.service.LogisticsService;
import com.mall.common.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/logistics")
public class LogisticsController {

    @Autowired
    private LogisticsService logisticsService;

    @GetMapping("/list")
    public Result<List<Logistics>> list() {
        return Result.success(logisticsService.listAll());
    }
}
