/**
 * 购物车本地数据管理 + 后端 API 同步
 * 结构：[{ id, productId, name, price, image, count, checked }]
 */
const { KEYS } = require('./keys')
const api = require('./api')
const auth = require('./auth')

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

/** 从后端同步购物车列表到本地 */
async function syncFromRemote() {
  if (!auth.isLogin()) return getCart()
  try {
    const remoteList = await api.getCartList()
    if (Array.isArray(remoteList)) {
      const localCart = getCart()
      const checkedMap = {}
      localCart.forEach((item) => {
        checkedMap[item.id || item.productId] = item.checked
      })
      const merged = remoteList.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.productName || item.name || '',
        price: item.price,
        image: api.formatImageUrl(item.productImage || item.image),
        count: item.quantity || item.count || 1,
        checked: checkedMap[item.id] !== undefined ? checkedMap[item.id] : true
      }))
      saveCart(merged)
      return merged
    }
  } catch (e) {
    // 接口失败时使用本地缓存
  }
  return getCart()
}

/** 加入购物车，已存在则数量累加 */
function addToCart(goods, count = 1) {
  const list = getCart()
  const pId = goods.id || goods.productId
  const index = list.findIndex((item) => item.id === pId || item.productId === pId)
  if (index > -1) {
    list[index].count += count
    list[index].checked = true
  } else {
    list.push({
      id: goods.id || pId,
      productId: goods.productId || goods.id || pId,
      name: goods.name,
      price: goods.price,
      image: api.formatImageUrl(goods.image),
      count,
      checked: true
    })
  }
  saveCart(list)

  // 若已登录，同步调用后端接口
  if (auth.isLogin()) {
    api.addToCart({
      productId: pId,
      quantity: count
    }).catch(() => {})
  }

  return list
}

/** 更新数量（最小 1） */
function updateCount(id, count) {
  const list = getCart()
  const index = list.findIndex((item) => item.id === id || item.productId === id)
  if (index > -1) {
    const targetCount = Math.max(1, count)
    list[index].count = targetCount
    saveCart(list)

    if (auth.isLogin()) {
      api.updateCartQuantity({
        productId: list[index].productId || list[index].id,
        quantity: targetCount
      }).catch(() => {})
    }
  }
  return list
}

/** 切换单项勾选 */
function toggleChecked(id) {
  const list = getCart()
  const index = list.findIndex((item) => item.id === id || item.productId === id)
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
  const list = getCart()
  const removed = list.filter((item) => idList.indexOf(item.id) > -1 || idList.indexOf(item.productId) > -1)
  const remaining = list.filter((item) => idList.indexOf(item.id) === -1 && idList.indexOf(item.productId) === -1)
  saveCart(remaining)

  if (auth.isLogin()) {
    removed.forEach((item) => {
      const pId = item.productId || item.id
      api.deleteCartByProduct(pId).catch(() => {})
    })
  }

  return remaining
}

/** 清空已勾选商品（下单成功后调用） */
function removeChecked() {
  const list = getCart()
  const checkedItems = list.filter((item) => item.checked)
  const remaining = list.filter((item) => !item.checked)
  saveCart(remaining)

  if (auth.isLogin()) {
    checkedItems.forEach((item) => {
      const pId = item.productId || item.id
      api.deleteCartByProduct(pId).catch(() => {})
    })
  }

  return remaining
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
  syncFromRemote,
  addToCart,
  updateCount,
  toggleChecked,
  toggleAll,
  removeGoods,
  removeChecked,
  getCartCount,
  calcChecked
}
