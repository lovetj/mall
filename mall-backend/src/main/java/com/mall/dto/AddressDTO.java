package com.mall.dto;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Pattern;
import javax.validation.constraints.Size;
import java.math.BigDecimal;

@Data
public class AddressDTO {
    private String id;

    private String userId;

    @NotBlank(message = "收货人姓名不能为空")
    @Size(max = 20, message = "收货人姓名不能超过20个字")
    private String receiverName;

    @NotBlank(message = "手机号码不能为空")
    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号码格式不正确")
    private String phone;

    private String receiverPhone;

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

    public String getPhone() {
        if (phone != null && !phone.trim().isEmpty()) {
            return phone;
        }
        return receiverPhone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
        if (this.receiverPhone == null || this.receiverPhone.trim().isEmpty()) {
            this.receiverPhone = phone;
        }
    }

    public void setReceiverPhone(String receiverPhone) {
        this.receiverPhone = receiverPhone;
        if (this.phone == null || this.phone.trim().isEmpty()) {
            this.phone = receiverPhone;
        }
    }
}
