/**分类页：左侧类别 + 右侧商品，免登录可访问 */
const mock = require('../../utils/mock')
const cart = require('../../utils/cart')
const guard = require('../../utils/guard')
const util = require('../../utils/util')
const modalMixin = require('../../utils/modal-mixin')

Page(Object.assign({}, modalMixin, {
  data: {
    categories: [],
    currentId: '',
    currentName: '',
    currentIcon: '',
    goodsList: [],
    keyword: '',
    searchFocus: false
  },

  /**
   * 一次性意图标记：仅"首页点击搜索框跳转进来"时为 true
   * 刻意不放进 data —— 它只是同步的控制标记，不需要参与渲染；
   * 放 data 里会因 setData 异步、且 onShow 先于赋值生效，导致首次跳转读不到标记
   */
  focusOnShow: false,

  onLoad() {
    const categories = mock.categories
    // 默认选中第一项（"全部"）
    const first = categories[0]
    this.setData({
      categories,
      currentId: first.id,
      currentName: first.name,
      currentIcon: first.icon,
      goodsList: mock.getGoodsByCategory(first.id)
    })
  },

  onShow() {
    this.syncTabBar()
    // 标记本页已完成首次可见，供 prepareSearch 判断当前时序阶段
    this.__shown = true
    // 仅当首页点击搜索框跳转过来（focusOnShow 为 true）时才聚焦搜索框，消费一次后立即复位；
    // 其余任何场景（切 Tab、返回本页、从登录页返回等）都不会聚焦
    if (this.focusOnShow) {
      this.focusOnShow = false
      this.focusSearch()
    }
    // 从登录页返回时续做登录前的加购动作
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
      this.getTabBar().setData({ selected: 1 })
      this.getTabBar().setCartCount(count)
    }
  },

  /**
   * 首页点击搜索框跳转进本页时调用
   * 做两件事：重置到「全部」+ 标记本次需要聚焦搜索框
   * 标记与聚焦均用同步方式处理，不依赖"success 回调一定早于 onShow"这一假设：
   * - 若本页还没触发过 onShow（首次进入），标记留给 onShow 消费
   * - 若 onShow 已经跑完（success 回调晚于 onShow），这里直接补一次聚焦
   */
  prepareSearch() {
    const first = this.data.categories[0]
    if (!first) return
    this.resetToAll()
    this.focusOnShow = true
    // 兜底：onShow 若已执行过（success 回调晚于 onShow），这里直接聚焦并清掉标记避免重复
    if (this.__shown) {
      this.focusOnShow = false
      this.focusSearch()
    }
  },

  /** 重置到「全部」分类，并清空搜索关键字 */
  resetToAll() {
    const first = this.data.categories[0]
    if (!first) return
    this.setData({
      currentId: first.id,
      currentName: first.name,
      currentIcon: first.icon,
      goodsList: mock.getGoodsByCategory(first.id),
      keyword: ''
    })
  },

  /**
   * 聚焦搜索框
   * - 先置 false 再置 true，保证连续两次跳转（focus 值未变化）也能重新拉起键盘
   * - 用 wx.nextTick 延后到渲染完成，避免首次进入时 input 尚未挂载导致聚焦失效
   */
  focusSearch() {
    this.setData({ searchFocus: false }, () => {
      wx.nextTick(() => {
        this.setData({ searchFocus: true })
      })
    })
  },

  /** 切换左侧类别 */
  onSelectCategory(e) {
    const { id, name } = e.currentTarget.dataset
    if (id === this.data.currentId) return
    this.setData({
      currentId: id,
      currentName: name,
      goodsList: mock.getGoodsByCategory(id),
      keyword: ''
    })
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  /** 搜索（在全部商品中搜索） */
  onSearch() {
    const keyword = this.data.keyword.trim()
    if (!keyword) {
      this.setData({ goodsList: mock.getGoodsByCategory(this.data.currentId) })
      return
    }
    const result = mock.searchGoods(keyword)
    this.setData({
      goodsList: result,
      currentName: `搜索：${keyword}`
    })
    if (!result.length) util.toast('没有找到相关商品')
  },

  onClearSearch() {
    this.setData({
      keyword: '',
      currentName: this.data.categories.find((c) => c.id === this.data.currentId).name,
      goodsList: mock.getGoodsByCategory(this.data.currentId)
    })
  },

  /** 加入购物车：需要登录 */
  onAddCart(e) {
    const goods = e && e.detail && e.detail.goods
    if (!goods) return
    guard.ensureLogin({
      content: '登录后才能加入购物车，是否前往登录？',
      redirect: '/pages/category/category',
      action: { type: 'addCart', goods },
      success: () => this.doAddCart(goods)
    })
  },

  doAddCart(goods) {
    cart.addToCart(goods, 1)
    wx.showToast({ title: '已加入购物车', icon: 'success' })
  },

  /** 登录成功后回跳本页时自动续做加购 */
  onLoginBack(result) {
    const app = getApp()
    const action = (result && result.type ? result : null) || (app && app.globalData.pendingAction)
    if (app) app.globalData.pendingAction = null
    if (action && action.type === 'addCart' && action.goods) {
      this.doAddCart(action.goods)
    }
  },

  /** 供购物车变更时刷新（本页无购物车展示，保留空实现兼容 saveCart 回调） */
  refreshCart() {},

  onGoodsTap(e) {
    const goods = e && e.detail && e.detail.goods
    if (!goods || !goods.name) return
    util.toast(`${goods.name} ¥${goods.price}`)
  }
}))
