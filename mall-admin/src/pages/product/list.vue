<template>
  <view class="product-list-page">
    <!-- 顶部固定区域：搜索与批量操作 -->
    <view class="header-section">
      <view class="search-bar">
        <view class="category-picker-wrap">
          <picker :value="categoryIndex" :range="categoryOptions" range-key="name" @change="onCategoryChange">
            <view class="category-picker">
              <text class="picker-text">{{ categoryOptions[categoryIndex]?.name || '全部分类' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
        <view class="status-picker-wrap">
          <picker :value="statusIndex" :range="statusOptions" range-key="label" @change="onStatusChange">
            <view class="status-picker">
              <text class="picker-text">{{ statusOptions[statusIndex]?.label || '全部状态' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
        <input class="search-input" v-model="keyword" placeholder="搜索商品名称" @input="onSearchInput" />
        <view class="add-btn" @click="handleAdd">添加商品</view>
      </view>

      <view class="batch-bar" v-if="productList.length > 0">
        <view class="select-all" @click="toggleSelectAll">
          <view class="checkbox" :class="{ checked: isAllSelected }">
            <text class="checkbox-icon" v-if="isAllSelected">✓</text>
          </view>
          <text class="select-all-text">{{ isAllSelected ? '取消全选' : '全选' }}</text>
        </view>
        <view class="batch-actions">
          <view class="clear-selection-btn" v-if="selectedIds.length > 0" @click="clearSelection">取消选择</view>
          <text class="selected-count" v-if="selectedIds.length > 0">已选 {{ selectedIds.length }} 项</text>
          <picker :range="batchActions" range-key="label" @change="onBatchActionChange">
            <view class="batch-picker-btn" :class="{ disabled: selectedIds.length === 0 }">
              <text class="batch-picker-text">批量操作</text>
              <text class="batch-picker-arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>
    </view>

    <!-- 中间独立滚动区域：支持下拉刷新与独立滚动 -->
    <scroll-view
      scroll-y
      class="product-scroll-view"
      :enhanced="true"
      :show-scrollbar="true"
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      refresher-background="#f5f5f5"
      @refresherrefresh="onRefresh"
      @refresherrestore="onRestore"
    >
      <!-- 加载动画条 -->
      <view class="loading-bar" v-if="loading && !isRefreshing">
        <view class="loading-spinner"></view>
        <text class="loading-text">正在加载商品数据...</text>
      </view>

      <view class="product-list" v-if="productList.length > 0">
        <view class="product-item" v-for="item in productList" :key="item.id" @click="toggleSelect(item.id)">
          <view class="checkbox" :class="{ checked: isSelected(item.id) }" @click.stop="toggleSelect(item.id)">
            <text class="checkbox-icon" v-if="isSelected(item.id)">✓</text>
          </view>
          <image
            class="product-image"
            :src="formatUrl(item.image) || '/static/images/default.png'"
            mode="aspectFill"
            @click.stop="handlePreviewImage(item.image)"
          ></image>
          <view class="product-info">
            <view class="product-title-row">
              <text class="product-name">{{ item.name }}</text>
              <text class="product-status" :class="{ 'status-off': item.status === 0 }">
                {{ item.status === 1 ? '上架' : '下架' }}
              </text>
            </view>
            <text class="product-category">{{ item.categoryName }}</text>
            <view class="product-meta">
              <text class="product-price">¥{{ item.price }} 起/{{ item.unit }}</text>
            </view>
          </view>
          <view class="product-actions" @click.stop>
            <view class="action-btn edit" @click="handleEdit(item)">编辑</view>
            <view class="action-btn delete" @click="handleDelete(item.id)">删除</view>
            <view class="action-btn status-btn online" v-if="item.status === 0" @click="handleToggleStatus(item, 1)">上架</view>
            <view class="action-btn status-btn offline" v-if="item.status === 1" @click="handleToggleStatus(item, 0)">下架</view>
          </view>
        </view>
      </view>

      <view class="empty-wrap" v-else-if="!loading">
        <text class="empty-text">暂无商品数据</text>
      </view>
    </scroll-view>

    <!-- 底部固定分页区域 -->
    <view class="footer-section">
      <view class="pagination-left">
        <text class="total-text">共 {{ total }} 条数据</text>
        <picker :value="pageSizeIndex" :range="pageSizeOptions" range-key="label" @change="onPageSizeChange">
          <view class="page-size-picker">
            <text class="picker-text">{{ pageSizeOptions[pageSizeIndex]?.label || '10条/页' }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      <view class="pagination-right">
        <view class="page-btn" @click="prevPage" :class="{ disabled: pageNum === 1 || total === 0 }">上一页</view>
        <text class="page-info">{{ pageNum }} / {{ totalPages }}</text>
        <view class="page-btn" @click="nextPage" :class="{ disabled: pageNum >= totalPages || total === 0 }">下一页</view>
      </view>
    </view>
  </view>
</template>

<script>
import api from '../../api/index'
import { formatImageUrl } from '../../utils/request'

export default {
  data() {
    return {
      productList: [],
      selectedIds: [],
      categoryOptions: [{ id: null, name: '全部分类' }],
      categoryIndex: 0,
      selectedCategoryId: null,
      statusOptions: [
        { value: null, label: '全部状态' },
        { value: 1, label: '上架' },
        { value: 0, label: '下架' }
      ],
      statusIndex: 0,
      selectedStatus: null,
      batchActions: [
        { key: 'online', label: '批量上架' },
        { key: 'offline', label: '批量下架' },
        { key: 'delete', label: '批量删除' }
      ],
      keyword: '',
      searchTimer: null,
      loading: false,
      isRefreshing: false,
      pageNum: 1,
      pageSize: 10,
      pageSizeOptions: [
        { value: 10, label: '10条/页' },
        { value: 20, label: '20条/页' },
        { value: 50, label: '50条/页' },
        { value: 100, label: '100条/页' }
      ],
      pageSizeIndex: 0,
      total: 0,
      totalPages: 1
    }
  },
  computed: {
    isAllSelected() {
      return this.productList.length > 0 && this.productList.every(item => this.selectedIds.includes(item.id))
    }
  },
  async onLoad() {
    await this.loadCategories()
    this.loadProducts()

    uni.$on('refreshProductList', () => {
      this.loadProducts()
    })
  },
  onShow() {
    this.loadProducts()
  },
  beforeUnmount() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
    }
    uni.$off('refreshProductList')
  },
  methods: {
    handleAdd() {
      uni.navigateTo({
        url: '/pages/product/edit'
      })
    },
    handleEdit(item) {
      uni.navigateTo({
        url: `/pages/product/edit?id=${item.id}`
      })
    },
    formatUrl(path) {
      return formatImageUrl(path)
    },
    handlePreviewImage(imagePath) {
      const currentUrl = this.formatUrl(imagePath)
      if (!currentUrl) return
      const urls = this.productList
        .map(item => this.formatUrl(item.image))
        .filter(url => Boolean(url))
      uni.previewImage({
        current: currentUrl,
        urls: urls.length > 0 ? urls : [currentUrl]
      })
    },
    onSearchInput() {
      if (this.searchTimer) {
        clearTimeout(this.searchTimer)
      }
      this.searchTimer = setTimeout(() => {
        this.pageNum = 1
        this.loadProducts()
      }, 300)
    },
    async onRefresh() {
      this.isRefreshing = true
      this.pageNum = 1
      try {
        await Promise.all([this.loadCategories(), this.loadProducts()])
      } finally {
        this.isRefreshing = false
      }
    },
    onRestore() {
      this.isRefreshing = false
    },
    async loadCategories() {
      try {
        const data = await api.getCategoryList()
        const rawList = data || []
        this.categoryOptions = [{ id: null, name: '全部分类' }, ...rawList]
      } catch (e) {
        console.error(e)
      }
    },
    onCategoryChange(e) {
      const idx = Number(e.detail.value)
      this.categoryIndex = idx
      this.selectedCategoryId = this.categoryOptions[idx]?.id || null
      this.pageNum = 1
      this.loadProducts()
    },
    onStatusChange(e) {
      const idx = Number(e.detail.value)
      this.statusIndex = idx
      this.selectedStatus = this.statusOptions[idx]?.value ?? null
      this.pageNum = 1
      this.loadProducts()
    },
    onPageSizeChange(e) {
      const idx = Number(e.detail.value)
      this.pageSizeIndex = idx
      this.pageSize = this.pageSizeOptions[idx].value
      this.pageNum = 1
      this.loadProducts()
    },
    async loadProducts() {
      this.loading = true
      try {
        const params = {
          pageNum: this.pageNum,
          pageSize: this.pageSize
        }
        if (this.keyword && this.keyword.trim()) {
          params.keyword = this.keyword.trim()
        }
        if (this.selectedCategoryId !== null && this.selectedCategoryId !== undefined) {
          params.categoryId = this.selectedCategoryId
        }
        if (this.selectedStatus !== null && this.selectedStatus !== undefined) {
          params.status = this.selectedStatus
        }

        const data = await api.getProductPage(params)
        this.productList = data?.records || []
        this.total = data?.total || 0
        this.totalPages = Math.max(1, Math.ceil(this.total / this.pageSize))
      } catch (e) {
        console.error(e)
      } finally {
        this.loading = false
      }
    },
    isSelected(id) {
      return this.selectedIds.includes(id)
    },
    toggleSelect(id) {
      const index = this.selectedIds.indexOf(id)
      if (index > -1) {
        this.selectedIds.splice(index, 1)
      } else {
        this.selectedIds.push(id)
      }
    },
    toggleSelectAll() {
      if (this.isAllSelected) {
        const currentIds = this.productList.map(item => item.id)
        this.selectedIds = this.selectedIds.filter(id => !currentIds.includes(id))
      } else {
        const currentIds = this.productList.map(item => item.id)
        this.selectedIds = Array.from(new Set([...this.selectedIds, ...currentIds]))
      }
    },
    clearSelection() {
      this.selectedIds = []
    },
    prevPage() {
      if (this.pageNum > 1) {
        this.pageNum--
        this.loadProducts()
      }
    },
    nextPage() {
      if (this.pageNum < this.totalPages) {
        this.pageNum++
        this.loadProducts()
      }
    },
    handleToggleStatus(item, targetStatus) {
      const statusText = targetStatus === 1 ? '上架' : '下架'
      uni.showModal({
        title: '提示',
        content: `确定${statusText}商品“${item.name}”吗?`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await api.updateProductStatus(item.id, targetStatus)
              uni.showToast({ title: `${statusText}成功`, icon: 'success' })
              this.loadProducts()
            } catch (e) {
              console.error(e)
            }
          }
        }
      })
    },
    onBatchActionChange(e) {
      if (this.selectedIds.length === 0) {
        uni.showToast({ title: '请先选择商品', icon: 'none' })
        return
      }
      const idx = Number(e.detail.value)
      const action = this.batchActions[idx]
      if (!action) return
      if (action.key === 'online') {
        this.handleBatchStatus(1, '上架')
      } else if (action.key === 'offline') {
        this.handleBatchStatus(0, '下架')
      } else if (action.key === 'delete') {
        this.handleBatchDelete()
      }
    },
    handleBatchStatus(targetStatus, statusText) {
      if (this.selectedIds.length === 0) {
        uni.showToast({ title: `请先选择要${statusText}的商品`, icon: 'none' })
        return
      }
      const count = this.selectedIds.length
      uni.showModal({
        title: '提示',
        content: `确定批量${statusText}选中的 ${count} 个商品吗?`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await api.batchUpdateProductStatus(this.selectedIds, targetStatus)
              uni.showToast({ title: `批量${statusText}成功`, icon: 'success' })
              this.loadProducts()
            } catch (e) {
              console.error(e)
            }
          }
        }
      })
    },
    handleDelete(id) {
      uni.showModal({
        title: '提示',
        content: '确定删除该商品吗?',
        success: async (res) => {
          if (res.confirm) {
            try {
              await api.deleteProduct(id)
              uni.showToast({ title: '删除成功', icon: 'success' })
              this.selectedIds = this.selectedIds.filter(item => item !== id)
              if (this.productList.length === 1 && this.pageNum > 1) {
                this.pageNum--
              }
              this.loadProducts()
            } catch (e) {
              console.error(e)
            }
          }
        }
      })
    },
    handleBatchDelete() {
      if (this.selectedIds.length === 0) {
        uni.showToast({ title: '请先选择要删除的商品', icon: 'none' })
        return
      }
      const deleteCount = this.selectedIds.length
      uni.showModal({
        title: '提示',
        content: `确定删除选中的 ${deleteCount} 个商品吗?`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await api.batchDeleteProduct(this.selectedIds)
              uni.showToast({ title: '批量删除成功', icon: 'success' })
              this.selectedIds = []
              if (this.productList.length <= deleteCount && this.pageNum > 1) {
                this.pageNum--
              }
              this.loadProducts()
            } catch (e) {
              console.error(e)
            }
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.product-list-page {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: #f5f5f5;
  overflow: hidden;
}

.header-section {
  padding: 20rpx 20rpx 0 20rpx;
  flex-shrink: 0;
  box-sizing: border-box;
}

.search-bar {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.category-picker-wrap,
.status-picker-wrap {
  margin-right: 16rpx;
  flex-shrink: 0;
}

.category-picker,
.status-picker {
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 16rpx;
  background: #fff;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #333;
  display: flex;
  align-items: center;
  white-space: nowrap;
  box-sizing: border-box;
}

.picker-text {
  max-width: 140rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-arrow {
  font-size: 18rpx;
  color: #999;
  margin-left: 8rpx;
  transform: scale(0.8);
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 72rpx;
  padding: 0 20rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  font-size: 28rpx;
  background: #fff;
  box-sizing: border-box;
}

.add-btn {
  padding: 0 24rpx;
  height: 72rpx;
  line-height: 72rpx;
  margin-left: 16rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  background: #1890ff;
  color: #fff;
  white-space: nowrap;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  padding: 16rpx 20rpx;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}

.select-all {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.select-all-text {
  margin-left: 12rpx;
  color: #333;
  font-size: 26rpx;
}

.batch-actions {
  display: flex;
  align-items: center;
}

.selected-count {
  font-size: 24rpx;
  color: #1890ff;
  margin-right: 16rpx;
}

.clear-selection-btn {
  font-size: 24rpx;
  color: #999;
  padding: 6rpx 14rpx;
  background: #f5f5f5;
  border-radius: 6rpx;
  margin-right: 12rpx;
}

.batch-picker-btn {
  display: flex;
  align-items: center;
  padding: 8rpx 16rpx;
  background: #1890ff;
  color: #fff;
  border-radius: 6rpx;
  font-size: 24rpx;
}

.batch-picker-btn.disabled {
  background: #d9d9d9;
  color: #8c8c8c;
}

.batch-picker-text {
  font-size: 24rpx;
}

.batch-picker-arrow {
  font-size: 16rpx;
  margin-left: 6rpx;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  background: #fff;
  transition: all 0.2s;
  flex-shrink: 0;
}

.checkbox.checked {
  background: #1890ff;
  border-color: #1890ff;
}

.checkbox-icon {
  color: #fff;
  font-size: 24rpx;
  font-weight: bold;
  line-height: 1;
}

.product-scroll-view {
  flex: 1;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
}

.loading-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0;
}

.loading-spinner {
  width: 32rpx;
  height: 32rpx;
  border: 3rpx solid #e8e8e8;
  border-top-color: #1890ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 12rpx;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 24rpx;
  color: #999;
}

.product-list {
  padding: 0 20rpx;
  box-sizing: border-box;
}

.product-item {
  position: relative;
  display: flex;
  align-items: center;
  background: #fff;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
}

.product-item .checkbox {
  align-self: center;
}

.product-image {
  width: 130rpx;
  height: 130rpx;
  border-radius: 10rpx;
  background: #f5f5f5;
  flex-shrink: 0;
  margin-right: 18rpx;
  cursor: pointer;
}

.product-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  padding-right: 180rpx;
}

.product-title-row {
  display: flex;
  align-items: center;
  margin-bottom: 6rpx;
}

.product-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
  margin-right: 12rpx;
  max-width: 320rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-status {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  background: #f6ffed;
  color: #52c41a;
  border: 1rpx solid #b7eb8f;
  flex-shrink: 0;
}

.product-status.status-off {
  background: #f5f5f5;
  color: #999;
  border-color: #d9d9d9;
}

.product-category {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.product-meta {
  display: flex;
  align-items: center;
}

.product-price {
  font-size: 30rpx;
  font-weight: bold;
  color: #ff4d4f;
}

.product-actions {
  position: absolute;
  right: 20rpx;
  bottom: 20rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
}

.action-btn {
  padding: 10rpx 18rpx;
  border-radius: 6rpx;
  font-size: 24rpx;
  cursor: pointer;
  white-space: nowrap;
}

.action-btn.edit {
  background: #e6f7ff;
  color: #1890ff;
  border: 1rpx solid #91d5ff;
}

.action-btn.delete {
  background: #fff1f0;
  color: #ff4d4f;
  border: 1rpx solid #ffa39e;
}

.action-btn.status-btn.online {
  background: #f6ffed;
  color: #52c41a;
  border: 1rpx solid #b7eb8f;
}

.action-btn.status-btn.offline {
  background: #fff7e6;
  color: #fa8c16;
  border: 1rpx solid #ffd591;
}

.empty-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

/* 分页条样式：与分类管理完全一致 */
.footer-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  padding: 16rpx 20rpx;
  border-top: 1rpx solid #e8e8e8;
  flex-shrink: 0;
  box-sizing: border-box;
}

.pagination-left {
  display: flex;
  align-items: center;
}

.total-text {
  font-size: 24rpx;
  color: #666;
  margin-right: 16rpx;
}

.page-size-picker {
  display: flex;
  align-items: center;
  padding: 6rpx 12rpx;
  background: #f5f5f5;
  border-radius: 6rpx;
  font-size: 24rpx;
  color: #333;
}

.pagination-right {
  display: flex;
  align-items: center;
}

.page-btn {
  padding: 8rpx 18rpx;
  background: #f5f5f5;
  border-radius: 6rpx;
  font-size: 24rpx;
  color: #333;
  cursor: pointer;
}

.page-btn.disabled {
  color: #bfbfbf;
  cursor: not-allowed;
  background: #fafafa;
}

.page-info {
  margin: 0 16rpx;
  font-size: 24rpx;
  color: #666;
}
</style>
