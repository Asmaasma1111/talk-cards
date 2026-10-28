// Station 7, أَبيع (Sell): one shop screen she keeps coming back to while she sells.
// Big "+١ بيعة" for printed copies, gifts and discounts, what customers said, online sales added by Mama,
// money so far against her goal, printed vs digital profit, and a gentle check if sales are slow.
// Riyals here are real money from sales; stars are only for effort (writing what a customer said).
import * as store from './store.js';
import { el, ar, art, topbar, taskCard, screen, primary, ICON, award, awardBadge, celebrate, toast, riyals, copiesWord, confirmBox } from './ui.js';
import { play } from './sound.js';
import { renderPage } from './copybook.js';
import { planData, costPerCopy, coinsFor, stepper, num, round2, money } from './station4.js';

const ACCENT = 'pink';
const DAY = 24 * 60 * 60 * 1000;
const FACES = [
  { key: 'happy', icon: '😊', name: 'سعيد' },
  { key: 'ok', icon: '🙂', name: 'لا بأس' },
  { key: 'unsure', icon: '🤔', name: 'غير متأكد' },
];

export function salesData() {
  const p = store.get().current;
  if (!p.data.s7) p.data.s7 = { sales: [], gifts: [], seq: 0, openedAt: null, nudgeAt: null };
  return p.data.s7;
}

// ---------- Numbers used by Station 8 (and the parent corner) ----------
// A discounted sale counts as a sale at the full price, with the difference kept as a discount.
export const printedSold = (d = salesData()) => d.sales.filter(s => s.kind === 'print').length;
export const digitalSold = (d = salesData()) => d.sales.filter(s => s.kind === 'digital').length;
export const printedRevenue = (d = salesData()) => d.sales.filter(s => s.kind === 'print').reduce((a, s) => a + s.price, 0);
export const digitalRevenue = (d = salesData()) => d.sales.filter(s => s.kind === 'digital').reduce((a, s) => a + s.price, 0);
export const giftCopies = (d = salesData()) => d.gifts.filter(g => g.kind === 'gift').length;
export const giftsValue = (d = salesData()) => d.gifts.filter(g => g.kind === 'gift').reduce((a, g) => a + g.amount, 0);
export const discountsTotal = (d = salesData()) => d.gifts.filter(g => g.kind === 'discount').reduce((a, g) => a + g.amount, 0);
// The money that really came in: every sale, less discounts (gifts brought in nothing).
export const moneyIn = (d = salesData()) => printedRevenue(d) + digitalRevenue(d) - discountsTotal(d);

function firstSale() {
  if (store.get().current.firstSaleAt) return;
  store.update(s => { s.current.firstSaleAt = new Date().toISOString(); });
  setTimeout(() => {
    awardBadge('brave');
    toast('أول بيعة! محطة «مشروعي القادم» صارت مفتوحة.');
  }, 500);
}

function nextId(d, prefix) {
  d.seq += 1;
  return prefix + d.seq;
}

// For the parent corner: Mama adds online sales at the digital price.
export function addDigitalSale(count = 1, at = new Date().toISOString()) {
  const d = salesData();
  const price = planData().digital ?? 0;
  store.update(() => {
    for (let i = 0; i < count; i++) d.sales.push({ id: nextId(d, 's'), at, kind: 'digital', price, by: 'mama' });
  });
  if (count > 0) firstSale();
}
export function removeEntry(id) {
  const d = salesData();
  store.update(() => {
    d.sales = d.sales.filter(s => s.id !== id && s.group !== id);
    d.gifts = d.gifts.filter(g => g.id !== id && g.group !== id);
  });
}

const dateWord = (iso) => {
  try { return new Date(iso).toLocaleDateString('ar-u-nu-arab-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long' }); }
  catch (e) { return ''; }
};
// "بريال واحد، بريالين، بـ٣ ريالات" (after the preposition بـ the dual takes its genitive form).
const biRiyals = (n) => (n === 1 ? 'بريال واحد' : n === 2 ? 'بريالين' : `بـ${riyals(n)}`);
const btnIcon = (name) => el('span', { html: ICON[name], style: { width: '28px', height: '28px', display: 'inline-flex' } });
const hasInk = (pg) => !!pg?.strokes?.some(s => s.tool !== 'eraser');
const saidId = (sale) => `${store.get().current.id}-s7-said-${sale.id}`;

export async function station7Screen(app) {
  const d = salesData();
  const plan = planData();
  const price = plan.price ?? 1;
  const goal = plan.goal ?? plan.copies;
  if (!d.openedAt) store.update(() => { d.openedAt = new Date().toISOString(); });

  // Comments she wrote come back from the copybook: star each new one.
  const said = new Map();
  await Promise.all(d.sales.filter(s => s.said).map(async s => said.set(s.id, await store.getPage(s.said))));
  for (const s of d.sales) {
    if (s.said && !s.saidStar && hasInk(said.get(s.id))) { store.update(() => { s.saidStar = true; }); award(1); }
  }

  const history = []; // ids of entries logged on this visit, newest last (for undo)
  let feedbackFor = null; // the sale whose opinion she is giving

  const totalEl = el('b', { class: 'shop-total' });
  const coinsEl = el('div', { class: 'coins-row' });
  const bar = el('span', { class: 'fill' });
  const goalEl = el('span', { class: 'goal-line' });
  const side = el('div', { class: 'shop-side' });
  const undoBtn = el('button', { class: 'btn side', disabled: true, onclick: undo }, btnIcon('undo'), 'تراجع');
  const finishBtn = primary('انتهيتُ من البيع', finish);
  const taskP = el('p', {});

  const saleBtn = el('button', { class: 'sale-btn', onclick: sell, 'aria-label': 'بيعة جديدة' },
    el('span', { class: 'sale-plus', dir: 'ltr' }, '+١'), el('b', {}, 'بيعة'), el('span', { class: 'sub' }, `نسخة ورقية ${biRiyals(price)}`));
  const giftBtn = el('button', { class: 'btn', onclick: giftDialog }, el('span', { 'aria-hidden': 'true' }, '🎁'), 'هدية أو خصم');

  function sell() {
    play('coin');
    let sale;
    store.update(() => { sale = { id: nextId(d, 's'), at: new Date().toISOString(), kind: 'print', price, by: 'maria' }; d.sales.push(sale); });
    history.push(sale.id);
    feedbackFor = sale.id;
    firstSale();
    render();
    pulse();
  }
  function pulse() {
    saleBtn.classList.remove('pop');
    void saleBtn.offsetWidth;
    saleBtn.classList.add('pop');
  }

  function giftDialog() {
    play('tap');
    let paid = Math.max(1, price - 1);
    const close = () => scrim.remove();
    const pick = el('div', { class: 'gift-pick' });
    const showMain = () => pick.replaceChildren(
      el('button', { class: 'card gift-opt', onclick: () => { logGift(); close(); } },
        el('span', { class: 'big', 'aria-hidden': 'true' }, '🎁'), el('b', {}, 'أهديتُ نسخة'), el('span', {}, 'أعطيتُها مجانًا')),
      price > 1 ? el('button', { class: 'card gift-opt', onclick: () => { play('tap'); showDiscount(); } },
        el('span', { class: 'big', 'aria-hidden': 'true' }, '🏷️'), el('b', {}, 'بعتُ بسعر أقل'), el('span', {}, 'خصم')) : null);
    const showDiscount = () => pick.replaceChildren(el('div', { class: 'discount' },
      el('p', {}, `السعر ${riyals(price)}. بكم بعتِها؟`),
      stepper({ value: paid, min: 1, max: price - 1, label: 'بكم بعتِها', format: (v) => riyals(v), onChange: (v) => { paid = v; } }),
      el('button', { class: 'btn primary', onclick: () => { logDiscount(paid); close(); } }, 'سجّلي')));
    const scrim = el('div', { class: 'scrim', onclick: (e) => { if (e.target === scrim) close(); } },
      el('div', { class: 'dialog gift-dialog', role: 'dialog', 'aria-modal': 'true' },
        el('p', {}, 'هدية أو خصم؟'), pick,
        el('button', { class: 'btn', onclick: () => { play('tap'); close(); } }, 'رجوع')));
    showMain();
    document.body.append(scrim);
  }
  function logGift() {
    play('drop');
    let g;
    store.update(() => { g = { id: nextId(d, 'g'), at: new Date().toISOString(), kind: 'gift', amount: price }; d.gifts.push(g); });
    history.push(g.id);
    toast('الهدية جميلة! سجّلتُها لحساباتك.');
    render();
  }
  function logDiscount(paid) {
    play('coin');
    let sale;
    store.update(() => {
      sale = { id: nextId(d, 's'), at: new Date().toISOString(), kind: 'print', price, by: 'maria' };
      d.sales.push(sale);
      d.gifts.push({ id: nextId(d, 'g'), group: sale.id, at: sale.at, kind: 'discount', amount: price - paid });
    });
    history.push(sale.id);
    feedbackFor = sale.id;
    firstSale();
    render();
  }

  function undo() {
    const id = history.pop();
    if (!id) return;
    play('tap');
    removeEntry(id);
    if (feedbackFor === id) feedbackFor = null;
    render();
  }

  async function finish() {
    if (!await confirmBox('هل انتهيتِ من البيع؟ يمكنكِ الرجوع وتسجيل بيعات أخرى لاحقًا.', 'نعم، انتهيتُ', 'ليس بعد', 'var(--green)')) return;
    const first = !store.get().current.stationsDone.includes(7);
    if (first) store.update(s => { s.current.stationsDone.push(7); });
    location.hash = 'home';
    if (first) { celebrate(); award(1); }
  }

  // ----- the opinion card shown after a sale -----
  function feedbackCard(sale) {
    const pg = said.get(sale.id);
    return el('section', { class: 'card feedback' },
      el('h3', {}, 'رأي زبوني'),
      el('div', { class: 'faces' }, FACES.map(f => el('button', {
        class: 'face' + (sale.face === f.key ? ' on' : ''), 'aria-pressed': String(sale.face === f.key), 'aria-label': f.name,
        onclick: () => { play('tap'); store.update(() => { sale.face = sale.face === f.key ? null : f.key; }); render(); },
      }, el('span', { 'aria-hidden': 'true' }, f.icon), el('small', {}, f.name)))),
      el('button', { class: 'btn said', onclick: () => {
        play('tap');
        store.update(() => { sale.said = saidId(sale); });
        const q = new URLSearchParams({ title: 'قال زبوني:', back: 'station/7', accent: ACCENT, size: 'card', task: 'اكتبي جملة واحدة قالها زبونك.' });
        location.hash = `copybook/${sale.said}?${q}`;
      } }, hasInk(pg) ? el('img', { src: renderPage(pg, 3), alt: 'ما قاله زبوني' }) : btnIcon('pencil'), hasInk(pg) ? 'عدّلي' : 'اكتبي ما قاله'),
      el('button', { class: 'link', onclick: () => { play('tap'); feedbackFor = null; render(); } }, 'تمّ'));
  }

  // ----- printed vs digital (after a few sales) -----
  function compareCard() {
    const nP = printedSold(d), nD = digitalSold(d);
    const pP = round2(nP * (price - costPerCopy(plan)));
    const pD = digitalRevenue(d);
    const max = Math.max(1, Math.abs(pP), pD);
    const row = (icon, label, v, n) => {
      const valEl = el('b', {});
      money(valEl, label, v);
      return el('div', { class: 'cmp-row' },
        el('span', { class: 'cmp-k' }, icon, ' ', copiesWord(n)),
        el('span', { class: 'cmp-bar' }, el('i', { class: v < 0 ? 'neg' : '', style: { width: Math.round(Math.abs(v) / max * 100) + '%' } })),
        valEl);
    };
    return el('section', { class: 'card compare' },
      el('h3', {}, 'ربح الورقية وربح الرقمية'),
      row('📘', 'الربح', pP, nP),
      row('🌐', 'الربح', pD, nD),
      el('p', { class: 'hint' }, nD ? 'النسخة الرقمية لا تكلّف شيئًا لصنعها، فكلّ سعرها ربح.' : 'ماما تضيف البيعات الرقمية عندما تبيعها على الإنترنت.'));
  }

  // ----- a gentle check if sales are slow (offered, never forced) -----
  function slowCheck() {
    const now = Date.now();
    const opened = Date.parse(d.openedAt || '') || now;
    const sold = d.sales.length;
    if (now - opened < 7 * DAY || sold >= goal / 2) return null;
    if (d.nudgeAt && now - Date.parse(d.nudgeAt) < 7 * DAY) return null;
    const dismiss = () => { play('tap'); store.update(() => { d.nudgeAt = new Date().toISOString(); }); render(); };
    return el('section', { class: 'card nudge' },
      art('mascot_think.png', { alt: '' }),
      el('div', {},
        el('p', {}, 'هل نراجع السعر أو نخبر زبائن أكثر؟'),
        el('div', { class: 'row' },
          el('button', { class: 'btn', onclick: () => { dismiss(); location.hash = 'station/4/price'; } }, 'نراجع السعر'),
          el('button', { class: 'btn', onclick: () => { dismiss(); location.hash = 'station/6/where'; } }, 'نخبر زبائن أكثر'),
          el('button', { class: 'link', onclick: dismiss }, 'لا، شكرًا'))));
  }

  // ----- the list of everything she logged -----
  function logList() {
    const items = [
      ...d.sales.map(s => ({ at: s.at, s })),
      ...d.gifts.filter(g => !g.group).map(g => ({ at: g.at, g })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    if (!items.length) return el('div', { class: 'empty' }, art('mascot_wave.png'), el('p', {}, 'اضغطي «+١ بيعة» عندما تبيعين نسخة.'));
    return el('ol', { class: 'sale-log' }, items.slice(0, 30).map(({ s, g }) => {
      if (g) return el('li', {}, el('span', { class: 'ic', 'aria-hidden': 'true' }, '🎁'), el('b', {}, 'هدية: نسخة مجانية'), el('small', {}, dateWord(g.at)));
      const disc = d.gifts.find(x => x.group === s.id);
      const face = FACES.find(f => f.key === s.face);
      const label = s.kind === 'digital' ? `بيعة رقمية ${biRiyals(s.price)}` : disc ? `بيعة ${biRiyals(s.price - disc.amount)} (خصم)` : `بيعة ${biRiyals(s.price)}`;
      const li = el('li', { class: s.kind === 'print' ? 'tap' : '' },
        el('span', { class: 'ic', 'aria-hidden': 'true' }, s.kind === 'digital' ? '🌐' : disc ? '🏷️' : '📘'),
        el('b', {}, label),
        face ? el('span', { 'aria-label': face.name }, face.icon) : null,
        s.said && hasInk(said.get(s.id)) ? el('span', { 'aria-label': 'كتبتُ ما قاله' }, '✍️') : null,
        el('small', {}, dateWord(s.at)));
      if (s.kind === 'print') {
        li.setAttribute('role', 'button');
        li.onclick = () => { play('tap'); feedbackFor = s.id; render(); };
      }
      return li;
    }));
  }

  function render() {
    const sold = d.sales.length;
    const m = moneyIn(d);
    totalEl.textContent = m ? `مالي من البيع: ${riyals(m)}` : 'مالي من البيع: لا شيء بعد';
    coinsEl.replaceChildren(...coinsFor(Math.min(m, 10)).filter(Boolean), ...(m > 10 ? [el('b', {}, '…')] : []));
    bar.style.width = Math.min(100, Math.round(sold / Math.max(1, goal) * 100)) + '%';
    goalEl.textContent = sold >= goal ? `وصلتِ إلى هدفك: ${copiesWord(goal)}! 🎉` : `بعتِ ${ar(sold)} من ${copiesWord(goal)} (هدفي)`;
    taskP.textContent = !sold ? 'كلما بعتِ نسخة، اضغطي «+١ بيعة».' : sold >= goal ? 'رائع! وصلتِ إلى هدفك.' : 'أحسنتِ! استمري في البيع.';
    undoBtn.disabled = !history.length;
    finishBtn.disabled = !sold;
    const fb = feedbackFor && d.sales.find(s => s.id === feedbackFor);
    side.replaceChildren(...[
      slowCheck(),
      fb ? feedbackCard(fb) : null,
      sold >= 3 ? compareCard() : null,
      el('section', { class: 'card log-card' }, el('h3', {}, 'سجلّ البيع'), logList())].filter(Boolean));
  }

  app.replaceChildren(screen(ACCENT,
    topbar({ title: 'أَبيع', back: () => { location.hash = 'home'; } }),
    el('section', { class: 'task compact' }, art('mascot_celebrate.png', { alt: '' }), taskP),
    el('main', { class: 'work' }, el('div', { class: 'shop' },
      el('section', { class: 'card shop-main' },
        saleBtn,
        giftBtn,
        el('div', { class: 'money' }, totalEl, coinsEl),
        el('div', { class: 'goal' }, el('span', { class: 'bar' }, bar), goalEl)),
      side)),
    el('footer', { class: 'actions' }, undoBtn, finishBtn),
  ));
  render();
}
