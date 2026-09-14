package com.mall.controller;

import com.mall.common.PageResult;
import com.mall.dto.BatchStatusDTO;
import com.mall.dto.ProductTagDTO;
import com.mall.entity.ProductTag;
import com.mall.service.ProductTagService;
import com.mall.util.UrlUtil;
import com.mall.common.Result;
import com.mall.dto.PageDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/tag")
public class ProductTagController {

    @Autowired
    private ProductTagService productTagService;

    @Autowired
    private UrlUtil urlUtil;

    @GetMapping("/list")
    public Result<List<ProductTag>> list() {
        return Result.success(productTagService.listAll());
    }

    @GetMapping("/page")
    public Result<PageResult<ProductTag>> page(PageDTO pageDTO) {
        return Result.success(productTagService.pageList(pageDTO));
    }

    @GetMapping("/{id}")
    public Result<ProductTag> detail(@PathVariable Long id) {
        ProductTag tag = productTagService.getById(id);
        urlUtil.resolveProductTag(tag);
        return Result.success(tag);
    }

    @PostMapping
    public Result<Void> add(@Valid @RequestBody ProductTagDTO dto) {
        productTagService.addTag(dto);
        return Result.success();
    }

    @PutMapping
    public Result<Void> update(@Valid @RequestBody ProductTagDTO dto) {
        productTagService.updateTag(dto);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        productTagService.deleteTag(id);
        return Result.success();
    }

    @DeleteMapping("/batch")
    public Result<Void> batchDelete(@RequestBody List<Long> ids) {
        productTagService.deleteBatch(ids);
        return Result.success();
    }

    @PostMapping("/batch-delete")
    public Result<Void> batchDeletePost(@RequestBody List<Long> ids) {
        productTagService.deleteBatch(ids);
        return Result.success();
    }

    @PutMapping("/{id}/status/{status}")
    public Result<Void> updateStatus(@PathVariable Long id, @PathVariable Integer status) {
        productTagService.updateStatus(id, status);
        return Result.success();
    }

    @PostMapping("/batch-status")
    public Result<Void> batchUpdateStatus(@Valid @RequestBody BatchStatusDTO dto) {
        productTagService.updateStatusBatch(dto.getIds(), dto.getStatus());
        return Result.success();
    }
}
