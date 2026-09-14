/**收货地址页（需登录） */
const auth = require('../../utils/auth')
const guard = require('../../utils/guard')
const util = require('../../utils/util')
const { KEYS } = require('../../utils/keys')

Page({
  data: {
    address: null,
    // 编辑表单
    showForm: false,
    form: { name: '', phone: '', detail: '' }
  },

  onShow() {
    if (!auth.isLogin()) {
      guard.redirectToLogin({ redirect: '/pages/cart/cart' })
      return
    }
    this.loadAddress()
  },

  loadAddress() {
    this.setData({ address: wx.getStorageSync(KEYS.ADDRESS) || null })
  },

  /** 打开表单（新增 / 编辑） */
  onAdd() {
    const address = this.data.address
    this.setData({
      showForm: true,
      form: address
        ? { name: address.name, phone: address.phone, detail: address.detail }
        : { name: '', phone: '', detail: '' }
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  /** 保存地址 */
  onSave() {
    const { name, phone, detail } = this.data.form
    if (!name.trim()) return util.toast('请输入收货人姓名')
    if (!/^1\d{10}$/.test(phone.trim())) return util.toast('请输入正确的手机号')
    if (!detail.trim()) return util.toast('请输入详细地址')

    const address = {
      id: Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      detail: detail.trim()
    }
    wx.setStorageSync(KEYS.ADDRESS, address)
    this.setData({ address, showForm: false })
    util.toast('保存成功', 'success')
  },

  onCancelForm() {
    this.setData({ showForm: false })
  },

  /** 删除地址 */
  onDelete() {
    wx.showModal({
      title: '提示',
      content: '确定删除该收货地址？',
      confirmColor: '#ff5000',
      success: (res) => {
        if (!res.confirm) return
        wx.removeStorageSync(KEYS.ADDRESS)
        this.setData({ address: null })
        util.toast('已删除')
      }
    })
  }
})
