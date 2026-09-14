package com.mall.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mall.common.PageResult;
import com.mall.dto.PageDTO;
import com.mall.dto.ProductTagDTO;
import com.mall.entity.ProductTag;

import java.util.List;

public interface ProductTagService extends IService<ProductTag> {
    List<ProductTag> listAll();

    PageResult<ProductTag> pageList(PageDTO pageDTO);

    void addTag(ProductTagDTO dto);

    void updateTag(ProductTagDTO dto);

    void deleteTag(Long id);

    void deleteBatch(List<Long> ids);

    void updateStatus(Long id, Integer status);

    void updateStatusBatch(List<Long> ids, Integer status);
}
