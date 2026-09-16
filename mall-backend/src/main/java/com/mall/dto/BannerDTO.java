package com.mall.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;

@Data
public class BannerDTO {
    private String id;

    private String title;

    @NotBlank(message = "图片路径不能为空")
    private String image;

    private String link;

    private Integer sort;

    private Integer status;
}
