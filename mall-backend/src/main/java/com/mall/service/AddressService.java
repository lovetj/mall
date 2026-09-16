package com.mall.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mall.dto.AddressDTO;
import com.mall.entity.Address;

import java.util.List;

public interface AddressService extends IService<Address> {

    List<Address> listByUserId(String userId);

    Address getDetail(String userId, String id);

    Address getDefaultAddress(String userId);

    Address addAddress(String userId, AddressDTO dto);

    Address updateAddress(String userId, AddressDTO dto);

    void deleteAddress(String userId, String id);

    void setDefaultAddress(String userId, String id);
}
