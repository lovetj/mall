/** 网页承载页：通过 web-view 打开外部链接 */
Page({
  data: {
    url: ''
  },

  onLoad(options) {
    const raw = (options && options.url) || ''
    const url = decodeURIComponent(raw)
    if (!url) {
      wx.showToast({ title: '链接无效', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    this.setData({ url })
    wx.setNavigationBarTitle({ title: (options && options.title) || '详情' })
  },

  /** 网页加载失败 */
  onError() {
    wx.showToast({ title: '网页加载失败', icon: 'none' })
  }
})
