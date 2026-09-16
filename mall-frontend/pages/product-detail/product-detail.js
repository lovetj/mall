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
    // 多规格价格层级列表
    tierList: [],
    selectedTier: null,
    selectedTierId: '',
    currentOriginalPrice: '',
    currentUnit: '',
    currentStock: 0,
    currentImage: '',
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
      this.clearTagImageTimers()
      this.setData({ loadState: 'empty' })
      return
    }
    this.loadDetail(productId)
  },

  onShow() {
    this.refreshCart()
  },

  onUnload() {
    this.clearTagImageTimers()
  },

  /** 加载商品详情 */
  loadDetail(id) {
    this.setData({ loadState: 'loading' })
    return api.getProductDetail(id).then((data) => {
      if (!data || !data.id) {
        this.clearTagImageTimers()
        this.setData({ product: null, loadState: 'empty' })
        return
      }
      const swiperImages = this.buildImages(data)
      const tierList = this.buildTiers(data.tierList)
      const defaultTier = tierList.length > 0 ? tierList[0] : null
      const selectedTierId = defaultTier ? defaultTier.id : ''
      const priceVal = defaultTier ? defaultTier.price : data.price
      const origPriceVal = defaultTier && defaultTier.originalPrice ? defaultTier.originalPrice : data.originalPrice
      const unitVal = defaultTier && defaultTier.unit ? defaultTier.unit : data.unit
      const stockVal = defaultTier && defaultTier.stock !== undefined ? defaultTier.stock : data.stock
      const imgVal = (defaultTier && defaultTier.image) || (swiperImages.length ? swiperImages[0] : '')
      const tagList = this.buildTags(data.tagList)

      this.setData({
        product: data,
        swiperImages,
        tagList,
        tierList,
        selectedTier: defaultTier,
        selectedTierId,
        priceText: util.formatPrice(priceVal),
        currentOriginalPrice: origPriceVal ? util.formatPrice(origPriceVal) : '',
        currentUnit: unitVal || '',
        currentStock: Number(stockVal) || 0,
        currentImage: imgVal,
        salesText: util.formatSales(data.sales),
        loadState: 'success'
      })
      this.startTagImageTimeouts(tagList)
    }).catch(() => {
      // 接口异常 / 超时 / 无数据：展示空态，不降级本地假数据
      this.clearTagImageTimers()
      this.setData({ product: null, swiperImages: [], tagList: [], tierList: [], loadState: 'empty' })
    })
  },

  /** 格式化规格层级列表 */
  buildTiers(list) {
    if (!Array.isArray(list)) return []
    return list
      .filter((t) => t && t.status !== 0)
      .map((t) => ({
        ...t,
        image: formatImageUrl(t.image),
        priceText: util.formatPrice(t.price),
        originalPriceText: t.originalPrice ? util.formatPrice(t.originalPrice) : ''
      }))
  },

  /** 切换选择规格 */
  onSelectTier(e) {
    const id = e.currentTarget.dataset.id
    if (!id || id === this.data.selectedTierId) return
    const targetTier = this.data.tierList.find((t) => t.id === id)
    if (!targetTier) return

    const origPrice = targetTier.originalPrice || (this.data.product && this.data.product.originalPrice)
    const unitVal = targetTier.unit || (this.data.product && this.data.product.unit) || ''
    const stockVal = Number(targetTier.stock !== undefined ? targetTier.stock : (this.data.product && this.data.product.stock)) || 0
    const imgVal = targetTier.image || (this.data.swiperImages.length ? this.data.swiperImages[0] : '')

    let quantity = this.data.quantity
    if (stockVal > 0 && quantity > stockVal) {
      quantity = stockVal
    }

    this.setData({
      selectedTier: targetTier,
      selectedTierId: id,
      priceText: targetTier.priceText || util.formatPrice(targetTier.price),
      currentOriginalPrice: origPrice ? util.formatPrice(origPrice) : '',
      currentUnit: unitVal,
      currentStock: stockVal,
      currentImage: imgVal,
      quantity: quantity > 0 ? quantity : 1
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

  buildTags(list) {
    if (!Array.isArray(list)) return []
    return list
      .filter((t) => t && typeof t.name === 'string' && t.name.trim() !== '')
      .map((t) => {
        const formattedImg = formatImageUrl(t.image)
        const validImg = typeof formattedImg === 'string' ? formattedImg.trim() : ''
        return {
          id: t.id,
          name: t.name,
          image: validImg,
          isHotselling: t.isHotselling === 1,
          imageError: false
        }
      })
  },

  clearTagImageTimers() {
    if (this._tagImageTimers) {
      Object.keys(this._tagImageTimers).forEach((key) => {
        clearTimeout(this._tagImageTimers[key])
      })
      this._tagImageTimers = {}
    }
  },

  startTagImageTimeouts(tags) {
    this.clearTagImageTimers()
    this._tagImageTimers = {}
    if (!Array.isArray(tags)) return
    tags.forEach((item, index) => {
      if (item.image && !item.imageError) {
        this._tagImageTimers[index] = setTimeout(() => {
          this.handleTagImageFailed(index)
        }, 5000)
      }
    })
  },

  onTagImageLoad(e) {
    const index = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.index
    if (index !== undefined && index !== null && this._tagImageTimers && this._tagImageTimers[index]) {
      clearTimeout(this._tagImageTimers[index])
      delete this._tagImageTimers[index]
    }
  },

  onTagImageError(e) {
    const index = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.index
    this.handleTagImageFailed(index)
  },

  handleTagImageFailed(index) {
    if (index === undefined || index === null) return
    if (this._tagImageTimers && this._tagImageTimers[index]) {
      clearTimeout(this._tagImageTimers[index])
      delete this._tagImageTimers[index]
    }
    if (this.data.tagList && this.data.tagList[index] && !this.data.tagList[index].imageError) {
      const key = `tagList[${index}].imageError`
      this.setData({
        [key]: true
      })
    }
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
    if (product.status === 0) {
      util.toast('该商品已下架，暂不支持购买')
      return
    }
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
    const tier = this.data.selectedTier
    const product = this.data.product
    let max = 999
    if (tier && tier.stock !== undefined && tier.stock !== null) {
      max = Number(tier.stock)
    } else if (product && product.stock !== undefined && product.stock !== null) {
      max = Number(product.stock)
    }
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
    const tierList = this.data.tierList || []
    let selectedTier = this.data.selectedTier
    if (tierList.length > 0 && !selectedTier) {
      selectedTier = tierList[0]
      this.setData({ selectedTier, selectedTierId: selectedTier.id })
    }

    if (selectedTier && selectedTier.stock !== undefined && selectedTier.stock <= 0) {
      util.toast('该规格已售罄')
      return
    }

    const quantity = this.data.quantity
    cart.addToCart(product, quantity, selectedTier)
    this.setData({ showQuantity: false })
    this.refreshCart()
    wx.showToast({ title: '已加入购物车', icon: 'success' })
  }
}))
