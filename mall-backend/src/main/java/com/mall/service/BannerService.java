package com.mall.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mall.common.PageResult;
import com.mall.dto.BannerDTO;
import com.mall.dto.PageDTO;
import com.mall.entity.Banner;

import java.util.List;

public interface BannerService extends IService<Banner> {
    List<Banner> listAll();

    PageResult<Banner> pageList(PageDTO pageDTO);

    void addBanner(BannerDTO dto);

    void updateBanner(BannerDTO dto);

    void deleteBanner(String id);

    void deleteBatch(List<String> ids);

    void updateStatus(String id, Integer status);

    void updateStatusBatch(List<String> ids, Integer status);
}
