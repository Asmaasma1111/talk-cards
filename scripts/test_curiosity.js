// علبة الفضول: tests for the rules in curiosity.js (no browser).   node scripts/test_curiosity.js
const assert = require('assert');
const path = require('path');
const { core: C } = require(path.join(__dirname, '..', 'curiosity.js'));
const D = require(path.join(__dirname, '..', 'curiosity.json'));
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok', name); };

// play a run of days: every day she opens the box and finishes
function run(r, from, days, skip = []) {
  const out = [];
  for (let i = 0; i < days; i++) {
    const t = C.addDays(from, i);
    if (skip.includes(t)) continue;
    const d = C.openDay(r, D, t); d.done = true; out.push(d.m);
  }
  return out;
}

ok('the rotation follows her table, week 1 first (a Sunday start)', () => {
  const r = C.blank();
  // 1 Nov 2026 is a Sunday
  assert.strictEqual(C.weekday('2026-11-01'), 0);
  const got = run(r, '2026-11-01', 30);
  assert.deepStrictEqual(got.slice(0, 7), ['A1', 'C1', 'D1', 'B1', 'F1', 'G1', 'E4']);   // her drawings (A5, D8) were taken out, 26 Oct
  assert.deepStrictEqual(got.slice(7, 14), ['A2', 'C2', 'E1', 'B2', 'F2', 'G2', 'H1']);
  assert.deepStrictEqual(got.slice(14, 21), ['A3', 'C3', 'D2', 'B3', 'F3', 'G3', 'E2']);
  assert.deepStrictEqual(got.slice(21, 28), ['A4', 'C4', 'E3', 'B4', 'F4', 'G4', 'H2']);
  assert.deepStrictEqual(got.slice(28, 30), ['A6', 'C5']);
});

ok('starting on a Wednesday still meets week 1 first', () => {
  const r = C.blank();
  assert.deepStrictEqual(run(r, '2026-10-21', 7), ['B1', 'F1', 'G1', 'E4', 'A1', 'C1', 'D1']);
});

ok('a missed day loses nothing: that mystery waits for its weekday', () => {
  const r = C.blank();
  const got = run(r, '2026-11-01', 14, ['2026-11-05']);       // she missed the first Thursday
  assert.ok(!got.slice(0, 6).includes('F1'));
  assert.strictEqual(r.days['2026-11-12'].m, 'F1');           // the next Thursday
});

ok('"week 3+" mysteries wait for week 3', () => {
  const T = { ...D, _by: null, week1: [], rotation: [['A'], ['A'], ['A'], ['A'], ['A'], ['A'], ['A']],
              mysteries: [1, 2, 3].map(k => ({ id: 'A' + k, theme: 'A', n: k, ready: true, weekMin: k === 1 ? 3 : 1 })) };
  const r = C.blank();
  const got = [];
  for (let i = 0; i < 15; i++) { const d = C.openDay(r, T, C.addDays('2026-11-01', i)); d.done = true; got.push(d.m); }
  assert.deepStrictEqual(got.slice(0, 3), ['A2', 'A3', 'A2']);   // A1 is "week 3+": the oldest met comes back meanwhile
  assert.strictEqual(got[14], 'A1');                             // day 15 is in week 3
});

ok('the science lesson goes first, then the rotation carries on', () => {
  const r = C.blank();
  run(r, '2026-11-01', 3);
  assert.strictEqual(C.scienceAdd(r, D, 3, '2026-11-04'), 'I7');
  assert.strictEqual(C.todayPick(r, D, '2026-11-04'), 'I7');
  const d = C.openDay(r, D, '2026-11-04'); d.done = true;
  assert.strictEqual(r.queue.length, 0);
  assert.strictEqual(C.openDay(r, D, '2026-11-08').m, 'A2');     // Sunday: the rotation again (A1 was met)
  // chapter 3 again: the next one of that chapter
  assert.strictEqual(C.scienceAdd(r, D, 3, '2026-11-09'), 'I8');
});

ok('a chapter with no mysteries left says so', () => {
  const r = C.blank();
  D.mysteries.filter(m => m.theme === 'I' && m.chapter === 1).forEach(m => { r.used[m.id] = '2026-11-01'; });
  assert.strictEqual(C.scienceAdd(r, D, 1, '2026-11-02'), null);   // chapter 1 has no tagged mysteries
});

ok("Mama's own mystery and her pick come next", () => {
  const r = C.blank();
  r.own.push({ id: 'own-1', line: 'سطر', hints: [] });
  r.queue.unshift({ m: 'own-1', why: 'own' });
  assert.strictEqual(C.openDay(r, D, '2026-11-01').m, 'own-1');
  r.queue.unshift({ m: 'G3', why: 'pick' });
  assert.strictEqual(C.openDay(r, D, '2026-11-02').m, 'G3');
  assert.strictEqual(C.openDay(r, D, '2026-11-02').m, 'G3');     // once opened, the day keeps its mystery
});

ok('the streak counts finished days; a missed day takes nothing from the tree', () => {
  const r = C.blank();
  run(r, '2026-11-01', 3);
  assert.strictEqual(C.streakOf(r, '2026-11-03'), 3);
  assert.strictEqual(C.streakOf(r, '2026-11-04'), 3);              // today not done yet: yesterday's streak stands
  r.qs.push({ id: 'q1', day: '2026-11-01', status: 'found' }, { id: 'q2', day: '2026-11-01', flipOf: 'q1', status: 'wondering' });
  assert.strictEqual(C.streakOf(r, '2026-11-06'), 0);
  assert.deepStrictEqual(C.treeCounts(r), { leaves: 2, flowers: 1, fruits: 1, wonder: 1 });
});

ok('clean() keeps her data and mends a broken file', () => {
  const r = C.clean({ qs: [{ id: 'q1' }], days: { '2026-11-01': { m: 'A5', done: true } }, settings: { storm: 999 } });
  assert.strictEqual(r.qs.length, 1); assert.strictEqual(r.settings.storm, 180); assert.ok(Array.isArray(r.queue));
  assert.ok(C.valid(r)); assert.ok(!C.valid({}));
});

ok('her drawings are gone from the bank', () => { assert.ok(!D.mysteries.some(m => m.id === 'A5' || m.id === 'D8')); });

ok('every ready mystery has her Arabic line, three hints and a parent card; F has a prediction', () => {
  D.mysteries.filter(m => m.ready).forEach(m => {
    assert.ok(m.line && m.line.trim(), m.id);
    assert.strictEqual(m.hints.length, 3, m.id);
    m.hints.forEach(h => assert.ok(h.w && h.k.length === 2, m.id));
    assert.ok(m.card && m.card.length, m.id);
    if (m.theme === 'F') assert.ok(m.predict, m.id);
    if (m.theme === 'G') assert.ok(m.verse && m.verse.text, m.id);
    if (m.kind === 'photo') assert.ok(m.photo, m.id);
  });
});

console.log(n, 'tests passed');
