const { ld, sv, K } = require('../../utils/storage')
const { uid } = require('../../utils/util')

Page({
  data: { tools: [], f: { label:'', icon:'', cmd:'', desc:'' } },
  onShow() { this.setData({ tools: ld(K.tools, []) }) },
  onInput(e) { this.setData({ [`f.${e.currentTarget.dataset.field}`]: e.detail.value }) },

  addTool() {
    const { f } = this.data
    if (!f.label.trim() || !f.cmd.trim()) { wx.showToast({ title:'请填写名称和命令', icon:'none' }); return }
    const list = ld(K.tools, [])
    list.push({ id: uid(), label: f.label.trim(), icon: f.icon||'⚡', cmd: f.cmd.trim(), desc: f.desc })
    sv(K.tools, list)
    this.setData({ tools: list, f: { label:'', icon:'', cmd:'', desc:'' } })
    wx.showToast({ title:'✅ 已添加', icon:'none' })
  },
  copyTool(e) {
    const t = this.data.tools.find(t => t.id === e.currentTarget.dataset.id)
    if (!t) return
    wx.setClipboardData({ data: t.cmd, success: () => wx.showToast({ title: '✅ 已复制', icon: 'none' }) })
  },
  delTool(e) {
    const id = e.currentTarget.dataset.id
    const list = ld(K.tools, []).filter(t => t.id !== id)
    sv(K.tools, list); this.setData({ tools: list })
  },
})
