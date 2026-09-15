<template>
  <view class="config-page">
    <view class="config-section">
      <view class="section-title">联系方式配置</view>
      
      <view class="form-item">
        <text class="form-label">微信号</text>
        <input class="form-input" v-model="config.wechat" placeholder="请输入微信号" />
        <view class="save-btn" @click="saveConfig('wechat')">保存</view>
      </view>

      <view class="form-item">
        <text class="form-label">抖音号</text>
        <input class="form-input" v-model="config.douyin" placeholder="请输入抖音号" />
        <view class="save-btn" @click="saveConfig('douyin')">保存</view>
      </view>

      <view class="form-item">
        <text class="form-label">联系电话</text>
        <input class="form-input" v-model="config.phone" placeholder="请输入联系电话" />
        <view class="save-btn" @click="saveConfig('phone')">保存</view>
      </view>

      <view class="form-item">
        <text class="form-label">地址</text>
        <input class="form-input" v-model="config.address" placeholder="请输入地址" />
        <view class="save-btn" @click="saveConfig('address')">保存</view>
      </view>
    </view>

    <view class="config-section">
      <view class="section-title">第三方服务配置</view>

      <view class="form-item">
        <text class="form-label">高德地图 Web 服务 Key (amap_key)</text>
        <input class="form-input" v-model="config.amap_key" placeholder="请输入高德开放平台申请的 Web 服务 Key" />
        <view class="save-btn" @click="saveConfig('amap_key')">保存地图Key</view>
      </view>

      <view class="form-item">
        <text class="form-label">高德地图数字密钥 (amap_secret)</text>
        <input class="form-input" v-model="config.amap_secret" placeholder="若高德应用开启了数字签名/安全密钥，请在此填入 Secret Key" />
        <view class="save-btn" @click="saveConfig('amap_secret')">保存数字密钥</view>
      </view>
    </view>

    <view class="tips-section">
      <text class="tips-title">提示</text>
      <text class="tips-text">1. 微信号和抖音号将显示在前端首页和联系我们页面</text>
      <text class="tips-text">2. 联系电话可点击直接拨打</text>
      <text class="tips-text">3. 高德地图 Web 服务 Key 用于用户端收货地址的地图搜索与定位</text>
      <text class="tips-text">4. 若高德后台开启了“数字签名”认证或配置了安全密钥，请将 Secret 填入数字密钥中，系统将自动进行签名计算</text>
      <text class="tips-text">5. 修改后前端将实时更新生效</text>
    </view>
  </view>
</template>

<script>
import api from '../../api/index'

export default {
  data() {
    return {
      config: {
        wechat: '',
        douyin: '',
        phone: '',
        address: '',
        amap_key: '',
        amap_secret: ''
      }
    }
  },
  onLoad() {
    this.loadConfig()
  },
  methods: {
    async loadConfig() {
      try {
        const keys = ['wechat', 'douyin', 'phone', 'address', 'amap_key', 'amap_secret']
        for (const key of keys) {
          const value = await api.getConfig(key)
          this.config[key] = value || ''
        }
      } catch (e) {
        console.error(e)
      }
    },
    async saveConfig(key) {
      try {
        await api.setConfig(key, this.config[key])
        uni.showToast({ title: '保存成功', icon: 'success' })
      } catch (e) {
        console.error(e)
      }
    }
  }
}
</script>

<style scoped>
.config-page {
  padding: 20rpx;
}

.config-section {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
}

.form-item {
  margin-bottom: 32rpx;
}

.form-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
  display: block;
}

.form-input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  margin-bottom: 16rpx;
}

.save-btn {
  background: #1890ff;
  color: #fff;
  text-align: center;
  padding: 16rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.tips-section {
  background: #fffbe6;
  border-radius: 12rpx;
  padding: 24rpx;
  border: 1rpx solid #ffe58f;
}

.tips-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #d48806;
  display: block;
  margin-bottom: 16rpx;
}

.tips-text {
  font-size: 26rpx;
  color: #d48806;
  display: block;
  line-height: 1.8;
}
</style>
