/* 📬 文献日推 — 读取用户 fork 的 daily-paper 模板发布的 latest.json，展示每日 1 篇。
 * 仅新增 key：phd_dly_cfg（设置）/ phd_dly_state（已读·反馈·缓存）/ phd_dly_profile（Zotero 画像摘要）。
 * 三者都不进 K（不进入云同步，纯本地）。对现有数据只做一件写操作：「加入精读」向文献库追加一条。 */
(function () {
  'use strict';
  const CFG_KEY = 'phd_dly_cfg', STATE_KEY = 'phd_dly_state', PROF_KEY = 'phd_dly_profile';
  const TEMPLATE_URL = 'https://github.com/nikewq/daily-paper-template';
  const CATS = ['cs.LG', 'cs.CV', 'cs.CL', 'cs.AI', 'stat.ML', 'cs.IR', 'cs.RO', 'eess.IV', 'math.OC', 'q-bio.QM'];
  const PAGE = 10;

  const I18N = {
    zh: {
      tab: '📬 日推', title: '今日论文', minutes: '分钟', score: '相关度',
      problem: '问题', method: '方法', results: '关键结果', why: '为什么与你相关', limits: '局限', anchor: '相关工作定位',
      add: '📚 加入精读', added: '✓ 已在文献库', pdf: '📄 打开 PDF', skip: '不感兴趣', read: '✓ 今日已读',
      skipped: '已记录：不感兴趣（仅存本机）', readDone: '今天不再提醒', addedToast: '已加入文献库，可在学习驾驶舱「从文献库建精读」里选择',
      history: '往期', prev: '上一页', next: '下一页', refresh: '刷新', loading: '加载中…', more: '展开', less: '收起',
      off: '日推总开关已关闭，以下为本机缓存的历史；可在「个人设置 → 文献日推」开启。',
      noNew: 'arXiv 今日无新论文（周五、周六不发布），显示最近一篇。',
      profileHit: '与你的文献库对照', profileNone: '未上传 Zotero 画像',
      guideTitle: '先 fork 模板并配置推荐源', guideFail: '推荐源拉取失败：',
      guideSteps: ['Fork 模板仓库（或 Use this template）', '填 Secrets：LLM_API_KEY、LLM_BASE_URL', '填 Variables（可直接复制下方由你的设置生成的值）', 'Settings → Pages：main 分支 /docs 目录', 'Actions → daily-paper → Run workflow，成功后把 latest.json 地址填到「个人设置 → 文献日推 → 推荐源 URL」'],
      copyVars: '复制 Variables', copied: '已复制', openTpl: '打开模板仓库',
      ovTitle: '📬 今日论文', ovGo: '去看看',
      // settings
      sTitle: '📬 文献日推', sDesc: '每天推 1 篇最新且最相关的 arXiv 论文。抓取在你 fork 的 GitHub Actions 里运行，这里只负责展示；以下设置只存本机，不上报。',
      sEnable: '启用日推', sWindows: '推送时段（本地时间，可多段）', sAddWin: '+ 时段', sDays: '推送日',
      sKw: '研究方向关键词（权重）', sAddKw: '+ 关键词', sCats: 'arXiv 分类', sCustomCat: '其他分类，逗号分隔',
      sExclude: '排除关键词（逗号分隔）', sProfile: 'Zotero 画像（BibTeX / CSV，只存本机）', sProfileNote: '仅用于本地显示"为什么相关"的对照；抓取端的画像请放到 fork 仓库的 profile/ 目录',
      sSource: '推荐源 URL（指向你 fork 仓库发布的 latest.json）', sSave: '保存日推设置', sSaved: '日推设置已保存', sClearProf: '清除画像',
      days: ['日', '一', '二', '三', '四', '五', '六'], kwPh: 'your-keyword', srcPh: 'https://<user>.github.io/<repo>/latest.json'
    },
    en: {
      tab: '📬 Daily', title: "Today's paper", minutes: 'min', score: 'Relevance',
      problem: 'Problem', method: 'Method', results: 'Key results', why: 'Why it matters to you', limits: 'Limitations', anchor: 'Closest prior work',
      add: '📚 Add to reading list', added: '✓ In library', pdf: '📄 Open PDF', skip: 'Not interested', read: '✓ Read today',
      skipped: 'Marked not interested (stored locally)', readDone: 'No more reminders today', addedToast: 'Added to library — pick it in Learning Cockpit → "Deep-read from library"',
      history: 'Previous days', prev: 'Prev', next: 'Next', refresh: 'Refresh', loading: 'Loading…', more: 'More', less: 'Less',
      off: 'Daily paper is turned off. Showing locally cached history; enable it in Settings → Daily paper.',
      noNew: 'No new arXiv papers today (no announcements on Fri/Sat); showing the latest one.',
      profileHit: 'Overlap with your library', profileNone: 'No Zotero profile uploaded',
      guideTitle: 'Fork the template and set the feed URL first', guideFail: 'Could not load the feed: ',
      guideSteps: ['Fork the template repo (or Use this template)', 'Add secrets: LLM_API_KEY, LLM_BASE_URL', 'Add variables (copy the values generated from your settings below)', 'Settings → Pages: branch main, folder /docs', 'Actions → daily-paper → Run workflow, then paste the latest.json URL into Settings → Daily paper → Feed URL'],
      copyVars: 'Copy variables', copied: 'Copied', openTpl: 'Open template repo',
      ovTitle: "📬 Today's paper", ovGo: 'Open',
      sTitle: '📬 Daily paper', sDesc: 'One new, most relevant arXiv paper per day. Fetching runs in your own fork via GitHub Actions; this page only displays it. These settings stay on this device.',
      sEnable: 'Enable', sWindows: 'Push windows (local time, multiple allowed)', sAddWin: '+ window', sDays: 'Push days',
      sKw: 'Research keywords (weight)', sAddKw: '+ keyword', sCats: 'arXiv categories', sCustomCat: 'Other categories, comma-separated',
      sExclude: 'Exclude keywords (comma-separated)', sProfile: 'Zotero profile (BibTeX / CSV, stays local)', sProfileNote: 'Only used to show local "why relevant" overlap; put the fetch-side profile into profile/ of your fork',
      sSource: 'Feed URL (latest.json published by your fork)', sSave: 'Save daily-paper settings', sSaved: 'Daily-paper settings saved', sClearProf: 'Clear profile',
      days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], kwPh: 'your-keyword', srcPh: 'https://<user>.github.io/<repo>/latest.json'
    }
  };
  const L = () => I18N[(typeof _lang !== 'undefined' && _lang === 'en') ? 'en' : 'zh'];
  const E = s => escHtml(s == null ? '' : String(s));
  const $ = id => document.getElementById(id);

  const defCfg = () => ({ enabled: false, windows: [{ start: '08:00', end: '10:00' }], days: [1, 2, 3, 4, 5], keywords: [], categories: ['cs.LG'], exclude: [], source: '' });
  const getCfg_ = () => Object.assign(defCfg(), _safeGetItem(CFG_KEY, {}) || {});
  const getState = () => Object.assign({ acked: {}, feedback: {}, cache: {} }, _safeGetItem(STATE_KEY, {}) || {});
  const setState = s => {
    const cutoff = localDate(new Date(Date.now() - 60 * 864e5));
    Object.keys(s.acked).forEach(d => { if (d < cutoff) delete s.acked[d]; });
    sv(STATE_KEY, s);
  };
  const getProfile = () => _safeGetItem(PROF_KEY, null);

  // ── schedule ──
  const hm = d => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  function inWindow(cfg, now = new Date()) {
    if (!cfg.days.includes(now.getDay())) return false;
    const t = hm(now);
    return cfg.windows.some(w => w.start && w.end && (w.start <= w.end ? (t >= w.start && t < w.end) : (t >= w.start || t < w.end)));
  }
  function shouldAlert() {
    const cfg = getCfg_(), st = getState();
    return cfg.enabled && !!cfg.source && inWindow(cfg) && !st.acked[today()] && !!st.cache.latest;
  }

  // ── feed ──
  const baseOf = src => src.replace(/latest\.json(\?.*)?$/, '').replace(/\/?$/, '/');
  async function getJSON(url) {
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + '_=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status + ' · ' + url);
    return r.json();
  }
  let _loading = null;
  function refresh(force) {
    const cfg = getCfg_(), st = getState();
    if (!cfg.source) return Promise.resolve();
    if (!force && st.cache.fetchedAt && Date.now() - st.cache.fetchedAt < 30 * 60e3 && st.cache.source === cfg.source) return Promise.resolve();
    if (_loading) return _loading;
    const base = baseOf(cfg.source);
    _loading = Promise.all([getJSON(cfg.source), getJSON(base + 'index.json').catch(() => null), getJSON(base + 'status.json').catch(() => null)])
      .then(([latest, index, status]) => {
        const s = getState();
        s.cache = { latest, index: Array.isArray(index) ? index : (s.cache.index || []), status, fetchedAt: Date.now(), source: cfg.source, err: '' };
        setState(s);
      })
      .catch(e => { const s = getState(); s.cache.err = e.message; s.cache.fetchedAt = Date.now(); setState(s); })
      .finally(() => { _loading = null; renderAll(); });
    return _loading;
  }

  // ── helpers ──
  const tokens = s => (String(s || '').toLowerCase().match(/[a-z][a-z0-9\-]{2,}/g) || []);
  function hiNumbers(s) {
    return E(s).replace(/(\d+(?:\.\d+)?\s?(?:%|×|x\b|pp\b|points?\b|dB\b)?)/g, '<mark class="dly-num">$1</mark>');
  }
  function hiKeywords(s, kws) {
    let h = E(s);
    kws.filter(k => k.k).sort((a, b) => b.k.length - a.k.length).forEach(k => {
      const re = new RegExp('(' + k.k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      h = h.replace(re, '<mark class="dly-kw">$1</mark>');
    });
    return h;
  }
  function profileOverlap(p) {
    const prof = getProfile();
    if (!prof || !prof.terms) return null;
    const pt = new Set(tokens([p.title, p.problem, p.method, p.one_line_contribution].join(' ')));
    const terms = prof.terms.filter(t => pt.has(t)).slice(0, 6);
    let best = null, bestS = 0;
    (prof.titles || []).forEach(t => {
      const tt = new Set(tokens(t)); let n = 0; tt.forEach(x => { if (pt.has(x)) n++; });
      const s = tt.size ? n / tt.size : 0; if (s > bestS) { bestS = s; best = t; }
    });
    return { terms, closest: bestS >= 0.25 ? best : null };
  }
  const inLib = id => ld(K.papers).some(x => x.arxiv_id === id);

  // ── paper card ──
  function section(label, html, cls = '') {
    if (!html) return '';
    return `<div class="dly-sec ${cls}"><div class="dly-sec-h">${E(label)}</div><div class="dly-clamp" onclick="this.classList.toggle('open')">${html}</div></div>`;
  }
  function paperHTML(p, opts = {}) {
    const l = L(), cfg = getCfg_(), fb = getState().feedback[p.arxiv_id];
    const authors = (p.authors || []).slice(0, 3).join(', ') + ((p.authors || []).length > 3 ? ' et al.' : '');
    const ov = profileOverlap(p);
    const ovHTML = ov ? `<div class="dly-prof">🔗 ${E(l.profileHit)}：${ov.terms.length ? ov.terms.map(x => `<span class="dly-chip">${E(x)}</span>`).join('') : '—'}${ov.closest ? ` · ≈ <i>${E(ov.closest)}</i>` : ''}</div>` : '';
    return `<article class="dly-paper">
      <div class="dly-meta">${E(p.date)} · ${(p.categories || []).map(E).join(' ')}
        <span class="dly-badge" title="${E(p.score_reason)}">${E(l.score)} ${E(p.score)}</span>
        <span class="dly-badge dly-soft">⏱ ${E(p.reading_time_min)} ${E(l.minutes)}</span></div>
      <h3 class="dly-title"><a href="https://arxiv.org/abs/${E(p.arxiv_id)}" target="_blank" rel="noopener">${E(p.title)}</a></h3>
      <div class="dly-authors">${E(authors)} · arXiv:${E(p.arxiv_id)}</div>
      <div class="dly-one">${E(p.one_line_contribution)}</div>
      <div class="dly-reason">💡 ${E(p.score_reason)}</div>
      <div class="dly-grid">
        ${section(l.problem, E(p.problem))}
        ${section(l.method, E(p.method))}
        ${section(l.results, hiNumbers(p.key_results), 'dly-results')}
        ${section(l.why, hiKeywords(p.why_relevant, cfg.keywords) + ovHTML)}
        ${section(l.limits, E(p.limitations))}
        ${section(l.anchor, E(p.related_anchor))}
      </div>
      <div class="dly-actions">
        ${inLib(p.arxiv_id) ? `<button class="btn btn-ghost btn-sm" disabled>${E(l.added)}</button>` : `<button class="btn btn-primary btn-sm" onclick="dlyAdd('${E(p.arxiv_id)}')">${E(l.add)}</button>`}
        <button class="btn btn-ghost btn-sm" onclick="dlyPdf('${E(p.arxiv_id)}')">${E(l.pdf)}</button>
        <button class="btn btn-ghost btn-sm ${fb === '-' ? 'dly-on' : ''}" onclick="dlySkip('${E(p.arxiv_id)}')">${E(l.skip)}</button>
        ${opts.today ? `<button class="btn btn-ghost btn-sm" onclick="dlyAck('read')">${E(l.read)}</button>` : ''}
      </div></article>`;
  }

  // ── guide ──
  function varsText() {
    const c = getCfg_();
    return [
      'ENABLED=true',
      'KEYWORDS=' + (c.keywords.map(k => k.w && k.w !== 1 ? `${k.k}:${k.w}` : k.k).join(', ') || 'your-keyword'),
      'CATEGORIES=' + (c.categories.join(', ') || 'cs.LG'),
      'EXCLUDE_KEYWORDS=' + c.exclude.join(', '),
      'MODEL_NAME=gpt-4o-mini',
      'LANGUAGE=' + ((typeof _lang !== 'undefined' && _lang === 'en') ? 'English' : 'Chinese'),
      'RUN_HOUR_UTC=' + suggestHour(c)
    ].join('\n');
  }
  function suggestHour(c) {
    const st = (c.windows[0] && c.windows[0].start) || '08:00';
    const [h, m] = st.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    return (d.getUTCHours() + 23) % 24;
  }
  function guideHTML(err) {
    const l = L();
    return `<div class="dly-guide">
      <div class="dly-guide-h">🧭 ${E(l.guideTitle)}</div>
      ${err ? `<div class="dly-err">${E(l.guideFail)}${E(err)}</div>` : ''}
      <ol>${l.guideSteps.map(s => `<li>${E(s)}</li>`).join('')}</ol>
      <pre class="dly-pre" id="dly-vars">${E(varsText())}</pre>
      <div class="dly-actions">
        <button class="btn btn-primary btn-sm" onclick="dlyCopyVars(this)">${E(l.copyVars)}</button>
        <a class="btn btn-ghost btn-sm" href="${TEMPLATE_URL}" target="_blank" rel="noopener">${E(l.openTpl)} ↗</a>
        <button class="btn btn-ghost btn-sm" onclick="switchPage('settings');setTimeout(()=>{const e=document.getElementById('dly-settings');e&&e.scrollIntoView({behavior:'smooth'})},80)">⚙️</button>
      </div></div>`;
  }

  // ── tab ──
  let _page = 0, _openDay = null, _dayCache = {};
  function renderTab() {
    const el = $('rs-dly'); if (!el || el.style.display === 'none') return;
    const l = L(), cfg = getCfg_(), st = getState(), c = st.cache || {};
    let html = '';
    if (!cfg.enabled) html += `<div class="dly-note">${E(l.off)}</div>`;
    if (!cfg.source || (!c.latest && c.err)) html += guideHTML(cfg.source ? c.err : '');
    else if (!c.latest) html += `<div class="dly-note">${E(l.loading)}</div>`;
    if (c.latest) {
      if (c.status && c.status.status === 'no_new_papers') html += `<div class="dly-note">${E(l.noNew)}</div>`;
      if (c.err) html += `<div class="dly-err">${E(l.guideFail)}${E(c.err)}</div>`;
      html += `<div class="dly-head"><span>${E(l.title)}</span><button class="btn btn-ghost btn-sm" onclick="dlyRefresh()">↻ ${E(l.refresh)}</button></div>` + paperHTML(c.latest, { today: true });
    }
    const idx = (c.index || []).filter(x => !c.latest || x.date !== c.latest.date);
    if (idx.length) {
      const pages = Math.ceil(idx.length / PAGE); _page = Math.min(_page, pages - 1);
      html += `<div class="dly-head"><span>${E(l.history)}</span><span class="dly-pager">
        <button class="btn btn-ghost btn-sm" ${_page ? '' : 'disabled'} onclick="dlyPage(-1)">${E(l.prev)}</button>
        ${_page + 1}/${pages}
        <button class="btn btn-ghost btn-sm" ${_page < pages - 1 ? '' : 'disabled'} onclick="dlyPage(1)">${E(l.next)}</button></span></div>`;
      html += idx.slice(_page * PAGE, _page * PAGE + PAGE).map(x => `<div class="dly-row ${_openDay === x.date ? 'open' : ''}">
          <div class="dly-row-h" onclick="dlyOpenDay('${E(x.date)}')"><span class="dly-date">${E(x.date)}</span><span class="dly-row-t">${E(x.title)}</span><span class="dly-badge">${E(x.score)}</span></div>
          ${_openDay === x.date ? `<div class="dly-row-b">${_dayCache[x.date] ? paperHTML(_dayCache[x.date]) : E(l.loading)}</div>` : ''}</div>`).join('');
    }
    el.innerHTML = `<div class="dly-wrap">${html}</div>`;
  }
  function renderDot() {
    const b = $('rtab-dly-btn'); if (!b) return;
    b.classList.toggle('dly-dot', shouldAlert());
    b.textContent = L().tab;
  }
  function renderOverview() {
    const slot = $('dly-ov-card'); if (!slot) return;
    if (!shouldAlert()) { slot.innerHTML = ''; slot.hidden = true; return; }
    const p = getState().cache.latest, l = L();
    slot.hidden = false;
    slot.innerHTML = `<div class="card dly-ov"><div class="dly-ov-h">${E(l.ovTitle)}<span class="dly-badge">${E(l.score)} ${E(p.score)}</span><span class="dly-badge dly-soft">⏱ ${E(p.reading_time_min)} ${E(l.minutes)}</span></div>
      <div class="dly-ov-t">${E(p.title)}</div><div class="dly-ov-one">${E(p.one_line_contribution)}</div>
      <div class="dly-actions"><button class="btn btn-primary btn-sm" onclick="dlyGo()">${E(l.ovGo)} →</button>
      <button class="btn btn-ghost btn-sm" onclick="dlyAck('read')">${E(l.read)}</button>
      <button class="btn btn-ghost btn-sm" onclick="dlySkip('${E(p.arxiv_id)}')">${E(l.skip)}</button></div></div>`;
  }
  function renderAll() { renderDot(); renderOverview(); renderTab(); }

  // ── actions (global for inline handlers) ──
  function findPaper(id) {
    const c = getState().cache;
    if (c.latest && c.latest.arxiv_id === id) return c.latest;
    return Object.values(_dayCache).find(p => p.arxiv_id === id) || null;
  }
  window.dlyAdd = function (id) {
    const p = findPaper(id); if (!p) return;
    const lib = ld(K.papers);
    if (lib.some(x => x.arxiv_id === id)) { toast(L().added); return; }
    const cfg = getCfg_(), text = [p.problem, p.method, p.key_results].join(' ').toLowerCase();
    const area = (cfg.keywords.find(k => k.k && text.includes(k.k.toLowerCase())) || {}).k || '';
    lib.unshift({
      id: 'arxiv_' + id.replace(/\W/g, '_'), arxiv_id: id, title: p.title, authors: (p.authors || []).join(', '),
      abstract: [p.one_line_contribution, p.problem, p.method, p.key_results].filter(Boolean).join('\n\n'),
      url: 'https://arxiv.org/abs/' + id, pdf_url: p.pdf_url || 'https://arxiv.org/pdf/' + id, code_url: '',
      date: p.date || '', venue: 'arXiv', figure: '', score: p.score || 0, summary: p.one_line_contribution || '', area,
      source: 'daily-paper', addedAt: today()
    });
    sv(K.papers, lib);
    const st = getState(); st.feedback[id] = '+'; setState(st);
    if (typeof renderPapersPage === 'function') renderPapersPage();
    toast('📚 ' + L().addedToast); renderAll();
  };
  window.dlyPdf = function (id) {
    const p = findPaper(id); window.open((p && p.pdf_url) || 'https://arxiv.org/pdf/' + id, '_blank', 'noopener');
    const st = getState(); if (st.feedback[id] !== '-') st.feedback[id] = '+'; setState(st);
  };
  window.dlySkip = function (id) {
    const st = getState(); st.feedback[id] = '-';
    if (st.cache.latest && st.cache.latest.arxiv_id === id) st.acked[today()] = 'skip';
    setState(st); toast(L().skipped); renderAll();
  };
  window.dlyAck = function (kind) { const st = getState(); st.acked[today()] = kind; setState(st); toast(L().readDone); renderAll(); };
  window.dlyRefresh = function () { refresh(true); renderTab(); };
  window.dlyPage = function (d) { _page += d; _openDay = null; renderTab(); };
  window.dlyOpenDay = function (date) {
    _openDay = _openDay === date ? null : date; renderTab();
    if (_openDay && !_dayCache[date]) {
      const src = getCfg_().source; if (!src) return;
      getJSON(baseOf(src) + 'daily/' + date + '.json').then(p => { _dayCache[date] = p; renderTab(); })
        .catch(e => { _dayCache[date] = null; toast(e.message, 'error'); });
    }
  };
  window.dlyGo = function () { switchPage('submissions'); switchResearchTab('dly'); };
  window.dlyCopyVars = function (btn) {
    const t = varsText();
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { btn.textContent = L().copied; })
      .catch(() => { const r = document.createRange(); r.selectNodeContents($('dly-vars')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  };

  // ── research-tab hook (called at the end of switchResearchTab) ──
  window.dlyOnResearchTab = function (tab) {
    const on = tab === 'dly', el = $('rs-dly'), b = $('rtab-dly-btn');
    if (b) b.classList.toggle('active', on);
    if (!el) return;
    el.style.display = on ? 'block' : 'none';
    if (on) {
      const lay = document.querySelector('.research-layout'), wr = $('rs-writing');
      if (lay) lay.style.display = 'none';
      if (wr) wr.style.display = 'none';
      if (getCfg_().enabled) refresh(false);
      renderAll();
    }
  };

  // ── settings ──
  function renderSettings() {
    const el = $('dly-settings'); if (!el) return;
    const l = L(), c = getCfg_(), prof = getProfile();
    const custom = c.categories.filter(x => !CATS.includes(x)).join(', ');
    el.innerHTML = `<h3>${E(l.sTitle)}</h3>
      <div class="dly-sdesc">${E(l.sDesc)}</div>
      <label class="dly-switch"><input type="checkbox" id="dly-s-en" ${c.enabled ? 'checked' : ''}> ${E(l.sEnable)}</label>
      <div class="dly-field"><label>${E(l.sWindows)}</label><div id="dly-s-wins">${c.windows.map((w, i) => winRow(w, i)).join('')}</div>
        <button class="btn btn-ghost btn-sm" onclick="dlyAddWin()">${E(l.sAddWin)}</button></div>
      <div class="dly-field"><label>${E(l.sDays)}</label><div class="dly-chips">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label class="dly-chipbox"><input type="checkbox" class="dly-s-day" value="${d}" ${c.days.includes(d) ? 'checked' : ''}><span>${E(l.days[d])}</span></label>`).join('')}</div></div>
      <div class="dly-field"><label>${E(l.sKw)}</label><div id="dly-s-kws">${c.keywords.map(kwRow).join('')}</div>
        <button class="btn btn-ghost btn-sm" onclick="dlyAddKw()">${E(l.sAddKw)}</button></div>
      <div class="dly-field"><label>${E(l.sCats)}</label><div class="dly-chips">${CATS.map(x => `<label class="dly-chipbox"><input type="checkbox" class="dly-s-cat" value="${E(x)}" ${c.categories.includes(x) ? 'checked' : ''}><span>${E(x)}</span></label>`).join('')}</div>
        <input id="dly-s-cat-x" placeholder="${E(l.sCustomCat)}" value="${E(custom)}"></div>
      <div class="dly-field"><label>${E(l.sExclude)}</label><input id="dly-s-ex" value="${E(c.exclude.join(', '))}"></div>
      <div class="dly-field"><label>${E(l.sProfile)}</label>
        <input type="file" id="dly-s-prof" accept=".bib,.csv,.txt" onchange="dlyLoadProfile(this)">
        <div class="dly-sdesc">${prof ? `✅ ${E(prof.name)} · ${E(prof.count)} · <a href="#" onclick="event.preventDefault();dlyClearProfile()">${E(l.sClearProf)}</a>` : E(l.profileNone)} — ${E(l.sProfileNote)}</div></div>
      <div class="dly-field"><label>${E(l.sSource)}</label><input id="dly-s-src" placeholder="${E(l.srcPh)}" value="${E(c.source)}"></div>
      <button class="btn btn-primary" onclick="dlySaveSettings()">${E(l.sSave)}</button>`;
  }
  const winRow = (w, i) => `<div class="dly-inline dly-win"><input type="time" value="${E(w.start)}"> – <input type="time" value="${E(w.end)}"><button class="btn btn-ghost btn-sm" onclick="this.parentNode.remove()">✕</button></div>`;
  const kwRow = k => `<div class="dly-inline dly-kwr"><input class="dly-kw-k" placeholder="${E(L().kwPh)}" value="${E(k.k)}"><input class="dly-kw-w" type="number" min="0.1" step="0.1" value="${E(k.w == null ? 1 : k.w)}"><button class="btn btn-ghost btn-sm" onclick="this.parentNode.remove()">✕</button></div>`;
  window.dlyAddWin = () => $('dly-s-wins').insertAdjacentHTML('beforeend', winRow({ start: '08:00', end: '10:00' }));
  window.dlyAddKw = () => $('dly-s-kws').insertAdjacentHTML('beforeend', kwRow({ k: '', w: 1 }));
  window.dlySaveSettings = function () {
    const split = s => s.split(/[,，;；\n]/).map(x => x.trim()).filter(Boolean);
    const cats = [...document.querySelectorAll('.dly-s-cat:checked')].map(x => x.value).concat(split($('dly-s-cat-x').value));
    const cfg = {
      enabled: $('dly-s-en').checked,
      windows: [...document.querySelectorAll('.dly-win')].map(r => { const [a, b] = r.querySelectorAll('input'); return { start: a.value, end: b.value }; }).filter(w => w.start && w.end),
      days: [...document.querySelectorAll('.dly-s-day:checked')].map(x => +x.value),
      keywords: [...document.querySelectorAll('.dly-kwr')].map(r => ({ k: r.querySelector('.dly-kw-k').value.trim(), w: parseFloat(r.querySelector('.dly-kw-w').value) || 1 })).filter(k => k.k),
      categories: [...new Set(cats)],
      exclude: split($('dly-s-ex').value),
      source: $('dly-s-src').value.trim()
    };
    sv(CFG_KEY, cfg); toast(L().sSaved);
    if (cfg.enabled && cfg.source) refresh(true);
    renderAll();
  };
  window.dlyLoadProfile = function (input) {
    const f = input.files && input.files[0]; if (!f) return;
    f.text().then(txt => {
      const titles = [];
      if (/\.csv$/i.test(f.name)) {
        const head = (txt.split(/\r?\n/)[0] || '').split(',').map(x => x.replace(/"/g, '').trim().toLowerCase());
        const ti = head.indexOf('title');
        txt.split(/\r?\n/).slice(1).forEach(line => {
          const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || [];
          const v = (cells[ti] || '').replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim();
          if (ti >= 0 && v) titles.push(v);
        });
      } else {
        (txt.match(/\btitle\s*=\s*[{"](.+?)[}"]\s*,?\s*\n/gis) || []).forEach(m => titles.push(m.replace(/^\s*title\s*=\s*[{"]/i, '').replace(/[}"]\s*,?\s*$/, '').replace(/[{}]/g, '').trim()));
      }
      const cnt = {}; titles.forEach(t => tokens(t).forEach(w => { if (!/^(with|from|for|and|the|via|using|towards|based|learning|model|models|network|networks|approach|method)$/.test(w)) cnt[w] = (cnt[w] || 0) + 1; }));
      const terms = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 60).map(x => x[0]);
      sv(PROF_KEY, { name: f.name, count: titles.length, terms, titles: titles.slice(0, 400) });
      renderSettings(); renderTab();
    });
  };
  window.dlyClearProfile = () => { localStorage.removeItem(PROF_KEY); renderSettings(); renderTab(); };

  // ── boot ──
  function mergeI18n() {
    if (typeof _I18N === 'undefined') return;
    ['zh', 'en'].forEach(lang => { _I18N[lang]['research.tab.dly'] = I18N[lang].tab; });
  }
  function init() {
    mergeI18n();
    const _set = window.setLang;
    if (typeof _set === 'function' && !_set._dly) {
      const wrapped = function (lang) { const r = _set.apply(this, arguments); renderAll(); renderSettings(); return r; };
      wrapped._dly = true; Object.keys(_set).forEach(k => { wrapped[k] = _set[k]; }); window.setLang = wrapped;
    }
    renderSettings(); renderAll();
    if (getCfg_().enabled) refresh(false);
    setInterval(() => { renderDot(); renderOverview(); }, 60e3);
  }
  window.dlyInternals = { inWindow, baseOf, suggestHour, hiNumbers };
  window.dlyRenderSettings = renderSettings;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
