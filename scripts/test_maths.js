// Tests for the times-tables scheduler in maths.js (no browser needed): node scripts/test_maths.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'maths.js'), 'utf8'), ctx);
const C = ctx.TimesTables.core;

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) passed++; else { failed++; console.log('FAIL:', msg); } }
function eq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }
const T0 = '2026-10-11';
const day = n => C.addDays(T0, n);
// a seeded random number generator, so every run is the same
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

/* ---------- digits ---------- */
eq(C.toAr(56), '٥٦', 'toAr 56');
eq(C.toAr('100'), '١٠٠', 'toAr 100');
eq(C.toWestern('٣٤'), '34', 'toWestern');
eq(C.parseAnswer('٥٦'), 56, 'parse Arabic-Indic');
eq(C.parseAnswer('56'), 56, 'parse Western');
eq(C.parseAnswer('۵۶'), 56, 'parse Persian digits too');
ok(Number.isNaN(C.parseAnswer('')), 'empty answer is NaN');

/* ---------- spoken answers (the microphone key) ---------- */
const SPOKEN = [
  ['٣٦', 36], ['36', 36], ['ستة وثلاثين', 36], ['ستّة وثلاثون', 36], ['ستة و ثلاثين', 36], ['اثنعش', 12], ['اثنا عشر', 12],
  ['اثني عشر', 12], ['ثلاثة عشر', 13], ['ثلطعش', 13], ['اربعتعش', 14], ['خمستاش', 15], ['سطعش', 16], ['سبعطعش', 17], ['ثمنطعش', 18],
  ['تسعتعش', 19], ['احدعش', 11], ['حدعش', 11], ['مية', 100], ['مئة', 100], ['مائة', 100], ['عشرة', 10], ['عشر', 10], ['واحد', 1],
  ['صفر', 0], ['ثمانية', 8], ['ثمانين', 80], ['اثنين وسبعين', 72], ['أربعة وعشرين', 24], ['خمسة وأربعين', 45], ['تسعة وتسعين', 99],
  ['الجواب ستة وخمسين', 56], ['ثلاثة في أربعة يساوي اثنا عشر', 12], ['3 × 4 = 12', 12], ['sixty three', 63], ['one hundred', 100],
  ['forty-two', 42], ['twelve', 12], ['سبعة', 7], ['ستّ', 6], ['ثنتين', 2], ['تلاتين', 30]
];
SPOKEN.forEach(([said, want]) => eq(C.parseSpoken(said), want, `spoken «${said}»`));
ok(Number.isNaN(C.parseSpoken('مرحبا')), 'no number in the words is NaN');
ok(Number.isNaN(C.parseSpoken('')), 'nothing said is NaN');

/* ---------- the facts, in teaching order ---------- */
eq(C.FACTS.length, 100, '100 facts');
eq(new Set(C.FACTS.map(f => `${f.a}x${f.b}`)).size, 100, 'all different');
eq(C.FACTS.slice(0, 10).map(f => f.id), Array.from({ length: 10 }, (_, i) => `m1x${i + 1}`), 'table 1 first, ×1 to ×10');
eq([...new Set(C.FACTS.map(f => f.table))], [1, 10, 2, 5, 3, 4, 9, 6, 7, 8], 'table order');
ok(C.FACTS.every(f => f.ans === f.a * f.b), 'answers');
eq(C.twinOf(C.FACT.m7x3).id, 'm3x7', 'twin of 7×3');
eq(C.twinOf(C.FACT.m4x4), null, 'a square has no twin');

/* ---------- sets of new facts ---------- */
eq(C.batchesFor(4).slice(0, 3).map(b => b.length), [4, 3, 3], 'batch size 4 → 4, 3, 3');
eq(C.batchesFor(3).slice(0, 4).map(b => b.length), [3, 3, 2, 2], 'batch size 3 → 3, 3, 2, 2');
ok(C.batchesFor(4).every(b => new Set(b.map(id => C.FACT[id].table)).size === 1), 'a set never mixes two tables');

/* ---------- grading ---------- */
{
  const m = C.blank();
  eq(C.gradeOf(m, true, 3900, false, 1), 'easy', '3.9 s, one digit = Easy');
  eq(C.gradeOf(m, true, 4100, false, 1), 'good', '4.1 s, one digit = Good');
  eq(C.gradeOf(m, true, 4500, false, 2), 'easy', '4.5 s, two digits = Easy (+0.6 s to type)');
  eq(C.gradeOf(m, true, 1000, true, 1), 'good', 'with the dots shown it is at most Good');
  eq(C.gradeOf(m, false, 900, false, 1), 'again', 'wrong = Again');
}

/* ---------- first session: one set of four, each shown with dots, then asked again ---------- */
{
  const m = C.blank();
  const items = C.buildSession(m, T0);
  eq(items.map(x => x.id), ['m1x1', 'm1x2', 'm1x3', 'm1x4'], 'first session = first set');
  ok(items.every(x => x.step === 'show'), 'new facts start with the dots');
  eq(m.open, ['m1x1', 'm1x2', 'm1x3', 'm1x4'], 'four facts open');
  const r = C.answer(m, items[0], true, 2000, true, T0, 1);
  eq(r.again, 'learn', 'after the first look it comes back without dots');
  eq(r.stars, 1, 'one star (no bonus with the dots)');
  eq(C.peek(m, 'm1x1').box, 0, 'still learning');
  const r2 = C.answer(m, { id: 'm1x1', step: 'learn' }, true, 1500, false, T0, 2);
  eq(r2.stars, 2, 'fast answer: a bonus star');
  eq([C.peek(m, 'm1x1').box, C.peek(m, 'm1x1').due], [2, day(2)], 'learn + Easy → box 2, due in 2 days');
  C.answer(m, { id: 'm1x2', step: 'show' }, true, 3000, true, T0, 1);
  C.answer(m, { id: 'm1x2', step: 'learn' }, true, 6000, false, T0, 2);
  eq([C.peek(m, 'm1x2').box, C.peek(m, 'm1x2').due], [1, day(1)], 'learn + Good → box 1, due tomorrow');
  // wrong while learning: back again, at most three looks
  C.answer(m, { id: 'm1x3', step: 'show' }, false, 3000, true, T0, 1);
  eq(C.answer(m, { id: 'm1x3', step: 'learn' }, false, 3000, false, T0, 2).again, 'learn', 'wrong → again in this session');
  eq(C.answer(m, { id: 'm1x3', step: 'learn' }, false, 3000, false, T0, 3).again, null, 'no fourth look');
  eq(C.peek(m, 'm1x3').box, 0, 'never right yet: still learning');
  ok(!C.batchReady(m), 'set not ready while a fact is still learning');
  // she stops here; the next session brings the unfinished ones back, without dots, and no new set
  const m2 = C.clean(JSON.parse(JSON.stringify(m)));          // save and reload
  eq(m2.cards, m.cards, 'cards survive save and reload');
  const next = C.buildSession(m2, T0);
  const fresh = next.filter(x => x.step !== 'warm');
  eq(fresh.map(x => [x.id, x.step]), [['m1x3', 'learn'], ['m1x4', 'show']], 'unfinished facts come back; no new set yet');
  ok(next.length >= 4 && next.filter(x => x.step === 'warm').length === next.length - 2, 'topped up with learned facts');
  eq(m2.open.length, 4, 'nothing new opened');
}

/* ---------- reviews: up, down and once a day ---------- */
{
  const m = C.blank();
  C.release(m);
  const c = C.rec(m, 'm1x1'); Object.assign(c, { box: 1, due: T0, up: day(-1), seen: 2, right: 2 });
  eq(C.answer(m, { id: 'm1x1', step: 'review' }, true, 6000, false, T0, 1).again, null, 'review Good: done');
  eq([c.box, c.due], [2, day(2)], 'box 1 + Good → box 2, in 2 days');
  C.answer(m, { id: 'm1x1', step: 'review' }, true, 1000, false, T0, 1);
  eq(c.box, 2, 'moves up at most once a day');
  c.due = day(2);
  C.answer(m, { id: 'm1x1', step: 'review' }, true, 1000, false, day(2), 1);
  eq([c.box, c.due], [4, day(9)], 'box 2 + Easy → box 4, in 7 days');
  eq(C.answer(m, { id: 'm1x1', step: 'review' }, false, 1000, false, day(9), 1).again, 'relearn', 'review Again → once more now');
  eq([c.box, c.due, c.lapses], [1, day(10), 1], 'Again → box 1, tomorrow');
  eq(C.answer(m, { id: 'm1x1', step: 'relearn' }, true, 1000, false, day(9), 2).again, null, 'relearned');
  eq(c.box, 1, 'relearning does not move it up the same day');
  const w = C.rec(m, 'm1x2'); Object.assign(w, { box: 3, due: day(20), seen: 3, right: 3 });
  C.answer(m, { id: 'm1x2', step: 'warm' }, true, 1000, false, day(9), 1);
  eq([w.box, w.due], [3, day(20)], 'warm-up right: schedule unchanged');
  C.answer(m, { id: 'm1x2', step: 'warm' }, false, 1000, false, day(9), 1);
  eq([w.box, w.due], [1, day(10)], 'warm-up wrong: relearn from box 1');
  eq(C.INTERVAL, [0, 1, 2, 4, 7, 14, 30], 'intervals');
  const p = C.rec(m, 'm1x3'); Object.assign(p, { box: 2, due: day(30) });
  C.answer(m, { id: 'm1x3', step: 'practice' }, false, 1000, false, day(9), 1, 'practice');
  eq([p.box, p.due], [2, day(30)], 'practice rounds never change the schedule');
}

/* ---------- the next set waits until this one is mostly mastered, and for the daily limit ---------- */
{
  const m = C.blank();
  C.release(m);                                  // 1×1 to 1×4
  m.batch.forEach(id => Object.assign(C.rec(m, id), { box: 1, due: day(1), intro: T0, seen: 2, right: 2 }));
  ok(!C.canRelease(m, T0), 'all in box 1: not yet');
  ['m1x1', 'm1x2', 'm1x3'].forEach(id => { C.rec(m, id).box = 2; });
  ok(C.canRelease(m, T0), 'three of four in box 2: mostly mastered');
  m.settings.newPerDay = 6;
  ok(!C.canRelease(m, T0), '4 today + 3 more > 6 a day: wait for tomorrow');
  ok(C.canRelease(m, day(1)), 'next day: yes');
  m.settings.newPerDay = 2;
  ok(C.canRelease(m, day(1)), 'the first set of the day always comes, even above the limit');
}

/* ---------- reversed facts, stickers, the daily target and the streak ---------- */
{
  const m = C.blank();
  eq(C.twinKnown(m, C.FACT.m3x7), null, 'no hint before 7 × 3 is known');
  C.rec(m, 'm7x3').box = 1;
  eq(C.twinKnown(m, C.FACT.m3x7).id, 'm7x3', 'hint: نفس ٧ × ٣');

  const s = C.blank();
  C.tableIds(1).forEach(id => { s.open.push(id); Object.assign(C.rec(s, id), { box: 4, due: day(5), up: day(-1), seen: 3, right: 3 }); });
  Object.assign(C.rec(s, 'm1x10'), { box: 3, due: T0 });
  const r = C.answer(s, { id: 'm1x10', step: 'review' }, true, 6000, false, T0, 1);
  ok(r.events.some(e => e.type === 'sticker' && e.table === 1), 'sticker for the 1 table when the last fact reaches box 4');
  eq(s.stickers[1], T0, 'sticker saved');

  // the daily goal: minutes with a card on screen, at most 2 a card, a bonus star once a day
  const g = C.blank(); g.settings.goalMin = 2;
  const hit = (t, secs) => C.addActive(g, t, secs).filter(e => e.type === 'target').length;
  eq([hit(T0, 50), hit(T0, 50), hit(T0, 30), hit(T0, 60)], [0, 0, 1, 0], 'goal celebrated once, when 2 minutes are reached');
  eq(g.active[T0], 190, 'seconds add up');
  eq(g.stars.total, 1, 'one bonus star for the goal');
  C.addActive(g, day(1), 500);
  eq(g.active[day(1)], C.CARD_CAP, 'at most 2 minutes count for one card');
  const answerOn = t => C.answer(g, { id: 'm1x1', step: 'practice' }, true, 1000, false, t, 1, 'practice');
  answerOn(T0);
  eq(C.streakNow(g, T0), 1, 'streak 1');
  answerOn(day(1));
  eq(C.streakNow(g, day(1)), 2, 'next day: streak 2');
  eq(C.streakNow(g, day(2)), 2, 'still shown the day after (not broken yet)');
  eq(C.streakNow(g, day(3)), 0, 'a missed day ends it');
  g.reg.push(day(2));
  eq(C.streakNow(g, day(3)), 3, 'a day registered by a parent fills the gap');
  answerOn(day(5));
  eq(C.streakNow(g, day(5)), 1, 'starts again at 1');
  eq(C.answer(g, { id: 'm1x1', step: 'practice' }, true, 1000, false, day(5), 1, 'practice').events.filter(e => e.type === 'target'), [], 'answers alone no longer trigger the goal');
}

/* ---------- registering practice from before the daily goal ring ---------- */
{
  const old = { v: 1, cards: { m1x1: { box: 2, seen: 2, right: 2 } }, open: ['m1x1'], batch: ['m1x1'],
    days: { [T0]: { n: 8, ok: 8 }, [day(1)]: { n: 4, ok: 3 } }, daily: { day: day(1), correct: 10, hit: true }, streak: { n: 2, last: day(1) },
    log: [[T0, 'm1x1', 1, 2000], [T0, 'm1x2', 1, 3000], [day(1), 'm1x1', 0, 400000]], settings: { target: 10 } };
  const m = C.clean(JSON.parse(JSON.stringify(old)));
  eq(m.reg, [T0, day(1)], 'every day she answered is registered as practised');
  eq([m.active[T0], m.active[day(1)]], [11, 120], 'minutes estimated from her answer times (+3 s a card, at most 2 minutes a card)');
  eq(C.streakNow(m, day(1)), 2, 'her streak carries over');
  eq(m.settings.goalMin, 5, 'default goal: 5 minutes');
  eq(m.daily.hit, false, 'today\'s goal is measured afresh');
  const again = C.clean(JSON.parse(JSON.stringify(m)));
  eq([again.reg, again.active], [m.reg, m.active], 'registered only once (saved and reloaded: unchanged)');
}

/* ---------- weakest facts for the parent area: missed or slow only ---------- */
{
  const m = C.blank();
  Object.assign(C.rec(m, 'm1x1'), { seen: 3, right: 3, msSum: 4000, msN: 3 });
  Object.assign(C.rec(m, 'm7x8'), { seen: 3, right: 1, wrong: 2, msSum: 9000, msN: 1 });
  Object.assign(C.rec(m, 'm6x7'), { seen: 2, right: 2, msSum: 22000, msN: 2 });
  eq(C.weakest(m).map(x => x.f.id), ['m7x8', 'm6x7'], 'weakest: missed first, then slow; quick right answers left out');
}

/* ---------- a simulated learner: 120 days, one or two sessions a day ---------- */
function simulate(seed, skill, sessionsPerDay) {
  const rand = rng(seed);
  let m = C.blank();
  const releasedOn = {}, problems = [];
  let maxDistinct = 0, maxViews = 0, minSession = 99;
  for (let d = 0; d < 120; d++) {
    const t = day(d);
    if (rand() < 0.12) continue;                         // some days she does not play
    for (let s = 0; s < sessionsPerDay; s++) {
      const before = m.open.length, readyBefore = C.batchReady(m);
      const introBefore = C.introducedOn(m, t);
      const items = C.buildSession(m, t, rand);
      const released = m.open.slice(before);
      if (released.length) {
        if (!readyBefore) problems.push(`${t}: new set before the last one was ready`);
        if (introBefore > 0 && introBefore + released.length > m.settings.newPerDay) problems.push(`${t}: over the daily limit`);
        released.forEach(id => { releasedOn[id] = t; });
        const expect = C.FACTS.slice(before, before + released.length).map(f => f.id);
        if (JSON.stringify(expect) !== JSON.stringify(released)) problems.push(`${t}: out of order ${released}`);
      }
      if (!items.length) continue;
      maxDistinct = Math.max(maxDistinct, new Set(items.map(x => x.id)).size);
      minSession = Math.min(minSession, items.length);
      const q = items.slice(), views = {};
      while (q.length) {
        const it = q.shift();
        views[it.id] = (views[it.id] || 0) + 1;
        maxViews = Math.max(maxViews, views[it.id]);
        const f = C.FACT[it.id], c = C.peek(m, it.id);
        // knowing a fact gets easier with the box; harder tables are harder; the dots make it easy
        const hard = [7, 8, 6].includes(f.table) ? 0.25 : [3, 4, 9].includes(f.table) ? 0.12 : 0;
        const pRight = it.step === 'show' ? 0.95 : Math.min(0.97, skill + 0.08 * (c.box || 0) - hard + (it.step === 'learn' ? 0.1 : 0));
        const right = rand() < pRight;
        const ms = right ? 1500 + rand() * (2500 + hard * 20000) : 5000;
        const r = C.answer(m, it, right, ms, it.step === 'show', t, views[it.id]);
        if (r.again) C.requeue(q, { id: it.id, step: r.again });
      }
      m = C.clean(JSON.parse(JSON.stringify(m)));       // saved and reloaded between sessions
    }
  }
  const stickers = Object.keys(m.stickers).length;
  const lastOpen = Object.values(releasedOn).sort().pop();
  return { problems, open: m.open.length, stickers, maxDistinct, maxViews, minSession, lastOpen, firstSticker: Object.values(m.stickers).sort()[0] };
}
for (const [seed, skill, spd] of [[1, 0.75, 1], [2, 0.6, 2], [3, 0.85, 2], [4, 0.5, 1]]) {
  const r = simulate(seed, skill, spd);
  eq(r.problems, [], `simulation ${seed}: no pacing problems`);
  ok(r.maxDistinct <= 10, `simulation ${seed}: at most 10 facts a session (got ${r.maxDistinct})`);
  ok(r.maxViews <= C.MAX_VIEWS, `simulation ${seed}: at most 3 looks at a card`);
  console.log(`  learner ${seed} (skill ${skill}, ${spd}/day): ${r.open}/100 open, all open by ${r.lastOpen || '-'}, ${r.stickers}/10 stickers (first ${r.firstSticker || '-'}), sessions ${r.minSession}-${r.maxDistinct} facts`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
