/**
 * 我的订单页：子页签（全部 / 待付款 / 待发货 / 待收货 / 已完成）
 * 支持点击查看订单详情、待付款订单立即支付（微信/Mock支付）、确认收货等功能
 */
const order = require('../../utils/order')
const auth = require('../../utils/auth')
const guard = require('../../utils/guard')
const util = require('../../utils/util')
const api = require('../../utils/api')
const pay = require('../../utils/pay')
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
    currentTabIndex: 0,
    orders: [],
    loading: false,
    detailVisible: false,
    loadingDetail: false,
    currentDetail: null
  },

  onLoad(options) {
    const status = options && options.status ? options.status : ''
    const currentTabIndex = this.getTabIndex(status)
    this.setData({
      currentTab: status,
      currentTabIndex
    })
  },

  getTabIndex(tabKey) {
    const index = this.data.tabs.findIndex((t) => t.key === tabKey)
    return index >= 0 ? index : 0
  },

  onShow() {
    if (!auth.isLogin()) {
      guard.redirectToLogin({ redirect: '/pages/orders/orders' })
      return
    }
    this.loadOrders()
  },

  /** 映射状态参数到后端的 status 数字 (0待付款/1待发货/2待收货/3已完成/4已取消) */
  getStatusNum(tab) {
    switch (tab) {
      case 'unpaid': return 0
      case 'undelivered': return 1
      case 'unreceived': return 2
      case 'done': return 3
      default: return undefined
    }
  },

  loadOrders() {
    this.setData({ loading: true })
    const statusNum = this.getStatusNum(this.data.currentTab)
    const params = { pageNum: 1, pageSize: 50 }
    if (statusNum !== undefined) {
      params.status = statusNum
    }

    api.getOrderList(params).then((res) => {
      this.setData({ loading: false })
      const pageData = res || {}
      const list = pageData.list || pageData.records || []
      if (Array.isArray(list) && list.length > 0) {
        const formatted = list.map((item) => {
          const rawItems = item.items || item.goods || []
          const goods = rawItems.map((prod) => ({
            id: prod.id,
            productId: prod.productId,
            name: prod.productName || prod.name || '商品',
            tierName: prod.tierName || '',
            image: formatImageUrl(prod.productImage || prod.image),
            price: util.formatPrice(prod.price),
            count: prod.quantity || prod.count || 1,
            amount: util.formatPrice(prod.amount || (Number(prod.price) * (prod.quantity || 1)))
          }))
          const totalCount = goods.reduce((sum, g) => sum + (Number(g.count) || 1), 0)
          const payAmountVal = item.payAmount !== undefined ? item.payAmount : (item.totalAmount || item.totalPrice)
          return {
            id: item.orderNo || item.id,
            rawId: item.id,
            rawStatus: item.status,
            status: this.mapStatusToKey(item.status),
            statusText: this.mapStatusToText(item.status),
            createTime: item.createTime || '',
            payTime: item.payTime || '',
            shipTime: item.shipTime || '',
            receiveTime: item.receiveTime || '',
            receiverName: item.receiverName || '',
            receiverPhone: item.receiverPhone || '',
            receiverAddress: item.receiverAddress || '',
            remark: item.remark || '',
            productTotal: util.formatPrice(item.productTotal || payAmountVal),
            freightAmount: util.formatPrice(item.freightAmount || 0),
            payType: item.payType,
            payTypeText: this.mapPayTypeText(item.payType, item.status),
            totalCount: totalCount || 1,
            totalPrice: payAmountVal,
            totalPriceText: util.formatPrice(payAmountVal),
            goods: goods.length > 0 ? goods : (item.productImage ? [{
              name: item.productName || '商品',
              tierName: item.tierName || '',
              image: formatImageUrl(item.productImage),
              price: util.formatPrice(payAmountVal),
              count: 1,
              amount: util.formatPrice(payAmountVal)
            }] : [])
          }
        })
        this.setData({ orders: formatted })
      } else {
        this.fallbackLocalOrders()
      }
    }).catch(() => {
      this.setData({ loading: false })
      this.fallbackLocalOrders()
    })
  },

  mapStatusToKey(status) {
    if (status === 0) return 'unpaid'
    if (status === 1) return 'undelivered'
    if (status === 2) return 'unreceived'
    if (status === 3) return 'done'
    if (status === 4) return 'canceled'
    return ''
  },

  mapStatusToText(status) {
    if (status === 0) return '待付款'
    if (status === 1) return '待发货'
    if (status === 2) return '待收货'
    if (status === 3) return '已完成'
    if (status === 4) return '已取消'
    return '已完成'
  },

  mapPayTypeText(payType, status) {
    if (status === 0 || payType === null || payType === undefined) {
      return '未支付'
    }
    if (payType === 1) return '微信支付'
    if (payType === 2) return '支付宝'
    return '在线支付'
  },

  fallbackLocalOrders() {
    const list = order.getOrdersByStatus(this.data.currentTab).map((item) => ({
      ...item,
      rawId: item.id,
      rawStatus: item.status === 'unpaid' ? 0 : (item.status === 'undelivered' ? 1 : (item.status === 'unreceived' ? 2 : 3)),
      productTotal: util.formatPrice(item.totalPrice),
      freightAmount: '0.00',
      totalPriceText: util.formatPrice(item.totalPrice)
    }))
    this.setData({ orders: list })
  },

  /** 切换子页签 */
  onSwitchTab(e) {
    const key = e.currentTarget.dataset.key
    const index = Number(e.currentTarget.dataset.index)
    const tabIndex = !isNaN(index) ? index : this.getTabIndex(key)
    if (key === this.data.currentTab) return
    this.setData({
      currentTab: key,
      currentTabIndex: tabIndex
    }, () => this.loadOrders())
  },

  /** 点击订单卡片查看详情 */
  onViewDetail(e) {
    const rawId = e.currentTarget.dataset.rawid || e.currentTarget.dataset.id
    if (!rawId) return

    // 优先从已加载列表中匹配基本信息
    const cached = this.data.orders.find((o) => o.rawId === rawId || o.id === rawId)
    if (cached) {
      this.setData({
        detailVisible: true,
        currentDetail: cached,
        loadingDetail: true
      })
    } else {
      this.setData({
        detailVisible: true,
        loadingDetail: true
      })
    }

    // 从后端获取最新完整订单详情
    api.getOrderDetail(rawId).then((vo) => {
      this.setData({ loadingDetail: false })
      if (!vo) return
      const rawItems = vo.items || []
      const goods = rawItems.map((prod) => ({
        id: prod.id,
        productId: prod.productId,
        name: prod.productName || prod.name || '商品',
        tierName: prod.tierName || '',
        image: formatImageUrl(prod.productImage || prod.image),
        price: util.formatPrice(prod.price),
        count: prod.quantity || prod.count || 1,
        amount: util.formatPrice(prod.amount || (Number(prod.price) * (prod.quantity || 1)))
      }))
      const totalCount = goods.reduce((sum, g) => sum + (Number(g.count) || 1), 0)
      const payAmountVal = vo.payAmount !== undefined ? vo.payAmount : (vo.totalAmount || 0)
      const detail = {
        id: vo.orderNo || vo.id,
        rawId: vo.id,
        rawStatus: vo.status,
        status: this.mapStatusToKey(vo.status),
        statusText: this.mapStatusToText(vo.status),
        createTime: vo.createTime || '',
        payTime: vo.payTime || '',
        shipTime: vo.shipTime || '',
        receiveTime: vo.receiveTime || '',
        receiverName: vo.receiverName || '',
        receiverPhone: vo.receiverPhone || '',
        receiverAddress: vo.receiverAddress || '',
        remark: vo.remark || '',
        productTotal: util.formatPrice(vo.productTotal || payAmountVal),
        freightAmount: util.formatPrice(vo.freightAmount || 0),
        payType: vo.payType,
        payTypeText: this.mapPayTypeText(vo.payType, vo.status),
        totalCount: totalCount || 1,
        totalPrice: payAmountVal,
        totalPriceText: util.formatPrice(payAmountVal),
        goods
      }
      this.setData({ currentDetail: detail })
    }).catch(() => {
      this.setData({ loadingDetail: false })
    })
  },

  /** 关闭订单详情弹层 */
  onCloseDetail() {
    this.setData({ detailVisible: false })
  },

  /** 复制订单号 */
  onCopyOrderNo(e) {
    const no = e.currentTarget.dataset.no || (this.data.currentDetail && this.data.currentDetail.id)
    if (!no) return
    wx.setClipboardData({
      data: String(no),
      success: () => {
        util.toast('订单号已复制', 'success')
      }
    })
  },

  /** 待付款 -> 在线支付（支持选择微信支付/支付宝支付） */
  onPay(e) {
    const rawId = e.currentTarget.dataset.rawid || e.currentTarget.dataset.id
    const orderItem = this.data.orders.find((o) => o.rawId === rawId || o.id === rawId) || this.data.currentDetail

    if (!orderItem || !orderItem.rawId) {
      util.toast('订单数据异常')
      return
    }

    wx.showActionSheet({
      itemList: ['微信支付 (推荐)', '支付宝支付'],
      success: (actionRes) => {
        const payType = actionRes.tapIndex === 1 ? 2 : 1
        pay.requestPay({
          orderId: orderItem.rawId,
          orderNo: orderItem.id,
          payAmount: orderItem.totalPrice,
          payType
        }).then((res) => {
          if (res && res.success) {
            // 关闭详情弹窗并刷新订单列表
            this.setData({ detailVisible: false })
            this.loadOrders()
          }
        })
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
        this.setData({ detailVisible: false })
        this.loadOrders()
      }
    })
  },

  /** 去逛逛 */
  goShopping() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
