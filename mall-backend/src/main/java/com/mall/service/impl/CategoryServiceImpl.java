package com.mall.service.impl;

import cn.hutool.core.bean.BeanUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.service.CategoryService;
import com.mall.common.PageResult;
import com.mall.dto.CategoryDTO;
import com.mall.dto.PageDTO;
import com.mall.entity.Category;
import com.mall.entity.Product;
import com.mall.mapper.CategoryMapper;
import com.mall.mapper.ProductMapper;
import com.mall.util.UrlUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CategoryServiceImpl extends ServiceImpl<CategoryMapper, Category> implements CategoryService {

    @Autowired
    private ProductMapper productMapper;

    @Autowired
    private UrlUtil urlUtil;

    @Override
    public List<Category> listAll() {
        LambdaQueryWrapper<Category> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Category::getStatus, 1)
                .orderByAsc(Category::getSort);
        List<Category> list = list(wrapper);
        urlUtil.resolveCategories(list);
        return list;
    }

    @Override
    public PageResult<Category> pageList(PageDTO pageDTO) {
        Page<Category> page = new Page<>(pageDTO.getPageNum(), pageDTO.getPageSize());
        LambdaQueryWrapper<Category> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(pageDTO.getKeyword())) {
            String kw = pageDTO.getKeyword().trim();
            wrapper.and(w -> w.like(Category::getName, kw).or().like(Category::getCode, kw));
        }
        if (pageDTO.getStatus() != null) {
            wrapper.eq(Category::getStatus, pageDTO.getStatus());
        }
        wrapper.orderByAsc(Category::getSort).orderByDesc(Category::getCreateTime);
        Page<Category> result = page(page, wrapper);
        List<Category> records = result.getRecords();
        urlUtil.resolveCategories(records);
        return new PageResult<>(records, result.getTotal(), result.getPages(), result.getCurrent(), result.getSize());
    }

    private void checkUniqueNameAndCode(String name, String code, String excludeId) {
        if (StringUtils.hasText(name)) {
            LambdaQueryWrapper<Category> nameWrapper = new LambdaQueryWrapper<Category>()
                    .eq(Category::getName, name.trim());
            if (excludeId != null && !excludeId.trim().isEmpty()) {
                nameWrapper.ne(Category::getId, excludeId);
            }
            if (count(nameWrapper) > 0) {
                throw new RuntimeException("分类名称 [" + name.trim() + "] 已存在");
            }
        }
        if (StringUtils.hasText(code)) {
            LambdaQueryWrapper<Category> codeWrapper = new LambdaQueryWrapper<Category>()
                    .eq(Category::getCode, code.trim());
            if (excludeId != null && !excludeId.trim().isEmpty()) {
                codeWrapper.ne(Category::getId, excludeId);
            }
            if (count(codeWrapper) > 0) {
                throw new RuntimeException("分类编码 [" + code.trim() + "] 已存在");
            }
        }
    }

    @Override
    public void addCategory(CategoryDTO dto) {
        checkUniqueNameAndCode(dto.getName(), dto.getCode(), null);
        Category category = new Category();
        BeanUtil.copyProperties(dto, category);
        if (category.getStatus() == null) {
            category.setStatus(1);
        }
        if (category.getSort() == null) {
            category.setSort(0);
        }
        save(category);
    }

    @Override
    public void updateCategory(CategoryDTO dto) {
        if (dto.getId() == null) {
            throw new RuntimeException("分类ID不能为空");
        }
        checkUniqueNameAndCode(dto.getName(), dto.getCode(), dto.getId());
        Category category = new Category();
        BeanUtil.copyProperties(dto, category);
        updateById(category);
    }

    @Override
    public void deleteCategory(String id) {
        LambdaQueryWrapper<Product> productWrapper = new LambdaQueryWrapper<>();
        productWrapper.eq(Product::getCategoryId, id);
        Long productCount = productMapper.selectCount(productWrapper);
        if (productCount != null && productCount > 0) {
            throw new RuntimeException("该分类下存在 " + productCount + " 个关联商品，无法直接删除！请先转移或删除商品。");
        }
        removeById(id);
    }

    @Override
    public void deleteBatch(List<String> ids) {
        if (ids != null && !ids.isEmpty()) {
            LambdaQueryWrapper<Product> productWrapper = new LambdaQueryWrapper<>();
            productWrapper.in(Product::getCategoryId, ids);
            Long productCount = productMapper.selectCount(productWrapper);
            if (productCount != null && productCount > 0) {
                throw new RuntimeException("所选分类中存在关联商品，无法直接删除！");
            }
            removeByIds(ids);
        }
    }

    @Override
    public void updateStatus(String id, Integer status) {
        Category category = new Category();
        category.setId(id);
        category.setStatus(status);
        updateById(category);
    }

    @Override
    public void updateStatusBatch(List<String> ids, Integer status) {
        if (ids != null && !ids.isEmpty()) {
            List<Category> list = ids.stream().map(id -> {
                Category c = new Category();
                c.setId(id);
                c.setStatus(status);
                return c;
            }).collect(Collectors.toList());
            updateBatchById(list);
        }
    }
}

