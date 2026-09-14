/**
 * 通用工具方法
 */

/** 生成 token（模拟服务端下发） */
function createToken() {
  return `tk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

/** 金额格式化：保留两位小数（用于展示） */
function formatPrice(price) {
  const num = Number(price || 0)
  return num.toFixed(2)
}

/** 销量格式化：超过 1 万显示 x.x万 */
function formatSales(sales) {
  const num = Number(sales || 0)
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`
  return String(num)
}

/** 轻提示 */
function toast(title, icon = 'none') {
  wx.showToast({ title, icon, duration: 1500 })
}

module.exports = { createToken, formatPrice, formatSales, toast }
