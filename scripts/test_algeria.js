// هيا نتعلم في الجزائر: tests for the rules in algeria.js and the content in algeria.json (no browser).   node scripts/test_algeria.js
const assert = require('assert');
const path = require('path');
const { core: C } = require(path.join(__dirname, '..', 'algeria.js'));
const D = require(path.join(__dirname, '..', 'algeria.json'));
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok', name); };

// one session, as the app runs it: the postcard on the first day, the warm-up cards rated, the step with `wrong` mistakes, the day finished
function session(r, t, { wrong = 0, cards = true } = {}) {
  const d = C.openDay(r, D, t);
  if (d.arrive) { r.arrived[d.city] = t; C.teach(r, D, D.cities.find(c => c.id === d.city).cards); }
  if (cards) C.warmIds(r, D, t).forEach(id => C.rate(r, id, true, t));
  let res = null;
  if (d.step) { C.startStep(r, D, d.step, t); res = C.finishStep(r, D, d.step, t, wrong, 8); }
  if (d.pic) r.pics[d.pic] = t;
  C.finishDay(r, t);
  const stamp = C.stampIfDone(r, D, t);
  return { d, res, stamp };
}

ok('the first day: the capital, its Arabic step, with its postcard and a picture', () => {
  const r = C.blank();
  const d = C.openDay(r, D, '2026-11-01');
  assert.strictEqual(d.city, 'alg'); assert.strictEqual(d.subj, 'ar'); assert.strictEqual(d.step, 'ar1');
  assert.strictEqual(d.write, true); assert.strictEqual(d.arrive, true); assert.strictEqual(d.pic, 'alg1');
  assert.strictEqual(r.start, '2026-11-01');
  assert.strictEqual(C.openDay(r, D, '2026-11-01'), d, 'the plan of a day never changes once opened');
});

ok('the trip is Arabic every day (maths has its own door); writing and speaking take turns; a missed day loses nothing', () => {
  const r = C.blank();
  const a = session(r, '2026-11-01', { wrong: 3 }).d, b = session(r, '2026-11-02', { wrong: 3 }).d, c = session(r, '2026-11-05', { wrong: 3 }).d;
  assert.deepStrictEqual([a.subj, b.subj, c.subj], ['ar', 'ar', 'ar']);
  assert.deepStrictEqual([a.write, b.write, c.write], [true, false, true]);
  assert.strictEqual(r.n, 3);
});

ok('Mama can swap writing and speaking', () => {
  const r = C.blank(); r.settings.first = 'say';
  assert.strictEqual(C.openDay(r, D, '2026-11-01').write, false);
});

ok('a step is passed after two different days with at most one mistake; then the city gets its stamp', () => {
  const r = C.blank();
  const a = session(r, '2026-11-01'), b = session(r, '2026-11-02');
  assert.deepStrictEqual([a.d.step, b.d.step], ['ar1', 'ar1']);
  assert.strictEqual(a.res.passes, 1); assert.ok(!a.stamp);
  assert.strictEqual(b.res.done, true); assert.strictEqual(b.stamp.id, 'alg');
  assert.strictEqual(r.stamps.alg, '2026-11-02');
});

ok('two mistakes alone is not a pass; it comes back on its next day', () => {
  const r = C.blank();
  const a = session(r, '2026-11-01', { wrong: 2 });
  assert.strictEqual(a.res.ok, false); assert.strictEqual(r.steps.ar1.pass.length, 0);
  const c = session(r, '2026-11-03', { wrong: 1 });
  assert.strictEqual(c.d.step, 'ar1'); assert.strictEqual(c.res.ok, true); assert.strictEqual(c.res.passes, 1);
  assert.strictEqual(C.stepDayIx(r, 'ar1', '2026-11-05'), 2, 'the third day takes the third example');
});

ok('after the capital comes Oran with its own step (حروف الجر), postcard and pictures; after Oran comes Tlemcen (الضمائر)', () => {
  const r = C.blank();
  let t = '2026-11-01';
  for (let i = 0; i < 2; i++) { session(r, t); t = C.addDays(t, 1); }
  const d = C.openDay(r, D, t);
  assert.strictEqual(d.city, 'orn'); assert.strictEqual(d.step, 'ar2'); assert.strictEqual(d.arrive, true); assert.strictEqual(d.pic, 'orn1');
  C.finishDay(r, t); r.days[t].done = true;
  for (let i = 0; i < 2; i++) { t = C.addDays(t, 1); const x = session(r, t); if (i === 1) assert.strictEqual(x.stamp.id, 'orn'); }
  t = C.addDays(t, 1);
  const e = C.openDay(r, D, t);
  assert.strictEqual(e.city, 'tlm'); assert.strictEqual(e.step, 'ar3'); assert.strictEqual(e.arrive, true); assert.strictEqual(e.pic, 'tlm1');
  C.finishDay(r, t); r.days[t].done = true;
  for (let i = 0; i < 2; i++) { t = C.addDays(t, 1); const x = session(r, t); if (i === 1) assert.strictEqual(x.stamp.id, 'tlm'); }
  t = C.addDays(t, 1);
  const f = C.openDay(r, D, t);
  assert.strictEqual(f.city, 'bja'); assert.strictEqual(f.step, 'ar4'); assert.strictEqual(f.pic, 'bja1');
});

ok('الفعل الماضي (بجاية) and المضارع (سطيف): every form as its pronoun asks; the wrong choices differ in letters; practice is well made', () => {
  const strip = w => w.replace(/[\u064B-\u0652]/g, '');
  Object.values(D.steps.ar5.verbs).forEach(v => {
    assert.ok(v.forms['أنا'].startsWith('أ') && v.forms['نحن'].startsWith('ن') && v.forms['هو'].startsWith('ي') && v.forms['هم'].endsWith('ونَ') && v.forms['أنتِ'].endsWith('ين'), v.stem);
    Object.entries(D.steps.ar5.wrong).forEach(([p, ws]) => ws.forEach(w => assert.notStrictEqual(strip(v.forms[p]), strip(v.forms[w]), `${v.stem} ${p}/${w}`)));
  });
  C.tasrifItems(D.steps.ar5, 3).forEach(it => assert.strictEqual(new Set(it.opts).size, 3));
  const st = D.steps.ar4;
  Object.values(st.verbs).forEach(v => {
    assert.ok(v.forms['أنا'].endsWith('تُ') && v.forms['نحن'].endsWith('نا') && v.forms['هم'].endsWith('وا') && v.forms['هي'].endsWith('تْ'), v.stem);
    Object.entries(st.wrong).forEach(([p, ws]) => ws.forEach(w => assert.notStrictEqual(strip(v.forms[p]), strip(v.forms[w]), `${v.stem} ${p}/${w}`)));
  });
  const items = C.tasrifItems(st, 11);
  assert.strictEqual(items.length, 8);
  items.forEach(it => { assert.strictEqual(new Set(it.opts).size, 3); assert.ok(it.ok >= 0 && it.q.includes('___')); });
  assert.ok(items.some(it => it.ask === 'pickVerb') && items.some(it => it.ask === 'fillDami'));
  ['ar1', 'ar2', 'ar3', 'ar4', 'ar5'].forEach(id => D.steps[id].explain.forEach(x => assert.ok(D.lines.some(l => l[0] === x.id), x.id)));   // the explanation is heard
});

ok('الضمائر: every bank sentence has its noun; the right pronoun is among three different ones; practice is well made', () => {
  const st = D.steps.ar3;
  Object.entries(st.dami).forEach(([id, j]) => { assert.ok(j.w.includes(j.noun), id); assert.ok(!j.wrong.includes(j.pron), id); assert.strictEqual(new Set(j.wrong).size, 2, id); });
  st.fill.forEach(([q, right, wrong]) => { assert.ok(q.includes('___'), q); assert.ok(!wrong.includes(right), q); });
  st.worked.forEach(w => assert.ok(st.dami[w.s] && D.lines.some(l => l[0] === w.id) && D.lines.some(l => l[0] === 's-' + w.s), w.id));
  const items = C.damiItems(st, 7);
  assert.strictEqual(items.length, 8);
  items.forEach(it => { assert.strictEqual(new Set(it.opts).size, 3); assert.ok(it.ok >= 0); });
  assert.ok(items.some(it => it.t === 'swap') && items.some(it => it.t === 'fill'));
});

ok('her mistakes come back (her request): a missed question is a card of أخطائي tomorrow, then 1, 2, 4 days; right four times and it leaves', () => {
  const r = C.blank(); let t = '2026-11-01';
  const id = C.addMiss(r, t, { f: 'البناتُ يقرأْنَ القصصَ.', mark: 'البناتُ', ask: 'أيُّ ضمير؟', b: 'هنّ' });
  assert.ok(C.cardOf(r, D, id)); assert.strictEqual(C.warmIds(r, D, t).includes(id), false);
  t = C.addDays(t, 1); assert.ok(C.warmIds(r, D, t).includes(id));
  C.rate(r, id, false, t); assert.strictEqual(r.cards[id].due, C.addDays(t, 1));       // wrong again: tomorrow
  const gaps = [];
  for (let k = 0; k < 6 && r.cards[id]; k++) {
    t = C.addDays(t, 1); while (!C.warmIds(r, D, t).includes(id)) t = C.addDays(t, 1);
    C.rate(r, id, true, t); if (!C.retire(r, id)) gaps.push(r.cards[id].box);
  }
  assert.ok(!r.cards[id] && !r.mcards[id], 'it left the deck'); assert.deepStrictEqual(gaps, [2, 3]);
  assert.strictEqual(C.addMiss(r, t, { f: 'x', b: 'y' }), C.addMiss(r, t, { f: 'x', b: 'y' }));   // the same mistake is one card
});

ok('حروف الجر: every bank sentence has its حرف and its اسم مجرور ending in a kasra; practice is always well made', () => {
  const st = D.steps.ar2;
  Object.entries(st.jarr).forEach(([id, j]) => { assert.ok(j.w.includes(j.jar), id); assert.ok(j.w.includes(j.maj), id); assert.ok(j.maj.endsWith('\u0650'), id + ' kasra');
    assert.ok(j.w.indexOf(j.maj) === j.w.indexOf(j.jar) + 1, id + ': the noun comes right after the حرف'); });
  st.fill.forEach(([q, right, wrong]) => { assert.ok(q.includes('___')); assert.ok(!wrong.includes(right)); assert.strictEqual(new Set(wrong).size, 2); });
  for (let seed = 1; seed < 300; seed++) C.jarrItems(st, seed).forEach(it => {
    if (it.t === 'find') assert.strictEqual(st.jarr[it.s].w[it.ok], st.jarr[it.s].jar);
    else { assert.strictEqual(new Set(it.opts).size, 3, JSON.stringify(it)); if (it.t === 'end') assert.strictEqual(it.opts[it.ok], st.jarr[it.s].maj); }
  });
  st.worked.forEach(w => assert.ok(st.jarr[w.s]));
});

ok('cards: Talk Cards boxes (1, 2, 4 ... days), cross = tomorrow, at most 3 new a day, at most 6 in the warm-up', () => {
  const r = C.blank();
  C.teach(r, D, ['dz1', 'dz2', 'dz3', 'dz4', 'dz5']);
  const t = '2026-11-01';
  const w = C.warmIds(r, D, t); assert.deepStrictEqual(w, ['dz1', 'dz2', 'dz3']);
  C.rate(r, 'dz1', true, t); C.rate(r, 'dz2', false, t); C.rate(r, 'dz2', true, t);
  assert.strictEqual(r.cards.dz1.box, 1); assert.strictEqual(r.cards.dz1.due, '2026-11-02');
  assert.strictEqual(r.cards.dz2.box, 1); assert.strictEqual(r.cards.dz2.due, '2026-11-02', 'right after a cross: tomorrow again');
  C.rate(r, 'dz3', true, t);
  assert.deepStrictEqual(C.warmIds(r, D, t), [], 'three new already today');
  C.rate(r, 'dz1', true, '2026-11-02'); assert.strictEqual(r.cards.dz1.box, 2); assert.strictEqual(r.cards.dz1.due, '2026-11-04');
  C.rate(r, 'dz1', true, '2026-11-02'); assert.strictEqual(r.cards.dz1.box, 2, 'a card moves up at most once a day');
  C.teach(r, D, Object.keys(D.cards));
  assert.ok(C.warmIds(r, D, '2026-11-20').length <= 6);
});

ok('cards join only after they are taught: the grammar cards with the first Arabic lesson, the practice ones after a pass', () => {
  const r = C.blank();
  C.startStep(r, D, 'ar1', '2026-11-01');
  assert.deepStrictEqual(r.newq, ['qw1', 'qw2', 'qw3']);
  C.finishStep(r, D, 'ar1', '2026-11-01', 0, 8);
  assert.deepStrictEqual(r.newq.slice(3), ['qw4', 'qw5', 'qw6']);
  C.startStep(r, D, 'ar1', '2026-11-03'); assert.strictEqual(r.newq.length, 6, 'taught once only');
});

ok('the description level: one sentence for ten sessions, then one more every ten, up to six; Mama can set it', () => {
  const r = C.blank();
  assert.strictEqual(C.level(r), 1); r.n = 10; assert.strictEqual(C.level(r), 2); r.n = 80; assert.strictEqual(C.level(r), 6);
  r.settings.level = 3; assert.strictEqual(C.level(r), 3);
});

ok('the picture of the day: each new one first, then the one seen longest ago', () => {
  const r = C.blank();
  assert.strictEqual(C.pickPic(r, D, 'alg'), 'alg1');
  D.cities[0].pics.forEach((p, i) => { r.pics[p] = C.addDays('2026-11-01', i); });
  r.pics.alg1 = '2026-12-01';
  assert.strictEqual(C.pickPic(r, D, 'alg'), 'alg2');
});

ok('clean() repairs a broken state and keeps settings in range', () => {
  const r = C.clean({ steps: [], cards: null, n: -3, settings: { level: 99, newPerDay: 0, first: 'x' } });
  assert.deepStrictEqual(r.steps, {}); assert.deepStrictEqual(r.cards, {}); assert.strictEqual(r.n, 0);
  assert.strictEqual(r.settings.level, 6); assert.strictEqual(r.settings.newPerDay, 3); assert.strictEqual(r.settings.first, 'ar');
  assert.ok(C.valid(C.blank())); assert.ok(!C.valid({}));
});

ok('the whole trip: from the capital to Tamanrasset, every city its stamp, then pictures and cards go on', () => {
  const r = C.blank(); let t = '2026-11-01', stamps = [];
  for (let day = 0; day < 120; day++) {
    const x = session(r, t); if (x.stamp) stamps.push(x.stamp.id);
    t = C.addDays(t, 1);
    if (stamps.length === D.cities.length) break;
  }
  assert.deepStrictEqual(stamps, D.cities.map(c => c.id));
  const after = C.openDay(r, D, t);
  assert.strictEqual(after.step, null); assert.ok(D.pics[after.pic]);
});

/* ---------- the content ---------- */
ok('every card, picture, sentence and step the app needs is in algeria.json', () => {
  const c = D.cities[0];
  c.cards.concat(...Object.values(D.pics).map(p => p.teach), ...Object.values(D.steps).map(s => s.teachDay1.concat(s.teachPass)))
    .forEach(id => assert.ok(D.cards[id], id));
  D.cities.filter(x => x.ready).forEach(c => c.pics.forEach(p => {   // the model whole, in its five parts (her request), every line heard
    assert.ok(D.pics[p], p); assert.deepStrictEqual(D.pics[p].desc.map(d => d.k), ['see', 'colours', 'back', 'feel', 'think'], p);
    D.pics[p].desc.forEach(d => { assert.ok(d.lines.length >= 1, p + d.k); d.lines.forEach(x => assert.ok(D.lines.some(l => l[0] === x.id), x.id)); });
    assert.ok(D.pics[p].model.length >= 6, p);
  }));
  const st = D.steps.ar1;
  st.worked.concat(st.guided.map(g => g[0]), ...st.alone).forEach(sid => assert.ok(D.sent[sid], sid));
  st.guided.forEach(([sid, i]) => assert.ok(D.sent[sid][i], sid));
  D.steps.ma1.guided.forEach(g => assert.ok(g.opts.includes(g.parts[g.blank]), g.n));
  const ready = D.cities.map(x => !!x.ready); assert.ok(ready.indexOf(false) === -1 || ready.slice(ready.indexOf(false)).every(x => !x), 'the ready cities come first, with no gap');
  assert.ok(ready.filter(Boolean).length >= 6);
  Object.values(D.steps).filter(st => st.kind === 'pick').forEach(st => {   // the later lessons: every bank question well made
    st.bank.forEach(([q, right, wrong, ask]) => { assert.ok(!wrong.includes(right), q); assert.ok(ask, q); });
    st.worked.forEach(w => { assert.ok(D.lines.some(l => l[0] === w.id) && D.lines.some(l => l[0] === 's-' + w.s), w.id); w.lit.forEach(i => assert.ok(w.w[i], w.id)); });
    C.pickItems(st, 5).forEach(it => assert.ok(it.ok >= 0 && new Set(it.opts).size === it.opts.length, st.id));
    const asks = new Set(st.bank.map(b => b[3])), day = new Set(C.pickItems(st, 9).map(it => it.ask));   // every kind of question each day
    assert.ok(day.size >= Math.min(asks.size, 3), st.id + ' mixes its kinds');
    st.explain.forEach(x => assert.ok(D.lines.some(l => l[0] === x.id), x.id));
  });
  D.photos.forEach(p => assert.ok(require('fs').existsSync(path.join(__dirname, '..', p)), p));
});

ok('numbers in Saudi digits (her rule); every spoken line has an id once; nothing she reads herself is recorded', () => {
  assert.strictEqual(C.num(23519), '٢٣٥١٩'); assert.strictEqual(C.num(265), '٢٦٥');
  const ids = D.lines.map(l => l[0]);
  assert.strictEqual(new Set(ids).size, ids.length);
  D.steps.ma1.worked.forEach(w => assert.ok(ids.includes('n-' + w.n)));
  assert.ok(!ids.some(i => /^(c-|e-)/.test(i)), 'cards and easy items are read by her');
  D.cities.filter(c => c.post).forEach(c => c.post.forEach(p => assert.ok(ids.includes(p.id), p.id)));   // the postcard is heard once first
  Object.values(D.cards).forEach(c => ['f', 'b', 's', 'num'].forEach(k => assert.ok(!/[0-9]/.test(c[k] || ''), c.id + ' ' + k)));   // no Western digits on a card
});

ok('number words: the generator reads every number of the book as the book does', () => {
  Object.entries(D.words).forEach(([n, w]) => assert.strictEqual(C.numWords(+n), w, n));
  assert.strictEqual(C.numWords(11000), 'أحد عشر ألفًا'); assert.strictEqual(C.numWords(100000 - 1), 'تسعة وتسعون ألفًا وتسعمائة وتسعة وتسعون');
  assert.strictEqual(C.numWords(3010), 'ثلاثة آلاف وعشرة'); assert.strictEqual(C.numWords(212), 'مئتان واثنا عشر');
  assert.deepStrictEqual(C.expanded(4205), ['4000', '200', '5']);
});

ok('practice is generated: eight a day, the right answer always among three different options, the same on the same day', () => {
  for (let seed = 1; seed < 400; seed++) {
    const items = C.mathItems(seed, 8, [3, 5]);
    assert.strictEqual(items.length, 8);
    items.forEach(it => {
      assert.strictEqual(it.opts.length, 3, JSON.stringify(it)); assert.strictEqual(new Set(it.opts.map(String)).size, 3, JSON.stringify(it));
      assert.ok(it.n >= 100 && it.n <= 99999);
      if (it.t === 'place') assert.strictEqual(it.opts[it.ok], String(it.n).split('').reverse()[it.p]);
      else if (it.t === 'n2w') assert.strictEqual(it.opts[it.ok], C.numWords(it.n));
      else assert.strictEqual(it.opts[it.ok], it.n);
    });
  }
  assert.deepStrictEqual(C.mathItems(C.seedOf('2026-11-02ma1'), 8, [4, 4]), C.mathItems(C.seedOf('2026-11-02ma1'), 8, [4, 4]));
});

console.log(n, 'tests passed');
