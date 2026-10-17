/* 📄 Rebuttal · PDF 识别 — 浏览器本地解析审稿意见 PDF（文件不上传、不保存）。
 * 流水线：pdf.js 坐标还原行/段 → 去页眉页脚/页码/断词 → 平台识别（OpenReview / ARR / 期刊决定信 / 通用）
 * → 审稿人与分数 → 切条 + 可回复性判定（DISAPERE：request / negative evaluative 才成条）→ ASAP 方面 → 类别 / 严重度。
 * 扫描版可手动开启 OCR（tesseract.js）；打开「AI 辅助」时可用 AI 校正（只按句子编号分组，不改写原文）。 */
(function () {
  'use strict';
  const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
  const PDFJS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';

  const I18N = {
    zh: {
      btn: '📄 PDF', title: '从 PDF 识别审稿意见', reading: '正在读取 PDF…', page: '第 {i}/{n} 页',
      platform: { openreview: 'OpenReview', arr: 'ARR', journal: '期刊决定信', generic: '通用格式' },
      detected: '识别为 {p} · {r} 位审稿人 · {n} 条意见', ignoredH: '已忽略 {n} 句（总结 / 称赞 / 客套 / 页面杂项）', restore: '恢复',
      reason: { summary: '总结', praise: '称赞', social: '客套', meta: '页面杂项', score: '分数', author: '作者回复' },
      authorReplies: '另识别到 {n} 段作者回复，将填入对应审稿人第一条意见的回复草稿（仅在草稿为空时）',
      suspect: '可能误判：请核对', importN: '导入选中的 {n} 条', cancel: '取消', selAll: '全选', selNone: '全不选',
      scanned: '这份 PDF 几乎没有可提取的文字，可能是扫描版。', ocrBtn: '用 OCR 识别（本地运行）', ocrLang: '语言',
      ocrSize: '首次使用需下载识别引擎与语言模型：英文约 6 MB，中英约 8 MB；之后会被浏览器缓存。', ocrRun: 'OCR 识别中 · 第 {i}/{n} 页 · {p}%',
      aiBtn: '🤖 AI 校正', aiNote: 'AI 校正会把审稿文字发送给你在「AI 模型设置」里配置的模型。审稿意见通常属于保密内容，请确认你的模型服务可信。AI 只按句子编号重新分组和打标签，不改写原文。',
      aiRun: 'AI 校正中…（{i}/{n} 位审稿人）', aiDone: 'AI 校正完成：{n} 条', aiFail: 'AI 校正失败，保留规则识别结果：', noAI: '请先在「个人设置 → AI 模型设置」配置模型',
      empty: '没有识别到审稿意见。可以改用「粘贴意见」，或检查 PDF 是否为审稿意见。', fail: 'PDF 读取失败：',
      imported: '已从 PDF 导入 {n} 条', reviewer: '审稿人', category: '类别', severity: '严重度'
    },
    en: {
      btn: '📄 PDF', title: 'Recognize reviews from PDF', reading: 'Reading PDF…', page: 'Page {i}/{n}',
      platform: { openreview: 'OpenReview', arr: 'ARR', journal: 'Journal decision letter', generic: 'Generic' },
      detected: 'Detected {p} · {r} reviewers · {n} comments', ignoredH: '{n} sentences ignored (summary / praise / courtesy / page clutter)', restore: 'Restore',
      reason: { summary: 'summary', praise: 'praise', social: 'courtesy', meta: 'page clutter', score: 'score', author: 'author reply' },
      authorReplies: '{n} author replies found; each fills the first comment draft of its reviewer (only if empty)',
      suspect: 'Possibly misread — please check', importN: 'Import {n} selected', cancel: 'Cancel', selAll: 'All', selNone: 'None',
      scanned: 'This PDF has almost no extractable text — it is probably scanned.', ocrBtn: 'Run OCR (locally)', ocrLang: 'Language',
      ocrSize: 'First use downloads the OCR engine and language data: ~6 MB for English, ~8 MB for English+Chinese; cached afterwards.', ocrRun: 'OCR · page {i}/{n} · {p}%',
      aiBtn: '🤖 AI refine', aiNote: 'AI refine sends the review text to the model configured in Settings → AI. Reviews are usually confidential — make sure you trust that provider. The AI only regroups and labels numbered sentences; it never rewrites them.',
      aiRun: 'AI refining… ({i}/{n} reviewers)', aiDone: 'AI refine done: {n} comments', aiFail: 'AI refine failed, keeping rule-based result: ', noAI: 'Configure a model in Settings → AI first',
      empty: 'No review comments recognized. Try "Paste reviews" or check that this PDF contains reviews.', fail: 'Could not read PDF: ',
      imported: 'Imported {n} from PDF', reviewer: 'Reviewer', category: 'Category', severity: 'Severity'
    }
  };
  const L = () => I18N[(typeof _lang !== 'undefined' && _lang === 'en') ? 'en' : 'zh'];
  const F = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
  const E = s => escHtml(s == null ? '' : String(s));
  const CATS = ['experiment', 'clarification', 'writing', 'related_work', 'misunderstanding', 'decline'];

  // ── loaders ──
  const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load failed: ' + src)); document.head.appendChild(s); });
  async function pdfjs() {
    if (!window.pdfjsLib) await loadScript(PDFJS);
    if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return window.pdfjsLib;
  }

  // ── ① extraction: items → lines (with page, y, size) ──
  async function extractLines(buf, onPage) {
    const lib = await pdfjs(), doc = await lib.getDocument({ data: buf }).promise, pages = [];
    for (let p = 1; p <= doc.numPages; p++) {
      onPage && onPage(p, doc.numPages);
      const page = await doc.getPage(p), tc = await page.getTextContent();
      const items = tc.items.filter(it => it.str && it.str.trim()).map(it => ({
        s: it.str, x: it.transform[4], y: it.transform[5], w: it.width, h: Math.abs(it.transform[3]) || it.height || 10
      })).sort((a, b) => b.y - a.y || a.x - b.x);
      const lines = [];
      items.forEach(it => {
        const ln = lines.find(l => Math.abs(l.y - it.y) < Math.max(2, it.h * 0.45));
        if (ln) ln.items.push(it); else lines.push({ y: it.y, items: [it] });
      });
      pages.push(lines.sort((a, b) => b.y - a.y).map(l => {
        l.items.sort((a, b) => a.x - b.x);
        let text = '', end = null;
        l.items.forEach(it => { if (end !== null && it.x - end > it.h * 0.15 && !/\s$/.test(text) && !/^\s/.test(it.s)) text += ' '; text += it.s; end = it.x + it.w; });
        return { text: text.replace(/\s+/g, ' ').trim(), y: l.y, size: Math.max(...l.items.map(i => i.h)), page: p };
      }).filter(l => l.text));
    }
    return pages;
  }

  // ── ② cleanup: header/footer, page numbers, paragraphs, de-hyphenation ──
  const RE_PAGENUM = /^(?:page\s*)?\d{1,3}\s*(?:of|\/)\s*\d{1,3}$|^[-–—]?\s*\d{1,3}\s*[-–—]?$|^第\s*\d+\s*页/i;
  function cleanup(pages) {
    const norm = s => s.replace(/\d+/g, '#').toLowerCase();
    const edge = {};
    pages.forEach(ls => {
      const cand = new Set([...ls.slice(0, 2), ...ls.slice(-2)].map(l => norm(l.text)));
      cand.forEach(k => { edge[k] = (edge[k] || 0) + 1; });
    });
    const repeated = new Set(pages.length >= 2 ? Object.keys(edge).filter(k => edge[k] >= Math.max(2, Math.ceil(pages.length * 0.5))) : []);
    const paras = [], dropped = [];
    pages.forEach(ls => {
      const kept = ls.filter((l, i) => {
        const atEdge = i < 2 || i >= ls.length - 2;
        if ((atEdge && repeated.has(norm(l.text))) || RE_PAGENUM.test(l.text)) { dropped.push({ text: l.text, page: l.page, reason: 'meta' }); return false; }
        return true;
      });
      const gaps = kept.slice(1).map((l, i) => kept[i].y - l.y).filter(g => g > 0).sort((a, b) => a - b);
      const med = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 12;
      let cur = null;
      kept.forEach((l, i) => {
        const gap = i ? kept[i - 1].y - l.y : Infinity;
        if (!cur || gap > med * 1.45) { cur = { lines: [], page: l.page }; paras.push(cur); }
        cur.lines.push(l.text);
      });
    });
    return { paras: paras.map(p => ({ lines: p.lines, page: p.page })), dropped };
  }
  // join wrapped lines; keep a newline before list markers / headings
  const RE_ITEM = /^\s*(?:\(?\d{1,2}[.)、]\s|\(?[a-z][.)]\s|[-•*·]\s|[WQCM]\d+[.:：)]?\s|(?:weakness|question|comment|concern|issue|point)\s*\d+[.:：)]?\s)/i;
  function joinLines(lines, isHead) {
    let out = '';
    lines.forEach((ln, i) => {
      if (!i) { out = ln; return; }
      if (RE_ITEM.test(ln) || isHead(ln)) { out += '\n' + ln; return; }
      if (/[A-Za-z]-$/.test(out) && /^[a-z]/.test(ln)) { out = out.slice(0, -1) + ln; return; }
      out += (/[一-鿿]$/.test(out) && /^[一-鿿]/.test(ln)) ? ln : ' ' + ln;
    });
    return out;
  }

  // ── ③④ platform + structure ──
  const SCORE_KEYS = 'rating|overall assessment|overall score|recommendation|overall recommendation|confidence|soundness|presentation|contribution|excitement|reproducibility|quality|clarity|significance|originality';
  const RE_SCORE = new RegExp('^(' + SCORE_KEYS + ')\\s*[:：=]\\s*(-?\\d+(?:\\.\\d+)?)', 'i');
  const SECTIONS = [
    [/^(?:paper\s+)?summary(?:\s+of\s+(?:the\s+)?(?:paper|submission|contributions?))?$|^摘要$|^总结$/i, 'summary'],
    [/^(?:summary\s+of\s+)?strengths?(?:\s+and\s+weaknesses)?$|^pros$|^优点$/i, 'strengths'],
    [/^(?:summary\s+of\s+)?weakness(?:es)?$|^cons$|^(?:main|major)\s+(?:concerns?|comments?|issues?)$|^concerns?$|^缺点$|^不足$|^主要(?:问题|意见)$/i, 'weaknesses'],
    [/^questions?(?:\s+(?:for|to)\s+(?:the\s+)?authors?)?$|^问题$/i, 'questions'],
    [/^minor\s+(?:comments?|issues?|points?)$|^typos?$|^comments,?\s+suggestions,?\s+and\s+typos$|^suggestions?$|^detailed\s+comments?$|^次要(?:问题|意见)$/i, 'minor'],
    [/^limitations?$/i, 'limitations'],
    [/^(?:additional\s+)?comments?(?:\s+to\s+(?:the\s+)?authors?)?$|^review$|^意见$/i, 'comments'],
    [/^(?:flag for ethics review|ethic(?:al|s)\s+concerns?|code of conduct|details of ethics concerns|reviewer certification)/i, 'skip']
  ];
  const sectionOf = h => { const t = h.trim().replace(/[:：]$/, '').trim(); const m = SECTIONS.find(([re]) => re.test(t)); return m ? m[1] : null; };
  function headingSplit(text) {
    const m = text.match(/^([A-Za-z][A-Za-z ,]{1,48}|[一-鿿]{2,6})\s*[:：]\s*(.*)$/s);
    if (m && sectionOf(m[1])) return { sec: sectionOf(m[1]), rest: m[2].trim() };
    const sec = sectionOf(text);
    return sec && text.length < 60 ? { sec, rest: '' } : null;
  }
  const RE_META = /^(?:add:|reply|readers?:|everyone$|revisions$|bibtex$|show (?:revisions|details)|signatures?:|\d{1,2} \w{3,9} \d{4},? \d{1,2}:\d{2}|official review by reviewer|submitted to |anonymous authors$|ref\.?:|ms\. ?no\.|dear |yours (?:sincerely|truly)|best regards|kind regards|sincerely,?$|comments from the editors? and reviewers:?$|the editor$|editor-in-chief$)/i;
  function actorOf(text) {
    let m;
    if ((m = text.match(/official review(?: of submission\s*\d+)?\s+by\s+reviewer\s+([A-Za-z0-9_]+)/i))) return { kind: 'reviewer', anon: m[1] };
    if ((m = text.match(/official comment by reviewer\s+([A-Za-z0-9_]+)/i))) return { kind: 'reviewer', anon: m[1], followup: true };
    if (/(?:official comment|rebuttal|response|author response)\s+by\s+(?:the\s+)?authors?/i.test(text)) return { kind: 'author' };
    if (/^(?:meta[- ]?review|decision)\b.*\b(?:area chair|program chairs?|by)\b|^meta[- ]?review$/i.test(text)) return { kind: 'reviewer', fixed: 'AC' };
    if ((m = text.match(/^(?:reviewer|referee)\s*#?\s*(\d{1,2})\b\s*(?:[:：.)-]|\s|$)/i)) || (m = text.match(/^审稿(?:人|专家)\s*#?\s*(\d{1,2})/))) return { kind: 'reviewer', fixed: 'R' + m[1], rest: text.replace(m[0], '').trim() };
    if ((m = text.match(/^(?:associate editor|handling editor|academic editor|editor(?:'s)?\s+comments?|editor|编辑意见|编辑)\s*(?:[:：]\s*([\s\S]*)|$)/i)) && (m[1] !== undefined || text.length < 40)) return { kind: 'reviewer', fixed: 'Editor', rest: (m[1] || '').trim() };
    return null;
  }
  function detectPlatform(all) {
    if (/summary of weaknesses|comments,? suggestions,? and typos|overall assessment|excitement\s*[:=]/i.test(all)) return 'arr';
    if (/official review (?:of submission|by reviewer)|openreview\.net/i.test(all)) return 'openreview';
    if (/reviewer\s*#\s*\d|referee\s*#?\s*\d|associate editor|comments to the author|decision letter|ms\. ?no\./i.test(all)) return 'journal';
    return 'generic';
  }

  // ── ⑤ sentences + actionability (DISAPERE-inspired) ──
  const ABBR = /\b(e\.g|i\.e|et al|etc|vs|fig|figs|eq|eqs|sec|secs|tab|no|resp|approx|cf|dr|mr|ms|ref|refs)\.\s/gi;
  function sentences(text) {
    const prot = text.replace(/^(\s*\(?\d{1,2})\.\s/, '$1§§ ').replace(ABBR, m => m.replace('. ', '§§ ')).replace(/(\d)\.(\d)/g, '$1§§$2');
    return prot.split(/(?<=[.!?。！？])\s+(?=["“(\[]?[A-Z0-9一-鿿])|\n+(?=\s*\S)/).map(s => s.replace(/§§/g, '.').trim()).filter(Boolean);
  }
  const RE_REQ = new RegExp([
    '\\b(?:please|should|could you|can you|would you|would be (?:good|better|helpful|nice|interesting|useful)|it would|needs? to|must|suggest|recommend|consider|encourage|why|whether|clarify|explain|justify|elaborate|discuss|report|add|include|compare|provide|missing|lacks?|lacking|absent|insufficient|limited|unclear|fails? to|concerns?|problems?|issues?|weakness(?:es)?|typos?|grammar|incorrect|wrong|errors?|inconsistent|questionable|doubts?|hard to follow|misses|outdated|how (?:do|does|is|are|did|was|were|can|would)|what (?:is|are|happens|would))\\b',
    '\\bnot (?:convinc|justif|support|sufficient|enough|provid|report|discuss|clear|describ|explain|compar|evaluat|validat)', '\\b(?:confus|overclaim|unjustif|unconvinc)',
    '\\?|？', '建议|应该|应当|需要|请|是否|为什么|如何|缺少|缺乏|不足|不清楚|未能|没有|问题|错误|笔误'
  ].join('|'), 'i');
  const RE_STRONG = /\b(?:please|should|could|would|must|needs? to|why|how)\b|\?|？|建议|应该|请|为什么/i;
  const RE_SOCIAL = /^(?:thank|thanks|i (?:thank|appreciate)|we thank|感谢|谢谢)/i;
  const RE_SUMMARY = /^(?:this (?:paper|work|manuscript|submission|study)|the (?:paper|authors?|manuscript|work)) (?:propose|present|stud|introduce|address|tackle|investigate|describe|consider|focus|develop|explore)|^(?:in this (?:paper|work|manuscript))|^本文|^该文|^作者提出/i;
  const RE_PRAISE = /(well[- ]written|clearly written|easy to follow|impressive|enjoyed|interesting (?:idea|paper|work)|strong results|extensive experiments|good job|novel and|solid|thorough|写得很好|很有意义)/i;
  function judge(sent) {
    if (RE_SOCIAL.test(sent) && !RE_STRONG.test(sent)) return 'social';
    if (RE_SUMMARY.test(sent) && !RE_STRONG.test(sent)) return 'summary';
    if (RE_REQ.test(sent)) return 'act';
    if (RE_PRAISE.test(sent)) return 'praise';
    return 'neutral';
  }
  const RE_STARTER = /^(?:however|also|additionally|moreover|furthermore|in addition|another|second(?:ly)?|third(?:ly)?|finally|lastly|besides|beyond that|对于|此外|另外|其次|最后)\b/i;

  // ── ⑥ ASAP aspect → category; severity ──
  function categorize(t) {
    if (/\b(?:typos?|grammar|proofread\w*|spelling|captions?|notations?|formatting|fonts?|writing|hard to follow|readab\w*|wording)\b|\bfig(?:ure)?\.? ?\d|\bline\s*\d+\b[^.]*\bshould (?:be|read)\b|["“”][^"“”]{1,20}["“”]\s*(?:should be|→|->)|笔误|语法|拼写|图注|写作/i.test(t) && !/experiment|baseline/i.test(t)) return { cat: 'writing', aspect: 'clarity' };
    if (/experiment|baseline|ablation|dataset|benchmark|evaluat|empirical|seeds?\b|variance|statistical|significan|compare (?:against|with)|comparison with|runtime|computational cost|annotation|agreement|data quality|实验|对比|消融|数据集/i.test(t)) return { cat: 'experiment', aspect: /compar|baseline/i.test(t) ? 'meaningful-comparison' : 'substance' };
    if (/related work|prior work|previous work|novel|novelty|original|incremental|cite|citation|literature|existing (?:work|methods?|approaches)|line of work|相关工作|引用|新颖|创新/i.test(t)) return { cat: 'related_work', aspect: /novel|original|incremental|新颖|创新/i.test(t) ? 'originality' : 'meaningful-comparison' };
    if (/code|reproduc|hyperparameter|implementation detail|release|复现|超参/i.test(t)) return { cat: 'clarification', aspect: 'replicability' };
    if (/proof|theorem|lemma|assumption|derivation|bound|correct|证明|定理|假设/i.test(t)) return { cat: 'clarification', aspect: 'soundness' };
    return { cat: 'clarification', aspect: 'clarity' };
  }
  const MAJOR_CUE = /\b(major|critical|significant(?:ly)?|serious|fundamental|main concern|not (?:convinc|support|justif)|must|essential|central claim|key claim)\b|主要|严重|关键/i;
  function severityOf(sec, t) {
    if (/typo|grammar|spelling|笔误|拼写/i.test(t)) return 'minor';
    if (sec === 'weaknesses') return 'major';
    if (sec === 'questions' || sec === 'minor' || sec === 'limitations' || sec === 'followup') return MAJOR_CUE.test(t) && sec !== 'minor' ? 'major' : 'minor';
    return MAJOR_CUE.test(t) ? 'major' : 'minor';
  }

  // ── ③–⑥ main parse ──
  function parse(paras) {
    const headLike = ln => !!(headingSplit(ln) || actorOf(ln) || RE_SCORE.test(ln));
    const blocks = paras.map(p => ({ text: joinLines(p.lines, headLike), page: p.page }));
    const platform = detectPlatform(blocks.map(b => b.text).join('\n'));
    const reviewers = [], anonMap = {}, items = [], ignored = [], authorReplies = [], sentList = [];
    let actor = null, sec = 'comments', author = false;
    const revId = a => {
      if (a.fixed) { if (!reviewers.some(r => r.id === a.fixed)) reviewers.push({ id: a.fixed }); return a.fixed; }
      if (!anonMap[a.anon]) { anonMap[a.anon] = 'R' + (Object.keys(anonMap).length + 1); reviewers.push({ id: anonMap[a.anon], source_id: a.anon }); }
      return anonMap[a.anon];
    };
    const meta = id => reviewers.find(r => r.id === id);
    const pushContent = (text, page) => {
      if (!text.trim()) return;
      if (author) { const last = authorReplies[authorReplies.length - 1]; if (last && last.page === page) last.text += '\n\n' + text; else authorReplies.push({ reviewer_id: actor, text: text.replace(/^comment\s*[:：]\s*/i, ''), page }); return; }
      if (!actor) { ignored.push({ text, page, reason: 'meta' }); return; }
      if (sec === 'summary' || sec === 'strengths' || sec === 'skip') { ignored.push({ text, page, reason: sec === 'strengths' ? 'praise' : sec === 'skip' ? 'meta' : 'summary', reviewer_id: actor }); return; }
      // split into items: list markers, then prose starters
      const chunks = text.split(/\n(?=\s*(?:\(?\d{1,2}[.)、]\s|\(?[a-z][.)]\s|[-•*·]\s|[WQCM]\d+[.:：)]?\s|(?:weakness|question|comment|concern|issue|point)\s*\d+[.:：)]?\s))/i);
      chunks.forEach(chunk => {
        const ss = sentences(chunk.replace(/^comment\s*[:：]\s*/i, ''));
        const listed = RE_ITEM.test(chunk);
        let cur = null;
        const flush = () => { if (cur && cur.sents.length) finalize(cur); cur = null; };
        ss.forEach((s, i) => {
          const j = judge(s), idx = sentList.push({ text: s, reviewer_id: actor, page, sec }) - 1;
          if (j === 'act' || (cur && j === 'neutral') || (listed && j === 'neutral' && !cur)) {
            if (cur && j === 'act' && !listed && (RE_STARTER.test(s) || sec === 'minor')) flush();
            if (!cur) cur = { sents: [], idx: [], page, sec };
            cur.sents.push(s); cur.idx.push(idx);
          } else if (cur && (j === 'praise' || j === 'summary') && listed) { cur.sents.push(s); cur.idx.push(idx); }
          else { if (!listed) flush(); ignored.push({ text: s, page, reason: j === 'neutral' ? 'summary' : j, reviewer_id: actor, sid: idx }); }
        });
        flush();
      });
    };
    const finalize = c => {
      const quote = c.sents.join(' ').trim(), { cat, aspect } = categorize(quote);
      const suspect = quote.length < 25 || quote.length > 1400 || !c.sents.some(s => judge(s) === 'act');
      items.push({ reviewer_id: actor, quote, category: cat, aspect, severity: severityOf(c.sec, quote), source_page: c.page, suspect, sids: c.idx });
    };
    blocks.forEach(b => {
      let acc = [];
      const flushAcc = () => { if (acc.length) pushContent(acc.join('\n'), b.page); acc = []; };
      b.text.split('\n').forEach(ln => {
        const a = actorOf(ln), h = !a && headingSplit(ln), sc = !a && !h && ln.match(RE_SCORE), mt = !a && !h && !sc && RE_META.test(ln);
        if (a || h || sc || mt) flushAcc();
        if (a) {
          if (a.kind === 'author') { author = true; return; }
          author = false; actor = revId(a); sec = a.followup ? 'followup' : 'comments';
          if (a.rest) acc.push(a.rest);
        } else if (h) {
          if (!author && !(sec === 'followup' && h.sec === 'comments')) sec = h.sec;
          if (h.rest) acc.push(h.rest);
        } else if (sc) {
          if (actor && !author) {
            const r = meta(actor), k = sc[1].toLowerCase(), v = +sc[2];
            if (/^(rating|overall assessment|overall score|recommendation|overall recommendation)$/.test(k)) r.score = v;
            else if (k === 'confidence') r.confidence = v;
            else (r.extra = r.extra || {})[k] = v;
          }
          ignored.push({ text: ln, page: b.page, reason: 'score', reviewer_id: actor });
        } else if (mt) ignored.push({ text: ln, page: b.page, reason: 'meta' });
        else acc.push(ln);
      });
      flushAcc();
    });
    return { platform, reviewers, items, ignored, authorReplies, sentList };
  }
  const parseBlocks = parse;

  // ── OCR (opt-in) ──
  async function ocrPages(buf, lang, onProgress) {
    if (!window.Tesseract) await loadScript(TESS);
    const lib = await pdfjs(), doc = await lib.getDocument({ data: buf }).promise;
    let cur = 1;
    const worker = await Tesseract.createWorker(lang, 1, { logger: m => { if (m.status === 'recognizing text') onProgress(cur, doc.numPages, Math.round(m.progress * 100)); } });
    const pages = [];
    try {
      for (let p = 1; p <= doc.numPages; p++) {
        cur = p; onProgress(p, doc.numPages, 0);
        const page = await doc.getPage(p), vp = page.getViewport({ scale: 2 }), cv = document.createElement('canvas');
        cv.width = vp.width; cv.height = vp.height;
        await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
        const { data } = await worker.recognize(cv);
        let y = 100000;
        pages.push(data.text.split('\n').reduce((ls, t) => { if (!t.trim()) { y -= 30; return ls; } y -= 10; ls.push({ text: t.trim(), y, size: 10, page: p }); return ls; }, []));
      }
    } finally { await worker.terminate(); }
    return pages;
  }

  // ── AI refine (opt-in): regroup numbered sentences, never rewrite ──
  async function aiRefine(res, onStep) {
    const byRev = {};
    res.sentList.forEach((s, i) => { if (s.reviewer_id && s.sec !== 'summary' && s.sec !== 'strengths' && s.sec !== 'skip') (byRev[s.reviewer_id] = byRev[s.reviewer_id] || []).push(i); });
    const revs = Object.keys(byRev), out = [];
    for (let k = 0; k < revs.length; k++) {
      onStep(k + 1, revs.length);
      const ids = byRev[revs[k]];
      const prompt = `You segment a peer review into actionable comments that the authors must answer.
Sentences are numbered. Return ONLY a JSON array, no prose, no code fences. Each element:
{"s":[sentence numbers forming ONE comment, consecutive, in order],"category":"experiment|clarification|writing|related_work|misunderstanding|decline","severity":"major|minor"}
Include only sentences that request something or criticize (skip summaries, praise, thanks, scores). Never rewrite text; only use the numbers.
Sentences:
${ids.map(i => `[${i}] ${res.sentList[i].text}`).join('\n').slice(0, 14000)}`;
      const txt = await window._callAI(prompt, 1500);
      const m = String(txt || '').match(/\[[\s\S]*\]/);
      if (!m) throw new Error('no JSON array');
      JSON.parse(m[0]).forEach(g => {
        const s = (g.s || []).map(Number).filter(i => ids.includes(i)); if (!s.length) return;
        const quote = s.map(i => res.sentList[i].text).join(' ');
        out.push({ reviewer_id: revs[k], quote, category: CATS.includes(g.category) ? g.category : categorize(quote).cat, severity: g.severity === 'major' ? 'major' : 'minor', source_page: res.sentList[s[0]].page, suspect: false, sids: s, ai: true });
      });
    }
    return out;
  }

  // ── UI ──
  let st = null;
  function modal() {
    if (!document.getElementById('rbt-pdf-modal')) {
      document.body.insertAdjacentHTML('beforeend', `<div class="modal-overlay" id="rbt-pdf-modal" onclick="if(event.target===this)rbtPdfClose()">
        <div class="modal" style="max-width:820px;width:96vw;max-height:90vh;overflow-y:auto"><div class="modal-title" id="rbt-pdf-title"></div><div id="rbt-pdf-body"></div></div></div>`);
    }
    return document.getElementById('rbt-pdf-body');
  }
  function status(msg) { modal().innerHTML = `<div class="rbt-hint">${E(msg)}</div>`; }
  window.rbtPdfClose = () => { closeModal('rbt-pdf-modal'); st = null; };
  window.rbtPdfOpen = async function (sid, input) {
    const f = input.files && input.files[0]; input.value = ''; if (!f) return;
    const l = L(); modal(); document.getElementById('rbt-pdf-title').textContent = l.title + ' · ' + f.name; openModal('rbt-pdf-modal');
    st = { sid, buf: await f.arrayBuffer(), name: f.name };
    try {
      status(l.reading);
      const pages = await extractLines(st.buf.slice(0), (i, n) => status(l.reading + ' ' + F(l.page, { i, n })));
      const chars = pages.flat().reduce((a, x) => a + x.text.length, 0);
      if (chars < 40 * pages.length) { st.scanned = true; st.res = null; return render(); }
      const { paras, dropped } = cleanup(pages);
      st.res = parseBlocks(paras); st.res.ignored = dropped.concat(st.res.ignored);
      st.sel = new Set(st.res.items.map((_, i) => i));
      render();
    } catch (e) { status(l.fail + e.message); }
  };
  function render() {
    const l = L(), body = modal(), pf = _safeGetItem('phd_rbt_prefs', {}) || {};
    if (st.scanned && !st.res) {
      body.innerHTML = `<div class="rbt-hint">${E(l.scanned)}<br>${E(l.ocrSize)}</div>
        <div class="rbt-inline" style="margin-top:10px">${E(l.ocrLang)} <select id="rbt-ocr-lang"><option value="eng">English</option><option value="eng+chi_sim">English + 中文</option></select>
        <button class="btn btn-primary btn-sm" onclick="rbtPdfOCR()">${E(l.ocrBtn)}</button>
        <button class="btn btn-ghost btn-sm" onclick="rbtPdfClose()">${E(l.cancel)}</button></div>`;
      return;
    }
    const r = st.res, revIds = r.reviewers.map(x => x.id);
    const opt = (arr, v, map) => arr.map(k => `<option value="${E(k)}" ${k === v ? 'selected' : ''}>${E(map ? map[k] : k)}</option>`).join('');
    const rl = (typeof rbtLabels === 'function') ? rbtLabels() : { cat: {} };
    const ign = r.ignored.filter(x => x.reason !== 'meta' || x.text.length > 3);
    body.innerHTML = `<div class="rbt-hint">${E(F(l.detected, { p: l.platform[r.platform], r: r.reviewers.length, n: r.items.length }))}
        ${r.reviewers.length ? '<br>' + r.reviewers.map(v => `<b>${E(v.id)}</b>${v.source_id ? ` (${E(v.source_id)})` : ''}${v.score != null ? ` · score ${E(v.score)}` : ''}${v.confidence != null ? ` · conf ${E(v.confidence)}` : ''}${v.extra ? ' · ' + Object.entries(v.extra).map(([k, x]) => `${E(k)} ${E(x)}`).join(', ') : ''}`).join('　') : ''}
        ${r.authorReplies.length ? '<br>' + E(F(l.authorReplies, { n: r.authorReplies.length })) : ''}</div>
      ${pf.ai ? `<div class="rbt-inline" style="margin-top:8px"><button class="btn btn-ghost btn-sm" id="rbt-pdf-ai" onclick="rbtPdfAI()">${E(l.aiBtn)}</button><span class="rbt-ai-note" style="margin:0;flex:1">${E(l.aiNote)}</span></div>` : ''}
      <div class="rbt-inline" style="margin:10px 0 6px"><button class="btn btn-ghost btn-sm" onclick="rbtPdfSel(true)">${E(l.selAll)}</button><button class="btn btn-ghost btn-sm" onclick="rbtPdfSel(false)">${E(l.selNone)}</button></div>
      ${r.items.length ? r.items.map((it, i) => `<div class="rbt-pdf-item ${st.sel.has(i) ? '' : 'off'}" data-i="${i}">
          <label class="rbt-pdf-chk"><input type="checkbox" ${st.sel.has(i) ? 'checked' : ''} onchange="rbtPdfToggle(${i},this.checked)"></label>
          <div class="rbt-pdf-main"><div class="rbt-inline" style="margin:0">
            <select onchange="rbtPdfSet(${i},'reviewer_id',this.value)" title="${E(l.reviewer)}">${opt(revIds, it.reviewer_id)}</select>
            <select onchange="rbtPdfSet(${i},'category',this.value)" title="${E(l.category)}">${opt(CATS, it.category, rl.cat)}</select>
            <select onchange="rbtPdfSet(${i},'severity',this.value)" title="${E(l.severity)}">${opt(['major', 'minor'], it.severity)}</select>
            <span class="rbt-tag">p.${E(it.source_page)}</span>${it.aspect ? `<span class="rbt-tag">${E(it.aspect)}</span>` : ''}
            ${it.ai ? '<span class="rbt-tag rbt-st-drafting">AI</span>' : ''}${it.suspect ? `<span class="rbt-tag rbt-sev-major" title="${E(l.suspect)}">⚠</span>` : ''}</div>
            <div class="rbt-pdf-q">${E(it.quote)}</div></div></div>`).join('') : `<div class="rbt-empty">${E(l.empty)}</div>`}
      ${ign.length ? `<details class="rbt-pdf-ign"><summary>${E(F(l.ignoredH, { n: ign.length }))}</summary>${ign.map((x, k) => `<div class="rbt-prev"><span class="rbt-tag">${E(l.reason[x.reason] || x.reason)}</span> ${x.page ? `<span class="rbt-tag">p.${E(x.page)}</span>` : ''} ${E(x.text.slice(0, 220))}
          ${x.reviewer_id && x.reason !== 'score' ? `<button class="btn btn-ghost btn-sm" onclick="rbtPdfRestore(${r.ignored.indexOf(x)})">${E(l.restore)}</button>` : ''}</div>`).join('')}</details>` : ''}
      <div class="modal-footer"><button class="btn btn-ghost" onclick="rbtPdfClose()">${E(l.cancel)}</button>
        <button class="btn btn-primary" onclick="rbtPdfImport()" ${st.sel.size ? '' : 'disabled'}>${E(F(l.importN, { n: st.sel.size }))}</button></div>`;
  }
  window.rbtPdfToggle = (i, on) => { on ? st.sel.add(i) : st.sel.delete(i); render(); };
  window.rbtPdfSel = on => { st.sel = new Set(on ? st.res.items.map((_, i) => i) : []); render(); };
  window.rbtPdfSet = (i, k, v) => { st.res.items[i][k] = v; };
  window.rbtPdfRestore = function (k) {
    const x = st.res.ignored[k]; if (!x) return;
    const { cat, aspect } = categorize(x.text);
    st.res.items.push({ reviewer_id: x.reviewer_id, quote: x.text, category: cat, aspect, severity: 'minor', source_page: x.page, suspect: true });
    st.sel.add(st.res.items.length - 1); st.res.ignored.splice(k, 1); render();
  };
  window.rbtPdfOCR = async function () {
    const l = L(), lang = document.getElementById('rbt-ocr-lang').value;
    try {
      const pages = await ocrPages(st.buf.slice(0), lang, (i, n, p) => status(F(l.ocrRun, { i, n, p })));
      const { paras: cleaned, dropped } = cleanup(pages);
      st.res = parseBlocks(cleaned); st.res.ignored = dropped.concat(st.res.ignored); st.sel = new Set(st.res.items.map((_, i) => i)); st.scanned = false; render();
    } catch (e) { status(l.fail + e.message); }
  };
  window.rbtPdfAI = async function () {
    const l = L();
    if (typeof window._callAI !== 'function') return toast(l.noAI, 'error');
    const btn = document.getElementById('rbt-pdf-ai'); btn.disabled = true;
    try {
      const items = await aiRefine(st.res, (i, n) => { btn.textContent = F(l.aiRun, { i, n }); });
      if (!items.length) throw new Error('empty result');
      st.res.items = items; st.sel = new Set(items.map((_, i) => i)); toast(F(l.aiDone, { n: items.length })); render();
    } catch (e) { toast(l.aiFail + e.message, 'error'); btn.disabled = false; btn.textContent = l.aiBtn; }
  };
  window.rbtPdfImport = function () {
    const r = st.res, chosen = r.items.filter((_, i) => st.sel.has(i)).map(({ sids, aspect, suspect, ai, ...it }) => it);
    window.rbtImportParsed(st.sid, { items: chosen, reviewers: r.reviewers, authorReplies: r.authorReplies });
    toast(F(L().imported, { n: chosen.length })); rbtPdfClose();
  };

  window.rbtPdfInternals = { extractLines, cleanup, parseBlocks, sentences, judge, categorize, detectPlatform };
  window.rbtPdfLabel = () => L().btn;
})();
