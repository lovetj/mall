package com.mall.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.io.Serializable;
import java.math.BigDecimal;

@Data
public class ProductTierDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    private String id;

    private String productId;

    @NotBlank(message = "规格名称不能为空")
    private String name;

    @NotNull(message = "售价不能为空")
    private BigDecimal price;

    private BigDecimal originalPrice;

    private String unit;

    @NotNull(message = "库存不能为空")
    private Integer stock;

    private Integer sales;

    private String image;

    private Integer sort;

    private Integer status;
}
