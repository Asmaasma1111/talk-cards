/* صانعة السكويشي: the squishy maker of مكتبتي's month 2 (her pick, 18 Oct 2026).
   Every month-2 book she finishes unlocks one piece (a shape, a face, a glitter or a topping; UNLOCKS, in order), and every
   5 pieces she makes and names one squishy that goes into the glass jar on the studio table.
   The squishies are realistic: ChatGPT photos of PURE WHITE foam squishies (assets/library/squishy/<shape>.webp) that are
   tinted here in a canvas (only the pale pixels, so green leaves and the noodle top keep their own colours), with fine
   glitter flakes, a printed kawaii face (SVG) and realistic toppings (top-<name>.webp). Loaded before library.js. */
(function (root) {
'use strict';

const BASE = 'assets/library/squishy/';
const SHAPES = [['ball', 'كرة', '#FFB3C7'], ['butter', 'زبدة', '#FFE58A'], ['cat', 'قطّة', '#FFC9A3'], ['peanut', 'فول سوداني', '#F3D2A0'],
  ['cloud', 'غيمة', '#A9D8FF'], ['cheese', 'جبن', '#FFD45E'], ['banana', 'موزة', '#FFE066'], ['strawberry', 'فراولة', '#FF8C9A'],
  ['noodles', 'نودلز', '#FFFFFF'], ['star', 'نجمة', '#D4C2FF']];
const FACES = [['happy', 'سعيدة'], ['sleepy', 'نعسانة'], ['wink', 'غمزة'], ['stars', 'عيون نجوم'], ['oh', 'متفاجئة'], ['tongue', 'مشاغبة'], ['shy', 'خجولة']];
const GLITTER = [['none', 'بلا لمعة', null], ['gold', 'ذهبية', '#F2C230'], ['pink', 'وردية', '#FF4FA0'], ['blue', 'زرقاء', '#3D8BFF'],
  ['purple', 'بنفسجية', '#9A5BFF'], ['green', 'خضراء', '#2FC46A'], ['rainbow', 'قوس قزح', 'rainbow']];
const TOPS = [['none', 'بلا زينة'], ['bow', 'فيونكة'], ['sprinkles', 'رشّات'], ['cherry', 'كرزة'], ['crown', 'تاج'], ['flower', 'وردة'],
  ['hearts', 'قلوب'], ['shades', 'نظّارة'], ['leaf', 'ورقة شجر'], ['glow', 'يضيء في الظلام']];
const COLOURS = ['#FFB3C7', '#FF8F8F', '#FFC9A3', '#FFE58A', '#FFF4DC', '#B9EBC4', '#A9D8FF', '#D4C2FF', '#E9B47A', '#FFFFFF'];
const START = ['shape:ball', 'face:happy', 'glitter:none', 'top:none'];     // hers from the first day of month 2
// one piece for each month-2 book, in the order she earns them (by count, so a book held back does not leave a gap)
const UNLOCKS = ['face:sleepy', 'glitter:gold', 'shape:butter', 'top:bow', 'shape:cat', 'face:wink', 'glitter:pink', 'shape:peanut',
  'top:sprinkles', 'shape:cloud', 'glitter:blue', 'face:stars', 'top:cherry', 'shape:cheese', 'top:crown', 'glitter:purple', 'face:oh',
  'shape:banana', 'top:flower', 'shape:strawberry', 'glitter:green', 'face:tongue', 'top:hearts', 'shape:noodles', 'top:shades',
  'glitter:rainbow', 'face:shy', 'top:leaf', 'shape:star', 'top:glow'];
const PER = 5, MAX = 6;                        // a new squishy every 5 pieces, six by the end of month 2
const KIND = { shape: ['شكل جديد', SHAPES], face: ['وجه جديد', FACES], glitter: ['لمعة جديدة', GLITTER], top: ['زينة جديدة', TOPS] };

// For each shape: where the printed face sits (fx, fy, a share of the picture), how far apart the eyes are (fs, a share of
// its width) and where a topping sits (tx, ty). 'keep': an ellipse that is never tinted (the noodle top).
const SH = {
  ball: { fx: .5, fy: .6, fs: .25, tx: .5, ty: .04 },
  butter: { fx: .42, fy: .7, fs: .17, tx: .6, ty: .14 },
  cat: { fx: .5, fy: .63, fs: .21, tx: .8, ty: .14 },
  peanut: { fx: .5, fy: .72, fs: .32, tx: .5, ty: .03 },
  cloud: { fx: .5, fy: .63, fs: .2, tx: .45, ty: .06 },
  cheese: { fx: .35, fy: .63, fs: .2, tx: .55, ty: .08 },
  banana: { fx: .55, fy: .62, fs: .15, tx: .07, ty: .1 },
  strawberry: { fx: .5, fy: .63, fs: .22, tx: .52, ty: .07 },
  noodles: { fx: .46, fy: .79, fs: .17, tx: .5, ty: .05, keep: [.47, .24, .45, .27] },
  star: { fx: .5, fy: .58, fs: .2, tx: .5, ty: .04 }
};
const IMG = {};
let loading = null;
const loadImg = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
function preload() {
  if (!loading) loading = Promise.all([...SHAPES.map(s => s[0]), ...['bow', 'cherry', 'crown', 'flower', 'leaf', 'shades'].map(k => 'top-' + k)]
    .map(async k => { IMG[k] = await loadImg(BASE + k + '.webp'); }));
  return loading;
}
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
function box(shape) {            // where the picture sits in the 300 × 300 square: fitted, centred, standing on y = 262
  const im = IMG[shape]; if (!im) return { x: 40, y: 60, w: 220, h: 200 };
  const k = Math.min(240 / im.width, 214 / im.height), w = im.width * k, h = im.height * k;
  return { x: 150 - w / 2, y: 262 - h, w, h };
}
const BODY = new Map();
function bodyCanvas(o, px) {
  const key = [o.shape, o.colour, o.glitter, o.top === 'sprinkles', px].join('|');
  if (BODY.has(key)) return BODY.get(key);
  const c = document.createElement('canvas'); c.width = c.height = px;
  const ctx = c.getContext('2d'), u = px / 300, b = box(o.shape), im = IMG[o.shape];
  ctx.save(); ctx.filter = `blur(${5 * u}px)`; ctx.fillStyle = 'rgba(80,55,40,.22)';      // a soft shadow under it
  ctx.beginPath(); ctx.ellipse(150 * u, 264 * u, b.w * .42 * u, 9 * u, 0, 0, 7); ctx.fill(); ctx.restore();
  if (!im) return c;
  const o2 = document.createElement('canvas'); o2.width = o2.height = px; const x2 = o2.getContext('2d', { willReadFrequently: true });
  x2.drawImage(im, b.x * u, b.y * u, b.w * u, b.h * u);
  const data = x2.getImageData(0, 0, px, px), d = data.data, [cr, cg, cb] = hexRgb(o.colour || '#FFFFFF'), kp = SH[o.shape].keep;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    if (kp) { const q = i / 4, X = ((q % px) / u - b.x) / b.w, Y = (Math.floor(q / px) / u - b.y) / b.h;
      if (((X - kp[0]) / kp[2]) ** 2 + ((Y - kp[1]) / kp[3]) ** 2 < 1) continue; }
    const R = d[i], G = d[i + 1], B = d[i + 2], mx = Math.max(R, G, B), mn = Math.min(R, G, B), sat = mx ? (mx - mn) / mx : 0;
    const keep = Math.min(1, Math.max(0, (sat - .16) / .12));          // coloured parts (leaves, tips) keep their own colour
    if (keep >= 1) continue;
    const L = (R * .3 + G * .59 + B * .11) / 255, k = Math.min(1.12, L / .86), hl = Math.max(0, Math.min(1, (L - .93) / .07)) * .5;
    const t = [cr, cg, cb].map(v => v * k * (1 - hl) + 255 * hl);
    d[i] = t[0] * (1 - keep) + R * keep; d[i + 1] = t[1] * (1 - keep) + G * keep; d[i + 2] = t[2] * (1 - keep) + B * keep;
  }
  x2.putImageData(data, 0, 0);
  x2.globalCompositeOperation = 'source-atop';                           // glitter and sprinkles stay inside the squishy
  const R = rnd(11 + o.shape.length * 37);
  if (o.glitter && o.glitter !== 'none') {         // glitter: tiny flakes inside glossy jelly, a few catching the light
    const g = (GLITTER.find(x => x[0] === o.glitter) || [])[2] || '#F2C230', rb = ['#FF4F7A', '#FFA23D', '#FFD93D', '#3DCB6B', '#3D8BFF', '#9A5BFF'];
    const tone = (hex, k) => { const [r0, g0, b0] = hexRgb(hex); return k > 0 ? `rgb(${r0 + (255 - r0) * k},${g0 + (255 - g0) * k},${b0 + (255 - b0) * k})` : `rgb(${r0 * (1 + k)},${g0 * (1 + k)},${b0 * (1 + k)})`; };
    const n = Math.round(b.w * b.h / 34);
    for (let i = 0; i < n; i++) {
      const x = (b.x + R() * b.w) * u, y = (b.y + R() * b.h) * u, r = (.35 + R() * R() * 1.4) * u, base = g === 'rainbow' ? rb[i % 6] : g;
      const lift = R(); x2.fillStyle = tone(base, lift > .93 ? .85 : lift < .3 ? -.25 : (lift - .3) * .5); x2.globalAlpha = .35 + R() * .6;
      x2.save(); x2.translate(x, y); x2.rotate(R() * 3); x2.beginPath();
      for (let k = 0; k < 6; k++) { const ang = k * Math.PI / 3; x2.lineTo(r * Math.cos(ang), r * Math.sin(ang)); }
      x2.fill(); x2.restore();
    }
    x2.globalAlpha = 1; x2.shadowColor = '#fff'; x2.shadowBlur = 6 * u; x2.fillStyle = '#fff';
    for (let i = 0; i < 16; i++) {                  // glints
      const x = (b.x + b.w * (.1 + R() * .8)) * u, y = (b.y + b.h * (.08 + R() * .7)) * u, r = (2 + R() * 3.5) * u;
      x2.beginPath(); for (let k = 0; k < 8; k++) { const ang = k * Math.PI / 4, rr = k % 2 ? r * .18 : r; x2.lineTo(x + rr * Math.cos(ang), y + rr * Math.sin(ang)); } x2.fill();
    }
    x2.shadowBlur = 0;
    const sh = x2.createRadialGradient((b.x + b.w * .32) * u, (b.y + b.h * .22) * u, 0, (b.x + b.w * .32) * u, (b.y + b.h * .22) * u, b.w * .55 * u);
    sh.addColorStop(0, 'rgba(255,255,255,.55)'); sh.addColorStop(.35, 'rgba(255,255,255,.12)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    x2.fillStyle = sh; x2.fillRect(0, 0, px, px);   // glossy jelly sheen
  }
  if (o.top === 'sprinkles') {
    const cols = ['#FF5C8A', '#3DB7F2', '#FFD23D', '#5CCB6B', '#9B6BFF', '#FFFFFF'];
    for (let i = 0; i < 34; i++) {
      const x = (b.x + b.w * (.12 + R() * .76)) * u, y = (b.y + b.h * (.06 + R() * .34)) * u, a = R() * Math.PI;
      x2.save(); x2.translate(x, y); x2.rotate(a); x2.fillStyle = 'rgba(0,0,0,.18)'; x2.fillRect(-5 * u, -.6 * u, 10 * u, 3.4 * u);
      x2.fillStyle = cols[i % 6]; x2.beginPath(); if (x2.roundRect) x2.roundRect(-5 * u, -1.6 * u, 10 * u, 3.2 * u, 1.6 * u); else x2.rect(-5 * u, -1.6 * u, 10 * u, 3.2 * u); x2.fill(); x2.restore();
    }
  }
  ctx.drawImage(o2, 0, 0);
  if (BODY.size > 120) BODY.clear();
  BODY.set(key, c); return c;
}
function face(kind, [x, y, s]) {
  const ink = '#2E2220';
  const e = dx => `<ellipse cx="${x + dx}" cy="${y}" rx="${8 * s}" ry="${10 * s}" fill="${ink}"/><circle cx="${x + dx - 3 * s}" cy="${y - 4 * s}" r="${3 * s}" fill="#fff"/>`;
  const arc = (dx, up = 1) => `<path d="M${x + dx - 9 * s},${y} Q${x + dx},${y + (up ? 8 : -8) * s} ${x + dx + 9 * s},${y}" stroke="${ink}" stroke-width="${4 * s}" fill="none" stroke-linecap="round"/>`;
  const blush = (k = 1) => `<ellipse cx="${x - 40 * s}" cy="${y + 14 * s}" rx="${11 * s * k}" ry="${6 * s * k}" fill="#FF6F95" opacity=".38"/><ellipse cx="${x + 40 * s}" cy="${y + 14 * s}" rx="${11 * s * k}" ry="${6 * s * k}" fill="#FF6F95" opacity=".38"/>`;
  const smile = `<path d="M${x - 9 * s},${y + 16 * s} Q${x},${y + 25 * s} ${x + 9 * s},${y + 16 * s}" stroke="${ink}" stroke-width="${3.5 * s}" fill="none" stroke-linecap="round"/>`;
  const star = dx => { const r = 11 * s, pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; pts.push((x + dx + rr * Math.cos(a)).toFixed(1) + ',' + (y + rr * Math.sin(a)).toFixed(1)); } return `<polygon points="${pts.join(' ')}" fill="${ink}" stroke="${ink}" stroke-width="${2 * s}" stroke-linejoin="round"/><circle cx="${x + dx - 2 * s}" cy="${y - 3 * s}" r="${2 * s}" fill="#fff"/>`; };
  let f;
  if (kind === 'sleepy') f = arc(-24, 1) + arc(24, 1) + blush() + `<ellipse cx="${x}" cy="${y + 19 * s}" rx="${4 * s}" ry="${3 * s}" fill="${ink}"/>`;
  else if (kind === 'wink') f = arc(-24, 0) + e(24) + blush() + smile;
  else if (kind === 'stars') f = star(-24) + star(24) + blush() + smile;
  else if (kind === 'oh') f = e(-24) + e(24) + blush(.8) + `<ellipse cx="${x}" cy="${y + 20 * s}" rx="${6 * s}" ry="${7 * s}" fill="${ink}"/>`;
  else if (kind === 'tongue') f = arc(-24, 0) + arc(24, 0) + blush() + `<path d="M${x - 11 * s},${y + 14 * s} Q${x},${y + 30 * s} ${x + 11 * s},${y + 14 * s} Z" fill="${ink}"/><ellipse cx="${x + 2 * s}" cy="${y + 23 * s}" rx="${5 * s}" ry="${4 * s}" fill="#FF7F9F"/>`;
  else if (kind === 'shy') f = arc(-24, 1) + arc(24, 1) + blush(1.4) + `<path d="M${x - 8 * s},${y + 18 * s} q${4 * s},${-4 * s} ${8 * s},0 q${4 * s},${4 * s} ${8 * s},0" stroke="${ink}" stroke-width="${3 * s}" fill="none" stroke-linecap="round"/>`;
  else f = e(-24) + e(24) + blush() + smile;
  return `<g opacity=".92">${f}</g>`;      // printed on the foam, so a touch soft
}
// where a topping picture goes (in the 300 × 300 square), or null
function topBox(kind, b, a, fa) {
  const im = IMG['top-' + kind]; if (!im) return null;
  if (kind === 'shades') { const [fx, fy, s] = fa, w = 120 * s, h = w * im.height / im.width; return { im, x: fx - w / 2, y: fy - h / 2 - 2 * s, w, h }; }
  const w = { bow: 70, cherry: 46, crown: 66, flower: 52, leaf: 54 }[kind]; if (!w) return null;
  const h = w * im.height / im.width, tx = b.x + a.tx * b.w, ty = b.y + a.ty * b.h;
  return { im, x: tx - w / 2, y: ty - h * .8, w, h };
}
const hearts = (b, a) => { const ty = b.y + a.ty * b.h; return [[-90, 10, 1], [92, 30, .8], [78, -24, .6]].map(([dx, dy, k]) => `<path transform="translate(${150 + dx},${ty + dy}) scale(${k})" d="M0,10 C-22,-6 -12,-24 0,-12 C12,-24 22,-6 0,10 Z" fill="#FF5C8A"/>`).join(''); };
function topping(kind, b, a, fa) {
  if (kind === 'hearts') return hearts(b, a);
  const t = topBox(kind, b, a, fa); if (!t) return '';
  return `<image href="${BASE}top-${kind}.webp" x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}"/>`;
}
// One squishy as a little stack: the tinted body (canvas), then the face and topping (SVG). px: the canvas size in pixels.
function make(o, px) {
  const el = document.createElement('div'); el.className = 'sqb' + (o.top === 'glow' ? ' glow' : '');
  const shape = SH[o.shape] ? o.shape : 'ball';
  const src = bodyCanvas({ ...o, shape }, px), cv = document.createElement('canvas'); cv.width = cv.height = px; cv.getContext('2d').drawImage(src, 0, 0);
  const b = box(shape), a = SH[shape], s = a.fs * b.w / 48, fa = [b.x + a.fx * b.w, b.y + a.fy * b.h, s];
  el.appendChild(cv);
  el.insertAdjacentHTML('beforeend', `<svg viewBox="0 0 300 300" aria-hidden="true">${face(o.face, fa)}${topping(o.top, b, a, fa)}</svg>`);
  return el;
}
// the same squishy flattened into one picture (a PNG data URL): for pages that are copied as HTML
async function image(o, px) {
  await preload();
  const shape = SH[o.shape] ? o.shape : 'ball', c = document.createElement('canvas'); c.width = c.height = px;
  const ctx = c.getContext('2d'), u = px / 300;
  ctx.drawImage(bodyCanvas({ ...o, shape }, px), 0, 0);
  const b = box(shape), a = SH[shape], s = a.fs * b.w / 48, fa = [b.x + a.fx * b.w, b.y + a.fy * b.h, s];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="${px}" height="${px}">${face(o.face, fa)}${o.top === 'hearts' ? hearts(b, a) : ''}</svg>`;
  const fim = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  if (fim) ctx.drawImage(fim, 0, 0, px, px);
  const t = topBox(o.top, b, a, fa);
  if (t) ctx.drawImage(t.im, t.x * u, t.y * u, t.w * u, t.h * u);
  return c.toDataURL('image/png');
}
const plain = () => ({ shape: 'ball', colour: '#FFB3C7', face: 'happy', glitter: 'none', top: 'none' });
// a squishy that shows off one piece (for the end page of a book and the locked/new tiles)
function preview(piece) {
  const [k, v] = piece.split(':'), o = plain();
  if (k === 'shape') { o.shape = v; o.colour = (SHAPES.find(s => s[0] === v) || [])[2] || o.colour; }
  else o[k] = v;
  if (k === 'glitter' && v !== 'none') o.colour = '#FFF4DC';
  return o;
}
function label(piece) {
  const [k, v] = piece.split(':'), K = KIND[k]; if (!K) return '';
  const it = K[1].find(x => x[0] === v); return `${K[0]}: ${it ? it[1] : v}`;
}
const name = piece => { const [k, v] = piece.split(':'), K = KIND[k], it = K && K[1].find(x => x[0] === v); return it ? it[1] : v; };
const isOpen = (pieces, piece) => START.includes(piece) || pieces.includes(piece);
const unlockedBy = piece => UNLOCKS.indexOf(piece) + 1;      // the how-many-th month-2 book opens it (0: from the start)

root.Squishy = { SHAPES, FACES, GLITTER, TOPS, COLOURS, START, UNLOCKS, PER, MAX, preload, make, image, preview, label, name, isOpen, unlockedBy };
})(typeof window !== 'undefined' ? window : globalThis);
