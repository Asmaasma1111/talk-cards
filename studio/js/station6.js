// Station 6, أُخبِر الناس (Telling people): brand name and logo → what makes it special → poster →
// free sample and what telling people costs → my pitch (write it, record it, practise it) →
// caring for customers → where I tell people → (photo for Mama to post online) → done.
// Always "أُخبِر الناس", never "أُعلِن" or "إعلان".
import * as store from './store.js';
import { el, ar, art, topbar, taskCard, screen, primary, ICON, award, unaward, awardBadge, celebrate, toast, riyals, mascotSVG, assetOk } from './ui.js';
import { play } from './sound.js';
import { createDnD } from './dnd.js';
import { renderPage, mountInk, inkImage, drawStrokes, printWith, INK, DESIGN_PENS } from './copybook.js';
import { shrink } from './station2.js';
import { planData, coinsFor, stepper } from './station4.js';
import { makeData } from './station5.js';

const ACCENT = 'green';
const STEPS = ['brand', 'special', 'poster', 'sample', 'pitch', 'voice', 'ladder', 'care', 'where', 'online', 'done'];

export function tellData() {
  const p = store.get().current;
  if (!p.data.s6) {
    p.data.s6 = { step: 'brand', stars: {}, poster: { items: [], seq: 0 }, posters: 0, samples: 0, sample: null, ladder: 0, flipped: [], plan: [] };
  }
  return p.data.s6;
}

// Every printed sheet (a poster or a sample page) costs one riyal; Station 8 adds this to her costs.
export const PRINT_EACH = 1;
export function marketingCost(d = tellData()) { return (d.posters + d.samples) * PRINT_EACH; }

const pid = () => store.get().current.id;
const ID = {
  brand: () => `${pid()}-s6-brand`,
  logo: () => `${pid()}-s6-logo`,
  logoPhoto: () => `${pid()}-s6-logo-photo`,
  special: () => `${pid()}-s6-special`,
  pitch: (i) => `${pid()}-s6-pitch-${i + 1}`,
  posterInk: () => `${pid()}-s6-poster-ink`,
  voice: () => `${pid()}-s6-voice`,
  samplePhoto: () => `${pid()}-s6-sample-photo`,
  onlinePhoto: () => `${pid()}-s6-online-photo`,
  onlineLine: () => `${pid()}-s6-online-line`,
};

function go(step) { location.hash = 'station/6/' + step; }

function frame(step, task, pose, body, footer) {
  return screen(ACCENT,
    topbar({ title: 'أُخبِر الناس', back: () => { location.hash = 'home'; }, step: [STEPS.indexOf(step) + 1, STEPS.length] }),
    taskCard(task, pose),
    el('main', { class: 'work' }, body),
    el('footer', { class: 'actions' }, ...footer),
  );
}

export function station6Screen(app, step) {
  const d = tellData();
  if (!STEPS.includes(step)) step = d.step;
  if (STEPS.indexOf(step) > STEPS.indexOf(d.step)) step = d.step;
  return ({ brand, special, poster, sample, pitch, voice, ladder, care, where, online, done })[step](app, d);
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

const hasInk = (pg) => !!pg?.strokes?.some(s => s.tool !== 'eraser');

function openPage(id, { title = '', task = '', size = 'card', design = false, back }) {
  const q = new URLSearchParams({ title, back, accent: ACCENT, size, task });
  if (design) q.set('design', '1');
  location.hash = `copybook/${id}?${q}`;
}

const btnIcon = (name) => el('span', { html: ICON[name], style: { width: '28px', height: '28px', display: 'inline-flex' } });

// A big card that opens a page; shows what she wrote once there is ink.
function pageCard(label, page, onOpen, emptyIcon = '✍️') {
  const ok = hasInk(page);
  return el('button', { class: 'card page-card' + (ok ? ' ok' : ''), onclick: () => { play('tap'); onOpen(); } },
    el('b', {}, label),
    ok ? el('img', { src: renderPage(page, 4), alt: label }) : el('span', { class: 'big', 'aria-hidden': 'true' }, emptyIcon),
    el('span', { class: 'btn' }, btnIcon('pencil'), ok ? 'عدّلي' : 'ابدئي'));
}

// ---------- 6a. Brand name and logo ----------
// The logo is drawn on a design page or taken from a picture; the newest one is the one used.
async function logoNow() {
  const [drawn, photo] = await Promise.all([store.getPage(ID.logo()), store.getPage(ID.logoPhoto())]);
  const d = hasInk(drawn) ? { src: inkImage(drawn.strokes, drawn.size), thumb: renderPage(drawn, 4), at: drawn.updated || '' } : null;
  const p = photo?.photo ? { src: photo.photo, thumb: photo.photo, at: photo.updated || '' } : null;
  if (d && p) return p.at > d.at ? p : d;
  return d || p;
}

function pickPhoto(onPicked) {
  const input = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
  input.onchange = async () => {
    const f = input.files?.[0];
    input.remove();
    if (!f) return;
    try { onPicked(await shrink(f, 1200)); } catch (e) { toast('لم أستطع حفظ الصورة.'); }
  };
  document.body.append(input);
  input.click();
}

async function brand(app, d) {
  const name = await store.getPage(ID.brand());
  const logo = await logoNow();
  const ready = hasInk(name) && !!logo;
  if (ready) starOnce(d, 'brand');
  const back = 'station/6/brand';
  app.replaceChildren(frame('brand', ready ? 'علامتك جاهزة! اسم جميل وشعار جميل.' : 'اختاري اسمًا لعلامتك الصغيرة، وارسمي لها شعارًا.', ready ? 'celebrate' : 'write',
    el('div', { class: 'pair' },
      pageCard('اسمي', name, () => openPage(ID.brand(), { title: 'اسم علامتي', task: 'اكتبي اسم علامتك بخطّك الجميل.', back })),
      el('div', { class: 'card page-card' + (logo ? ' ok' : '') },
        el('b', {}, 'شعاري'),
        logo ? el('img', { src: logo.thumb, alt: 'شعاري' }) : el('span', { class: 'big', 'aria-hidden': 'true' }, '🎨'),
        el('div', { class: 'row' },
          el('button', { class: 'btn', onclick: () => { play('tap'); openPage(ID.logo(), { size: 'logo', design: true, task: 'ارسمي شعار علامتك بالألوان.', back }); } }, btnIcon('pencil'), 'ارسميه'),
          el('button', { class: 'btn', onclick: () => {
            play('tap');
            pickPhoto(async (url) => {
              await store.putPage({ id: ID.logoPhoto(), photo: url, updated: new Date().toISOString() });
              brand(app, d);
            });
          } }, btnIcon('camera'), 'من صورة')))),
    [primary('التالي', () => advance(d, 'special'), { disabled: !ready })]));
}

// ---------- 6b. What makes it special ----------
const SPECIAL = 'منتجي مميّز لأنّ ___';

async function special(app, d) {
  const page = await store.getPage(ID.special());
  const ok = hasInk(page);
  if (ok) starOnce(d, 'special');
  app.replaceChildren(frame('special', ok ? 'هذا ما يجعل منتجك مميّزًا!' : 'لماذا منتجك مميّز؟ اكتبي سطرًا واحدًا.', ok ? 'celebrate' : 'think',
    el('div', { class: 'center-col' },
      el('div', { class: 'card name-card' },
        ok ? el('img', { class: 'why-thumb', src: renderPage(page, 4), alt: SPECIAL }) : el('p', { class: 'big-line' }, SPECIAL),
        el('button', { class: 'btn', onclick: () => { play('tap'); openPage(ID.special(), { title: SPECIAL, task: 'أكملي الجملة بخطّك.', back: 'station/6/special' }); } },
          btnIcon('book'), ok ? 'عدّلي' : 'افتحي دفتري'))),
    [primary('التالي', () => advance(d, 'poster'), { disabled: !ok })]));
}

// ---------- 6c. The poster ----------
export const A4 = { w: 210, h: 297 };
const svgURL = (s) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
const STICKERS = {
  star: ['نجمة', '<svg viewBox="0 0 48 48"><path d="M24 4l6 13 14 1.6-10.5 9.6 3 14L24 35l-12.5 7.2 3-14L4 18.6 18 17z" fill="#FFD966" stroke="#4A2E45" stroke-width="2.5" stroke-linejoin="round"/></svg>'],
  heart: ['قلب', '<svg viewBox="0 0 48 48"><path d="M24 42S5 30 5 17a10 10 0 0 1 19-4 10 10 0 0 1 19 4c0 13-19 25-19 25z" fill="#F7A8C4" stroke="#4A2E45" stroke-width="2.5" stroke-linejoin="round"/></svg>'],
  sparkle: ['لمعة', '<svg viewBox="0 0 48 48"><path d="M24 3c2 12 9 19 21 21-12 2-19 9-21 21-2-12-9-19-21-21 12-2 19-9 21-21z" fill="#7CCB8B" stroke="#4A2E45" stroke-width="2.5" stroke-linejoin="round"/></svg>'],
};

// The price tag, drawn with the app's own font so it prints the same.
async function priceTag(price) {
  try { await document.fonts?.load("800 72px 'Baloo Bhaijaan 2'"); } catch (e) { /* the fallback font is fine */ }
  const c = document.createElement('canvas');
  c.width = 420; c.height = 220;
  const x = c.getContext('2d');
  x.fillStyle = '#FFD966'; x.strokeStyle = '#4A2E45'; x.lineWidth = 8; x.lineJoin = 'round';
  x.beginPath();
  x.moveTo(90, 12); x.lineTo(396, 12); x.quadraticCurveTo(408, 12, 408, 24); x.lineTo(408, 196);
  x.quadraticCurveTo(408, 208, 396, 208); x.lineTo(90, 208); x.lineTo(12, 110); x.closePath();
  x.fill(); x.stroke();
  x.fillStyle = '#FFF8EC'; x.beginPath(); x.arc(70, 110, 16, 0, Math.PI * 2); x.fill(); x.stroke();
  x.fillStyle = '#4A2E45'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl';
  x.font = "800 72px 'Baloo Bhaijaan 2', Tajawal, sans-serif";
  x.fillText(riyals(price), 245, 116, 300);
  return c.toDataURL('image/png');
}

// Everything she can put on the poster: her own work first, then the mascot and stickers.
async function posterSources() {
  const out = [];
  const [logo, name] = await Promise.all([logoNow(), store.getPage(ID.brand())]);
  if (logo) out.push({ key: 'logo', label: 'شعاري', w: 80, src: logo.src });
  if (hasInk(name)) out.push({ key: 'name', label: 'اسمي', w: 120, src: inkImage(name.strokes, name.size) });
  const price = planData().price;
  if (price != null) out.push({ key: 'price', label: 'السعر', w: 70, src: await priceTag(price) });
  out.push({ key: 'mascot', label: 'صديقي', w: 60, src: (await assetOk('mascot_wave.png')) ? 'assets/mascot_wave.png' : svgURL(mascotSVG('wave')) });
  for (const id of makeData().photos) {
    const pg = await store.getPage(id);
    if (pg?.photo) out.push({ key: 'photo:' + id, label: 'صورة منتجي', w: 90, src: pg.photo });
  }
  for (const [k, [label, svg]] of Object.entries(STICKERS)) out.push({ key: 'sticker:' + k, label, w: 30, src: svgURL(svg) });
  return out;
}

function loadImg(src) {
  return new Promise((resolve) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = src;
  });
}

// The finished poster as one picture (for printing now and the gallery later).
export async function renderPoster(d = tellData(), px = 6) {
  const srcs = new Map((await posterSources()).map(s => [s.key, s]));
  const c = document.createElement('canvas');
  c.width = A4.w * px; c.height = A4.h * px;
  const x = c.getContext('2d');
  x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, c.width, c.height);
  for (const it of d.poster.items) {
    const s = srcs.get(it.key);
    const img = s && await loadImg(s.src);
    if (!img) continue;
    const w = it.w * px, h = w * (img.naturalHeight / img.naturalWidth || 1);
    x.save();
    x.translate(it.x * px, it.y * px);
    x.rotate(it.rot * Math.PI / 180);
    x.drawImage(img, -w / 2, -h / 2, w, h);
    x.restore();
  }
  const ink = await store.getPage(ID.posterInk());
  if (hasInk(ink)) {
    const layer = document.createElement('canvas');
    layer.width = c.width; layer.height = c.height;
    drawStrokes(layer.getContext('2d'), ink.strokes, px);
    x.drawImage(layer, 0, 0);
  }
  return c.toDataURL('image/jpeg', 0.9);
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const angle = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const midOf = (p) => [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2];

async function poster(app, d) {
  const sources = await posterSources();
  const srcMap = new Map(sources.map(s => [s.key, s]));
  const inkPage = await store.getPage(ID.posterInk());
  const P = d.poster;

  let k = 1;            // px per mm
  let mode = 'move';    // 'move' | a pen colour | 'eraser'
  let sel = null;       // selected item id
  let undoingInk = false;
  const hist = [];      // { t: 'items', prev } or { t: 'ink' }
  const nodes = new Map();

  const posterEl = el('div', { class: 'poster', role: 'img', 'aria-label': 'ملصقي' });
  const layer = el('div', { class: 'poster-items' });
  const inkHost = el('div', { class: 'poster-ink' });
  posterEl.append(layer, inkHost);
  const stage = el('div', { class: 'poster-stage' }, posterEl);

  // ----- tools -----
  const toolBtn = (label, html, child) => {
    const b = el('button', { class: 'tool' + (child ? ' pen' : ''), 'aria-label': label, title: label, html: html || null });
    if (child) b.append(child);
    return b;
  };
  const moveB = toolBtn('حرّكي العناصر', ICON.hand);
  const PEN_NAMES = { pink: 'القلم الوردي', yellow: 'القلم الأصفر', green: 'القلم الأخضر', black: 'القلم الأسود' };
  const penBs = Object.fromEntries(DESIGN_PENS.map(c => [c, toolBtn(PEN_NAMES[c], null, el('span', { class: 'ink', style: { '--ink': INK[c] } }))]));
  const eraserB = toolBtn('الممحاة', ICON.eraser);
  const biggerB = toolBtn('أكبر', ICON.bigger);
  const smallerB = toolBtn('أصغر', ICON.smaller);
  const rotateB = toolBtn('دوّريها', ICON.rotate);
  const delB = toolBtn('أزيليها', ICON.trash);
  const undoB = toolBtn('تراجع', ICON.undo);
  const tools = el('div', { class: 'cb-tools poster-tools', role: 'toolbar', 'aria-label': 'أدوات الملصق' },
    moveB, ...Object.values(penBs), eraserB, el('i', { class: 'sep' }), biggerB, smallerB, rotateB, delB, el('i', { class: 'sep' }), undoB);

  const next = primary('التالي', () => { starOnce(d, 'poster'); advance(d, 'sample'); });
  const printB = el('button', { class: 'btn side', onclick: printPoster }, btnIcon('print'), 'اطبعي ملصقي');

  function setMode(m) {
    mode = m;
    moveB.setAttribute('aria-pressed', String(m === 'move'));
    for (const [c, b] of Object.entries(penBs)) b.setAttribute('aria-pressed', String(m === c));
    eraserB.setAttribute('aria-pressed', String(m === 'eraser'));
    posterEl.classList.toggle('drawing', m !== 'move');
    if (m === 'eraser') ink.setTool('eraser'); else if (m !== 'move') ink.setTool('pen', m);
    if (m !== 'move') select(null);
  }
  moveB.onclick = () => { play('tap'); setMode('move'); };
  for (const [c, b] of Object.entries(penBs)) b.onclick = () => { play('tap'); setMode(c); };
  eraserB.onclick = () => { play('tap'); setMode('eraser'); };

  function refresh() {
    const has = !!sel;
    for (const b of [biggerB, smallerB, rotateB, delB]) b.disabled = !has;
    undoB.disabled = !hist.length;
    next.disabled = !P.items.length && ink.isEmpty();
  }

  // ----- items -----
  const snapshot = () => JSON.parse(JSON.stringify(P.items));
  function commit(prev) {
    hist.push({ t: 'items', prev });
    store.update(() => {});
    refresh();
  }
  const offPage = (it) => it.x < 0 || it.x > A4.w || it.y < 0 || it.y > A4.h;

  function place(n, it) {
    n.style.width = it.w * k + 'px';
    n.style.left = it.x * k + 'px';
    n.style.top = it.y * k + 'px';
    n.style.transform = `translate(-50%, -50%) rotate(${it.rot}deg)`;
    n.classList.toggle('leaving', offPage(it));
    n.classList.toggle('sel', it.id === sel);
  }
  function renderItems() {
    nodes.clear();
    layer.replaceChildren(...P.items.map(it => {
      const s = srcMap.get(it.key);
      if (!s) return null;
      const n = el('img', { class: 'p-item', src: s.src, alt: s.label, draggable: 'false', 'data-id': it.id });
      nodes.set(it.id, n);
      place(n, it);
      return n;
    }));
    refresh();
  }
  function select(id) {
    sel = id;
    for (const [i, n] of nodes) n.classList.toggle('sel', i === id);
    refresh();
  }
  const selItem = () => P.items.find(i => i.id === sel);
  function tweak(fn) {
    const it = selItem();
    if (!it) return;
    play('tap');
    const prev = snapshot();
    fn(it);
    renderItems();
    commit(prev);
  }
  biggerB.onclick = () => tweak(it => { it.w = clamp(it.w * 1.2, 12, 200); });
  smallerB.onclick = () => tweak(it => { it.w = clamp(it.w / 1.2, 12, 200); });
  rotateB.onclick = () => tweak(it => { it.rot = (it.rot + 15) % 360; });
  delB.onclick = () => tweak(it => { P.items = P.items.filter(i => i !== it); sel = null; });
  undoB.onclick = () => {
    const e = hist.pop();
    if (!e) return;
    play('tap');
    if (e.t === 'items') { store.update(() => { P.items = e.prev; }); sel = null; renderItems(); }
    else { undoingInk = true; ink.undo(); undoingInk = false; }
    refresh();
  };

  // ----- moving, pinching, rotating (one or two fingers) -----
  let gest = null; // { it, pts: Map, g, prev, moved, bg }
  function baseline() {
    const it = gest.it;
    gest.g = { x: it.x, y: it.y, w: it.w, rot: it.rot, p: [...gest.pts.values()] };
  }
  posterEl.addEventListener('pointerdown', (e) => {
    if (mode !== 'move' || e.button > 0) return;
    const hit = e.target.closest?.('.p-item');
    const it = hit && P.items.find(i => i.id === hit.dataset.id);
    if (!gest) {
      if (!it && !selItem()) { select(null); return; }
      gest = { it: it || selItem(), pts: new Map(), prev: snapshot(), moved: false, bg: !it };
      if (it) select(it.id);
    } else if (gest.pts.size >= 2) return;
    e.preventDefault();
    try { posterEl.setPointerCapture(e.pointerId); } catch (err) { /* not critical */ }
    gest.pts.set(e.pointerId, [e.clientX, e.clientY]);
    baseline();
    posterEl.classList.add('dragging');
  });
  posterEl.addEventListener('pointermove', (e) => {
    if (!gest || !gest.pts.has(e.pointerId)) return;
    e.preventDefault();
    gest.pts.set(e.pointerId, [e.clientX, e.clientY]);
    const p = [...gest.pts.values()], g = gest.g, it = gest.it;
    if (p.length === 1) {
      if (gest.bg) return; // one finger on empty paper does not drag the selected item
      const dx = p[0][0] - g.p[0][0], dy = p[0][1] - g.p[0][1];
      if (!gest.moved && Math.hypot(dx, dy) < 6) return;
      gest.moved = true;
      it.x = g.x + dx / k; it.y = g.y + dy / k;
    } else if (g.p.length >= 2) {
      gest.moved = true;
      it.w = clamp(g.w * dist(p[0], p[1]) / Math.max(1, dist(g.p[0], g.p[1])), 12, 200);
      it.rot = g.rot + (angle(p[0], p[1]) - angle(g.p[0], g.p[1])) * 180 / Math.PI;
      const m0 = midOf(g.p), m1 = midOf(p);
      it.x = g.x + (m1[0] - m0[0]) / k; it.y = g.y + (m1[1] - m0[1]) / k;
    }
    const n = nodes.get(it.id);
    if (n) place(n, it);
  });
  function endGesture(e) {
    if (!gest || !gest.pts.has(e.pointerId)) return;
    gest.pts.delete(e.pointerId);
    if (gest.pts.size) { baseline(); return; }
    const { it, moved, prev, bg } = gest;
    gest = null;
    posterEl.classList.remove('dragging');
    if (!moved) { if (bg) select(null); return; }
    if (offPage(it)) {
      P.items = P.items.filter(i => i !== it);
      sel = null;
      play('tap');
      toast('أزلتُها من الملصق.');
    }
    renderItems();
    commit(prev);
  }
  posterEl.addEventListener('pointerup', endGesture);
  posterEl.addEventListener('pointercancel', endGesture);
  posterEl.addEventListener('touchstart', (e) => { if (mode === 'move') e.preventDefault(); }, { passive: false });

  // ----- the tray: drag (or tap, then tap the poster) to add -----
  let lastPt = null;
  const track = (e) => { lastPt = [e.clientX, e.clientY]; };
  window.addEventListener('pointermove', track, true);
  window.addEventListener('pointerup', track, true);

  const dnd = createDnD({
    accepts: (from, to) => to.poster === true,
    onDrop(from) {
      const s = srcMap.get(from.key);
      if (!s) return false;
      const r = posterEl.getBoundingClientRect();
      let x = A4.w / 2, y = A4.h / 2;
      if (lastPt && lastPt[0] >= r.left && lastPt[0] <= r.right && lastPt[1] >= r.top && lastPt[1] <= r.bottom) {
        x = (lastPt[0] - r.left) / k; y = (lastPt[1] - r.top) / k;
      }
      const prev = snapshot();
      store.update(() => {
        P.seq += 1;
        P.items.push({ id: 'e' + P.seq, key: s.key, x: clamp(x, 10, A4.w - 10), y: clamp(y, 10, A4.h - 10), w: s.w, rot: 0 });
      });
      sel = 'e' + P.seq;
      renderItems();
      commit(prev);
      return () => {};
    },
  });
  dnd.zone(posterEl, { poster: true });

  const tray = el('div', { class: 'poster-tray', 'aria-label': 'عناصر الملصق' }, sources.map(s => {
    const b = el('div', { class: 'tray-item', role: 'button', 'aria-label': s.label },
      el('img', { src: s.src, alt: '', draggable: 'false' }), el('span', {}, s.label));
    dnd.draggable(b, { data: { key: s.key }, onLift: () => { if (mode !== 'move') setMode('move'); } });
    return b;
  }));

  // ----- drawing straight on the poster -----
  let inkTimer = null;
  const saveInk = () => store.putPage({ id: ID.posterInk(), size: { w: A4.w, h: A4.h }, ruled: false, strokes: ink.strokes, updated: new Date().toISOString() });

  // ----- printing (and its cost) -----
  async function printPoster() {
    play('tap');
    clearTimeout(inkTimer);
    await saveInk();
    const src = await renderPoster(d);
    printWith([el('div', { class: 'sheet', style: { padding: 0 } }, el('img', { src, alt: '', style: { width: '210mm', height: '297mm' } }))]);
    store.update(() => { d.posters += 1; });
    setTimeout(() => toast(`تكلفة إخبار الناس الآن: ${riyals(marketingCost(d))}.`), 400);
  }

  app.replaceChildren(frame('poster', 'اسحبي الأشياء إلى ملصقك. بإصبعين تكبّرينها وتدوّرينها، واسحبيها خارج الورقة لتزيليها.', 'write',
    el('div', { class: 'poster-area' }, tools, stage, tray),
    [printB, next]));

  const ink = mountInk(inkHost, {
    w: A4.w, h: A4.h, ruled: false, paper: 'none', penWidth: 2.4, eraserWidth: 10,
    strokes: inkPage?.strokes, label: 'ارسمي على الملصق',
    onChange: () => {
      if (!undoingInk) hist.push({ t: 'ink' });
      clearTimeout(inkTimer); inkTimer = setTimeout(saveInk, 350);
      refresh();
    },
  });

  const ro = new ResizeObserver(() => {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    k = Math.min(r.width / A4.w, r.height / A4.h);
    posterEl.style.width = Math.floor(A4.w * k) + 'px';
    posterEl.style.height = Math.floor(A4.h * k) + 'px';
    renderItems();
  });
  ro.observe(stage);
  setMode('move');
  refresh();

  return () => {
    ro.disconnect(); ink.destroy();
    window.removeEventListener('pointermove', track, true);
    window.removeEventListener('pointerup', track, true);
    clearTimeout(inkTimer); saveInk();
  };
}

// ---------- 6c (2). Free sample, and what telling people costs ----------
async function sample(app, d) {
  const choices = [...makeData().photos];
  const own = await store.getPage(ID.samplePhoto());
  if (own?.photo) choices.push(ID.samplePhoto());
  const pages = new Map(await Promise.all(choices.map(async id => [id, await store.getPage(id)])));
  const next = primary('التالي', () => advance(d, 'pitch'), { disabled: !d.sample });

  const grid = el('div', { class: 'photos sample-grid' });
  function renderGrid() {
    grid.replaceChildren(
      el('button', { class: 'photo add', onclick: capture },
        el('span', { class: 'big', html: ICON.camera }), el('b', {}, 'صوّري صفحة العيّنة'),
        el('span', { class: 'note' }, 'الصفحة فقط، لا تصوّري الوجوه.')),
      ...choices.map((id, i) => {
        const pg = pages.get(id);
        if (!pg?.photo) return null;
        const on = d.sample === id;
        return el('button', { class: 'photo pick' + (on ? ' on' : ''), 'aria-pressed': String(on), 'aria-label': `العيّنة ${ar(i + 1)}`, onclick: () => choose(id) },
          el('img', { src: pg.photo, alt: '' }), on ? el('span', { class: 'tick', 'aria-hidden': 'true' }, '✓') : null);
      }));
  }
  function choose(id) {
    play('tap');
    store.update(() => { d.sample = id; if (!d.samples) d.samples = 1; });
    renderGrid(); renderCost();
    next.disabled = false;
  }
  function capture() {
    play('tap');
    const input = el('input', { type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' } });
    input.onchange = async () => {
      const f = input.files?.[0];
      input.remove();
      if (!f) return;
      try {
        const url = await shrink(f, 1600);
        const pg = { id: ID.samplePhoto(), photo: url, updated: new Date().toISOString() };
        await store.putPage(pg);
        pages.set(pg.id, pg);
        if (!choices.includes(pg.id)) choices.push(pg.id);
        choose(pg.id);
      } catch (e) { toast('لم أستطع حفظ الصورة.'); }
    };
    document.body.append(input);
    input.click();
  }

  const total = el('b', { class: 'cost-total' });
  const coins = el('div', { class: 'coins-row' });
  function renderCost() {
    const t = marketingCost(d);
    total.textContent = t ? `المجموع: ${riyals(t)}` : 'المجموع: لا شيء بعد';
    coins.replaceChildren(...coinsFor(t).filter(Boolean));
    steppers.replaceChildren(
      el('div', { class: 'cost-line' }, el('span', {}, '🖼️ ملصقات طبعتُها'),
        stepper({ value: d.posters, min: 0, max: 20, label: 'ملصقات طبعتُها', onChange: (v) => { store.update(() => { d.posters = v; }); renderCost(); } })),
      el('div', { class: 'cost-line' }, el('span', {}, '📄 عيّنات أعطيتُها'),
        stepper({ value: d.samples, min: 0, max: 20, label: 'عيّنات أعطيتُها', onChange: (v) => { store.update(() => { d.samples = v; }); renderCost(); } })));
  }
  const steppers = el('div', { class: 'cost-lines' });
  const costCard = el('section', { class: 'card cost-card' },
    el('h3', {}, 'تكلفة إخبار الناس'),
    el('p', { class: 'hint' }, `كل ورقة مطبوعة = ${riyals(PRINT_EACH)}. إخبار الناس يكلّف مالًا أيضًا.`),
    steppers, coins, total);

  renderGrid(); renderCost();
  app.replaceChildren(frame('sample', 'اختاري صفحة من كتابك تكون عيّنة مجانية. العيّنة تجعل الزبون يحبّ منتجك قبل أن يشتريه.', 'think',
    el('div', { class: 'sample-area' }, grid, costCard),
    [next]));
}

// ---------- 6d. My pitch: three lines by hand ----------
const PITCH = ['مرحبًا! صنعتُ ___', 'سيعجبك لأنّ ___', 'سعره ___'];

async function pitch(app, d) {
  const pages = await Promise.all(PITCH.map((_, i) => store.getPage(ID.pitch(i))));
  const all = pages.every(hasInk);
  if (all) starOnce(d, 'pitch');
  app.replaceChildren(frame('pitch', all ? 'كلمتك جاهزة! اقرئيها بصوت واضح.' : 'اكتبي كلمتك القصيرة، سطرًا في كل بطاقة.', all ? 'celebrate' : 'write',
    el('div', { class: 'pitch-lines' }, PITCH.map((t, i) => {
      const ok = hasInk(pages[i]);
      return el('button', { class: 'card pitch-line' + (ok ? ' ok' : ''), onclick: () => { play('tap'); openPage(ID.pitch(i), { title: t, task: 'أكملي السطر بخطّك.', back: 'station/6/pitch' }); } },
        el('span', { class: 'n' }, ar(i + 1)),
        ok ? el('img', { src: renderPage(pages[i], 4), alt: t }) : el('b', {}, t),
        el('span', { class: 'go', html: ICON.pencil }));
    })),
    [primary('التالي', () => advance(d, 'voice'), { disabled: !all })]));
}

// ---------- 6d (2). Record it and play it back ----------
async function voice(app, d) {
  const pages = await Promise.all(PITCH.map((_, i) => store.getPage(ID.pitch(i))));
  let saved = await store.getPage(ID.voice());
  let rec = null, stream = null, actx = null, raf = 0, player = null, timer = 0;

  const fill = el('span', { class: 'fill' });
  const clear = el('span', { class: 'clear-tag' }, 'صوت واضح');
  const meter = el('div', { class: 'meter', 'aria-hidden': 'true' }, el('span', { class: 'zone' }), fill);
  const recB = el('button', { class: 'btn rec' });
  const playB = el('button', { class: 'btn' });
  const status = el('p', { class: 'hint' });

  function render() {
    const on = !!rec;
    recB.replaceChildren(btnIcon(on ? 'stop' : 'mic'), on ? 'أوقفي' : saved ? 'سجّلي من جديد' : 'سجّلي كلمتك');
    recB.classList.toggle('on', on);
    playB.replaceChildren(btnIcon(player && !player.paused ? 'stop' : 'play'), 'استمعي');
    playB.disabled = on || !saved?.audio;
    status.textContent = on ? 'أنا أستمع… تكلّمي بصوت واضح.' : saved?.audio ? 'التسجيل محفوظ هنا في الاستوديو فقط.' : 'تكلّمي بصوت واضح، كأنك تخبرين صديقة.';
  }

  function stopMeter() {
    cancelAnimationFrame(raf);
    fill.style.width = '0%';
    clear.classList.remove('on');
    try { actx?.close(); } catch (e) { /* already closed */ }
    actx = null;
  }
  function startMeter(s) {
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      const an = actx.createAnalyser();
      an.fftSize = 1024;
      actx.createMediaStreamSource(s).connect(an);
      const buf = new Float32Array(an.fftSize);
      let level = 0;
      const tick = () => {
        an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        const now = Math.min(1, Math.sqrt(Math.sqrt(sum / buf.length)) * 2.2);
        level = level * 0.7 + now * 0.3;
        fill.style.width = Math.round(level * 100) + '%';
        clear.classList.toggle('on', level >= 0.4);
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) { /* the meter is a bonus; recording still works */ }
  }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast('لا يوجد ميكروفون هنا. تدرّبي بصوت عالٍ!');
      return;
    }
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { toast('لم أستطع فتح الميكروفون. اطلبي من ماما المساعدة.'); return; }
    const type = ['audio/mp4', 'audio/webm'].find(t => MediaRecorder.isTypeSupported?.(t));
    const chunks = [];
    rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec?.mimeType || type || 'audio/mp4' });
      rec = null;
      stream?.getTracks().forEach(t => t.stop());
      stream = null;
      stopMeter();
      const fr = new FileReader();
      fr.onload = async () => {
        saved = { id: ID.voice(), audio: fr.result, updated: new Date().toISOString() };
        await store.putPage(saved);
        starOnce(d, 'voice');
        render();
      };
      fr.readAsDataURL(blob);
      render();
    };
    rec.start();
    startMeter(stream);
    clearTimeout(timer);
    timer = setTimeout(() => rec?.stop(), 60000); // one minute is plenty for three lines
    render();
  }
  recB.onclick = () => {
    play('tap');
    if (player && !player.paused) player.pause();
    if (rec) { clearTimeout(timer); rec.stop(); } else start();
  };
  playB.onclick = () => {
    play('tap');
    if (!saved?.audio) return;
    if (player && !player.paused) { player.pause(); render(); return; }
    player = new Audio(saved.audio);
    player.onended = player.onpause = render;
    player.play().catch(() => toast('لم أستطع تشغيل التسجيل.'));
    render();
  };

  render();
  app.replaceChildren(frame('voice', 'اقرئي كلمتك بصوت عالٍ وسجّليها، ثم استمعي إليها.', 'celebrate',
    el('div', { class: 'voice-area' },
      el('div', { class: 'script' }, pages.map((pg, i) => hasInk(pg) ? el('img', { src: renderPage(pg, 3), alt: PITCH[i] }) : el('b', {}, PITCH[i]))),
      el('div', { class: 'card voice-card' },
        el('div', { class: 'meter-row' }, meter, clear),
        el('div', { class: 'row' }, recB, playB),
        status)),
    [primary('التالي', () => advance(d, 'ladder'))]));

  return () => {
    clearTimeout(timer);
    try { if (rec && rec.state !== 'inactive') { rec.onstop = null; rec.stop(); } } catch (e) { /* ignore */ }
    stream?.getTracks().forEach(t => t.stop());
    stopMeter();
    player?.pause();
  };
}

// ---------- 6d (3). Practice ladder ----------
const RUNGS = [
  { who: 'ماما', icon: '👩' },
  { who: 'بابا', icon: '👨' },
  { who: 'أختي', icon: '👧' },
  { who: 'صديقة أو قريبة', icon: '🧒' }, // the first person outside the family → badge
];

function ladder(app, d) {
  const list = el('ol', { class: 'ladder' });
  const next = primary('التالي', () => advance(d, 'care'));
  function render() {
    list.replaceChildren(...RUNGS.map((r, i) => {
      const doneR = i < d.ladder, now = i === d.ladder, last = i === d.ladder - 1;
      const b = el('button', {
        class: 'rung' + (doneR ? ' done' : now ? ' now' : ''),
        disabled: !(now || last) || null,
        'aria-pressed': String(doneR),
        'aria-label': doneR ? `قدّمتُ عرضي لـ${r.who}` : `قدّمي عرضك لـ${r.who}`,
      },
        el('span', { class: 'who', 'aria-hidden': 'true' }, r.icon),
        el('b', {}, r.who),
        el('span', { class: 'mark' }, doneR ? '✓' : now ? 'اضغطي بعد العرض' : ''));
      b.onclick = () => {
        play('tap');
        if (now) {
          store.update(() => { d.ladder += 1; });
          award(1);
          if (d.ladder === RUNGS.length) setTimeout(() => awardBadge('pitch'), 300);
        } else if (last) {
          store.update(() => { d.ladder -= 1; });
          unaward(1);
        }
        render();
      };
      return el('li', {}, b);
    }));
    next.disabled = d.ladder < 1;
  }
  render();
  app.replaceChildren(frame('ladder', 'تدرّبي على كلمتك درجة درجة. كل مرة تقدّمين فيها عرضك، اضغطي درجتها.', 'wave',
    el('div', { class: 'center-col' }, list),
    [next]));
}

// ---------- 6e. Caring for customers ----------
const CARE = [
  { icon: '😊', text: 'ابتسمي وانظري إلى الشخص.' },
  { icon: '🙏', text: 'قولي شكرًا، حتى لو لم يشترِ.' },
  { icon: '✅', text: 'قولي الحقيقة عن منتجك، ولا تبالغي.' },
];

function care(app, d) {
  const next = primary('التالي', () => advance(d, 'where'), { disabled: d.flipped.length < CARE.length });
  const cards = CARE.map((c, i) => {
    const b = el('button', { class: 'flip', 'aria-pressed': 'false', 'aria-label': `بطاقة ${ar(i + 1)}` },
      el('span', { class: 'face front' }, el('span', { class: 'big' }, c.icon), el('span', {}, 'اقلبيني')),
      el('span', { class: 'face back' }, el('span', { class: 'big' }, c.icon), el('b', {}, c.text)));
    b.onclick = () => {
      play('tap');
      b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
      if (!d.flipped.includes(i)) {
        store.update(() => { d.flipped.push(i); });
        if (d.flipped.length === CARE.length) { next.disabled = false; starOnce(d, 'care'); }
      }
    };
    return b;
  });
  app.replaceChildren(frame('care', 'كيف أعامل زبوني؟ اقلبي البطاقات الثلاث.', 'think',
    el('div', { class: 'care-area' },
      el('div', { class: 'flips' }, cards),
      el('p', { class: 'big-line care-line' }, 'الصدق في البيع يجلب البركة.'),
      el('p', { class: 'hint' }, 'إذا قال الزبون «لا»، فلا بأس. لا نُلحّ على أحد.')),
    [next]));
}

// ---------- 6f. Where I tell people ----------
const PLACES = [
  { key: 'family', icon: '👪', name: 'تجمّع العائلة' },
  { key: 'neighbours', icon: '🏡', name: 'الجيران' },
  { key: 'friends', icon: '🏫', name: 'صديقاتي', school: true },
  { key: 'online', icon: '📱', name: 'على الإنترنت', note: 'ماما تنشره' },
];
export const placeName = (key) => PLACES.find(p => p.key === key)?.name || '';

function where(app, d) {
  const schoolOk = () => !!store.get().parent?.schoolOk;
  const pool = el('div', { class: 'place-pool', 'aria-label': 'الأماكن' });
  const planList = el('div', { class: 'place-list' });
  const planBox = el('section', { class: 'plan-box', 'aria-label': 'خطتي لأُخبِر الناس' }, el('h3', {}, '📋 خطتي لأُخبِر الناس'), planList);
  const undoBtn = el('button', { class: 'btn side', disabled: true, onclick: () => dnd.undo() }, btnIcon('undo'), 'تراجع');
  const next = primary('التالي', () => { starOnce(d, 'where'); advance(d, d.plan.includes('online') ? 'online' : 'done'); });

  const dnd = createDnD({
    accepts: (from, to) => from.inPlan !== to.plan,
    onDrop(from, to) {
      const before = [...d.plan];
      store.update(() => { d.plan = to.plan ? [...d.plan, from.key] : d.plan.filter(k => k !== from.key); });
      render();
      return () => { store.update(() => { d.plan = before; }); render(); };
    },
    onHistory: (n) => { undoBtn.disabled = n === 0; },
  });
  dnd.zone(planBox, { plan: true });
  dnd.zone(pool, { plan: false });

  function card(p, inPlan) {
    const locked = p.school && !schoolOk();
    const c = el('div', { class: 'place' + (locked ? ' locked' : ''), role: 'button', 'aria-label': p.name + (locked ? '، مقفل' : '') },
      el('span', { class: 'big', 'aria-hidden': 'true' }, p.icon),
      el('b', {}, p.name),
      p.note ? el('span', { class: 'note' }, p.note) : null,
      locked ? el('span', { class: 'note' }, '🔒 بعد موافقة ماما') : null);
    dnd.draggable(c, {
      data: { key: p.key, inPlan },
      canPick: () => !locked,
      onDeny: () => toast('اسألي ماما أولًا إن كانت المدرسة تسمح.'),
    });
    return c;
  }
  function render() {
    pool.replaceChildren(...PLACES.filter(p => !d.plan.includes(p.key)).map(p => card(p, false)));
    const chosen = PLACES.filter(p => d.plan.includes(p.key));
    planList.replaceChildren(...(chosen.length ? chosen.map(p => card(p, true)) : [el('p', { class: 'hint' }, 'اسحبي الأماكن إلى هنا.')]));
    next.disabled = !chosen.length;
  }
  render();
  app.replaceChildren(frame('where', 'أين ستُخبرين الناس عن منتجك؟ اسحبي الأماكن إلى خطتك.', 'think',
    el('div', { class: 'where-area' }, pool, planBox),
    [undoBtn, next]));
}

// ---------- 6f (2). A photo and one line for Mama to post ----------
const TIPS = [['☀️', 'ضوء جميل'], ['⬜', 'خلفية سادة'], ['📘', 'المنتج فقط'], ['🚫', 'بلا وجوه']];

async function online(app, d) {
  const [photo, line] = await Promise.all([store.getPage(ID.onlinePhoto()), store.getPage(ID.onlineLine())]);
  const ok = !!photo?.photo && hasInk(line);
  if (ok) starOnce(d, 'online');
  function capture() {
    play('tap');
    const input = el('input', { type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' } });
    input.onchange = async () => {
      const f = input.files?.[0];
      input.remove();
      if (!f) return;
      try {
        await store.putPage({ id: ID.onlinePhoto(), photo: await shrink(f, 1600), updated: new Date().toISOString() });
        online(app, d);
      } catch (e) { toast('لم أستطع حفظ الصورة.'); }
    };
    document.body.append(input);
    input.click();
  }
  app.replaceChildren(frame('online', ok ? 'جاهز! ماما تنشره لكِ.' : 'صوّري منتجك، واكتبي سطرًا قصيرًا عنه. ماما تنشره لكِ.', ok ? 'celebrate' : 'write',
    el('div', { class: 'online-area' },
      el('div', { class: 'tips' }, TIPS.map(([i, t]) => el('span', { class: 'tip-chip' }, el('span', { 'aria-hidden': 'true' }, i), t))),
      el('div', { class: 'pair' },
        photo?.photo
          ? el('button', { class: 'card page-card ok', onclick: capture }, el('b', {}, 'صورتي'), el('img', { src: photo.photo, alt: 'صورة المنتج' }), el('span', { class: 'btn' }, btnIcon('camera'), 'صوّري من جديد'))
          : el('button', { class: 'card page-card', onclick: capture }, el('b', {}, 'صورتي'), el('span', { class: 'big', html: ICON.camera }), el('span', { class: 'btn' }, btnIcon('camera'), 'صوّري منتجك')),
        pageCard('وصف قصير', line, () => openPage(ID.onlineLine(), { title: 'وصف قصير', task: 'اكتبي سطرًا قصيرًا عن منتجك.', back: 'station/6/online' })))),
    [primary('التالي', () => advance(d, 'done'), { disabled: !ok })]));
}

// ---------- Done ----------
async function done(app, d) {
  const first = !store.get().current.stationsDone.includes(6);
  if (first) store.update(s => { s.current.stationsDone.push(6); });
  const [name, logo] = await Promise.all([store.getPage(ID.brand()), logoNow()]);
  const places = d.plan.map(placeName).join('، ');
  const cost = marketingCost(d);
  app.replaceChildren(frame('done', 'أحسنتِ! الناس سيعرفون عن منتجك.', 'celebrate',
    el('div', { class: 'center-col' },
      el('div', { class: 'card name-card' },
        el('div', { class: 'brand-row' },
          logo ? el('img', { src: logo.src, alt: 'شعاري' }) : null,
          hasInk(name) ? el('img', { src: inkImage(name.strokes, name.size), alt: 'اسم علامتي' }) : null),
        el('p', { class: 'big-line' }, `تدرّبتِ على كلمتك ${d.ladder === 1 ? 'مرة واحدة' : d.ladder === 2 ? 'مرتين' : `${ar(d.ladder)} مرات`}.`),
        places ? el('p', { class: 'big-line' }, `خطتك لإخبار الناس: ${places}.`) : null,
        el('p', { class: 'hint' }, cost ? `تكلفة إخبار الناس: ${riyals(cost)}.` : 'لم تطبعي شيئًا بعد.'))),
    [primary('إلى الطريق', () => { location.hash = 'home'; })]));
  if (first) { celebrate(); award(1); }
}
