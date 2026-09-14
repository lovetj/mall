/**登录页：微信授权登录（wx.login + 头像昵称），登录成功回跳原页面并执行待办动作 */
const auth = require('../../utils/auth')
const util = require('../../utils/util')
const guard = require('../../utils/guard')
const api = require('../../utils/api')
const { formatImageUrl } = require('../../utils/config')

/** TabBar 页面列表（这些页面只能用 switchTab 跳转） */
const TAB_PAGES = ['/pages/index/index', '/pages/category/category', '/pages/cart/cart', '/pages/mine/mine']

/** 回跳地址 -> 中文名（用于页面展示） */
const PAGE_NAMES = {
  '/pages/index/index': '首页',
  '/pages/category/category': '分类',
  '/pages/cart/cart': '购物车',
  '/pages/mine/mine': '我的'
}

Page({
  data: {
    avatarUrl: '',
    nickName: '',
    agreed: true,
    loading: false,
    /** 回跳目标（用于页面展示，如"登录后返回购物车"） */
    redirect: '',
    redirectName: ''
  },

  onLoad() {
    // 只读取 redirect 做展示，不要在这里消费（takeRedirect 会清缓存）
    const redirect = auth.peekRedirect()
    this.setData({
      redirect,
      redirectName: PAGE_NAMES[redirect] || ''
    })

    // 已登录则无需重复登录，直接回跳（此时缓存中不会有 redirect，走返回上一页逻辑）
    if (auth.isLogin()) {
      this.backAndRedirect()
    }
  },

  /** 选择头像（open-type="chooseAvatar"） */
  onChooseAvatar(e) {
    this.setData({ avatarUrl: e.detail.avatarUrl })
  },

  /** 输入昵称（type="nickname"） */
  onNicknameInput(e) {
    this.setData({ nickName: e.detail.value })
  },

  onToggleAgree() {
    this.setData({ agreed: !this.data.agreed })
  },

  /**
   * 微信授权登录
   * 1. wx.login 获取 code（真实项目应发往服务端换取 token）
   * 2. 组装用户信息并写入本地缓存
   * 3. 回跳原页面 / TabBar 页
   */
  onLogin() {
    if (!this.data.agreed) {
      util.toast('请先阅读并同意用户协议')
      return
    }
    if (this.data.loading) return
    this.setData({ loading: true })

    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          this.setData({ loading: false })
          util.toast('获取登录凭证失败，请重试')
          return
        }

        const username = (this.data.nickName.trim() || 'wx_user').replace(/\s+/g, '')
        const password = 'wx_password'

        // 尝试调用后端登录接口，若用户不存在则先自动注册再登录
        api.login({ username, password }).then((res) => {
          this.handleLoginSuccess(res, loginRes.code)
        }).catch(() => {
          // 登录失败尝试自动注册
          api.register({
            username,
            password,
            phone: '13800000000'
          }).then(() => {
            return api.login({ username, password })
          }).then((res) => {
            this.handleLoginSuccess(res, loginRes.code)
          }).catch(() => {
            // 后端不可用时的本地降级
            const token = util.createToken()
            const userInfo = {
              nickName: this.data.nickName.trim() || '微信用户',
              avatarUrl: this.data.avatarUrl || '',
              code: loginRes.code
            }
            this.handleLocalLoginSuccess(token, userInfo)
          })
        })
      },
      fail: () => {
        this.setData({ loading: false })
        util.toast('微信登录失败，请重试')
      }
    })
  },

  handleLoginSuccess(data, code) {
    const token = (data && data.token) || util.createToken()
    const user = (data && data.user) || {}
    const userInfo = {
      nickName: user.nickname || this.data.nickName.trim() || user.username || '微信用户',
      avatarUrl: formatImageUrl(user.avatar) || this.data.avatarUrl || '',
      code,
      ...user
    }

    // 上传头像图片（若用户重新选择了本地头像）
    if (this.data.avatarUrl && (this.data.avatarUrl.startsWith('wxfile://') || this.data.avatarUrl.startsWith('http://tmp'))) {
      api.uploadFile(this.data.avatarUrl, 'avatar').then((uploadRes) => {
        if (uploadRes && uploadRes.relativePath) {
          api.updateUserProfile({
            avatar: uploadRes.relativePath,
            nickname: userInfo.nickName
          }).catch(() => {})
        }
      }).catch(() => {})
    }

    this.handleLocalLoginSuccess(token, userInfo)
  },

  handleLocalLoginSuccess(token, userInfo) {
    auth.setLoginState(token, userInfo)

    const app = getApp()
    if (app) {
      app.globalData.isLogin = true
      app.globalData.userInfo = userInfo
    }

    // 重置拦截锁，保证后续拦截正常
    guard.resetRedirectFlag()
    this.setData({ loading: false })

    wx.showToast({ title: '登录成功', icon: 'success', duration: 800 })
    setTimeout(() => this.backAndRedirect(), 800)
  },

  /**
   * 登录成功后的回跳逻辑
   * - 有 redirect：TabBar 页用 switchTab（登录态已写入，其 onShow 不会再次拦截），普通页用 redirectTo
   * - 无 redirect：返回上一页并把待办动作回传（支持"加购"续做）
   */
  backAndRedirect() {
    const app = getApp()
    const pending = (app && app.globalData.pendingAction) || null
    const redirect = auth.takeRedirect()
    const pages = getCurrentPages()

    if (redirect) {
      if (TAB_PAGES.indexOf(redirect) > -1) {
        wx.switchTab({ url: redirect })
      } else {
        wx.redirectTo({ url: redirect })
      }
      return
    }

    // 返回上一页并续做待办动作
    if (pages.length > 1) {
      const prevPage = pages[pages.length - 2]
      wx.navigateBack({
        success: () => {
          if (prevPage && typeof prevPage.onLoginBack === 'function') {
            prevPage.onLoginBack(pending)
          }
        }
      })
    } else {
      wx.switchTab({ url: '/pages/index/index' })
    }
  },

  /** 暂不登录：返回来源页 */
  onCancel() {
    // 清掉待回跳地址，避免下次进入登录页时误跳
    auth.takeRedirect()
    const app = getApp()
    if (app) app.globalData.pendingAction = null
    guard.resetRedirectFlag()

    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.switchTab({ url: '/pages/index/index' })
    }
  }
})
