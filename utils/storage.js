const K = {
  cfg:       'phd_cfg',
  tasks:     'phd_tasks',
  habits:    'phd_habits',
  habitDefs: 'phd_habit_defs',
  checkins:  'phd_checkins',
  subs:      'phd_subs',
  refs:      'phd_refs',
  pomos:     'phd_pomos',
  tools:     'phd_tools',
}

const DEFAULT_HABITS = [
  { id: 'dh1', name: '读文献',    emoji: '📄' },
  { id: 'dh2', name: '写代码/实验', emoji: '💻' },
  { id: 'dh3', name: '论文写作',  emoji: '✍️' },
  { id: 'dh4', name: '运动',      emoji: '🏃' },
  { id: 'dh5', name: '早睡',      emoji: '😴' },
]

function ld(key, defaultVal) {
  try {
    const v = wx.getStorageSync(key)
    return (v !== '' && v !== null && v !== undefined) ? v : defaultVal
  } catch (e) { return defaultVal }
}
function sv(key, val) {
  try { wx.setStorageSync(key, val) } catch (e) {}
}

function getCfg() {
  return Object.assign(
    { name: '', field: '', univ: '', startDate: '', projects: [], areas: [], setupDone: false },
    ld(K.cfg, {})
  )
}
function saveCfg(c) { sv(K.cfg, c) }

function getHabitDefs() {
  return ld(K.habitDefs, DEFAULT_HABITS)
}
function saveHabitDefs(d) { sv(K.habitDefs, d) }

module.exports = {
  K, DEFAULT_HABITS,
  ld, sv,
  getCfg, saveCfg,
  getHabitDefs, saveHabitDefs,
}
