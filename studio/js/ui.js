// Shared UI helpers: elements, Arabic digits, art with placeholders, skeleton parts, overlays.
import * as store from './store.js';
import { play } from './sound.js';
import { STATIONS } from './journey.js';

// Object.assign can't set CSS custom properties (--x), so use setProperty for those.
export function setStyle(n, styles) {
  for (const [k, v] of Object.entries(styles)) {
    if (k.startsWith('--')) n.style.setProperty(k, v);
    else n.style[k] = v;
  }
}

export function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'style' && typeof v === 'object') setStyle(n, v);
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'html') n.innerHTML = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    n.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return n;
}

// Arabic-Indic digits everywhere (decimal comma is ٫).
const DIG = '٠١٢٣٤٥٦٧٨٩';
export function ar(v) {
  return String(v).replace(/[0-9]/g, d => DIG[d]).replace(/\./g, '٫');
}

// ---------- Art: real image from /assets, or a soft placeholder ----------
const C = { pink: '#F7A8C4', yellow: '#FFD966', green: '#7CCB8B', cream: '#FFF8EC', white: '#FFFFFF' };

const PH = {
  st1_dream: ['🌟', C.pink], st2_ideas: ['💡', C.yellow], st3_customers: ['💬', C.green],
  st4_plan: ['📋', C.pink], st5_make: ['✂️', C.yellow], st6_market: ['📣', C.green],
  st7_sell: ['🏪', C.pink], st8_jars: ['🫙', C.yellow], st9_next: ['🚀', C.green],
  jar_spend: ['🎁', C.pink], jar_save: ['🛡️', C.yellow], jar_grow: ['🌱', C.green], jar_give: ['🌾', C.cream],
  grow_machine: ['⚙️', C.green], seed: ['🌰', C.yellow], sprout: ['🌱', C.green], stalks7: ['🌾', C.yellow],
  studio: ['🏠', C.yellow],
  badge_spoke: ['💬', C.pink], badge_brave: ['🦁', C.yellow], badge_fix: ['🔧', C.green],
  badge_finish: ['🎀', C.pink], badge_give: ['🤲', C.yellow], badge_pitch: ['🎤', C.green],
  coin: ['⭐', C.yellow], item_paper: ['📄', C.white], item_print: ['🖨️', C.white], item_markers: ['🖍️', C.white],
  item_stapler: ['📎', C.white], item_other: ['✍️', C.white], item_bag: ['🛍️', C.white], item_stickers: ['💖', C.white],
};

const avail = new Map();
// The pictures are ChatGPT drawings saved as .webp (scripts/studio_pics.py); the code keeps the brief's .png names.
export const assetUrl = (name) => 'assets/' + name.replace(/\.png$/, '.webp');

export function assetOk(name) {
  if (!avail.has(name)) {
    avail.set(name, new Promise((resolve) => {
      const i = new Image();
      i.onload = () => resolve(true);
      i.onerror = () => resolve(false);
      i.src = assetUrl(name);
    }));
  }
  return avail.get(name);
}

const JAR_COLORS = { spend: C.pink, save: C.yellow, grow: C.green, give: '#FFE7A3' };

function phFor(file) {
  const base = file.replace(/\.png$/, '');
  if (base.startsWith('mascot_')) return el('div', { html: mascotSVG(base.slice(7)) });
  if (base.startsWith('jar_')) return el('div', { html: jarSVG(base.split('_')[1]) });
  if (base === 'coin') return el('div', { html: COIN_SVG });
  const key = Object.keys(PH).find(k => base === k || base.startsWith(k));
  const [emoji, color] = PH[key] || ['✨', C.pink];
  const round = /^(st\d|badge_|coin)/.test(base);
  return el('div', { class: 'ph' + (round ? ' round' : ''), style: { '--ph': color } }, emoji);
}

export function art(file, { size, alt = '', cls = '' } = {}) {
  const box = el('div', { class: 'art ' + cls, role: alt ? 'img' : null, 'aria-label': alt || null });
  if (size) setStyle(box, { width: size + 'px', height: size + 'px', '--size': size + 'px' });
  box.append(phFor(file));
  assetOk(file).then(ok => {
    if (ok) box.replaceChildren(el('img', { src: assetUrl(file), alt: '', draggable: 'false' }));
  });
  return box;
}

// A clear glass jar with a coloured lid and a soft tint, so coins inside stay visible.
export function jarSVG(kind) {
  const c = JAR_COLORS[kind] || C.pink;
  const lid = kind === 'give' ? C.cream : c;
  const glow = kind === 'give' ? '<ellipse cx="60" cy="70" rx="46" ry="48" fill="#FFD966" opacity=".22"/>' : '';
  return `<svg viewBox="0 0 120 120" aria-hidden="true">${glow}
    <path d="M30 30 h60 v8 q12 6 12 22 v40 q0 14 -14 14 h-56 q-14 0 -14 -14 v-40 q0 -16 12 -22z" fill="${c}" fill-opacity=".22" stroke="#4A2E45" stroke-width="3" stroke-linejoin="round"/>
    <path d="M28 18 h64 a4 4 0 0 1 4 4 v8 a4 4 0 0 1 -4 4 h-64 a4 4 0 0 1 -4 -4 v-8 a4 4 0 0 1 4 -4z" fill="${lid}" stroke="#4A2E45" stroke-width="3"/>
    <path d="M28 52 q0 -8 6 -10" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity=".9"/>
  </svg>`;
}

const COIN_SVG = `<svg viewBox="0 0 48 48" aria-hidden="true">
  <circle cx="24" cy="24" r="21" fill="#FFD966" stroke="#4A2E45" stroke-width="2.5"/>
  <circle cx="24" cy="24" r="15" fill="none" stroke="#E8B93A" stroke-width="2"/>
  <path d="M24 14 l3 6.5 7 .8 -5.2 4.8 1.5 7 -6.3 -3.6 -6.3 3.6 1.5 -7 -5.2 -4.8 7 -.8z" fill="#FFF8EC" stroke="#4A2E45" stroke-width="1.5" stroke-linejoin="round"/>
</svg>`;

// Original mascot drawn in code, used until the ChatGPT images arrive.
export function mascotSVG(pose = 'wave') {
  const arms = {
    wave: '<path d="M30 78 q-14 -6 -14 -22" /><path d="M90 78 q14 4 18 -2" />',
    think: '<path d="M30 80 q-12 2 -14 -6" /><path d="M86 74 q8 -4 4 -14" />',
    celebrate: '<path d="M30 74 q-14 -10 -12 -28" /><path d="M90 74 q14 -10 12 -28" />',
    write: '<path d="M32 82 q-10 6 -6 12" /><path d="M88 82 q10 6 6 12" />',
  }[pose] || '';
  const extra = {
    think: '<g fill="#FFD966" stroke="#4A2E45" stroke-width="2"><circle cx="100" cy="22" r="8"/></g><path d="M100 8 v-4 M112 14 l3 -3 M88 14 l-3 -3" stroke="#4A2E45" stroke-width="2" stroke-linecap="round"/>',
    celebrate: '<g><rect x="10" y="20" width="6" height="9" rx="2" fill="#7CCB8B" transform="rotate(-20 13 24)"/><rect x="104" y="16" width="6" height="9" rx="2" fill="#F7A8C4" transform="rotate(25 107 20)"/><rect x="20" y="4" width="6" height="9" rx="2" fill="#FFD966"/><rect x="96" y="40" width="6" height="9" rx="2" fill="#FFD966" transform="rotate(-30 99 44)"/></g>',
    write: '<rect x="38" y="90" width="44" height="26" rx="4" fill="#FFFFFF" stroke="#4A2E45" stroke-width="2.5"/><path d="M46 100 h28 M46 107 h20" stroke="#8A6F84" stroke-width="2" stroke-linecap="round"/><path d="M84 86 l14 -18" stroke="#7CCB8B" stroke-width="6" stroke-linecap="round"/>',
  }[pose] || '';
  return `<svg viewBox="0 0 120 120" aria-hidden="true">
    <path d="M60 14 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z" fill="#FFD966" stroke="#4A2E45" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M60 34 c-30 0 -40 22 -40 44 c0 22 18 32 40 32 c22 0 40 -10 40 -32 c0 -22 -10 -44 -40 -44z" fill="#F7A8C4" stroke="#4A2E45" stroke-width="3"/>
    <g fill="none" stroke="#4A2E45" stroke-width="3" stroke-linecap="round">${arms}</g>
    <ellipse cx="46" cy="72" rx="6" ry="7.5" fill="#4A2E45"/><ellipse cx="74" cy="72" rx="6" ry="7.5" fill="#4A2E45"/>
    <circle cx="48" cy="69" r="2.2" fill="#fff"/><circle cx="76" cy="69" r="2.2" fill="#fff"/>
    <ellipse cx="36" cy="84" rx="6" ry="4" fill="#7CCB8B" opacity=".85"/><ellipse cx="84" cy="84" rx="6" ry="4" fill="#7CCB8B" opacity=".85"/>
    <path d="M54 84 q6 6 12 0" fill="none" stroke="#4A2E45" stroke-width="2.5" stroke-linecap="round"/>
    ${extra}
  </svg>`;
}

// ---------- Clay icons (ChatGPT, scripts/studio_pics.py) in place of the emoji used as stand-ins ----------
const EMO = {
  '📘': 'book', '🎁': 'gift', '🌐': 'online', '🏷️': 'tag', '🧺': 'basket', '📦': 'later', '🖼️': 'poster', '🧾': 'receipt',
  '👪': 'family', '🏡': 'neighbours', '🏫': 'school', '📱': 'tablet', '☀️': 'sun', '⬜': 'plain', '🚫': 'nophoto', '💰': 'money',
  '😊': 'happy', '🙂': 'ok', '🤔': 'unsure', '😣': 'worried', '😟': 'worried', '💻': 'tablet', '🙏': 'thanks', '✅': 'tick', '✨': 'sparkle', '💗': 'heart',
  '👩': 'mama', '👨': 'baba', '👧': 'sister', '🧒': 'friend', '🛠️': 'tools', '⭐': 'star', '📷': 'camera', '🔒': 'lock',
  '📝': 'list', '🏠': 'home', '✍️': 'write', '🎨': 'palette',
};
// The emoji shows until its picture (assets/ic_<name>.webp) has loaded, so a missing picture never leaves a gap.
export function emo(e) {
  const key = EMO[e];
  const s = el('span', { class: 'emo', 'aria-hidden': 'true' }, e);
  if (key) assetOk(`ic_${key}.png`).then(ok => { if (ok) s.replaceChildren(el('img', { src: assetUrl(`ic_${key}.png`), alt: '', draggable: 'false' })); });
  return s;
}
// "📘 نسخ ورقية" → the icon, then the words
export function withEmo(text) {
  const e = Object.keys(EMO).find(k => typeof text === 'string' && text.startsWith(k + ' '));
  return e ? [emo(e), text.slice(e.length)] : text;
}

// ---------- Icons ----------
export const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9a4 4 0 0 1 0 6"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 10l4 4M21 10l-4 4"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 7l4 4-4 4"/><path d="M19 11H9a5 5 0 0 0 0 10h3"/></svg>',
  redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7l-4 4 4 4"/><path d="M5 11h10a5 5 0 0 1 0 10h-3"/></svg>',
  eraser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M14 4l6 6-9 9H6l-3-3z" fill="#F7A8C4"/><path d="M9 9l6 6"/><path d="M11 19h9" stroke-linecap="round"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z" fill="#fff"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  gallery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l11-7z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/></svg>',
  bigger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M8 11h6M11 8v6M16 16l5 5"/></svg>',
  smaller: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M8 11h6M16 16l5 5"/></svg>',
  rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/></svg>',
};

export function iconBtn(icon, label, onclick) {
  return el('button', { class: 'icon-btn', 'aria-label': label, onclick: (e) => { play('tap'); onclick(e); }, html: ICON[icon] });
}

// ---------- Skeleton parts ----------
export function starsPill() {
  return el('div', { class: 'pill', 'aria-label': 'نجومي' }, el('span', { class: 'star' }, '⭐'), ar(store.get().stars));
}

export function soundBtn() {
  const b = iconBtn(store.get().muted ? 'mute' : 'sound', 'الصوت', () => {
    store.update(s => { s.muted = !s.muted; });
    b.innerHTML = ICON[store.get().muted ? 'mute' : 'sound'];
  });
  return b;
}

function stationIcon(title) {
  const st = STATIONS.find(s => s.name === title);
  return st ? art(st.icon, { size: 40, cls: 'title-ic' }) : null;
}

export function topbar({ title, back, plain = false, end = [], step = null }) {
  return el('header', { class: 'topbar' },
    back ? iconBtn('back', 'رجوع', back) : null,
    // a station's own icon sits in its title (her request, 29 Oct 2026: the icons inside the sections they belong to)
    title ? el('h1', { class: 'title' + (plain ? ' plain' : '') }, stationIcon(title), title) : null,
    step ? el('div', { class: 'steps', 'aria-label': `الخطوة ${ar(step[0])} من ${ar(step[1])}` },
      Array.from({ length: step[1] }, (_, i) => el('i', { class: i + 1 < step[0] ? 'on' : i + 1 === step[0] ? 'now' : '' }))) : null,
    el('div', { class: 'spacer' }),
    ...end,
    starsPill(),
  );
}

export function taskCard(text, pose = 'think') {
  return el('section', { class: 'task' }, art(`mascot_${pose}.png`, { alt: '' }), el('p', {}, text));
}

export function screen(accent, ...parts) {
  return el('div', { class: 'screen', 'data-accent': accent }, ...parts);
}

export function primary(label, onclick, attrs = {}) {
  return el('button', { class: 'btn primary', onclick: (e) => { play('tap'); onclick(e); }, ...attrs }, label);
}

// The mascot's name, typed or handwritten.
export function mascotName() {
  const s = store.get();
  if (s.mascotName) return document.createTextNode(s.mascotName);
  if (s.mascotNameImg) return el('img', { class: 'name-img', src: s.mascotNameImg, alt: 'اسم صديقتي' });
  return document.createTextNode('صديقتي');
}

// Stars are for effort. They are never money and never touch the jars.
export function award(n = 1) {
  store.update(s => { s.stars += n; });
  document.querySelectorAll('.topbar .pill[aria-label="نجومي"]').forEach(p => p.replaceWith(starsPill()));
  toast(`+${ar(n)} ⭐`);
}

// Takes back one star (when she undoes the thing that earned it).
export function unaward(n = 1) {
  store.update(s => { s.stars = Math.max(0, s.stars - n); });
  document.querySelectorAll('.topbar .pill[aria-label="نجومي"]').forEach(p => p.replaceWith(starsPill()));
}

// Skill badges, earned once per project.
export const BADGES = {
  spoke: { file: 'badge_spoke.png', name: 'تكلّمتُ مع زبائني' },
  brave: { file: 'badge_brave.png', name: 'جرّبتُ شيئًا جديدًا' },
  fix: { file: 'badge_fix.png', name: 'صلّحتُ مشكلة' },
  finish: { file: 'badge_finish.png', name: 'أنهيتُ مشروعًا' },
  give: { file: 'badge_give.png', name: 'تصدّقتُ' },
  pitch: { file: 'badge_pitch.png', name: 'قدّمتُ عرضي' },
};

export function hasBadge(key) {
  const s = store.get();
  return s.badges.some(b => b.id === key && b.project === s.current.id);
}

export function awardBadge(key) {
  if (hasBadge(key) || !BADGES[key]) return false;
  store.update(s => { s.badges.push({ id: key, project: s.current.id, at: new Date().toISOString() }); });
  play('celebrate');
  const b = BADGES[key];
  const scrim = el('div', { class: 'scrim' },
    el('div', { class: 'dialog badge-dialog', role: 'dialog', 'aria-modal': 'true' },
      art(b.file, { size: 160 }),
      el('span', { class: 'kicker' }, 'شارة جديدة!'),
      el('p', {}, b.name),
      el('button', { class: 'btn primary', style: { background: 'var(--yellow)' }, onclick: () => { play('tap'); scrim.remove(); } }, 'رائع!'),
    ));
  document.body.append(scrim);
  return true;
}

// Arabic counted noun for people: شخص واحد، شخصان، ٣–١٠ أشخاص، ١١+ شخصًا.
export function people(n) {
  if (n === 1) return 'شخصًا واحدًا';
  if (n === 2) return 'شخصين';
  if (n >= 3 && n <= 10) return `${ar(n)} أشخاص`;
  return `${ar(n)} شخصًا`;
}

// Arabic wording for an amount of riyals: ريال واحد، ريالان، ٣–١٠ ريالات، ١١+ ريالًا.
export function riyals(n) {
  if (n === 1) return 'ريال واحد';
  if (n === 2) return 'ريالان';
  if (Number.isInteger(n) && n >= 3 && n <= 10) return `${ar(n)} ريالات`;
  return `${ar(n)} ريالًا`;
}

// نسخة واحدة، نسختان، ٣–١٠ نسخ، ١١+ نسخة.
export function copiesWord(n) {
  if (n === 1) return 'نسخة واحدة';
  if (n === 2) return 'نسختان';
  if (n >= 3 && n <= 10) return `${ar(n)} نسخ`;
  return `${ar(n)} نسخة`;
}

// ---------- Overlays ----------
export function toast(text) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = el('div', { class: 'toast', role: 'status' }, text);
  document.body.append(t);
  setTimeout(() => t.remove(), 2700);
}

export function confirmBox(text, yes, no = 'لا', yesColor = 'var(--loss)') {
  return new Promise((resolve) => {
    const close = (v) => { play('tap'); scrim.remove(); resolve(v); };
    const scrim = el('div', { class: 'scrim' },
      el('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true' },
        art('mascot_think.png'),
        el('p', {}, text),
        el('div', { class: 'row' },
          el('button', { class: 'btn', onclick: () => close(false) }, no),
          el('button', { class: 'btn', style: { background: yesColor }, onclick: () => close(true) }, yes),
        ),
      ),
    );
    document.body.append(scrim);
  });
}

export function celebrate() {
  play('celebrate');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layer = el('div', { class: 'celebrate' }, art('mascot_celebrate.png'));
  if (!reduce) {
    const colors = [C.pink, C.yellow, C.green];
    for (let i = 0; i < 36; i++) {
      layer.append(el('i', { class: 'confetti', style: {
        left: Math.random() * 100 + 'vw', background: colors[i % 3],
        animationDelay: Math.random() * 300 + 'ms', '--rot': (Math.random() * 720 - 360) + 'deg',
      } }));
    }
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 1700);
}
