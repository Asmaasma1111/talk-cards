// Station 4, خُطّتي (Plan): one small screen per step —
// materials basket → copies → cost of one copy → what customers said → prices in shops →
// my price (slider with zones) → why (copybook) → my goal → printed and digital → done.
import * as store from './store.js';
import { el, ar, art, topbar, taskCard, screen, primary, ICON, award, celebrate, riyals, toast, copiesWord, emo } from './ui.js';
import { play } from './sound.js';
import { createDnD } from './dnd.js';
import { renderPage, mountInk } from './copybook.js';
import { askData, popularPrice, PRICES } from './station3.js';
import { thumb } from './station2.js';

const ACCENT = 'pink';
const STEPS = ['materials', 'copies', 'cost', 'customers', 'market', 'price', 'because', 'goal', 'digital', 'done'];

export const ITEMS = [
  { key: 'paper', name: 'ورق', file: 'item_paper.png' },
  { key: 'print', name: 'طباعة', file: 'item_print.png' },
  { key: 'markers', name: 'أقلام تلوين', file: 'item_markers.png' },
  { key: 'stapler', name: 'دبّاسة', file: 'item_stapler.png' },
  { key: 'bag', name: 'أكياس', file: 'item_bag.png' },
  { key: 'stickers', name: 'ملصقات', file: 'item_stickers.png' },
];

export function planData() {
  const p = store.get().current;
  if (!p.data.s4) {
    p.data.s4 = { step: 'materials', items: [], seq: 0, copies: 10, market: [], price: null, goal: null, digital: null, starBecause: false, starMarket: false };
  }
  return p.data.s4;
}

// ---------- Numbers used by later stations ----------
export const round2 = (x) => Math.round(x * 100) / 100;
export function materialsTotal(d = planData()) { return d.items.reduce((a, i) => a + i.price, 0); }
export function costPerCopy(d = planData()) { return d.copies ? round2(materialsTotal(d) / d.copies) : 0; }
export function expectedProfit(d = planData()) { return d.price == null ? null : d.price * d.copies - materialsTotal(d); }

// "١٫٤" with the Arabic decimal comma; whole numbers stay whole.
export const num = (x) => ar(Number.isInteger(x) ? x : round2(x));

function go(step) { location.hash = 'station/4/' + step; }

function frame(step, task, pose, body, footer) {
  return screen(ACCENT,
    topbar({ title: 'خُطّتي', back: () => { location.hash = 'home'; }, step: [STEPS.indexOf(step) + 1, STEPS.length] }),
    taskCard(task, pose),
    el('main', { class: 'work' }, body),
    el('footer', { class: 'actions' }, ...footer),
  );
}

export function station4Screen(app, step) {
  const d = planData();
  if (!STEPS.includes(step)) step = d.step;
  if (STEPS.indexOf(step) > STEPS.indexOf(d.step)) step = d.step;
  return ({ materials, copies, cost, customers, market, price, because, goal, digital, done })[step](app, d);
}

function advance(d, next) {
  store.update(() => { if (STEPS.indexOf(next) > STEPS.indexOf(d.step)) d.step = next; });
  go(next);
}

// Big − / + buttons (no typing). Holding a button repeats.
export function stepper({ value, min = 0, max = 99, onChange, label, format = ar }) {
  const out = el('output', { class: 'val', 'aria-live': 'polite' }, format(value));
  const set = (v) => {
    v = Math.max(min, Math.min(max, v));
    if (v === value) return;
    value = v; out.textContent = format(v); play('tap'); onChange(v); refresh();
  };
  const btn = (txt, delta, aria) => {
    const b = el('button', { class: 'step-btn', 'aria-label': aria }, txt);
    let t1 = null, t2 = null;
    const stop = () => { clearTimeout(t1); clearInterval(t2); };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      set(value + delta);
      t1 = setTimeout(() => { t2 = setInterval(() => set(value + delta), 110); }, 420);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
    return b;
  };
  const plus = btn('+', 1, 'زيادة'), minus = btn('−', -1, 'نقصان');
  const refresh = () => { minus.disabled = value <= min; plus.disabled = value >= max; };
  refresh();
  return el('div', { class: 'stepper', role: 'group', 'aria-label': label || null }, plus, out, minus);
}

function undoButton(onclick) {
  return el('button', { class: 'btn side', disabled: true, onclick },
    el('span', { html: ICON.undo, style: { width: '28px', height: '28px', display: 'inline-flex' } }), 'تراجع');
}

// A little dialog with a handwriting pad (for labels she writes herself).
function writeLabel({ title, withPrice = false, price = 1 }) {
  return new Promise((resolve) => {
    let p = price;
    const host = el('div', { class: 'label-pad' });
    const save = el('button', { class: 'btn primary', disabled: true }, 'حفظ');
    const scrim = el('div', { class: 'scrim' },
      el('div', { class: 'dialog wide', role: 'dialog', 'aria-modal': 'true' },
        el('p', {}, title),
        host,
        withPrice ? el('div', { class: 'row' }, el('b', { class: 'lbl' }, 'السعر:'), stepper({ value: p, min: 1, max: 99, onChange: v => { p = v; }, format: riyals })) : null,
        el('div', { class: 'row' },
          el('button', { class: 'btn', onclick: () => { play('tap'); scrim.remove(); resolve(null); } }, 'إلغاء'),
          save),
      ));
    document.body.append(scrim);
    const ink = mountInk(host, { w: 110, h: 34, top: 6, margin: 0, penWidth: 1, label: 'اكتبي هنا', onChange: () => { save.disabled = ink.isEmpty(); } });
    save.onclick = () => { play('tap'); const img = ink.inkPNG(); ink.destroy(); scrim.remove(); resolve({ img, price: p }); };
  });
}

// ---------- 4a-1. Materials basket ----------
function materials(app, d) {
  const shelf = el('div', { class: 'shelf', 'aria-label': 'الرفّ' });
  const basket = el('div', { class: 'basket', 'aria-label': 'السلّة' });
  const total = el('div', { class: 'pill total' });
  const undoBtn = undoButton(() => dnd.undo());
  const next = primary('التالي', () => advance(d, 'copies'));

  const dnd = createDnD({
    accepts: (from, to) => (to === 'basket' ? from.from === 'shelf' : from.from === 'basket'),
    onDrop(from, to) {
      const before = JSON.parse(JSON.stringify(d.items));
      if (to === 'basket') {
        if (from.key === 'other') {
          // Ask for a handwritten label first; the drop counts only if she saves one.
          writeLabel({ title: 'ما هذا الشيء؟ اكتبي اسمه.' }).then((res) => {
            if (!res) return;
            store.update(() => { d.seq += 1; d.items.push({ id: 'm' + d.seq, key: 'other', price: 1, label: res.img }); });
            render();
          });
          return () => { store.update(() => { d.items = before; }); render(); };
        }
        store.update(() => { d.seq += 1; d.items.push({ id: 'm' + d.seq, key: from.key, price: 1 }); });
      } else {
        store.update(() => { d.items = d.items.filter(i => i.id !== from.id); });
      }
      render();
      return () => { store.update(() => { d.items = before; }); render(); };
    },
    onHistory: (n) => { undoBtn.disabled = n === 0; },
  });
  dnd.zone(basket, 'basket');
  dnd.zone(shelf, 'shelf');

  function itemName(i) {
    if (i.key === 'other') return i.label ? el('img', { class: 'hand', src: i.label, alt: 'شيء آخر' }) : 'شيء آخر';
    return ITEMS.find(x => x.key === i.key).name;
  }

  function render() {
    const inBasket = new Set(d.items.map(i => i.key));
    shelf.replaceChildren(...[...ITEMS.filter(i => !inBasket.has(i.key)), { key: 'other', name: 'شيء آخر', file: '' }].map(it => {
      const c = el('div', { class: 'mat' }, it.file ? art(it.file) : art('item_other.png'), el('span', {}, it.name));
      dnd.draggable(c, { data: { from: 'shelf', key: it.key } });
      return c;
    }));
    basket.replaceChildren(
      el('div', { class: 'basket-head' }, el('span', { class: 'big', 'aria-hidden': 'true' }, emo('🧺')), el('b', {}, 'سلّتي')),
      ...(d.items.length ? d.items.map(i => {
        const row = el('div', { class: 'line' },
          el('div', { class: 'grab' }, art(i.key === 'other' ? 'item_other.png' : ITEMS.find(x => x.key === i.key).file), el('span', { class: 'nm' }, itemName(i))),
          stepper({ value: i.price, min: 0, max: 99, label: 'السعر', format: riyals, onChange: (v) => { store.update(() => { i.price = v; }); renderTotal(); } }),
        );
        dnd.draggable(row.querySelector('.grab'), { data: { from: 'basket', id: i.id } });
        return row;
      }) : [el('p', { class: 'hint' }, 'اسحبي ما تحتاجينه إلى هنا.')]),
    );
    renderTotal();
  }
  function renderTotal() {
    total.textContent = `مجموع المواد: ${riyals(materialsTotal(d))}`;
    next.disabled = d.items.length === 0;
  }

  app.replaceChildren(frame('materials', 'ماذا أحتاج؟ اسحبي الموادّ إلى السلّة، واختاري سعر كلّ منها.', 'think',
    el('div', { class: 'market-area' }, shelf, el('div', { class: 'basket-col' }, basket, total)),
    [undoBtn, next]));
  render();
}

// ---------- 4a-2. How many copies? ----------
function copies(app, d) {
  const pile = el('div', { class: 'copies-pile', 'aria-hidden': 'true' });
  const draw = () => pile.replaceChildren(...Array.from({ length: Math.min(d.copies, 30) }, () => el('span', { class: 'book' }, emo('📘'))),
    d.copies > 30 ? el('b', {}, '…') : null);
  draw();
  app.replaceChildren(frame('copies', 'كم نسخة ستصنعين؟', 'think',
    el('div', { class: 'center-col' },
      el('div', { class: 'card name-card' },
        stepper({ value: d.copies, min: 1, max: 50, label: 'عدد النسخ', format: copiesWord, onChange: (v) => { store.update(() => { d.copies = v; }); draw(); } }),
        pile)),
    [primary('التالي', () => advance(d, 'cost'))]));
}

// ---------- 4b. Cost of one copy ----------
// A coin cut to show a part of a riyal (e.g. 0.4 of a coin).
export function partCoin(frac) {
  return el('span', { class: 'part-coin', style: { '--f': String(frac) } }, art('coin.png'));
}
export function coinsFor(x) {
  const whole = Math.floor(x + 1e-9), frac = round2(x - whole);
  return [...Array.from({ length: Math.min(whole, 12) }, () => art('coin.png')), frac > 0 ? partCoin(frac) : null];
}

function cost(app, d) {
  const total = materialsTotal(d), c = costPerCopy(d);
  const exact = Number.isInteger(total / d.copies) || round2(total / d.copies) === total / d.copies;
  const piles = el('div', { class: 'piles' },
    ...Array.from({ length: Math.min(d.copies, 10) }, () => el('div', { class: 'pile-one' }, el('span', { class: 'book' }, emo('📘')), el('div', { class: 'coins-row' }, coinsFor(c)))),
    d.copies > 10 ? el('b', { class: 'more' }, `… و${copiesWord(d.copies - 10)} أخرى`) : null);
  app.replaceChildren(frame('cost', 'كم تكلّفني النسخة الواحدة؟', 'think',
    el('div', { class: 'cost' },
      el('p', { class: 'eq' }, `${ar(total)} ÷ ${ar(d.copies)} = ${num(c)}${exact ? '' : ' تقريبًا'}`),
      piles,
      el('p', { class: 'big-line' }, Number.isInteger(c) ? `النسخة تكلّفني ${riyals(c)}.` : `النسخة تكلّفني ${num(c)} ريال.`),
      el('p', { class: 'rule' }, 'السعر يجب أن يكون أكبر من التكلفة.'),
    ),
    [primary('فهمتُ', () => advance(d, 'customers'))]));
}

// ---------- 4c. What customers said ----------
function customers(app, d) {
  const s3 = askData();
  const best = popularPrice(s3);
  const chart = el('div', { class: 'coin-chart', role: 'img', 'aria-label': 'ما قاله الزبائن' },
    ...PRICES.map(v => el('div', { class: 'bar' + (v === best ? ' best' : '') },
      el('b', { class: 'n' }, ar(s3.prices[v])),
      el('div', { class: 'stack' }, ...Array.from({ length: Math.min(s3.prices[v], 12) }, () => art('coin.png'))),
      el('span', { class: 'lbl' }, riyals(v)))));
  app.replaceChildren(frame('customers', 'ماذا قال زبائني؟', 'think',
    el('div', { class: 'cost' },
      chart,
      el('p', { class: 'big-line' }, best ? `أكثر سعر اختاروه: ${riyals(best)}` : 'لم يُجب أحد عن السعر بعد.')),
    [primary('التالي', () => advance(d, 'market'))]));
}

// ---------- 4d. What I saw in the shops ----------
function market(app, d) {
  const list = el('div', { class: 'seen' });
  const next = primary('التالي', () => {
    if (!d.starMarket) { store.update(() => { d.starMarket = true; }); award(1); }
    advance(d, 'price');
  });
  function render() {
    list.replaceChildren(
      ...d.market.map((m, i) => el('div', { class: 'seen-card' },
        el('img', { class: 'hand', src: m.label, alt: 'ما رأيتُه' }),
        el('b', {}, riyals(m.price)),
        el('button', { class: 'icon-btn', 'aria-label': 'احذفي', html: ICON.trash, onclick: () => { play('tap'); store.update(() => { d.market.splice(i, 1); }); render(); } }))),
      d.market.length < 2 ? el('button', { class: 'seen-card add', onclick: async () => {
        play('tap');
        const res = await writeLabel({ title: 'ماذا رأيتِ؟ اكتبي اسمه.', withPrice: true, price: 3 });
        if (res) { store.update(() => { d.market.push({ label: res.img, price: res.price }); }); render(); }
      } }, el('span', { class: 'big' }, '+'), 'أضيفي سعرًا رأيتُه') : null);
    next.disabled = d.market.length === 0;
  }
  app.replaceChildren(frame('market', 'ابحثي عن شيء يشبه منتجك. كم سعره؟', 'think', el('div', { class: 'center-col' }, list), [next]));
  render();
}

// ---------- 4e. Choose my price ----------
export function zoneOf(p, c, best) {
  if (p < c) return 'red';
  if (best == null || p <= Math.max(best, c)) return 'green';
  return 'yellow';
}
const ZONE = {
  red: { text: 'أخسر مالي', face: '😟', color: 'var(--loss)' },
  green: { text: 'سعر عادل', face: '😊', color: 'var(--green)' },
  yellow: { text: 'قد يشتري عدد أقل', face: '🤔', color: 'var(--yellow)' },
};

// Shows a profit, or the word "خسارة" on a soft red label when it is below zero.
export function money(node, label, v) {
  node.classList.toggle('neg', v < 0);
  node.textContent = v < 0 ? `${label}: خسارة ${num(-v)}` : `${label}: ${num(v)}`;
}

// The slider used for both the printed and the digital price.
function priceSlider({ value, c, best, copies, totalCost, onChange }) {
  const max = Math.max(10, Math.ceil(c * 3), (best || 0) * 2);
  const input = el('input', { type: 'range', min: '1', max: String(max), step: '1', value: String(value), class: 'slider', dir: 'rtl', 'aria-label': 'السعر' });
  // Coloured zones on the track (hard stops, right to left).
  const pct = (v) => ((v - 1) / (max - 1)) * 100;
  const redEnd = Math.max(0, Math.min(100, pct(c)));
  const greenEnd = best == null ? 100 : Math.max(redEnd, Math.min(100, pct(Math.max(best, c)) + 50 / (max - 1)));
  input.style.background = `linear-gradient(to left, #E8837E 0 ${redEnd}%, #7CCB8B ${redEnd}% ${greenEnd}%, #FFD966 ${greenEnd}% 100%)`;

  const big = el('div', { class: 'price-big' });
  const zoneTag = el('span', { class: 'zone-tag' });
  const face = el('span', { class: 'face', 'aria-hidden': 'true' });
  const per = el('span', {});
  const tot = el('span', {});
  const render = () => {
    const p = Number(input.value);
    const z = zoneOf(p, c, best);
    big.textContent = riyals(p);
    zoneTag.textContent = ZONE[z].text;
    zoneTag.style.background = ZONE[z].color;
    face.replaceChildren(emo(ZONE[z].face));
    money(per, 'ربح النسخة', round2(p - c));
    if (totalCost == null) tot.textContent = ''; else money(tot, 'الربح المتوقّع', p * copies - totalCost);
    onChange(p);
  };
  input.addEventListener('input', render);
  input.addEventListener('change', () => play('tap'));
  render();
  return el('div', { class: 'price-pick' },
    el('div', { class: 'readout' }, face, big, zoneTag),
    input,
    el('div', { class: 'live' }, per, tot));
}

function price(app, d) {
  const c = costPerCopy(d), best = popularPrice(askData()), total = materialsTotal(d);
  let p = d.price ?? Math.max(Math.ceil(c), best || 1);
  app.replaceChildren(frame('price', 'اختاري سعرك. حرّكي الدائرة.', 'think',
    el('div', { class: 'center-col' },
      el('div', { class: 'card price-card' },
        priceSlider({ value: p, c, best, copies: d.copies, totalCost: total, onChange: v => { p = v; } }),
        el('p', { class: 'facts' }, `تكلفة النسخة: ${num(c)}، أكثر سعر قاله الزبائن: ${best ? ar(best) : '—'}`))),
    [primary('هذا سعري', () => {
      store.update(() => { d.price = p; if (d.goal == null) d.goal = d.copies; });
      if (p < c) toast('انتبهي: هذا السعر أقل من التكلفة.');
      advance(d, 'because');
    })]));
}

// ---------- "اخترتُ ___ لأنّ ___." in the copybook ----------
const becauseId = () => `${store.get().current.id}-s4-because`;
const BECAUSE = 'اخترتُ ___ لأنّ ___.';

async function because(app, d) {
  const page = await store.getPage(becauseId());
  const written = !!page?.strokes?.some(s => s.tool !== 'eraser');
  const open = () => { location.hash = `copybook/${becauseId()}?title=${encodeURIComponent(BECAUSE)}&back=station/4/because&accent=${ACCENT}`; };
  app.replaceChildren(frame('because', written ? 'جميل! هذا سبب سعرك.' : `سعرك ${riyals(d.price)}. لماذا اخترتِه؟`, 'write',
    el('div', { class: 'center-col' },
      el('div', { class: 'card name-card' },
        written ? el('img', { class: 'why-thumb', src: renderPage(page, 4), alt: 'جملتي' }) : el('p', { class: 'big-line' }, BECAUSE),
        el('button', { class: 'btn', onclick: () => { play('tap'); open(); } },
          el('span', { html: ICON.book, style: { width: '28px', height: '28px', display: 'inline-flex' } }), written ? 'عدّلي جملتي' : 'افتحي دفتري'))),
    [primary('التالي', () => {
      if (!d.starBecause) { store.update(() => { d.starBecause = true; }); award(1); }
      advance(d, 'goal');
    }, { disabled: !written })]));
}

// ---------- My goal ----------
function goal(app, d) {
  app.replaceChildren(frame('goal', 'ما هدفك؟ كم نسخة ستبيعين؟', 'wave',
    el('div', { class: 'center-col' },
      el('div', { class: 'card name-card' },
        el('p', { class: 'big-line' }, 'هدفي: أبيع'),
        stepper({ value: d.goal ?? d.copies, min: 1, max: 99, label: 'هدفي', format: copiesWord, onChange: (v) => { store.update(() => { d.goal = v; }); } }))),
    [primary('هذا هدفي', () => { store.update(() => { if (d.goal == null) d.goal = d.copies; }); advance(d, 'digital'); })]));
}

// ---------- 4f. Printed and digital ----------
function digital(app, d) {
  const best = popularPrice(askData());
  let p = d.digital ?? Math.max(1, Math.min(d.price || 1, best || 2));
  app.replaceChildren(frame('digital', 'ترسمين مرة واحدة، وتبيعين مرات كثيرة. هكذا يعمل المال لكِ!', 'celebrate',
    el('div', { class: 'center-col' },
      el('div', { class: 'two-copies' },
        el('div', { class: 'card copy-kind' }, el('span', { class: 'big' }, emo('📘')), el('b', {}, 'النسخة الورقية'), el('span', {}, `للأهل والأصدقاء: ${riyals(d.price)}`)),
        el('div', { class: 'card copy-kind' }, el('span', { class: 'big' }, emo('💻')), el('b', {}, 'النسخة الرقمية'), el('span', {}, 'تبيعها ماما على الإنترنت'), el('span', { class: 'zero' }, 'كل نسخة إضافية تكلّف ٠'))),
      el('div', { class: 'card price-card' },
        priceSlider({ value: p, c: 0, best, copies: 0, totalCost: null, onChange: v => { p = v; } }))),
    [primary('هذا سعر النسخة الرقمية', () => { store.update(() => { d.digital = p; }); advance(d, 'done'); })]));
}

// ---------- Done ----------
function done(app, d) {
  const first = !store.get().current.stationsDone.includes(4);
  if (first) store.update(s => { s.current.stationsDone.push(4); });
  const rows = [
    ['مجموع المواد', riyals(materialsTotal(d))],
    ['عدد النسخ', copiesWord(d.copies)],
    ['تكلفة النسخة', num(costPerCopy(d))],
    ['سعر النسخة الورقية', riyals(d.price)],
    ['سعر النسخة الرقمية', riyals(d.digital)],
    ['هدفي', copiesWord(d.goal)],
  ];
  app.replaceChildren(frame('done', 'أحسنتِ! خطّتك جاهزة.', 'celebrate',
    el('div', { class: 'center-col' },
      el('div', { class: 'card plan-sum' }, rows.map(([k, v]) => el('div', { class: 'r' }, el('span', {}, k), el('b', {}, v)))),
      el('button', { class: 'btn', onclick: () => { play('tap'); go('price'); } }, 'غيّري السعر')),
    [primary('إلى الطريق', () => { location.hash = 'home'; })]));
  if (first) { celebrate(); award(1); }
}

export { thumb };
