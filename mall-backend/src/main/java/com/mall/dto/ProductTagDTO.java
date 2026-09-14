package com.mall.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;

@Data
public class ProductTagDTO {
    private Long id;

    @NotBlank(message = "标签名称不能为空")
    private String name;

    private String image;

    private Integer sort;

    private Integer isHotselling;

    private Integer status;
}
