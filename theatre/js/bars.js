/* مسرح المسائل: scene 3, draw it. Each shape has one picture that always looks the same.
   - parts (زيادة، نقصان، جزء وكل): two pieces side by side under one long bracket; in نقصان the piece that went away is dashed
   - compare (مقارنة): two bars starting at the same line, one above the other; the gap at the end is dotted
   Step 2: the app draws the bars; she drags the numbers and the ? onto the right parts.
   Step 3: she builds the bars herself from ready-made pieces and a bracket, then puts the numbers on.
   Also: TH.drag, a small drag-or-tap helper used by the bars, the number sentence and stage 1. */
(function (TH) {
'use strict';
const C = TH.core, U = TH.ui, { el } = U;

/* ---------- drag or tap: chips onto targets ---------- */
// accept(chip, target) -> true to place it; a refused chip floats back. Tapping a chip then a target works too.
function drag(root, { chip, target, accept, tap }) {
  let d = null, picked = null;
  const targetAt = (x, y) => U.dropAt(root, target, x, y);
  root.addEventListener('pointerdown', e => {
    const c = e.target.closest(chip);
    if (!c || !root.contains(c) || c.classList.contains('used')) {
      const t = e.target.closest(target);
      if (t && picked) { const p = picked; unpick(); accept(p, t) || refuse(p); }
      return;
    }
    e.preventDefault();
    d = { c, x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
    try { root.setPointerCapture(e.pointerId); } catch (err) {}
  });
  root.addEventListener('pointermove', e => {
    if (!d || e.pointerId !== d.id) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 7) return;
    if (!d.moved) {
      d.moved = true; unpick(); U.sound('pick');
      d.g = U.ghost(d.c, d.x, d.y);
      d.c.classList.add('lifted');
    }
    d.g.move(e.clientX, e.clientY);
    root.querySelectorAll('.over').forEach(x => x.classList.remove('over'));
    const t = targetAt(e.clientX, e.clientY); if (t) t.classList.add('over');
  });
  root.addEventListener('pointerup', e => {
    if (!d || e.pointerId !== d.id) return;
    const x = d; d = null;
    root.querySelectorAll('.over').forEach(n => n.classList.remove('over'));
    if (x.g) x.g.remove(); x.c.classList.remove('lifted');
    if (!x.moved && tap) { tap(x.c); return; }
    if (!x.moved) { if (picked === x.c) unpick(); else { unpick(); picked = x.c; x.c.classList.add('picked'); U.sound('tap'); } return; }
    const t = targetAt(e.clientX, e.clientY);
    if (!t) { U.sound('tap'); return; }
    accept(x.c, t) || refuse(x.c);
  });
  root.addEventListener('pointercancel', () => { if (d && d.g) d.g.remove(); if (d) d.c.classList.remove('lifted'); d = null; });
  function unpick() { if (picked) picked.classList.remove('picked'); picked = null; }
  function refuse(c) { U.sound('soft'); c.classList.remove('nope'); void c.offsetWidth; c.classList.add('nope'); }
}

/* ---------- the picture ---------- */
const pct = (a, b) => Math.max(18, Math.min(82, Math.round(a / b * 100)));
// show: which values to write ({slot: text}); slots without text are empty drop places when slotted is true
function draw(m, story, opts) {
  opts = opts || {};
  const b = m.bar, show = opts.show || {}, key = story.thing, c = U.colour(key);
  const slot = (name, cls) => el('span', { class: 'slot ' + (cls || ''), 'data-slot': name }, show[name] != null ? show[name] : '');
  if (b.layout === 'parts') {
    const w1 = pct(b.p1, b.whole);
    return el('div', { class: 'bars parts' + (b.gone ? ' gone' : ''), style: { '--c': c } },
      el('div', { class: 'bracket' }, el('i'), slot('whole', 'on-bracket')),
      el('div', { class: 'bar-row' },
        el('div', { class: 'bar p1', style: { width: w1 + '%' } }, slot('p1')),
        el('div', { class: 'bar p2' + (b.gone ? ' away' : ''), style: { width: (100 - w1) + '%' } }, slot('p2'))));
  }
  const ws = pct(b.small, b.big);
  const names = story.rows || ['', ''];
  return el('div', { class: 'bars compare', style: { '--c': c } },
    el('div', { class: 'bar-row' }, el('span', { class: 'row-name' }, names[0]), el('div', { class: 'track' }, el('div', { class: 'bar big', style: { width: '100%' } }, slot('big')))),
    el('div', { class: 'bar-row' }, el('span', { class: 'row-name' }, names[1]), el('div', { class: 'track' },
      el('div', { class: 'bar small', style: { width: ws + '%' } }, slot('small')),
      el('div', { class: 'bar gap', style: { width: (100 - ws) + '%' } }, slot('gap')))));
}
// what belongs on each part: the story's numbers, and ? on the unknown
function slotValues(m) {
  const b = m.bar, out = {};
  const names = b.layout === 'parts' ? ['p1', 'p2', 'whole'] : ['big', 'small', 'gap'];
  names.forEach(n => { out[n] = n === b.unknown ? '?' : b[n]; });
  return out;
}
const label = v => v === '?' ? '؟' : C.ar(v);

/* step 2: the numbers and the ? go onto the parts. S: { board, dock, root } from the story screen */
function numbers(S, m, story, done) {
  const want = slotValues(m);
  const pic = draw(m, story, { show: {} });
  const chips = Object.values(want).map(v => el('button', { class: 'chip num', type: 'button', 'data-v': String(v) }, label(v)));
  for (let i = chips.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [chips[i], chips[j]] = [chips[j], chips[i]]; }
  S.board.textContent = ''; S.dock.textContent = '';
  S.board.append(el('div', { class: 'draw-step' }, pic)); U.fit(S.board, { max: 1.3 });
  S.dock.append(el('div', { class: 'chip-tray' }, ...chips));
  let left = 3;
  drag(S.root, {
    chip: '.chip', target: '.slot',
    accept(chip, t) {
      if (t.textContent || String(want[t.dataset.slot]) !== chip.dataset.v) return false;
      t.textContent = chip.textContent; t.classList.add('filled', chip.dataset.v === '?' ? 'q' : 'n');
      chip.classList.add('used'); U.sound('drop');
      if (--left === 0) { U.sound('good'); setTimeout(done, 700); }
      return true;
    }
  });
}

/* step 3: she builds the picture from pieces, then puts the numbers on */
function build(S, m, story, done) {
  const b = m.bar, c = U.colour(story.thing);
  const W = b.layout === 'parts' ? b.whole : b.big;
  const len = v => Math.max(16, Math.round(v / W * 100));
  const pieces = b.layout === 'parts'
    ? [['barA', len(b.p1)], ['barB', len(b.p2)], ['bracket', 100]]
    : [['big', 100], ['small', len(b.small)], ['gap', 100 - len(b.small) + 0]];
  const mk = ([id, w]) => el('button', { class: 'bp bp-' + (id === 'bracket' ? 'bracket' : id === 'gap' ? 'gap' : 'bar') + (id === 'barB' && b.gone ? ' away' : ''), type: 'button', 'data-p': id, style: { '--w': w, '--c': c } }, id === 'bracket' ? el('i') : '');
  const palette = el('div', { class: 'bp-palette' }, ...pieces.sort(() => Math.random() - 0.5).map(mk));
  const lanes = el('div', { class: 'bp-lanes' },
    el('div', { class: 'lane top', 'data-lane': 'top' }), el('div', { class: 'lane', 'data-lane': 'r1' }), el('div', { class: 'lane', 'data-lane': 'r2' }));
  const hint = el('button', { class: 'hint-btn', type: 'button', 'aria-label': 'تلميح' }, U.icon('bulb'));
  const card = el('div', { class: 'hint-card', hidden: true }, draw(m, story, { show: {} }));
  hint.addEventListener('click', () => { card.hidden = !card.hidden; U.sound('tap'); });
  const ok = el('button', { class: 'btn btn-done', type: 'button' }, U.icon('tick'));
  S.board.textContent = ''; S.dock.textContent = '';
  // the lanes keep the board's full width, so a bar is as long here as in the palette below
  S.board.append(el('div', { class: 'draw-step build' }, el('div', { class: 'build-top' }, hint, card), lanes, palette));
  U.fit(S.board, { max: 1.2 });
  S.dock.append(ok);
  drag(S.root, {
    chip: '.bp', target: '.lane, .bp-palette',
    accept(p, t) {
      if (!lanes.isConnected) return false;
      if (t.classList.contains('bp-palette')) { palette.append(p); U.sound('tap'); return true; }
      t.append(p); U.sound('drop'); return true;
    }
  });
  ok.addEventListener('click', () => {
    const inLane = l => Array.from(lanes.querySelector(`[data-lane="${l}"]`).children).map(x => x.dataset.p);
    const top = inLane('top'), r1 = inLane('r1'), r2 = inLane('r2');
    let right;
    if (b.layout === 'parts') {
      const row = r1.length ? r1 : r2, other = r1.length ? r2 : r1;
      right = top.join() === 'bracket' && row.length === 2 && row.includes('barA') && row.includes('barB') && !other.length;
    } else {
      const rows = [r1, r2];
      right = !top.length && rows.some(r => r.join() === 'big') && rows.some(r => r.join() === 'small,gap');
    }
    if (right) { U.sound('good'); numbers(S, m, story, done); }
    else { U.sound('soft'); card.hidden = false; U.toast('انظري إلى الصورة الصغيرة، ثم رتّبي القطع.'); }
  });
}

TH.bars = { draw, numbers, build, slotValues, drag, label };
})(window.TH);
