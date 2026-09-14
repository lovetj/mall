package com.mall.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mall.entity.Config;

public interface ConfigService extends IService<Config> {
    String getValueByKey(String key);

    void setValueByKey(String key, String value);
}
