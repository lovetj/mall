import request from '../utils/request'

export default {
  login(data) {
    return request.post('/admin/login', data)
  },

  getAdminInfo(username) {
    return request.get('/admin/info', { username })
  },

  getCategoryList() {
    return request.get('/category/list')
  },

  getCategoryPage(params) {
    return request.get('/category/page', params)
  },

  getCategoryDetail(id) {
    return request.get(`/category/${id}`)
  },

  addCategory(data) {
    return request.post('/category', data)
  },

  updateCategory(data) {
    return request.put('/category', data)
  },

  deleteCategory(id) {
    return request.delete(`/category/${id}`)
  },

  batchDeleteCategory(ids) {
    return request.post('/category/batch-delete', ids)
  },

  updateCategoryStatus(id, status) {
    return request.put(`/category/${id}/status/${status}`)
  },

  batchUpdateCategoryStatus(ids, status) {
    return request.post('/category/batch-status', { ids, status })
  },

  getTagList() {
    return request.get('/tag/list')
  },

  getTagPage(params) {
    return request.get('/tag/page', params)
  },

  getTagDetail(id) {
    return request.get(`/tag/${id}`)
  },

  addTag(data) {
    return request.post('/tag', data)
  },

  updateTag(data) {
    return request.put('/tag', data)
  },

  deleteTag(id) {
    return request.delete(`/tag/${id}`)
  },

  batchDeleteTag(ids) {
    return request.post('/tag/batch-delete', ids)
  },

  updateTagStatus(id, status) {
    return request.put(`/tag/${id}/status/${status}`)
  },

  batchUpdateTagStatus(ids, status) {
    return request.post('/tag/batch-status', { ids, status })
  },

  getBannerList() {
    return request.get('/banner/list')
  },

  getBannerPage(params) {
    return request.get('/banner/page', params)
  },

  getBannerDetail(id) {
    return request.get(`/banner/${id}`)
  },

  addBanner(data) {
    return request.post('/banner', data)
  },

  updateBanner(data) {
    return request.put('/banner', data)
  },

  deleteBanner(id) {
    return request.delete(`/banner/${id}`)
  },

  batchDeleteBanner(ids) {
    return request.post('/banner/batch-delete', ids)
  },

  updateBannerStatus(id, status) {
    return request.put(`/banner/${id}/status/${status}`)
  },

  batchUpdateBannerStatus(ids, status) {
    return request.post('/banner/batch-status', { ids, status })
  },

  getProductPage(params) {
    return request.get('/product/page', params)
  },

  getProductDetail(id) {
    return request.get(`/product/${id}`)
  },

  addProduct(data) {
    return request.post('/product', data)
  },

  updateProduct(data) {
    return request.put('/product', data)
  },

  deleteProduct(id) {
    return request.delete(`/product/${id}`)
  },

  batchDeleteProduct(ids) {
    return request.post('/product/batch-delete', ids)
  },

  updateProductStatus(id, status) {
    return request.put(`/product/${id}/status/${status}`)
  },

  batchUpdateProductStatus(ids, status) {
    return request.post('/product/batch-status', { ids, status })
  },

  getOrderPage(params) {
    return request.get('/order/list', params)
  },

  getUserList() {
    return request.get('/user/list')
  },

  getUserPage(params) {
    return request.get('/user/page', params)
  },

  getUserDetail(id) {
    return request.get(`/user/${id}`)
  },

  addUser(data) {
    return request.post('/user', data)
  },

  updateUser(data) {
    return request.put('/user', data)
  },

  deleteUser(id) {
    return request.delete(`/user/${id}`)
  },

  batchDeleteUser(ids) {
    return request.post('/user/batch-delete', ids)
  },

  updateUserStatus(id, status) {
    return request.put(`/user/${id}/status/${status}`)
  },

  batchUpdateUserStatus(ids, status) {
    return request.post('/user/batch-status', { ids, status })
  },

  getConfig(key) {
    return request.get(`/config/${key}`)
  },

  setConfig(key, value) {
    return request.post(`/config?key=${encodeURIComponent(key)}&value=${encodeURIComponent(value || '')}`, { key, value })
  },

  getFileConfig() {
    return request.get('/file/config')
  },

  uploadFile(filePath, module = 'common', fileObj = null) {
    return request.uploadFile(filePath, module, fileObj)
  }
}
