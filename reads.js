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
           log: [], stuck: {}, seen: {}, settings: { slots: ['13:30', '17:30'], bedtime: '19:30', cues: true } };
}
function clean(o) {
  const b = blank();
  if (!o || typeof o !== 'object') return b;
  const r = { ...b, ...o };
  r.settings = { ...b.settings, ...(o.settings || {}) };
  r.stars = { ...b.stars, ...(o.stars || {}) };
  if (!r.stars.days || typeof r.stars.days !== 'object') r.stars.days = {};
  ['lessons', 'minutes', 'stuck', 'seen'].forEach(k => { if (!r[k] || typeof r[k] !== 'object') r[k] = {}; });
  ['use', 'opened', 'log'].forEach(k => { if (!Array.isArray(r[k])) r[k] = []; });
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
  (L.beats || []).forEach(b => b.slice(1).forEach(x => String(x).split('>').forEach(w => { if (D.words[w]) D.words[w].says.forEach(y => s.add(y)); })));
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
  r.log.push({ day: t, n: s.n, mode: s.mode, secs: Math.round(s.secs || 0), tap: null, at: Date.now() });
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
const core = { blank, clean, valid, rec, stateOf, minutesFor, lessonSounds, taught, minDays, reviewToday, canAdvance, streakOf,
  weekDay, piecesAt, puzzleOf, board, finish, applyTap, PIECE_ORDER, addDays };

/* ---------- letter shapes for tracing (capitals, viewBox 0 0 200 240), one path per stroke, in writing order ---------- */
const STROKES = {
  A: ['M100 24 L38 216', 'M100 24 L162 216', 'M64 146 L136 146'],
  B: ['M56 24 L56 216', 'M56 24 L110 24 Q154 24 154 70 Q154 116 110 116 L56 116', 'M56 116 L116 116 Q164 116 164 166 Q164 216 116 216 L56 216'],
  C: ['M158 62 Q140 24 100 24 Q40 24 40 120 Q40 216 100 216 Q140 216 158 178'],
  T: ['M34 26 L166 26', 'M100 26 L100 216']
};

/* ---------- her short Arabic cue lines: shown the first three times a game appears (Mama can turn them off) ---------- */
const CUE = {
  flash: 'قولي الصوت، ثم المسي الحرف',
  newsound: 'صوت جديد! اسمعيه، ثم ارسميه بإصبعك',
  hear: 'هل تسمعين الصوت في الكلمة؟',
  where: 'أين الصوت: في البداية، الوسط، النهاية؟',
  read: 'المسي الحروف من اليسار، ثم اسحبي تحتها',
  swap: 'اختاري الحرف الذي يصنع الكلمة',
  me: 'اسمعي، ثم سجّلي صوتكِ'
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
  const ready = Promise.all([
    fetch('reads.json').then(x => x.json()).then(d => { D = d; d.sounds.forEach(s => { SOUND[s.id] = s; }); }),
    fetch('audio/voice.json').then(x => (x.ok ? x.json() : null)).then(v => { CLIPS = (v && v.decks && v.decks.reads && v.decks.reads.clips) || {}; }).catch(() => {}),
    loadSounds()
  ]).catch(e => { console.warn('Maria Reads could not load', e); });
  const grapheme = id => (SOUND[id] ? SOUND[id].g.split(' ')[0] : id.toUpperCase());

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
      const p = fetch('audio/' + c.f).then(x => { if (!x.ok) throw new Error(x.status); return x.blob(); })
        .then(b => URL.createObjectURL(new Blob([b], { type: 'audio/mp4' })));
      urls.set(id, p); p.catch(() => urls.delete(id));
    }
    return urls.get(id).catch(() => null);
  }
  const sayWord = (w, rate = 1) => clipUrl('w-' + w).then(u => play(u, rate));
  const sayStretchy = (w, rate = 1) => clipUrl(CLIPS['s-' + w] ? 's-' + w : 'w-' + w).then(u => play(u, rate));
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
  const hasSound = id => !!SND[id];
  const sayLetter = (id, held) => play(SND[id] ? (held ? SND[id].held : SND[id].short) : null);
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
    </div>
    <button class="rd-boardbtn" id="rdBoardBtn" aria-label="لغز الأسبوع"><span class="rd-board" id="rdBoard" dir="ltr"></span><span class="rd-boardcap" id="rdBoardCap"></span></button>
  </div>
</section>

<section id="rsession" class="screen rd rd-sess" hidden>
  <div class="rd-top" dir="ltr">
    <button class="quit" id="rdQuit" aria-label="الرئيسية">${ic('i-close')}</button>
    <div class="rd-timer" id="rdTimer"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="rd-ring-bg" cx="32" cy="32" r="26"/><circle class="rd-ring-fg" id="rdRing" cx="32" cy="32" r="26"/></svg></div>
    <div class="rd-cue" id="rdCue" dir="rtl" lang="ar"></div>
    ${flame('rdStreak2')}${starN('rdStars2')}
  </div>
  <div class="rd-stage" id="rdStage" dir="ltr"></div>
</section>

<section id="rdone" class="screen rd rd-done" dir="rtl" lang="ar" hidden><div class="rd-donebox" id="rdDone"></div></section>
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
  const bedtimeNow = () => {
    const now = new Date(), hm = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
    return hm >= (r.settings.bedtime || '19:30') || hm < '05:00';
  };
  const sessionsToday = t => r.log.filter(x => x.day === t).length;
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
    api.show('rhome');
    requestAnimationFrame(() => {   // the current lesson in the middle of the path
      const cur = $('#rdPath .cur'), wrap = $('#rdPathWrap'); if (!cur) return;
      const left = cur.offsetLeft + cur.offsetWidth / 2 - wrap.clientWidth / 2;
      if (wrap.scrollTo) wrap.scrollTo({ left, behavior: lastLesson === null ? 'auto' : 'smooth' }); else wrap.scrollLeft = left;
    });
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
    if (bedtimeNow()) return { off: true, label: 'نامي جيداً 🌙', note: 'وقت النوم الآن. نقرأ غداً!' };
    const miss = missingFor(n);
    if (miss.length) return { off: true, label: 'ابدئي', note: `ماما تسجّل صوت ${miss.map(id => SOUND[id].say).join(' و ')} أولاً 🎙️`, mama: true };
    if (reviewToday(r, n, t)) return { label: 'مراجعة', mode: 'review', note: 'يوم مراجعة: نلعب بما تعرفينه' };
    return { label: `ابدئي الدرس ${AR(n)}`, mode: 'lesson', note: '' };
  }
  function renderGo(t) {
    const g = goInfo(t);
    const go = $('#rdGo'); go.textContent = g.label; go.disabled = !!g.off; go.dataset.mode = g.mode || '';
    $('#rdGoNote').textContent = g.note; $('#rdGoNote').classList.toggle('mama', !!g.mama);
    const done = sessionsToday(t), slots = r.settings.slots || [];
    const fmt = hm => { const [h, m] = hm.split(':').map(Number); return AR(`${((h + 11) % 12) + 1}:${pad2(m)}`); };
    $('#rdSlots').innerHTML = slots.map((hm, i) => `<span class="rd-slot${done > i ? ' on' : ''}">${done > i ? ic('i-tick') : ''}${i === 0 ? 'بعد الغداء' : 'المساء'} <i>${fmt(hm)}</i></span>`).join('');
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
  function pieceCells(b) {
    const pz = D.puzzles[b.puzzle], have = new Set(PIECE_ORDER.slice(0, b.have)), id = 'pz' + (++boardN);
    const pieces = Array.from({ length: 8 }, (_, k) => {
      const d = piecePath(k, b.puzzle);
      return `<clipPath id="${id}-${k}"><path d="${d}"/></clipPath>`;
    }).join('');
    const body = Array.from({ length: 8 }, (_, k) => {
      const d = piecePath(k, b.puzzle);
      return `<g class="pc${have.has(k) ? ' on' : ''}" data-k="${k}"><path class="pc-empty" d="${d}"/>`
        + `<g class="pc-img"><image href="${pz.img}" x="0" y="0" width="1200" height="800" preserveAspectRatio="none" clip-path="url(#${id}-${k})"/><path class="pc-line" d="${d}"/></g></g>`;
    }).join('');
    return `<svg class="rd-jig" viewBox="-14 -14 1228 828" aria-hidden="true"><defs>${pieces}</defs>${body}</svg>`;
  }
  function renderBoard(t) {
    const P = D.puzzles.length, b = board(r, t, P);
    $('#rdBoard').innerHTML = pieceCells(b) + (b.pending ? '<span class="rd-gift">🎁</span>' : '');
    $('#rdBoard').classList.toggle('complete', !!b.complete);
    $('#rdBoardCap').textContent = b.pending ? 'افتحي هديّة اليوم!' : b.complete ? 'أكملتِ اللغز! 🎉' : b.fresh || !b.have ? 'لغز جديد: قطعة كل يوم' : `${AR(b.have)} من ٨ قطع`;
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
  function startSession(n, mode) {
    const t = today(), L = D.lessons[n - 1];
    if (!L || !L.ready || bedtimeNow() || missingFor(n).length) return;
    api.SFX.init();
    let beats, base = 0;
    if (mode === 'review') beats = reviewBeats(n);
    else {
      const all = L.beats.map(b => b.slice());
      base = mode === 'lesson' ? Math.min(rec(r, n).next || 0, all.length - 1) : 0;
      beats = all.slice(base);
      if (base > 0 && beats[0][0] !== 'flash' && taught(D, n).length) { beats.unshift(['flash']); base--; }   // the rest of a long lesson starts with a quick review
    }
    S = { n, mode, beats, bi: 0, base, timeUp: false, limit: minutesFor(D, n) * 60, items: [], startedDay: t, lessonLen: L.beats.length };
    preloadWords(Object.keys(D.words).concat(Object.keys(D.emoji)));
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
    const words = [...new Set(D.lessons.slice(0, s.n).flatMap(x => x.words || []))].filter(w => D.words[w].says.every(x => known.includes(x)));
    const ear = known.filter(x => D.ear[x]);
    const out = [];
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
    stage.innerHTML = `<div class="rd-new"><button class="rd-big enter" id="rdBig">${esc(g)}</button><p class="rd-ex" lang="en">${esc(SOUND[id].say)}</p></div>`;
    const big = $('#rdBig');
    big.addEventListener('click', () => { big.classList.remove('pulse'); void big.offsetWidth; big.classList.add('pulse'); sayLetter(id, held); });
    await sleep(400);
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
  function feedback(ok, emoji, right) {
    const f = document.createElement('div'); f.className = 'rd-fb ' + (ok ? 'good' : 'soft'); f.textContent = emoji || '';
    stage.querySelector('.rd-game').append(f);
    if (right) right.classList.add('right');
    if (ok) api.SFX.good(); else api.SFX.again();
  }
  async function beatHear(s, [id]) {
    const E = D.ear[id]; if (!E) return;
    const yes = [...E.beg, ...E.mid, ...E.end];
    const items = shuffle([...pick(yes, 5).map(w => [w, true]), ...pick(E.no, 3).map(w => [w, false])]);
    for (const [w, has] of items) {
      if (!alive(s)) return;
      stage.innerHTML = `<div class="rd-game rd-hear">
        <button class="rd-replay" id="rdAgain" aria-label="اسمعي مرة أخرى">${ic('i-speaker')}</button>
        <div class="rd-choices"><button class="rd-yes" data-a="1"><b>${esc(grapheme(id))}</b><span>👂 نعم</span></button>
        <button class="rd-no" data-a="0"><b>☁️</b><span>لا</span></button></div></div>`;
      $('#rdAgain').addEventListener('click', () => sayWord(w));
      await sleep(250); sayWord(w);
      const ans = await choice('.rd-choices button');
      const ok = (ans.dataset.a === '1') === has;
      feedback(ok, D.emoji[w], ok ? null : stage.querySelector(`.rd-choices [data-a="${has ? 1 : 0}"]`));
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
      feedback(ok, D.emoji[w], ok ? null : stage.querySelector(`.rd-car[data-a="${where}"]`));
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
  function readWord(s, w, pre = '') {
    const W = D.words[w], n = W.tiles.length;
    stage.innerHTML = `<div class="rd-read">${pre}
      <div class="rd-word" id="rdWord">${W.tiles.map((t, i) => `<button class="rd-tile" data-i="${i}">${esc(t)}</button>`).join('')}</div>
      <div class="rd-ltr" id="rdLtr" aria-hidden="true"><i></i></div>
      <div class="rd-swipe" id="rdSwipe"><span class="rd-sw-hint">${'›'.repeat(3)}</span><i class="rd-thumb" id="rdThumb"></i></div>
      <div class="rd-after" id="rdAfter"></div>
      <div class="rd-mama" id="rdMama" hidden lang="ar" dir="rtl"><span>👩‍🦰 اسألي ماما</span><button id="rdMamaOk">ساعدتني ماما ✓</button></div></div>`;
    const tiles = [...stage.querySelectorAll('.rd-tile')], sw = $('#rdSwipe'), thumb = $('#rdThumb');
    let next = 0, lv = 0, helped = false, finished = false;
    const ltr = () => { const a = $('#rdLtr'); a.classList.remove('go'); void a.offsetWidth; a.classList.add('go'); clearTimeout(a.t); a.t = setTimeout(() => a.classList.remove('go'), 1600); if (tiles[next]) { tiles[next].classList.remove('nudge'); void tiles[next].offsetWidth; tiles[next].classList.add('nudge'); } };
    const sweep = secs => tiles.forEach((t, i) => setTimeout(() => { t.classList.add('sing'); setTimeout(() => t.classList.remove('sing'), 380); }, (secs * 1000 / n) * i));
    return new Promise(done => {
      const arm = () => { clearTimeout(helpTimer); if (!finished) helpTimer = setTimeout(stuck, 6000); };
      async function stuck() {
        if (finished || s !== S) return;
        helped = true;
        if (lv === 0) {                                         // (a) the first sound
          const i = Math.min(next, n - 1); tiles[i].classList.add('nudge'); await sayLetter(W.says[i]);
        } else if (lv <= 3) {                                   // (b) the stretchy model, shorter each time
          const rate = [1, 1.3, 1.65][lv - 1];
          sweep(clipSecs(CLIPS['s-' + w] ? 's-' + w : 'w-' + w, rate)); await sayStretchy(w, rate);
        } else { $('#rdMama').hidden = false; return; }         // (c) ask Mama
        lv++; arm();
      }
      tiles.forEach((t, i) => t.addEventListener('click', () => {
        if (finished) return; api.SFX.init();
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
        if (finished) return; finished = true; x0 = null; clearTimeout(helpTimer); $('#rdMama').hidden = true;
        sw.classList.add('done'); thumb.style.left = '94%'; tiles.forEach(t => t.classList.add('lit'));
        sweep(clipSecs('w-' + w)); await sayWord(w);
        if (s !== S) return;
        $('#rdAfter').innerHTML = W.pic ? `<img class="rd-pic" src="${W.pic}" alt="">` : W.sound ? '<span class="rd-sparkle">✨</span>' : '<span class="rd-sparkle">⭐</span>';
        api.SFX.good();
        s.items.push({ w, helped });
        if (helped) { const k = r.stuck[w] || (r.stuck[w] = { n: 0, last: null }); k.n++; k.last = today(); save(); }
        await sleep(1500); done();
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
    const sid = c => taught(D, s.n, true).find(id => grapheme(id) === c);
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
      <button class="rd-next" id="rdNext" hidden>التالي ←</button></div>`;
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

  const BEAT = { flash: beatFlash, newsound: beatNewSound, hear: beatHear, where: beatWhere, read: beatRead, swap: beatSwap, me: beatMe };

  /* =====================================================================================================
     The end of a session: Mama's tap, the stars, and on the first session of the day a puzzle piece
     ===================================================================================================== */
  function endSession() {
    const s = S; if (!s) return;
    clock.pause(); const secs = clock.secs();
    S = null; clearInterval(ticker); ticker = null; stopAudio(); stopRec(); clearTimeout(helpTimer);
    const t = today();
    addMinutes(secs);
    if (s.mode === 'lesson') { const done = s.base + s.bi >= s.lessonLen; rec(r, s.n).next = done ? 0 : Math.min(s.lessonLen - 1, s.base + s.bi); }
    const res = finish(r, { n: s.n, mode: s.mode, secs }, t); save();
    api.SFX.unlock();
    $('#rdDone').innerHTML = `<h1 class="rd-donet">أحسنتِ! 🎉</h1>
      <div class="rd-doneline">${flame('rdStreak3')}${starN('rdStars3')}</div>
      <div class="rd-mamatap" dir="ltr" lang="en"><p class="rd-hand" lang="ar" dir="rtl">ناولي الآيباد لماما 👩</p><p>Mama, how did Maria read?</p>
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
    await sleep(500);
    const fresh = PIECE_ORDER.slice(b.have, b.get);
    fresh.forEach((k, i) => setTimeout(() => { const c = $(`#rdBig .pc[data-k="${k}"]`); if (c) { c.classList.add('on', 'arrive'); api.SFX.star(); } }, i * 650));
    await sleep(700 + fresh.length * 650);
    $('#rdWrap').remove();
    const complete = b.get === 8;
    $('#rdCelCap').textContent = complete ? 'أكملتِ اللغز كلّه! 🎉' : `قطعة جديدة! ${AR(b.get)} من ٨`;
    if (complete) { $('#rdBig').classList.add('complete'); api.confetti($('#rdConfetti')); api.SFX.unlock(); }
    const btn = document.createElement('button'); btn.className = 'rd-homebtn'; btn.textContent = 'الرئيسية';
    btn.addEventListener('click', () => { busy = false; cel.hidden = true; api.stopConfetti($('#rdConfetti')); home(); }, { once: true });
    boxEl.append(btn);
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
  function celebrate(kind) {
    if (kind !== 'lesson') return;
    const L = D.lessons[r.current - 1];
    $('#rdCelBox').innerHTML = `<div class="rd-newstone">${esc(L.label)}</div><h2 class="rd-celt">درس جديد!</h2><button class="rd-homebtn" id="rdCelOk">هيا!</button>`;
    $('#rdCel').hidden = false; api.SFX.unlock(); api.confetti($('#rdConfetti'));
    $('#rdCelOk').addEventListener('click', () => { $('#rdCel').hidden = true; api.stopConfetti($('#rdConfetti')); }, { once: true });
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
        <button class="rp-btn${miss.length ? ' warn' : ''}" data-act="rec">Record sounds${miss.length ? ` (${miss.length} needed)` : ''}</button></div>
        ${miss.length ? `<p class="rp-warn">Needs recording: ${miss.map(x => `${esc(x.say)} (lesson ${x.lesson})`).join(', ')}</p>` : ''}</section>
      <section class="rp-card"><h2>Progress</h2>
        <div class="rp-stats"><span><b>${streakOf(r, t)}</b> ${streakOf(r, t) === 1 ? 'day' : 'days'} in a row</span><span><b>${r.stars.total}</b> ${r.stars.total === 1 ? 'star' : 'stars'}</span><span><b>${r.use.length}</b> ${r.use.length === 1 ? 'day' : 'days'} of use</span><span><b>${b.have}</b> of 8 puzzle pieces this week</span></div>
        <div class="rp-bars">${days7.map(d => `<div class="rp-bar${d === t ? ' today' : ''}"><i style="height:${Math.round((r.minutes[d] || 0) / mx * 60)}px"></i><b>${Math.round((r.minutes[d] || 0) / 60)}m</b><span>${fmtDay(d).split(' ')[0]}</span></div>`).join('')}</div></section>
      <section class="rp-card"><h2>Stuck words</h2>${stuck.length ? `<div class="rp-chips">${stuck.map(([w, x]) => `<button class="rp-chip" data-say="${esc(w)}">${esc(w.toUpperCase())} <i>×${x.n}</i></button>`).join('')}</div>` : '<p>None yet. A word goes here when she needs the help ladder.</p>'}</section>
      <section class="rp-card"><h2>Her recordings</h2><div id="rpMine"><p>Loading…</p></div></section>
      <section class="rp-card"><h2>This month</h2>
        <p>${new Set(mLog.map(x => x.day)).size} days of use · ${mLog.length} sessions · ${Math.round(Object.entries(r.minutes).filter(([d]) => d.startsWith(month)).reduce((a, [, v]) => a + v, 0) / 60)} minutes · lessons mastered: ${masteredM.length ? masteredM.join(', ') : 'none yet'}</p>
        <p>Your taps: Alone ${taps('alone')} · With a little help ${taps('help')} · Not yet ${taps('not')}</p></section>
      <section class="rp-card"><h2>Settings</h2>
        <label class="rp-set">Reading time 1 (after lunch) <input type="time" id="rpSlot0" value="${esc(r.settings.slots[0] || '13:30')}"></label>
        <label class="rp-set">Reading time 2 (early evening) <input type="time" id="rpSlot1" value="${esc(r.settings.slots[1] || '17:30')}"></label>
        <label class="rp-set">No lessons from (bedtime) <input type="time" id="rpBed" value="${esc(r.settings.bedtime)}"></label>
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
    if (el.id === 'rpSlot0' || el.id === 'rpSlot1') { r.settings.slots[el.id === 'rpSlot0' ? 0 : 1] = el.value || r.settings.slots[0]; save(); }
    if (el.id === 'rpBed' && el.value) { r.settings.bedtime = el.value; save(); }
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
      const has = hasSound(x.id), need = x.lesson <= n + 1;
      return `<div class="rr-row${has ? ' has' : need ? ' need' : ''}" data-id="${x.id}">
        <div class="rr-say"><b>${esc(x.say)}</b><span>${esc(x.g)}</span></div>
        <div class="rr-info"><p><b lang="en">${esc(x.ex)}</b> · lesson ${x.lesson} · ${x.kind === 'hold' ? 'hold about 2 seconds' : 'short'}</p><p class="rr-tip">${esc(x.tip)}</p></div>
        <span class="rr-state">${has ? 'Recorded ✓' : need ? 'Needs recording' : 'Later'}</span>
        <div class="rr-btns"><button class="rp-btn rr-rec" data-rec="${x.id}">● ${has ? 'Again' : 'Record'}</button>
          ${has ? `<button class="rp-btn" data-play="${x.id}">▶ Short</button>${x.kind === 'hold' ? `<button class="rp-btn" data-play="${x.id}" data-held="1">▶ Held</button>` : ''}` : ''}</div></div>`;
    };
    $('#rrec').innerHTML = `<div class="rp"><header class="rp-head"><h1>Record sounds</h1><button class="rp-x" data-act="back">${ic('i-close')}</button></header>
      <p class="rr-intro">Your voice is the only voice for single sounds. Tap ● Record, say the sound, and it stops on its own. Held sounds: one steady sound of about 2 seconds; the app cuts the short one from it. Short sounds: once, crisp, with no vowel after it. Lessons 1 to 8 need /a/, /b/, /k/ and /t/.</p>
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
        recordScreen();
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
    if (bedtimeNow() || missingFor(n).length) { b.classList.add('shake'); return; }
    startSession(n, 'replay');
  });
  $('#rdBoardBtn').addEventListener('click', () => { api.SFX.init(); viewPuzzle(); });
  $('#rdQuit').addEventListener('click', () => { stopAll(); home(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clock.pause(); stopAudio(); } else clock.resume();
  });

  return {
    home, ready,
    isOn: () => ['rhome', 'rsession', 'rdone', 'rparent', 'rrec', 'rcheck', 'rplace'].some(id => !$('#' + id).hidden) || !$('#rdCel').hidden,
    busy: () => !!S || busy || ['rdone', 'rparent', 'rrec', 'rcheck', 'rplace'].some(id => !$('#' + id).hidden) || !$('#rdCel').hidden,
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
    get state() { return r; }, get data() { return D; }, get session() { return S; }, core, openParent, recordScreen, placement, masteryCheck,
    _endSession: endSession, _start: startSession, _useSound: useSound, SND
  };
}

root.MariaReads = { core, mount };
if (typeof module !== 'undefined') module.exports = { core };
})(typeof window !== 'undefined' ? window : globalThis);
