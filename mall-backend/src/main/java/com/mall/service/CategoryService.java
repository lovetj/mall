package com.mall.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mall.common.PageResult;
import com.mall.dto.CategoryDTO;
import com.mall.dto.PageDTO;
import com.mall.entity.Category;

import java.util.List;

public interface CategoryService extends IService<Category> {
    List<Category> listAll();

    PageResult<Category> pageList(PageDTO pageDTO);

    void addCategory(CategoryDTO dto);

    void updateCategory(CategoryDTO dto);

    void deleteCategory(String id);

    void deleteBatch(List<String> ids);

    void updateStatus(String id, Integer status);

    void updateStatusBatch(List<String> ids, Integer status);
}

