package com.mall.dto;

import lombok.Data;

@Data
public class PageDTO {
    private Integer pageNum = 1;
    private Integer pageSize = 10;
    private String keyword;
    private String categoryId;
    private Integer status;
    private Integer isHotselling;
    private Integer isDel;
}
