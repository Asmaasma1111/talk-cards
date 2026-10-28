// Station 9, مشروعي القادم: pick the next project from her list → move Grow-jar coins into its budget →
// "ماذا نجح؟ / ماذا سأغيّر؟" in her copybook → the skills she earned → finish: the project goes to the
// gallery, the studio grows, and the journey starts again at Station 1 with the new project.
// It opens early, after her first sale, so she chooses before this project ends.
import * as store from './store.js';
import { el, ar, art, topbar, taskCard, screen, primary, ICON, award, awardBadge, celebrate, toast, riyals, BADGES, hasBadge } from './ui.js';
import { play } from './sound.js';
import { createDnD } from './dnd.js';
import { renderPage } from './copybook.js';
import { thumb } from './station2.js';
import { STATIONS, studioLevel } from './journey.js';

const ACCENT = 'green';
const STEPS = ['pick', 'budget', 'reflect', 'skills', 'finish'];

export function nextData() {
  const p = store.get().current;
  if (!p.data.s9) p.data.s9 = { step: 'pick', nextId: null, budget: 0, starReflect: false };
  return p.data.s9;
}

function go(step) { location.hash = 'station/9/' + step; }
function frame(step, task, pose, body, footer) {
  return screen(ACCENT,
    topbar({ title: 'مشروعي القادم', back: () => { location.hash = 'home'; }, step: [STEPS.indexOf(step) + 1, STEPS.length] }),
    taskCard(task, pose),
    el('main', { class: 'work' }, body),
    el('footer', { class: 'actions' }, ...footer),
  );
}

export function station9Screen(app, step) {
  const d = nextData();
  if (!STEPS.includes(step)) step = d.step;
  if (STEPS.indexOf(step) > STEPS.indexOf(d.step)) step = d.step;
  return ({ pick, budget, reflect, skills, finish })[step](app, d);
}
function advance(d, next) {
  store.update(() => { if (STEPS.indexOf(next) > STEPS.indexOf(d.step)) d.step = next; });
  go(next);
}
const btnIcon = (name) => el('span', { html: ICON[name], style: { width: '28px', height: '28px', display: 'inline-flex' } });
const hasInk = (pg) => !!pg?.strokes?.some(s => s.tool !== 'eraser');

// ---------- 1. Drag one card from her list into "مشروعي القادم" ----------
async function pick(app, d) {
  const s = store.get();
  const cards = s.nextProjects.filter(p => !p.later);
  const pages = new Map(await Promise.all(cards.map(async p => [p.id, await store.getPage(p.page)])));
  if (d.nextId && !cards.some(p => p.id === d.nextId)) store.update(() => { d.nextId = null; });

  const pool = el('div', { class: 'cork next-pool', 'aria-label': 'مشاريعي القادمة' });
  const slot = el('section', { class: 'next-slot', 'aria-label': 'مشروعي القادم' });
  const undoBtn = el('button', { class: 'btn side', disabled: true, onclick: () => dnd.undo() }, btnIcon('undo'), 'تراجع');
  const next = primary('هذا مشروعي القادم', () => advance(d, 'budget'));

  const dnd = createDnD({
    scroller: pool,
    accepts: (from, to) => (to.slot ? from.id !== d.nextId : from.id === d.nextId),
    onDrop(from, to) {
      const before = d.nextId;
      store.update(() => { d.nextId = to.slot ? from.id : null; });
      render();
      return () => { store.update(() => { d.nextId = before; }); render(); };
    },
    onHistory: (n) => { undoBtn.disabled = n === 0; },
  });
  dnd.zone(slot, { slot: true });
  dnd.zone(pool, { slot: false });

  function card(p) {
    const pg = pages.get(p.id);
    const c = el('div', { class: 'idea' + (p.fav ? ' fav-card' : ''), role: 'button', 'aria-label': p.fav ? 'المشروع المفضّل' : 'مشروع' },
      pg ? el('img', { src: thumb(pg), alt: '' }) : el('span', {}, '💡'),
      p.fav ? el('span', { class: 'fav on', 'aria-hidden': 'true' }, '★') : null);
    dnd.draggable(c, { data: { id: p.id } });
    return c;
  }

  function render() {
    const chosen = cards.find(p => p.id === d.nextId);
    const rest = cards.filter(p => p.id !== d.nextId);
    pool.replaceChildren(...(rest.length ? rest.map(card)
      : [el('div', { class: 'empty wide' }, art('mascot_think.png'), el('p', {}, cards.length ? 'اخترتِ!' : 'لا توجد بطاقات بعد. اكتبي فكرة في «مشاريعي القادمة».'))]));
    slot.replaceChildren(el('h3', {}, '🚀 مشروعي القادم'), chosen ? card(chosen) : el('p', { class: 'hint' }, 'اسحبي بطاقة إلى هنا.'));
    slot.classList.toggle('full', !!chosen);
    next.disabled = !chosen;
  }
  render();
  app.replaceChildren(frame('pick', 'اختاري مشروعك القادم من قائمتك، واسحبيه إلى مكانه.', 'think',
    el('div', { class: 'pick-area' }, pool, el('div', { class: 'slot-col' }, slot,
      el('button', { class: 'btn', onclick: () => { play('tap'); location.hash = 'next-projects'; } }, '📝 مشاريعي القادمة'))),
    [undoBtn, next]));
}

// ---------- 2. Coins from the Grow jar into the new project's budget ----------
// Nothing leaves the jar until she finishes the project; here she only decides how much.
function budget(app, d) {
  const grow = Math.floor(store.get().jars.grow || 0);
  if (d.budget > grow) store.update(() => { d.budget = grow; });
  const jarBox = el('div', { class: 'card budget-jar', role: 'button', 'aria-label': 'زجاجة ينمو' });
  const box = el('div', { class: 'card budget-box', role: 'button', 'aria-label': 'ميزانية مشروعي القادم' });
  const undoBtn = el('button', { class: 'btn side', disabled: true, onclick: () => dnd.undo() }, btnIcon('undo'), 'تراجع');
  const allBtn = el('button', { class: 'btn', onclick: () => {
    play('coin');
    const before = d.budget;
    store.update(() => { d.budget = grow; });
    render();
    undoStack.push(before); undoBtn.disabled = false;
  } }, '⬅️ كل المال');
  const undoStack = [];

  const dnd = createDnD({
    sound: 'coin',
    accepts: (from, to) => from.where !== to.where,
    onDrop(from, to) {
      if (to.where === 'box' && d.budget >= grow) return false;
      if (to.where === 'jar' && d.budget <= 0) return false;
      store.update(() => { d.budget += to.where === 'box' ? 1 : -1; });
      render();
      return () => { store.update(() => { d.budget -= to.where === 'box' ? 1 : -1; }); render(); };
    },
    onHistory: (n) => { undoBtn.disabled = n === 0 && !undoStack.length; },
  });
  // "كل المال" is undone first, then single coins.
  undoBtn.onclick = () => {
    if (undoStack.length) { play('tap'); store.update(() => { d.budget = undoStack.pop(); }); render(); undoBtn.disabled = !undoStack.length && !dnd.canUndo(); return; }
    dnd.undo();
  };
  for (const [node, where] of [[jarBox, 'jar'], [box, 'box']]) {
    dnd.draggable(node, { data: { where }, ghost: () => art('coin.png', { cls: 'coin-token' }),
      canPick: () => (where === 'jar' ? grow - d.budget > 0 : d.budget > 0) });
    dnd.zone(node, { where });
  }

  const coins = (n) => [...Array.from({ length: Math.min(n, 20) }, () => art('coin.png')), n > 20 ? el('b', {}, `+${ar(n - 20)}`) : null].filter(Boolean);
  function render() {
    const inJar = grow - d.budget;
    jarBox.replaceChildren(
      el('div', { class: 'glass' }, art(`jar_grow_${inJar > 0 ? 'full' : 'empty'}.png`)),
      el('h3', {}, 'زجاجة «ينمو»'),
      el('div', { class: 'coins-row' }, coins(inJar)),
      el('b', { class: 'amt' }, inJar ? riyals(inJar) : 'فارغة'));
    box.replaceChildren(
      el('span', { class: 'big', 'aria-hidden': 'true' }, '📦'),
      el('h3', {}, 'ميزانية مشروعي القادم'),
      el('div', { class: 'coins-row' }, coins(d.budget)),
      el('b', { class: 'amt' }, d.budget ? riyals(d.budget) : 'لا شيء بعد'));
    allBtn.disabled = d.budget >= grow;
  }
  render();
  app.replaceChildren(frame('budget', grow ? 'اسحبي عملات من زجاجة «ينمو» إلى ميزانية مشروعك القادم.' : 'زجاجة «ينمو» فارغة الآن. ستملئينها عندما تربحين.', 'think',
    el('div', { class: 'budget-area' }, jarBox, el('span', { class: 'arrow', 'aria-hidden': 'true' }, '⬅'), box,
      grow ? el('div', { class: 'row-center' }, allBtn) : null),
    [undoBtn, primary('التالي', () => advance(d, 'reflect'))]));
}

// ---------- 3. Two handwritten questions ----------
const Q = [
  { key: 'worked', title: 'ماذا نجح؟', task: 'اكتبي شيئًا نجح في مشروعك.' },
  { key: 'change', title: 'ماذا سأغيّر؟', task: 'اكتبي شيئًا ستفعلينه بطريقة أخرى.' },
];
const qId = (k) => `${store.get().current.id}-s9-${k}`;

async function reflect(app, d) {
  const pages = await Promise.all(Q.map(q => store.getPage(qId(q.key))));
  const ok = pages.every(hasInk);
  if (ok && !d.starReflect) { store.update(() => { d.starReflect = true; }); award(1); }
  app.replaceChildren(frame('reflect', ok ? 'التاجر الذكي يتعلّم من كل مشروع.' : 'فكّري في مشروعك، واكتبي في دفترك.', ok ? 'celebrate' : 'write',
    el('div', { class: 'pair' }, Q.map((q, i) => el('button', { class: 'card page-card' + (hasInk(pages[i]) ? ' ok' : ''), onclick: () => {
      play('tap');
      const p = new URLSearchParams({ title: q.title, back: 'station/9/reflect', accent: ACCENT, task: q.task });
      location.hash = `copybook/${qId(q.key)}?${p}`;
    } },
      el('b', {}, q.title),
      hasInk(pages[i]) ? el('img', { src: renderPage(pages[i], 3), alt: q.title }) : el('span', { class: 'big', 'aria-hidden': 'true' }, i ? '🔧' : '🌟'),
      el('span', { class: 'btn' }, btnIcon('book'), hasInk(pages[i]) ? 'عدّلي' : 'افتحي دفتري')))),
    [primary('التالي', () => advance(d, 'skills'), { disabled: !ok })]));
}

// ---------- 4. The skills she earned (skills, not money, are the main success) ----------
function skills(app, d) {
  const earned = Object.keys(BADGES).filter(k => k !== 'finish' && hasBadge(k));
  app.replaceChildren(frame('skills', earned.length ? 'هذه مهاراتك في هذا المشروع. المهارات أهمّ من المال!' : 'كل مشروع يعلّمك مهارة جديدة.', 'celebrate',
    el('div', { class: 'skills' },
      earned.length
        ? earned.map(k => el('div', { class: 'card skill' }, art(BADGES[k].file, { size: 120 }), el('b', {}, BADGES[k].name)))
        : el('div', { class: 'empty' }, art('mascot_wave.png'), el('p', {}, 'ستأتي الشارات مع كل خطوة تجرّبينها.'))),
    [primary('التالي', () => advance(d, 'finish'))]));
}

// ---------- 5. Finish: celebrate, save to the gallery, start again at Station 1 ----------
function finish(app, d) {
  const s = store.get();
  const missing = STATIONS.filter(st => st.n < 9 && !s.current.stationsDone.includes(st.n));
  const chosen = s.nextProjects.find(p => p.id === d.nextId);
  app.replaceChildren(frame('finish', missing.length ? 'قبل أن تنهي مشروعك، أكملي هذه المحطات:' : 'كل المحطات انتهت. هل أنتِ جاهزة؟', missing.length ? 'think' : 'celebrate',
    el('div', { class: 'center-col' },
      missing.length
        ? el('div', { class: 'card missing' }, missing.map(st => el('button', { class: 'btn', onclick: () => { play('tap'); location.hash = 'station/' + st.n; } }, art(st.icon, { size: 40 }), st.name)))
        : el('div', { class: 'card name-card' },
          el('p', { class: 'big-line' }, `أنهيتِ «${s.current.name}»!`),
          el('p', { class: 'hint' }, d.budget ? `مشروعك القادم يبدأ بميزانية ${riyals(d.budget)}.` : 'مشروعك القادم يبدأ الآن.'))),
    [primary('أنهيتُ مشروعي!', () => finishProject(d, chosen), { disabled: missing.length > 0 || !chosen })]));
}

// The badge dialog shows first (it belongs to this project); the switch happens when she closes it.
function finishProject(d, chosen) {
  if (awardBadge('finish')) {
    document.querySelector('.badge-dialog .btn')?.addEventListener('click', () => switchProject(d, chosen), { once: true });
  } else switchProject(d, chosen);
}

function switchProject(d, chosen) {
  const s = store.get();
  const old = s.current;
  const entry = {
    id: old.id, name: old.name, startedAt: old.startedAt, finishedAt: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(old.data)),
    badges: s.badges.filter(b => b.project === old.id).map(b => b.id),
    budgetOut: d.budget,
  };
  const levelBefore = studioLevel();
  store.update(st => {
    st.gallery = [...(st.gallery || []), entry];
    st.jars.grow = Math.max(0, Math.round(((st.jars.grow || 0) - d.budget) * 100) / 100);
    st.projectsFinished = (st.projectsFinished || 0) + 1;
    st.nextProjects = st.nextProjects.filter(p => p.id !== chosen.id);
    const n = st.projectsFinished + 1;
    st.current = store.newProject(`مشروعي ${ar(n)}`);
    st.current.budget = d.budget;
    st.current.fromCard = chosen.page; // her handwritten card for this project
  });
  const grew = studioLevel() > levelBefore;
  location.hash = 'home';
  setTimeout(() => {
    celebrate();
    award(1);
    setTimeout(() => toast(grew ? 'كبر الاستوديو! مشروع جديد يبدأ من «هدفي».' : 'مشروع جديد يبدأ من «هدفي».'), 1800);
  }, 300);
}
