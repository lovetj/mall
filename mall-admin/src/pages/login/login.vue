<template>
  <view class="login-page">
    <view class="login-header">
      <text class="logo">🌾</text>
      <text class="title">Sunny管理后台</text>
    </view>

    <view class="login-form">
      <view class="form-item">
        <text class="form-label">用户名</text>
        <input class="form-input" v-model="form.username" placeholder="请输入用户名" />
      </view>
      <view class="form-item">
        <text class="form-label">密码</text>
        <input class="form-input" v-model="form.password" type="password" placeholder="请输入密码" />
      </view>
      <view class="login-btn" @click="handleLogin">登录</view>
      <view class="login-tip">
        <text>初始账号：admin / admin123</text>
      </view>
    </view>
  </view>
</template>

<script>
import api from '../../api/index'
import { setFileBaseServer } from '../../utils/request'

export default {
  data() {
    return {
      form: {
        username: 'admin',
        password: ''
      }
    }
  },
  onLoad() {
    // 已登录用户直接跳过登录页
    const token = uni.getStorageSync('admin_token')
    if (token) {
      uni.redirectTo({ url: '/pages/index/index' })
    }
  },
  methods: {
    async handleLogin() {
      if (!this.form.username) {
        uni.showToast({ title: '请输入用户名', icon: 'none' })
        return
      }
      if (!this.form.password) {
        uni.showToast({ title: '请输入密码', icon: 'none' })
        return
      }

      try {
        const data = await api.login(this.form)
        uni.setStorageSync('admin_token', data.token)
        uni.setStorageSync('admin_info', data.admin)

        // 登录成功后初始化文件服务地址（兜底：App.vue 无 token 时跳过了 getFileConfig）
        api.getFileConfig().then(cfg => {
          if (cfg && cfg.baseServer) {
            setFileBaseServer(cfg.baseServer)
          }
        }).catch(() => {})

        uni.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => {
          uni.redirectTo({ url: '/pages/index/index' })
        }, 1000)
      } catch (e) {
        console.error(e)
      }
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}

.login-header {
  text-align: center;
  margin-bottom: 80rpx;
}

.logo {
  font-size: 120rpx;
  display: block;
  margin-bottom: 24rpx;
}

.title {
  font-size: 40rpx;
  color: #fff;
  font-weight: bold;
}

.login-form {
  width: 600rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx;
}

.form-item {
  margin-bottom: 32rpx;
}

.form-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
  display: block;
}

.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.login-btn {
  background: #1890ff;
  color: #fff;
  text-align: center;
  padding: 24rpx;
  border-radius: 8rpx;
  font-size: 32rpx;
  margin-top: 40rpx;
  cursor: pointer;
}

.login-tip {
  margin-top: 24rpx;
  text-align: center;
  font-size: 24rpx;
  color: #8c8c8c;
}
</style>
