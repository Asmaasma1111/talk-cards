/* كرّاس الإملاء: the writing space. A canvas over the copybook ruling (the Seyès lines and the red margin are CSS, see
   .seyes in dict.css: 42 px squares, three faint lines in each, a darker line on top, faint verticals, red margin on the right).
   Finger or Apple Pencil. Once a pencil is seen, only the pencil writes (her palm and fingers do nothing; in the tall text
   page a finger scrolls); before that, a large touch (a palm) is ignored. Blue ink by default; green and black in the tray.
   Undo, eraser, clear. A tall pad (the text dictation) grows and scrolls down as she writes.
   export() gives a small PNG (about 600 px wide) of the ink only, for her copybook and the parent view's gallery. */
(function (KD) {
'use strict';
const { el, icon } = KD.ui;
const INK = { blue: '#1E4FB8', green: '#1F8A4C', black: '#22202A' };
const SQ = 42;   // the square size, the same as --sq in dict.css
const PALM = 34;          // a touch wider than this (px) is a palm, not a finger

function create(host, opts = {}) {
  const prefs = () => KD.store.get().prefs;
  const tall = !!opts.tall;
  host.classList.add('pad'); if (!opts.plain) host.classList.add('seyes'); if (tall) host.classList.add('tall');
  const sheet = el('div', { class: 'pad-sheet' });
  const cv = el('canvas', { class: 'pad-ink' });
  sheet.append(cv); host.replaceChildren(sheet);
  const ctx = cv.getContext('2d');
  let strokes = [], undone = [], cur = null, activeId = null, color = prefs().pen || 'blue', tool = 'pen';
  let W = 0, H = 0, dpr = 1;

  function size() {
    const r = host.getBoundingClientRect();
    if (!r.width) return;
    W = Math.floor(r.width);
    const need = tall ? Math.max(r.height * 1.6, contentBottom() + SQ * 6) : r.height;
    H = Math.ceil(need / SQ) * SQ;
    sheet.style.height = H + 'px';
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }
  const contentBottom = () => strokes.reduce((m, s) => Math.max(m, ...s.pts.map(p => p[1])), 0);
  function drawStroke(c, s, k = 1) {
    const p = s.pts; if (!p.length) return;
    c.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
    c.strokeStyle = c.fillStyle = s.tool === 'eraser' ? '#000' : INK[s.color] || INK.blue;
    c.lineCap = 'round'; c.lineJoin = 'round';
    const wid = q => s.w * k * (s.pen ? 0.6 + 0.8 * q[2] : 1);
    if (p.length === 1) { c.beginPath(); c.arc(p[0][0] * k, p[0][1] * k, wid(p[0]) / 2, 0, Math.PI * 2); c.fill(); c.globalCompositeOperation = 'source-over'; return; }
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    for (let i = 1; i < p.length; i++) {
      const a = i === 1 ? p[0] : mid(p[i - 2], p[i - 1]);
      const b = i === p.length - 1 ? p[i] : mid(p[i - 1], p[i]);
      c.lineWidth = wid(p[i - 1]);
      c.beginPath(); c.moveTo(a[0] * k, a[1] * k); c.quadraticCurveTo(p[i - 1][0] * k, p[i - 1][1] * k, b[0] * k, b[1] * k); c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
  }
  function redraw() {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.restore();
    strokes.forEach(s => drawStroke(ctx, s)); if (cur) drawStroke(ctx, cur);
  }
  const pt = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) * 10) / 10, Math.round((e.clientY - r.top) * 10) / 10, e.pointerType === 'pen' ? (e.pressure || 0.5) : 0.5]; };
  function allowed(e) {
    if (e.pointerType === 'pen') {
      if (prefs().pencilOnly == null) { prefs().pencilOnly = true; KD.store.save(); host.classList.add('pencil'); }
      return true;
    }
    if (prefs().pencilOnly) return false;                                          // the pencil is in use: her hand never draws
    if (e.pointerType === 'touch' && Math.max(e.width || 0, e.height || 0) > PALM) return false;   // a palm
    return true;
  }
  if (prefs().pencilOnly) host.classList.add('pencil');

  cv.addEventListener('pointerdown', e => {
    if (activeId !== null || !allowed(e)) return;
    e.preventDefault();
    activeId = e.pointerId;
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    cur = { tool, color, pen: e.pointerType === 'pen', w: tool === 'eraser' ? 22 : 3.4, pts: [pt(e)] };
    drawStroke(ctx, cur);
  });
  cv.addEventListener('pointermove', e => {
    if (e.pointerId !== activeId || !cur) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ce of (evs.length ? evs : [e])) {
      const q = pt(ce), l = cur.pts[cur.pts.length - 1];
      if (Math.hypot(q[0] - l[0], q[1] - l[1]) >= 0.6) cur.pts.push(q);
    }
    redraw();
  });
  function end(e) {
    if (e.pointerId !== activeId) return;
    activeId = null; if (!cur) return;
    strokes.push(cur); undone = []; const last = cur; cur = null; redraw();
    if (tall) follow(last);
    if (opts.onChange) opts.onChange();
  }
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  // no page scrolling or zooming while she writes (in the tall page with a pencil, a finger may scroll)
  cv.addEventListener('touchstart', e => { if (!(tall && prefs().pencilOnly && e.touches[0] && e.touches[0].touchType !== 'stylus')) e.preventDefault(); }, { passive: false });

  // the text page scrolls down as she writes: a stroke in the lower part moves the page up by three lines
  function follow(s) {
    const y = Math.max(...s.pts.map(p => p[1]));
    if (y > H - SQ * 5) size();
    const view = host.clientHeight, top = host.scrollTop;
    if (y - top > view * 0.62) host.scrollTo({ top: Math.min(H - view, top + SQ * 3), behavior: 'smooth' });
  }

  const ro = new ResizeObserver(() => size()); ro.observe(host);
  size();

  const api = {
    get empty() { return !strokes.some(s => s.tool !== 'eraser'); },
    setColor(c) { color = c; tool = 'pen'; prefs().pen = c; KD.store.save(); },
    setTool(t) { tool = t; },
    get tool() { return tool; }, get color() { return color; },
    undo() { if (strokes.length) { undone.push(strokes.pop()); redraw(); if (opts.onChange) opts.onChange(); } },
    clear() { if (strokes.length) { strokes = []; redraw(); if (opts.onChange) opts.onChange(); } },
    // the ink as a small PNG: 600 px wide (the pad's width), down to just below the last line she wrote
    async export(width = 600) {
      const k = width / W, bottom = Math.min(H, Math.ceil((contentBottom() + SQ * 0.75) / SQ) * SQ || SQ * 2);
      const c = el('canvas'); c.width = Math.round(W * k); c.height = Math.max(1, Math.round(bottom * k));
      const x = c.getContext('2d'); strokes.forEach(s => drawStroke(x, s, k));
      const blob = await new Promise(ok => c.toBlob(ok, 'image/png'));
      return { blob, w: W, h: bottom, url: c.toDataURL('image/png') };
    },
    destroy() { ro.disconnect(); }
  };
  return api;
}

// the tray: blue, green and black pens, eraser, undo, clear (icons only)
function tools(pad) {
  const pens = ['blue', 'green', 'black'].map(c => el('button', { class: 'tool pen pen-' + c, 'aria-label': c, onclick: () => { pad.setColor(c); sync(); KD.sound.play('tap'); } },
    KD.ui.hasPic(`pen_${c}.png`) ? KD.ui.pic(`pen_${c}.png`) : el('i')));
  const eraser = el('button', { class: 'tool', 'aria-label': 'eraser', onclick: () => { pad.setTool(pad.tool === 'eraser' ? 'pen' : 'eraser'); sync(); } }, icon('eraser'));
  const undo = el('button', { class: 'tool', 'aria-label': 'undo', onclick: () => pad.undo() }, icon('undo'));
  const clear = el('button', { class: 'tool', 'aria-label': 'clear', onclick: () => pad.clear() }, icon('clear'));
  function sync() {
    pens.forEach((b, i) => b.classList.toggle('on', pad.tool === 'pen' && pad.color === ['blue', 'green', 'black'][i]));
    eraser.classList.toggle('on', pad.tool === 'eraser');
  }
  sync();
  return el('div', { class: 'tray' }, ...pens, el('span', { class: 'tray-gap' }), eraser, undo, clear);
}

KD.pad = { create, tools, INK, SQ };
})(window.KD = window.KD || {});
