/**
 * 登录态管理：token / 用户信息的读写、校验、清除
 */
const { KEYS, TOKEN_EXPIRE } = require('./keys')

/** 写入登录态 */
function setLoginState(token, userInfo) {
  wx.setStorageSync(KEYS.TOKEN, token)
  wx.setStorageSync(KEYS.USER_INFO, userInfo || {})
  wx.setStorageSync(KEYS.LOGIN_TIME, Date.now())
}

/** 读取登录态 */
function getLoginState() {
  return {
    token: wx.getStorageSync(KEYS.TOKEN) || '',
    userInfo: wx.getStorageSync(KEYS.USER_INFO) || null,
    loginTime: wx.getStorageSync(KEYS.LOGIN_TIME) || 0
  }
}

/** 本地登录态是否有效（存在 token 且未过期） */
function isLogin() {
  const { token, loginTime } = getLoginState()
  if (!token) return false
  if (!loginTime) return false
  return Date.now() - loginTime < TOKEN_EXPIRE
}

/** 清除本地登录态（购物车、订单保留） */
function clearLoginState() {
  wx.removeStorageSync(KEYS.TOKEN)
  wx.removeStorageSync(KEYS.USER_INFO)
  wx.removeStorageSync(KEYS.LOGIN_TIME)
}

let memoryRedirectUrl = ''

try {
  wx.removeStorageSync(KEYS.REDIRECT)
} catch (e) {}

/** 保存登录成功后需要回跳的页面（纯内存变量） */
function setRedirect(url) {
  memoryRedirectUrl = url || ''
}

/** 读取回跳地址（不清除），用于登录页展示 */
function peekRedirect() {
  return memoryRedirectUrl || ''
}

/** 取出并清空回跳地址 */
function takeRedirect() {
  const url = memoryRedirectUrl || ''
  memoryRedirectUrl = ''
  return url
}

module.exports = {
  setLoginState,
  getLoginState,
  isLogin,
  clearLoginState,
  setRedirect,
  peekRedirect,
  takeRedirect
}
