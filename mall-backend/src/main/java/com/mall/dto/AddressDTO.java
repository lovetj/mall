package com.mall.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.Size;
import java.math.BigDecimal;

@Data
public class AddressDTO {
    private Long id;

    private Long userId;

    @NotBlank(message = "收货人姓名不能为空")
    @Size(max = 20, message = "收货人姓名不能超过20个字")
    private String receiverName;

    @NotBlank(message = "手机号码不能为空")
    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号码格式不正确")
    private String phone;

    @NotBlank(message = "详细地址不能为空")
    private String detailAddress;

    private String houseNumber;

    private String addressType;

    private String province;

    private String city;

    private String district;

    private BigDecimal latitude;

    private BigDecimal longitude;

    private Integer isDefault;
}
