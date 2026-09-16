/**
 * 后端 API 接口集合，参考参考项目的 api/index.js
 */
const request = require('./request')
const config = require('./config')

const api = {
  // 公共常量导出
  BASE_URL: config.BASE_URL,
  FILE_BASE_SERVER: config.FILE_BASE_SERVER,
  formatImageUrl: config.formatImageUrl,

  // ==================== 轮播图 ====================
  getBannerList() {
    return request.get('/banner/list')
  },

  // ==================== 文件相关 ====================
  uploadFile(filePath, module = 'common', extraData = {}) {
    return request.uploadFile({
      filePath,
      name: 'file',
      formData: { module, ...extraData }
    })
  },

  // ==================== 商品分类 ====================
  getCategoryList() {
    return request.get('/category/list')
  },

  // ==================== 商品相关 ====================
  getProductList() {
    return request.get('/product/list')
  },

  getHotsellingList(params) {
    return request.get('/product/hotselling', params)
  },

  getHotsellingPage(params) {
    return request.get('/product/hotselling/page', params)
  },

  getProductByCategory(categoryId) {
    return request.get(`/product/category/${categoryId}`)
  },

  getProductDetail(id) {
    return request.get(`/product/${id}`)
  },

  getProductPage(params) {
    return request.get('/product/page', params)
  },

  // ==================== 用户认证与资料 ====================
  wxLogin(data) {
    return request.post('/user/wx-login', data)
  },

  login(data) {
    return request.post('/user/login', data)
  },

  register(data) {
    return request.post('/user/register', data)
  },

  getUserInfo() {
    return request.get('/user/info')
  },

  updateUserProfile(data) {
    return request.put('/user/profile', data)
  },

  updateUserPassword(data) {
    return request.put('/user/password', data)
  },

  // ==================== 购物车 ====================
  getCartList() {
    return request.get('/cart/list')
  },

  getCartCount() {
    return request.get('/cart/count')
  },

  addToCart(data) {
    return request.post('/cart/add', data)
  },

  updateCartQuantity(data) {
    return request.post('/cart/update', data)
  },

  changeCartQuantity(data) {
    return request.post('/cart/change', data)
  },

  deleteCartByProduct(productId) {
    return request.delete(`/cart/product/${productId}`)
  },

  deleteCartItem(id) {
    return request.delete(`/cart/${id}`)
  },

  clearCart() {
    return request.delete('/cart/clear')
  },

  // ==================== 订单相关 ====================
  checkoutOrder(data) {
    return request.post('/order/checkout', data)
  },

  createOrder(data) {
    return request.post('/order/create', data)
  },

  getOrderList(params) {
    return request.get('/order/list', params)
  },

  getOrderDetail(id) {
    return request.get(`/order/${id}`)
  },

  getOrderCounts() {
    return request.get('/order/counts')
  },

  // ==================== 收货地址 ====================
  getAddressList() {
    return request.get('/address/list')
  },

  getDefaultAddress() {
    return request.get('/address/default')
  },

  getAddressDetail(id) {
    return request.get(`/address/${id}`)
  },

  addAddress(data) {
    return request.post('/address', data)
  },

  updateAddress(data) {
    return request.put('/address', data)
  },

  deleteAddress(id) {
    return request.delete(`/address/${id}`)
  },

  setDefaultAddress(id) {
    return request.post(`/address/default/${id}`)
  },

  // ==================== 支付相关 ====================
  createPayment(data) {
    return request.post('/payment/create', data)
  },

  mockPaySuccess(paymentNo) {
    return request.post('/payment/mock-success', { paymentNo })
  },

  queryPaymentStatus(paymentNo) {
    return request.get('/payment/status', { paymentNo })
  },

  getPaymentConfig() {
    return request.get('/payment/config')
  }
}

module.exports = api
