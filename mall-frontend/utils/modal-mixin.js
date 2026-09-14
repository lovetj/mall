/**
 * 页面弹窗混入
 * 让页面具备调用自绘登录弹窗（components/login-modal）的能力。
 *
 * 使用方式：
 * 1. 页面 json 的 usingComponents 注册 "login-modal"
 * 2. 页面 wxml 中放置 <login-modal id="loginModal" bind:cancel="onLoginModalClose" />
 * 3. Page(Object.assign({}, modalMixin, { ... }))
 *    （modalMixin 放在最前面，页面自身的同名方法可覆盖）
 */
const modalMixin = {
  data: {},

  /**
   * 打开登录弹窗（供 guard 调用）
   * @param {Object} options
   * @param {String} options.content 提示文案
   * @param {Function} options.onConfirm 点击"去登录"后的回调
   * @param {Function} options.onClose 弹窗关闭（含取消）后的回调
   */
  openLoginModal(options = {}) {
    this.__modalConfirmCb = typeof options.onConfirm === 'function' ? options.onConfirm : null
    this.__modalCloseCb = typeof options.onClose === 'function' ? options.onClose : null

    const modal = this.selectComponent && this.selectComponent('#loginModal')
    if (modal && typeof modal.open === 'function') {
      modal.open({ content: options.content })
    } else if (this.__modalCloseCb) {
      // 弹窗组件缺失：及时释放 guard 的 prompting 锁，避免后续无法再拦截
      this.__modalCloseCb()
    }
  },

  /** 弹窗确认（wxml 中 bind:confirm 绑定） */
  onLoginModalConfirm() {
    const cb = this.__modalConfirmCb
    this.__modalConfirmCb = null
    const closeCb = this.__modalCloseCb
    this.__modalCloseCb = null
    if (typeof cb === 'function') cb()
    if (typeof closeCb === 'function') closeCb()
  },

  /** 弹窗取消 / 关闭（wxml 中 bind:cancel 绑定） */
  onLoginModalClose() {
    const cb = this.__modalCloseCb
    this.__modalConfirmCb = null
    this.__modalCloseCb = null
    if (typeof cb === 'function') cb()
  }
}

module.exports = modalMixin
