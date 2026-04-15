const { getCfg } = require('./utils/storage')

App({
  onLaunch() {
    const cfg = getCfg()
    if (!cfg.setupDone) {
      wx.reLaunch({ url: '/pages/setup/setup' })
    }
  },
  globalData: {}
})
