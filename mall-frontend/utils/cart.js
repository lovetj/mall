/**
 * 购物车本地数据管理
 * 结构：[{ id, name, price, image, count, checked }]
 */
const { KEYS } = require('./keys')

function getCart() {
  return wx.getStorageSync(KEYS.CART) || []
}

function saveCart(list) {
  wx.setStorageSync(KEYS.CART, list || [])
  // 通知其他页面刷新
  try {
    const pages = getCurrentPages()
    pages.forEach((page) => {
      if (page && typeof page.refreshCart === 'function') page.refreshCart()
    })
  } catch (e) {
    // ignore
  }
}

/** 加入购物车，已存在则数量累加 */
function addToCart(goods, count = 1) {
  const list = getCart()
  const index = list.findIndex((item) => item.id === goods.id)
  if (index > -1) {
    list[index].count += count
    list[index].checked = true
  } else {
    list.push({
      id: goods.id,
      name: goods.name,
      price: goods.price,
      image: goods.image,
      count,
      checked: true
    })
  }
  saveCart(list)
  return list
}

/** 更新数量（最小 1） */
function updateCount(id, count) {
  const list = getCart()
  const index = list.findIndex((item) => item.id === id)
  if (index > -1) {
    list[index].count = Math.max(1, count)
    saveCart(list)
  }
  return list
}

/** 切换单项勾选 */
function toggleChecked(id) {
  const list = getCart()
  const index = list.findIndex((item) => item.id === id)
  if (index > -1) {
    list[index].checked = !list[index].checked
    saveCart(list)
  }
  return list
}

/** 全选 / 取消全选 */
function toggleAll(checked) {
  const list = getCart().map((item) => ({ ...item, checked }))
  saveCart(list)
  return list
}

/** 删除商品 */
function removeGoods(ids) {
  const idList = Array.isArray(ids) ? ids : [ids]
  const list = getCart().filter((item) => idList.indexOf(item.id) === -1)
  saveCart(list)
  return list
}

/** 清空已勾选商品（下单成功后调用） */
function removeChecked() {
  const list = getCart().filter((item) => !item.checked)
  saveCart(list)
  return list
}

/** 购物车商品总数 */
function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.count, 0)
}

/** 计算勾选商品的总数量与总金额 */
function calcChecked(list) {
  const source = list || getCart()
  let totalCount = 0
  let totalPrice = 0
  source.forEach((item) => {
    if (item.checked) {
      totalCount += item.count
      totalPrice += item.price * item.count
    }
  })
  return {
    totalCount,
    totalPrice: Math.round(totalPrice * 100) / 100
  }
}

module.exports = {
  getCart,
  saveCart,
  addToCart,
  updateCount,
  toggleChecked,
  toggleAll,
  removeGoods,
  removeChecked,
  getCartCount,
  calcChecked
}
