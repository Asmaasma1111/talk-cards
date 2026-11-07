/* كرّاس الإملاء: small shared helpers: elements, icons, the toast, pictures (or their placeholders), Arabic text at the
   chosen tashkeel level with the target letters coloured, press-and-hold. */
(function (KD) {
'use strict';
const T = window.KDText;

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) n.append(k.nodeType ? k : document.createTextNode(String(k)));
  return n;
}

const ICON = {
  close: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
  tick: '<svg viewBox="0 0 24 24"><path d="M4.5 12.8l4.6 4.6L19.5 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cross: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>',
  ear: '<svg viewBox="0 0 24 24"><path d="M8 9.5a4.5 4.5 0 0 1 9 0c0 2.6-2.2 3.4-2.9 5.2-.5 1.4-.6 3.3-2.6 3.8-1.4.4-2.6-.4-3-1.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M10.6 10.2a2 2 0 0 1 3.8-.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M3.5 9.2h3.8L12.4 5v14l-5.1-4.2H3.5z" fill="currentColor"/><path d="M15.6 9a4.2 4.2 0 0 1 0 6M18.4 6.4a8 8 0 0 1 0 11.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M3.5 9.2h3.8L12.4 5v14l-5.1-4.2H3.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 7H4.5V2.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.8 7a8 8 0 1 1-1.3 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  eraser: '<svg viewBox="0 0 24 24"><path d="M14.5 4.5l5 5-9.2 9.2H6.6l-2.9-2.9a1.4 1.4 0 0 1 0-2z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M9.2 9.8l5 5M10.3 18.7H20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  clear: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4.8h4V7M7 7l.9 12.2a1.6 1.6 0 0 0 1.6 1.5h5a1.6 1.6 0 0 0 1.6-1.5L17 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cover: '<svg viewBox="0 0 24 24"><path d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6z" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M4 20L20 4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6z" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',  // the same gear as the times tables'
  pencil: '<svg viewBox="0 0 24 24"><path d="M15.2 4.8l4 4L8.6 19.4l-5 1 1-5z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><path d="M13.2 6.8l4 4" stroke="currentColor" stroke-width="2.3"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3.8 11.2 12 4.3l8.2 6.9M6.3 9.4V19a1 1 0 0 0 1 1h3.4v-5.2h2.6V20h3.4a1 1 0 0 0 1-1V9.4" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
const icon = (name, cls = '') => el('span', { class: 'ic ' + cls, 'aria-hidden': 'true', html: ICON[name] });

/* ---------- pictures: the ChatGPT image if it is in files.json, else a soft box with its file name ---------- */
let ASSETS = new Set();
async function initAssets() {
  try { const f = await (await fetch('files.json', { cache: 'no-cache' })).json(); ASSETS = new Set(f.files.map(x => x.replace(/^dictation\//, ''))); } catch (e) {}
}
const hasPic = name => ASSETS.has('assets/' + name);
function pic(name, cls = '') {
  if (hasPic(name)) return el('img', { class: 'pic ' + cls, src: 'assets/' + name, alt: '', draggable: 'false' });
  return el('span', { class: 'ph ' + cls, lang: 'en', dir: 'ltr' }, name);
}

/* ---------- Arabic text ---------- */
const skillLevel = skill => { const s = KD.store.get(); return (s && s.settings.tashkeel[skill]) || 'full'; };
const shown = (text, card) => T.level(text, card ? skillLevel(card.skill) : 'full', card ? card.keep : []);
// a word or sentence with letter ranges coloured: tg = [[firstLetter, lastLetter]] in the full text
function coloured(text, tg, card, cls = 'tg') {
  const s = shown(text, card);
  const frag = document.createDocumentFragment();
  (tg && tg.length ? T.splitByLetters(s, tg) : [{ on: false, s }]).forEach(p => frag.append(p.on ? el('b', { class: cls }, p.s) : document.createTextNode(p.s)));
  return frag;
}
const ar = (text, cls = '') => el('span', { class: 'ar ' + cls, lang: 'ar', dir: 'rtl' }, text);

/* ---------- toast ---------- */
let toastT = 0;
function toast(msg, ms = 2200) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => { t.classList.remove('on'); setTimeout(() => { t.hidden = true; }, 300); }, ms);
}

/* ---------- press and hold (the parent view's gear, 2 seconds) ---------- */
function holdToOpen(btn, ms, fn) {
  let t = 0;
  const start = e => { e.preventDefault(); btn.classList.add('holding'); t = setTimeout(() => { btn.classList.remove('holding'); fn(); }, ms); };
  const end = () => { clearTimeout(t); btn.classList.remove('holding'); };
  btn.addEventListener('pointerdown', start);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, end));
  btn.addEventListener('contextmenu', e => e.preventDefault());
}

// a date as on an Algerian copybook: السبت 7 نوفمبر 2026 (Western digits)
const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTHS = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
function copyDate(ds) { const [y, m, d] = ds.split('-').map(Number); const x = new Date(y, m - 1, d); return `${DAYS[x.getDay()]} ${d} ${MONTHS[m - 1]} ${y}`; }

KD.ui = { el, icon, ICON, pic, hasPic, initAssets, shown, coloured, ar, toast, holdToOpen, copyDate };
})(window.KD = window.KD || {});
