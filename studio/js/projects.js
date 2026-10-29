// مشاريعي القادمة: the running list of future projects. Drag to reorder (the top card is her next favourite),
// star one favourite, or drag a card to the small "لاحقًا" box to set it aside.
import * as store from './store.js';
import { el, ar, art, topbar, taskCard, screen, primary, ICON, emo } from './ui.js';
import { play } from './sound.js';
import { createDnD } from './dnd.js';
import { thumb } from './station2.js';

const hasInk = (pg) => !!pg?.strokes?.some(s => s.tool !== 'eraser');

export async function nextProjectsScreen(app) {
  const s = store.get();
  const pages = new Map();
  await Promise.all(s.nextProjects.map(async p => pages.set(p.id, await store.getPage(p.page))));
  // Cards she started here but left empty are dropped.
  store.update(st => { st.nextProjects = st.nextProjects.filter(p => !p.own || hasInk(pages.get(p.id))); });

  let showLater = false;
  const board = el('div', { class: 'cork projects' });
  const laterBox = el('button', { class: 'later-box', 'aria-label': 'لاحقًا' });
  const undoBtn = el('button', { class: 'btn side', disabled: true, onclick: () => dnd.undo() },
    el('span', { html: ICON.undo, style: { width: '28px', height: '28px', display: 'inline-flex' } }), 'تراجع');

  const list = () => store.get().nextProjects;
  const snapshot = () => JSON.parse(JSON.stringify(list()));
  const restore = (snap) => { store.update(st => { st.nextProjects = snap; }); render(); };

  const dnd = createDnD({
    scroller: board,
    accepts: (from, to) => (to.later ? !from.later : from.id !== to.id && !from.later),
    onDrop(from, to) {
      const before = snapshot();
      store.update(st => {
        const arr = st.nextProjects;
        const i = arr.findIndex(p => p.id === from.id);
        if (to.later) { arr[i].later = true; arr[i].fav = false; return; }
        const j = arr.findIndex(p => p.id === to.id);
        const [m] = arr.splice(i, 1);
        arr.splice(j, 0, m);
      });
      render();
      return () => restore(before);
    },
    onHistory: (n) => { undoBtn.disabled = n === 0; },
  });
  dnd.zone(laterBox, { later: true });

  laterBox.onclick = () => { play('tap'); showLater = !showLater; render(); };

  function card(p, k) {
    const pg = pages.get(p.id);
    const star = el('button', { class: 'fav' + (p.fav ? ' on' : ''), 'aria-label': p.fav ? 'المفضّل' : 'اجعليه المفضّل', 'aria-pressed': String(!!p.fav) }, p.fav ? '★' : '☆');
    star.addEventListener('pointerdown', e => e.stopPropagation());
    star.onclick = (e) => {
      e.stopPropagation(); play('tap');
      store.update(st => { for (const q of st.nextProjects) q.fav = q.id === p.id ? !p.fav : false; });
      render();
    };
    const c = el('div', { class: 'idea' + (k === 0 ? ' top' : ''), 'data-id': p.id, role: 'button', 'aria-label': `مشروع ${ar(k + 1)}` },
      el('span', { class: 'num' }, ar(k + 1)),
      pg ? el('img', { src: thumb(pg), alt: '' }) : el('span', {}, '💡'),
      p.votes ? el('span', { class: 'votes' }, `${ar(p.votes)} 👍`) : null,
      star);
    dnd.draggable(c, { data: { id: p.id } });
    dnd.zone(c, { id: p.id });
    return c;
  }

  function laterCard(p) {
    const pg = pages.get(p.id);
    return el('div', { class: 'idea flat later' },
      pg ? el('img', { src: thumb(pg), alt: '' }) : el('span', {}, '💡'),
      el('button', { class: 'btn back-btn', onclick: () => {
        play('tap');
        store.update(st => { st.nextProjects.find(q => q.id === p.id).later = false; });
        render();
      } }, 'أعيديه'));
  }

  function render() {
    const active = list().filter(p => !p.later), later = list().filter(p => p.later);
    laterBox.replaceChildren(el('span', { class: 'big', 'aria-hidden': 'true' }, emo('📦')), el('b', {}, 'لاحقًا'), el('span', {}, ar(later.length)));
    laterBox.setAttribute('aria-pressed', String(showLater));
    const add = el('button', { class: 'idea add', onclick: newCard }, el('span', { class: 'big' }, '+'), el('span', {}, 'مشروع جديد'));
    if (showLater) {
      board.replaceChildren(...(later.length ? later.map(laterCard) : [el('div', { class: 'empty' }, art('mascot_think.png'), el('p', {}, 'صندوق "لاحقًا" فارغ.'))]));
    } else if (!active.length) {
      board.replaceChildren(add, el('div', { class: 'empty wide' }, art('mascot_wave.png'), el('p', {}, 'أفكارك القادمة ستظهر هنا.')));
    } else {
      board.replaceChildren(add, ...active.map(card));
    }
  }

  function newCard() {
    play('tap');
    const id = 'n' + Date.now().toString(36);
    const page = `np-${id}`;
    store.update(st => { st.nextProjects.push({ id, page, votes: 0, from: st.current.id, fav: false, later: false, own: true }); });
    const q = new URLSearchParams({ title: 'مشروع قادم', back: 'next-projects', accent: 'green', size: 'card', task: 'اكتبي أو ارسمي فكرة مشروع قادم.' });
    location.hash = `copybook/${page}?${q}`;
  }

  app.replaceChildren(screen('green',
    topbar({ title: 'مشاريعي القادمة', back: () => { location.hash = 'home'; } }),
    taskCard('اختاري مشروعك القادم قبل أن ينتهي مشروعك الحالي.', 'think'),
    el('main', { class: 'work' }, el('div', { class: 'projects-wrap' }, board, laterBox)),
    el('footer', { class: 'actions' }, undoBtn, primary('العودة إلى الطريق', () => { location.hash = 'home'; })),
  ));
  render();
}
