<script>
import api from './api/index'
import { setFileBaseServer } from './utils/request'

export default {
  onLaunch: function() {
    console.log('Admin App Launch')
    const token = uni.getStorageSync('admin_token')
    if (!token) {
      // 无 token 时：把默认加载的 index 替换成 login（不进栈）
      uni.redirectTo({ url: '/pages/login/login' })
      return
    }
    // 获取文件服务配置
    api.getFileConfig().then(cfg => {
      if (cfg && cfg.baseServer) {
        setFileBaseServer(cfg.baseServer)
      }
    }).catch(e => {
      console.warn('获取文件配置失败', e)
    })
  },
  onShow: function() {
    console.log('Admin App Show')
  },
  onHide: function() {
    console.log('Admin App Hide')
  }
}
</script>

<style>
html, body, page, uni-page-body {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  overscroll-behavior-x: none;
  overscroll-behavior: none;
}

.container {
  padding: 20rpx;
}

.btn-primary {
  background-color: #1890ff;
  color: #fff;
  border-radius: 8rpx;
  padding: 20rpx 40rpx;
  text-align: center;
}

.btn-danger {
  background-color: #ff4d4f;
  color: #fff;
  border-radius: 8rpx;
  padding: 20rpx 40rpx;
  text-align: center;
}

.card {
  background-color: #fff;
  border-radius: 8rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.form-item {
  margin-bottom: 24rpx;
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
}

.form-textarea {
  width: 100%;
  padding: 20rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  min-height: 200rpx;
}
</style>
