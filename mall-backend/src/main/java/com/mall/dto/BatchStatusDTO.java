package com.mall.dto;

import lombok.Data;

import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import java.util.List;

@Data
public class BatchStatusDTO {
    @NotEmpty(message = "ID列表不能为空")
    private List<Long> ids;

    @NotNull(message = "状态不能为空")
    private Integer status;
}
