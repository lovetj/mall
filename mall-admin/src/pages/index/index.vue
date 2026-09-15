<template>
  <view class="admin-index">
    <view class="admin-header">
      <text class="welcome">欢迎，{{ adminInfo.realName || adminInfo.username }}</text>
      <text class="logout" @click="handleLogout">退出</text>
    </view>

    <view class="menu-grid">
      <view class="menu-item" @click="goTo('/pages/product/list')">
        <view class="menu-icon" style="background: #1890ff;">商</view>
        <text class="menu-text">商品管理</text>
      </view>
      <view class="menu-item" @click="goTo('/pages/category/list')">
        <view class="menu-icon" style="background: #52c41a;">类</view>
        <text class="menu-text">分类管理</text>
      </view>
      <view class="menu-item" @click="goTo('/pages/tag/list')">
        <view class="menu-icon" style="background: #fa541c;">标</view>
        <text class="menu-text">商品标签管理</text>
      </view>
      <view class="menu-item" @click="goTo('/pages/banner/list')">
        <view class="menu-icon" style="background: #722ed1;">播</view>
        <text class="menu-text">轮播图管理</text>
      </view>
      <view class="menu-item" @click="goTo('/pages/order/list')">
        <view class="menu-icon" style="background: #fa8c16;">单</view>
        <text class="menu-text">订单管理</text>
      </view>
      <view class="menu-item" @click="goTo('/pages/user/list')">
        <view class="menu-icon" style="background: #eb2f96;">用</view>
        <text class="menu-text">用户管理</text>
      </view>
      <view class="menu-item" @click="goTo('/pages/config/config')">
        <view class="menu-icon" style="background: #13c2c2;">置</view>
        <text class="menu-text">系统配置</text>
      </view>
    </view>

    <view class="stats-section">
      <view class="section-title">数据统计</view>
      <view class="stats-grid">
        <view class="stats-item">
          <text class="stats-value">{{ stats.productCount }}</text>
          <text class="stats-label">商品数量</text>
        </view>
        <view class="stats-item">
          <text class="stats-value">{{ stats.categoryCount }}</text>
          <text class="stats-label">分类数量</text>
        </view>
        <view class="stats-item">
          <text class="stats-value">{{ stats.tagCount }}</text>
          <text class="stats-label">标签数量</text>
        </view>
        <view class="stats-item">
          <text class="stats-value">{{ stats.bannerCount }}</text>
          <text class="stats-label">轮播图数量</text>
        </view>
        <view class="stats-item">
          <text class="stats-value">{{ stats.orderCount }}</text>
          <text class="stats-label">订单数量</text>
        </view>
        <view class="stats-item">
          <text class="stats-value">{{ stats.userCount }}</text>
          <text class="stats-label">用户数量</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import api from '../../api/index'

export default {
  data() {
    return {
      adminInfo: {},
      stats: {
        productCount: 0,
        categoryCount: 0,
        tagCount: 0,
        bannerCount: 0,
        orderCount: 0,
        userCount: 0
      }
    }
  },
  onLoad() {
    this.adminInfo = uni.getStorageSync('admin_info') || {}
  },
  onShow() {
    const token = uni.getStorageSync('admin_token')
    if (!token) {
      uni.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.adminInfo = uni.getStorageSync('admin_info') || {}
    this.loadStats()
  },
  methods: {
    async loadStats() {
      try {
        const [productData, categoryData, tagData, bannerData, orderData, userData] = await Promise.all([
          api.getProductPage({ pageNum: 1, pageSize: 1 }),
          api.getCategoryPage({ pageNum: 1, pageSize: 1 }),
          api.getTagPage({ pageNum: 1, pageSize: 1 }),
          api.getBannerPage({ pageNum: 1, pageSize: 1 }),
          api.getOrderPage({ pageNum: 1, pageSize: 1 }),
          api.getUserPage({ pageNum: 1, pageSize: 1 })
        ])
        this.stats.productCount = productData?.total || 0
        this.stats.categoryCount = categoryData?.total || 0
        this.stats.tagCount = tagData?.total || 0
        this.stats.bannerCount = bannerData?.total || 0
        this.stats.orderCount = orderData?.total || 0
        this.stats.userCount = userData?.total || 0
      } catch (e) {
        console.error(e)
      }
    },
    goTo(url) {
      uni.navigateTo({ url })
    },
    handleLogout() {
      uni.showModal({
        title: '提示',
        content: '确定退出登录吗?',
        success: (res) => {
          if (res.confirm) {
            uni.removeStorageSync('admin_token')
            uni.removeStorageSync('admin_info')
            uni.reLaunch({ url: '/pages/login/login' })
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.admin-index {
  padding: 20rpx;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.welcome {
  font-size: 32rpx;
  color: #333;
}

.logout {
  font-size: 28rpx;
  color: #ff4d4f;
}

.menu-grid {
  display: flex;
  flex-wrap: wrap;
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.menu-item {
  width: 33.33%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 0;
}

.menu-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: #fff;
  margin-bottom: 16rpx;
}

.menu-text {
  font-size: 28rpx;
  color: #333;
}

.stats-section {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.stats-grid {
  display: flex;
}

.stats-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  border-right: 1rpx solid #f0f0f0;
}

.stats-item:last-child {
  border-right: none;
}

.stats-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #1890ff;
  display: block;
  margin-bottom: 8rpx;
}

.stats-label {
  font-size: 24rpx;
  color: #999;
  white-space: nowrap;
}
</style>
