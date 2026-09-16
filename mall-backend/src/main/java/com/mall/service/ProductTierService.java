package com.mall.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mall.entity.ProductTier;

import java.util.List;

public interface ProductTierService extends IService<ProductTier> {

    List<ProductTier> listByProductId(String productId);

    void saveOrUpdateTiers(String productId, List<ProductTier> tiers);

    void deleteByProductId(String productId);
}
