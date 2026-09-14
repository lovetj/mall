/**我的订单页：子页签（全部 / 待付款 / 待发货 / 待收货 / 已完成） */
const order = require('../../utils/order')
const auth = require('../../utils/auth')
const guard = require('../../utils/guard')
const util = require('../../utils/util')

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

  loadOrders() {
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
    wx.showModal({
      title: '模拟支付',
      content: '确认支付该订单？',
      confirmColor: '#ff5000',
      success: (res) => {
        if (!res.confirm) return
        order.updateOrderStatus(id, 'undelivered')
        util.toast('支付成功', 'success')
        this.loadOrders()
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
