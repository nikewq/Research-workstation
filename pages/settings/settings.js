const { getCfg, saveCfg, ld, sv, K } = require('../../utils/storage')
const { uid } = require('../../utils/util')

Page({
  data: { f: {}, projects: [], newProj: '', newColor: '#7c3aed' },
  onShow() {
    const cfg = getCfg()
    this.setData({ f: { name: cfg.name||'', field: cfg.field||'', univ: cfg.univ||'', startDate: cfg.startDate||'' }, projects: cfg.projects||[] })
  },
  onInput(e) { this.setData({ [`f.${e.currentTarget.dataset.field}`]: e.detail.value }) },
  onDate(e)  { this.setData({ 'f.startDate': e.detail.value }) },
  onNewProj(e)  { this.setData({ newProj: e.detail.value }) },
  onNewColor(e) { this.setData({ newColor: e.detail.value }) },

  save() {
    const cfg = getCfg()
    Object.assign(cfg, this.data.f)
    saveCfg(cfg)
    wx.showToast({ title:'✅ 已保存', icon:'none' })
    wx.navigateBack()
  },
  addProj() {
    const name = this.data.newProj.trim()
    if (!name) return
    const cfg = getCfg()
    if (!cfg.projects) cfg.projects = []
    if (cfg.projects.length >= 6) { wx.showToast({ title:'最多6个项目', icon:'none' }); return }
    cfg.projects.push({ id: uid(), name, color: this.data.newColor })
    saveCfg(cfg)
    this.setData({ projects: cfg.projects, newProj: '' })
  },
  delProj(e) {
    const id = e.currentTarget.dataset.id
    const cfg = getCfg()
    cfg.projects = (cfg.projects||[]).filter(p => p.id !== id)
    saveCfg(cfg)
    this.setData({ projects: cfg.projects })
  },
  reset() {
    wx.showModal({ title:'确认清除所有数据？', content:'此操作不可撤销！', confirmColor:'#ef4444', success: res => {
      if (!res.confirm) return
      wx.clearStorageSync()
      wx.reLaunch({ url: '/pages/setup/setup' })
    }})
  },
})
