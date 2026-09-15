<template>
  <view class="user-list-page">
    <!-- 顶部固定区域：搜索与筛选 -->
    <view class="header-section">
      <view class="search-bar">
        <view class="status-picker-wrap">
          <picker :value="statusIndex" :range="statusOptions" range-key="label" @change="onStatusChange">
            <view class="status-picker">
              <text class="picker-text">{{ statusOptions[statusIndex]?.label || '全部状态' }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
        <input
          class="search-input"
          v-model="keyword"
          placeholder="搜索昵称、用户名或手机号"
          @input="onSearchInput"
        />
        <view class="add-btn" @click="handleAdd">添加用户</view>
      </view>

      <view class="batch-bar" v-if="userList.length > 0">
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

    <!-- 中间滚动区域 -->
    <scroll-view
      scroll-y
      class="user-scroll-view"
      :enhanced="true"
      :show-scrollbar="true"
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      refresher-background="#f5f5f5"
      @refresherrefresh="onRefresh"
      @refresherrestore="onRestore"
    >
      <!-- 加载提示 -->
      <view class="loading-bar" v-if="loading && !isRefreshing">
        <view class="loading-spinner"></view>
        <text class="loading-text">正在加载用户数据...</text>
      </view>

      <!-- 用户列表 -->
      <view class="user-list" v-if="userList.length > 0">
        <view
          class="user-item"
          v-for="item in userList"
          :key="item.id"
          @click="toggleSelect(item.id)"
        >
          <view class="checkbox" :class="{ checked: isSelected(item.id) }" @click.stop="toggleSelect(item.id)">
            <text class="checkbox-icon" v-if="isSelected(item.id)">✓</text>
          </view>

          <!-- 用户头像展示 -->
          <view class="icon-wrap" @click.stop="item.avatar ? previewImage(item.avatar) : null">
            <image
              class="user-img"
              v-if="item.avatar"
              :src="formatUrl(item.avatar)"
              mode="aspectFill"
            ></image>
            <view class="user-char" v-else>
              {{ item.nickname ? item.nickname.substring(0, 1) : (item.username ? item.username.substring(0, 1) : '用') }}
            </view>
          </view>

          <!-- 用户主要信息：展示昵称、用户名和状态 -->
          <view class="user-info">
            <view class="title-row">
              <text class="user-nickname">{{ item.nickname || item.username || '未设置昵称' }}</text>
              <text class="user-username" v-if="item.username">{{ item.username }}</text>
              <text class="user-status-badge" :class="{ 'status-off': item.status === 0 }">
                {{ item.status === 1 ? '正常' : '禁用' }}
              </text>
            </view>
          </view>

          <!-- 快捷操作按钮 -->
          <view class="user-actions" @click.stop>
            <view class="action-btn edit" @click="handleEdit(item)">编辑</view>
            <view
              class="action-btn status-btn online"
              v-if="item.status === 0"
              @click="handleToggleStatus(item, 1)"
            >启用</view>
            <view
              class="action-btn status-btn offline"
              v-if="item.status === 1"
              @click="handleToggleStatus(item, 0)"
            >禁用</view>
            <view class="action-btn delete" @click="handleDelete(item.id)">删除</view>
          </view>
        </view>
      </view>

      <view class="empty-wrap" v-else-if="!loading">
        <text class="empty-text">暂无用户数据</text>
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
      userList: [],
      selectedIds: [],
      statusOptions: [
        { value: null, label: '全部状态' },
        { value: 1, label: '正常' },
        { value: 0, label: '禁用' }
      ],
      statusIndex: 0,
      selectedStatus: null,
      batchActions: [
        { key: 'enable', label: '批量启用' },
        { key: 'disable', label: '批量禁用' },
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
      return this.userList.length > 0 && this.userList.every(item => this.selectedIds.includes(item.id))
}
    },
  async onLoad() {
    this.loadUsers()

    uni.$on('refreshUserList', () => {
      this.loadUsers()
    })
  },
  onShow() {
    this.loadUsers()
  },
  beforeUnmount() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
    }
    uni.$off('refreshUserList')
  },
  methods: {
    handleAdd() {
      uni.navigateTo({
        url: '/pages/user/edit'
      })
    },
    handleEdit(item) {
      uni.navigateTo({
        url: `/pages/user/edit?id=${item.id}`
      })
    },

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
    onSearchInput() {
      if (this.searchTimer) {
        clearTimeout(this.searchTimer)
      }
      this.searchTimer = setTimeout(() => {
        this.pageNum = 1
        this.loadUsers()
      }, 300)
    },
    async onRefresh() {
      this.isRefreshing = true
      this.pageNum = 1
      try {
        await this.loadUsers()
      } finally {
        this.isRefreshing = false
}
    },
    onRestore() {
      this.isRefreshing = false
    },
    onStatusChange(e) {
      const idx = Number(e.detail.value)
      this.statusIndex = idx
      this.selectedStatus = this.statusOptions[idx]?.value ?? null
      this.pageNum = 1
      this.loadUsers()
    },
    onPageSizeChange(e) {
      const idx = Number(e.detail.value)
      this.pageSizeIndex = idx
      this.pageSize = this.pageSizeOptions[idx].value
      this.pageNum = 1
      this.loadUsers()
    },
    async loadUsers() {
      this.loading = true
      try {
        const res = await api.getUserPage({
          pageNum: this.pageNum,
          pageSize: this.pageSize,
          keyword: this.keyword || undefined,
          status: this.selectedStatus !== null ? this.selectedStatus : undefined
        })
        this.userList = res?.records || []
        this.total = res?.total || 0
        this.totalPages = res?.pages || Math.ceil(this.total / this.pageSize) || 1
      } catch (e) {
        console.error('加载用户列表失败', e)
      } finally {
        this.loading = false
}
    },
    prevPage() {
      if (this.pageNum > 1) {
        this.pageNum--
        this.loadUsers()
}
    },
    nextPage() {
      if (this.pageNum < this.totalPages) {
        this.pageNum++
        this.loadUsers()
}
    },
    isSelected(id) {
      return this.selectedIds.includes(id)
    },
    toggleSelect(id) {
      const idx = this.selectedIds.indexOf(id)
      if (idx > -1) {
        this.selectedIds.splice(idx, 1)
      } else {
        this.selectedIds.push(id)
}
    },
    toggleSelectAll() {
      if (this.isAllSelected) {
        this.selectedIds = []
      } else {
        this.selectedIds = this.userList.map(item => item.id)
}
    },
    clearSelection() {
      this.selectedIds = []
    },
    onBatchActionChange(e) {
      const idx = Number(e.detail.value)
      const action = this.batchActions[idx]?.key
      if (!action) return
      if (this.selectedIds.length === 0) {
        uni.showToast({ title: '请先勾选需要操作的用户', icon: 'none' })
        return
      }
      if (action === 'enable') {
        this.handleBatchStatus(1)
      } else if (action === 'disable') {
        this.handleBatchStatus(0)
      } else if (action === 'delete') {
        this.handleBatchDelete()
}
    },
    handleToggleStatus(item, targetStatus) {
      const statusText = targetStatus === 1 ? '启用' : '禁用'
      const displayName = item.nickname || item.username || '用户'
      uni.showModal({
        title: '提示',
        content: `确定${statusText}用户【${displayName}】吗?`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await api.updateUserStatus(item.id, targetStatus)
              uni.showToast({ title: `${statusText}成功`, icon: 'success' })
              this.loadUsers()
            } catch (e) {
              console.error(e)
            }
          }
        }
      })
    },
    handleBatchStatus(targetStatus) {
      const statusText = targetStatus === 1 ? '启用' : '禁用'
      const count = this.selectedIds.length
      uni.showModal({
        title: '提示',
        content: `确定批量${statusText}选中的 ${count} 个用户吗?`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await api.batchUpdateUserStatus(this.selectedIds, targetStatus)
              uni.showToast({ title: `批量${statusText}成功`, icon: 'success' })
              this.loadUsers()
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
        content: '确定删除该用户吗?',
        success: async (res) => {
          if (res.confirm) {
            try {
              await api.deleteUser(id)
              uni.showToast({ title: '删除成功', icon: 'success' })
              this.selectedIds = this.selectedIds.filter(item => item !== id)
              if (this.userList.length === 1 && this.pageNum > 1) {
                this.pageNum--
              }
              this.loadUsers()
            } catch (e) {
              console.error(e)
            }
          }
        }
      })
    },
    handleBatchDelete() {
      const deleteCount = this.selectedIds.length
      uni.showModal({
        title: '提示',
        content: `确定删除选中的 ${deleteCount} 个用户吗?`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await api.batchDeleteUser(this.selectedIds)
              uni.showToast({ title: '批量删除成功', icon: 'success' })
              this.selectedIds = []
              if (this.userList.length <= deleteCount && this.pageNum > 1) {
                this.pageNum--
              }
              this.loadUsers()
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
.user-list-page {
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

.status-picker-wrap {
  margin-right: 16rpx;
  flex-shrink: 0;
}

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

.user-scroll-view {
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

.user-list {
  padding: 0 20rpx;
  box-sizing: border-box;
}

.user-item {
  position: relative;
  display: flex;
  align-items: center;
  background: #fff;
  height: 192rpx;
  padding: 0 20rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
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
  flex-shrink: 0;
  background: #fff;
  transition: all 0.2s;
}

.checkbox.checked {
  background: #1890ff;
  border-color: #1890ff;
}

.checkbox-icon {
  color: #fff;
  font-size: 24rpx;
  font-weight: bold;
}

.icon-wrap {
  width: 100rpx;
  height: 100rpx;
  margin-right: 18rpx;
  flex-shrink: 0;
  cursor: pointer;
}

.user-img {
  width: 100rpx;
  height: 100rpx;
  border-radius: 10rpx;
  background: #f0f0f0;
}

.user-char {
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, #1890ff, #36cfc9);
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: #fff;
  font-weight: bold;
}

.user-info {
  flex: 1;
  min-width: 0;
  height: 100rpx;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding-top: 4rpx;
  box-sizing: border-box;
}

.title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
}

.user-nickname {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
  max-width: 240rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-username {
  font-size: 22rpx;
  color: #666;
  font-family: monospace, -apple-system, sans-serif;
  background: #f5f5f5;
  padding: 2rpx 10rpx;
  border-radius: 4rpx;
  border: 1rpx solid #e8e8e8;
  max-width: 200rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-status-badge {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  background: #f6ffed;
  color: #52c41a;
  border: 1rpx solid #b7eb8f;
  flex-shrink: 0;
}

.user-status-badge.status-off {
  background: #f5f5f5;
  color: #999;
  border-color: #d9d9d9;
}

.user-actions {
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

.action-btn.delete {
  background: #fff1f0;
  color: #ff4d4f;
  border: 1rpx solid #ffa39e;
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
