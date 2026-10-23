/* علبة الفضول (Curiosity Box): Maria practises ASKING questions, not answering them. The fifth app on her entrance page.
   The design follows Mama's spec (Curiosity_Box_Prompt.txt): the Question Formulation Technique (produce, sort closed
   and open, flip one, choose, predict, find out together), open hints of a question word plus two keywords, praise that
   names what she did, and no rewards tied to how many questions she asks.
   Phase 1 (October 2026): the daily session (steps 1 to 5), the question tree, her journal «دفتر أسئلتي», the streak and
   the parent area (English) with the science-lesson link. Content: curiosity.json (scripts/make_curiosity.py).
   Progress: 'tc:maria:curiosity'. Her recordings and Mama's photos stay on the iPad, in IndexedDB 'curiosity-box'
   (they travel only inside the backup file). */
(function (root) {
'use strict';

const AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const pad2 = n => String(n).padStart(2, '0');
const toDate = ds => { const [y, m, d] = ds.split('-').map(Number); return new Date(y, m - 1, d); };
const fmt = x => `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
function addDays(ds, n) { const x = toDate(ds); x.setDate(x.getDate() + n); return fmt(x); }
const dayDiff = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);
const weekday = ds => toDate(ds).getDay();             // 0 = Sunday, as in her rotation
const sleep = ms => new Promise(ok => setTimeout(ok, ms));
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/* =====================================================================================================
   The rules (no DOM, so they can be tested in Node)
   ===================================================================================================== */
function blank() {
  return { v: 1, start: null, days: {}, qs: [], used: {}, queue: [], science: [], own: [], mine: {},
           surprise: { pending: null, given: [] }, seen: { leaves: 0, flowers: 0, fruits: 0 },
           settings: { storm: 180, hintAfter: 10, rules: 'always' } };
}
function clean(o) {
  const b = blank();
  if (!o || typeof o !== 'object') return b;
  const r = { ...b, ...o };
  r.settings = { ...b.settings, ...(o.settings || {}) };
  r.surprise = { ...b.surprise, ...(o.surprise || {}) }; if (!Array.isArray(r.surprise.given)) r.surprise.given = [];
  r.seen = { ...b.seen, ...(o.seen || {}) };
  ['days', 'used', 'mine'].forEach(k => { if (!r[k] || typeof r[k] !== 'object' || Array.isArray(r[k])) r[k] = {}; });
  ['qs', 'queue', 'science', 'own'].forEach(k => { if (!Array.isArray(r[k])) r[k] = []; });
  r.settings.storm = [120, 180].includes(Number(r.settings.storm)) ? Number(r.settings.storm) : 180;
  r.settings.hintAfter = Math.max(5, Math.min(30, Math.round(Number(r.settings.hintAfter)) || 10));
  return r;
}
const valid = o => !!o && typeof o === 'object' && Array.isArray(o.qs) && !!o.days && typeof o.days === 'object';
const isOwn = id => String(id).startsWith('own-');
const themeOf = id => (isOwn(id) ? 'own' : String(id)[0]);
const weekOf = (r, t) => (r.start ? Math.floor(Math.max(0, dayDiff(r.start, t)) / 7) + 1 : 1);
const byId = D => { if (!D._by) { D._by = {}; D.mysteries.forEach(m => { D._by[m.id] = m; }); } return D._by; };
const usable = (r, D, id) => (isOwn(id) ? r.own.some(o => o.id === id) : !!(byId(D)[id] && byId(D)[id].ready));

// the next mystery of a theme: its week-1 mystery first (her list), then her table order; "week 3+" ones wait
function nextInTheme(r, D, th, t) {
  const wk = weekOf(r, t);
  const cand = D.mysteries.filter(m => m.theme === th && m.ready && !r.used[m.id] && (m.weekMin || 1) <= wk);
  const w1 = (D.week1 || []).find(id => id[0] === th && cand.some(m => m.id === id));
  return w1 || (cand[0] ? cand[0].id : null);
}
// her weekly rotation: the weekday chooses the theme; two themes on one day take turns, the first one first
function rotationPick(r, D, t) {
  const wd = weekday(t), themes = D.rotation[wd] || ['A'];
  const met = th => Object.entries(r.days).filter(([d, x]) => d !== t && x && x.m && weekday(d) === wd && themeOf(x.m) === th).length;
  const order = themes.map((th, i) => [th, met(th), i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(x => x[0]);
  for (const th of order) { const id = nextInTheme(r, D, th, t); if (id) return id; }
  for (const th of 'ABCDEFGH') { const id = nextInTheme(r, D, th, t); if (id) return id; }    // that day's themes are used up
  const old = Object.entries(r.used).filter(([id]) => !isOwn(id) && usable(r, D, id) && themeOf(id) !== 'I').sort((a, b) => (a[1] < b[1] ? -1 : 1))[0];
  return old ? old[0] : null;                                                                    // everything met: the oldest comes back
}
// today's mystery: fixed once she opens the box; before that, Mama's queue (science lesson, her own photo, her pick) comes first
function todayPick(r, D, t) {
  if (r.days[t] && r.days[t].m) return r.days[t].m;
  const q = r.queue.find(x => usable(r, D, x.m));
  return q ? q.m : rotationPick(r, D, t);
}
// the mystery after today's (for Mama's "tomorrow" preview: a drawing to photograph, for example)
function tomorrowPick(r, D, t) {
  const x = clean(JSON.parse(JSON.stringify(r)));
  if (!x.days[t] || !x.days[t].m) openDay(x, D, t);
  return todayPick(x, D, addDays(t, 1));
}
function openDay(r, D, t) {
  if (r.days[t] && r.days[t].m) return r.days[t];
  const m = todayPick(r, D, t);
  if (!m) return null;
  r.queue = r.queue.filter(x => x.m !== m);
  r.days[t] = { m, step: 'box', at: Date.now(), done: false };
  if (!r.used[m]) r.used[m] = t;
  if (!r.start) r.start = t;
  return r.days[t];
}
const dayDone = (r, t) => !!(r.days[t] && r.days[t].done);
function streakOf(r, t) {
  let d = dayDone(r, t) ? t : addDays(t, -1), n = 0;
  while (dayDone(r, d)) { n++; d = addDays(d, -1); }
  return n;
}
// the tree: a leaf for every question, a flower for every flipped one, a fruit for every one investigated together
function treeCounts(r) {
  return { leaves: r.qs.length, flowers: r.qs.filter(q => q.flipOf).length, fruits: r.qs.filter(q => q.status === 'found').length,
           wonder: r.qs.filter(q => q.status === 'wondering').length };
}
// the science book: Mama marks the chapter her class starts next; the next session meets it (theme I, then tagged ones)
function scienceAdd(r, D, ch, t) {
  ch = Number(ch);
  const queued = new Set(r.queue.map(x => x.m));
  const free = m => m.ready && !r.used[m.id] && !queued.has(m.id);
  const pick = D.mysteries.find(m => m.theme === 'I' && m.chapter === ch && free(m)) || D.mysteries.find(m => (m.tags || []).includes(ch) && free(m));
  r.science.push({ ch, day: t, m: pick ? pick.id : null });
  if (!pick) return null;
  r.queue = r.queue.filter(x => x.why !== 'science');      // one science mystery waits at a time: the newest lesson
  r.queue.unshift({ m: pick.id, why: 'science', ch, day: t });
  return pick.id;
}
function weekStats(r, t) {   // her week so far (Sunday to Saturday), for Mama only
  const from = addDays(t, -weekday(t)), inWeek = d => d >= from && d <= t;
  const qs = r.qs.filter(q => inWeek(q.day));
  return { from, days: Object.keys(r.days).filter(d => inWeek(d) && dayDone(r, d)).length, questions: qs.length,
           short: qs.filter(q => q.kind === 'short').length, long: qs.filter(q => q.kind === 'long').length,
           flips: qs.filter(q => q.flipOf).length, found: r.qs.filter(q => q.status === 'found' && q.foundDay && inWeek(q.foundDay)).length,
           wondering: qs.filter(q => q.status === 'wondering').length };
}
const core = { blank, clean, valid, addDays, dayDiff, weekday, weekOf, themeOf, nextInTheme, rotationPick, todayPick, tomorrowPick, openDay,
               dayDone, streakOf, treeCounts, scienceAdd, weekStats };

/* =====================================================================================================
   What she sees and hears. Each line has a voice clip in audio/voice.json, deck 'cbox' (scripts/curiosity_voice.py);
   until a clip exists the words are shown and nothing is said. A Qur'anic verse is never read by the voice.
   ===================================================================================================== */
const L = {
  open: 'افتحي العلبة!', ask: 'هيا نسأل! ❓', stormGo: 'سجّلي كلَّ سؤالٍ يخطر لكِ.', mic: 'اضغطي وقولي سؤالكِ', micStop: 'انتهى سؤالي',
  micGuess: 'اضغطي وقولي توقّعكِ', well: 'أحسنتِ!',
  timeUp: 'انتهى الوقت!', needOne: 'سجّلي سؤالاً واحداً على الأقل.', next: 'التالي', finish: 'انتهيتُ ✓',
  sort: 'ضعي كلَّ سؤالٍ في علبته.', short: 'جوابه قصير', long: 'جوابه طويل', shortW: 'هل · كم · متى · أين', longW: 'لماذا · كيف · ماذا لو',
  praiseLong: 'هذا سؤال جوابه طويل، يفتح أبوابًا!', praiseShort: 'سؤال جوابه قصير، يعطينا معلومة سريعة!',
  flip: 'اختاري سؤالاً، وقوليه بطريقة أخرى.', toLong: 'اجعليه سؤالاً جوابه طويل', toShort: 'اجعليه سؤالاً جوابه قصير', flipDone: 'زهرة جديدة على شجرتكِ! 🌸',
  star: 'اختاري سؤالكِ المفضّل ⭐', predict: 'ما رأيكِ؟ ما الجواب في ظنّك؟', end: 'سنبحث عن الجواب مع ماما أو بابا 🔍',
  goHome: 'إلى شجرتي 🌳', goToday: 'افتحي علبة اليوم', tomorrow: 'عودي غداً 🌟',
  wait: 'سؤالكِ ينتظر البحث 🔍', together: 'نبحث معًا', mine: 'سؤالي', myGuess: 'توقّعي', found: 'ماذا وجدنا؟', surprised: 'هل تفاجأتِ؟',
  yes: 'نعم! 😮', little: 'قليلاً 🙂', no: 'لا، توقّعتُ ذلك 😌', wonder: 'ما زلت أتساءل 💭', idk: 'لا أعرف... هيا نبحث معًا',
  wonderOk: 'ما زلتِ تتساءلين؟ رائع! العلماء يتساءلون أيضًا 💭', fruit: 'ثمرة جديدة على شجرتكِ! 🍎',
  book: 'دفتر أسئلتي', tree: 'شجرة أسئلتي', stFound: 'عرفنا الجواب ✓', stWonder: 'ما زلت أتساءل 💭', stWait: 'ننتظر البحث 🔍', again: 'نبحث عنه 🔍',
  drawA5: 'أحضري رسمتكِ وضعيها أمامكِ 🎨', drawD8: 'أحضري رسمتكِ للفضاء 🚀', sayHello: 'قولي: «مرحباً، أنا ماريا!»', listen: 'استمعي إلى صوتكِ',
  noMic: 'الميكروفون مغلق. اطلبي من ماما أن تسمح به.', saidOne: 'قلتُ سؤالاً ✋', surprise: 'مفاجأة! 🎁', surpriseMsg: 'مفاجأة من ماما! 💝',
  newQ: 'سؤال جديد! 🌿', hint: 'فكرة'
};
const RULES_IC = ['❓❓❓', '⏩', '💬', '🔄'];
const L_TREE = 'شجرة أسئلتي';
// «سؤالاً واحداً», «سؤالين», «٣ أسئلة» ... «١٠ أسئلة», «١١ سؤالاً»
const qCount = n => (n === 1 ? 'سؤالاً واحداً' : n === 2 ? 'سؤالين' : n >= 3 && n <= 10 ? `${AR(n)} أسئلة` : `${AR(n)} سؤالاً`);
const TIPS_EN = ['Give real explanations, never just "because".', 'Show your own surprise.', 'Say «لا أعرف... هيا نبحث معًا» ("I don\'t know, let\'s find out together").', 'Praise the question, not the answer.'];

/* =====================================================================================================
   The screens. api comes from app.js: today, lsGet, lsSet, show, toast, SFX, confetti, stopConfetti, reduced, DEV,
   holdToOpen, backup, restore, apps, appsChip, stopEnglish, setDeck.
   ===================================================================================================== */
function mount(api) {
  const $ = (s, el = document) => el.querySelector(s);
  const KEY = 'tc:maria:curiosity';
  const today = () => api.today();
  let r = load(), D = null, CLIPS = {}, S = null;
  function load() { try { return clean(JSON.parse(api.lsGet(KEY) || 'null')); } catch (e) { return blank(); } }
  function save() { api.lsSet(KEY, JSON.stringify(r)); }
  const PH = {};      // Mama's photos (her drawing, her own mystery, a photo of her own for any mystery): blob URLs
  let TREE = null;    // the tree Mama chose (drawn in ChatGPT): its picture, its pieces and the places where they grow
  const ready = Promise.all([
    fetch('curiosity.json').then(x => x.json()).then(d => { D = d; }),
    fetch('assets/curiosity/tree/tree.json').then(x => (x.ok ? x.json() : null)).then(t => { TREE = t; }).catch(() => {}),
    fetch('audio/voice.json').then(x => (x.ok ? x.json() : null)).then(v => { CLIPS = (v && v.decks && v.decks.cbox && v.decks.cbox.clips) || {}; }).catch(() => {}),
    loadPhotos()
  ]).catch(e => { console.warn('Curiosity Box could not load', e); });
  const M = id => {
    if (isOwn(id)) { const o = r.own.find(x => x.id === id); return o ? { id, theme: 'own', line: o.line, hints: o.hints || [], note: o.note || '', kind: 'photo', ready: true, own: true } : null; }
    return D ? byId(D)[id] || null : null;
  };
  const photoOf = m => (m ? PH['m-' + m.id] || PH[m.id] || m.photo || '' : '');

  /* ---------- the voice lines (one audio element, as in the other apps) ---------- */
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

  /* ---------- her recordings and Mama's photos (IndexedDB, this iPad only) ---------- */
  const DB = 'curiosity-box';
  function openDB() {
    return new Promise((ok, bad) => {
      if (!root.indexedDB) return bad(new Error('no IndexedDB'));
      const q = indexedDB.open(DB, 1);
      q.onupgradeneeded = () => { const d = q.result; ['clips', 'photos'].forEach(s => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); }); };
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
  async function loadPhotos() {
    let all = [];
    try { all = (await idb('photos', 'readonly', st => st.getAll())) || []; } catch (e) { return; }
    all.forEach(p => { if (p && p.blob) PH[p.id] = URL.createObjectURL(p.blob); });
  }
  async function putPhoto(id, blob) {
    await idb('photos', 'readwrite', st => st.put({ id, blob, type: blob.type, at: Date.now() }));
    if (PH[id]) URL.revokeObjectURL(PH[id]);
    PH[id] = URL.createObjectURL(blob);
  }
  async function delPhoto(id) { try { await idb('photos', 'readwrite', st => st.delete(id)); } catch (e) {} if (PH[id]) { URL.revokeObjectURL(PH[id]); delete PH[id]; } }
  const getClip = id => idb('clips', 'readonly', st => st.get(id)).catch(() => null);
  const putClip = row => idb('clips', 'readwrite', st => st.put(row));
  // a photo Mama takes is made smaller first (a 1280 px JPEG), so the backup stays light
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
  async function keepClip(id, rec, kind) {
    let g = 1;
    try { g = gainOf(await decode(rec.blob)); } catch (e) {}
    await putClip({ id, blob: rec.blob, type: rec.blob.type, at: Date.now(), ms: Math.round(rec.ms), g, kind });
  }
  const BUF = new Map();
  async function playMine(id) {
    stopAudio();
    const t = tok, row = await getClip(id); if (!row || t !== tok) return;
    try {
      const ctx = ac();
      let b = BUF.get(id); if (!b) { b = await decode(row.blob); BUF.set(id, b); }
      if (t !== tok) return;
      const s = ctx.createBufferSource(), g = ctx.createGain();
      g.gain.value = row.g || 1; s.buffer = b; s.connect(g); g.connect(ctx.destination); SRC = s;
      return await new Promise(ok => { pending = ok; s.onended = () => { if (pending === ok) { pending = null; ok(); } }; s.start(); });
    } catch (e) { return play(URL.createObjectURL(row.blob)); }
  }

  /* ---------- markup ---------- */
  const ic = (id, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
  document.body.insertAdjacentHTML('beforeend', `
<section id="cbhome" class="screen cb cb-home" dir="rtl" lang="ar" hidden>
  <button class="gear" id="cbGear" aria-label="Mama: press and hold">
    <svg class="ring" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="24"/></svg>${ic('i-gear', 'cog')}
  </button>
  <header class="cb-head">
    <img class="cb-logo" src="assets/apps/curiosity.svg" alt="">
    <div class="cb-titles"><h1>علبة الفضول</h1><p>نتدرّب لنكون سائلات ماهرات</p></div>
    <span class="cb-flame" id="cbFlame">${ic('i-flame')}<b id="cbStreak"></b></span>
  </header>
  <div class="cb-main">
    <div class="cb-treebox"><div class="cb-tree" id="cbTree"></div><p class="cb-treecap">${L.tree}</p></div>
    <div class="cb-side">
      <button class="cb-surprise" id="cbSurprise" hidden><span>🎁</span>${L.surprise}</button>
      <button class="cb-go" id="cbGo"><span class="cb-go-box" aria-hidden="true"><i class="lid"></i><i class="base"></i><i class="rib"></i></span><b id="cbGoLabel"></b></button>
      <div class="cb-wait" id="cbWait" hidden><p>${L.wait}</p><button class="cb-btn" id="cbFindBtn">${L.together}</button></div>
      <button class="cb-btn soft" id="cbBookBtn">📒 ${L.book}</button>
    </div>
  </div>
</section>
<section id="cbsess" class="screen cb cb-sess" dir="rtl" lang="ar" hidden>
  <div class="cb-top">
    <button class="quit" id="cbQuit" aria-label="الرئيسية">${ic('i-close')}</button>
    <div class="cb-steps" id="cbSteps" aria-hidden="true"></div>
    <div class="cb-timer" id="cbTimer" hidden><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="bg" cx="32" cy="32" r="26"/><circle class="fg" id="cbRing" cx="32" cy="32" r="26"/></svg><b id="cbClock"></b></div>
    <div class="cb-count" id="cbCount" hidden>❓ <b id="cbCountN">٠</b></div>
  </div>
  <div class="cb-stage" id="cbStage"></div>
</section>
<section id="cbfind" class="screen cb cb-find" dir="rtl" lang="ar" hidden></section>
<section id="cbbook" class="screen cb cb-book" dir="rtl" lang="ar" hidden></section>
<section id="cbparent" class="screen cb cb-parent" dir="ltr" lang="en" hidden></section>
<section id="cbCel" class="overlay cb cb-cel" dir="rtl" lang="ar" hidden><canvas id="cbConfetti" aria-hidden="true"></canvas><div class="cb-celbox" id="cbCelBox"></div></section>
<div id="cbCard" class="cb-cardov" dir="ltr" lang="en" hidden></div>`);

  const stage = $('#cbStage');
  const pane = html => { stage.innerHTML = `<div class="cb-pane">${html}</div>`; return stage.firstElementChild; };
  if (api.appsChip) {   // the way back to her entrance page
    const row = document.createElement('div'); row.className = 'deck-row';
    const b = api.appsChip(); b.addEventListener('click', () => { leave(); api.apps(); });
    row.append(b); $('#cbhome').append(row);
  }

  /* =====================================================================================================
     The question tree (SVG): leaves, flowers and fruits in fixed places, so the tree only ever grows
     ===================================================================================================== */
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function spot(i, R, salt) {   // a place inside the crown (three overlapping circles)
    const f = rng(i * 7919 + salt), k = i % 3, c = [[200, 150, 1], [140, 190, 0.78], [260, 190, 0.78]][k];
    const a = f() * Math.PI * 2, d = Math.sqrt(f()) * R * c[2] * 0.92;
    return [c[0] + Math.cos(a) * d * (k ? 1 : 1.12), c[1] + Math.sin(a) * d * 0.86, f()];
  }
  function treeSVG(cnt, seen, big) {
    const R = 46 + Math.min(70, Math.sqrt(cnt.leaves) * 7.5);
    const greens = ['#5CC27F', '#7BD597', '#46A96A', '#8FE3A9', '#3E9A60'];
    const isNew = (i, k) => (i >= (seen[k] || 0) ? ' new' : '');
    const delay = (i, k) => (i >= (seen[k] || 0) ? ` style="animation-delay:${Math.min(2.4, (i - (seen[k] || 0)) * 0.12).toFixed(2)}s"` : '');
    const LMAX = 260, leaves = [], flowers = [], fruits = [];
    for (let i = 0; i < Math.min(cnt.leaves, LMAX); i++) {
      const [x, y, f] = spot(i, R, 11);
      leaves.push(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${Math.round(f * 360)})"><g class="lf${isNew(i, 'leaves')}"${delay(i, 'leaves')}><ellipse rx="9" ry="5" fill="${greens[i % 5]}"/><path d="M-8 0H8" stroke="rgba(255,255,255,.45)" stroke-width="1"/></g></g>`);
    }
    for (let i = 0; i < Math.min(cnt.flowers, 60); i++) {
      const [x, y] = spot(i + 500, R * 0.95, 23);
      flowers.push(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><g class="fl${isNew(i, 'flowers')}"${delay(i, 'flowers')}>${[0, 72, 144, 216, 288].map(a => `<circle r="4.6" cx="${(Math.cos(a * Math.PI / 180) * 5).toFixed(1)}" cy="${(Math.sin(a * Math.PI / 180) * 5).toFixed(1)}" fill="#FF8DB8"/>`).join('')}<circle r="3.4" fill="#FFD84D"/></g></g>`);
    }
    for (let i = 0; i < Math.min(cnt.fruits, 40); i++) {
      const [x, y] = spot(i + 900, R * 0.9, 37);
      fruits.push(`<g transform="translate(${x.toFixed(1)} ${(y + 6).toFixed(1)})"><g class="fr${isNew(i, 'fruits')}"${delay(i, 'fruits')}><circle r="8.5" fill="#F0525B"/><circle r="2.6" cx="-3" cy="-3" fill="rgba(255,255,255,.55)"/><path d="M0 -8 q3 -6 8 -6" stroke="#3E9A60" stroke-width="2.4" fill="none" stroke-linecap="round"/></g></g>`);
    }
    const crown = cnt.leaves ? `<g class="crown" opacity=".32"><circle cx="200" cy="150" r="${(R * 1.05).toFixed(1)}" fill="#BFEBCB"/><circle cx="140" cy="190" r="${(R * 0.82).toFixed(1)}" fill="#BFEBCB"/><circle cx="260" cy="190" r="${(R * 0.82).toFixed(1)}" fill="#BFEBCB"/></g>` : '';
    const sprout = cnt.leaves ? '' : '<g class="sprout"><path d="M200 350 C198 300 192 262 200 222" stroke="#5CC27F" stroke-width="10" fill="none" stroke-linecap="round"/><ellipse cx="174" cy="226" rx="30" ry="14" fill="#7BD597" transform="rotate(-28 174 226)"/><ellipse cx="226" cy="214" rx="30" ry="14" fill="#5CC27F" transform="rotate(24 226 214)"/><path d="M152 238 L196 222 M248 202 L204 220" stroke="rgba(255,255,255,.5)" stroke-width="2"/></g>';
    const trunk = cnt.leaves ? `<path d="M186 352 C190 300 192 262 196 ${200 + R * 0.2} L204 ${200 + R * 0.2} C208 262 210 300 214 352 Z" fill="#B07A4F"/><path d="M198 260 C178 236 160 222 146 ${206 - R * 0.05}" stroke="#B07A4F" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M202 248 C222 228 240 214 254 ${204 - R * 0.05}" stroke="#B07A4F" stroke-width="9" fill="none" stroke-linecap="round"/>` : '';
    return `<svg viewBox="0 0 400 380" class="${big ? 'big' : ''}" role="img" aria-label="${L.tree}"><ellipse cx="200" cy="352" rx="150" ry="18" fill="#CDEFD6"/>${crown}${trunk}${sprout}${leaves.join('')}${flowers.join('')}${fruits.join('')}</svg>`;
  }
  // the drawn tree: a leaf for every question on the places along its branches (buds first), a blossom for every flipped
  // question and a fruit for every question found out together; each new one grows in from its stem
  function treeArt(cnt, seen) {
    const T = TREE, P = T.places, N = P.length, dir = 'assets/curiosity/tree/';
    const kind = k => T.pieces.filter(p => p.kind === k);
    const L = kind('leaf'), F = kind('flower'), R = kind('fruit');
    const fresh = (i, k) => i >= (seen[k] || 0);
    const late = (i, k) => (fresh(i, k) ? ` style="animation-delay:${Math.min(2.4, (i - (seen[k] || 0)) * 0.12).toFixed(2)}s"` : '');
    const img = (p, h, cls, i, k, anchor) => {
      const w = Math.round(h * p.w / p.h), x = -w / 2, y = anchor === 'stem' ? -h + 4 : -h / 2;
      return `<image class="${cls}${fresh(i, k) ? ' new' : ''}"${late(i, k)} href="${dir}${p.id}.webp" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
    };
    const out = [];
    for (let i = 0; i < Math.min(cnt.leaves, N); i++) {
      const [x, y, a] = P[i];
      const size = Math.round(60 + ((i * 37) % 17) - 6);            // 54 to 70, so the leaves are not all alike
      out.push(`<g transform="translate(${x} ${y}) rotate(${a})">${img(L[(i * 5) % L.length], size, 'lf', i, 'leaves', 'stem')}</g>`);
    }
    const twigs = P.filter(p => p[3] > 0), M = twigs.length;
    for (let i = 0; i < Math.min(cnt.flowers, 80); i++) {
      const [x, y, a] = P[(i * 13 + 5) % N];
      out.push(`<g transform="translate(${x} ${y}) rotate(${Math.round(a * 0.4)})">${img(F[i % F.length], 52, 'fl', i, 'flowers')}</g>`);
    }
    for (let i = 0; i < Math.min(cnt.fruits, 60); i++) {
      const [x, y] = twigs[(i * 11 + 3) % M];
      out.push(`<g transform="translate(${x} ${y + 18})">${img(R[i % R.length], 54, 'fr', i, 'fruits')}</g>`);
    }
    return `<svg viewBox="0 0 ${T.size} ${T.size}" role="img" aria-label="${L_TREE}"><image href="${T.image}" width="${T.size}" height="${T.size}"/>${out.join('')}</svg>`;
  }
  function renderTree(el, animate = true) {
    const cnt = treeCounts(r);
    el.innerHTML = TREE && TREE.pieces && TREE.pieces.length ? treeArt(cnt, animate ? r.seen : cnt) : treeSVG(cnt, animate ? r.seen : cnt);
    if (animate && (cnt.leaves > r.seen.leaves || cnt.flowers > r.seen.flowers || cnt.fruits > r.seen.fruits)) {
      r.seen = { leaves: cnt.leaves, flowers: cnt.flowers, fruits: cnt.fruits }; save();
    }
  }

  /* =====================================================================================================
     Home
     ===================================================================================================== */
  const waitingQs = () => r.qs.filter(q => q.status === 'waiting');
  async function home() {
    await ready;
    leave();
    if (api.stopEnglish) api.stopEnglish();
    if (api.setDeck) api.setDeck('cbox');
    document.body.dataset.profile = 'maria';
    if (!D) { api.toast('علبة الفضول لم تفتح. اتصلي بالإنترنت مرة واحدة.'); return; }
    const t = today(), done = dayDone(r, t);
    $('#cbStreak').textContent = AR(streakOf(r, t));
    $('#cbFlame').classList.toggle('off', !streakOf(r, t));
    $('#cbGoLabel').textContent = done ? L.tomorrow : L.goToday;
    $('#cbGo').disabled = done; $('#cbGo').classList.toggle('done', done);
    $('#cbWait').hidden = !waitingQs().length;
    $('#cbSurprise').hidden = !r.surprise.pending;
    api.show('cbhome');
    renderTree($('#cbTree'));
  }

  /* =====================================================================================================
     The daily session: 1 the mystery, 2 the question storm, 3 sort and flip, 4 choose and predict (5 comes later)
     ===================================================================================================== */
  const STEPS = [['box', '🎁'], ['storm', '❓'], ['sort', '📦'], ['star', '⭐']];
  const stepIx = st => ({ box: 0, storm: 1, sort: 2, flip: 2, star: 3 }[st] || 0);
  function stepsBar(st) {
    const k = stepIx(st);
    $('#cbSteps').innerHTML = STEPS.map(([, e], i) => `<i class="${i < k ? 'done' : i === k ? 'on' : ''}">${e}</i>`).join('');
  }
  async function start() {
    await ready; if (!D) return;
    api.SFX.init(); ac();
    const t = today();
    if (dayDone(r, t)) return home();
    const day = openDay(r, D, t); save();
    if (!day) { api.toast('No mystery is ready yet.'); return; }
    S = { tok: Date.now(), t, day, m: M(day.m) };
    if (!S.m) { day.m = null; delete r.days[t]; save(); S = null; return home(); }
    api.show('cbsess');
    run(S);
  }
  const live = s => S === s;
  async function run(s) {
    try {
      if (s.day.step === 'box') { await stepBox(s); if (!live(s)) return; s.day.step = 'storm'; save(); }
      if (s.day.step === 'storm') { await stepStorm(s); if (!live(s)) return; s.day.step = 'sort'; save(); }
      if (s.day.step === 'sort') { await stepSort(s); if (!live(s)) return; s.day.step = 'flip'; save(); }
      if (s.day.step === 'flip') { await stepFlip(s); if (!live(s)) return; s.day.step = 'star'; save(); }
      if (s.day.step === 'star') { await stepStar(s); if (!live(s)) return; }
      finishDay(s);
    } catch (e) { console.warn('session', e); }
  }
  const dayQs = s => r.qs.filter(q => q.day === s.t && q.m === s.m.id);
  const bubble = (q, i, extra = '') => `<button class="cb-bub${q.flipOf ? ' flip' : ''}${extra}" data-q="${q.id}" aria-label="سؤال ${AR(i + 1)}"><span class="n">${AR(i + 1)}</span><span class="wv" aria-hidden="true"><i></i><i></i><i></i><i></i></span>${q.flipOf ? '<span class="fl" aria-hidden="true">🌸</span>' : ''}</button>`;
  async function playBubble(btn) {
    if (!btn) return;
    document.querySelectorAll('.cb-bub.playing').forEach(b => b.classList.remove('playing'));
    btn.classList.add('playing');
    await playMine(btn.dataset.q);
    btn.classList.remove('playing');
  }
  function mysteryHTML(m, small = false) {
    const ph = photoOf(m);
    let pic = '';
    if (m.kind === 'drawing' && !ph) pic = small ? '<div class="cb-voicepic">🎨</div>' : `<div class="cb-draw"><span>🎨</span><p>${m.id === 'D8' ? L.drawD8 : L.drawA5}</p></div>`;
    else if (m.kind === 'myvoice') pic = small ? '<div class="cb-voicepic">🎙️</div>' : '<div class="cb-voicepic" id="cbVoicePic">🎙️</div>';
    else if (ph) pic = `<figure class="cb-photo${small ? ' small' : ''}"><img src="${esc(ph)}" alt=""></figure>`;
    const verse = m.verse ? `<p class="cb-verse">﴿${esc(m.verse.text)}﴾ <small>[${esc(m.verse.ref)}]</small></p>` : '';
    const line = m.verse ? '' : `<p class="cb-line${small ? ' small' : ''}">${esc(m.line)}</p>`;
    return `<div class="cb-myst${small ? ' small' : ''}">${verse}${pic}${line}</div>`;
  }

  /* ---------- 1. today's mystery: the box opens ---------- */
  async function stepBox(s) {
    stepsBar('box'); $('#cbTimer').hidden = true; $('#cbCount').hidden = true;
    stage.innerHTML = `<p class="cb-goal">${esc(D.goal)}</p>
      <div class="cb-boxwrap" id="cbBoxWrap"><button class="cb-gift" id="cbGift" aria-label="${L.open}"><i class="lid"></i><i class="base"></i><i class="rib"></i><i class="bow"></i><i class="glow"></i></button>
      <p class="cb-opencap">${L.open}</p></div>`;
    say('goal');
    await new Promise(ok => $('#cbGift').addEventListener('click', ok, { once: true }));
    if (!live(s)) return;
    api.SFX.init(); ac(); chime();
    $('#cbBoxWrap').classList.add('open');
    await sleep(api.reduced() ? 50 : 900); if (!live(s)) return;
    const m = s.m;
    stage.innerHTML = `<p class="cb-goal small">${esc(D.goal)}</p>${mysteryHTML(m)}
      ${m.kind === 'sound' ? '<button class="cb-btn soft cb-again" id="cbSound">🔊</button>' : ''}
      ${m.kind === 'myvoice' ? `<button class="cb-mic" id="cbHello"><span class="lv"></span>🎤<b>${L.sayHello}</b></button>` : ''}
      <button class="cb-big" id="cbAsk" hidden>${L.ask}</button>`;
    const askBtn = $('#cbAsk');
    if (m.kind === 'sound' && m.sound) {
      const playSound = () => play(m.sound);
      $('#cbSound').addEventListener('click', () => { api.SFX.init(); playSound(); });
      await sayFor('m-' + m.id, 600); if (!live(s)) return;
      await playSound();
    } else if (m.kind === 'myvoice') {
      await sayFor('hello', 300);
      await new Promise(ok => {
        const b = $('#cbHello');
        b.addEventListener('click', async () => {
          if (!canRecord()) { ok(); return; }
          b.disabled = true; b.classList.add('rec');
          try {
            const rec = await record(4000, v => b.style.setProperty('--lv', v.toFixed(2)));
            if (rec) { const id = 'v-' + Date.now(); await keepClip(id, rec, 'hello'); b.classList.remove('rec'); b.querySelector('b').textContent = L.listen; await sleep(300); await playMine(id); }
          } catch (e) { api.toast(L.noMic); }
          b.hidden = true; ok();
        }, { once: true });
      });
      if (!live(s)) return;
      stage.querySelector('.cb-myst').insertAdjacentHTML('beforeend', `<p class="cb-line">${esc(m.line)}</p>`);
      await sayFor('m-' + m.id, 1200);
    } else if (!m.verse) {
      await sayFor('m-' + m.id, 1500);
    } else await sleep(2200);
    if (!live(s)) return;
    askBtn.hidden = false;
    await new Promise(ok => askBtn.addEventListener('click', ok, { once: true }));
    api.SFX.init();
  }

  /* ---------- 2. the question storm: a voice bubble for every question, a visible timer, open hints ---------- */
  function setTimer(left, total) {
    const c = 2 * Math.PI * 26, f = Math.max(0, left / total);
    $('#cbRing').style.strokeDasharray = c.toFixed(1);
    $('#cbRing').style.strokeDashoffset = (c * (1 - f)).toFixed(1);
    const sec = Math.max(0, Math.ceil(left));
    $('#cbClock').textContent = `${AR(Math.floor(sec / 60))}:${AR(pad2(sec % 60))}`;
    $('#cbTimer').classList.toggle('low', left <= 20);
  }
  function hintHTML(h) { return `<span class="cb-hw">${esc(h.w)}</span>${h.k.map(k => `<b class="cb-hplus">+</b><span class="cb-hk">${esc(k)}</span>`).join('')}`; }
  async function stepStorm(s) {
    stepsBar('storm');
    const m = s.m, total = r.settings.storm, hints = m.hints || [];
    s.day.storm = s.day.storm || 0;
    let left = Math.max(45, total - s.day.storm), hintK = 0, idle = 0, recording = false, over = false, lastTick = performance.now();
    $('#cbTimer').hidden = false; $('#cbCount').hidden = false; setTimer(left, total);
    const count = () => { $('#cbCountN').textContent = AR(dayQs(s).filter(q => !q.flipOf).length); };
    count();
    const noMic = !canRecord();
    stage.innerHTML = `<div class="cb-rules" id="cbRules">${D.rules.map((x, i) => `<div class="cb-rule" data-i="${i}"><span>${RULES_IC[i]}</span><small>${esc(x)}</small></div>`).join('')}</div>
      <div class="cb-stormmain">${mysteryHTML(m, true)}<div class="cb-hint" id="cbHint" hidden></div></div>
      <div class="cb-bubs" id="cbBubs">${dayQs(s).filter(q => !q.flipOf).map((q, i) => bubble(q, i)).join('')}</div>
      <div class="cb-microw">
        ${noMic ? `<p class="cb-note">${L.noMic}</p><button class="cb-mic said" id="cbMic">✋<b>${L.saidOne}</b></button>` : `<button class="cb-mic" id="cbMic"><span class="lv"></span>🎤<b>${L.mic}</b></button>`}
        <button class="cb-btn soft" id="cbStormDone" hidden>${L.finish}</button>
      </div>
      <div class="cb-timeup" id="cbTimeUp" hidden></div>`;
    $('#cbBubs').addEventListener('click', e => { const b = e.target.closest('.cb-bub'); if (b && !recording) playBubble(b); });
    // the four rules, read aloud once (each lights up in turn)
    const readRules = r.settings.rules === 'always' || (r.settings.rules === 'week1' && weekOf(r, s.t) === 1);
    if (readRules && !s.day.rulesRead) {
      await sayFor('stormGo', 400);
      for (let i = 0; i < 4 && live(s); i++) {
        const el = stage.querySelector(`.cb-rule[data-i="${i}"]`); if (el) el.classList.add('lit');
        await sayFor('r' + (i + 1), 1100);
        if (el) el.classList.remove('lit');
      }
      s.day.rulesRead = true; save();
    }
    if (!live(s)) return;
    let finish;
    const ended = new Promise(ok => { finish = ok; });
    const showHint = () => {
      if (!hints.length || recording) return;
      const h = hints[hintK % hints.length], el = $('#cbHint');
      el.innerHTML = `<small>${L.hint} 💡</small><div class="cb-hrow">${hintHTML(h)}</div>`;
      el.hidden = false; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      say(`h-${m.id}-${(hintK % hints.length) + 1}`);
      hintK++;
    };
    const timeUp = () => {
      if (over) return; over = true; clearInterval(tm);
      const n = dayQs(s).filter(q => !q.flipOf).length;
      $('#cbHint').hidden = true;
      const box = $('#cbTimeUp');
      box.innerHTML = `<div><h2>${left <= 0 ? L.timeUp : L.well}</h2><p>سألتِ ${qCount(n)}! 🌟</p><button class="cb-big" id="cbStormNext">${L.next}</button></div>`;
      box.hidden = false; chime();
      $('#cbStormNext').addEventListener('click', () => { api.SFX.init(); finish(); }, { once: true });
    };
    const tm = setInterval(() => {
      if (!live(s)) { clearInterval(tm); return; }
      const now = performance.now(), dt = (now - lastTick) / 1000; lastTick = now;
      if (document.hidden) return;
      if (left > 0) { left -= dt; s.day.storm = total - left; setTimer(left, total); }
      if (!recording) idle += dt;
      if (idle >= r.settings.hintAfter && !over) { idle = r.settings.hintAfter * -0.5; showHint(); }
      if (s.day.storm >= 60 && dayQs(s).length && !over) $('#cbStormDone').hidden = false;
      if (left <= 0 && !recording) {
        if (dayQs(s).filter(q => !q.flipOf).length) timeUp();
        else if (!s.needOne) { s.needOne = true; $('#cbHint').hidden = false; $('#cbHint').innerHTML = `<p class="cb-need">${L.needOne}</p>`; say('needOne'); }
      }
    }, 250);
    const addQ = async rec => {
      const id = 'q-' + Date.now();
      if (rec) await keepClip(id, rec, 'question');
      r.qs.push({ id, day: s.t, m: m.id, at: Date.now(), kind: null, flipOf: null, star: false, status: 'wondering', audio: !!rec });
      save(); count();
      const n = dayQs(s).filter(q => !q.flipOf).length;
      $('#cbBubs').insertAdjacentHTML('beforeend', bubble(r.qs[r.qs.length - 1], n - 1, ' pop'));
      api.SFX.star(); leafFly();
    };
    $('#cbMic').addEventListener('click', async () => {
      api.SFX.init(); ac();
      if (over && !s.needOne) return;
      const b = $('#cbMic');
      if (noMic) { await addQ(null); idle = 0; if (s.needOne && left <= 0) timeUp(); return; }
      if (recording) { stopRec(); return; }
      recording = true; idle = 0; $('#cbHint').hidden = true; stopAudio();
      b.classList.add('rec'); b.querySelector('b').textContent = L.micStop;
      let rec = null;
      try { rec = await record(15000, v => b.style.setProperty('--lv', v.toFixed(2))); }
      catch (e) { api.toast(L.noMic); }
      recording = false; idle = 0;
      b.classList.remove('rec'); b.style.removeProperty('--lv'); b.querySelector('b').textContent = L.mic;
      if (!live(s)) return;
      if (rec) await addQ(rec); else { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
      if (left <= 0 && dayQs(s).length) timeUp();
    });
    $('#cbStormDone').addEventListener('click', () => { if (!recording) timeUp(); });
    await ended;
    clearInterval(tm);
    $('#cbTimer').hidden = true;
  }
  function leafFly() {
    if (api.reduced()) return;
    const el = document.createElement('span'); el.className = 'cb-leaffly'; el.textContent = '🌿';
    $('#cbsess').append(el); setTimeout(() => el.remove(), 1200);
  }

  /* ---------- 3. sort (short answer or long answer) and flip one ---------- */
  async function stepSort(s) {
    stepsBar('sort'); $('#cbCount').hidden = true;
    const qs = dayQs(s).filter(q => !q.flipOf);
    if (!qs.length) return;
    let sel = null, praised = { short: false, long: false };
    const t0 = performance.now();
    const P = pane(`<p class="cb-ask">${L.sort}</p>
      <div class="cb-bubs big" id="cbSortBubs"></div>
      <div class="cb-bins">
        <button class="cb-bin short" data-k="short"><b>${L.short}</b><span class="w">${L.shortW}</span><span class="in" data-in="short"></span></button>
        <button class="cb-bin long" data-k="long"><b>${L.long}</b><span class="w">${L.longW}</span><span class="in" data-in="long"></span></button>
      </div>
      <p class="cb-praise" id="cbPraise"></p>
      <button class="cb-big" id="cbNext" hidden>${L.next}</button>`);
    const draw = () => {
      if (!P.isConnected) return;
      $('#cbSortBubs').innerHTML = qs.map((q, i) => (q.kind ? '' : bubble(q, i, sel === q.id ? ' sel' : ''))).join('');
      ['short', 'long'].forEach(k => { P.querySelector(`[data-in="${k}"]`).innerHTML = qs.map((q, i) => (q.kind === k ? bubble(q, i, ' mini' + (sel === q.id ? ' sel' : '')) : '')).join(''); });
      const all = qs.every(q => q.kind);
      $('#cbNext').hidden = !(all || (performance.now() - t0 > 60000 && qs.some(q => q.kind)));
    };
    draw();
    say('sort');
    const put = (id, k) => {
      const q = qs.find(x => x.id === id); if (!q) return;
      q.kind = k; sel = null; save(); draw();
      api.SFX.good();
      const p = $('#cbPraise'); p.textContent = k === 'long' ? L.praiseLong : L.praiseShort; p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop');
      if (!praised[k]) { praised[k] = true; say(k === 'long' ? 'praiseLong' : 'praiseShort'); }
    };
    // after a minute "next" appears even if a few are left (only the button changes, so a drag in progress is never broken)
    const late = setInterval(() => { if (!live(s) || !P.isConnected) { clearInterval(late); return; } if (performance.now() - t0 > 60000 && qs.some(q => q.kind)) $('#cbNext').hidden = false; }, 5000);
    // tap a bubble (it plays and is chosen), then tap a box; or drag it onto a box
    dragBubbles(P, (id, k) => put(id, k), id => { sel = id; draw(); const b = P.querySelector(`.cb-bub[data-q="${id}"]`); playBubble(b); });
    P.querySelectorAll('.cb-bin').forEach(bin => bin.addEventListener('click', e => { if (e.target.closest('.cb-bub')) return; if (sel) put(sel, bin.dataset.k); }));
    await new Promise(ok => $('#cbNext').addEventListener('click', ok, { once: true }));
    clearInterval(late); api.SFX.init();
  }
  // pointer drag for the bubbles: a short tap is a tap; a move carries a copy of the bubble to a box
  function dragBubbles(box, onDrop, onTap) {
    let g = null;
    box.addEventListener('pointerdown', e => {
      const b = e.target.closest('.cb-bub'); if (!b) return;
      e.preventDefault();
      g = { b, id: b.dataset.q, x0: e.clientX, y0: e.clientY, ghost: null };
      try { b.setPointerCapture(e.pointerId); } catch (err) {}
    });
    box.addEventListener('pointermove', e => {
      if (!g) return;
      const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
      if (!g.ghost && Math.hypot(dx, dy) > 12) {
        g.ghost = g.b.cloneNode(true); g.ghost.classList.add('ghost'); document.body.append(g.ghost);
        const rc = g.b.getBoundingClientRect(); g.w = rc.width / 2; g.h = rc.height / 2; g.b.classList.add('lifted');
      }
      if (g.ghost) {
        g.ghost.style.transform = `translate(${e.clientX - g.w}px, ${e.clientY - g.h}px)`;
        const over = document.elementsFromPoint(e.clientX, e.clientY).find(x => x.classList && x.classList.contains('cb-bin'));
        box.querySelectorAll('.cb-bin').forEach(x => x.classList.toggle('over', x === over));
      }
    });
    const up = e => {
      if (!g) return;
      const cur = g; g = null;
      box.querySelectorAll('.cb-bin').forEach(x => x.classList.remove('over'));
      if (cur.ghost) {
        cur.ghost.remove(); cur.b.classList.remove('lifted');
        const bin = document.elementsFromPoint(e.clientX, e.clientY).find(x => x.classList && x.classList.contains('cb-bin'));
        if (bin) onDrop(cur.id, bin.dataset.k);
      } else onTap(cur.id);
    };
    box.addEventListener('pointerup', up); box.addEventListener('pointercancel', e => { if (g && g.ghost) g.ghost.remove(); if (g) g.b.classList.remove('lifted'); g = null; });
  }
  async function stepFlip(s) {
    stepsBar('flip');
    const qs = dayQs(s).filter(q => !q.flipOf);
    if (!qs.length || dayQs(s).some(q => q.flipOf)) return;
    let sel = null;
    const P = pane(`<p class="cb-ask">${L.flip}</p>
      <div class="cb-bins static">
        <div class="cb-bin short"><b>${L.short}</b><span class="in">${qs.map((q, i) => (q.kind === 'short' ? bubble(q, i) : '')).join('')}</span></div>
        <div class="cb-bin long"><b>${L.long}</b><span class="in">${qs.map((q, i) => (q.kind === 'long' ? bubble(q, i) : '')).join('')}</span></div>
      </div>
      ${qs.some(q => !q.kind) ? `<div class="cb-bubs">${qs.map((q, i) => (q.kind ? '' : bubble(q, i))).join('')}</div>` : ''}
      <p class="cb-flipto" id="cbFlipTo"></p>
      <div class="cb-microw"><button class="cb-mic" id="cbFlipMic" disabled><span class="lv"></span>🎤<b>${L.mic}</b></button></div>`);
    say('flip');
    P.addEventListener('click', e => {
      const b = e.target.closest('.cb-bub'); if (!b || REC) return;
      sel = qs.find(q => q.id === b.dataset.q) || null;
      P.querySelectorAll('.cb-bub').forEach(x => x.classList.toggle('sel', x === b));
      playBubble(b);
      const to = sel && sel.kind === 'short' ? 'toLong' : sel && sel.kind === 'long' ? 'toShort' : null;
      $('#cbFlipTo').textContent = to ? L[to] + ' 🔄' : '🔄';
      $('#cbFlipMic').disabled = false;
    });
    const noMic = !canRecord();
    await new Promise(ok => {
      $('#cbFlipMic').addEventListener('click', async function go() {
        if (!sel) return;
        const b = $('#cbFlipMic');
        if (REC) { stopRec(); return; }
        api.SFX.init(); ac();
        let rec = null;
        if (!noMic) {
          b.classList.add('rec'); b.querySelector('b').textContent = L.micStop;
          try { rec = await record(15000, v => b.style.setProperty('--lv', v.toFixed(2))); } catch (e) { api.toast(L.noMic); }
          b.classList.remove('rec'); b.querySelector('b').textContent = L.mic;
          if (!rec) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
        }
        const id = 'q-' + Date.now();
        if (rec) await keepClip(id, rec, 'flip');
        r.qs.push({ id, day: s.t, m: s.m.id, at: Date.now(), kind: sel.kind === 'short' ? 'long' : sel.kind === 'long' ? 'short' : null, flipOf: sel.id, star: false, status: 'wondering', audio: !!rec });
        save();
        b.removeEventListener('click', go);
        $('#cbFlipTo').textContent = L.flipDone; $('#cbFlipTo').classList.add('pop'); api.SFX.good(); flowerBurst();
        await sayFor('flipDone', 1400);
        ok();
      });
    });
  }
  function flowerBurst() {
    if (api.reduced()) return;
    for (let i = 0; i < 7; i++) { const el = document.createElement('span'); el.className = 'cb-petal'; el.textContent = '🌸'; el.style.setProperty('--a', (i * 51) + 'deg'); $('#cbsess').append(el); setTimeout(() => el.remove(), 1400); }
  }

  /* ---------- 4. her favourite question, and her prediction ---------- */
  async function stepStar(s) {
    stepsBar('star');
    const qs = dayQs(s);
    if (!qs.length) return;
    let pick = qs.find(q => q.star) || null;
    if (!pick) {
      const P = pane(`<p class="cb-ask">${L.star}</p><div class="cb-bubs big star" id="cbStarBubs">${qs.map((q, i) => bubble(q, i, ' starable')).join('')}</div>
        <button class="cb-big" id="cbStarOk" hidden>${L.next}</button>`);
      say('star');
      await new Promise(ok => {
        P.addEventListener('click', e => {
          const b = e.target.closest('.cb-bub');
          if (b) { pick = qs.find(q => q.id === b.dataset.q); P.querySelectorAll('.cb-bub').forEach(x => x.classList.toggle('starred', x === b)); playBubble(b); $('#cbStarOk').hidden = false; api.SFX.star(); return; }
          if (e.target.closest('#cbStarOk') && pick) ok();
        });
      });
      qs.forEach(q => { q.star = q === pick; });
      pick.status = 'waiting'; save();
    }
    if (!live(s)) return;
    const trick = s.m.theme === 'F' && s.m.predict;
    stage.innerHTML = `<div class="cb-bubs big"><span class="cb-starbig">⭐</span>${bubble(pick, qs.indexOf(pick))}</div>
      <p class="cb-ask">${esc(trick ? s.m.predict : L.predict)}</p>
      <div class="cb-microw"><button class="cb-mic" id="cbPredMic"><span class="lv"></span>🎤<b>${L.micGuess}</b></button></div>`;
    stage.querySelector('.cb-bub').addEventListener('click', e => playBubble(e.currentTarget));
    await sayFor(trick ? 'p-' + s.m.id : 'predict', 600);
    await new Promise(ok => {
      $('#cbPredMic').addEventListener('click', async function go() {
        const b = $('#cbPredMic');
        if (REC) { stopRec(); return; }
        api.SFX.init(); ac();
        let rec = null;
        if (canRecord()) {
          b.classList.add('rec'); b.querySelector('b').textContent = L.micStop;
          try { rec = await record(20000, v => b.style.setProperty('--lv', v.toFixed(2))); } catch (e) { api.toast(L.noMic); }
          b.classList.remove('rec'); b.querySelector('b').textContent = L.micGuess;
          if (!rec) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
          const id = 'p-' + Date.now(); await keepClip(id, rec, 'prediction'); pick.pred = id; save();
        }
        b.removeEventListener('click', go); ok();
      });
    });
  }
  function finishDay(s) {
    const qs = dayQs(s), n = qs.filter(q => !q.flipOf).length, f = qs.filter(q => q.flipOf).length;
    s.day.done = true; s.day.step = 'done'; s.day.n = n; s.day.endAt = Date.now(); save();
    S = null;
    const parts = [`سألتِ ${qCount(n)}`];
    if (f) parts.push('وقلبتِ سؤالاً 🌸');
    parts.push('واخترتِ سؤالكِ المفضّل ⭐');
    celebrate(`<div class="cb-celtree" id="cbCelTree"></div><h2>أحسنتِ!</h2><p>${parts.join('، ')}</p><p class="soft">${L.end}</p><button class="cb-big" id="cbCelOk">${L.goHome}</button>`, () => home());
    renderTree($('#cbCelTree'));
    say('end');
  }
  function celebrate(html, after) {
    $('#cbCelBox').innerHTML = html; $('#cbCel').hidden = false;
    try { api.confetti($('#cbConfetti')); } catch (e) {}
    chime();
    const ok = $('#cbCelOk');
    if (ok) ok.addEventListener('click', () => { api.SFX.init(); $('#cbCel').hidden = true; try { api.stopConfetti($('#cbConfetti')); } catch (e) {} stopAudio(); if (after) after(); }, { once: true });
  }
  function chime() { const X = api.SFX; if (!X.ready || !X.ready()) return; X.bell(1046.5, 0, 1.1, 0.2); X.bell(1568, 0.18, 1.4, 0.15); X.hold(1.5); }

  /* =====================================================================================================
     5. Find out together (later, with Mama or Baba, no timer)
     ===================================================================================================== */
  async function openFind(qid) {
    await ready; leave();
    const q = r.qs.find(x => x.id === qid) || waitingQs()[0];
    if (!q) return home();
    const m = M(q.m) || { id: q.m, line: '', hints: [] };
    const fs = { q, m };
    S = fs;
    const box = $('#cbfind');
    box.innerHTML = `<div class="cb-top"><button class="quit" id="cbFindX" aria-label="الرئيسية">${ic('i-close')}</button><h1 class="cb-ftitle">${L.together} 🔍</h1></div>
      <div class="cb-fbody">
        ${mysteryHTML(m, true)}
        <div class="cb-frow">
          <div class="cb-fcol"><small>${L.mine}</small>${bubble(q, 0, ' solo').replace('<span class="n">١</span>', '<span class="n">⭐</span>')}</div>
          ${q.pred ? `<div class="cb-fcol"><small>${L.myGuess} 💭</small><button class="cb-bub guess" data-q="${q.pred}"><span class="n">؟</span><span class="wv" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button></div>` : ''}
        </div>
        <p class="cb-idk">«${L.idk}»</p>
        <button class="cb-cardbtn" id="cbCardBtn" lang="en" dir="ltr">For Mama or Baba: how to find out</button>
        <div class="cb-fact" id="cbFact">
          <button class="cb-mic" id="cbFoundMic"><span class="lv"></span>🎤<b>${L.found}</b></button>
          <button class="cb-btn soft" id="cbWonder">${L.wonder}</button>
        </div>
      </div>`;
    api.show('cbfind');
    box.querySelector('.cb-frow').addEventListener('click', e => { const b = e.target.closest('.cb-bub'); if (b) playBubble(b); });
    $('#cbFindX').addEventListener('click', () => { leave(); home(); });
    $('#cbCardBtn').addEventListener('click', () => showCard(m));
    $('#cbWonder').addEventListener('click', () => {
      q.status = 'wondering'; q.wonderDay = today(); save();
      celebrate(`<div class="cb-celic">💭</div><h2>${L.wonderOk}</h2><button class="cb-big" id="cbCelOk">${L.goHome}</button>`, () => home());
      say('wonderOk');
    });
    $('#cbFoundMic').addEventListener('click', async function go() {
      const b = $('#cbFoundMic');
      if (REC) { stopRec(); return; }
      api.SFX.init(); ac();
      if (canRecord()) {
        b.classList.add('rec'); b.querySelector('b').textContent = L.micStop;
        let rec = null;
        try { rec = await record(30000, v => b.style.setProperty('--lv', v.toFixed(2))); } catch (e) { api.toast(L.noMic); }
        b.classList.remove('rec'); b.querySelector('b').textContent = L.found;
        if (!rec) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
        const id = 'f-' + Date.now(); await keepClip(id, rec, 'finding'); q.found = id; save();
      }
      b.removeEventListener('click', go);
      askSurprised(fs);
    });
    say('found');
  }
  function askSurprised(fs) {
    const { q } = fs, box = $('#cbfind');
    ['.cb-myst', '.cb-frow', '.cb-idk'].forEach(sel => { const el = box.querySelector(sel); if (el) el.hidden = true; });
    $('#cbFact').innerHTML = `<p class="cb-ask">${L.surprised}</p>
      <div class="cb-frow">${q.pred ? `<div class="cb-fcol"><small>${L.myGuess}</small><button class="cb-bub guess" data-q="${q.pred}"><span class="n">؟</span><span class="wv"><i></i><i></i><i></i><i></i></span></button></div>` : ''}
        ${q.found ? `<div class="cb-fcol"><small>${L.found}</small><button class="cb-bub found" data-q="${q.found}"><span class="n">💡</span><span class="wv"><i></i><i></i><i></i><i></i></span></button></div>` : ''}</div>
      <div class="cb-choice"><button class="cb-btn" data-s="yes">${L.yes}</button><button class="cb-btn" data-s="little">${L.little}</button><button class="cb-btn" data-s="no">${L.no}</button></div>`;
    say('surprised');
    $('#cbFact').addEventListener('click', e => {
      const b = e.target.closest('.cb-bub'); if (b) { playBubble(b); return; }
      const c = e.target.closest('[data-s]'); if (!c) return;
      q.surprised = c.dataset.s; q.status = 'found'; q.foundDay = today(); save();
      api.SFX.good();
      celebrate(`<div class="cb-celtree" id="cbCelTree"></div><h2>${L.fruit}</h2><button class="cb-big" id="cbCelOk">${L.goHome}</button>`, () => home());
      renderTree($('#cbCelTree'));
      say('fruit');
    });
  }

  /* ---------- the parent card (English): shown on the find-out screen and in the parent area ---------- */
  function mdHTML(md) {
    const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/«([^»]+)»/g, '<span class="ar" lang="ar" dir="rtl">«$1»</span>');
    const items = [], paras = [];
    String(md || '').split('\n').forEach(line => {
      const b = /^(\s*)- (.*)$/.exec(line);
      if (b) items.push({ d: Math.max(0, Math.floor(b[1].length / 2) - 1), t: b[2] });
      else if (line.trim()) { if (items.length) items[items.length - 1].t += ' ' + line.trim(); else paras.push(line.trim()); }
    });
    const cap = t => t.replace(/^[a-z]/, c => c.toUpperCase());
    let html = paras.length ? `<p>${inline(cap(paras.join(' ')))}</p>` : '', depth = -1;
    const open = [];
    items.forEach(it => {
      while (depth < it.d) { html += '<ul>'; depth++; open[depth] = false; }
      while (depth > it.d) { if (open[depth]) html += '</li>'; html += '</ul>'; depth--; }
      if (open[depth]) html += '</li>';
      html += `<li>${inline(it.t)}`; open[depth] = true;
    });
    while (depth >= 0) { if (open[depth]) html += '</li>'; html += '</ul>'; depth--; }
    return html;
  }
  function cardHTML(m) {
    if (!m) return '';
    const ph = photoOf(m);
    const secs = (m.card || []).map(x => `<section><h3>${esc(x.label)}</h3>${mdHTML(x.md)}</section>`).join('');
    const own = m.own ? `<section><h3>Your note</h3><p>${esc(m.note || 'Your own mystery.')}</p></section>` : '';
    return `<div class="cb-card">
      <header>${ph ? `<img src="${esc(ph)}" alt="">` : ''}<div><small>${esc(m.id)}${D.themes[m.theme] ? ' · ' + esc(D.themes[m.theme].en) : ''}${m.chapter ? ' · science book chapter ' + m.chapter : ''}</small>
        <p class="ar" lang="ar" dir="rtl">${m.verse ? '﴿' + esc(m.verse.text) + '﴾' : esc(m.line)}</p></div></header>
      <section class="cb-idkbox"><p>If you do not know the answer, say it out loud: <span class="ar" lang="ar" dir="rtl">«${L.idk}»</span></p></section>
      ${secs}${own}
      ${m.credit ? `<p class="cb-credit">Photo: ${esc(m.credit)}</p>` : ''}</div>`;
  }
  function showCard(m) {
    const ov = $('#cbCard');
    ov.innerHTML = `<div class="cb-cardwrap"><button class="rp-x cb-cardx" aria-label="Close">${ic('i-close')}</button>${cardHTML(m)}</div>`;
    ov.hidden = false;
    ov.querySelector('.cb-cardx').addEventListener('click', () => { ov.hidden = true; }, { once: true });
  }

  /* =====================================================================================================
     Her journal: every question she has asked, with its audio, its date and its status
     ===================================================================================================== */
  function dateAr(ds) {
    try { return toDate(ds).toLocaleDateString('ar-u-ca-gregory-nu-arab', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return AR(ds); }
  }
  async function openBook() {
    await ready; leave();
    const days = [...new Set(r.qs.map(q => q.day))].sort().reverse();
    const status = q => (q.status === 'found' ? `<span class="cb-st found">${L.stFound}</span>` : q.status === 'waiting' ? `<span class="cb-st wait">${L.stWait}</span>`
      : `<span class="cb-st wonder">${L.stWonder}</span><button class="cb-st again" data-again="${q.id}">${L.again}</button>`);
    $('#cbbook').innerHTML = `<div class="cb-top"><button class="quit" id="cbBookX" aria-label="الرئيسية">${ic('i-close')}</button><h1 class="cb-ftitle">📒 ${L.book}</h1></div>
      <div class="cb-pages">${days.length ? days.map(d => {
        const qs = r.qs.filter(q => q.day === d), m = M(qs[0].m);
        return `<section class="cb-page"><header>${m && photoOf(m) ? `<img src="${esc(photoOf(m))}" alt="">` : '<span class="cb-pgic">❓</span>'}<div><small>${esc(dateAr(d))}</small><p>${m ? esc(m.verse ? '﴿' + m.verse.text + '﴾' : m.line) : ''}</p></div></header>
          <ul>${qs.map((q, i) => `<li class="cb-row${q.star ? ' starred' : ''}" data-q="${q.id}"><button class="cb-play" data-q="${q.id}" aria-label="استمعي">▶</button><span class="cb-rn">${q.star ? '⭐' : AR(i + 1)}</span>${q.flipOf ? '<span>🌸</span>' : ''}${status(q)}</li>`).join('')}</ul></section>`;
      }).join('') : '<p class="cb-empty">هنا ستعيش أسئلتكِ كلّها 💭</p>'}</div>`;
    api.show('cbbook');
    const book = $('#cbbook');
    $('#cbBookX').addEventListener('click', () => home());
    // a tap on ▶, or a long press on the line, plays the question again
    let lp = null;    // (on* handlers, so opening the journal again never adds a second one)
    book.onpointerdown = e => { const row = e.target.closest('.cb-row'); if (!row || e.target.closest('button')) return; lp = setTimeout(() => { lp = null; row.classList.add('playing'); playMine(row.dataset.q).then(() => row.classList.remove('playing')); }, 450); };
    book.onpointerup = book.onpointerleave = book.onpointercancel = () => { if (lp) { clearTimeout(lp); lp = null; } };
    book.onclick = e => {
      const p = e.target.closest('.cb-play');
      if (p) { const row = p.closest('.cb-row'); row.classList.add('playing'); playMine(p.dataset.q).then(() => row.classList.remove('playing')); return; }
      const a = e.target.closest('[data-again]');
      if (a) { const q = r.qs.find(x => x.id === a.dataset.again); if (q) { q.status = 'waiting'; save(); api.SFX.star(); openFind(q.id); } }
    };
  }

  /* =====================================================================================================
     The surprise box: only when Mama chooses, never for a number of questions or days
     ===================================================================================================== */
  function openSurprise() {
    const p = r.surprise.pending; if (!p) return;
    r.surprise.given.push({ ...p, opened: Date.now() }); r.surprise.pending = null; save();
    celebrate(`<div class="cb-celic">🎁</div><h2>${esc(p.msg || L.surpriseMsg)}</h2><button class="cb-big" id="cbCelOk">💝</button>`, () => home());
  }

  /* =====================================================================================================
     The parent area (English), behind a 2-second press on the gear
     ===================================================================================================== */
  const fmtDay = d => toDate(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  async function openParent() {
    await ready; leave();
    const t = today(), tm = todayPick(r, D, t), m = M(tm), started = !!(r.days[t] && r.days[t].m), next = tomorrowPick(r, D, t), nm = M(next);
    const qsT = r.qs.filter(q => q.day === t);
    const days14 = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13)), per = d => r.qs.filter(q => q.day === d && !q.flipOf).length;
    const mx = Math.max(5, ...days14.map(per));
    const w = weekStats(r, t), tc = treeCounts(r);
    const met = D.mysteries.filter(x => r.used[x.id]).length, readyN = D.mysteries.filter(x => x.ready).length;
    const changeNow = started && !dayDone(r, t) && !qsT.length, shown = started && !changeNow ? next : tm;
    const opts = D.mysteries.filter(x => x.ready).map(x => `<option value="${x.id}"${x.id === shown ? ' selected' : ''}>${x.id} · ${esc(D.themes[x.theme].en)}${r.used[x.id] ? ' (met ' + fmtDay(r.used[x.id]) + ')' : ''}</option>`).join('')
      + r.own.map(o => `<option value="${o.id}"${o.id === shown ? ' selected' : ''}>Your own: ${esc(o.line.slice(0, 30))}</option>`).join('');
    const chOpts = Object.entries(D.chapters).map(([n, name]) => `<option value="${n}">Chapter ${n}: ${esc(name)}</option>`).join('');
    const sci = r.science.slice(-3).reverse();
    const drawing = mm => mm && mm.kind === 'drawing';
    const qWords = ['لماذا', 'كيف', 'ماذا لو', 'ماذا', 'هل', 'كم', 'متى', 'أين', 'من', 'أيّ', 'من أين'];
    $('#cbparent').innerHTML = `<div class="rp cbp">
      <header class="rp-head"><h1>Curiosity Box · Mama</h1><button class="rp-x" data-act="close">${ic('i-close')}</button></header>
      <section class="rp-card"><h2>Today${started ? '' : ' (not opened yet)'}</h2>
        ${m ? `<div class="cbp-m">${photoOf(m) ? `<img src="${esc(photoOf(m))}" alt="">` : '<span class="cbp-noimg">🎨</span>'}<div><p class="ar" lang="ar" dir="rtl">${m.verse ? '﴿' + esc(m.verse.text) + '﴾' : esc(m.line)}</p>
          <p class="sub">${esc(m.id)} · ${esc(m.own ? 'your own mystery' : D.themes[m.theme].en)}${dayDone(r, t) ? ` · done, ${r.days[t].n || 0} questions` : ''}</p></div></div>` : '<p>No mystery is ready.</p>'}
        <div class="rp-row"><button class="rp-btn main" data-act="card">Parent card</button>
          ${drawing(m) ? `<label class="rp-btn">${PH['m-' + m.id] ? 'Retake' : 'Photograph'} her drawing<input type="file" accept="image/*" capture="environment" data-photo="${m.id}" hidden></label>` : ''}
          ${m && !drawing(m) && !m.own ? `<label class="rp-btn">Use my own photo for it<input type="file" accept="image/*" data-photo="${m.id}" hidden></label>` : ''}
          ${m && PH['m-' + m.id] && !drawing(m) ? '<button class="rp-btn" data-act="unphoto">Back to the app photo</button>' : ''}</div>
        <div class="rp-set">Change ${changeNow ? "today's" : 'the next'} mystery <select id="cbpPick">${opts}</select><button class="rp-btn" data-act="pick">Set</button></div>
        ${nm ? `<p>Next: <b>${esc(nm.id)}</b> <span class="ar" lang="ar" dir="rtl">${esc(nm.verse ? '﴿' + nm.verse.text + '﴾' : nm.line)}</span>${drawing(nm) ? ` <label class="rp-btn warn">Photograph her ${nm.id === 'D8' ? 'space ' : ''}drawing tonight<input type="file" accept="image/*" capture="environment" data-photo="${nm.id}" hidden></label>${PH['m-' + nm.id] ? ' ✓ photo ready' : ''}` : ''}
          ${nm.homeTip ? `<br><span class="sub">Best with your own photo: ${esc(nm.homeTip)}.</span> <label class="rp-btn${PH['m-' + nm.id] ? '' : ' warn'}">${PH['m-' + nm.id] ? 'Retake' : 'Take'} the photo<input type="file" accept="image/*" capture="environment" data-photo="${nm.id}" hidden></label>${PH['m-' + nm.id] ? ' ✓ your photo is ready' : ''}` : ''}</p>` : ''}
      </section>
      <section class="rp-card"><h2>Science book</h2>
        <p>Mark the chapter her class starts next. Her next session (this evening, or tomorrow if today's is done) meets it with a mystery of its own.</p>
        <div class="rp-set"><select id="cbpCh">${chOpts}</select><button class="rp-btn main" data-act="science">Her class starts this next</button></div>
        ${sci.length ? `<p class="sub">${sci.map(x => `${fmtDay(x.day)}: chapter ${x.ch} → ${x.m ? esc(x.m) : 'no mystery left for this chapter'}`).join(' · ')}</p>` : ''}
        ${r.queue.length ? `<p class="sub">Waiting: ${r.queue.map(x => `${esc(x.m)} (${esc(x.why)})`).join(', ')}</p>` : ''}
      </section>
      <section class="rp-card"><h2>Today's questions</h2>${qsT.length ? `<div class="cbp-qs">${qsT.map((q, i) => `<button class="rp-chip" data-play="${q.id}">▶ ${i + 1}${q.flipOf ? ' 🌸 flipped' : ''}${q.kind ? ' · ' + q.kind + ' answer' : ''}${q.star ? ' · ⭐' : ''}</button>${q.pred ? `<button class="rp-chip" data-play="${q.pred}">▶ her prediction</button>` : ''}`).join('')}</div>` : '<p>None yet today.</p>'}
        ${waitingQs().length ? `<p>Waiting to find out together: ${waitingQs().length}. <button class="rp-btn" data-act="find">Open "find out together"</button></p>` : ''}</section>
      <section class="rp-card"><h2>Tips for adults</h2><ul>${TIPS_EN.map(x => `<li>${x.replace(/«([^»]+)»/g, '<span class="ar" lang="ar" dir="rtl">«$1»</span>')}</li>`).join('')}</ul></section>
      <section class="rp-card"><h2>Surprise box</h2><p>Only when you choose. It never comes for a number of questions or days.</p>
        <div class="rp-set"><input id="cbpMsg" lang="ar" dir="rtl" placeholder="${L.surpriseMsg}" maxlength="80"><button class="rp-btn main" data-act="surprise">${r.surprise.pending ? 'Waiting for her ✓ (change)' : 'Give a surprise'}</button></div>
        ${r.surprise.given.length ? `<p class="sub">Given: ${r.surprise.given.slice(-5).map(g => fmtDay(fmt(new Date(g.at)))).join(', ')}</p>` : ''}</section>
      <section class="rp-card"><h2>Add your own mystery</h2>
        <p>A photo, one short line in Arabic and up to three hints (a question word and two keywords, never a full question). It becomes her next mystery.</p>
        <div class="cbp-own">
          <label class="rp-btn">Choose a photo<input type="file" accept="image/*" id="cbpOwnPh" hidden></label><span id="cbpOwnOk" class="sub"></span>
          <input id="cbpOwnLine" lang="ar" dir="rtl" placeholder="سطر واحد قصير" maxlength="80">
          ${[1, 2, 3].map(k => `<div class="cbp-h"><select data-hw="${k}">${qWords.map(x => `<option>${x}</option>`).join('')}</select><input data-hk="${k}a" lang="ar" dir="rtl" placeholder="كلمة"><input data-hk="${k}b" lang="ar" dir="rtl" placeholder="كلمة"></div>`).join('')}
          <input id="cbpOwnNote" placeholder="A note for yourself (optional, English)">
          <button class="rp-btn main" data-act="own">Add it</button></div></section>
      <section class="rp-card"><h2>Her questions over time</h2><p class="sub">For you only: Maria never sees counts as a target.</p>
        <div class="rp-bars">${days14.map(d => `<div class="rp-bar${d === t ? ' today' : ''}"><i style="height:${Math.round(per(d) / mx * 60)}px"></i><b>${per(d)}</b><span>${fmtDay(d).split(' ')[1] || ''}</span></div>`).join('')}</div>
        <div class="rp-stats"><span><b>${tc.leaves}</b> questions (leaves)</span><span><b>${tc.flowers}</b> flipped (flowers)</span><span><b>${tc.fruits}</b> found out together (fruits)</span><span><b>${tc.wonder}</b> still wondering</span><span><b>${streakOf(r, t)}</b> ${streakOf(r, t) === 1 ? 'day' : 'days'} in a row</span><span><b>${met}</b> of ${readyN} mysteries met</span></div></section>
      <section class="rp-card"><h2>This week</h2><p>Since ${fmtDay(w.from)}: ${w.days} ${w.days === 1 ? 'session' : 'sessions'}, ${w.questions} questions (${w.short} short-answer, ${w.long} long-answer), ${w.flips} flipped, ${w.found} found out together, ${w.wondering} still wondering.</p></section>
      <section class="rp-card"><h2>Settings</h2>
        <label class="rp-set">Question storm <select id="cbpStorm"><option value="120"${r.settings.storm === 120 ? ' selected' : ''}>2 minutes</option><option value="180"${r.settings.storm === 180 ? ' selected' : ''}>3 minutes</option></select></label>
        <label class="rp-set">A hint after <select id="cbpHint">${[8, 10, 15, 20].map(k => `<option value="${k}"${k === r.settings.hintAfter ? ' selected' : ''}>${k} seconds of quiet</option>`).join('')}</select></label>
        <label class="rp-set">Read the four rules aloud <select id="cbpRules"><option value="always"${r.settings.rules === 'always' ? ' selected' : ''}>every session</option><option value="week1"${r.settings.rules === 'week1' ? ' selected' : ''}>in her first week only</option></select></label></section>
      <section class="rp-card"><h2>Coming in Phase 2</h2><p>The Mystery Box game, Big Question Day (Fridays) and Baba's dinner question.</p></section>
      <section class="rp-card"><h2>Backup</h2><p>One file holds all her progress in every app, with her recordings and your photos.</p>
        <div class="rp-row"><button class="rp-btn" data-act="backup">Back up progress</button><label class="rp-btn">Restore from a file<input type="file" id="cbpFile" accept="application/json,.json" hidden></label></div></section>
    </div>`;
    api.show('cbparent');
    let ownPhoto = null;
    const P = $('#cbparent');
    P.onclick = async e => {
      const pl = e.target.closest('[data-play]'); if (pl) { playMine(pl.dataset.play); return; }
      const b = e.target.closest('[data-act]'); if (!b) return;
      const act = b.dataset.act;
      if (act === 'close') return home();
      if (act === 'card') return showCard(m);
      if (act === 'find') return openFind();
      if (act === 'backup') return api.backup && api.backup();
      if (act === 'unphoto') { await delPhoto('m-' + m.id); delete r.mine[m.id]; save(); return openParent(); }
      if (act === 'pick') {
        const id = $('#cbpPick').value; if (!id) return;
        if (started && !dayDone(r, t) && !qsT.length) { const old = r.days[t].m; if (r.used[old] === t) delete r.used[old]; delete r.days[t]; }
        r.queue = r.queue.filter(x => x.m !== id); r.queue.unshift({ m: id, why: 'pick', day: t }); save();
        api.toast('Done.'); return openParent();
      }
      if (act === 'science') {
        const id = scienceAdd(r, D, $('#cbpCh').value, t); save();
        api.toast(id ? `Next session: ${id}.` : 'Every mystery for that chapter has been met.'); return openParent();
      }
      if (act === 'surprise') { r.surprise.pending = { msg: $('#cbpMsg').value.trim(), at: Date.now() }; save(); api.toast('The surprise waits on her Curiosity Box home.'); return openParent(); }
      if (act === 'own') {
        const line = $('#cbpOwnLine').value.trim();
        if (!ownPhoto || !line) { api.toast('A photo and one line in Arabic, please.'); return; }
        const hints = [1, 2, 3].map(k => ({ w: P.querySelector(`[data-hw="${k}"]`).value, k: [P.querySelector(`[data-hk="${k}a"]`).value.trim(), P.querySelector(`[data-hk="${k}b"]`).value.trim()].filter(Boolean) })).filter(h => h.k.length);
        const id = 'own-' + Date.now();
        await putPhoto(id, ownPhoto);
        r.own.push({ id, line, hints, note: $('#cbpOwnNote').value.trim(), made: t });
        r.queue.unshift({ m: id, why: 'own', day: t }); save();
        api.toast('Added: it is her next mystery.'); return openParent();
      }
    };
    P.onchange = async e => {
      const el = e.target;
      if (el.dataset.photo) {
        const f = el.files && el.files[0]; el.value = ''; if (!f) return;
        try { await putPhoto('m-' + el.dataset.photo, await shrinkPhoto(f)); r.mine[el.dataset.photo] = t; save(); api.toast('Photo saved on this iPad.'); } catch (err) { api.toast('That photo did not open.'); }
        return openParent();
      }
      if (el.id === 'cbpOwnPh') { const f = el.files && el.files[0]; el.value = ''; if (!f) return; try { ownPhoto = await shrinkPhoto(f); $('#cbpOwnOk').textContent = '✓ photo ready'; } catch (err) { api.toast('That photo did not open.'); } return; }
      if (el.id === 'cbpStorm') { r.settings.storm = Number(el.value); save(); }
      if (el.id === 'cbpHint') { r.settings.hintAfter = Number(el.value); save(); }
      if (el.id === 'cbpRules') { r.settings.rules = el.value; save(); }
      if (el.id === 'cbpFile') { const f = el.files[0]; if (f && api.restore) api.restore(f); el.value = ''; }
    };
  }

  /* ---------- leaving, and the wiring ---------- */
  function leave() { S = null; stopRec(); stopAudio(); $('#cbCard').hidden = true; }
  api.holdToOpen($('#cbGear'), 2000, openParent);
  $('#cbGo').addEventListener('click', () => { if (!$('#cbGo').disabled) { unlock(); ac(); start(); } });
  $('#cbFindBtn').addEventListener('click', () => { api.SFX.init(); unlock(); ac(); openFind(); });
  $('#cbBookBtn').addEventListener('click', () => { api.SFX.init(); unlock(); ac(); openBook(); });
  $('#cbSurprise').addEventListener('click', () => { api.SFX.init(); openSurprise(); });
  $('#cbQuit').addEventListener('click', () => { leave(); home(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopRec(); stopAudio(); } });

  const SCREENS = ['cbhome', 'cbsess', 'cbfind', 'cbbook', 'cbparent'];
  return {
    home, ready,
    isOn: () => SCREENS.some(id => !$('#' + id).hidden) || !$('#cbCel').hidden,
    busy: () => !!S || !!REC || ['cbsess', 'cbfind', 'cbparent'].some(id => !$('#' + id).hidden) || !$('#cbCel').hidden,
    leave,
    status: () => { const t = today(); return { done: dayDone(r, t), started: !!(r.days[t] && r.days[t].m), waiting: waitingQs().length }; },
    snapshot: () => JSON.parse(JSON.stringify(r)),
    valid,
    replace(obj) { r = clean(obj); save(); },
    // for tests (?dev=1)
    get state() { return r; }, get data() { return D; }, core, openParent, openFind, openBook, start, _mystery: id => M(id),
    _treeArt: cnt => (TREE ? treeArt(cnt, cnt) : '')
  };
}

root.CuriosityBox = { core, mount };
if (typeof module !== 'undefined') module.exports = { core };
})(typeof window !== 'undefined' ? window : globalThis);
