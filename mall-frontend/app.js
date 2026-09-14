/**app.js**/
const auth = require('./utils/auth')
const guard = require('./utils/guard')
const config = require('./utils/config')

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
  }
})
