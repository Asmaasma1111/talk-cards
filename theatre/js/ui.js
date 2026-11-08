/* مسرح المسائل: shared helpers. Elements, icons, toast, press-and-hold, the things she moves (ChatGPT picture when it
   exists, else the iPad's own emoji), calm Web Audio sounds, the voice (recorded clip when it exists, else the iPad's
   Arabic voice), and saved progress:
   - localStorage 'mariaTheatre.v1': stage, shapes met, stories done, the day's plan, stars, settings
   - IndexedDB 'mariaTheatre', store 'pad' (keyPath 'id'): her drawings as small PNGs, one per story per day
   Both are in تطبيقات ماريا's Back up / Restore (app.js: DEVICE_KEYS and DEVICE_DBS). Nothing here deletes her work. */
(function (TH) {
'use strict';
const C = TH.core;

function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.entries(v).forEach(([q, w]) => (q.startsWith('--') ? n.style.setProperty(q, w) : (n.style[q] = w)));
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) n.append(k.nodeType ? k : document.createTextNode(String(k)));
  return n;
}
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

const ICON = {
  tick: '<svg viewBox="0 0 24 24"><path d="M4.5 12.8l4.6 4.6L19.5 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M3.5 9.2h3.8L12.4 5v14l-5.1-4.2H3.5z" fill="currentColor"/><path d="M15.6 9a4.2 4.2 0 0 1 0 6M18.4 6.4a8 8 0 0 1 0 11.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M3.5 9.2h3.8L12.4 5v14l-5.1-4.2H3.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 7H4.5V2.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.8 7a8 8 0 1 1-1.3 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  eraser: '<svg viewBox="0 0 24 24"><path d="M14.5 4.5l5 5-9.2 9.2H6.6l-2.9-2.9a1.4 1.4 0 0 1 0-2z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M9.2 9.8l5 5M10.3 18.7H20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  pencil: '<svg viewBox="0 0 24 24"><path d="M15.2 4.8l4 4L8.6 19.4l-5 1 1-5z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><path d="M13.2 6.8l4 4" stroke="currentColor" stroke-width="2.3"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3.8 11.2 12 4.3l8.2 6.9M6.3 9.4V19a1 1 0 0 0 1 1h3.4v-5.2h2.6V20h3.4a1 1 0 0 0 1-1V9.4" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  del: '<svg viewBox="0 0 24 24"><path d="M20 6H9l-6 6 6 6h11a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M11.5 9.5l5 5M16.5 9.5l-5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
};
const icon = (name, cls) => el('span', { class: 'ic ' + (cls || ''), 'aria-hidden': 'true', html: ICON[name] });

let toastT = 0;
function toast(msg, ms) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => { t.classList.remove('on'); setTimeout(() => { t.hidden = true; }, 300); }, ms || 2400);
}
function holdToOpen(btn, ms, fn) {
  let t = 0;
  const start = e => { e.preventDefault(); btn.classList.add('holding'); t = setTimeout(() => { btn.classList.remove('holding'); fn(); }, ms); };
  const end = () => { clearTimeout(t); btn.classList.remove('holding'); };
  btn.addEventListener('pointerdown', start);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, end));
  btn.addEventListener('contextmenu', e => e.preventDefault());
}
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- the things she moves ---------- */
// e: the iPad's emoji until its ChatGPT clay picture exists (assets/things/<key>.png, listed in files.json); c: the colour of its 10s and 100s
const THINGS = {
  book: ['📕', '#E0574F'], egg: ['🥚', '#E9C46A'], chicken: ['🐔', '#E76F51'], sticker: ['⭐', '#F2B705'], page: ['📄', '#7A8CC2'],
  visitor: ['🧍', '#6D83C9'], student: ['👧', '#E06C9F'], student2: ['🧒', '#9A6FD0'], glasses: ['👓', '#4E7FC4'], cube: ['🟦', '#3E82D6'],
  riyal: ['🪙', '#2F9E63'], card: ['🃏', '#8A6FD1'], date: ['🌰', '#8B5A2B'], passenger: ['🧍', '#4D86C7'], squishy: ['🍡', '#F07FB0'],
  water: ['💧', '#3AA3E0'], step: ['👣', '#A07B5B'], ball: ['⚽', '#666'], 'ball-red': ['🔴', '#E04848'], 'ball-blue': ['🔵', '#3C78D8'],
  sheep: ['🐑', '#B9A88F'], goat: ['🐐', '#8C7356'], palm: ['🌴', '#3E9B4F'], lemon: ['🍋', '#E8C21E'], pencil: ['✏️', '#F2A33A'],
  crayon: ['🖍️', '#D9534F'], mother: ['👩', '#C76BA8'], girl: ['👧', '#F07FB0'], boy: ['👦', '#4F8AD8'], story: ['📗', '#3FA45B'],
  story2: ['📘', '#3E7BD0'], crate: ['📦', '#B7834A'], orange: ['🍊', '#F28C28'], apple: ['🍎', '#E04848'], paper: ['📄', '#8E9BC4'],
  cake: ['🧁', '#E58BB5'], strawberry: ['🍓', '#E2475B'], banana: ['🍌', '#E8C21E'], candy: ['🍬', '#E879B9'], tree: ['🌳', '#3E9B4F'],
  chair: ['🪑', '#B7834A'], wheel: ['🛞', '#555'], paw: ['🐾', '#8C7356'], day: ['📅', '#E06C6C'], seat: ['💺', '#4D86C7'],
  balloon: ['🎈', '#E04848'], star: ['⭐', '#F2B705'], choc: ['🍫', '#7B4A2A'], tile: ['🟫', '#A0704A'], plant: ['🌱', '#4CAF50'], necklace: ['📿', '#C27BA0']
};
// what holds 10, 100 or 1000 of each thing (her idea, 7 Nov 2026: three boxes with ١٠٠ under each, not squares).
// Names are pictures in assets/packs/ (Microsoft Fluent Emoji 3D, made by scripts/theatre_icons.py); the thing sits on it as a badge.
const PACKS = {
  _: { 10: 'bags', 100: 'box', 1000: 'truck' },
  book: { 10: 'books', 100: 'box' }, story: { 10: 'books', 100: 'box' }, story2: { 10: 'books', 100: 'box' },
  page: { 10: 'notebook', 100: 'ledger' }, paper: { 10: 'notebook', 100: 'ledger' }, sticker: { 10: 'album', 100: 'box' },
  egg: { 10: 'nest', 100: 'basket' }, chicken: { 100: 'hut', 1000: 'houses' }, date: { 10: 'basket', 100: 'box' },
  apple: { 10: 'basket', 100: 'box' }, orange: { 10: 'basket', 100: 'box' }, lemon: { 10: 'basket', 100: 'box' },
  banana: { 10: 'basket', 100: 'box' }, strawberry: { 10: 'basket', 100: 'box' }, candy: { 10: 'basket', 100: 'box' }, cake: { 10: 'basket', 100: 'box' },
  ball: { 10: 'basket', 100: 'box' }, 'ball-red': { 10: 'basket', 100: 'box' }, 'ball-blue': { 10: 'basket', 100: 'box' }, squishy: { 10: 'basket', 100: 'box' },
  visitor: { 10: 'minibus', 100: 'bus', 1000: 'stadium' }, passenger: { 10: 'minibus', 100: 'bus', 1000: 'stadium' },
  student: { 10: 'minibus', 100: 'bus' }, student2: { 10: 'minibus', 100: 'bus' }, girl: { 10: 'minibus', 100: 'bus' },
  boy: { 10: 'minibus', 100: 'bus' }, mother: { 10: 'minibus', 100: 'bus' }, glasses: { 10: 'filebox', 100: 'box' },
  water: { 10: 'bucket', 100: 'bath', 1000: 'tank' }, palm: { 10: 'island', 100: 'park' }, tree: { 10: 'island', 100: 'park' },
  sheep: { 10: 'hut', 100: 'houses' }, goat: { 10: 'hut', 100: 'houses' }, crate: { 10: 'pickup', 100: 'truck' },
  pencil: { 10: 'filebox', 100: 'box' }, crayon: { 10: 'filebox', 100: 'box' }, step: { 10: 'steps', 100: 'steps' },
  cube: { 10: 'bags', 100: 'box', 1000: 'truck' }
};
function pack(key, v) {
  const name = (PACKS[key] && PACKS[key][v]) || PACKS._[v];
  const box = el('span', { class: 'pk-art' });
  if (hasPic(`packs/${name}.webp`)) box.append(el('img', { class: 'th-pic pk-box', src: `assets/packs/${name}.webp`, alt: '', draggable: 'false' }));
  else box.append(el('span', { class: 'th-emo pk-box' }, ({ 10: '🛍️', 100: '📦', 1000: '🚚' })[v]));
  box.append(el('span', { class: 'pk-badge' }, thing(key)));
  return box;
}
let ASSETS = new Set();
async function initAssets() {
  try { const f = await (await fetch('files.json', { cache: 'no-cache' })).json(); ASSETS = new Set(f.files.map(x => x.replace(/^theatre\//, ''))); } catch (e) {}
}
const hasPic = name => ASSETS.has('assets/' + name);
function thing(key, cls) {
  const t = THINGS[key] || THINGS.cube;
  if (hasPic('things/' + key + '.webp')) return el('img', { class: 'th-pic ' + (cls || ''), src: 'assets/things/' + key + '.webp', alt: '', draggable: 'false' });
  return el('span', { class: 'th-emo ' + (cls || '') }, t[0]);
}
const colour = key => (THINGS[key] || THINGS.cube)[1];
function pic(name, cls) {
  if (hasPic(name)) return el('img', { class: 'pic ' + (cls || ''), src: 'assets/' + name, alt: '', draggable: 'false' });
  return el('span', { class: 'ph ' + (cls || ''), lang: 'en', dir: 'ltr' }, name);
}

/* ---------- sounds (Web Audio, no files) ---------- */
let ctx = null;
function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, start, dur, vol, type) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + start, o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || 0.05, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.03);
}
const SOUNDS = {
  tap: () => tone(620, 0, 0.06, 0.035),
  pick: () => tone(700, 0, 0.05, 0.03),
  drop: () => { tone(523, 0, 0.08, 0.04); tone(659, 0.05, 0.1, 0.035); },
  pop: () => { tone(880, 0, 0.06, 0.04, 'triangle'); tone(1175, 0.04, 0.08, 0.03, 'triangle'); },
  snap: () => { tone(392, 0, 0.07, 0.05, 'square'); tone(784, 0.06, 0.12, 0.04, 'triangle'); },
  good: () => { tone(784, 0, 0.16, 0.05, 'triangle'); tone(1046, 0.09, 0.22, 0.045, 'triangle'); },
  soft: () => tone(330, 0, 0.22, 0.04),
  star: () => [659, 784, 988, 1318].forEach((f, i) => tone(f, i * 0.09, 0.3, 0.045, 'triangle')),
  curtain: () => { tone(587, 0, 0.5, 0.04, 'triangle'); tone(440, 0.08, 0.6, 0.035, 'triangle'); }
};
function sound(name) { if (store.get().muted) return; try { SOUNDS[name] && SOUNDS[name](); } catch (e) {} }
window.addEventListener('pointerdown', () => { if (!store.get().muted) ac(); }, { once: true });

/* ---------- the voice ---------- */
let clips = {}, run = 0;
const audio = new Audio(); audio.preload = 'auto';
async function initVoice() { try { const r = await fetch('audio/voice.json', { cache: 'no-cache' }); if (r.ok) clips = (await r.json()).clips || {}; } catch (e) { clips = {}; } }
let arVoice = null;
function pickVoice() {
  if (arVoice || !window.speechSynthesis) return arVoice;
  const vs = speechSynthesis.getVoices().filter(v => /^ar/i.test(v.lang));
  arVoice = vs.find(v => /SA/i.test(v.lang)) || vs[0] || null;
  return arVoice;
}
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { arVoice = null; pickVoice(); };
// the reader is quiet when all sound is off, or when Mama switched the reader off (her request, 8 Nov 2026: "if we want to read
// that ourselves, we would mute the reader altogether"); the little sounds stay
const quiet = () => store.get().muted || store.get().reader === false;
function speakOne(text, n) {
  return new Promise(ok => {
    if (n !== run || !window.speechSynthesis || quiet()) return ok(false);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA'; const v = pickVoice(); if (v) u.voice = v;
    u.rate = 0.88; u.onend = () => ok(true); u.onerror = () => ok(false);
    speechSynthesis.speak(u);
    setTimeout(() => ok(false), 3000 + text.length * 150);
  });
}
function playClip(id, n) {
  return new Promise(ok => {
    if (n !== run || quiet()) return ok(false);
    audio.onended = () => ok(true); audio.onerror = () => ok(false);
    audio.src = 'audio/' + clips[id]; audio.play().catch(() => ok(false));
  });
}
// say(text, id): the recorded clip id when there is one, else the iPad's voice
async function say(text, id) {
  stop(); const n = ++run;
  if (id && clips[id]) { if (await playClip(id, n)) return true; }
  return speakOne(text, n);
}
function stop() { run++; try { audio.pause(); } catch (e) {} try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} }
// counting out loud as she moves things: the newest number wins
function count(n) { if (quiet()) return; stop(); const k = ++run; speakOne(C.ar(n), k); }

/* ---------- saved progress ---------- */
const KEY = 'mariaTheatre.v1';
let state = null;
const pad2 = n => String(n).padStart(2, '0');
function today() {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') { const q = new URLSearchParams(location.search).get('day'); if (q && /^\d{4}-\d\d-\d\d$/.test(q)) return q; }
  const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function clean(s) {
  s = s && typeof s === 'object' ? s : {};
  return Object.assign({ v: 1, stage: 1, met: [], done: {}, lastKind: null, twinNext: 0, perDay: 4, days: {}, stars: 0, muted: false, reader: true, seenIntro: false }, s,
    { met: Array.isArray(s.met) ? s.met : [], done: s.done && typeof s.done === 'object' ? s.done : {}, days: s.days && typeof s.days === 'object' ? s.days : {} });
}
const store = {
  get() { if (!state) { let raw = null; try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {} state = clean(raw); } return state; },
  save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } },
  today
};
let dbp = null;
const mem = new Map();
function db() {
  if (dbp) return dbp;
  dbp = new Promise(ok => {
    try {
      const q = indexedDB.open('mariaTheatre', 1);
      q.onupgradeneeded = () => { if (!q.result.objectStoreNames.contains('pad')) q.result.createObjectStore('pad', { keyPath: 'id' }); };
      q.onsuccess = () => ok(q.result); q.onerror = () => ok(null);
    } catch (e) { ok(null); }
  });
  return dbp;
}
async function putPad(row) {
  mem.set(row.id, row);
  const d = await db(); if (!d) return false;
  return new Promise(ok => { try { const tx = d.transaction('pad', 'readwrite'); tx.objectStore('pad').put(row); tx.oncomplete = () => ok(true); tx.onerror = () => ok(false); } catch (e) { ok(false); } });
}
async function getPad(id) {
  if (mem.has(id)) return mem.get(id);
  const d = await db(); if (!d) return null;
  return new Promise(ok => { try { const q = d.transaction('pad').objectStore('pad').get(id); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null); } catch (e) { ok(null); } });
}
async function allPads() {
  const d = await db(); if (!d) return Array.from(mem.values());
  return new Promise(ok => { try { const q = d.transaction('pad').objectStore('pad').getAll(); q.onsuccess = () => ok(q.result || []); q.onerror = () => ok([]); } catch (e) { ok([]); } });
}

/* ---------- the screen never scrolls (her report, 8 Nov 2026: the compare box was far down and could not be reached) ----------
   fit(box, opts): box holds one child; that child is laid out at its own size and scaled to fill the box without spilling,
   whatever the iPad's turn and however many things are on it. It refits when the box changes size or its content changes.
   opts.max: the largest scale (things grow on a big screen); opts.top: keep it at the top instead of the middle. */
function fit(box, opts) {
  opts = opts || {};
  const inner = box.firstElementChild; if (!inner) return;
  const max = opts.max || 1, min = 0.25;
  box.classList.add('fit-box'); inner.classList.add('fit-in');
  let raf = 0;
  const later = () => { if (!raf) raf = requestAnimationFrame(apply); };
  function apply() {
    raf = 0;
    // the box's padding is kept clear (the curtains of the stage picture)
    const cs = getComputedStyle(box), pl = parseFloat(cs.paddingLeft) || 0, pt = parseFloat(cs.paddingTop) || 0;
    const bw = box.clientWidth - pl - (parseFloat(cs.paddingRight) || 0), bh = box.clientHeight - pt - (parseFloat(cs.paddingBottom) || 0);
    if (bw <= 0 || bh <= 0 || !inner.isConnected) return;
    const fits = s => { inner.style.width = (bw / s) + 'px'; return inner.scrollWidth * s <= bw + 0.5 && inner.scrollHeight * s <= bh + 0.5; };
    let s = max;
    if (!fits(max)) { let lo = min, hi = max; for (let i = 0; i < 8; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; } s = lo; fits(s); }
    const dy = pt + (opts.top ? 0 : Math.max(0, (bh - inner.scrollHeight * s) / 2));
    inner.style.transform = `translate(${pl}px, ${dy}px) scale(${s})`;
    box.style.setProperty('--s', s);
  }
  new ResizeObserver(later).observe(box);
  new MutationObserver(later).observe(inner, { childList: true, subtree: true, characterData: true });
  apply();
  return later;
}
// the copy that follows her finger: the same size as the thing she lifted (even when its board is scaled), moved with transform
function ghost(node, x, y) {
  const r = node.getBoundingClientRect(), k = node.offsetWidth ? r.width / node.offsetWidth : 1;
  const g = node.cloneNode(true); g.classList.remove('lifted', 'picked', 'nope'); g.classList.add('ghost');
  Object.assign(g.style, { width: node.offsetWidth + 'px', height: node.offsetHeight + 'px', left: '0', top: '0' });
  const ox = x - r.left, oy = y - r.top;
  const move = (cx, cy) => { g.style.transform = `translate3d(${cx - ox}px, ${cy - oy}px, 0) scale(${k * 1.12})`; };
  move(x, y); document.body.append(g);
  return { move, remove: () => g.remove() };
}
// where a finger lets go: the target under it, or the nearest one within reach (little fingers miss by a few millimetres)
function dropAt(root, sel, x, y, reach) {
  const h = document.elementFromPoint(x, y); const t = h && h.closest && h.closest(sel);
  if (t && root.contains(t)) return t;
  let best = null, bd = reach == null ? 60 : reach;
  root.querySelectorAll(sel).forEach(n => {
    const r = n.getBoundingClientRect(); if (!r.width) return;
    const d = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
    if (d < bd) { bd = d; best = n; }
  });
  return best;
}

TH.ui = { el, $, $$, icon, toast, holdToOpen, wait, thing, pack, colour, THINGS, pic, hasPic, initAssets, sound, say, stop, count, initVoice, fit, ghost, dropAt };
TH.store = store; TH.pads = { put: putPad, get: getPad, all: allPads };
})(window.TH);
