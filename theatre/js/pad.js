/* مسرح المسائل: her drawing pad. It sits beside every story at every stage: a pen in four colours, a dot stamp, a bar
   tool, a bracket, a ? sticker, an eraser and undo. Each drawing is saved with its story and day (IndexedDB 'mariaTheatre',
   store 'pad'), so Mama can see how her pictures grow. Reopening the same story on the same day carries on the drawing. */
(function (TH) {
'use strict';
const U = TH.ui, { el } = U;
const COLOURS = ['#1E4FB8', '#D93A3A', '#2E9E5B', '#2B2340'];

async function open(story, shownText) {
  const id = story.id + '|' + TH.store.today();
  const old = await TH.pads.get(id);
  const ops = [];                        // what she drew this time, so undo works
  let tool = 'pen', col = COLOURS[0];
  const cv = el('canvas', { class: 'pad-canvas' });
  const tools = [
    ['pen', U.icon('pencil')], ['dot', el('span', { class: 'tdot' })], ['bar', el('span', { class: 'tbar' })],
    ['bracket', el('span', { class: 'tbr', html: '<svg viewBox="0 0 40 16"><path d="M2 14 Q2 6 10 6 H16 Q20 6 20 2 Q20 6 24 6 H30 Q38 6 38 14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>' })],
    ['q', el('span', { class: 'tq' }, '؟')], ['eraser', U.icon('eraser')]
  ].map(([t, ic]) => el('button', { class: 'ptool' + (t === tool ? ' on' : ''), type: 'button', 'data-t': t }, ic));
  const swatches = COLOURS.map(c => el('button', { class: 'swatch' + (c === col ? ' on' : ''), type: 'button', 'data-c': c, style: { background: c } }));
  const undo = el('button', { class: 'ptool', type: 'button' }, U.icon('undo'));
  const close = el('button', { class: 'pad-close', type: 'button', 'aria-label': 'إغلاق' }, U.icon('close'));
  const sheet = el('div', { class: 'pad-sheet', dir: 'rtl' },
    el('div', { class: 'pad-top' }, el('div', { class: 'pad-story' }, shownText), close),
    el('div', { class: 'pad-tools' }, ...tools, el('span', { class: 'psep' }), ...swatches, el('span', { class: 'psep' }), undo),
    el('div', { class: 'pad-paper' }, cv));
  const veil = el('div', { class: 'pad-veil' }, sheet);
  document.body.append(veil);
  await U.wait(20);
  const paper = sheet.querySelector('.pad-paper'), r = paper.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  let base = null;
  if (old && old.png) { base = new Image(); base.src = old.png; await new Promise(ok => { base.onload = ok; base.onerror = ok; }); }

  function paint(op) {
    g.save();
    g.globalCompositeOperation = op.t === 'eraser' ? 'destination-out' : 'source-over';
    g.strokeStyle = op.c; g.fillStyle = op.c; g.lineCap = 'round'; g.lineJoin = 'round';
    if (op.t === 'pen' || op.t === 'eraser') {
      g.lineWidth = op.t === 'eraser' ? 26 : 4.5; g.beginPath();
      op.p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (op.p.length === 1) g.lineTo(op.p[0][0] + 0.1, op.p[0][1]); g.stroke();
    } else if (op.t === 'dot') { g.beginPath(); g.arc(op.x, op.y, 9, 0, Math.PI * 2); g.fill(); }
    else if (op.t === 'q') { g.font = '700 40px "Baloo Bhaijaan 2", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.beginPath(); g.arc(op.x, op.y, 24, 0, Math.PI * 2); g.stroke(); g.fillText('؟', op.x, op.y + 2); }
    else if (op.t === 'bar') {
      const x = Math.min(op.x, op.x2), y = Math.min(op.y, op.y2), w = Math.abs(op.x2 - op.x), h = Math.max(34, Math.abs(op.y2 - op.y));
      g.globalAlpha = 0.18; g.fillRect(x, y, w, h); g.globalAlpha = 1; g.lineWidth = 3.5; g.strokeRect(x, y, w, h);
    } else if (op.t === 'bracket') {
      const x1 = Math.min(op.x, op.x2), x2 = Math.max(op.x, op.x2), y = op.y, m = (x1 + x2) / 2;
      g.lineWidth = 3.5; g.beginPath(); g.moveTo(x1, y + 16); g.quadraticCurveTo(x1, y, x1 + 14, y); g.lineTo(m - 10, y); g.quadraticCurveTo(m, y, m, y - 12);
      g.quadraticCurveTo(m, y, m + 10, y); g.lineTo(x2 - 14, y); g.quadraticCurveTo(x2, y, x2, y + 16); g.stroke();
    }
    g.restore();
  }
  function redraw(extra) {
    g.clearRect(0, 0, r.width, r.height);
    if (base) g.drawImage(base, 0, 0, r.width, r.height);
    ops.forEach(paint); if (extra) paint(extra);
  }
  redraw();
  let cur = null;
  const pt = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  cv.addEventListener('pointerdown', e => {
    e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (err) {} const [x, y] = pt(e);
    if (tool === 'dot' || tool === 'q') { ops.push({ t: tool, c: col, x, y }); redraw(); U.sound('tap'); return; }
    cur = tool === 'pen' || tool === 'eraser' ? { t: tool, c: col, p: [[x, y]] } : { t: tool, c: col, x, y, x2: x, y2: y };
  });
  cv.addEventListener('pointermove', e => {
    if (!cur) return; const [x, y] = pt(e);
    if (cur.p) { cur.p.push([x, y]); paint({ ...cur, p: cur.p.slice(-2) }); } else { cur.x2 = x; cur.y2 = y; redraw(cur); }
  });
  const end = () => { if (!cur) return; if (!cur.p && Math.abs(cur.x2 - cur.x) < 12) cur.x2 = cur.x + 120; ops.push(cur); cur = null; redraw(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  sheet.querySelector('.pad-tools').addEventListener('click', e => {
    const t = e.target.closest('[data-t]'), s = e.target.closest('[data-c]');
    if (t) { tool = t.dataset.t; tools.forEach(b => b.classList.toggle('on', b === t)); U.sound('tap'); }
    if (s) { col = s.dataset.c; swatches.forEach(b => b.classList.toggle('on', b === s)); if (tool === 'eraser') { tool = 'pen'; tools.forEach(b => b.classList.toggle('on', b.dataset.t === 'pen')); } U.sound('tap'); }
  });
  undo.addEventListener('click', () => { if (ops.length) { ops.pop(); redraw(); U.sound('tap'); } });
  return new Promise(ok => {
    close.addEventListener('click', async () => {
      if (ops.length) {
        // a small PNG on white, so it reads well in Mama's view
        const out = document.createElement('canvas'); const s = Math.min(1, 900 / r.width);
        out.width = Math.round(r.width * s); out.height = Math.round(r.height * s);
        const o = out.getContext('2d'); o.fillStyle = '#fff'; o.fillRect(0, 0, out.width, out.height); o.drawImage(cv, 0, 0, out.width, out.height);
        await TH.pads.put({ id, story: story.id, day: TH.store.today(), at: Date.now(), png: out.toDataURL('image/png') });
      }
      veil.remove(); ok();
    });
  });
}

TH.pad = { open };
})(window.TH);
