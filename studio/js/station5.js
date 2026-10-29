// Station 5, أَصنع (Make): handwritten task cards on a two-column board ("أعمل عليها" → "انتهيتُ"),
// product photos (product only, never faces), and a "مشكلة وحللتُها" note that earns a badge.
import * as store from './store.js';
import { el, ar, art, topbar, taskCard, screen, primary, ICON, award, awardBadge, celebrate, toast, iconBtn, withEmo } from './ui.js';
import { play } from './sound.js';
import { createDnD } from './dnd.js';
import { renderPage } from './copybook.js';
import { thumb, shrink } from './station2.js';

const ACCENT = 'yellow';
const STEPS = ['tasks', 'photos', 'problem', 'done'];

export function makeData() {
  const p = store.get().current;
  if (!p.data.s5) p.data.s5 = { step: 'tasks', tasks: [], seq: 0, photos: [], fixed: false };
  return p.data.s5;
}

function go(step) { location.hash = 'station/5/' + step; }

function frame(step, task, pose, body, footer) {
  return screen(ACCENT,
    topbar({ title: 'أَصنع', back: () => { location.hash = 'home'; }, step: [STEPS.indexOf(step) + 1, STEPS.length] }),
    taskCard(task, pose),
    el('main', { class: 'work' }, body),
    el('footer', { class: 'actions' }, ...footer),
  );
}

export function station5Screen(app, step) {
  const d = makeData();
  if (!STEPS.includes(step)) step = d.step;
  if (STEPS.indexOf(step) > STEPS.indexOf(d.step)) step = d.step;
  return ({ tasks, photos, problem, done })[step](app, d);
}

function advance(d, next) {
  store.update(() => { if (STEPS.indexOf(next) > STEPS.indexOf(d.step)) d.step = next; });
  go(next);
}

const hasInk = (pg) => !!pg?.strokes?.some(s => s.tool !== 'eraser');

function openTask(t) {
  const q = new URLSearchParams({ title: 'مهمّتي', back: 'station/5/tasks', accent: ACCENT, size: 'card', task: 'اكتبي مهمّة واحدة صغيرة.' });
  location.hash = `copybook/${t.page}?${q}`;
}

// ---------- 1. Task board ----------
async function tasks(app, d) {
  const pages = new Map();
  await Promise.all(d.tasks.map(async t => pages.set(t.id, await store.getPage(t.page))));
  store.update(() => { d.tasks = d.tasks.filter(t => hasInk(pages.get(t.id))); });

  const todo = el('div', { class: 'col-cards' });
  const doneCol = el('div', { class: 'col-cards' });
  const todoBox = el('section', { class: 'col todo', 'aria-label': 'أعمل عليها' }, el('h3', {}, withEmo('🛠️ أعمل عليها')), todo);
  const doneBox = el('section', { class: 'col done', 'aria-label': 'انتهيتُ' }, el('h3', {}, withEmo('✅ انتهيتُ')), doneCol);
  const undoBtn = el('button', { class: 'btn side', disabled: true, onclick: () => dnd.undo() },
    el('span', { html: ICON.undo, style: { width: '28px', height: '28px', display: 'inline-flex' } }), 'تراجع');
  const next = primary('التالي', () => advance(d, 'photos'));

  const dnd = createDnD({
    accepts: (from, to) => from.done !== to.done,
    onDrop(from, to) {
      const t = d.tasks.find(x => x.id === from.id);
      if (!t) return false;
      const was = t.done;
      let starNow = false;
      store.update(() => { t.done = to.done; if (t.done && !t.starred) { t.starred = true; starNow = true; } });
      if (starNow) award(1);
      render();
      return () => { store.update(() => { t.done = was; }); render(); };
    },
    onHistory: (n) => { undoBtn.disabled = n === 0; },
  });
  dnd.zone(todoBox, { done: false });
  dnd.zone(doneBox, { done: true });

  function card(t) {
    const edit = el('button', { class: 'edit', 'aria-label': 'عدّلي المهمّة', html: ICON.pencil });
    edit.addEventListener('pointerdown', (e) => e.stopPropagation());
    edit.onclick = (e) => { e.stopPropagation(); play('tap'); openTask(t); };
    const c = el('div', { class: 'idea flat task-card' + (t.done ? ' is-done' : ''), role: 'button', 'aria-label': t.done ? 'مهمّة انتهت' : 'مهمّة' },
      el('img', { src: thumb(pages.get(t.id)), alt: '' }), edit, t.done ? el('span', { class: 'tick', 'aria-hidden': 'true' }, '✓') : null);
    dnd.draggable(c, { data: { id: t.id, done: t.done } });
    return c;
  }

  function render() {
    const add = el('button', { class: 'idea add', onclick: () => {
      play('tap');
      const pid = store.get().current.id;
      let t;
      store.update(() => { d.seq += 1; t = { id: 't' + d.seq, page: `${pid}-task-${d.seq}`, done: false, starred: false }; d.tasks.push(t); });
      openTask(t);
    } }, el('span', { class: 'big' }, '+'), el('span', {}, 'مهمّة جديدة'));
    todo.replaceChildren(add, ...d.tasks.filter(t => !t.done).map(card));
    const finished = d.tasks.filter(t => t.done);
    doneCol.replaceChildren(...(finished.length ? finished.map(card) : [el('p', { class: 'hint' }, 'اسحبي المهمّة إلى هنا عندما تنتهين.')]));
    next.disabled = !d.tasks.length || d.tasks.some(t => !t.done);
  }

  app.replaceChildren(frame('tasks', d.tasks.length ? 'اسحبي كل مهمّة إلى "انتهيتُ" عندما تنجزينها.' : 'اكتبي مهامك، مهمّة على كل بطاقة.', 'write',
    el('div', { class: 'kanban' }, todoBox, doneBox),
    [undoBtn, next]));
  render();
}

// ---------- 2. Product photos ----------
const photoKey = (n) => `${store.get().current.id}-photo-${n}`;

async function photos(app, d) {
  const grid = el('div', { class: 'photos' });
  async function render() {
    const imgs = await Promise.all(d.photos.map(id => store.getPage(id)));
    grid.replaceChildren(
      el('button', { class: 'photo add', onclick: capture },
        el('span', { class: 'big', html: ICON.camera }),
        el('b', {}, 'صوّري منتجك'),
        el('span', { class: 'note' }, 'المنتج فقط، لا تصوّري الوجوه.')),
      ...imgs.map((pg, i) => pg && el('div', { class: 'photo' },
        el('img', { src: pg.photo, alt: `صورة المنتج ${ar(i + 1)}` }),
        el('button', { class: 'icon-btn del', 'aria-label': 'احذفي الصورة', html: ICON.trash, onclick: () => {
          play('tap'); store.update(() => { d.photos.splice(i, 1); }); render();
        } }))),
    );
  }
  function capture() {
    play('tap');
    const input = el('input', { type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' } });
    input.onchange = async () => {
      const f = input.files?.[0];
      input.remove();
      if (!f) return;
      try {
        const n = (d.seqPhoto || 0) + 1;
        const url = await shrink(f, 1600);
        await store.putPage({ id: photoKey(n), photo: url, updated: new Date().toISOString() });
        store.update(() => { d.seqPhoto = n; d.photos.push(photoKey(n)); });
        render();
      } catch (e) { toast('لم أستطع حفظ الصورة.'); }
    };
    document.body.append(input);
    input.click();
  }
  app.replaceChildren(frame('photos', 'صوّري منتجك الجميل!', 'celebrate', grid, [primary('التالي', () => advance(d, 'problem'))]));
  render();
}

// ---------- 3. "مشكلة وحللتُها" ----------
const problemId = () => `${store.get().current.id}-s5-problem`;
const PROBLEM = 'مشكلة وحللتُها: ___';

async function problem(app, d) {
  const page = await store.getPage(problemId());
  const written = hasInk(page);
  if (written && !d.fixed) {
    store.update(() => { d.fixed = true; });
    setTimeout(() => awardBadge('fix'), 300);
  }
  const open = () => { location.hash = `copybook/${problemId()}?title=${encodeURIComponent(PROBLEM)}&back=station/5/problem&accent=${ACCENT}`; };
  app.replaceChildren(frame('problem', written ? 'رائع! حللتِ مشكلة.' : 'هل واجهتِ مشكلة وحللتِها؟ اكتبيها.', written ? 'celebrate' : 'think',
    el('div', { class: 'center-col' },
      el('div', { class: 'card name-card' },
        written ? el('img', { class: 'why-thumb', src: renderPage(page, 4), alt: 'مشكلتي وحلّها' }) : el('p', { class: 'big-line' }, PROBLEM),
        el('button', { class: 'btn', onclick: () => { play('tap'); open(); } },
          el('span', { html: ICON.book, style: { width: '28px', height: '28px', display: 'inline-flex' } }), written ? 'عدّلي' : 'افتحي دفتري'))),
    [primary(written ? 'التالي' : 'لا مشكلة، التالي', () => advance(d, 'done'))]));
}

// صورة واحدة، صورتين، ٣–١٠ صور، ١١+ صورة (after the verb, so accusative).
const photosWord = (n) => (n === 1 ? 'صورة واحدة' : n === 2 ? 'صورتين' : n <= 10 ? `${ar(n)} صور` : `${ar(n)} صورة`);

// ---------- 4. Done ----------
function done(app, d) {
  const first = !store.get().current.stationsDone.includes(5);
  if (first) store.update(s => { s.current.stationsDone.push(5); });
  app.replaceChildren(frame('done', 'أحسنتِ! صنعتِ منتجك.', 'celebrate',
    el('div', { class: 'center-col' },
      el('div', { class: 'card name-card' },
        el('p', { class: 'big-line' }, `أنجزتِ ${ar(d.tasks.filter(t => t.done).length)} من ${ar(d.tasks.length)} مهام.`),
        d.photos.length ? el('p', { class: 'big-line' }, `صوّرتِ منتجك ${photosWord(d.photos.length)}.`) : null)),
    [primary('إلى الطريق', () => { location.hash = 'home'; })]));
  if (first) { celebrate(); award(1); }
}
