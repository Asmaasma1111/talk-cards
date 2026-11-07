/* مسرح المسائل: the rules, with no screen. Runs in the browser (window.TH.core) and in node (scripts/test_theatre.js).
   - model(story): what each scene needs: the kind she picks in scene 1, the act-out boxes, the bar picture, the answer
   - hidden(text): the story with its numbers covered (scene 1); spoken with «كذا» in their place
   - checkSentence(): her number sentence is right when it is true with ? = the answer and uses the story's numbers
   - plan(): which stories come today (each shape alone first, then mixed; never 3 of the same kind in a row; a twin pair a day) */
(function (root) {
'use strict';

const AR = '٠١٢٣٤٥٦٧٨٩';
const ar = n => String(n).replace(/\d/g, d => AR[d]);
const NUM_RE = /[٠-٩]+/g;
const parse = s => parseInt(String(s).replace(/[٠-٩]/g, c => AR.indexOf(c)), 10);

/* ---------- the story text ---------- */
// scene 1: the numbers are covered; parts = [{t:'text'}|{n:number}] so the page can draw a cloud for each number
function parts(text) {
  const out = []; let last = 0;
  text.replace(NUM_RE, (m, i) => { if (i > last) out.push({ t: text.slice(last, i) }); out.push({ n: parse(m) }); last = i + m.length; return m; });
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}
const spokenHidden = text => text.replace(NUM_RE, 'كذا');

/* ---------- the shapes ---------- */
// op: what solves it (for "never three of the same kind in a row"); kind: what she picks in scene 1
const SHAPES = {
  'pv-make': { op: 'pv' }, 'pv-compare': { op: 'pv' }, 'pv-order': { op: 'pv' }, 'pv-round': { op: 'pv' },
  'pv-max': { op: 'pv' }, 'pv-min': { op: 'pv' }, 'pv-notes': { op: 'pv' },
  'ch-add-end': { op: 'add', kind: 'more' }, 'ch-add-chg': { op: 'sub', kind: 'more' }, 'ch-add-start': { op: 'sub', kind: 'more' },
  'ch-sub-end': { op: 'sub', kind: 'less' }, 'ch-sub-chg': { op: 'sub', kind: 'less' }, 'ch-sub-start': { op: 'add', kind: 'less' },
  'pw-total': { op: 'add', kind: 'parts' }, 'pw-part': { op: 'sub', kind: 'parts' },
  'cmp-diff': { op: 'sub', kind: 'compare' }, 'cmp-big': { op: 'add', kind: 'compare' }, 'cmp-small': { op: 'sub', kind: 'compare' },
  'eq-total': { op: 'mul', kind: 'groups' }, 'arr-total': { op: 'mul', kind: 'rows' }, 'double': { op: 'mul', kind: 'compare' },
  'div-share': { op: 'div', kind: 'share' }, 'div-group': { op: 'div', kind: 'groups' }, 'arr-side': { op: 'div', kind: 'rows' },
  'times-up': { op: 'mul', kind: 'compare' }, 'times-down': { op: 'div', kind: 'compare' }, 'times-how': { op: 'div', kind: 'compare' },
  'extra': { op: null }, 'two-step': { op: 'two' }
};
// the scene-1 choices: short words, each with its own picture
const KINDS = {
  more: 'شيء زاد', less: 'شيء نقص', parts: 'جزءان وكلّ', compare: 'نقارن بين اثنين',
  groups: 'مجموعات متساوية', rows: 'صفوف متساوية', share: 'نوزّع بالتساوي'
};
const shapeOf = s => s.shape === 'extra' ? s.base : s.shape;
const opOf = s => s.shape === 'two-step' ? 'two' : (SHAPES[shapeOf(s)] || {}).op;
const kindOf = s => (SHAPES[shapeOf(s)] || {}).kind || null;

/* the numbers the story works with (an extra number she should cross out is left aside) */
function known(s) {
  const n = s.nums.slice();
  if (s.shape === 'extra' && s.extra != null) { const i = n.indexOf(s.extra); if (i >= 0) n.splice(i, 1); }
  return n;
}

/* ---------- model: everything the scenes need ---------- */
function model(s) {
  const sh = shapeOf(s), n = known(s), m = { id: s.id, shape: sh, op: opOf(s), kind: kindOf(s), ans: null, tiles: n.slice() };
  const A = n[0], Bn = n[1], who = s.box || '';
  const zone = (id, label, start, target, extra) => Object.assign({ id, label, start, target, thing: s.thing }, extra || {});
  const supply = { id: 'more', label: 'المزيد', supply: true };
  const out = zone('out', 'خارج', 0, null, { out: true });
  switch (sh) {
    case 'ch-add-end':
      m.ans = A + Bn; m.bar = { layout: 'parts', p1: A, p2: Bn, whole: m.ans, unknown: 'whole' };
      m.zones = [zone('box', who, A, m.ans), out]; m.supply = supply; m.answerFrom = { zone: 'box' }; break;
    case 'ch-add-chg':
      m.ans = Bn - A; m.bar = { layout: 'parts', p1: A, p2: m.ans, whole: Bn, unknown: 'p2' };
      m.zones = [zone('box', who, A, Bn), out]; m.supply = supply; m.answerFrom = { added: 'box' }; break;
    case 'ch-add-start':   // "bought some, then 4 more, now 13": the change comes first in the text, then the end
      m.ans = Bn - A; m.bar = { layout: 'parts', p1: m.ans, p2: A, whole: Bn, unknown: 'p1' };
      m.zones = [zone('first', 'في البداية', 0, m.ans), zone('chg', 'زاد', 0, A)]; m.frame = { label: who, total: Bn };
      m.supply = supply; m.answerFrom = { zone: 'first' }; break;
    case 'ch-sub-end':
      m.ans = A - Bn; m.bar = { layout: 'parts', p1: m.ans, p2: Bn, whole: A, unknown: 'p1', gone: true };
      m.zones = [zone('box', who, A, m.ans), out]; m.supply = supply; m.answerFrom = { zone: 'box' }; break;
    case 'ch-sub-chg':
      m.ans = A - Bn; m.bar = { layout: 'parts', p1: Bn, p2: m.ans, whole: A, unknown: 'p2', gone: true };
      m.zones = [zone('box', who, A, Bn), out]; m.supply = supply; m.answerFrom = { zone: 'out' }; break;
    case 'ch-sub-start':   // "gave away 45, 80 left": the change first, then what stayed
      m.ans = A + Bn; m.bar = { layout: 'parts', p1: Bn, p2: A, whole: m.ans, unknown: 'whole', gone: true };
      m.zones = [zone('stay', 'بقي', 0, Bn), zone('gone', 'نقص', 0, A)]; m.frame = { label: who, total: null, was: true };
      m.supply = supply; m.answerFrom = { frame: true }; break;
    case 'pw-total': {
      m.ans = A + Bn; m.bar = { layout: 'parts', p1: A, p2: Bn, whole: m.ans, unknown: 'whole' };
      const [p1, p2] = s.parts;
      m.zones = [zone('a', p1[0], A, 0, { thing: p1[1] }), zone('b', p2[0], Bn, 0, { thing: p2[1] }), zone('whole', s.whole, 0, m.ans, { big: true })];
      m.answerFrom = { zone: 'whole' }; break;
    }
    case 'pw-part': {
      m.ans = A - Bn; m.bar = { layout: 'parts', p1: Bn, p2: m.ans, whole: A, unknown: 'p2' };
      const [p1, p2] = s.parts;
      m.zones = [zone('whole', s.whole, A, m.ans, { big: true, thing: p2[1], label2: p2[0] }), zone('a', p1[0], 0, Bn, { thing: p1[1] })];
      m.answerFrom = { zone: 'whole' }; break;
    }
    case 'cmp-diff': {
      const big = Math.max(A, Bn), small = Math.min(A, Bn);
      m.ans = big - small; m.bar = { layout: 'compare', big, small, gap: m.ans, unknown: 'gap' };
      m.zones = [zone('a', s.rows[0], big, m.ans, { row: true }), zone('b', s.rows[1], small, 0, { row: true, pairWith: 'a' })];
      m.pairs = true; m.answerFrom = { zone: 'a' }; break;
    }
    case 'cmp-big':        // "Noura has 9, Hind has 6 more": the small one first, then the gap
      m.ans = A + Bn; m.bar = { layout: 'compare', big: m.ans, small: A, gap: Bn, unknown: 'big' };
      m.zones = [zone('a', s.rows[0], 0, m.ans, { row: true }), zone('b', s.rows[1], A, null, { row: true, fixed: true })];
      m.supply = supply; m.answerFrom = { zone: 'a' }; break;
    case 'cmp-small':      // "Hind has 15, that is 6 more than Noura": the big one first, then the gap
      m.ans = A - Bn; m.bar = { layout: 'compare', big: A, small: m.ans, gap: Bn, unknown: 'small' };
      m.zones = [zone('a', s.rows[0], A, null, { row: true, fixed: true }), zone('b', s.rows[1], 0, m.ans, { row: true })];
      m.supply = supply; m.answerFrom = { zone: 'b' }; break;
    // stages 4 to 6: multiplication and division (their act-out screens come with their pictures)
    case 'eq-total': case 'arr-total': {
      const f = s.size ? [n[0], s.size] : s.rowsN ? [s.rowsN, n[0]] : n.slice(0, 2); if (s.size || s.rowsN) m.tiles = f.slice();
      m.ans = f[0] * f[1]; break;
    }
    case 'double': m.ans = 2 * A; m.tiles = [A, 2]; break;
    case 'div-share': case 'div-group': case 'arr-side': {
      const d = s.size || s.groups; if (d) m.tiles = [n[0], d];
      m.ans = d ? n[0] / d : A / Bn; break;
    }
    case 'times-up': m.ans = A * Bn; break;
    case 'times-down': case 'times-how': m.ans = A / Bn; break;
    // stage 1: place value
    case 'pv-make': m.ans = Object.entries(s.pieces).reduce((t, [v, k]) => t + v * k, 0); break;
    case 'pv-compare': m.ans = A > Bn ? s.who[0] : s.who[1]; m.sign = A > Bn ? '>' : A < Bn ? '<' : '='; break;
    case 'pv-order': m.ans = n.map((v, i) => [v, s.who[i]]).sort((x, y) => y[0] - x[0]).map(x => x[1]); break;
    case 'pv-round': m.ans = Math.round(A / s.to) * s.to; m.from = A; m.to = s.to; break;
    case 'pv-max': m.ans = +n.slice().sort((x, y) => y - x).join(''); m.digits = n; break;
    case 'pv-min': { const d = n.slice().sort((x, y) => x - y); const i = d.findIndex(x => x > 0); const f = d.splice(i, 1); m.ans = +f.concat(d).join(''); m.digits = n; break; }
    case 'pv-notes': { const v = A; m.ans = [Math.floor(v / 1000), Math.floor(v / 100) % 10, Math.floor(v / 10) % 10, v % 10]; m.total = v; break; }
  }
  if (s.shape === 'two-step') m.ans = s.steps[s.steps.length - 1][3];
  if (m.zones) {
    const big = Math.max(...n, m.ans || 0);
    m.mode = big <= 20 ? 'ones' : 'blocks';
  }
  return m;
}

/* ---------- pieces: ones, or 10s/100s/1000s when there are many ---------- */
function pieces(n, mode) {
  if (mode === 'ones') return Array(n).fill(1);
  const out = [];
  [1000, 100, 10, 1].forEach(v => { for (let k = Math.floor(n / v); k > 0; k--) out.push(v); n %= v; });
  return out;
}
const sum = a => a.reduce((t, x) => t + x, 0);
// the act-out is right when every box with a target holds exactly that many (and the frame's total, when it has one)
function checkAct(m, counts) {
  for (const z of m.zones) if (z.target != null && counts[z.id] !== z.target) return false;
  if (m.frame && m.frame.total != null && m.zones.reduce((t, z) => t + counts[z.id], 0) !== m.frame.total) return false;
  return true;
}

/* ---------- the number sentence: x op y = z, written right to left ---------- */
const OPS = { '+': (a, b) => a + b, '−': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => b && a / b };
// slots: [x, op, y, z] with x, y, z each a number or '?'; right when the story's numbers and one ? are used and it is true
function checkSentence(m, slots) {
  const [x, op, y, z] = slots;
  if (!OPS[op] || [x, y, z].some(v => v == null)) return false;
  const want = m.tiles.map(String).concat('?').sort(), got = [x, y, z].map(String).sort();
  if (want.join('|') !== got.join('|')) return false;
  const v = t => (t === '?' ? m.ans : +t);
  return OPS[op](v(x), v(y)) === v(z);
}

/* ---------- the day's stories ---------- */
// order of shapes: as they first appear in the bank, stage by stage
function shapeOrder(bank) {
  const seen = []; bank.stories.forEach(s => { const k = s.stage + ':' + s.shape; if (!seen.includes(k)) seen.push(k); });
  return seen.map(k => ({ stage: +k.split(':')[0], shape: k.split(':').slice(1).join(':') }));
}
function rng(seed) { let h = 2166136261; for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
const kindOp = (bank, id) => { const s = byId(bank, id); return s ? opOf(s) : null; };
const byId = (bank, id) => bank.stories.find(s => s.id === id) || bank.twins.find(s => s.id === id) || null;
// order a list so no three in a row have the same op (add/sub); twins = [[a, b]] stay next to each other
function arrange(bank, singles, twinPair, rand) {
  const units = singles.map(id => [id]); if (twinPair) units.push(twinPair);
  for (let i = units.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [units[i], units[j]] = [units[j], units[i]]; }
  const ok = list => { for (let i = 2; i < list.length; i++) { const o = kindOp(bank, list[i]); if (o && o === kindOp(bank, list[i - 1]) && o === kindOp(bank, list[i - 2])) return false; } return true; };
  // try orders until one keeps the rule (small lists: a few hundred tries at most)
  for (let t = 0; t < 400; t++) {
    const flat = units.flat(); if (ok(flat)) return flat;
    const i = Math.floor(rand() * units.length), j = Math.floor(rand() * units.length); [units[i], units[j]] = [units[j], units[i]];
  }
  return units.flat();
}
/* st: { stage, met: [shapes], done: {id: {n, last}}, lastKind, twinNext }  →  { ids, kind, stage, introduce }
   STAGES: the stages whose screens are built (1 to 3 first; 4 to 6 come with their pictures) */
function plan(bank, st, day, perDay, STAGES) {
  perDay = Math.max(2, Math.min(6, perDay || 4));
  const isDone = id => !!(st.done[id] && st.done[id].n);
  const rand = rng(day + '|' + Object.keys(st.done).length);
  let stage = st.stage || 1;
  const stageDone = k => bank.stories.filter(s => s.stage === k).every(s => isDone(s.id));
  while (stage < Math.max(...STAGES) && stageDone(stage)) stage++;
  if (!STAGES.includes(stage)) return { ids: [], stage, kind: 'wait' };
  const allDone = STAGES.every(stageDone);
  const inStage = bank.stories.filter(s => s.stage === stage);
  if (stage === 1) {
    const ids = inStage.filter(s => !isDone(s.id)).slice(0, perDay).map(s => s.id);
    return { ids, stage, kind: 'block' };
  }
  const order = shapeOrder(bank).filter(o => o.stage === stage).map(o => o.shape);
  const met = st.met || [];
  const unmet = order.filter(sh => !met.includes(sh));
  const metHere = order.filter(sh => met.includes(sh));
  const fresh = inStage.filter(s => metHere.includes(s.shape) && !isDone(s.id));
  // a new shape: its first stories in a block, every other day (or when nothing met is left)
  if (unmet.length && (st.lastKind !== 'block' || !fresh.length)) {
    const sh = unmet[0];
    const ids = inStage.filter(s => s.shape === sh && !isDone(s.id)).slice(0, Math.min(3, perDay)).map(s => s.id);
    return { ids, stage, kind: 'block', introduce: sh };
  }
  // a mixed day: a twin pair once subtraction has been met, then new stories from every met shape, in turns
  const subMet = met.some(sh => (SHAPES[sh] || {}).kind === 'less' || (SHAPES[sh] || {}).op === 'sub');
  const pairNo = ((st.twinNext || 0) % 6) + 1;
  const twin = subMet ? bank.twins.filter(t => t.pair === pairNo).map(t => t.id) : null;
  const room = perDay - (twin ? 2 : 0) || 1;
  const byShape = metHere.map(sh => fresh.filter(s => s.shape === sh));
  for (let i = byShape.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [byShape[i], byShape[j]] = [byShape[j], byShape[i]]; }
  const pick = [];
  for (let r = 0; pick.length < room && byShape.some(l => l.length > r); r++) byShape.forEach(l => { if (l[r] && pick.length < room) pick.push(l[r].id); });
  // nothing new left in this stage but shapes still to meet: start the next shape today
  if (!pick.length && unmet.length) return plan(bank, Object.assign({}, st, { lastKind: 'mix' }), day, perDay, STAGES);
  // review: an earlier story of the other kind keeps the mix honest (stage 3 is all subtraction)
  if (subMet && pick.length < room) {
    const old = bank.stories.filter(s => s.stage >= 2 && (s.stage < stage || allDone) && isDone(s.id)).sort((a, b) => (st.done[a.id].last || '').localeCompare(st.done[b.id].last || ''));
    while (pick.length < room && old.length) pick.push(old.shift().id);
  }
  return { ids: arrange(bank, pick, twin, rand), stage, kind: allDone ? 'review' : 'mix', twin: twin ? pairNo : null };
}

const api = { AR, ar, parse, parts, spokenHidden, SHAPES, KINDS, shapeOf, opOf, kindOf, known, model, pieces, sum, checkAct, checkSentence, shapeOrder, plan, arrange, byId, rng };
if (typeof module !== 'undefined') module.exports = api;
root.TH = root.TH || {}; root.TH.core = api;
})(typeof window !== 'undefined' ? window : globalThis);
