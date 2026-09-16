package com.mall.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@Data
public class ProductDTO {
    private String id;

    @NotNull(message = "分类ID不能为空")
    private String categoryId;

    @NotBlank(message = "商品名称不能为空")
    private String name;

    private String image;

    private String images;

    private String tags;

    @NotNull(message = "价格不能为空")
    private java.math.BigDecimal price;

    private String unit;

    private Integer stock;

    private String description;

    private String origin;

    private Integer status;

    private Integer sort;
}
