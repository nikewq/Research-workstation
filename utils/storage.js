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
  { id: 'dh1', name: '读文献',     emoji: '📄' },
  { id: 'dh2', name: '写代码/实验', emoji: '💻' },
  { id: 'dh3', name: '论文写作',   emoji: '✍️' },
  { id: 'dh4', name: '运动',       emoji: '🏃' },
  { id: 'dh5', name: '早睡',       emoji: '😴' },
]

// 安全读取：真机 getStorageSync 对不存在的 key 可能返回 null/undefined/''
// 同时过滤数组中的 null 元素（防止 {...null} 在旧版 V8 上崩溃）
function ld(key, defaultVal) {
  try {
    const v = wx.getStorageSync(key)
    if (v === null || v === undefined || v === '') return defaultVal
    const expectArr = Array.isArray(defaultVal)
    const expectObj = !expectArr && defaultVal !== null && typeof defaultVal === 'object'
    if (expectArr) {
      // 类型不符直接回退
      if (!Array.isArray(v)) return defaultVal
      // 过滤 null/undefined 元素：旧版 V8 对 {...null} 会抛 TypeError
      return v.filter(function(item) { return item !== null && item !== undefined })
    }
    if (expectObj) {
      // 期望对象但拿到数组或原始值，回退默认
      if (Array.isArray(v) || v === null || typeof v !== 'object') return defaultVal
    }
    return v
  } catch (e) {
    return defaultVal
  }
}

function sv(key, val) {
  try { wx.setStorageSync(key, val) } catch (e) {}
}

const CFG_DEFAULTS = {
  name: '', field: '', univ: '', startDate: '',
  projects: [], areas: [], setupDone: false
}

function getCfg() {
  try {
    const stored = ld(K.cfg, null)
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
      return Object.assign({}, CFG_DEFAULTS)
    }
    // 逐字段合并，防止 stored 里某个字段是 null
    const cfg = Object.assign({}, CFG_DEFAULTS)
    Object.keys(CFG_DEFAULTS).forEach(k => {
      if (stored[k] !== null && stored[k] !== undefined) {
        cfg[k] = stored[k]
      }
    })
    // 过滤 projects/areas 数组中可能存在的 null 元素
    if (Array.isArray(cfg.projects)) {
      cfg.projects = cfg.projects.filter(function(p) { return p !== null && p !== undefined && typeof p === 'object' })
    } else {
      cfg.projects = []
    }
    if (Array.isArray(cfg.areas)) {
      cfg.areas = cfg.areas.filter(function(a) { return a !== null && a !== undefined })
    } else {
      cfg.areas = []
    }
    return cfg
  } catch (e) {
    return Object.assign({}, CFG_DEFAULTS)
  }
}

function saveCfg(c) {
  try { sv(K.cfg, c) } catch (e) {}
}

function getHabitDefs() {
  const v = ld(K.habitDefs, [])
  if (!Array.isArray(v) || v.length === 0) return DEFAULT_HABITS.slice()
  // 过滤 null 元素，防止 {...null} 在 V8 老版本崩溃
  const filtered = v.filter(function(d) { return d !== null && d !== undefined && typeof d === 'object' })
  return filtered.length === 0 ? DEFAULT_HABITS.slice() : filtered
}

function saveHabitDefs(d) {
  sv(K.habitDefs, Array.isArray(d) ? d : DEFAULT_HABITS.slice())
}

module.exports = {
  K, DEFAULT_HABITS,
  ld, sv,
  getCfg, saveCfg,
  getHabitDefs, saveHabitDefs,
}
