// Station 2, أفكاري (Idea storm): three prompt cards → a corkboard of handwritten idea cards
// (a star per idea, celebration at 20, drag to rearrange, drag one onto another to mix them) → done.
import * as store from './store.js';
import { el, ar, art, topbar, taskCard, screen, primary, ICON, award, celebrate, toast, iconBtn } from './ui.js';
import { play } from './sound.js';
import { createDnD } from './dnd.js';
import { renderPage } from './copybook.js';

const ACCENT = 'yellow';
const STEPS = ['spark', 'board', 'done'];
export const GOAL = 20;
export const MIN_IDEAS = 5; // enough to vote on in Station 3

const PROMPTS = [
  { icon: '💗', q: 'ماذا يحب أصدقائي؟' },
  { icon: '😣', q: 'مِمَّ يشتكي أصدقائي؟' },
  { icon: '⭐', q: 'ماذا أصنع أفضل من الجميع؟' },
];

export function ideasData() {
  const p = store.get().current;
  if (!p.data.s2) p.data.s2 = { step: 'spark', ideas: [], seq: 0, bonus: false };
  return p.data.s2;
}
const photoId = () => `${store.get().current.id}-s2-photo`;

function go(step) { location.hash = 'station/2/' + step; }

function frame(step, task, pose, body, footer, end = []) {
  return screen(ACCENT,
    topbar({ title: 'أفكاري', back: () => { location.hash = 'home'; }, step: [STEPS.indexOf(step) + 1, STEPS.length], end }),
    taskCard(task, pose),
    el('main', { class: 'work' }, body),
    el('footer', { class: 'actions' }, ...footer),
  );
}

export function station2Screen(app, step) {
  const d = ideasData();
  if (!STEPS.includes(step)) step = d.step;
  if (STEPS.indexOf(step) > STEPS.indexOf(d.step)) step = d.step;
  return ({ spark, board, done })[step](app, d);
}

function advance(d, next) {
  store.update(() => { if (STEPS.indexOf(next) > STEPS.indexOf(d.step)) d.step = next; });
  go(next);
}

// ---------- 1. Three prompt cards she can flip ----------
function spark(app, d) {
  const cards = PROMPTS.map((p, i) => {
    const c = el('button', { class: 'flip', 'aria-pressed': 'false', 'aria-label': `بطاقة ${ar(i + 1)}` },
      el('span', { class: 'face front' }, el('span', { class: 'big' }, p.icon), el('span', {}, 'اقلبيني')),
      el('span', { class: 'face back' }, el('span', { class: 'big' }, p.icon), el('b', {}, p.q)),
    );
    c.onclick = () => { play('tap'); c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true')); };
    return c;
  });
  app.replaceChildren(frame('spark', 'اقلبي البطاقات وفكّري. لا توجد فكرة خاطئة!', 'think',
    el('div', { class: 'flips' }, cards),
    [primary('هيّا أكتب أفكاري', () => advance(d, 'board'))],
    [iconBtn('print', 'اطبعي صفحة الأفكار', printIdeasPage), iconBtn('camera', 'صوّري صفحتي الورقية', takePhoto)],
  ));
}

// ---------- 2. The corkboard ----------
const thumbs = new Map(); // page id + updated → image URL

export function thumb(page) {
  const key = page.id + (page.updated || '');
  if (!thumbs.has(key)) thumbs.set(key, renderPage(page, 3, { lines: false, title: false, paper: '#FFFFFF' }));
  return thumbs.get(key);
}

function rot(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return ((h % 5) - 2) * 0.9;
}

function openIdea(idea, mixPages = []) {
  const seq = Number(idea.id.slice(1)) || 1; // rotate through the three prompts
  const task = mixPages.length ? 'امزجي الفكرتين في فكرة جديدة.' : `${PROMPTS[(seq - 1) % 3].q} اكتبي فكرة أو ارسميها.`;
  const q = new URLSearchParams({
    title: mixPages.length ? 'فكرتي الممزوجة ✨' : 'فكرتي', back: 'station/2/board', accent: ACCENT,
    size: 'card', task, refs: mixPages.join(','),
  });
  location.hash = `copybook/${idea.page}?${q}`;
}

function newIdea(mix = null) {
  const d = ideasData();
  const pid = store.get().current.id;
  let idea;
  store.update(() => {
    d.seq += 1;
    idea = { id: 'i' + d.seq, page: `${pid}-idea-${d.seq}`, starred: false, mix };
    d.ideas.push(idea);
  });
  return idea;
}

const hasInk = (pg) => !!pg?.strokes?.some(s => s.tool !== 'eraser');

async function board(app, d) {
  // Load every idea page; drop empty ones (she left without writing), star new ones.
  const pages = new Map();
  await Promise.all(d.ideas.map(async (i) => pages.set(i.id, await store.getPage(i.page))));
  let newStars = 0;
  store.update(() => {
    d.ideas = d.ideas.filter(i => hasInk(pages.get(i.id)));
    for (const i of d.ideas) if (!i.starred) { i.starred = true; newStars++; }
  });
  const photo = await store.getPage(photoId());

  let mixing = false;
  const count = el('b', {});
  const bar = el('span', { class: 'fill' });
  const hint = el('span', { class: 'hint' });
  const mixBtn = el('button', { class: 'btn', 'aria-pressed': 'false' }, '✨ امزجي فكرتين');
  const taskP = el('p', {});
  const cork = el('div', { class: 'cork' });
  const undoBtn = el('button', { class: 'btn side', disabled: true, onclick: () => dnd.undo() },
    el('span', { html: ICON.undo, style: { width: '28px', height: '28px', display: 'inline-flex' } }), 'تراجع');
  const next = primary('التالي', () => advance(d, 'done'));

  const setTask = () => {
    taskP.textContent = mixing ? 'اسحبي فكرة فوق فكرة أخرى لتمزجيهما.'
      : `اكتبي ${ar(GOAL)} فكرة. لا توجد فكرة خاطئة!`;
  };
  mixBtn.onclick = () => {
    play('tap');
    mixing = !mixing;
    mixBtn.setAttribute('aria-pressed', String(mixing));
    cork.classList.toggle('mixing', mixing);
    dnd.cancel();
    setTask();
  };

  const dnd = createDnD({
    scroller: cork,
    accepts: (from, to) => from !== to,
    onDrop(from, to) {
      const ideas = d.ideas;
      const i = ideas.findIndex(x => x.id === from), j = ideas.findIndex(x => x.id === to);
      if (i < 0 || j < 0) return false;
      if (mixing) {
        const target = cork.querySelector(`[data-id="${to}"]`);
        target?.append(el('span', { class: 'sparkle', 'aria-hidden': 'true' }, '✨'));
        play('celebrate');
        const a = ideas[i], b = ideas[j];
        setTimeout(() => openIdea(newIdea([a.id, b.id]), [a.page, b.page]), 650);
        return () => {};
      }
      const before = ideas.map(x => x.id);
      store.update(() => { const [m] = ideas.splice(i, 1); ideas.splice(j, 0, m); });
      render();
      return () => {
        store.update(() => { d.ideas.sort((x, y) => before.indexOf(x.id) - before.indexOf(y.id)); });
        render();
      };
    },
    onHistory: (n) => { undoBtn.disabled = n === 0; },
  });

  function render() {
    const n = d.ideas.length;
    count.textContent = `${ar(n)} / ${ar(GOAL)}`;
    bar.style.width = Math.min(100, (n / GOAL) * 100) + '%';
    hint.textContent = n < MIN_IDEAS ? `اكتبي ${ar(MIN_IDEAS)} أفكار على الأقل لتنتقلي.` : n < GOAL ? 'يمكنكِ إضافة المزيد في أي وقت.' : 'رائع! ٢٠ فكرة!';
    next.disabled = n < MIN_IDEAS;
    mixBtn.disabled = n < 2;

    const add = el('button', { class: 'idea add', 'aria-label': 'فكرة جديدة', onclick: () => { play('tap'); openIdea(newIdea()); } },
      el('span', { class: 'big' }, '+'), el('span', {}, 'فكرة جديدة'));
    const cards = d.ideas.map((idea, k) => {
      const pg = pages.get(idea.id);
      const edit = el('button', { class: 'edit', 'aria-label': 'عدّلي الفكرة', html: ICON.pencil });
      edit.addEventListener('pointerdown', (e) => e.stopPropagation());
      edit.onclick = (e) => { e.stopPropagation(); play('tap'); openIdea(idea, idea.mix ? idea.mix.map(m => d.ideas.find(x => x.id === m)?.page).filter(Boolean) : []); };
      const card = el('div', { class: 'idea', 'data-id': idea.id, role: 'button', 'aria-label': `فكرة ${ar(k + 1)}`, style: { '--rot': rot(idea.id) + 'deg' } },
        el('i', { class: 'pin', 'aria-hidden': 'true' }),
        el('span', { class: 'num' }, ar(k + 1)),
        idea.mix ? el('span', { class: 'mixed', 'aria-label': 'فكرة ممزوجة' }, '✨') : null,
        el('img', { src: thumb(pg), alt: '' }),
        edit,
      );
      dnd.draggable(card, { data: idea.id });
      dnd.zone(card, idea.id);
      return card;
    });
    cork.replaceChildren(add, ...cards);
  }

  const paperBtn = photo ? el('button', { class: 'btn', onclick: () => { play('tap'); showPhoto(photo.photo); } }, '📷 صفحتي الورقية') : null;

  setTask();
  const view = screen(ACCENT,
    topbar({ title: 'أفكاري', back: () => { location.hash = 'home'; }, step: [2, STEPS.length] }),
    el('section', { class: 'task' }, art('mascot_write.png'), taskP),
    el('main', { class: 'work' },
      el('div', { class: 'board-head' },
        el('div', { class: 'counter' }, count, el('span', { class: 'bar' }, bar), hint),
        paperBtn, mixBtn),
      cork),
    el('footer', { class: 'actions' }, undoBtn, next),
  );
  app.replaceChildren(view);
  render();

  if (newStars) award(newStars);
  if (d.ideas.length >= GOAL && !d.bonus) {
    store.update(() => { d.bonus = true; });
    setTimeout(() => { celebrate(); toast('٢٠ فكرة! أنتِ مبدعة!'); }, 400);
  }
}

// ---------- 3. Done ----------
function done(app, d) {
  const first = !store.get().current.stationsDone.includes(2);
  if (first) store.update(s => { s.current.stationsDone.push(2); });
  const n = d.ideas.length;
  app.replaceChildren(frame('done', 'أحسنتِ! أنهيتِ محطة أفكاري.', 'celebrate',
    el('div', { class: 'center-col' },
      el('div', { class: 'card name-card' },
        el('p', { class: 'big-line' }, `لديكِ ${ar(n)} ${n <= 10 && n >= 3 ? 'أفكار' : 'فكرة'}!`),
        el('p', { class: 'big-line' }, 'في المحطة القادمة تسألين الناس عن أفضلها.'),
      ),
      el('button', { class: 'btn', onclick: () => { play('tap'); go('board'); } }, '+ أضيفي أفكارًا'),
    ),
    [primary('إلى الطريق', () => { location.hash = 'home'; })],
  ));
  if (first) { celebrate(); award(1); }
}

// ---------- Paper: print a page of 20 numbered boxes, then photograph it ----------
function ideasPageSVG() {
  const W = 210, H = 297, mx = 14, top = 40, gap = 5, cols = 2, rows = 10;
  const bw = (W - mx * 2 - gap) / cols, bh = (H - top - 14 - gap * (rows - 1)) / rows;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}" direction="rtl">`;
  s += `<rect width="${W}" height="${H}" fill="#fff"/>`;
  s += `<text x="${W / 2}" y="18" text-anchor="middle" font-family="Baloo Bhaijaan 2, Tajawal" font-weight="700" font-size="10" fill="#4A2E45">أفكاري</text>`;
  s += `<text x="${W / 2}" y="28" text-anchor="middle" font-family="Tajawal" font-size="5" fill="#4A2E45">اكتبي ٢٠ فكرة. لا توجد فكرة خاطئة!</text>`;
  for (let k = 0; k < cols * rows; k++) {
    const col = Math.floor(k / rows), row = k % rows; // numbers run down the right column first
    const x = W - mx - (col + 1) * bw - col * gap, y = top + row * (bh + gap);
    s += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="#fff" stroke="#9AA6DB" stroke-width="0.4"/>`;
    for (let ly = y + 4; ly < y + bh - 1; ly += 2) {
      const main = Math.round((ly - y - 4) / 2) % 4 === 0;
      s += `<line x1="${x + 2}" x2="${x + bw - 12}" y1="${ly}" y2="${ly}" stroke="${main ? '#9AA6DB' : '#D2D7F0'}" stroke-width="${main ? 0.25 : 0.12}"/>`;
    }
    s += `<line x1="${x + bw - 11}" x2="${x + bw - 11}" y1="${y + 1}" y2="${y + bh - 1}" stroke="#E8837E" stroke-width="0.35"/>`;
    s += `<circle cx="${x + bw - 5.5}" cy="${y + bh / 2}" r="4" fill="#FFD966"/>`;
    s += `<text x="${x + bw - 5.5}" y="${y + bh / 2 + 1.6}" text-anchor="middle" font-family="Baloo Bhaijaan 2, Tajawal" font-weight="700" font-size="4.6" fill="#4A2E45">${ar(k + 1)}</text>`;
  }
  return s + '</svg>';
}

function printIdeasPage() {
  const root = document.getElementById('print-root');
  const sheet = el('div', { class: 'sheet', style: { padding: 0 } });
  sheet.innerHTML = ideasPageSVG();
  root.replaceChildren(sheet);
  setTimeout(() => window.print(), 60);
}

function takePhoto() {
  const input = el('input', { type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' } });
  input.onchange = async () => {
    const f = input.files?.[0];
    input.remove();
    if (!f) return;
    try {
      const url = await shrink(f, 1600);
      await store.putPage({ id: photoId(), photo: url, updated: new Date().toISOString() });
      toast('حفظتُ صورة صفحتك!');
    } catch (e) {
      toast('لم أستطع حفظ الصورة.');
    }
  };
  document.body.append(input);
  input.click();
}

export function shrink(file, max) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function showPhoto(src) {
  const scrim = el('div', { class: 'scrim', onclick: () => scrim.remove() },
    el('div', { class: 'photo-view' },
      el('img', { src, alt: 'صفحتي الورقية' }),
      el('button', { class: 'btn', onclick: () => { play('tap'); scrim.remove(); } }, 'إغلاق')));
  document.body.append(scrim);
}

export { ideasPageSVG };
