/**
 * 本地模拟数据（商品、分类、轮播图、订单、地址）
 */

const banners = [
  { id: 1, image: 'https://picsum.photos/seed/banner1/750/360', title: '新人专享 立减 50 元' },
  { id: 2, image: 'https://picsum.photos/seed/banner2/750/360', title: '数码家电 满 1000 减 200' },
  { id: 3, image: 'https://picsum.photos/seed/banner3/750/360', title: '生鲜食品 第二件半价' },
  { id: 4, image: 'https://picsum.photos/seed/banner4/750/360', title: '限时秒杀 每晚 8 点开抢' }
]

/** 分类页左侧列表：前两项为虚拟分类（全部 / 热销商品），其余为真实分类 */
const categories = [
  { id: 'all', name: '全部', icon: '🧭', virtual: true },
  { id: 'hot', name: '热销商品', icon: '🔥', virtual: true },
  { id: 'c1', name: '手机数码', icon: '📱' },
  { id: 'c2', name: '电脑办公', icon: '💻' },
  { id: 'c3', name: '家用电器', icon: '🔌' },
  { id: 'c4', name: '服饰鞋包', icon: '👕' },
  { id: 'c5', name: '生鲜食品', icon: '🍎' },
  { id: 'c6', name: '美妆护肤', icon: '💄' },
  { id: 'c7', name: '运动户外', icon: '⚽' },
  { id: 'c8', name: '图书文娱', icon: '📚' }
]

const goods = [
  { id: 1001, categoryId: 'c1', name: '智能手机 Pro 12+256G 全网通', price: 3299, sales: 8621, image: 'https://picsum.photos/seed/g1001/400/400' },
  { id: 1002, categoryId: 'c1', name: '真无线蓝牙耳机 降噪版', price: 399, sales: 15230, image: 'https://picsum.photos/seed/g1002/400/400' },
  { id: 1003, categoryId: 'c1', name: '智能手环 血氧心率监测', price: 249, sales: 4231, image: 'https://picsum.photos/seed/g1003/400/400' },
  { id: 1004, categoryId: 'c1', name: '65W 氮化镓充电器 三口', price: 129, sales: 9812, image: 'https://picsum.photos/seed/g1004/400/400' },
  { id: 1005, categoryId: 'c2', name: '轻薄笔记本 14 英寸 16G', price: 4999, sales: 1220, image: 'https://picsum.photos/seed/g1005/400/400' },
  { id: 1006, categoryId: 'c2', name: '无线机械键盘 87 键', price: 459, sales: 3320, image: 'https://picsum.photos/seed/g1006/400/400' },
  { id: 1007, categoryId: 'c2', name: '2K 显示器 27 英寸 IPS', price: 1299, sales: 2011, image: 'https://picsum.photos/seed/g1007/400/400' },
  { id: 1008, categoryId: 'c2', name: '人体工学办公椅 可躺', price: 899, sales: 1560, image: 'https://picsum.photos/seed/g1008/400/400' },
  { id: 1009, categoryId: 'c3', name: '变频空调 1.5 匹 一级能效', price: 2599, sales: 980, image: 'https://picsum.photos/seed/g1009/400/400' },
  { id: 1010, categoryId: 'c3', name: '滚筒洗衣机 10 公斤', price: 2199, sales: 1320, image: 'https://picsum.photos/seed/g1010/400/400' },
  { id: 1011, categoryId: 'c3', name: '扫地机器人 自动集尘', price: 1899, sales: 2760, image: 'https://picsum.photos/seed/g1011/400/400' },
  { id: 1012, categoryId: 'c3', name: '空气炸锅 5L 大容量', price: 299, sales: 8421, image: 'https://picsum.photos/seed/g1012/400/400' },
  { id: 1013, categoryId: 'c4', name: '纯棉圆领 T 恤 男女同款', price: 89, sales: 21300, image: 'https://picsum.photos/seed/g1013/400/400' },
  { id: 1014, categoryId: 'c4', name: '轻薄羽绒服 90 白鸭绒', price: 599, sales: 3410, image: 'https://picsum.photos/seed/g1014/400/400' },
  { id: 1015, categoryId: 'c4', name: '帆布休闲鞋 透气防滑', price: 199, sales: 6720, image: 'https://picsum.photos/seed/g1015/400/400' },
  { id: 1016, categoryId: 'c4', name: '真皮双肩包 商务通勤', price: 329, sales: 1120, image: 'https://picsum.photos/seed/g1016/400/400' },
  { id: 1017, categoryId: 'c5', name: '新疆阿克苏苹果 5 斤', price: 39.9, sales: 32100, image: 'https://picsum.photos/seed/g1017/400/400' },
  { id: 1018, categoryId: 'c5', name: '冷鲜牛排套餐 10 片', price: 158, sales: 5320, image: 'https://picsum.photos/seed/g1018/400/400' },
  { id: 1019, categoryId: 'c5', name: '现磨挂耳咖啡 20 包', price: 69, sales: 12400, image: 'https://picsum.photos/seed/g1019/400/400' },
  { id: 1020, categoryId: 'c5', name: '每日坚果混合装 30 袋', price: 79, sales: 9800, image: 'https://picsum.photos/seed/g1020/400/400' },
  { id: 1021, categoryId: 'c6', name: '氨基酸洁面乳 温和清洁', price: 59, sales: 18700, image: 'https://picsum.photos/seed/g1021/400/400' },
  { id: 1022, categoryId: 'c6', name: '保湿精华液 30ml', price: 269, sales: 4210, image: 'https://picsum.photos/seed/g1022/400/400' },
  { id: 1023, categoryId: 'c6', name: '防晒霜 SPF50+ 清爽', price: 129, sales: 7630, image: 'https://picsum.photos/seed/g1023/400/400' },
  { id: 1024, categoryId: 'c6', name: '口红礼盒 三支装', price: 199, sales: 2890, image: 'https://picsum.photos/seed/g1024/400/400' },
  { id: 1025, categoryId: 'c7', name: '碳素羽毛球拍 单支装', price: 189, sales: 2310, image: 'https://picsum.photos/seed/g1025/400/400' },
  { id: 1026, categoryId: 'c7', name: '专业跑步鞋 缓震回弹', price: 459, sales: 6120, image: 'https://picsum.photos/seed/g1026/400/400' },
  { id: 1027, categoryId: 'c7', name: '折叠露营椅 承重 150kg', price: 119, sales: 5320, image: 'https://picsum.photos/seed/g1027/400/400' },
  { id: 1028, categoryId: 'c7', name: '瑜伽垫 TPE 加厚防滑', price: 89, sales: 8120, image: 'https://picsum.photos/seed/g1028/400/400' },
  { id: 1029, categoryId: 'c8', name: '畅销小说套装 全 5 册', price: 128, sales: 3210, image: 'https://picsum.photos/seed/g1029/400/400' },
  { id: 1030, categoryId: 'c8', name: '儿童绘本 精装 20 册', price: 158, sales: 4120, image: 'https://picsum.photos/seed/g1030/400/400' },
  { id: 1031, categoryId: 'c8', name: '中性笔 0.5mm 24 支装', price: 29.9, sales: 15300, image: 'https://picsum.photos/seed/g1031/400/400' },
  { id: 1032, categoryId: 'c8', name: '桌面台历 2026 创意款', price: 39, sales: 2210, image: 'https://picsum.photos/seed/g1032/400/400' }
]

/** 首页热销商品（按销量排序取前 N 个） */
function getHotGoods(limit = 8) {
  return goods.slice().sort((a, b) => b.sales - a.sales).slice(0, limit)
}

/**
 * 按分类取商品
 * - 'all'  全部商品
 * - 'hot'  热销商品（按销量倒序，取前 12 个）
 * - 其它   对应分类下的商品
 */
function getGoodsByCategory(categoryId) {
  if (categoryId === 'all') return goods.slice()
  if (categoryId === 'hot') return getHotGoods(12)
  return goods.filter((item) => item.categoryId === categoryId)
}

/** 关键字搜索 */
function searchGoods(keyword) {
  const kw = (keyword || '').trim()
  if (!kw) return []
  return goods.filter((item) => item.name.indexOf(kw) > -1)
}

module.exports = {
  banners,
  categories,
  goods,
  getHotGoods,
  getGoodsByCategory,
  searchGoods
}
