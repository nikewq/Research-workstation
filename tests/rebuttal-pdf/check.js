// Rebuttal PDF recognition check — placeholder fixtures only.
// Usage: python3 -m http.server 8799 (repo root) &  then  node tests/rebuttal-pdf/check.js   (needs playwright-core + Chromium)
// Set OCR=1 to also run the scanned-PDF OCR path (downloads tesseract.js + language data on first run).
const { chromium } = require('playwright-core');
const BASE = process.env.BASE || 'http://localhost:8799';
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg); if (!cond) fails++; };

(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/index.html');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('phd_cfg', JSON.stringify({ setupDone: true, name: 'User', role: 'phd' })); });
  await p.reload(); await p.waitForTimeout(1000);
  const run = name => p.evaluate(async url => {
    const I = rbtPdfInternals, buf = await (await fetch(url)).arrayBuffer();
    const pages = await I.extractLines(buf);
    const chars = pages.flat().reduce((a, x) => a + x.text.length, 0);
    if (chars < 40 * pages.length) return { scanned: true };
    const { paras, dropped } = I.cleanup(pages), r = I.parseBlocks(paras);
    return { platform: r.platform, reviewers: r.reviewers, items: r.items.map(({ sids, ...x }) => x), authorReplies: r.authorReplies, ignored: dropped.concat(r.ignored) };
  }, `${BASE}/tests/rebuttal-pdf/fixtures/${name}.pdf`);
  const show = r => r.items.forEach(i => console.log(`    ${i.reviewer_id} p${i.source_page} ${i.severity.padEnd(5)} ${i.category.padEnd(13)} ${i.suspect ? '⚠' : ' '} ${i.quote.slice(0, 90)}`));
  const find = (r, rid, re) => r.items.find(i => i.reviewer_id === rid && re.test(i.quote));

  console.log('▶ openreview.pdf'); let r = await run('openreview'); show(r);
  ok(r.platform === 'openreview', 'platform = openreview');
  ok(r.reviewers.map(x => x.id + ':' + x.source_id).join() === 'R1:abcd,R2:wxyz', 'anonymous reviewers mapped to R1/R2');
  ok(r.reviewers[0].score === 5 && r.reviewers[0].confidence === 4 && r.reviewers[0].extra.soundness === 2, 'R1 rating / confidence / soundness');
  ok(r.reviewers[1].score === 6 && r.reviewers[1].confidence === 3, 'R2 rating / confidence');
  ok(find(r, 'R1', /Baseline X is missing/)?.severity === 'major' && find(r, 'R1', /Baseline X is missing/)?.category === 'experiment', 'R1 W1 → major / experiment');
  ok(find(r, 'R1', /ablation of Component Y/)?.severity === 'major', 'R1 W2 → major');
  ok(find(r, 'R1', /threshold/)?.severity === 'minor', 'R1 Q1 → minor');
  ok(!!find(r, 'R2', /lacks a comparison/) && !!find(r, 'R2', /^Also, the writing/), 'R2 prose weakness split at "Also"');
  ok(find(r, 'R2', /^Also, the writing/)?.category === 'writing', 'typo/writing → writing');
  ok(find(r, 'R2', /novelty over Line of Work Z/)?.category === 'related_work', 'reviewer follow-up kept → related_work');
  ok(!r.items.some(i => /well written|Interesting idea|Thanks for the response|proposes Method M/.test(i.quote)), 'summary / praise / thanks not itemized');
  ok(r.authorReplies.length === 1 && r.authorReplies[0].reviewer_id === 'R1' && /Baseline X in Table 3/.test(r.authorReplies[0].text), 'author reply attached to R1');
  ok(!r.items.some(i => /openreview\.net|10:00 AM|Paper A \|/.test(i.quote)), 'print header / footer removed');
  ok(r.items.length === 7, `7 comments (got ${r.items.length})`);

  console.log('▶ arr.pdf'); r = await run('arr'); show(r);
  ok(r.platform === 'arr', 'platform = arr');
  ok(r.reviewers[0].score === 3 && r.reviewers[0].confidence === 3 && r.reviewers[0].extra.excitement === 2.5 && r.reviewers[0].extra.reproducibility === 4, 'ARR scores (overall / confidence / excitement / reproducibility)');
  ok(r.items.filter(i => i.severity === 'major').length === 2, '2 major from Summary Of Weaknesses');
  ok(find(r, 'R1', /teh/)?.category === 'writing' && find(r, 'R1', /Consider citing/)?.category === 'related_work', 'Comments/Typos split: typo → writing, citation → related_work');
  ok(r.items.length === 4, `4 comments (got ${r.items.length})`);

  console.log('▶ journal.pdf'); r = await run('journal'); show(r);
  ok(r.platform === 'journal', 'platform = journal');
  ok(r.reviewers.map(x => x.id).join() === 'Editor,R1,R2', 'Editor / R1 / R2');
  ok(find(r, 'R1', /Baseline X on Dataset D/)?.severity === 'major', 'major comment 1 → major');
  ok(/generalization/.test(find(r, 'R1', /Baseline X on Dataset D/)?.quote || ''), 'hyphenated line breaks re-joined');
  ok(find(r, 'R1', /Theorem 1/)?.category === 'clarification', 'proof / assumption → clarification (soundness)');
  ok(find(r, 'R1', /teh/)?.severity === 'minor' && find(r, 'R1', /caption/)?.severity === 'minor', 'minor comments → minor');
  ok(!!find(r, 'R2', /related work section misses/) && !!find(r, 'R2', /computational cost/), 'R2 prose split into 2 comments');
  ok(!r.items.some(i => /enjoyed|impressive|opportunity to review|Dear Dr|Yours sincerely|studies a placeholder/.test(i.quote)), 'letter boilerplate / praise / summary not itemized');
  ok(!r.items.some(i => /Journal of Placeholder Studies|Page \d of/.test(i.quote)), 'running header and page numbers removed');
  ok(r.items.length === 7, `7 comments (got ${r.items.length})`);

  console.log('▶ scanned.pdf'); r = await run('scanned');
  ok(r.scanned === true, 'image-only PDF detected as scanned');

  // UI flow: upload → preview → import → stored with source_page; existing data untouched
  console.log('▶ UI flow');
  await p.evaluate(() => {
    localStorage.setItem('phd_subs', JSON.stringify([{ id: 's1', title: 'Paper A', venue: 'X', status: 'under_review' }]));
    localStorage.setItem('phd_tasks', JSON.stringify([{ id: 't1', title: 'Task', done: false }]));
  });
  await p.reload(); await p.waitForTimeout(1000);
  const before = await p.evaluate(() => JSON.stringify(['phd_subs', 'phd_tasks', 'phd_cfg'].map(k => localStorage.getItem(k))));
  await p.evaluate(() => { switchPage('submissions'); switchResearchTab('subs'); });
  await p.click('.sub-item[data-sid="s1"] .rbt-bar button');
  await p.setInputFiles('.sub-item[data-sid="s1"] input[accept="application/pdf,.pdf"]', __dirname + '/fixtures/openreview.pdf');
  await p.waitForSelector('#rbt-pdf-modal .rbt-pdf-item', { timeout: 30000 });
  ok((await p.$$('#rbt-pdf-modal .rbt-pdf-item')).length === 7, 'preview lists 7 comments');
  await p.click('#rbt-pdf-modal .rbt-pdf-item:nth-of-type(1) input[type=checkbox]').catch(() => {});
  await p.click('#rbt-pdf-modal .modal-footer .btn-primary'); await p.waitForTimeout(300);
  const doc = await p.evaluate(() => JSON.parse(localStorage.getItem('phd_rebuttals')).s1.rounds[0]);
  ok(doc.comments.length >= 6 && doc.comments.every(c => c.source_page >= 1), `imported ${doc.comments.length} comments with source_page`);
  ok(doc.reviewers.find(v => v.id === 'R1')?.score === 5, 'reviewer scores imported');
  ok(doc.comments.some(c => /Baseline X in Table 3/.test(c.response_draft)), 'author reply filled into an empty draft');
  ok(await p.evaluate(() => document.querySelectorAll('.sub-item[data-sid="s1"] .rbt-row-h .rbt-tag[title="PDF"]').length) >= 6, 'rows show 📄 p.N tag');
  ok(before === await p.evaluate(() => JSON.stringify(['phd_subs', 'phd_tasks', 'phd_cfg'].map(k => localStorage.getItem(k)))), 'existing user data byte-identical');

  console.log('▶ AI refine (stubbed model)');
  await p.evaluate(() => {
    localStorage.setItem('phd_rbt_prefs', JSON.stringify({ ai: true }));
    window._callAI = async prompt => {
      const ids = [...prompt.matchAll(/^\[(\d+)\] /gm)].map(m => +m[1]);
      return 'Sure: ' + JSON.stringify([{ s: ids.slice(0, 2), category: 'experiment', severity: 'major' }, { s: [99999], category: 'writing', severity: 'minor' }]);
    };
  });
  await p.setInputFiles('.sub-item[data-sid="s1"] input[accept="application/pdf,.pdf"]', __dirname + '/fixtures/journal.pdf');
  await p.waitForSelector('#rbt-pdf-ai', { timeout: 30000 });
  ok(await p.isVisible('#rbt-pdf-modal .rbt-ai-note'), 'AI button shows confidentiality note');
  await p.click('#rbt-pdf-ai'); await p.waitForSelector('#rbt-pdf-modal .rbt-st-drafting', { timeout: 30000 });
  const ai = await p.evaluate(() => [...document.querySelectorAll('#rbt-pdf-modal .rbt-pdf-q')].map(x => x.textContent));
  ok(ai.length === 3, `one group per reviewer, invented sentence ids dropped (got ${ai.length})`);
  ok(ai.every(q => !/Sure/.test(q)) && /^The reviewers raise concerns/.test(ai[0]), 'quotes rebuilt from original sentences, not model text');
  await p.click('#rbt-pdf-modal .modal-footer .btn-ghost');

  if (process.env.OCR) {
    console.log('▶ OCR (scanned.pdf)');
    await p.setInputFiles('.sub-item[data-sid="s1"] input[accept="application/pdf,.pdf"]', __dirname + '/fixtures/scanned.pdf');
    await p.waitForSelector('#rbt-ocr-lang', { timeout: 30000 });
    await p.click('#rbt-pdf-modal >> text=/OCR/');
    await p.waitForSelector('#rbt-pdf-modal .rbt-pdf-item, #rbt-pdf-modal .rbt-empty', { timeout: 240000 });
    const q = await p.$$eval('#rbt-pdf-modal .rbt-pdf-q', e => e.map(x => x.textContent));
    q.forEach(x => console.log('    ' + x.slice(0, 90)));
    ok(q.some(x => /Baseline X/.test(x)) && q.length >= 4, `OCR recognized ${q.length} comments`);
  }
  ok(!errs.length, 'no page errors ' + (errs.length ? JSON.stringify(errs) : ''));
  await b.close();
  console.log(fails ? `\n${fails} check(s) failed` : '\nall checks passed');
  process.exit(fails ? 1 : 0);
})();
