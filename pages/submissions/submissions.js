const { ld, sv, K } = require('../../utils/storage')
const { uid, today } = require('../../utils/util')
const STATUS = ['submitted','revision','accepted','rejected','withdrawn']
const STATUS_LABELS = ['审核中','修改中','✅ 录用','❌ 拒稿','撤稿']
const SUB_LBL = { submitted:'审核中', revision:'修改中', accepted:'✅ 录用', rejected:'❌ 拒稿', withdrawn:'撤稿' }

Page({
  data: {
    subs: [], stats: { total:0, submitted:0, accepted:0, revision:0 },
    showModal: false, editId: '',
    statusLabels: STATUS_LABELS,
    form: { title:'', venue:'', statusIdx:0, submitDate:'', notes:'' },
  },

  onLoad() {
    try { this.render() }
    catch(e) { wx.showModal({ title:'[subs onLoad crash]', content: String(e).slice(0,300), showCancel:false }) }
  },
  onShow() {
    try { this.render() }
    catch(e) { wx.showModal({ title:'[subs onShow crash]', content: String(e).slice(0,300), showCancel:false }) }
  },

  render() {
    const raw = ld(K.subs, [])
    const subs = raw.map(s => ({ ...s, statusLabel: SUB_LBL[s.status] || s.status }))
    this.setData({
      subs,
      stats: {
        total: raw.length,
        submitted: raw.filter(s => s.status==='submitted').length,
        accepted:  raw.filter(s => s.status==='accepted').length,
        revision:  raw.filter(s => s.status==='revision').length,
      }
    })
  },

  showAddModal() {
    this.setData({ showModal: true, editId: '', form: { title:'', venue:'', statusIdx:0, submitDate: today(), notes:'' } })
  },
  closeModal() { this.setData({ showModal: false }) },

  onInput(e) { this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value }) },
  onStatusChange(e) { this.setData({ 'form.statusIdx': e.detail.value }) },
  onSubmitDateChange(e) { this.setData({ 'form.submitDate': e.detail.value }) },

  saveSub() {
    const { form, editId } = this.data
    if (!form.title.trim()) { wx.showToast({ title:'请填写标题', icon:'none' }); return }
    const list = ld(K.subs, [])
    const entry = { title: form.title.trim(), venue: form.venue, status: STATUS[form.statusIdx], submitDate: form.submitDate, notes: form.notes }
    if (editId) {
      const idx = list.findIndex(s => s.id === editId)
      if (idx >= 0) list[idx] = { ...list[idx], ...entry }
    } else {
      list.unshift({ id: uid(), ...entry })
    }
    sv(K.subs, list)
    this.setData({ showModal: false })
    wx.showToast({ title:'✅ 已保存', icon:'none' })
    this.render()
  },

  editSub(e) {
    const id = e.currentTarget.dataset.id
    const s = ld(K.subs, []).find(s => s.id === id)
    if (!s) return
    this.setData({
      showModal: true, editId: id,
      form: { title: s.title, venue: s.venue, statusIdx: STATUS.indexOf(s.status)||0, submitDate: s.submitDate||'', notes: s.notes||'' }
    })
  },
  delSub(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({ title:'确认删除？', success: res => {
      if (!res.confirm) return
      sv(K.subs, ld(K.subs, []).filter(s => s.id !== id))
      this.render()
    }})
  },
})
