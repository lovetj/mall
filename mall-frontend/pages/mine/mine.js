/**我的页：需登录后进入，展示用户信息与功能列表 */
const auth = require('../../utils/auth')
const guard = require('../../utils/guard')
const cart = require('../../utils/cart')
const util = require('../../utils/util')
const modalMixin = require('../../utils/modal-mixin')
const api = require('../../utils/api')
const { formatImageUrl } = require('../../utils/config')

Page(Object.assign({}, modalMixin, {
  data: {
    userInfo: null,
    cartCount: 0,
    orderCount: 0,
    menus: [
      { key: 'orders', icon: '📋', title: '我的订单', desc: '查看全部订单' },
      { key: 'address', icon: '📍', title: '收货地址', desc: '管理收货信息' },
      { key: 'service', icon: '💬', title: '联系客服', desc: '在线咨询' },
      { key: 'about', icon: 'ℹ️', title: '关于我们', desc: 'v1.0.0' }
    ]
  },

  onShow() {
    // 先同步 TabBar 选中态：即使未登录被拦截，导航签也要保持选中
    this.syncTabBar()

    // 刚从登录页返回：本次 onShow 不再重复拦截（用户放弃登录也停留本页，不做任何跳转）
    if (guard.consumeLeavingFlag()) return

    // 未登录拦截
    if (!auth.isLogin()) {
      guard.redirectToLogin({
        redirect: '/pages/mine/mine',
        onConfirm: () => guard.markLeavingForLogin()
      })
      return
    }
    this.refreshUser()
  },

  /** 同步自定义 TabBar 的选中态与购物车角标 */
  syncTabBar() {
    const count = cart.getCartCount()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
      this.getTabBar().setCartCount(count)
    }
  },

  refreshUser() {
    const { userInfo } = auth.getLoginState()
    if (userInfo) {
      this.setData({
        userInfo: {
          ...userInfo,
          avatarUrl: formatImageUrl(userInfo.avatar || userInfo.avatarUrl)
        },
        cartCount: cart.getCartCount()
      })
    }

    // 从后端刷新最新的用户信息
    api.getUserInfo().then((user) => {
      if (user) {
        const updated = {
          nickName: user.nickname || user.username || '微信用户',
          avatarUrl: formatImageUrl(user.avatar),
          ...user
        }
        this.setData({ userInfo: updated })
        const { token } = auth.getLoginState()
        auth.setLoginState(token, updated)
      }
    }).catch(() => {})
  },

  /** 供购物车变更时刷新 */
  refreshCart() {
    this.setData({ cartCount: cart.getCartCount() })
  },

  /** 功能列表点击 */
  onMenuTap(e) {
    const key = e.currentTarget.dataset.key
    // 所有入口均在已登录前提下展示
    if (!auth.isLogin()) {
      guard.ensureLogin({ content: '请先登录后使用', success: () => this.onMenuTap(e) })
      return
    }
    switch (key) {
      case 'orders':
        wx.navigateTo({ url: '/pages/orders/orders' })
        break
      case 'address':
        wx.navigateTo({ url: '/pages/address/address' })
        break
      case 'service':
        util.toast('客服电话：400-000-0000')
        break
      case 'about':
        util.toast('优选商城 v1.0.0')
        break
      default:
        break
    }
  },

  /**
   * 点击头像刷新资料
   * 注意：wx.getUserProfile 自 2022.10 起已被回收（只能拿到灰色默认头像与"微信用户"），
   * 官方推荐使用 button open-type="chooseAvatar" + input type="nickname"，故此处引导去登录页重新授权
   */
  onUpdateProfile() {
    wx.showModal({
      title: '完善资料',
      content: '点击头像可选择新头像，输入框可修改昵称',
      confirmText: '去修改',
      confirmColor: '#ff5000',
      success: (res) => {
        if (res.confirm) {
          auth.setRedirect('/pages/mine/mine')
          wx.navigateTo({ url: '/pages/login/login' })
        }
      }
    })
  },

  /** 退出登录：清除登录态并返回未登录状态 */
  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      confirmColor: '#ff5000',
      success: (res) => {
        if (!res.confirm) return
        auth.clearLoginState()
        getApp().globalData.isLogin = false
        getApp().globalData.userInfo = null
        util.toast('已退出登录')
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' })
        }, 800)
      }
    })
  }
}))
