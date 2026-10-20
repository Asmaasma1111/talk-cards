/* ماريا تقرأ (Maria Reads): her phonics path, the fourth app on her entrance page (Maria only).
   The lesson order and the method follow "Children Learning Reading" (65 lessons on one path); every word is our own (reads.json).
   Phase 1 (October 2026): lessons 1 to 8, the placement check, the session timer, the help ladder, streak, stars,
   a puzzle a week (one piece a day), Mama's view and the Record sounds screen.
   Progress: 'tc:maria:reads'. Lesson states (Done, Current, Locked) are worked out from r.current, never stored.
   Mama's recorded sounds and Maria's own recordings live in IndexedDB 'maria-reads' on the iPad; Mama's sounds also go
   into the backup file. A single sound is only ever Mama's voice: no TTS and no fallback voice. */
(function (root) {
'use strict';

const AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const pad2 = n => String(n).padStart(2, '0');
function addDays(ds, n) {
  const [y, m, d] = ds.split('-').map(Number), x = new Date(y, m - 1, d); x.setDate(x.getDate() + n);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
}
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const sleep = ms => new Promise(ok => setTimeout(ok, ms));
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/* =====================================================================================================
   The rules (no DOM, so they can be tested in Node)
   ===================================================================================================== */
const PIECE_ORDER = [1, 6, 3, 4, 0, 7, 2, 5];     // the order the 8 pieces arrive in (4 across, 2 down)
function blank() {
  return { v: 1, current: 1, lessons: {}, placement: null, use: [], opened: [], stars: { total: 0, days: {} }, minutes: {},
           log: [], stuck: {}, ok: {}, seen: {}, speed: { best: 0, runs: [] }, settings: { sessions: 2, bedtime: '19:30', cues: true } };
}
function clean(o) {
  const b = blank();
  if (!o || typeof o !== 'object') return b;
  const r = { ...b, ...o };
  r.settings = { ...b.settings, ...(o.settings || {}) };
  // sessions a day, not clock times (her choice, 20 Oct 2026): older progress had reading times, kept as a count
  if (Array.isArray(r.settings.slots)) { if (!(o.settings && o.settings.sessions)) r.settings.sessions = Math.max(1, Math.min(3, r.settings.slots.filter(Boolean).length || 2)); delete r.settings.slots; }
  r.settings.sessions = Math.max(1, Math.min(3, Math.round(Number(r.settings.sessions)) || 2));
  r.stars = { ...b.stars, ...(o.stars || {}) };
  if (!r.stars.days || typeof r.stars.days !== 'object') r.stars.days = {};
  ['lessons', 'minutes', 'stuck', 'ok', 'seen'].forEach(k => { if (!r[k] || typeof r[k] !== 'object') r[k] = {}; });
  ['use', 'opened', 'log'].forEach(k => { if (!Array.isArray(r[k])) r[k] = []; });
  r.speed = { ...b.speed, ...(o.speed || {}) }; if (!Array.isArray(r.speed.runs)) r.speed.runs = [];
  r.current = Math.max(1, Math.min(65, Math.round(Number(r.current)) || 1));
  delete r.sounds;                                  // Mama's recordings in a backup go to IndexedDB, not here
  return r;
}
const valid = o => !!o && typeof o === 'object' && typeof o.current === 'number' && !!o.lessons && typeof o.lessons === 'object';
function rec(r, n) { return r.lessons[n] || (r.lessons[n] = { days: [], review: [], sessions: 0, taps: [], mastered: null, next: 0 }); }
const stateOf = (r, n) => (n < r.current ? 'done' : n === r.current ? 'current' : 'locked');
function minutesFor(D, n) { const t = D.timer.find(([a, b]) => n >= a && n <= b); return Math.min(D.cap, t ? t[2] : 7); }
// the sounds a lesson asks her to read: its new sounds and the letters of its words
function lessonSounds(D, n) {
  const L = D.lessons[n - 1], s = new Set(L.new || []);
  (L.words || []).forEach(w => D.words[w].says.forEach(x => s.add(x)));
  // only the words she reads (the listening games use words she only hears)
  (L.beats || []).filter(b => ['read', 'spell', 'swap', 'diff', 'sight'].includes(b[0]))
    .forEach(b => b.slice(1).forEach(x => String(x).split(/[>/]/).forEach(w => { if (D.words[w]) D.words[w].says.forEach(y => s.add(y)); })));
  return [...s];
}
// the sounds taught before lesson n (with upTo: lesson n's too), in teaching order
function taught(D, n, upTo) {
  const out = [];
  D.lessons.slice(0, upTo ? n : n - 1).forEach(L => (L.new || []).forEach(s => { if (!out.includes(s)) out.push(s); }));
  return out;
}
// minimum days on a lesson: 3, or 1 in the fast lane (lessons 1-12 whose sounds she knew at the placement check)
function minDays(r, D, n) {
  if (n > 12 || !r.placement || !Array.isArray(r.placement.known)) return 3;
  const need = lessonSounds(D, n);
  return need.length && need.every(s => r.placement.known.includes(s)) ? 1 : 3;
}
// after every 5 lesson days without mastery: 2 review days (the previous two lessons, ear games, stuck words)
function reviewToday(r, n, t) {
  const L = rec(r, n);
  if (L.review.includes(t)) return true;
  if (L.mastered || L.days.includes(t)) return false;
  return L.days.length >= 5 && L.review.length < 2 * Math.floor(L.days.length / 5);
}
// only Mama's mastery check moves the path on, and only after the lesson's minimum days
const canAdvance = (r, D, n) => { const L = rec(r, n); return !!L.mastered && L.days.length >= minDays(r, D, n) && n < 65; };
function streakOf(r, t) {
  const s = new Set(r.use); let d = s.has(t) ? t : addDays(t, -1), n = 0;
  while (s.has(d)) { n++; d = addDays(d, -1); }
  return n;
}
// a puzzle a week: one piece on each day of use, the last two on day 7 (days of use, not days in a row)
const weekDay = d => ((d - 1) % 7) + 1;
const piecesAt = d => (d <= 0 ? 0 : weekDay(d) === 7 ? 8 : weekDay(d));
const puzzleOf = (d, P) => Math.floor((Math.max(1, d) - 1) / 7) % P;
function board(r, t, P) {
  const n = r.use.length, used = r.use.includes(t), pending = used && !r.opened.includes(t);
  if (!n) return { puzzle: 0, have: 0, pending: false, day: 0 };
  if (pending) return { puzzle: puzzleOf(n, P), have: weekDay(n) === 1 ? 0 : piecesAt(n - 1), get: piecesAt(n), pending: true, day: n };
  if (n % 7 === 0 && !used) return { puzzle: puzzleOf(n + 1, P), have: 0, pending: false, day: n, fresh: true };
  return { puzzle: puzzleOf(n, P), have: piecesAt(n), pending: false, day: n, complete: n % 7 === 0 };
}
// a finished session: the day counts (streak, puzzle piece), the lesson's days, a star
function finish(r, s, t) {
  const first = !r.use.includes(t);
  if (first) r.use.push(t);
  const L = rec(r, s.n);
  if (s.mode === 'lesson') { if (!L.days.includes(t)) L.days.push(t); L.sessions++; }
  if (s.mode === 'review' && !L.review.includes(t)) L.review.push(t);
  r.stars.total += 1; r.stars.days[t] = (r.stars.days[t] || 0) + 1;
  r.log.push({ day: t, n: s.n, mode: s.mode, secs: Math.round(s.secs || 0), tap: null, at: Date.now(), ...(s.tired ? { tired: true } : {}) });
  if (r.log.length > 600) r.log = r.log.slice(-600);
  return { first };
}
// Mama's tap after the session: Alone (+1 star), With a little help, Not yet
function applyTap(r, t, n, tap) {
  const last = r.log[r.log.length - 1];
  if (last && last.day === t && !last.tap) last.tap = tap;
  rec(r, n).taps.push({ day: t, tap, mode: last ? last.mode : 'lesson' });
  if (tap === 'alone') { r.stars.total += 1; r.stars.days[t] = (r.stars.days[t] || 0) + 1; }
}
// the Book Edition (Mama's private content pack, loaded on the iPad): same layout as reads.json, lesson by lesson
const validPack = p => !!p && typeof p === 'object' && p.app === 'maria-reads' && p.edition === 'book' && p.v === 1 && !!p.lessons && typeof p.lessons === 'object';
function applyPack(D, P) {
  ['words', 'sentences', 'stories', 'ear', 'emoji', 'pairs'].forEach(k => { if (P[k] && typeof P[k] === 'object') D[k] = { ...(D[k] || {}), ...P[k] }; });
  Object.entries(P.lessons).forEach(([n, x]) => { const L = D.lessons[Number(n) - 1]; if (L && x && typeof x === 'object') Object.assign(L, x); });
  if (Array.isArray(P.reference)) D.reference = P.reference;
  D.edition = 'book';
  return D;
}
// every clip a lesson needs before it can open (the games skip a word that has no clip yet, so they are not counted)
function lessonClips(D, L) {
  if (!L || !Array.isArray(L.beats)) return null;
  const ws = new Set(L.words || []), xs = new Set(), lines = [], snd = new Set(L.new || []);
  for (const [t, ...a] of L.beats) {
    if (t === 'read' || t === 'spell' || t === 'sight') a.forEach(w => ws.add(w));
    else if (t === 'diff') a.forEach(x => String(x).split('/').forEach(w => ws.add(w)));
    else if (t === 'swap') a.forEach(x => String(x).split('>').forEach(w => ws.add(w)));
    else if ((t === 'hear' || t === 'where') && D.ear[a[0]]) { const e = D.ear[a[0]]; [...e.beg, ...e.mid, ...e.end, ...e.no].forEach(w => ws.add(w)); }
    else if (t === 'pair' && D.pairs && D.pairs[a[0]]) D.pairs[a[0]].pairs.forEach(pr => pr.forEach(w => ws.add(w)));
    else if (t === 'sent') a.forEach(x => xs.add(x));
    else if (t === 'story' && D.stories[a[0]]) { const st = D.stories[a[0]]; st.pages.forEach(x => xs.add(x)); for (let i = 0; i < st.questions.length; i++) lines.push(`qq-${a[0]}${i}`); }
    else if (t === 'me') { const [k, v] = String(a[0]).split(':'); (k === 'word' ? ws : snd).add(v); }
    else if (t === 'newsound') snd.add(a[0]);
  }
  xs.forEach(x => { const S = D.sentences[x]; if (S) S.words.forEach(w => ws.add(w)); lines.push('x-' + x); });
  taught(D, L.n, true).forEach(x => snd.add(x));
  return { words: [...ws].map(w => 'w-' + w), lines, sounds: [...snd] };
}
// Teach Mama day: every 4th day of use from lesson 3 on (or the day Mama picks): Maria is the teacher
const teachDay = (r, t, n) => n >= 3 && (r.settings.teachDay === t || ((r.use.includes(t) ? r.use.indexOf(t) : r.use.length) + 1) % 4 === 0);
const core = { blank, clean, valid, rec, stateOf, minutesFor, lessonSounds, taught, minDays, reviewToday, canAdvance, streakOf,
  weekDay, piecesAt, puzzleOf, board, finish, applyTap, PIECE_ORDER, addDays, validPack, applyPack, lessonClips, teachDay };

/* ---------- letter shapes for tracing (capitals, viewBox 0 0 200 240), one path per stroke, in writing order ---------- */
const STROKES = {
  A: ['M100 24 L38 216', 'M100 24 L162 216', 'M64 146 L136 146'],
  B: ['M56 24 L56 216', 'M56 24 L110 24 Q154 24 154 70 Q154 116 110 116 L56 116', 'M56 116 L116 116 Q164 116 164 166 Q164 216 116 216 L56 216'],
  C: ['M158 62 Q140 24 100 24 Q40 24 40 120 Q40 216 100 216 Q140 216 158 178'],
  T: ['M34 26 L166 26', 'M100 26 L100 216'],
  U: ['M50 26 L50 150 Q50 216 100 216 Q150 216 150 150 L150 26'],
  S: ['M154 62 Q140 24 100 24 Q50 24 50 70 Q50 112 100 120 Q150 128 150 172 Q150 216 100 216 Q58 216 44 180'],
  P: ['M56 216 L56 24', 'M56 24 L112 24 Q160 24 160 74 Q160 124 112 124 L56 124'],
  O: ['M100 24 Q36 24 36 120 Q36 216 100 216 Q164 216 164 120 Q164 24 100 24'],
  H: ['M50 24 L50 216', 'M150 24 L150 216', 'M50 120 L150 120'],
  N: ['M50 216 L50 24', 'M50 24 L150 216', 'M150 216 L150 24'],
  G: ['M158 62 Q140 24 100 24 Q40 24 40 120 Q40 216 100 216 Q158 216 160 150 L160 128', 'M118 128 L160 128'],
  D: ['M56 24 L56 216', 'M56 24 L100 24 Q164 24 164 120 Q164 216 100 216 L56 216'],
  I: ['M100 24 L100 216', 'M62 24 L138 24', 'M62 216 L138 216'],
  F: ['M56 24 L56 216', 'M56 24 L156 24', 'M56 116 L136 116'],
  R: ['M56 216 L56 24', 'M56 24 L112 24 Q160 24 160 72 Q160 120 112 120 L56 120', 'M104 120 L162 216'],
  M: ['M40 216 L40 24', 'M40 24 L100 150', 'M100 150 L160 24', 'M160 24 L160 216'],
  E: ['M56 24 L56 216', 'M56 24 L152 24', 'M56 120 L140 120', 'M56 216 L152 216'],
  J: ['M140 24 L140 160 Q140 216 92 216 Q54 216 46 178'],
  K: ['M56 24 L56 216', 'M156 24 L56 132', 'M92 104 L160 216']
};

/* ---------- her short Arabic cue lines: shown the first three times a game appears (Mama can turn them off) ---------- */
const CUE = {
  flash: 'قولي الصوت، ثم المسي الحرف',
  newsound: 'صوت جديد! اسمعيه، ثم ارسميه بإصبعك',
  hear: 'هل تسمعين الصوت في الكلمة؟',
  where: 'أين الصوت: في البداية، الوسط، النهاية؟',
  read: 'المسي الحروف من اليسار، ثم اسحبي تحتها',
  swap: 'اختاري الحرف الذي يصنع الكلمة',
  me: 'اسمعي، ثم سجّلي صوتكِ',
  sight: 'كلمة نحفظها كما هي: اسمعيها ثم اقرئيها',
  diff: 'ما الفرق؟ المسي الحرف المختلف',
  spell: 'اسمعي الكلمة، ثم ابنيها بالحروف من اليسار',
  sent: 'اقرئي كل كلمة، ثم اسحبي تحت الجملة',
  story: 'قصة! اقرئي كل صفحة',
  pair: 'أي صوت تسمعين؟',
  stretch: 'اسمعي الكلمة الممطوطة، ثم قوليها',
  action: 'اسمعي الصوت، ثم اعملي حركته',
  run: 'اسمعي الصوت، ثم المسي حرفه',
  shop: 'اشتري بقول الأصوات',
  hoops: 'قفزة لكل صوت',
  teach: 'أنتِ المعلّمة اليوم!',
  basket: 'اقرئي البطاقة ثم اقذفيها في السلة'
};

/* =====================================================================================================
   The screens. api comes from app.js: today, lsGet, lsSet, show, toast, SFX, confetti, stopConfetti, reduced, DEV,
   holdToOpen, backup, restore, apps, appsChip, stopEnglish, setDeck.
   ===================================================================================================== */
function mount(api) {
  const $ = (s, el = document) => el.querySelector(s);
  const KEY = 'tc:maria:reads';
  const today = () => api.today();
  let r = load(), D = null, CLIPS = {}, S = null, busy = false;
  function load() { try { return clean(JSON.parse(api.lsGet(KEY) || 'null')); } catch (e) { return blank(); } }
  function save() { api.lsSet(KEY, JSON.stringify(r)); }
  const SOUND = {};
  /* ---------- the Book Edition: Mama's private content pack, kept in this iPad's own database (never online) ---------- */
  const PACK_DB = 'maria-reads-pack';
  function packDB() {
    return new Promise((ok, bad) => {
      if (!root.indexedDB) return bad(new Error('no IndexedDB'));
      const q = indexedDB.open(PACK_DB, 1);
      q.onupgradeneeded = () => { if (!q.result.objectStoreNames.contains('pack')) q.result.createObjectStore('pack'); };
      q.onsuccess = () => ok(q.result); q.onerror = () => bad(q.error);
    });
  }
  async function packGet() {
    try { const d = await packDB(); return await new Promise(ok => { const g = d.transaction('pack').objectStore('pack').get('current'); g.onsuccess = () => ok(g.result || null); g.onerror = () => ok(null); }); }
    catch (e) { return null; }
  }
  async function packPut(p) {
    const d = await packDB();
    return new Promise((ok, bad) => { const tx = d.transaction('pack', 'readwrite'); if (p) tx.objectStore('pack').put(p, 'current'); else tx.objectStore('pack').delete('current'); tx.oncomplete = () => ok(); tx.onerror = () => bad(tx.error); });
  }
  let PACK = null;
  const ready = Promise.all([
    fetch('reads.json').then(x => x.json()).then(d => { D = d; d.sounds.forEach(s => { SOUND[s.id] = s; }); }),
    fetch('audio/voice.json').then(x => (x.ok ? x.json() : null)).then(v => { CLIPS = (v && v.decks && v.decks.reads && v.decks.reads.clips) || {}; }).catch(() => {}),
    loadSounds(),
    packGet().then(p => { PACK = validPack(p) ? p : null; })
  ]).then(() => {
    if (D && PACK) {
      applyPack(D, PACK);
      Object.entries(PACK.clips || {}).forEach(([id, c]) => { if (c && c.b64) CLIPS[id] = { d: c.d, b64: c.b64, type: c.type || 'audio/mp4' }; });
    }
    markReady();
  }).catch(e => { console.warn('Maria Reads could not load', e); });
  // a lesson opens once every clip it needs exists (the public voice, the pack's voice, or Mama's own sounds)
  function markReady() {
    if (!D) return;
    D.lessons.forEach(L => { const need = lessonClips(D, L); L.ready = !!need && need.words.concat(need.lines).every(c => CLIPS[c]) && need.sounds.every(x => hasSound(x)); });
  }
  const grapheme = id => (SOUND[id] ? SOUND[id].g.split(' ')[0] : id.toUpperCase());
  const TILE = { A: 'a', B: 'b', C: 'k', D: 'd', E: 'e', F: 'f', G: 'g', H: 'h', I: 'i', J: 'j', K: 'k', M: 'm', N: 'n', O: 'o', P: 'p', R: 'r', S: 's', T: 't', U: 'u',
                 CK: 'k', FF: 'f', SS: 's', GG: 'g', PP: 'p', DD: 'd', TT: 't' };
  const tileSound = c => TILE[c] || null;
  // a real photo when there is one (her request: real photos, not emoji or drawings), else the old picture
  const PHOTO = () => new Set((D && D.photos) || []);
  const photoKey = w => { const P = PHOTO(); return P.has(w) ? w : w && w.endsWith('s') && P.has(w.slice(0, -1)) ? w.slice(0, -1) : null; };
  const photoImg = (key, cls = 'rd-photo') => `<img class="${cls}" src="assets/reads/photos/${key}.webp" alt="">`;
  function picFor(w, fallback) {
    const k = photoKey(w); if (k) return photoImg(k);
    const W = D.words[w];
    if (W && W.pic) return `<img class="rd-pic" src="${W.pic}" alt="">`;
    const e = (W && W.e) || D.emoji[w] || fallback;
    return e ? `<span class="rd-emo">${e}</span>` : '<span class="rd-sparkle">⭐</span>';
  }

  /* ---------- the voice: one audio element, clips from memory (blob URLs), as in the other apps ---------- */
  const au = new Audio(); au.preload = 'auto';
  let tok = 0, pending = null;
  function stopAudio() { tok++; try { au.pause(); } catch (e) {} if (pending) { const p = pending; pending = null; p(); } }
  function play(url, rate = 1) {
    stopAudio();
    if (!url) return Promise.resolve();
    const t = ++tok;
    return new Promise(res => {
      pending = res;
      const end = () => { if (t === tok && pending === res) { pending = null; res(); } };
      au.onended = end; au.onerror = end;
      au.onplaying = () => { if (t === tok && au.playbackRate !== rate) au.playbackRate = rate; };
      au.src = url; au.defaultPlaybackRate = rate; au.playbackRate = rate; au.preservesPitch = true; au.webkitPreservesPitch = true;
      const p = au.play();
      if (p && p.catch) p.catch(err => { if (err && err.name === 'AbortError') return; end(); });
    });
  }
  const urls = new Map();
  function clipUrl(id) {
    const c = CLIPS[id]; if (!c) return Promise.resolve(null);
    if (!urls.has(id)) {
      const p = c.b64 ? Promise.resolve(URL.createObjectURL(unb64(c.b64, c.type)))      // a clip from the Book Edition pack
        : fetch('audio/' + c.f).then(x => { if (!x.ok) throw new Error(x.status); return x.blob(); })
        .then(b => URL.createObjectURL(new Blob([b], { type: 'audio/mp4' })));
      urls.set(id, p); p.catch(() => urls.delete(id));
    }
    return urls.get(id).catch(() => null);
  }
  const sayWord = (w, rate = 1) => clipUrl('w-' + w).then(u => play(u, rate));
  const sayStretchy = (w, rate = 1) => clipUrl(CLIPS['s-' + w] ? 's-' + w : 'w-' + w).then(u => play(u, CLIPS['s-' + w] ? rate : Math.max(0.6, rate * 0.62)));
  const sayLine = id => clipUrl(id).then(u => play(u));
  const clipSecs = (id, rate = 1) => ((CLIPS[id] && CLIPS[id].d) || 0.7) / rate;
  const preloadWords = ws => ws.forEach(w => { clipUrl('w-' + w); if (CLIPS['s-' + w]) clipUrl('s-' + w); });

  /* ---------- Mama's sounds (IndexedDB), cut on the iPad: a held one and a short one ---------- */
  const DB = 'maria-reads';
  function openDB() {
    return new Promise((ok, bad) => {
      if (!root.indexedDB) return bad(new Error('no IndexedDB'));
      const q = indexedDB.open(DB, 1);
      q.onupgradeneeded = () => { const d = q.result; ['sounds', 'mine'].forEach(s => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); }); };
      q.onsuccess = () => ok(q.result); q.onerror = () => bad(q.error);
    });
  }
  async function idb(store, mode, fn) {
    const d = await openDB();
    return new Promise((ok, bad) => {
      const tx = d.transaction(store, mode), q = fn(tx.objectStore(store));
      tx.oncomplete = () => ok(q && 'result' in q ? q.result : undefined); tx.onerror = () => bad(tx.error);
    });
  }
  const SND = {}, RAW = {};
  async function loadSounds() {
    let all = [];
    try { all = (await idb('sounds', 'readonly', st => st.getAll())) || []; } catch (e) { return; }
    for (const s of all) { try { await useSound(s); } catch (e) { console.warn('sound', s.id, e); } }
  }
  async function useSound(s) {
    const cut = await cutSound(s.blob, s.kind);
    if (SND[s.id]) { URL.revokeObjectURL(SND[s.id].held); URL.revokeObjectURL(SND[s.id].short); }
    SND[s.id] = { held: URL.createObjectURL(cut.held), short: URL.createObjectURL(cut.short), at: s.at, secs: cut.secs };
    RAW[s.id] = { type: s.type, kind: s.kind, at: s.at, b64: await b64(s.blob) };
  }
  const b64 = blob => new Promise((ok, bad) => { const f = new FileReader(); f.onload = () => ok(String(f.result).split(',')[1] || ''); f.onerror = () => bad(f.error); f.readAsDataURL(blob); });
  const unb64 = (s, type) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type }); };
  async function decode(blob) {
    const AC = root.OfflineAudioContext || root.webkitOfflineAudioContext, ctx = new AC(1, 2, 44100), buf = await blob.arrayBuffer();
    return new Promise((ok, bad) => { const p = ctx.decodeAudioData(buf, ok, bad); if (p && p.then) p.then(ok, bad); });
  }
  // silence off both ends; a held sound keeps up to 3 s and gives a short one (its first 0.42 s); every clip at one loudness
  async function cutSound(blob, kind) {
    const a = await decode(blob), sr = a.sampleRate, x = a.getChannelData(0), hop = Math.round(sr * 0.01), env = [];
    for (let i = 0; i + hop <= x.length; i += hop) { let s = 0; for (let j = i; j < i + hop; j++) s += x[j] * x[j]; env.push(Math.sqrt(s / hop)); }
    const peak = env.reduce((m, e) => Math.max(m, e), 1e-6), thr = Math.max(0.004, peak * 0.1);
    let s0 = env.findIndex(e => e > thr); if (s0 < 0) s0 = 0;
    let s1 = env.length - 1; while (s1 > s0 && env[s1] <= thr) s1--;
    let seg = x.slice(Math.max(0, (s0 - 2) * hop), Math.min(x.length, (s1 + 3) * hop));
    const max = Math.round(sr * (kind === 'hold' ? 3 : 0.8)); if (seg.length > max) seg = seg.slice(0, max);
    const held = fade(seg, sr, 0.012, kind === 'hold' ? 0.08 : 0.03);
    const short = kind === 'hold' ? fade(seg.slice(0, Math.round(sr * 0.42)), sr, 0.012, 0.1) : held;
    return { held: wav(held, sr), short: wav(short, sr), secs: seg.length / sr };
  }
  function fade(x, sr, a, b) {
    const y = Float32Array.from(x), na = Math.min(y.length, Math.round(sr * a)), nb = Math.min(y.length, Math.round(sr * b));
    for (let i = 0; i < na; i++) y[i] *= i / na;
    for (let i = 0; i < nb; i++) y[y.length - 1 - i] *= i / nb;
    return y;
  }
  function wav(x, sr) {
    const n = x.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * 2, true);
    let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(x[i]));
    const g = pk > 0 ? Math.min(6, 0.89 / pk) : 1;
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x[i] * g)) * 0x7FFF, true);
    return new Blob([buf], { type: 'audio/wav' });
  }
  // a sound: Mama's own recording if she made one, otherwise the built-in one (cut from the approved voice, no "uh")
  const builtIn = (id, held) => (CLIPS['p-' + id] ? (!held && CLIPS['q-' + id] ? 'q-' + id : 'p-' + id) : null);
  const hasSound = id => !!SND[id] || !!CLIPS['p-' + id];
  const sayLetter = (id, held) => {
    if (SND[id]) return play(held ? SND[id].held : SND[id].short);
    const b = builtIn(id, held);
    return b ? clipUrl(b).then(u => play(u)) : play(null);
  };
  const missingFor = n => (D ? [...new Set([...taught(D, n, true), ...lessonSounds(D, n)])].filter(id => !hasSound(id)) : []);

  /* ---------- the microphone (Mama's sounds, and Maria's own voice) ---------- */
  const canRecord = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && root.MediaRecorder && root.indexedDB);
  let REC = null;
  async function record(ms, onTick) {
    stopAudio();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(x => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(x)) || '';
    const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined), chunks = [];
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise(ok => { mr.onstop = ok; });
    mr.start(); REC = { mr };
    const t0 = performance.now(), tm = setInterval(() => onTick && onTick(Math.min(1, (performance.now() - t0) / ms)), 50);
    const auto = setTimeout(() => { try { mr.stop(); } catch (e) {} }, ms);
    await stopped;
    clearInterval(tm); clearTimeout(auto); stream.getTracks().forEach(x => x.stop()); REC = null;
    const blob = new Blob(chunks, { type: mr.mimeType || type || 'audio/mp4' });
    return blob.size > 800 ? blob : null;
  }
  const stopRec = () => { if (REC) { try { REC.mr.stop(); } catch (e) {} } };

  /* ---------- markup ---------- */
  const ic = (id, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const flame = id => `<span class="rd-flame">${ic('i-flame')}<b id="${id}"></b></span>`;
  const starN = id => `<span class="rd-starn">${ic('i-star', 'star')}<b id="${id}"></b></span>`;
  document.body.insertAdjacentHTML('beforeend', `
<section id="rhome" class="screen rd rd-home" dir="rtl" lang="ar" hidden>
  <button class="gear" id="rdGear" aria-label="Mama: press and hold">
    <svg class="ring" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="24"/></svg>${ic('i-gear', 'cog')}
  </button>
  <header class="rd-head">
    <img class="rd-logo" src="assets/apps/reads.webp" alt="">
    <div class="rd-titles"><h1 lang="en" dir="ltr">Maria Reads</h1><p>ماريا تقرأ</p></div>
    <div class="rd-stats">${flame('rdStreak')}${starN('rdStars')}</div>
  </header>
  <div class="rd-path-wrap" id="rdPathWrap" dir="ltr"><div class="rd-path" id="rdPath"></div></div>
  <div class="rd-mid">
    <div class="rd-gobox">
      <button id="rdGo" class="rd-go"></button>
      <p class="rd-gonote" id="rdGoNote"></p>
      <div class="rd-slots" id="rdSlots"></div>
      <button class="rd-speedbtn" id="rdSpeedBtn" hidden>⚡ سباق الكلمات <i id="rdBest"></i></button>
    </div>
    <div class="rd-boardbox"><button class="rd-boardbtn" id="rdBoardBtn" aria-label="لغز الأسبوع"><span class="rd-board" id="rdBoard" dir="ltr"></span><span class="rd-boardcap" id="rdBoardCap"></span></button>
      <button class="rd-bookbtn" id="rdBookBtn">📖 كتاب ألغازي <i id="rdBookN"></i></button></div>
  </div>
</section>

<section id="rsession" class="screen rd rd-sess" hidden>
  <div class="rd-top" dir="ltr">
    <button class="quit" id="rdQuit" aria-label="الرئيسية">${ic('i-close')}</button>
    <div class="rd-timer" id="rdTimer"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="rd-ring-bg" cx="32" cy="32" r="26"/><circle class="rd-ring-fg" id="rdRing" cx="32" cy="32" r="26"/></svg></div>
    <div class="rd-cue" id="rdCue" dir="rtl" lang="ar"></div>
    <button class="rd-tired" id="rdTired" hidden aria-label="تعبتُ">😴</button>
    ${flame('rdStreak2')}${starN('rdStars2')}
  </div>
  <div class="rd-stage" id="rdStage" dir="ltr"></div>
</section>

<section id="rdone" class="screen rd rd-done" dir="rtl" lang="ar" hidden><div class="rd-donebox" id="rdDone"></div></section>
<section id="rspeed" class="screen rd rd-speed" hidden>
  <div class="rd-top" dir="ltr">
    <button class="quit" id="rdSpQuit" aria-label="الرئيسية">${ic('i-close')}</button>
    <div class="rd-timer" id="rdSpTimer"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="rd-ring-bg" cx="32" cy="32" r="26"/><circle class="rd-ring-fg" id="rdSpRing" cx="32" cy="32" r="26"/></svg></div>
    <div class="rd-cue on" dir="rtl" lang="ar">⚡ اقرئي الكلمة بصوت عالٍ، ثم المسي ✓</div>
    <span class="rd-spcount" id="rdSpCount">٠</span>
  </div>
  <div class="rd-stage" id="rdSpStage" dir="ltr"></div>
</section>
<section id="rbook" class="screen rd rd-book" dir="rtl" lang="ar" hidden>
  <button class="quit rb-close" id="rbClose" aria-label="أغلقي الكتاب">${ic('i-close')}</button>
  <div class="rb-stage" id="rbStage"></div>
</section>
<section id="rparent" class="screen rd rd-parent" dir="ltr" lang="en" hidden></section>
<section id="rrec" class="screen rd rd-parent" dir="ltr" lang="en" hidden></section>
<section id="rcheck" class="screen rd rd-check" dir="ltr" lang="en" hidden></section>
<section id="rplace" class="screen rd rd-check" dir="ltr" lang="en" hidden></section>

<section id="rdCel" class="overlay rd rd-cel" dir="rtl" lang="ar" hidden>
  <canvas id="rdConfetti" aria-hidden="true"></canvas>
  <div class="rd-celbox" id="rdCelBox"></div>
</section>`);

  const stage = $('#rdStage');
  if (api.appsChip) {   // the way back to her entrance page
    const row = document.createElement('div'); row.className = 'deck-row';
    const b = api.appsChip(); b.addEventListener('click', () => { stopAll(); api.apps(); });
    row.append(b); $('#rhome').append(row);
  }

  /* =====================================================================================================
     Home: the path, the start button, today's reading times and the puzzle of the week
     ===================================================================================================== */
  // today's sessions: a lesson or review session counts (a replay of a done lesson is extra play)
  const sessionsToday = t => r.log.filter(x => x.day === t && x.mode !== 'replay').length;
  let lastLesson = null;
  async function home() {
    await ready;
    stopAll();
    if (api.stopEnglish) api.stopEnglish();
    if (api.setDeck) api.setDeck('reads');
    document.body.dataset.profile = 'maria';
    if (!D) { api.toast('Maria Reads could not load. Please connect to the internet once.'); return; }
    const t = today();
    if (!r.placement) return placement();
    let moved = false;
    while (canAdvance(r, D, r.current) && D.lessons[r.current - 1]) { r.current++; moved = true; }
    if (moved) save();
    $('#rdStreak').textContent = AR(streakOf(r, t));
    $('#rdStars').textContent = AR(r.stars.total);
    renderPath();
    renderGo(t);
    renderBoard(t);
    const pool = speedPool(), sb = $('#rdSpeedBtn');
    sb.hidden = pool.length < 8;
    $('#rdBest').textContent = r.speed.best ? `أفضل نتيجة: ${AR(r.speed.best)}` : '';
    api.show('rhome');
    const centre = () => {   // the current lesson in the middle of the path
      const cur = $('#rdPath .cur'), wrap = $('#rdPathWrap'); if (!cur) return;
      wrap.scrollLeft = cur.offsetLeft + cur.offsetWidth / 2 - wrap.clientWidth / 2;
    };
    requestAnimationFrame(centre); setTimeout(centre, 150);
    if (moved || (lastLesson !== null && lastLesson !== r.current)) celebrate('lesson');
    lastLesson = r.current;
  }
  function renderPath() {
    $('#rdPath').innerHTML = D.lessons.map(L => {
      const st = stateOf(r, L.n), soon = st === 'current' && !L.ready;
      const flag = L.n === 33 ? '<i class="rd-stage2">Stage 2</i>' : '';
      return `${flag}<button class="rd-stone ${st === 'done' ? 'done' : st === 'current' ? 'cur' : 'lock'}${L.n % 2 ? '' : ' low'}${soon ? ' soon' : ''}" data-n="${L.n}"
        aria-label="Lesson ${L.n} ${esc(L.title)}${st === 'locked' ? ', locked' : st === 'done' ? ', done' : ''}">
        <b>${esc(L.label)}</b>${st === 'done' ? ic('i-tick', 'rd-tick') : st === 'locked' ? ic('i-lock', 'rd-lock') : ''}<small>${AR(L.n)}</small></button>`;
    }).join('');
  }
  function goInfo(t) {
    const n = r.current, L = D.lessons[n - 1];
    if (!L.ready) return { off: true, label: 'قريباً ✨', note: 'الدرس القادم يصل قريباً. اختاري درساً أخضر لتعيديه.' };
    const miss = missingFor(n);
    if (miss.length) return { off: true, label: 'ابدئي', note: `ماما تسجّل صوت ${miss.map(id => SOUND[id].say).join(' و ')} أولاً 🎙️`, mama: true };
    // "start session 1", "start session 2", then "come back tomorrow" (her wording, 20 Oct 2026)
    const done = sessionsToday(t), want = r.settings.sessions || 2;
    if (done >= want) return { off: true, label: 'عودي غداً 🌟', note: want > 1 ? 'أنهيتِ جلسات اليوم كلّها. أحسنتِ!' : 'أنهيتِ جلسة اليوم. أحسنتِ!' };
    const label = `ابدئي الجلسة ${AR(done + 1)}`;
    if (reviewToday(r, n, t)) return { label, mode: 'review', note: 'يوم مراجعة: نلعب بما تعرفينه' };
    return { label, mode: 'lesson', note: `الدرس ${AR(n)}: ${L.title}` };
  }
  function renderGo(t) {
    const g = goInfo(t);
    const go = $('#rdGo'); go.textContent = g.label; go.disabled = !!g.off; go.dataset.mode = g.mode || '';
    $('#rdGoNote').textContent = g.note; $('#rdGoNote').classList.toggle('mama', !!g.mama);
    const done = sessionsToday(t);
    $('#rdSlots').innerHTML = ['الجلسة الأولى', 'الجلسة الثانية', 'الجلسة الثالثة'].slice(0, r.settings.sessions)
      .map((name, i) => `<span class="rd-slot${done > i ? ' on' : ''}">${done > i ? ic('i-tick') : ''}${name}</span>`).join('');
  }
  /* ---------- the puzzle board: real jigsaw pieces (knobs and sockets), 4 across and 2 down ----------
     Each inner edge has one knob, out on one piece and in on its neighbour; the pattern changes from puzzle to puzzle.
     A piece she has not won yet is a white outline; a won piece shows its part of the picture. */
  const PW = 300, PH = 400, KN = 300;
  function edge(x0, y0, x1, y1, sgn) {
    if (!sgn) return `L${x1} ${y1}`;
    const L = Math.hypot(x1 - x0, y1 - y0), ax = (x1 - x0) / L, ay = (y1 - y0) / L, nx = ay, ny = -ax;
    const p = (du, v) => { const u = L / 2 + du * KN, w = v * KN * sgn; return `${(x0 + ax * u + nx * w).toFixed(1)} ${(y0 + ay * u + ny * w).toFixed(1)}`; };
    return `L${p(-0.12, 0)} C${p(-0.08, 0)} ${p(-0.06, 0.04)} ${p(-0.09, 0.08)} C${p(-0.15, 0.15)} ${p(-0.08, 0.24)} ${p(0, 0.24)} `
      + `C${p(0.08, 0.24)} ${p(0.15, 0.15)} ${p(0.09, 0.08)} C${p(0.06, 0.04)} ${p(0.08, 0)} ${p(0.12, 0)} L${x1} ${y1}`;
  }
  function piecePath(k, pz) {
    const c = k % 4, y = Math.floor(k / 4), f = pz % 2 ? -1 : 1, g = pz % 3 === 1 ? -1 : 1;
    const H = [1, -1, 1, -1].map(v => v * f), V = [[-1, 1, -1], [1, -1, 1]].map(row => row.map(v => v * g));
    const x0 = c * PW, y0 = y * PH, x1 = x0 + PW, y1 = y0 + PH;
    return `M${x0} ${y0} ${edge(x0, y0, x1, y0, y === 0 ? 0 : -H[c])} ${edge(x1, y0, x1, y1, c === 3 ? 0 : V[y][c])} `
      + `${edge(x1, y1, x0, y1, y === 1 ? 0 : H[c])} ${edge(x0, y1, x0, y0, c === 0 ? 0 : -V[y][c - 1])} Z`;
  }
  let boardN = 0;
  // the board: a faint picture of the whole puzzle behind (her idea: she sees where each piece belongs), the pieces she has
  // won in full colour, outlines for the rest; tray = pieces waiting below the board for her to drag into place
  const TRAY_S = 0.72, TRAY_Y = 1010;
  const pieceBox = k => ({ cx: (k % 4) * 300 + 150, cy: Math.floor(k / 4) * 400 + 200 });
  const trayAt = (j, n) => ({ x: n === 1 ? 600 : [380, 820][j], y: TRAY_Y });
  const placeT = (k, x, y, sc) => { const { cx, cy } = pieceBox(k); return `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${sc}) translate(${-cx} ${-cy})`; };
  function pieceCells(b, tray = []) {
    const pz = D.puzzles[b.puzzle], have = new Set(PIECE_ORDER.slice(0, b.have)), id = 'pz' + (++boardN);
    const pieces = Array.from({ length: 8 }, (_, k) => {
      const d = piecePath(k, b.puzzle);
      return `<clipPath id="${id}-${k}"><path d="${d}"/></clipPath>`;
    }).join('');
    const piece = (k, extra = '', tf = '') => {
      const d = piecePath(k, b.puzzle);
      return `<g class="pc${extra}" data-k="${k}"${tf ? ` transform="${tf}"` : ''}><path class="pc-empty" d="${d}"/>`
        + `<g class="pc-img"><image href="${pz.img}" x="0" y="0" width="1200" height="800" preserveAspectRatio="none" clip-path="url(#${id}-${k})"/><path class="pc-line" d="${d}"/></g></g>`;
    };
    const body = Array.from({ length: 8 }, (_, k) => piece(k, have.has(k) ? ' on' : '')).join('');
    const loose = tray.map((k, j) => { const p = trayAt(j, tray.length); return piece(k, ' on loose', placeT(k, p.x, p.y, TRAY_S)); }).join('');
    const vb = tray.length ? '-14 -14 1228 1200' : '-14 -14 1228 828';
    return `<svg class="rd-jig${tray.length ? ' with-tray' : ''}" viewBox="${vb}" aria-hidden="true"><defs>${pieces}</defs>`
      + `<image class="pc-ghost" href="${pz.img}" x="0" y="0" width="1200" height="800" preserveAspectRatio="none"/>${body}`
      + (tray.length ? `<rect class="pc-tray" x="40" y="850" width="1120" height="330" rx="60"/>${loose}` : '') + '</svg>';
  }
  function renderBoard(t) {
    const P = D.puzzles.length, b = board(r, t, P);
    $('#rdBoard').innerHTML = pieceCells(b) + (b.pending ? '<span class="rd-gift">🎁</span>' : '');
    $('#rdBoard').classList.toggle('complete', !!b.complete);
    $('#rdBoardCap').textContent = b.pending ? 'افتحي هديّة اليوم!' : b.complete ? 'أكملتِ اللغز! 🎉' : b.fresh || !b.have ? 'لغز جديد: قطعة كل يوم' : `${AR(b.have)} من ٨ قطع`;
    const done = finishedPuzzles().length;
    $('#rdBookN').textContent = `${AR(done)} من ${AR(D.bookPages || 12)}`;
  }

  /* =====================================================================================================
     A session: the lesson's beats in order, then more play until the timer ring runs out
     ===================================================================================================== */
  const clock = {
    acc: 0, since: null,
    start() { this.acc = 0; this.since = document.hidden ? null : performance.now(); },
    pause() { if (this.since != null) { this.acc += performance.now() - this.since; this.since = null; } },
    resume() { if (S && this.since == null) this.since = performance.now(); },
    secs() { return (this.acc + (this.since != null ? performance.now() - this.since : 0)) / 1000; }
  };
  let ticker = null;
  function startSession(n, mode, only) {   // only: chosen beats (tests, ?dev=1)
    const t = today(), L = D.lessons[n - 1];
    if (!only && (!L || !L.ready || missingFor(n).length)) return;
    api.SFX.init();
    let beats, base = 0;
    if (only) beats = only;
    else if (mode === 'review') beats = reviewBeats(n);
    else {
      const all = L.beats.map(b => b.slice());
      base = mode === 'lesson' ? Math.min(rec(r, n).next || 0, all.length - 1) : 0;
      beats = all.slice(base);
      if (base > 0 && beats[0][0] !== 'flash' && taught(D, n).length) { beats.unshift(['flash']); base--; }   // the rest of a long lesson starts with a quick review
    }
    let taughtNow = false;
    if (!only && mode !== 'replay' && teachDay(r, t, n)) {      // Teach Mama day: Teddy reads first, Maria is the teacher
      const known = taught(D, n, true);
      const ws = [...new Set(D.lessons.slice(0, n).flatMap(x => x.words || []))].filter(w => D.words[w] && !D.words[w].sight && !D.words[w].sound && D.words[w].says.every(x => known.includes(x)) && CLIPS['w-' + w]);
      if (ws.length) { beats.unshift(['teach', ...pick(ws, 3)]); base--; taughtNow = true; }
    }
    S = { n, mode, beats, bi: 0, base, timeUp: false, limit: minutesFor(D, n) * 60, items: [], startedDay: t, lessonLen: L.beats.length, taught: taughtNow };
    preloadWords(Object.keys(D.words).concat(Object.keys(D.emoji)));
    L.beats.forEach(b => { if (b[0] === 'sent') b.slice(1).forEach(x => clipUrl('x-' + x)); if (b[0] === 'story') { const st = D.stories[b[1]]; st.pages.forEach(x => clipUrl('x-' + x)); st.questions.forEach((_, i) => clipUrl(`qq-${b[1]}${i}`)); } });
    taught(D, n, true).forEach(id => { if (!SND[id]) { clipUrl('p-' + id); if (CLIPS['q-' + id]) clipUrl('q-' + id); } });
    clock.start();
    $('#rdStreak2').textContent = AR(streakOf(r, t));
    $('#rdStars2').textContent = AR(r.stars.total);
    clearInterval(ticker); ticker = setInterval(tick, 400); tick();
    api.show('rsession');
    run(S);
  }
  function tick() {
    if (!S) return;
    const secs = clock.secs(), C = 2 * Math.PI * 26, ring = $('#rdRing');
    ring.style.strokeDasharray = `${C}`;
    ring.style.strokeDashoffset = `${C * Math.min(1, secs / S.limit)}`;
    $('#rdTimer').classList.toggle('low', secs > S.limit - 30);
    $('#rdTired').hidden = secs < 60;
    if (!S.timeUp && secs >= S.limit) { S.timeUp = true; chime(); $('#rdTimer').classList.add('up'); }
    if (secs >= D.cap * 60) endSession();          // the hard cap: ten minutes, even in the middle of a word
  }
  function chime() { const X = api.SFX; if (!X.ready || !X.ready()) return; X.bell(1046.5, 0, 1.1, 0.2); X.bell(1568, 0.18, 1.4, 0.15); X.hold(1.5); }
  function reviewBeats(n) {
    const prev = D.lessons.slice(Math.max(0, n - 3), n - 1).filter(L => L.ready);
    const known = taught(D, n, true), okWord = w => D.words[w] && D.words[w].says.every(x => known.includes(x));
    const words = [...new Set([...prev.flatMap(L => L.words || []), ...Object.keys(r.stuck).filter(okWord)])];
    const sounds = [...new Set(prev.flatMap(L => L.new || []).concat(D.lessons[n - 1].new || []))].filter(s => D.ear[s]);
    const out = [['flash']];
    if (words.length) out.push(['read', ...pick(words, 5)]);
    sounds.slice(-2).forEach(s => out.push(['hear', s]));
    if (sounds.length) out.push(['where', sounds[sounds.length - 1]]);
    if (out.length < 3 && (D.lessons[n - 1].words || []).length) out.push(['read', ...D.lessons[n - 1].words]);
    return out;
  }
  function moreBeats(s) {   // time is left after the lesson: more of what she knows
    const L = D.lessons[s.n - 1], known = taught(D, s.n, true);
    const words = [...new Set(D.lessons.slice(0, s.n).flatMap(x => x.words || []))].filter(w => D.words[w] && D.words[w].says.every(x => known.includes(x)));
    if (!s.taught && teachDay(r, today(), s.n) && words.length) { s.taught = true; return [['teach', ...pick(words.filter(w => !D.words[w].sight && !D.words[w].sound), 3)]]; }
    const ear = known.filter(x => D.ear[x]);
    const out = [];
    const sents = (L.beats || []).filter(b => b[0] === 'sent').flatMap(b => b.slice(1));
    if (sents.length && Math.random() < 0.5) out.push(['sent', ...pick(sents, 1)]);
    if (words.length) out.push(['read', ...pick(words, 3)]);
    if (ear.length) out.push([Math.random() < 0.5 || !words.length ? 'hear' : 'where', ear[Math.floor(Math.random() * ear.length)]]);
    if (!out.length) out.push(['flash']);
    return out;
  }
  async function run(s) {
    while (s === S) {
      let beat = s.beats[s.bi];
      if (!beat) { if (s.timeUp) break; s.beats.push(...moreBeats(s)); beat = s.beats[s.bi]; }
      const type = beat[0];
      showCue(type);
      try { await BEAT[type](s, beat.slice(1)); } catch (e) { console.warn('beat', type, e); }
      if (s !== S) return;
      s.bi++;
      if (s.timeUp) break;
    }
    if (s === S) endSession();
  }
  function showCue(type) {
    const el = $('#rdCue'), n = r.seen[type] || 0;
    const on = r.settings.cues && n < 3 && CUE[type];
    el.textContent = on ? CUE[type] : '';
    el.classList.toggle('on', !!on);
    r.seen[type] = n + 1; save();
  }
  const alive = s => s === S && !s.timeUp;
  function stopAll() {
    if (S) { clock.pause(); addMinutes(clock.secs()); }
    S = null; clearInterval(ticker); ticker = null; stopAudio(); stopRec(); clearTimeout(helpTimer);
    $('#rdCel').hidden = true; api.stopConfetti($('#rdConfetti'));
  }
  function addMinutes(secs) { const t = today(); r.minutes[t] = Math.round((r.minutes[t] || 0) + secs); save(); }

  /* ---------- review flash cards: say the sound, then tap the letter to hear it ---------- */
  async function beatFlash(s) {
    const known = taught(D, s.n);
    if (!known.length) return;
    let cards = []; while (cards.length < 5) cards = cards.concat(shuffle(known));
    for (const id of cards.slice(0, 5)) {
      if (!alive(s)) return;
      stage.innerHTML = `<div class="rd-flash"><button class="rd-card enter" id="rdCard">${esc(grapheme(id))}</button></div>`;
      const card = $('#rdCard');
      await new Promise(ok => {
        const nudge = setTimeout(() => { card.classList.add('nudge'); sayLetter(id); }, 6000);
        card.addEventListener('click', async () => {
          clearTimeout(nudge); card.classList.remove('nudge'); card.classList.add('lit'); api.SFX.init();
          await sayLetter(id); await sleep(450); ok();
        }, { once: true });
      });
    }
  }

  /* ---------- a new sound: hear it, then trace the letter while the sound plays on every stroke ---------- */
  async function beatNewSound(s, [id]) {
    const g = grapheme(id), held = SOUND[id].kind === 'hold';
    stage.innerHTML = `<div class="rd-new"><button class="rd-big enter" id="rdBig">${esc(g)}</button><p class="rd-ex" lang="en">${esc(g.split(' ')[0])} · ${esc(SOUND[id].say)}</p></div>`;
    const big = $('#rdBig');
    big.addEventListener('click', () => { big.classList.remove('pulse'); void big.offsetWidth; big.classList.add('pulse'); sayLetter(id, held); });
    await sleep(400);
    if (CLIPS['ln-' + id]) { await sayLine('ln-' + id); await sleep(250); }      // "This is the letter A." (the name, then the sound)
    for (let k = 0; k < 2 && s === S; k++) { big.classList.remove('pulse'); void big.offsetWidth; big.classList.add('pulse'); await sayLetter(id, held); await sleep(500); }
    if (!STROKES[g]) return;
    for (let k = 0; k < 2; k++) { if (!alive(s)) return; await trace(s, id, g); }
  }
  function trace(s, id, g) {
    const strokes = STROKES[g], held = SOUND[id].kind === 'hold';
    stage.innerHTML = `<div class="rd-trace"><svg viewBox="0 0 200 240" id="rdTrace">
      ${strokes.map((d, i) => `<path class="rd-guide" d="${d}"/><path class="rd-ink" id="rdInk${i}" d="${d}"/>`).join('')}
      <circle class="rd-dot" id="rdDot" r="13"/></svg></div>`;
    const svg = $('#rdTrace'), dot = $('#rdDot');
    const paths = strokes.map((_, i) => $('#rdInk' + i)), lens = paths.map(p => p.getTotalLength());
    paths.forEach((p, i) => { p.style.strokeDasharray = `${lens[i]}`; p.style.strokeDashoffset = `${lens[i]}`; });
    let si = 0, prog = 0, down = false;
    const place = () => { const p = paths[si].getPointAtLength(Math.min(lens[si], prog)); dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y); };
    place();
    const toSvg = e => { const m = svg.getScreenCTM().inverse(), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(m); };
    return new Promise(ok => {
      const move = e => {
        if (!down) return;
        const q = toSvg(e), p = paths[si], L = lens[si];
        let best = null, bd = 1e9;
        for (let l = prog; l <= Math.min(L, prog + 60); l += 3) { const a = p.getPointAtLength(l), d = Math.hypot(a.x - q.x, a.y - q.y); if (d < bd) { bd = d; best = l; } }
        if (best != null && bd < 34) { prog = Math.max(prog, best); p.style.strokeDashoffset = `${L - prog}`; place(); }
        if (prog >= L * 0.93) {
          p.style.strokeDashoffset = '0'; p.classList.add('done'); api.SFX.star();
          si++; prog = 0; down = false;
          if (si >= strokes.length) { svg.classList.add('all'); svg.removeEventListener('pointermove', move); dot.remove(); api.SFX.good(); setTimeout(async () => { await sayLetter(id, held); await sleep(350); ok(); }, 300); return; }
          place();
        }
      };
      svg.addEventListener('pointerdown', e => {
        const q = toSvg(e), a = paths[si].getPointAtLength(prog);
        if (Math.hypot(a.x - q.x, a.y - q.y) > 46) { dot.classList.remove('pulse'); void dot.getBBox(); dot.classList.add('pulse'); return; }
        down = true; try { svg.setPointerCapture(e.pointerId); } catch (err) {}
        if (prog === 0) sayLetter(id, held);   // the sound plays on every stroke
      });
      svg.addEventListener('pointermove', move);
      ['pointerup', 'pointercancel'].forEach(ev => svg.addEventListener(ev, () => { down = false; }));
    });
  }

  /* ---------- ear games: is the sound in the word? where is it? (she only hears the words; a picture after) ---------- */
  function feedback(ok, emoji, right, word) {
    const f = document.createElement('div'); f.className = 'rd-fb ' + (ok ? 'good' : 'soft');
    const k = word && photoKey(word);
    if (k) { f.classList.add('photo'); f.innerHTML = photoImg(k, 'rd-fbphoto'); } else f.textContent = emoji || '';
    stage.querySelector('.rd-game').append(f);
    if (right) right.classList.add('right');
    if (ok) api.SFX.good(); else api.SFX.again();
  }
  // the yes / no cards of the ear game: a green tick on the sound, a red cross for "no" (her choice, 20 Oct 2026)
  const TICK = '<svg viewBox="0 0 48 48"><path d="M12 25.5l8 8L36.5 15" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CROSS = '<svg viewBox="0 0 48 48"><path d="M14 14l20 20M34 14L14 34" fill="none" stroke="currentColor" stroke-width="7.5" stroke-linecap="round"/></svg>';
  async function beatHear(s, [id]) {
    const E = D.ear[id]; if (!E) return;
    const yes = [...E.beg, ...E.mid, ...E.end];
    const items = shuffle([...pick(yes, 5).map(w => [w, true]), ...pick(E.no, 3).map(w => [w, false])]);
    for (const [w, has] of items) {
      if (!alive(s)) return;
      stage.innerHTML = `<div class="rd-game rd-hear">
        <button class="rd-replay" id="rdAgain" aria-label="اسمعي مرة أخرى">${ic('i-speaker')}</button>
        <div class="rd-choices"><button class="rd-yes" data-a="1"><i class="rd-yesmark" aria-hidden="true">${TICK}</i><b>${esc(grapheme(id))}</b><span lang="en">👂 Yes</span></button>
        <button class="rd-no" data-a="0"><i class="rd-nomark" aria-hidden="true">${CROSS}</i><span lang="en">No</span></button></div></div>`;
      $('#rdAgain').addEventListener('click', () => sayWord(w));
      await sleep(250); sayWord(w);
      const ans = await choice('.rd-choices button');
      const ok = (ans.dataset.a === '1') === has;
      feedback(ok, D.emoji[w], ok ? null : stage.querySelector(`.rd-choices [data-a="${has ? 1 : 0}"]`), w);
      if (!ok) { await sleep(500); await sayWord(w); }
      await sleep(1100);
    }
  }
  async function beatWhere(s, [id]) {
    const E = D.ear[id]; if (!E) return;
    const lists = [['beg', E.beg], ['mid', E.mid], ['end', E.end]].filter(x => x[1].length);
    const items = shuffle(lists.flatMap(([k, ws]) => pick(ws, lists.length === 2 ? 3 : 2).map(w => [w, k]))).slice(0, 6);
    for (const [w, where] of items) {
      if (!alive(s)) return;
      stage.innerHTML = `<div class="rd-game rd-where">
        <div class="rd-wtop"><b class="rd-target">${esc(grapheme(id))}</b><button class="rd-replay" id="rdAgain" aria-label="اسمعي مرة أخرى">${ic('i-speaker')}</button></div>
        <div class="rd-arrow" aria-hidden="true"></div>
        <div class="rd-train">${['beg', 'mid', 'end'].map((k, i) => `<button class="rd-car c${i}" data-a="${k}"><span lang="ar">${['البداية', 'الوسط', 'النهاية'][i]}</span></button>`).join('')}</div></div>`;
      $('#rdAgain').addEventListener('click', () => sayWord(w));
      await sleep(250); sayWord(w);
      const ans = await choice('.rd-car');
      const ok = ans.dataset.a === where;
      ans.innerHTML += `<em>${esc(grapheme(id))}</em>`;
      feedback(ok, D.emoji[w], ok ? null : stage.querySelector(`.rd-car[data-a="${where}"]`), w);
      if (!ok) { await sleep(500); await sayWord(w); }
      await sleep(1100);
    }
  }
  const choice = sel => new Promise(ok => {
    const bs = [...stage.querySelectorAll(sel)];
    bs.forEach(b => b.addEventListener('click', () => { api.SFX.init(); bs.forEach(x => { x.disabled = true; }); b.classList.add('picked'); ok(b); }, { once: true }));
  });

  /* ---------- point and swipe: tap each letter left to right, then swipe under the word; the help ladder ---------- */
  let helpTimer = null;
  async function beatRead(s, words) {
    for (const w of words) { if (!alive(s)) return; if (D.words[w]) await readWord(s, w); }
  }
  // opts: pre = markup above the word; quick = the swipe alone is enough (letters still sound when tapped); into = an
  // element the word joins when read (sentences)
  function readWord(s, w, pre = '', opts = {}) {
    const W = D.words[w], n = W.tiles.length, sight = !!W.sight;
    stage.innerHTML = `<div class="rd-read">${pre}
      <div class="rd-word${sight ? ' sight' : ''}" id="rdWord">${W.tiles.map((t, i) => `<button class="rd-tile${sight ? ' wide' : ''}" data-i="${i}">${esc(t)}</button>`).join('')}</div>
      <div class="rd-ltr" id="rdLtr" aria-hidden="true"><i></i></div>
      <div class="rd-swipe" id="rdSwipe"><span class="rd-sw-hint">${'›'.repeat(3)}</span><i class="rd-thumb" id="rdThumb"></i></div>
      <div class="rd-after" id="rdAfter"></div>
      <div class="rd-mama" id="rdMama" hidden lang="ar" dir="rtl"><span>👩‍🦰 اسألي ماما</span><button id="rdMamaOk">ساعدتني ماما ✓</button></div>
      <p class="rd-mvcue" id="rdMvCue" lang="ar" dir="rtl"></p>
      <button class="rd-mamab" id="rdMamaB" aria-label="Mama: what happened?">👩‍🏫</button>
      <div class="rd-moves" id="rdMoves" hidden dir="ltr" lang="en">
        <div class="rd-mvbtns">${sight ? '' : '<button data-mv="skip">Skipped a sound</button><button data-mv="add">Added a sound</button><button data-mv="wrong">Wrong sound</button>'}
          <button data-mv="blend">Can't join her sounds</button>${sight || n < 3 ? '' : '<button data-mv="cv">Joins only the end (m… ap)</button>'}<button data-mv="close" aria-label="Close">✕</button></div>
        <p class="rd-mvline" id="rdMvLine">What happened? Tap it, then help her try again.</p></div></div>`;
    const tiles = [...stage.querySelectorAll('.rd-tile')], sw = $('#rdSwipe'), thumb = $('#rdThumb');
    let next = sight || opts.quick ? n : 0, lv = 0, helped = false, finished = false;
    if (next === n) $('#rdSwipe').classList.add('ready');
    const ltr = () => { const a = $('#rdLtr'); a.classList.remove('go'); void a.offsetWidth; a.classList.add('go'); clearTimeout(a.t); a.t = setTimeout(() => a.classList.remove('go'), 1600); if (tiles[next]) { tiles[next].classList.remove('nudge'); void tiles[next].offsetWidth; tiles[next].classList.add('nudge'); } };
    const sweep = secs => tiles.forEach((t, i) => setTimeout(() => { t.classList.add('sing'); setTimeout(() => t.classList.remove('sing'), 380); }, (secs * 1000 / n) * i));
    return new Promise(done => {
      const arm = () => { clearTimeout(helpTimer); if (!finished && $('#rdMoves') && $('#rdMoves').hidden) helpTimer = setTimeout(stuck, 6000); };
      /* ---------- Mama's tutor moves (the book's troubleshooting): she taps what happened, the app does the move ---------- */
      let mv = null;
      const box = $('#rdMoves'), mvLine = $('#rdMvLine'), cue = $('#rdMvCue');
      const restart = () => { next = sight || opts.quick ? n : 0; tiles.forEach(t => t.classList.remove('lit', 'nudge')); sw.classList.toggle('ready', next === n); };
      const clearMove = () => { mv = null; stage.querySelectorAll('.rd-gap').forEach(g => g.remove()); };
      const settle = async ms => { await sleep(ms); if (finished) return; tiles.forEach(t => t.classList.remove('hl')); cue.textContent = ''; box.hidden = true; clearMove(); restart(); arm(); };
      $('#rdMamaB').addEventListener('click', () => { api.SFX.init(); clearMove(); box.hidden = !box.hidden; mvLine.textContent = 'What happened? Tap it, then help her try again.'; clearTimeout(helpTimer); if (box.hidden) arm(); });
      box.addEventListener('click', async e => {
        const b = e.target.closest('[data-mv]'); if (!b || finished) return;
        const m = b.dataset.mv; clearMove();
        if (m === 'close') { box.hidden = true; arm(); return; }
        helped = true; clearTimeout(helpTimer);
        if (m === 'skip' || m === 'wrong') { mv = m; mvLine.textContent = m === 'skip' ? 'Tap the letter she skipped.' : 'Tap the letter she said wrongly.'; return; }
        if (m === 'add') {
          mv = m; mvLine.textContent = 'Tap the place where she added a sound.';
          tiles.forEach((t, i) => { if (i < n - 1) { const g = document.createElement('button'); g.className = 'rd-gap'; g.textContent = '·'; g.setAttribute('aria-label', 'here'); t.after(g); } });
          return;
        }
        box.hidden = true;
        if (m === 'blend') {           // her sounds, far apart, then closer and closer, then the word
          cue.textContent = 'اسمعي: الأصوات تقترب حتى تصير كلمة 👂';
          for (const gap of [700, 320]) { for (let i = 0; i < n; i++) { tiles[i].classList.add('hl'); await sayLetter(W.says[i]); await sleep(gap); tiles[i].classList.remove('hl'); } }
          await sayStretchy(w); await sleep(300); await sayWord(w);
        } else if (m === 'cv') {       // the first two sounds joined (/m/ + /a/ = /ma/), then the rest
          cue.textContent = 'أول صوتين معاً، ثم الباقي 🤝';
          tiles[0].classList.add('hl'); tiles[1].classList.add('hl');
          await sayLetter(W.says[0]); await sayLetter(W.says[1], true); await sleep(500);
          for (let i = 2; i < n; i++) { tiles[i].classList.add('hl'); await sayLetter(W.says[i]); await sleep(300); }
          await sleep(200); await sayWord(w);
        }
        settle(900);
      });
      stage.querySelector('#rdWord').addEventListener('click', async e => {
        const g = e.target.closest('.rd-gap'); if (!g || mv !== 'add') return;
        g.classList.add('hl'); mv = null; mvLine.textContent = 'Say: "What is here? Nothing. So we say nothing."';
        cue.textContent = 'هنا لا يوجد حرف، فلا نقول شيئاً ✋'; api.SFX.again();
        settle(3200);
      });
      const tutorLetter = async i => {
        const m = mv; mv = null; tiles[i].classList.add('hl');
        if (m === 'skip') { mvLine.textContent = 'Say: "Look here. Every sound we see, we say."'; cue.textContent = 'انظري هنا: كل صوت نراه نقوله 👀'; }
        else { mvLine.textContent = 'Say: "Look at this letter again. What sound does it make?"'; cue.textContent = 'انظري إلى هذا الحرف مرة أخرى 👀'; }
        await sleep(1400); if (finished) return; await sayLetter(W.says[i]);
        settle(1600);
      };
      async function stuck() {
        if (finished || s !== S) return;
        helped = true;
        if (lv === 0) {                                         // (a) the first sound (a sight word: the word itself)
          if (sight) { tiles[0].classList.add('nudge'); await sayWord(w); }
          else {
            const i = opts.quick ? 0 : Math.min(next, n - 1); tiles[i].classList.add('nudge');
            if (opts.before && opts.before.length && i === 0) { for (const b of opts.before) { await sayWord(b); await sleep(120); } }   // in a sentence: the words so far
            await sayLetter(W.says[i]); await sleep(450); await sayLetter(W.says[i]);
          }
        } else if (lv <= 3) {                                   // (b) the stretchy model, shorter each time
          const rate = [1, 1.3, 1.65][lv - 1];
          sweep(clipSecs(CLIPS['s-' + w] ? 's-' + w : 'w-' + w, rate)); await sayStretchy(w, rate);
        } else { $('#rdMama').hidden = false; return; }         // (c) ask Mama
        lv++; arm();
      }
      tiles.forEach((t, i) => t.addEventListener('click', () => {
        if (finished) return; api.SFX.init();
        if (mv === 'skip' || mv === 'wrong') { tutorLetter(i); return; }
        if (sight) { t.classList.add('lit'); sayWord(w); arm(); return; }
        if (opts.quick) { t.classList.add('lit'); sayLetter(W.says[i]); arm(); return; }
        if (i === next) { t.classList.add('lit'); t.classList.remove('nudge'); sayLetter(W.says[i]); next++; if (next === n) sw.classList.add('ready'); }
        else if (i < next) sayLetter(W.says[i]);
        else ltr();
        arm();
      }));
      let x0 = null, maxP = 0;
      const rect = () => sw.getBoundingClientRect();
      sw.addEventListener('pointerdown', e => {
        if (finished) return;
        if (next < n) { ltr(); arm(); return; }
        const R = rect(), p = (e.clientX - R.left) / R.width;
        if (p > 0.45) { ltr(); arm(); return; }                 // a swipe starts on the left
        x0 = e.clientX; maxP = p; try { sw.setPointerCapture(e.pointerId); } catch (err) {} arm();
      });
      sw.addEventListener('pointermove', e => {
        if (x0 == null || finished) return;
        const R = rect(), p = Math.max(0, Math.min(1, (e.clientX - R.left) / R.width));
        maxP = Math.max(maxP, p); thumb.style.left = `${6 + p * 88}%`;
        const tx = e.clientX; tiles.forEach(t => { const b = t.getBoundingClientRect(); t.classList.toggle('swept', b.left + b.width / 2 < tx); });
        if (maxP >= 0.82) success();
      });
      const up = () => { if (x0 == null || finished) return; x0 = null; thumb.style.left = ''; tiles.forEach(t => t.classList.remove('swept')); };
      sw.addEventListener('pointerup', up); sw.addEventListener('pointercancel', up);
      $('#rdMamaOk').addEventListener('click', () => { $('#rdMama').hidden = true; success(); });
      async function success() {
        if (finished) return; finished = true; x0 = null; clearTimeout(helpTimer); $('#rdMama').hidden = true; box.hidden = true; clearMove();
        sw.classList.add('done'); thumb.style.left = '94%'; tiles.forEach(t => t.classList.add('lit'));
        sweep(clipSecs('w-' + w)); await sayWord(w);
        if (s !== S) return;
        if (!opts.quiet) $('#rdAfter').innerHTML = W.sound ? '<span class="rd-sparkle">✨</span>' : picFor(w);
        if (opts.quiet) api.SFX.star(); else api.SFX.good();
        s.items.push({ w, helped });
        if (helped) { const k = r.stuck[w] || (r.stuck[w] = { n: 0, last: null }); k.n++; k.last = today(); save(); }
        else if (!sight && !opts.quick) { r.ok[w] = (r.ok[w] || 0) + 1; save(); }
        await sleep(opts.quiet ? 450 : 1500); done();
      }
      arm();
    });
  }

  /* ---------- add or swap a letter tile to make a new word, then read it ---------- */
  async function beatSwap(s, pairs) {
    for (const pr of pairs) {
      if (!alive(s)) return;
      const [from, to] = pr.split('>'); if (!D.words[from] || !D.words[to]) continue;
      await swapOne(s, from, to);
    }
  }
  function swapOne(s, from, to) {
    const A = D.words[from].tiles, B = D.words[to].tiles;
    if (B.length === A.length - 1) return dropOne(s, from, to);
    let slot, letter;                                           // where the new tile goes, and which letter it is
    if (B.length === A.length + 1 && B.slice(1).join('') === A.join('')) { slot = 0; letter = B[0]; }
    else if (B.length === A.length + 1 && B.slice(0, -1).join('') === A.join('')) { slot = A.length; letter = B[B.length - 1]; }
    else { slot = A.findIndex((c, i) => c !== B[i]); letter = B[slot]; }
    const adding = B.length > A.length;
    const letters = [...new Set(taught(D, s.n, true).map(grapheme))];
    const tray = shuffle([letter, ...pick(letters.filter(x => x !== letter && x !== A[slot]), 2)]);
    const cells = adding ? [...A.slice(0, slot), null, ...A.slice(slot)] : A.slice();
    stage.innerHTML = `<div class="rd-swap">
      <div class="rd-word">${cells.map((c, i) => (c === null ? '<span class="rd-tile slot" id="rdSlot"></span>' : `<span class="rd-tile${!adding && i === slot ? ' wob' : ''}"${!adding && i === slot ? ' id="rdSlot"' : ''}>${esc(c)}</span>`)).join('')}</div>
      <button class="rd-replay" id="rdAgain" aria-label="اسمعي الكلمة">${ic('i-speaker')}</button>
      <div class="rd-tray">${tray.map(c => `<button class="rd-tile pick" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>`;
    $('#rdAgain').addEventListener('click', () => sayWord(to));
    const sid = tileSound;
    return new Promise(done => {
      (async () => { await sayWord(from); await sleep(450); await sayWord(to); })();
      let tries = 0;
      stage.querySelectorAll('.rd-tray .pick').forEach(b => b.addEventListener('click', async () => {
        api.SFX.init();
        if (b.dataset.c === letter) {
          stage.querySelectorAll('.rd-tray .pick').forEach(x => { x.disabled = true; });
          const sl = $('#rdSlot'), a = b.getBoundingClientRect(), z = sl.getBoundingClientRect();
          b.style.transition = 'transform .45s cubic-bezier(.3,1.4,.5,1)'; b.style.transform = `translate(${z.left - a.left}px, ${z.top - a.top}px)`;
          api.SFX.flip && api.SFX.flip();
          await sleep(500);
          if (s !== S) return;
          await readWord(s, to, '<div class="rd-made">✨</div>');
          done();
        } else {
          tries++; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
          await sayLetter(sid(b.dataset.c)); await sleep(250);
          await (tries > 1 ? sayStretchy(to) : sayWord(to));
        }
      }));
    });
  }

  // take a sound away: CATS -> CAT; she taps the letter that has to go, it flies off, then she reads the new word
  function dropOne(s, from, to) {
    const A = D.words[from].tiles, B = D.words[to].tiles;
    let k = A.findIndex((t, i) => t !== B[i]); if (k < 0) k = A.length - 1;
    stage.innerHTML = `<div class="rd-swap rd-drop"><p class="rd-sayit" lang="ar" dir="rtl">أي حرف نمحو؟ 🧽</p>
      <div class="rd-word">${A.map((t, i) => `<button class="rd-tile" data-i="${i}">${esc(t)}</button>`).join('')}</div>
      <button class="rd-replay" id="rdAgain" aria-label="اسمعي الكلمة">${ic('i-speaker')}</button></div>`;
    $('#rdAgain').addEventListener('click', () => sayWord(to));
    return new Promise(done => {
      (async () => { await sayWord(from); await sleep(450); await sayWord(to); })();
      let tries = 0;
      stage.querySelectorAll('.rd-drop .rd-tile').forEach(b => b.addEventListener('click', async () => {
        api.SFX.init();
        if (Number(b.dataset.i) === k) {
          stage.querySelectorAll('.rd-drop .rd-tile').forEach(x => { x.disabled = true; });
          b.classList.add('wipe'); api.SFX.flip && api.SFX.flip();
          await sleep(550); if (s !== S) return;
          await readWord(s, to, '<div class="rd-made">🧽✨</div>');
          done();
        } else {
          tries++; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
          await sayWord(to);
          if (tries > 1) { const want = stage.querySelector(`.rd-drop .rd-tile[data-i="${k}"]`); if (want) want.classList.add('nudge'); }
        }
      }));
    });
  }

  /* ---------- record herself and play it next to the model voice ---------- */
  async function beatMe(s, [item]) {
    if (!canRecord() || !alive(s)) return;
    const [kind, id] = item.split(':');
    const model = () => (kind === 'sound' ? sayLetter(id, SOUND[id] && SOUND[id].kind === 'hold') : sayWord(id));
    const show = kind === 'sound' ? `<b class="rd-big small">${esc(grapheme(id))}</b>` : `<div class="rd-word">${D.words[id].tiles.map(t => `<span class="rd-tile lit">${esc(t)}</span>`).join('')}</div>`;
    stage.innerHTML = `<div class="rd-me">${show}
      <div class="rd-mebtns"><button class="rd-mbtn model" id="rdModel">${ic('i-speaker')}<span>اسمعي</span></button>
      <button class="rd-mbtn mic" id="rdMic"><svg viewBox="0 0 64 64" class="rd-micring" aria-hidden="true"><circle cx="32" cy="32" r="29" id="rdMicRing"/></svg><span class="rd-micic">🎙️</span><span>سجّلي</span></button>
      <button class="rd-mbtn mine" id="rdMine" disabled>▶<span>صوتي</span></button></div>
      <button class="rd-next" id="rdNext" hidden lang="en" dir="ltr">Next →</button></div>`;
    $('#rdModel').addEventListener('click', model);
    await sleep(300); await model();
    let url = null;
    const skip = setTimeout(() => { const nb = $('#rdNext'); if (nb) nb.hidden = false; }, 6000);   // she may not want to record today
    return new Promise(done => {
      $('#rdMic').addEventListener('click', async () => {
        const mic = $('#rdMic'); if (mic.classList.contains('on')) { stopRec(); return; }
        mic.classList.add('on'); const C = 2 * Math.PI * 29, ring = $('#rdMicRing'); ring.style.strokeDasharray = `${C}`;
        let blob = null;
        try { blob = await record(3000, p => { ring.style.strokeDashoffset = `${C * (1 - p)}`; }); } catch (e) { api.toast('الميكروفون لا يعمل الآن'); done(); return; }
        if (s !== S) return;
        mic.classList.remove('on'); ring.style.strokeDashoffset = `${C}`;
        if (!blob) return;
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(blob);
        $('#rdMine').disabled = false; $('#rdNext').hidden = false;
        idb('mine', 'readwrite', st => st.put({ id: `${today()}-${Date.now()}`, day: today(), at: Date.now(), item, type: blob.type, blob })).catch(() => {});
        await play(url); await sleep(300); await model();
      });
      $('#rdMine').addEventListener('click', () => { if (url) play(url); });
      $('#rdNext').addEventListener('click', () => { clearTimeout(skip); stopAudio(); stopRec(); if (url) URL.revokeObjectURL(url); done(); });
    });
  }


  /* ---------- a sight word (THE, HE, NO ...): she learns it whole: hear it, tap it three times, then read it ---------- */
  async function beatSight(s, words) {
    for (const w of words) {
      if (!alive(s) || !D.words[w]) continue;
      stage.innerHTML = `<div class="rd-new"><button class="rd-big word enter" id="rdBig">${esc(D.words[w].tiles[0])}</button><p class="rd-star3" id="rdTaps">☆☆☆</p></div>`;
      const big = $('#rdBig');
      await sleep(300); big.classList.add('pulse'); await sayWord(w);
      await new Promise(ok => {
        let k = 0;
        const tap = async () => {
          api.SFX.init(); k++; $('#rdTaps').textContent = '★'.repeat(Math.min(3, k)) + '☆'.repeat(Math.max(0, 3 - k));
          big.classList.remove('pulse'); void big.offsetWidth; big.classList.add('pulse');
          await sayWord(w);
          if (k >= 3) { big.removeEventListener('click', tap); await sleep(300); ok(); }
        };
        big.addEventListener('click', tap);
      });
      if (!alive(s)) return;
      await readWord(s, w);
    }
  }

  /* ---------- what's the difference? two words; she taps the letter that changed ---------- */
  async function beatDiff(s, pairs) {
    for (const pr of pairs) {
      if (!alive(s)) return;
      const [a, b] = pr.split('/'); if (!D.words[a] || !D.words[b]) continue;
      const A = D.words[a].tiles, B = D.words[b].tiles;
      let ia = -1, ib = -1;                                     // the tile that differs (or the extra one)
      if (A.length === B.length) ia = ib = A.findIndex((t, i) => t !== B[i]);
      else {
        const longA = A.length > B.length, hi = longA ? A : B, lo = longA ? B : A;
        let k = hi.findIndex((t, i) => t !== lo[i]); if (k < 0) k = hi.length - 1;
        if (longA) ia = k; else ib = k;
      }
      const row = (T, id, w) => `<div class="rd-drow"><div class="rd-word">${T.map((t, i) => `<button class="rd-tile small" data-r="${id}" data-i="${i}">${esc(t)}</button>`).join('')}</div>
        <button class="rd-replay small" data-say="${w}" aria-label="اسمعي">${ic('i-speaker')}</button></div>`;
      stage.innerHTML = `<div class="rd-diff">${row(A, 'a', a)}${row(B, 'b', b)}</div>`;
      stage.querySelectorAll('[data-say]').forEach(x => x.addEventListener('click', () => sayWord(x.dataset.say)));
      const mark = cls => [['a', ia], ['b', ib]].forEach(([rr, k]) => { if (k >= 0) { const el = stage.querySelector(`[data-r="${rr}"][data-i="${k}"]`); if (el) el.classList.add(cls); } });
      await sleep(250); await sayWord(a); await sleep(300); await sayWord(b);
      await new Promise(ok => {
        let tries = 0;
        stage.querySelectorAll('.rd-tile').forEach(t => t.addEventListener('click', async () => {
          if (t.disabled) return; api.SFX.init();
          const i = Number(t.dataset.i);
          if (t.dataset.r === 'a' ? i === ia : i === ib) {
            stage.querySelectorAll('.rd-tile').forEach(x => { x.disabled = true; });
            mark('diffy'); api.SFX.good();
            await sayLetter(tileSound(t.textContent)); await sleep(350); await sayWord(a); await sleep(200); await sayWord(b); await sleep(600); ok();
          } else {
            tries++; t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake'); api.SFX.again();
            if (tries >= 2) mark('nudge');
          }
        }));
      });
    }
  }

  /* ---------- spell from dictation: she hears a word and builds it with letter tiles, left to right ---------- */
  async function beatSpell(s, words) {
    for (const w of words) { if (!alive(s) || !D.words[w]) continue; await spellOne(s, w); }
  }
  function spellOne(s, w) {
    const W = D.words[w], T = W.tiles;
    const letters = [...new Set(taught(D, s.n, true).map(grapheme))].filter(c => !T.includes(c));
    const tray = shuffle([...T, ...pick(letters, Math.min(2, letters.length))]);
    stage.innerHTML = `<div class="rd-swap rd-spell">
      <div class="rd-word">${T.map((_, i) => `<span class="rd-tile slot" data-slot="${i}"></span>`).join('')}</div>
      <button class="rd-replay" id="rdAgain" aria-label="اسمعي الكلمة">${ic('i-speaker')}</button>
      <div class="rd-tray">${tray.map(c => `<button class="rd-tile pick" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="rd-after" id="rdAfter"></div></div>`;
    $('#rdAgain').addEventListener('click', () => sayWord(w));
    return new Promise(done => {
      (async () => { await sleep(250); await sayWord(w); })();
      let i = 0, tries = 0;
      stage.querySelectorAll('.rd-tray .pick').forEach(b => b.addEventListener('click', async () => {
        if (b.disabled || i >= T.length) return; api.SFX.init();
        if (b.dataset.c === T[i]) {
          const sl = stage.querySelector(`[data-slot="${i}"]`); b.disabled = true; b.classList.add('used');
          sl.textContent = b.dataset.c; sl.classList.remove('slot'); sl.classList.add('lit', 'pop');
          sayLetter(W.says[i]); i++; tries = 0;      // the sound in this word (the ED of HOPPED says /t/)
          if (i === T.length) {
            stage.querySelectorAll('.rd-tray .pick').forEach(x => { x.disabled = true; });
            await sleep(550); if (s !== S) return;
            await sayWord(w); api.SFX.good();
            $('#rdAfter').innerHTML = picFor(w);
            await sleep(1300); done();
          }
        } else {
          tries++; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
          await sayLetter(tileSound(b.dataset.c)); await sleep(250);
          await (tries > 1 ? sayStretchy(w) : sayWord(w));
          if (tries > 2) { const want = [...stage.querySelectorAll('.rd-tray .pick')].find(x => !x.disabled && x.dataset.c === T[i]); if (want) want.classList.add('nudge'); }
        }
      }));
    });
  }

  /* ---------- sentences, built one word at a time: read each word, then swipe under the whole sentence ---------- */
  async function beatSent(s, ids) {
    for (const id of ids) { if (!alive(s) || !D.sentences[id]) continue; await sentOne(s, id); }
  }
  async function sentOne(s, id, opts = {}) {
    const X = D.sentences[id], toks = X.text.split(/\s+/);
    const line = k => `${opts.page ? `<div class="rd-page">${esc(opts.page)}</div>` : ''}<div class="rd-line">${toks.map((t, i) => `<span class="rd-lw${i < k ? ' on' : i === k ? ' cur' : ''}">${esc(t)}</span>`).join(' ')}</div>`;
    const long = X.words.length >= 5;      // a long sentence: after each new word, she reads again from the start
    for (let k = 0; k < X.words.length; k++) {
      if (s !== S) return;
      const w = X.words[k], known = s.n >= 11 && (r.ok[w] || 0) >= 3;
      await readWord(s, w, line(k), { quick: known, quiet: true, before: X.words.slice(0, k) });
      if (long && k > 0 && k < X.words.length - 1 && s === S) await buildUp(s, toks, k + 1, opts);
    }
    if (s !== S) return;
    stage.innerHTML = `<div class="rd-read rd-sentence">${opts.page ? `<div class="rd-page">${esc(opts.page)}</div>` : ''}
      <div class="rd-line big">${toks.map(t => `<span class="rd-lw on">${esc(t)}</span>`).join(' ')}</div>
      <div class="rd-swipe ready" id="rdSwipe"><span class="rd-sw-hint">›››</span><i class="rd-thumb" id="rdThumb"></i></div><div class="rd-after" id="rdAfter"></div></div>`;
    await swipeOnce();
    if (s !== S) return;
    const ws = [...stage.querySelectorAll('.rd-lw')], secs = clipSecs('x-' + id), total = toks.reduce((a, t) => a + t.length + 2, 0);
    let at = 0;
    ws.forEach((el, i) => { const t0 = at; at += (toks[i].length + 2) / total * secs * 1000; setTimeout(() => { ws.forEach(x => x.classList.remove('say')); el.classList.add('say'); }, t0); });
    await sayLine('x-' + id);
    ws.forEach(x => x.classList.remove('say'));
    if (s !== S) return;
    $('#rdAfter').innerHTML = X.photo && PHOTO().has(X.photo) ? photoImg(X.photo) : X.e ? `<span class="rd-emo">${X.e}</span>` : '<span class="rd-sparkle">⭐</span>';
    api.SFX.good(); await sleep(1400);
  }
  // the line so far (THE FAT): she swipes under it and hears its words one after another
  async function buildUp(s, toks, k, opts = {}) {
    stage.innerHTML = `<div class="rd-read rd-sentence">${opts.page ? `<div class="rd-page">${esc(opts.page)}</div>` : ''}
      <div class="rd-line big">${toks.map((t, i) => `<span class="rd-lw${i < k ? ' on' : ' hide'}">${esc(t)}</span>`).join(' ')}</div>
      <div class="rd-swipe ready" id="rdSwipe"><span class="rd-sw-hint">›››</span><i class="rd-thumb" id="rdThumb"></i></div><p class="rd-sayit" lang="ar" dir="rtl">من البداية مرة أخرى ↩️</p></div>`;
    await swipeOnce(); if (s !== S) return;
    const ws = [...stage.querySelectorAll('.rd-lw.on')];
    for (let i = 0; i < ws.length; i++) {
      ws.forEach(x => x.classList.remove('say')); ws[i].classList.add('say');
      const w = toks[i].replace(/[.,!?"]/g, '').toLowerCase(); await sayWord(w); await sleep(60);
    }
    ws.forEach(x => x.classList.remove('say')); await sleep(300);
  }
  function swipeOnce() {    // a plain left-to-right swipe under a line
    return new Promise(ok => {
      const sw = $('#rdSwipe'), th = $('#rdThumb'); let x0 = null, maxP = 0, fin = false;
      const nudge = setInterval(() => { if (fin) return clearInterval(nudge); const a = $('#rdLtr'); if (!a) { th.classList.remove('nudge'); void th.offsetWidth; th.classList.add('nudge'); } }, 6000);
      sw.addEventListener('pointerdown', e => { const R = sw.getBoundingClientRect(), p = (e.clientX - R.left) / R.width; if (p > 0.45) return; x0 = e.clientX; maxP = p; try { sw.setPointerCapture(e.pointerId); } catch (err) {} });
      sw.addEventListener('pointermove', e => {
        if (x0 == null || fin) return;
        const R = sw.getBoundingClientRect(), p = Math.max(0, Math.min(1, (e.clientX - R.left) / R.width));
        maxP = Math.max(maxP, p); th.style.left = `${6 + p * 88}%`;
        if (maxP >= 0.82) { fin = true; clearInterval(nudge); sw.classList.add('done'); th.style.left = '94%'; ok(); }
      });
      const up = () => { if (!fin) { x0 = null; th.style.left = ''; } };
      sw.addEventListener('pointerup', up); sw.addEventListener('pointercancel', up);
    });
  }

  /* ---------- a short story: its pages, then two curiosity questions with picture answers ---------- */
  async function beatStory(s, [sid]) {
    const st = D.stories[sid]; if (!st) return;
    stage.innerHTML = `<div class="rd-storyt enter"><span>📖</span><b>${esc(st.title)}</b></div>`;
    api.SFX.unlock(); await sleep(1500);
    for (let i = 0; i < st.pages.length; i++) {
      if (!alive(s)) return;
      await sentOne(s, st.pages[i], { page: `${i + 1} / ${st.pages.length}` });
    }
    for (let q = 0; q < st.questions.length; q++) {
      if (!alive(s)) return;
      const Q = st.questions[q];
      stage.innerHTML = `<div class="rd-game rd-q"><div class="rd-qrow"><p class="rd-qtext" lang="en">${esc(Q.q)}</p><button class="rd-replay small" id="rdAgain" aria-label="اسمعي">${ic('i-speaker')}</button></div>
        <div class="rd-choices">${Q.opts.map((o, i) => { const k = Q.photos && Q.photos[i] && PHOTO().has(Q.photos[i]) ? Q.photos[i] : null; return `<button class="rd-opt${k ? ' ph' : ''}" data-i="${i}">${k ? photoImg(k, 'rd-optphoto') : o}</button>`; }).join('')}</div></div>`;
      $('#rdAgain').addEventListener('click', () => sayLine(`qq-${sid}${q}`));
      await sleep(250); sayLine(`qq-${sid}${q}`);
      for (;;) {
        const b = await choice('.rd-opt');
        if (s !== S) return;
        const ok = Number(b.dataset.i) === Q.ok;
        feedback(ok, ok ? '🌟' : '🤔');
        await sleep(1100);
        if (ok) break;
        stage.querySelectorAll('.rd-opt').forEach(x => { x.disabled = false; x.classList.remove('picked'); });
        const fb = stage.querySelector('.rd-fb'); if (fb) fb.remove();
      }
    }
  }

  /* ---------- which sound did she hear? /p/ or /b/ (lesson 11), /e/ or /i/ (lesson 23): sounds Arabic does not have ---------- */
  async function beatPair(s, [gid]) {
    const G = D.pairs && D.pairs[gid]; if (!G) return;
    const items = shuffle(G.pairs.flatMap(pr => [[pr[0], G.a, pr], [pr[1], G.b, pr]])).slice(0, 8);
    for (const [w, snd, pr] of items) {
      if (!alive(s)) return;
      stage.innerHTML = `<div class="rd-game rd-pairg"><button class="rd-replay" id="rdAgain" aria-label="اسمعي مرة أخرى">${ic('i-speaker')}</button>
        <div class="rd-choices">${[G.a, G.b].map(x => `<button class="rd-yes" data-a="${x}"><b>${esc(grapheme(x))}</b><span lang="en">/${x}/</span></button>`).join('')}</div></div>`;
      $('#rdAgain').addEventListener('click', () => sayWord(w));
      await sleep(250); sayWord(w);
      const b = await choice('.rd-choices button');
      const ok = b.dataset.a === snd;
      feedback(ok, D.emoji[w], ok ? null : stage.querySelector(`.rd-choices [data-a="${snd}"]`), w);
      await sleep(700); await sayWord(pr[0]); await sleep(250); await sayWord(pr[1]);
      await sleep(700);
    }
  }


  /* ---------- stretchy words, heard only (lessons 1-3): the word slowly, then at normal speed; she says it too ---------- */
  const nextBtn = (ms = 1800) => new Promise(ok => { const nb = $('#rdNext'); if (!nb) return ok(); const t = setTimeout(() => { nb.hidden = false; }, ms); nb.addEventListener('click', () => { clearTimeout(t); api.SFX.init(); ok(); }, { once: true }); });
  async function beatStretch(s, words) {
    for (const w of words) {
      if (!alive(s) || !CLIPS['w-' + w]) continue;              // a word with no voice yet waits for its recording
      stage.innerHTML = `<div class="rd-game rd-stretch"><button class="rd-replay big" id="rdAgain" aria-label="اسمعي مرة أخرى">${ic('i-speaker')}</button>
        <div class="rd-snail" id="rdBar" aria-hidden="true"><i></i></div><p class="rd-sayit" id="rdSay" lang="ar" dir="rtl"></p>
        <div class="rd-after" id="rdAfter"></div><button class="rd-next" id="rdNext" hidden lang="en" dir="ltr">Next →</button></div>`;
      const bar = $('#rdBar'), say = $('#rdSay');
      const slow = async () => {
        const id = CLIPS['s-' + w] ? 's-' + w : 'w-' + w;
        bar.style.setProperty('--secs', `${clipSecs(id, CLIPS['s-' + w] ? 1 : 0.62)}s`); bar.classList.remove('go'); void bar.offsetWidth; bar.classList.add('go');
        await sayStretchy(w);
      };
      $('#rdAgain').addEventListener('click', slow);
      await sleep(300); say.textContent = 'اسمعي الكلمة ببطء 🐌'; await slow(); if (!alive(s)) return;
      say.textContent = 'قوليها ببطء مثلي'; await sleep(2600); if (!alive(s)) return;
      say.textContent = 'والآن بسرعتها العادية'; await sayWord(w); await sleep(300); if (!alive(s)) return;
      $('#rdAfter').innerHTML = picFor(w); api.SFX.good(); say.textContent = 'قوليها أنتِ! 🗣️';
      await nextBtn();
    }
  }

  /* ---------- Hear a Sound and Perform an Action: two sounds, two actions; she hears one and does its action ---------- */
  const ACTIONS = [['🦘', 'اقفزي'], ['👏', 'صفّقي'], ['🙆‍♀️', 'المسي رأسكِ'], ['💃', 'دوري']];
  async function beatAction(s, ids) {
    const two = ids.filter(id => SOUND[id] && hasSound(id)).slice(0, 2); if (two.length < 2) return;
    const acts = pick(ACTIONS, 2);
    stage.innerHTML = `<div class="rd-game rd-action"><div class="rd-acts">${two.map((id, i) => `<button class="rd-act" data-i="${i}"><b>${esc(grapheme(id))}</b><span class="rd-actic">${acts[i][0]}</span><span lang="ar">${acts[i][1]}</span></button>`).join('')}</div>
      <p class="rd-sayit" id="rdSay" lang="ar" dir="rtl">لكل صوت حركة: اسمعي، ثم اعملي الحركة والمسيها</p></div>`;
    const cards = [...stage.querySelectorAll('.rd-act')];
    for (let i = 0; i < 2; i++) { cards[i].classList.add('lit'); await sayLetter(two[i]); await sleep(800); cards[i].classList.remove('lit'); if (!alive(s)) return; }
    for (const k of shuffle([0, 1, 0, 1, 0, 1])) {
      if (!alive(s)) return;
      cards.forEach(b => { b.disabled = false; b.classList.remove('picked', 'right', 'shake'); });
      await sleep(600); await sayLetter(two[k], SOUND[two[k]].kind === 'hold');
      const ans = await choice('.rd-act');
      if (Number(ans.dataset.i) === k) { ans.classList.add('right'); api.SFX.good(); }
      else { ans.classList.add('shake'); api.SFX.again(); cards[k].classList.add('right'); await sleep(400); await sayLetter(two[k]); }
      await sleep(1100);
    }
  }

  /* ---------- Hop to that Sound: letters around the room; she hears a sound and the bunny hops to its letter ---------- */
  async function beatRun(s, ids) {
    const set = ids.filter(id => SOUND[id] && hasSound(id)).slice(0, 3); if (set.length < 2) return;
    stage.innerHTML = `<div class="rd-game rd-run"><div class="rd-field">${shuffle(set).map((id, i) => `<button class="rd-spot s${i}" data-id="${id}"><b>${esc(grapheme(id))}</b></button>`).join('')}<span class="rd-runner" id="rdRunner">🐰</span></div>
      <button class="rd-replay" id="rdAgain" aria-label="اسمعي مرة أخرى">${ic('i-speaker')}</button></div>`;
    let cur = null; $('#rdAgain').addEventListener('click', () => { if (cur) sayLetter(cur); });
    const runner = $('#rdRunner'), field = stage.querySelector('.rd-field');
    const hopTo = b => { const f = field.getBoundingClientRect(), q = b.getBoundingClientRect(); runner.style.left = `${q.left - f.left + q.width / 2}px`; runner.style.top = `${q.top - f.top}px`; runner.classList.remove('hop'); void runner.offsetWidth; runner.classList.add('hop'); };
    for (const id of shuffle([...set, ...set]).slice(0, 6)) {
      if (!alive(s)) return;
      cur = id; stage.querySelectorAll('.rd-spot').forEach(b => { b.disabled = false; b.classList.remove('picked', 'right'); });
      await sleep(600); await sayLetter(id);
      const ans = await choice('.rd-spot'); hopTo(ans);
      if (ans.dataset.id === id) { ans.classList.add('right'); api.SFX.good(); }
      else { api.SFX.again(); const want = stage.querySelector(`.rd-spot[data-id="${id}"]`); want.classList.add('right'); await sleep(500); hopTo(want); await sayLetter(id); }
      await sleep(1000);
    }
  }

  /* ---------- the Shopping Game: she buys a thing from the shop by saying each of its sounds (one coin a sound) ---------- */
  async function beatShop(s, words) {
    const items = words.filter(w => D.words[w] && !D.words[w].sight && CLIPS['w-' + w]).slice(0, 4); if (!items.length) return;
    const basket = [];
    const basketHTML = () => `<div class="rd-basket"><span class="rd-bask">🧺</span>${basket.map(x => `<span class="rd-inb">${picFor(x)}</span>`).join('')}</div>`;
    while (basket.length < Math.min(3, items.length) && alive(s)) {
      const left = items.filter(w => !basket.includes(w));
      stage.innerHTML = `<div class="rd-game rd-shop"><p class="rd-sayit" lang="ar" dir="rtl">🛍️ ماذا تشترين؟</p>
        <div class="rd-shelf">${left.map(w => `<button class="rd-item" data-w="${w}">${picFor(w)}<span class="rd-price">${'🪙'.repeat(D.words[w].says.length)}</span></button>`).join('')}</div>${basketHTML()}</div>`;
      const b = await choice('.rd-item'); if (!alive(s)) return;
      const w = b.dataset.w, W = D.words[w];
      await sayWord(w);
      stage.innerHTML = `<div class="rd-game rd-shop"><div class="rd-buy">${picFor(w)}</div><p class="rd-sayit" lang="ar" dir="rtl">قولي أصواتها واحداً واحداً لتدفعي</p>
        <div class="rd-boxes" dir="ltr">${W.says.map((x, i) => `<button class="rd-box" data-i="${i}"></button>`).join('')}</div>${basketHTML()}</div>`;
      await new Promise(ok => {
        let i = 0; const boxes = [...stage.querySelectorAll('.rd-box')];
        boxes.forEach((bx, k) => bx.addEventListener('click', async () => {
          api.SFX.init();
          if (k !== i) { boxes[i].classList.remove('nudge'); void boxes[i].offsetWidth; boxes[i].classList.add('nudge'); return; }
          bx.classList.add('lit'); bx.textContent = '🪙'; i++; await sayLetter(W.says[k]);
          if (i === boxes.length) { await sleep(450); await sayWord(w); api.SFX.good(); await sleep(600); ok(); }
        }));
      });
      basket.push(w);
    }
    if (!alive(s)) return;
    stage.innerHTML = `<div class="rd-game rd-shop"><p class="rd-sayit big" lang="ar" dir="rtl">اشتريتِ كل شيء! 🎉</p>${basketHTML()}</div>`;
    api.SFX.unlock(); await sleep(1600);
  }

  /* ---------- Hopping Hoops: one hoop for each sound; the frog hops in for every sound, then out with the whole word ---------- */
  async function beatHoops(s, words) {
    for (const w of words) {
      const W = D.words[w]; if (!alive(s) || !W || W.sight || !CLIPS['w-' + w]) continue;
      stage.innerHTML = `<div class="rd-game rd-hoops"><button class="rd-replay" id="rdAgain" aria-label="اسمعي">${ic('i-speaker')}</button>
        <p class="rd-sayit" lang="ar" dir="rtl">قفزة لكل صوت، ثم اخرجي بالكلمة 🐸</p>
        <div class="rd-hooprow" dir="ltr">${W.says.map((x, i) => `<button class="rd-hoop" data-i="${i}" aria-label="hoop ${i + 1}"></button>`).join('')}<button class="rd-hoop out" data-i="${W.says.length}" aria-label="out">🏁</button><span class="rd-frog" id="rdFrog">🐸</span></div>
        <div class="rd-after" id="rdAfter"></div></div>`;
      $('#rdAgain').addEventListener('click', () => sayWord(w));
      await sleep(300); await sayWord(w); if (!alive(s)) return;
      const frog = $('#rdFrog'), row = stage.querySelector('.rd-hooprow');
      const jump = el => { const f = row.getBoundingClientRect(), b = el.getBoundingClientRect(); frog.style.left = `${b.left - f.left + b.width / 2}px`; frog.classList.remove('hop'); void frog.offsetWidth; frog.classList.add('hop'); };
      await new Promise(ok => {
        let i = 0; const hs = [...stage.querySelectorAll('.rd-hoop')];
        hs.forEach((h, k) => h.addEventListener('click', async () => {
          api.SFX.init();
          if (k !== i) { hs[i].classList.remove('nudge'); void hs[i].offsetWidth; hs[i].classList.add('nudge'); return; }
          jump(h); h.classList.add('lit'); i++;
          if (k < W.says.length) sayLetter(W.says[k]);
          else { await sleep(250); await sayWord(w); $('#rdAfter').innerHTML = picFor(w); api.SFX.good(); await sleep(1300); ok(); }
        }));
      });
    }
  }

  /* ---------- Flashcards Basketball: read the card aloud, then flick it up into the basket; the word is said as it scores ---------- */
  async function beatBasket(s, words) {
    const cards = words.filter(w => D.words[w] && CLIPS['w-' + w]).slice(0, 8); if (!cards.length) return;
    let score = 0;
    for (const w of cards) {
      if (!alive(s)) return;
      const W = D.words[w];
      stage.innerHTML = `<div class="rd-game rd-ball"><div class="rd-hoopbox" id="rdHoopBox"><span class="rd-backboard"></span><span class="rd-rim"></span><span class="rd-net"></span></div>
        <p class="rd-score" id="rdScore">🏀 ${AR(score)}</p>
        <button class="rd-card rd-flick" id="rdFlick">${esc(W.tiles.join(''))}</button>
        <p class="rd-sayit" lang="ar" dir="rtl">اقرئيها، ثم اقذفيها إلى السلة ⬆️</p>
        <button class="rd-replay small" id="rdAgain" aria-label="اسمعي">${ic('i-speaker')}</button></div>`;
      $('#rdAgain').addEventListener('click', () => sayWord(w));
      const card = $('#rdFlick');
      await new Promise(ok => {
        let y0 = null, x0 = null;
        const nudge = setTimeout(() => card.classList.add('nudge'), 6000);
        card.addEventListener('pointerdown', e => { api.SFX.init(); y0 = e.clientY; x0 = e.clientX; try { card.setPointerCapture(e.pointerId); } catch (err) {} });
        card.addEventListener('pointermove', e => { if (y0 == null) return; const dy = Math.min(0, e.clientY - y0); card.style.transform = `translate(${(e.clientX - x0) * 0.3}px, ${dy}px)`; });
        const up = async e => {
          if (y0 == null) return; const dy = e.clientY - y0; y0 = null;
          if (dy > -60) { card.style.transform = ''; return; }        // not a flick yet: it drops back
          clearTimeout(nudge);
          const hb = $('#rdHoopBox').getBoundingClientRect(), cb = card.getBoundingClientRect();
          card.style.transition = 'transform .55s cubic-bezier(.3,.7,.4,1), opacity .55s';
          card.style.transform = `translate(${hb.left + hb.width / 2 - (cb.left + cb.width / 2)}px, ${hb.top + hb.height * 0.55 - (cb.top + cb.height / 2)}px) scale(.28) rotate(-12deg)`;
          card.style.opacity = '.2';
          await sleep(560); score++; $('#rdScore').textContent = `🏀 ${AR(score)}`; $('#rdHoopBox').classList.add('swish');
          api.SFX.good(); await sayWord(w); await sleep(500); ok();
        };
        card.addEventListener('pointerup', up); card.addEventListener('pointercancel', () => { y0 = null; card.style.transform = ''; });
      });
    }
    if (!alive(s)) return;
    stage.innerHTML = `<div class="rd-game rd-ball"><p class="rd-sayit big" lang="ar" dir="rtl">🏀 ${AR(score)} في السلة! رائع!</p></div>`;
    api.SFX.unlock(); await sleep(1500);
  }

  /* ---------- Teach Mama (role reversal): Teddy is the pupil and reads; Maria, the teacher, says if Teddy is right ---------- */
  async function beatTeach(s, words) {
    const known = taught(D, s.n, true);
    const pool = Object.keys(D.words).filter(x => CLIPS['w-' + x] && !D.words[x].sight && !D.words[x].sound && D.words[x].says.every(y => known.includes(y)));
    const near = w => { const A = D.words[w].tiles; return pool.filter(x => { const B = D.words[x].tiles; return x !== w && B.length === A.length && B.filter((t, i) => t !== A[i]).length === 1; }); };
    stage.innerHTML = `<div class="rd-teach-intro enter"><span class="rd-teddy">🧸</span><p lang="ar" dir="rtl">اليوم أنتِ المعلّمة! دبدوب يقرأ: هل قرأ صحيحاً؟</p></div>`;
    await sleep(2400);
    for (const w of words) {
      if (!alive(s) || !D.words[w] || !CLIPS['w-' + w]) continue;
      const wrongs = near(w), wrong = Math.random() < 0.6 && wrongs.length ? wrongs[Math.floor(Math.random() * wrongs.length)] : null;
      const T = D.words[w].tiles;
      stage.innerHTML = `<div class="rd-game rd-teach"><span class="rd-teddy talk">🧸</span><div class="rd-word">${T.map((t, i) => `<button class="rd-tile" data-i="${i}">${esc(t)}</button>`).join('')}</div>
        <div class="rd-choices"><button class="rd-yes" data-a="1"><b>✓</b><span lang="en">Yes</span></button><button class="rd-no" data-a="0"><b>✗</b><span lang="en">No</span></button></div>
        <p class="rd-sayit" id="rdSay" lang="ar" dir="rtl"></p></div>`;
      await sleep(600); await sayWord(wrong || w);
      const ans = await choice('.rd-choices button'); if (!alive(s)) return;
      const right = (ans.dataset.a === '1') === !wrong;
      if (right) api.SFX.good(); else api.SFX.again();
      if (wrong) {
        const k = T.findIndex((t, i) => t !== D.words[wrong].tiles[i]);
        stage.querySelector('.rd-choices').remove();
        $('#rdSay').textContent = right ? 'أحسنتِ! أريه الحرف الذي أخطأ فيه 👆' : 'دبدوب أخطأ! أريه الحرف 👆';
        await new Promise(ok => stage.querySelectorAll('.rd-tile').forEach(b => b.addEventListener('click', async () => {
          api.SFX.init();
          if (Number(b.dataset.i) !== k) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
          b.classList.add('lit'); await sayLetter(D.words[w].says[k]); ok();
        })));
        await sleep(300); await sayWord(w); $('#rdSay').textContent = 'شكراً يا معلّمتي! 🧸💕';
      } else { stage.querySelectorAll('.rd-tile').forEach(t => t.classList.add('lit')); $('#rdSay').textContent = right ? 'نعم! دبدوب قرأ صحيحاً 🌟' : 'دبدوب قرأها صحيحاً هذه المرة 🙂'; }
      await sleep(1600);
    }
  }

  const BEAT = { flash: beatFlash, newsound: beatNewSound, hear: beatHear, where: beatWhere, read: beatRead, swap: beatSwap, me: beatMe,
                 sight: beatSight, diff: beatDiff, spell: beatSpell, sent: beatSent, story: beatStory, pair: beatPair,
                 stretch: beatStretch, action: beatAction, run: beatRun, shop: beatShop, hoops: beatHoops, teach: beatTeach, basket: beatBasket };

  /* =====================================================================================================
     The end of a session: Mama's tap, the stars, and on the first session of the day a puzzle piece
     ===================================================================================================== */
  function endSession() {
    const s = S; if (!s) return;
    clock.pause(); const secs = clock.secs();
    S = null; clearInterval(ticker); ticker = null; stopAudio(); stopRec(); clearTimeout(helpTimer);
    const t = today();
    addMinutes(secs);
    if (s.mode === 'lesson') { const done = s.base + s.bi >= s.lessonLen; rec(r, s.n).next = done ? 0 : Math.max(0, Math.min(s.lessonLen - 1, s.base + s.bi)); }
    const res = finish(r, { n: s.n, mode: s.mode, secs, tired: !!s.tired }, t); save();
    api.SFX.unlock();
    $('#rdDone').innerHTML = `<h1 class="rd-donet">أحسنتِ! 🎉</h1>
      <div class="rd-doneline">${flame('rdStreak3')}${starN('rdStars3')}</div>
      <div class="rd-mamatap" dir="ltr" lang="en"><p class="rd-hand" lang="ar" dir="rtl">ناولي الآيباد لماما 👩</p>${s.tired ? '<p class="rd-tirednote">She said she was tired and stopped early. Her lesson goes on from here next time.</p>' : ''}<p>Mama, how did Maria read?</p>
        <div><button data-tap="alone">Alone</button><button data-tap="help">With a little help</button><button data-tap="not">Not yet</button></div>
        <button class="rd-later" data-tap="">Mama later</button></div>`;
    $('#rdStreak3').textContent = AR(streakOf(r, t)); $('#rdStars3').textContent = AR(r.stars.total);
    api.show('rdone');
    $('#rdDone').querySelectorAll('[data-tap]').forEach(b => b.addEventListener('click', () => afterTap(s, res, b.dataset.tap), { once: true }));
  }
  async function afterTap(s, res, tap) {
    const t = today();
    if (tap) { applyTap(r, t, s.n, tap); save(); }
    const got = 1 + (tap === 'alone' ? 1 : 0);
    const box = $('#rdDone');
    box.innerHTML = `<h1 class="rd-donet">${tap === 'alone' ? 'قرأتِ وحدكِ! 🌟' : 'أحسنتِ! 🎉'}</h1>
      <div class="rd-gotstars">${Array.from({ length: got }, (_, i) => `<span style="animation-delay:${i * 0.25}s">${ic('i-star', 'star')}</span>`).join('')}</div>
      <div class="rd-doneline">${flame('rdStreak3')}${starN('rdStars3')}</div>
      <div class="rd-donego"></div>`;
    $('#rdStreak3').textContent = AR(streakOf(r, t)); $('#rdStars3').textContent = AR(r.stars.total);
    for (let i = 0; i < got; i++) setTimeout(() => api.SFX.star(), i * 250);
    await sleep(900);
    const go = box.querySelector('.rd-donego');
    if (res.first) {
      go.innerHTML = '<button class="rd-giftbtn" id="rdGift"><span>🎁</span>هديّة اليوم! افتحيها</button>';
      $('#rdGift').addEventListener('click', openGift, { once: true });
    } else {
      go.innerHTML = '<button class="rd-homebtn" id="rdHome">الرئيسية</button>';
      $('#rdHome').addEventListener('click', home, { once: true });
    }
  }

  /* ---------- the gift box: today's puzzle piece flies into the puzzle; day 7 finishes it ---------- */
  async function openGift() {
    const t = today(), P = D.puzzles.length, b = board(r, t, P);
    if (!b.pending) return home();
    busy = true;
    const cel = $('#rdCel'), boxEl = $('#rdCelBox');
    boxEl.innerHTML = `<div class="rd-bigboard" id="rdBig" dir="ltr">${pieceCells(b)}</div>
      <button class="rd-wrapped" id="rdWrap" aria-label="افتحي"><span class="lid">🎀</span><span class="body">🎁</span></button>
      <p class="rd-celcap" id="rdCelCap">المسي الهديّة!</p>`;
    cel.hidden = false;
    await new Promise(ok => $('#rdWrap').addEventListener('click', ok, { once: true }));
    api.SFX.init(); $('#rdWrap').classList.add('open'); api.SFX.unlock();
    r.opened.push(t); if (r.opened.length > 60) r.opened = r.opened.slice(-60); save();
    await sleep(550);
    const fresh = PIECE_ORDER.slice(b.have, b.get);
    $('#rdWrap').remove();
    $('#rdBig').innerHTML = pieceCells(b, fresh);
    $('#rdCelCap').textContent = fresh.length > 1 ? 'اسحبي القطعتين إلى مكانهما!' : 'اسحبي القطعة إلى مكانها!';
    await dragPieces(fresh);
    const sv = $('#rdBig svg'), tr = sv && sv.querySelector('.pc-tray');   // the empty tray folds away
    if (tr) { tr.style.transition = 'opacity .3s'; tr.style.opacity = '0'; await sleep(300); tr.remove(); sv.setAttribute('viewBox', '-14 -14 1228 828'); sv.classList.remove('with-tray'); }
    const complete = b.get === 8;
    $('#rdCelCap').textContent = complete ? 'أكملتِ اللغز كلّه! 🎉' : `رائع! ${AR(b.get)} من ٨`;
    if (complete) { await sleep(400); $('#rdBig').classList.add('complete'); api.confetti($('#rdConfetti')); api.SFX.unlock(); }
    const btn = document.createElement('button'); btn.className = 'rd-homebtn'; btn.textContent = complete ? 'ضعيه في كتابي 📖' : 'الرئيسية';
    btn.addEventListener('click', () => {
      busy = false; cel.hidden = true; api.stopConfetti($('#rdConfetti'));
      if (complete) openBook(finishedPuzzles().length - 1, true); else home();
    }, { once: true });
    boxEl.append(btn);
  }
  // drag each loose piece into its place; near its place it clicks in (a snap, sparkles, a chime); anywhere else it slides back
  function dragPieces(keys) {
    const svg = $('#rdBig svg'); let left = keys.length;
    const toSvg = e => { const m = svg.getScreenCTM().inverse(), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(m); };
    const tween = (g, k, from, to, ms, done) => {
      const t0 = performance.now();
      const step = now => {
        const f = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - f, 3);
        g.setAttribute('transform', placeT(k, from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e, from.s + (to.s - from.s) * e));
        if (f < 1) requestAnimationFrame(step); else done && done();
      };
      requestAnimationFrame(step);
    };
    return new Promise(finish => {
      svg.querySelectorAll('.pc.loose').forEach((g, j) => {
        const k = Number(g.dataset.k), home0 = trayAt(j, keys.length), home = { x: home0.x, y: home0.y, s: TRAY_S }, goal = { ...pieceBox(k) };
        let drag = null, at = { ...home }, hintT = null;
        const slot = svg.querySelector(`.pc:not(.loose)[data-k="${k}"]`);
        tween(g, k, { x: home.x, y: home.y + 60, s: 0.08 }, home, 520 + j * 160);   // it pops out of the gift box (an SVG transform, not CSS)
        setTimeout(() => api.SFX.star(), 200 + j * 160);
        const hint = () => { clearTimeout(hintT); hintT = setTimeout(() => { if (slot && !g.classList.contains('placed')) { slot.classList.remove('target'); void slot.getBBox(); slot.classList.add('target'); } }, 5000); };
        hint();
        g.addEventListener('pointerdown', e => {
          if (g.classList.contains('placed')) return;
          api.SFX.init(); e.preventDefault();
          const q = toSvg(e); drag = { dx: at.x - q.x, dy: at.y - q.y };
          try { g.setPointerCapture(e.pointerId); } catch (err) {}
          g.parentNode.appendChild(g); g.classList.add('lift'); slot && slot.classList.remove('target');
          at = { x: at.x, y: at.y, s: 1 }; g.setAttribute('transform', placeT(k, at.x, at.y, 1));
          api.SFX.flip && api.SFX.flip();
        });
        g.addEventListener('pointermove', e => {
          if (!drag) return;
          const q = toSvg(e); at = { x: q.x + drag.dx, y: q.y + drag.dy, s: 1 };
          g.setAttribute('transform', placeT(k, at.x, at.y, 1));
          if (slot) slot.classList.toggle('near', Math.hypot(at.x - goal.cx, at.y - goal.cy) < 120);
        });
        const drop = () => {
          if (!drag) return; drag = null; g.classList.remove('lift'); slot && slot.classList.remove('near');
          if (Math.hypot(at.x - goal.cx, at.y - goal.cy) < 120) {             // it fits: click into place
            g.classList.add('placed'); clearTimeout(hintT);
            tween(g, k, at, { x: goal.cx, y: goal.cy, s: 1 }, 160, () => {
              if (slot) slot.classList.add('on'); g.remove();
              snapSound(); burst(svg, goal.cx, goal.cy);
              const placedSlot = svg.querySelector(`.pc[data-k="${k}"]`); if (placedSlot) { placedSlot.classList.add('snap'); }
              if (--left === 0) setTimeout(finish, 650);
            });
          } else {                                                          // not there yet: back to the tray
            api.SFX.again(); tween(g, k, at, home, 280); at = { ...home }; hint();
          }
        };
        g.addEventListener('pointerup', drop); g.addEventListener('pointercancel', drop);
      });
    });
  }
  function snapSound() {
    const X = api.SFX; if (!X.ready || !X.ready()) return;
    X.tone(180, 0, 0.07, 0.4, 'triangle', 0.003); X.tone(1400, 0.01, 0.05, 0.18, 'square', 0.002);   // the click
    X.star(0.08); X.star(0.18); X.bell(1318.5, 0.12, 0.5, 0.3); X.bell(1760, 0.24, 0.8, 0.28); X.hold(1.1);
  }
  function burst(svg, x, y) {   // a ring of sparkles where the piece clicked in
    const NS = 'http://www.w3.org/2000/svg', g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'pc-burst');
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, c = document.createElementNS(NS, 'text');
      c.setAttribute('x', x); c.setAttribute('y', y); c.textContent = i % 3 ? '✦' : '★';
      c.style.setProperty('--dx', `${Math.cos(a) * 190}px`); c.style.setProperty('--dy', `${Math.sin(a) * 190}px`);
      c.setAttribute('class', i % 2 ? 'sp a' : 'sp b'); g.appendChild(c);
    }
    svg.appendChild(g); setTimeout(() => g.remove(), 900);
  }
  function viewPuzzle() {
    const t = today(), P = D.puzzles.length, b = board(r, t, P);
    if (b.pending) return openGift();
    const boxEl = $('#rdCelBox');
    boxEl.innerHTML = `<div class="rd-bigboard${b.complete ? ' complete' : ''}" dir="ltr">${pieceCells(b)}</div>
      <p class="rd-celcap">${b.complete ? 'أكملتِ اللغز! 🎉' : 'كل يوم تقرئين فيه = قطعة جديدة'}</p><button class="rd-homebtn" id="rdCelOk">رائع!</button>`;
    $('#rdCel').hidden = false;
    $('#rdCelOk').addEventListener('click', () => { $('#rdCel').hidden = true; }, { once: true });
  }

  /* =====================================================================================================
     كتاب ألغازي: her puzzle book (her choice, 20 Oct 2026: "a book instead", calmer than a gallery). One finished puzzle a
     page, opened and turned like the books in her library (right to left, the same hardcover page sound).
     ===================================================================================================== */
  function finishedPuzzles() {   // a puzzle is finished on every 7th day of use (once its last pieces are in)
    const P = D.puzzles.length, t = today(), pending = r.use.includes(t) && !r.opened.includes(t);
    const n = Math.floor((r.use.length - (pending ? 1 : 0)) / 7);
    return Array.from({ length: n }, (_, i) => ({ i, puzzle: i % P, day: r.use[i * 7 + 6] }));
  }
  const BOOK_SND = {};
  async function bookSound(name, vol = 0.85) {
    const X = api.SFX; X.init(); const c = X.ctx; if (!c) return;
    try {
      if (!BOOK_SND[name]) BOOK_SND[name] = fetch(`assets/audio/${name}.m4a`).then(x => x.arrayBuffer()).then(ab => new Promise((ok, no) => { const p = c.decodeAudioData(ab, ok, no); if (p && p.catch) p.catch(no); }));
      const b = await BOOK_SND[name], src = c.createBufferSource(), g = c.createGain();
      src.buffer = b; src.playbackRate.value = 0.94 + Math.random() * 0.12; g.gain.value = vol; src.connect(g); g.connect(c.destination); src.start();
    } catch (e) {}
  }
  let BK = null;
  const fmtAr = ds => { try { const [y, m, d] = ds.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('ar-u-ca-gregory-nu-arab', { day: 'numeric', month: 'long' }); } catch (e) { return ''; } };
  function bookPage(n) {     // page n (0-based): a finished puzzle, the next one to win, or a page still to come
    const fin = finishedPuzzles(), total = D.bookPages || 12, num = `<span class="rb-num">${AR(n + 1)}</span>`;
    if (n >= total) return `<div class="rb-pg end"><span class="rb-endmark">🌸</span>${num}</div>`;
    const f = fin[n];
    if (f) {
      const pz = D.puzzles[f.puzzle];
      return `<div class="rb-pg"><div class="rb-pic complete" dir="ltr">${pieceCells({ puzzle: f.puzzle, have: 8 })}</div>
        <p class="rb-title">${esc(pz.title || '')}</p><p class="rb-date">${f.day ? 'أكملتِه في ' + fmtAr(f.day) : ''}</p>${num}</div>`;
    }
    const next = n === fin.length;
    return `<div class="rb-pg empty"><div class="rb-ghost"><span>${next ? '🧩' : '؟'}</span></div><p class="rb-title soft">${next ? 'لغزكِ القادم: قطعة كل يوم' : 'صفحة تنتظر'}</p>${num}</div>`;
  }
  // one puzzle a page, the page wide; the book is bound at the top (rings), so a page lifts up to turn (her choice, 20 Oct 2026)
  const RINGS = '<span class="rb-rings" aria-hidden="true">' + '<i></i>'.repeat(9) + '</span>';
  function renderPage() {
    const st = $('#rbStage'), pg = BK.page, last = (D.bookPages || 12) - 1;
    st.innerHTML = `<div class="rb-book" id="rbBook"><div class="rb-sheet" id="rbSheet">${bookPage(pg)}</div>${RINGS}</div>
      <div class="rb-arrows"><button class="rb-arrow" id="rbNext" aria-label="الصفحة التالية"${pg >= last ? ' disabled' : ''}>▲</button>
        <button class="rb-arrow" id="rbPrev" aria-label="الصفحة السابقة"${pg <= 0 ? ' disabled' : ''}>▼</button></div>`;
    $('#rbNext').addEventListener('click', () => turn(1));
    $('#rbPrev').addEventListener('click', () => turn(-1));
    const book = $('#rbBook'); let y0 = null;
    book.addEventListener('pointerdown', e => { y0 = e.clientY; });
    book.addEventListener('pointerup', e => { if (y0 == null) return; const dy = e.clientY - y0; y0 = null; if (Math.abs(dy) > 50) turn(dy < 0 ? 1 : -1); });   // swipe up: the next page; down: back
  }
  async function turn(dir) {
    const last = (D.bookPages || 12) - 1, to = BK.page + dir;
    if (BK.busy || to < 0 || to > last) return;
    BK.busy = true; bookSound('lib-flip1');
    const book = $('#rbBook'), sheet = $('#rbSheet'), leaf = document.createElement('div');
    leaf.className = 'rb-leaf ' + (dir > 0 ? 'up' : 'down');
    if (dir > 0) {   // this page lifts up over the rings, and the next one is underneath
      leaf.innerHTML = `<div class="rb-face front">${sheet.innerHTML}</div><div class="rb-face backface"></div>`;
      sheet.innerHTML = bookPage(to);
    } else {         // the page before comes back down over the rings
      leaf.innerHTML = `<div class="rb-face front">${bookPage(to)}</div><div class="rb-face backface"></div>`;
    }
    book.appendChild(leaf);
    await sleep(40); leaf.classList.add('go');
    await sleep(reducedMotion() ? 20 : 860);
    BK.page = to; renderPage(); BK.busy = false;
  }
  const reducedMotion = () => (api.reduced ? api.reduced() : false);
  function openBook(page = 0, fresh = false) {
    stopAll(); api.SFX.init();
    BK = { page: Math.max(0, Math.min((D.bookPages || 12) - 1, page)), busy: false };
    const fin = finishedPuzzles(), total = D.bookPages || 12, latest = fin[fin.length - 1];
    $('#rbStage').innerHTML = `<button class="rb-cover" id="rbCover">${RINGS}
        <span class="rb-cwin" dir="ltr">${latest ? pieceCells({ puzzle: latest.puzzle, have: 8 }) : '<span class="rb-cq">🧩</span>'}</span>
        <span class="rb-ctitle">كتاب ألغازي</span><span class="rb-cname" lang="en" dir="ltr">Maria's Puzzle Book</span>
        <span class="rb-ccount">${AR(fin.length)} من ${AR(total)}</span></button>`;
    api.show('rbook');
    const open = async () => {
      const cv = $('#rbCover'); if (!cv || cv.classList.contains('opening')) return;
      cv.classList.add('opening'); bookSound('lib-open', 0.9);
      await sleep(reducedMotion() ? 20 : 650);
      renderPage();
      if (fresh) { const pg = $('#rbSheet'); if (pg) { pg.classList.add('newpage'); api.SFX.unlock(); api.confetti($('#rdConfetti')); setTimeout(() => api.stopConfetti($('#rdConfetti')), 2500); } }
    };
    $('#rbCover').addEventListener('click', open);
    if (fresh) setTimeout(open, 700);
  }

  const STICK = ['⭐', '🌟', '🌸', '🦄', '🌈', '🍓', '🧁', '🎀', '💜', '🦋', '🍭', '🐱'];
  function openStars() {
    const days = Object.entries(r.stars.days).filter(([, n]) => n > 0).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    let k = 0;
    const rows = days.slice(-40).map(([d, n]) => `<div class="rd-wallday"><span class="rd-walldate">${fmtAr(d)}</span><span class="rd-wallstk">${Array.from({ length: n }, () => `<i>${STICK[k++ % STICK.length]}</i>`).join('')}</span></div>`).join('');
    $('#rdCelBox').innerHTML = `<div class="rd-wall"><h2 class="rd-celt">حائط نجومي ⭐</h2><p class="rd-celcap">${AR(r.stars.total)} نجمة حتى الآن</p>
      <div class="rd-walllist">${rows || '<p class="rd-celcap">أول نجمة تصل بعد أول درس!</p>'}</div><button class="rd-homebtn" id="rdCelOk">رائع!</button></div>`;
    $('#rdCel').hidden = false; api.SFX.star();
    const wl = $('#rdCelBox .rd-walllist'); if (wl) wl.scrollTop = wl.scrollHeight;
    $('#rdCelOk').addEventListener('click', () => { $('#rdCel').hidden = true; }, { once: true });
  }
  function celebrate(kind) {
    if (kind !== 'lesson') return;
    const L = D.lessons[r.current - 1];
    $('#rdCelBox').innerHTML = `<div class="rd-newstone">${esc(L.label)}</div><h2 class="rd-celt">درس جديد!</h2><button class="rd-homebtn" id="rdCelOk">هيا!</button>`;
    $('#rdCel').hidden = false; api.SFX.unlock(); api.confetti($('#rdConfetti'));
    $('#rdCelOk').addEventListener('click', () => { $('#rdCel').hidden = true; api.stopConfetti($('#rdConfetti')); }, { once: true });
  }


  /* =====================================================================================================
     Speed Round: two minutes, the words she knows (Done lessons and the Current one); she reads each aloud and taps ✓.
     A new personal best is +1 star.
     ===================================================================================================== */
  function speedPool() {
    const ws = new Set();
    D.lessons.slice(0, r.current).forEach(L => { if (L.ready) (L.words || []).concat(L.sight || []).forEach(w => { if (D.words[w] && !D.words[w].sound) ws.add(w); }); });
    return [...ws];
  }
  let SP = null;
  function startSpeed() {
    const pool = speedPool(); if (pool.length < 8) return;
    stopAll(); api.SFX.init();
    SP = { n: 0, t0: performance.now(), acc: 0, hid: null, deck: shuffle(pool), i: 0, secs: 120 };
    $('#rdSpCount').textContent = AR(0);
    api.show('rspeed');
    nextSpeed();
    SP.tick = setInterval(speedTick, 250); speedTick();
  }
  function speedLeft() { if (!SP) return 0; const used = SP.acc + (SP.hid == null ? performance.now() - SP.t0 : 0); return Math.max(0, SP.secs - used / 1000); }
  function speedTick() {
    if (!SP) return;
    const left = speedLeft(), C = 2 * Math.PI * 26, ring = $('#rdSpRing');
    ring.style.strokeDasharray = `${C}`; ring.style.strokeDashoffset = `${C * (1 - left / SP.secs)}`;
    $('#rdSpTimer').classList.toggle('low', left < 20);
    if (left <= 0) endSpeed();
  }
  function nextSpeed() {
    if (!SP) return;
    if (SP.i >= SP.deck.length) { SP.deck = shuffle(SP.deck); SP.i = 0; }
    const w = SP.deck[SP.i++], W = D.words[w];
    $('#rdSpStage').innerHTML = `<div class="rd-spd enter"><button class="rd-spword" id="rdSpWord">${esc(W.tiles.join(''))}</button>
      <div class="rd-spbtns"><button class="rd-replay" id="rdSpHear" aria-label="اسمعي">${ic('i-speaker')}</button><button class="rd-spok" id="rdSpOk">✓</button></div></div>`;
    $('#rdSpHear').addEventListener('click', () => sayWord(w));
    $('#rdSpWord').addEventListener('click', () => sayWord(w));
    $('#rdSpOk').addEventListener('click', () => { if (!SP) return; SP.n++; $('#rdSpCount').textContent = AR(SP.n); api.SFX.star(); stopAudio(); nextSpeed(); }, { once: true });
  }
  function endSpeed() {
    const sp = SP; if (!sp) return;
    clearInterval(sp.tick); SP = null; stopAudio();
    const t = today(), best = sp.n > r.speed.best && sp.n > 0;
    r.speed.runs.push({ day: t, n: sp.n }); if (r.speed.runs.length > 200) r.speed.runs = r.speed.runs.slice(-200);
    if (best) { r.speed.best = sp.n; r.stars.total += 1; r.stars.days[t] = (r.stars.days[t] || 0) + 1; }
    save();
    $('#rdCelBox').innerHTML = `<div class="rd-spres">${AR(sp.n)}</div><h2 class="rd-celt">${sp.n === 1 ? 'كلمة واحدة!' : 'كلمة في دقيقتين!'}</h2>
      <p class="rd-celcap">${best ? 'أفضل نتيجة جديدة! ⭐ +١' : `أفضل نتيجة: ${AR(r.speed.best)}`}</p>
      <div class="rd-spbtns"><button class="rd-homebtn" id="rdSpAgain">مرة أخرى ⚡</button><button class="rd-homebtn soft" id="rdSpHome">الرئيسية</button></div>`;
    $('#rdCel').hidden = false;
    if (best) { api.SFX.unlock(); api.confetti($('#rdConfetti')); } else api.SFX.good();
    $('#rdSpAgain').addEventListener('click', () => { $('#rdCel').hidden = true; api.stopConfetti($('#rdConfetti')); startSpeed(); }, { once: true });
    $('#rdSpHome').addEventListener('click', () => { $('#rdCel').hidden = true; api.stopConfetti($('#rdConfetti')); home(); }, { once: true });
  }

  /* =====================================================================================================
     Mama's view (press and hold the gear): today, mastery check, sounds, progress, her recordings, settings, backup
     ===================================================================================================== */
  const fmtDay = ds => { const [y, m, d] = ds.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); };
  async function openParent() {
    await ready; stopAll();
    const t = today(), n = r.current, L = D.lessons[n - 1], R = rec(r, n), min = minDays(r, D, n);
    const miss = D.sounds.filter(x => !hasSound(x.id) && x.lesson <= Math.min(65, n + 1));
    const days7 = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6)), mx = Math.max(60, ...days7.map(d => r.minutes[d] || 0));
    const month = t.slice(0, 7), mLog = r.log.filter(x => x.day.startsWith(month));
    const taps = k => Object.values(r.lessons).reduce((a, l) => a + l.taps.filter(x => x.day.startsWith(month) && x.tap === k).length, 0);
    const masteredM = Object.entries(r.lessons).filter(([, l]) => l.mastered && l.mastered.startsWith(month)).map(([k]) => k);
    const b = board(r, t, D.puzzles.length);
    const stuck = Object.entries(r.stuck).sort((a, c) => c[1].n - a[1].n);
    const opts = D.lessons.map(x => `<option value="${x.n}"${x.n === n ? ' selected' : ''}>${x.n}. ${esc(x.title)}${x.ready ? '' : ' (not built yet)'}</option>`).join('');
    $('#rparent').innerHTML = `<div class="rp">
      <header class="rp-head"><h1>Maria Reads · Mama</h1><button class="rp-x" data-act="close">${ic('i-close')}</button></header>
      <section class="rp-card rp-today"><h2>Today</h2>
        <p class="rp-big">Lesson ${n}: ${esc(L.title)}${L.ready ? '' : ' <em>(coming in a later phase)</em>'}</p>
        <p>Day ${R.days.length} on this lesson (at least ${min} ${min === 1 ? 'day, fast lane' : 'days'}) · ${sessionsToday(t)} session${sessionsToday(t) === 1 ? '' : 's'} today${reviewToday(r, n, t) ? ' · <b>review day</b>' : ''}</p>
        <p>${R.mastered ? `Mastered on ${fmtDay(R.mastered)}.${canAdvance(r, D, n) ? '' : ` Lesson ${n + 1} opens after ${min - R.days.length} more day${min - R.days.length === 1 ? '' : 's'} of practice.`}` : 'Mastery not checked yet.'}</p>
        <div class="rp-row"><button class="rp-btn main" data-act="check">Mastery check</button>
        <button class="rp-btn${miss.length ? ' warn' : ''}" data-act="rec">Record sounds${miss.length ? ` (${miss.length} needed)` : ''}</button>
        <button class="rp-btn" data-act="ref">Parent reference</button></div>
        ${miss.length ? `<p class="rp-warn">Needs recording: ${miss.map(x => `${esc(x.say)} (lesson ${x.lesson})`).join(', ')}</p>` : ''}
        <p class="rp-teach">${teachDay(r, t, n) ? '🧸 Today is a <b>Teach Mama</b> day: Teddy reads first and Maria is the teacher.' : n >= 3 ? '🧸 Teach Mama days come every 4th day of use. <button class="rp-link" data-act="teach">Make today one</button>' : ''}</p>
        ${tipHTML(t)}</section>
      ${noteHTML(L)}
      <section class="rp-card"><h2>Content</h2>
        <p>${PACK ? `<b>Book Edition</b> is loaded on this iPad${PACK.made ? ` (made ${esc(PACK.made)})` : ''}: the book's words, sentences, stories and tutor notes. It stays on this iPad only and is not in the backup file.` : '<b>Original Edition</b>: our own words, in the book\'s lesson order. To use the book\'s own content, load your private Book Edition file (it stays on this iPad only).'}</p>
        <div class="rp-row"><label class="rp-btn">${PACK ? 'Load a newer content pack' : 'Load content pack'}<input type="file" id="rpPack" accept="application/json,.json" hidden></label>${PACK ? '<button class="rp-btn" data-act="unpack">Back to the Original Edition</button>' : ''}</div></section>
      <section class="rp-card"><h2>Progress</h2>
        <div class="rp-stats"><span><b>${streakOf(r, t)}</b> ${streakOf(r, t) === 1 ? 'day' : 'days'} in a row</span><span><b>${r.stars.total}</b> ${r.stars.total === 1 ? 'star' : 'stars'}</span><span><b>${r.use.length}</b> ${r.use.length === 1 ? 'day' : 'days'} of use</span><span><b>${b.have}</b> of 8 puzzle pieces this week</span><span>Speed Round best: <b>${r.speed.best}</b></span></div>
        <div class="rp-bars">${days7.map(d => `<div class="rp-bar${d === t ? ' today' : ''}"><i style="height:${Math.round((r.minutes[d] || 0) / mx * 60)}px"></i><b>${Math.round((r.minutes[d] || 0) / 60)}m</b><span>${fmtDay(d).split(' ')[0]}</span></div>`).join('')}</div></section>
      <section class="rp-card"><h2>Stuck words</h2>${stuck.length ? `<div class="rp-chips">${stuck.map(([w, x]) => `<button class="rp-chip" data-say="${esc(w)}">${esc(w.toUpperCase())} <i>×${x.n}</i></button>`).join('')}</div>` : '<p>None yet. A word goes here when she needs the help ladder.</p>'}</section>
      <section class="rp-card"><h2>Her recordings</h2><div id="rpMine"><p>Loading…</p></div></section>
      <section class="rp-card"><h2>This month</h2>
        <p>${new Set(mLog.map(x => x.day)).size} days of use · ${mLog.length} sessions · ${Math.round(Object.entries(r.minutes).filter(([d]) => d.startsWith(month)).reduce((a, [, v]) => a + v, 0) / 60)} minutes · lessons mastered: ${masteredM.length ? masteredM.join(', ') : 'none yet'}</p>
        <p>Your taps: Alone ${taps('alone')} · With a little help ${taps('help')} · Not yet ${taps('not')}</p></section>
      <section class="rp-card"><h2>Settings</h2>
        <label class="rp-set">Sessions a day <select id="rpSess">${[1, 2, 3].map(k => `<option value="${k}"${k === r.settings.sessions ? ' selected' : ''}>${k}</option>`).join('')}</select></label>
        <label class="rp-set">Arabic cue lines at the start <input type="checkbox" id="rpCues"${r.settings.cues ? ' checked' : ''}></label>
        <div class="rp-set">Current lesson <select id="rpLesson">${opts}</select><button class="rp-btn" data-act="setlesson">Set</button></div></section>
      <section class="rp-card"><h2>Placement check</h2><p>${r.placement && r.placement.day ? `Done on ${fmtDay(r.placement.day)}${r.placement.skipped ? ' (skipped)' : ''}. Sounds she knew: ${(r.placement.known || []).length ? r.placement.known.map(id => SOUND[id] ? SOUND[id].say : id).join(' ') : 'none'}.` : 'Not done yet.'}</p>
        <button class="rp-btn" data-act="place">Run the placement check again</button></section>
      <section class="rp-card"><h2>Backup</h2><p>One file holds all her progress in every app, and your recorded sounds.</p>
        <div class="rp-row"><button class="rp-btn" data-act="backup">Back up progress</button><label class="rp-btn">Restore from a file<input type="file" id="rpFile" accept="application/json,.json" hidden></label></div></section>
    </div>`;
    api.show('rparent');
    fillMine();
  }
  function noteHTML(L) {
    const notes = (L && L.notes) || [];
    if (!notes.length) return '';
    return `<section class="rp-card rp-notes"><h2>Today's tutor note <small>${D.edition === 'book' ? 'from the book' : 'Original Edition'}</small></h2>
      ${notes.map((x, i) => `<details class="rp-note"${i === 0 ? ' open' : ''}><summary>${esc(x.title || 'Note')}</summary>${(x.text || []).map(q => `<p>${esc(q)}</p>`).join('')}</details>`).join('')}</section>`;
  }
  function tipHTML(t) {
    const tips = (D.guide && D.guide.tips) || []; if (!tips.length) return '';
    const k = Math.abs([...t].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % tips.length;
    return `<p class="rp-tip">💡 ${esc(tips[k])}</p>`;
  }
  async function loadPack(file) {
    let p = null;
    try { p = JSON.parse(await file.text()); } catch (e) {}
    if (!validPack(p)) { api.toast('That file is not a Maria Reads content pack.'); return; }
    try { await packPut(p); } catch (e) { api.toast('The pack could not be saved on this iPad.'); return; }
    api.toast('Book Edition loaded.'); setTimeout(() => location.reload(), 700);
  }
  function referenceScreen() {
    const G = D.guide || {};
    const sec = (title, body) => `<section class="rp-card"><h2>${esc(title)}</h2>${body}</section>`;
    const sounds = D.sounds.map(x => `<tr><td><b>${esc(x.say)}</b></td><td>${esc(x.g)}</td><td lang="en">${esc(x.ex)}</td><td>${esc(x.tip)}</td></tr>`).join('');
    $('#rref').innerHTML = `<div class="rp"><header class="rp-head"><h1>Parent reference</h1><button class="rp-x" data-act="back">${ic('i-close')}</button></header>
      ${sec('How to say each sound', `<p>${esc(G.soundsIntro || '')}</p><table class="rp-table"><tr><th>Sound</th><th>Letters</th><th>As in</th><th>How</th></tr>${sounds}</table>`)}
      ${sec('Voiced and unvoiced pairs', `<p>${esc(G.pairsIntro || '')}</p><table class="rp-table"><tr><th>Voiced (a buzz)</th><th>Unvoiced (only air)</th></tr>${(G.pairs || []).map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table>`)}
      ${sec('Stretchy talk in everyday speech', `<ul>${(G.stretchTalk || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`)}
      ${sec('Bedtime books', `<ul>${(G.bedtime || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`)}
      ${(D.reference || []).length ? `<h2 class="rp-from">From the book</h2>${D.reference.map(x => `<details class="rp-card rp-note"><summary>${esc(x.heading)}</summary>${(x.text || []).map(q => `<p>${esc(q)}</p>`).join('')}</details>`).join('')}` : ''}
    </div>`;
    api.show('rref');
  }
  $('#rref') || document.body.insertAdjacentHTML('beforeend', '<section id="rref" class="screen rd rd-parent" dir="ltr" lang="en" hidden></section>');
  $('#rref').addEventListener('click', e => { if (e.target.closest('[data-act="back"]')) openParent(); });
  async function fillMine() {
    let all = [];
    try { all = (await idb('mine', 'readonly', st => st.getAll())) || []; } catch (e) {}
    const box = $('#rpMine'); if (!box) return;
    if (!all.length) { box.innerHTML = '<p>None yet. She records herself at the end of some lessons.</p>'; return; }
    all.sort((a, b) => b.at - a.at);
    const byDay = {}; all.slice(0, 80).forEach(x => { (byDay[x.day] = byDay[x.day] || []).push(x); });
    box.innerHTML = Object.entries(byDay).map(([d, xs]) => `<div class="rp-day"><b>${fmtDay(d)}</b>${xs.map(x => `<button class="rp-chip" data-mine="${esc(x.id)}">▶ ${esc(x.item.split(':')[1].toUpperCase())}</button>`).join('')}</div>`).join('');
    box.querySelectorAll('[data-mine]').forEach(b => b.addEventListener('click', () => {
      const x = all.find(y => y.id === b.dataset.mine); if (!x) return;
      const u = URL.createObjectURL(x.blob); play(u).then(() => URL.revokeObjectURL(u));
    }));
  }
  $('#rparent').addEventListener('click', e => {
    const b = e.target.closest('[data-act],[data-say]'); if (!b) return;
    if (b.dataset.say) return sayWord(b.dataset.say);
    switch (b.dataset.act) {
      case 'close': home(); break;
      case 'check': masteryCheck(); break;
      case 'rec': recordScreen(); break;
      case 'ref': referenceScreen(); break;
      case 'teach': r.settings.teachDay = today(); save(); openParent(); break;
      case 'unpack': if (confirm('Go back to the Original Edition? The Book Edition is removed from this iPad (your file stays where you keep it). Her progress does not change.')) packPut(null).then(() => location.reload()); break;
      case 'backup': api.backup(); break;
      case 'place': if (confirm('Run the placement check again? Her lessons stay as they are.')) placement(true); break;
      case 'setlesson': {
        const to = Number($('#rpLesson').value), from = r.current;
        if (to === from) break;
        if (to > from + 1 && !confirm(`Move Maria forward from lesson ${from} to lesson ${to}? She would skip ${to - from - 1} lesson${to - from - 1 === 1 ? '' : 's'}.`)) break;
        r.current = to; lastLesson = to; save(); api.toast(`Current lesson: ${to}.`); openParent();
      }
    }
  });
  $('#rparent').addEventListener('change', e => {
    const el = e.target;
    if (el.id === 'rpFile' && el.files[0]) { api.restore(el.files[0], openParent); el.value = ''; return; }
    if (el.id === 'rpSess') { r.settings.sessions = Math.max(1, Math.min(3, Number(el.value) || 2)); save(); }
    if (el.id === 'rpPack' && el.files[0]) { loadPack(el.files[0]); el.value = ''; return; }
    if (el.id === 'rpCues') { r.settings.cues = el.checked; save(); }
  });

  /* ---------- the mastery check: 5 flashes of the new sound (with sounds she knows mixed in), 5 correct ---------- */
  function masteryCheck() {
    const n = r.current, L = D.lessons[n - 1], known = taught(D, n);
    let cards;
    if ((L.new || []).length) { cards = [...L.new, ...L.new, ...L.new]; cards = cards.concat(known.length ? pick(known, 2) : L.new.slice(0, 2)); }
    else { const all = taught(D, n, true); cards = []; while (cards.length < 5 && all.length) cards = cards.concat(shuffle(all)); }
    cards = shuffle(cards.slice(0, 5));
    let i = 0, right = 0;
    const step = () => {
      if (i >= cards.length) return result();
      $('#rcheck').innerHTML = `<div class="rc"><header class="rp-head"><h1>Mastery check · lesson ${n}</h1><button class="rp-x" data-act="back">${ic('i-close')}</button></header>
        <p class="rc-help">Maria says the sound. ${i + 1} of 5.</p><div class="rc-letter">${esc(grapheme(cards[i]))}</div>
        <div class="rc-btns"><button class="rp-btn main" data-ok="1">Correct</button><button class="rp-btn" data-ok="0">Not yet</button></div></div>`;
    };
    const result = () => {
      const pass = right === 5, R = rec(r, n);
      if (pass) { R.mastered = R.mastered || today(); save(); }
      const now = pass && canAdvance(r, D, n);
      $('#rcheck').innerHTML = `<div class="rc"><header class="rp-head"><h1>Mastery check · lesson ${n}</h1></header>
        <p class="rc-res">${right} of 5 correct.</p>
        <p>${pass ? (now ? `Mastered. Lesson ${n + 1} opens now.` : `Mastered. Lesson ${n + 1} opens on its own after ${minDays(r, D, n) - R.days.length} more day${minDays(r, D, n) - R.days.length === 1 ? '' : 's'} of lesson ${n}.`) : 'Not yet. She keeps practising this lesson; after 5 days a 2-day review comes on its own.'}</p>
        <div class="rc-btns"><button class="rp-btn main" data-act="${now ? 'home' : 'back'}">${now ? 'Show Maria' : 'Back'}</button></div></div>`;
    };
    $('#rcheck').onclick = e => {
      const b = e.target.closest('[data-ok],[data-act]'); if (!b) return;
      if (b.dataset.act === 'back') return openParent();
      if (b.dataset.act === 'home') return home();
      if (b.dataset.ok === '1') right++;
      i++; step();
    };
    step(); api.show('rcheck');
  }

  /* ---------- the placement check (day 1): all 26 letter sounds, then 5 short words; Mama taps ---------- */
  function placement(again) {
    const P = D.placement, known = new Set(), words = {};
    let i = -1;
    const draw = () => {
      let body;
      if (i < 0) body = `<p class="rc-help">A quick check before the first lesson (about 2 minutes). Maria says the <b>sound</b> of each letter (not its name), then reads 5 short words. Nothing is skipped: sounds she already knows only make lessons 1 to 12 quicker (1 day instead of 3).</p>
        <div class="rc-btns"><button class="rp-btn main" data-p="start">Start the check</button><button class="rp-btn" data-p="skip">Skip, start at lesson 1</button></div>`;
      else if (i < P.letters.length) body = `<p class="rc-help">Letter ${i + 1} of ${P.letters.length}: does Maria say its sound?</p><div class="rc-letter">${P.letters[i]}</div>
        <div class="rc-btns"><button class="rp-btn main" data-p="yes">Knows the sound</button><button class="rp-btn" data-p="no">Not yet</button></div>`;
      else if (i < P.letters.length + P.words.length) body = `<p class="rc-help">Word ${i - P.letters.length + 1} of ${P.words.length}: can she blend it?</p><div class="rc-letter word">${P.words[i - P.letters.length]}</div>
        <div class="rc-btns"><button class="rp-btn main" data-p="yes">Blended it</button><button class="rp-btn" data-p="no">Not yet</button></div>`;
      else {
        const ks = [...known], fast = D.lessons.slice(0, 12).filter(L => { const need = lessonSounds(D, L.n); return need.length && need.every(s => ks.includes(s)); }).map(L => L.n);
        body = `<p class="rc-res">${ks.length} of 26 sounds known · blended ${Object.values(words).filter(Boolean).length} of 5 words.</p>
          <p>${fast.length ? `Fast lane (1 day minimum): lessons ${fast.join(', ')}.` : 'No fast lane: every lesson has at least 3 days.'} Maria starts at lesson 1.</p>
          <div class="rc-btns"><button class="rp-btn main" data-p="save">Save and start</button></div>`;
      }
      $('#rplace').innerHTML = `<div class="rc"><header class="rp-head"><h1>Placement check</h1>${again ? `<button class="rp-x" data-p="cancel">${ic('i-close')}</button>` : ''}</header>${body}</div>`;
    };
    $('#rplace').onclick = e => {
      const b = e.target.closest('[data-p]'); if (!b) return;
      const p = b.dataset.p;
      if (p === 'cancel') return openParent();
      if (p === 'skip') { r.placement = { day: today(), skipped: true, known: [] }; save(); return home(); }
      if (p === 'save') { r.placement = { day: today(), known: [...known], words }; save(); return again ? openParent() : home(); }
      if (p === 'yes' || p === 'no') {
        if (i < P.letters.length) { if (p === 'yes') known.add(P.letterSound[P.letters[i]]); }
        else words[P.words[i - P.letters.length]] = p === 'yes';
      }
      i++; draw();
    };
    draw(); api.show('rplace');
  }

  /* ---------- Record sounds: Mama's own voice for every single sound, in lesson order ---------- */
  function recordScreen() {
    const n = r.current;
    const row = x => {
      const mine = !!SND[x.id], built = !mine && !!CLIPS['p-' + x.id], has = mine || built, need = x.lesson <= n + 1;
      return `<div class="rr-row${has ? ' has' : need ? ' need' : ''}" data-id="${x.id}">
        <div class="rr-say"><b>${esc(x.say)}</b><span>${esc(x.g)}</span></div>
        <div class="rr-info"><p><b lang="en">${esc(x.ex)}</b> · lesson ${x.lesson} · ${x.kind === 'hold' ? 'hold about 2 seconds' : 'short'}</p><p class="rr-tip">${esc(x.tip)}</p></div>
        <span class="rr-state">${mine ? 'Your voice ✓' : built ? 'Built in ✓' : need ? 'Needs recording' : 'Later'}</span>
        <div class="rr-btns"><button class="rp-btn rr-rec" data-rec="${x.id}">● ${mine ? 'Again' : built ? 'Record my own' : 'Record'}</button>
          ${has ? `<button class="rp-btn" data-play="${x.id}">▶ Short</button>${x.kind === 'hold' ? `<button class="rp-btn" data-play="${x.id}" data-held="1">▶ Held</button>` : ''}` : ''}</div></div>`;
    };
    $('#rrec').innerHTML = `<div class="rp"><header class="rp-head"><h1>Record sounds</h1><button class="rp-x" data-act="back">${ic('i-close')}</button></header>
      <p class="rr-intro">Nothing to record: lessons 1 to 8 use built-in sounds (/a/, /b/, /k/ and /t/), cut from the approved voice so no "uh" follows a sound. Tap ▶ to listen. If you ever prefer your own voice for a sound, tap ● Record my own: held sounds are one steady sound of about 2 seconds, short sounds are said once, crisp, with no vowel after it.</p>
      <div class="rr-list">${D.sounds.map(row).join('')}</div></div>`;
    api.show('rrec');
  }
  $('#rrec').addEventListener('click', async e => {
    const b = e.target.closest('[data-act],[data-rec],[data-play]'); if (!b) return;
    if (b.dataset.act === 'back') return openParent();
    if (b.dataset.play) return sayLetter(b.dataset.play, !!b.dataset.held);
    if (b.dataset.rec) {
      const x = SOUND[b.dataset.rec];
      if (REC) { stopRec(); return; }
      if (!canRecord()) { api.toast('This browser cannot record sounds.'); return; }
      b.classList.add('on'); b.textContent = '■ Stop';
      let blob = null;
      try { blob = await record(x.kind === 'hold' ? 3000 : 1600); } catch (err) { api.toast('The microphone did not open. Allow it in Settings, then try again.'); }
      b.classList.remove('on');
      if (!blob) { recordScreen(); return; }
      try {
        const item = { id: x.id, blob, type: blob.type, kind: x.kind, at: Date.now() };
        await useSound(item);
        await idb('sounds', 'readwrite', st => st.put(item));
        markReady(); recordScreen();
        await sayLetter(x.id, x.kind === 'hold');
      } catch (err) { console.warn(err); api.toast('That recording could not be used. Please try again.'); recordScreen(); }
    }
  });

  /* ---------- wiring ---------- */
  api.holdToOpen($('#rdGear'), 2000, openParent);
  $('#rdGo').addEventListener('click', () => { const m = $('#rdGo').dataset.mode; if (m) startSession(r.current, m); });
  $('#rdPath').addEventListener('click', e => {
    const b = e.target.closest('.rd-stone'); if (!b) return;
    const n = Number(b.dataset.n), st = stateOf(r, n);
    api.SFX.init();
    if (st === 'locked' || (st === 'current' && !D.lessons[n - 1].ready)) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); api.SFX.again(); return; }
    if (st === 'current') { const m = $('#rdGo').dataset.mode; if (m) startSession(n, m); else { $('#rdGo').classList.remove('shake'); void $('#rdGo').offsetWidth; $('#rdGo').classList.add('shake'); } return; }
    if (missingFor(n).length) { b.classList.add('shake'); return; }
    startSession(n, 'replay');
  });
  $('#rdBoardBtn').addEventListener('click', () => { api.SFX.init(); viewPuzzle(); });
  $('#rhome .rd-stats').addEventListener('click', e => { if (e.target.closest('.rd-starn')) { api.SFX.init(); openStars(); } });
  $('#rdSpeedBtn').addEventListener('click', startSpeed);
  $('#rdBookBtn').addEventListener('click', () => openBook(Math.max(0, finishedPuzzles().length - 1)));
  $('#rbClose').addEventListener('click', () => { bookSound('lib-close', 0.8); BK = null; home(); });
  $('#rdSpQuit').addEventListener('click', () => { if (SP) { clearInterval(SP.tick); SP = null; } stopAudio(); home(); });
  $('#rdQuit').addEventListener('click', () => { stopAll(); home(); });
  $('#rdTired').addEventListener('click', () => {
    if (!S) return; api.SFX.init();
    $('#rdCelBox').innerHTML = `<div class="rd-tiredbox"><span class="rd-tiredic">😴</span><h2 class="rd-celt">تعبتِ؟ لا بأس أبداً</h2>
      <p class="rd-celcap">نكمل الدرس من هنا في المرّة القادمة.</p>
      <div class="rd-spbtns"><button class="rd-homebtn soft" id="rdTiredGo">أكمل قليلاً</button><button class="rd-homebtn" id="rdTiredStop">أتوقّف الآن</button></div></div>`;
    $('#rdCel').hidden = false; clock.pause(); stopAudio();
    $('#rdTiredGo').addEventListener('click', () => { $('#rdCel').hidden = true; clock.resume(); }, { once: true });
    $('#rdTiredStop').addEventListener('click', () => { $('#rdCel').hidden = true; if (S) { S.tired = true; endSession(); } }, { once: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clock.pause(); stopAudio(); } else clock.resume();
    if (SP) { if (document.hidden && SP.hid == null) { SP.acc += performance.now() - SP.t0; SP.hid = 1; } else if (!document.hidden && SP.hid != null) { SP.t0 = performance.now(); SP.hid = null; } }
  });

  return {
    home, ready,
    isOn: () => ['rhome', 'rsession', 'rdone', 'rparent', 'rrec', 'rref', 'rcheck', 'rplace', 'rspeed', 'rbook'].some(id => !$('#' + id).hidden) || !$('#rdCel').hidden,
    busy: () => !!S || !!SP || busy || ['rdone', 'rparent', 'rrec', 'rref', 'rcheck', 'rplace', 'rspeed'].some(id => !$('#' + id).hidden) || !$('#rdCel').hidden,
    leave: stopAll,
    doneToday: () => r.use.includes(today()),
    status: () => ({ done: r.use.includes(today()), lesson: r.current, sessions: sessionsToday(today()) }),
    snapshot() { const o = JSON.parse(JSON.stringify(r)); o.sounds = JSON.parse(JSON.stringify(RAW)); return o; },
    valid,
    async replace(obj) {
      r = clean(obj); save();
      const sounds = obj && obj.sounds && typeof obj.sounds === 'object' ? obj.sounds : {};
      for (const [id, x] of Object.entries(sounds)) {
        if (!x || !x.b64) continue;
        try { const item = { id, blob: unb64(x.b64, x.type || 'audio/mp4'), type: x.type, kind: x.kind || (SOUND[id] && SOUND[id].kind) || 'short', at: x.at || Date.now() }; await useSound(item); await idb('sounds', 'readwrite', st => st.put(item)); } catch (e) { console.warn('restore sound', id, e); }
      }
    },
    // for tests (?dev=1)
    get state() { return r; }, get data() { return D; }, get session() { return S; }, get pack() { return PACK; }, core, openParent, recordScreen, referenceScreen, placement, masteryCheck, openStars,
    _endSession: endSession, _book: openBook, _start: startSession, _useSound: useSound, SND, _try: (n, beats) => startSession(n, 'replay', beats), _speedEnd: () => endSpeed()
  };
}

root.MariaReads = { core, mount };
if (typeof module !== 'undefined') module.exports = { core };
})(typeof window !== 'undefined' ? window : globalThis);
