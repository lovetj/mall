package com.mall.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.entity.ProductTier;
import com.mall.mapper.ProductTierMapper;
import com.mall.service.ProductTierService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ProductTierServiceImpl extends ServiceImpl<ProductTierMapper, ProductTier> implements ProductTierService {

    @Override
    public List<ProductTier> listByProductId(String productId) {
        if (productId == null || productId.trim().isEmpty()) {
            return Collections.emptyList();
        }
        return list(new LambdaQueryWrapper<ProductTier>()
                .eq(ProductTier::getProductId, productId)
                .orderByAsc(ProductTier::getSort)
                .orderByAsc(ProductTier::getPrice));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveOrUpdateTiers(String productId, List<ProductTier> tiers) {
        if (productId == null || productId.trim().isEmpty()) {
            return;
        }

        List<ProductTier> existList = list(new LambdaQueryWrapper<ProductTier>()
                .eq(ProductTier::getProductId, productId));

        if (tiers == null || tiers.isEmpty()) {
            if (!existList.isEmpty()) {
                removeByIds(existList.stream().map(ProductTier::getId).collect(Collectors.toList()));
            }
            return;
        }

        Set<String> keepIds = tiers.stream()
                .map(ProductTier::getId)
                .filter(id -> id != null && !id.trim().isEmpty())
                .collect(Collectors.toSet());

        List<String> deleteIds = existList.stream()
                .map(ProductTier::getId)
                .filter(id -> !keepIds.contains(id))
                .collect(Collectors.toList());

        if (!deleteIds.isEmpty()) {
            removeByIds(deleteIds);
        }

        for (int i = 0; i < tiers.size(); i++) {
            ProductTier tier = tiers.get(i);
            tier.setProductId(productId);
            if (tier.getSort() == null) {
                tier.setSort(i + 1);
            }
            if (tier.getStatus() == null) {
                tier.setStatus(1);
            }
            if (tier.getStock() == null) {
                tier.setStock(0);
            }
            if (tier.getSales() == null) {
                tier.setSales(0);
            }
            if (tier.getId() != null && !tier.getId().trim().isEmpty()) {
                updateById(tier);
            } else {
                tier.setId(null);
                save(tier);
            }
        }
    }

    @Override
    public void deleteByProductId(String productId) {
        if (productId == null || productId.trim().isEmpty()) {
            return;
        }
        remove(new LambdaQueryWrapper<ProductTier>().eq(ProductTier::getProductId, productId));
    }
}
