/**分类页：左侧类别 + 右侧商品，免登录可访问 */
const cart = require('../../utils/cart')
const guard = require('../../utils/guard')
const modalMixin = require('../../utils/modal-mixin')
const api = require('../../utils/api')
const { formatImageUrl } = require('../../utils/config')

Page(Object.assign({}, modalMixin, {
  data: {
    categories: [],
    currentId: '',
    currentName: '',
    currentIcon: '',
    goodsList: [],
    keyword: '',
    searchFocus: false,
    // 右侧列表 scroll-view 自带下拉刷新状态（页面级下拉刷新在 scroll-view 滚动区不生效）
    refresherTriggered: false,
    // 商品分页状态
    pageNum: 1,
    pageSize: 6,
    total: 0,
    loadingMore: false,
    noMore: false
  },

  /**
   * 一次性意图标记：仅"首页点击搜索框跳转进来"时为 true
   * 刻意不放进 data —— 它只是同步的控制标记，不需要参与渲染；
   * 放 data 里会因 setData 异步、且 onShow 先于赋值生效，导致首次跳转读不到标记
   */
  focusOnShow: false,

  onLoad() {
    this.loadCategories()
  },

  /** 加载分类与首个分类商品（固定前置「全部」「热销商品」两个虚拟分类） */
  loadCategories() {
    return api.getCategoryList().then((res) => {
      const list = res || []
      const categories = [
        { id: 'all', name: '全部', icon: '', centerOnly: true, isImg: false },
        { id: 'hot', name: '热销商品', icon: '🔥', isImg: false },
        ...list.map((c) => {
          const icon = formatImageUrl(c.icon)
          return {
            id: c.id,
            name: c.name,
            icon: icon || '',
            isImg: !!icon,
            imgLoaded: false,
            imgFailed: false
          }
        })
      ]
      const first = categories[0]
      this.setData({
        categories,
        currentId: first.id,
        currentName: first.name,
        currentIcon: first.icon
      })
      // 首页带分类跳转进来时（分类尚未加载完暂存的意图），定位到指定分类
      if (this.pendingCategory) {
        const pending = this.pendingCategory
        this.pendingCategory = null
        this.selectCategory(pending)
      } else {
        this.loadProducts(first.id)
      }
    }).catch(() => {
      // 接口报错 / 超时 / 无数据：左侧树置空，右侧展示空状态，不再降级本地测试数据
      this.setData({
        categories: [],
        currentId: '',
        currentName: '',
        currentIcon: '',
        goodsList: [],
        pageNum: 1,
        total: 0,
        loadingMore: false,
        noMore: false
      })
      this.pendingCategory = null
    })
  },

  /**
   * 刷新数据：左侧分类与右侧商品列表一起重新拉取
   * 保留当前选中的分类与搜索关键字，不把页面重置回「全部」；
   * 分类刷新后按 id 重新对齐 currentName（分类可能被改名或删除）
   * @returns {Promise} 两侧数据都处理完成后 resolve（不会 reject）
   */
  refreshPageData() {
    const categoryId = this.data.currentId
    const keyword = this.data.keyword.trim()

    const reloadCategories = this.refreshCategories(categoryId)
    const reloadProducts = this.loadProducts(categoryId, keyword, true)

    return Promise.all([reloadCategories, reloadProducts])
      .catch(() => {})
      .then(() => {
        this.syncTabBar()
      })
  },

  /**
   * 兼容页面级下拉刷新事件
   */
  onPullDownRefresh() {
    this.onRefresherRefresh()
    wx.stopPullDownRefresh()
  },

  /**
   * 右侧商品列表 scroll-view 下拉刷新
   * 仅在搜索框下方的商品列表区域产生下拉刷新动画，顶部搜索栏与底部导航条保持固定
   */
  onRefresherRefresh() {
    this.setData({ refresherTriggered: true })
    this.refreshPageData().catch(() => {}).then(() => {
      this.setData({ refresherTriggered: false })
    })
  },

  /**
   * 重新拉取左侧分类列表（下拉刷新用），并按 id 对齐当前选中项
   * - 当前选中的是「全部 / 热销商品」虚拟分类时直接保留
   * - 选中分类已被删除时回退到「全部」
   * @param {string|number} currentId 刷新前选中的分类 id
   */
  refreshCategories(currentId) {
    return api.getCategoryList().then((res) => {
      const list = res || []
      // 接口无数据时同样不降级到本地测试数据，直接清空左侧树
      if (!list.length) {
        this.setData({
          categories: [],
          currentId: '',
          currentIcon: ''
        })
        return
      }
      const prevMap = (this.data.categories || []).reduce((acc, cur) => {
        acc[cur.id] = cur
        return acc
      }, {})
      const categories = [
        { id: 'all', name: '全部', icon: '', centerOnly: true, isImg: false },
        { id: 'hot', name: '热销商品', icon: '🔥', isImg: false },
        ...list.map((c) => {
          const icon = formatImageUrl(c.icon)
          const prev = prevMap[c.id]
          const sameIcon = prev && prev.icon === icon
          return {
            id: c.id,
            name: c.name,
            icon: icon || '',
            isImg: !!icon,
            imgLoaded: sameIcon ? !!prev.imgLoaded : false,
            imgFailed: sameIcon ? !!prev.imgFailed : false
          }
        })
      ]
      const matched = categories.find((c) => c.id === currentId)
      const target = matched || categories[0]
      // 搜索中标题为「搜索：xxx」，此时只更新左侧列表，不动标题
      const searching = !!this.data.keyword.trim()
      const patch = { categories }
      if (target.id !== currentId) {
        patch.currentId = target.id
        patch.currentIcon = target.icon
        if (!searching) patch.currentName = target.name
      } else if (!searching) {
        patch.currentName = target.name
      }
      this.setData(patch)
    }).catch(() => {})
  },

  onCategoryIconLoad(e) {
    const index = e.currentTarget.dataset.index
    if (typeof index === 'number' && this.data.categories[index]) {
      this.setData({
        [`categories[${index}].imgLoaded`]: true,
        [`categories[${index}].imgFailed`]: false
      })
    }
  },

  onCategoryIconError(e) {
    const index = e.currentTarget.dataset.index
    if (typeof index === 'number' && this.data.categories[index]) {
      this.setData({
        [`categories[${index}].imgFailed`]: true,
        [`categories[${index}].imgLoaded`]: false
      })
    }
  },

  /**
   * 加载分类下的商品（分页）
   * hot  -> /product/hotselling/page（仅上架中的热销商品）
   * 其它 -> /product/page（全部 / 按分类 / 按关键字，后端 name 模糊匹配）
   * @param {string|number} categoryId 分类 id：'all' | 'hot' | 后端分类 id
   * @param {string} keyword 关键字
   * @param {boolean} reset true=重置到第 1 页；false=追加下一页
   */
  loadProducts(categoryId, keyword = '', reset = true) {
    // 追加模式下防重复请求；重置模式允许打断（由请求序号丢弃过期结果）
    if (!reset && this.data.loadingMore) return Promise.resolve()
    const pageSize = this.data.pageSize
    const pageNum = reset ? 1 : this.data.pageNum + 1

    const params = { pageNum, pageSize }
    if (categoryId === 'hot') {
      params.status = 1
    } else if (categoryId && categoryId !== 'all') {
      params.categoryId = categoryId
    }
    if (keyword && keyword.trim()) {
      params.keyword = keyword.trim()
    }

    // 记录当前查询条件，供触底加载下一页时复用
    this._query = { categoryId, keyword: params.keyword || '' }
    const seq = (this._loadSeq = (this._loadSeq || 0) + 1)
    this.setData({ loadingMore: true })

    const request = categoryId === 'hot'
      ? api.getHotsellingPage(params)
      : api.getProductPage(params)

    return request.then((res) => {
      if (seq !== this._loadSeq) return
      const records = (res && Array.isArray(res.records))
        ? res.records
        : (Array.isArray(res) ? res : [])
      const formatted = records.map((item) => ({
        ...item,
        image: formatImageUrl(item.image),
        cartCount: cart.getProductCartCount(item.id)
      }))
      const total = res && typeof res.total === 'number' ? res.total : formatted.length
      const pages = res && typeof res.pages === 'number'
        ? res.pages
        : Math.ceil(total / pageSize)
      const goodsList = reset
        ? formatted
        : (this.data.goodsList || []).concat(formatted)
      const noMore = goodsList.length >= total || pageNum >= pages

      this.setData({
        goodsList,
        pageNum,
        total,
        noMore,
        loadingMore: false
      })
    }).catch(() => {
      if (seq !== this._loadSeq) return
      if (!reset) {
        // 追加失败：按已到末尾处理
        this.setData({ noMore: true, loadingMore: false })
        return
      }
      // 接口异常 / 超时 / 无数据：不再降级到本地测试数据，直接展示空状态
      this.setData({
        goodsList: [],
        pageNum: 1,
        total: 0,
        noMore: true,
        loadingMore: false
      })
    })
  },

  /** 右侧商品列表触底：加载下一页 */
  onLoadMore() {
    if (this.data.noMore || this.data.loadingMore) return
    const q = this._query || { categoryId: this.data.currentId, keyword: '' }
    this.loadProducts(q.categoryId, q.keyword, false)
  },

  onShow() {
    this.syncTabBar()
    // 标记本页已完成首次可见，供 prepareSearch 判断当前时序阶段
    this.__shown = true

    const app = getApp()
    if (app && app.globalData.tabRefreshFlags && app.globalData.tabRefreshFlags.category) {
      app.globalData.tabRefreshFlags.category = false
      this.reloadCategoryData()
    } else {
      this.refreshCart()
    }

    // 仅当首页点击搜索框跳转过来（focusOnShow 为 true）时才聚焦搜索框，消费一次后立即复位；
    // 其余任何场景（切 Tab、返回本页、从登录页返回等）都不会聚焦
    if (this.focusOnShow) {
      this.focusOnShow = false
      this.focusSearch()
    }
    // 从登录页返回时续做登录前的加购动作
    const pending = app && app.globalData.pendingAction
    if (pending && pending.type === 'addCart') {
      app.globalData.pendingAction = null
      this.doAddCart(pending.goods)
    }
  },

  /** 供登录成功或全局刷新分类页数据 */
  reloadCategoryData() {
    return this.refreshPageData().then(() => {
      this.refreshCart()
    })
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
      keyword: ''
    })
    this.loadProducts(first.id)
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

  /** 供首页分类入口跳转后定位分类（按 id 或名称匹配） */
  selectCategory(target) {
    if (!target) return
    const cat = this.data.categories.find(
      (c) => c.id === target.id || c.name === target.name
    )
    if (!cat) {
      // 首次进入时分类可能还没加载完，先暂存意图，加载完成后自动定位
      this.pendingCategory = target
      return
    }
    this.pendingCategory = null
    this.setData({
      currentId: cat.id,
      currentName: cat.name,
      keyword: ''
    })
    this.loadProducts(cat.id)
  },

  /** 切换左侧类别 */
  onSelectCategory(e) {
    const { id, name } = e.currentTarget.dataset
    if (id === this.data.currentId) return
    this.setData({
      currentId: id,
      currentName: name,
      keyword: ''
    })
    this.loadProducts(id)
  },

  /** 输入内容变化：防抖 400ms 后自动调用接口搜索 */
  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ keyword })
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
      this.searchTimer = null
    }
    const kw = keyword.trim()
    if (!kw) {
      // 清空输入：恢复当前分类的商品与标题
      const currentCat = this.data.categories.find((c) => c.id === this.data.currentId)
      this.setData({ currentName: currentCat ? currentCat.name : '全部' })
      this.loadProducts(this.data.currentId)
      return
    }
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null
      this.doSearch(kw)
    }, 400)
  },

  /** 按关键字搜索（在全部商品中搜索） */
  doSearch(keyword) {
    this.setData({ currentName: `搜索：${keyword}` })
    this.loadProducts('', keyword)
  },

  /** 键盘确认搜索：立即执行，不再等防抖 */
  onSearch() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
      this.searchTimer = null
    }
    const keyword = this.data.keyword.trim()
    if (!keyword) {
      this.loadProducts(this.data.currentId)
      return
    }
    this.doSearch(keyword)
  },

  onClearSearch() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
      this.searchTimer = null
    }
    const currentCat = this.data.categories.find((c) => c.id === this.data.currentId)
    this.setData({
      keyword: '',
      currentName: currentCat ? currentCat.name : '全部'
    })
    this.loadProducts(this.data.currentId)
  },

  onUnload() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
      this.searchTimer = null
    }
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
    if (goods && goods.status === 0) {
      wx.showToast({ title: '商品已下架', icon: 'none' })
      return
    }
    cart.addToCart(goods, 1)
    this.refreshCart()
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

  /** 供购物车变更时刷新：同步更新商品列表中的数量数字和 TabBar 角标 */
  refreshCart() {
    const list = this.data.goodsList || []
    if (list.length > 0) {
      const goodsList = list.map((item) => ({
        ...item,
        cartCount: cart.getProductCartCount(item.id)
      }))
      this.setData({ goodsList })
    }
    this.syncTabBar()
  },

  onGoodsTap(e) {
    const goods = e && e.detail && e.detail.goods
    if (!goods || !goods.id) return
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${goods.id}`
    })
  },

  /** 列表项加购（原生渲染，无组件事件） */
  onListAddCart(e) {
    const idx = e.currentTarget.dataset.index
    const goods = this.data.goodsList[idx]
    if (!goods) return
    if (goods.status === 0) {
      wx.showToast({ title: '商品已下架', icon: 'none' })
      return
    }
    guard.ensureLogin({
      content: '登录后才能加入购物车，是否前往登录？',
      redirect: '/pages/category/category',
      action: { type: 'addCart', goods },
      success: () => this.doAddCart(goods)
    })
  },

  /** 列表项减购 */
  onListDecreaseCart(e) {
    const idx = e.currentTarget.dataset.index
    const goods = this.data.goodsList[idx]
    if (!goods) return
    if (goods.status === 0) {
      wx.showToast({ title: '商品已下架', icon: 'none' })
      return
    }
    cart.decreaseFromCart(goods)
    this.refreshCart()
  },

  /** 列表项图片加载失败：清空图片地址以回退为「无图片」占位 */
  onListImageError(e) {
    const idx = e.currentTarget.dataset.index
    if (idx === undefined || idx === null) return
    this.setData({ [`goodsList[${idx}].image`]: '' })
  },

  /** 列表项点击（原生渲染，无组件事件）：跳转商品详情页 */
  onListItemTap(e) {
    const idx = e.currentTarget.dataset.index
    const goods = this.data.goodsList[idx]
    if (!goods || !goods.id) return
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${goods.id}`
    })
  }
}))
