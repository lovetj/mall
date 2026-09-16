/**
 * 购物车数据管理 + 后端 API 实时同步
 * 结构：[{ id, productId, name, price, image, count, checked }]
 * 注意：不使用本地 Storage 缓存，纯内存维护并与后端实时交互
 */
const { KEYS } = require('./keys')
const api = require('./api')
const auth = require('./auth')

// 纯内存列表，不落 Storage 缓存
let memoryCartList = []
let syncingPromise = null

// 清理历史可能遗留的 Storage 缓存
try {
  wx.removeStorageSync(KEYS.CART)
} catch (e) {}

function getCart() {
  return memoryCartList
}

function saveCart(list) {
  memoryCartList = list || []
  const count = memoryCartList.reduce((sum, item) => sum + (item.count || 0), 0)
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

/** 从后端同步购物车列表到内存 */
async function syncFromRemote() {
  if (!auth.isLogin()) {
    saveCart([])
    return []
  }
  if (syncingPromise) {
    return syncingPromise
  }
  syncingPromise = (async () => {
    try {
      const remoteList = await api.getCartList()
      if (Array.isArray(remoteList)) {
        const localCart = memoryCartList
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
      // 接口失败时使用当前内存数据
    } finally {
      syncingPromise = null
    }
    return memoryCartList
  })()
  return syncingPromise
}

/** 加入购物车，已存在则数量累加（登录状态下接口成功后再写入本地与缓存） */
async function addToCart(goods, count = 1, tier = null) {
  const pId = goods.id || goods.productId
  const targetId = String(pId)
  const tierId = tier ? tier.id : (goods.tierId || '')
  const tierName = tier ? tier.name : (goods.tierName || '')
  const price = tier && tier.price != null ? tier.price : goods.price
  const image = tier && tier.image ? api.formatImageUrl(tier.image) : api.formatImageUrl(goods.image)

  // 若已登录，先调用后端接口添加
  if (auth.isLogin()) {
    await api.addToCart({
      productId: pId,
      tierId: tierId || undefined,
      quantity: count
    })
  }

  const list = getCart()
  const index = list.findIndex((item) => {
    const itemPid = String(item.productId != null && item.productId !== '' ? item.productId : (item.id || ''))
    if (tierId) {
      return itemPid === targetId && item.tierId === tierId
    }
    return itemPid === targetId
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

/** 删除商品（接口调用成功后再更新本地数据与缓存） */
async function removeGoods(ids) {
  const idList = (Array.isArray(ids) ? ids : [ids]).map((it) => String(it))
  const list = getCart()
  const removed = list.filter((item) => idList.indexOf(String(item.id)) > -1 || idList.indexOf(String(item.productId)) > -1)

  if (auth.isLogin() && removed.length > 0) {
    const promises = removed.map((item) => {
      const pId = item.productId || item.id
      if (item.id) {
        return api.deleteCartItem(item.id).catch(() => api.deleteCartByProduct(pId))
      }
      return api.deleteCartByProduct(pId)
    })
    await Promise.all(promises)
  }

  const latestList = getCart()
  const remaining = latestList.filter((item) => idList.indexOf(String(item.id)) === -1 && idList.indexOf(String(item.productId)) === -1)
  saveCart(remaining)
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

/** 获取某个商品在购物车中的总数量（支持多规格累加） */
function getProductCartCount(productId) {
  if (!productId) return 0
  const list = getCart()
  const targetId = String(productId)
  return list
    .filter((item) => {
      const pid = String(item.productId != null && item.productId !== '' ? item.productId : (item.id || ''))
      return pid === targetId
    })
    .reduce((sum, item) => sum + (item.count || 0), 0)
}

/** 从购物车减少数量（数量为 1 时减至 0 并移除，接口成功后再更新本地数据与状态） */
async function decreaseFromCart(goods, tier = null) {
  const list = getCart()
  const pId = goods.id || goods.productId
  const targetId = String(pId)
  const tierId = tier ? tier.id : (goods.tierId || '')

  const index = list.findIndex((item) => {
    const itemPid = String(item.productId != null && item.productId !== '' ? item.productId : (item.id || ''))
    if (tierId) {
      return itemPid === targetId && item.tierId === tierId
    }
    return itemPid === targetId
  })

  if (index === -1) {
    return list
  }

  const targetItem = list[index]
  const currentCount = targetItem.count || 1

  if (currentCount > 1) {
    const nextCount = currentCount - 1
    if (auth.isLogin()) {
      await api.updateCartQuantity({
        cartId: targetItem.id,
        productId: targetItem.productId || targetItem.id,
        tierId: targetItem.tierId,
        quantity: nextCount
      })
    }
    const latestList = getCart()
    const latestIndex = latestList.findIndex((item) => {
      const itemPid = String(item.productId != null && item.productId !== '' ? item.productId : (item.id || ''))
      if (tierId) {
        return itemPid === targetId && item.tierId === tierId
      }
      return itemPid === targetId
    })
    if (latestIndex > -1) {
      latestList[latestIndex].count = nextCount
      saveCart(latestList)
      return latestList
    }
  } else {
    if (auth.isLogin()) {
      if (targetItem.id) {
        try {
          await api.deleteCartItem(targetItem.id)
        } catch (e) {
          await api.deleteCartByProduct(targetItem.productId || pId)
        }
      } else {
        await api.deleteCartByProduct(targetItem.productId || pId)
      }
    }
    const latestList = getCart()
    const latestIndex = latestList.findIndex((item) => {
      const itemPid = String(item.productId != null && item.productId !== '' ? item.productId : (item.id || ''))
      if (tierId) {
        return itemPid === targetId && item.tierId === tierId
      }
      return itemPid === targetId
    })
    if (latestIndex > -1) {
      latestList.splice(latestIndex, 1)
      saveCart(latestList)
      return latestList
    }
  }
  return getCart()
}

/** 清空所有已下架失效商品（接口成功后再清空本地与缓存） */
async function clearOffShelf() {
  const list = getCart()
  const offShelfItems = list.filter((item) => item.status === 0)

  if (auth.isLogin() && offShelfItems.length > 0) {
    const promises = offShelfItems.map((item) => {
      const pId = item.productId || item.id
      if (item.id) {
        return api.deleteCartItem(item.id).catch(() => api.deleteCartByProduct(pId))
      }
      return api.deleteCartByProduct(pId)
    })
    await Promise.all(promises)
  }

  const latestList = getCart()
  const remaining = latestList.filter((item) => item.status !== 0)
  saveCart(remaining)
  return remaining
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

/**
 * 加购 / 增减购物车前，实时向后端确认商品是否已删除(is_del=1)或已下架(status!=1)。
 * 商品列表接口已过滤已删除商品，但页面数据可能滞后，故此处以详情接口为准。
 * @param {object} goods 商品对象(至少含 id/productId)
 * @returns {Promise<{ok:boolean, product?:object, message?:string}>}
 *   ok=false 时不可购买，message 为提示文案
 *   网络异常时放行(返回 ok=true)，交由后端 /cart、/order 最终拦截
 */
function checkBuyable(goods) {
  const id = goods && (goods.id || goods.productId)
  if (!id) return Promise.resolve({ ok: false, message: '商品不存在' })
  return api.getProductDetail(id).then((p) => {
    if (!p || !p.id || p.isDel === 1) {
      return { ok: false, message: '商品已删除或不存在' }
    }
    if (p.status !== undefined && p.status !== 1) {
      return { ok: false, message: '商品已下架，暂不支持购买' }
    }
    return { ok: true, product: p }
  }).catch(() => ({ ok: true }) )
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
  calcChecked,
  checkBuyable
}
