package com.mall.service.impl;

import cn.hutool.core.bean.BeanUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.dto.ProductDTO;
import com.mall.service.ProductService;
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
import org.springframework.util.StringUtils;

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
    private UrlUtil urlUtil;

    @Override
    public List<Product> listAll() {
        List<Product> list = baseMapper.selectProductsWithCategory();
        urlUtil.resolveProducts(list);
        return list;
    }

    @Override
    public List<Product> listHotselling(Integer status) {
        List<ProductTag> hotTags = productTagMapper.selectList(
                new LambdaQueryWrapper<ProductTag>()
                        .eq(ProductTag::getIsHotselling, 1)
                        .eq(ProductTag::getStatus, 1)
        );
        if (hotTags == null || hotTags.isEmpty()) {
            return Collections.emptyList();
        }
        Set<Long> hotTagIds = hotTags.stream().map(ProductTag::getId).collect(Collectors.toSet());
        List<Product> allProducts = baseMapper.selectProductsWithCategory();
        if (allProducts == null || allProducts.isEmpty()) {
            return Collections.emptyList();
        }
        List<Product> result = allProducts.stream()
                .filter(p -> {
                    if (status != null && !status.equals(p.getStatus())) {
                        return false;
                    }
                    List<Long> tagIds = parseTagIds(p.getTags());
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
        urlUtil.resolveProducts(result);
        return result;
    }

    private List<Long> parseTagIds(String tagsStr) {
        if (!StringUtils.hasText(tagsStr)) {
            return Collections.emptyList();
        }
        try {
            String clean = tagsStr.trim();
            if (clean.startsWith("[") && clean.endsWith("]")) {
                clean = clean.substring(1, clean.length() - 1);
            }
            List<Long> tagIds = new ArrayList<>();
            for (String part : clean.split(",")) {
                String idStr = part.trim().replace("\"", "").replace("'", "");
                if (StringUtils.hasText(idStr)) {
                    tagIds.add(Long.parseLong(idStr));
                }
            }
            return tagIds;
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    @Override
    public List<Product> listByCategoryId(Long categoryId) {
        List<Product> list = baseMapper.selectByCategoryId(categoryId);
        urlUtil.resolveProducts(list);
        return list;
    }

    @Override
    public PageResult<Product> pageList(PageDTO pageDTO) {
        Page<Product> page = new Page<>(pageDTO.getPageNum(), pageDTO.getPageSize());
        IPage<Product> result = baseMapper.selectPageWithCategory(page, pageDTO.getKeyword(), pageDTO.getCategoryId(), pageDTO.getStatus());
        List<Product> records = result.getRecords();
        urlUtil.resolveProducts(records);
        return new PageResult<>(records, result.getTotal(), result.getPages(), result.getCurrent(), result.getSize());
    }

    @Override
    public void addProduct(ProductDTO dto) {
        Product product = new Product();
        BeanUtil.copyProperties(dto, product);
        product.setSales(0);
        save(product);
    }

    @Override
    public void updateProduct(ProductDTO dto) {
        Product product = new Product();
        BeanUtil.copyProperties(dto, product);
        updateById(product);
    }

    @Override
    public void deleteProduct(Long id) {
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
    }

    @Override
    public void deleteBatch(List<Long> ids) {
        if (ids != null && !ids.isEmpty()) {
            LambdaQueryWrapper<Cart> cartWrapper = new LambdaQueryWrapper<>();
            cartWrapper.in(Cart::getProductId, ids);
            Long cartCount = cartMapper.selectCount(cartWrapper);
            if (cartCount != null && cartCount > 0) {
                throw new RuntimeException("所选商品中存在被购物车引用的商品，无法删除，只能下架！");
            }
            removeByIds(ids);
        }
    }

    @Override
    public void updateStatus(Long id, Integer status) {
        Product product = new Product();
        product.setId(id);
        product.setStatus(status);
        updateById(product);
    }

    @Override
    public void updateStatusBatch(List<Long> ids, Integer status) {
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
