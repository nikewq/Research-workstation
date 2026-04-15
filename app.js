const { getCfg } = require('./utils/storage')

App({
  onLaunch() {
    // 全局错误捕获：真机调试时弹出错误位置，定位后可删除
    wx.onError && wx.onError(function(msg) {
      console.error('[Global Error]', msg)
      wx.showModal({
        title: '崩溃位置',
        content: String(msg).slice(0, 300),
        showCancel: false
      })
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
