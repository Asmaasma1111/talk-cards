/* مكتبتي: Maria's story library, the third sub-app in Talk Cards (Maria only).
   A reading room with a wooden bookcase: one shelf of ten books at a time, one new book a day, rereading any time.
   The stories are stories.json (built by scripts/build_stories.py from the story files, word for word).
   Each book: pages turned like an Arabic book, pause questions, then the five end pages
   (من الجهة الأخرى، جملة سحرية، كلمة الشعور، أداة جديدة للمرسم، مهمّة اليوم). A path of 30 circles fills as she reads.
   Loaded before app.js; app.js calls Maktabati.mount(api). Progress: localStorage tc:maria:lib (in the backup file).
   Phase 1: library, reader, end pages, tracker. The studio, the parent area and Baba's messages come next. */
(function (root) {
'use strict';

const KEY = 'tc:maria:lib';
const TRACK = 30;                       // circles on the reading path
const AR = n => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

/* ---------- progress (no DOM: scripts/test_library.js runs this in Node) ---------- */
function blank() {
  return {
    v: 1,
    read: {},                          // id -> {day: first finished, times}
    order: [],                         // ids in the order she first finished them: the reading path
    today: { day: '', id: '' },        // the new book she opened today (one a day)
    place: {},                         // id -> the page she was on (a book not finished yet)
    missions: {},                      // id -> {state: 'done' | 'later', day, feel}
    tools: [], notebook: [], feelings: [],   // ids whose tool / magic sentence / feeling word she has collected
    doors: {},                         // shelf -> the day its glass door swung open (shown once)
    seen: {},                          // milestone celebrations already shown (10, 20, 30)
    deco: {},                          // shelf -> {color, item, garland, photo}: how she decorated a finished shelf
    sound: true
  };
}
function clean(s) {
  const d = blank();
  if (!s || typeof s !== 'object') return d;
  const obj = x => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  const arr = x => (Array.isArray(x) ? x.filter(v => typeof v === 'string') : []);
  return { ...d, ...s, read: obj(s.read), order: arr(s.order), today: { ...d.today, ...obj(s.today) }, place: obj(s.place),
    missions: obj(s.missions), tools: arr(s.tools), notebook: arr(s.notebook), feelings: arr(s.feelings),
    doors: obj(s.doors), seen: obj(s.seen), deco: obj(s.deco), sound: s.sound !== false };
}
const valid = s => !!(s && typeof s === 'object' && s.read && typeof s.read === 'object' && Array.isArray(s.order));
const onShelf = (stories, n) => stories.filter(s => s.shelf === n);
const shelves = stories => [...new Set(stories.map(s => s.shelf))].sort((a, b) => a - b);
function shelfOpen(lib, stories, n) {
  return n === shelves(stories)[0] || onShelf(stories, n - 1).every(s => lib.read[s.id]);
}
// The books are read in order (her request, 13 Oct 2026): the next book is the first unread one on the shelf.
const nextOn = (lib, stories, n) => onShelf(stories, n).filter(s => !lib.read[s.id]).sort((a, b) => a.day - b.day)[0] || null;
// A new book finished today, in order (a book read out of order before this rule does not count).
function newToday(lib, stories, t) {
  return stories.some(s => {
    const r = lib.read[s.id]; if (!r || r.day !== t) return false;
    const nx = nextOn(lib, stories, s.shelf);
    return !nx || s.day < nx.day;
  });
}
// What happens when she taps a book: 'read' (reread it), 'new' (the next book, today's), 'door' (its shelf is still behind
// glass), 'last' (the shelf's last book, which opens after the other nine), 'later' (an earlier book comes first),
// 'tomorrow' (she already finished a new book today). Opening a book without finishing it does not use up the day.
function status(lib, stories, story, t) {
  if (lib.read[story.id]) return 'read';
  if (!shelfOpen(lib, stories, story.shelf)) return 'door';
  if (story.locked_until_shelf_done && onShelf(stories, story.shelf).some(s => s.id !== story.id && !lib.read[s.id])) return 'last';
  const nx = nextOn(lib, stories, story.shelf);
  if (nx && nx.id !== story.id) return 'later';
  if (newToday(lib, stories, t)) return 'tomorrow';
  return 'new';
}
function start(lib, story, t) {
  if (!lib.read[story.id] && lib.today.day !== t) lib.today = { day: t, id: story.id };
}
function finish(lib, story, t) {
  const r = lib.read[story.id];
  if (r) { r.times = (r.times || 1) + 1; return { first: false, n: lib.order.length }; }
  lib.read[story.id] = { day: t, times: 1 };
  lib.order.push(story.id);
  ['tools', 'notebook', 'feelings'].forEach(k => { if (!lib[k].includes(story.id)) lib[k].push(story.id); });
  delete lib.place[story.id];
  return { first: true, n: lib.order.length };
}
function setMission(lib, id, state, t, feel) {
  const m = lib.missions[id];
  if (m && m.state === 'done') return m;       // a done mission stays done
  lib.missions[id] = { state, day: t, ...(feel ? { feel } : {}) };
  return lib.missions[id];
}
// Shelves whose glass door is open now but has not swung open on screen yet.
const doorsWaiting = (lib, stories) => shelves(stories).filter(n => n !== shelves(stories)[0] && shelfOpen(lib, stories, n) && !lib.doors[n]);
// The reading path: one circle per book finished, in order, with that book's tool.
function path(lib, byId) {
  const n = Math.max(TRACK, Math.ceil((lib.order.length + 1) / TRACK) * TRACK);
  return Array.from({ length: n }, (_, i) => { const id = lib.order[i]; return id ? { i, id, tool: byId[id] && byId[id].tool } : { i }; });
}
// The pages of a book, in reading order: story pages with their questions, then the five end pages.
function leaves(story) {
  const out = [];
  story.pages.forEach(p => {
    out.push({ kind: 'page', page: p });
    story.questions.filter(q => q.after_page === p.n).forEach(q => out.push({ kind: 'q', q, page: p, qi: story.questions.indexOf(q) }));
  });
  ['other', 'magic', 'feeling', 'tool', 'mission'].forEach(kind => out.push({ kind }));
  return out;
}
const core = { KEY, TRACK, blank, clean, valid, onShelf, shelves, shelfOpen, nextOn, newToday, status, start, finish, setMission, doorsWaiting, path, leaves };

/* =====================================================================================================
   The screens. api from app.js: lsGet, lsSet, today, show, toast, SFX, confetti, stopConfetti, reduced, DEV,
   setDeck, english, maths, stopEnglish.
   ===================================================================================================== */
function mount(api) {
  const $ = (s, r = document) => r.querySelector(s);
  const t = () => api.today();
  let lib = load(), DATA = null, byId = {}, ST = [];
  const ready = fetch('stories.json').then(r => r.json()).then(d => { DATA = d; ST = d.stories; ST.forEach(s => { byId[s.id] = s; }); }).catch(() => {});
  function load() { try { return clean(JSON.parse(api.lsGet(KEY) || 'null')); } catch (e) { return blank(); } }
  function save() { api.lsSet(KEY, JSON.stringify(lib)); }
  const motion = () => !api.reduced();

  /* ---------- markup ---------- */
  document.body.insertAdjacentHTML('beforeend', `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="lb-i-book" viewBox="0 0 24 24"><path d="M3.5 5.2c2.8-1 5.6-.9 8.5.6 2.9-1.5 5.7-1.6 8.5-.6v13.6c-2.8-1-5.6-.9-8.5.6-2.9-1.5-5.7-1.6-8.5-.6z" fill="currentColor" opacity=".25"/><path d="M3.5 5.2c2.8-1 5.6-.9 8.5.6 2.9-1.5 5.7-1.6 8.5-.6v13.6c-2.8-1-5.6-.9-8.5.6-2.9-1.5-5.7-1.6-8.5-.6zM12 5.8v13.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></symbol>
  <symbol id="lb-i-sound" viewBox="0 0 24 24"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
  <symbol id="lb-i-mute" viewBox="0 0 24 24"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
  <symbol id="lb-i-lock" viewBox="0 0 24 24"><path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" fill="none" stroke="#8A5A1C" stroke-width="2.4"/><rect x="5" y="10" width="14" height="10.5" rx="2.6" fill="url(#lb-brass)" stroke="#8A5A1C" stroke-width="1.4"/><circle cx="12" cy="14.6" r="1.6" fill="#5A3A10"/><path d="M12 15.6v2.4" stroke="#5A3A10" stroke-width="1.6" stroke-linecap="round"/></symbol>
  <linearGradient id="lb-satin" gradientUnits="userSpaceOnUse" x1="2" y1="0" x2="10" y2="0"><stop offset="0" stop-color="#D45682"/><stop offset=".45" stop-color="#FFB8CF"/><stop offset=".7" stop-color="#F189AC"/><stop offset="1" stop-color="#C9496F"/></linearGradient>
  <symbol id="lb-i-rib" viewBox="0 0 12 34"><path d="M6 0 C 6 6, 6 9, 6 24" fill="none" stroke="url(#lb-satin)" stroke-width="6.4"/><path d="M2.8 23 h6.4 v10 l-3.2 -4.2 l-3.2 4.2 z" fill="url(#lb-satin)"/></symbol>
  <linearGradient id="lb-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F8DC8C"/><stop offset=".5" stop-color="#D9A441"/><stop offset="1" stop-color="#A9751F"/></linearGradient>
</svg>

<section id="lhome" class="screen lb" dir="rtl" lang="ar" hidden>
  <div class="lb-wall"></div>
  <img class="lb-leaves" src="assets/library/leaves.webp" alt="" aria-hidden="true">
  <img class="lb-window" src="assets/library/window.webp" alt="" aria-hidden="true">
  <div class="lb-beam"></div>
  <div class="lb-floor"></div><div class="lb-rug"></div>
  <img class="lb-plant" src="assets/library/plant.webp" alt="" aria-hidden="true">
  <div class="lb-case" id="lbCase"><img class="lb-ivy" src="assets/library/trailing.webp" alt="" aria-hidden="true">
    <div class="lb-glow"></div><canvas class="lb-dust" id="lbDust" aria-hidden="true"></canvas><div class="lb-crown"><span>مكتبتي</span></div><div class="lb-shelves" id="lbShelves"></div><div class="lb-plinth"></div></div>
  <div class="lb-track" id="lbTrack"></div>
  <div class="lb-top"><div class="deck-row" id="lbDecks"></div><button class="lb-snd" id="lbSound" aria-label="الصوت"></button></div>
  <div class="lb-note" id="lbNote" hidden></div>
  <canvas class="lb-confetti" id="lbConfetti" aria-hidden="true"></canvas>
  <div class="lb-dec" id="lbDec" dir="rtl" hidden><div class="lb-dec-box">
    <h2 id="lbDecTitle"></h2><p>اختاري لوناً لظهر الرفّ، وشيئاً تضعينه عليه، وزينة فوقه إن أحببتِ</p>
    <h3>لون الرفّ</h3><div class="lb-dec-paints" id="lbDecPaints"></div>
    <h3>ماذا تضعين على رفّكِ؟</h3><div class="lb-dec-grid" id="lbDecItems"></div>
    <h3>زينة فوق الرفّ</h3><div class="lb-dec-gar" id="lbDecGar"></div>
    <button class="lb-dec-go" id="lbDecGo">ضعيها على الرفّ</button>
    <div class="lb-dec-note">«صورتي»: تختارين صورة من الآيباد، وتبقى في الآيباد فقط</div>
    <input type="file" id="lbDecFile" accept="image/*" hidden>
  </div></div>
  <div class="lb-cel" id="lbCel" hidden><div class="lb-cel-box"><div class="lb-cel-burst" id="lbCelIc"></div><h2 id="lbCelTitle"></h2><p id="lbCelSub"></p><button class="btn btn-good" id="lbCelOk">رائع!</button></div></div>
</section>

<section id="lbook" class="screen lb lb-reader" dir="rtl" lang="ar" hidden>
  <div class="lb-desk"></div>
  <div class="lb-rtop"><button class="lb-x" id="lbClose" aria-label="أغلقي الكتاب"><svg aria-hidden="true"><use href="#i-close"/></svg></button><div class="lb-prog"><i id="lbProg"></i></div></div>
  <div class="lb-wrap" id="lbWrap"><div class="lb-book" id="lbBook"></div></div>
</section>
<div class="lb-fly" id="lbFly" aria-hidden="true"></div>`);

  // the way in: a green chip beside the deck chips on both Home screens; on the library, chips back to the other two
  const chipHTML = '<svg class="lb-chip-ic" aria-hidden="true"><use href="#lb-i-book"/></svg>مكتبتي';
  function row(screen, chip) {
    if (!screen || !chip) return;
    const r = document.createElement('div'); r.className = 'deck-row';
    screen.append(r); r.append(chip);
    const b = document.createElement('button'); b.className = 'deck-chip deck-lib'; b.lang = 'ar'; b.dir = 'rtl';
    b.innerHTML = chipHTML; b.addEventListener('click', () => { api.SFX.init(); home(); }); r.append(b);
  }
  row($('#home'), $('#toMaths'));
  row($('#mhome'), $('#mxToTalk'));
  $('#lbDecks').innerHTML = '<button class="deck-chip deck-talk" lang="en" dir="ltr" data-go="talk">Talk Cards</button><button class="deck-chip deck-math" lang="ar" dir="rtl" data-go="math"><span class="x" aria-hidden="true">×</span>جدول الضرب</button>';
  $('#lbDecks').addEventListener('click', e => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    leaveRoom(); b.dataset.go === 'talk' ? api.english() : api.maths();
  });

  /* ---------- sounds: real CC0 recordings (assets/audio, see CREDITS.md); chimes in code ---------- */
  const SND = {
    files: { slide: 'lib-slide', open: 'lib-open', close: 'lib-close', place: 'lib-place', flip1: 'lib-flip1', flip2: 'lib-flip2',
      flip3: 'lib-flip3', creak: 'lib-creak', room: 'lib-room', chair: 'lib-chair' },
    buf: {}, out: null, roomSrc: null, roomGain: null, extraT: 0,
    ctx() { api.SFX.init(); const c = api.SFX.ctx; if (c && !this.out) { this.out = c.createGain(); this.out.gain.value = 0.9; this.out.connect(c.destination); } return c; },
    async get(name) {
      if (this.buf[name] !== undefined) return this.buf[name];
      const c = this.ctx(); if (!c) return null;
      this.buf[name] = null;
      try {
        const res = await fetch(`assets/audio/${this.files[name]}.m4a`);
        if (!res.ok) throw new Error('missing');
        const ab = await res.arrayBuffer();
        this.buf[name] = await new Promise((ok, no) => { const pr = c.decodeAudioData(ab, ok, no); if (pr && pr.catch) pr.catch(no); });
      } catch (e) { this.buf[name] = null; }
      return this.buf[name];
    },
    warm() { Object.keys(this.files).forEach(n => this.get(n)); },
    async play(name, vol = 1, opts = {}) {
      if (!lib.sound) return;
      const b = await this.get(name), c = this.ctx(); if (!b || !c) return;
      if (c.state !== 'running') { try { c.resume(); } catch (e) {} }
      const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = vol;
      if (opts.rate) s.playbackRate.value = opts.rate;
      let last = g;
      if (opts.far) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.far; g.connect(f); last = f; }
      s.connect(g); last.connect(this.out); s.start(c.currentTime + (opts.delay || 0));
    },
    flip() { this.play('flip' + (1 + Math.floor(Math.random() * 3)), 0.8, { rate: 0.94 + Math.random() * 0.12 }); },
    chime(at = 0, soft = 1) {                 // a small glass chime, made in code
      const c = this.ctx(); if (!c || !lib.sound) return;
      [1568, 2093, 2637].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + at + i * 0.09;
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.09 * soft, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
        o.connect(g); g.connect(this.out); o.start(t0); o.stop(t0 + 1.5);
      });
    },
    fanfare() { [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.chime(i * 0.13, 0.8)); },
    async roomOn() {
      if (!lib.sound || this.roomSrc) return;
      const b = await this.get('room'), c = this.ctx(); if (!b || !c || this.roomSrc || !lib.sound || $('#lhome').hidden) return;
      const s = c.createBufferSource(), g = c.createGain();
      s.buffer = b; s.loop = true; g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 2.5);
      s.connect(g); g.connect(this.out); s.start(c.currentTime, Math.random() * Math.max(0, b.duration - 1));
      this.roomSrc = s; this.roomGain = g;
      const extra = () => {                  // now and then, far away: a page turning, a chair
        if (!this.roomSrc) return;
        if (Math.random() < 0.6) this.play('flip' + (1 + Math.floor(Math.random() * 3)), 0.12, { far: 1600, rate: 0.9 });
        else this.play('chair', 0.16, { far: 1200 });
        this.extraT = setTimeout(extra, 22000 + Math.random() * 30000);
      };
      this.extraT = setTimeout(extra, 9000 + Math.random() * 12000);
    },
    roomOff() {
      clearTimeout(this.extraT);
      const s = this.roomSrc, g = this.roomGain, c = api.SFX.ctx; this.roomSrc = null;
      if (!s || !c) return;
      try { g.gain.cancelScheduledValues(c.currentTime); g.gain.setValueAtTime(g.gain.value, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.6); s.stop(c.currentTime + 0.65); } catch (e) {}
    }
  };
  function soundIcon() { $('#lbSound').innerHTML = `<svg aria-hidden="true"><use href="#lb-i-${lib.sound ? 'sound' : 'mute'}"/></svg>`; $('#lbSound').classList.toggle('off', !lib.sound); }
  $('#lbSound').addEventListener('click', () => {
    lib.sound = !lib.sound; save(); soundIcon();
    if (lib.sound) { SND.roomOn(); SND.chime(0, 0.5); } else SND.roomOff();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { SND.roomOff(); dust.stop(); }
    else if (!$('#lhome').hidden) { SND.roomOn(); dust.start(); }
  });

  /* ---------- the room: dust in the lamp light ---------- */
  const dust = {
    run: 0, parts: [],
    start() {
      if (!motion() || this.run) return;
      const cv = $('#lbDust'), ctx = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
      const fit = () => { cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
      fit();
      const W = () => cv.clientWidth, H = () => cv.clientHeight;
      if (!this.parts.length) this.parts = Array.from({ length: 26 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.6, vx: (Math.random() - 0.5) * 0.006, vy: -0.002 - Math.random() * 0.006, a: Math.random() * Math.PI * 2 }));
      const id = ++this.run; let last = performance.now();
      const step = now => {
        if (id !== this.run) return;
        const dt = Math.min(50, now - last) / 1000; last = now;
        ctx.clearRect(0, 0, W(), H());
        this.parts.forEach(p => {
          p.a += dt * 0.6; p.x += (p.vx + Math.sin(p.a) * 0.002) * dt; p.y += p.vy * dt;
          if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
          if (p.x < -0.05 || p.x > 1.05) p.x = Math.random();
          const glow = 0.25 + 0.35 * Math.max(0, Math.sin(p.a * 0.7));
          ctx.beginPath(); ctx.arc(p.x * W(), p.y * H(), p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 236, 190, ${glow})`; ctx.fill();
        });
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      this.fit = fit;
    },
    stop() { this.run = 0; }
  };
  addEventListener('resize', () => { if (dust.fit) dust.fit(); if (!$('#lhome').hidden) { fitBooks(); placeTrackDots(); } if (R) layoutReader(); });

  /* ---------- the bookcase ---------- */
  const PAINTS = [['white', 'أبيض'], ['sage', 'أخضر هادئ'], ['sky', 'سماوي'], ['butter', 'أصفر'], ['peach', 'خوخي'], ['stars', 'نجوم']];
  const ITEMS = [['frame', 'صورتي'], ['plant', 'نبتة'], ['camel', 'جمل صغير'], ['bear', 'دبدوب'], ['trophy', 'كأس ذهبية'], ['jar', 'برطمان حلوى'],
    ['globe', 'كرة أرضية'], ['butterfly', 'فراشة'], ['starlamp', 'مصباح نجمة'], ['books', 'كتب وكوب']];
  const GARLANDS = [['', 'بلا زينة'], ['lights', 'أضواء'], ['bunting', 'أعلام ملوّنة']];
  const ORD = { 1: 'الأوّل', 2: 'الثاني', 3: 'الثالث' };
  // the fresh garden palette (her choice, 13 Oct 2026): leaf green, butter, powder blue, warm white, peach, sage
  const PAL = [['#8CC27A', '#6BA65A', '#fff'], ['#FBE08A', '#EBC458', '#2B2340'], ['#A9D0EF', '#7FB2DE', '#2B2340'], ['#FBF4E4', '#E9DCC2', '#2B2340'],
    ['#F7BE9E', '#E99A74', '#2B2340'], ['#B8D8B0', '#8FBB86', '#2B2340'], ['#7FB9E3', '#5797CC', '#fff'], ['#F3CD72', '#DCA941', '#2B2340'],
    ['#C9E6DA', '#97CDB6', '#2B2340'], ['#E8A98C', '#D2845F', '#fff']];
  const rnd = seed => { let x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };
  function look(s) {
    const d = s.day, p = PAL[(d * 7 + s.shelf * 3) % PAL.length];
    return { w: Math.round(36 + rnd(d) * 12), h: Math.round(80 + rnd(d + 50) * 15), c: p[0], c2: p[1], ink: p[2], band: rnd(d + 9) > 0.5 };
  }
  function bookHTML(s) {
    const L = look(s), st = status(lib, ST, s, t()), read = !!lib.read[s.id], going = !read && lib.place[s.id] != null;
    const long = s.title.length > 15 ? ' long' : s.title.length > 11 ? ' mid' : '';
    return `<button class="lb-bk ${st}${going ? ' going' : ''}${L.band ? ' band' : ''}${long}" data-id="${s.id}" style="--w:${L.w}px; --h:${L.h}%; --c:${L.c}; --c2:${L.c2}; --tx:${L.ink}" aria-label="${s.title}">
      <span class="lb-sp"><span class="lb-sp-t">${s.title}</span><span class="lb-sp-n">${AR(s.day)}</span></span>
      ${st === 'last' ? '<svg class="lb-sp-lock" aria-hidden="true"><use href="#lb-i-lock"/></svg>' : ''}
      ${read || going ? '<svg class="lb-rib" aria-hidden="true"><use href="#lb-i-rib"/></svg>' : ''}${read ? '<img class="lb-medal" src="assets/library/medal.webp" alt="قرأتُه">' : ''}</button>`;
  }
  function renderCase() {
    $('#lbShelves').innerHTML = shelves(ST).map(n => {
      const open = shelfOpen(lib, ST, n), books = onShelf(ST, n);
      const shown = open && (n === shelves(ST)[0] || lib.doors[n]);
      const dc = lib.deco[n], col = dc && PAINTS.some(p => p[0] === dc.color) ? dc.color : '';
      return `<div class="lb-shelf${open ? '' : ' shut'}${col ? ' dc-' + col : ''}${dc && dc.garland ? ' garl' : ''}" data-shelf="${n}">
        ${dc && dc.garland ? `<img class="lb-garland" src="assets/library/deco/${dc.garland}.webp" alt="">` : ''}
        <div class="lb-row">${books.map(bookHTML).join('')}${dc && dc.item ? decoHTML(dc) : '<span class="lb-end" aria-hidden="true"></span>'}</div>
        <div class="lb-board"></div>
        ${shown ? '' : `<div class="lb-doors${open ? ' opening' : ''}"><div class="lb-door r"></div><div class="lb-door l"></div><div class="lb-lockbox"><svg aria-hidden="true"><use href="#lb-i-lock"/></svg></div></div>`}
      </div>`;
    }).join('');
    fitBooks();
  }
  // her decoration at the end of the row; her own photo sits inside the frame
  function decoHTML(dc) {
    if (!ITEMS.some(i => i[0] === dc.item)) return '<span class="lb-end" aria-hidden="true"></span>';
    const img = `<img src="assets/library/deco/${dc.item}.webp" alt="">`;
    return dc.item === 'frame' ? `<button class="lb-deco ph" aria-label="صورتي">${img}<b${dc.photo ? ` style="background-image:url(${dc.photo})"` : ''}></b></button>`
      : `<button class="lb-deco" aria-label="زينة الرفّ">${img}</button>`;
  }
  // the books shrink a little on narrow screens so ten always stand on a shelf
  function fitBooks() {
    const sh = $('#lbShelves'); if (!sh || !sh.querySelector('.lb-row') || $('#lhome').hidden) return;   // measure only on screen
    let bs = 1;
    const overflow = () => [...sh.querySelectorAll('.lb-row')].some(r => {
      const edge = r.getBoundingClientRect().left + parseFloat(getComputedStyle(r).paddingLeft) - 1;
      return [...r.children].some(c => c.getBoundingClientRect().left < edge);
    });
    for (let k = 0; k < 14; k++) { sh.style.setProperty('--bs', bs.toFixed(3)); if (!overflow()) break; bs *= 0.96; }
  }
  function renderTrack(fresh) {
    const P = path(lib, byId), next = lib.order.length;
    $('#lbTrack').innerHTML = `<h2>رحلتي مع الكتب</h2><div class="lb-path" id="lbPath">${P.slice(0, TRACK * Math.ceil((next + 1) / TRACK)).map(c =>
      `<div class="lb-dot${c.id ? ' got' : ''}${c.i === next ? ' next' : ''}${fresh && c.i === next - 1 ? ' fresh' : ''}" data-i="${c.i}"><b>${c.id ? (c.tool ? c.tool.emoji : '★') : AR(c.i + 1)}</b><small>اليوم ${AR(c.i + 1)}</small></div>`).join('')}<svg class="lb-trail" id="lbTrail" aria-hidden="true"></svg></div>`;
    placeTrackDots();
  }
  // a winding path: rows of six, back and forth, with a dashed trail behind the circles
  function placeTrackDots() {
    const box = $('#lbPath'); if (!box) return;
    const dots = [...box.querySelectorAll('.lb-dot')], W = box.clientWidth, cols = 6;
    const rows = Math.ceil(dots.length / cols), H = box.clientHeight, gx = W / cols, gy = H / Math.max(1, rows);
    const pts = dots.map((d, i) => {
      const r = Math.floor(i / cols), k = i % cols, c = r % 2 ? k : cols - 1 - k;   // right to left, then back
      const x = gx * (c + 0.5), y = gy * (r + 0.5);
      d.style.left = x + 'px'; d.style.top = y + 'px';
      return [x, y];
    });
    $('#lbTrail').setAttribute('viewBox', `0 0 ${W} ${H}`);
    $('#lbTrail').innerHTML = `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')}"/>`;
  }
  function home() {
    api.stopEnglish && api.stopEnglish();
    api.setDeck('lib');
    document.body.dataset.profile = 'maria';
    closeReaderNow();
    ready.then(() => {
      if (!DATA) { api.toast('The library could not load. Please connect to the internet once.'); return; }
      renderCase(); soundIcon();
      api.show('lhome');
      fitBooks(); renderTrack();
      dust.start(); SND.roomOn(); SND.warm();
      setTimeout(() => openDoors(), 500);
    });
  }
  function leaveRoom() { SND.roomOff(); dust.stop(); hideNote(); }

  /* ---------- tapping a book ---------- */
  let noteT = 0;
  function note(el, text) {
    const n = $('#lbNote'), r = el.getBoundingClientRect();
    n.textContent = text; n.hidden = false;
    const w = Math.min(320, innerWidth - 32); n.style.width = w + 'px';
    n.style.left = Math.max(16, Math.min(innerWidth - w - 16, r.left + r.width / 2 - w / 2)) + 'px';
    n.style.top = Math.max(70, r.top - n.offsetHeight - 10) + 'px';
    n.classList.remove('show'); void n.offsetWidth; n.classList.add('show');
    clearTimeout(noteT); noteT = setTimeout(hideNote, 3200);
  }
  function hideNote() { $('#lbNote').hidden = true; }
  function wiggle(el) { el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig'); setTimeout(() => el.classList.remove('wig'), 700); }
  $('#lbShelves').addEventListener('click', e => {
    if (busy) return;
    const dz = e.target.closest('.lb-deco, .lb-garland');
    if (dz) { api.SFX.init(); openDeco(+dz.closest('.lb-shelf').dataset.shelf, null, true); return; }
    const shut = e.target.closest('.lb-shelf.shut');
    if (shut) { wiggle(shut.querySelector('.lb-doors') || shut); SND.play('creak', 0.18, { rate: 1.6 }); return; }
    const b = e.target.closest('.lb-bk'); if (!b) return;
    const s = byId[b.dataset.id], st = status(lib, ST, s, t());
    api.SFX.init();
    if (st === 'tomorrow') { wiggle(b); note(b, 'كتاب جديد غداً! تستطيعين إعادة قراءة كتبكِ.'); return; }
    if (st === 'last') { wiggle(b); note(b, 'هذا الكتاب يُفتح بعد كتب الرفّ كلّها.'); return; }
    if (st === 'later') {
      const nx = nextOn(lib, ST, s.shelf), el = nx && $(`.lb-bk[data-id="${nx.id}"]`);
      wiggle(b); if (el) wiggle(el);
      note(b, nx ? `نقرأ الكتب بالترتيب: ابدئي بالكتاب رقم ${AR(nx.day)} «${nx.title}».` : 'نقرأ الكتب بالترتيب.');
      return;
    }
    if (st === 'door') { wiggle(b); return; }
    openBook(s, b);
  });

  /* ---------- the glass door of a new shelf swings open ---------- */
  function openDoors() {
    const n = doorsWaiting(lib, ST)[0];
    if (n == null || $('#lhome').hidden) return;
    const shelf = $(`.lb-shelf[data-shelf="${n}"]`), doors = shelf && shelf.querySelector('.lb-doors');
    lib.doors[n] = t(); save();
    if (!doors) return;
    shelf.scrollIntoView({ block: 'nearest', behavior: motion() ? 'smooth' : 'auto' });
    SND.play('creak', 0.9); SND.chime(0.7);
    doors.classList.add('swing');
    setTimeout(() => { doors.remove(); shelf.classList.add('lit'); setTimeout(() => shelf.classList.remove('lit'), 1600); }, motion() ? 1500 : 50);
  }

  /* ---------- picking a book: it slides out, turns to its cover, floats to the middle and opens ---------- */
  let busy = false;
  const fly = $('#lbFly');
  function coverHTML(s) {
    const L = look(s), img = s.images.includes('cover') ? `<img src="assets/stories/${s.id}/cover.webp" alt="">` : placeholderSVG(s.id + 'c', s.day, true);
    return `<div class="lb-cover" style="--c:${L.c}; --c2:${L.c2}; --tx:${L.ink}"><div class="lb-cover-art">${img}</div><h2>${s.title}</h2></div>`;
  }
  function boxHTML(s, w, h, D) {
    const L = look(s);
    return `<div class="lb-box" style="--w:${w}px; --h:${h}px; --D:${D}px; --c:${L.c}; --c2:${L.c2}; --tx:${L.ink}">
      <div class="lb-f lb-f-pages"></div>
      <div class="lb-f lb-f-front"><div class="lb-f-out">${coverHTML(s)}</div><div class="lb-f-in"></div></div>
      <div class="lb-f lb-f-back"></div>
      <div class="lb-f lb-f-spine"><span class="lb-sp"><span class="lb-sp-t">${s.title}</span><span class="lb-sp-n">${AR(s.day)}</span></span></div>
      <div class="lb-f lb-f-top"></div><div class="lb-f lb-f-edge"></div></div>`;
  }
  // The book, as a 3D box built at its big size (so the cover stays sharp) and scaled down onto its spine.
  function flyBox(s, el) {
    const r = el.getBoundingClientRect(), g = readerGeom(), W = g.pw, H = g.ph, sc = H / r.height, D = Math.max(18, r.width * sc);
    fly.innerHTML = `<div class="lb-mover">${boxHTML(s, W, H, D)}</div>`;
    const mover = fly.firstElementChild, box = mover.firstElementChild, front = box.querySelector('.lb-f-front');
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const tx = innerWidth / 2 - (g.single ? 0 : W / 2), ty = g.cy;          // in a spread the closed book lies on the left page
    mover.style.left = cx + 'px'; mover.style.top = cy + 'px';
    const half = W / sc / 2, out = Math.round(half * 1.6), k = 1 / sc;
    const at = (x, y) => `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    return { mover, box, front, D, k, half, out, here: at(0, 0), there: at(tx - cx, ty - cy),
      shelf: `translateZ(${-half}px) rotateY(-90deg) scale3d(${k}, ${k}, ${k})`,
      pulled: `translateZ(${out - half}px) rotateY(-90deg) scale3d(${k}, ${k}, ${k})`,
      turned: `translateZ(${out}px) rotateY(0deg) scale3d(.92, .92, .92)`, big: 'translateZ(0) rotateY(0deg) scale3d(1, 1, 1)',
      shut: `translateZ(${D / 2}px) rotateY(0deg)`, open: `translateZ(${D / 2}px) rotateY(178deg)` };
  }
  async function openBook(s, el) {
    busy = true; hideNote();
    const F = flyBox(s, el), dur = motion() ? 1 : 0.01, ms = 1200 * dur;
    el.classList.add('out'); fly.hidden = false;
    SND.play('slide', 0.9);
    const a1 = F.box.animate([{ transform: F.shelf }, { transform: F.pulled, offset: 0.25 }, { transform: F.turned, offset: 0.62 }, { transform: F.big }],
      { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
    F.mover.animate([{ transform: F.here }, { transform: F.here, offset: 0.25 }, { transform: F.there, offset: 0.62 }, { transform: F.there }],
      { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
    F.front.animate([{ transform: F.shut }, { transform: F.shut, offset: 0.66 }, { transform: F.open }], { duration: ms, easing: 'cubic-bezier(.45, 0, .3, 1)', fill: 'forwards' });
    setTimeout(() => SND.play('open', 0.9), 760 * dur);
    await a1.finished.catch(() => {});
    start(lib, s, t()); save();
    openReader(s);
    fly.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240 * dur, fill: 'forwards' }).finished.then(() => { fly.hidden = true; fly.innerHTML = ''; fly.getAnimations().forEach(a => a.cancel()); });
    busy = false;
  }
  // closing: the cover shuts, the book turns its spine to us and slides back into its place
  async function shelveBook(s, then) {
    busy = true;
    leaveReader();
    api.show('lhome'); renderCase(); fitBooks(); renderTrack(); soundIcon();
    const el = $(`.lb-bk[data-id="${s.id}"]`);
    if (!el) { busy = false; then && then(); return; }
    el.classList.add('out');
    const F = flyBox(s, el), dur = motion() ? 1 : 0.01, ms = 1100 * dur;
    fly.style.opacity = ''; fly.hidden = false;
    SND.play('close', 0.7);
    F.front.animate([{ transform: F.open }, { transform: F.shut, offset: 0.3 }, { transform: F.shut }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
    F.mover.animate([{ transform: F.there }, { transform: F.there, offset: 0.3 }, { transform: F.here, offset: 0.75 }, { transform: F.here }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
    const a = F.box.animate([{ transform: F.big }, { transform: F.big, offset: 0.3 }, { transform: F.turned, offset: 0.55 }, { transform: F.pulled, offset: 0.78 }, { transform: F.shelf }],
      { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
    setTimeout(() => SND.play('place', 0.55), 950 * dur);
    await a.finished.catch(() => {});
    el.classList.remove('out');
    fly.hidden = true; fly.innerHTML = '';
    busy = false;
    SND.roomOn(); dust.start();
    then && then(el);
  }

  /* ---------- the reader ---------- */
  let R = null;     // {s, L: leaves, i, single, turning, answered: {qi: true}}
  function readerGeom() {
    const W = innerWidth, H = innerHeight, single = !(W > H && W >= 900);
    if (single) { const pw = Math.min(W - 32, 720, (H - 110) / 1.36), ph = Math.min(H - 100, pw * 1.36); return { single, pw, ph, bw: pw, cy: 60 + (H - 60) / 2 }; }
    const bw = Math.min(W - 40, 1240, (H - 100) * 1.62), pw = bw / 2, ph = Math.min(H - 96, bw / 1.55);
    return { single, pw, ph, bw, cy: 60 + (H - 60) / 2 };
  }
  function layoutReader() {
    if (!R) return;
    const g = readerGeom(), single = g.single;
    const b = $('#lbBook');
    b.style.width = g.bw + 'px'; b.style.height = g.ph + 'px';
    b.classList.toggle('single', single);
    if (single !== R.single) { R.single = single; paint(); }
  }
  function openReader(s) {
    R = { s, L: leaves(s), i: 0, single: readerGeom().single, turning: false, answered: {}, shown: {} };
    const p = lib.place[s.id];
    if (!lib.read[s.id] && p != null && p > 0 && p < R.L.length) R.i = p;
    api.show('lbook'); leaveRoom();
    layoutReader(); paint();
  }
  function closeReaderNow() { R = null; $('#lbBook').innerHTML = ''; }
  function leaveReader() { R = null; }
  $('#lbClose').addEventListener('click', () => {
    if (!R || R.turning) return;
    const s = R.s;
    if (!lib.read[s.id]) { lib.place[s.id] = R.i; save(); }
    shelveBook(s);
  });

  // a soft illustrated placeholder until the real picture exists (scene note only in ?dev=1)
  function placeholderSVG(seed, day, cover) {
    let h = 0; for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const r = k => rnd(h % 9973 + k);
    const sky = [['#FFF1D6', '#FFE0EC'], ['#E8F8EE', '#FFF6D8'], ['#FFE7F1', '#FFF8E6'], ['#EAF6FF', '#FDEBF4']][h % 4];
    const hill = ['#B9E8A2', '#8FE3BF', '#A8E08E'][h % 3], hill2 = ['#8FD27F', '#6CCB9F', '#9BD98A'][(h >> 2) % 3];
    const blobs = Array.from({ length: 4 }, (_, k) => `<circle cx="${20 + r(k) * 360}" cy="${60 + r(k + 7) * 120}" r="${10 + r(k + 3) * 22}" fill="${['#FF9EC4', '#FFD84D', '#FFFFFF', '#FFB5D0'][k]}" opacity="${0.5 + r(k + 11) * 0.4}"/>`).join('');
    return `<svg class="lb-ph" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="lbg${h}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#lbg${h})"/>
      <circle cx="${70 + r(1) * 260}" cy="${50 + r(2) * 30}" r="26" fill="#FFD84D" opacity=".85"/>
      ${blobs}
      <path d="M0 ${210 + r(4) * 20} Q ${100 + r(5) * 60} ${170 + r(6) * 30} 200 ${205 + r(7) * 20} T 400 ${195 + r(8) * 25} V300 H0Z" fill="${hill}"/>
      <path d="M0 ${245 + r(9) * 15} Q 140 ${225 + r(10) * 20} 260 ${250 + r(12) * 10} T 400 ${240 + r(13) * 15} V300 H0Z" fill="${hill2}"/>
      ${cover ? '' : `<g opacity=".55"><circle cx="${120 + r(14) * 160}" cy="${200 + r(15) * 20}" r="13" fill="#FF6FA8"/><rect x="${110 + r(14) * 160}" y="${212 + r(15) * 20}" width="20" height="30" rx="8" fill="#FF6FA8"/></g>`}
    </svg>`;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function art(i) {
    const lf = R.L[i], s = R.s;
    if (lf.kind === 'page' || lf.kind === 'q') {
      const key = 'p' + String(lf.page.n).padStart(2, '0');
      const src = `assets/stories/${s.id}/${key}.webp`;
      const has = s.images.includes(key);
      const img = has ? `<img class="lb-pic" src="${src}" alt="" draggable="false">` : placeholderSVG(s.id + key, s.day);
      const sceneNote = api.DEV ? `<span class="lb-scene">${esc(lf.page.scene)}</span>` : '';
      return `<div class="lb-art${has ? ' pic' : ''}${lf.kind === 'q' ? ' dim' : ''}">${img}${sceneNote}${lf.kind === 'q' ? '<span class="lb-qmark">؟</span>' : ''}</div>`;
    }
    const ic = { other: '🔄', magic: '✨', feeling: '💬', tool: s.tool.emoji, mission: '🎯' }[lf.kind];
    return `<div class="lb-art end ${lf.kind}"><span class="lb-end-ic">${ic}</span></div>`;
  }
  function content(i) {
    const lf = R.L[i], s = R.s;
    if (lf.kind === 'page') return `<div class="lb-txt"><p>${esc(lf.page.text)}</p></div><span class="lb-pno">${AR(lf.page.n)}</span>`;
    if (lf.kind === 'q') {
      return `<div class="lb-q" data-qi="${lf.qi}"><h2>${esc(lf.q.prompt)}</h2>
        <div class="lb-opts">${lf.q.options.map((o, k) => `<button class="lb-opt" data-k="${k}">${esc(o.label)}</button>`).join('')}</div>
        <div class="lb-res" hidden><p class="lb-res-t"></p><p class="lb-back"></p><button class="btn btn-good lb-go">نكمل</button></div></div>`;
    }
    if (lf.kind === 'other') return `<div class="lb-endc"><h3>🔄 من الجهة الأخرى</h3><p class="lb-big">${esc(s.other_side)}</p><button class="btn lb-next">التالي</button></div>`;
    if (lf.kind === 'magic') return `<div class="lb-endc"><h3>✨ جملة سحرية</h3><div class="lb-magic" id="lbMagic">${esc(s.magic_sentence)}</div>
      <div class="lb-keep"><span class="lb-pot" id="lbNotebook">📒<b>${AR(lib.notebook.length)}</b></span><small>دفتر الجمل السحرية</small></div><button class="btn lb-next">التالي</button></div>`;
    if (lf.kind === 'feeling') return `<div class="lb-endc"><h3>💬 كلمة الشعور</h3><div class="lb-word" id="lbWord">${esc(s.feeling_word)}</div>
      <div class="lb-keep"><span class="lb-pot" id="lbDict">📖<b>${AR(lib.feelings.length)}</b></span><small>قاموس مشاعري</small></div><button class="btn lb-next">التالي</button></div>`;
    if (lf.kind === 'tool') {
      const have = lib.tools.includes(s.id);
      return `<div class="lb-endc"><h3>🎨 أداة جديدة للمرسم</h3><div class="lb-tool" id="lbTool"><span>${s.tool.emoji}</span></div><p class="lb-tname">${esc(s.tool.name)}</p>
        <div class="lb-keep"><span class="lb-pot" id="lbStudio">🏠<b>${AR(lib.tools.length)}</b></span><small>مرسمي</small></div>
        <button class="btn btn-good lb-put">${have ? 'التالي' : 'ضعيها في المرسم'}</button></div>`;
    }
    const m = lib.missions[s.id];
    return `<div class="lb-endc"><h3>🎯 مهمّة اليوم</h3><p class="lb-big">${esc(s.mission.text)}</p>
      ${m && m.state === 'done' ? `<p class="lb-did">فعلتِها! ${m.feel || ''}</p><div class="lb-mbtns"><button class="btn btn-good lb-shut">أغلقي الكتاب</button></div>`
        : `<div class="lb-mbtns" id="lbMbtns"><button class="btn btn-good lb-did-it">فعلتها!</button><button class="btn lb-later">لاحقاً</button></div>
           <div class="lb-feels" id="lbFeels" hidden><p>كيف كان شعوركِ؟</p><div>${['😊', '😐', '😬', '💪'].map(f => `<button class="lb-feel" data-f="${f}">${f}</button>`).join('')}</div></div>`}</div>`;
  }
  // the page in a spread: picture on the right (read first), words on the left; on a portrait iPad, one page: picture above
  function halves(i) { return { r: `<div class="pg pg-r">${art(i)}</div>`, l: `<div class="pg pg-l">${content(i)}<span class="lb-curl" aria-hidden="true"></span></div>` }; }
  function single(i) { return `<div class="pg pg-s"><div class="pg-art">${art(i)}</div><div class="pg-body">${content(i)}</div><span class="lb-curl" aria-hidden="true"></span></div>`; }
  function paint() {
    const b = $('#lbBook'), i = R.i;
    b.innerHTML = R.single ? `<div class="lb-cur">${single(i)}</div>` : `<div class="lb-cur">${halves(i).r}${halves(i).l}</div><div class="lb-gutter"></div>`;
    arrive();
  }
  function progress() { $('#lbProg').style.width = ((R.i + 1) / R.L.length * 100) + '%'; }
  // when a page arrives: save the place, and start its little show
  function arrive() {
    progress();
    const s = R.s, lf = R.L[R.i];
    if (!lib.read[s.id]) { lib.place[s.id] = R.i; save(); }
    const once = k => { if (R.shown[k]) return false; R.shown[k] = true; return true; };
    if (lf.kind === 'magic' && !lib.notebook.includes(s.id) && once('magic')) setTimeout(() => keep('#lbMagic', '#lbNotebook', 'notebook'), 900);
    if (lf.kind === 'feeling' && !lib.feelings.includes(s.id) && once('feeling')) setTimeout(() => keep('#lbWord', '#lbDict', 'feelings'), 900);
    if (lf.kind === 'tool' && once('tool')) { const tl = $('#lbTool'); if (tl && motion()) tl.classList.add('pop'); if (!lib.tools.includes(s.id)) api.SFX.star && api.SFX.star(0.2); }
  }
  // a card flies into its little book (the notebook, the dictionary, the studio) and the count goes up
  function keep(from, to, list) {
    const a = $(from), b = $(to); if (!a || !b || !R) return;
    if (!lib[list].includes(R.s.id)) { lib[list].push(R.s.id); save(); }
    const n = lib[list].length;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const ghost = a.cloneNode(true); ghost.removeAttribute('id'); ghost.classList.add('lb-ghost');
    Object.assign(ghost.style, { left: ra.left + 'px', top: ra.top + 'px', width: ra.width + 'px', height: ra.height + 'px' });
    document.body.append(ghost);
    const dx = rb.left + rb.width / 2 - (ra.left + ra.width / 2), dy = rb.top + rb.height / 2 - (ra.top + ra.height / 2);
    ghost.animate([{ transform: 'translate(0, 0) scale(1)', opacity: 1 }, { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 40}px) scale(.7)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(.12)`, opacity: 0.2 }], { duration: motion() ? 900 : 10, easing: 'ease-in', fill: 'forwards' })
      .finished.then(() => { ghost.remove(); b.querySelector('b').textContent = AR(n); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); api.SFX.star && api.SFX.star(); });
  }

  /* ---------- turning pages: like an Arabic book, a page turns from left to right ---------- */
  const canForward = () => {
    const lf = R.L[R.i];
    if (R.i >= R.L.length - 1) return false;
    if (lf.kind === 'q' && !R.answered[lf.qi]) return false;
    if (lf.kind === 'tool' && !lib.tools.includes(R.s.id)) return false;
    return true;
  };
  const canBack = () => R.i > 0;
  // build the turn: the leaf (the page that moves) and what lies under it; returns {leaf, done(), angleFor}
  function setupTurn(dir) {
    const b = $('#lbBook'), cur = b.querySelector('.lb-cur'), i = R.i, j = i + dir;
    const under = document.createElement('div'); under.className = 'lb-under';
    const leaf = document.createElement('div'); leaf.className = 'lb-leaf';
    if (R.single) {
      if (dir > 0) {
        under.innerHTML = single(j); b.prepend(under);
        leaf.innerHTML = `<div class="lf-face lf-front">${cur.innerHTML}</div><div class="lf-face lf-back"></div><i class="lf-shade"></i>`;
        leaf.classList.add('s-fwd'); cur.style.visibility = 'hidden';
      } else {
        under.innerHTML = cur.innerHTML; b.prepend(under);
        leaf.innerHTML = `<div class="lf-face lf-front">${single(j)}</div><div class="lf-face lf-back"></div><i class="lf-shade"></i>`;
        leaf.classList.add('s-back'); cur.style.visibility = 'hidden';
      }
    } else if (dir > 0) {                       // the left page lifts and turns over to the right
      const nx = halves(j);
      under.innerHTML = `${nx.l}<div class="lb-keepr">${cur.querySelector('.pg-r').outerHTML}</div>`; b.prepend(under);
      leaf.innerHTML = `<div class="lf-face lf-front">${cur.querySelector('.pg-l').outerHTML}</div><div class="lf-face lf-back">${nx.r}</div><i class="lf-shade"></i>`;
      leaf.classList.add('d-fwd'); cur.style.visibility = 'hidden';
    } else {                                     // going back: the right page turns over to the left
      const pv = halves(j);
      under.innerHTML = `${pv.r}<div class="lb-keepl">${cur.querySelector('.pg-l').outerHTML}</div>`; b.prepend(under);
      leaf.innerHTML = `<div class="lf-face lf-front">${cur.querySelector('.pg-r').outerHTML}</div><div class="lf-face lf-back">${pv.l}</div><i class="lf-shade"></i>`;
      leaf.classList.add('d-back'); cur.style.visibility = 'hidden';
    }
    b.append(leaf);
    const sign = R.single ? (dir > 0 ? 1 : -1) : (dir > 0 ? 1 : -1);
    // the angle of the leaf for a turn fraction f (0 = flat where it started, 1 = turned)
    const angle = f => (R.single && dir < 0) ? 180 * (1 - f) : sign * 180 * f;
    const set = f => {
      leaf.style.transform = `rotateY(${angle(f)}deg)`;
      const sh = Math.sin(Math.PI * Math.min(1, f));
      leaf.style.setProperty('--sh', sh.toFixed(3));
      under.style.setProperty('--sh', (1 - f).toFixed(3));
      if (R.single && dir > 0) leaf.style.opacity = f > 0.62 ? Math.max(0, 1 - (f - 0.62) / 0.3).toFixed(3) : 1;
      if (R.single && dir < 0) leaf.style.opacity = f < 0.38 ? Math.min(1, f / 0.3).toFixed(3) : 1;
    };
    set(0);
    return { leaf, under, set, cur, j };
  }
  function finishTurn(T, ok) {
    const b = $('#lbBook');
    if (ok) { R.i = T.j; paint(); }
    else { T.leaf.remove(); T.under.remove(); T.cur.style.visibility = ''; }
    R.turning = false;
    b.querySelectorAll('.lb-leaf, .lb-under').forEach(x => x.remove());
  }
  function animateTurn(T, from, to, ms) {
    const t0 = performance.now(), ease = x => 1 - Math.pow(1 - x, 3);
    return new Promise(res => {
      const step = now => {
        const k = Math.min(1, (now - t0) / ms), f = from + (to - from) * ease(k);
        T.set(f);
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }
  async function turn(dir) {
    if (!R || R.turning) return;
    if (dir > 0 && !canForward()) { nudge(); return; }
    if (dir < 0 && !canBack()) return;
    R.turning = true;
    const T = setupTurn(dir);
    SND.flip();
    await animateTurn(T, 0, 1, motion() ? 620 : 1);
    finishTurn(T, true);
  }
  function nudge() {        // forward is not possible yet: show what she needs to tap
    const x = $('#lbBook .lb-cur .lb-opts, #lbBook .lb-cur .lb-put, #lbBook .lb-cur .lb-mbtns');
    if (x) wiggle(x);
  }
  // swipe: the page follows her finger; let go past a third (or with a flick) and it turns
  let drag = null;
  const book = $('#lbBook');
  book.addEventListener('pointerdown', e => {
    if (!R || R.turning || e.target.closest('button')) return;
    drag = { x: e.clientX, y: e.clientY, t: performance.now(), T: null, dir: 0, f: 0, id: e.pointerId };
  });
  book.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.T) {
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy)) return;
      const dir = dx > 0 ? 1 : -1;                // finger to the right = the next page (an Arabic book)
      if ((dir > 0 && !canForward()) || (dir < 0 && !canBack())) { if (dir > 0) nudge(); drag = null; return; }
      drag.dir = dir; R.turning = true; drag.T = setupTurn(dir); SND.flip();
      try { book.setPointerCapture(e.pointerId); } catch (err) {}
    }
    const w = R.single ? book.clientWidth : book.clientWidth / 2;
    drag.f = Math.max(0, Math.min(1, (dx * drag.dir) / (w * 1.15)));
    drag.T.set(drag.f);
  });
  const endDrag = async e => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const d = drag; drag = null;
    if (!d.T) {                                   // a tap: the left side turns forward, the right edge goes back
      if (!e || e.type === 'pointercancel') return;
      const r = book.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
      if (Math.abs(e.clientX - d.x) < 12 && Math.abs(e.clientY - d.y) < 12) {
        if (x < (R.single ? 0.42 : 0.4)) turn(1); else if (x > (R.single ? 0.8 : 0.6)) turn(-1);
      }
      return;
    }
    const v = d.f / Math.max(1, performance.now() - d.t) * 1000;
    const go = d.f > 0.33 || v > 1.4;
    await animateTurn(d.T, d.f, go ? 1 : 0, motion() ? 380 : 1);
    finishTurn(d.T, go);
  };
  book.addEventListener('pointerup', endDrag);
  book.addEventListener('pointercancel', endDrag);
  document.addEventListener('keydown', e => {
    if (!R || $('#lbook').hidden) return;
    if (e.key === 'ArrowLeft') turn(1); else if (e.key === 'ArrowRight') turn(-1);
  });

  /* ---------- buttons on the pages: questions and the end pages ---------- */
  book.addEventListener('click', e => {
    if (!R || R.turning) return;
    const b = e.target.closest('button'); if (!b) return;
    const lf = R.L[R.i], s = R.s;
    if (b.classList.contains('lb-opt')) return answer(lf, Number(b.dataset.k), b);
    if (b.classList.contains('lb-go') || b.classList.contains('lb-next')) return turn(1);
    if (b.classList.contains('lb-put')) {
      if (lib.tools.includes(s.id)) return turn(1);
      b.disabled = true;
      keepTool(); return;
    }
    if (b.classList.contains('lb-did-it')) { $('#lbMbtns').hidden = true; $('#lbFeels').hidden = false; return; }
    if (b.classList.contains('lb-feel')) { setMission(lib, s.id, 'done', t(), b.dataset.f); return closeBook(); }
    if (b.classList.contains('lb-later')) { setMission(lib, s.id, 'later', t()); return closeBook(); }
    if (b.classList.contains('lb-shut')) return closeBook();
  });
  function answer(lf, k, btn) {
    const q = lf.q, o = q.options[k], box = btn.closest('.lb-q');
    box.querySelectorAll('.lb-opt').forEach(x => { x.classList.toggle('chosen', x === btn); x.disabled = true; });
    R.answered[lf.qi] = true;
    if (!o.result) { setTimeout(() => turn(1), motion() ? 350 : 0); return; }
    const res = box.querySelector('.lb-res');
    res.querySelector('.lb-res-t').textContent = o.result;
    res.querySelector('.lb-back').textContent = q.back_line || '';
    res.querySelector('.lb-back').hidden = !q.back_line;
    res.hidden = false; box.classList.add('answered');
    res.classList.remove('in'); void res.offsetWidth; res.classList.add('in');
    api.SFX.flip && api.SFX.flip();
  }
  function keepTool() {
    const s = R.s, tl = $('#lbTool'), pot = $('#lbStudio');
    lib.tools.includes(s.id) || lib.tools.push(s.id); save();
    const ra = tl.getBoundingClientRect(), rb = pot.getBoundingClientRect();
    const g = tl.cloneNode(true); g.removeAttribute('id'); g.classList.add('lb-ghost');
    Object.assign(g.style, { left: ra.left + 'px', top: ra.top + 'px', width: ra.width + 'px', height: ra.height + 'px' });
    document.body.append(g);
    const dx = rb.left + rb.width / 2 - (ra.left + ra.width / 2), dy = rb.top + rb.height / 2 - (ra.top + ra.height / 2);
    tl.style.visibility = 'hidden';
    g.animate([{ transform: 'translate(0,0) scale(1) rotate(0)' }, { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(.8) rotate(-12deg)`, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(.15) rotate(10deg)`, opacity: 0.3 }], { duration: motion() ? 950 : 10, easing: 'ease-in', fill: 'forwards' })
      .finished.then(() => {
        g.remove(); pot.querySelector('b').textContent = AR(lib.tools.length); pot.classList.remove('bump'); void pot.offsetWidth; pot.classList.add('bump');
        api.SFX.good && api.SFX.good();
        setTimeout(() => turn(1), motion() ? 500 : 0);
      });
  }
  // the end of the book: it goes back on the shelf with its ribbon, the path fills, a new shelf may open
  function closeBook() {
    if (!R) return;
    const s = R.s, res = finish(lib, s, t()); save();
    shelveBook(s, el => {
      if (!res.first || !el) { openDoors(); return; }
      el.classList.add('just-read');
      SND.chime(0.1, 0.6);
      renderTrack(true);
      const dot = $(`.lb-dot[data-i="${res.n - 1}"]`); if (dot) sparkle(dot);
      setTimeout(() => {
        if ([10, 20, 30].includes(res.n) && !lib.seen[res.n]) milestone(res.n, () => openDoors());
        else openDoors();
      }, motion() ? 1300 : 50);
    });
  }
  function sparkle(el) {
    if (!motion()) return;
    const r = el.getBoundingClientRect();
    for (let k = 0; k < 10; k++) {
      const p = document.createElement('i'); p.className = 'lb-spark';
      p.style.left = r.left + r.width / 2 + 'px'; p.style.top = r.top + r.height / 2 + 'px';
      document.body.append(p);
      const a = k / 10 * Math.PI * 2, d = 26 + Math.random() * 22;
      p.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.2)`, opacity: 0 }],
        { duration: 700 + Math.random() * 300, easing: 'ease-out' }).finished.then(() => p.remove());
    }
  }
  function milestone(n, then) {
    lib.seen[n] = t(); save();
    $('#lbCelIc').innerHTML = `<b>${AR(n)}</b>`;
    $('#lbCelTitle').textContent = `${AR(n)} ${n === 10 ? 'كتب' : 'كتاباً'}!`;
    $('#lbCelSub').textContent = n === 30 ? 'قرأتِ الكتب الثلاثين كلّها!' : 'أكملتِ رفّاً كاملاً من الكتب!';
    const c = $('#lbCel'); c.hidden = false; c.classList.remove('play'); void c.offsetWidth; c.classList.add('play');
    SND.fanfare(); api.confetti($('#lbConfetti'));
    $('#lbCelOk').onclick = () => {
      c.hidden = true; api.stopConfetti($('#lbConfetti'));
      const k = n / 10;
      if (onShelf(ST, k).length && !lib.deco[k]) openDeco(k, then); else then && then();
    };
  }

  /* ---------- decorating a finished shelf: a back colour, one thing to stand on it, and a garland if she likes ---------- */
  function openDeco(k, then, edit) {
    const box = $('#lbDec'), cur = lib.deco[k] || {};
    const pick = { color: cur.color || 'sage', item: cur.item || 'plant', garland: cur.garland || '', photo: cur.photo || '' };
    $('#lbDecTitle').textContent = edit ? 'زيّني رفّكِ' : `أكملتِ الرفّ ${ORD[k] || ''}! زيّني رفّكِ`;
    const draw = () => {
      $('#lbDecPaints').innerHTML = PAINTS.map(([id, name]) => `<button class="lb-pt dc-${id}${pick.color === id ? ' on' : ''}" data-c="${id}"><i></i><span>${name}</span></button>`).join('');
      $('#lbDecItems').innerHTML = ITEMS.map(([id, name]) => `<button class="lb-it${pick.item === id ? ' on' : ''}" data-i="${id}">${id === 'frame'
        ? `<span class="lb-ph"><img src="assets/library/deco/frame.webp" alt=""><b${pick.photo ? ` style="background-image:url(${pick.photo})"` : ''}></b></span>`
        : `<img src="assets/library/deco/${id}.webp" alt="">`}<span>${name}</span></button>`).join('');
      $('#lbDecGar').innerHTML = GARLANDS.map(([id, name]) => `<button class="lb-it wide${pick.garland === id ? ' on' : ''}" data-g="${id}">${id ? `<img src="assets/library/deco/${id}.webp" alt="">` : '<em>—</em>'}<span>${name}</span></button>`).join('');
    };
    draw();
    box.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.c) pick.color = b.dataset.c;
      else if (b.dataset.i) { pick.item = b.dataset.i; if (b.dataset.i === 'frame') $('#lbDecFile').click(); }   // her photo, chosen from the iPad
      else if (b.dataset.g != null) pick.garland = b.dataset.g;
      else if (b.id === 'lbDecGo') {
        lib.deco[k] = { color: pick.color, item: pick.item, garland: pick.garland, ...(pick.photo ? { photo: pick.photo } : {}) }; save();
        box.hidden = true; renderCase(); fitBooks();
        const sh = $(`.lb-shelf[data-shelf="${k}"]`);
        if (sh) { sh.classList.add('lit'); setTimeout(() => sh.classList.remove('lit'), 1600); const d = sh.querySelector('.lb-deco'); if (d) sparkle(d); }
        SND.chime(0.1, 0.6); api.SFX.good && api.SFX.good();
        then && then(); return;
      } else return;
      api.SFX.tap && api.SFX.tap();
      draw();
    };
    $('#lbDecFile').onchange = async e => {
      const f = e.target.files && e.target.files[0]; e.target.value = '';
      if (!f) return;
      try { pick.photo = await shrinkPhoto(f); pick.item = 'frame'; draw(); } catch (err) { /* a picture she cannot use: keep the empty frame */ }
    };
    box.hidden = false; box.classList.remove('play'); void box.offsetWidth; box.classList.add('play');
  }
  // her photo, made small (it stays on the iPad, in her progress and her backup file)
  function shrinkPhoto(file) {
    return new Promise((ok, bad) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        const S = 360, r = Math.min(1, S / Math.max(im.width, im.height)), cv = document.createElement('canvas');
        cv.width = Math.round(im.width * r); cv.height = Math.round(im.height * r);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
        ok(cv.toDataURL('image/jpeg', 0.82));
      };
      im.onerror = () => { URL.revokeObjectURL(url); bad(new Error('not a picture')); };
      im.src = url;
    });
  }

  return {
    home, ready,
    isOn: () => !$('#lhome').hidden || !$('#lbook').hidden,
    busy: () => !$('#lbook').hidden || busy || !$('#lbCel').hidden || !$('#lbDec').hidden,
    reload() { lib = load(); },
    snapshot() { return JSON.parse(JSON.stringify(lib)); },
    valid,
    replace(obj) { lib = clean(obj); save(); },
    leave: leaveRoom,
    // for tests (?dev=1)
    get state() { return lib; }, get reader() { return R; }, get stories() { return ST; }, turn, core, openDeco, milestone
  };
}

root.Maktabati = { core, mount };
})(typeof window !== 'undefined' ? window : globalThis);
