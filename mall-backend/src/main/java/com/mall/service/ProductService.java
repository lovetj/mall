package com.mall.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mall.common.PageResult;
import com.mall.dto.PageDTO;
import com.mall.dto.ProductDTO;
import com.mall.entity.Product;

import java.util.List;

public interface ProductService extends IService<Product> {
    List<Product> listAll();

    List<Product> listHotselling(Integer status);

    PageResult<Product> pageHotselling(PageDTO pageDTO);

    List<Product> listByCategoryId(Long categoryId);

    PageResult<Product> pageList(PageDTO pageDTO);

    void addProduct(ProductDTO dto);

    void updateProduct(ProductDTO dto);

    void deleteProduct(Long id);

    void deleteBatch(List<Long> ids);

    void updateStatus(Long id, Integer status);

    void updateStatusBatch(List<Long> ids, Integer status);
}
