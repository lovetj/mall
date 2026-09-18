/**
 * 网络请求封装
 * 支持 get, post, put, delete, uploadFile
 */
const config = require('./config')
const auth = require('./auth')
const guard = require('./guard')
const { KEYS } = require('./keys')

/** 401 处理的防抖标记：避免并发请求触发多次重复提示与重复刷新 */
let unauthorizedHandled = false
let unauthorizedTimer = null

/**
 * 处理登录态失效(401)：
 * 1) 清除本地登录态并刷新全局为"未登录"，使各页面不再展示过期缓存的用户信息
 * 2) 弹出统一的登录引导弹窗(复用现有 openLoginModal 组件)提示用户去登录
 */
function handleUnauthorized(message) {
  if (!unauthorizedHandled) {
    unauthorizedHandled = true
    auth.clearLoginState()
    try {
      const app = getApp()
      if (app) {
        app.globalData.isLogin = false
        app.globalData.userInfo = null
        if (typeof app.markTabsNeedRefresh === 'function') app.markTabsNeedRefresh()
        if (typeof app.refreshAllTabPages === 'function') app.refreshAllTabPages()
      }
    } catch (e) {
      console.warn('401刷新全局状态异常:', e)
    }
    // 弹出登录引导弹窗(现有登录弹窗组件), 登录成功后回跳当前页
    try {
      const pages = getCurrentPages()
      const current = pages.length ? pages[pages.length - 1] : null
      const redirect = current ? '/' + current.route : ''
      guard.ensureLogin({
        content: message || '登录已过期，请重新登录',
        redirect
      })
    } catch (e) {
      console.warn('401弹出登录引导异常:', e)
    }
  }
  if (unauthorizedTimer) clearTimeout(unauthorizedTimer)
  unauthorizedTimer = setTimeout(() => {
    unauthorizedHandled = false
  }, 2000)
}

function request(options) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync(KEYS.TOKEN) || ''
    const baseUrl = config.getBaseUrl()

    let url = options.url || ''
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `${baseUrl}${url.startsWith('/') ? url : '/' + url}`
    }

    wx.request({
      url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 200) {
          resolve(res.data.data)
        } else if (res.statusCode === 401 || (res.data && res.data.code === 401)) {
          handleUnauthorized((res.data && res.data.message) || '未登录或登录已过期')
          reject(res.data || { code: 401, message: '未登录' })
        } else {
          const errMsg = (res.data && res.data.message) || `请求失败(${res.statusCode})`
          if (!options.hideToast) {
            wx.showToast({
              title: errMsg,
              icon: 'none'
            })
          }
          reject(res.data || new Error(errMsg))
        }
      },
      fail: (err) => {
        if (!options.hideToast) {
          wx.showToast({
            title: '网络连接失败，请检查网络',
            icon: 'none'
          })
        }
        reject(err)
      }
    })
  })
}

/**
 * 文件上传封装
 */
function uploadFile(options) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync(KEYS.TOKEN) || ''
    const baseUrl = config.getBaseUrl()

    let url = options.url || '/file/upload'
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `${baseUrl}${url.startsWith('/') ? url : '/' + url}`
    }

    wx.uploadFile({
      url,
      filePath: options.filePath,
      name: options.name || 'file',
      formData: options.formData || { module: 'common' },
      header: {
        Authorization: token ? `Bearer ${token}` : '',
        ...options.header
      },
      success: (res) => {
        try {
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          if (data.code === 200) {
            resolve(data.data)
          } else {
            wx.showToast({
              title: data.message || '上传失败',
              icon: 'none'
            })
            reject(data)
          }
        } catch (e) {
          wx.showToast({
            title: '上传解析失败',
            icon: 'none'
          })
          reject(e)
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        })
        reject(err)
      }
    })
  })
}

module.exports = {
  request,
  uploadFile,
  get(url, data, options) {
    return request({ url, method: 'GET', data, ...options })
  },
  post(url, data, options) {
    return request({ url, method: 'POST', data, ...options })
  },
  put(url, data, options) {
    return request({ url, method: 'PUT', data, ...options })
  },
  delete(url, data, options) {
    return request({ url, method: 'DELETE', data, ...options })
  },
  formatImageUrl: config.formatImageUrl,
  BASE_URL: config.BASE_URL,
  FILE_BASE_SERVER: config.FILE_BASE_SERVER
}
