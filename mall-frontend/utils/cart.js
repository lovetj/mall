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
  const count = (list || []).reduce((sum, item) => sum + (item.count || 0), 0)
  // 通知所有页面刷新购物车数据与 TabBar 购物车角标
  try {
    const pages = getCurrentPages() || []
    pages.forEach((page) => {
      if (!page) return
      if (typeof page.refreshCart === 'function') {
        page.refreshCart()
      }
      if (typeof page.getTabBar === 'function' && page.getTabBar()) {
        page.getTabBar().setCartCount(count)
      }
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
        const key = item.id || `${item.productId}_${item.tierId || ''}`
        checkedMap[key] = item.checked
      })
      const merged = remoteList.map((item) => {
        const key = item.id || `${item.productId}_${item.tierId || ''}`
        const isOffShelf = item.status === 0
        return {
          id: item.id,
          productId: item.productId,
          tierId: item.tierId || '',
          tierName: item.tierName || '默认规格',
          name: item.productName || item.name || '',
          price: item.price,
          image: api.formatImageUrl(item.productImage || item.image),
          count: item.quantity || item.count || 1,
          checked: isOffShelf ? false : (checkedMap[key] !== undefined ? checkedMap[key] : true),
          status: item.status !== undefined ? item.status : 1
        }
      })
      saveCart(merged)
      return merged
    }
  } catch (e) {
    // 接口失败时使用本地缓存
  }
  return getCart()
}

/** 加入购物车，已存在则数量累加 */
function addToCart(goods, count = 1, tier = null) {
  const list = getCart()
  const pId = goods.id || goods.productId
  const tierId = tier ? tier.id : (goods.tierId || '')
  const tierName = tier ? tier.name : (goods.tierName || '')
  const price = tier && tier.price != null ? tier.price : goods.price
  const image = tier && tier.image ? api.formatImageUrl(tier.image) : api.formatImageUrl(goods.image)

  const index = list.findIndex((item) => {
    if (tierId) {
      return (item.productId === pId || item.id === pId) && item.tierId === tierId
    }
    return item.id === pId || item.productId === pId
  })

  if (index > -1) {
    list[index].count += count
    list[index].checked = goods.status === 0 ? false : true
    list[index].price = price
    list[index].status = goods.status !== undefined ? goods.status : list[index].status
    if (tierName) list[index].tierName = tierName
  } else {
    list.push({
      id: goods.id || pId,
      productId: goods.productId || goods.id || pId,
      tierId: tierId || '',
      tierName: tierName || '默认规格',
      name: goods.name,
      price: price,
      image: image,
      count,
      checked: goods.status === 0 ? false : true,
      status: goods.status !== undefined ? goods.status : 1
    })
  }
  saveCart(list)

  // 若已登录，同步调用后端接口
  if (auth.isLogin()) {
    api.addToCart({
      productId: pId,
      tierId: tierId || undefined,
      quantity: count
    }).catch(() => {})
  }

  return list
}

/** 更新数量（最小 1，接口调用成功后再更新本地数据与状态） */
async function updateCount(id, count, tierId) {
  const list = getCart()
  const index = list.findIndex((item) => {
    if (item.id === id) return true
    if (tierId) return item.productId === id && item.tierId === tierId
    return item.productId === id
  })
  if (index === -1) {
    return list
  }

  const targetItem = list[index]
  const targetCount = Math.max(1, count)

  if (auth.isLogin()) {
    await api.updateCartQuantity({
      cartId: targetItem.id,
      productId: targetItem.productId,
      tierId: targetItem.tierId,
      quantity: targetCount
    })
  }

  const latestList = getCart()
  const latestIndex = latestList.findIndex((item) => {
    if (item.id === id) return true
    if (tierId) return item.productId === id && item.tierId === tierId
    return item.productId === id
  })
  if (latestIndex > -1) {
    latestList[latestIndex].count = targetCount
    saveCart(latestList)
    return latestList
  }
  return list
}

/** 切换单项勾选 */
function toggleChecked(id) {
  const list = getCart()
  const index = list.findIndex((item) => item.id === id || item.productId === id)
  if (index > -1) {
    if (list[index].status === 0) {
      list[index].checked = false
    } else {
      list[index].checked = !list[index].checked
    }
    saveCart(list)
  }
  return list
}

/** 全选 / 取消全选（仅控制未下架有效商品） */
function toggleAll(checked) {
  const list = getCart().map((item) => {
    if (item.status === 0) {
      return { ...item, checked: false }
    }
    return { ...item, checked }
  })
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
    const promises = removed.map((item) => {
      const pId = item.productId || item.id
      if (item.id) {
        return api.deleteCartItem(item.id).catch(() => api.deleteCartByProduct(pId).catch(() => {}))
      }
      return api.deleteCartByProduct(pId).catch(() => {})
    })
    return Promise.all(promises).catch(() => {}).then(() => remaining)
  }

  return Promise.resolve(remaining)
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

/** 获取某个商品在购物车中的总数量（支持多规格累加） */
function getProductCartCount(productId) {
  if (!productId) return 0
  const list = getCart()
  const targetId = String(productId)
  return list
    .filter((item) => String(item.productId || '') === targetId || String(item.id || '') === targetId)
    .reduce((sum, item) => sum + (item.count || 0), 0)
}

/** 从购物车减少数量（数量为 1 时减至 0 并移除） */
function decreaseFromCart(goods, tier = null) {
  const list = getCart()
  const pId = goods.id || goods.productId
  const targetId = String(pId)
  const tierId = tier ? tier.id : (goods.tierId || '')

  const index = list.findIndex((item) => {
    const itemPid = String(item.productId || item.id || '')
    if (tierId) {
      return itemPid === targetId && item.tierId === tierId
    }
    return itemPid === targetId
  })

  if (index > -1) {
    if (list[index].count > 1) {
      list[index].count -= 1
      saveCart(list)
      if (auth.isLogin()) {
        api.updateCartQuantity({
          cartId: list[index].id,
          productId: list[index].productId,
          tierId: list[index].tierId,
          quantity: list[index].count
        }).catch(() => {})
      }
    } else {
      const deletedItem = list.splice(index, 1)[0]
      saveCart(list)
      if (auth.isLogin()) {
        if (deletedItem && deletedItem.id) {
          api.deleteCartItem(deletedItem.id).catch(() => {})
        } else {
          api.deleteCartByProduct(pId).catch(() => {})
        }
      }
    }
  }
  return list
}

/** 清空所有已下架失效商品 */
function clearOffShelf() {
  const list = getCart()
  const offShelfItems = list.filter((item) => item.status === 0)
  const remaining = list.filter((item) => item.status !== 0)
  saveCart(remaining)

  if (auth.isLogin()) {
    const promises = offShelfItems.map((item) => {
      const pId = item.productId || item.id
      if (item.id) {
        return api.deleteCartItem(item.id).catch(() => api.deleteCartByProduct(pId).catch(() => {}))
      }
      return api.deleteCartByProduct(pId).catch(() => {})
    })
    return Promise.all(promises).catch(() => {}).then(() => remaining)
  }

  return Promise.resolve(remaining)
}

/** 计算勾选商品的总数量与总金额（过滤已下架商品） */
function calcChecked(list) {
  const source = list || getCart()
  let totalCount = 0
  let totalPrice = 0
  source.forEach((item) => {
    if (item.checked && item.status !== 0) {
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
  decreaseFromCart,
  updateCount,
  toggleChecked,
  toggleAll,
  removeGoods,
  removeChecked,
  clearOffShelf,
  getCartCount,
  getProductCartCount,
  calcChecked
}
