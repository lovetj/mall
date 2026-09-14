package com.mall.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.dto.AddressDTO;
import com.mall.service.AddressService;
import com.mall.entity.Address;
import com.mall.mapper.AddressMapper;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AddressServiceImpl extends ServiceImpl<AddressMapper, Address> implements AddressService {

    @Override
    public List<Address> listByUserId(Long userId) {
        return list(new LambdaQueryWrapper<Address>()
                .eq(Address::getUserId, userId)
                .orderByDesc(Address::getIsDefault)
                .orderByDesc(Address::getUpdateTime));
    }

    @Override
    public Address getDetail(Long userId, Long id) {
        return getOne(new LambdaQueryWrapper<Address>()
                .eq(Address::getId, id)
                .eq(Address::getUserId, userId));
    }

    @Override
    public Address getDefaultAddress(Long userId) {
        Address defaultAddress = getOne(new LambdaQueryWrapper<Address>()
                .eq(Address::getUserId, userId)
                .eq(Address::getIsDefault, 1)
                .last("LIMIT 1"));
        if (defaultAddress == null) {
            defaultAddress = getOne(new LambdaQueryWrapper<Address>()
                    .eq(Address::getUserId, userId)
                    .orderByDesc(Address::getUpdateTime)
                    .last("LIMIT 1"));
        }
        return defaultAddress;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void addAddress(Long userId, AddressDTO dto) {
        long count = count(new LambdaQueryWrapper<Address>().eq(Address::getUserId, userId));

        Address address = new Address();
        BeanUtils.copyProperties(dto, address);
        address.setId(null);
        address.setUserId(userId);

        if (count == 0 || (dto.getIsDefault() != null && dto.getIsDefault() == 1)) {
            address.setIsDefault(1);
            if (count > 0) {
                update(new LambdaUpdateWrapper<Address>()
                        .eq(Address::getUserId, userId)
                        .set(Address::getIsDefault, 0));
            }
        } else {
            address.setIsDefault(0);
        }

        if (address.getAddressType() == null || address.getAddressType().trim().isEmpty()) {
            address.setAddressType("家");
        }

        save(address);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateAddress(Long userId, AddressDTO dto) {
        if (dto.getId() == null) {
            throw new RuntimeException("地址ID不能为空");
        }
        Address existing = getDetail(userId, dto.getId());
        if (existing == null) {
            throw new RuntimeException("收货地址不存在");
        }

        if (dto.getIsDefault() != null && dto.getIsDefault() == 1) {
            update(new LambdaUpdateWrapper<Address>()
                    .eq(Address::getUserId, userId)
                    .set(Address::getIsDefault, 0));
            existing.setIsDefault(1);
        } else if (dto.getIsDefault() != null) {
            existing.setIsDefault(dto.getIsDefault());
        }

        existing.setReceiverName(dto.getReceiverName());
        existing.setPhone(dto.getPhone());
        existing.setDetailAddress(dto.getDetailAddress());
        existing.setHouseNumber(dto.getHouseNumber());
        if (dto.getAddressType() != null && !dto.getAddressType().trim().isEmpty()) {
            existing.setAddressType(dto.getAddressType());
        }
        if (dto.getProvince() != null) existing.setProvince(dto.getProvince());
        if (dto.getCity() != null) existing.setCity(dto.getCity());
        if (dto.getDistrict() != null) existing.setDistrict(dto.getDistrict());
        if (dto.getLatitude() != null) existing.setLatitude(dto.getLatitude());
        if (dto.getLongitude() != null) existing.setLongitude(dto.getLongitude());

        updateById(existing);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteAddress(Long userId, Long id) {
        Address existing = getDetail(userId, id);
        if (existing == null) {
            return;
        }
        boolean wasDefault = (existing.getIsDefault() != null && existing.getIsDefault() == 1);
        removeById(id);

        if (wasDefault) {
            Address firstRemaining = getOne(new LambdaQueryWrapper<Address>()
                    .eq(Address::getUserId, userId)
                    .orderByDesc(Address::getUpdateTime)
                    .last("LIMIT 1"));
            if (firstRemaining != null) {
                firstRemaining.setIsDefault(1);
                updateById(firstRemaining);
            }
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void setDefaultAddress(Long userId, Long id) {
        Address address = getDetail(userId, id);
        if (address == null) {
            throw new RuntimeException("收货地址不存在");
        }
        update(new LambdaUpdateWrapper<Address>()
                .eq(Address::getUserId, userId)
                .set(Address::getIsDefault, 0));
        address.setIsDefault(1);
        updateById(address);
    }
}
