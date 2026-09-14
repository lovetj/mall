/**
 * 订单本地数据管理（用于"我的订单"展示）
 * 结构：{ id, createTime, status, statusText, goods: [], totalPrice, totalCount }
 */
const { KEYS } = require('./keys')

/** 订单状态字典 */
const ORDER_STATUS = {
  unpaid: '待付款',
  undelivered: '待发货',
  unreceived: '待收货',
  done: '已完成'
}

function getOrders() {
  return wx.getStorageSync(KEYS.ORDERS) || []
}

function saveOrders(list) {
  wx.setStorageSync(KEYS.ORDERS, list || [])
}

/** 生成订单号 */
function createOrderNo() {
  const now = new Date()
  const pad = (n, len = 2) => String(n).padStart(len, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(Math.floor(Math.random() * 10000), 4)}`
}

/**
 * 创建订单
 * @param {Array} goods 下单商品
 * @param {String} status 订单状态，默认待付款
 */
function createOrder(goods, status = 'unpaid') {
  const list = getOrders()
  const order = {
    id: createOrderNo(),
    createTime: formatTime(new Date()),
    status,
    statusText: ORDER_STATUS[status] || '待付款',
    goods: goods.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      count: item.count
    })),
    totalCount: goods.reduce((sum, item) => sum + item.count, 0),
    totalPrice: Math.round(goods.reduce((sum, item) => sum + item.price * item.count, 0) * 100) / 100
  }
  list.unshift(order)
  saveOrders(list)
  return order
}

/** 按状态筛选订单，status 为空表示全部 */
function getOrdersByStatus(status) {
  const list = getOrders()
  if (!status) return list
  return list.filter((item) => item.status === status)
}

/** 更新订单状态 */
function updateOrderStatus(id, status) {
  const list = getOrders()
  const index = list.findIndex((item) => item.id === id)
  if (index > -1) {
    list[index].status = status
    list[index].statusText = ORDER_STATUS[status] || list[index].statusText
    saveOrders(list)
  }
  return list
}

function formatTime(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

module.exports = {
  ORDER_STATUS,
  getOrders,
  createOrder,
  getOrdersByStatus,
  updateOrderStatus
}
