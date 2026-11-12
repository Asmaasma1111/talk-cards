/* مسرح المسائل: the dressing room «غرفة الملابس» (Mama's idea, 12 Nov 2026: characters she dresses by dragging clothes,
   glasses and decorations onto them, who then come on stage).
   The actors: a girl, a boy and a cat from the first day; a bear, a rabbit and a penguin join when levels 1, 2 and 3 are
   finished. The wardrobe: the pieces she has (js/prizes.js: six from the start, one more for every finished day), and grey
   shapes for the pieces still to come. She drags a piece onto the actor and it goes to its own place (a hat on the head,
   glasses on the eyes: see FIT); dragging a worn piece away from the actor takes it off. «إلى المسرح» goes back to Home, where her actor hops onto the stage, bows and sways.
   Saved in mariaTheatre.v1 as st.dress = { cur: actor id, looks: { actor: [{ id, side? }] } }: only which pieces she
   wears (and the side, for things in a hand or on the floor); where each one sits comes from the actor's own measures. */
(function (TH) {
'use strict';
// Every piece has its own place on the actor (Mama, 12 Nov 2026: "make sure each item really fits its place, nothing
// messy"): wherever she lets go, a hat goes onto the head, glasses onto the eyes, a scarf round the neck, and so on. One
// piece to a place: a new hat takes the old hat's place. Things to hold go into the hand on the side she drops them, and
// big stage things stand on the floor on that side.
// An actor's places: [x, y] as parts of its box; hw head width, gw glasses width, sw shoulders, fw feet (parts of its width).
const ACTORS = [
  { id: 'girl', name: 'البنت', ar: 463 / 720, need: 0, hw: .6, gw: .5, sw: .46, fw: .52,
    at: { top: [.5, .05], bow: [.72, .09], eyes: [.49, .25], nose: [.49, .29], mouth: [.49, .305], neck: [.5, .4], chest: [.5, .52], waist: [.5, .66], feet: [.5, .975], handL: [.19, .67], handR: [.82, .67] } },
  { id: 'boy', name: 'الولد', ar: 331 / 720, need: 0, hw: .82, gw: .66, sw: .6, fw: .7,
    at: { top: [.5, .05], bow: [.78, .1], eyes: [.5, .27], nose: [.5, .31], mouth: [.5, .325], neck: [.5, .41], chest: [.5, .53], waist: [.5, .66], feet: [.5, .975], handL: [.09, .68], handR: [.91, .68] } },
  { id: 'cat', name: 'القطّة', ar: 439 / 720, need: 0, hw: .76, gw: .56, sw: .5, fw: .62,
    at: { top: [.47, .09], bow: [.7, .14], eyes: [.43, .3], nose: [.43, .335], mouth: [.43, .352], neck: [.46, .48], chest: [.46, .6], waist: [.46, .72], feet: [.44, .975], handL: [.07, .71], handR: [.74, .73] } },
  { id: 'bear', name: 'الدبّ', ar: 406 / 638, need: 1, hw: .8, gw: .5, sw: .6, fw: .62,
    at: { top: [.5, .06], bow: [.74, .1], eyes: [.51, .3], nose: [.51, .345], mouth: [.51, .372], neck: [.5, .5], chest: [.5, .62], waist: [.5, .76], feet: [.5, .975], handL: [.06, .7], handR: [.94, .7] } },
  { id: 'rabbit', name: 'الأرنب', ar: 359 / 720, need: 2, hw: .84, gw: .56, sw: .52, fw: .6,
    at: { top: [.5, .27], bow: [.76, .3], eyes: [.51, .42], nose: [.51, .455], mouth: [.51, .472], neck: [.5, .58], chest: [.5, .69], waist: [.5, .8], feet: [.5, .98], handL: [.06, .69], handR: [.94, .69] } },
  { id: 'penguin', name: 'البطريق', ar: 408 / 588, need: 3, hw: .78, gw: .5, sw: .7, fw: .64,
    at: { top: [.5, .04], bow: [.74, .08], eyes: [.51, .28], nose: [.51, .33], mouth: [.51, .385], neck: [.5, .46], chest: [.5, .62], waist: [.5, .78], feet: [.5, .98], handL: [.05, .68], handR: [.95, .68] } }
];
// A piece: [place, width (times the place's own measure), the point of the piece that sits on the place (x, y of the piece)]
// hat, bow, nose, mouth: times the head; eyes: times the glasses width; neck, back, body, waist, hand: times the shoulders;
// feet: times the feet; floor: a part of the actor's width.
const FIT = {
  p01: ['hat', 1, .5, .82], p03: ['hat', 1.15, .5, .78], p04: ['hat', .6, .5, .9], p07: ['hat', 1, .5, .86], p08: ['hat', .85, .5, .7], p11: ['hat', .85, .5, .88],
  p15: ['hat', 1.05, .5, .3], p16: ['hat', .7, .5, .85], w14: ['hat', .85, .5, .6], w13: ['bow', .4, .5, .5],
  w01: ['eyes', 1, .5, .5], w02: ['eyes', 1.05, .5, .5], w03: ['eyes', 1.05, .5, .5], w04: ['eyes', 1.05, .5, .5], p09: ['eyes', 1.15, .5, .62], w16: ['eyes', 1.1, .5, .5],
  p02: ['nose', .2, .5, .5], w17: ['mouth', .42, .5, .35],
  w09: ['neck', .9, .5, .1], w05: ['neck', .75, .5, .15], w06: ['neck', .9, .5, .15], p10: ['neck', .6, .5, .4], w18: ['neck', 1.1, .5, .12],
  p05: ['back', 2, .5, .5], p17: ['back', 1.5, .5, .08],
  w08: ['body', 1.15, .5, .05], w10: ['body', 1.4, .5, .08], w11: ['body', 1.4, .5, .2], w07: ['waist', 1.45, .5, .3], w12: ['feet', 1, .5, .95],
  p06: ['hand', .5, .5, .85], p13: ['hand', .55, .3, .85], p14: ['hand', .7, .5, .5], w15: ['hand', .5, .5, .1], p37: ['hand', .6, .5, .8], p30: ['hand', .4, .6, .15],
  p29: ['hand', .7, .5, .8], p25: ['hand', .55, .5, .4], p27: ['hand', .75, .3, .7], p38: ['hand', .7, .3, .8], p32: ['hand', .4, .5, .9], p33: ['hand', .5, .5, .9],
  p34: ['hand', .5, .5, .9], p31: ['hand', .5, .5, .05], p19: ['hand', .6, .5, .8], p20: ['hand', .6, .5, .8], p21: ['hand', .6, .5, .8], p23: ['hand', .7, .5, .6],
  p22: ['hand', .6, .5, .02], p41: ['hand', .5, .5, .5], p42: ['hand', .5, .5, .6], p12: ['hand', .55, .5, .5],
  p18: ['floor', .5, .5, 1], p24: ['floor', .6, .5, 1], p26: ['floor', .5, .5, 1], p28: ['floor', .6, .5, 1], p35: ['floor', .6, .5, 1], p36: ['floor', .5, .5, 1], p39: ['floor', .5, .5, 1], p40: ['floor', .5, .5, 1]
};
const ORDER = ['back', 'floor', 'feet', 'body', 'waist', 'neck', 'mouth', 'nose', 'eyes', 'hat', 'bow', 'hand'];   // drawn in this order, back to front
const fitOf = id => FIT[id] || ['hand', .5, .5, .5];
const sided = slot => slot === 'hand' || slot === 'floor';
// where a worn piece goes on this actor: { x, y, w } as parts of the actor's box, ax, ay the piece's own point, behind
function place(actor, w) {
  const [slot, k, ax, ay] = fitOf(w.id), A = actor.at, R = w.side === 'L' ? 'L' : 'R';
  const by = { hat: ['top', actor.hw], bow: ['bow', actor.hw], eyes: ['eyes', actor.gw], nose: ['nose', actor.hw], mouth: ['mouth', actor.hw], neck: ['neck', actor.sw],
    back: [ax === .5 && ay === .5 ? 'chest' : 'neck', actor.sw], body: ['neck', actor.sw], waist: ['waist', actor.sw], feet: ['feet', actor.fw], hand: ['hand' + R, actor.sw] };
  if (slot === 'floor') return { x: R === 'L' ? -.24 : 1.24, y: A.feet[1], w: k, ax, ay, behind: false };
  const [name, measure] = by[slot];
  return { x: A[name][0], y: A[name][1], w: k * measure, ax: slot === 'hand' && R === 'L' ? 1 - ax : ax, ay, behind: slot === 'back', flip: slot === 'hand' && R === 'L' };
}
// one piece to a place: putting a piece on takes off what was there
function wear(look, id, side) {
  const slot = fitOf(id)[0], s = sided(slot) ? (side === 'L' ? 'L' : 'R') : undefined;
  for (let i = look.length - 1; i >= 0; i--) { const o = look[i]; if (o.id === id || (fitOf(o.id)[0] === slot && (!sided(slot) || (o.side === 'L' ? 'L' : 'R') === s))) look.splice(i, 1); }
  look.push(s ? { id, side: s } : { id });
}
// looks saved before the pieces had places kept x and y: only the piece (and its side) is kept
function tidy(look) {
  const old = look.splice(0, look.length);
  old.forEach(o => { if (o && typeof o.id === 'string') wear(look, o.id, o.side || (typeof o.x === 'number' && o.x < .5 ? 'L' : 'R')); });
  return look;
}

function state(st) {
  if (!st.dress || typeof st.dress !== 'object') st.dress = { cur: 'girl', looks: {} };
  if (!st.dress.looks || typeof st.dress.looks !== 'object') st.dress.looks = {};
  if (!ACTORS.some(a => a.id === st.dress.cur)) st.dress.cur = 'girl';
  return st.dress;
}
const open = (bank, st, a) => a.need === 0 || TH.prizes.stageDone(bank, st, a.need);
function lookOf(st, id) {
  const d = state(st), look = (d.looks[id] = Array.isArray(d.looks[id]) ? d.looks[id] : []);
  if (look.some(o => !o || typeof o.x === 'number')) tidy(look);
  return look;
}

// an actor with what it wears: used in the dressing room and on Home's stage
function actorEl(actor, look, cls) {
  const { el } = TH.ui, P = TH.prizes;
  const pic = el('img', { class: 'actor-pic', src: `assets/dress/${actor.id}.webp`, alt: '', draggable: 'false' });
  const box = el('div', { class: 'actor ' + (cls || ''), style: { aspectRatio: String(actor.ar) } }, pic);
  box.style.setProperty('--ar', String(actor.ar));
  (look || []).map((w, i) => ({ w, i })).sort((a, b) => ORDER.indexOf(fitOf(a.w.id)[0]) - ORDER.indexOf(fitOf(b.w.id)[0])).forEach(({ w, i }) => {
    const q = place(actor, w);
    const n = el('img', { class: 'worn' + (q.behind ? ' behind' : ''), src: P.src(w.id), alt: '', draggable: 'false', 'data-i': String(i),
      style: { left: (q.x * 100) + '%', top: (q.y * 100) + '%', width: (q.w * 100) + '%', transform: `translate(${-q.ax * 100}%, ${-q.ay * 100}%)${q.flip ? ' scaleX(-1)' : ''}` } });
    if (q.behind) box.insertBefore(n, pic); else box.append(n);
  });
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
  // drag a piece: from the wardrobe (put it on) or from the actor (change its hand or side, or take it off by dropping
  // it away from the actor). Wherever she lets go on the actor, the piece goes to its own place.
  function startDrag(e, what) {
    if (e.button > 0) return;
    e.preventDefault();
    const actor = ACTORS.find(x => x.id === d.cur), look = lookOf(st, d.cur), was = what.from != null ? look[what.from] : null, id = what.id || was.id;
    const r = box.getBoundingClientRect(), wpx = Math.max(60, place(actor, { id }).w * r.width);
    const ghost = el('img', { class: 'dr-ghost', src: P.src(id), alt: '', draggable: 'false', style: { width: wpx + 'px' } });
    document.body.append(ghost);
    let moved = false; const x0 = e.clientX, y0 = e.clientY;
    const put = ev => { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) moved = true; };
    put(e); TH.ui.sound('pick');
    const worn = was ? box.querySelector(`.worn[data-i="${what.from}"]`) : null;
    if (worn) worn.style.visibility = 'hidden';
    const move = ev => { ev.preventDefault(); put(ev); };
    const up = ev => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      ghost.remove();
      const b = box.getBoundingClientRect(), x = (ev.clientX - b.left) / b.width, y = (ev.clientY - b.top) / b.height;
      const inside = x > -0.45 && x < 1.45 && y > -0.15 && y < 1.1 && ev.type !== 'pointercancel';
      const side = x < .5 ? 'L' : 'R';
      if (was && !moved) { /* a tap on a worn piece leaves it where it is */ }
      else if (was && !inside) { look.splice(look.indexOf(was), 1); TH.ui.sound('soft'); }           // dragged away: it comes off
      else if (inside || !moved) { wear(look, id, moved ? side : (was && was.side) || (look.some(o => fitOf(o.id)[0] === fitOf(id)[0] && o.side !== 'L') ? 'L' : 'R')); TH.ui.sound('drop'); }
      else TH.ui.sound('soft');
      save(); drawActor();
    };
    window.addEventListener('pointermove', move, { passive: false }); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }
  drawHeads(); drawActor(); drawRack();
  close.addEventListener('click', onBack);
  go.addEventListener('click', () => { TH.ui.sound('curtain'); onBack(); });
}

TH.dress = { ACTORS, FIT, room, onStage, actorEl, state, place, wear, tidy };
if (typeof module !== 'undefined') module.exports = TH.dress;
})(typeof window !== 'undefined' ? (window.TH = window.TH || {}) : {});
