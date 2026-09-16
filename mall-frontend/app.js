/**app.js**/
const auth = require('./utils/auth')
const guard = require('./utils/guard')
const config = require('./utils/config')
const cart = require('./utils/cart')

App({
  globalData: {
    /** 系统信息 */
    statusBarHeight: 20,
    navBarHeight: 44,
    menuRight: 0,
    isLogin: false,
    userInfo: null,
    /** 登录成功后需要回跳的页面（由 guard 统一处理） */
    pendingAction: null,
    /** TabBar 页面刷新标记：微信登录成功等场景触发所有 Tab 页面全量刷新 */
    tabRefreshFlags: {
      index: false,
      category: false,
      cart: false,
      mine: false
    },
    /** 全局公共常量供页面读取 */
    BASE_URL: config.BASE_URL,
    FILE_BASE_SERVER: config.FILE_BASE_SERVER
  },

  onLaunch() {
    this.initSystemInfo()
    this.checkLoginState()
  },

  onShow() {
    // 从登录页返回时同步最新登录态
    this.checkLoginState()
  },

  /** 计算自定义导航 / 安全区相关信息 */
  initSystemInfo() {
    try {
      const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      const menuRect = wx.getMenuButtonBoundingClientRect()
      const statusBarHeight = windowInfo.statusBarHeight || 20
      const navBarHeight = (menuRect.top - statusBarHeight) * 2 + menuRect.height
      this.globalData.statusBarHeight = statusBarHeight
      this.globalData.navBarHeight = navBarHeight
      this.globalData.menuRight = windowInfo.windowWidth - menuRect.right
    } catch (e) {
      // 兜底（低版本基础库）
    }
  },

  /**
   * 启动时校验本地登录态是否有效
   * 无效则清除缓存，保证全局状态一致
   */
  checkLoginState() {
    const valid = auth.isLogin()
    if (!valid) {
      auth.clearLoginState()
      this.globalData.isLogin = false
      this.globalData.userInfo = null
    } else {
      const { userInfo } = auth.getLoginState()
      this.globalData.isLogin = true
      this.globalData.userInfo = userInfo
    }
    return valid
  },

  /** 供页面调用：确保登录，未登录弹窗 -> 登录页 */
  ensureLogin(options) {
    return guard.ensureLogin(options)
  },

  /** 供页面调用：未登录直接跳登录页 */
  redirectToLogin(options) {
    return guard.redirectToLogin(options)
  },

  /** 标记所有底部导航栏页面需要刷新 */
  markTabsNeedRefresh() {
    this.globalData.tabRefreshFlags = {
      index: true,
      category: true,
      cart: true,
      mine: true
    }
  },

  /**
   * 刷新当前页面栈中已存在的所有底部导航栏页面及角标
   */
  refreshAllTabPages() {
    try {
      const cartCount = cart.getCartCount()
      const pages = getCurrentPages() || []
      pages.forEach((page) => {
        if (!page || !page.route) return
        if (typeof page.getTabBar === 'function' && page.getTabBar()) {
          page.getTabBar().setCartCount(cartCount)
        }
        if (page.route === 'pages/index/index' && typeof page.reloadIndexData === 'function') {
          page.reloadIndexData()
        } else if (page.route === 'pages/category/category' && typeof page.reloadCategoryData === 'function') {
          page.reloadCategoryData()
        } else if (page.route === 'pages/cart/cart' && typeof page.refreshCartData === 'function') {
          page.refreshCartData()
        } else if (page.route === 'pages/mine/mine' && typeof page.refreshUserData === 'function') {
          page.refreshUserData()
        }
      })
    } catch (e) {
      console.warn('刷新TabBar页面异常:', e)
    }
  }
})
