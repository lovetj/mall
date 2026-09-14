/**首页：搜索框 + 轮播图 + 热销商品 */
const mock = require('../../utils/mock')
const cart = require('../../utils/cart')
const guard = require('../../utils/guard')
const util = require('../../utils/util')
const modalMixin = require('../../utils/modal-mixin')

Page(Object.assign({}, modalMixin, {
  data: {
    banners: [],
    hotGoods: [],
    cartCount: 0
  },

  onLoad() {
    this.setData({
      banners: mock.banners,
      hotGoods: mock.getHotGoods(8)
    })
  },

  onShow() {
    this.refreshCart()
    this.syncTabBar()
    // 从登录页 switchTab 回来时，续做登录前的加购动作
    const app = getApp()
    const pending = app && app.globalData.pendingAction
    if (pending && pending.type === 'addCart') {
      app.globalData.pendingAction = null
      this.doAddCart(pending.goods)
    }
  },

  /** 同步自定义 TabBar 的选中态与购物车角标 */
  syncTabBar() {
    const count = cart.getCartCount()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
      this.getTabBar().setCartCount(count)
    }
  },

  /** 购物车数量角标 */
  refreshCart() {
    this.setData({ cartCount: cart.getCartCount() })
    this.syncTabBar()
  },

  /**
   * 加入购物车：必须登录
   * 未登录 -> 弹窗 -> 登录页 -> 登录成功返回后自动完成加购
   */
  onAddCart(e) {
    const goods = e && e.detail && e.detail.goods
    if (!goods) return
    guard.ensureLogin({
      content: '登录后才能加入购物车，是否前往登录？',
      redirect: '/pages/index/index',
      action: { type: 'addCart', goods },
      success: () => {
        this.doAddCart(goods)
      }
    })
  },

  /** 执行加购（登录后 / 已登录时调用） */
  doAddCart(goods) {
    cart.addToCart(goods, 1)
    this.refreshCart()
    wx.showToast({ title: '已加入购物车', icon: 'success' })
  },

  /** 登录页回跳时由 login 页调用（跨页回调），自动续做加购 */
  onLoginBack(result) {
    const app = getApp()
    const action = (result && result.type ? result : null) || (app && app.globalData.pendingAction)
    if (app) app.globalData.pendingAction = null
    if (action && action.type === 'addCart' && action.goods) {
      this.doAddCart(action.goods)
    }
    this.refreshCart()
  },

  /** 点击商品卡片 */
  onGoodsTap(e) {
    const goods = e && e.detail && e.detail.goods
    if (!goods || !goods.name) return
    util.toast(`${goods.name} ¥${goods.price}`)
  },

  /** 点击搜索框：跳转分类页（默认「全部」），并让分类页聚焦搜索框 */
  goCategory() {
    wx.switchTab({
      url: '/pages/category/category',
      success: () => {
        const pages = getCurrentPages()
        const page = pages[pages.length - 1]
        if (page && page.route === 'pages/category/category') {
          page.prepareSearch()
        }
      }
    })
  }
}))
