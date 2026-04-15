const { getCfg, ld, K } = require('../../utils/storage')
const { last7Days, dayLabel, today } = require('../../utils/util')

Page({
  data: { taskChart:[], pomoChart:[], projChart:[], total:{} },
  onShow() { this.render() },
  render() {
    const days = last7Days()
    const tasks = ld(K.tasks, [])
    const pomos = ld(K.pomos, [])
    const cks   = ld(K.checkins, [])
    const subs  = ld(K.subs, [])
    const cfg   = getCfg()

    // Task chart
    const tVals = days.map(d => tasks.filter(t => t.done === d).length)
    const tMax = Math.max(...tVals, 1)
    const taskChart = days.map((d, i) => ({ day: d, val: tVals[i], label: dayLabel(d), pct: Math.round(tVals[i]/tMax*100) }))

    // Pomo chart
    const pVals = days.map(d => pomos.filter(p => p.date === d).length)
    const pMax = Math.max(...pVals, 1)
    const pomoChart = days.map((d, i) => ({ day: d, val: pVals[i], label: dayLabel(d), pct: Math.round(pVals[i]/pMax*100) }))

    // Project breakdown
    const projs = cfg.projects || []
    const doneTasks = tasks.filter(t => t.status === 'done')
    const projCounts = {}
    doneTasks.forEach(t => { projCounts[t.proj] = (projCounts[t.proj]||0) + 1 })
    const maxProj = Math.max(...Object.values(projCounts), 1)
    const projChart = projs.filter(p => projCounts[p.id]).map(p => ({
      name: p.name, color: p.color, val: projCounts[p.id]||0,
      pct: Math.round((projCounts[p.id]||0)/maxProj*100)
    }))

    this.setData({
      taskChart, pomoChart, projChart,
      total: {
        tasks: doneTasks.length,
        pomos: pomos.length,
        subs: subs.length,
        days: cks.length,
      }
    })
  },
})
