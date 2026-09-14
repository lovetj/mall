/**
 * 全局配置与常量
 * BASE_URL 和 FILE_BASE_SERVER 提取为公共变量供所有页面使用
 */

// 后端 API 根地址
// const BASE_URL = 'http://2uu4401930iw.vicp.fun:42900/api'
const BASE_URL = 'http://localhost:8080/api'

// 文件服务器地址（前端直接配置，用于图片展示等）
const FILE_BASE_SERVER = 'http://localhost:8081/sunny_file'

function getBaseUrl() {
  return BASE_URL
}

function getFileBaseServer() {
  return FILE_BASE_SERVER
}

/**
 * 格式化图片 URL
 * - 对象：提取 relativePath / url / path
 * - 相对路径（/product/xxx.jpg）：拼接 FILE_BASE_SERVER
 * - 完整 URL 或本地 static/临时文件：原样返回
 */
function formatImageUrl(path) {
  if (!path) return ''
  let targetPath = path
  if (typeof path === 'object') {
    targetPath = path.relativePath || path.url || path.path || ''
  }
  if (!targetPath || typeof targetPath !== 'string') return ''

  // 已经是完整网络 URL 或本地临时文件/静态资源
  if (
    targetPath.startsWith('http://') ||
    targetPath.startsWith('https://') ||
    targetPath.startsWith('data:') ||
    targetPath.startsWith('blob:') ||
    targetPath.startsWith('wxfile://') ||
    targetPath.startsWith('/static/')
  ) {
    return targetPath
  }

  const base = getFileBaseServer()
  if (!base) return targetPath
  const cleanPath = targetPath.startsWith('/') ? targetPath : '/' + targetPath
  return base + cleanPath
}

module.exports = {
  BASE_URL,
  FILE_BASE_SERVER,
  getFileBaseServer,
  getBaseUrl,
  formatImageUrl
}
