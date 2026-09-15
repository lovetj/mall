/**商品详情页：轮播图 + 名称价格销量标签 + 商品描述 + 底部操作栏*/
const cart = require('../../utils/cart')
const guard = require('../../utils/guard')
const util = require('../../utils/util')
const modalMixin = require('../../utils/modal-mixin')
const api = require('../../utils/api')
const { formatImageUrl } = require('../../utils/config')

Page(Object.assign({}, modalMixin, {
  data: {
    productId: '',
    product: null,
    // 轮播图（已格式化，去重）
    swiperImages: [],
    // 标签列表（已格式化图片）
    tagList: [],
    priceText: '0.00',
    salesText: '0',
    cartCount: 0,
    // 数量选择弹窗
    showQuantity: false,
    quantity: 1,
    // 加载状态：loading | success | empty
    loadState: 'loading'
  },

  onLoad(options) {
    const productId = (options && options.id) || ''
    this.setData({ productId })
    if (!productId) {
      this.setData({ loadState: 'empty' })
      return
    }
    this.loadDetail(productId)
  },

  onShow() {
    this.refreshCart()
  },

  /** 加载商品详情 */
  loadDetail(id) {
    this.setData({ loadState: 'loading' })
    return api.getProductDetail(id).then((data) => {
      if (!data || !data.id) {
        this.setData({ product: null, loadState: 'empty' })
        return
      }
      this.setData({
        product: data,
        swiperImages: this.buildImages(data),
        tagList: this.buildTags(data.tagList),
        priceText: util.formatPrice(data.price),
        salesText: util.formatSales(data.sales),
        loadState: 'success'
      })
      // 未填写描述时的兜底文案由 wxml 处理
    }).catch(() => {
      // 接口异常 / 超时 / 无数据：展示空态，不降级本地假数据
      this.setData({ product: null, swiperImages: [], tagList: [], loadState: 'empty' })
    })
  },

  /**
   * 组装轮播图列表
   * images 字段为逗号分隔的相对路径，也可能兼容 JSON 数组字符串；
   * 同时把主图 image 纳入并放在首位，去重后统一格式化
   */
  buildImages(data) {
    const raw = []
    const push = (val) => {
      if (typeof val !== 'string') return
      const item = val.trim()
      if (item && raw.indexOf(item) === -1) raw.push(item)
    }

    push(data.image)

    const images = data.images
    if (Array.isArray(images)) {
      images.forEach(push)
    } else if (typeof images === 'string' && images.trim()) {
      const str = images.trim()
      if (str.startsWith('[') && str.endsWith(']')) {
        // JSON 数组格式，兼容解析失败场景
        try {
          const parsed = JSON.parse(str)
          if (Array.isArray(parsed)) parsed.forEach(push)
          else str.replace(/[[\]"']/g, '').split(',').forEach(push)
        } catch (e) {
          str.replace(/[[\]"']/g, '').split(',').forEach(push)
        }
      } else {
        str.split(',').forEach(push)
      }
    }

    return raw.map((p) => formatImageUrl(p)).filter(Boolean)
  },

  /** 组装标签列表（图片统一格式化） */
  buildTags(list) {
    if (!Array.isArray(list)) return []
    return list
      .filter((t) => t && typeof t.name === 'string' && t.name.trim() !== '')
      .map((t) => ({
        id: t.id,
        name: t.name,
        image: formatImageUrl(t.image),
        isHotselling: t.isHotselling === 1
      }))
  },

  /** 刷新购物车角标 */
  refreshCart() {
    this.setData({ cartCount: cart.getCartCount() })
  },

  /** 点击轮播图：预览大图 */
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    wx.previewImage({
      current: url,
      urls: this.data.swiperImages.length ? this.data.swiperImages : [url]
    })
  },

  /** 跳转购物车（TabBar 页，需用 switchTab） */
  goCart() {
    wx.switchTab({
      url: '/pages/cart/cart',
      fail: () => {
        wx.navigateTo({ url: '/pages/cart/cart' })
      }
    })
  },

  /**
   * 加入购物车：需登录
   * 不设置 redirect：登录页会用 navigateBack 返回本页并回调 onLoginBack，
   * 从而在登录成功后自动续做"选择数量"的动作（本页参数不会丢失）
   */
  onAddCart() {
    const product = this.data.product
    if (!product) return
    guard.ensureLogin({
      content: '登录后才能加入购物车，是否前往登录？',
      action: { type: 'addCart', goods: product },
      success: () => this.openQuantityPopup()
    })
  },

  /** 登录页回跳时续做登录前的操作 */
  onLoginBack(result) {
    const app = getApp()
    const action = (result && result.type ? result : null) || (app && app.globalData.pendingAction)
    if (app) app.globalData.pendingAction = null
    if (!action || !action.goods) {
      this.refreshCart()
      return
    }
    if (action.type === 'addCart') this.openQuantityPopup()
  },

  /** 打开数量选择弹窗 */
  openQuantityPopup() {
    this.setData({ quantity: 1, showQuantity: true })
  },

  closeQuantity() {
    this.setData({ showQuantity: false })
  },

  /** 阻止弹窗内容区点击冒泡到蒙版 */
  noop() {},

  onDecrease() {
    if (this.data.quantity > 1) {
      this.setData({ quantity: this.data.quantity - 1 })
    }
  },

  onIncrease() {
    const max = Number(this.data.product && this.data.product.stock)
    const limit = max > 0 ? max : 999
    if (this.data.quantity < limit) {
      this.setData({ quantity: this.data.quantity + 1 })
    } else {
      util.toast('已达库存上限')
    }
  },

  /** 确认加入购物车 */
  onConfirmQuantity() {
    const product = this.data.product
    if (!product) return
    const quantity = this.data.quantity

    cart.addToCart(product, quantity)

    this.setData({ showQuantity: false })
    this.refreshCart()
    wx.showToast({ title: '已加入购物车', icon: 'success' })
  }
}))
