const { getCfg } = require('./utils/storage')

App({
  // App 内置钩子，早于所有页面 onLoad 注册，可捕获任何页面的未处理异常
  onError(msg) {
    wx.showModal({
      title: '崩溃位置（调试用）',
      content: String(msg).slice(0, 300),
      showCancel: false
    })
  },
  onLaunch() {
    try {
      const cfg = getCfg()
      if (!cfg.setupDone) {
        wx.reLaunch({ url: '/pages/setup/setup' })
      }
    } catch (e) {
      wx.reLaunch({ url: '/pages/setup/setup' })
    }
  },
  globalData: {}
})
