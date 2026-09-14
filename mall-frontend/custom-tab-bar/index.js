/**
 * 自定义 TabBar
 * 全部图标由 CSS 绘制（线条风格），统一 48rpx 视觉尺寸与 2rpx 线宽，
 * 未选中为灰色描边，选中为主题色实心/高亮，风格完全一致。
 */
Component({
  data: {
    selected: 0,
    color: '#999999',
    selectedColor: '#ff5000',
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        iconType: 'home',
        url: '/pages/index/index'
      },
      {
        pagePath: '/pages/category/category',
        text: '分类',
        iconType: 'grid',
        url: '/pages/category/category'
      },
      {
        pagePath: '/pages/cart/cart',
        text: '购物车',
        iconType: 'cart',
        url: '/pages/cart/cart'
      },
      {
        pagePath: '/pages/mine/mine',
        text: '我的',
        iconType: 'user',
        url: '/pages/mine/mine'
      }
    ],
    cartCount: 0
  },

  attached() {
    // 全局购物车数量变化时由页面主动调用 setCartCount
    this.syncSelected()
  },

  methods: {
    /** 切换页签 */
    onTap(e) {
      const { index, path } = e.currentTarget.dataset
      if (this.data.selected === index) return

      // 购物车 / 我的 需要登录，交由对应页面的 onShow 拦截，这里只负责跳转
      wx.switchTab({ url: path })
    },

    /** 由页面在 onShow 中调用，同步当前选中项 */
    syncSelected() {
      const pages = getCurrentPages()
      const current = pages.length ? `/${pages[pages.length - 1].route}` : ''
      const selected = this.data.list.findIndex((item) => item.pagePath === current)
      if (selected > -1) this.setData({ selected })
    },

    /** 设置购物车角标数量 */
    setCartCount(count) {
      this.setData({ cartCount: count || 0 })
    }
  }
})
