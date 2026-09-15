<template>
  <view class="product-edit-page">
    <view class="form-section">
      <view class="form-item">
        <text class="form-label">商品名称 *</text>
        <input class="form-input" v-model="form.name" placeholder="请输入商品名称" />
      </view>

      <view class="form-item">
        <text class="form-label">商品分类 *</text>
        <picker :value="categoryIndex" :range="categoryList" range-key="name" @change="onCategoryChange">
          <view class="form-picker">
            {{ categoryList[categoryIndex]?.name || '请选择分类' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <view class="label-row">
          <text class="form-label">商品标签（支持多选）</text>
          <text class="form-tip">支持多选，前台详情将按“图片+标签名”展示</text>
        </view>
        <view class="tag-select-grid" v-if="allTags.length > 0">
          <view
            class="tag-select-chip"
            :class="{ active: isTagSelected(tag.id) }"
            v-for="tag in allTags"
            :key="tag.id"
            @click="toggleTag(tag.id)"
          >
            <image
              v-if="tag.image"
              class="tag-chip-icon"
              :src="formatUrl(tag.image)"
              mode="aspectFit"
            ></image>
            <text class="tag-chip-name">{{ tag.name }}</text>
          </view>
        </view>
        <view class="empty-tag-tip" v-else>
          <text>暂无可选标签（可前往“商品标签管理”添加）</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">商品价格 *</text>
        <input class="form-input" v-model="form.price" type="digit" placeholder="请输入价格" />
      </view>

      <view class="form-item">
        <text class="form-label">单位</text>
        <input class="form-input" v-model="form.unit" placeholder="请输入单位，如：斤、个" />
      </view>

      <view class="form-item">
        <text class="form-label">库存</text>
        <input class="form-input" v-model="form.stock" type="number" placeholder="请输入库存数量" />
      </view>

      <view class="form-item">
        <text class="form-label">产地</text>
        <input class="form-input" v-model="form.origin" placeholder="请输入产地" />
      </view>

      <view class="form-item">
        <text class="form-label">商品描述</text>
        <textarea class="form-textarea" v-model="form.description" placeholder="请输入商品描述"></textarea>
      </view>

      <view class="form-item">
        <view class="label-row">
          <text class="form-label">商品图片（列表展示）</text>
          <text class="form-tip">支持单张上传，存相对路径</text>
        </view>
        <view class="image-upload-wrap">
          <view class="image-item single-image" v-if="form.image">
            <image class="preview-image" :src="formatUrl(form.image)" mode="aspectFill" @click="previewSingleImage"></image>
            <view class="delete-icon" @click.stop="removeSingleImage">×</view>
          </view>
          <view class="upload-btn" v-else @click="chooseSingleImage">
            <text class="plus-icon">+</text>
            <text class="upload-tip">上传图片</text>
          </view>
        </view>
      </view>

      <view class="form-item">
        <view class="label-row">
          <text class="form-label">商品图片集（详情轮播）</text>
          <text class="form-tip">支持按住拖拽调换顺序，最多9张</text>
        </view>
        <view class="images-grid" :class="{ 'is-dragging': isDragging }">
          <view
            class="image-item"
            :class="{
              'dragging': dragIndex === index,
              'drag-over': dragOverIndex === index && dragIndex !== index
            }"
            v-for="(img, index) in imageList"
            :key="index"
            :data-drag-index="index"
            draggable="true"
            @dragstart="onDragStart($event, index)"
            @dragover.prevent="onDragOver($event, index)"
            @dragenter.prevent="onDragEnter($event, index)"
            @drop.prevent="onDrop($event, index)"
            @dragend="onDragEnd($event)"
            @touchstart="onTouchStart($event, index)"
            @touchmove="onTouchMove($event)"
            @touchend="onTouchEnd($event)"
          >
            <!-- 序号/主图角标 -->
            <view class="item-badge" :class="{ 'main-badge': index === 0 }">
              {{ index === 0 ? '主图' : index + 1 }}
            </view>
            <image
              class="preview-image"
              :src="formatUrl(img)"
              mode="aspectFill"
              :draggable="false"
              @click="handleImageClick(index)"
            ></image>
            <view class="delete-icon" @click.stop="removeMultiImage(index)" title="删除图片">×</view>

            <view class="drag-tag" v-if="imageList.length > 1">
              <text class="drag-handle-dots">⋮⋮</text>
              <text>按住拖拽</text>
            </view>
          </view>
          <view class="upload-btn" @click="chooseMultiImages" v-if="imageList.length < 9">
            <text class="plus-icon">+</text>
            <text class="upload-tip">添加图片</text>
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">状态</text>
        <view class="status-switch">
          <view class="switch-item" :class="{ active: form.status === 1 }" @click="form.status = 1">上架</view>
          <view class="switch-item" :class="{ active: form.status === 0 }" @click="form.status = 0">下架</view>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">排序</text>
        <input class="form-input" v-model="form.sort" type="number" placeholder="数字越小越靠前" />
      </view>
    </view>

    <view class="form-actions">
      <view class="action-btn cancel" @click="goBack">取消</view>
      <view class="action-btn submit" @click="handleSubmit">保存</view>
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
        name: '',
        categoryId: null,
        price: '',
        unit: '斤',
        stock: 999,
        origin: '',
        description: '',
        image: '',
        images: '',
        tags: '',
        status: 1,
        sort: 0
      },
      allTags: [],
      selectedTagIds: [],
      imageList: [],
      categoryList: [],
      categoryIndex: 0,
      dragIndex: null,
      dragOverIndex: null,
      isDragging: false,
      touchStartIndex: null,
      touchMoveRaf: null
}
    },
  beforeUnmount() {
    if (this.touchMoveRaf && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.touchMoveRaf)
      this.touchMoveRaf = null
}
    },
  async onLoad(options) {
    await this.loadTags()
    if (options.id) {
      this.id = parseInt(options.id)
      await this.loadDetail()
    }
    this.loadCategories()
  },
  methods: {      

    formatUrl(path) {
      return formatImageUrl(path)
    },
    async loadCategories() {
      try {
        const data = await api.getCategoryList()
        this.categoryList = data || []
        if (this.form.categoryId) {
          const index = this.categoryList.findIndex(c => c.id === this.form.categoryId)
          if (index > -1) {
            this.categoryIndex = index
          }
        }
      } catch (e) {
        console.error(e)
}
    },
    async loadTags() {
      try {
        const data = await api.getTagList()
        this.allTags = (data || []).filter(t => t.status === 1)
      } catch (e) {
        console.error('加载标签列表失败', e)
}
    },
    isTagSelected(id) {
      return this.selectedTagIds.includes(id)
    },
    toggleTag(id) {
      const idx = this.selectedTagIds.indexOf(id)
      if (idx > -1) {
        this.selectedTagIds.splice(idx, 1)
      } else {
        this.selectedTagIds.push(id)
      }
      this.syncTagsToForm()
    },
    syncTagsToForm() {
      this.form.tags = this.selectedTagIds.length > 0 ? JSON.stringify(this.selectedTagIds) : ''
    },
    async loadDetail() {
      try {
        const data = await api.getProductDetail(this.id)
        this.form = { ...this.form, ...data }
        if (this.form.tags) {
          try {
            if (Array.isArray(this.form.tags)) {
              this.selectedTagIds = this.form.tags.map(v => Number(v)).filter(v => !isNaN(v))
            } else if (typeof this.form.tags === 'string') {
              const str = this.form.tags.trim()
              if (str.startsWith('[')) {
                const parsed = JSON.parse(str)
                this.selectedTagIds = Array.isArray(parsed) ? parsed.map(v => Number(v)).filter(v => !isNaN(v)) : []
              } else {
                this.selectedTagIds = str.split(',').map(s => Number(s.trim())).filter(v => !isNaN(v))
              }
            }
          } catch (e) {
            this.selectedTagIds = []
          }
        } else {
          this.selectedTagIds = []
        }
        if (this.form.images) {
          try {
            if (Array.isArray(this.form.images)) {
              this.imageList = [...this.form.images]
            } else if (typeof this.form.images === 'string') {
              const str = this.form.images.trim()
              if (str.startsWith('[')) {
                const parsed = JSON.parse(str)
                this.imageList = Array.isArray(parsed) ? parsed : []
              } else {
                this.imageList = str.split(',').map(s => s.trim()).filter(Boolean)
              }
            } else {
              this.imageList = []
            }
          } catch (err) {
            if (typeof this.form.images === 'string') {
              this.imageList = this.form.images.split(',').map(s => s.trim()).filter(Boolean)
            } else {
              this.imageList = []
            }
          }
        } else {
          this.imageList = []
        }
      } catch (e) {
        console.error('加载商品详情失败', e)
}
    },
    onCategoryChange(e) {
      this.categoryIndex = e.detail.value
      this.form.categoryId = this.categoryList[this.categoryIndex].id
    },
    async chooseSingleImage() {
      try {
        const data = await chooseAndUploadSingleImage({
          module: 'product',
          loadingTitle: '正在上传图片...',
          successTitle: '上传成功'
        })
        if (data && data.relativePath) {
          this.form.image = data.relativePath
        }
      } catch (e) {
        // 错误提示已由公共方法提示
}
    },
    removeSingleImage() {
      this.form.image = ''
    },
    previewSingleImage() {
      if (!this.form.image) return
      const fullUrl = this.formatUrl(this.form.image)
      if (!fullUrl) return
      uni.previewImage({
        urls: [fullUrl],
        current: fullUrl
      })
    },
    chooseMultiImages() {
      const remainingCount = 9 - (Array.isArray(this.imageList) ? this.imageList.length : 0)
      if (remainingCount <= 0) {
        uni.showToast({ title: '最多上传9张图片', icon: 'none' })
        return
      }
      uni.chooseImage({
        count: remainingCount,
        success: async (res) => {
          const tempFilePaths = res.tempFilePaths || []
          const tempFiles = res.tempFiles || []
          if (tempFilePaths.length === 0 && tempFiles.length === 0) return

          uni.showLoading({ title: '正在上传图片集...' })
          let successCount = 0
          let failCount = 0
          const errorMessages = []

          try {
            const total = Math.max(tempFilePaths.length, tempFiles.length)
            for (let i = 0; i < total; i++) {
              if (this.imageList.length >= 9) break
              const tempPath = tempFilePaths[i] || ''
              const tempFile = tempFiles[i] || null
              const fileObj = tempFile ? (tempFile.file || (tempFile instanceof File ? tempFile : null)) : null

              const fileSize = (fileObj && fileObj.size) || (tempFile && tempFile.size) || 0
              if (fileSize > 50 * 1024 * 1024) {
                const sizeMb = (fileSize / (1024 * 1024)).toFixed(1)
                failCount++
                errorMessages.push(`第${i + 1}张(${sizeMb}MB)超出50MB限制`)
                continue
              }

              try {
                const data = await api.uploadFile(tempPath, 'product/images', fileObj)
                if (data && data.relativePath) {
                  this.imageList.push(data.relativePath)
                  successCount++
                } else if (typeof data === 'string' && data) {
                  this.imageList.push(data)
                  successCount++
                }
              } catch (err) {
                failCount++
                const msg = (err && (err.message || err.errMsg)) || '上传失败'
                errorMessages.push(`第${i + 1}张: ${msg}`)
                console.error(`第${i + 1}张图片上传失败:`, err)
              }
            }
            this.syncImagesToForm()
            uni.hideLoading()

            if (successCount > 0 && failCount === 0) {
              uni.showToast({ title: `成功上传 ${successCount} 张图片`, icon: 'success' })
            } else if (successCount > 0 && failCount > 0) {
              const tip = `成功 ${successCount} 张，失败 ${failCount} 张（${errorMessages[0]}）`
              uni.showToast({ title: tip, icon: 'none', duration: 3500 })
            } else {
              const tip = errorMessages[0] || '图片上传失败'
              uni.showToast({ title: tip, icon: 'none', duration: 3500 })
            }
          } catch (e) {
            uni.hideLoading()
            console.error('上传图片集异常', e)
            uni.showToast({
              title: (e && (e.message || e.errMsg)) || '上传图片集异常',
              icon: 'none',
              duration: 3000
            })
          }
        }
      })
    },
    removeMultiImage(index) {
      this.imageList.splice(index, 1)
      this.syncImagesToForm()
    },
    handleImageClick(index) {
      if (this.isDragging) return
      this.previewMultiImage(index)
    },
    previewMultiImage(index) {
      if (!this.imageList || this.imageList.length === 0) return
      const fullUrls = this.imageList.map(img => this.formatUrl(img)).filter(Boolean)
      if (fullUrls.length === 0) return
      uni.previewImage({
        urls: fullUrls,
        current: fullUrls[index] || fullUrls[0]
      })
    },
    onDragStart(e, index) {
      this.dragIndex = index
      this.dragOverIndex = null
      this.isDragging = true
      const dt = e.dataTransfer || (e.detail && e.detail.dataTransfer)
      if (dt) {
        dt.effectAllowed = 'move'
        try {
          dt.setData('text/plain', String(index))
        } catch (err) {}
}
    },
    onDragOver(e, index) {
      if (e) {
        if (e.preventDefault) e.preventDefault()
        if (e.stopPropagation) e.stopPropagation()
      }
      const dt = e.dataTransfer || (e.detail && e.detail.dataTransfer)
      if (dt) {
        dt.dropEffect = 'move'
      }
      if (this.dragIndex !== null && this.dragIndex !== index && this.dragOverIndex !== index) {
        this.dragOverIndex = index
      }
      return false
    },
    onDragEnter(e, index) {
      if (e) {
        if (e.preventDefault) e.preventDefault()
        if (e.stopPropagation) e.stopPropagation()
      }
      if (this.dragIndex !== null && this.dragIndex !== index && this.dragOverIndex !== index) {
        this.dragOverIndex = index
}
    },
    onDrop(e, targetIndex) {
      if (e) {
        if (e.preventDefault) e.preventDefault()
        if (e.stopPropagation) e.stopPropagation()
      }
      let sourceIndex = this.dragIndex
      const dt = e.dataTransfer || (e.detail && e.detail.dataTransfer)
      if (dt) {
        try {
          const raw = dt.getData('text/plain')
          if (raw !== '' && raw !== null && raw !== undefined) {
            const parsed = parseInt(raw, 10)
            if (!isNaN(parsed)) {
              sourceIndex = parsed
            }
          }
        } catch (err) {}
      }
      if (sourceIndex !== null && !isNaN(sourceIndex) && sourceIndex !== targetIndex) {
        const item = this.imageList.splice(sourceIndex, 1)[0]
        this.imageList.splice(targetIndex, 0, item)
        this.syncImagesToForm()
      }
      this.onDragEnd()
      return false
    },
    onDragEnd(e) {
      if (e && e.preventDefault) e.preventDefault()
      if (this.touchMoveRaf && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.touchMoveRaf)
        this.touchMoveRaf = null
      }
      this.dragIndex = null
      this.dragOverIndex = null
      this.isDragging = false
    },
    onTouchStart(e, index) {
      this.touchStartIndex = index
      this.dragIndex = index
      this.isDragging = true
    },
    onTouchMove(e) {
      const touch = e.touches && e.touches[0]
      if (!touch || typeof document === 'undefined') return
      const clientX = touch.clientX
      const clientY = touch.clientY

      if (this.touchMoveRaf) return
      this.touchMoveRaf = (typeof requestAnimationFrame !== 'undefined')
        ? requestAnimationFrame(() => {
            this.touchMoveRaf = null
            const el = document.elementFromPoint(clientX, clientY)
            if (el) {
              const itemEl = el.closest ? el.closest('[data-drag-index]') : null
              if (itemEl) {
                const targetIndex = parseInt(itemEl.getAttribute('data-drag-index'))
                if (!isNaN(targetIndex) && targetIndex !== this.dragIndex) {
                  if (this.dragOverIndex !== targetIndex) {
                    this.dragOverIndex = targetIndex
                  }
                } else if (this.dragOverIndex !== null) {
                  this.dragOverIndex = null
                }
              }
            }
          })
        : null
    },
    onTouchEnd(e) {
      if (this.touchMoveRaf && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.touchMoveRaf)
        this.touchMoveRaf = null
      }
      const touch = e.changedTouches && e.changedTouches[0]
      if (touch && typeof document !== 'undefined') {
        const el = document.elementFromPoint(touch.clientX, touch.clientY)
        if (el) {
          const itemEl = el.closest ? el.closest('[data-drag-index]') : null
          if (itemEl) {
            const targetIndex = parseInt(itemEl.getAttribute('data-drag-index'))
            if (!isNaN(targetIndex) && this.touchStartIndex !== null && targetIndex !== this.touchStartIndex) {
              const item = this.imageList.splice(this.touchStartIndex, 1)[0]
              this.imageList.splice(targetIndex, 0, item)
              this.syncImagesToForm()
            }
          }
        }
      }
      this.touchStartIndex = null
      this.dragIndex = null
      this.dragOverIndex = null
      this.isDragging = false
    },
    syncImagesToForm() {
      this.form.images = this.imageList.length > 0 ? JSON.stringify(this.imageList) : ''
    },
    async handleSubmit() {
      if (!this.form.name) {
        uni.showToast({ title: '请输入商品名称', icon: 'none' })
        return
      }
      if (!this.form.categoryId) {
        uni.showToast({ title: '请选择商品分类', icon: 'none' })
        return
      }
      if (!this.form.price) {
        uni.showToast({ title: '请输入商品价格', icon: 'none' })
        return
      }

      this.syncImagesToForm()
      this.syncTagsToForm()

      try {
        if (this.id) {
          this.form.id = this.id
          await api.updateProduct(this.form)
        } else {
          await api.addProduct(this.form)
        }
        uni.$emit('refreshProductList')
        uni.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => {
          uni.navigateBack()
        }, 1000)
      } catch (e) {
        console.error(e)
}
    },
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped>
.product-edit-page {
  padding: 20rpx;
  padding-bottom: 160rpx;
  box-sizing: border-box;
  overscroll-behavior: none;
  overscroll-behavior-x: none;
  touch-action: pan-y;
}

.form-section {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
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

.form-picker {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  font-size: 28rpx;
  line-height: 80rpx;
  box-sizing: border-box;
  color: #333;
}

.tag-select-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 8rpx;
}

.tag-select-chip {
  display: flex;
  align-items: center;
  padding: 10rpx 20rpx;
  background: #f5f5f5;
  border: 1rpx solid #e0e0e0;
  border-radius: 32rpx;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.tag-select-chip.active {
  background: #e6f7ff;
  border-color: #1890ff;
  color: #1890ff;
}

.tag-chip-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 8rpx;
  border-radius: 4rpx;
}

.tag-chip-name {
  font-size: 26rpx;
  color: #333;
}

.tag-select-chip.active .tag-chip-name {
  color: #1890ff;
  font-weight: 500;
}

.empty-tag-tip {
  padding: 16rpx;
  background: #fafafa;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #999;
}

.label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.label-row .form-label {
  margin-bottom: 0;
}

.form-tip {
  font-size: 24rpx;
  color: #999;
}

.image-upload-wrap {
  display: flex;
  align-items: center;
}

.images-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.images-grid.is-dragging .image-item {
  transition: none !important;
}

.images-grid.is-dragging .image-item .preview-image,
.images-grid.is-dragging .image-item .item-badge,
.images-grid.is-dragging .image-item .drag-tag,
.images-grid.is-dragging .image-item .delete-icon {
  pointer-events: none;
}

.image-item {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  border-radius: 8rpx;
  overflow: hidden;
  box-sizing: border-box;
  border: 1rpx solid #e8e8e8;
}

.image-item.single-image {
  cursor: default;
}

.image-item:active {
  cursor: grabbing;
}

.image-item.dragging {
  opacity: 0.35;
  outline: 4rpx dashed #1890ff;
  outline-offset: -4rpx;
  background: #e6f7ff;
}

.image-item.drag-over {
  outline: 4rpx solid #1890ff;
  outline-offset: -4rpx;
  box-shadow: 0 0 16rpx rgba(24, 144, 255, 0.7);
}

.image-item.drag-over::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(24, 144, 255, 0.22);
  pointer-events: none;
  z-index: 5;
}

.item-badge {
  position: absolute;
  top: 0;
  left: 0;
  padding: 2rpx 10rpx;
  font-size: 20rpx;
  line-height: 28rpx;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  border-top-left-radius: 8rpx;
  border-bottom-right-radius: 8rpx;
  z-index: 2;
  pointer-events: none;
}

.item-badge.main-badge {
  background: #fa8c16;
  font-weight: 500;
}

.drag-handle-dots {
  margin-right: 4rpx;
  font-weight: bold;
  font-size: 20rpx;
}

.preview-image {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
  border: 1rpx solid #eee;
  box-sizing: border-box;
  -webkit-user-drag: none;
  user-drag: none;
}

.preview-image :deep(img),
.preview-image :deep(div) {
  -webkit-user-drag: none !important;
  user-drag: none !important;
  -webkit-user-select: none !important;
  user-select: none !important;
}

.delete-icon {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 36rpx;
  height: 36rpx;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  border-radius: 50%;
  font-size: 24rpx;
  line-height: 32rpx;
  text-align: center;
  z-index: 6;
  cursor: pointer;
}

.drag-tag {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 32rpx;
  line-height: 32rpx;
  font-size: 18rpx;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  text-align: center;
  border-bottom-left-radius: 8rpx;
  border-bottom-right-radius: 8rpx;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
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
  box-sizing: border-box;
}

.plus-icon {
  font-size: 44rpx;
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
}

.switch-item {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  border: 1rpx solid #ddd;
  font-size: 28rpx;
  color: #999;
}

.switch-item:first-child {
  border-radius: 8rpx 0 0 8rpx;
}

.switch-item:last-child {
  border-radius: 0 8rpx 8rpx 0;
  border-left: none;
}

.switch-item.active {
  background: #1890ff;
  border-color: #1890ff;
  color: #fff;
}

.form-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  padding: 20rpx;
  background: #fff;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.08);
  z-index: 999;
  box-sizing: border-box;
}

.action-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  border-radius: 8rpx;
  font-size: 32rpx;
}

.action-btn.cancel {
  background: #f5f5f5;
  color: #666;
  margin-right: 20rpx;
}

.action-btn.submit {
  background: #1890ff;
  color: #fff;
}
</style>
