import api from '../api/index'
import { formatImageUrl } from './request'

/**
 * 通用单图片选择并上传方法
 * @param {Object} options
 * @param {string} options.module 存储模块/目录，如 'category', 'product'
 * @param {number} options.maxSizeMB 最大文件大小限制（MB），默认 50MB
 * @param {string} options.loadingTitle 上传中的 Loading 提示，默认 '正在上传图片...'
 * @param {string} options.successTitle 上传成功提示，默认 '上传成功'
 * @returns {Promise<{ relativePath: string, url: string, originalName?: string }>}
 */
export function chooseAndUploadSingleImage(options = {}) {
  const {
    module = 'common',
    maxSizeMB = 50,
    loadingTitle = '正在上传图片...',
    successTitle = '上传成功'
  } = options

  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      success: async (res) => {
        const tempFile = (res.tempFiles && res.tempFiles[0]) || null
        const tempPath = (res.tempFilePaths && res.tempFilePaths[0]) || ''
        const fileObj = tempFile ? (tempFile.file || (tempFile instanceof File ? tempFile : null)) : null

        const fileSize = (fileObj && fileObj.size) || (tempFile && tempFile.size) || 0
        if (fileSize > maxSizeMB * 1024 * 1024) {
          const sizeMb = (fileSize / (1024 * 1024)).toFixed(1)
          const msg = `图片大小(${sizeMb}MB)超出${maxSizeMB}MB限制，请压缩后上传`
          uni.showToast({
            title: msg,
            icon: 'none',
            duration: 3000
          })
          reject(new Error(msg))
          return
        }

        uni.showLoading({ title: loadingTitle })
        try {
          const data = await api.uploadFile(tempPath, module, fileObj)
          uni.hideLoading()
          if (data && (data.relativePath || typeof data === 'string')) {
            if (successTitle) {
              uni.showToast({ title: successTitle, icon: 'success' })
            }
            resolve(typeof data === 'string' ? { relativePath: data, url: formatImageUrl(data) } : data)
          } else {
            throw new Error('上传返回数据异常')
          }
        } catch (e) {
          uni.hideLoading()
          const errText = (e && (e.message || e.errMsg)) || '上传图片失败'
          uni.showToast({
            title: errText,
            icon: 'none',
            duration: 3500
          })
          console.error('上传图片失败', e)
          reject(e)
        }
      },
      fail: (err) => {
        if (err && (err.errMsg || '').includes('cancel')) {
          return
        }
        console.warn('chooseImage failed', err)
      }
    })
  })
}

export default {
  chooseAndUploadSingleImage
}
