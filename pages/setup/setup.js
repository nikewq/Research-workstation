const { getCfg, saveCfg, DEFAULT_HABITS, saveHabitDefs, sv, K } = require('../../utils/storage')
const { uid } = require('../../utils/util')

Page({
  data: {
    step: 1,
    form: { name: '', field: '', univ: '', startDate: '2023-09-01' },
    projects: [],
    newProjName: '',
    newProjColor: '#7c3aed',
    colorPalette: ['#7c3aed','#059669','#3b82f6','#f59e0b','#ef4444','#ec4899'],
    defaultHabits: DEFAULT_HABITS,
    selectedHabits: { dh1: true, dh2: true, dh3: true, dh4: true, dh5: true },
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },
  onDateChange(e) { this.setData({ 'form.startDate': e.detail.value }) },
  onProjName(e) {
    const idx = e.currentTarget.dataset.idx
    this.setData({ [`projects[${idx}].name`]: e.detail.value })
  },
  onNewProjName(e) { this.setData({ newProjName: e.detail.value }) },
  pickColor(e) { this.setData({ newProjColor: e.currentTarget.dataset.color }) },
  addProject() {
    const name = this.data.newProjName.trim()
    if (!name || this.data.projects.length >= 6) return
    const projs = [...this.data.projects, { id: uid(), name, color: this.data.newProjColor }]
    this.setData({ projects: projs, newProjName: '' })
  },
  delProject(e) {
    const idx = e.currentTarget.dataset.idx
    const projs = this.data.projects.filter((_, i) => i !== idx)
    this.setData({ projects: projs })
  },
  toggleHabitSel(e) {
    const id = e.currentTarget.dataset.id
    const sel = { ...this.data.selectedHabits }
    sel[id] = !sel[id]
    this.setData({ selectedHabits: sel })
  },
  nextStep() {
    if (this.data.step === 1 && !this.data.form.name.trim()) {
      wx.showToast({ title: '请填写名字', icon: 'none' }); return
    }
    this.setData({ step: this.data.step + 1 })
  },
  prevStep() { this.setData({ step: this.data.step - 1 }) },

  finishSetup() {
    const { form, projects, selectedHabits } = this.data
    const cfg = getCfg()
    Object.assign(cfg, form)
    cfg.projects = projects.length
      ? projects
      : [{ id: uid(), name: '项目A', color: '#7c3aed' }, { id: uid(), name: '项目B', color: '#059669' }]
    cfg.setupDone = true
    saveCfg(cfg)
    const habitDefs = DEFAULT_HABITS.filter(h => selectedHabits[h.id])
    saveHabitDefs(habitDefs)
    wx.reLaunch({ url: '/pages/overview/overview' })
  }
})
