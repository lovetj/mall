/**
 * 收货地址管理页（支持列表管理、默认设置、微信实时定位/地图选点、省市区解析、门牌号及标签设置）
 */
const auth = require('../../utils/auth')
const guard = require('../../utils/guard')
const util = require('../../utils/util')
const api = require('../../utils/api')

Page({
  data: {
    addressList: [],
    loading: false,
    showForm: false,
    fromPage: '',
    // 常用地址标签
    typeOptions: ['家', '公司', '学校'],
    form: {
      id: null,
      receiverName: '',
      phone: '',
      receiverPhone: '',
      region: ['北京市', '北京市', '朝阳区'],
      province: '北京市',
      city: '北京市',
      district: '朝阳区',
      detailAddress: '',
      houseNumber: '',
      addressType: '家',
      latitude: null,
      longitude: null,
      isDefault: 0
    },
    // 地图选点标记
    mapMarkers: []
  },

  onLoad(options) {
    if (options && options.from) {
      this.setData({ fromPage: options.from })
    }
  },

  onShow() {
    if (!auth.isLogin()) {
      guard.redirectToLogin({ redirect: '/pages/address/address' })
      return
    }
    this.loadAddressList()
  },

  /** 加载地址列表 */
  loadAddressList() {
    this.setData({ loading: true })
    api.getAddressList().then((res) => {
      const list = Array.isArray(res) ? res : []
      this.setData({ addressList: list, loading: false })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  /** 选择地址返回（如从购物车/结算页进入） */
  onSelectAddress(e) {
    if (this.data.fromPage === 'cart' || this.data.fromPage === 'checkout') {
      const id = e.currentTarget.dataset.id
      const selected = this.data.addressList.find((item) => item.id === id)
      if (selected) {
        const app = getApp()
        if (app) {
          app.globalData.selectedAddress = selected
        }
        wx.navigateBack()
      }
    }
  },

  /** 打开新增表单 */
  onAdd() {
    this.setData({
      showForm: true,
      form: {
        id: null,
        receiverName: '',
        phone: '',
        receiverPhone: '',
        region: ['北京市', '北京市', '朝阳区'],
        province: '北京市',
        city: '北京市',
        district: '朝阳区',
        detailAddress: '',
        houseNumber: '',
        addressType: '家',
        latitude: null,
        longitude: null,
        isDefault: this.data.addressList.length === 0 ? 1 : 0
      },
      mapMarkers: []
    })
  },

  /** 打开编辑表单 */
  onEdit(e) {
    const id = e.currentTarget.dataset.id
    const addr = this.data.addressList.find((item) => item.id === id)
    if (!addr) return

    const province = addr.province || '北京市'
    const city = addr.city || '北京市'
    const district = addr.district || '朝阳区'
    const lat = addr.latitude ? Number(addr.latitude) : null
    const lng = addr.longitude ? Number(addr.longitude) : null
    const phoneVal = addr.phone || addr.receiverPhone || ''

    let markers = []
    if (lat && lng) {
      markers = [{
        id: 1,
        latitude: lat,
        longitude: lng,
        title: addr.detailAddress || '收货位置',
        width: 24,
        height: 24
      }]
    }

    this.setData({
      showForm: true,
      form: {
        id: addr.id,
        receiverName: addr.receiverName || addr.name || '',
        phone: phoneVal,
        receiverPhone: phoneVal,
        region: [province, city, district],
        province,
        city,
        district,
        detailAddress: addr.detailAddress || '',
        houseNumber: addr.houseNumber || '',
        addressType: addr.addressType || '家',
        latitude: lat,
        longitude: lng,
        isDefault: addr.isDefault || 0
      },
      mapMarkers: markers
    })
  },

  /** 微信原生定位与地图选点 */
  onChooseLocation() {
    const that = this
    // 先尝试调用 chooseLocation 打开地图
    const openMapChooser = (latitude, longitude) => {
      const chooseParams = {}
      if (latitude && longitude) {
        chooseParams.latitude = latitude
        chooseParams.longitude = longitude
      }
      wx.chooseLocation({
        ...chooseParams,
        success: (res) => {
          // res: { name, address, latitude, longitude }
          const parsed = that.parseAddressString(res.address)
          
          const region = [
            parsed.province || that.data.form.province,
            parsed.city || that.data.form.city,
            parsed.district || that.data.form.district
          ]

          that.setData({
            'form.latitude': res.latitude,
            'form.longitude': res.longitude,
            'form.detailAddress': res.name || res.address,
            'form.province': region[0],
            'form.city': region[1],
            'form.district': region[2],
            'form.region': region,
            mapMarkers: [{
              id: 1,
              latitude: res.latitude,
              longitude: res.longitude,
              title: res.name || '已选位置',
              width: 24,
              height: 24
            }]
          })
          util.toast('已成功定位选点', 'success')
        },
        fail: (err) => {
          if (err && err.errMsg && err.errMsg.indexOf('auth') > -1) {
            wx.showModal({
              title: '提示',
              content: '需要获取您的地理位置权限以在地图上选点，请前往设置开启',
              confirmText: '去开启',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.openSetting()
                }
              }
            })
          }
        }
      })
    }

    // 先尝试获取用户当前实时定位，若已获取则以当前位置为中心拉起地图
    wx.getLocation({
      type: 'gcj02',
      success: (locRes) => {
        openMapChooser(locRes.latitude, locRes.longitude)
      },
      fail: () => {
        // 获取当前位置失败时直接打开地图选点
        openMapChooser()
      }
    })
  },

  /** 一键导入微信收货地址 */
  onImportWxAddress() {
    const that = this
    wx.chooseAddress({
      success: (res) => {
        // res: { userName, postalCode, provinceName, cityName, countyName, detailInfo, nationalCode, telNumber }
        const region = [res.provinceName || '北京市', res.cityName || '北京市', res.countyName || '朝阳区']
        const phoneVal = res.telNumber || ''
        that.setData({
          showForm: true,
          'form.receiverName': res.userName || '',
          'form.phone': phoneVal,
          'form.receiverPhone': phoneVal,
          'form.province': region[0],
          'form.city': region[1],
          'form.district': region[2],
          'form.region': region,
          'form.detailAddress': res.detailInfo || ''
        })
        util.toast('已导入微信地址', 'success')
      },
      fail: (err) => {
        if (err && err.errMsg && err.errMsg.indexOf('auth') > -1) {
          wx.showModal({
            title: '提示',
            content: '需要通讯地址授权以导入微信地址',
            confirmText: '去开启',
            success: (modalRes) => {
              if (modalRes.confirm) wx.openSetting()
            }
          })
        }
      }
    })
  },

  /** 解析地址字符串中的省市区 */
  parseAddressString(addrStr) {
    if (!addrStr) return { province: '', city: '', district: '' }
    let province = ''
    let city = ''
    let district = ''

    // 匹配省份/直辖市
    const pMatch = addrStr.match(/^(.*?省|.*?自治区|北京|上海|天津|重庆)/)
    let rest = addrStr
    if (pMatch) {
      province = pMatch[0]
      rest = addrStr.substring(province.length)
      if (['北京', '上海', '天津', '重庆'].includes(province)) {
        province = province + (province.endsWith('市') ? '' : '市')
        city = province
      }
    }

    // 匹配城市
    if (!city) {
      const cMatch = rest.match(/^(.*?市|.*?地区|.*?自治州|.*?盟)/)
      if (cMatch) {
        city = cMatch[0]
        rest = rest.substring(city.length)
      }
    }

    // 匹配区县
    const dMatch = rest.match(/^(.*?区|.*?县|.*?市|.*?旗)/)
    if (dMatch) {
      district = dMatch[0]
    }

    return { province, city, district }
  },

  /** 省市区选择器变化 */
  onRegionChange(e) {
    const values = e.detail.value || []
    this.setData({
      'form.region': values,
      'form.province': values[0] || '',
      'form.city': values[1] || '',
      'form.district': values[2] || ''
    })
  },

  /** 表单字段输入 */
  onInput(e) {
    const field = e.currentTarget.dataset.field
    const val = e.detail.value
    if (field === 'phone' || field === 'receiverPhone') {
      this.setData({
        'form.phone': val,
        'form.receiverPhone': val
      })
    } else {
      this.setData({ [`form.${field}`]: val })
    }
  },

  /** 标签选择 */
  onSelectTag(e) {
    const tag = e.currentTarget.dataset.tag
    this.setData({ 'form.addressType': tag })
  },

  /** 默认地址开关 */
  onSwitchDefault(e) {
    this.setData({ 'form.isDefault': e.detail.value ? 1 : 0 })
  },

  /** 取消表单 */
  onCancelForm() {
    this.setData({ showForm: false })
  },

  /** 保存地址 */
  onSave() {
    const { id, receiverName, phone, receiverPhone, province, city, district, detailAddress, houseNumber, addressType, latitude, longitude, isDefault } = this.data.form
    const finalPhone = (phone || receiverPhone || '').trim()

    if (!receiverName || !receiverName.trim()) {
      return util.toast('请输入收货人姓名')
    }
    if (!finalPhone || !/^1\d{10}$/.test(finalPhone)) {
      return util.toast('请输入有效的11位手机号')
    }
    if (!detailAddress || !detailAddress.trim()) {
      return util.toast('请填写或定位选择详细地址')
    }

    const payload = {
      receiverName: receiverName.trim(),
      phone: finalPhone,
      receiverPhone: finalPhone,
      province: province || '北京市',
      city: city || '北京市',
      district: district || '朝阳区',
      detailAddress: detailAddress.trim(),
      houseNumber: (houseNumber || '').trim(),
      addressType: addressType || '家',
      latitude: latitude != null ? Number(latitude) : null,
      longitude: longitude != null ? Number(longitude) : null,
      isDefault: isDefault ? 1 : 0
    }

    const requestAction = id
      ? api.updateAddress({ id, ...payload })
      : api.addAddress(payload)

    wx.showLoading({ title: '保存中...' })
    requestAction.then(() => {
      wx.hideLoading()
      util.toast('保存成功', 'success')
      this.setData({ showForm: false })
      this.loadAddressList()
    }).catch((err) => {
      wx.hideLoading()
      util.toast(err && err.message ? err.message : '保存失败，请稍后重试')
    })
  },

  /** 设为默认地址 */
  onSetDefault(e) {
    const id = e.currentTarget.dataset.id
    wx.showLoading({ title: '设置中...' })
    api.setDefaultAddress(id).then(() => {
      wx.hideLoading()
      util.toast('已设为默认地址', 'success')
      this.loadAddressList()
    }).catch(() => {
      wx.hideLoading()
      util.toast('设置失败')
    })
  },

  /** 删除地址 */
  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除此收货地址吗？',
      confirmColor: '#ff5000',
      success: (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '删除中...' })
        api.deleteAddress(id).then(() => {
          wx.hideLoading()
          util.toast('已删除', 'success')
          this.loadAddressList()
        }).catch(() => {
          wx.hideLoading()
          util.toast('删除失败')
        })
      }
    })
  }
})
