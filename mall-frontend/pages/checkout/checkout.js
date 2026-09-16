/**
 * 确认订单页：展示选中的购物车商品、选择收货地址、填写备注并提交订单
 * 商品列表由购物车页通过 app.globalData.checkoutItems 内存传递，提交调用后端 /api/order/checkout(服务端负责校验商品是否删除/下架/库存)
 */
const cart = require('../../utils/cart')
const auth = require('../../utils/auth')
const guard = require('../../utils/guard')
const util = require('../../utils/util')
const api = require('../../utils/api')
const pay = require('../../utils/pay')

Page({
  data: {
    items: [],
    address: null,
    remark: '',
    payType: 1, // 默认 1: 微信支付, 2: 支付宝支付
    totalCount: 0,
    productTotal: '0.00',
    payTotal: '0.00',
    submitting: false,
    canScroll: false
  },

  onLoad() {
    if (!auth.isLogin()) {
      guard.redirectToLogin({ redirect: '/pages/checkout/checkout' })
      return
    }
    this.loadItems()
  },

  onReady() {
    this.checkCanScroll()
  },

  onShow() {
    // 从地址选择页/新增地址页返回时，重新加载地址以反映最新选择
    if (auth.isLogin()) {
      this.loadAddress()
    }
  },

  onUnload() {
    // 离开页面时清除内存中的待结算数据，避免残留
    const app = getApp()
    if (app) {
      app.globalData.checkoutItems = null
      app.globalData.selectedAddress = null
    }
  },

  /** 动态检测内容是否超出可视区域，超出才开启滚动 */
  checkCanScroll() {
    wx.nextTick(() => {
      const query = this.createSelectorQuery()
      query.select('.checkout-scroll').boundingClientRect()
      query.select('.checkout-content').boundingClientRect()
      query.exec((res) => {
        if (res && res[0] && res[1]) {
          const containerHeight = res[0].height || 0
          const contentHeight = res[1].height || 0
          const canScroll = contentHeight > containerHeight + 2
          if (this.data.canScroll !== canScroll) {
            this.setData({ canScroll })
          }
        }
      })
    })
  },

  /** 读取购物车选中的商品（从全局内存中获取） */
  loadItems() {
    const app = getApp()
    const items = (app && app.globalData.checkoutItems) || []
    if (!Array.isArray(items) || items.length === 0) {
      util.toast('没有可结算的商品')
      setTimeout(() => wx.navigateBack(), 600)
      return
    }
    this.setData({ items }, () => {
      this.checkCanScroll()
    })
    this.calcTotal(items)
    this.loadAddress()
  },

  /** 加载收货地址并预选默认地址 */
  loadAddress() {
    const app = getApp()
    const selectedAddress = app && app.globalData.selectedAddress
    api.getAddressList().then((list) => {
      const addresses = Array.isArray(list) ? list : []
      const address =
        (selectedAddress && addresses.find((a) => a.id === selectedAddress.id)) ||
        selectedAddress ||
        addresses.find((a) => a.isDefault === 1) ||
        addresses[0] ||
        null
      this.setData({ address }, () => {
        this.checkCanScroll()
      })
    }).catch(() => {})
  },

  /** 计算商品件数与小计 */
  calcTotal(items) {
    let totalCount = 0
    let productTotal = 0
    items.forEach((it) => {
      totalCount += it.count || 0
      productTotal += (Number(it.price) || 0) * (it.count || 0)
    })
    const fmt = util.formatPrice(productTotal)
    this.setData({
      totalCount,
      productTotal: fmt,
      payTotal: fmt
    })
  },

  /** 选择/去管理收货地址 */
  onSelectAddress() {
    wx.navigateTo({ url: '/pages/address/address?from=checkout' })
  },

  /** 选择支付方式 (1: 微信支付, 2: 支付宝支付) */
  onSelectPayType(e) {
    const payType = Number(e.currentTarget.dataset.type) || 1
    this.setData({ payType })
  },

  /** 备注输入 */
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value || '' })
  },

  /** 提交订单 */
  onSubmit() {
    const { address, items, remark, submitting } = this.data
    if (submitting) return
    if (!address || !address.id) {
      util.toast('请选择收货地址')
      return
    }
    const cartItemIds = items.map((it) => it.id).filter(Boolean)
    if (!cartItemIds.length) {
      util.toast('请选择要结算的商品')
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '校验商品中...' })
    // 提交前逐个校验商品是否已删除/下架，避免把失效商品带进订单
    Promise.all(items.map((it) => cart.checkBuyable({ productId: it.productId || it.id })))
      .then((results) => {
        const failed = results.find((r) => !r.ok)
        if (failed) {
          wx.hideLoading()
          this.setData({ submitting: false })
          util.toast(failed.message)
          // 清除结算数据，稍后返回购物车触发列表刷新
          const app = getApp()
          if (app) app.globalData.checkoutItems = null
          setTimeout(() => wx.navigateBack(), 800)
          return
        }
        this.doSubmit(address, cartItemIds, remark)
      })
      .catch(() => {
        // 校验接口异常时放行，交给后端兜底校验
        this.doSubmit(address, cartItemIds, remark)
      })
  },

  /** 真正提交下单并自动跳转/拉起支付 */
  doSubmit(address, cartItemIds, remark) {
    wx.showLoading({ title: '创建订单中...' })
    api.checkoutOrder({
      cartItemIds,
      addressId: address.id,
      remark: remark || '小程序下单'
    }).then((orderVo) => {
      wx.hideLoading()
      // 下单成功后清除内存下单数据与已勾选购物车
      const app = getApp()
      if (app) app.globalData.checkoutItems = null
      cart.removeChecked()
      this.setData({ submitting: false })

      if (!orderVo || !orderVo.id) {
        util.toast('订单创建异常')
        wx.redirectTo({ url: '/pages/orders/orders?status=unpaid' })
        return
      }

      // 自动拉起/进入在线支付流程 (支持 mock 模拟支付与官方支付分流)
      pay.requestPay({
        orderId: orderVo.id,
        orderNo: orderVo.orderNo,
        payAmount: orderVo.payAmount,
        payType: this.data.payType || 1
      }).then((payResult) => {
        if (payResult && payResult.success) {
          // 支付成功 -> 跳转待发货订单列表
          setTimeout(() => {
            wx.redirectTo({ url: '/pages/orders/orders?status=undelivered' })
          }, 800)
        } else {
          // 未支付或取消 -> 跳转待付款订单列表
          setTimeout(() => {
            wx.redirectTo({ url: '/pages/orders/orders?status=unpaid' })
          }, 600)
        }
      })
    }).catch((err) => {
      wx.hideLoading()
      this.setData({ submitting: false })
      util.toast((err && err.message) || '下单失败，请重试')
    })
  },

  /** 拼接完整收货地址 */
  fullAddress(a) {
    if (!a) return ''
    return [a.province, a.city, a.district, a.detailAddress, a.houseNumber].filter(Boolean).join('')
  }
})