/* 🛡 Rebuttal 工作台 — 挂在「投稿管理」每张卡片下方。
 * 唯一新增 key：phd_rebuttals = { [submission_id]: { submission_id, rounds: [Round…] } }（已注册进 K，进入备份/同步）。
 * 偏好 phd_rbt_prefs = { ai:false }（不进 K）。不读写 phd_subs 以外的任何字段，也不修改投稿记录本身。 */
(function () {
  'use strict';
  const KEY = 'phd_rebuttals', PREF = 'phd_rbt_prefs';
  const CATS = ['experiment', 'clarification', 'writing', 'related_work', 'misunderstanding', 'decline'];
  const SEVS = ['major', 'minor'], STATS = ['todo', 'drafting', 'done'], EXPS = ['todo', 'running', 'done'];

  const I18N = {
    zh: {
      btn: 'Rebuttal', round: '第 {n} 轮', readonly: '（只读）', venue: '类型', conference: '会议', journal: '期刊',
      paste: '📋 粘贴意见', importOR: '⬆ OpenReview JSON', exportMD: '⬇ Markdown', exportTeX: '⬇ LaTeX', exportJSON: '⬇ JSON', importJSON: '⬆ JSON',
      newRound: '＋ 新一轮', wide: '⤢ 宽屏', ai: 'AI 辅助', groupBy: '分组', byReviewer: '按审稿人', byCategory: '按类别',
      allSev: '全部严重度', allStat: '全部状态', addReviewer: '+ 审稿人', addComment: '+ 意见', empty: '还没有审稿意见——点「粘贴意见」或导入 OpenReview JSON',
      cat: { experiment: '实验', clarification: '澄清', writing: '写作', related_work: '相关工作', misunderstanding: '误解', decline: '婉拒' },
      sev: { major: 'major', minor: 'minor' }, stat: { todo: '待处理', drafting: '起草中', done: '已完成' }, exp: { todo: '待做', running: '进行中', done: '已完成' },
      quote: '审稿原文摘录', reviewer: '审稿人', category: '类别', severity: '严重度', status: '回复状态', draft: '回复草稿（Markdown）',
      change: '修改位置（哪一节 / 哪张表）', exps: '关联实验', addExp: '+ 新建实验', pickLab: '从实验进展选择…', expName: '实验名称', expNote: '结果备注',
      xref: '同一问题（跨审稿人引用）', same: '同问题 ×{n}', split: '✂ 在光标处拆分', mergeUp: '⤒ 合并到上一条', del: '删除', aiBtn: '🤖 意图解读',
      pasteTitle: '粘贴审稿意见', pasteHint: '按空行、编号（1. / (a) / W1 / Q1 …）自动切条；识别 "Reviewer 2"、"R3" 等标题切换审稿人，识别 Rating / Confidence 行。切完可在表里合并、拆分、改归属。',
      defaultReviewer: '默认审稿人', parse: '切条预览', addAll: '加入 {n} 条', cancel: '取消',
      orHint: '导入 OpenReview 导出的 forum notes（{"notes":[…]} 或数组；API v1/v2 均可）。匿名 API 现需人机验证，请登录后用 openreview-py 的 client.get_all_notes(forum=…) 导出。',
      confirmReplace: '导入会替换这篇投稿当前的 Rebuttal 数据（原数据先自动导出为 JSON 备份）。继续？', confirmDel: '删除这条意见？', confirmRound: '开始第 {n} 轮？当前轮将变为只读。',
      noAI: '请先在「个人设置 → AI 模型设置」配置模型', aiNote: 'AI 只给意图解读与回复结构建议，不写最终回复。投稿前请核对会议的生成式 AI 政策（如 ACL/ARR 要求披露）。',
      progress: '完成度', imported: '已导入 {n} 条', todoMark: '[TODO: 待回复]', noChange: 'No change to the manuscript.',
      shared: '多位审稿人共同关心的问题', closeWide: '关闭'
    },
    en: {
      btn: 'Rebuttal', round: 'Round {n}', readonly: ' (read-only)', venue: 'Type', conference: 'Conference', journal: 'Journal',
      paste: '📋 Paste reviews', importOR: '⬆ OpenReview JSON', exportMD: '⬇ Markdown', exportTeX: '⬇ LaTeX', exportJSON: '⬇ JSON', importJSON: '⬆ JSON',
      newRound: '＋ New round', wide: '⤢ Wide', ai: 'AI assist', groupBy: 'Group', byReviewer: 'By reviewer', byCategory: 'By category',
      allSev: 'All severity', allStat: 'All status', addReviewer: '+ Reviewer', addComment: '+ Comment', empty: 'No comments yet — paste reviews or import OpenReview JSON',
      cat: { experiment: 'Experiment', clarification: 'Clarification', writing: 'Writing', related_work: 'Related work', misunderstanding: 'Misunderstanding', decline: 'Decline' },
      sev: { major: 'major', minor: 'minor' }, stat: { todo: 'To do', drafting: 'Drafting', done: 'Done' }, exp: { todo: 'To do', running: 'Running', done: 'Done' },
      quote: 'Reviewer quote', reviewer: 'Reviewer', category: 'Category', severity: 'Severity', status: 'Status', draft: 'Response draft (Markdown)',
      change: 'Manuscript change location', exps: 'Linked experiments', addExp: '+ New experiment', pickLab: 'Pick from experiments…', expName: 'Experiment', expNote: 'Result note',
      xref: 'Same issue raised by (cross-refs)', same: 'Same issue ×{n}', split: '✂ Split at cursor', mergeUp: '⤒ Merge into previous', del: 'Delete', aiBtn: '🤖 Explain intent',
      pasteTitle: 'Paste reviews', pasteHint: 'Splits on blank lines and numbering (1. / (a) / W1 / Q1 …); headings like "Reviewer 2" or "R3" switch reviewer; Rating / Confidence lines are captured. Merge, split or reassign afterwards in the table.',
      defaultReviewer: 'Default reviewer', parse: 'Preview split', addAll: 'Add {n}', cancel: 'Cancel',
      orHint: 'Import forum notes exported from OpenReview ({"notes":[…]} or an array; API v1/v2). Anonymous API access now requires a challenge, so export after login with openreview-py client.get_all_notes(forum=…).',
      confirmReplace: 'Importing replaces this submission\'s rebuttal data (the current data is downloaded as a JSON backup first). Continue?', confirmDel: 'Delete this comment?', confirmRound: 'Start round {n}? The current round becomes read-only.',
      noAI: 'Configure a model in Settings → AI first', aiNote: 'AI only explains intent and suggests a response structure; it never writes the final reply. Check the venue\'s generative-AI policy (e.g. ACL/ARR require disclosure).',
      progress: 'Progress', imported: 'Imported {n}', todoMark: '[TODO: response]', noChange: 'No change to the manuscript.',
      shared: 'Concerns shared by several reviewers', closeWide: 'Close'
    }
  };
  const L = () => I18N[(typeof _lang !== 'undefined' && _lang === 'en') ? 'en' : 'zh'];
  const F = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
  const E = s => escHtml(s == null ? '' : String(s));

  // ── storage ──
  const all = () => _safeGetItem(KEY, {}) || {};
  const prefs = () => Object.assign({ ai: false }, _safeGetItem(PREF, {}) || {});
  const newRound = (sid, n, venue, reviewers) => ({ submission_id: sid, venue_type: venue || 'conference', round: n, reviewers: reviewers || [], comments: [], created: today() });
  function getDoc(sid) { return all()[sid] || null; }
  function ensureDoc(sid) { return getDoc(sid) || { submission_id: sid, rounds: [newRound(sid, 1)] }; }
  function saveDoc(doc) { const a = all(); a[doc.submission_id] = doc; sv(KEY, a); }
  const cur = doc => doc.rounds[doc.rounds.length - 1];

  const ui = {};
  const U = sid => (ui[sid] = ui[sid] || { open: false, view: null, group: 'reviewer', sev: '', stat: '', exp: new Set() });

  // ── progress ──
  function progress(r) {
    let tot = 0, done = 0;
    (r ? r.comments : []).forEach(c => { const w = c.severity === 'major' ? 2 : 1; tot += w; if (c.response_status === 'done') done += w; });
    return tot ? Math.round(done / tot * 100) : 0;
  }

  // ── parsing pasted text ──
  const RE_REV = /^\s*(?:#+\s*)?(?:\*\*)?\s*(?:reviewer|referee|审稿人)\s*#?\s*([A-Za-z0-9_]+)\b[^\n]*$|^\s*(?:\*\*)?R(\d+)(?:\*\*)?\s*[:：]?\s*$/i;
  const RE_ITEM = /^\s*(?:\(?\d+[.)、]|\(?[a-z][.)]\s|[-•*]\s|[WQ]\d+[.:：)]?|(?:weakness|question|comment|concern|issue)\s*\d+[.:：)]?)/i;
  const RE_SKIP = /^\s*(?:#+\s*)?(?:\*\*)?(summary|summary of the paper|strengths?|soundness|presentation|contribution|ethics|优点|总结)(?:\*\*)?\s*[:：]?\s*$/i;
  const RE_TAKE = /^\s*(?:#+\s*)?(?:\*\*)?(weakness(?:es)?|questions?(?: for authors)?|limitations?|comments?|concerns?|minor (?:comments|issues)|major (?:comments|issues)|缺点|问题|不足)(?:\*\*)?\s*[:：]?\s*$/i;
  const RE_SCORE = /^\s*(?:\*\*)?(rating|score|recommendation|confidence)(?:\*\*)?\s*[:：]\s*(\d+(?:\.\d+)?)/i;
  function guessCat(t) {
    if (/experiment|baseline|ablation|dataset|benchmark|evaluat|compar|empirical|实验|对比|消融|数据集/i.test(t)) return 'experiment';
    if (/related work|prior work|novel|cite|citation|literature|existing (?:work|method)|相关工作|引用|新颖/i.test(t)) return 'related_work';
    if (/typo|grammar|writing|figure|caption|notation|format|proofread|拼写|语法|写作|格式|图注/i.test(t)) return 'writing';
    return 'clarification';
  }
  function parseText(text, defaultRev) {
    const out = [], revMeta = {};
    let rev = defaultRev || 'R1', mode = 'take', section = '', buf = [];
    const nextAnon = {};
    const flush = () => {
      const t = buf.join('\n').trim(); buf = [];
      if (!t) return;
      if (mode === 'skip') { (revMeta[rev] = revMeta[rev] || {}).summary = ((revMeta[rev] || {}).summary ? revMeta[rev].summary + '\n' : '') + t; return; }
      const major = /major|critical|significant|main concern|fundamental|serious|主要|严重/i.test(t) || (/weakness|concern|major|缺点|不足/i.test(section) && !/minor|typo/i.test(t));
      out.push({ reviewer_id: rev, quote: t, category: guessCat(t), severity: /minor|typo|拼写/i.test(section + ' ' + t.slice(0, 40)) ? 'minor' : (major ? 'major' : 'minor') });
    };
    text.replace(/\r/g, '').split('\n').forEach(line => {
      let m;
      if ((m = line.match(RE_REV)) && line.trim().length < 60) {
        flush(); mode = 'take'; section = '';
        const raw = m[1] || m[2];
        rev = /^\d+$/.test(raw) ? 'R' + raw : (nextAnon[raw] = nextAnon[raw] || 'R' + (Object.keys(nextAnon).length + 1));
        return;
      }
      if ((m = line.match(RE_SCORE))) {
        const meta = revMeta[rev] = revMeta[rev] || {};
        if (/confidence/i.test(m[1])) meta.confidence = +m[2]; else meta.score = +m[2];
        return;
      }
      if (RE_SKIP.test(line)) { flush(); mode = 'skip'; section = line; return; }
      if (RE_TAKE.test(line)) { flush(); mode = 'take'; section = line; return; }
      if (!line.trim()) { flush(); return; }
      if (RE_ITEM.test(line) && buf.length) flush();
      buf.push(line);
    });
    flush();
    return { items: out, revMeta };
  }

  // ── OpenReview import ──
  const val = v => (v && typeof v === 'object' && 'value' in v) ? v.value : v;
  function parseOpenReview(json) {
    const notes = Array.isArray(json) ? json : (json.notes || []);
    const kind = n => ((n.invitations || [n.invitation || '']).join(' ').match(/\/-\/(\w+)/) || [])[1] || '';
    const sig = n => ((n.signatures || [])[0] || '');
    const revMap = {}, reviewers = [], comments = [];
    const rid = s => {
      const anon = s.split('/').pop();
      if (!revMap[anon]) { revMap[anon] = 'R' + (Object.keys(revMap).length + 1); reviewers.push({ id: revMap[anon], source_id: anon }); }
      return revMap[anon];
    };
    const byId = {};
    notes.slice().sort((a, b) => (a.cdate || 0) - (b.cdate || 0)).forEach(n => {
      byId[n.id] = n;
      const k = kind(n), c = n.content || {};
      if (/Official_Review|^Review$/.test(k)) {
        const r = rid(sig(n)), meta = reviewers.find(x => x.id === r);
        const num = x => { const m = String(val(x) == null ? '' : val(x)).match(/-?\d+(\.\d+)?/); return m ? +m[0] : undefined; };
        meta.score = num(c.rating || c.recommendation || c.overall_assessment);
        meta.confidence = num(c.confidence);
        meta.summary = val(c.summary) || '';
        meta.strengths = val(c.strengths) || val(c.strengths_and_weaknesses) || '';
        meta.extra = {};
        Object.keys(c).forEach(f => { if (/soundness|presentation|contribution|quality|clarity|significance|originality|excitement/i.test(f)) meta.extra[f] = num(c[f]); });
        const parts = [['weaknesses', 'major'], ['questions', 'minor'], ['limitations', 'minor'], ['review', 'major'], ['comment', 'minor']];
        parts.forEach(([f, sev]) => {
          const t = val(c[f]); if (!t) return;
          parseText(String(t), r).items.forEach(it => comments.push(Object.assign(it, { reviewer_id: r, severity: sev === 'major' && !/minor|typo/i.test(it.quote) ? 'major' : 'minor', source_note: n.id })));
        });
      }
    });
    notes.forEach(n => {
      const k = kind(n), c = n.content || {}, s = sig(n);
      if (/Official_Comment/.test(k) && /Reviewer_/.test(s)) {
        const t = val(c.comment); if (t) comments.push({ reviewer_id: rid(s), quote: String(t), category: guessCat(t), severity: 'minor', source_note: n.id });
      }
    });
    notes.forEach(n => {
      const k = kind(n), c = n.content || {}, s = sig(n);
      if ((/Rebuttal/.test(k) || /Official_Comment/.test(k)) && /Authors/.test(s)) {
        const parent = byId[n.replyto];
        const target = parent && comments.find(x => x.source_note === parent.id && !x.response_draft);
        if (target) target.response_draft = String(val(c.rebuttal) || val(c.comment) || '');
      }
    });
    return { reviewers, comments };
  }

  const mkComment = (r, it, i) => ({
    id: uid(), reviewer_id: it.reviewer_id, quote: it.quote || '', category: it.category || 'clarification', severity: it.severity || 'minor',
    linked_experiments: [], response_draft: it.response_draft || '', response_status: it.response_draft ? 'drafting' : 'todo',
    manuscript_change_location: '', cross_refs: []
  });
  function addItems(doc, items, revMeta) {
    const r = cur(doc);
    items.forEach(it => {
      if (!r.reviewers.some(x => x.id === it.reviewer_id)) r.reviewers.push({ id: it.reviewer_id });
      r.comments.push(mkComment(r, it));
    });
    Object.entries(revMeta || {}).forEach(([id, m]) => {
      let rv = r.reviewers.find(x => x.id === id); if (!rv) { rv = { id }; r.reviewers.push(rv); }
      Object.entries(m).forEach(([k, v]) => { if (v !== undefined && v !== '' && rv[k] == null) rv[k] = v; });
    });
    r.reviewers.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }

  // ── labels / numbering ──
  function labels(r) {
    const map = {}, cnt = {};
    r.reviewers.forEach(v => { cnt[v.id] = 0; });
    r.comments.forEach(c => { cnt[c.reviewer_id] = (cnt[c.reviewer_id] || 0) + 1; map[c.id] = c.reviewer_id + '.' + cnt[c.reviewer_id]; });
    return map;
  }
  function labProjects() {
    try { const ps = JSON.parse(localStorage.getItem('phd_lab_projects')); return Array.isArray(ps) ? ps : []; } catch { return []; }
  }

  // ── render ──
  function decorate(listEl) {
    if (!listEl) return;
    listEl.querySelectorAll('.sub-item[data-sid]').forEach(card => {
      const sid = card.dataset.sid, doc = getDoc(sid), r = doc && cur(doc), p = progress(r), u = U(sid);
      let host = card.querySelector(':scope > .rbt-host');
      if (!host) { host = document.createElement('div'); host.className = 'rbt-host'; card.appendChild(host); }
      const n = r ? r.comments.length : 0;
      host.innerHTML = `<div class="rbt-bar">
          <button class="btn btn-ghost btn-sm ${u.open ? 'active' : ''}" onclick="rbtToggle('${E(sid)}')">🛡 ${E(L().btn)}${n ? ` · ${n}` : ''} ${u.open ? '▴' : '▾'}</button>
          <div class="rbt-prog" title="${E(L().progress)} ${p}%"><div style="width:${p}%"></div></div><span class="rbt-pct">${n ? p + '%' : ''}</span></div>
        <div class="rbt-root" data-rbt-root="${E(sid)}" ${u.open ? '' : 'hidden'}></div>`;
      if (u.open) renderRoot(host.querySelector('.rbt-root'), sid);
    });
  }
  function renderRootsFor(sid) {
    document.querySelectorAll(`[data-rbt-root="${CSS.escape(sid)}"]`).forEach(el => { if (!el.hidden) renderRoot(el, sid); });
    const card = document.querySelector(`.sub-item[data-sid="${CSS.escape(sid)}"]`);
    if (card) {
      const doc = getDoc(sid), r = doc && cur(doc), p = progress(r), bar = card.querySelector('.rbt-prog > div'), pct = card.querySelector('.rbt-pct');
      if (bar) bar.style.width = p + '%'; if (pct) pct.textContent = r && r.comments.length ? p + '%' : '';
    }
  }
  function renderRoot(el, sid) {
    const l = L(), doc = ensureDoc(sid), u = U(sid);
    const viewIdx = u.view == null || u.view >= doc.rounds.length ? doc.rounds.length - 1 : u.view;
    const r = doc.rounds[viewIdx], ro = viewIdx !== doc.rounds.length - 1, lab = labels(r), pf = prefs();
    const sel = (cls, opts, v, dis) => `<select class="${cls}" ${dis ? 'disabled' : ''}>${opts.map(([k, t]) => `<option value="${E(k)}" ${k === v ? 'selected' : ''}>${E(t)}</option>`).join('')}</select>`;
    const roundSel = `<select onchange="rbtView('${E(sid)}',this.value)">${doc.rounds.map((x, i) => `<option value="${i}" ${i === viewIdx ? 'selected' : ''}>${E(F(l.round, { n: x.round }))}${i !== doc.rounds.length - 1 ? E(l.readonly) : ''}</option>`).join('')}</select>`;
    const head = `<div class="rbt-toolbar">${roundSel}
        <label>${E(l.venue)} ${sel('rbt-venue', [['conference', l.conference], ['journal', l.journal]], r.venue_type, ro)}</label>
        ${ro ? '' : `<button class="btn btn-ghost btn-sm" onclick="rbtPaste('${E(sid)}')">${E(l.paste)}</button>
        <label class="btn btn-ghost btn-sm rbt-file">${E(l.importOR)}<input type="file" accept=".json" hidden onchange="rbtImportOR('${E(sid)}',this)"></label>`}
        <button class="btn btn-ghost btn-sm" onclick="rbtExport('${E(sid)}','md',${viewIdx})">${E(l.exportMD)}</button>
        <button class="btn btn-ghost btn-sm" onclick="rbtExport('${E(sid)}','tex',${viewIdx})">${E(l.exportTeX)}</button>
        <button class="btn btn-ghost btn-sm" onclick="rbtExport('${E(sid)}','json')">${E(l.exportJSON)}</button>
        <label class="btn btn-ghost btn-sm rbt-file">${E(l.importJSON)}<input type="file" accept=".json" hidden onchange="rbtImportJSON('${E(sid)}',this)"></label>
        ${ro ? '' : `<button class="btn btn-ghost btn-sm" onclick="rbtNewRound('${E(sid)}')">${E(l.newRound)}</button>`}
        ${el.closest('#rbt-wide-body') ? '' : `<button class="btn btn-ghost btn-sm" onclick="rbtWide('${E(sid)}')">${E(l.wide)}</button>`}
        <label class="rbt-ai-toggle"><input type="checkbox" ${pf.ai ? 'checked' : ''} onchange="rbtAI(this.checked,'${E(sid)}')"> ${E(l.ai)}</label></div>`;
    const revs = `<div class="rbt-revs">${r.reviewers.map(v => `<span class="rbt-rev" data-rid="${E(v.id)}"><b>${E(v.id)}</b>
        <input type="number" step="0.5" class="rbt-rv-score" value="${E(v.score)}" placeholder="score" ${ro ? 'disabled' : ''}>
        <input type="number" step="1" class="rbt-rv-conf" value="${E(v.confidence)}" placeholder="conf" ${ro ? 'disabled' : ''}>
        ${v.summary ? `<span class="rbt-rv-sum" title="${E(v.summary)}">ⓘ</span>` : ''}</span>`).join('')}
        ${ro ? '' : `<button class="btn btn-ghost btn-sm" onclick="rbtAddReviewer('${E(sid)}')">${E(l.addReviewer)}</button>`}</div>`;
    const filters = `<div class="rbt-filters">${E(l.groupBy)} ${sel('rbt-f-group', [['reviewer', l.byReviewer], ['category', l.byCategory]], u.group)}
        ${sel('rbt-f-sev', [['', l.allSev], ...SEVS.map(s => [s, l.sev[s]])], u.sev)}
        ${sel('rbt-f-stat', [['', l.allStat], ...STATS.map(s => [s, l.stat[s]])], u.stat)}
        ${ro ? '' : `<button class="btn btn-ghost btn-sm" onclick="rbtAddComment('${E(sid)}')">${E(l.addComment)}</button>`}</div>`;
    const sevRank = s => s === 'major' ? 0 : 1, revScore = id => { const v = r.reviewers.find(x => x.id === id); return v && v.score != null ? v.score : 99; };
    const visible = r.comments.filter(c => (!u.sev || c.severity === u.sev) && (!u.stat || c.response_status === u.stat));
    const keyOf = c => u.group === 'category' ? c.category : c.reviewer_id;
    const groups = {};
    visible.forEach(c => (groups[keyOf(c)] = groups[keyOf(c)] || []).push(c));
    const order = u.group === 'category' ? CATS.filter(k => groups[k]) : Object.keys(groups).sort((a, b) => revScore(a) - revScore(b) || a.localeCompare(b, undefined, { numeric: true }));
    const rows = order.map(k => `<div class="rbt-group"><div class="rbt-group-h">${E(u.group === 'category' ? l.cat[k] : k)} <span>${groups[k].length}</span></div>
        ${groups[k].slice().sort((a, b) => sevRank(a.severity) - sevRank(b.severity) || (b.cross_refs || []).length - (a.cross_refs || []).length).map(c => rowHTML(sid, r, c, lab, ro)).join('')}</div>`).join('');
    el.innerHTML = head + revs + filters + (r.comments.length ? rows : `<div class="rbt-empty">${E(l.empty)}</div>`)
      + (pf.ai ? `<div class="rbt-ai-note">${E(l.aiNote)}</div>` : '');
    el.dataset.view = viewIdx;
  }
  function rowHTML(sid, r, c, lab, ro) {
    const l = L(), u = U(sid), open = u.exp.has(c.id), xn = (c.cross_refs || []).length;
    const dis = ro ? 'disabled' : '';
    const head = `<div class="rbt-row-h" onclick="rbtExpand('${E(sid)}','${E(c.id)}')">
        <span class="rbt-id">${E(lab[c.id])}</span>
        <span class="rbt-tag rbt-sev-${E(c.severity)}">${E(l.sev[c.severity] || c.severity)}</span>
        <span class="rbt-tag">${E(l.cat[c.category] || c.category)}</span>
        <span class="rbt-tag rbt-st-${E(c.response_status)}">${E(l.stat[c.response_status] || c.response_status)}</span>
        ${xn ? `<span class="rbt-tag rbt-same">${E(F(l.same, { n: xn + 1 }))}</span>` : ''}
        ${(c.linked_experiments || []).map(x => `<span class="rbt-tag rbt-exp-${E(x.status)}">🧪 ${E(x.name)}</span>`).join('')}
        <span class="rbt-q">${E(c.quote)}</span></div>`;
    if (!open) return `<div class="rbt-row" data-cid="${E(c.id)}">${head}</div>`;
    const opt = (arr, v, map) => arr.map(k => `<option value="${E(k)}" ${k === v ? 'selected' : ''}>${E(map ? map[k] : k)}</option>`).join('');
    const others = r.comments.filter(x => x.id !== c.id);
    const labs = labProjects();
    const exps = (c.linked_experiments || []).map((x, i) => {
      const lp = x.lab_id && labs.find(p => p.id === x.lab_id);
      return `<div class="rbt-exp" data-i="${i}"><input class="rbt-exp-name" value="${E(x.name)}" placeholder="${E(l.expName)}" ${dis}>
        <select class="rbt-exp-status" ${dis}>${opt(EXPS, x.status, l.exp)}</select>
        <input class="rbt-exp-note" value="${E(x.result_note)}" placeholder="${E(l.expNote)}" ${dis}>
        ${lp ? `<span class="rbt-lab" title="${E(lp.results || '')}">🔬 ${E(lp.running || lp.results || lp.name)}</span>` : ''}
        ${ro ? '' : `<button class="btn btn-ghost btn-sm" onclick="rbtExpDel('${E(sid)}','${E(c.id)}',${i})">✕</button>`}</div>`;
    }).join('');
    return `<div class="rbt-row open" data-cid="${E(c.id)}">${head}<div class="rbt-edit">
      <label>${E(l.quote)}<textarea class="rbt-quote" rows="4" ${dis}>${E(c.quote)}</textarea></label>
      <div class="rbt-grid">
        <label>${E(l.reviewer)}<select class="rbt-rid" ${dis}>${opt(r.reviewers.map(v => v.id), c.reviewer_id)}</select></label>
        <label>${E(l.category)}<select class="rbt-cat" ${dis}>${opt(CATS, c.category, l.cat)}</select></label>
        <label>${E(l.severity)}<select class="rbt-sev" ${dis}>${opt(SEVS, c.severity, l.sev)}</select></label>
        <label>${E(l.status)}<select class="rbt-stat" ${dis}>${opt(STATS, c.response_status, l.stat)}</select></label>
      </div>
      <label>${E(l.draft)}<textarea class="rbt-draft" rows="6" ${dis}>${E(c.response_draft)}</textarea></label>
      <label>${E(l.change)}<input class="rbt-loc" value="${E(c.manuscript_change_location)}" ${dis}></label>
      <div class="rbt-sub">${E(l.exps)}</div>${exps}
      ${ro ? '' : `<div class="rbt-inline"><button class="btn btn-ghost btn-sm" onclick="rbtExpAdd('${E(sid)}','${E(c.id)}')">${E(l.addExp)}</button>
        ${labs.length ? `<select onchange="rbtExpLab('${E(sid)}','${E(c.id)}',this.value)"><option value="">${E(l.pickLab)}</option>${labs.map(p => `<option value="${E(p.id)}">${E(p.name)}</option>`).join('')}</select>` : ''}</div>`}
      <div class="rbt-sub">${E(l.xref)}</div>
      <div class="rbt-xrefs">${others.map(x => `<label class="rbt-chipbox"><input type="checkbox" class="rbt-xref" value="${E(x.id)}" ${(c.cross_refs || []).includes(x.id) ? 'checked' : ''} ${dis}><span>${E(lab[x.id])}</span></label>`).join('') || '—'}</div>
      ${ro ? '' : `<div class="rbt-inline">
        <button class="btn btn-ghost btn-sm" onclick="rbtSplit('${E(sid)}','${E(c.id)}')">${E(l.split)}</button>
        <button class="btn btn-ghost btn-sm" onclick="rbtMergeUp('${E(sid)}','${E(c.id)}')">${E(l.mergeUp)}</button>
        ${prefs().ai ? `<button class="btn btn-ghost btn-sm" onclick="rbtAsk('${E(sid)}','${E(c.id)}',this)">${E(l.aiBtn)}</button>` : ''}
        <button class="btn btn-danger btn-sm" onclick="rbtDel('${E(sid)}','${E(c.id)}')">${E(l.del)}</button></div>`}
      <div class="rbt-ai-out" data-ai="${E(c.id)}">${aiCache[c.id] ? aiCache[c.id] : ''}</div>
    </div></div>`;
  }

  // ── edits (event delegation: one listener for every root) ──
  function rootInfo(el) {
    const root = el.closest('[data-rbt-root]'); if (!root) return null;
    const sid = root.dataset.rbtRoot, doc = ensureDoc(sid), vi = +root.dataset.view;
    if (vi !== doc.rounds.length - 1) return { sid, doc, ro: true };
    const row = el.closest('.rbt-row'), c = row && cur(doc).comments.find(x => x.id === row.dataset.cid);
    return { sid, doc, r: cur(doc), c, root };
  }
  function onChange(ev) {
    const t = ev.target, info = rootInfo(t); if (!info) return;
    const { sid, doc, r, c } = info, u = U(sid);
    if (t.classList.contains('rbt-f-group')) { u.group = t.value; return renderRootsFor(sid); }
    if (t.classList.contains('rbt-f-sev')) { u.sev = t.value; return renderRootsFor(sid); }
    if (t.classList.contains('rbt-f-stat')) { u.stat = t.value; return renderRootsFor(sid); }
    if (info.ro) return;
    let rerender = true;
    if (t.classList.contains('rbt-venue')) r.venue_type = t.value;
    else if (t.closest('.rbt-rev')) {
      const v = r.reviewers.find(x => x.id === t.closest('.rbt-rev').dataset.rid);
      const n = t.value === '' ? undefined : +t.value;
      if (t.classList.contains('rbt-rv-score')) v.score = n; else v.confidence = n;
      rerender = false;
    } else if (c) {
      const cls = t.classList;
      if (cls.contains('rbt-quote')) { c.quote = t.value; rerender = false; }
      else if (cls.contains('rbt-draft')) { c.response_draft = t.value; if (c.response_status === 'todo' && t.value.trim()) c.response_status = 'drafting'; }
      else if (cls.contains('rbt-loc')) { c.manuscript_change_location = t.value; rerender = false; }
      else if (cls.contains('rbt-rid')) c.reviewer_id = t.value;
      else if (cls.contains('rbt-cat')) c.category = t.value;
      else if (cls.contains('rbt-sev')) c.severity = t.value;
      else if (cls.contains('rbt-stat')) c.response_status = t.value;
      else if (cls.contains('rbt-xref')) setXref(r, c.id, t.value, t.checked);
      else if (t.closest('.rbt-exp')) {
        const x = c.linked_experiments[+t.closest('.rbt-exp').dataset.i];
        if (cls.contains('rbt-exp-name')) x.name = t.value;
        if (cls.contains('rbt-exp-note')) x.result_note = t.value;
        if (cls.contains('rbt-exp-status')) x.status = t.value;
        syncExp(r, x);
      } else return;
    } else return;
    saveDoc(doc);
    if (rerender) renderRootsFor(sid); else renderRootsFor_bar(sid);
  }
  const renderRootsFor_bar = sid => { const card = document.querySelector(`.sub-item[data-sid="${CSS.escape(sid)}"]`); if (card) { const p = progress(cur(ensureDoc(sid))); const b = card.querySelector('.rbt-prog > div'); if (b) b.style.width = p + '%'; } };
  function setXref(r, a, b, on) {
    const A = r.comments.find(x => x.id === a), B = r.comments.find(x => x.id === b); if (!A || !B) return;
    const group = new Set([a, b, ...(A.cross_refs || []), ...(B.cross_refs || [])]);
    if (on) group.forEach(id => { const c = r.comments.find(x => x.id === id); if (c) c.cross_refs = [...group].filter(x => x !== id); });
    else { A.cross_refs = (A.cross_refs || []).filter(x => x !== b); B.cross_refs = (B.cross_refs || []).filter(x => x !== a); }
  }
  function syncExp(r, x) {
    if (!x.id) return;
    r.comments.forEach(c => (c.linked_experiments || []).forEach(y => { if (y.id === x.id && y !== x) { y.name = x.name; y.status = x.status; y.result_note = x.result_note; } }));
  }

  // ── actions ──
  const mut = (sid, fn) => { const doc = ensureDoc(sid); fn(doc, cur(doc)); saveDoc(doc); renderRootsFor(sid); };
  window.rbtToggle = function (sid) { const u = U(sid); u.open = !u.open; decorate(document.getElementById('sub-list')); };
  window.rbtView = function (sid, i) { U(sid).view = +i; renderRootsFor(sid); };
  window.rbtExpand = function (sid, cid) { const u = U(sid); u.exp.has(cid) ? u.exp.delete(cid) : u.exp.add(cid); renderRootsFor(sid); };
  window.rbtAddReviewer = sid => mut(sid, (d, r) => { let n = r.reviewers.length + 1; while (r.reviewers.some(v => v.id === 'R' + n)) n++; r.reviewers.push({ id: 'R' + n }); });
  window.rbtAddComment = sid => mut(sid, (d, r) => { if (!r.reviewers.length) r.reviewers.push({ id: 'R1' }); const c = mkComment(r, { reviewer_id: r.reviewers[0].id }); r.comments.push(c); U(sid).exp.add(c.id); });
  window.rbtDel = (sid, cid) => { if (!confirm(L().confirmDel)) return; mut(sid, (d, r) => { r.comments = r.comments.filter(x => x.id !== cid); r.comments.forEach(x => { x.cross_refs = (x.cross_refs || []).filter(y => y !== cid); }); }); };
  window.rbtSplit = function (sid, cid) {
    const ta = document.querySelector(`[data-rbt-root="${CSS.escape(sid)}"] .rbt-row[data-cid="${CSS.escape(cid)}"] .rbt-quote`);
    mut(sid, (d, r) => {
      const i = r.comments.findIndex(x => x.id === cid), c = r.comments[i];
      const pos = ta && ta.selectionStart > 0 && ta.selectionStart < c.quote.length ? ta.selectionStart : (c.quote.indexOf('\n\n') > 0 ? c.quote.indexOf('\n\n') : Math.floor(c.quote.length / 2));
      const a = c.quote.slice(0, pos).trim(), b = c.quote.slice(pos).trim(); if (!a || !b) return;
      c.quote = a; const n = mkComment(r, { reviewer_id: c.reviewer_id, quote: b, category: c.category, severity: c.severity });
      r.comments.splice(i + 1, 0, n); U(sid).exp.add(n.id);
    });
  };
  window.rbtMergeUp = function (sid, cid) {
    mut(sid, (d, r) => {
      const i = r.comments.findIndex(x => x.id === cid); if (i <= 0) return;
      const p = r.comments[i - 1], c = r.comments[i];
      p.quote = (p.quote + '\n\n' + c.quote).trim();
      p.response_draft = [p.response_draft, c.response_draft].filter(Boolean).join('\n\n');
      p.linked_experiments = (p.linked_experiments || []).concat(c.linked_experiments || []);
      if (c.severity === 'major') p.severity = 'major';
      r.comments.splice(i, 1);
      r.comments.forEach(x => { x.cross_refs = [...new Set((x.cross_refs || []).map(y => y === cid ? p.id : y))].filter(y => y !== x.id); });
    });
  };
  window.rbtExpAdd = (sid, cid) => mut(sid, (d, r) => { r.comments.find(x => x.id === cid).linked_experiments.push({ id: uid(), name: '', status: 'todo', result_note: '' }); });
  window.rbtExpDel = (sid, cid, i) => mut(sid, (d, r) => { r.comments.find(x => x.id === cid).linked_experiments.splice(i, 1); });
  window.rbtExpLab = function (sid, cid, labId) {
    const p = labProjects().find(x => x.id === labId); if (!p) return;
    mut(sid, (d, r) => {
      const existing = r.comments.flatMap(c => c.linked_experiments || []).find(x => x.lab_id === labId);
      r.comments.find(x => x.id === cid).linked_experiments.push(existing ? Object.assign({}, existing) : { id: uid(), name: p.name, status: 'running', result_note: '', lab_id: labId });
    });
  };
  window.rbtNewRound = function (sid) {
    const doc = ensureDoc(sid), n = cur(doc).round + 1;
    if (!confirm(F(L().confirmRound, { n }))) return;
    doc.rounds.push(newRound(sid, n, cur(doc).venue_type, cur(doc).reviewers.map(v => ({ id: v.id, source_id: v.source_id }))));
    saveDoc(doc); U(sid).view = null; renderRootsFor(sid); decorate(document.getElementById('sub-list'));
  };
  window.rbtAI = function (on, sid) { const p = prefs(); p.ai = on; sv(PREF, p); renderRootsFor(sid); };

  // paste modal
  let _pasteSid = null, _pasteParsed = null;
  window.rbtPaste = function (sid) {
    _pasteSid = sid; _pasteParsed = null;
    const l = L(), r = cur(ensureDoc(sid));
    document.getElementById('rbt-paste-title').textContent = l.pasteTitle;
    document.getElementById('rbt-paste-hint').textContent = l.pasteHint;
    document.getElementById('rbt-paste-rev-l').textContent = l.defaultReviewer;
    const ids = r.reviewers.map(v => v.id); if (!ids.length) ids.push('R1');
    let n = ids.length + 1; while (ids.includes('R' + n)) n++; ids.push('R' + n);
    document.getElementById('rbt-paste-rev').innerHTML = ids.map(i => `<option>${E(i)}</option>`).join('');
    document.getElementById('rbt-paste-text').value = '';
    document.getElementById('rbt-paste-preview').innerHTML = '';
    document.getElementById('rbt-paste-parse').textContent = l.parse;
    document.getElementById('rbt-paste-cancel').textContent = l.cancel;
    const ok = document.getElementById('rbt-paste-ok'); ok.textContent = F(l.addAll, { n: 0 }); ok.disabled = true;
    openModal('rbt-paste-modal');
  };
  window.rbtPasteParse = function () {
    _pasteParsed = parseText(document.getElementById('rbt-paste-text').value, document.getElementById('rbt-paste-rev').value);
    const l = L();
    document.getElementById('rbt-paste-preview').innerHTML = _pasteParsed.items.map((it, i) => `<div class="rbt-prev"><b>${E(it.reviewer_id)}</b> <span class="rbt-tag rbt-sev-${E(it.severity)}">${E(it.severity)}</span> <span class="rbt-tag">${E(l.cat[it.category])}</span> ${E(it.quote.slice(0, 160))}${it.quote.length > 160 ? '…' : ''}</div>`).join('')
      + Object.entries(_pasteParsed.revMeta).map(([k, m]) => `<div class="rbt-prev rbt-meta">${E(k)} · score ${E(m.score ?? '—')} · conf ${E(m.confidence ?? '—')}</div>`).join('');
    const ok = document.getElementById('rbt-paste-ok'); ok.textContent = F(l.addAll, { n: _pasteParsed.items.length }); ok.disabled = !_pasteParsed.items.length;
  };
  window.rbtPasteOk = function () {
    if (!_pasteParsed || !_pasteSid) return;
    const sid = _pasteSid, parsed = _pasteParsed;
    mut(sid, d => addItems(d, parsed.items, parsed.revMeta));
    closeModal('rbt-paste-modal'); U(sid).open = true; decorate(document.getElementById('sub-list'));
    toast(F(L().imported, { n: parsed.items.length }));
  };

  // import / export
  function download(name, text, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const subTitle = sid => { const s = (ld(K.subs) || []).find(x => x.id === sid); return s ? s.title : sid; };
  const fileBase = sid => 'rebuttal-' + (subTitle(sid) || 'paper').replace(/[^\w\u4e00-\u9fa5-]+/g, '_').slice(0, 40);
  window.rbtImportOR = function (sid, input) {
    const f = input.files && input.files[0]; if (!f) return;
    f.text().then(t => {
      const { reviewers, comments } = parseOpenReview(JSON.parse(t));
      mut(sid, (d, r) => {
        reviewers.forEach(v => { const ex = r.reviewers.find(x => x.id === v.id); ex ? Object.keys(v).forEach(k => { if (ex[k] == null) ex[k] = v[k]; }) : r.reviewers.push(v); });
        comments.forEach(it => r.comments.push(mkComment(r, it)));
      });
      toast(F(L().imported, { n: comments.length }));
    }).catch(e => toast('OpenReview JSON: ' + e.message, 'error')).finally(() => { input.value = ''; });
  };
  window.rbtImportJSON = function (sid, input) {
    const f = input.files && input.files[0]; if (!f) return;
    f.text().then(t => {
      const obj = JSON.parse(t), rounds = obj.rounds || (obj.comments ? [obj] : null);
      if (!rounds || !rounds.every(r => Array.isArray(r.comments))) throw new Error('missing rounds[].comments');
      const old = getDoc(sid);
      if (old && cur(old).comments.length) {
        if (!confirm(L().confirmReplace)) return;
        download(fileBase(sid) + '-backup-' + today() + '.json', JSON.stringify(old, null, 2), 'application/json');
      }
      saveDoc({ submission_id: sid, rounds: rounds.map((r, i) => Object.assign(newRound(sid, i + 1), r, { submission_id: sid })) });
      renderRootsFor(sid); decorate(document.getElementById('sub-list'));
    }).catch(e => toast('JSON: ' + e.message, 'error')).finally(() => { input.value = ''; });
  };
  function responseOf(r, c) {
    if ((c.response_draft || '').trim()) return c.response_draft.trim();
    const peer = (c.cross_refs || []).map(id => r.comments.find(x => x.id === id)).find(x => x && (x.response_draft || '').trim());
    return peer ? peer.response_draft.trim() : '';
  }
  function sharedGroups(r, lab) {
    const seen = new Set(), out = [];
    r.comments.forEach(c => {
      if (!(c.cross_refs || []).length || seen.has(c.id)) return;
      const g = [c.id, ...c.cross_refs].filter(id => r.comments.some(x => x.id === id));
      g.forEach(id => seen.add(id)); out.push(g.map(id => lab[id]));
    });
    return out;
  }
  function toMarkdown(sid, r) {
    const l = I18N.en, lab = labels(r), out = [`# Response to Reviewers — ${subTitle(sid)}`, '', `Round ${r.round} · ${r.venue_type}`, ''];
    const groups = sharedGroups(r, lab);
    if (groups.length) { out.push(`## ${l.shared}`, '', ...groups.map(g => `- ${g.join(' · ')}`), ''); }
    r.reviewers.forEach(v => {
      const cs = r.comments.filter(c => c.reviewer_id === v.id); if (!cs.length) return;
      out.push(`## Reviewer ${v.id}` + (v.score != null ? ` (score ${v.score}${v.confidence != null ? `, confidence ${v.confidence}` : ''})` : ''), '');
      cs.forEach(c => {
        out.push(`### Comment ${lab[c.id]}`, '', ...c.quote.split('\n').map(x => '> ' + x), '',
          `**Response.** ${responseOf(r, c) || l.todoMark}`, '', `**Changes.** ${c.manuscript_change_location || l.noChange}`, '');
      });
    });
    return out.join('\n');
  }
  const texEsc = s => String(s || '').replace(/\\/g, '\\textbackslash{}').replace(/([&%$#_{}])/g, '\\$1').replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}');
  const texMd = s => texEsc(s).replace(/\*\*(.+?)\*\*/g, '\\textbf{$1}').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1\\emph{$2}').replace(/`([^`]+)`/g, '\\texttt{$1}').replace(/\n{2,}/g, '\n\n');
  function toLatex(sid, r) {
    const l = I18N.en, lab = labels(r), groups = sharedGroups(r, lab);
    const body = [];
    if (groups.length) body.push(`\\section*{${texEsc(l.shared)}}`, '\\begin{itemize}', ...groups.map(g => `  \\item ${texEsc(g.join(' · '))}`), '\\end{itemize}');
    r.reviewers.forEach(v => {
      const cs = r.comments.filter(c => c.reviewer_id === v.id); if (!cs.length) return;
      body.push(`\\section*{Response to Reviewer ${texEsc(v.id)}}`);
      cs.forEach(c => body.push(
        `\\subsection*{Comment ${texEsc(lab[c.id])}}`, '\\begin{quote}\\itshape', texMd(c.quote), '\\end{quote}',
        `\\noindent\\textbf{Response.} ${texMd(responseOf(r, c) || l.todoMark)}`, '',
        `\\noindent\\textbf{Changes.} ${texMd(c.manuscript_change_location || l.noChange)}`, ''));
    });
    const cjk = /[\u3000-\u9fff\uff00-\uffef]/.test(body.join('\n') + subTitle(sid));
    return ['% Generated by Research Workstation — Rebuttal workbench',
      cjk ? '% Contains CJK text: compile with XeLaTeX.' : '% Compile with pdfLaTeX (or XeLaTeX).',
      '\\documentclass[11pt]{article}', '\\usepackage[margin=1in]{geometry}', cjk ? '\\usepackage{xeCJK}' : '\\usepackage[T1]{fontenc}', '\\usepackage{parskip}',
      `\\title{Response to Reviewers\\\\\\large ${texEsc(subTitle(sid))} --- Round ${r.round}}`, '\\date{}', '\\begin{document}', '\\maketitle', ...body, '\\end{document}', ''].join('\n');
  }
  window.rbtExport = function (sid, kind, vi) {
    const doc = ensureDoc(sid), r = vi == null ? cur(doc) : doc.rounds[vi];
    if (kind === 'json') return download(fileBase(sid) + '.json', JSON.stringify(doc, null, 2), 'application/json');
    if (kind === 'md') return download(fileBase(sid) + `-r${r.round}.md`, toMarkdown(sid, r), 'text/markdown;charset=utf-8');
    download(fileBase(sid) + `-r${r.round}.tex`, toLatex(sid, r), 'application/x-tex;charset=utf-8');
  };

  // wide view
  window.rbtWide = function (sid) {
    const body = document.getElementById('rbt-wide-body');
    body.innerHTML = `<div class="rbt-root" data-rbt-root="${E(sid)}"></div>`;
    document.getElementById('rbt-wide-title').textContent = '🛡 Rebuttal · ' + subTitle(sid);
    document.getElementById('rbt-wide-close').textContent = L().closeWide;
    renderRoot(body.firstChild, sid); openModal('rbt-wide-modal');
  };
  window.rbtWideClose = function () { closeModal('rbt-wide-modal'); document.getElementById('rbt-wide-body').innerHTML = ''; decorate(document.getElementById('sub-list')); };

  // AI assist (opt-in; never writes the final reply)
  const aiCache = {};
  window.rbtAsk = async function (sid, cid, btn) {
    const l = L(), doc = ensureDoc(sid), r = cur(doc), c = r.comments.find(x => x.id === cid);
    if (typeof window._callAI !== 'function') return toast(l.noAI, 'error');
    btn.disabled = true;
    const en = typeof _lang !== 'undefined' && _lang === 'en';
    const prompt = `You help an author PLAN a rebuttal. Do NOT write the reply text itself.
Reviewer comment (${c.severity}, category: ${c.category}):
"""${c.quote.slice(0, 3000)}"""
Return in ${en ? 'English' : 'Chinese'}, concise Markdown, exactly two sections:
1. Reviewer intent — what underlying concern this comment signals and what evidence would resolve it (<=3 bullets).
2. Suggested structure — an outline using: restate the concern → direct answer → evidence to provide (name the kind of experiment/table/citation, never invent numbers or results) → manuscript change location (<=5 bullets).
Never fabricate numbers, results or citations; use placeholders like [result X] where evidence is needed.`;
    try {
      const out = await window._callAI(prompt, 600);
      aiCache[cid] = out ? `<div class="rbt-ai-box">${E(out).replace(/\n/g, '<br>')}</div>` : '';
    } catch (e) { aiCache[cid] = `<div class="rbt-ai-box">${E(e.message || String(e))}</div>`; }
    btn.disabled = false; renderRootsFor(sid);
  };

  // ── boot ──
  function injectModals() {
    if (document.getElementById('rbt-paste-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `
<div class="modal-overlay" id="rbt-paste-modal" onclick="if(event.target===this)closeModal('rbt-paste-modal')">
  <div class="modal" style="max-width:680px;max-height:88vh;overflow-y:auto">
    <div class="modal-title" id="rbt-paste-title"></div>
    <div class="rbt-hint" id="rbt-paste-hint"></div>
    <label><span id="rbt-paste-rev-l"></span> <select id="rbt-paste-rev"></select></label>
    <textarea id="rbt-paste-text" rows="12" placeholder="Reviewer 1&#10;Rating: 5&#10;Weaknesses:&#10;1. ...&#10;2. ..."></textarea>
    <div id="rbt-paste-preview" class="rbt-preview"></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="rbt-paste-cancel" onclick="closeModal('rbt-paste-modal')"></button>
      <button class="btn btn-ghost" id="rbt-paste-parse" onclick="rbtPasteParse()"></button>
      <button class="btn btn-primary" id="rbt-paste-ok" onclick="rbtPasteOk()" disabled></button>
    </div>
  </div>
</div>
<div class="modal-overlay" id="rbt-wide-modal" onclick="if(event.target===this)rbtWideClose()">
  <div class="modal rbt-wide" style="max-width:1080px;width:96vw;max-height:92vh;overflow-y:auto">
    <div class="modal-title" style="display:flex;align-items:center;gap:8px"><span id="rbt-wide-title" style="flex:1"></span><button class="btn btn-ghost btn-sm" id="rbt-wide-close" onclick="rbtWideClose()"></button></div>
    <div id="rbt-wide-body"></div>
  </div>
</div>`);
  }
  function init() {
    injectModals();
    document.addEventListener('change', ev => { if (ev.target.closest && ev.target.closest('[data-rbt-root]')) onChange(ev); });
    document.addEventListener('input', ev => {
      const t = ev.target;
      if (t.closest && t.closest('[data-rbt-root]') && /rbt-(quote|draft|loc|exp-name|exp-note)/.test(t.className)) {
        clearTimeout(t._rbtT); t._rbtT = setTimeout(() => {
          const info = rootInfo(t); if (!info || info.ro || !info.c) return;
          if (t.classList.contains('rbt-quote')) info.c.quote = t.value;
          else if (t.classList.contains('rbt-draft')) info.c.response_draft = t.value;
          else if (t.classList.contains('rbt-loc')) info.c.manuscript_change_location = t.value;
          else { const x = info.c.linked_experiments[+t.closest('.rbt-exp').dataset.i]; if (t.classList.contains('rbt-exp-name')) x.name = t.value; else x.result_note = t.value; syncExp(info.r, x); }
          saveDoc(info.doc);
        }, 400);
      }
    });
    const _set = window.setLang;
    if (typeof _set === 'function' && !_set._rbt) {
      const wrapped = function () { const r = _set.apply(this, arguments); decorate(document.getElementById('sub-list')); return r; };
      Object.keys(_set).forEach(k => { wrapped[k] = _set[k]; }); wrapped._rbt = true; window.setLang = wrapped;
    }
    decorate(document.getElementById('sub-list'));
  }
  window.rbtDecorate = decorate;
  window.rbtInternals = { parseText, parseOpenReview, progress, toMarkdown, toLatex, responseOf, labels };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
