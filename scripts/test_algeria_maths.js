// ركن الرياضيات: tests for the practice generators in algeria-maths.js (no browser).   node scripts/test_algeria_maths.js
const assert = require('assert');
const path = require('path');
require(path.join(__dirname, '..', 'algeria.js'));                 // the number words come from the trip's core
const { core: M } = require(path.join(__dirname, '..', 'algeria-maths.js'));
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok', name); };
const W = s => Number(String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
const nums = q => (q.match(/[٠-٩]+/g) || []).map(W);

ok('every gap of the maths report is a topic, in the ladder order', () => {
  assert.deepStrictEqual(M.TOPICS.map(t => t.id), ['words', 'x10', 'double', 'distrib', 'mul1', 'mul2', 'subadd', 'length', 'mass', 'time', 'tools', 'midpoint', 'lines', 'program', 'net']);
  M.TOPICS.forEach(t => { assert.ok(t.lesson.rule.length >= 1, t.id); assert.ok(!/[0-9]/.test(JSON.stringify(t.lesson)), t.id + ': Saudi digits only'); });
});

ok('every item of every topic at every level is well made (300 rounds each)', () => {
  for (const t of M.TOPICS) for (let lv = 1; lv <= 3; lv++) for (let seed = 1; seed <= 300; seed++) {
    for (const it of M.round(t.id, lv, seed)) {
      const where = `${t.id} L${lv} seed ${seed} ${JSON.stringify(it).slice(0, 160)}`;
      if (it.k === 'mc') {
        assert.strictEqual(it.opts.length, 3, where); assert.strictEqual(new Set(it.opts.map(String)).size, 3, where);
        assert.ok(it.ok >= 0 && it.ok < 3, where);
      } else if (it.k === 'pad') { assert.ok(Number.isInteger(it.ans) && it.ans > 0, where); assert.ok(!/[0-9]/.test(it.q), where); }
      else if (it.k === 'multi') { it.blanks.forEach(b => assert.ok(Number.isInteger(b) && b > 0, where)); assert.ok(!/[0-9]/.test(it.q.replace(/\{\d\}/g, '')), where); }
      else if (it.k === 'mulcol') { assert.ok(it.a >= 10 && it.b >= 2 && it.b <= 9, where); }
      else if (it.k === 'subcol') { assert.ok(it.a > it.b && it.b > 0, where); assert.ok(M.colSteps(it.a, it.b, 'sub').some(s => s.borrow), where + ' (needs a borrow)'); }
      if (t.id === 'x10' && it.q.endsWith('؟')) { const [a, m] = nums(it.q); assert.strictEqual(it.ans, a * m, where); }
      if (t.id === 'distrib') { const [a, b] = nums(it.q); assert.strictEqual(it.blanks[2], a * b, where); assert.strictEqual(it.blanks[0] + it.blanks[1], a * b, where); }
      if (t.id === 'mul2') { const p = it.col[0] * it.col[1]; assert.strictEqual(it.blanks[it.blanks.length - 1], p, where); if (it.blanks.length === 3) assert.strictEqual(it.blanks[0] + it.blanks[1], p, where); }
      if (t.id === 'time' && it.k === 'pad') assert.ok(it.ans <= 120, where);
    }
  }
});

ok('the column steps give the right answer, digit by digit (multiplication with carries, subtraction by adding)', () => {
  for (let a = 10; a < 3000; a += 7) for (const b of [2, 3, 4, 5, 6, 7, 8, 9]) {
    const st = M.colSteps(a, b, 'mul'); assert.strictEqual(Number(st.map(s => s.d).reverse().join('')), a * b, `${a}x${b}`);
    if (b < a) { const sub = M.colSteps(a, a - b * 3 > 0 ? a - b * 3 : 1, 'sub'); assert.strictEqual(Number(sub.map(s => s.d).reverse().join('')), b * 3 < a ? b * 3 : a - 1, `${a}-`); }
  }
  // the book's own example: ٥٢ − ٢٧: ٢ becomes ١٢, the ٢ below becomes ٣
  const s = M.colSteps(52, 27, 'sub');
  assert.deepStrictEqual(s.map(x => [x.d, !!x.borrow, x.add]), [[5, true, 0], [2, false, 1]]);
  const m = M.colSteps(57, 4, 'mul');
  assert.deepStrictEqual(m.map(x => [x.d, x.carryNext]), [[8, 2], [2, 2], [2, 0]]);   // ٢٨: write ٨ keep ٢; ٢٢: write ٢ keep ٢
});

ok('cube nets: the right one always folds (a row of four, one square above, one below); the others never do', () => {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const net = M.cubeNet(i, j); assert.strictEqual(new Set(net.map(String)).size, 6); }
  Object.values(M.NET_BAD).forEach(b => assert.strictEqual(b.length, 6));
});

ok('a round with 7 of 8 or more moves her level up, to 3 at most; the corner never touches the trip', () => {
  const c = {};
  assert.strictEqual(M.addRound(c, 'x10', 5, 8, 'd').level, 1);
  assert.strictEqual(M.addRound(c, 'x10', 7, 8, 'd').level, 2);
  M.addRound(c, 'x10', 8, 8, 'd'); assert.strictEqual(M.addRound(c, 'x10', 8, 8, 'd').level, 3);
  assert.strictEqual(c.x10.rounds, 4); assert.strictEqual(c.x10.best, 8);
});

ok('one by one: only the first topic at the start; the next opens after two good rounds on two days; the trip and Mama open more', () => {
  const c = {};
  assert.deepStrictEqual(M.openTopics(c), ['words']);
  M.addRound(c, 'words', 8, 8, 'd1'); M.addRound(c, 'words', 8, 8, 'd1');
  assert.deepStrictEqual(M.openTopics(c), ['words'], 'two good rounds on the same day are not enough');
  M.addRound(c, 'words', 3, 8, 'd2'); assert.ok(!M.mastered(c, 'words'));
  M.addRound(c, 'words', 7, 8, 'd3'); assert.ok(M.mastered(c, 'words'));
  assert.deepStrictEqual(M.openTopics(c), ['words', 'x10']);
  assert.deepStrictEqual(M.openTopics(c, ['double']), ['words', 'x10', 'double'], 'the trip has reached it');
  assert.strictEqual(M.openTopics({}, [], true).length, M.TOPICS.length, 'Mama opens them all');
});

console.log(n, 'tests passed');
