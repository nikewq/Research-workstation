const { getHabitDefs, saveHabitDefs, ld, sv, K } = require('../../utils/storage')
const { uid, today, dayLabel } = require('../../utils/util')

Page({
  data: { habits: [], weekRows: [], weekDays: [], newName: '', newEmoji: '' },
  onShow() { this.render() },
  onName(e)  { this.setData({ newName: e.detail.value }) },
  onEmoji(e) { this.setData({ newEmoji: e.detail.value }) },

  render() {
    const defs = getHabitDefs()
    const h = ld(K.habits, {}), td = today()
    const tdData = h[td] || {}

    const habits = defs.map(d => ({
      ...d, done: !!tdData[d.id], streak: this.getStreak(d.id, h)
    }))

    // Week
    const days = Array.from({length:7}, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - 6 + i)
      return d.toISOString().slice(0, 10)
    })
    const weekDays = days.map(d => dayLabel(d))
    const weekRows = defs.map(d => ({
      ...d,
      days: days.map(day => ({ done: !!(h[day] && h[day][d.id]), label: dayLabel(day), today: day === td }))
    }))
    this.setData({ habits, weekDays, weekRows })
  },

  getStreak(id, h) {
    let s = 0; const d = new Date()
    while (s < 365) {
      const ds = d.toISOString().slice(0, 10)
      if (h[ds] && h[ds][id]) { s++; d.setDate(d.getDate() - 1) } else break
    }
    return s
  },

  toggle(e) {
    const id = e.currentTarget.dataset.id
    const h = ld(K.habits, {}), td = today()
    if (!h[td]) h[td] = {}
    h[td][id] = !h[td][id]
    sv(K.habits, h); this.render()
  },
  addHabit() {
    const name = this.data.newName.trim()
    if (!name) return
    const defs = getHabitDefs()
    defs.push({ id: uid(), name, emoji: this.data.newEmoji.trim() || '✅' })
    saveHabitDefs(defs)
    this.setData({ newName: '', newEmoji: '' })
    wx.showToast({ title: '✅ 已添加', icon: 'none' })
    this.render()
  },
  delHabit(e) {
    const id = e.currentTarget.dataset.id
    saveHabitDefs(getHabitDefs().filter(d => d.id !== id))
    this.render()
  },
})
