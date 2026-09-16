package com.mall.controller;

import com.mall.dto.AddressDTO;
import com.mall.entity.Address;
import com.mall.service.AddressService;
import com.mall.util.JwtUtil;
import com.mall.common.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/address")
public class AddressController {

    @Autowired
    private AddressService addressService;

    @Autowired
    private JwtUtil jwtUtil;

    private String resolveUserId(String authorization, String headerUserId) {
        if (authorization != null && !authorization.trim().isEmpty()) {
            if (jwtUtil.validateToken(authorization)) {
                return jwtUtil.getUserId(authorization);
            }
        }
        if (headerUserId != null && !headerUserId.trim().isEmpty()) {
            return headerUserId;
        }
        return null;
    }

    @GetMapping("/list")
    public Result<List<Address>> list(@RequestHeader(value = "Authorization", required = false) String authorization,
                                      @RequestHeader(value = "userId", required = false) String headerUserId) {
        String userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }
        return Result.success(addressService.listByUserId(userId));
    }

    @GetMapping("/default")
    public Result<Address> getDefault(@RequestHeader(value = "Authorization", required = false) String authorization,
                                      @RequestHeader(value = "userId", required = false) String headerUserId) {
        String userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }
        return Result.success(addressService.getDefaultAddress(userId));
    }

    @GetMapping("/{id}")
    public Result<Address> detail(@PathVariable String id,
                                  @RequestHeader(value = "Authorization", required = false) String authorization,
                                  @RequestHeader(value = "userId", required = false) String headerUserId) {
        String userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }
        Address address = addressService.getDetail(userId, id);
        if (address == null) {
            return Result.error(404, "地址不存在");
        }
        return Result.success(address);
    }

    @PostMapping
    public Result<Void> add(@Valid @RequestBody AddressDTO dto,
                            @RequestHeader(value = "Authorization", required = false) String authorization,
                            @RequestHeader(value = "userId", required = false) String headerUserId) {
        String userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }
        addressService.addAddress(userId, dto);
        return Result.success();
    }

    @PutMapping
    public Result<Void> update(@Valid @RequestBody AddressDTO dto,
                               @RequestHeader(value = "Authorization", required = false) String authorization,
                               @RequestHeader(value = "userId", required = false) String headerUserId) {
        String userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }
        addressService.updateAddress(userId, dto);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id,
                               @RequestHeader(value = "Authorization", required = false) String authorization,
                               @RequestHeader(value = "userId", required = false) String headerUserId) {
        String userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }
        addressService.deleteAddress(userId, id);
        return Result.success();
    }

    @PostMapping("/default/{id}")
    public Result<Void> setDefault(@PathVariable String id,
                                   @RequestHeader(value = "Authorization", required = false) String authorization,
                                   @RequestHeader(value = "userId", required = false) String headerUserId) {
        String userId = resolveUserId(authorization, headerUserId);
        if (userId == null) {
            return Result.error(401, "用户未登录，请先登录");
        }
        addressService.setDefaultAddress(userId, id);
        return Result.success();
    }
}
