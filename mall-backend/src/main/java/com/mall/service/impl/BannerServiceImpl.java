package com.mall.service.impl;

import cn.hutool.core.bean.BeanUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.service.BannerService;
import com.mall.common.PageResult;
import com.mall.dto.BannerDTO;
import com.mall.dto.PageDTO;
import com.mall.entity.Banner;
import com.mall.mapper.BannerMapper;
import com.mall.util.UrlUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BannerServiceImpl extends ServiceImpl<BannerMapper, Banner> implements BannerService {

    @Autowired
    private UrlUtil urlUtil;

    @Override
    public List<Banner> listAll() {
        LambdaQueryWrapper<Banner> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Banner::getStatus, 1)
                .orderByAsc(Banner::getSort);
        List<Banner> list = list(wrapper);
        urlUtil.resolveBanners(list);
        return list;
    }

    @Override
    public PageResult<Banner> pageList(PageDTO pageDTO) {
        Page<Banner> page = new Page<>(pageDTO.getPageNum(), pageDTO.getPageSize());
        LambdaQueryWrapper<Banner> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(pageDTO.getKeyword())) {
            String kw = pageDTO.getKeyword().trim();
            wrapper.like(Banner::getTitle, kw);
        }
        if (pageDTO.getStatus() != null) {
            wrapper.eq(Banner::getStatus, pageDTO.getStatus());
        }
        wrapper.orderByAsc(Banner::getSort).orderByDesc(Banner::getCreateTime);
        Page<Banner> result = page(page, wrapper);
        List<Banner> records = result.getRecords();
        urlUtil.resolveBanners(records);
        return new PageResult<>(records, result.getTotal(), result.getPages(), result.getCurrent(), result.getSize());
    }

    @Override
    public void addBanner(BannerDTO dto) {
        Banner banner = new Banner();
        BeanUtil.copyProperties(dto, banner);
        if (banner.getStatus() == null) {
            banner.setStatus(1);
        }
        if (banner.getSort() == null) {
            banner.setSort(0);
        }
        if (banner.getCreateTime() == null) {
            banner.setCreateTime(LocalDateTime.now());
        }
        save(banner);
    }

    @Override
    public void updateBanner(BannerDTO dto) {
        if (dto.getId() == null) {
            throw new RuntimeException("轮播图ID不能为空");
        }
        Banner banner = new Banner();
        BeanUtil.copyProperties(dto, banner);
        updateById(banner);
    }

    @Override
    public void deleteBanner(Long id) {
        removeById(id);
    }

    @Override
    public void deleteBatch(List<Long> ids) {
        if (ids != null && !ids.isEmpty()) {
            removeByIds(ids);
        }
    }

    @Override
    public void updateStatus(Long id, Integer status) {
        Banner banner = new Banner();
        banner.setId(id);
        banner.setStatus(status);
        updateById(banner);
    }

    @Override
    public void updateStatusBatch(List<Long> ids, Integer status) {
        if (ids != null && !ids.isEmpty()) {
            List<Banner> list = ids.stream().map(id -> {
                Banner b = new Banner();
                b.setId(id);
                b.setStatus(status);
                return b;
            }).collect(Collectors.toList());
            updateBatchById(list);
        }
    }
}
