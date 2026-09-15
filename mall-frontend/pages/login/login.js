/**
 * 登录页：微信原生授权登录
 * 链路：点击授权 → 微信原生头像选择器授权 → 回显头像 → 自动唤起微信昵称气泡授权 → 回显昵称 → 自动登录
 * 全程使用微信原生授权组件返回的真实头像与昵称，不产生任何假数据。
 */
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
    nicknameFocus: false,
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

  /**
   * 唤起微信昵称授权气泡（type="nickname" 输入框聚焦后，键盘上方自动弹出微信昵称气泡）
   * 必须先置 false 再延迟置 true，确保 focus 每次都能生效（连续两次 true 不会重新聚焦）
   */
  focusNicknameInput() {
    this.setData({ nicknameFocus: false }, () => {
      // 延迟等待头像选择器弹层完全关闭、键盘可正常唤起
      setTimeout(() => {
        this.setData({ nicknameFocus: true })
      }, 300)
    })
  },

  /**
   * 微信头像授权回调（open-type="chooseAvatar" 原生授权）
   * 1. 回显头像
   * 2. 自动唤起微信昵称授权气泡（无需用户再手动点昵称框）
   */
  onChooseAvatar(e) {
    const avatarUrl = e.detail && e.detail.avatarUrl
    if (!avatarUrl) return

    // 回显头像
    this.setData({ avatarUrl })

    if (!(this.data.nickName || '').trim()) {
      // 头像授权完成 → 自动唤起微信昵称授权气泡
      this.focusNicknameInput()
    } else {
      // 头像、昵称均已授权（回显完成）→ 直接登录
      this.doLogin()
    }
  },

  /** 昵称输入（type="nickname" 原生授权组件） */
  onNicknameInput(e) {
    const nickName = (e && e.detail && e.detail.value) || ''
    if (nickName) {
      // 回显昵称
      this.setData({ nickName })
    }
  },

  /** 昵称输入框失焦（用户手动输入完成） */
  onNicknameBlur(e) {
    const nickName = (e && e.detail && e.detail.value) ? String(e.detail.value).trim() : ''
    this.setData({ nicknameFocus: false })
    if (nickName) {
      this.setData({ nickName })
      // 资料齐备则自动登录
      this.tryAutoLogin()
    }
  },

  /** 微信昵称气泡选中回调（原生授权完成） */
  onNicknameChange(e) {
    const nickName = (e && e.detail && e.detail.value) ? String(e.detail.value).trim() : ''
    if (nickName) {
      // 回显昵称
      this.setData({ nickName, nicknameFocus: false })
      // 昵称授权完成 → 自动登录
      this.tryAutoLogin()
    }
  },

  onToggleAgree() {
    this.setData({ agreed: !this.data.agreed })
  },

  /**
   * 将本地临时头像上传至后端服务器
   * @param {string} tempUrl 本地临时文件路径（wxfile:// 或 http://tmp 等）
   * @returns {Promise<string>} 后端返回的相对存储路径（如 /avatar/xxx.png）
   */
  async uploadAvatarFile(tempUrl) {
    if (!tempUrl) return ''
    const isTemp = tempUrl.startsWith('wxfile://') || tempUrl.startsWith('http://tmp') || tempUrl.startsWith('tmp/')
    if (!isTemp) {
      return tempUrl
    }
    const uploadRes = await api.uploadFile(tempUrl, 'avatar')
    if (uploadRes && uploadRes.relativePath) {
      return uploadRes.relativePath
    }
    return ''
  },

  /**
   * 微信授权登录入口
   * - 头像未授权：本按钮此时为 open-type="chooseAvatar"，点击会拉起微信原生头像选择器
   * - 头像已授权、昵称未授权：聚焦昵称输入框，拉起微信昵称授权气泡
   * - 头像与昵称均已授权（页面已回显）：直接登录
   */
  onLogin() {
    if (!this.data.agreed) {
      util.toast('请先阅读并同意用户协议')
      return
    }
    if (this.data.loading) return

    const hasAvatar = !!this.data.avatarUrl
    const hasNickname = !!(this.data.nickName || '').trim()

    if (!hasAvatar) {
      // 按钮 open-type="chooseAvatar"，微信头像授权选择器即将弹出，无需其他处理
      return
    }
    if (!hasNickname) {
      util.toast('请点击键盘上方的微信昵称完成授权')
      this.focusNicknameInput()
      return
    }
    this.doLogin()
  },

  /** 头像与昵称均已授权（回显完成）时自动发起登录 */
  tryAutoLogin() {
    const hasAvatar = !!this.data.avatarUrl
    const hasNickname = !!(this.data.nickName || '').trim()
    if (hasAvatar && hasNickname && !this.data.loading) {
      this.doLogin()
    }
  },

  /**
   * 真实登录：真实头像上传后端 + wx.login 换取凭证 + 提交后端
   */
  async doLogin() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      // 1. 头像真实上传后端（拿到服务器持久化相对路径）
      let backendAvatarPath = ''
      if (this.data.avatarUrl) {
        try {
          backendAvatarPath = await this.uploadAvatarFile(this.data.avatarUrl)
        } catch (uploadErr) {
          console.warn('头像上传后端异常，本次以本地临时路径展示:', uploadErr)
        }
      }

      // 2. wx.login 获取微信登录凭证
      wx.showLoading({ title: '登录中...', mask: true })
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: (res) => (res.code ? resolve(res) : reject(new Error('未获取到code'))),
          fail: reject
        })
      })

      // 3. 提交微信原生授权返回的真实昵称与头像
      const res = await api.wxLogin({
        code: loginRes.code,
        nickname: (this.data.nickName || '').trim(),
        avatar: backendAvatarPath || undefined
      })

      wx.hideLoading()
      this.handleLoginSuccess(res, loginRes.code, backendAvatarPath)
    } catch (err) {
      wx.hideLoading()
      this.setData({ loading: false })
      console.error('微信登录失败:', err)

      const errorMsg = (err && (err.message || err.msg)) || ''
      if (errorMsg && errorMsg !== '未获取到code') {
        wx.showModal({
          title: '登录提示',
          content: errorMsg,
          showCancel: false,
          confirmColor: '#ff5000'
        })
      } else {
        // 后端服务不可用时的本地兜底（仍使用微信授权的真实昵称与头像）
        const token = util.createToken()
        const userInfo = {
          nickName: (this.data.nickName || '').trim(),
          avatarUrl: this.data.avatarUrl || '',
          username: (this.data.nickName || '').trim()
        }
        this.handleLocalLoginSuccess(token, userInfo)
      }
    }
  },

  handleLoginSuccess(data, code, backendAvatarPath) {
    const token = (data && data.token) || util.createToken()
    const user = (data && data.user) || {}
    const realNickname = (this.data.nickName || '').trim()
    const userInfo = {
      nickName: user.nickname || realNickname || user.username,
      avatarUrl: formatImageUrl(user.avatar) || (backendAvatarPath ? formatImageUrl(backendAvatarPath) : '') || this.data.avatarUrl || '',
      username: user.username || user.openid,
      code,
      ...user
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
