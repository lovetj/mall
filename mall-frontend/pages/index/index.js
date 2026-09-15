/**首页：搜索框 + 轮播图 + 热销商品 */
const cart = require('../../utils/cart')
const guard = require('../../utils/guard')
const modalMixin = require('../../utils/modal-mixin')
const api = require('../../utils/api')
const { formatImageUrl } = require('../../utils/config')

Page(Object.assign({}, modalMixin, {
  data: {
    banners: [],
    // 当前按下的轮播图下标（-1 表示无），用于点击/按压动画
    activeBanner: -1,
    categories: [],
    hotGoods: [],
    cartCount: 0,
    // 热销商品分页状态
    pageNum: 1,
    pageSize: 4,
    total: 0,
    hasMore: true,
    loadingMore: false,
    noMore: false
  },

  onLoad() {
    this.loadBanners()
    this.loadCategories()
    this.loadHotGoods(true)
  },

  /** 下拉刷新：重新加载轮播图、分类、热销商品 */
  onPullDownRefresh() {
    Promise.all([
      this.loadBanners(),
      this.loadCategories(),
      this.loadHotGoods(true)
    ]).catch(() => {}).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  /**
   * 加载轮播图
   * 接口失败 / 返回空数组 / 有效图片为空时，降级为 3 条无图片的占位轮播
   */
  loadBanners() {
    api.getBannerList().then((res) => {
      const list = Array.isArray(res) ? res : []
      const banners = list.map((item) => ({
        ...item,
        image: formatImageUrl(item.image)
      }))
      this.setData({ banners: this.normalizeBanners(banners) })
    }).catch(() => {
      this.setData({ banners: this.buildPlaceholderBanners() })
    })
  },

  /** 无图片的占位轮播（默认 3 条） */
  buildPlaceholderBanners() {
    const count = 3
    const banners = []
    for (let i = 0; i < count; i++) {
      banners.push({ id: `placeholder-${i}`, image: '', title: '', link: '' })
    }
    return banners
  },

  /** 轮播图兜底：数据为空或全部无有效图片时，替换为占位轮播 */
  normalizeBanners(banners) {
    const list = banners || []
    if (list.length === 0) return this.buildPlaceholderBanners()

    const hasValidImage = list.some((item) => {
      const image = item && item.image
      return typeof image === 'string' ? image.trim() !== '' : !!image
    })
    if (hasValidImage) return list

    // 保持接口条数（最多 3 条）展示无图片轮播
    if (list.length >= 3) {
      return list.map((item) => ({ ...item, image: '' }))
    }

    const placeholders = this.buildPlaceholderBanners()
    return list.map((item, index) => ({ ...placeholders[index], ...item, image: '' }))
  },

  /** 按下轮播图：可跳转时才触发按压动画 */
  onBannerTouchStart(e) {
    const index = e.currentTarget.dataset.index
    const banner = this.data.banners[index]
    if (!banner || !(banner.link || '').trim()) return
    this.setData({ activeBanner: index })
  },

  /** 松开/取消：恢复正常状态 */
  onBannerTouchEnd() {
    if (this.data.activeBanner !== -1) {
      this.setData({ activeBanner: -1 })
    }
  },

  /**
   * 点击轮播图：按 link 字段跳转（link 为空则不跳转）
   * link 为 http(s) 链接时用 web-view 承载，否则按站内页面路径跳转
   * 跳转前先收回按压动画，避免动画被页面切换打断
   */
  onBannerTap(e) {
    const banner = this.data.banners[e.currentTarget.dataset.index]
    const link = banner && (banner.link || '').trim()
    if (!link) return

    this.setData({ activeBanner: -1 })

    const url = /^https?:\/\//.test(link)
      ? `/pages/webview/webview?url=${encodeURIComponent(link)}`
      : (link.charAt(0) === '/' ? link : `/${link}`)

    // 留出 150ms 让回弹动画播完再跳转
    setTimeout(() => {
      wx.navigateTo({ url })
    }, 150)
  },

  /**
   * 加载商品分类
   * 接口失败 / 返回空数组 / 名称为空字符串时，清空分类并展示「暂无数据」空态
   */
  loadCategories() {
    return api.getCategoryList().then((res) => {
      const list = Array.isArray(res) ? res : []
      const categories = list
        .filter((c) => c && typeof c.name === 'string' && c.name.trim() !== '')
        .map((c) => ({
          id: c.id,
          name: c.name,
          icon: formatImageUrl(c.icon)
        }))
      this.setData({ categories: categories.length > 0 ? categories : [] })
    }).catch(() => {
      this.setData({ categories: [] })
    })
  },

  /** 点击分类：跳转分类页并定位到该分类 */
  onCategoryTap(e) {
    const item = this.data.categories[e.currentTarget.dataset.index]
    if (!item) return
    wx.switchTab({
      url: '/pages/category/category',
      success: () => {
        // 等切换完成后再取页面实例，否则可能还停留在首页
        const pages = getCurrentPages()
        const page = pages[pages.length - 1]
        if (page && page.route === 'pages/category/category' && typeof page.selectCategory === 'function') {
          page.selectCategory(item)
        }
      }
    })
  },

  /**
   * 加载热销商品分页数据：调用 /product/hotselling/page
   * @param {boolean} reset 是否重置（首次加载或下拉刷新）
   */
  loadHotGoods(reset = false) {
    if (reset) {
      this.setData({
        pageNum: 1,
        hasMore: true,
        noMore: false,
        loadingMore: false
      })
    }

    const pageSize = this.data.pageSize || 6
    const pageNum = reset ? 1 : (this.data.pageNum || 1)

    return api.getHotsellingPage({
      status: 1,
      pageNum,
      pageSize
    }).then((res) => {
      const records = (res && Array.isArray(res.records))
        ? res.records
        : (Array.isArray(res) ? res : [])

      const formatted = records.map((item) => ({
        ...item,
        image: formatImageUrl(item.image)
      }))

      let hotGoods = []
      let total = 0
      let pages = 1

      if (res && typeof res.total === 'number') {
        total = res.total
        pages = typeof res.pages === 'number' ? res.pages : Math.ceil(total / pageSize)
      } else {
        total = formatted.length
        pages = Math.ceil(total / pageSize)
      }

      if (reset) {
        hotGoods = formatted
      } else {
        hotGoods = (this.data.hotGoods || []).concat(formatted)
      }

      // 接口返回为空时不再降级 mock，直接展示「暂无数据」空态
      if (hotGoods.length === 0 && reset) {
        this.setData({
          hotGoods: [],
          pageNum: 1,
          total: 0,
          hasMore: false,
          noMore: true,
          loadingMore: false
        })
        return
      }

      const hasMore = pageNum < pages && hotGoods.length < total && formatted.length >= pageSize
      const noMore = !hasMore

      this.setData({
        hotGoods,
        pageNum,
        total,
        hasMore,
        noMore,
        loadingMore: false
      })
    }).catch(() => {
      // 接口异常：首次加载时清空列表展示「暂无数据」，加载更多时保留已有数据
      if (reset) {
        this.setData({
          hotGoods: [],
          pageNum: 1,
          total: 0,
          hasMore: false,
          noMore: true,
          loadingMore: false
        })
      } else {
        this.setData({
          loadingMore: false
        })
      }
    })
  },

  /**
   * 上拉/触底加载更多热销商品
   */
  loadMoreHotGoods() {
    if (this.data.loadingMore || !this.data.hasMore || this.data.noMore) {
      return
    }

    const nextPage = (this.data.pageNum || 1) + 1
    const pageSize = this.data.pageSize || 6

    this.setData({ loadingMore: true })

    return api.getHotsellingPage({
      status: 1,
      pageNum: nextPage,
      pageSize
    }).then((res) => {
      const records = (res && Array.isArray(res.records))
        ? res.records
        : (Array.isArray(res) ? res : [])

      const formatted = records.map((item) => ({
        ...item,
        image: formatImageUrl(item.image)
      }))

      const hotGoods = (this.data.hotGoods || []).concat(formatted)
      const total = (res && typeof res.total === 'number') ? res.total : hotGoods.length
      const pages = (res && typeof res.pages === 'number') ? res.pages : Math.ceil(total / pageSize)

      const hasMore = nextPage < pages && hotGoods.length < total && formatted.length >= pageSize
      const noMore = !hasMore

      this.setData({
        hotGoods,
        pageNum: nextPage,
        total,
        hasMore,
        noMore,
        loadingMore: false
      })
    }).catch(() => {
      this.setData({ loadingMore: false })
      wx.showToast({ title: '加载失败，请重试', icon: 'none' })
    })
  },

  /**
   * 页面触底（向上拉刷新加载更多）
   */
  onReachBottom() {
    this.loadMoreHotGoods()
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

  /** 点击商品卡片：跳转商品详情页 */
  onGoodsTap(e) {
    const goods = e && e.detail && e.detail.goods
    if (!goods || !goods.id) return
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${goods.id}`
    })
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
  },

  /** 点击热销商品「查看更多」：跳转分类页并定位到「热销商品」页签 */
  goHotCategory() {
    wx.switchTab({
      url: '/pages/category/category',
      success: () => {
        const pages = getCurrentPages()
        const page = pages[pages.length - 1]
        if (page && page.route === 'pages/category/category' && typeof page.selectCategory === 'function') {
          page.selectCategory({ id: 'hot', name: '热销商品' })
        }
      }
    })
  }
}))
