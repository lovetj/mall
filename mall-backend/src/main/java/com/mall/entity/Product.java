package com.mall.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@TableName("product")
public class Product implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(value = "id", type = IdType.ASSIGN_UUID)
    private String id;

    private String categoryId;

    private String name;

    private String image;

    private String images;

    private String tags;

    private BigDecimal price;

    private String unit;

    private Integer stock;

    private String description;

    private String origin;

    private Integer sales;

    private Integer status;

    private Integer sort;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    @TableField(exist = false)
    private String categoryName;

    @TableField(exist = false)
    private List<ProductTag> tagList;
}
