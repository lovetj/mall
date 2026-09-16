package com.mall.controller;

import com.mall.common.PageResult;
import com.mall.common.Result;
import com.mall.dto.BannerDTO;
import com.mall.dto.BatchStatusDTO;
import com.mall.dto.PageDTO;
import com.mall.entity.Banner;
import com.mall.service.BannerService;
import com.mall.util.UrlUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/banner")
public class BannerController {

    @Autowired
    private BannerService bannerService;

    @Autowired
    private UrlUtil urlUtil;

    @GetMapping("/list")
    public Result<List<Banner>> list() {
        return Result.success(bannerService.listAll());
    }

    @GetMapping("/page")
    public Result<PageResult<Banner>> page(PageDTO pageDTO) {
        return Result.success(bannerService.pageList(pageDTO));
    }

    @GetMapping("/{id}")
    public Result<Banner> detail(@PathVariable String id) {
        Banner banner = bannerService.getById(id);
        urlUtil.resolveBanner(banner);
        return Result.success(banner);
    }

    @PostMapping
    public Result<Void> add(@Valid @RequestBody BannerDTO dto) {
        bannerService.addBanner(dto);
        return Result.success();
    }

    @PutMapping
    public Result<Void> update(@Valid @RequestBody BannerDTO dto) {
        bannerService.updateBanner(dto);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id) {
        bannerService.deleteBanner(id);
        return Result.success();
    }

    @DeleteMapping("/batch")
    public Result<Void> batchDelete(@RequestBody List<String> ids) {
        bannerService.deleteBatch(ids);
        return Result.success();
    }

    @PostMapping("/batch-delete")
    public Result<Void> batchDeletePost(@RequestBody List<String> ids) {
        bannerService.deleteBatch(ids);
        return Result.success();
    }

    @PutMapping("/{id}/status/{status}")
    public Result<Void> updateStatus(@PathVariable String id, @PathVariable Integer status) {
        bannerService.updateStatus(id, status);
        return Result.success();
    }

    @PostMapping("/batch-status")
    public Result<Void> batchUpdateStatus(@Valid @RequestBody BatchStatusDTO dto) {
        bannerService.updateStatusBatch(dto.getIds(), dto.getStatus());
        return Result.success();
    }
}
