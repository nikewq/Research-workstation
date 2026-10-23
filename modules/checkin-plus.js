/* 🎫 补签卡 + 下班提醒 + 23:59 自动下班 — 概览页签到栏。
 * 补签卡账本 phd_makeup = {since, cards:[{id,src,date,month,used,usedAt}]}（进 K）；提醒去重 phd_ckp_state 不进 K。
 * 补签只向 phd_checkins 追加新记录 {id,date,ci:null,co:null,totalMins:0,makeup:true}；
 * 自动下班只补 since 之后、缺 co 的记录（co='23:59'，累加该段工时，autoCo:true），历史记录不碰。 */
(function () {
  'use strict';
  const STATE = 'phd_ckp_state', MAX = 4, EARN_MINS = 600, AUTO_CO = '23:59';
  const I18N = {
    zh: {
      btn: '🎫 补签卡', title: '🎫 补签日历', bal: '可用 {n} 张', earned: '本月获得 {n}/4', used: '本月补签 {n}/4',
      how: '获得方式：单日工时 ≥ 10 小时（须手动下班，自动补下班的时长不计）或在留言墙发帖（每天 1 张），每月最多 4 张；卡仅当月有效。',
      pick: '点击本月缺勤的日子补签', none: '没有可用的补签卡', cap: '本月补签次数已用完', done: '✅ 已补签 {d}',
      confirm: '用 1 张补签卡补签 {d}？', ok: '确认补签', cancel: '取消', close: '关闭',
      gotHours: '🎫 单日工时超过 10 小时，获得 1 张补签卡', gotWall: '🎫 留言互动，获得 1 张补签卡',
      remind: '🌙 已经 {t} 了，该下班休息了', remindB: '今天辛苦了，记得点「下班签出」。',
      filled: '🤖 {d} 忘记下班，已按 23:59 帮你补上', autoNow: '🤖 已到 23:59，自动帮你下班', auto: '自动补',
      lg: { ci: '已签到', mk: '补签', miss: '可补签', fut: '' }, week: ['一', '二', '三', '四', '五', '六', '日']
    },
    en: {
      btn: '🎫 Make-up', title: '🎫 Make-up calendar', bal: '{n} card(s)', earned: 'Earned {n}/4 this month', used: 'Used {n}/4 this month',
      how: 'Earn a card by working ≥ 10 h in a day (manual check-out only; auto check-out hours do not count) or posting on the message wall (1/day). Up to 4 per month; cards expire at month end.',
      pick: 'Click a missed day this month to fill it', none: 'No make-up cards left', cap: 'Monthly make-up limit reached', done: '✅ Filled {d}',
      confirm: 'Use 1 card to fill {d}?', ok: 'Fill', cancel: 'Cancel', close: 'Close',
      gotHours: '🎫 10+ hours today — earned a make-up card', gotWall: '🎫 Thanks for posting — earned a make-up card',
      remind: '🌙 It is {t} — time to call it a day', remindB: 'Great work today. Remember to check out.',
      filled: '🤖 Forgot to check out on {d} — filled in as 23:59', autoNow: '🤖 23:59 — checked out for you', auto: 'auto',
      lg: { ci: 'Checked in', mk: 'Filled', miss: 'Missed', fut: '' }, week: ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    }
  };
  const L = () => I18N[(typeof _lang !== 'undefined' && _lang === 'en') ? 'en' : 'zh'];
  const F = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
  const $ = id => document.getElementById(id);
  const month = d => d.slice(0, 7);
  const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
  const fromMin = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  function book() {
    const b = _safeGetItem(K.makeup, null);
    if (b && b.since && Array.isArray(b.cards)) return b;
    const nb = { since: today(), cards: [] }; sv(K.makeup, nb); return nb;
  }
  const st = () => Object.assign({ reminded: '' }, _safeGetItem(STATE, {}) || {});
  const cur = () => month(today());
  const earnedN = b => b.cards.filter(c => c.month === cur()).length;
  const usedN = b => b.cards.filter(c => c.used && month(c.used) === cur()).length;
  const avail = b => b.cards.filter(c => c.month === cur() && !c.used);

  function earn(src, date, msg) {
    const b = book(), id = src + ':' + date;
    if (month(date) !== cur() || earnedN(b) >= MAX || b.cards.some(c => c.id === id)) return false;
    b.cards.push({ id, src, date, month: cur(), used: null, usedAt: null });
    sv(K.makeup, b); toast(msg); render(); return true;
  }

  // ── 10h 工时卡：仅统计手动下班的真实记录 ──
  function checkHours() {
    const b = book();
    ld(K.checkins).filter(c => c.date >= b.since && month(c.date) === cur() && !c.makeup && !c.autoCo && c.co && (c.totalMins || 0) >= EARN_MINS)
      .forEach(c => earn('hours', c.date, L().gotHours));
  }

  // ── 自动下班：since 之后、缺 co 的记录 ──
  function autoClose(list, i) {
    const c = list[i], seg = Math.max(0, toMin(AUTO_CO) - toMin(c.ci));
    list[i] = Object.assign({}, c, { co: AUTO_CO, totalMins: (c.totalMins || 0) + seg, autoCo: true });
  }
  function fillPast() {
    const b = book(), list = ld(K.checkins), td = today(), hit = [];
    list.forEach((c, i) => { if (c.date >= b.since && c.date < td && c.ci && !c.co && !c.makeup) { autoClose(list, i); hit.push(c.date); } });
    if (!hit.length) return;
    sv(K.checkins, list); toast(F(L().filled, { d: hit.join(', ') }));
    refreshHost();
  }
  function closeTonight() {
    const b = book(), list = ld(K.checkins), i = list.findIndex(c => c.date === today());
    if (i < 0 || list[i].date < b.since || !list[i].ci || list[i].co || list[i].makeup) return;
    autoClose(list, i); sv(K.checkins, list); toast(L().autoNow); refreshHost();
  }
  function refreshHost() { try { renderCheckin(); renderIdentityCard(); updateStats(); } catch (_) {} }

  // ── 下班提醒：近 30 次手动下班时间中位数 + 30 分钟 ──
  function remindAt() {
    const cos = ld(K.checkins).filter(c => c.co && !c.autoCo && !c.makeup).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30)
      .map(c => toMin(c.co)).filter(m => m >= 12 * 60).sort((a, b) => a - b);
    const med = cos.length >= 5 ? cos[Math.floor(cos.length / 2)] : 21 * 60;
    return Math.min(med + 30, 23 * 60 + 30);
  }
  function checkRemind(now) {
    const c = getTodayCI(), s = st(), nm = now.getHours() * 60 + now.getMinutes();
    if (!c || !c.ci || c.co || c.makeup || s.reminded === today()) return;
    if (nm < remindAt() || nm - toMin(c.ci) < 60) return;
    sv(STATE, Object.assign(s, { reminded: today() }));
    const l = L(), t = fromMin(nm);
    toast(F(l.remind, { t }), 'info');
    try {
      const p = _safeGetItem('phd_focus_prefs', {}) || {};
      if (p.notify && 'Notification' in window && Notification.permission === 'granted') new Notification(F(l.remind, { t }), { body: l.remindB, tag: 'ckp-remind' });
    } catch (_) {}
  }

  function tick() {
    const now = new Date();
    fillPast(); checkHours(); checkRemind(now);
    if (now.getHours() === 23 && now.getMinutes() >= 59) closeTonight();
  }

  // ── 补签 ──
  window.ckpFill = function (d) {
    const b = book(), l = L(), list = ld(K.checkins);
    if (usedN(b) >= MAX) return toast(l.cap, 'error');
    const card = avail(b)[0];
    if (!card) return toast(l.none, 'error');
    if (month(d) !== cur() || d >= today() || list.some(c => c.date === d)) return;
    list.push({ id: uid(), date: d, ci: null, co: null, totalMins: 0, makeup: true });
    card.used = d; card.usedAt = new Date().toISOString();
    sv(K.checkins, list); sv(K.makeup, b);
    toast(F(l.done, { d })); refreshHost(); render(); ckpOpen();
  };
  window.ckpAsk = function (d) {
    const l = L(), el = $('ckp-ask');
    el.innerHTML = `<span>${escHtml(F(l.confirm, { d }))}</span><button class="btn btn-primary btn-sm" onclick="ckpFill('${d}')">${escHtml(l.ok)}</button><button class="btn btn-ghost btn-sm" onclick="this.parentNode.hidden=true">${escHtml(l.cancel)}</button>`;
    el.hidden = false;
  };

  window.ckpOpen = function () {
    if (!$('ckp-modal')) document.body.insertAdjacentHTML('beforeend',
      `<div class="modal-overlay" id="ckp-modal" onclick="if(event.target===this)closeModal('ckp-modal')"><div class="modal" style="max-width:420px"><div id="ckp-body"></div></div></div>`);
    const b = book(), l = L(), td = today(), [y, m] = td.split('-').map(Number);
    const cks = ld(K.checkins), byDate = {}; cks.forEach(c => { byDate[c.date] = byDate[c.date] || c; });
    const days = new Date(y, m, 0).getDate(), lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const canUse = avail(b).length > 0 && usedN(b) < MAX;
    let cells = '<i></i>'.repeat(lead);
    for (let i = 1; i <= days; i++) {
      const d = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`, c = byDate[d];
      const cls = c ? (c.makeup ? 'mk' : 'ci') : (d < td ? 'miss' : 'fut');
      const act = cls === 'miss' && canUse ? ` onclick="ckpAsk('${d}')" role="button" tabindex="0"` : '';
      cells += `<span class="ckp-d ckp-${cls}${d === td ? ' ckp-today' : ''}${act ? ' ckp-go' : ''}" title="${escHtml(l.lg[cls] || '')}"${act}>${i}</span>`;
    }
    $('ckp-body').innerHTML = `
      <div class="modal-title" style="display:flex;align-items:center;gap:8px"><span style="flex:1">${escHtml(l.title)}</span><span class="ckp-pill">${escHtml(F(l.bal, { n: avail(b).length }))}</span></div>
      <div class="ckp-meter"><span>${escHtml(F(l.earned, { n: earnedN(b) }))}</span><span>${escHtml(F(l.used, { n: usedN(b) }))}</span></div>
      <div class="ckp-cal">${l.week.map(w => `<b>${escHtml(w)}</b>`).join('')}${cells}</div>
      <div class="ckp-legend"><span class="ckp-d ckp-ci"></span>${escHtml(l.lg.ci)}<span class="ckp-d ckp-mk"></span>${escHtml(l.lg.mk)}<span class="ckp-d ckp-miss"></span>${escHtml(l.lg.miss)}</div>
      <div class="ckp-ask" id="ckp-ask" hidden></div>
      <div class="ckp-how">${escHtml(canUse ? l.pick : (usedN(b) >= MAX ? l.cap : l.none))}<br>${escHtml(l.how)}</div>
      <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal('ckp-modal')">${escHtml(l.close)}</button></div>`;
    openModal('ckp-modal');
  };

  // ── 签到栏挂载 ──
  function render() {
    const co = $('co-btn'); if (!co) return;
    let btn = $('ckp-btn');
    if (!btn) { btn = document.createElement('button'); btn.id = 'ckp-btn'; btn.className = 'btn btn-ghost'; btn.onclick = () => ckpOpen(); co.after(btn); }
    const n = avail(book()).length;
    btn.textContent = `${L().btn} ×${n}`; btn.classList.toggle('ckp-has', n > 0);
    const c = getTodayCI(), ct = $('ov-citime');
    if (c && c.autoCo && ct && !ct.textContent.includes('🤖')) ct.textContent += ` 🤖${L().auto}`;
  }

  function hook() {
    if (window.renderCheckin && !window.renderCheckin._ckp) {
      const o = window.renderCheckin; window.renderCheckin = function () { const r = o.apply(this, arguments); render(); return r; }; window.renderCheckin._ckp = 1;
    }
    if (window.submitWall && !window.submitWall._ckp) {
      const o = window.submitWall;
      window.submitWall = async function () {
        const r = await o.apply(this, arguments), tip = $('wall-tip');
        if (tip && /^✅/.test(tip.textContent)) earn('wall', today(), L().gotWall);
        return r;
      };
      window.submitWall._ckp = 1;
    }
    if (window.setLang && !window.setLang._ckp) {
      const o = window.setLang; window.setLang = function () { const r = o.apply(this, arguments); render(); return r; }; window.setLang._ckp = 1;
    }
  }

  function boot() {
    if (typeof K === 'undefined' || !K.makeup) return;
    hook(); book(); tick(); render();
    setInterval(tick, 20000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.ckpInternals = { book, remindAt, tick };
})();
