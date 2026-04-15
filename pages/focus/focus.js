const { ld, sv, K } = require('../../utils/storage')
const { uid, today, pad, nowTime } = require('../../utils/util')

Page({
  data: {
    workMin: 25, breakMin: 5,
    secs: 25 * 60, running: false, isBreak: false, round: 0,
    timeStr: '25:00', label: '准备开始',
    taskIdx: 0, taskNames: ['自由专注…'], tasks: [],
    todayPomos: [],
  },
  _iv: null, _taskId: '', _taskTitle: '',

  onLoad() {
    try { this.loadTasks(); this.loadPomos() }
    catch(e) { wx.showModal({ title:'[focus onLoad crash]', content: String(e).slice(0,300), showCancel:false }) }
  },
  onShow() {
    try { this.loadTasks(); this.loadPomos() }
    catch(e) { wx.showModal({ title:'[focus onShow crash]', content: String(e).slice(0,300), showCancel:false }) }
  },
  onHide() { this._pause() },
  onUnload() { this._pause() },

  loadTasks() {
    const tasks = ld(K.tasks, []).filter(t => t.status !== 'done')
    this.setData({ tasks, taskNames: ['自由专注…', ...tasks.map(t => t.title)] })
  },
  loadPomos() {
    const list = ld(K.pomos, []).filter(p => p.date === today()).reverse()
    this.setData({ todayPomos: list })
  },

  onTaskChange(e) { this.setData({ taskIdx: parseInt(e.detail.value) }) },
  onWorkMin(e)  { this.setData({ workMin: parseInt(e.detail.value) || 25 }) },
  onBreakMin(e) { this.setData({ breakMin: parseInt(e.detail.value) || 5 }) },

  togglePomo() {
    if (this.data.running) { this._pause() }
    else { this._start() }
  },

  _start() {
    const { taskIdx, tasks } = this.data
    this._taskId = taskIdx > 0 ? tasks[taskIdx-1]?.id : ''
    this._taskTitle = taskIdx > 0 ? tasks[taskIdx-1]?.title : ''
    this.setData({ running: true, label: this.data.isBreak ? '🌿 休息中…' : '🔥 专注中…' })
    this._iv = setInterval(() => {
      let secs = this.data.secs - 1
      if (secs < 0) {
        this._onPhaseEnd(); return
      }
      this.setData({ secs, timeStr: `${pad(Math.floor(secs/60))}:${pad(secs%60)}` })
    }, 1000)
  },
  _pause() {
    if (this._iv) { clearInterval(this._iv); this._iv = null }
    this.setData({ running: false, label: this.data.isBreak ? '🌿 休息中' : '准备继续' })
  },
  _onPhaseEnd() {
    clearInterval(this._iv); this._iv = null
    if (!this.data.isBreak) {
      // Log
      const list = ld(K.pomos, [])
      list.push({ id: uid(), date: today(), taskId: this._taskId, taskTitle: this._taskTitle, dur: this.data.workMin, ts: nowTime() })
      sv(K.pomos, list)
      const round = (this.data.round + 1) % 4
      this.setData({ round })
      this.loadPomos()
      wx.vibrateLong()
      wx.showToast({ title: '🍅 专注完成！休息一下', icon: 'none' })
    } else {
      wx.showToast({ title: '✅ 休息结束，继续加油！', icon: 'none' })
    }
    const isBreak = !this.data.isBreak
    const secs = (isBreak ? this.data.breakMin : this.data.workMin) * 60
    this.setData({ isBreak, secs, running: false, timeStr: `${pad(Math.floor(secs/60))}:${pad(secs%60)}`, label: '准备开始' })
  },

  resetPomo() {
    this._pause()
    const secs = this.data.workMin * 60
    this.setData({ secs, isBreak: false, running: false, timeStr: `${pad(Math.floor(secs/60))}:${pad(secs%60)}`, label: '准备开始' })
  },
})
