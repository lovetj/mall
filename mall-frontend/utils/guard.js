/**
 * 登录拦截统一方法
 * - ensureLogin：必须登录才能继续，未登录则弹窗 -> 跳登录页 -> 登录成功后回跳并执行回调
 * - redirectToLogin：直接跳转登录页（用于 TabBar 页拦截）
 *
 * 弹窗改为自绘组件（components/login-modal）：
 * 原生 wx.showModal 的蒙版无法自定义颜色，且与固定定位元素存在层级冲突。
 * 这里直接调用"当前栈顶页面实例"上的 openLoginModal 方法（页面混入 modalMixin 后自动具备）。
 */
const auth = require('./auth')

/** 防止弹窗重复触发 */
let prompting = false
/** 防止同一时间重复跳转登录页（TabBar 页 onShow 会多次触发） */
let redirecting = false

const LOGIN_URL = '/pages/login/login'

/**
 * 打开登录弹窗：优先用当前页面的自绘弹窗，页面未实现时回退原生弹窗
 * @param {Object} payload
 * @param {String} payload.content 提示文案
 * @param {Function} payload.onConfirm 点击"去登录"后的回调
 */
function requestModal(payload = {}) {
  const pages = getCurrentPages()
  const current = pages.length ? pages[pages.length - 1] : null
  if (current && typeof current.openLoginModal === 'function') {
    current.openLoginModal(payload)
    return
  }
  // 兜底：页面未混入弹窗能力时回退原生弹窗，保证拦截功能始终可用
  wx.showModal({
    title: '未登录',
    content: payload.content || '该功能需要登录后使用，是否前往登录？',
    confirmText: '去登录',
    cancelText: '再逛逛',
    confirmColor: '#ff5000',
    success: (res) => {
      if (res.confirm && typeof payload.onConfirm === 'function') payload.onConfirm()
    },
    complete: () => {
      prompting = false
    }
  })
}

/** 带防抖的跳转登录页 */
function goLogin() {
  if (redirecting) return
  redirecting = true
  wx.navigateTo({
    url: LOGIN_URL,
    complete: () => {
      // 页面跳转完成后解锁，允许后续再次拦截
      setTimeout(() => {
        redirecting = false
      }, 500)
    }
  })
}

/**
 * 需要登录时的统一拦截
 * @param {Object} options
 * @param {String} options.content 弹窗提示文案
 * @param {String} options.redirect 登录成功后回跳的页面地址（留空表示返回当前页）
 * @param {Function} options.success 已登录 / 登录成功后的回调
 * @param {Object} options.action 登录成功后回传给页面的待办动作，如 { type: 'addCart', goods }
 */
function ensureLogin(options = {}) {
  const {
    content = '该功能需要登录后使用',
    redirect = '',
    success,
    action = null
  } = options

  // 已登录：直接放行
  if (auth.isLogin()) {
    if (typeof success === 'function') success()
    return true
  }

  // 未登录：弹窗提示（防止重复弹窗）
  if (prompting) return false
  prompting = true
  requestModal({
    content,
    onConfirm: () => {
      const app = getApp()
      if (app) app.globalData.pendingAction = action
      auth.setRedirect(redirect)
      goLogin()
    },
    onClose: () => {
      prompting = false
    }
  })
  return false
}

/**
 * TabBar / 页面级拦截：未登录跳登录页（登录成功后可回跳）
 * 注意：必须在 onShow 中调用时保证幂等，避免"返回页面 -> 再次拦截 -> 再次跳转"的死循环
 * @param {Object} options
 * @param {String} options.redirect 登录成功后回跳地址
 * @param {Boolean} options.silent 是否静默跳转（不提示 toast）
 * @param {Function} options.onConfirm 用户确认"去登录"时的回调（用于置"正在去登录"标记）
 */
function redirectToLogin(options = {}) {
  const { redirect = '', silent = false, onConfirm } = options
  if (auth.isLogin()) return false
  if (redirect) auth.setRedirect(redirect)

  if (silent) {
    if (typeof onConfirm === 'function') onConfirm()
    goLogin()
    return true
  }

  if (prompting) return false
  prompting = true
  requestModal({
    content: '该功能需要登录后使用，是否前往登录？',
    onConfirm: () => {
      if (typeof onConfirm === 'function') onConfirm()
      goLogin()
    },
    onClose: () => {
      prompting = false
    }
  })
  return true
}

/** 重置跳转锁（登录成功后由 login 页调用，保证下次拦截可用） */
function resetRedirectFlag() {
  redirecting = false
  prompting = false
}

/**
 * 判断当前是否"刚离开本页去登录"
 * TabBar 页 onShow 拦截时用它避免死循环：
 * 用户从登录页返回（无论是否登录成功），本次 onShow 不再重复拦截，直到页面重新被切换进入
 */
let leavingForLogin = false

/** 标记：即将离开当前页去登录 */
function markLeavingForLogin() {
  leavingForLogin = true
}

/**
 * 消费"正在去登录"标记
 * @returns {Boolean} true 表示本次 onShow 是登录返回触发的，调用方应跳过拦截
 */
function consumeLeavingFlag() {
  if (leavingForLogin) {
    leavingForLogin = false
    return true
  }
  return false
}

module.exports = {
  ensureLogin,
  redirectToLogin,
  resetRedirectFlag,
  markLeavingForLogin,
  consumeLeavingFlag
}
