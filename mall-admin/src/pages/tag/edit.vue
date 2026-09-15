<template>
  <view class="tag-edit-page">
    <view class="form-container">
      <!-- 基础信息卡片 -->
      <view class="form-card">
        <view class="card-title">基本信息</view>
        
        <!-- 标签名称 -->
        <view class="form-item">
          <text class="form-label">标签名称 *</text>
          <input
            class="form-input"
            v-model="form.name"
            placeholder="请输入标签名称，如：热销推荐、有机认证"
            maxlength="50"
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

        <!-- 是否热销标签 -->
        <view class="form-item">
          <text class="form-label">是否热销标签</text>
          <view class="status-switch">
            <view
              class="switch-item"
              :class="{ active: form.isHotselling === 1 }"
              @click="form.isHotselling = 1"
            >是</view>
            <view
              class="switch-item"
              :class="{ active: form.isHotselling === 0 }"
              @click="form.isHotselling = 0"
            >否</view>
          </view>
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

      <!-- 标签图标卡片 -->
      <view class="form-card">
        <view class="card-title">标签图标/图片</view>
        
        <view class="form-item">
          <view class="label-row">
            <text class="form-label">标签图片</text>
            <text class="form-tip">支持上传单张图片作为标签图标（展示在商品详情中）</text>
          </view>
          <view class="image-upload-wrap">
            <view class="image-item single-image" v-if="form.image">
              <image
                class="preview-image"
                :src="formatUrl(form.image)"
                mode="aspectFit"
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
        {{ submitting ? '保存中...' : '保存标签' }}
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
      id: null,
      form: {
        id: null,
        name: '',
        image: '',
        sort: 0,
        isHotselling: 0,
        status: 1
      },
      submitting: false
}
    },
  async onLoad(options) {
    if (options && options.id) {
      this.id = parseInt(options.id)
      uni.setNavigationBarTitle({ title: '编辑标签' })
      this.loadDetail()
    } else {
      uni.setNavigationBarTitle({ title: '新建标签' })
}
    },
  methods: {      

    formatUrl(path) {
      return formatImageUrl(path)
    },
    async loadDetail() {
      try {
        const data = await api.getTagDetail(this.id)
        if (data) {
          this.form = {
            id: data.id,
            name: data.name || '',
            image: data.image || '',
            sort: data.sort !== undefined && data.sort !== null ? data.sort : 0,
            isHotselling: data.isHotselling !== undefined && data.isHotselling !== null ? data.isHotselling : 0,
            status: data.status !== undefined && data.status !== null ? data.status : 1
          }
        }
      } catch (e) {
        uni.showToast({
          title: (e && e.message) || '加载标签详情失败',
          icon: 'none'
        })
}
    },
    async chooseImage() {
      try {
        const data = await chooseAndUploadSingleImage({
          module: 'tag',
          loadingTitle: '正在上传图片...',
          successTitle: '上传成功'
        })
        if (data && data.relativePath) {
          this.form.image = data.relativePath
        }
      } catch (e) {
        // 错误已在 upload 方法中 toast
}
    },
    removeImage() {
      this.form.image = ''
    },
    previewImage(url) {
      const fullUrl = this.formatUrl(url)
      if (fullUrl) {
        uni.previewImage({
          urls: [fullUrl],
          current: fullUrl
        })
}
    },
    handleCancel() {
      uni.navigateBack()
    },
    async handleSubmit() {
      if (this.submitting) return
      if (!this.form.name || !this.form.name.trim()) {
        uni.showToast({
          title: '请输入标签名称',
          icon: 'none'
        })
        return
      }

      this.submitting = true
      try {
        const payload = {
          name: this.form.name.trim(),
          image: this.form.image || '',
          sort: parseInt(this.form.sort) || 0,
          isHotselling: this.form.isHotselling !== undefined && this.form.isHotselling !== null ? this.form.isHotselling : 0,
          status: this.form.status
        }

        if (this.id) {
          payload.id = this.id
          await api.updateTag(payload)
          uni.showToast({
            title: '修改成功',
            icon: 'success'
          })
        } else {
          await api.addTag(payload)
          uni.showToast({
            title: '添加成功',
            icon: 'success'
          })
        }

        setTimeout(() => {
          uni.navigateBack()
        }, 800)
      } catch (e) {
        uni.showToast({
          title: (e && e.message) || '保存失败',
          icon: 'none'
        })
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.tag-edit-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 90px;
  box-sizing: border-box;
}

.form-container {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f2f5;
}

.form-item {
  margin-bottom: 16px;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 14px;
  color: #374151;
  margin-bottom: 8px;
  font-weight: 500;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.form-tip {
  font-size: 12px;
  color: #9ca3af;
}

.form-input {
  width: 100%;
  height: 40px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 14px;
  box-sizing: border-box;
  background: #fff;
}

.form-input:focus {
  border-color: #1890ff;
}

.status-switch {
  display: flex;
  gap: 12px;
}

.switch-item {
  flex: 1;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #4b5563;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.switch-item.active {
  background: #e6f7ff;
  border-color: #1890ff;
  color: #1890ff;
  font-weight: 500;
}

.image-upload-wrap {
  display: flex;
  gap: 12px;
}

.image-item {
  position: relative;
  width: 90px;
  height: 90px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

.preview-image {
  width: 100%;
  height: 100%;
}

.delete-icon {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
}

.reupload-btn {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 11px;
  text-align: center;
  padding: 2px 0;
  cursor: pointer;
}

.upload-btn {
  width: 90px;
  height: 90px;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  cursor: pointer;
}

.plus-icon {
  font-size: 24px;
  color: #9ca3af;
  line-height: 1;
}

.upload-tip {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.footer-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.cancel-btn {
  flex: 1;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #4b5563;
  font-size: 15px;
  cursor: pointer;
}

.save-btn {
  flex: 2;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1890ff;
  border-radius: 6px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.save-btn.disabled {
  background: #bfbfbf;
  cursor: not-allowed;
}
</style>
