/* 🌊 心流小组件 — 概览页身份卡中部。
 * 番茄模式：完全复用现有计时器（全局 pomo + togglePomo/resetPomo），心流记录仍由原代码写入，本模块只读 K.pomos 做今日统计。
 * Flow 正计时模式：状态存 phd_focus_flow_v1；结束时按原有记录格式 {id,date,taskId,taskTitle,dur,ts} 追加一条。
 * 偏好 phd_focus_prefs = {work,brk,goal,notify,sound,mode}，不进 K。 */
(function () {
  'use strict';
  const PREF = 'phd_focus_prefs', FLOW = 'phd_focus_flow_v1', PRESETS = [25, 50, 90];
  const I18N = {
    zh: {
      ready: '准备开始', focusing: '专注中', paused: '已暂停', resting: '休息中', flowRun: 'Flow 心流中', flowPaused: 'Flow 已暂停',
      start: '开始', pause: '暂停', resume: '继续', reset: '重置', skip: '跳过休息', end: '结束', full: '打开心流时光',
      pomo: '番茄', flow: 'Flow', min: '分', today: '今日', seg: '段', free: '自由专注', task: '关联任务',
      budget: '可休息 {n} 分', restN: '休息 {n} 分', settings: '设置', goal: '每日目标（段）', brk: '番茄休息（分）',
      notify: '系统通知', sound: '提示音', keys: '快捷键：Alt+P 开始/暂停，Alt+R 重置/结束',
      busy: '另一个计时正在进行', flowShort: '不足 1 分钟，未记录', flowSaved: '🌊 Flow 完成：专注 {n} 分钟，已记入心流记录',
      nWork: '一段专注完成 🎉', nWorkB: '休息一下吧。', nBreak: '休息结束', nBreakB: '准备好开始下一段专注了吗？', nFlow: 'Flow 结束',
      denied: '浏览器拒绝了通知权限，可在地址栏左侧的站点设置里开启'
    },
    en: {
      ready: 'Ready', focusing: 'Focusing', paused: 'Paused', resting: 'On break', flowRun: 'In flow', flowPaused: 'Flow paused',
      start: 'Start', pause: 'Pause', resume: 'Resume', reset: 'Reset', skip: 'Skip break', end: 'Finish', full: 'Open focus page',
      pomo: 'Pomodoro', flow: 'Flow', min: 'min', today: 'Today', seg: '', free: 'Free focus', task: 'Linked task',
      budget: 'Break earned {n} min', restN: 'Break {n} min', settings: 'Settings', goal: 'Daily goal (sessions)', brk: 'Pomodoro break (min)',
      notify: 'Notifications', sound: 'Sound', keys: 'Shortcuts: Alt+P start/pause, Alt+R reset/finish',
      busy: 'Another timer is running', flowShort: 'Under 1 minute — not recorded', flowSaved: '🌊 Flow done: {n} min focused, saved to history',
      nWork: 'Focus session done 🎉', nWorkB: 'Time for a break.', nBreak: 'Break is over', nBreakB: 'Ready for the next focus session?', nFlow: 'Flow finished',
      denied: 'Notifications are blocked by the browser; enable them in the site settings'
    }
  };
  const L = () => I18N[(typeof _lang !== 'undefined' && _lang === 'en') ? 'en' : 'zh'];
  const F = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
  const E = s => escHtml(s == null ? '' : String(s));
  const $ = id => document.getElementById(id);
  const p2 = n => String(n).padStart(2, '0');
  const clean = t => String(t || '').replace(/\s*\[\s*\]\s*$/, '');
  const fmt = secs => { secs = Math.max(0, Math.floor(secs)); const h = Math.floor(secs / 3600), m = Math.floor(secs % 3600 / 60), s = secs % 60; return h ? `${h}:${p2(m)}:${p2(s)}` : `${p2(m)}:${p2(s)}`; };

  const prefs = () => Object.assign({ work: 25, brk: 5, goal: 4, notify: false, sound: false, mode: 'pomo' }, _safeGetItem(PREF, {}) || {});
  const setPrefs = patch => sv(PREF, Object.assign(prefs(), patch));
  const getFlow = () => _safeGetItem(FLOW, null);
  const setFlow = f => { if (f) sv(FLOW, f); else localStorage.removeItem(FLOW); };
  const flowElapsed = f => f ? (f.running ? Date.now() - f.start : 0) / 1000 + (f.acc || 0) : 0;
  const pomoSaved = () => { try { return !!localStorage.getItem('phd_pomo_running_v2'); } catch { return false; } };
  const pomoActive = () => pomo.running || pomoSaved();
  const workDur = () => parseInt(($('pomo-work') || {}).value || prefs().work, 10) || 25;
  const brkDur = () => parseInt(($('pomo-break') || {}).value || prefs().brk, 10) || 5;

  // ── alerts ──
  function chime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [[660, 0], [880, 0.18]].forEach(([f, t]) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; o.type = 'sine';
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.5);
        o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.55);
      });
      setTimeout(() => ctx.close(), 1200);
    } catch (_) {}
  }
  function alertUser(title, body) {
    const p = prefs();
    if (p.sound) chime();
    if (p.notify && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body, tag: 'focus-mini', silent: !!p.sound }); } catch (_) {}
    }
  }

  // ── render ──
  let prev = null, settingsOpen = false, suggestBreak = 0;
  function state() {
    const f = getFlow(), p = prefs();
    if (f) return { kind: 'flow', running: f.running, elapsed: flowElapsed(f), task: f.taskTitle };
    const total = (pomo.isBreak ? brkDur() : workDur()) * 60;
    return { kind: 'pomo', running: pomo.running, isBreak: pomo.isBreak, secs: pomo.secs, total, paused: !pomo.running && pomoSaved(), task: pomo.taskTitle, mode: p.mode };
  }
  function todayStats() {
    const list = ld(K.pomos).filter(x => x.date === today());
    return { n: list.length, mins: list.reduce((a, x) => a + (+x.dur || 0), 0) };
  }
  function taskOptions(sel) {
    const src = $('pomo-task-sel');
    const opts = src ? [...src.options].map(o => [o.value, o.text]) : [['', L().free]];
    return opts.map(([v, t]) => `<option value="${E(v)}" ${v === sel ? 'selected' : ''}>${E(v ? clean(t) : L().free)}</option>`).join('');
  }
  let lastStruct = '';
  function render(force) {
    const el = $('focus-mini'); if (!el) return;
    const l = L(), p = prefs(), s = state(), st = todayStats();
    const flowMode = s.kind === 'flow' || (p.mode === 'flow' && !pomoActive());
    const idle = s.kind === 'pomo' && !s.running && !s.paused && !s.isBreak;
    const R = 30, C = 2 * Math.PI * R;
    let label, timeTxt, prog, tone, main, extra = '';
    if (flowMode) {
      const e = s.kind === 'flow' ? s.elapsed : 0;
      label = s.kind !== 'flow' ? l.ready : (s.running ? l.flowRun : l.flowPaused);
      timeTxt = fmt(e); prog = (e % 3600) / 3600; tone = 'flow';
      main = s.kind !== 'flow' ? `<button class="fm-btn fm-primary" onclick="fmFlowStart()" title="Alt+P">▶ ${E(l.start)}</button>`
        : `<button class="fm-btn fm-primary" onclick="fmFlowToggle()" title="Alt+P">${s.running ? '⏸ ' + E(l.pause) : '▶ ' + E(l.resume)}</button>
           <button class="fm-btn" onclick="fmFlowEnd()" title="Alt+R">■ ${E(l.end)}</button>`;
      if (s.kind === 'flow' && e >= 300) extra = `<span class="fm-chip fm-soft">☕ ${E(F(l.budget, { n: Math.max(1, Math.round(e / 60 / 5)) }))}</span>`;
    } else {
      label = s.isBreak ? l.resting : (s.running ? l.focusing : (s.paused ? l.paused : l.ready));
      timeTxt = fmt(s.secs); prog = s.total ? 1 - s.secs / s.total : 0; tone = s.isBreak ? 'brk' : 'work';
      main = `<button class="fm-btn fm-primary" onclick="fmToggle()" title="Alt+P">${s.running ? '⏸ ' + E(l.pause) : (s.paused ? '▶ ' + E(l.resume) : '▶ ' + E(l.start))}</button>
        ${idle ? '' : `<button class="fm-btn" onclick="fmReset()" title="Alt+R">↺</button>`}
        ${s.isBreak ? `<button class="fm-btn" onclick="fmSkipBreak()">⏭ ${E(l.skip)}</button>` : ''}`;
    }
    if (suggestBreak && !pomoActive() && !getFlow()) main += `<button class="fm-btn" onclick="fmStartBreak(${suggestBreak})">☕ ${E(F(l.restN, { n: suggestBreak }))}</button>`;
    const canSwitch = !pomoActive() && !getFlow();
    const presets = !flowMode && idle ? PRESETS.map(m => `<button class="fm-chip ${workDur() === m ? 'on' : ''}" onclick="fmPreset(${m})">${m}</button>`).join('') + `<span class="fm-unit">${E(l.min)}</span>` : '';
    const dots = Array.from({ length: Math.max(p.goal, Math.min(st.n, 8)) }, (_, i) => `<i class="${i < st.n ? 'on' : ''}"></i>`).join('');
    const taskSel = (s.kind === 'flow' || pomo.running || s.paused) ? (s.task && !/^自由专注/.test(s.task) ? `<span class="fm-task" title="${E(clean(s.task))}">🎯 ${E(clean(s.task))}</span>` : '')
      : `<select class="fm-tasksel" title="${E(l.task)}" onchange="fmTask(this.value)">${taskOptions(($('pomo-task-sel') || {}).value || '')}</select>`;
    const off = (C * (1 - Math.min(1, Math.max(0, prog)))).toFixed(1), lv = Math.min(1, Math.max(0, prog)).toFixed(3);
    const html = `
      <div class="fm-ring fm-${tone}" title="${E(label)}">
        <div class="fm-water ${s.running ? '' : 'still'}" style="--lv:@@LV@@"><i></i><i></i></div>
        <svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="${R}" class="fm-track"/><circle cx="36" cy="36" r="${R}" class="fm-bar" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="@@OFF@@"/></svg>
        <span class="fm-time ${timeTxt.length > 5 ? 'long' : ''}">@@TIME@@</span></div>
      <div class="fm-side">
        <div class="fm-row fm-head"><span class="fm-label fm-${tone}">${E(label)}</span>
          <span class="fm-seg ${canSwitch ? '' : 'locked'}" title="${canSwitch ? '' : E(l.busy)}">
            <button class="${flowMode ? '' : 'on'}" onclick="fmMode('pomo')">🍅 ${E(l.pomo)}</button><button class="${flowMode ? 'on' : ''}" onclick="fmMode('flow')">⏱ ${E(l.flow)}</button></span>
          <span style="flex:1"></span>
          <button class="fm-icon ${p.notify || p.sound ? 'on' : ''}" onclick="fmSettings()" title="${E(l.settings)}">${p.notify || p.sound ? '🔔' : '⚙'}</button>
          <button class="fm-icon" onclick="switchPage('focus')" title="${E(l.full)}">⤢</button></div>
        <div class="fm-row">${main}${taskSel}</div>
        <div class="fm-row fm-foot">${presets}${extra}<span style="flex:1"></span>
          <span class="fm-stat" title="${E(l.today)}: ${st.n} · ${st.mins} ${E(l.min)}"><span class="fm-dots">${dots}</span> ${st.n}${E(l.seg)} · ${st.mins}${E(l.min)}</span></div>
        ${settingsOpen ? `<div class="fm-pop">
          <label>${E(l.goal)} <input type="number" min="1" max="16" value="${p.goal}" onchange="fmSet('goal',+this.value||4)"></label>
          <label>${E(l.brk)} <input type="number" min="1" max="30" value="${brkDur()}" onchange="fmSetBrk(+this.value||5)"></label>
          <label class="fm-check"><input type="checkbox" ${p.notify ? 'checked' : ''} onchange="fmNotify(this.checked)"> ${E(l.notify)}</label>
          <label class="fm-check"><input type="checkbox" ${p.sound ? 'checked' : ''} onchange="fmSet('sound',this.checked)"> ${E(l.sound)}</label>
          <div class="fm-keys">${E(l.keys)}</div></div>` : ''}
      </div>`;
    const typing = el.contains(document.activeElement) && /^(SELECT|INPUT)$/.test(document.activeElement.tagName);
    if (force || (html !== lastStruct && !typing)) {
      el.innerHTML = html.replace('@@OFF@@', off).replace('@@LV@@', lv).replace('@@TIME@@', timeTxt); lastStruct = html;
    } else {
      const t = el.querySelector('.fm-time'), bar = el.querySelector('.fm-bar');
      if (t) t.textContent = timeTxt;
      if (bar) bar.setAttribute('stroke-dashoffset', off);
      const w = el.querySelector('.fm-water'); if (w) w.style.setProperty('--lv', lv);
    }
    const card = $('identity-card');
    if (card) card.classList.toggle('fm-live', !!(s.running));
    if (s.kind === 'flow' && s.running) document.title = `${fmt(s.elapsed)} ⏱ PhD Workstation`;
  }

  // ── transitions (poll) → alerts ──
  function tick() {
    const s = { running: pomo.running, isBreak: pomo.isBreak, secs: pomo.secs };
    if (prev && prev.running && prev.secs <= 2 && prev.isBreak !== s.isBreak) {
      const l = L();
      if (s.isBreak) alertUser(l.nWork, l.nWorkB); else alertUser(l.nBreak, l.nBreakB);
    }
    prev = s;
    if (!document.hidden) render();
  }

  // ── actions ──
  const after = () => { suggestBreak = 0; render(true); };
  window.fmToggle = function () {
    if (getFlow()) return toast(L().busy);
    const sel = $('pomo-task-sel');
    if (!pomo.running && pomoSaved() && sel) {
      // resuming a paused session: togglePomo re-reads the task select, which a page reload resets — restore it first
      if (pomo.taskId && ![...sel.options].some(o => o.value === pomo.taskId)) sel.add(new Option(pomo.taskTitle, pomo.taskId));
      sel.value = pomo.taskId || '';
    } else syncTask();
    togglePomo(); after();
  };
  window.fmReset = function () { resetPomo(); after(); };
  window.fmSkipBreak = function () { if (pomo.isBreak) { resetPomo(); after(); } };
  window.fmPreset = function (m) {
    if (pomoActive()) return;
    const w = $('pomo-work'); if (w) w.value = m;
    setPrefs({ work: m }); pomo.secs = m * 60; updatePomoDisplay(); render(true);
  };
  window.fmTask = function (v) { const sel = $('pomo-task-sel'); if (sel) sel.value = v; };
  function syncTask() {
    const mine = document.querySelector('#focus-mini .fm-tasksel'), sel = $('pomo-task-sel');
    if (mine && sel) sel.value = mine.value;
  }
  window.fmMode = function (m) { if (pomoActive() || getFlow()) return toast(L().busy); setPrefs({ mode: m }); render(true); };
  window.fmSettings = function () { settingsOpen = !settingsOpen; render(true); };
  window.fmSet = function (k, v) { setPrefs({ [k]: v }); render(true); };
  window.fmSetBrk = function (v) { const b = $('pomo-break'); if (b) b.value = v; setPrefs({ brk: v }); render(true); };
  window.fmNotify = function (on) {
    if (!on) return fmSet('notify', false);
    if (!('Notification' in window)) return fmSet('notify', false);
    Notification.requestPermission().then(r => { if (r !== 'granted') toast(L().denied, 'error'); fmSet('notify', r === 'granted'); });
  };
  window.fmFlowStart = function () {
    if (pomoActive()) return toast(L().busy);
    const mine = document.querySelector('#focus-mini .fm-tasksel');
    const taskId = mine ? mine.value : '', taskTitle = taskId && mine ? mine.options[mine.selectedIndex].text : '';
    setFlow({ running: true, start: Date.now(), acc: 0, taskId, taskTitle, began: Date.now() }); after();
  };
  window.fmFlowToggle = function () {
    const f = getFlow(); if (!f) return;
    if (f.running) { f.acc = flowElapsed(f); f.running = false; } else { f.start = Date.now(); f.running = true; }
    setFlow(f); render(true);
  };
  window.fmFlowEnd = function () {
    const f = getFlow(); if (!f) return;
    const mins = Math.floor(flowElapsed(f) / 60), l = L();
    setFlow(null); document.title = 'PhD Workstation';
    if (mins < 1) { toast(l.flowShort); return after(); }
    const list = ld(K.pomos);
    list.push({ id: uid(), date: today(), taskId: f.taskId || '', taskTitle: f.taskTitle || '', dur: mins,
      ts: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) });
    sv(K.pomos, list);
    if (f.taskId) { const tasks = ld(K.tasks), t = tasks.find(x => x.id === f.taskId); if (t) { t.pomos = (t.pomos || 0) + 1; sv(K.tasks, tasks); } }
    if (typeof window.farm_onPomoComplete === 'function') window.farm_onPomoComplete();
    if (typeof renderPomoLog === 'function') renderPomoLog();
    if (typeof updateStats === 'function') updateStats();
    toast(F(l.flowSaved, { n: mins }));
    alertUser(l.nFlow, F(l.flowSaved, { n: mins }));
    suggestBreak = mins >= 5 ? Math.max(1, Math.round(mins / 5)) : 0; render(true);
  };
  // break via the existing countdown machinery, so refresh-restore and records behave exactly as before
  window.fmStartBreak = function (n) {
    if (pomoActive() || getFlow()) return;
    pomo.isBreak = true; pomo.secs = n * 60; pomo.running = true; pomo.taskId = ''; pomo.taskTitle = '';
    _pomoStartInterval(workDur()); _pomoSaveRunning();
    const b = $('pomo-btn'); if (b) b.textContent = '⏸ 暂停';
    updatePomoDisplay(); suggestBreak = 0; render(true);
  };

  // ── keyboard: Alt+P / Alt+R (not while typing) ──
  document.addEventListener('keydown', e => {
    if (!e.altKey || e.ctrlKey || e.metaKey || (e.code !== 'KeyP' && e.code !== 'KeyR')) return;
    const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    const f = getFlow(), flowMode = f || (prefs().mode === 'flow' && !pomoActive());
    if (e.code === 'KeyP') { if (flowMode) (f ? fmFlowToggle : fmFlowStart)(); else fmToggle(); }
    else { if (f) fmFlowEnd(); else if (pomoActive()) fmReset(); }
  });

  // ── boot ──
  function init() {
    const p = prefs(), w = $('pomo-work'), b = $('pomo-break');
    if (w && p.work) w.value = p.work;
    if (b && p.brk) b.value = p.brk;
    if (!pomoActive() && !pomo.isBreak) { pomo.secs = workDur() * 60; updatePomoDisplay(); }
    if (w) w.addEventListener('change', () => { setPrefs({ work: workDur() }); if (!pomoActive()) { pomo.secs = workDur() * 60; updatePomoDisplay(); } });
    if (b) b.addEventListener('change', () => setPrefs({ brk: brkDur() }));
    const _set = window.setLang;
    if (typeof _set === 'function' && !_set._fm) { const wr = function () { const r = _set.apply(this, arguments); render(true); return r; }; Object.keys(_set).forEach(k => { wr[k] = _set[k]; }); wr._fm = true; window.setLang = wr; }
    const _upd = window.updatePomoDisplay;
    if (typeof _upd === 'function' && !_upd._fm) { const wu = function () { const r = _upd.apply(this, arguments); tick(); return r; }; wu._fm = true; window.updatePomoDisplay = wu; }
    prev = { running: pomo.running, isBreak: pomo.isBreak, secs: pomo.secs };
    render(true); setInterval(tick, 500);
  }
  window.fmRender = render;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
