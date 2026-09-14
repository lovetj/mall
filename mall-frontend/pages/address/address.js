/**收货地址页（需登录） */
const auth = require('../../utils/auth')
const guard = require('../../utils/guard')
const util = require('../../utils/util')
const { KEYS } = require('../../utils/keys')
const api = require('../../utils/api')

Page({
  data: {
    address: null,
    // 编辑表单
    showForm: false,
    form: { id: null, name: '', phone: '', detail: '', isDefault: 1 }
  },

  onShow() {
    if (!auth.isLogin()) {
      guard.redirectToLogin({ redirect: '/pages/cart/cart' })
      return
    }
    this.loadAddress()
  },

  loadAddress() {
    api.getAddressList().then((res) => {
      const list = res || []
      if (Array.isArray(list) && list.length > 0) {
        const defaultAddr = list.find((a) => a.isDefault === 1) || list[0]
        const formatted = {
          id: defaultAddr.id,
          name: defaultAddr.receiverName || defaultAddr.name,
          phone: defaultAddr.receiverPhone || defaultAddr.phone,
          detail: defaultAddr.detailAddress || defaultAddr.detail,
          isDefault: defaultAddr.isDefault
        }
        this.setData({ address: formatted })
        wx.setStorageSync(KEYS.ADDRESS, formatted)
      } else {
        this.setData({ address: wx.getStorageSync(KEYS.ADDRESS) || null })
      }
    }).catch(() => {
      this.setData({ address: wx.getStorageSync(KEYS.ADDRESS) || null })
    })
  },

  /** 打开表单（新增 / 编辑） */
  onAdd() {
    const address = this.data.address
    this.setData({
      showForm: true,
      form: address
        ? { id: address.id, name: address.name, phone: address.phone, detail: address.detail, isDefault: address.isDefault || 1 }
        : { id: null, name: '', phone: '', detail: '', isDefault: 1 }
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  /** 保存地址 */
  onSave() {
    const { id, name, phone, detail, isDefault } = this.data.form
    if (!name.trim()) return util.toast('请输入收货人姓名')
    if (!/^1\d{10}$/.test(phone.trim())) return util.toast('请输入正确的手机号')
    if (!detail.trim()) return util.toast('请输入详细地址')

    const payload = {
      receiverName: name.trim(),
      receiverPhone: phone.trim(),
      province: '北京',
      city: '北京市',
      district: '朝阳区',
      detailAddress: detail.trim(),
      isDefault: isDefault || 1
    }

    const savePromise = id ? api.updateAddress({ id, ...payload }) : api.addAddress(payload)

    savePromise.then(() => {
      util.toast('保存成功', 'success')
      this.setData({ showForm: false })
      this.loadAddress()
    }).catch(() => {
      const address = {
        id: id || Date.now(),
        name: name.trim(),
        phone: phone.trim(),
        detail: detail.trim()
      }
      wx.setStorageSync(KEYS.ADDRESS, address)
      this.setData({ address, showForm: false })
      util.toast('保存成功', 'success')
    })
  },

  onCancelForm() {
    this.setData({ showForm: false })
  },

  /** 删除地址 */
  onDelete() {
    const address = this.data.address
    wx.showModal({
      title: '提示',
      content: '确定删除该收货地址？',
      confirmColor: '#ff5000',
      success: (res) => {
        if (!res.confirm) return
        if (address && address.id) {
          api.deleteAddress(address.id).then(() => {
            wx.removeStorageSync(KEYS.ADDRESS)
            this.setData({ address: null })
            util.toast('已删除')
          }).catch(() => {
            wx.removeStorageSync(KEYS.ADDRESS)
            this.setData({ address: null })
            util.toast('已删除')
          })
        } else {
          wx.removeStorageSync(KEYS.ADDRESS)
          this.setData({ address: null })
          util.toast('已删除')
        }
      }
    })
  }
})
