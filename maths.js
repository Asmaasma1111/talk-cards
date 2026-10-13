/* جدول الضرب: Maria's times tables, a second deck inside Talk Cards.
   Loaded before app.js; app.js calls TimesTables.mount(api) for Maria's profile.
   Progress has its own key, 'tc:maria:math', so the English cards are never touched.
   The scheduler (TimesTables.core) has no DOM code, so scripts/test_maths.js can run it in Node. */
(function (root) {
'use strict';

/* ---------- Arabic-Indic digits ---------- */
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toAr = v => String(v).replace(/[0-9]/g, d => AR_DIGITS[d]);
const toWestern = s => String(s).replace(/[٠-٩]/g, ch => String(ch.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, ch => String(ch.charCodeAt(0) - 0x6F0));
const parseAnswer = s => { const w = toWestern(s).replace(/\D/g, ''); return w ? parseInt(w, 10) : NaN; };

/* ---------- the 100 facts, in teaching order: tables 1, 10, 2, 5, 3, 4, 9, 6, 7, 8; ×1 to ×10 in each ---------- */
const TABLES = [1, 10, 2, 5, 3, 4, 9, 6, 7, 8];
const FACTS = [], FACT = {};
TABLES.forEach(t => {
  for (let k = 1; k <= 10; k++) {
    const f = { id: `m${t}x${k}`, a: t, b: k, ans: t * k, table: t, order: FACTS.length };
    FACTS.push(f); FACT[f.id] = f;
  }
});
const twinOf = f => (f.a === f.b ? null : FACT[`m${f.b}x${f.a}`]);   // 7 × 3 and 3 × 7

/* ---------- dates (same local calendar format as app.js) ---------- */
const pad2 = n => String(n).padStart(2, '0');
function addDays(ds, n) {
  const [y, mo, d] = ds.split('-').map(Number); const x = new Date(y, mo - 1, d); x.setDate(x.getDate() + n);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
}

/* ---------- scheduler: Leitner boxes ----------
   box 0 = not learned yet; boxes 1-6 come back after 1, 2, 4, 7, 14, 30 days.
   Correct and fast = Easy (up two boxes), correct but slow = Good (up one), wrong = Again (box 1, tomorrow,
   and once more later in the same session). A card moves up at most once a day.
   A new fact is first shown with its dot picture ("show"), then asked again a few cards later without it
   ("learn"): Easy there puts it straight into box 2, Good into box 1. */
const INTERVAL = [0, 1, 2, 4, 7, 14, 30];
const TOP_BOX = 6;
const KNOWN_BOX = 2;      // a set of new facts is "mostly mastered" when its facts reach box 2
const MASTER_BOX = 4;     // a table's sticker: all ten facts in box 4 or higher (a week or more apart)
const MIN_SESSION = 5;    // short sessions are topped up with learned facts ("تذكّري")
const MAX_VIEWS = 3;      // a card is shown at most three times in one session
const DEFAULT_SETTINGS = { perSession: 8, batchSize: 4, newPerDay: 10, goalMin: 5, fastSec: 4, dir: 'rtl' };
const CARD_CAP = 120;     // daily goal: active seconds counted per card, at most (as in the English cards)
const isDay = x => typeof x === 'string' && /^\d{4}-\d\d-\d\d$/.test(x);

function blank() {
  return {
    v: 1,
    cards: {},                       // id -> {box, due, up, intro, seen, right, wrong, fast, msSum, msN, lastMs, lapses, again:[dates], aTs}
    open: [],                        // facts released so far, in order
    batch: [],                       // the most recent set of new facts
    stars: { total: 0, today: 0, day: '' },
    daily: { day: '', hit: false },  // the day's goal reached (bonus star given)
    active: {},                      // day -> seconds with a card on screen (the daily goal ring)
    reg: [],                         // days registered by a parent, or from before the ring (minutes estimated)
    days: {},                        // 'YYYY-MM-DD' -> {n: answers, ok: correct}
    stickers: {},                    // table -> date mastered
    log: [],                         // [day, id, correct 1/0, ms]
    garden: { done: 0 },             // the science garden (garden.js): steps taken, one for every 50 stars
    settings: { ...DEFAULT_SETTINGS }
  };
}
function clean(s) {
  const d = blank();
  if (!s || typeof s !== 'object') return d;
  const obj = x => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  const o = { ...d, ...s,
    cards: obj(s.cards), days: obj(s.days), stickers: obj(s.stickers),
    stars: { ...d.stars, ...obj(s.stars) }, daily: { ...d.daily, ...obj(s.daily) }, active: obj(s.active),
    settings: { ...d.settings, ...obj(s.settings) },
    open: Array.isArray(s.open) ? [...new Set(s.open.filter(id => FACT[id]))] : [],
    batch: Array.isArray(s.batch) ? s.batch.filter(id => FACT[id]) : [],
    log: Array.isArray(s.log) ? s.log : [],
    garden: { ...obj(s.garden), done: Math.max(0, Math.floor(Number(obj(s.garden).done) || 0)) } };
  if (o.settings.dir !== 'ltr') o.settings.dir = 'rtl';
  o.reg = Array.isArray(s.reg) ? s.reg.filter(isDay) : [];
  delete o.streak;
  if (!s.active) {                  // from before the daily goal ring: every day she answered is registered, and its
    o.daily = { day: '', hit: false };   // minutes estimated from the answer times (plus a few seconds on each back)
    o.log.forEach(([day, , , ms]) => { if (isDay(day)) o.active[day] = (o.active[day] || 0) + Math.min(CARD_CAP, (Number(ms) || 0) / 1000 + 3); });
    Object.keys(o.active).forEach(k => { o.active[k] = Math.round(o.active[k]); });
    o.reg = Object.keys(o.days).filter(k => isDay(k) && o.days[k].n > 0).sort();
  }
  return o;
}
const valid = s => !!(s && typeof s === 'object' && s.cards && typeof s.cards === 'object' && Array.isArray(s.open));
const EMPTY = Object.freeze({ box: 0, due: '', seen: 0, right: 0, wrong: 0 });
const peek = (m, id) => m.cards[id] || EMPTY;
function rec(m, id) { return m.cards[id] || (m.cards[id] = { box: 0, due: '', seen: 0, right: 0, wrong: 0, fast: 0, msSum: 0, msN: 0 }); }

// Each table is split into sets of about batchSize: 4 → 4, 3, 3; 3 → 3, 3, 2, 2.
function batchesFor(size) {
  const out = [];
  size = Math.max(1, size | 0);
  TABLES.forEach(t => {
    const ids = FACTS.filter(f => f.table === t).map(f => f.id);
    const n = Math.ceil(ids.length / size);
    for (let g = 0, i = 0; g < n; g++) { const len = Math.ceil((ids.length - i) / (n - g)); out.push(ids.slice(i, i + len)); i += len; }
  });
  return out;
}
function nextBatch(m) {
  const first = FACTS.find(f => !m.open.includes(f.id));
  if (!first) return [];
  return batchesFor(m.settings.batchSize).find(g => g.includes(first.id)).filter(id => !m.open.includes(id));
}
function batchReady(m) {
  const b = m.batch;
  if (!b.length) return true;
  const known = b.filter(id => peek(m, id).box >= KNOWN_BOX).length;
  return b.every(id => peek(m, id).box >= 1) && known >= (b.length >= 3 ? b.length - 1 : b.length);
}
const introducedOn = (m, t) => Object.values(m.cards).filter(c => c.intro === t).length;
function canRelease(m, t) {
  const next = nextBatch(m);
  if (!next.length || !batchReady(m)) return false;
  const done = introducedOn(m, t);
  return done === 0 || done + next.length <= m.settings.newPerDay;
}
function release(m) { const next = nextBatch(m); m.open.push(...next); m.batch = next; return next; }

function weakness(c) {
  const n = c.seen || 0;
  const miss = ((c.wrong || 0) + 1) / (n + 2);
  const slow = c.msN ? Math.min(1, c.msSum / c.msN / 12000) : 0.5;
  return miss * 2 + slow + (TOP_BOX - (c.box || 0)) * 0.1;
}
function dueIds(m, t) {
  return m.open.filter(id => { const c = peek(m, id); return c.box >= 1 && c.due && c.due <= t; })
    .sort((x, y) => {
      const a = peek(m, x), b = peek(m, y);
      if (a.due !== b.due) return a.due < b.due ? -1 : 1;
      return (weakness(b) - weakness(a)) || FACT[x].order - FACT[y].order;
    });
}
// A session: facts due today, the facts still being learned, a new set when the last one is mostly mastered,
// topped up to five with learned facts that are not due yet. Returns [{id, step}].
function buildSession(m, t, rand = Math.random) {
  if (canRelease(m, t)) release(m);
  const fresh = m.open.filter(id => peek(m, id).box === 0).map(id => ({ id, step: peek(m, id).seen ? 'learn' : 'show' }));
  const due = dueIds(m, t);
  const room = Math.max(m.settings.perSession - fresh.length, Math.min(due.length, 2));
  const reviews = due.slice(0, room).map(id => ({ id, step: 'review' }));
  const items = [];
  for (let i = 0; i < Math.max(reviews.length, fresh.length); i++) {   // start with one she knows, then mix
    if (reviews[i]) items.push(reviews[i]);
    if (fresh[i]) items.push(fresh[i]);
  }
  if (items.length < MIN_SESSION) {
    const used = new Set(items.map(x => x.id));
    const warm = m.open.filter(id => { const c = peek(m, id); return c.box >= 1 && !(c.due && c.due <= t) && !used.has(id); })
      .map(id => ({ id, w: weakness(peek(m, id)) + rand() * 0.6 })).sort((a, b) => b.w - a.w)
      .slice(0, MIN_SESSION - items.length).map(x => ({ id: x.id, step: 'warm' }));
    items.unshift(...warm);
  }
  return items;
}
function gradeOf(m, correct, ms, helped, digits) {
  if (!correct) return 'again';
  const limit = m.settings.fastSec * 1000 + 600 * Math.max(0, digits - 1);   // a little longer to type two digits
  return !helped && ms <= limit ? 'easy' : 'good';
}
// Returns the step to show the card again later in this session, or null.
function schedule(c, step, g, t, views) {
  const put = box => { c.box = box; c.due = addDays(t, INTERVAL[box]); c.up = t; };
  if (step === 'show') return 'learn';
  if (step === 'learn') {
    if (g === 'again') return views < MAX_VIEWS ? 'learn' : null;
    put(g === 'easy' ? KNOWN_BOX : 1);
    return null;
  }
  if (step === 'relearn') return g === 'again' && views < MAX_VIEWS ? 'relearn' : null;
  // 'review' (due today) or 'warm' (learned, not due yet: a right answer leaves its schedule alone)
  if (g === 'again') { c.lapses = (c.lapses || 0) + 1; put(1); return 'relearn'; }
  if (step === 'review' && c.up !== t) put(Math.min(TOP_BOX, c.box + (g === 'easy' ? 2 : 1)));
  return null;
}
const tableIds = t => FACTS.filter(f => f.table === t).map(f => f.id);
const tableMastered = (m, t) => tableIds(t).every(id => peek(m, id).box >= MASTER_BOX);
// One answer. mode 'normal' moves the card through the boxes; 'practice' (tricky ones, a table from Home)
// only counts stars and the statistics.
function answer(m, item, correct, ms, helped, t, views, mode = 'normal') {
  const f = FACT[item.id], c = rec(m, item.id);
  const g = gradeOf(m, correct, ms, helped, String(f.ans).length);
  const events = [];
  c.seen = (c.seen || 0) + 1;
  c.lastMs = Math.round(ms);
  if (correct) {
    c.right = (c.right || 0) + 1; c.msSum = (c.msSum || 0) + Math.min(ms, 30000); c.msN = (c.msN || 0) + 1;
    if (g === 'easy') c.fast = (c.fast || 0) + 1;
  } else {
    c.wrong = (c.wrong || 0) + 1;
    (c.again = c.again || []).push(t); if (c.again.length > 20) c.again.splice(0, c.again.length - 20);
    c.aTs = Date.now();
  }
  const day = m.days[t] || (m.days[t] = { n: 0, ok: 0 });
  day.n++; if (correct) day.ok++;
  m.log.push([t, item.id, correct ? 1 : 0, Math.round(ms)]);
  if (m.log.length > 4000) m.log.splice(0, m.log.length - 4000);

  let stars = 0;
  if (correct) {
    stars = g === 'easy' ? 2 : 1;                       // one star, and a bonus star for a fast answer
    if (m.stars.day !== t) { m.stars.day = t; m.stars.today = 0; }
    m.stars.today += stars; m.stars.total += stars;
  }
  let again = null;
  if (mode === 'normal') {
    if (!c.intro) c.intro = t;
    again = schedule(c, item.step, g, t, views);
    if (c.box >= MASTER_BOX && !m.stickers[f.table] && tableMastered(m, f.table)) {
      m.stickers[f.table] = t;
      events.push({ type: 'sticker', table: f.table });
      if (TABLES.every(x => m.stickers[x])) events.push({ type: 'all' });
    }
  } else if (!correct && views < 2) again = item.step;   // practice: a missed fact comes once more
  return { grade: g, stars, again, events };
}
// Insert a card again after two others (or at the end of a short queue).
function requeue(queue, item, gap = 2) { queue.splice(Math.min(gap, queue.length), 0, item); return queue; }

// The daily goal: minutes with a card on screen (at most 2 a card). Reaching it gives a bonus star, once a day.
function addActive(m, t, secs) {
  m.active[t] = (m.active[t] || 0) + Math.max(0, Math.min(CARD_CAP, secs));
  const keys = Object.keys(m.active).sort();
  if (keys.length > 120) keys.slice(0, keys.length - 120).forEach(k => delete m.active[k]);
  if (m.daily.day !== t) m.daily = { day: t, hit: false };
  if (m.daily.hit || m.active[t] < m.settings.goalMin * 60) return [];
  m.daily.hit = true;
  if (m.stars.day !== t) { m.stars.day = t; m.stars.today = 0; }
  m.stars.today += 1; m.stars.total += 1;
  return [{ type: 'target' }];
}
const activeOn = (m, t) => m.active[t] || 0;
const practisedDays = m => [...new Set([...Object.keys(m.days).filter(d => m.days[d].n > 0), ...m.reg])].sort();
function streakNow(m, t) {
  const set = new Set(practisedDays(m));
  let d = t, n = 0;
  if (!set.has(d)) d = addDays(d, -1);
  while (set.has(d)) { n++; d = addDays(d, -1); }
  return n;
}
const twinKnown = (m, f) => { const tw = twinOf(f); return tw && peek(m, tw.id).box >= 1 ? tw : null; };
function trickyIds(m, t) {
  const from = addDays(t, -6);
  return m.open.filter(id => (peek(m, id).again || []).some(d => d >= from && d <= t))
    .sort((a, b) => (peek(m, b).aTs || 0) - (peek(m, a).aTs || 0)).slice(0, 6);
}
const tablePracticeIds = (m, t) => tableIds(t).filter(id => peek(m, id).box >= 1);
function currentTable(m) {
  if (m.batch.length) return FACT[m.batch[0]].table;
  const first = FACTS.find(f => !m.open.includes(f.id));
  return first ? first.table : null;
}
function tableStats(m) {
  return TABLES.map(t => {
    const s = { t, n: 0, ok: 0, opened: 0, learned: 0, mastered: 0, sticker: m.stickers[t] || '' };
    tableIds(t).forEach(id => {
      const c = peek(m, id);
      s.n += c.seen || 0; s.ok += c.right || 0;
      if (m.open.includes(id)) s.opened++;
      if (c.box >= 1) s.learned++;
      if (c.box >= MASTER_BOX) s.mastered++;
    });
    return s;
  });
}
// Facts she has missed, or answers slowly (more than twice the "fast" time on average), weakest first.
function weakest(m, k = 10) {
  const slow = m.settings.fastSec * 2000;
  return FACTS.filter(f => { const c = peek(m, f.id); return (c.wrong || 0) > 0 || (c.msN && c.msSum / c.msN > slow); })
    .map(f => ({ f, c: peek(m, f.id), w: weakness(peek(m, f.id)) }))
    .sort((a, b) => b.w - a.w).slice(0, k);
}

const core = { toAr, toWestern, parseAnswer, TABLES, FACTS, FACT, twinOf, addDays, INTERVAL, TOP_BOX, KNOWN_BOX, MASTER_BOX,
  MIN_SESSION, MAX_VIEWS, DEFAULT_SETTINGS, blank, clean, valid, peek, rec, batchesFor, nextBatch, batchReady, introducedOn,
  canRelease, release, weakness, dueIds, buildSession, gradeOf, schedule, answer, requeue, tableIds, tableMastered,
  streakNow, addActive, activeOn, practisedDays, CARD_CAP, twinKnown, trickyIds, tablePracticeIds, currentTable, tableStats, weakest };

/* =====================================================================================================
   The screens. api comes from app.js: today, lsGet, lsSet, show, toast, SFX, sfx(), confetti, stopConfetti,
   holdToOpen, reduced, DEV, backup, restore, english, stopEnglish, setDeck. The science garden (garden.js) is mounted here.
   ===================================================================================================== */
function mount(api) {
  const $ = (s, r = document) => r.querySelector(s);
  const KEY = 'tc:maria:math';
  const today = () => api.today();
  let m = load();
  let S = null;                       // the current round
  function load() { try { return clean(JSON.parse(api.lsGet(KEY) || 'null')); } catch (e) { return blank(); } }
  function save() { api.lsSet(KEY, JSON.stringify(m)); }

  /* ---------- markup ---------- */
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button class="mx-key" data-k="${d}" style="grid-area:k${d}">${toAr(d)}</button>`).join('');
  document.body.insertAdjacentHTML('beforeend', `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-bksp" viewBox="0 0 24 24"><path d="M9.2 5.2h10.3a1.6 1.6 0 0 1 1.6 1.6v10.4a1.6 1.6 0 0 1-1.6 1.6H9.2L3 12z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M11.8 9.4l5.2 5.2M17 9.4l-5.2 5.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></symbol>
  <symbol id="i-next" viewBox="0 0 24 24"><path d="M19 12H5.5M11 5.5L4.5 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></symbol>
</svg>

<section id="mhome" class="screen mx mx-home" dir="rtl" lang="ar" hidden>
  <button class="deck-chip deck-talk" id="mxToTalk" lang="en" dir="ltr">Talk Cards</button>
  <button class="gear" id="mxGear" aria-label="Parent area: press and hold">
    <svg class="ring" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="24"/></svg>
    <svg class="cog" aria-hidden="true"><use href="#i-gear"/></svg>
  </button>
  <h1 class="mx-title"><span class="mx-logo" aria-hidden="true">×</span>جدول الضرب</h1>
  <div class="mx-stats">
    <div class="mx-stat"><div class="mx-stat-n"><svg class="star" aria-hidden="true"><use href="#i-star"/></svg><b id="mxStars"></b></div><span>نجومي</span></div>
    <div class="mx-stat"><div class="mx-stat-n"><svg class="flame" aria-hidden="true"><use href="#i-flame"/></svg><b id="mxStreak"></b></div><span>أيام متتالية</span></div>
  </div>
  <button id="mxStart" class="btn-start mx-start">ابدئي</button>
  <div class="goal" id="mxGoal"><svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle class="ring-bg" cx="32" cy="32" r="27"/><circle class="ring-fg" id="mxRing" cx="32" cy="32" r="27"/></svg><div class="goal-text"><b id="mxMins"></b><span id="mxGoalText"></span></div></div>
  <div class="mx-stickers" id="mxStickers"></div>
  <div class="mx-now" id="mxNow"></div>
  <div class="app-foot maria-only" lang="en" dir="ltr">
    <div class="credit">Designed by Dr Asma Khattala</div>
    <button class="backup-link" data-backup><svg aria-hidden="true"><use href="#i-save"/></svg>Back up progress</button>
  </div>
</section>

<section id="msession" class="screen mx" dir="rtl" lang="ar" hidden>
  <div class="topbar">
    <button id="mxQuit" class="quit" aria-label="الرئيسية"><svg aria-hidden="true"><use href="#i-close"/></svg></button>
    <div class="progress"><div class="fill" id="mxProg"></div></div>
    <div class="mini-goal" id="mxMini"><svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle class="ring-bg" cx="32" cy="32" r="25"/><circle class="ring-fg" id="mxSessRing" cx="32" cy="32" r="25"/></svg><span id="mxSessMins"></span></div>
    <div class="star-count" id="mxStarCount"><svg class="star" aria-hidden="true"><use href="#i-star"/></svg><span id="mxStarNum"></span></div>
  </div>
  <div class="mx-main">
    <div class="mx-cardbox" id="mxCardBox">
      <div class="card-shadow"></div>
      <div class="card-lift" id="mxLift">
        <div class="card" id="mxCard">
          <div class="face front" id="mxFront"></div>
          <div class="face back" id="mxBack"></div>
        </div>
      </div>
    </div>
    <div class="mx-side" id="mxSide">
      <div class="mx-pad" id="mxPad" dir="ltr">
        ${keys}
        <button class="mx-key mx-del" data-k="del" style="grid-area:del" aria-label="امسحي"><svg aria-hidden="true"><use href="#i-bksp"/></svg></button>
        <button class="mx-key" data-k="0" style="grid-area:k0">٠</button>
        <button class="btn btn-good mx-check" id="mxCheck" style="grid-area:ok" dir="rtl" disabled><svg class="ic-tick" aria-hidden="true"><use href="#i-tick"/></svg>تحقّق</button>
      </div>
      <div class="mx-after" id="mxAfter" hidden>
        <div class="mx-reward" id="mxReward"></div>
        <button class="btn mx-next" id="mxNext">التالي<svg aria-hidden="true"><use href="#i-next"/></svg></button>
      </div>
    </div>
  </div>
</section>

<section id="mdone" class="screen mx" dir="rtl" lang="ar" hidden>
  <h1 class="done-title">انتهينا!</h1>
  <div class="done-stars" id="mxDoneStarsRow"><svg class="star" aria-hidden="true"><use href="#i-star"/></svg><b id="mxDoneStars" dir="ltr"></b></div>
  <div class="goal" id="mxDoneGoal"><svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle class="ring-bg" cx="32" cy="32" r="27"/><circle class="ring-fg" id="mxDoneRing" cx="32" cy="32" r="27"/></svg><div class="goal-text"><b id="mxDoneMins"></b><span id="mxDoneGoalText"></span></div></div>
  <button id="mxMore" class="btn btn-soft"></button>
  <button id="mxHome" class="btn-link">الرئيسية</button>
</section>

<section id="mparent" class="screen mx-parent" hidden></section>

<section id="mxCel" class="overlay mx" dir="rtl" lang="ar" hidden>
  <canvas id="mxConfetti" aria-hidden="true"></canvas>
  <div class="cel-box">
    <div class="cel-badge" id="mxCelBadge"></div>
    <div class="cel-kicker" id="mxCelKicker"></div>
    <h2 class="cel-title" id="mxCelTitle"></h2>
    <button id="mxCelBtn" class="btn btn-good">هيا!</button>
  </div>
</section>`);

  // the science garden: one step for every 50 stars (garden.js; its card sits on this Home, its button on Done)
  const garden = root.ScienceGarden ? root.ScienceGarden.mount({
    m: () => m, save, today, toAr, home, show: api.show, SFX: api.SFX, confetti: api.confetti, stopConfetti: api.stopConfetti, reduced: api.reduced
  }) : null;

  // the way in, on the English Home screen
  const chip = document.createElement('button');
  chip.className = 'deck-chip deck-math'; chip.id = 'toMaths'; chip.lang = 'ar'; chip.dir = 'rtl';
  chip.innerHTML = '<span class="x" aria-hidden="true">×</span>جدول الضرب';
  $('#home').append(chip);

  /* ---------- Home ---------- */
  const starSvg = '<svg class="star" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-star"/></svg>';
  // The daily goal ring, as on the English Home: minutes today out of the goal (٥ by default).
  const clock = {
    acc: 0, since: null, on: false,
    start() { this.acc = 0; this.on = true; this.since = document.hidden ? null : performance.now(); },
    pause() { if (this.since != null) { this.acc += performance.now() - this.since; this.since = null; } },
    resume() { if (this.on && this.since == null) this.since = performance.now(); },
    secs() { if (!this.on) return 0; return Math.min(CARD_CAP, (this.acc + (this.since != null ? performance.now() - this.since : 0)) / 1000); },
    stop() { const s = this.secs(); this.on = false; this.since = null; this.acc = 0; return s; }
  };
  let tick = 0;
  const minWord = n => (n === 1 ? 'دقيقة' : n === 2 ? 'دقيقتين' : n <= 10 ? 'دقائق' : 'دقيقة');
  function ringInto(ring, num, text, box) {
    const secs = activeOn(m, today()) + clock.secs(), goal = m.settings.goalMin, done = secs >= goal * 60;
    const mins = done ? Math.floor(secs / 60) : Math.min(goal, Math.floor(secs / 60));
    const r = Number(ring.getAttribute('r')), C = 2 * Math.PI * r;
    ring.style.strokeDasharray = `${C}`;
    ring.style.strokeDashoffset = `${C * (1 - Math.min(1, secs / (goal * 60)))}`;
    num.textContent = toAr(mins);
    if (text) text.textContent = done ? 'وصلتِ لهدف اليوم!' : `من ${toAr(goal)} ${minWord(goal)} اليوم`;
    box.classList.toggle('reached', done);
  }
  const sessRing = () => ringInto($('#mxSessRing'), $('#mxSessMins'), null, $('#mxMini'));
  function home() {
    stopRound();
    api.stopEnglish();
    api.setDeck('math');
    document.body.dataset.profile = 'maria';
    const t = today();
    $('#mxStars').textContent = toAr(m.stars.total);
    $('#mxStreak').textContent = toAr(streakNow(m, t));
    ringInto($('#mxRing'), $('#mxMins'), $('#mxGoalText'), $('#mxGoal'));
    const cur = currentTable(m);
    const box = $('#mxStickers'); box.textContent = '';
    tableStats(m).forEach(s => {
      const state = s.sticker ? 'done' : s.t === cur ? 'current' : s.learned ? 'started' : 'locked';
      const canPractise = s.learned > 0;
      const b = document.createElement(canPractise ? 'button' : 'div');
      b.className = 'mx-sticker ' + state;
      if (canPractise) b.dataset.table = s.t;
      b.setAttribute('aria-label', `جدول ${toAr(s.t)}`);
      b.innerHTML = `<span>${toAr(s.t)}</span>${s.sticker ? starSvg : ''}`;
      box.append(b);
    });
    const all = TABLES.every(x => m.stickers[x]);
    $('#mxNow').textContent = all ? 'أتقنتِ كلَّ الجداول!' : cur ? `الآن: جدول ${toAr(cur)}` : '';
    if (garden) garden.homeCard();
    api.show('mhome');
  }

  /* ---------- a round ---------- */
  function stopRound() {
    S = null;
    clock.stop(); clearInterval(tick);
    $('#mxCel').hidden = true;
    api.stopConfetti($('#mxConfetti'));
    if (garden) garden.dismiss();                  // the garden's "50 stars" moment, if it was still open
  }
  function startNormal() {
    api.SFX.init();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    const items = buildSession(m, today());
    save();                                        // a new set may have been released
    if (!items.length) return showDone({ stars: 0 });
    startRound('normal', items);
  }
  function startPractice(ids) {
    api.SFX.init();
    if (ids.length) startRound('practice', ids.map(id => ({ id, step: 'practice' })));
  }
  function startRound(mode, items) {
    if (garden) garden.dismiss();
    S = { mode, queue: items.slice(), views: {}, answered: 0, stars: 0, starsAt: m.stars.total, celeb: [], item: null, typed: '', helped: false,
          phase: 'ask', shownAt: 0, hiddenAt: 0 };
    $('#mxStarNum').textContent = toAr(m.stars.day === today() ? m.stars.today : 0);
    api.show('msession');
    nextCard();
  }
  function progress() {
    const p = S ? S.answered / Math.max(1, S.answered + S.queue.length + (S.phase === 'ask' ? 1 : 0)) : 0;
    $('#mxProg').style.width = (p * 100) + '%';
  }
  function nextCard() {
    if (!S) return;
    if (!S.queue.length) return endRound();
    S.item = S.queue.shift();
    S.typed = ''; S.phase = 'ask'; S.missed = false;
    S.helped = S.item.step === 'show';            // a new fact comes with its dot picture
    renderFront();
    progress();
    S.shownAt = performance.now(); S.hiddenAt = 0;
    clock.start(); clearInterval(tick); tick = setInterval(sessRing, 1000); sessRing();
  }
  function endRound() {
    const done = S;
    S = null;
    clock.stop(); clearInterval(tick);
    showDone(done);
  }

  /* ---------- the card ---------- */
  const dir = () => m.settings.dir;
  // The markup keeps the reading order (first factor, ×, second factor, =, answer); dir="rtl" lays it out from
  // the right, as in her book, so the first factor sits on the right and the answer box on the far left.
  const eqHTML = (f, ans, cls = '') =>
    `<div class="mx-eq ${cls}" dir="${dir()}"><span class="n">${toAr(f.a)}</span><span class="op">×</span><span class="n">${toAr(f.b)}</span><span class="op">=</span>${ans}</div>`;
  const miniEq = f => `<span class="mx-mini" dir="${dir()}"><span>${toAr(f.a)}</span><span>×</span><span>${toAr(f.b)}</span></span>`;
  // f.a rows of f.b dots; on the back each row ends with the running count (٤، ٨، ١٢), the last one is the answer.
  function dotsEl(f, counted) {
    const box = document.createElement('div');
    box.className = 'mx-dots' + (counted ? ' counted' : '');
    box.dir = dir();
    for (let r = 0; r < f.a; r++) {
      const line = document.createElement('div');
      line.className = 'mx-line' + (r === 4 && f.a > 5 ? ' five' : '');
      line.style.setProperty('--r', r);
      const row = document.createElement('div'); row.className = 'mx-row';
      for (let k = 0; k < f.b; k++) {
        const d = document.createElement('i');
        d.className = 'mx-dot' + (k === 4 && f.b > 5 ? ' five' : '');
        row.append(d);
      }
      line.append(row);
      if (counted) {
        const n = document.createElement('b');
        n.className = 'mx-cum' + (r === f.a - 1 ? ' last' : '');
        n.textContent = toAr((r + 1) * f.b);
        line.append(n);
      }
      box.append(line);
    }
    return box;
  }
  function renderFront() {
    const f = FACT[S.item.id], card = $('#mxCard'), front = $('#mxFront');
    card.classList.add('no-anim'); card.classList.remove('flipped');
    void card.offsetWidth; card.classList.remove('no-anim');
    $('#mxBack').textContent = '';
    const step = S.item.step;
    const label = step === 'show' ? '<div class="label mx-new">جديد</div>' : step === 'warm' ? '<div class="label">تذكّري</div>' : '';
    front.innerHTML = `${label}<div class="mx-q">${eqHTML(f, '<span class="mx-ans empty" id="mxAns">؟</span>')}</div>` +
      (S.helped ? '' : '<div class="foot mx-foot"><button class="hint-btn mx-hint" id="mxHint">مساعدة</button></div>');
    if (S.helped) addDots(front, f, false);
    $('#mxPad').hidden = false; $('#mxAfter').hidden = true;
    $('#mxCheck').disabled = true;
    layout();
    const box = $('#mxCardBox');
    box.classList.remove('enter'); void box.offsetWidth; box.classList.add('enter');
  }
  function addDots(face, f, counted) {
    const area = document.createElement('div'); area.className = 'mx-dotsarea';
    area.append(dotsEl(f, counted));
    face.querySelector('.mx-q').append(area);
  }
  function renderBack(f, correct, res, second) {
    const back = $('#mxBack');
    const lab = !correct ? 'لا بأس' : second ? 'صحّحتِها!' : res.grade === 'easy' ? 'سريعة!' : 'أحسنتِ!';
    const tw = twinKnown(m, f);
    back.innerHTML = `<div class="label mx-res ${correct ? 'mx-good' : 'mx-calm'}">${lab}</div>
      <div class="mx-q">${eqHTML(f, `<span class="mx-ans full">${toAr(f.ans)}</span>`, 'small')}
      ${tw ? `<div class="mx-twin"><span>نفس</span>${miniEq(tw)}</div>` : ''}</div>`;
    addDots(back, f, true);
  }
  // Biggest equation that fits the card; the dots get the room that is left.
  function fitEq(face) {
    const eq = face.querySelector('.mx-eq'); if (!eq) return;
    const q = face.querySelector('.mx-q');
    const H = face.clientHeight, W = q.clientWidth;
    const withDots = !!face.querySelector('.mx-dotsarea');
    const small = eq.classList.contains('small');
    const f = S && FACT[S.item.id], few = f && f.a <= 3;           // a small picture leaves room for a bigger sum
    let size = Math.round(Math.min(small ? 96 : withDots ? (few ? 130 : 104) : 150, H * (withDots ? (few ? 0.28 : 0.2) : 0.36)));
    eq.style.fontSize = size + 'px';
    while (eq.scrollWidth > W * 0.96 && size > 24) { size -= 4; eq.style.fontSize = size + 'px'; }
  }
  function sizeDots(face) {
    const area = face.querySelector('.mx-dotsarea'); if (!area) return;
    const box = area.firstChild, f = FACT[S ? S.item.id : ''] || null;
    if (!f) return;
    const counted = box.classList.contains('counted');
    const q = face.querySelector('.mx-q');
    // room left in the card under the sum (and the "same as" hint); the picture and the sum stay centred together
    const used = [...q.children].filter(el => el !== area).reduce((n, el) => n + el.getBoundingClientRect().height + 12, 0);
    const W = q.clientWidth, H = Math.max(40, q.clientHeight - used - 4);
    const wc = f.b + 0.35 * (f.b - 1) + (f.b > 5 ? 0.5 : 0) + 0.7 + (counted ? 2.8 : 0);
    const hc = f.a * 1.7 + 0.3 * (f.a - 1) + (f.a > 5 ? 0.4 : 0);
    const d = Math.max(5, Math.min(f.a * f.b <= 4 ? 54 : 42, Math.floor(Math.min(W / wc, H / hc))));
    box.style.setProperty('--d', d + 'px');
  }
  function layout() {
    if (!S) return;
    [$('#mxFront'), $('#mxBack')].forEach(face => { fitEq(face); sizeDots(face); });
  }

  /* ---------- typing and checking ---------- */
  function press(k) {
    if (!S || S.phase !== 'ask') return;
    if (k === 'del') S.typed = S.typed.slice(0, -1);
    else if (S.typed.length < 3) S.typed = (S.typed === '0' ? '' : S.typed) + k;
    const el = $('#mxAns');
    el.textContent = S.typed ? toAr(S.typed) : '؟';
    el.classList.toggle('empty', !S.typed);
    $('#mxCheck').disabled = !S.typed;
    if (api.SFX.ready()) api.SFX.tone(k === 'del' ? 520 : 760, 0, 0.05, 0.06, 'triangle', 0.004);
  }
  function hint() {
    if (!S || S.phase !== 'ask' || S.helped) return;
    S.helped = true;
    const h = $('#mxHint'); if (h) h.parentElement.remove();
    addDots($('#mxFront'), FACT[S.item.id], false);
    layout();
  }
  function activeMs() { return performance.now() - S.shownAt - (S.hiddenAt ? performance.now() - S.hiddenAt : 0); }
  function check() {
    if (!S || S.phase !== 'ask' || !S.typed) return;
    const f = FACT[S.item.id];
    const correct = parseAnswer(S.typed) === f.ans;
    if (!correct && !S.missed) { S.missed = true; tryAgain(); return; }   // the first miss: one more go
    S.phase = 'checked';
    const views = S.views[f.id] = (S.views[f.id] || 0) + 1;
    // only a right FIRST answer counts as right, so a fact she missed still comes back soon
    const res = answer(m, S.item, correct && !S.missed, activeMs(), S.helped, today(), views, S.mode);
    save();                                        // after every answer
    if (res.again) requeue(S.queue, { id: f.id, step: res.again });
    S.answered++; S.stars += res.stars; S.celeb.push(...res.events);
    progress();
    renderBack(f, correct, res, S.missed);
    const ans = $('#mxAns');
    $('#mxAgain')?.remove();
    if (correct) { ans.classList.add('ok'); api.SFX.good(); burst(ans, res.grade === 'easy' ? 64 : 46); }
    setTimeout(() => flipToBack(res), correct ? 720 : 160);
  }
  // A wrong first answer: the box shakes, a soft "uh-oh", and «حاولي مرّة أخرى» until she types again.
  function tryAgain() {
    S.phase = 'wait';
    const ans = $('#mxAns');
    ans.classList.remove('no'); void ans.offsetWidth; ans.classList.add('no');
    api.SFX.again();
    $('#mxAgain')?.remove();
    const q = $('#mxFront .mx-q');
    q.append(Object.assign(document.createElement('div'), { className: 'mx-again', id: 'mxAgain', textContent: 'حاولي مرّة أخرى 💪' }));
    $('#mxCheck').disabled = true;
    layout();
    setTimeout(() => {
      if (!S || S.phase !== 'wait') return;
      S.phase = 'ask'; S.typed = '';
      ans.classList.remove('no', 'full'); ans.classList.add('empty'); ans.textContent = '؟';
    }, api.reduced() ? 300 : 900);
  }
  // Confetti from the answer box when she is right: a quick burst of little paper pieces that fall away.
  function burst(el, n) {
    if (api.reduced()) return;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const layer = document.createElement('div'); layer.className = 'mx-burst';
    const colors = ['#FFC93C', '#5FD3A5', '#FF7EB0', '#A994F2', '#62B8F0', '#FF9A5C'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 230, size = 9 + Math.random() * 10;
      const dx = Math.cos(a) * v, dy = Math.sin(a) * v - 70, fall = 160 + Math.random() * 140, spin = (Math.random() - .5) * 900;
      p.style.cssText = `left:${cx}px;top:${cy}px;width:${size}px;height:${size * (Math.random() < .5 ? .45 : 1)}px;` +
        `background:${colors[i % colors.length]};border-radius:${Math.random() < .4 ? '50%' : '2px'}`;
      layer.append(p);
      p.animate([
        { transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${spin / 2}deg) scale(1)`, opacity: 1, offset: .45 },
        { transform: `translate(calc(-50% + ${dx * 1.25}px), calc(-50% + ${dy + fall}px)) rotate(${spin}deg) scale(.9)`, opacity: 0 }
      ], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
    }
    document.body.append(layer);
    setTimeout(() => layer.remove(), 1800);
  }
  function flipToBack(res) {
    if (!S) return;
    api.SFX.flip();
    $('#mxPad').hidden = true;
    $('#mxCard').classList.add('flipped');
    if (!api.reduced()) {
      try { $('#mxLift').animate([{ transform: 'none' }, { transform: 'translateY(-12px) scale(1.03)' }, { transform: 'none' }], { duration: 600, easing: 'ease-in-out' }); } catch (e) {}
    }
    layout();
    setTimeout(() => {
      if (!S) return;
      S.phase = 'back';
      const rw = $('#mxReward');
      rw.innerHTML = res.stars ? `${starSvg.repeat(res.stars)}<b dir="ltr">+${toAr(res.stars)}</b>` : '';
      rw.classList.remove('pop'); void rw.offsetWidth; rw.classList.add('pop');
      $('#mxAfter').hidden = false;
      if (res.stars) {
        for (let i = 0; i < res.stars; i++) api.SFX.star(0.12 + i * 0.16);
        $('#mxStarNum').textContent = toAr(m.stars.today);
        const sc = $('#mxStarCount'); sc.classList.remove('bump'); void sc.offsetWidth; sc.classList.add('bump');
      }
      $('#mxNext').focus({ preventScroll: true });
    }, api.reduced() ? 240 : 620);
  }
  function next() {
    if (!S || S.phase !== 'back') return;
    S.phase = 'leaving';
    S.celeb.push(...addActive(m, today(), Math.round(clock.stop())));   // this card's time towards the daily goal
    save();
    $('#mxStarNum').textContent = toAr(m.stars.today);
    sessRing();
    const go = () => { if (!S) return; if (S.celeb.length) celebrate(S.celeb.shift(), go); else nextCard(); };
    go();
  }

  /* ---------- celebrations ---------- */
  function celebrate(ev, then) {
    const ov = $('#mxCel'), badge = $('#mxCelBadge'), btn = $('#mxCelBtn');
    badge.className = 'cel-badge';
    if (ev.type === 'target') {
      badge.classList.add('mx-cel-goal'); badge.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-tick"/></svg>';
      $('#mxCelKicker').textContent = 'هدف اليوم!';
      $('#mxCelTitle').textContent = 'أحسنتِ!';
    } else if (ev.type === 'sticker') {
      badge.classList.add('mx-cel-sticker'); badge.innerHTML = `<span>${toAr(ev.table)}</span>${starSvg}`;
      $('#mxCelKicker').textContent = 'ملصق جديد!';
      $('#mxCelTitle').textContent = `أتقنتِ جدول ${toAr(ev.table)}`;
    } else {
      badge.innerHTML = starSvg;
      $('#mxCelKicker').textContent = 'كلُّ الملصقات!';
      $('#mxCelTitle').textContent = 'أتقنتِ جدول الضرب!';
    }
    ov.hidden = false;
    badge.style.animation = 'none'; void badge.offsetWidth; badge.style.animation = '';
    api.SFX.unlock();
    api.confetti($('#mxConfetti'));
    btn.disabled = true;
    setTimeout(() => { btn.disabled = false; }, 900);
    btn.onclick = () => { ov.hidden = true; api.stopConfetti($('#mxConfetti')); then(); };
  }

  /* ---------- done ---------- */
  function showDone(done) {
    $('#mxDoneStars').textContent = '+' + toAr(done.stars || 0);
    $('#mxDoneStarsRow').hidden = !done.stars;
    ringInto($('#mxDoneRing'), $('#mxDoneMins'), $('#mxDoneGoalText'), $('#mxDoneGoal'));
    const tricky = trickyIds(m, today()), more = $('#mxMore');
    more.textContent = tricky.length ? 'الصعبة مرة أخرى' : 'جولة أخرى';
    more.dataset.kind = tricky.length ? 'tricky' : 'normal';
    api.show('mdone');
    if (garden) garden.afterRound(done.starsAt);     // a new step in her garden for every 50 stars
  }
  function more() {
    if ($('#mxMore').dataset.kind === 'tricky') startPractice(trickyIds(m, today()));
    else startNormal();
  }

  /* ---------- parent area (English, Western digits) ---------- */
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const STEPS = { perSession: [5, 10, 1], batchSize: [3, 4, 1], newPerDay: [3, 20, 1], goalMin: [3, 20, 1], fastSec: [2, 8, 1] };
  const stepper = (k, v, unit = '') => `<div class="step"><button class="p-btn" data-step="${k}" data-d="-1" aria-label="Less">−</button><output>${v}${unit}</output><button class="p-btn" data-step="${k}" data-d="1" aria-label="More">+</button></div>`;
  const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
  const asDate = ds => { const [y, mo, d] = ds.split('-').map(Number); return new Date(y, mo - 1, d); };
  const shortDate = ds => asDate(ds).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  function renderParent() {
    const t = today(), s = m.settings;
    const learned = FACTS.filter(f => peek(m, f.id).box >= 1).length;
    const mastered = FACTS.filter(f => peek(m, f.id).box >= MASTER_BOX).length;
    const practised = Object.keys(m.days).filter(d => m.days[d].n > 0).sort();
    const answers = practised.reduce((n, d) => n + m.days[d].n, 0), right = practised.reduce((n, d) => n + m.days[d].ok, 0);
    const tables = tableStats(m).map(x => `
      <div class="p-row mx-trow"><span class="mx-tname">× ${x.t}${x.sticker ? ' <span class="mx-tick" title="Sticker">★</span>' : ''}</span>
        <span class="mx-tbar"><i style="width:${x.n ? pct(x.ok, x.n) : 0}%"></i></span>
        <span class="mx-tnum">${x.n ? `${pct(x.ok, x.n)}% right<span class="sub">${x.n} answer${x.n === 1 ? '' : 's'} · ${x.mastered}/10 mastered</span>`
          : x.opened ? '<span class="sub">open, no answers yet</span>' : '<span class="sub">not started</span>'}</span></div>`).join('');
    const weak = weakest(m, 10).map(({ f, c }) => `
      <div class="p-row"><span class="mx-wfact">${f.a} × ${f.b} = ${f.ans}</span>
        <span class="mx-wnum">${c.right || 0} of ${c.seen} right${c.msN ? ` · ${(c.msSum / c.msN / 1000).toFixed(1)} s average` : ''}<span class="sub">box ${c.box || 0}${c.due ? ` · next ${c.due <= t ? 'today' : shortDate(c.due)}` : ''}</span></span></div>`).join('')
      || `<div class="p-row"><span class="sub">${FACTS.some(f => peek(m, f.id).seen) ? 'None yet: every fact so far has been answered right and quickly.' : 'No answers yet.'}</span></div>`;
    const days = practisedDays(m), week = Array.from({ length: 7 }, (_, i) => addDays(t, -i));
    const goalDays = week.filter(d => activeOn(m, d) >= s.goalMin * 60).length;
    const nb = nextBatch(m);
    const sample = FACT.m3x4;
    $('#mparent').innerHTML = `<div class="p-wrap">
    <div class="p-head"><h1>Times tables</h1><button class="p-btn primary" data-act="close">Done</button></div>
    <p class="p-sum">${learned} of 100 facts learned · ${mastered} mastered · ${dueIds(m, t).length} due today · ${practised.length} day${practised.length === 1 ? '' : 's'} practised · streak ${streakNow(m, t)} · ${m.stars.total} stars${api.DEV ? ` · dev date ${t}` : ''}</p>

    <h2 class="mx-h2">Accuracy by table</h2>
    <div class="p-group">${tables}</div>

    <h2 class="mx-h2">Weakest facts</h2>
    <div class="p-group">${weak}</div>

    <h2 class="mx-h2">Days practised</h2>
    <div class="p-group">
      <div class="p-row"><span>${days.length} day${days.length === 1 ? '' : 's'} in all · ${answers} answers · ${pct(right, answers)}% right<span class="sub">Today ${Math.floor(activeOn(m, t) / 60)} min · ${streakNow(m, t)} day${streakNow(m, t) === 1 ? '' : 's'} in a row · last 7 days: goal reached on ${goalDays}${days.length ? ` · first ${shortDate(days[0])}, last ${shortDate(days[days.length - 1])}` : ''}</span></span></div>
      <div class="p-row p-cal"><span>Practice calendar<span class="sub">Minutes a day (estimated for days before the goal ring). ✓ = registered without minutes. Tap a day without minutes to register it, or tap again to take it off.</span></span>${api.calendarHTML(m.active, days, m.reg, s.goalMin)}</div>
    </div>

    ${garden ? `<h2 class="mx-h2">Science garden</h2>
    <div class="p-group">${garden.parentRows()}</div>

    ` : ''}<h2 class="mx-h2">Settings</h2>
    <div class="p-group">
      <div class="p-row"><span>Cards per session<span class="sub">Short sessions: 5 to 10 facts</span></span>${stepper('perSession', s.perSession)}</div>
      <div class="p-row"><span>New facts per set</span>${stepper('batchSize', s.batchSize)}</div>
      <div class="p-row"><span>New facts per day (at most)</span>${stepper('newPerDay', s.newPerDay)}</div>
      <div class="p-row"><span>Daily goal<span class="sub">Minutes with a card on screen (at most 2 a card); a bonus star when reached</span></span>${stepper('goalMin', s.goalMin, ' min')}</div>
      <div class="p-row"><span>Fast answer<span class="sub">Right within this time: Easy + bonus star</span></span>${stepper('fastSec', s.fastSec, ' s')}</div>
      <div class="p-row"><span>Sound effects<span class="sub">Shared with the English cards</span></span><button class="switch" role="switch" aria-checked="${api.sfx()}" data-act="sfx" aria-label="Sound effects"></button></div>
    </div>

    <div class="p-group">
      <div class="p-row"><span>Facts open: ${m.open.length} of 100<span class="sub">${m.batch.length ? `Newest set: ${m.batch.map(id => `${FACT[id].a} × ${FACT[id].b}`).join(', ')}` : 'The first set opens with her first session'} · a new set opens when the last one is mostly learned</span></span></div>
      <div class="p-row"><button class="p-btn" data-act="next-set"${nb.length ? '' : ' disabled'}>Open the next set now${nb.length ? ` (${nb.map(id => `${FACT[id].a} × ${FACT[id].b}`).join(', ')})` : ''}</button></div>
    </div>

    <details class="p-group mx-adv">
      <summary>Advanced</summary>
      <div class="p-row"><span>Equation direction<span class="sub">Right to left is how her school book writes it</span></span>
        <div class="seg"><button data-dir="rtl" aria-pressed="${s.dir === 'rtl'}">Right to left</button><button data-dir="ltr" aria-pressed="${s.dir === 'ltr'}">Left to right</button></div></div>
      <div class="p-row mx-preview" lang="ar">${eqHTML(sample, `<span class="mx-ans full">${toAr(sample.ans)}</span>`, 'small')}</div>
    </details>

    <div class="p-group">
      <div class="p-row"><span>Your progress<span class="sub">One file holds the English cards and the times tables</span></span></div>
      <div class="p-row"><div class="btns">
        <button class="p-btn" data-act="backup">Back up progress</button>
        <button class="p-btn" data-act="restore">Restore from a backup file</button>
      </div></div>
    </div>
    <div class="p-group">
      <div class="p-row"><button class="p-btn danger" data-act="reset">Reset the times tables</button><span class="sub">The English cards are not touched</span></div>
    </div>
    <input id="mxFile" type="file" accept=".json,application/json" hidden>
  </div>`;
  }
  function openParent() { stopRound(); renderParent(); api.show('mparent'); $('#mparent').scrollTop = 0; }
  function onParentClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    const s = m.settings;
    if (b.dataset.step) {
      const k = b.dataset.step, [lo, hi, inc] = STEPS[k];
      s[k] = Math.min(hi, Math.max(lo, s[k] + inc * Number(b.dataset.d)));
      save(); b.parentElement.querySelector('output').textContent = s[k] + (k === 'fastSec' ? ' s' : k === 'goalMin' ? ' min' : '');
      return;
    }
    if (b.dataset.day) {                   // register a practice day by hand, or take it off
      const d = b.dataset.day, on = m.reg.includes(d);
      m.reg = on ? m.reg.filter(x => x !== d) : [...m.reg, d].sort();
      save(); renderParent(); api.toast(on ? `${d} taken off.` : `${d} registered as practised.`);
      return;
    }
    if (b.dataset.dir) { s.dir = b.dataset.dir; save(); renderParent(); $('#mparent .mx-adv').open = true; return; }
    switch (b.dataset.act) {
      case 'close': home(); break;
      case 'garden': if (garden) garden.open(); break;
      case 'sfx': { const v = !api.sfx(); api.sfx(v); b.setAttribute('aria-checked', String(v)); if (v) { api.SFX.init(); api.SFX.good(); } break; }
      case 'next-set': { const nb = release(m); save(); renderParent(); if (nb.length) api.toast(`Opened: ${nb.map(id => `${FACT[id].a} × ${FACT[id].b}`).join(', ')}`); break; }
      case 'backup': save(); api.backup(); break;
      case 'restore': $('#mxFile').click(); break;
      case 'reset':
        if (confirm('Reset the times tables? Every fact goes back to new and the stars, streak and stickers start again. The English cards are not touched.') &&
            confirm('Are you sure? This cannot be undone.')) {
          const keep = { ...m.settings };
          m = blank(); m.settings = keep; save(); renderParent(); api.toast('Times tables reset.');
        }
        break;
    }
  }

  /* ---------- wiring ---------- */
  chip.addEventListener('click', home);
  $('#mxToTalk').addEventListener('click', () => { stopRound(); api.english(); });
  api.holdToOpen($('#mxGear'), 2000, openParent);
  $('#mxStart').addEventListener('click', startNormal);
  $('#mxStickers').addEventListener('click', e => { const b = e.target.closest('[data-table]'); if (b) startPractice(tablePracticeIds(m, Number(b.dataset.table))); });
  $('#mxQuit').addEventListener('click', home);
  $('#mxPad').addEventListener('click', e => { const k = e.target.closest('[data-k]'); if (k) press(k.dataset.k); });
  $('#mxCheck').addEventListener('click', check);
  $('#mxFront').addEventListener('click', e => { if (e.target.closest('#mxHint')) hint(); });
  $('#mxNext').addEventListener('click', next);
  $('#mxMore').addEventListener('click', more);
  $('#mxHome').addEventListener('click', home);
  $('#mparent').addEventListener('click', onParentClick);
  $('#mparent').addEventListener('change', e => {
    if (e.target.id === 'mxFile' && e.target.files[0]) { api.restore(e.target.files[0], renderParent); e.target.value = ''; }
  });
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!$('#mxCel').hidden) { if (e.key === 'Enter' && !$('#mxCelBtn').disabled) { e.preventDefault(); $('#mxCelBtn').click(); } return; }
    if ($('#msession').hidden || !S) return;
    const k = toWestern(e.key);
    if (/^[0-9]$/.test(k)) { e.preventDefault(); press(k); }
    else if (e.key === 'Backspace') { e.preventDefault(); press('del'); }
    else if (e.key === 'Enter') { e.preventDefault(); if (S.phase === 'ask') check(); else if (S.phase === 'back') next(); }
  });
  document.addEventListener('visibilitychange', () => {   // time away from the app counts neither for "fast" nor for the goal
    if (document.hidden) clock.pause(); else clock.resume();
    if (!S || S.phase !== 'ask') return;
    if (document.hidden) S.hiddenAt = performance.now();
    else if (S.hiddenAt) { S.shownAt += performance.now() - S.hiddenAt; S.hiddenAt = 0; }
  });
  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 120); });

  return {
    home,
    isOn: () => ['mhome', 'msession', 'mdone', 'mparent'].some(id => !$('#' + id).hidden) || !$('#mxCel').hidden || !!(garden && garden.isOn()),
    busy: () => !!S || !$('#mparent').hidden || !$('#mxCel').hidden || !!(garden && garden.busy()),
    reload() { m = load(); },
    snapshot() { return JSON.parse(JSON.stringify(m)); },
    valid,
    replace(obj) { m = clean(obj); save(); },
    // for tests (?dev=1)
    get state() { return m; }, get round() { return S; }, press, check, next, hint, startNormal, startPractice, renderParent, garden, core
  };
}

root.TimesTables = { core, mount };
})(typeof window !== 'undefined' ? window : globalThis);
