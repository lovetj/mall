package com.mall.dto;

import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class CartVO implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long id;
    private Long cartId;
    private Long productId;
    private Integer quantity;
    private String name;
    private String image;
    private BigDecimal price;
    private String unit;
    private Integer stock;
    private Integer status;
    private Boolean selected;
    private LocalDateTime createTime;
}
