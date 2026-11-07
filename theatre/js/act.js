/* مسرح المسائل: scene 2, she acts it out. She drags each thing herself; the app counts out loud and never moves
   anything for her or snaps to the answer. Every box shows only what is in it. ✔ checks; a wrong result is not red.
   Many things come as 10s (a stick) and 100s (a square): tapping one opens it into ten smaller ones (borrowing);
   ten of a kind in one box can be tied back together (carrying).
   mount(host, model, story) -> { counts(), check(), destroy() };  replay(host, model, story, answer) for scene 5. */
(function (TH) {
'use strict';
const C = TH.core, U = TH.ui, { el } = U;
const SIZES = [1000, 100, 10, 1];

// a group of 10, 100 or 1000 is a real thing she can see: a bag, a bundle, a box, a bus... with its number written under it
// (riyals are notes); the single thing is the thing itself. ChatGPT clay pictures replace the emoji when they exist.
function pieceEl(v, key, mode) {
  if (v === 1) { const p = el('span', { class: 'pc one ' + mode, 'data-v': 1 }); p.append(U.thing(key)); return p; }
  if (key === 'riyal') return el('span', { class: 'pc pack money v' + v, 'data-v': v }, el('span', { class: 'note-art' }, el('b', {}, C.ar(v)), el('i', {}, 'ريال')));
  return el('span', { class: 'pc pack v' + v, 'data-v': v }, U.pack(key, v), el('b', { class: 'pk-n' }, C.ar(v)));
}

function layoutOf(m) {
  if (m.frame) return 'L-start';
  if (m.shape === 'pw-total') return 'L-pwt';
  if (m.shape === 'pw-part') return 'L-pwp';
  if (m.shape.startsWith('cmp')) return 'L-cmp';
  return 'L-change';
}

function mount(host, m, story, opts) {
  opts = opts || {};
  const bag = {};                // zone id -> [values]
  m.zones.forEach(z => { bag[z.id] = C.pieces(z.start, m.mode); });
  let pairs = 0;
  const added = {};              // zone id -> how much came from the supply (the change she made, shown with a glow)
  const board = el('div', { class: `board ${layoutOf(m)} m-${m.mode}` });
  const zoneEls = {};

  function renderZone(z) {
    const box = zoneEls[z.id];
    const body = box.querySelector('.z-body'); body.textContent = '';
    const key = z.thing || story.thing;
    SIZES.forEach(v => {
      const list = bag[z.id].filter(x => x === v); if (!list.length) return;
      const row = el('span', { class: 'z-row s' + v });
      list.forEach(() => row.append(pieceEl(v, key, m.mode)));
      body.append(row);
    });
    box.querySelector('.z-count').textContent = C.ar(C.sum(bag[z.id]));
    // ten of a kind can be tied together
    const tie = box.querySelector('.z-tie');
    const k = m.mode === 'blocks' ? [1, 10, 100].find(v => bag[z.id].filter(x => x === v).length >= 10) : null;
    tie.hidden = !k; tie.dataset.v = k || '';
    if (k) tie.textContent = `اربطي ١٠ ← ${C.ar(k * 10)}`;
    if (m.frame) frameCount();
  }
  function frameCount() {
    const t = m.zones.reduce((s, z) => s + C.sum(bag[z.id]), 0);
    const f = board.querySelector('.frame-count'); if (f) f.textContent = C.ar(t);
  }
  function makeZone(z) {
    const box = el('div', { class: 'zone' + (z.out ? ' z-out' : '') + (z.big ? ' z-big' : '') + (z.row ? ' z-rowz' : '') + (z.fixed ? ' z-fixed' : ''), 'data-zone': z.id },
      el('div', { class: 'z-head' }, el('span', { class: 'z-label' }, z.label), el('span', { class: 'z-count' }, '٠')),
      el('div', { class: 'z-body' }),
      el('button', { class: 'z-tie', hidden: true, type: 'button' }));
    zoneEls[z.id] = box; return box;
  }
  function supplyEl() {
    const s = el('div', { class: 'zone z-supply', 'data-zone': 'more' }, el('div', { class: 'z-head' }, el('span', { class: 'z-label' }, m.supply.label)));
    const body = el('div', { class: 'z-body' });
    const top = Math.max(...m.zones.map(z => Math.max(z.start, z.target || 0)));
    (m.mode === 'ones' ? [1] : SIZES.filter(v => v === 1 || v <= top)).forEach(v => body.append(el('span', { class: 'z-row s' + v }, pieceEl(v, story.thing, m.mode))));
    s.append(body); return s;
  }

  // the layout
  const zs = m.zones.map(makeZone);
  if (m.frame) {
    const fr = el('div', { class: 'frame' }, el('div', { class: 'frame-head' }, el('span', { class: 'z-label' }, m.frame.label), el('span', { class: 'frame-count' }, '٠')), ...zs);
    board.append(supplyEl(), fr);
  } else if (m.supply) {
    board.append(supplyEl(), ...zs);
  } else board.append(...zs);
  if (m.pairs) board.append(el('div', { class: 'pairs' }, el('span', { class: 'pairs-l' }, 'أزواج'), el('span', { class: 'pairs-n' }, '٠')));
  host.append(board);
  m.zones.forEach(renderZone);

  /* ---------- dragging ---------- */
  let drag = null;
  board.addEventListener('pointerdown', e => {
    const tie = e.target.closest('.z-tie');
    if (tie) { tieUp(tie.closest('.zone').dataset.zone, +tie.dataset.v); return; }
    const p = e.target.closest('.pc'); if (!p || opts.readonly) return;
    const from = p.closest('.zone').dataset.zone;
    const z = m.zones.find(q => q.id === from);
    if (z && z.fixed) { U.sound('soft'); return; }
    e.preventDefault();
    drag = { p, from, v: +p.dataset.v, x: e.clientX, y: e.clientY, moved: false, ghost: null, id: e.pointerId };
    try { board.setPointerCapture(e.pointerId); } catch (err) {}
  });
  board.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 9) return;
    if (!drag.moved) {
      drag.moved = true; U.sound('pick');
      const r = drag.p.getBoundingClientRect();
      drag.ghost = drag.p.cloneNode(true); drag.ghost.classList.add('ghost');
      Object.assign(drag.ghost.style, { width: r.width + 'px', height: r.height + 'px', left: r.left + 'px', top: r.top + 'px' });
      document.body.append(drag.ghost); drag.ox = drag.x - r.left; drag.oy = drag.y - r.top;
      if (drag.from !== 'more') drag.p.classList.add('lifted');
    }
    drag.ghost.style.left = (e.clientX - drag.ox) + 'px'; drag.ghost.style.top = (e.clientY - drag.oy) + 'px';
    const over = zoneAt(e.clientX, e.clientY);
    board.querySelectorAll('.zone.over').forEach(x => x.classList.remove('over'));
    if (over && over !== drag.from) { const ze = board.querySelector(`[data-zone="${over}"]`); ze && ze.classList.add('over'); }
  });
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    board.querySelectorAll('.zone.over').forEach(x => x.classList.remove('over'));
    if (d.ghost) d.ghost.remove();
    d.p.classList.remove('lifted');
    if (!d.moved) { if (d.from !== 'more' && d.v > 1) open(d.from, d.v); return; }
    const to = zoneAt(e.clientX, e.clientY);
    move(d.from, to, d.v);
  };
  board.addEventListener('pointerup', endDrag);
  board.addEventListener('pointercancel', e => { if (drag && drag.ghost) drag.ghost.remove(); if (drag) drag.p.classList.remove('lifted'); drag = null; });

  function zoneAt(x, y) {
    const hit = document.elementFromPoint(x, y); const z = hit && hit.closest && hit.closest('[data-zone]');
    return z && board.contains(z) ? z.dataset.zone : null;
  }
  const zoneOf = id => m.zones.find(z => z.id === id);
  function take(id, v) { const i = bag[id].indexOf(v); if (i < 0) return false; bag[id].splice(i, 1); return true; }

  function move(from, to, v) {
    if (!to || to === from) { U.sound('tap'); return; }
    const tz = zoneOf(to), fz = zoneOf(from);
    if (m.pairs) {   // two rows face to face: one from the short row stands opposite one of the same size in the long row
      if (fz && fz.pairWith === to) {
        if (!bag[to].includes(v)) { U.sound('soft'); U.toast('لا توجد قطعة مثلها هنا. اضغطي على قطعة كبيرة لتفتحيها.'); return; }
        take(from, v); take(to, v); pairs += v; U.sound('pop');
        renderZone(fz); renderZone(tz);
        board.querySelector('.pairs-n').textContent = C.ar(pairs); bump(board.querySelector('.pairs'));
        U.count(pairs); return;
      }
      U.sound('soft'); return;
    }
    if (to === 'more') {   // back where it came from
      if (from === 'more') return;
      take(from, v); added[from] = (added[from] || 0) - v; U.sound('drop'); renderZone(fz); U.count(C.sum(bag[from])); return;
    }
    if (tz && tz.fixed) { U.sound('soft'); return; }
    if (from === 'more') { if (!m.supply) return; added[to] = (added[to] || 0) + v; }
    else { if (!take(from, v)) return; renderZone(fz); }
    bag[to].push(v); U.sound('drop'); renderZone(tz); bump(zoneEls[to]);
    U.count(C.sum(bag[to]));
    if (opts.onMove) opts.onMove();
  }
  function open(id, v) {
    if (!take(id, v)) return;
    for (let k = 0; k < 10; k++) bag[id].push(v / 10);
    U.sound('pop'); renderZone(zoneOf(id));
    const row = zoneEls[id].querySelector('.z-row.s' + (v / 10)); if (row) row.classList.add('burst');
  }
  function tieUp(id, v) {
    for (let k = 0; k < 10; k++) take(id, v);
    bag[id].push(v * 10); U.sound('snap'); renderZone(zoneOf(id));
    const row = zoneEls[id].querySelector('.z-row.s' + (v * 10)); if (row) row.classList.add('burst');
  }
  function bump(n) { if (!n) return; n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump'); }

  const counts = () => { const c = {}; m.zones.forEach(z => { c[z.id] = C.sum(bag[z.id]); }); return c; };
  return {
    board, counts, pairs: () => pairs,
    check: () => C.checkAct(m, counts()),
    frameTotal: () => m.zones.reduce((s, z) => s + C.sum(bag[z.id]), 0),
    destroy() { board.remove(); }
  };
}

/* scene 5: the scene plays again by itself, with her answer: what came in pops in, what went out flies away */
async function replay(host, m, story) {
  const view = mount(host, m, story, { readonly: true });
  view.board.classList.add('replay');
  await U.wait(500);
  // each box that changes: its count runs to the new number and its things change, one box after another
  for (const z of m.zones) {
    const want = z.target != null ? z.target : z.start;
    if (want === z.start) continue;
    const zb = view.board.querySelector(`[data-zone="${z.id}"]`), c = zb.querySelector('.z-count');
    zb.classList.add('lit');
    const n = 12;
    for (let k = 1; k <= n; k++) { c.textContent = C.ar(Math.round(z.start + (want - z.start) * k / n)); if (k % 3 === 0) U.sound(want > z.start ? 'drop' : 'tap'); await U.wait(55); }
    const body = zb.querySelector('.z-body'); body.textContent = '';
    [1000, 100, 10, 1].forEach(v => {
      const list = C.pieces(want, m.mode).filter(x => x === v); if (!list.length) return;
      const row = el('span', { class: 'z-row s' + v });
      list.forEach((x, i) => { const p = pieceEl(v, z.thing || story.thing, m.mode); p.classList.add('pop-in'); p.style.animationDelay = (i * 25) + 'ms'; row.append(p); });
      body.append(row);
    });
    await U.wait(450); zb.classList.remove('lit');
  }
  if (m.frame) { const f = view.board.querySelector('.frame-count'); if (f) f.textContent = C.ar(m.frame.total != null ? m.frame.total : m.ans); }
  if (m.pairs) { view.board.querySelector('.pairs-n').textContent = C.ar(Math.min(...m.zones.map(z => z.start))); }
  return view;
}

TH.act = { mount, replay, pieceEl };
})(window.TH);
