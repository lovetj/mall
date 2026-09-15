<template>
  <view class="order-list-page">
    <view class="order-tabs">
      <view class="tab-item" :class="{ active: activeStatus === -1 }" @click="changeStatus(-1)">全部</view>
      <view class="tab-item" :class="{ active: activeStatus === 0 }" @click="changeStatus(0)">待付款</view>
      <view class="tab-item" :class="{ active: activeStatus === 1 }" @click="changeStatus(1)">待发货</view>
      <view class="tab-item" :class="{ active: activeStatus === 2 }" @click="changeStatus(2)">待收货</view>
    </view>

    <view class="order-list">
      <view class="order-item" v-for="item in orderList" :key="item.id">
        <view class="order-header">
          <text class="order-no">{{ item.orderNo }}</text>
          <text class="order-status" :class="'status-' + item.status">{{ getStatusText(item.status) }}</text>
        </view>
        <view class="order-info">
          <view class="info-row">
            <text class="info-label">收货人:</text>
            <text class="info-value">{{ item.receiverName }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">联系电话:</text>
            <text class="info-value">{{ item.receiverPhone }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">收货地址:</text>
            <text class="info-value">{{ item.receiverAddress }}</text>
          </view>
        </view>
        <view class="order-footer">
          <text class="order-amount">¥{{ item.totalAmount }}</text>
          <text class="order-time">{{ formatDate(item.createTime) }}</text>
        </view>
      </view>
    </view>

    <view class="empty" v-if="orderList.length === 0">
      <text>暂无订单</text>
    </view>
  </view>
</template>

<script>
import api from '../../api/index'

export default {
  data() {
    return {
      orderList: [],
      activeStatus: -1,
      pageNum: 1,
      pageSize: 20
    }
  },
  onLoad() {
    this.loadOrders()
  },
  methods: {
    async loadOrders() {
      try {
        const data = await api.getOrderPage({
          pageNum: this.pageNum,
          pageSize: this.pageSize
        })
        let list = data?.records || []
        if (this.activeStatus > -1) {
          list = list.filter(item => item.status === this.activeStatus)
        }
        this.orderList = list
      } catch (e) {
        console.error(e)
      }
    },
    changeStatus(status) {
      this.activeStatus = status
      this.loadOrders()
    },
    getStatusText(status) {
      const map = { 0: '待付款', 1: '待发货', 2: '待收货', 3: '已完成', 4: '已取消' }
      return map[status] || '未知'
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      return dateStr.substring(0, 16).replace('T', ' ')
    }
  }
}
</script>

<style scoped>
.order-list-page {
  padding: 20rpx;
}

.order-tabs {
  display: flex;
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #666;
}

.tab-item.active {
  color: #1890ff;
  font-weight: bold;
  border-bottom: 4rpx solid #1890ff;
}

.order-list {
  background: #fff;
  border-radius: 12rpx;
}

.order-item {
  padding: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.order-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.order-no {
  font-size: 24rpx;
  color: #999;
}

.order-status {
  font-size: 24rpx;
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
}

.status-0 {
  background: #fff7e6;
  color: #fa8c16;
}

.status-1 {
  background: #e6f7ff;
  color: #1890ff;
}

.status-2 {
  background: #f6ffed;
  color: #52c41a;
}

.status-3 {
  background: #f5f5f5;
  color: #999;
}

.order-info {
  margin-bottom: 16rpx;
}

.info-row {
  display: flex;
  margin-bottom: 8rpx;
}

.info-label {
  font-size: 26rpx;
  color: #999;
  width: 140rpx;
}

.info-value {
  font-size: 26rpx;
  color: #333;
  flex: 1;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-amount {
  font-size: 32rpx;
  color: #ff4d4f;
  font-weight: bold;
}

.order-time {
  font-size: 24rpx;
  color: #999;
}

.empty {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
}
</style>
