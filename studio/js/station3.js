// Station 3, أسأل زبائني (Ask customers): drag top 5 ideas onto the voting board → tally votes
// (a star per person, badge at 5) → she chooses the project → "بكم تشتريه؟" coin answers → done.
import * as store from './store.js';
import { el, ar, art, topbar, taskCard, screen, primary, ICON, award, unaward, awardBadge, celebrate, people, riyals } from './ui.js';
import { play } from './sound.js';
import { createDnD } from './dnd.js';
import { ideasData, thumb } from './station2.js';

const ACCENT = 'green';
const STEPS = ['pick', 'vote', 'choose', 'price', 'done'];
const SPOTS = 5;
export const PRICES = [1, 2, 3, 5, 10];

export function askData() {
  const p = store.get().current;
  if (!p.data.s3) {
    p.data.s3 = {
      step: 'pick', top: Array(SPOTS).fill(null), votes: {}, log: [],
      chosen: null, prices: Object.fromEntries(PRICES.map(v => [v, 0])), priceLog: [],
    };
  }
  return p.data.s3;
}

// The price most people chose (ties go to the lower price). null if nobody answered.
export function popularPrice(d = askData()) {
  let best = null;
  for (const v of PRICES) if (d.prices[v] > 0 && (best === null || d.prices[v] > d.prices[best])) best = v;
  return best;
}

function go(step) { location.hash = 'station/3/' + step; }

function frame(step, task, pose, body, footer) {
  return screen(ACCENT,
    topbar({ title: 'أسأل زبائني', back: () => { location.hash = 'home'; }, step: [STEPS.indexOf(step) + 1, STEPS.length] }),
    taskCard(task, pose),
    el('main', { class: 'work' }, body),
    el('footer', { class: 'actions' }, ...footer),
  );
}

function undoButton(onclick) {
  return el('button', { class: 'btn side', disabled: true, onclick },
    el('span', { html: ICON.undo, style: { width: '28px', height: '28px', display: 'inline-flex' } }), 'تراجع');
}

export async function station3Screen(app, step) {
  const d = askData();
  if (!STEPS.includes(step)) step = d.step;
  if (STEPS.indexOf(step) > STEPS.indexOf(d.step)) step = d.step;
  // Load idea pages once for the thumbnails.
  const ideas = ideasData().ideas;
  const pages = new Map(await Promise.all(ideas.map(async i => [i.id, await store.getPage(i.page)])));
  const ctx = { d, ideas, pages };
  return ({ pick, vote, choose, price, done })[step](app, ctx);
}

function advance(d, next) {
  store.update(() => { if (STEPS.indexOf(next) > STEPS.indexOf(d.step)) d.step = next; });
  go(next);
}

function ideaCard(ctx, id, extra = {}) {
  const pg = ctx.pages.get(id);
  return el('div', { class: 'idea flat' + (extra.cls ? ' ' + extra.cls : ''), 'data-id': id, role: extra.role || null, 'aria-label': extra.label || 'فكرة' },
    pg ? el('img', { src: thumb(pg), alt: '' }) : el('span', {}, '💡'));
}

// ---------- 1. Drag her top 5 ideas onto the voting board ----------
function pick(app, ctx) {
  const { d, ideas } = ctx;
  // Ideas removed since (or never written) leave their spot empty.
  store.update(() => { d.top = d.top.map(id => (ideas.some(i => i.id === id) ? id : null)); });

  const spotsRow = el('div', { class: 'spots' });
  const cork = el('div', { class: 'cork small' });
  const undoBtn = undoButton(() => dnd.undo());
  const next = primary('هيّا نسأل', () => advance(d, 'vote'));

  const dnd = createDnD({
    scroller: cork,
    accepts: (from, to) => (to.spot !== undefined ? from.spot !== to.spot : from.spot !== undefined),
    onDrop(from, to) {
      const before = [...d.top];
      store.update(() => {
        if (to.spot !== undefined) {
          if (from.spot !== undefined) [d.top[to.spot], d.top[from.spot]] = [d.top[from.spot], d.top[to.spot]];
          else d.top[to.spot] = from.idea;
        } else d.top[from.spot] = null;
      });
      render();
      return () => { store.update(() => { d.top = before; }); render(); };
    },
    onHistory: (n) => { undoBtn.disabled = n === 0; },
  });

  function render() {
    spotsRow.replaceChildren(...d.top.map((id, i) => {
      const slot = el('div', { class: 'slot' + (id ? ' full' : ''), 'aria-label': `المكان ${ar(i + 1)}` },
        el('span', { class: 'n' }, ar(i + 1)),
        id ? ideaCard(ctx, id) : null);
      dnd.zone(slot, { spot: i });
      if (id) dnd.draggable(slot, { data: { idea: id, spot: i } });
      return slot;
    }));
    const rest = ideas.filter(i => !d.top.includes(i.id));
    cork.replaceChildren(...rest.map(i => {
      const c = ideaCard(ctx, i.id);
      c.style.setProperty('--rot', '0deg');
      dnd.draggable(c, { data: { idea: i.id } });
      return c;
    }));
    next.disabled = d.top.some(x => !x);
  }

  dnd.zone(cork, { cork: true });
  app.replaceChildren(frame('pick', 'اسحبي أفضل ٥ أفكار إلى لوحة التصويت.', 'think',
    el('div', { class: 'pick' }, spotsRow, cork),
    [undoBtn, next]));
  render();
}

// ---------- 2. Voting board: +1 for every person she asks ----------
function tallySVG(n) {
  const shown = Math.min(n, 20);
  let s = '', x = 0;
  for (let g = 0; g < Math.ceil(shown / 5); g++) {
    const k = Math.min(5, shown - g * 5);
    for (let i = 0; i < Math.min(k, 4); i++) s += `<line x1="${x + i * 6 + 2}" y1="3" x2="${x + i * 6 + 2}" y2="23"/>`;
    if (k === 5) s += `<line x1="${x - 1}" y1="20" x2="${x + 23}" y2="6"/>`;
    x += 30;
  }
  return `<svg viewBox="0 0 ${Math.max(x, 30)} 26" height="26" aria-hidden="true" stroke="#4A2E45" stroke-width="2.4" stroke-linecap="round">${s}</svg>`;
}

const totalVotes = (d) => d.log.length;

function vote(app, ctx) {
  const { d } = ctx;
  const asked = el('div', { class: 'pill asked' });
  const board = el('div', { class: 'vote-board' });
  const undoBtn = undoButton(() => {
    const id = d.log.pop();
    if (!id) return;
    play('tap');
    store.update(() => { d.votes[id] = Math.max(0, (d.votes[id] || 0) - 1); });
    unaward(1);
    render();
  });
  const next = primary('انتهيتُ من السؤال', () => advance(d, 'choose'));

  function render() {
    const max = Math.max(0, ...d.top.map(id => d.votes[id] || 0));
    asked.textContent = `سألتُ ${people(totalVotes(d))}`;
    if (!totalVotes(d)) asked.textContent = 'لم أسأل أحدًا بعد';
    board.replaceChildren(...d.top.map((id, i) => {
      const n = d.votes[id] || 0;
      const plus = el('button', { class: 'plus', 'aria-label': `صوت للفكرة ${ar(i + 1)}` }, '+١');
      plus.onclick = () => {
        play('coin');
        store.update(() => { d.votes[id] = n + 1; d.log.push(id); });
        award(1);
        if (totalVotes(d) >= 5) awardBadge('spoke');
        render();
        board.children[i]?.querySelector('.count')?.classList.add('bump');
      };
      return el('div', { class: 'vote-col' + (max > 0 && n === max ? ' winner' : '') },
        ideaCard(ctx, id),
        el('div', { class: 'count' }, ar(n)),
        el('div', { class: 'tally', html: tallySVG(n) }),
        plus);
    }));
    undoBtn.disabled = d.log.length === 0;
    next.disabled = totalVotes(d) === 0;
  }

  app.replaceChildren(frame('vote', 'اسألي: أيّ فكرة تعجبك أكثر؟ اضغطي +١ لكل صوت.', 'wave',
    el('div', { class: 'vote' }, asked, board),
    [undoBtn, next]));
  render();
}

// ---------- 3. The winner glows, but SHE decides ----------
function choose(app, ctx) {
  const { d } = ctx;
  const max = Math.max(0, ...d.top.map(id => d.votes[id] || 0));
  let selected = d.chosen && d.top.includes(d.chosen) ? d.chosen : d.top.find(id => (d.votes[id] || 0) === max);
  const row = el('div', { class: 'vote-board' });

  function render() {
    row.replaceChildren(...d.top.map((id, i) => {
      const n = d.votes[id] || 0;
      const col = el('button', { class: 'vote-col choice' + (n === max && max > 0 ? ' winner' : ''), 'aria-pressed': String(id === selected), 'aria-label': `الفكرة ${ar(i + 1)}: ${ar(n)} صوت` },
        n === max && max > 0 ? el('span', { class: 'crown', 'aria-hidden': 'true' }, '👑') : null,
        ideaCard(ctx, id),
        el('div', { class: 'count' }, ar(n)));
      col.onclick = () => { play('tap'); selected = id; render(); };
      return col;
    }));
  }

  app.replaceChildren(frame('choose', 'الفكرة الفائزة تلمع، لكنّ القرار لكِ!', 'think',
    el('div', { class: 'vote' }, row),
    [primary('أختار هذا المشروع', () => {
      const ideas = ideasData().ideas;
      store.update(s => {
        d.chosen = selected;
        const idea = ideas.find(i => i.id === selected);
        s.current.chosenIdea = idea ? { id: idea.id, page: idea.page } : null;
        // The other voted ideas go to "مشاريعي القادمة".
        for (const id of d.top) {
          if (id === selected) continue;
          const idea2 = ideas.find(i => i.id === id);
          if (!idea2 || s.nextProjects.some(p => p.page === idea2.page)) continue;
          s.nextProjects.push({ id: 'n' + Date.now().toString(36) + id, page: idea2.page, votes: d.votes[id] || 0, from: s.current.id, fav: false, later: false });
        }
        s.nextProjects = s.nextProjects.filter(p => p.page !== idea?.page);
      });
      celebrate();
      advance(d, 'price');
    })]));
  render();
}

// ---------- 4. "بكم تشتريه؟" — one coin tap per person ----------
function price(app, ctx) {
  const { d } = ctx;
  const total = el('div', { class: 'pill asked' });
  const coins = el('div', { class: 'price-row' });
  const undoBtn = undoButton(() => {
    const v = d.priceLog.pop();
    if (v == null) return;
    play('tap');
    store.update(() => { d.prices[v] = Math.max(0, d.prices[v] - 1); });
    unaward(1);
    render();
  });
  const next = primary('التالي', () => advance(d, 'done'));

  function render() {
    const n = d.priceLog.length;
    total.textContent = n ? `أجاب ${people(n)}` : 'لم يُجب أحد بعد';
    const best = popularPrice(d);
    coins.replaceChildren(...PRICES.map(v => {
      const b = el('button', { class: 'coin-btn' + (best === v ? ' best' : ''), 'aria-label': `${riyals(v)}: ${ar(d.prices[v])}` },
        el('span', { class: 'face' }, art('coin.png'), d.prices[v] ? el('span', { class: 'count' }, ar(d.prices[v])) : null),
        el('b', { class: 'label' }, riyals(v)));
      b.onclick = () => {
        play('coin');
        store.update(() => { d.prices[v] += 1; d.priceLog.push(v); });
        award(1);
        render();
      };
      return b;
    }));
    undoBtn.disabled = n === 0;
    next.disabled = n === 0;
  }

  app.replaceChildren(frame('price', 'اسألي كل شخص: بكم تشتريه؟', 'wave',
    el('div', { class: 'price' },
      el('div', { class: 'chosen' }, ideaCard(ctx, d.chosen)),
      coins, total),
    [undoBtn, next]));
  render();
}

// ---------- 5. Done ----------
function done(app, ctx) {
  const { d } = ctx;
  const first = !store.get().current.stationsDone.includes(3);
  if (first) store.update(s => { s.current.stationsDone.push(3); });
  const best = popularPrice(d);
  app.replaceChildren(frame('done', 'أحسنتِ! أنهيتِ محطة أسأل زبائني.', 'celebrate',
    el('div', { class: 'center-col' },
      el('div', { class: 'card name-card' },
        el('div', { class: 'chosen' }, ideaCard(ctx, d.chosen)),
        el('p', { class: 'big-line' }, `سألتِ ${people(totalVotes(d))}. شجاعة!`),
        best ? el('p', { class: 'big-line' }, `أكثر سعر اختاره الناس: ${riyals(best)}`) : null,
      ),
    ),
    [primary('إلى الطريق', () => { location.hash = 'home'; })]));
  if (first) { celebrate(); award(1); }
}
