/**
 * 登录拦截弹窗组件
 * 用自绘弹窗替代 wx.showModal：原生弹窗的蒙版无法自定义颜色，
 * 且其层级会与页面内 position:fixed 元素（如自定义 TabBar）冲突，产生色差闪动。
 *
 * 用法：在页面 wxml 中放置 <login-modal id="loginModal" bind:confirm="..." bind:cancel="..." />
 *      通过 this.selectComponent('#loginModal').open({ content }) 打开
 */
Component({
  options: {
    addGlobalClass: true
  },

  properties: {
    /** 弹窗标题 */
    title: {
      type: String,
      value: '未登录'
    },
    /** 提示文案 */
    content: {
      type: String,
      value: '该功能需要登录后使用，是否前往登录？'
    },
    /** 确认按钮文案 */
    confirmText: {
      type: String,
      value: '去登录'
    },
    /** 取消按钮文案 */
    cancelText: {
      type: String,
      value: '再逛逛'
    }
  },

  data: {
    visible: false
  },

  methods: {
    /** 打开弹窗（可覆盖文案） */
    open(options = {}) {
      const next = {}
      if (options.content) next.content = options.content
      if (options.title) next.title = options.title
      next.visible = true
      this.setData(next)
    },

    /** 关闭弹窗 */
    close() {
      this.setData({ visible: false })
    },

    /** 点击蒙版/取消：仅关闭，不做任何跳转 */
    onCancel() {
      this.close()
      this.triggerEvent('cancel')
    },

    /** 确认：由调用方决定后续跳转 */
    onConfirm() {
      this.close()
      this.triggerEvent('confirm')
    },

    /** 阻止弹窗内容区点击冒泡到蒙版 */
    noop() {}
  }
})
