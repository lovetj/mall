<template>
  <view class="banner-edit-page">
    <view class="form-container">
      <!-- 基础信息卡片 -->
      <view class="form-card">
        <view class="card-title">基本信息</view>
        
        <!-- 轮播图标题 -->
        <view class="form-item">
          <text class="form-label">标题</text>
          <input
            class="form-input"
            v-model="form.title"
            placeholder="请输入轮播图标题（选填）"
            maxlength="100"
          />
        </view>

        <!-- 跳转链接 -->
        <view class="form-item">
          <text class="form-label">跳转链接</text>
          <input
            class="form-input"
            v-model="form.link"
            placeholder="请输入跳转链接，如 https://baidu.com（选填）"
            maxlength="255"
          />
        </view>

        <!-- 排序 -->
        <view class="form-item">
          <text class="form-label">显示排序</text>
          <input
            class="form-input"
            v-model="form.sort"
            type="number"
            placeholder="数字越小越靠前，默认 0"
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
            >启用</view>
            <view
              class="switch-item"
              :class="{ active: form.status === 0 }"
              @click="form.status = 0"
            >禁用</view>
          </view>
        </view>
      </view>

      <!-- 轮播图片卡片 -->
      <view class="form-card">
        <view class="card-title">轮播图片</view>
        
        <view class="form-item">
          <view class="label-row">
            <text class="form-label">图片 *</text>
            <text class="form-tip">支持上传单张轮播图</text>
          </view>
          <view class="image-upload-wrap">
            <view class="image-item single-image" v-if="form.image">
              <image
                class="preview-image"
                :src="formatUrl(form.image)"
                mode="aspectFill"
                @click="previewImage(form.image)"
              ></image>
              <view class="delete-icon" @click.stop="removeImage">×</view>
              <view class="reupload-btn" @click.stop="chooseImage">更换</view>
            </view>
            <view class="upload-btn" v-else @click="chooseImage">
              <text class="plus-icon">+</text>
              <text class="upload-tip">上传图片</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部保存按钮条 -->
    <view class="footer-bar">
      <view class="cancel-btn" @click="handleCancel">取消</view>
      <view class="save-btn" :class="{ disabled: submitting }" @click="handleSubmit">
        {{ submitting ? '保存中...' : '保存轮播图' }}
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
      bannerId: null,
      submitting: false,
      form: {
        id: null,
        title: '',
        image: '',
        link: '',
        sort: 0,
        status: 1
      }
}
    },
  async onLoad(options) {
    if (options && options.id) {
      this.bannerId = options.id
      uni.setNavigationBarTitle({
        title: '编辑轮播图'
      })
      this.loadBannerDetail(this.bannerId)
    } else {
      uni.setNavigationBarTitle({
        title: '新增轮播图'
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
    async loadBannerDetail(id) {
      uni.showLoading({ title: '加载中...' })
      try {
        const data = await api.getBannerDetail(id)
        if (data) {
          this.form = {
            id: data.id,
            title: data.title || '',
            image: data.image || '',
            link: data.link || '',
            sort: data.sort !== undefined ? data.sort : 0,
            status: data.status !== undefined ? data.status : 1
          }
        }
      } catch (e) {
        console.error('加载轮播图详情失败', e)
      } finally {
        uni.hideLoading()
}
    },
    async chooseImage() {
      try {
        const data = await chooseAndUploadSingleImage({
          module: 'banner',
          loadingTitle: '正在上传图片...',
          successTitle: '图片上传成功'
        })
        if (data && data.relativePath) {
          this.form.image = data.relativePath
        }
      } catch (e) {
        // 上传提示在公共方法中已处理
}
    },
    removeImage() {
      this.form.image = ''
    },
    handleCancel() {
      uni.navigateBack({
        fail: () => {
          uni.redirectTo({
            url: '/pages/banner/list'
          })
        }
      })
    },
    async handleSubmit() {
      const form = this.form
      if (!form.image || !form.image.trim()) {
        uni.showToast({ title: '请上传轮播图图片', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        const payload = {
          title: form.title ? form.title.trim() : '',
          image: form.image ? form.image.trim() : '',
          link: form.link ? form.link.trim() : '',
          sort: form.sort !== '' && form.sort !== null ? parseInt(form.sort, 10) : 0,
          status: form.status
        }

        if (this.bannerId) {
          payload.id = this.bannerId
          await api.updateBanner(payload)
          uni.showToast({ title: '修改轮播图成功', icon: 'success' })
        } else {
          await api.addBanner(payload)
          uni.showToast({ title: '新增轮播图成功', icon: 'success' })
        }

        uni.$emit('refreshBannerList')

        setTimeout(() => {
          uni.navigateBack({
            fail: () => {
              uni.redirectTo({
                url: '/pages/banner/list'
              })
            }
          })
        }, 600)
      } catch (e) {
        console.error('保存轮播图失败', e)
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.banner-edit-page {
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

.image-upload-wrap {
  display: flex;
  align-items: center;
}

.image-item.single-image {
  position: relative;
  width: 240rpx;
  height: 150rpx;
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
}

.reupload-btn {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40rpx;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-btn {
  width: 240rpx;
  height: 150rpx;
  border: 2rpx dashed #d9d9d9;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  cursor: pointer;
}

.upload-btn:hover {
  border-color: #1890ff;
}

.plus-icon {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
  margin-bottom: 8rpx;
}

.upload-tip {
  font-size: 22rpx;
  color: #999;
}

.status-switch {
  display: flex;
  background: #f0f0f0;
  border-radius: 8rpx;
  padding: 4rpx;
  width: 240rpx;
}

.switch-item {
  flex: 1;
  text-align: center;
  height: 60rpx;
  line-height: 60rpx;
  font-size: 26rpx;
  color: #666;
  border-radius: 6rpx;
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
  left: 0;
  right: 0;
  bottom: 0;
  height: 110rpx;
  background: #fff;
  border-top: 1rpx solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 30rpx;
  gap: 20rpx;
  box-sizing: border-box;
  z-index: 100;
}

.cancel-btn {
  padding: 0 36rpx;
  height: 72rpx;
  line-height: 72rpx;
  border: 1rpx solid #d9d9d9;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #666;
  cursor: pointer;
  background: #fff;
}

.save-btn {
  padding: 0 44rpx;
  height: 72rpx;
  line-height: 72rpx;
  background: #1890ff;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #fff;
  cursor: pointer;
  font-weight: 500;
}

.save-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
