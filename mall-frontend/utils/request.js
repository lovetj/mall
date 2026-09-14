/**
 * 网络请求封装
 * 支持 get, post, put, delete, uploadFile
 */
const config = require('./config')
const { KEYS } = require('./keys')

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
          wx.showToast({
            title: (res.data && res.data.message) || '未登录或登录已过期',
            icon: 'none'
          })
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
