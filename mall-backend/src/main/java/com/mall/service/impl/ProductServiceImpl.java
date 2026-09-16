package com.mall.service.impl;

import cn.hutool.core.bean.BeanUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.dto.ProductDTO;
import com.mall.dto.ProductTierDTO;
import com.mall.entity.ProductTier;
import com.mall.service.ProductService;
import com.mall.service.ProductTierService;
import com.mall.common.PageResult;
import com.mall.dto.PageDTO;
import com.mall.entity.Cart;
import com.mall.entity.Product;
import com.mall.entity.ProductTag;
import com.mall.mapper.CartMapper;
import com.mall.mapper.ProductMapper;
import com.mall.mapper.ProductTagMapper;
import com.mall.util.UrlUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ProductServiceImpl extends ServiceImpl<ProductMapper, Product> implements ProductService {

    @Autowired
    private ProductTagMapper productTagMapper;

    @Autowired
    private CartMapper cartMapper;

    @Autowired
    private ProductTierService productTierService;

    @Autowired
    private UrlUtil urlUtil;

    @Override
    public List<Product> listAll() {
        List<Product> list = baseMapper.selectProductsWithCategory();
        urlUtil.resolveProducts(list);
        return list;
    }

    @Override
    public List<Product> listHotselling(Integer status) {
        List<Product> result = getFilteredHotsellingProducts(status);
        urlUtil.resolveProducts(result);
        return result;
    }

    @Override
    public PageResult<Product> pageHotselling(PageDTO pageDTO) {
        PageDTO query = pageDTO != null ? pageDTO : new PageDTO();
        List<Product> filtered = getFilteredHotsellingProducts(query.getStatus());
        if (StringUtils.hasText(query.getKeyword())) {
            String kw = query.getKeyword().trim();
            filtered = filtered.stream()
                    .filter(p -> p.getName() != null && p.getName().contains(kw))
                    .collect(Collectors.toList());
        }
        String categoryId = query.getCategoryId();
        if (categoryId != null && !categoryId.trim().isEmpty()) {
            filtered = filtered.stream()
                    .filter(p -> categoryId.equals(p.getCategoryId()))
                    .collect(Collectors.toList());
        }
        long total = filtered.size();
        int pageNum = query.getPageNum() != null && query.getPageNum() > 0 ? query.getPageNum() : 1;
        int pageSize = query.getPageSize() != null && query.getPageSize() > 0 ? query.getPageSize() : 10;
        long pages = (total + pageSize - 1) / pageSize;
        int fromIndex = (pageNum - 1) * pageSize;
        List<Product> records;
        if (fromIndex >= total) {
            records = Collections.emptyList();
        } else {
            int toIndex = (int) Math.min(fromIndex + pageSize, total);
            records = new ArrayList<>(filtered.subList(fromIndex, toIndex));
        }
        urlUtil.resolveProducts(records);
        return new PageResult<>(records, total, pages, (long) pageNum, (long) pageSize);
    }

    private List<Product> getFilteredHotsellingProducts(Integer status) {
        List<ProductTag> hotTags = productTagMapper.selectList(
                new LambdaQueryWrapper<ProductTag>()
                        .eq(ProductTag::getIsHotselling, 1)
                        .eq(ProductTag::getStatus, 1)
        );
        if (hotTags == null || hotTags.isEmpty()) {
            return Collections.emptyList();
        }
        Set<String> hotTagIds = hotTags.stream().map(ProductTag::getId).collect(Collectors.toSet());
        List<Product> allProducts = baseMapper.selectProductsWithCategory();
        if (allProducts == null || allProducts.isEmpty()) {
            return Collections.emptyList();
        }
        return allProducts.stream()
                .filter(p -> {
                    if (status != null && !status.equals(p.getStatus())) {
                        return false;
                    }
                    List<String> tagIds = parseTagIds(p.getTags());
                    return tagIds.stream().anyMatch(hotTagIds::contains);
                })
                .sorted((p1, p2) -> {
                    int s1 = p1.getStatus() != null ? p1.getStatus() : 0;
                    int s2 = p2.getStatus() != null ? p2.getStatus() : 0;
                    if (s1 != s2) {
                        return Integer.compare(s2, s1);
                    }
                    int sort1 = p1.getSort() != null ? p1.getSort() : 0;
                    int sort2 = p2.getSort() != null ? p2.getSort() : 0;
                    if (sort1 != sort2) {
                        return Integer.compare(sort1, sort2);
                    }
                    if (p1.getCreateTime() != null && p2.getCreateTime() != null) {
                        return p2.getCreateTime().compareTo(p1.getCreateTime());
                    }
                    return 0;
                })
                .collect(Collectors.toList());
    }

    private List<String> parseTagIds(String tagsStr) {
        if (!StringUtils.hasText(tagsStr)) {
            return Collections.emptyList();
        }
        try {
            String clean = tagsStr.trim();
            if (clean.startsWith("[") && clean.endsWith("]")) {
                clean = clean.substring(1, clean.length() - 1);
            }
            List<String> tagIds = new ArrayList<>();
            for (String part : clean.split(",")) {
                String idStr = part.trim().replace("\"", "").replace("'", "");
                if (StringUtils.hasText(idStr)) {
                    tagIds.add(idStr);
                }
            }
            return tagIds;
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    @Override
    public List<Product> listByCategoryId(String categoryId) {
        List<Product> list = baseMapper.selectByCategoryId(categoryId);
        urlUtil.resolveProducts(list);
        return list;
    }

    @Override
    public PageResult<Product> pageList(PageDTO pageDTO) {
        if (pageDTO != null && pageDTO.getIsHotselling() != null && pageDTO.getIsHotselling() == 1) {
            return pageHotselling(pageDTO);
        }
        Page<Product> page = new Page<>(pageDTO.getPageNum(), pageDTO.getPageSize());
        IPage<Product> result = baseMapper.selectPageWithCategory(page, pageDTO.getKeyword(), pageDTO.getCategoryId(), pageDTO.getStatus());
        List<Product> records = result.getRecords();
        urlUtil.resolveProducts(records);
        return new PageResult<>(records, result.getTotal(), result.getPages(), result.getCurrent(), result.getSize());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void addProduct(ProductDTO dto) {
        Product product = new Product();
        BeanUtil.copyProperties(dto, product, "tierList");
        product.setSales(0);

        List<ProductTier> tierList = null;
        if (dto.getTierList() != null && !dto.getTierList().isEmpty()) {
            tierList = dto.getTierList().stream().map(t -> {
                ProductTier tier = new ProductTier();
                BeanUtil.copyProperties(t, tier);
                return tier;
            }).collect(Collectors.toList());

            BigDecimal minPrice = tierList.stream()
                    .map(ProductTier::getPrice)
                    .filter(p -> p != null)
                    .min(BigDecimal::compareTo)
                    .orElse(dto.getPrice());
            if (minPrice != null) {
                product.setPrice(minPrice);
            }
            int totalStock = tierList.stream()
                    .mapToInt(t -> t.getStock() != null ? t.getStock() : 0)
                    .sum();
            product.setStock(totalStock);
            if (!StringUtils.hasText(product.getUnit()) && StringUtils.hasText(tierList.get(0).getUnit())) {
                product.setUnit(tierList.get(0).getUnit());
            }
        }

        save(product);

        if (tierList != null && !tierList.isEmpty()) {
            productTierService.saveOrUpdateTiers(product.getId(), tierList);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateProduct(ProductDTO dto) {
        Product product = new Product();
        BeanUtil.copyProperties(dto, product, "tierList");

        List<ProductTier> tierList = null;
        if (dto.getTierList() != null && !dto.getTierList().isEmpty()) {
            tierList = dto.getTierList().stream().map(t -> {
                ProductTier tier = new ProductTier();
                BeanUtil.copyProperties(t, tier);
                return tier;
            }).collect(Collectors.toList());

            BigDecimal minPrice = tierList.stream()
                    .map(ProductTier::getPrice)
                    .filter(p -> p != null)
                    .min(BigDecimal::compareTo)
                    .orElse(dto.getPrice());
            if (minPrice != null) {
                product.setPrice(minPrice);
            }
            int totalStock = tierList.stream()
                    .mapToInt(t -> t.getStock() != null ? t.getStock() : 0)
                    .sum();
            product.setStock(totalStock);
            if (!StringUtils.hasText(product.getUnit()) && StringUtils.hasText(tierList.get(0).getUnit())) {
                product.setUnit(tierList.get(0).getUnit());
            }
        }

        updateById(product);

        if (dto.getTierList() != null) {
            productTierService.saveOrUpdateTiers(product.getId(), tierList);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteProduct(String id) {
        if (id == null) {
            return;
        }
        LambdaQueryWrapper<Cart> cartWrapper = new LambdaQueryWrapper<>();
        cartWrapper.eq(Cart::getProductId, id);
        Long cartCount = cartMapper.selectCount(cartWrapper);
        if (cartCount != null && cartCount > 0) {
            throw new RuntimeException("该商品已被购物车引用，无法删除，只能下架！");
        }
        removeById(id);
        productTierService.deleteByProductId(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteBatch(List<String> ids) {
        if (ids != null && !ids.isEmpty()) {
            LambdaQueryWrapper<Cart> cartWrapper = new LambdaQueryWrapper<>();
            cartWrapper.in(Cart::getProductId, ids);
            Long cartCount = cartMapper.selectCount(cartWrapper);
            if (cartCount != null && cartCount > 0) {
                throw new RuntimeException("所选商品中存在被购物车引用的商品，无法删除，只能下架！");
            }
            removeByIds(ids);
            for (String id : ids) {
                productTierService.deleteByProductId(id);
            }
        }
    }

    @Override
    public void updateStatus(String id, Integer status) {
        Product product = new Product();
        product.setId(id);
        product.setStatus(status);
        updateById(product);
    }

    @Override
    public void updateStatusBatch(List<String> ids, Integer status) {
        if (ids != null && !ids.isEmpty()) {
            List<Product> products = ids.stream().map(id -> {
                Product p = new Product();
                p.setId(id);
                p.setStatus(status);
                return p;
            }).collect(java.util.stream.Collectors.toList());
            updateBatchById(products);
        }
    }
}
