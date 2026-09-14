package com.mall.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mall.dto.AddressDTO;
import com.mall.entity.Address;

import java.util.List;

public interface AddressService extends IService<Address> {

    List<Address> listByUserId(Long userId);

    Address getDetail(Long userId, Long id);

    Address getDefaultAddress(Long userId);

    void addAddress(Long userId, AddressDTO dto);

    void updateAddress(Long userId, AddressDTO dto);

    void deleteAddress(Long userId, Long id);

    void setDefaultAddress(Long userId, Long id);
}
