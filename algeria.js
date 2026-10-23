/* هيا نتعلم في الجزائر: Maria's trip home, city by city. The sixth app on her entrance page.
   It teaches only what her Saudi Grade 3 books leave out compared with the Algerian 3AP books (Mama's two comparison
   reports, October 2026). Mama's concept (approved 23 October 2026): a daily session of about ten minutes:
     1 warm-up with the cards that are due (Talk Cards' look and its boxes), at most six;
     2 one small new step: a worked example to watch and hear, one part to fill, then items alone;
     3 the picture of the day (a real photo of the city): she talks about it (maths days) or writes about it in her
       notebook and photographs the page (Arabic days), then sees and hears a model description at her level;
     4 a last item that is always easy, then «عودي غداً 🌟».
   Arabic and maths take turns; a step is passed after two different days with at most one mistake alone; when both
   steps of a city are passed she gets the city's stamp in her passport (the one quiet reward) and the city lights up.
   Her rules (23 Oct 2026): after every answer she taps «التالي» to move on (the app never moves on by itself), and the
   voice reads a text only once: instructions, the worked example, the rule (first day) and the model description;
   everything she answers or reads herself (postcard, cards, practice sentences, numbers, choices) is not read for her.
   Content: algeria.json (scripts/make_algeria.py). Progress: 'tc:maria:algeria'. Her recordings and the photos of her
   pages stay on the iPad, in IndexedDB 'algeria-trip' (they travel only inside the backup file). */
(function (root) {
'use strict';

const pad2 = n => String(n).padStart(2, '0');
const toDate = ds => { const [y, m, d] = ds.split('-').map(Number); return new Date(y, m - 1, d); };
const fmt = x => `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
function addDays(ds, n) { const x = toDate(ds); x.setDate(x.getDate() + n); return fmt(x); }
const sleep = ms => new Promise(ok => setTimeout(ok, ms));
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
// Saudi digits, no separator (her rule, 23 Oct 2026: "the content and learning rather than the symbols"): 23519 -> ٢٣٥١٩
const num = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const INTERVAL = [0, 1, 2, 4, 8, 16, 32, 64];                         // Talk Cards' boxes (app.js): days until the next look

/* =====================================================================================================
   The rules (no DOM, so they can be tested in Node: scripts/test_algeria.js)
   ===================================================================================================== */
function blank() {
  return { v: 1, start: null, n: 0, days: {}, arrived: {}, stamps: {}, steps: {}, cards: {}, newq: [], pics: {}, corner: {},
           settings: { level: 0, newPerDay: 3, warmMax: 6, first: 'ar' } };
}
function clean(o) {
  const b = blank();
  if (!o || typeof o !== 'object') return b;
  const r = { ...b, ...o };
  r.settings = { ...b.settings, ...(o.settings || {}) };
  ['days', 'arrived', 'stamps', 'steps', 'cards', 'pics', 'corner'].forEach(k => { if (!r[k] || typeof r[k] !== 'object' || Array.isArray(r[k])) r[k] = {}; });
  if (!Array.isArray(r.newq)) r.newq = [];
  r.n = Math.max(0, Math.round(Number(r.n)) || 0);
  r.settings.level = Math.max(0, Math.min(6, Math.round(Number(r.settings.level)) || 0));
  r.settings.newPerDay = Math.max(1, Math.min(6, Math.round(Number(r.settings.newPerDay)) || 3));
  r.settings.warmMax = Math.max(2, Math.min(10, Math.round(Number(r.settings.warmMax)) || 6));
  if (!['ar', 'ma'].includes(r.settings.first)) r.settings.first = 'ar';
  return r;
}
const valid = o => !!o && typeof o === 'object' && !!o.steps && typeof o.steps === 'object' && !!o.cards && typeof o.cards === 'object';

// the picture description grows: one sentence for her first ten sessions (about two weeks), then one more every ten, up to six
const level = r => r.settings.level || Math.min(6, 1 + Math.floor(r.n / 10));
const stepDone = (r, id) => !!(r.steps[id] && r.steps[id].done);
const cityDone = (r, c) => !!c.steps && c.steps.every(id => stepDone(r, id));
// the city she is visiting: the first one on the route without its stamp (null when the next city is not ready yet)
function currentCity(r, D) { const c = D.cities.find(x => !r.stamps[x.id]); return c && c.ready ? c : null; }
function nextOnRoute(r, D) { return D.cities.find(x => !r.stamps[x.id]) || null; }
function lastStamped(r, D) { return [...D.cities].reverse().find(x => r.stamps[x.id]) || null; }

// today's plan: Arabic and maths take turns (by sessions done, so a missed day loses nothing); writing on the Arabic turn.
// If the city's step for that subject is already passed, the other subject's step comes instead.
function plan(r, D) {
  const turn = (r.n % 2 === 0) === (r.settings.first === 'ar') ? 'ar' : 'ma';
  const out = { turn, write: turn === 'ar', city: null, subj: null, step: null };
  const c = currentCity(r, D); if (!c) return out;
  out.city = c.id;
  const of = s => c.steps.find(id => D.steps[id] && D.steps[id].subj === s);
  for (const s of [turn, turn === 'ar' ? 'ma' : 'ar']) {
    const id = of(s);
    if (id && !stepDone(r, id)) { out.subj = s; out.step = id; break; }
  }
  return out;
}
// the picture of the day: the city's next unseen picture, then the one seen longest ago
function pickPic(r, D, cityId) {
  const c = D.cities.find(x => x.id === cityId) || lastStamped(r, D) || D.cities[0];
  const ps = (c && c.pics) || []; if (!ps.length) return null;
  const unseen = ps.find(p => !r.pics[p]); if (unseen) return unseen;
  return [...ps].sort((a, b) => (r.pics[a] < r.pics[b] ? -1 : r.pics[a] > r.pics[b] ? 1 : 0))[0];
}
function openDay(r, D, t) {
  if (r.days[t]) return r.days[t];
  const p = plan(r, D), c = D.cities.find(x => x.id === p.city);
  r.days[t] = { ...p, pic: pickPic(r, D, p.city), arrive: !!(c && !r.arrived[c.id]), done: false };
  if (!r.start) r.start = t;
  return r.days[t];
}
const dayDone = (r, t) => !!(r.days[t] && r.days[t].done);

/* ---------- the cards: Talk Cards' boxes (Maria's rule in app.js applyGood / applyAgain) ---------- */
function teach(r, D, ids) { (ids || []).forEach(id => { if (D.cards[id] && !r.cards[id] && !r.newq.includes(id)) r.newq.push(id); }); }
const introducedOn = (r, t) => Object.values(r.cards).filter(c => c.intro === t).length;
function warmIds(r, D, t) {
  const due = Object.keys(r.cards).filter(id => D.cards[id] && r.cards[id].due && r.cards[id].due <= t)
    .sort((a, b) => (r.cards[a].due < r.cards[b].due ? -1 : r.cards[a].due > r.cards[b].due ? 1 : 0));
  const room = Math.max(0, r.settings.newPerDay - introducedOn(r, t));
  return [...due, ...r.newq.filter(id => D.cards[id]).slice(0, room)].slice(0, r.settings.warmMax);
}
function rate(r, id, good, t) {
  let c = r.cards[id];
  if (!c) { c = r.cards[id] = { box: 0, due: t, intro: t, again: [] }; r.newq = r.newq.filter(x => x !== id); }
  if (good) {
    if ((c.again || []).includes(t)) { c.box = 1; c.due = addDays(t, 1); }
    else if (c.up !== t) { c.box = Math.min(7, c.box + 1); c.due = addDays(t, INTERVAL[c.box]); c.up = t; }
  } else { c.box = 1; c.due = addDays(t, 1); (c.again = c.again || []).push(t); }
  return c;
}
function deckCounts(r, D, t) {   // for Mama: known (box 3+), learning, waiting to be introduced, due today, by deck
  const out = {};
  Object.keys(D.decks).forEach(k => { out[k] = { known: 0, learning: 0, waiting: 0, due: 0 }; });
  Object.entries(r.cards).forEach(([id, c]) => { const d = D.cards[id] && out[D.cards[id].deck]; if (!d) return; if (c.box >= 3) d.known++; else d.learning++; if (c.due <= t) d.due++; });
  r.newq.forEach(id => { const d = D.cards[id] && out[D.cards[id].deck]; if (d) d.waiting++; });
  return out;
}

/* ---------- the steps ---------- */
const stepRec = (r, id) => r.steps[id] || (r.steps[id] = { days: [], pass: [], done: null, log: [] });
// which example and items today: the day number of this step (0 on her first day with it)
function stepDayIx(r, id, t) { const s = r.steps[id]; if (!s) return 0; const k = s.days.indexOf(t); return k >= 0 ? k : s.days.length; }
function startStep(r, D, id, t) {
  const s = stepRec(r, id), first = !s.days.length;
  if (!s.days.includes(t)) s.days.push(t);
  if (first) teach(r, D, D.steps[id].teachDay1);
  return s;
}
function finishStep(r, D, id, t, wrong, total) {
  const s = stepRec(r, id);
  const ok = wrong <= 1;
  s.log.push({ day: t, wrong, total });
  if (ok && !s.pass.includes(t)) {
    s.pass.push(t);
    if (s.pass.length === 1) teach(r, D, D.steps[id].teachPass);
  }
  if (s.pass.length >= 2 && !s.done) s.done = t;
  return { ok, passes: s.pass.length, done: !!s.done };
}
// after the session: a city whose steps are all passed gets its stamp
function stampIfDone(r, D, t) {
  const c = currentCity(r, D);
  if (c && cityDone(r, c) && !r.stamps[c.id]) { r.stamps[c.id] = t; return c; }
  return null;
}
function finishDay(r, t) { const d = r.days[t]; if (d && !d.done) { d.done = true; r.n++; } }

/* ---------- numbers in words (1 to 99 999), as the Algerian book reads them: «خمسمائة» joined, «مئتان», «ألفًا» ---------- */
const UNITS = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const TENS = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const HUNDREDS = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
function below100(n) {
  if (n < 10) return UNITS[n];
  if (n === 10) return 'عشرة';
  if (n === 11) return 'أحد عشر';
  if (n === 12) return 'اثنا عشر';
  if (n < 20) return `${UNITS[n - 10]} عشر`;
  const u = n % 10, t = TENS[Math.floor(n / 10)];
  return u ? `${UNITS[u]} و${t}` : t;
}
const joinW = parts => parts.filter(Boolean).join(' و');
const below1000 = n => joinW([HUNDREDS[Math.floor(n / 100)], below100(n % 100)]);
function numWords(n) {
  const th = Math.floor(n / 1000), rest = n % 1000;
  const thw = !th ? '' : th === 1 ? 'ألف' : th === 2 ? 'ألفان' : th <= 10 ? `${below100(th)} آلاف` : `${below1000(th)} ألفًا`;
  return joinW([thw, below1000(rest)]);
}
// the places, from the units up (the Algerian book's table: منزلة الوحدات then منزلة الآلاف)
const PLACE_NAMES = ['الوحدات', 'العشرات', 'المئات', 'الآلاف', 'عشرات الآلاف'];
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const seedOf = str => [...String(str)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
function shuffleR(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function randNum(rnd, digits) {
  let s = String(1 + Math.floor(rnd() * 9));
  for (let i = 1; i < digits; i++) s += rnd() < 0.25 ? '0' : String(Math.floor(rnd() * 10));
  return Number(s);
}
// near misses: two digits swapped, one digit changed, a zero too many or too few
function nearMisses(n, rnd) {
  const d = String(n).split(''), out = new Set();
  for (let tries = 0; out.size < 6 && tries < 80; tries++) {
    const k = Math.floor(rnd() * 3), x = [...d];
    if (k === 0) { const i = Math.floor(rnd() * x.length), j = Math.floor(rnd() * x.length); [x[i], x[j]] = [x[j], x[i]]; }
    else if (k === 1) { const i = Math.floor(rnd() * x.length); x[i] = String((Number(x[i]) + 1 + Math.floor(rnd() * 8)) % 10); }
    else if (x.length > 3 && rnd() < 0.5) x.splice(1 + Math.floor(rnd() * (x.length - 1)), 1); else if (x.length < 5) x.splice(1, 0, '0');
    const m = Number(x.join(''));
    if (x[0] !== '0' && m !== n && m >= 100 && m <= 99999) out.add(m);
  }
  return [...out];
}
// the practice she does alone: generated, so there is always more. Kinds: number -> words, words -> number, the digit in a
// place, the expanded number (٤٠٠٠ + ٢٠٠ + ٥). Each item: {t, n, opts, ok, (p)}
const KINDS = ['n2w', 'w2n', 'place', 'n2w', 'expand', 'w2n', 'place', 'n2w'];
function mathItems(seed, count, digits) {
  const rnd = rng(seed), out = [];
  for (let i = 0; i < count; i++) {
    const t = KINDS[i % KINDS.length], n = randNum(rnd, digits[0] + Math.floor(rnd() * (digits[1] - digits[0] + 1)));
    if (t === 'place') {
      const ds = String(n).split('').reverse(), p = Math.floor(rnd() * ds.length), right = ds[p];
      const others = shuffleR([...new Set([...ds, ...'0123456789'])].filter(x => x !== right), rnd).slice(0, 2);
      const opts = shuffleR([right, ...others], rnd);
      out.push({ t, n, p, opts, ok: opts.indexOf(right) }); continue;
    }
    const nums = shuffleR([n, ...shuffleR(nearMisses(n, rnd), rnd).slice(0, 2)], rnd);
    out.push({ t, n, opts: t === 'n2w' ? nums.map(numWords) : nums, ok: nums.indexOf(n) });
  }
  return out;
}
const expanded = n => String(n).split('').map((d, i, a) => d + '0'.repeat(a.length - 1 - i)).filter(x => x[0] !== '0');

const core = { blank, clean, valid, addDays, num, level, plan, pickPic, openDay, dayDone, currentCity, nextOnRoute, cityDone, stepDone,
               teach, warmIds, rate, deckCounts, startStep, finishStep, stepDayIx, stampIfDone, finishDay, INTERVAL,
               numWords, mathItems, nearMisses, expanded, PLACE_NAMES, seedOf };

/* =====================================================================================================
   What she sees and hears. Each spoken line has a clip in audio/voice.json, deck 'dz' (scripts/algeria_voice.py);
   until a clip exists the words are shown and nothing is said.
   ===================================================================================================== */
const L = {
  title: 'هيا نتعلم في الجزائر', sub: 'مدينة بعد مدينة', go: 'ابدئي رحلة اليوم', tomorrow: 'عودي غداً 🌟', passport: 'جواز سفري',
  visiting: 'أنتِ الآن في', coming: 'المدينة التالية قريبًا', comingSub: 'ماما تُحضّر لكِ المدينة التالية.',
  arrive: 'وصلنا!', readPost: 'اقرئي البطاقة بصوتٍ عالٍ.', listen: 'اسمعي', next: 'التالي',
  warm: 'هيا نتذكّر!', newCard: 'بطاقة جديدة', flip: 'اقلبي البطاقة', good: 'عرفتُها', again: 'مرّةً أخرى',
  step: 'خطوة جديدة', watch: 'انظري واستمعي.', yourTurn: 'دورُكِ! أكملي الجزء الناقص.', alone: 'والآن وحدَكِ!',
  well: 'أحسنتِ!', think: 'فكّري مرّةً أخرى.', look: 'انظري إلى الجواب.', rule: 'تعلّمتُ',
  whatKind: 'ما نوعُ الكلمة؟', pickWords: 'اختاري الكتابةَ الصحيحة.', pickNum: 'اختاري العدد الصحيح.', pickDigit: 'اختاري الرقم الصحيح.', more: 'تدرّبي أكثر ✏️',
  okToday: 'أحسنتِ! نجحتِ اليوم في هذه الخطوة.', okDone: 'أتقنتِ هذه الخطوة! 🌟', notYet: 'سنتدرّب عليها مرّةً أخرى، وستصيرُ سهلة.',
  pic: 'صورة اليوم', talkAbout: 'تكلّمي عن:', writeAbout: 'اكتبي عن:', startWith: 'ابدئي بكلمة: أرى…', mic: 'اضغطي وتكلّمي', micStop: 'انتهيتُ من الكلام',
  mine: 'صوتي', done: 'انتهيتُ ✓', model: 'اسمعي هذا الوصف.', w1: 'اكتبي في كرّاستِكِ', w2: 'صوّري صفحتَكِ', w3: 'اقرئي ما كتبتِ (إن شئتِ)',
  photoIt: 'صوّري الصفحة', photoAgain: 'صورة أخرى', read: 'اضغطي واقرئي', myPage: 'صفحتي',
  easy: 'وهذا سؤالٌ سهل!', stamp: 'ختمٌ جديد في جوازِ سفرِكِ!', stampSub: 'أنهيتِ مدينة', nextCity: 'المدينة التالية:',
  end: 'أحسنتِ اليوم!', toMap: 'إلى الخريطة', noMic: 'الميكروفون مغلق. اطلبي من ماما أن تسمح به.', noPhoto: 'هذه الصورة لا تفتح، جرّبي مرّة أخرى.',
  empty: 'لا يوجد ختم بعد', places: 'جدول المراتب'
};
const CAT = { n: 'اسم', f: 'فعل', h: 'حرف' };
const catOf = k => (k === 'f' || k === 'h' ? k : 'n');
const STEPS_BAR = [['warm', '🔁'], ['step', '✏️'], ['pic', '🖼️'], ['easy', '⭐']];

/* =====================================================================================================
   The screens. api comes from app.js: today, lsGet, lsSet, show, toast, SFX, confetti, stopConfetti, reduced, DEV,
   holdToOpen, backup, restore, apps, appsChip, stopEnglish, setDeck.
   ===================================================================================================== */
function mount(api) {
  const $ = (s, el = document) => el.querySelector(s);
  const KEY = 'tc:maria:algeria';
  const today = () => api.today();
  let r = load(), D = null, CLIPS = {}, S = null;
  let MC = null;   // the maths corner (algeria-maths.js), mounted below
  function load() { try { return clean(JSON.parse(api.lsGet(KEY) || 'null')); } catch (e) { return blank(); } }
  function save() { api.lsSet(KEY, JSON.stringify(r)); }
  const ready = Promise.all([
    fetch('algeria.json').then(x => x.json()).then(d => { D = d; }),
    fetch('audio/voice.json').then(x => (x.ok ? x.json() : null)).then(v => { CLIPS = (v && v.decks && v.decks.dz && v.decks.dz.clips) || {}; }).catch(() => {})
  ]).catch(e => { console.warn('Algeria trip could not load', e); });
  const city = id => D && D.cities.find(c => c.id === id);
  const live = s => S === s;

  /* ---------- the voice (one audio element, as in the other apps) ---------- */
  const au = new Audio(); au.preload = 'auto';
  let tok = 0, pending = null, SRC = null;
  function stopAudio() {
    tok++; try { au.pause(); } catch (e) {}
    if (SRC) { try { SRC.stop(); } catch (e) {} SRC = null; }
    if (pending) { const p = pending; pending = null; p(); }
  }
  function play(url) {
    stopAudio();
    if (!url) return Promise.resolve();
    const t = ++tok;
    return new Promise(res => {
      pending = res;
      const end = () => { if (t === tok && pending === res) { pending = null; res(); } };
      au.onended = end; au.onerror = end; au.src = url;
      const p = au.play(); if (p && p.catch) p.catch(err => { if (err && err.name === 'AbortError') return; end(); });
    });
  }
  const urls = new Map();
  function clipUrl(id) {
    const c = CLIPS[id]; if (!c) return Promise.resolve(null);
    if (!urls.has(id)) {
      const p = fetch('audio/' + c.f).then(x => { if (!x.ok) throw new Error(x.status); return x.blob(); }).then(b => URL.createObjectURL(new Blob([b], { type: 'audio/mp4' })));
      urls.set(id, p); p.catch(() => urls.delete(id));
    }
    return urls.get(id).catch(() => null);
  }
  const has = id => !!CLIPS[id];
  let unlocked = false;     // iPad: the voice may only start after a tap, so the first tap plays a silent clip
  function unlock() { if (unlocked) return; unlocked = true; try { au.src = 'audio/_unlock.m4a'; const p = au.play(); if (p && p.catch) p.catch(() => { unlocked = false; }); } catch (e) { unlocked = false; } }
  const say = id => (has(id) ? clipUrl(id).then(u => play(u)) : Promise.resolve());
  const sayFor = (id, ms) => (has(id) ? say(id) : sleep(ms));
  const uiClip = k => 'u-' + k;

  /* ---------- her recordings and the photos of her pages (IndexedDB, this iPad only) ---------- */
  const DB = 'algeria-trip';
  function openDB() {
    return new Promise((ok, bad) => {
      if (!root.indexedDB) return bad(new Error('no IndexedDB'));
      const q = indexedDB.open(DB, 1);
      q.onupgradeneeded = () => { const d = q.result; ['clips', 'pages'].forEach(s => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); }); };
      q.onsuccess = () => ok(q.result); q.onerror = () => bad(q.error);
    });
  }
  async function idb(store, mode, fn) {
    const d = await openDB();
    return new Promise((ok, bad) => {
      const tx = d.transaction(store, mode), q = fn(tx.objectStore(store));
      tx.oncomplete = () => { d.close(); ok(q && 'result' in q ? q.result : undefined); }; tx.onerror = () => { d.close(); bad(tx.error); };
    });
  }
  const getRow = (st, id) => idb(st, 'readonly', s => s.get(id)).catch(() => null);
  const allRows = st => idb(st, 'readonly', s => s.getAll()).catch(() => []);
  const putRow = (st, row) => idb(st, 'readwrite', s => s.put(row));
  // a photo of her page is made smaller first (a 1280 px JPEG), so the backup stays light
  function shrinkPhoto(file) {
    return new Promise((ok, bad) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        URL.revokeObjectURL(url);
        const k = Math.min(1, 1280 / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        c.toBlob(b => (b ? ok(b) : bad(new Error('no picture'))), 'image/jpeg', 0.84);
      };
      im.onerror = () => { URL.revokeObjectURL(url); bad(new Error('not a picture')); };
      im.src = url;
    });
  }

  /* ---------- the microphone: one recording at a time (her quiet voice is made louder when it plays) ---------- */
  const canRecord = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && root.MediaRecorder && root.indexedDB);
  let REC = null, AC = null;
  function ac() {
    if (!AC) { const C = root.AudioContext || root.webkitAudioContext; AC = C ? new C() : null; }
    if (AC && AC.state !== 'running') { try { AC.resume(); } catch (e) {} }
    return AC;
  }
  async function record(maxMs, onLevel) {
    stopAudio();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(x => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(x)) || '';
    const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined), chunks = [];
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise(ok => { mr.onstop = ok; });
    let meter = null, raf = 0;
    try {
      const ctx = ac(), an = ctx.createAnalyser(), srcN = ctx.createMediaStreamSource(stream), buf = new Uint8Array(256);
      an.fftSize = 512; srcN.connect(an); meter = { srcN };
      const loop = () => { an.getByteTimeDomainData(buf); let pk = 0; for (const v of buf) pk = Math.max(pk, Math.abs(v - 128)); if (onLevel) onLevel(Math.min(1, pk / 60)); raf = requestAnimationFrame(loop); };
      loop();
    } catch (e) {}
    mr.start(); REC = { mr, t0: performance.now() };
    const auto = setTimeout(() => { try { mr.stop(); } catch (e) {} }, maxMs);
    await stopped;
    clearTimeout(auto); cancelAnimationFrame(raf); if (meter) { try { meter.srcN.disconnect(); } catch (e) {} }
    stream.getTracks().forEach(x => x.stop());
    const ms = performance.now() - REC.t0; REC = null;
    const blob = new Blob(chunks, { type: mr.mimeType || type || 'audio/mp4' });
    return blob.size > 800 && ms > 500 ? { blob, ms } : null;
  }
  const stopRec = () => { if (REC) { try { REC.mr.stop(); } catch (e) {} } };
  async function decode(blob) {
    const ctx = ac(); if (!ctx) throw new Error('no audio');
    const ab = await blob.arrayBuffer();
    return new Promise((ok, bad) => { const p = ctx.decodeAudioData(ab, ok, bad); if (p && p.then) p.then(ok, bad); });
  }
  function gainOf(buf) {
    const d = buf.getChannelData(0); let pk = 0;
    for (let i = 0; i < d.length; i += 4) pk = Math.max(pk, Math.abs(d[i]));
    return Math.max(1, Math.min(8, 0.85 / Math.max(pk, 0.02)));
  }
  async function keepClip(id, rec, kind, extra = {}) {
    let g = 1;
    try { g = gainOf(await decode(rec.blob)); } catch (e) {}
    await putRow('clips', { id, blob: rec.blob, type: rec.blob.type, at: Date.now(), ms: Math.round(rec.ms), g, kind, ...extra });
  }
  const BUF = new Map();
  async function playMine(id) {
    stopAudio();
    const t = tok, row = await getRow('clips', id); if (!row || t !== tok) return;
    try {
      const ctx = ac();
      let b = BUF.get(id); if (!b) { b = await decode(row.blob); BUF.set(id, b); }
      if (t !== tok) return;
      const s = ctx.createBufferSource(), g = ctx.createGain();
      g.gain.value = row.g || 1; s.buffer = b; s.connect(g); g.connect(ctx.destination); SRC = s;
      return await new Promise(ok => { pending = ok; s.onended = () => { if (pending === ok) { pending = null; ok(); } }; s.start(); });
    } catch (e) { return play(URL.createObjectURL(row.blob)); }
  }
  // the big round microphone button: tap to start, tap again to stop; the recording is kept under `id`
  function micButton(el, id, kind, extra, onDone) {
    el.addEventListener('click', async () => {
      api.SFX.init(); ac();
      if (REC) { stopRec(); return; }
      if (!canRecord()) { api.toast(L.noMic); return; }
      el.classList.add('rec'); el.querySelector('b').textContent = L.micStop;
      let rec = null;
      try { rec = await record(120000, v => el.style.setProperty('--lv', v.toFixed(2))); } catch (e) { api.toast(L.noMic); }
      el.classList.remove('rec'); el.style.removeProperty('--lv'); el.querySelector('b').textContent = el.dataset.label;
      if (rec) { BUF.delete(id); await keepClip(id, rec, kind, extra); if (onDone) onDone(); }
    });
  }

  /* ---------- markup ---------- */
  const ic = (id, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const N = n => `<span class="dz-n" dir="ltr">${esc(num(n))}</span>`;
  document.body.insertAdjacentHTML('beforeend', `
<section id="dzhome" class="screen dz dz-home" dir="rtl" lang="ar" hidden>
  <button class="gear" id="dzGear" aria-label="Mama: press and hold">
    <svg class="ring" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="24"/></svg>${ic('i-gear', 'cog')}
  </button>
  <header class="dz-head">
    <img class="dz-logo" src="assets/apps/algeria.webp" alt="" onerror="this.style.visibility='hidden'">
    <div class="dz-titles"><h1>${L.title}</h1><p>${L.sub}</p></div>
  </header>
  <div class="dz-main">
    <div class="dz-mapbox"><div class="dz-map" id="dzMap"></div></div>
    <div class="dz-side">
      <div class="dz-here" id="dzHere"></div>
      <button class="dz-go" id="dzGo"><span class="dz-plane" aria-hidden="true">✈️</span><b id="dzGoLabel"></b></button>
      <button class="dz-btn soft" id="dzPassBtn"><span aria-hidden="true">🛂</span> ${L.passport}</button>
      <button class="dz-btn mc-btn" id="dzMathBtn"><span aria-hidden="true">🧮</span> ركن الرياضيات</button>
    </div>
  </div>
</section>
<section id="dzsess" class="screen dz dz-sess" dir="rtl" lang="ar" hidden>
  <div class="dz-top">
    <button class="quit" id="dzQuit" aria-label="الرئيسية">${ic('i-close')}</button>
    <div class="dz-steps" id="dzSteps" aria-hidden="true"></div>
    <div class="dz-cityname" id="dzCityName"></div>
  </div>
  <div class="dz-stage" id="dzStage"></div>
</section>
<section id="dzpass" class="screen dz dz-pass" dir="rtl" lang="ar" hidden></section>
<section id="dzparent" class="screen dz dz-parent" dir="ltr" lang="en" hidden></section>
<section id="dzCel" class="overlay dz dz-cel" dir="rtl" lang="ar" hidden><canvas id="dzConfetti" aria-hidden="true"></canvas><div class="dz-celbox" id="dzCelBox"></div></section>
<input type="file" id="dzCam" accept="image/*" capture="environment" hidden>`);

  const stage = $('#dzStage');
  const pane = (html, cls = '') => { stage.innerHTML = `<div class="dz-pane ${cls}">${html}</div>`; return stage.firstElementChild; };
  if (api.appsChip) {   // the way back to her entrance page
    const row = document.createElement('div'); row.className = 'deck-row';
    const b = api.appsChip(); b.addEventListener('click', () => { leave(); api.apps(); });
    row.append(b); $('#dzhome').append(row);
  }

  /* =====================================================================================================
     The map: Algeria (the trip-world picture made in ChatGPT, or the outline drawn from the country's border),
     with the cities on the route; stamped cities glow, the one she is visiting pulses, the plane sits on it
     ===================================================================================================== */
  function mapHTML(small = false) {
    const here = nextOnRoute(r, D);
    const dots = D.cities.map(c => {
      const cls = r.stamps[c.id] ? 'done' : here && c.id === here.id ? 'here' : 'later';
      return `<span class="dz-city ${cls}" style="left:${c.x}%;top:${c.y}%"><i></i>${small || cls === 'later' ? '' : `<b>${esc(c.name)}</b>`}</span>`;
    }).join('');
    const path = D.cities.filter(c => r.stamps[c.id] || (here && c.id === here.id));
    const line = path.length > 1 ? `<svg class="dz-route" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${path.map(c => `${c.x},${c.y}`).join(' ')}"/></svg>` : '';
    const plane = here ? `<span class="dz-myplane" style="left:${here.x}%;top:${here.y}%">✈️</span>` : '';
    return `<div class="dz-mapart"><img src="assets/algeria/map.webp" alt="خريطة الجزائر" onerror="this.onerror=null;this.src='assets/algeria/outline.svg'">${line}${dots}${plane}</div>`;
  }

  /* =====================================================================================================
     Home
     ===================================================================================================== */
  async function home() {
    await ready;
    leave();
    if (api.stopEnglish) api.stopEnglish();
    if (api.setDeck) api.setDeck('dz');
    document.body.dataset.profile = 'maria';
    if (!D) { api.toast('هذا التطبيق لم يفتح. اتصلي بالإنترنت مرة واحدة.'); return; }
    const t = today(), done = dayDone(r, t), here = nextOnRoute(r, D);
    $('#dzMap').innerHTML = mapHTML();
    $('#dzHere').innerHTML = here && here.ready
      ? `<small>${L.visiting}</small><strong>${esc(here.name)}</strong><em>${esc(here.nick)}</em>`
      : here ? `<small>${L.nextCity}</small><strong>${esc(here.name)}</strong><em>${L.coming}</em>` : '';
    $('#dzGoLabel').textContent = done ? L.tomorrow : L.go;
    $('#dzGo').disabled = done; $('#dzGo').classList.toggle('done', done);
    api.show('dzhome');
  }

  /* =====================================================================================================
     The daily session
     ===================================================================================================== */
  function stepsBar(k) {
    $('#dzSteps').innerHTML = STEPS_BAR.map(([key, e], i) => `<i class="${i < k ? 'done' : i === k ? 'on' : ''}">${e}</i>`).join('');
  }
  async function start() {
    await ready; if (!D) return;
    api.SFX.init(); ac(); unlock();
    const t = today();
    if (dayDone(r, t)) return home();
    const day = openDay(r, D, t); save();
    S = { t, day, wrong: 0 };
    const c = city(day.city) || lastStamped(r, D);
    $('#dzCityName').textContent = c ? c.name : '';
    api.show('dzsess');
    run(S);
  }
  async function run(s) {
    const d = s.day;
    if (d.arrive && !r.arrived[d.city]) { stepsBar(0); await postcard(s); if (!live(s)) return; }
    stepsBar(0); await warmUp(s); if (!live(s)) return;
    if (d.step) { stepsBar(1); await doStep(s); if (!live(s)) return; }
    stepsBar(2); await picture(s); if (!live(s)) return;
    stepsBar(3); await easyOne(s); if (!live(s)) return;
    finishDay(r, s.t);
    const stamped = stampIfDone(r, D, s.t); save();
    if (stamped) { await stampMoment(s, stamped); if (!live(s)) return; }
    await endScreen(s);
  }
  const waitClick = (el, sel) => new Promise(ok => el.querySelector(sel).addEventListener('click', () => { api.SFX.init(); ok(); }, { once: true }));
  // after an answer: «التالي» appears and she taps it herself (her rule: the app never moves on by itself)
  function tapNext(P) {
    let row = P.querySelector('.dz-nextrow');
    if (!row) { row = document.createElement('div'); row.className = 'dz-row dz-nextrow'; P.append(row); }
    row.innerHTML = `<button class="dz-big" id="dzNextA">${L.next}</button>`;
    return waitClick(row, '#dzNextA').then(() => { stopAudio(); row.innerHTML = ''; });
  }
  // a part of the session that plays in steps stops when she moves on before it ends
  const partOf = s => { const k = (s.part = (s.part || 0) + 1); return () => live(s) && s.part === k; };

  /* ---------- the postcard: the first day in a city ---------- */
  async function postcard(s) {
    const c = city(s.day.city);
    const P = pane(`
      <div class="dz-post">
        <div class="dz-post-stamp" aria-hidden="true"><img src="assets/algeria/stamps/${c.id}.webp" alt="" onerror="this.remove()"></div>
        <h2>${L.arrive} ✈️ <span>${esc(c.name)}</span></h2>
        <p class="dz-hint">${L.readPost}</p>
        <div class="dz-post-text" id="dzPostText">${c.post.map(p => `<p data-id="${p.id}">${esc(p.t)}</p>`).join('')}</div>
      </div>
      <div class="dz-row"><button class="dz-big" id="dzNext">${L.next}</button></div>`, 'post');
    say(uiClip('readPost'));
    await waitClick(P, '#dzNext'); stopAudio();
    r.arrived[c.id] = s.t; teach(r, D, c.cards); save();
  }

  /* ---------- the warm-up: Talk Cards' flip card, tick and cross ---------- */
  function cardFront(c) {
    if (c.mark) return `<div class="dz-cq"><p class="dz-sent">${esc(c.f).replace(esc(c.mark), `<mark>${esc(c.mark)}</mark>`)}</p><p class="dz-ask">${esc(c.ask)}</p></div>`;
    if (c.num) return `<div class="dz-cq"><p class="dz-ask">${esc(c.f)}</p><p class="dz-bignum"><span class="dz-n" dir="ltr">${esc(c.num)}</span></p></div>`;
    return `<div class="dz-cq">${c.photo ? `<img class="dz-cphoto" src="${c.photo}" alt="">` : ''}<p class="dz-ask big">${esc(c.f)}</p></div>`;
  }
  function cardBack(c) {
    const b = esc(c.b);
    return `<div class="dz-ca">${c.photo && c.deck === 'dz' && c.id !== 'dz2' ? `<img class="dz-cphoto sm" src="${c.photo}" alt="">` : ''}<p class="dz-ans">${b}</p>${c.s ? `<p class="dz-more">${esc(c.s)}</p>` : ''}</div>`;
  }
  async function warmUp(s) {
    const queue = warmIds(r, D, s.t); if (!queue.length) return;
    const seenAgain = new Set();
    const P = pane(`<h2 class="dz-h">${L.warm}</h2><div class="dz-cardstage" id="dzCardStage"></div>
      <div class="dz-cardacts"><button class="btn btn-flip dz-flip" id="dzFlip">${ic('i-turn')}${L.flip}</button>
      <div class="rate" id="dzRate" hidden><button class="btn btn-again" id="dzAgain">${ic('i-cross', 'ic-cross')}<span class="lbl">${L.again}</span></button>
      <button class="btn btn-good" id="dzGood">${ic('i-tick', 'ic-tick')}<span class="lbl">${L.good}</span></button></div></div>`, 'warm');
    sayFor(uiClip('warm'), 500);
    while (queue.length && live(s)) {
      const id = queue.shift(), c = D.cards[id], isNew = !r.cards[id];
      $('#dzCardStage').innerHTML = `<div class="card-wrap enter"><div class="card-shadow"></div><div class="card-lift"><div class="card" id="dzCard" role="button" aria-label="${L.flip}">
        <div class="face front"><span class="dz-deck">${esc(D.decks[c.deck])}${isNew ? ` · ${L.newCard}` : ''}</span>${cardFront(c)}</div>
        <div class="face back"><span class="dz-deck">${esc(D.decks[c.deck])}</span>${cardBack(c)}</div></div></div></div>`;
      $('#dzRate').hidden = true; $('#dzFlip').hidden = false;
      await sleep(250); if (!live(s)) return;
      await new Promise(ok => {
        const flip = () => { api.SFX.init(); $('#dzCard').classList.add('flipped'); $('#dzFlip').hidden = true; $('#dzRate').hidden = false; ok(); };
        $('#dzCard').addEventListener('click', flip, { once: true }); $('#dzFlip').onclick = flip;
      });
      const good = await new Promise(ok => { $('#dzGood').onclick = () => ok(true); $('#dzAgain').onclick = () => ok(false); });
      api.SFX.init(); stopAudio();
      rate(r, id, good, s.t); save();
      if (good) api.SFX.good(); else if (!seenAgain.has(id)) { seenAgain.add(id); queue.push(id); }   // once more at the end, as in Talk Cards
      await sleep(260);
    }
  }

  /* ---------- the new step ---------- */
  async function doStep(s) {
    const st = D.steps[s.day.step], k = stepDayIx(r, st.id, s.t), first = !(r.steps[st.id] && r.steps[st.id].days.length);
    startStep(r, D, st.id, s.t); save();
    s.wrong = 0; s.total = 0;
    const head = part => `<div class="dz-stephead"><span class="dz-chip ${st.subj}">${st.subj === 'ar' ? 'عربية' : 'رياضيات'}</span><h2>${esc(st.title)}</h2><span class="dz-part">${part}</span></div>`;
    if (st.kind === 'tag') await tagStep(s, st, k, first, head); else await numStep(s, st, k, first, head);
    if (!live(s)) return;
    const res = finishStep(r, D, st.id, s.t, s.wrong, s.total); save();
    let round = 0;
    for (;;) {
      const P = pane(`<div class="dz-result ${res.ok ? 'ok' : ''}"><span class="dz-reic">${res.done ? '🌟' : res.ok ? '✓' : '🌱'}</span>
        <p>${res.done ? L.okDone : res.ok ? L.okToday : L.notYet}</p></div>
        <div class="dz-row">${st.subj === 'ma' ? `<button class="dz-btn soft" id="dzMore">${L.more}</button>` : ''}<button class="dz-big" id="dzNext">${L.next}</button></div>`);
      if (!round) { if (res.ok) api.SFX.good(); sayFor(uiClip(res.done ? 'okDone' : res.ok ? 'okToday' : 'notYet'), 900); }
      const more = await new Promise(ok => { P.querySelector('#dzNext').onclick = () => ok(false); const m = P.querySelector('#dzMore'); if (m) m.onclick = () => ok(true); });
      api.SFX.init(); stopAudio();
      if (!more || !live(s)) break;
      round++;   // more practice, as often as she likes: it never counts against the step
      const pr = st.practice, dg = pr.digits[Math.min(k + 1, pr.digits.length - 1)];
      await mathRound(s, mathItems(seedOf(s.t + st.id + round), pr.more, dg), head(L.more), false);
      if (!live(s)) return;
    }
  }
  // three coloured buttons: اسم / فعل / حرف
  const catBtns = st => `<div class="dz-cats">${st.cats.map(([k, t]) => `<button class="dz-cat c-${k}" data-k="${k}">${t}</button>`).join('')}</div>`;
  const wordChips = (ws, shown, cur) => ws.map((w, i) => `<span class="dz-w${shown[i] ? ' c-' + catOf(w.k) : ''}${i === cur ? ' cur' : ''}" data-i="${i}"><b>${esc(w.w)}</b><small>${shown[i] ? CAT[catOf(w.k)] : i === cur ? '؟' : ''}</small></span>`).join('');
  function ruleBox(st) {
    return `<div class="dz-rule"><h3>${L.rule}</h3>${st.rule.map(x => `<p class="${x.k ? 'c-' + x.k : ''}" data-id="${x.id}">${esc(x.t)}</p>`).join('')}</div>`;
  }
  async function readRule(P) {
    for (const el of P.querySelectorAll('.dz-rule p')) { el.classList.add('on'); await sayFor(el.dataset.id, 2400); el.classList.remove('on'); }
  }
  async function tagStep(s, st, k, first, head) {
    // 1 watch and listen: the sentence, then each word lights up with its kind
    const sid = st.worked[k % st.worked.length], ws = D.sent[sid], shown = ws.map(() => false);
    let P = pane(`${head(L.watch)}<div class="dz-sentence" id="dzSent">${wordChips(ws, shown, -1)}</div><div id="dzRuleSlot"></div>
      <div class="dz-row"><button class="dz-big" id="dzNext">${L.next}</button></div>`, 'step');
    const next = waitClick(P, '#dzNext').then(() => stopAudio());
    const alive = partOf(s);
    (async () => {
      await sayFor(uiClip('watch'), 700); if (!alive()) return;
      await sayFor('s-' + sid, 2000);
      for (let i = 0; i < ws.length && alive(); i++) {
        shown[i] = true; P.querySelector('#dzSent').innerHTML = wordChips(ws, shown, i);
        await sayFor(ws[i].id, 600); if (!alive()) return;
        await sayFor('y-' + ws[i].k, 1500);
      }
      if (!alive()) return;
      P.querySelector('#dzSent').innerHTML = wordChips(ws, shown, -1);
      P.querySelector('#dzRuleSlot').innerHTML = ruleBox(st);
    if (first) { await readRule(P); if (!alive()) return; }
    })();
    await next; partOf(s); if (!live(s)) return;

    // 2 your turn: every word has its kind but one
    const [gid, gi] = st.guided[k % st.guided.length], gw = D.sent[gid], gshown = gw.map((_, i) => i !== gi);
    P = pane(`${head(L.yourTurn)}<div class="dz-sentence" id="dzSent">${wordChips(gw, gshown, gi)}</div><p class="dz-q">${L.whatKind}</p>${catBtns(st)}<div class="dz-fb" id="dzFb"></div>`, 'step');
    say(uiClip('yourTurn'));
    await askKind(s, P, gw[gi], false, () => { gshown[gi] = true; $('#dzSent').innerHTML = wordChips(gw, gshown, -1); });
    if (!live(s)) return;

    // 3 alone: two sentences, every word
    const pair = st.alone[k % st.alone.length];
    for (let n = 0; n < pair.length && live(s); n++) {
      const aw = D.sent[pair[n]], ash = aw.map(() => false);
      P = pane(`${head(L.alone)}<div class="dz-sentence" id="dzSent">${wordChips(aw, ash, 0)}</div><p class="dz-q">${L.whatKind}</p>${catBtns(st)}<div class="dz-fb" id="dzFb"></div>`, 'step');
      if (n === 0) say(uiClip('alone'));
      for (let i = 0; i < aw.length && live(s); i++) {
        $('#dzSent').innerHTML = wordChips(aw, ash, i);
        await askKind(s, P, aw[i], true, () => { ash[i] = true; $('#dzSent').innerHTML = wordChips(aw, ash, -1); });
      }
    }
  }
  // one word: she taps a kind. Guided: two tries, then the answer. Alone: one try (a mistake is counted), then the answer.
  function askKind(s, P, w, alone, onRight) {
    return new Promise(ok => {
      let tries = 0; const want = catOf(w.k);
      const box = P.querySelector('.dz-cats'), fb = P.querySelector('#dzFb');
      box.querySelectorAll('button').forEach(b => { b.disabled = false; b.classList.remove('no', 'yes'); });
      fb.textContent = '';
      box.onclick = async e => {
        const b = e.target.closest('[data-k]'); if (!b || b.disabled || !live(s)) return;
        api.SFX.init(); tries++;
        if (alone) s.total += tries === 1 ? 1 : 0;
        if (b.dataset.k === want) {
          b.classList.add('yes'); onRight(); api.SFX.good(); fb.textContent = L.well;
          box.onclick = null; box.querySelectorAll('button').forEach(x => { x.disabled = true; });
          await tapNext(P); ok(); return;
        }
        b.classList.add('no'); b.disabled = true;
        if (alone || tries >= 2) {
          if (alone) s.wrong++;
          box.onclick = null; box.querySelectorAll('button').forEach(x => { x.disabled = true; if (x.dataset.k === want) x.classList.add('yes'); });
          fb.textContent = L.look; onRight();
          await tapNext(P); ok(); return;
        }
        fb.textContent = L.think; say(uiClip('think'));
      };
    });
  }

  /* ---------- the maths step: numbers in words ---------- */
  function placeTable(n, lit) {
    const digits = String(n).padStart(5, ' ').split('');
    return `<table class="dz-places"><caption>${L.places}</caption><tr>${D.places.map((p, i) => `<th class="${i < 2 ? 'th' : 'un'}">${p[0]}</th>`).join('')}</tr>
      <tr dir="ltr">${digits.map((d, i) => `<td class="${i < 2 ? 'th' : 'un'}${lit === 'th' && i < 2 ? ' lit' : lit === 'un' && i >= 2 ? ' lit' : ''}">${num(d.trim())}</td>`).join('')}</tr></table>`;
  }
  // the number with its thousands (blue) and its units (green), as in the place-value table
  function grouped(n) {
    const s = String(n), k = Math.max(0, s.length - 3);
    return `<span class="dz-n" dir="ltr">${k ? `<b class="g-th">${num(s.slice(0, k))}</b>` : ''}<b class="g-un">${num(s.slice(k))}</b></span>`;
  }
  async function numStep(s, st, k, first, head) {
    // 1 watch and listen
    const ex = st.worked[k % st.worked.length], [th, un] = ex.parts;
    let P = pane(`${head(L.watch)}<div class="dz-numrow"><p class="dz-bignum">${grouped(ex.n)}</p>${placeTable(ex.n, '')}</div>
      <div class="dz-read"><span class="dz-grp th" id="dzTh">${th[1] ? esc(th[1]) : ''}</span> <span class="dz-grp un" id="dzUn">${esc(un[1])}</span></div>
      <div id="dzRuleSlot"></div><div class="dz-row"><button class="dz-big" id="dzNext">${L.next}</button></div>`, 'step num');
    const next = waitClick(P, '#dzNext').then(() => stopAudio());
    const alive = partOf(s), live_ = live;
    const showWorked = async () => {
      const live = () => alive();
      await sayFor(uiClip('watch'), 700); if (!live(s)) return;
      if (th[0]) { P.querySelector('.dz-places').outerHTML = placeTable(ex.n, 'th'); $('#dzTh').classList.add('on'); }
      if (first) { await sayFor('r-ma2-2', 2200); if (!live(s)) return; }
      await sleep(400);
      if (th[0]) { P.querySelector('.dz-places').outerHTML = placeTable(ex.n, 'un'); $('#dzTh').classList.remove('on'); }
      $('#dzUn').classList.add('on');
      if (first) { await sayFor('r-ma2-3', 1800); if (!live(s)) return; }
      $('#dzTh').classList.add('on');
      await sayFor('n-' + ex.n, 2600);
      $('#dzTh').classList.remove('on'); $('#dzUn').classList.remove('on');
      P.querySelector('.dz-places').outerHTML = placeTable(ex.n, '');
      P.querySelector('#dzRuleSlot').innerHTML = ruleBox(st);
    };
    (async () => { if (first) { await sayFor('r-ma2-1', 2400); if (!alive()) return; } await showWorked(); })();
    await next; partOf(s); if (!live_(s)) return;

    // 2 your turn: one part of the words is missing
    const g = st.guided[k % st.guided.length];
    P = pane(`${head(L.yourTurn)}<p class="dz-bignum">${N(g.n)}</p>
      <p class="dz-words">${g.parts.map((w, i) => (i === g.blank ? '<span class="dz-blank" id="dzBlank">؟</span>' : `<span>${esc(w)}</span>`)).join(' ')}</p>
      <div class="dz-opts" id="dzOpts">${g.opts.map((o, i) => `<button class="dz-opt" data-i="${i}">${esc(o)}</button>`).join('')}</div><div class="dz-fb" id="dzFb"></div>`, 'step num');
    say(uiClip('yourTurn'));
    await choose(s, P, g.opts.indexOf(g.parts[g.blank]), false, () => { $('#dzBlank').textContent = g.parts[g.blank]; $('#dzBlank').classList.add('filled'); });
    if (!live(s)) return;

    // 3 alone: generated practice, from smaller numbers on her first day to five digits
    const pr = st.practice, dg = pr.digits[Math.min(k, pr.digits.length - 1)];
    await mathRound(s, mathItems(seedOf(s.t + st.id), pr.perDay, dg), head(L.alone), true);
  }
  // a round of practice items; alone = mistakes count for the step (the «تدرّبي أكثر» rounds never count)
  async function mathRound(s, items, top, alone) {
    for (let n = 0; n < items.length && live(s); n++) {
      const it = items[n];
      let q, opts;
      if (it.t === 'place') {
        q = `<p class="dz-q">ما رقمُ ${PLACE_NAMES[it.p]} في العدد:</p><p class="dz-bignum">${N(it.n)}</p>`;
        opts = it.opts.map((o, i) => `<button class="dz-opt n" data-i="${i}"><span class="dz-n">${num(o)}</span></button>`).join('');
      } else if (it.t === 'n2w') {
        q = `<p class="dz-q">${L.pickWords}</p><p class="dz-bignum">${N(it.n)}</p>`;
        opts = it.opts.map((o, i) => `<button class="dz-opt" data-i="${i}">${esc(o)}</button>`).join('');
      } else {
        q = it.t === 'w2n' ? `<p class="dz-q">${L.pickNum}</p><p class="dz-words big">${esc(numWords(it.n))}</p>`
          : `<p class="dz-q">${L.pickNum}</p><p class="dz-bignum sm"><span class="dz-n" dir="ltr">${expanded(it.n).map(num).join(' + ')}</span></p>`;
        opts = it.opts.map((o, i) => `<button class="dz-opt n" data-i="${i}">${N(o)}</button>`).join('');
      }
      const P = pane(`${top}<p class="dz-count">${num(n + 1)} من ${num(items.length)}</p>${q}<div class="dz-opts${it.t === 'place' ? ' three' : ''}" id="dzOpts">${opts}</div><div class="dz-fb" id="dzFb"></div>`, 'step num');
      if (n === 0 && alone) say(uiClip('alone'));
      await choose(s, P, it.ok, alone, () => {});
    }
  }
  function choose(s, P, ok, alone, onRight) {
    return new Promise(done => {
      let tries = 0; const box = P.querySelector('#dzOpts'), fb = P.querySelector('#dzFb');
      box.onclick = async e => {
        const b = e.target.closest('[data-i]'); if (!b || b.disabled || !live(s)) return;
        api.SFX.init(); tries++;
        if (alone && tries === 1) s.total++;
        if (Number(b.dataset.i) === ok) {
          b.classList.add('yes'); onRight(); api.SFX.good(); fb.textContent = L.well; box.onclick = null;
          box.querySelectorAll('button').forEach(x => { x.disabled = true; });
          await tapNext(P); done(); return;
        }
        b.classList.add('no'); b.disabled = true;
        if (alone || tries >= 2) {
          if (alone) s.wrong++;
          box.onclick = null; box.querySelectorAll('button').forEach(x => { x.disabled = true; if (Number(x.dataset.i) === ok) x.classList.add('yes'); });
          fb.textContent = L.look; onRight(); await tapNext(P); done(); return;
        }
        fb.textContent = L.think; say(uiClip('think'));
      };
    });
  }
  /* ---------- the picture of the day ---------- */
  async function picture(s) {
    const pid = s.day.pic, p = pid && D.pics[pid]; if (!p) return;
    const lv = level(r), write = s.day.write, t = s.t;
    const ask = (write ? D.write : D.say)[lv - 1];
    const cues = `<ol class="dz-cues">${p.cues.map(q => `<li>${esc(q)}</li>`).join('')}</ol>`;
    const recId = `talk-${t}`, pageId = `page-${t}`;
    const stepsW = `<ol class="dz-wsteps"><li id="dzW1"><b>1</b><span>${esc(ask)}</span></li>
      <li id="dzW2"><b>2</b><span>${L.w2}</span><button class="dz-btn" id="dzCamBtn">📷 ${L.photoIt}</button><span class="dz-thumb" id="dzThumb"></span></li>
      <li id="dzW3"><b>3</b><span>${L.w3}</span><button class="dz-mic small" id="dzMic" data-label="${L.read}"><span class="dz-micdot"></span><b>${L.read}</b></button></li></ol>`;
    const stepsS = `<button class="dz-mic" id="dzMic" data-label="${L.mic}"><span class="dz-micdot"></span><b>${L.mic}</b></button>`;
    const P = pane(`<div class="dz-pic">
        <div class="dz-photo"><img src="${p.photo}" alt=""></div>
        <div class="dz-picside">
          <h2 class="dz-h">${L.pic}</h2>
          ${write ? '' : `<p class="dz-ask">${esc(ask)}</p>`}
          <p class="dz-hint">${write ? L.writeAbout : L.talkAbout}</p>${cues}
          ${lv <= 2 ? `<p class="dz-hint">${L.startWith}</p>` : ''}
          ${write ? stepsW : stepsS}
          <button class="dz-big" id="dzDone">${L.done}</button>
        </div></div>`, 'pic');
    r.pics[pid] = t; save();
    await sayFor(`lv-${write ? 'write' : 'say'}-${lv}`, 900);
    micButton(P.querySelector('#dzMic'), recId, write ? 'read' : 'talk', { day: t, pic: pid });
    if (write) {
      const thumb = async () => { const row = await getRow('pages', pageId); if (row) { P.querySelector('#dzThumb').innerHTML = `<img src="${URL.createObjectURL(row.blob)}" alt="">`; P.querySelector('#dzCamBtn').innerHTML = `📷 ${L.photoAgain}`; P.querySelector('#dzW2').classList.add('ok'); } };
      thumb();
      P.querySelector('#dzCamBtn').addEventListener('click', () => { api.SFX.init(); const inp = $('#dzCam'); inp.value = ''; inp.onchange = async () => {
        const f = inp.files && inp.files[0]; if (!f) return;
        try { await putRow('pages', { id: pageId, blob: await shrinkPhoto(f), day: t, pic: pid, level: lv, at: Date.now() }); thumb(); api.SFX.good(); } catch (e) { api.toast(L.noPhoto); }
      }; inp.click(); });
    }
    await waitClick(P, '#dzDone'); stopRec(); stopAudio(); if (!live(s)) return;
    // the model description, at her level, sentence by sentence
    const mine = await getRow('clips', recId), page = write ? await getRow('pages', pageId) : null;
    const lines = p.model.slice(0, lv);
    const Q = pane(`<div class="dz-pic">
        <div class="dz-photo"><img src="${p.photo}" alt="">${page ? `<img class="dz-pagephoto" src="${URL.createObjectURL(page.blob)}" alt="${L.myPage}">` : ''}</div>
        <div class="dz-picside"><h2 class="dz-h">${L.model}</h2>
          <div class="dz-model" id="dzModel">${lines.map((x, i) => `<p data-id="m-${pid}-${i + 1}">${esc(x)}</p>`).join('')}</div>
          <div class="dz-row">${mine ? `<button class="dz-btn soft" id="dzMine">🎧 ${L.mine}</button>` : ''}</div>
          <button class="dz-big" id="dzNext">${L.next}</button></div></div>`, 'pic');
    const readModel = async () => {
      for (const el of Q.querySelectorAll('#dzModel p')) { if (!live(s)) return; Q.querySelectorAll('#dzModel p').forEach(x => x.classList.toggle('on', x === el)); await sayFor(el.dataset.id, 2600); }
      Q.querySelectorAll('#dzModel p').forEach(x => x.classList.remove('on'));
    };
    await sayFor(uiClip('model'), 700); if (live(s)) readModel();
    if (mine) Q.querySelector('#dzMine').addEventListener('click', () => { api.SFX.init(); playMine(recId); });
    const pp = Q.querySelector('.dz-pagephoto'); if (pp) pp.addEventListener('click', () => pp.classList.toggle('big'));
    await waitClick(Q, '#dzNext'); stopAudio();
    teach(r, D, p.teach); save();
  }

  /* ---------- the last item: always easy ---------- */
  async function easyOne(s) {
    const id = s.day.step || (s.day.city && city(s.day.city).steps[s.day.write ? 0 : 1]) || 'ar1';
    const st = D.steps[id] || D.steps.ar1, k = r.n % st.easy.length, e = st.easy[k];
    const P = pane(`<h2 class="dz-h">${L.easy}</h2><p class="dz-q">${esc(e.ask)}</p>
      <div class="dz-opts two" id="dzOpts">${e.opts.map((o, i) => `<button class="dz-opt${/\d/.test(o) ? ' n' : ''}" data-i="${i}">${/\d/.test(o) ? `<span class="dz-n" dir="ltr">${esc(o)}</span>` : esc(o)}</button>`).join('')}</div><div class="dz-fb" id="dzFb"></div>`, 'easy');
    say(uiClip('easy'));
    await choose(s, P, e.ok, false, () => {});
  }

  /* ---------- the stamp: the one quiet reward ---------- */
  async function stampMoment(s, c) {
    const nx = nextOnRoute(r, D);
    $('#dzCelBox').innerHTML = `<div class="dz-stampbig"><img src="assets/algeria/stamps/${c.id}.webp" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'dz-stampfall',textContent:'${esc(c.name)}'}))"></div>
      <h2>${L.stamp}</h2><p>${L.stampSub} ${esc(c.name)}</p>${nx ? `<p class="dz-nx">${L.nextCity} <b>${esc(nx.name)}</b></p>` : ''}
      <button class="dz-big" id="dzCelOk">${L.toMap}</button>`;
    $('#dzCel').hidden = false;
    try { api.confetti($('#dzConfetti')); } catch (e) {}
    api.SFX.unlock && api.SFX.unlock();
    sayFor(uiClip('stamp'), 900);
    await waitClick($('#dzCel'), '#dzCelOk');
    $('#dzCel').hidden = true; try { api.stopConfetti($('#dzConfetti')); } catch (e) {} stopAudio();
  }
  async function endScreen(s) {
    const P = pane(`<div class="dz-end"><div class="dz-endmap">${mapHTML(true)}</div><h2>${L.end}</h2><p class="dz-tom">${L.tomorrow}</p>
      <button class="dz-big" id="dzNext">${L.toMap}</button></div>`, 'end');
    sayFor(uiClip('end'), 600);
    await waitClick(P, '#dzNext'); stopAudio();
    S = null; home();
  }

  /* =====================================================================================================
     Her passport: one page of stamps, one place for each city on the route
     ===================================================================================================== */
  function openPassport() {
    const dAr = ds => { try { return toDate(ds).toLocaleDateString('ar-DZ', { day: 'numeric', month: 'long' }); } catch (e) { return ds; } };
    $('#dzpass').innerHTML = `<div class="dz-top"><button class="quit" id="dzPassQuit" aria-label="الرئيسية">${ic('i-close')}</button><h1 class="dz-ptitle">🛂 ${L.passport}</h1></div>
      <div class="dz-passbook"><div class="dz-passgrid">${D.cities.map(c => r.stamps[c.id]
        ? `<div class="dz-slot got"><img src="assets/algeria/stamps/${c.id}.webp" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'dz-stampfall',textContent:'${esc(c.name)}'}))"><b>${esc(c.name)}</b><small>${esc(dAr(r.stamps[c.id]))}</small></div>`
        : `<div class="dz-slot"><span class="dz-slotname">${esc(c.name)}</span><small>${esc(c.nick)}</small></div>`).join('')}</div></div>`;
    $('#dzPassQuit').addEventListener('click', home);
    api.show('dzpass');
  }

  /* =====================================================================================================
     Mama's view (English): hold the gear for 2 seconds
     ===================================================================================================== */
  async function openParent() {
    await ready; if (!D) return;
    stopAudio();
    const t = today(), counts = deckCounts(r, D, t), here = nextOnRoute(r, D);
    const pages = (await allRows('pages')).sort((a, b) => (a.day < b.day ? 1 : -1));
    const clips = (await allRows('clips')).sort((a, b) => b.at - a.at);
    const stepRow = st => { const x = r.steps[st.id] || { days: [], pass: [] };
      return `<tr><td>${st.subj === 'ar' ? 'Arabic' : 'Maths'}</td><td dir="rtl" lang="ar">${esc(st.title)}</td><td>${x.days.length}</td><td>${x.pass.length ? x.pass.join(', ') : '–'}</td>
        <td>${x.done ? '✓ passed' : `<button class="dz-pbtn" data-act="pass" data-id="${st.id}">Mark passed</button>`} <button class="dz-pbtn soft" data-act="redo" data-id="${st.id}">Start again</button></td></tr>`; };
    const lv = level(r);
    $('#dzparent').innerHTML = `<div class="dz-ptop"><button class="quit" id="dzParQuit" aria-label="Back">${ic('i-close')}</button><h1>Mama · ${esc(L.title)}</h1></div>
    <div class="dz-pbody">
      <section><h2>The trip</h2><p>Sessions done: <b>${r.n}</b>. Today: ${dayDone(r, t) ? 'done ✓' : r.days[t] ? 'started' : 'not yet'}.
        ${here ? `Visiting: <span lang="ar">${esc(here.name)}</span>${here.ready ? '' : ' (not built yet: she reviews her cards and gets a picture each day)'}.` : 'Every city stamped.'}</p>
        <p>Stamps: ${Object.keys(r.stamps).length ? D.cities.filter(c => r.stamps[c.id]).map(c => `<span lang="ar">${esc(c.name)}</span> (${r.stamps[c.id]})`).join(', ') : 'none yet'}.</p>
        <p>Next session: <b>${plan(r, D).turn === 'ar' ? 'Arabic step + free writing' : 'maths step + speaking about the picture'}</b>.
          <button class="dz-pbtn soft" data-act="swap">Swap Arabic / maths</button></p></section>
      <section><h2>The steps</h2><table class="dz-ptab"><tr><th>Subject</th><th>Step</th><th>Days</th><th>Passed on</th><th></th></tr>
        ${Object.values(D.steps).map(stepRow).join('')}</table>
        <p class="dz-note">A step is passed after two different days with at most one mistake when she works alone.</p></section>
      <section><h2>Cards</h2><table class="dz-ptab"><tr><th>Deck</th><th>Known</th><th>Learning</th><th>Waiting</th><th>Due today</th></tr>
        ${Object.entries(D.decks).map(([k, n]) => `<tr><td lang="ar">${esc(n)}</td><td>${counts[k].known}</td><td>${counts[k].learning}</td><td>${counts[k].waiting}</td><td>${counts[k].due}</td></tr>`).join('')}</table>
        <p>New cards a day: <button class="dz-pbtn soft" data-act="npd" data-d="-1">−</button> <b>${r.settings.newPerDay}</b> <button class="dz-pbtn soft" data-act="npd" data-d="1">+</button></p></section>
      <section><h2>The picture of the day</h2><p>Description level: <b>${lv}</b> ${lv === 1 ? 'sentence' : lv < 6 ? 'sentences' : 'lines'}
        (${r.settings.level ? 'set by you' : 'automatic: one more every ten sessions'}).
        <button class="dz-pbtn soft" data-act="lv" data-d="-1">−</button> <button class="dz-pbtn soft" data-act="lv" data-d="1">+</button>
        ${r.settings.level ? '<button class="dz-pbtn soft" data-act="lv0">Automatic</button>' : ''}</p></section>
      <section><h2 lang="ar" dir="rtl">كراسة كتاباتي <small lang="en" dir="ltr">(her writing, newest first)</small></h2>
        ${pages.length ? `<div class="dz-pages">${pages.map(p => `<figure><img src="${URL.createObjectURL(p.blob)}" alt="" data-big="1"><figcaption>${esc(p.day)} · level ${p.level || ''}
          ${clips.some(c => c.id === 'talk-' + p.day) ? `<button class="dz-pbtn soft" data-play="talk-${esc(p.day)}">▶ her reading</button>` : ''}</figcaption></figure>`).join('')}</div>` : '<p>No pages yet: she photographs her notebook on Arabic days.</p>'}</section>
      <section><h2>Her talks about the picture</h2>${clips.filter(c => c.kind === 'talk').length ? `<ul class="dz-talks">${clips.filter(c => c.kind === 'talk').map(c => `<li>${esc(c.day || '')} · ${Math.round((c.ms || 0) / 1000)} s <button class="dz-pbtn soft" data-play="${esc(c.id)}">▶ Play</button></li>`).join('')}</ul>` : '<p>No recordings yet (recording is optional).</p>'}</section>
      <section><h2>The maths corner</h2>${(() => { const c = r.corner || {}, T = root.AlgeriaMaths ? root.AlgeriaMaths.core.TOPICS : [];
        const rows = T.filter(t => c[t.id]).map(t => `<tr><td dir="rtl" lang="ar">${esc(t.title)}</td><td>${c[t.id].rounds}</td><td>${c[t.id].total ? Math.round(100 * c[t.id].right / c[t.id].total) : 0}%</td><td>${c[t.id].level} of 3</td><td>${c[t.id].last || ''}</td></tr>`).join('');
        return rows ? `<table class="dz-ptab"><tr><th>Topic</th><th>Rounds</th><th>Right</th><th>Level</th><th>Last</th></tr>${rows}</table>` : '<p>Not used yet. She opens it from the trip\'s home: 15 topics, every maths gap of the report, practice as often as she likes.</p>'; })()}
        <p class="dz-note">Practice only: it never moves the trip on or holds it back.</p></section>
      <section><h2>Backup</h2><p>Her trip, her cards, her pages and her recordings are in the one backup file of the entrance page.</p>
        <button class="dz-pbtn" data-act="backup">Back up all apps</button></section>
    </div>`;
    api.show('dzparent');
  }
  $('#dzparent').addEventListener('click', e => {
    const b = e.target.closest('button, img[data-big]'); if (!b) return;
    if (b.id === 'dzParQuit') return home();
    if (b.dataset.big) { b.classList.toggle('big'); return; }
    if (b.dataset.play) { playMine(b.dataset.play); return; }
    const act = b.dataset.act, st = b.dataset.id && r.steps[b.dataset.id];
    if (act === 'backup') return api.backup && api.backup();
    if (act === 'swap') { r.settings.first = r.settings.first === 'ar' ? 'ma' : 'ar'; }
    if (act === 'npd') r.settings.newPerDay = Math.max(1, Math.min(6, r.settings.newPerDay + Number(b.dataset.d)));
    if (act === 'lv') r.settings.level = Math.max(1, Math.min(6, level(r) + Number(b.dataset.d)));
    if (act === 'lv0') r.settings.level = 0;
    if (act === 'pass') { const x = stepRec(r, b.dataset.id); x.done = x.done || today(); }
    if (act === 'redo') { if (st && !confirm('Start this step again? Its passed days are cleared (her cards stay).')) return; r.steps[b.dataset.id] = { days: [], pass: [], done: null, log: (st && st.log) || [] }; }
    save(); openParent();
  });

  /* ---------- leaving, and the wiring ---------- */
  function leave() { S = null; stopRec(); stopAudio(); $('#dzCel').hidden = true; if (MC) MC.leave(); }
  api.holdToOpen($('#dzGear'), 2000, openParent);
  $('#dzGo').addEventListener('click', () => { if (!$('#dzGo').disabled) { unlock(); ac(); start(); } });
  $('#dzPassBtn').addEventListener('click', () => { api.SFX.init(); unlock(); openPassport(); });
  // ركن الرياضيات (algeria-maths.js): all the maths gaps, a lesson and practice each, any day; it never moves the trip
  MC = root.AlgeriaMaths ? root.AlgeriaMaths.mount({ api, state: () => r, save, back: home }) : null;
  $('#dzMathBtn').hidden = !MC;
  $('#dzMathBtn').addEventListener('click', () => { api.SFX.init(); unlock(); if (MC) MC.open(); });
  $('#dzQuit').addEventListener('click', () => { leave(); home(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopRec(); stopAudio(); } });

  const SCREENS = ['dzhome', 'dzsess', 'dzpass', 'dzparent'];
  return {
    home, ready,
    isOn: () => SCREENS.some(id => !$('#' + id).hidden) || !$('#dzCel').hidden || !!(MC && MC.isOn()),
    busy: () => !!S || !!REC || ['dzsess', 'dzparent'].some(id => !$('#' + id).hidden) || !$('#dzCel').hidden || !!(MC && MC.busy()),
    leave,
    status: () => { const t = today(), c = D && nextOnRoute(r, D); return { done: dayDone(r, t), started: !!r.days[t], city: c ? c.name : '' }; },
    snapshot: () => JSON.parse(JSON.stringify(r)),
    valid,
    replace(obj) { r = clean(obj); save(); },
    // for tests (?dev=1)
    get state() { return r; }, get data() { return D; }, core, openParent, openPassport, start,
    async _part(name, over = {}) {   // run one part of today's session on its own (tests only)
      await ready; const t = today(); const day = { ...openDay(r, D, t), ...over };
      S = { t, day, wrong: 0, total: 0 }; api.show('dzsess');
      await ({ post: postcard, warm: warmUp, step: doStep, pic: picture, easy: easyOne, end: endScreen }[name] || (s => stampMoment(s, city(day.city))))(S);
    }
  };
}

root.AlgeriaTrip = { core, mount };
if (typeof module !== 'undefined') module.exports = { core };
})(typeof window !== 'undefined' ? window : globalThis);
