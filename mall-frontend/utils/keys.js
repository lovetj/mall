/**
 * 本地缓存 key 统一管理
 */
const KEYS = {
  TOKEN: 'mall_token',
  USER_INFO: 'mall_user_info',
  LOGIN_TIME: 'mall_login_time',
  CART: 'mall_cart',
  ORDERS: 'mall_orders',
  ADDRESS: 'mall_address',
  CHECKOUT: 'mall_checkout',
  REDIRECT: 'mall_redirect'
}

/** token 有效期：7 天 */
const TOKEN_EXPIRE = 7 * 24 * 60 * 60 * 1000

module.exports = { KEYS, TOKEN_EXPIRE }
