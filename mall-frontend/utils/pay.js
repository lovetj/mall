/**
 * 在线支付与开发模拟支付工具类（支持微信支付与支付宝支付选择）
 * 根据后端 pay.mock.enabled 配置自动分流：
 * - mock=true: 弹出所选方式（微信支付/支付宝支付）的模拟支付弹窗，调用 /api/payment/mock-success 完成测试付款
 * - mock=false: 微信支付拉起官方 wx.requestPayment 收银台；支付宝支付按平台通道引导
 */
const api = require('./api')
const util = require('./util')
const auth = require('./auth')

/** 轮询支付结果(微信回调异步, 收银台成功后需确认后端流水已入账) */
function pollPaymentStatus(paymentNo, options) {
  const opts = options || {}
  const times = opts.times || 10
  const interval = opts.interval || 1000
  let attempts = 0

  return new Promise((resolve) => {
    const timer = setInterval(() => {
      attempts += 1
      api.queryPaymentStatus(paymentNo).then((resp) => {
        const paid = !!(resp && resp.payParams && resp.payParams.paid)
        if (paid || attempts >= times) {
          clearInterval(timer)
          resolve(paid)
        }
      }).catch(() => {
        if (attempts >= times) {
          clearInterval(timer)
          resolve(false)
        }
      })
    }, interval)
  })
}

/**
 * 发起在线支付（支持指定支付方式：1微信支付，2支付宝支付）
 * @param {Object} options
 * @param {string} options.orderId 订单ID
 * @param {string} [options.orderNo] 订单编号
 * @param {number|string} [options.payAmount] 支付金额
 * @param {number} [options.payType=1] 支付方式：1微信支付，2支付宝
 * @returns {Promise<{success: boolean, cancel?: boolean, mock?: boolean, message?: string}>}
 */
function requestPay({ orderId, orderNo, payAmount, payType = 1 }) {
  return new Promise((resolve) => {
    if (!orderId) {
      util.toast('订单参数缺失')
      resolve({ success: false, message: '订单ID缺失' })
      return
    }

    const targetPayType = Number(payType) === 2 ? 2 : 1
    const payTypeName = targetPayType === 2 ? '支付宝支付' : '微信支付'
    const themeColor = targetPayType === 2 ? '#1677ff' : '#07c160'

    wx.showLoading({ title: `正在发起${payTypeName}...`, mask: true })

    // 1. 创建支付流水 (payType: 1 微信支付, 2 支付宝, platform: 'mp' 小程序)
    //    同时带上本地缓存的 openid, 供后端 JSAPI 下单使用
    const loginState = auth.getLoginState()
    const userOpenid = (loginState && loginState.userInfo && loginState.userInfo.openid) || ''
    api.createPayment({
      orderId,
      payType: targetPayType,
      platform: 'mp',
      openid: userOpenid || undefined
    }).then((resp) => {
      wx.hideLoading()
      if (!resp) {
        util.toast('创建支付失败')
        resolve({ success: false, message: '创建支付失败' })
        return
      }

      const payParams = resp.payParams || {}
      const finalOrderNo = resp.orderNo || orderNo || ''
      const finalAmount = util.formatPrice(resp.payAmount || payAmount)

      // 2. 判断是否为 Mock 模式 (pay.mock.enabled 为 true)
      if (payParams.mock === true) {
        wx.showModal({
          title: `测试${payTypeName}`,
          content: `订单编号：${finalOrderNo}\n待支付金额：¥${finalAmount}\n支付方式：${payTypeName}\n\n当前系统开启了测试付款(Mock)，点击「确认支付」完成模拟付款。`,
          confirmText: '确认支付',
          confirmColor: themeColor,
          cancelText: '稍后付款',
          cancelColor: '#999999',
          success: (modalRes) => {
            if (modalRes.confirm) {
              wx.showLoading({ title: '模拟支付中...', mask: true })
              api.mockPaySuccess(resp.paymentNo).then((mockRes) => {
                wx.hideLoading()
                if (mockRes && mockRes.payParams && mockRes.payParams.paid) {
                  util.toast('支付成功', 'success')
                  resolve({ success: true, mock: true, paymentNo: resp.paymentNo, payType: targetPayType, paid: true })
                } else {
                  util.toast('模拟支付失败')
                  resolve({ success: false, cancel: false, message: '模拟支付失败' })
                }
              }).catch((err) => {
                wx.hideLoading()
                util.toast((err && err.message) || '模拟支付异常')
                resolve({ success: false, cancel: false, err })
              })
            } else {
              // 用户点击取消付款
              util.toast('已取消支付')
              resolve({ success: false, cancel: true })
            }
          }
        })
      } else {
        // 3. 真实在线支付 (pay.mock.enabled 为 false)
        if (targetPayType === 2) {
          // 小程序内支付宝真实支付提示
          wx.showModal({
            title: '支付宝支付提示',
            content: '微信小程序环境暂不支持直接拉起支付宝客户端，请使用微信支付或在开发模式下进行测试。',
            showCancel: false,
            confirmColor: '#1677ff'
          })
          resolve({ success: false, message: '小程序不支持直接拉起支付宝' })
          return
        }

        // 真实微信支付
        if (!payParams.timeStamp || !payParams.paySign) {
          wx.showModal({
            title: '支付提示',
            content: '未获取到微信支付参数，请确认后端商户号与证书配置是否正确',
            showCancel: false,
            confirmColor: '#07c160'
          })
          resolve({ success: false, message: '缺少微信支付参数' })
          return
        }

        console.log('[pay] 准备调起微信支付 wx.requestPayment，参数:', {
          timeStamp: String(payParams.timeStamp),
          nonceStr: payParams.nonceStr,
          package: payParams.package,
          signType: payParams.signType || 'RSA',
          paySign: payParams.paySign
        })

        wx.requestPayment({
          timeStamp: String(payParams.timeStamp),
          nonceStr: payParams.nonceStr,
          package: payParams.package,
          signType: payParams.signType || 'RSA',
          paySign: payParams.paySign,
          success: (payRes) => {
            console.log('[pay] 微信支付成功:', payRes)
            util.toast('支付成功', 'success')
            // 收银台成功仅代表用户付款, 仍需等待后端异步回调入账; 轮询确认流水真正到账
            pollPaymentStatus(resp.paymentNo).then((paid) => {
              resolve({ success: true, mock: false, res: payRes, payType: targetPayType, paymentNo: resp.paymentNo, paid })
            })
          },
          fail: (err) => {
            console.error('[pay] wx.requestPayment 失败/取消:', err)
            const errDetail = (err && (err.errMsg || err.message)) || ''
            const isCancel = errDetail.indexOf('cancel') > -1 || errDetail.indexOf('fail cancel') > -1
            if (isCancel) {
              util.toast('已取消支付')
            } else {
              // 微信开发者工具模拟器无法拉起真机支付收银台
              if (errDetail.indexOf('requestPayment:fail') > -1 && errDetail.indexOf('function not supported') > -1) {
                wx.showModal({
                  title: '微信开发者工具提示',
                  content: '微信开发者工具模拟器不支持直接拉起真实微信收银台，请使用开发者工具上方「预览」或「真机调试」在手机微信中进行真实支付测试。',
                  showCancel: false,
                  confirmColor: '#07c160'
                })
              } else {
                util.toast(errDetail || '支付未完成')
              }
            }
            resolve({ success: false, cancel: isCancel, err })
          }
        })
      }
    }).catch((err) => {
      wx.hideLoading()
      util.toast((err && err.message) || '发起支付失败')
      resolve({ success: false, cancel: false, err })
    })
  })
}

module.exports = {
  requestPay
}
