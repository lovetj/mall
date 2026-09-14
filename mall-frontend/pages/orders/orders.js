/**我的订单页：子页签（全部 / 待付款 / 待发货 / 待收货 / 已完成） */
const order = require('../../utils/order')
const auth = require('../../utils/auth')
const guard = require('../../utils/guard')
const util = require('../../utils/util')
const api = require('../../utils/api')
const { formatImageUrl } = require('../../utils/config')

Page({
  data: {
    tabs: [
      { key: '', name: '全部' },
      { key: 'unpaid', name: '待付款' },
      { key: 'undelivered', name: '待发货' },
      { key: 'unreceived', name: '待收货' },
      { key: 'done', name: '已完成' }
    ],
    currentTab: '',
    orders: []
  },

  onLoad(options) {
    const status = options && options.status ? options.status : ''
    this.setData({ currentTab: status })
  },

  onShow() {
    // 未登录拦截（正常入口已登录，这里做兜底）
    if (!auth.isLogin()) {
      guard.redirectToLogin({ redirect: '/pages/cart/cart' })
      return
    }
    this.loadOrders()
  },

  /** 映射状态参数到后端的 status 数字 (1待付款/2待发货/3已发货待收货/4已完成/5已取消) */
  getStatusNum(tab) {
    switch (tab) {
      case 'unpaid': return 1
      case 'undelivered': return 2
      case 'unreceived': return 3
      case 'done': return 4
      default: return undefined
    }
  },

  loadOrders() {
    const statusNum = this.getStatusNum(this.data.currentTab)
    const params = { pageNum: 1, pageSize: 50 }
    if (statusNum !== undefined) {
      params.status = statusNum
    }

    api.getOrderList(params).then((res) => {
      const pageData = res || {}
      const list = pageData.list || pageData.records || []
      if (Array.isArray(list) && list.length > 0) {
        const formatted = list.map((item) => {
          const items = (item.items || []).map((prod) => ({
            ...prod,
            image: formatImageUrl(prod.productImage || prod.image)
          }))
          return {
            id: item.orderNo || item.id,
            rawId: item.id,
            status: this.mapStatusToKey(item.status),
            statusText: this.mapStatusToText(item.status),
            totalPrice: item.totalAmount || item.totalPrice,
            totalPriceText: util.formatPrice(item.totalAmount || item.totalPrice),
            items: items.length > 0 ? items : (item.productImage ? [{
              name: item.productName || '商品',
              image: formatImageUrl(item.productImage),
              price: item.totalAmount || item.price,
              count: 1
            }] : [])
          }
        })
        this.setData({ orders: formatted })
      } else {
        this.fallbackLocalOrders()
      }
    }).catch(() => {
      this.fallbackLocalOrders()
    })
  },

  mapStatusToKey(status) {
    if (status === 1) return 'unpaid'
    if (status === 2) return 'undelivered'
    if (status === 3) return 'unreceived'
    if (status === 4) return 'done'
    return ''
  },

  mapStatusToText(status) {
    if (status === 1) return '待付款'
    if (status === 2) return '待发货'
    if (status === 3) return '待收货'
    if (status === 4) return '已完成'
    if (status === 5) return '已取消'
    return '已完成'
  },

  fallbackLocalOrders() {
    const list = order.getOrdersByStatus(this.data.currentTab).map((item) => ({
      ...item,
      totalPriceText: util.formatPrice(item.totalPrice)
    }))
    this.setData({ orders: list })
  },

  /** 切换子页签 */
  onSwitchTab(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.currentTab) return
    this.setData({ currentTab: key }, () => this.loadOrders())
  },

  /** 待付款 -> 模拟付款 */
  onPay(e) {
    const id = e.currentTarget.dataset.id
    const currentOrder = this.data.orders.find((o) => o.id === id)
    wx.showModal({
      title: '模拟支付',
      content: '确认支付该订单？',
      confirmColor: '#ff5000',
      success: (res) => {
        if (!res.confirm) return
        if (currentOrder && currentOrder.rawId) {
          // 调用后端创建支付与 mock 支付接口
          api.createPayment({
            orderId: currentOrder.rawId,
            payType: 1
          }).then((payResp) => {
            if (payResp && payResp.paymentNo) {
              return api.mockPaySuccess(payResp.paymentNo)
            }
          }).then(() => {
            util.toast('支付成功', 'success')
            this.loadOrders()
          }).catch(() => {
            // 失败时走本地更新逻辑
            order.updateOrderStatus(id, 'undelivered')
            util.toast('支付成功', 'success')
            this.loadOrders()
          })
        } else {
          order.updateOrderStatus(id, 'undelivered')
          util.toast('支付成功', 'success')
          this.loadOrders()
        }
      }
    })
  },

  /** 待收货 -> 确认收货 */
  onConfirm(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认收货',
      content: '确认已经收到商品？',
      confirmColor: '#ff5000',
      success: (res) => {
        if (!res.confirm) return
        order.updateOrderStatus(id, 'done')
        util.toast('已确认收货', 'success')
        this.loadOrders()
      }
    })
  },

  /** 去逛逛 */
  goShopping() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
