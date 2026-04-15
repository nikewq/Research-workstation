const { getCfg, ld, sv, K, getHabitDefs, saveHabitDefs, saveCfg } = require('../../utils/storage')
const { phdDay } = require('../../utils/util')

Page({
  data: { name:'', field:'', univ:'', phdDay:'?' },
  onShow() {
    const cfg = getCfg()
    this.setData({ name: cfg.name||'同学', field: cfg.field||'', univ: cfg.univ||'', phdDay: phdDay(cfg.startDate) })
  },
  go(e) { wx.navigateTo({ url: e.currentTarget.dataset.url }) },

  exportData() {
    const data = {}
    Object.entries(K).forEach(([k, v]) => { data[k] = ld(v, []) })
    data.phd_habit_defs = getHabitDefs()
    const json = JSON.stringify(data, null, 2)
    // Copy to clipboard as fallback
    wx.setClipboardData({ data: json, success: () => {
      wx.showModal({
        title: '导出成功',
        content: '数据已复制到剪贴板，请粘贴到记事本保存。',
        showCancel: false
      })
    }})
  },

  importData() {
    wx.showModal({
      title: '导入数据',
      content: '请将之前导出的 JSON 数据复制到剪贴板，然后点击确认。',
      success: res => {
        if (!res.confirm) return
        wx.getClipboardData({ success: d => {
          try {
            const data = JSON.parse(d.data)
            Object.entries(K).forEach(([k, v]) => { if (data[k]) sv(v, data[k]) })
            if (data.phd_habit_defs) saveHabitDefs(data.phd_habit_defs)
            if (data.phd_cfg) saveCfg(data.phd_cfg)
            wx.showToast({ title: '✅ 导入成功', icon: 'none' })
          } catch { wx.showToast({ title: '格式错误', icon: 'error' }) }
        }})
      }
    })
  },

  copyWebLink() {
    wx.setClipboardData({
      data: 'https://nikewq.github.io/Research-workstation/',
      success: () => wx.showToast({ title: '链接已复制', icon: 'success' })
    })
  },

  // 分享给微信好友时的卡片内容（无任何个人信息）
  onShareAppMessage() {
    return {
      title: 'PhD Workstation — 博士科研自律工作台',
      path: '/pages/overview/overview',
    }
  },
})
