package com.mall.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;

@Data
public class UserDTO {
    private Long id;

    @NotBlank(message = "用户名不能为空")
    private String username;

    private String password;

    private String phone;

    private String avatar;

    private String nickname;

    private Integer status;
}
