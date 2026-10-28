// Station 8, حساباتي وزجاجاتي: four words → the calculation ladder (she builds each line from number tiles,
// types whole answers, is shown the others) → plan vs what happened → project statement → split into the زجاجات.
// Jars are always زجاجات, never جِرار.
import * as store from './store.js';
import { el, ar, art, topbar, taskCard, screen, primary, ICON, award, celebrate, toast, riyals } from './ui.js';
import { play } from './sound.js';
import { createDnD } from './dnd.js';
import { renderPage, printWith } from './copybook.js';
import { JARS, SHARES } from './station1.js';
import { planData, materialsTotal, costPerCopy, expectedProfit, coinsFor, num, round2, money, stepper } from './station4.js';
import { tellData, marketingCost } from './station6.js';
import { salesData, printedSold, digitalSold, giftCopies, discountsTotal } from './station7.js';
import { addToJars, jarsPanel, JAR_COLOR } from './jars.js';

const ACCENT = 'yellow';
const STEPS = ['words', 'ladder', 'compare', 'statement', 'split', 'jars', 'done'];

export function sumsData() {
  const p = store.get().current;
  if (!p.data.s8) p.data.s8 = { step: 'words', flipped: [], line: 0, lines: {}, stars: {}, dist: null, statement: null };
  return p.data.s8;
}

function go(step) { location.hash = 'station/8/' + step; }
function frame(step, task, pose, body, footer) {
  return screen(ACCENT,
    topbar({ title: 'حساباتي وزجاجاتي', back: () => { location.hash = 'home'; }, step: [STEPS.indexOf(step) + 1, STEPS.length] }),
    taskCard(task, pose),
    el('main', { class: 'work' }, body),
    el('footer', { class: 'actions' }, ...footer),
  );
}

export function station8Screen(app, step) {
  const d = sumsData();
  if (!STEPS.includes(step)) step = d.step;
  if (STEPS.indexOf(step) > STEPS.indexOf(d.step)) step = d.step;
  return ({ words, ladder, compare, statement, split, jars, done })[step](app, d);
}

function advance(d, next) {
  store.update(() => { if (STEPS.indexOf(next) > STEPS.indexOf(d.step)) d.step = next; });
  go(next);
}
function starOnce(d, key) {
  if (d.stars[key]) return;
  store.update(() => { d.stars[key] = true; });
  award(1);
}
const btnIcon = (name) => el('span', { html: ICON[name], style: { width: '28px', height: '28px', display: 'inline-flex' } });
const hasInk = (pg) => !!pg?.strokes?.some(s => s.tool !== 'eraser');

// ---------- 8a. Four words ----------
const WORDS = [
  { w: 'الإيرادات', m: 'كل المال الذي دخل من البيع.', icon: '💰' },
  { w: 'صافي الإيرادات', m: 'ما بقي بعد الهدايا والخصومات.', icon: '🎁' },
  { w: 'المصاريف', m: 'كل ما دفعتِه لتصنعي منتجك وتُخبري الناس عنه.', icon: '🧾' },
  { w: 'صافي الربح', m: 'ما بقي لكِ حقًّا. هذا ما يذهب إلى زجاجاتك.', icon: '✨' },
];

function words(app, d) {
  const next = primary('هيّا نحسب', () => advance(d, 'ladder'), { disabled: d.flipped.length < WORDS.length });
  const cards = WORDS.map((c, i) => {
    const b = el('button', { class: 'flip', 'aria-pressed': 'false', 'aria-label': c.w },
      el('span', { class: 'face front' }, el('span', { class: 'big' }, c.icon), el('b', {}, c.w)),
      el('span', { class: 'face back' }, el('b', {}, c.w), el('span', {}, c.m)));
    b.onclick = () => {
      play('tap');
      b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
      if (!d.flipped.includes(i)) {
        store.update(() => { d.flipped.push(i); });
        if (d.flipped.length === WORDS.length) { next.disabled = false; starOnce(d, 'words'); }
      }
    };
    return b;
  });
  app.replaceChildren(frame('words', 'أربع كلمات يستعملها كل التجّار. اقلبي البطاقات واقرئيها.', 'think',
    el('div', { class: 'flips four' }, cards), [next]));
}

// ---------- 8b. The calculation ladder ----------
// Every number comes from her own data. A line is typed only when its answer is a whole number ≥ 0.
export function ladderLines() {
  const P = planData(), S = salesData(), T = tellData();
  const price = S.sales.find(s => s.kind === 'print')?.price ?? P.price ?? 0;
  const dprice = S.sales.find(s => s.kind === 'digital')?.price ?? P.digital ?? 0;
  const base = {
    sold: { v: printedSold(S), label: 'نسخ ورقية مبيعة' },
    price: { v: price, label: 'سعر النسخة' },
    dsold: { v: digitalSold(S), label: 'نسخ رقمية مبيعة' },
    dprice: { v: dprice, label: 'السعر الرقمي' },
    gifts: { v: giftCopies(S), label: 'نسخ مهداة' },
    disc: { v: discountsTotal(S), label: 'مجموع الخصومات' },
    mat: { v: materialsTotal(P), label: 'المواد والطباعة' },
    mk: { v: marketingCost(T), label: 'تكلفة إخبار الناس' },
    cpc: { v: costPerCopy(P), label: 'تكلفة النسخة' },
    zero: { v: 0, label: 'تكلفة النسخة الرقمية' },
  };
  const v = (k) => base[k].v;
  const lines = [
    { name: 'إيرادات النسخ الورقية', slots: ['sold', 'price'], ops: ['×'], calc: () => v('sold') * v('price') },
    { name: 'إيرادات النسخ الرقمية', slots: ['dsold', 'dprice'], ops: ['×'], calc: () => v('dsold') * v('dprice') },
    { name: 'الإيرادات', slots: ['r1', 'r2'], ops: ['+'], calc: () => v('r1') + v('r2') },
    { name: 'الهدايا والخصومات', slots: ['gifts', 'price', 'disc'], ops: ['×', '+'], calc: () => v('gifts') * v('price') + v('disc') },
    { name: 'صافي الإيرادات', slots: ['r3', 'r4'], ops: ['−'], calc: () => v('r3') - v('r4') },
    { name: 'المصاريف', slots: ['mat', 'mk'], ops: ['+'], calc: () => v('mat') + v('mk') },
    { name: 'صافي الربح', slots: ['r5', 'r6'], ops: ['−'], calc: () => v('r5') - v('r6') },
    { name: 'ربح النسخة الورقية الواحدة', slots: ['price', 'cpc'], ops: ['−'], calc: () => v('price') - v('cpc') },
    { name: 'ربح النسخة الرقمية الواحدة', slots: ['dprice', 'zero'], ops: ['−'], calc: () => v('dprice') - v('zero') },
  ];
  lines.forEach((l, i) => {
    l.n = i + 1;
    l.v = round2(l.calc());
    l.typed = Number.isInteger(l.v) && l.v >= 0;
    base['r' + l.n] = { v: l.v, label: `${ar(l.n)}. ${l.name}` };
  });
  return { lines, base };
}
export const netProfit = () => ladderLines().lines[6].v;

// A gentle hint that shows the working, never a cross.
function hintFor(l, base) {
  const [a, b, c] = l.slots.map(k => base[k].v);
  if (l.n === 4) return `أولًا ${ar(a)} × ${num(b)}، ثم أضيفي ${num(c)}.`;
  if (l.ops[0] === '×') {
    if (a === 0) return `صفر نسخ × أي سعر = ٠.`;
    if (a <= 10) return `${Array.from({ length: a }, () => num(b)).join(' + ')} = ؟`;
    return `${ar(a)} مجموعة، في كل مجموعة ${num(b)}.`;
  }
  if (l.ops[0] === '+') return `اجمعي ${num(a)} و${num(b)}.`;
  return `ابدئي من ${num(a)} وانقصي ${num(b)}.`;
}

async function ladder(app, d) {
  const { lines, base } = ladderLines();
  const list = el('div', { class: 'ladder-lines' });
  const fall = el('div', { class: 'falls', 'aria-label': 'شلّال العملات' });
  const undoBtn = el('button', { class: 'btn side', disabled: true, onclick: () => dnd?.undo() }, btnIcon('undo'), 'تراجع');
  const next = primary('التالي', () => advance(d, 'compare'), { disabled: d.line < lines.length });
  let dnd = null;

  const eqText = (l) => {
    const parts = [];
    l.slots.forEach((k, i) => { parts.push(num(base[k].v)); if (l.ops[i]) parts.push(l.ops[i]); });
    return parts.join(' ') + ' = ' + num(l.v);
  };

  function waterfall() {
    const done = (n) => d.line >= n;
    const box = (cls, label, n, v) => el('div', { class: 'fall ' + cls + (done(n) ? ' on' : '') },
      el('b', {}, label),
      done(n) ? el('div', { class: 'coins-row' }, coinsFor(Math.min(Math.abs(v), 10)).filter(Boolean)) : el('span', { class: 'q' }, '؟'),
      done(n) ? el('span', { class: 'val' }, v < 0 ? `خسارة ${num(-v)}` : num(v)) : null);
    const L = (n) => lines[n - 1].v;
    fall.replaceChildren(
      box('top', 'الإيرادات', 3, L(3)),
      box('out', '↙ هدايا وخصومات', 4, L(4)),
      box('out', '↙ مصاريف', 6, L(6)),
      box('net' + (L(7) < 0 ? ' loss' : ''), '✨ صافي الربح', 7, L(7)));
  }

  function doneRow(l) {
    const how = d.lines[l.n];
    return el('div', { class: 'line done' },
      el('span', { class: 'n' }, ar(l.n)),
      el('b', {}, l.name),
      el('span', { class: 'eq' }, eqText(l)),
      el('span', { class: 'tick', 'aria-label': how === 'typed' ? 'صحيح' : 'تمّ' }, how === 'typed' ? '✓' : '•'));
  }

  function activeRow(l) {
    const filled = l.slots.map(() => null);
    let typed = '', tries = 0;
    const hint = el('p', { class: 'hint line-hint', role: 'status', 'aria-live': 'polite' });
    const answer = el('span', { class: 'answer' }, '؟');
    const after = el('div', { class: 'after' });
    const slotEls = l.slots.map((k, i) => el('div', { class: 'slot-wrap' },
      el('div', { class: 'num-slot', 'aria-label': base[k].label }),
      el('small', {}, base[k].label)));

    const keys = [...l.slots];
    // distractors: other numbers she already has, so she must choose
    const pool = Object.keys(base).filter(k => !keys.includes(k) && !(k.startsWith('r') && Number(k.slice(1)) >= l.n) && k !== 'zero' && k !== 'cpc');
    const extra = pool.sort((a, b) => ((a.charCodeAt(0) * 7 + l.n) % 5) - ((b.charCodeAt(0) * 7 + l.n) % 5)).slice(0, 3);
    const tileKeys = [...new Set([...keys, ...extra])].sort((a, b) => ((a.length * 13 + a.charCodeAt(0) + l.n * 3) % 7) - ((b.length * 13 + b.charCodeAt(0) + l.n * 3) % 7));
    const tray = el('div', { class: 'tiles' });
    const used = new Set();

    dnd = createDnD({
      accepts: (from, to) => filled[to.i] == null,
      onDrop(from, to) {
        const want = base[l.slots[to.i]].v;
        if (base[from.key].v !== want) {
          hint.textContent = `هذه الخانة لـ«${base[l.slots[to.i]].label}».`;
          return false;
        }
        hint.textContent = '';
        filled[to.i] = from.key; used.add(from.key);
        render();
        return () => { filled[to.i] = null; used.delete(from.key); typed = ''; render(); };
      },
      onHistory: (n) => { undoBtn.disabled = n === 0; },
    });
    slotEls.forEach((s, i) => dnd.zone(s.querySelector('.num-slot'), { i }));

    function pad() {
      const show = () => { answer.textContent = typed ? ar(typed) : '؟'; };
      const key = (label, fn, cls = '') => el('button', { class: 'key ' + cls, onclick: () => { play('tap'); fn(); show(); } }, label);
      const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => key(ar(n), () => { if (typed.length < 5) typed = (typed === '0' ? '' : typed) + n; }));
      const check = el('button', { class: 'btn primary check', onclick: () => {
        play('tap');
        if (typed === '') return;
        if (Number(typed) === l.v) return finishLine('typed');
        tries++;
        hint.textContent = `قريب! جرّبي مرة أخرى. ${hintFor(l, base)}`;
        typed = ''; show();
        if (tries >= 2 && !after.querySelector('.reveal')) {
          after.append(el('button', { class: 'btn reveal', onclick: () => { play('tap'); answer.textContent = num(l.v); setTimeout(() => finishLine('revealed'), 900); } }, 'أريني الحل'));
        }
      } }, 'تحقّقي');
      return el('div', { class: 'pad-wrap' },
        el('div', { class: 'numpad', dir: 'ltr' }, digits, key('⌫', () => { typed = typed.slice(0, -1); }, 'del'), key(ar(0), () => { if (typed && typed.length < 5) typed += '0'; else if (!typed) typed = '0'; }), el('span')),
        check);
    }

    function shownResult() {
      const v = l.v;
      const val = el('b', { class: 'shown-val' });
      if (v < 0) money(val, 'النتيجة', v); else val.textContent = num(v);
      answer.textContent = v < 0 ? `−${num(-v)}` : num(v);
      return el('div', { class: 'shown' },
        el('div', { class: 'coins-row' }, coinsFor(Math.abs(v)).filter(Boolean)),
        val,
        el('p', { class: 'hint' }, v < 0 ? 'الرقم أقل من صفر: هذه خسارة. سنرى ماذا نتعلّم منها.' : 'هذا العدد فيه جزء من ريال، فأنا أحسبه لكِ.'),
        el('button', { class: 'btn primary', onclick: () => { play('tap'); finishLine('shown'); } }, 'فهمتُ'));
    }

    function render() {
      slotEls.forEach((s, i) => {
        const box = s.querySelector('.num-slot');
        box.textContent = filled[i] ? num(base[filled[i]].v) : '';
        box.classList.toggle('full', !!filled[i]);
      });
      tray.replaceChildren(...tileKeys.filter(k => !used.has(k)).map(k => {
        const t = el('div', { class: 'tile', role: 'button', 'aria-label': `${base[k].label}: ${num(base[k].v)}` },
          el('b', {}, num(base[k].v)), el('small', {}, base[k].label));
        dnd.draggable(t, { data: { key: k } });
        return t;
      }));
      const full = filled.every(Boolean);
      after.replaceChildren(...(full ? [l.typed ? pad() : shownResult()] : []));
      if (!full) answer.textContent = '؟';
    }

    function finishLine(how) {
      store.update(() => { d.lines[l.n] = how; d.line = Math.max(d.line, l.n); });
      if (how === 'typed') { play('coin'); award(1); } else play('drop');
      renderAll();
    }

    const eq = el('div', { class: 'eq-row' });
    slotEls.forEach((s, i) => { eq.append(s); if (l.ops[i]) eq.append(el('span', { class: 'op' }, l.ops[i])); });
    eq.append(el('span', { class: 'op' }, '='), answer);
    render();
    return el('section', { class: 'card line active' },
      el('h3', {}, el('span', { class: 'n' }, ar(l.n)), l.name),
      eq, tray, hint, after);
  }

  function renderAll() {
    const rows = lines.map(l => (l.n <= d.line ? doneRow(l) : l.n === d.line + 1 ? activeRow(l) : null)).filter(Boolean);
    list.replaceChildren(...rows);
    waterfall();
    next.disabled = d.line < lines.length;
    if (d.line >= lines.length) { undoBtn.disabled = true; list.append(el('p', { class: 'big-line all-done' }, 'حسبتِ كل شيء بنفسك! 🎉')); }
    requestAnimationFrame(() => list.querySelector('.active, .all-done')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }

  app.replaceChildren(frame('ladder', 'اسحبي الأرقام إلى الخانات، ثم اكتبي الجواب واضغطي «تحقّقي».', 'think',
    el('div', { class: 'ladder-area' }, list, fall),
    [undoBtn, next]));
  renderAll();
}

// ---------- 8c. Plan vs what happened ----------
const diffId = () => `${store.get().current.id}-s8-diff`;
const DIFF = 'الفرق لأنّ ___';

async function compare(app, d) {
  const expected = expectedProfit(planData()) ?? 0;
  const actual = netProfit();
  const page = await store.getPage(diffId());
  const ok = hasInk(page);
  if (ok) starOnce(d, 'diff');
  const max = Math.max(1, Math.abs(expected), Math.abs(actual));
  const bar = (label, v) => {
    const val = el('b', {});
    money(val, label, v);
    return el('div', { class: 'vbar' + (v < 0 ? ' neg' : '') },
      el('div', { class: 'track' }, el('i', { style: { height: Math.round(Math.abs(v) / max * 100) + '%' } })),
      val);
  };
  app.replaceChildren(frame('compare', ok ? 'أحسنتِ! كل تاجر يتعلّم من الفرق.' : 'هل ربحتِ كما خطّطتِ؟ لماذا؟', ok ? 'celebrate' : 'think',
    el('div', { class: 'compare-area' },
      el('div', { class: 'card bars' }, bar('في خطّتي', expected), bar('ما حدث', actual)),
      el('div', { class: 'card name-card' },
        ok ? el('img', { class: 'why-thumb', src: renderPage(page, 4), alt: DIFF }) : el('p', { class: 'big-line' }, DIFF),
        el('button', { class: 'btn', onclick: () => {
          play('tap');
          const q = new URLSearchParams({ title: DIFF, back: 'station/8/compare', accent: ACCENT, size: 'card', task: 'لماذا اختلف الربح عن خطّتك؟' });
          location.hash = `copybook/${diffId()}?${q}`;
        } }, btnIcon('book'), ok ? 'عدّلي' : 'افتحي دفتري'))),
    [primary('التالي', () => advance(d, 'statement'), { disabled: !ok })]));
}

// ---------- 8d. My project statement ----------
const dateLong = (iso) => {
  try { return new Date(iso).toLocaleDateString('ar-u-nu-arab-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch (e) { return ''; }
};
const amount = (v) => (v < 0 ? `خسارة ${num(-v)}` : num(v));

export function statementSheet(st) {
  return el('div', { class: 'statement-sheet' },
    el('h2', {}, 'كشف حساب مشروعي'),
    el('p', { class: 'meta' }, el('b', {}, st.name), '، ', dateLong(st.at)),
    el('table', {},
      el('tbody', {}, st.lines.map(r => el('tr', { class: r.n === 7 ? 'net' : '' },
        el('td', {}, ar(r.n)), el('td', {}, r.name), el('td', { class: 'eq' }, r.eq), el('td', { class: 'v' }, amount(r.v)))))),
    el('p', { class: 'meta' }, `في خطّتي: ${amount(st.expected)}، وما حدث: ${amount(st.actual)} (بالريال)`));
}

function statement(app, d) {
  const { lines, base } = ladderLines();
  const eqOf = (l) => {
    const parts = [];
    l.slots.forEach((k, i) => { parts.push(num(base[k].v)); if (l.ops[i]) parts.push(l.ops[i]); });
    return parts.join(' ');
  };
  const st = {
    name: store.get().current.name, at: new Date().toISOString(),
    lines: lines.map(l => ({ n: l.n, name: l.name, eq: eqOf(l), v: l.v })),
    expected: expectedProfit(planData()) ?? 0, actual: lines[6].v,
  };
  store.update(() => { d.statement = st; });
  const print = el('button', { class: 'btn side', onclick: () => { play('tap'); printWith([el('div', { class: 'sheet statement-print' }, statementSheet(st))]); } }, btnIcon('print'), 'اطبعي الكشف');
  app.replaceChildren(frame('statement', 'هذا كشف حساب مشروعك. اطبعيه والصقيه في دفترك.', 'celebrate',
    el('div', { class: 'card statement-card' }, statementSheet(st)),
    [print, primary('التالي', () => advance(d, 'split'))]));
}

// ---------- 8e. Split into the jars ----------
// Each jar gets profit × (its coins ÷ 12), rounded down; what is left goes to Save.
export function splitProfit(profit, shares) {
  const out = {};
  let used = 0;
  for (const j of JARS) { out[j.key] = Math.floor(profit * shares[j.key] / SHARES); used += out[j.key]; }
  const left = round2(profit - used);
  out.save = round2(out.save + left);
  return { amounts: out, left };
}
const shares = () => store.get().current.data.s1?.split || { grow: 3, spend: 3, save: 3, give: 3 };

function split(app, d) {
  const profit = netProfit();
  if (profit <= 0) return lossScreen(app, d, profit);
  const sh = shares();
  const { amounts, left } = splitProfit(profit, sh);
  const equal = JARS.every(j => sh[j.key] === sh.grow);
  const per = Math.floor(profit / 4);
  const body = el('div', { class: 'center-col' },
    el('div', { class: 'card split-card' },
      el('p', { class: 'big-line' }, `صافي الربح: ${riyals(profit)}`),
      equal
        ? el('p', { class: 'eq big' }, `${num(profit)} ÷ ٤ = ${ar(per)} لكل زجاجة`)
        : el('div', { class: 'twelve', 'aria-label': 'تقسيمك من هدفي' }, JARS.flatMap(j => Array.from({ length: sh[j.key] }, () => el('i', { style: { background: JAR_COLOR[j.key] } })))),
      el('div', { class: 'split-rows' }, JARS.map(j => el('div', { class: 'r' },
        el('i', { class: 'dot', style: { background: JAR_COLOR[j.key] } }),
        el('b', {}, j.name),
        el('span', {}, `${ar(sh[j.key])} من ${ar(SHARES)}`),
        el('b', { class: 'v' }, riyals(amounts[j.key]))))),
      left > 0 ? el('p', { class: 'hint' }, `بقي ${num(left)} لم ينقسم بالتساوي، فوضعتُه في زجاجة «أدّخر».`) : null));
  app.replaceChildren(frame('split', 'وزّعي ربحك كما قرّرتِ في «هدفي».', 'think', body,
    [primary('هيّا أوزّع', () => advance(d, 'jars'))]));
}

function lossScreen(app, d, profit) {
  const s = store.get();
  let give = 0;
  const maxGive = Math.min(Math.floor(s.jars.save || 0), 20);
  const finishB = primary('إنهاء المحطة', () => {
    if (give > 0) addToJars({ save: -give, give }, 'from-save');
    finishStation(d, { grow: 0, spend: 0, save: -give, give });
  });
  app.replaceChildren(frame('split', 'هذا يحدث لكل التجّار. لنرَ ماذا نتعلّم.', 'think',
    el('div', { class: 'center-col' },
      el('div', { class: 'card name-card' },
        el('p', { class: 'big-line' }, profit < 0 ? `هذه المرة: خسارة ${num(-profit)}` : 'هذه المرة لم يبقَ ربح.'),
        el('p', { class: 'hint' }, 'لا نوزّع شيئًا على الزجاجات هذه المرة.'),
        el('button', { class: 'btn', onclick: () => { play('tap'); location.hash = 'station/8/compare'; } }, '📊 خطّتي مقابل الواقع')),
      maxGive > 0 ? el('div', { class: 'card give-card' },
        el('p', {}, 'إن شئتِ، يمكنكِ أن تتصدّقي بشيء من زجاجة «أدّخر».'),
        stepper({ value: 0, min: 0, max: maxGive, label: 'من زجاجة أدّخر إلى أعطي', format: (v) => (v ? riyals(v) : 'لا شيء'), onChange: (v) => { give = v; } })) : null),
    [finishB]));
}

// 8e (2). She drags the profit coins into the jars herself (or lets the app do it).
function jars(app, d) {
  const profit = netProfit();
  if (profit <= 0) { go('split'); return; }
  const { amounts } = splitProfit(profit, shares());
  const target = Object.fromEntries(JARS.map(j => [j.key, Math.floor(amounts[j.key])]));
  const placed = { grow: 0, spend: 0, save: 0, give: 0 };
  const total = Object.values(target).reduce((a, b) => a + b, 0);
  const left = () => total - Object.values(placed).reduce((a, b) => a + b, 0);

  const pile = el('div', { class: 'pile', 'aria-label': 'كومة الربح' });
  const jarEls = {};
  const undoBtn = el('button', { class: 'btn side', disabled: true, onclick: () => dnd.undo() }, btnIcon('undo'), 'تراجع');
  const autoBtn = el('button', { class: 'btn', onclick: auto }, '✨ وزّعي عنّي');
  const doneBtn = primary('ضعيها في زجاجاتي', () => finishStation(d, amounts), { disabled: true });

  const dnd = createDnD({
    sound: 'coin',
    accepts: (from, to) => placed[to.key] < target[to.key],
    onDrop(from, to) {
      if (left() <= 0) return false;
      placed[to.key]++;
      render();
      return () => { placed[to.key]--; render(); };
    },
    onHistory: (n) => { undoBtn.disabled = n === 0; },
  });
  dnd.draggable(pile, { data: { pile: true }, ghost: () => art('coin.png', { cls: 'coin-token' }), canPick: () => left() > 0 });

  const jarsRow = el('div', { class: 'jars' }, JARS.map(j => {
    const box = el('div', { class: 'jar', role: 'button' },
      el('div', { class: 'glass' }, art(`jar_${j.key}_empty.png`), el('div', { class: 'coins' })),
      el('h3', {}, j.name), el('span', { class: 'share' }));
    jarEls[j.key] = box;
    dnd.zone(box, { key: j.key });
    return box;
  }));

  function render() {
    const n = left();
    pile.replaceChildren(...(n > 0
      ? [...Array.from({ length: Math.min(n, 24) }, () => art('coin.png', { cls: 'coin-token' })), n > 24 ? el('b', {}, `+${ar(n - 24)}`) : null].filter(Boolean)
      : [el('span', { class: 'hint' }, 'وزّعتِ كل الربح!')]));
    for (const j of JARS) {
      const box = jarEls[j.key];
      box.querySelector('.coins').replaceChildren(...Array.from({ length: Math.min(placed[j.key], 20) }, () => art('coin.png')));
      box.querySelector('.share').textContent = `${ar(placed[j.key])} من ${ar(target[j.key])}`;
      box.classList.toggle('full', placed[j.key] >= target[j.key]);
    }
    doneBtn.disabled = n > 0;
    autoBtn.disabled = n <= 0;
  }

  function auto() {
    play('tap');
    autoBtn.disabled = true;
    const order = [];
    for (const j of JARS) for (let i = placed[j.key]; i < target[j.key]; i++) order.push(j.key);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    order.forEach((k, i) => setTimeout(() => {
      placed[k]++;
      if (!reduce && i % 2 === 0) play('coin');
      render();
    }, reduce ? 0 : i * 90));
  }

  app.replaceChildren(frame('jars', 'اسحبي عملات ربحك إلى زجاجاتك. كل زجاجة تخبرك كم تحتاج.', 'think',
    el('div', { class: 'split' }, pile, jarsRow, el('div', { class: 'row-center' }, autoBtn)),
    [undoBtn, doneBtn]));
  render();
}

function finishStation(d, amounts) {
  const first = !store.get().current.stationsDone.includes(8);
  if (amounts && !d.dist && Object.values(amounts).some(v => v > 0) && amounts.save >= 0) addToJars(amounts);
  store.update(s => {
    if (!d.dist) d.dist = amounts;
    if (first) s.current.stationsDone.push(8);
    if (STEPS.indexOf('done') > STEPS.indexOf(d.step)) d.step = 'done';
  });
  go('done');
  if (first) { celebrate(); award(1); }
}

// ---------- Done: the jars as they are now ----------
function done(app, d) {
  app.replaceChildren(frame('done', d.dist?.give > 0 ? 'وضعتِ ربحك في زجاجاتك، وزرعتِ في حديقة الآخرة.' : 'أحسنتِ! هذه زجاجاتك الآن.', 'celebrate',
    jarsPanel(),
    [primary('إلى الطريق', () => { location.hash = 'home'; })]));
}
