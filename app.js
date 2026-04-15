const { getCfg } = require('./utils/storage')

App({
  onLaunch() {
    // 全局错误兜底：捕获未处理异常，防止白屏
    wx.onError && wx.onError(function(msg) {
      console.error('[Global Error]', msg)
    })
    try {
      const cfg = getCfg()
      if (!cfg.setupDone) {
        wx.reLaunch({ url: '/pages/setup/setup' })
      }
    } catch (e) {
      console.error('[onLaunch]', e)
      wx.reLaunch({ url: '/pages/setup/setup' })
    }
  },
  globalData: {}
})
