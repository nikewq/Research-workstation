const { ld, sv, K } = require('../../utils/storage')
const { uid, today } = require('../../utils/util')

Page({
  data: {
    moods: ['😊','😐','😩','😤','🤩','😰'],
    selMood: '', f: { wins:'', struggles:'', tomorrow:'', gratitude:'' },
    history: [],
  },
  onShow() { this.setData({ history: ld(K.refs, []).slice(0, 20) }) },
  selMoodFn(e) { this.setData({ selMood: e.currentTarget.dataset.m }) },
  onInput(e) { this.setData({ [`f.${e.currentTarget.dataset.field}`]: e.detail.value }) },
  save() {
    const { f, selMood } = this.data
    if (!f.wins && !f.struggles && !f.tomorrow) { wx.showToast({ title:'请至少填写一项', icon:'none' }); return }
    const list = ld(K.refs, [])
    const idx = list.findIndex(r => r.date === today())
    const entry = { id: uid(), date: today(), mood: selMood, ...f }
    if (idx >= 0) list[idx] = entry; else list.unshift(entry)
    sv(K.refs, list)
    this.setData({ f: { wins:'', struggles:'', tomorrow:'', gratitude:'' }, selMood: '', history: list.slice(0,20) })
    wx.showToast({ title:'🌙 已保存', icon:'none' })
  },
})
