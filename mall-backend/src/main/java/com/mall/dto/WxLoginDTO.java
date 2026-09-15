package com.mall.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * 微信小程序登录请求参数
 */
@Data
public class WxLoginDTO {

    /**
     * 微信临时授权码
     */
    @NotBlank(message = "微信授权凭证code不能为空")
    private String code;

    /**
     * 微信昵称（必须为微信原生授权返回的真实昵称，禁止使用假数据）
     */
    @NotBlank(message = "微信授权登录昵称不能为空")
    private String nickname;

    /**
     * 头像图片（已上传后端的相对路径或网络URL）
     */
    private String avatar;

    /**
     * 微信号/用户名（可选，若未提供则默认以微信 openid 作为微信号用户名）
     */
    private String username;
}

