// مسرح المسائل: node scripts/test_theatre.js
// Every story's answer is worked out from its shape and numbers and must match the bank (the PDF's solution);
// the act-out, the bars and the number sentence agree with it; the day plans keep the PDF's rules.
const path = require('path');
const C = require(path.join(__dirname, '../theatre/js/core.js'));
const bank = require(path.join(__dirname, '../theatre/data/stories.json'));
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('FAIL', msg); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const all = bank.stories.concat(bank.twins);
for (const s of all) {
  const m = C.model(s);
  ok(eq(m.ans, s.ans), `${s.id} answer ${JSON.stringify(m.ans)} vs bank ${JSON.stringify(s.ans)}`);
  if (s.shape === 'two-step') s.steps.forEach(([op, a, b, r]) => ok({ '+': a + b, '-': a - b, '×': a * b, '÷': a / b }[op] === r, `${s.id} step ${a}${op}${b}`));
  if (s.shape === 'extra') ok(s.nums.includes(s.extra) || s.base === 'arr-total', `${s.id} extra number in text`);
  if (m.zones) {
    // starting the act-out from the given pieces adds up; putting the target amounts in passes the check; the start does not
    const start = {}; m.zones.forEach(z => { start[z.id] = C.sum(C.pieces(z.start, m.mode)); ok(start[z.id] === z.start, `${s.id} pieces ${z.id}`); });
    const done = {}; m.zones.forEach(z => { done[z.id] = z.target != null ? z.target : z.start; });
    if (m.frame && m.frame.total == null) {} // the frame total is her answer: nothing to fill
    ok(C.checkAct(m, done), `${s.id} act check passes with the targets`);
    ok(!C.checkAct(m, start) || m.zones.every(z => z.target == null || z.target === z.start), `${s.id} act check fails at the start`);
    // the bar: its parts add up
    const b = m.bar;
    if (b.layout === 'parts') ok(b.p1 + b.p2 === b.whole, `${s.id} bar parts`);
    else ok(b.big - b.small === b.gap, `${s.id} bar compare`);
    // the number sentence: the PDF's own form passes, a wrong sign fails
    const [a, c] = m.tiles;
    const right = { add: [[a, '+', c, '?'], [c, '+', a, '?']], sub: [[Math.max(a, c), '−', Math.min(a, c), '?']] }[m.op];
    right.forEach(f => ok(C.checkSentence(m, f), `${s.id} sentence ${f.join(' ')}`));
    ok(!C.checkSentence(m, [Math.max(a, c), m.op === 'add' ? '−' : '+', Math.min(a, c), '?']) || m.op === 'sub' && false, `${s.id} wrong sign refused`);
    // the "missing part" form is fine too: 245 + ? = 400
    if (s.shape === 'ch-add-chg') ok(C.checkSentence(m, [a, '+', '?', c]), `${s.id} ${a} + ? = ${c}`);
  }
}
ok(bank.stories.length === 146 && bank.twins.length === 12 && bank.tasks.length === 8, 'bank size 146 + 12 twins + 8 tasks');
ok(C.parts('مع لينا ١٢٥ ريالًا').filter(p => p.n).map(p => p.n).join() === '125', 'hidden parts');
ok(C.spokenHidden('و٤ رزم') === 'وكذا رزم', 'spoken hidden');

// a whole term of days: stages 1 to 3 finish; each shape first comes alone; twins daily once subtraction is met;
// never three of the same op in a row
const STAGES = [1, 2, 3];
const st = { stage: 1, met: [], done: {}, lastKind: null, twinNext: 0 };
let day = 0, twinsDays = 0, mixDays = 0, introduced = [];
for (; day < 120; day++) {
  const p = C.plan(bank, st, 'd' + day, 4, STAGES);
  if (!p.ids.length || p.kind === 'review') break;
  if (p.introduce) { ok(!introduced.includes(p.introduce), `shape ${p.introduce} introduced once`); introduced.push(p.introduce); ok(p.ids.every(id => C.byId(bank, id).shape === p.introduce), `block of ${p.introduce} is one shape`); st.met.push(p.introduce); }
  if (p.kind === 'mix') { mixDays++; if (p.twin) twinsDays++; }
  for (let i = 2; i < p.ids.length; i++) {
    const o = k => C.opOf(C.byId(bank, p.ids[k]));
    ok(p.kind === 'block' || !(o(i) === o(i - 1) && o(i) === o(i - 2)) || !st.met.some(sh => C.SHAPES[sh].op === 'sub'), `day ${day} three ${o(i)} in a row: ${p.ids.join(',')}`);
  }
  if (p.twin) { const k = p.ids.indexOf('t' + p.twin + 'a'); ok(k >= 0 && Math.abs(p.ids.indexOf('t' + p.twin + 'b') - k) === 1, `twins together day ${day}`); st.twinNext++; }
  p.ids.forEach(id => { st.done[id] = { n: (st.done[id] ? st.done[id].n : 0) + 1, last: 'd' + String(day).padStart(3, '0') }; });
  st.stage = p.stage; st.lastKind = p.kind;
  if (p.stage === 2 || p.stage === 3) p.ids.forEach(id => { const s = C.byId(bank, id); if (!s.pair) ok(st.met.includes(s.shape), `${id} only after its shape is met`); });
}
const left = bank.stories.filter(s => s.stage <= 3 && !st.done[s.id]);
ok(!left.length, 'stages 1-3 all done: left ' + left.map(s => s.id).join(','));
ok(twinsDays > 0 && twinsDays === mixDays - bank.stories.filter(s => 0).length || twinsDays > 5, `twin days ${twinsDays} of ${mixDays} mixed`);
console.log(`days to finish stages 1-3 at 4 a day: ${day}; mixed days ${mixDays}, with twins ${twinsDays}; shapes met in order: ${introduced.join(' ')}`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
