const { getCfg, getHabitDefs, ld, sv, K } = require('../../utils/storage')
const { today, phdDay, nowTime, nowTimeWithSec, workTime } = require('../../utils/util')
const SUB_LBL = { submitted:'审核中', revision:'修改中', accepted:'✅录用', rejected:'❌拒稿', withdrawn:'撤稿' }

Page({
  data: {
    hello: '今日概览', dateStr: '', clock: '00:00:00', phdDay: '?',
    ciDone: false, coTime: null, ciStatus: '未签到', workTime: '',
    stats: { tasks: 0, pomos: 0, habits: '0/0' },
    pendingTasks: [], habits: [], recentSubs: [],
  },
  _clockTimer: null,

  onLoad() { this.refresh() },
  onShow() {
    this.refresh()
    if (this._clockTimer) clearInterval(this._clockTimer)
    this._clockTimer = setInterval(() => {
      this.setData({ clock: nowTimeWithSec() })
    }, 1000)
  },
  onHide() { if (this._clockTimer) clearInterval(this._clockTimer) },
  onUnload() { if (this._clockTimer) clearInterval(this._clockTimer) },

  refresh() {
    const cfg = getCfg()
    const td = today()
    const d = new Date()
    const days = ['周日','周一','周二','周三','周四','周五','周六']
    const dateStr = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${days[d.getDay()]}`

    // Check-in
    const cks = ld(K.checkins, [])
    const ck = cks.find(c => c.date === td) || null
    let ciStatus = '未签到', ciDone = false, coTime = null, wt = ''
    if (ck && ck.ci && !ck.co) { ciStatus = `已签到 ${ck.ci}`; ciDone = true }
    else if (ck && ck.co) {
      ciStatus = `${ck.ci} → ${ck.co}`; ciDone = true; coTime = ck.co
      wt = workTime(ck.ci, ck.co) || ''
    }

    // Tasks
    const tasks = ld(K.tasks, [])
    const projs = cfg.projects || []
    const pending = tasks.filter(t => t.status !== 'done').slice(0, 5).map(t => {
      const p = projs.find(p => p.id === t.proj) || {}
      return { ...t, projName: p.name || t.proj, projColor: p.color || '#8b949e', overdue: t.due && t.due < td }
    })
    const doneCnt = tasks.filter(t => t.status === 'done' && t.done === td).length

    // Pomos
    const pomos = ld(K.pomos, []).filter(p => p.date === td).length

    // Habits
    const defs = getHabitDefs()
    const habData = ld(K.habits, {})
    const tdData = habData[td] || {}
    const habList = defs.map(h => ({ ...h, done: !!tdData[h.id] }))
    const habDone = habList.filter(h => h.done).length

    // Subs
    const subs = ld(K.subs, []).slice(0, 3).map(s => ({ ...s, statusLabel: SUB_LBL[s.status] || s.status }))

    this.setData({
      hello: `${cfg.name || '同学'} 的今日概览`,
      dateStr,
      phdDay: phdDay(cfg.startDate),
      clock: nowTimeWithSec(),
      ciDone, coTime, ciStatus, workTime: wt,
      stats: { tasks: doneCnt, pomos, habits: `${habDone}/${defs.length}` },
      pendingTasks: pending,
      habits: habList,
      recentSubs: subs,
    })
  },

  handleCheckin() {
    const cks = ld(K.checkins, [])
    const td = today()
    if (!cks.find(c => c.date === td)) {
      cks.push({ date: td, ci: nowTime(), co: null })
      sv(K.checkins, cks)
    }
    wx.showToast({ title: '✅ 签到成功！', icon: 'none' })
    this.refresh()
  },
  handleCheckout() {
    const cks = ld(K.checkins, [])
    const idx = cks.findIndex(c => c.date === today())
    if (idx >= 0) { cks[idx].co = nowTime(); sv(K.checkins, cks) }
    wx.showToast({ title: '🌙 签出成功！', icon: 'none' })
    this.refresh()
  },

  toggleTask(e) {
    const id = e.currentTarget.dataset.id
    const tasks = ld(K.tasks, [])
    const t = tasks.find(t => t.id === id)
    if (!t) return
    t.status = t.status === 'done' ? 'todo' : 'done'
    t.done = t.status === 'done' ? today() : null
    sv(K.tasks, tasks); this.refresh()
  },
  toggleHabit(e) {
    const id = e.currentTarget.dataset.id
    const h = ld(K.habits, {}), td = today()
    if (!h[td]) h[td] = {}
    h[td][id] = !h[td][id]
    sv(K.habits, h); this.refresh()
  },

  goTasks() { wx.switchTab({ url: '/pages/tasks/tasks' }) },
  goHabits() { wx.navigateTo({ url: '/pages/habits/habits' }) },
  goSubs()   { wx.switchTab({ url: '/pages/submissions/submissions' }) },
})
