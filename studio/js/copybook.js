// The copybook: a French Seyès page (grands carreaux), margin on the RIGHT for Arabic,
// two pens (green, black), eraser, undo/redo, clear, "Pencil only", printing.
// Design pages (logo, poster) are blank white paper and also allow pink and yellow.
// Strokes are stored in millimetres so the page looks the same in both orientations.
import * as store from './store.js';
import { el, ICON, art, topbar, screen, primary, confirmBox, toast } from './ui.js';
import { play } from './sound.js';

export const INK = { green: '#1F8A4C', black: '#231A22', pink: '#E8679B', yellow: '#F2BE22' };
export const DESIGN_PENS = ['pink', 'yellow', 'green', 'black'];
const DESIGN_PAPER = '#FFFFFF';
const LINE_MAIN = '#9AA6DB';
const LINE_THIN = '#D2D7F0';
const LINE_VERT = '#BCC4EA';
const MARGIN = '#E8837E';
const PAPER = '#FFF8EC';
const PLUM = '#4A2E45';

export const PAGE = { w: 200, h: 150, title: 16, margin: 24 }; // mm

// ---------- Seyès ruling ----------
export function drawSeyes(ctx, k, w, h, top, margin) {
  ctx.save();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w * k, h * k);
  const hair = Math.max(0.6, k * 0.12);
  // thin lines every 2 mm, main lines every 8 mm
  for (let y = top; y <= h + 0.01; y += 2) {
    const main = Math.abs((y - top) % 8) < 0.01;
    ctx.strokeStyle = main ? LINE_MAIN : LINE_THIN;
    ctx.lineWidth = main ? hair * 1.6 : hair;
    ctx.beginPath();
    ctx.moveTo(0, y * k); ctx.lineTo(w * k, y * k);
    ctx.stroke();
  }
  // vertical lines every 8 mm, left of the margin (Arabic writes right to left)
  const mx = w - margin;
  ctx.strokeStyle = LINE_VERT; ctx.lineWidth = hair * 1.2;
  for (let x = mx - 8; x > 0; x -= 8) {
    ctx.beginPath(); ctx.moveTo(x * k, top * k); ctx.lineTo(x * k, h * k); ctx.stroke();
  }
  // red margin line on the right
  ctx.strokeStyle = MARGIN; ctx.lineWidth = hair * 2;
  ctx.beginPath(); ctx.moveTo(mx * k, 0); ctx.lineTo(mx * k, h * k); ctx.stroke();
  ctx.restore();
}

// ---------- Strokes ----------
function drawStroke(ctx, s, k, from = 0) {
  const p = s.pts;
  if (!p.length) return;
  ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = ctx.fillStyle = s.tool === 'eraser' ? '#000' : INK[s.color];
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const wid = (q) => s.w * k * (s.pen ? 0.55 + 0.9 * q[2] : 1);
  if (p.length === 1) {
    ctx.beginPath(); ctx.arc(p[0][0] * k, p[0][1] * k, wid(p[0]) / 2, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  for (let i = Math.max(1, from); i < p.length; i++) {
    const a = i === 1 ? p[0] : mid(p[i - 2], p[i - 1]);
    const b = i === p.length - 1 && s.done ? p[i] : mid(p[i - 1], p[i]);
    ctx.lineWidth = wid(p[i - 1]);
    ctx.beginPath();
    ctx.moveTo(a[0] * k, a[1] * k);
    ctx.quadraticCurveTo(p[i - 1][0] * k, p[i - 1][1] * k, b[0] * k, b[1] * k);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawTitle(ctx, k, w, title, size) {
  if (!title) return;
  ctx.save();
  ctx.fillStyle = PLUM;
  ctx.font = `700 ${size * k}px 'Baloo Bhaijaan 2', Tajawal, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.fillText(title, (w / 2) * k, (PAGE.title / 2 + 1) * k);
  ctx.restore();
}

// Renders a full page (lines + title + ink) to a PNG data URL.
// opts.lines = false draws plain paper (used for small idea-card thumbnails).
export function renderPage(page, pxPerMm = 12, opts = {}) {
  const { w, h, top, margin } = page.size || { w: PAGE.w, h: PAGE.h, top: PAGE.title, margin: PAGE.margin };
  const bg = document.createElement('canvas');
  bg.width = w * pxPerMm; bg.height = h * pxPerMm;
  const c = bg.getContext('2d');
  if (page.ruled !== false && opts.lines !== false) drawSeyes(c, pxPerMm, w, h, top, margin);
  else { c.fillStyle = opts.paper || page.paper || PAPER; c.fillRect(0, 0, bg.width, bg.height); }
  if (opts.title !== false) drawTitle(c, pxPerMm, w, page.title, 6);
  const ink = document.createElement('canvas');
  ink.width = bg.width; ink.height = bg.height;
  const ic = ink.getContext('2d');
  for (const s of page.strokes || []) drawStroke(ic, { ...s, done: true }, pxPerMm);
  c.drawImage(ink, 0, 0);
  return bg.toDataURL('image/png');
}

// Just the ink, trimmed, on a transparent background (handwritten name, logo on the poster).
export function inkImage(strokes, size, scale = 6) {
  const pad = 2;
  const pts = (strokes || []).filter(s => s.tool !== 'eraser').flatMap(s => s.pts);
  if (!pts.length) return null;
  const x0 = Math.max(0, Math.min(...pts.map(p => p[0])) - pad), x1 = Math.min(size.w, Math.max(...pts.map(p => p[0])) + pad);
  const y0 = Math.max(0, Math.min(...pts.map(p => p[1])) - pad), y1 = Math.min(size.h, Math.max(...pts.map(p => p[1])) + pad);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil((x1 - x0) * scale)); c.height = Math.max(1, Math.ceil((y1 - y0) * scale));
  const x = c.getContext('2d');
  x.translate(-x0 * scale, -y0 * scale);
  for (const s of strokes) drawStroke(x, { ...s, done: true }, scale);
  return c.toDataURL('image/png');
}

// Draws strokes (in mm) onto any canvas context at k px per mm.
export function drawStrokes(ctx, strokes, k) {
  for (const s of strokes || []) drawStroke(ctx, { ...s, done: true }, k);
}

// ---------- The ink pad (reused by the copybook and the name pad) ----------
export function mountInk(host, opts = {}) {
  const size = {
    w: opts.w ?? PAGE.w, h: opts.h ?? PAGE.h,
    top: opts.top ?? (opts.title ? PAGE.title : 4), margin: opts.margin ?? PAGE.margin,
  };
  const ruled = opts.ruled !== false;
  const paper = opts.paper || PAPER; // 'none' leaves the page see-through (drawing over the poster)
  let strokes = opts.strokes ? opts.strokes.map(s => ({ ...s, done: true })) : [];
  const history = [];
  const redoStack = [];
  let tool = 'pen', color = opts.color || 'black';
  let k = 1, cur = null, activeId = null;

  const page = el('div', { class: 'page' });
  const bgC = el('canvas', { 'aria-hidden': 'true' });
  const inkC = el('canvas', { 'aria-label': opts.label || 'صفحة الكتابة', role: 'img' });
  const titleEl = opts.title ? el('div', { class: 'page-title' }, opts.title) : null;
  page.append(bgC, inkC);
  if (titleEl) page.append(titleEl);
  host.replaceChildren(page);
  const bctx = bgC.getContext('2d');
  const ictx = inkC.getContext('2d');

  function layout() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    k = Math.min(r.width / size.w, r.height / size.h);
    const cw = Math.floor(size.w * k), ch = Math.floor(size.h * k);
    page.style.width = cw + 'px'; page.style.height = ch + 'px';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [bgC, inkC]) { c.width = cw * dpr; c.height = ch * dpr; }
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ictx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (ruled) drawSeyes(bctx, k, size.w, size.h, size.top, size.margin);
    else if (paper === 'none') bctx.clearRect(0, 0, cw, ch);
    else { bctx.fillStyle = paper; bctx.fillRect(0, 0, cw, ch); }
    if (titleEl) {
      titleEl.style.height = (PAGE.title * k) + 'px';
      titleEl.style.fontSize = Math.max(16, 6 * k) + 'px';
    }
    redraw();
  }

  function redraw() {
    ictx.save();
    ictx.setTransform(1, 0, 0, 1, 0, 0);
    ictx.clearRect(0, 0, inkC.width, inkC.height);
    ictx.restore();
    for (const s of strokes) drawStroke(ictx, s, k);
    if (cur) drawStroke(ictx, cur, k);
  }

  const ro = new ResizeObserver(layout);
  ro.observe(host);

  function pt(e) {
    const r = inkC.getBoundingClientRect();
    const pen = e.pointerType === 'pen';
    return [
      Math.round(((e.clientX - r.left) / k) * 100) / 100,
      Math.round(((e.clientY - r.top) / k) * 100) / 100,
      pen ? Math.round((e.pressure || 0.5) * 100) / 100 : 0.5,
    ];
  }

  function allowed(e) {
    if (e.pointerType === 'pen') {
      if (store.get().pencilOnly === null) {
        store.update(s => { s.pencilOnly = true; });
        opts.onPencil?.();
      }
      return true;
    }
    return !store.get().pencilOnly;
  }

  inkC.addEventListener('pointerdown', (e) => {
    if (activeId !== null || !allowed(e)) return;
    e.preventDefault();
    activeId = e.pointerId;
    try { inkC.setPointerCapture(e.pointerId); } catch (err) { /* not critical */ }
    cur = {
      tool, color, pen: e.pointerType === 'pen',
      w: tool === 'eraser' ? (opts.eraserWidth || 5) : (opts.penWidth || 0.8),
      pts: [pt(e)],
    };
    drawStroke(ictx, cur, k);
  });

  inkC.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activeId || !cur) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    const from = cur.pts.length;
    for (const ce of (evs.length ? evs : [e])) {
      const q = pt(ce);
      const last = cur.pts[cur.pts.length - 1];
      if (Math.hypot(q[0] - last[0], q[1] - last[1]) < 0.15) continue;
      cur.pts.push(q);
    }
    if (cur.pts.length > from) drawStroke(ictx, cur, k, from);
  });

  function end(e) {
    if (e.pointerId !== activeId) return;
    activeId = null;
    if (!cur) return;
    cur.done = true;
    strokes.push(cur);
    history.push({ t: 'add', s: cur });
    redoStack.length = 0;
    cur = null;
    redraw();
    changed();
  }
  inkC.addEventListener('pointerup', end);
  inkC.addEventListener('pointercancel', end);
  // Stop the page from scrolling or zooming while she writes.
  inkC.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

  function changed() { opts.onChange?.(api); }

  const api = {
    el: page,
    get strokes() { return strokes.map(({ done, ...s }) => s); },
    get size() { return size; },
    isEmpty: () => !strokes.some(s => s.tool !== 'eraser'),
    canUndo: () => history.length > 0,
    canRedo: () => redoStack.length > 0,
    setTool(t, c) { tool = t; if (c) color = c; },
    undo() {
      const op = history.pop(); if (!op) return;
      if (op.t === 'add') strokes.pop(); else strokes = op.prev;
      redoStack.push(op); redraw(); changed();
    },
    redo() {
      const op = redoStack.pop(); if (!op) return;
      if (op.t === 'add') strokes.push(op.s); else { op.prev = strokes; strokes = []; }
      history.push(op); redraw(); changed();
    },
    clear() {
      if (!strokes.length) return;
      history.push({ t: 'clear', prev: strokes });
      strokes = []; redoStack.length = 0; redraw(); changed();
    },
    toPNG(px = 8) { return renderPage({ size, ruled, paper, title: opts.title, strokes }, px); },
    inkPNG() { return inkImage(strokes, size); },
    destroy() { ro.disconnect(); },
  };
  requestAnimationFrame(layout);
  return api;
}

// ---------- Printing ----------
export function printWith(nodes) {
  const root = document.getElementById('print-root');
  root.replaceChildren(...nodes);
  const imgs = [...root.querySelectorAll('img')];
  Promise.all(imgs.map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })))
    .then(() => setTimeout(() => window.print(), 60));
}

export function printPage(page) {
  const src = renderPage(page, 12);
  const w = (page.size?.w || PAGE.w);
  printWith([el('div', { class: 'sheet' }, el('img', { src, style: { width: w + 'mm' } }))]);
}

export function blankSeyesSVG() {
  const W = 210, H = 297, top = 20, margin = 30;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">`;
  s += `<rect width="${W}" height="${H}" fill="#fff"/>`;
  for (let y = top; y <= H - 10; y += 2) {
    const main = (y - top) % 8 === 0;
    s += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="${main ? LINE_MAIN : LINE_THIN}" stroke-width="${main ? 0.25 : 0.12}"/>`;
  }
  for (let x = W - margin - 8; x > 0; x -= 8) s += `<line x1="${x}" x2="${x}" y1="${top}" y2="${H - 10}" stroke="${LINE_VERT}" stroke-width="0.15"/>`;
  s += `<line x1="${W - margin}" x2="${W - margin}" y1="0" y2="${H}" stroke="${MARGIN}" stroke-width="0.35"/>`;
  return s + '</svg>';
}

export function printBlank(count = 4) {
  const nodes = [];
  for (let i = 0; i < count; i++) {
    const sheet = el('div', { class: 'sheet', style: { padding: 0 } });
    sheet.innerHTML = blankSeyesSVG();
    nodes.push(sheet);
  }
  printWith(nodes);
}

// ---------- The copybook screen ----------
// route: #copybook/<pageId>?title=...&back=<route>&accent=pink
// Size presets: the full page, or a small "card" page for one idea.
const SIZES = { card: { w: 120, h: 80, margin: 16 }, logo: { w: 120, h: 120, margin: 0 } };

export async function copybookScreen(app, { id, title = '', back = 'home', accent = 'pink', size = '', task = '', refs = '', design = '' }) {
  const isDesign = design === '1';
  const saved = await store.getPage(id);
  const pageTitle = saved?.title || title;
  const refPages = (await Promise.all(refs.split(',').filter(Boolean).map(r => store.getPage(r)))).filter(Boolean);

  let ink;
  let saveTimer = null;
  const flush = () => {
    clearTimeout(saveTimer);
    return store.putPage({ id, title: pageTitle, size: ink.size, strokes: ink.strokes, updated: new Date().toISOString(),
      ...(isDesign ? { ruled: false, paper: DESIGN_PAPER } : {}) });
  };
  const persist = () => { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 350); };

  const PEN_NAMES = { green: 'القلم الأخضر', black: 'القلم الأسود', pink: 'القلم الوردي', yellow: 'القلم الأصفر' };
  const pens = {};
  for (const c of isDesign ? DESIGN_PENS : ['green', 'black']) {
    pens[c] = toolBtn('pen', PEN_NAMES[c], el('span', { class: 'ink', style: { '--ink': INK[c] } }));
  }
  const eraser = toolBtn('eraser', 'الممحاة', null, ICON.eraser);
  const undoB = toolBtn('undo', 'تراجع', null, ICON.undo);
  const moreB = toolBtn('more', 'المزيد', null, ICON.more);

  function toolBtn(kind, label, child, html) {
    const b = el('button', { class: 'tool' + (kind === 'pen' ? ' pen' : ''), 'aria-label': label, title: label, html: html || null });
    if (child) b.append(child);
    return b;
  }
  function select(which) {
    for (const [c, b] of Object.entries(pens)) b.setAttribute('aria-pressed', String(which === c));
    eraser.setAttribute('aria-pressed', String(which === 'eraser'));
    if (which === 'eraser') ink.setTool('eraser'); else ink.setTool('pen', which);
  }
  function refresh() { undoB.disabled = !ink.canUndo(); }

  for (const [c, b] of Object.entries(pens)) b.onclick = () => { play('tap'); select(c); };
  eraser.onclick = () => { play('tap'); select('eraser'); };
  undoB.onclick = () => { play('tap'); ink.undo(); };

  const stage = el('div', { class: 'cb-stage' });
  const tools = el('div', { class: 'cb-tools', role: 'toolbar', 'aria-label': 'أدوات الكتابة' },
    ...Object.values(pens), eraser, el('i', { class: 'sep' }), undoB, moreB);

  moreB.onclick = (e) => {
    play('tap');
    openMenu(moreB, [
      { icon: ICON.redo, label: 'إعادة', disabled: !ink.canRedo(), run: () => ink.redo() },
      { icon: ICON.pencil, label: 'القلم فقط', toggle: !!store.get().pencilOnly,
        run: () => store.update(s => { s.pencilOnly = !s.pencilOnly; }) },
      { icon: ICON.print, label: 'اطبعي هذه الصفحة', run: () => printPage({ title: pageTitle, size: ink.size, strokes: ink.strokes, ...(isDesign ? { ruled: false, paper: DESIGN_PAPER } : {}) }) },
      isDesign ? null : { icon: ICON.book, label: 'اطبعي صفحات فارغة', run: () => printBlank(4) },
      { icon: ICON.trash, label: 'امسحي الصفحة', run: async () => {
        if (await confirmBox('هل تمسحين الصفحة كلها؟', 'نعم، امسحي')) ink.clear();
      } },
    ]);
  };

  const view = screen(accent,
    topbar({ title: isDesign ? 'صفحة التصميم' : 'دفتري', back: () => { location.hash = back; } }),
    el('section', { class: 'task' },
      art('mascot_write.png', { alt: '' }),
      el('div', {},
        el('p', {}, task || 'اكتبي في دفترك بخطّك الجميل.'),
        refPages.length
          ? el('div', { class: 'refs' }, refPages.map((r, i) => [i ? el('b', {}, '+') : null,
              el('img', { src: renderPage(r, 3, { lines: false, title: false, paper: '#FFFFFF' }), alt: 'فكرة' })]))
          : isDesign
            ? el('span', { class: 'tip' }, 'صفحة التصميم: كل الألوان مسموحة 🎨')
            : el('span', { class: 'tip' }, 'العنوان بالقلم ', el('span', { class: 'g' }, 'الأخضر'), ' والكتابة بالقلم ', el('span', { class: 'b' }, 'الأسود')),
      ),
    ),
    el('main', { class: 'work' }, el('div', { class: 'cb-area' }, tools, stage)),
    el('footer', { class: 'actions' }, primary('انتهيتُ', async () => { await flush(); location.hash = back; })),
  );
  view.classList.add('copybook');
  app.replaceChildren(view);

  ink = mountInk(stage, {
    ...(saved?.size || SIZES[size] || {}),
    ...(isDesign ? { ruled: false, paper: DESIGN_PAPER, penWidth: 1.6 } : {}),
    title: pageTitle,
    strokes: saved?.strokes,
    label: pageTitle || 'صفحة الدفتر',
    onChange: () => { refresh(); persist(); },
    onPencil: () => toast('وجدتُ القلم! الكتابة الآن بالقلم فقط.'),
  });
  select(isDesign ? 'pink' : 'black');
  refresh();
  window.addEventListener('pagehide', flush, { once: true });
  return () => { flush(); ink.destroy(); };
}

function openMenu(anchor, items) {
  document.querySelectorAll('.menu-scrim').forEach(m => m.remove());
  const scrim = el('div', { class: 'menu-scrim', style: { position: 'fixed', inset: 0, zIndex: 19 } });
  const menu = el('div', { class: 'menu', role: 'menu' });
  for (const it of items.filter(Boolean)) {
    const b = el('button', { role: 'menuitem', disabled: it.disabled || null, style: it.disabled ? { opacity: .4 } : null, html: it.icon || '' });
    b.append(el('span', {}, it.label));
    if ('toggle' in it) b.append(el('span', { class: 'switch' + (it.toggle ? ' on' : '') }));
    b.onclick = () => { play('tap'); close(); it.run(); };
    menu.append(b);
  }
  const close = () => scrim.remove();
  scrim.onclick = (e) => { if (e.target === scrim) close(); };
  scrim.append(menu);
  document.body.append(scrim);
  const r = anchor.getBoundingClientRect();
  const mw = 300;
  let left = r.left + r.width / 2 - mw / 2;
  left = Math.max(16, Math.min(left, innerWidth - mw - 16));
  let top = r.bottom + 8;
  menu.style.width = mw + 'px';
  menu.style.left = left + 'px';
  requestAnimationFrame(() => {
    const h = menu.offsetHeight;
    if (top + h > innerHeight - 16) top = Math.max(16, r.top - h - 8);
    menu.style.top = top + 'px';
  });
  menu.querySelectorAll('svg').forEach(s => { s.style.width = '24px'; s.style.height = '24px'; s.style.flex = 'none'; });
}

