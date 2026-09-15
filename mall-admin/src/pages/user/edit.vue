<template>
  <view class="user-edit-page">
    <view class="form-container">
      <!-- 基础信息卡片 -->
      <view class="form-card">
        <view class="card-title">基本信息</view>
        
        <!-- 用户名 -->
        <view class="form-item">
          <text class="form-label">用户名 *</text>
          <input
            class="form-input"
            v-model="form.username"
            placeholder="请输入用户名（不可重复）"
            maxlength="50"
          />
        </view>

        <!-- 微信OpenID（只读） -->
        <view class="form-item" v-if="form.openid">
          <text class="form-label">微信 OpenID</text>
          <input
            class="form-input disabled-input"
            :value="form.openid"
            disabled
          />
        </view>

        <!-- 密码 -->
        <view class="form-item">
          <text class="form-label">{{ userId ? '密码 (留空则不修改)' : '登录密码' }}</text>
          <input
            class="form-input"
            v-model="form.password"
            :placeholder="userId ? '留空表示不修改密码' : '请输入密码，默认 123456'"
            maxlength="50"
            password
          />
        </view>

        <!-- 昵称 -->
        <view class="form-item">
          <text class="form-label">用户昵称</text>
          <input
            class="form-input"
            v-model="form.nickname"
            placeholder="请输入用户昵称"
            maxlength="50"
          />
        </view>

        <!-- 手机号 -->
        <view class="form-item">
          <text class="form-label">手机号码</text>
          <input
            class="form-input"
            v-model="form.phone"
            placeholder="请输入手机号码"
            maxlength="20"
          />
        </view>

        <!-- 状态 -->
        <view class="form-item">
          <text class="form-label">状态</text>
          <view class="status-switch">
            <view
              class="switch-item"
              :class="{ active: form.status === 1 }"
              @click="form.status = 1"
            >正常</view>
            <view
              class="switch-item"
              :class="{ active: form.status === 0 }"
              @click="form.status = 0"
            >禁用</view>
          </view>
        </view>
      </view>

      <!-- 用户头像卡片 -->
      <view class="form-card">
        <view class="card-title">用户头像</view>
        
        <view class="form-item">
          <view class="label-row">
            <text class="form-label">头像图片</text>
            <text class="form-tip">支持上传单张图片作为用户头像</text>
          </view>
          <view class="image-upload-wrap">
            <view class="image-item single-image" v-if="form.avatar">
              <image
                class="preview-image"
                :src="formatUrl(form.avatar)"
                mode="aspectFill"
                @click="previewImage(form.avatar)"
              ></image>
              <view class="delete-icon" @click.stop="removeAvatar">×</view>
              <view class="reupload-btn" @click.stop="chooseAvatar">更换</view>
            </view>
            <view class="upload-btn" v-else @click="chooseAvatar">
              <text class="plus-icon">+</text>
              <text class="upload-tip">上传头像</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部保存按钮条 -->
    <view class="footer-bar">
      <view class="cancel-btn" @click="handleCancel">取消</view>
      <view class="save-btn" :class="{ disabled: submitting }" @click="handleSubmit">
        {{ submitting ? '保存中...' : '保存用户' }}
      </view>
    </view>
  </view>
</template>

<script>
import api from '../../api/index'
import { formatImageUrl } from '../../utils/request'
import { chooseAndUploadSingleImage } from '../../utils/upload'

export default {
  data() {
    return {
      userId: null,
      submitting: false,
      form: {
        id: null,
        username: '',
        password: '',
        nickname: '',
        phone: '',
        openid: '',
        avatar: '',
        status: 1
      }
}
    },
  async onLoad(options) {
    if (options && options.id) {
      this.userId = options.id
      uni.setNavigationBarTitle({
        title: '编辑用户'
      })
      this.loadUserDetail(this.userId)
    } else {
      uni.setNavigationBarTitle({
        title: '新增用户'
      })
}
    },
  methods: {      

    formatUrl(path) {
      return formatImageUrl(path)
    },
    previewImage(path) {
      if (!path) return
      const fullUrl = this.formatUrl(path)
      if (!fullUrl) return
      uni.previewImage({
        urls: [fullUrl],
        current: fullUrl
      })
    },
    async loadUserDetail(id) {
      uni.showLoading({ title: '加载中...' })
      try {
        const data = await api.getUserDetail(id)
        if (data) {
          this.form = {
            id: data.id,
            username: data.username || '',
            password: '',
            nickname: data.nickname || '',
            phone: data.phone || '',
            openid: data.openid || '',
            avatar: data.avatar || '',
            status: data.status !== undefined ? data.status : 1
          }
        }
      } catch (e) {
        console.error('加载用户详情失败', e)
      } finally {
        uni.hideLoading()
}
    },
    async chooseAvatar() {
      try {
        const data = await chooseAndUploadSingleImage({
          module: 'user',
          loadingTitle: '正在上传头像...',
          successTitle: '头像上传成功'
        })
        if (data && data.relativePath) {
          this.form.avatar = data.relativePath
        }
      } catch (e) {
        // 上传提示在公共方法中已处理
}
    },
    removeAvatar() {
      this.form.avatar = ''
    },
    handleCancel() {
      uni.navigateBack({
        fail: () => {
          uni.redirectTo({
            url: '/pages/user/list'
          })
        }
      })
    },
    async handleSubmit() {
      const form = this.form
      if (!form.username || !form.username.trim()) {
        uni.showToast({ title: '请输入用户名', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        const payload = {
          username: form.username.trim(),
          nickname: form.nickname ? form.nickname.trim() : '',
          phone: form.phone ? form.phone.trim() : '',
          avatar: form.avatar ? form.avatar.trim() : '',
          status: form.status
        }
        if (form.password && form.password.trim()) {
          payload.password = form.password.trim()
        }

        if (this.userId) {
          payload.id = this.userId
          await api.updateUser(payload)
          uni.showToast({ title: '修改用户成功', icon: 'success' })
        } else {
          await api.addUser(payload)
          uni.showToast({ title: '新增用户成功', icon: 'success' })
        }

        uni.$emit('refreshUserList')

        setTimeout(() => {
          uni.navigateBack({
            fail: () => {
              uni.redirectTo({
                url: '/pages/user/list'
              })
            }
          })
        }, 600)
      } catch (e) {
        console.error('保存用户失败', e)
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.user-edit-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 140rpx;
  box-sizing: border-box;
}

.form-container {
  padding: 20rpx;
}

.form-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 30rpx 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
  padding-left: 12rpx;
  border-left: 6rpx solid #1890ff;
}

.form-item {
  margin-bottom: 28rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
  font-weight: 500;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.label-row .form-label {
  margin-bottom: 0;
}

.form-tip {
  font-size: 22rpx;
  color: #999;
}

.form-input {
  width: 100%;
  height: 80rpx;
  border: 1rpx solid #d9d9d9;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  background: #fafafa;
}

.form-input:focus {
  background: #fff;
  border-color: #1890ff;
}

.disabled-input {
  background-color: #f5f5f5;
  color: #8c8c8c;
  cursor: not-allowed;
}

.image-upload-wrap {
  display: flex;
  align-items: center;
}

.image-item.single-image {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
  border: 1rpx solid #d9d9d9;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: 100%;
}

.delete-icon {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 36rpx;
  height: 36rpx;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  cursor: pointer;
  z-index: 5;
}

.reupload-btn {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 22rpx;
  text-align: center;
  padding: 6rpx 0;
}

.upload-btn {
  width: 160rpx;
  height: 160rpx;
  border: 2rpx dashed #d9d9d9;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  cursor: pointer;
}

.plus-icon {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
}

.upload-tip {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}

.status-switch {
  display: flex;
  border: 1rpx solid #d9d9d9;
  border-radius: 8rpx;
  overflow: hidden;
  width: 280rpx;
}

.switch-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 26rpx;
  color: #666;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.2s;
}

.switch-item.active {
  background: #1890ff;
  color: #fff;
  font-weight: 500;
}

.footer-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  gap: 24rpx;
  box-sizing: border-box;
  z-index: 100;
}

.cancel-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  background: #f5f5f5;
  color: #666;
  border-radius: 8rpx;
  font-size: 28rpx;
  cursor: pointer;
}

.save-btn {
  flex: 2;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  background: #1890ff;
  color: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
  cursor: pointer;
  font-weight: 500;
}

.save-btn.disabled {
  background: #91d5ff;
  cursor: not-allowed;
}
</style>
