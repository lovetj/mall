package com.mall.controller;

import com.mall.common.PageResult;
import com.mall.dto.BatchStatusDTO;
import com.mall.dto.CategoryDTO;
import com.mall.entity.Category;
import com.mall.service.CategoryService;
import com.mall.common.Result;
import com.mall.dto.PageDTO;
import com.mall.util.UrlUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/category")
public class CategoryController {

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private UrlUtil urlUtil;

    @GetMapping("/list")
    public Result<List<Category>> list() {
        return Result.success(categoryService.listAll());
    }

    @GetMapping("/page")
    public Result<PageResult<Category>> page(PageDTO pageDTO) {
        return Result.success(categoryService.pageList(pageDTO));
    }

    @GetMapping("/{id}")
    public Result<Category> detail(@PathVariable String id) {
        Category category = categoryService.getById(id);
        urlUtil.resolveCategory(category);
        return Result.success(category);
    }

    @PostMapping
    public Result<Void> add(@Valid @RequestBody CategoryDTO dto) {
        categoryService.addCategory(dto);
        return Result.success();
    }

    @PutMapping
    public Result<Void> update(@Valid @RequestBody CategoryDTO dto) {
        categoryService.updateCategory(dto);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id) {
        categoryService.deleteCategory(id);
        return Result.success();
    }

    @DeleteMapping("/batch")
    public Result<Void> batchDelete(@RequestBody List<String> ids) {
        categoryService.deleteBatch(ids);
        return Result.success();
    }

    @PostMapping("/batch-delete")
    public Result<Void> batchDeletePost(@RequestBody List<String> ids) {
        categoryService.deleteBatch(ids);
        return Result.success();
    }

    @PutMapping("/{id}/status/{status}")
    public Result<Void> updateStatus(@PathVariable String id, @PathVariable Integer status) {
        categoryService.updateStatus(id, status);
        return Result.success();
    }

    @PostMapping("/batch-status")
    public Result<Void> batchUpdateStatus(@Valid @RequestBody BatchStatusDTO dto) {
        categoryService.updateStatusBatch(dto.getIds(), dto.getStatus());
        return Result.success();
    }
}

