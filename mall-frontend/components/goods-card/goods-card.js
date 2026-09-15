/**
 * 商品卡片组件
 * 属性：goods（商品对象）、layout（grid | list）
 * 事件：addcart（点击加购）、goodstap（点击卡片）
 * 注意：自定义事件不能命名为 tap，会与原生 tap 事件冲突导致 detail 被覆盖
 */
const { formatImageUrl } = require('../../utils/config')

Component({
  options: {
    addGlobalClass: true
  },
  properties: {
    goods: {
      type: Object,
      value: () => ({})
    },
    layout: {
      type: String,
      value: 'grid' // grid 网格卡片 / list 横向列表
    }
  },
  data: {
    salesText: '',
    displayImage: ''
  },
  observers: {
    'goods.sales': function (sales) {
      const num = Number(sales || 0)
      this.setData({
        salesText: num >= 10000 ? `${(num / 10000).toFixed(1)}万` : String(num)
      })
    },
    'goods.image, goods.pic': function (image, pic) {
      const raw = image || pic || ''
      this.setData({
        displayImage: formatImageUrl(raw)
      })
    }
  },
  methods: {
    /** 加入购物车（catchtap 阻止冒泡，避免触发出卡片点击） */
    onAddCart() {
      this.triggerEvent('addcart', { goods: this.data.goods })
    },
    /** 点击卡片，抛出 goodstap 自定义事件 */
    onTap() {
      this.triggerEvent('goodstap', { goods: this.data.goods })
    },
    /** 图片加载失败：清空地址以回退为「无图片」占位 */
    onImageError() {
      this.setData({ displayImage: '' })
    }
  }
})
