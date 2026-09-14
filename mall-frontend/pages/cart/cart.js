/**购物车页：需登录后进入，支持勾选、增减、删除、结算 */
const cart = require('../../utils/cart')
const guard = require('../../utils/guard')
const order = require('../../utils/order')
const util = require('../../utils/util')
const auth = require('../../utils/auth')
const modalMixin = require('../../utils/modal-mixin')
const { KEYS } = require('../../utils/keys')

Page(Object.assign({}, modalMixin, {
  data: {
    cartList: [],
    allChecked: false,
    totalPrice: '0.00',
    totalCount: 0,
    editing: false
  },

  onShow() {
    // 先同步 TabBar 选中态：即使未登录被拦截，导航签也要保持选中
    this.syncTabBar()

    // 刚从登录页返回：本次 onShow 不再重复拦截（用户放弃登录也停留本页，不做任何跳转）
    if (guard.consumeLeavingFlag()) return

    // 未登录拦截（TabBar 拦截 + 缓存失效兜底）
    if (!auth.isLogin()) {
      guard.redirectToLogin({
        redirect: '/pages/cart/cart',
        onConfirm: () => guard.markLeavingForLogin()
      })
      return
    }
    this.refreshCart()
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
    const { totalPrice, totalCount } = cart.calcChecked(cartList)
    this.setData({
      cartList,
      totalPrice: util.formatPrice(totalPrice),
      totalCount,
      allChecked: cartList.length > 0 && cartList.every((item) => item.checked)
    })
    this.updateTabBadge()
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
  onMinus(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.cartList.find((g) => g.id === id)
    if (!item) return
    if (item.count <= 1) {
      util.toast('数量不能再少了')
      return
    }
    this.applyList(cart.updateCount(id, item.count - 1))
  },

  /** 数量加 */
  onPlus(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.cartList.find((g) => g.id === id)
    if (!item) return
    this.applyList(cart.updateCount(id, item.count + 1))
  },

  /** 删除单项 */
  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '提示',
      content: '确定要删除这件商品吗？',
      confirmColor: '#ff5000',
      success: (res) => {
        if (res.confirm) {
          this.applyList(cart.removeGoods(id))
          util.toast('已删除')
        }
      }
    })
  },

  /** 统一更新列表与合计 */
  applyList(cartList) {
    const { totalPrice, totalCount } = cart.calcChecked(cartList)
    this.setData({
      cartList,
      totalPrice: util.formatPrice(totalPrice),
      totalCount,
      allChecked: cartList.length > 0 && cartList.every((item) => item.checked)
    })
    this.updateTabBadge()
  },

  /** 切换编辑模式 */
  onToggleEdit() {
    this.setData({ editing: !this.data.editing })
  },

  /** 去结算 / 下单 */
  onCheckout() {
    const checked = this.data.cartList.filter((item) => item.checked)
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
  },

  /** 去逛逛 */
  goShopping() {
    wx.switchTab({ url: '/pages/index/index' })
  }
}))
