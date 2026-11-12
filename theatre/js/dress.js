/* مسرح المسائل: the dressing room «غرفة الملابس» (Mama's idea, 12 Nov 2026: characters she dresses by dragging clothes,
   glasses and decorations onto them, who then come on stage).
   The actors: a girl, a boy and a cat from the first day; a bear, a rabbit and a penguin join when levels 1, 2 and 3 are
   finished. The wardrobe: the pieces she has (js/prizes.js: six from the start, one more for every finished day), and grey
   shapes for the pieces still to come. She drags a piece onto the actor and it stays where she lets go; dragging a worn
   piece off the actor takes it off. «إلى المسرح» goes back to Home, where her actor hops onto the stage, bows and sways.
   Saved in mariaTheatre.v1 as st.dress = { cur: actor id, looks: { actor: [{ id, x, y, w }] } }: x, y the piece's middle
   and w its width, all as parts of the actor's box, so the look is the same at every size. */
(function (TH) {
'use strict';
const ACTORS = [
  { id: 'girl', name: 'البنت', ar: 463 / 720, need: 0 }, { id: 'boy', name: 'الولد', ar: 331 / 720, need: 0 }, { id: 'cat', name: 'القطّة', ar: 439 / 720, need: 0 },
  { id: 'bear', name: 'الدبّ', ar: 406 / 638, need: 1 }, { id: 'rabbit', name: 'الأرنب', ar: 359 / 720, need: 2 }, { id: 'penguin', name: 'البطريق', ar: 408 / 588, need: 3 }
];
// how wide a piece is on the actor (a part of the actor's width); the rest are .42
const SIZE = { p01: .62, p02: .13, p03: .68, p04: .5, p05: 1.05, p06: .34, p07: .62, p08: .6, p09: .5, p10: .36, p11: .56, p12: .42, p13: .36, p14: .4, p15: .6, p16: .52, p17: .86,
  w01: .46, w02: .5, w03: .48, w04: .48, w05: .4, w06: .5, w07: .74, w08: .66, w09: .5, w10: .78, w11: .82, w12: .5, w13: .42, w14: .6, w15: .34, w16: .48, w17: .3, w18: .66 };
const sizeOf = id => SIZE[id] || .42;
const MAX_WORN = 12;

function state(st) {
  if (!st.dress || typeof st.dress !== 'object') st.dress = { cur: 'girl', looks: {} };
  if (!st.dress.looks || typeof st.dress.looks !== 'object') st.dress.looks = {};
  if (!ACTORS.some(a => a.id === st.dress.cur)) st.dress.cur = 'girl';
  return st.dress;
}
const open = (bank, st, a) => a.need === 0 || TH.prizes.stageDone(bank, st, a.need);
const lookOf = (st, id) => (state(st).looks[id] = Array.isArray(state(st).looks[id]) ? state(st).looks[id] : []);

// an actor with what it wears: used in the dressing room and on Home's stage
function actorEl(actor, look, cls) {
  const { el } = TH.ui, P = TH.prizes;
  const box = el('div', { class: 'actor ' + (cls || ''), style: { aspectRatio: String(actor.ar) } },
    el('img', { class: 'actor-pic', src: `assets/dress/${actor.id}.webp`, alt: '', draggable: 'false' }));
  box.style.setProperty('--ar', String(actor.ar));
  (look || []).forEach((w, i) => box.append(wornEl(w, i)));
  function wornEl(w, i) {
    return el('img', { class: 'worn', src: P.src(w.id), alt: '', draggable: 'false', 'data-i': String(i),
      style: { left: (w.x * 100) + '%', top: (w.y * 100) + '%', width: (w.w * 100) + '%' } });
  }
  return box;
}
// the actor who stands on Home's stage: the one she dressed last (null until she has dressed someone)
function onStage(st) {
  const d = state(st), a = ACTORS.find(x => x.id === d.cur), look = lookOf(st, d.cur);
  return a && look.length ? actorEl(a, look, 'stage-actor') : null;
}

function room(bank, st, onBack) {
  const { el } = TH.ui, P = TH.prizes, app = document.getElementById('app'), d = state(st);
  if (!open(bank, st, ACTORS.find(a => a.id === d.cur))) d.cur = 'girl';
  const save = () => TH.store.save();
  const close = el('button', { class: 'top-btn', type: 'button', 'aria-label': 'رجوع' }, TH.ui.icon('close'));
  const go = el('button', { class: 'btn btn-start dr-go', type: 'button' }, 'إلى المسرح');
  const heads = el('div', { class: 'dr-heads' });
  const spot = el('div', { class: 'dr-spot' });
  const rack = el('div', { class: 'dr-rack' });
  const screen = el('section', { class: 'screen dress', dir: 'rtl' },
    el('header', { class: 'dr-top' }, close, heads, go),
    el('div', { class: 'dr-main' }, el('div', { class: 'dr-stage' }, spot), rack));
  app.textContent = ''; app.append(screen);
  let box = null;

  function drawHeads() {
    heads.textContent = '';
    ACTORS.forEach(a => {
      const ok = open(bank, st, a);
      const b = el('button', { class: 'dr-head' + (a.id === d.cur ? ' on' : '') + (ok ? '' : ' shut'), type: 'button', 'aria-label': a.name, disabled: ok ? null : 'disabled' },
        el('img', { src: `assets/dress/${a.id}.webp`, alt: '', draggable: 'false' }));
      if (ok) b.addEventListener('click', () => { TH.ui.sound('pick'); d.cur = a.id; save(); drawHeads(); drawActor(); });
      heads.append(b);
    });
  }
  function drawActor() {
    const a = ACTORS.find(x => x.id === d.cur);
    box = actorEl(a, lookOf(st, a.id), 'dr-actor');
    spot.textContent = ''; spot.append(box);
    box.querySelectorAll('.worn').forEach(n => n.addEventListener('pointerdown', e => startDrag(e, { from: +n.dataset.i })));
  }
  function drawRack() {
    rack.textContent = '';
    P.owned(st).forEach(p => {
      const b = el('button', { class: 'dr-piece', type: 'button', 'aria-label': p.name }, el('img', { src: P.src(p.id), alt: '', draggable: 'false' }));
      b.addEventListener('pointerdown', e => startDrag(e, { id: p.id }));
      rack.append(b);
    });
    P.toCome(st).forEach(p => rack.append(el('span', { class: 'dr-piece later' }, el('img', { src: P.src(p.id), alt: '', draggable: 'false' }))));
  }
  // drag a piece: from the wardrobe (a new one) or from the actor (move it, or take it off by dropping it outside)
  function startDrag(e, what) {
    if (e.button > 0) return;
    e.preventDefault();
    const look = lookOf(st, d.cur), id = what.id || look[what.from].id;
    const r = box.getBoundingClientRect(), wpx = sizeOf(id) * r.width;
    const ghost = el('img', { class: 'dr-ghost', src: P.src(id), alt: '', draggable: 'false', style: { width: wpx + 'px' } });
    document.body.append(ghost);
    let moved = false; const x0 = e.clientX, y0 = e.clientY;
    const place = ev => { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) moved = true; };
    place(e); TH.ui.sound('pick');
    const worn = what.from != null ? box.querySelector(`.worn[data-i="${what.from}"]`) : null;
    if (worn) worn.style.visibility = 'hidden';
    const move = ev => { ev.preventDefault(); place(ev); };
    const up = ev => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      ghost.remove();
      const b = box.getBoundingClientRect(), x = (ev.clientX - b.left) / b.width, y = (ev.clientY - b.top) / b.height;
      const inside = x > -0.25 && x < 1.25 && y > -0.12 && y < 1.08 && ev.type !== 'pointercancel';
      if (what.from != null) look.splice(what.from, 1);                       // it leaves its old place
      if (inside && (moved || what.from != null)) { look.push({ id, x: +x.toFixed(3), y: +y.toFixed(3), w: sizeOf(id) }); while (look.length > MAX_WORN) look.shift(); TH.ui.sound('drop'); }
      else if (!moved && what.id) { look.push({ id, x: .5, y: .2, w: sizeOf(id) }); while (look.length > MAX_WORN) look.shift(); TH.ui.sound('drop'); }   // a tap puts it on, near her head
      else TH.ui.sound('soft');
      save(); drawActor();
    };
    window.addEventListener('pointermove', move, { passive: false }); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }
  drawHeads(); drawActor(); drawRack();
  close.addEventListener('click', onBack);
  go.addEventListener('click', () => { TH.ui.sound('curtain'); onBack(); });
}

TH.dress = { ACTORS, room, onStage, actorEl, state };
})(window.TH = window.TH || {});
