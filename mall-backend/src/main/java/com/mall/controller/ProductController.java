package com.mall.controller;

import com.mall.common.PageResult;
import com.mall.dto.BatchStatusDTO;
import com.mall.dto.ProductDTO;
import com.mall.entity.Category;
import com.mall.entity.Product;
import com.mall.entity.ProductTag;
import com.mall.service.CategoryService;
import com.mall.service.ProductService;
import com.mall.service.ProductTagService;
import com.mall.util.UrlUtil;
import com.mall.common.Result;
import com.mall.dto.PageDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/product")
public class ProductController {

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductTagService productTagService;

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private UrlUtil urlUtil;

    @GetMapping("/list")
    public Result<List<Product>> list() {
        return Result.success(productService.listAll());
    }

    @GetMapping("/hotselling")
    public Result<List<Product>> listHotselling(@RequestParam(value = "status", required = false) Integer status) {
        return Result.success(productService.listHotselling(status));
    }

    @GetMapping("/category/{categoryId}")
    public Result<List<Product>> listByCategory(@PathVariable Long categoryId) {
        return Result.success(productService.listByCategoryId(categoryId));
    }

    @GetMapping("/page")
    public Result<PageResult<Product>> page(PageDTO pageDTO) {
        return Result.success(productService.pageList(pageDTO));
    }

    @GetMapping("/{id}")
    public Result<Product> detail(@PathVariable Long id) {
        Product product = productService.getById(id);
        if (product != null) {
            if (!StringUtils.hasText(product.getCategoryName()) && product.getCategoryId() != null) {
                Category category = categoryService.getById(product.getCategoryId());
                if (category != null) {
                    product.setCategoryName(category.getName());
                }
            }
            if (StringUtils.hasText(product.getTags())) {
                try {
                    String tagsStr = product.getTags().trim();
                    List<Long> tagIds = new ArrayList<>();
                    if (tagsStr.startsWith("[") && tagsStr.endsWith("]")) {
                        tagsStr = tagsStr.substring(1, tagsStr.length() - 1);
                    }
                    for (String part : tagsStr.split(",")) {
                        String clean = part.trim().replace("\"", "").replace("'", "");
                        if (StringUtils.hasText(clean)) {
                            tagIds.add(Long.parseLong(clean));
                        }
                    }
                    if (!tagIds.isEmpty()) {
                        List<ProductTag> tags = productTagService.listByIds(tagIds);
                        if (tags != null) {
                            tags = tags.stream()
                                    .filter(t -> t.getStatus() == null || t.getStatus() == 1)
                                    .sorted(Comparator.comparingInt(t -> t.getSort() == null ? 0 : t.getSort()))
                                    .collect(Collectors.toList());
                            urlUtil.resolveProductTags(tags);
                        }
                        product.setTagList(tags);
                    }
                } catch (Exception ignored) {
                }
            }
            urlUtil.resolveProduct(product);
        }
        return Result.success(product);
    }

    @PostMapping
    public Result<Void> add(@Valid @RequestBody ProductDTO dto) {
        productService.addProduct(dto);
        return Result.success();
    }

    @PutMapping
    public Result<Void> update(@Valid @RequestBody ProductDTO dto) {
        productService.updateProduct(dto);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        productService.deleteProduct(id);
        return Result.success();
    }

    @DeleteMapping("/batch")
    public Result<Void> batchDelete(@RequestBody List<Long> ids) {
        productService.deleteBatch(ids);
        return Result.success();
    }

    @PostMapping("/batch-delete")
    public Result<Void> batchDeletePost(@RequestBody List<Long> ids) {
        productService.deleteBatch(ids);
        return Result.success();
    }

    @PutMapping("/{id}/status/{status}")
    public Result<Void> updateStatus(@PathVariable Long id, @PathVariable Integer status) {
        productService.updateStatus(id, status);
        return Result.success();
    }

    @PostMapping("/batch-status")
    public Result<Void> batchUpdateStatus(@Valid @RequestBody BatchStatusDTO dto) {
        productService.updateStatusBatch(dto.getIds(), dto.getStatus());
        return Result.success();
    }
}
