package com.mall.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.service.ConfigService;
import com.mall.entity.Config;
import com.mall.mapper.ConfigMapper;
import org.springframework.stereotype.Service;

@Service
public class ConfigServiceImpl extends ServiceImpl<ConfigMapper, Config> implements ConfigService {

    @Override
    public String getValueByKey(String key) {
        LambdaQueryWrapper<Config> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Config::getConfigKey, key);
        Config config = getOne(wrapper);
        return config != null ? config.getConfigValue() : null;
    }

    @Override
    public void setValueByKey(String key, String value) {
        LambdaQueryWrapper<Config> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Config::getConfigKey, key);
        Config config = getOne(wrapper);
        if (config != null) {
            config.setConfigValue(value);
            updateById(config);
        } else {
            config = new Config();
            config.setConfigKey(key);
            config.setConfigValue(value);
            save(config);
        }
    }
}
