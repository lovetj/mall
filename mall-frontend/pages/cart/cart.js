/**购物车页：需登录后进入，支持勾选、增减、删除、结算 */
const cart = require('../../utils/cart')
const guard = require('../../utils/guard')
const order = require('../../utils/order')
const util = require('../../utils/util')
const auth = require('../../utils/auth')
const modalMixin = require('../../utils/modal-mixin')
const { KEYS } = require('../../utils/keys')
const api = require('../../utils/api')

Page(Object.assign({}, modalMixin, {
  data: {
    cartList: [],
    validList: [],
    offShelfList: [],
    allChecked: false,
    totalPrice: '0.00',
    totalCount: 0,
    editing: false
  },

  onShow() {
    this.syncTabBar()

    const app = getApp()
    if (app && app.globalData.tabRefreshFlags && app.globalData.tabRefreshFlags.cart) {
      app.globalData.tabRefreshFlags.cart = false
    }

    const isLogin = auth.isLogin()
    const leaving = guard.consumeLeavingFlag()

    if (!isLogin) {
      this.setData({
        cartList: [],
        validList: [],
        offShelfList: [],
        allChecked: false,
        totalPrice: '0.00',
        totalCount: 0
      })
      this.syncTabBar()
      // 未登录：非登录返回场景则拦截去登录；登录返回后放弃登录则停留本页展示空状态
      if (!leaving) {
        guard.redirectToLogin({
          redirect: '/pages/cart/cart',
          onConfirm: () => guard.markLeavingForLogin()
        })
      }
      return
    }

    // 已登录：同步远端购物车并刷新数据与角标
    this.refreshCartData()
  },

  /** 下拉刷新 */
  onPullDownRefresh() {
    this.refreshCartData().catch(() => {}).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  /** 供全局或登录成功后主动刷新购物车数据 */
  refreshCartData() {
    if (!auth.isLogin()) {
      this.setData({
        cartList: [],
        validList: [],
        offShelfList: [],
        allChecked: false,
        totalPrice: '0.00',
        totalCount: 0
      })
      this.syncTabBar()
      return Promise.resolve()
    }
    return cart.syncFromRemote().then(() => {
      this.refreshCart()
    }).catch(() => {
      this.refreshCart()
    })
  },

  /** 同步自定义 TabBar 的选中态与购物车角标 */
  syncTabBar() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
      this.getTabBar().setCartCount(cart.getCartCount())
    }
  },

  /** 刷新购物车数据与合计 */
  refreshCart() {
    const cartList = cart.getCart()
    this.applyList(cartList)
  },

  /** 更新自定义 TabBar 购物车角标 */
  updateTabBadge() {
    const count = cart.getCartCount()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setCartCount(count)
    }
  },

  /** 单项勾选 */
  onToggleCheck(e) {
    const id = e.currentTarget.dataset.id
    const cartList = cart.toggleChecked(id)
    this.applyList(cartList)
  },

  /** 全选 / 取消全选 */
  onToggleAll() {
    const cartList = cart.toggleAll(!this.data.allChecked)
    this.applyList(cartList)
  },

  /** 数量减 */
  async onMinus(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.cartList.find((g) => g.id === id)
    if (!item) return
    if (item.count <= 1) {
      util.toast('数量不能再少了')
      return
    }
    if (this._updatingCount) return
    this._updatingCount = true
    try {
      const updatedList = await cart.updateCount(id, item.count - 1, item.tierId)
      this.applyList(updatedList)
    } catch (err) {
      // 接口调用失败时保持原数量不刷新，错误提示已由 request 统一弹出
    } finally {
      this._updatingCount = false
    }
  },

  /** 数量加 */
  async onPlus(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.cartList.find((g) => g.id === id)
    if (!item) return
    if (this._updatingCount) return
    this._updatingCount = true
    try {
      const updatedList = await cart.updateCount(id, item.count + 1, item.tierId)
      this.applyList(updatedList)
    } catch (err) {
      // 接口调用失败时保持原数量不刷新，错误提示已由 request 统一弹出
    } finally {
      this._updatingCount = false
    }
  },

  /** 删除单项（有效商品或下架商品） */
  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '提示',
      content: '确定要删除这件商品吗？',
      confirmColor: '#ff5000',
      success: (res) => {
        if (res.confirm) {
          Promise.resolve(cart.removeGoods(id)).then(() => {
            this.refreshCartData()
          })
          this.applyList(cart.getCart())
          util.toast('已删除')
        }
      }
    })
  },

  /** 清空已下架失效商品 */
  onClearOffShelf() {
    if (!this.data.offShelfList || this.data.offShelfList.length === 0) return
    wx.showModal({
      title: '提示',
      content: '确定清空所有已下架失效商品吗？',
      confirmColor: '#ff5000',
      success: (res) => {
        if (res.confirm) {
          Promise.resolve(cart.clearOffShelf()).then(() => {
            this.refreshCartData()
          })
          this.applyList(cart.getCart())
          util.toast('已清空失效商品')
        }
      }
    })
  },

  /** 统一更新列表与合计 */
  applyList(cartList) {
    const validList = (cartList || []).filter((item) => item.status !== 0)
    const offShelfList = (cartList || []).filter((item) => item.status === 0)
    const { totalPrice, totalCount } = cart.calcChecked(validList)
    this.setData({
      cartList,
      validList,
      offShelfList,
      totalPrice: util.formatPrice(totalPrice),
      totalCount,
      allChecked: validList.length > 0 && validList.every((item) => item.checked)
    })
    this.updateTabBadge()
  },

  /** 切换编辑模式 */
  onToggleEdit() {
    this.setData({ editing: !this.data.editing })
  },

  /** 去结算 / 下单 */
  onCheckout() {
    const checked = (this.data.validList || []).filter((item) => item.checked)
    if (!checked.length) {
      util.toast('请先选择商品')
      return
    }
    // 已登录（页面已拦截），直接下单
    const address = wx.getStorageSync(KEYS.ADDRESS) || null
    if (!address) {
      wx.showModal({
        title: '提示',
        content: '还没有收货地址，是否先去添加？',
        confirmText: '去添加',
        confirmColor: '#ff5000',
        success: (res) => {
          if (res.confirm) wx.navigateTo({ url: '/pages/address/address' })
        }
      })
      return
    }

    // 尝试调用后端创建订单接口
    const defaultAddress = wx.getStorageSync(KEYS.ADDRESS)
    const cartItemIds = checked.map((item) => item.id).filter(Boolean)
    const checkoutData = {
      cartItemIds,
      addressId: (defaultAddress && defaultAddress.id) || null,
      remark: '小程序下单'
    }

    api.checkoutOrder(checkoutData).then((orderVO) => {
      cart.removeChecked()
      this.refreshCart()
      wx.showModal({
        title: '下单成功',
        content: `订单号：${orderVO.orderNo || orderVO.id}\n实付：¥${util.formatPrice(orderVO.totalAmount || this.data.totalPrice)}`,
        showCancel: false,
        confirmText: '查看订单',
        confirmColor: '#ff5000',
        success: () => {
          wx.navigateTo({ url: '/pages/orders/orders?status=unpaid' })
        }
      })
    }).catch(() => {
      // 降级使用本地订单管理
      const orderInfo = order.createOrder(checked, 'unpaid')
      cart.removeChecked()
      this.refreshCart()
      wx.showModal({
        title: '下单成功',
        content: `订单号：${orderInfo.id}\n实付：¥${util.formatPrice(orderInfo.totalPrice)}`,
        showCancel: false,
        confirmText: '查看订单',
        confirmColor: '#ff5000',
        success: () => {
          wx.navigateTo({ url: '/pages/orders/orders?status=unpaid' })
        }
      })
    })
  },

  /** 去逛逛 */
  goShopping() {
    wx.switchTab({ url: '/pages/index/index' })
  }
}))
