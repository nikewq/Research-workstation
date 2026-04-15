const { getCfg, ld, sv, K } = require('../../utils/storage')
const { uid, today } = require('../../utils/util')
const PRIO = ['high','med','low']
const PRIO_LABELS = ['🔴 高','🟡 中','⚪ 低']

Page({
  data: {
    newTask: { title:'', projIdx:0, prioIdx:1, due:'' },
    projNames: [], projects: [],
    prioLabels: PRIO_LABELS,
    activeFilter: 'todo',
    filters: [
      { val:'all', label:'全部' }, { val:'todo', label:'待做' },
      { val:'done', label:'已完成' },
    ],
    filteredTasks: [],
    taskCount: '',
  },

  onLoad() {
    try { this.loadProjects(); this.renderTasks() }
    catch(e) { wx.showModal({ title:'[tasks onLoad crash]', content: String(e).slice(0,300), showCancel:false }) }
  },
  onShow() {
    try { this.loadProjects(); this.renderTasks() }
    catch(e) { wx.showModal({ title:'[tasks onShow crash]', content: String(e).slice(0,300), showCancel:false }) }
  },

  loadProjects() {
    const cfg = getCfg()
    const projs = cfg.projects || []
    this.setData({ projects: projs, projNames: projs.map(p => p.name) })
  },

  renderTasks() {
    const tasks = ld(K.tasks, [])
    const cfg = getCfg(); const projs = cfg.projects || []; const td = today()
    const f = this.data.activeFilter
    let list = f === 'todo' ? tasks.filter(t => t.status !== 'done')
      : f === 'done' ? tasks.filter(t => t.status === 'done')
      : tasks
    const pOrd = { high:0, med:1, low:2 }
    list = [...list].sort((a,b) => {
      if (a.status==='done' && b.status!=='done') return 1
      if (a.status!=='done' && b.status==='done') return -1
      return (pOrd[a.prio]||1) - (pOrd[b.prio]||1)
    }).map(t => {
      const p = projs.find(p => p.id === t.proj) || {}
      return { ...t, projName: p.name || t.proj, projColor: p.color || '#8b949e', overdue: t.due && t.due < td && t.status !== 'done' }
    })
    this.setData({ filteredTasks: list })
  },

  onTitleInput(e) { this.setData({ 'newTask.title': e.detail.value }) },
  onProjChange(e) { this.setData({ 'newTask.projIdx': e.detail.value }) },
  onPrioChange(e) { this.setData({ 'newTask.prioIdx': e.detail.value }) },
  onDueChange(e)  { this.setData({ 'newTask.due': e.detail.value }) },

  addTask() {
    const { newTask, projects } = this.data
    if (!newTask.title.trim()) { wx.showToast({ title:'请输入任务名称', icon:'none' }); return }
    const tasks = ld(K.tasks, [])
    tasks.push({
      id: uid(), title: newTask.title.trim(),
      proj: projects[newTask.projIdx]?.id || '',
      prio: PRIO[newTask.prioIdx],
      due: newTask.due, status: 'todo',
      created: today(), done: null
    })
    sv(K.tasks, tasks)
    this.setData({ 'newTask.title': '', 'newTask.due': '' })
    wx.showToast({ title:'✅ 已添加', icon:'none' })
    this.renderTasks()
  },

  toggleTask(e) {
    const id = e.currentTarget.dataset.id
    const tasks = ld(K.tasks, []), t = tasks.find(t => t.id === id)
    if (!t) return
    t.status = t.status === 'done' ? 'todo' : 'done'
    t.done = t.status === 'done' ? today() : null
    sv(K.tasks, tasks); this.renderTasks()
  },

  delTask(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({ title:'确认删除？', content:'此操作不可撤销', success: res => {
      if (!res.confirm) return
      sv(K.tasks, ld(K.tasks, []).filter(t => t.id !== id))
      this.renderTasks()
    }})
  },

  setFilter(e) {
    this.setData({ activeFilter: e.currentTarget.dataset.val })
    this.renderTasks()
  },
})
