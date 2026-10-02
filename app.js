/* Maria's Talk Cards
   Plain JavaScript, no libraries. Two profiles: Maria (sets.json) and Mama (prepositions.json). */
(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const PARAMS = new URLSearchParams(location.search);
const DEV = PARAMS.get('dev') === '1';
const OLD_KEY = 'mariaTalkCards.v1';                    // single-profile version, moved into Maria's profile
const PROFILE_KEY = { maria: 'tc:maria', mama: 'tc:mama' };
const LAST_KEY = 'tc:last';
const DEV_KEY = 'mariaTalkCards.devOffset';
const INTERVAL = [0, 1, 2, 4, 8, 16, 32, 64];          // days until next review, by box
const SPEEDS = { slow: 0.75, standard: 0.85, normal: 0.95 };
const STAR_FLIGHT = 560;                                 // ms
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const ARABIC = /[؀-ۿ]/;

/* ---------- storage (always wrapped) ---------- */
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

/* ---------- local calendar dates ---------- */
let devOffset = DEV ? (parseInt(lsGet(DEV_KEY) || '0', 10) || 0) : 0;
const pad = n => String(n).padStart(2, '0');
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function today() { const d = new Date(); d.setDate(d.getDate() + devOffset); return fmt(d); }
function addDays(ds, n) { const [y, m, d] = ds.split('-').map(Number); const x = new Date(y, m - 1, d); x.setDate(x.getDate() + n); return fmt(x); }
const nowTs = () => Date.now() + devOffset * 864e5;

/* ---------- card catalogue (from sets.json) ---------- */
const SETS = [];          // [{id, stage, title, replaces, ans:[ids], ask:[ids]}]
const SET = {};
const CARD = {};          // id -> card
function buildCatalog(json) {
  let n = 0;
  json.sets.forEach(s => {
    const set = { id: s.id, stage: s.stage, title: s.title, replaces: s.replaces || null, ans: [], ask: [] };
    s.cards.forEach((c, i) => {
      const a = { id: `a${s.id}.${i}`, kind: 'ans', set: s.id, stage: s.stage, q: c.q, a: c.a, hint: c.hint || '', order: n++ };
      CARD[a.id] = a; set.ans.push(a.id);
      if (c.ask) {
        const k = { id: `k${s.id}.${i}`, kind: 'ask', set: s.id, stage: s.stage, q: c.q, cue: c.ask, order: n++ };
        CARD[k.id] = k; set.ask.push(k.id);
      }
    });
    SETS.push(set); SET[set.id] = set;
  });
}
const lastSetId = () => SETS[SETS.length - 1].id;

// Mama: prepositions.json. Each card has one gap {{c1::answer}}; "Ø" means no preposition.
const PCARDS = [];        // ids in file order
const PDECK = { name: 'Prepositions', voice: 'en-US' };
function buildPrepCatalog(json) {
  PDECK.name = json.deck || PDECK.name;
  PDECK.voice = json.voice || PDECK.voice;
  let n = 0;
  json.sets.forEach(s => s.cards.forEach(c => {
    const m = /\{\{c1::(.*?)\}\}/.exec(c.text || '');
    if (!m || !c.id || CARD[c.id]) return;
    const answer = m[1].trim();
    const before = c.text.slice(0, m.index), after = c.text.slice(m.index + m[0].length);
    const zero = answer === 'Ø';
    CARD[c.id] = { id: c.id, kind: 'gap', set: s.id, before, after, answer, zero, rule: c.rule || '', tags: c.tags || [], order: n++,
                   spoken: (before + (zero ? '' : answer) + after).replace(/\s+/g, ' ').trim() };
    PCARDS.push(c.id);
  }));
}

/* ---------- saved state: one localStorage key per profile ---------- */
let prof = 'maria';
const isMama = () => prof === 'mama';
function defaults(p = prof) {
  if (p === 'mama') return {
    v: 1, profile: 'mama',
    cards: {},                             // id -> {box, due, again:[dates], aTs, intro, up}
    history: [],                           // {id, day, ts, good, first, flipMs}
    settings: { newPerDay: 10, perSession: 40, speed: 'normal', sfx: true }
  };
  return {
    profile: 'maria',
    v: 1,
    open: SETS.length ? SETS[0].id : 1,   // newest open set
    passed: [],                            // sets whose answer cards are all learned
    cards: {},                             // id -> {box, due, again:[dates], aTs, clean, intro, up, hints}
    stars: { bank: 0, today: 0, day: '' },
    prizes: [],
    settings: { newPerDay: 12, perSession: 12, target: 50, prize: 'new coloring set', voice: '', speed: 'standard', sfx: true },
    pace: 2                                // 2 = two sets a day (October 2026)
  };
}
let st;
function merge(s, p = prof) {
  const d = defaults(p);
  if (!s || typeof s !== 'object') return d;
  const o = { ...d, ...s, profile: p,
    settings: { ...d.settings, ...(s.settings || {}) },
    cards: s.cards && typeof s.cards === 'object' ? s.cards : {} };
  if (p === 'mama') o.history = Array.isArray(s.history) ? s.history : [];
  else {
    o.stars = { ...d.stars, ...(s.stars || {}) };
    o.passed = Array.isArray(s.passed) ? s.passed : [];
    o.prizes = Array.isArray(s.prizes) ? s.prizes : [];
    if (!s.pace) {                         // profiles from the one-set-a-day version: 4 new cards becomes 12
      if (o.settings.newPerDay === 4) o.settings.newPerDay = 12;
      o.pace = 2;
    }
  }
  return o;
}
function readProfile(p) { try { return merge(JSON.parse(lsGet(PROFILE_KEY[p]) || 'null'), p); } catch (e) { return defaults(p); } }
function load(p) { prof = p; st = readProfile(p); }
function save() { lsSet(PROFILE_KEY[prof], JSON.stringify(st)); }
function migrateOldVersion() {      // progress from the single-profile version moves into Maria's profile unchanged
  const old = lsGet(OLD_KEY);
  if (old && !lsGet(PROFILE_KEY.maria)) {
    if (lsSet(PROFILE_KEY.maria, old)) { try { localStorage.removeItem(OLD_KEY); } catch (e) {} if (!lsGet(LAST_KEY)) lsSet(LAST_KEY, 'maria'); }
  }
}
const peek = id => st.cards[id] || { box: 0, due: '', again: [] };
function rec(id) { if (!st.cards[id]) st.cards[id] = { box: 0, due: '', again: [] }; return st.cards[id]; }
function starsToday() { return st.stars && st.stars.day === today() ? st.stars.today : 0; }

/* ---------- which cards are in play ---------- */
function retiredSets() {
  const r = new Set();
  SETS.forEach(s => { if (s.replaces && s.id <= st.open) r.add(s.replaces); });
  return r;
}
function openSets() { const r = retiredSets(); return SETS.filter(s => s.id <= st.open && !r.has(s.id)); }
function eligible() {
  if (isMama()) return PCARDS.slice();      // all of Mama's sets are open
  const out = [];
  openSets().forEach(s => { out.push(...s.ans); if (st.passed.includes(s.id)) out.push(...s.ask); });
  return out;
}
// New-card order: answer cards of the newest open set first, then waiting ask cards in set order.
function newOrder() {
  if (isMama()) return PCARDS.filter(id => peek(id).box === 0);   // file order
  const sets = openSets(); if (!sets.length) return [];
  const newest = sets[sets.length - 1];
  const ids = [];
  [newest, ...sets.slice(0, -1)].forEach(s => s.ans.forEach(id => { if (peek(id).box === 0) ids.push(id); }));
  sets.forEach(s => { if (st.passed.includes(s.id)) s.ask.forEach(id => { if (peek(id).box === 0) ids.push(id); }); });
  return ids;
}
function introducedToday() { const t = today(); return Object.values(st.cards).filter(c => c.intro === t).length; }
function dueIds() {
  const t = today();
  return eligible().filter(id => { const c = peek(id); return c.box >= 1 && c.due && c.due <= t; })
    .sort((a, b) => (peek(a).due < peek(b).due ? -1 : peek(a).due > peek(b).due ? 1 : CARD[a].order - CARD[b].order));
}
function buildQueue() {
  const s = st.settings;
  const fresh = newOrder().slice(0, Math.max(0, s.newPerDay - introducedToday()));
  return [...dueIds(), ...fresh].slice(0, s.perSession);
}
function trickyIds() {
  const t = today(), from = addDays(t, -6);
  return eligible().filter(id => (peek(id).again || []).some(d => d >= from && d <= t))
    .sort((a, b) => (peek(b).aTs || 0) - (peek(a).aTs || 0)).slice(0, 8);
}
function funIds() {
  const ids = eligible().filter(id => peek(id).box >= 1);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return ids.slice(0, 6);
}

/* ---------- scheduling ---------- */
function applyGood(id) {
  const c = rec(id), t = today();
  if (c.box === 0 && !c.intro) c.intro = t;
  const againToday = S.again.has(id) || (c.again || []).includes(t);
  if (againToday) { c.box = 1; c.due = addDays(t, 1); }
  else if (c.up !== t) { c.box = Math.min(7, c.box + 1); c.due = addDays(t, INTERVAL[c.box]); c.up = t; }
  if (CARD[id].kind === 'ans') c.clean = !S.hint.has(id);
  if (!isMama()) { addStar(); checkPass(CARD[id].set, S.celeb); }
  save();
}
function applyAgain(id) {
  const c = rec(id), t = today();
  if (c.box === 0 && !c.intro) c.intro = t;
  c.box = 1; c.due = addDays(t, 1);
  (c.again = c.again || []).push(t);
  c.aTs = nowTs();
  save();
}
function addStar() {
  const t = today();
  if (st.stars.day !== t) { st.stars.day = t; st.stars.today = 0; }
  st.stars.today++; st.stars.bank++;
  if (st.stars.bank >= st.settings.target) {
    st.stars.bank = 0;
    st.prizes.push({ name: st.settings.prize, date: t });
    S.celeb.push({ type: 'prize', name: st.settings.prize, target: st.settings.target });
  }
}
// Mama: every review is logged with the time from the card appearing to the flip.
function logReview(id, good) {
  if (!isMama()) return;
  st.history.push({ id, day: today(), ts: nowTs(), good, first: !S.rated.has(id), flipMs: S.flipMs });
  if (st.history.length > 20000) st.history.splice(0, st.history.length - 20000);
}
function weekStats() {
  const from = addDays(today(), -6);
  const firsts = st.history.filter(h => h.first && h.day >= from);
  return { reviews: firsts.length, good: firsts.filter(h => h.good).length };
}
// A set is passed when every answer card has been answered Good, and its last Good was without the hint.
// (Two sets a day: the next set is ready for the next session; reviews still follow the spacing.)
function checkPass(setId, celeb) {
  if (st.passed.includes(setId) || setId > st.open) return;
  const ok = SET[setId].ans.every(id => { const c = peek(id); return c.box >= 1 && c.clean === true; });
  if (!ok) return;
  st.passed.push(setId);
  if (setId !== st.open) return;
  if (setId < lastSetId()) { st.open = setId + 1; celeb.push({ type: 'unlock', set: st.open }); }
  else celeb.push({ type: 'final' });
}
// On Start: any open set that already meets the rule (for example from an earlier session) opens the next one.
function sweepPasses() {
  const celeb = [];
  SETS.forEach(s => { if (s.id <= st.open && !st.passed.includes(s.id)) checkPass(s.id, celeb); });
  if (celeb.length) save();
  return celeb;
}

/* ---------- recorded voice (Gemini TTS clips from scripts/voice.py) ---------- */
// audio/voice.json: {decks: {maria: {voice, clips: {"line text": {f: file, d: seconds, w: [[start, end] per word]}}}, mama: {...}}}
let VOICE = null;
const deckVoice = () => (VOICE && VOICE.decks && VOICE.decks[prof]) || null;
const clipFor = text => { const d = deckVoice(); return d ? d.clips[text] : null; };
const CLIP_SPEEDS = { slow: 0.88, standard: 1, normal: 1.12 };
const voiceEl = new Audio();
voiceEl.preload = 'auto';
const clipUrls = new Map();      // file -> Promise<blob URL>; blob URLs play offline on iOS
function getClip(file) {
  if (!clipUrls.has(file)) {
    clipUrls.set(file, fetch('audio/' + file).then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(b => URL.createObjectURL(new Blob([b], { type: 'audio/mp4' }))));
    if (clipUrls.size > 40) {        // keep memory small: drop the oldest
      const [old, p] = clipUrls.entries().next().value;
      clipUrls.delete(old); p.then(u => URL.revokeObjectURL(u)).catch(() => {});
    }
  }
  const p = clipUrls.get(file);
  p.catch(() => clipUrls.delete(file));
  return p;
}
let unlockUrl = null;              // a short silent clip, fetched at start-up
function unlockVoice() {           // iOS: the first play() must happen inside a tap
  if (unlockVoice.done || !deckVoice()) return;
  unlockVoice.done = true;
  try { voiceEl.src = unlockUrl || 'audio/_unlock.m4a'; voiceEl.play().catch(() => {}); } catch (e) {}
}

/* ---------- device voice (fallback for any line without a clip) ---------- */
const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Junior|Ralph|Fred|Kathy|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/i;
const hasSpeech = 'speechSynthesis' in window;
const speechLang = () => (isMama() ? PDECK.voice : 'en-US');
function enVoices() {
  if (!hasSpeech) return [];
  const lang = speechLang().toLowerCase();
  try { return speechSynthesis.getVoices().filter(v => (v.lang || '').replace('_', '-').toLowerCase() === lang); } catch (e) { return []; }
}
function pickVoice() {
  const vs = enVoices(); if (!vs.length) return null;
  if (st.settings.voice) { const v = vs.find(x => x.voiceURI === st.settings.voice); if (v) return v; }
  return vs.find(v => /premium/i.test(v.name)) || vs.find(v => /enhanced/i.test(v.name)) ||
    vs.find(v => /^samantha/i.test(v.name)) || vs.find(v => v.default && !NOVELTY.test(v.name)) ||
    vs.find(v => !NOVELTY.test(v.name)) || vs[0];
}

/* ---------- speech with word highlighting ---------- */
const Speech = {
  token: 0, timers: [], hlEl: null, host: null, endClip: null,
  rate() { return SPEEDS[st.settings.speed] || 0.85; },
  stop() {
    this.token++;
    this.timers.forEach(t => { clearTimeout(t.id); t.resolve && t.resolve(); });
    this.timers = [];
    if (this.endClip) { try { voiceEl.pause(); } catch (e) {} this.endClip(); }
    if (hasSpeech) { try { if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel(); } catch (e) {} }
    this.unhl();
    if (this.host) { this.host.classList.remove('speaking'); this.host = null; }
  },
  later(fn, ms) { const t = { id: setTimeout(() => { this.timers = this.timers.filter(x => x !== t); fn(); }, ms) }; this.timers.push(t); return t; },
  sleep(ms) { return new Promise(resolve => { const t = this.later(resolve, ms); t.resolve = resolve; }); },
  hl(el) { if (this.hlEl === el) return; this.unhl(); if (el) { el.classList.add('hl'); this.hlEl = el; } },
  unhl() { if (this.hlEl) { this.hlEl.classList.remove('hl'); this.hlEl = null; } },
  async play(plan, delay = 0, host = null) {
    this.stop();
    const tok = this.token;
    if (!plan || !plan.length) return;
    await this.sleep(delay);
    if (tok !== this.token) return;
    if (host) { host.classList.add('speaking'); this.host = host; }
    for (const seg of plan) {
      if (tok !== this.token) return;
      if (seg.pause) { if (seg.el) this.hl(seg.el); await this.sleep(seg.pause); this.unhl(); continue; }
      if (seg.clip) await this.clip(seg, tok);
      else await this.say(seg, tok);
    }
    if (tok === this.token && this.host) { this.host.classList.remove('speaking'); this.host = null; }
  },
  // A recorded clip: highlight each word while the audio clock is inside its aligned time span.
  clip(seg, tok) {
    return new Promise(resolve => {
      let ticker = 0, finished = false;
      const done = () => {
        if (finished) return; finished = true;
        clearInterval(ticker);
        voiceEl.onended = voiceEl.onerror = null;
        if (this.endClip === done) this.endClip = null;
        this.unhl(); resolve();
      };
      this.endClip = done;
      getClip(seg.clip).then(url => {
        if (finished || tok !== this.token) return done();
        const r = CLIP_SPEEDS[st.settings.speed] || 1;
        voiceEl.onended = done; voiceEl.onerror = done;
        voiceEl.src = url;
        voiceEl.defaultPlaybackRate = r; voiceEl.playbackRate = r;
        voiceEl.preservesPitch = true; voiceEl.webkitPreservesPitch = true;
        this.later(done, (seg.dur / r + 3) * 1000);          // safety net if 'ended' never comes
        const tick = () => {
          if (finished) return;
          const t = voiceEl.currentTime;
          let w = null;
          for (const x of seg.words) if (x.start <= t + 0.03) w = x;
          if (w && t <= w.end + 0.25) this.hl(w.el); else this.unhl();
        };
        voiceEl.play().then(() => { if (!finished) { tick(); ticker = setInterval(tick, 30); } }).catch(done);
      }).catch(done);
    });
  },
  say(seg, tok) {
    if (!hasSpeech) return Promise.resolve();
    return new Promise(resolve => {
      const words = seg.words || [];
      const rate = this.rate();
      const local = [];
      let boundary = false, finished = false;
      const T = (fn, ms) => { const t = this.later(fn, ms); local.push(t); return t; };
      const done = () => {
        if (finished) return; finished = true;
        local.forEach(t => clearTimeout(t.id));
        this.timers = this.timers.filter(t => !local.includes(t));
        this.unhl(); resolve();
      };
      const fallback = elapsed => {           // no boundary events: highlight on a timer
        let at = 0;
        words.forEach(w => {
          const start = at; at += (w.end - w.start + 1) * 72 / rate;
          T(() => { if (!boundary && !finished) this.hl(w.el); }, Math.max(0, start - elapsed));
        });
      };
      const u = new SpeechSynthesisUtterance(seg.text);
      u.lang = speechLang();
      const v = pickVoice(); if (v) u.voice = v;
      u.rate = rate; u.pitch = 1; u.volume = 1;
      window.__talkCardsUtterance = u;    // keep a reference so Safari does not drop events
      u.onstart = () => {
        if (tok !== this.token) return;
        if (words.length === 1) this.hl(words[0].el);
        T(() => { if (!boundary && !finished) fallback(500); }, 500);
      };
      u.onboundary = e => {
        if (tok !== this.token || finished) return;
        if (e.name && e.name !== 'word') return;
        boundary = true;
        let w = null;
        for (const x of words) if (x.start <= e.charIndex) w = x;
        if (w) this.hl(w.el);
      };
      u.onend = done; u.onerror = done;
      T(done, (seg.text.length * 72 / rate + 2500) * 2);   // safety net if 'end' never comes
      try {
        if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
        speechSynthesis.resume();
        speechSynthesis.speak(u);
      } catch (e) { done(); }
    });
  }
};

// Turn card text into word spans plus a speech plan.
// " / " = alternatives (own line, pause between), "___" = blank (dotted line, pause), "M-A-R-I-A." = spelling.
function renderText(el, text, speak) {
  el.textContent = '';
  const plan = [];
  if (ARABIC.test(text)) { el.classList.add('ar'); el.dir = 'rtl'; el.textContent = text; return null; }
  el.classList.remove('ar'); el.dir = 'ltr';
  text.split(' / ').forEach((lineText, li) => {
    const line = document.createElement('div'); line.className = 'line';
    if (li > 0) plan.push({ pause: 550 });
    const dev = [];      // device-speech plan for this line (used only when there is no recorded clip)
    const els = [];      // every word, letter and blank span, in order (matches the clip's word timings)
    let seg = { text: '', words: [] };
    const flush = () => { if (seg.words.length) dev.push(seg); seg = { text: '', words: [] }; };
    const word = tok => {
      const s = document.createElement('span'); s.className = 'w'; s.textContent = tok; line.append(s); els.push(s);
      const start = seg.text ? seg.text.length + 1 : 0;
      seg.text += (seg.text ? ' ' : '') + tok;
      seg.words.push({ el: s, start, end: start + tok.length });
    };
    lineText.split(/\s+/).filter(Boolean).forEach((tok, ti) => {
      if (ti > 0) line.append(' ');
      const spell = tok.match(/^([A-Z](?:-[A-Z])+)([.,!?]*)$/);
      if (spell) {
        flush();
        const wrap = document.createElement('span'); wrap.className = 'spell';
        spell[1].split('-').forEach((L, i) => {
          if (i) wrap.append('-');
          const s = document.createElement('span'); s.className = 'w'; s.textContent = L; wrap.append(s); els.push(s);
          if (i) dev.push({ pause: 320 });
          dev.push({ text: L, words: [{ el: s, start: 0, end: 1 }] });
        });
        if (spell[2]) wrap.append(spell[2]);
        line.append(wrap);
        return;
      }
      const blank = tok.match(/^(.*?)___(.*)$/);
      if (blank) {
        if (blank[1]) word(blank[1]);
        flush();
        const b = document.createElement('span'); b.className = 'blank'; line.append(b); els.push(b);
        dev.push({ pause: 750, el: b });
        if (blank[2]) line.append(blank[2]);
        return;
      }
      word(tok);
    });
    flush();
    el.append(line);
    const rec = clipFor(lineText);
    if (rec) {
      const timed = rec.w.length === els.length;
      const words = timed ? els.map((e, i) => rec.w[i] && { el: e, start: rec.w[i][0], end: rec.w[i][1] }).filter(Boolean) : [];
      plan.push({ clip: rec.f, dur: rec.d, words });
      const last = els[els.length - 1];
      if (timed && last && last.classList.contains('blank') && !rec.w[els.length - 1]) plan.push({ pause: 750, el: last });
    } else plan.push(...dev);
  });
  while (plan.length && plan[plan.length - 1].pause && !plan[plan.length - 1].el) plan.pop();   // keep a blank's pause
  return speak ? plan : null;
}

/* ---------- sound effects (Web Audio, no files) ---------- */
const SFX = {
  ctx: null, out: null, noise: null, busyUntil: 0,
  init() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        this.ctx = new AC();
        this.out = this.ctx.createGain();
        this.out.connect(this.ctx.destination);
      }
      this.level();
      if (this.ctx.state !== 'running') this.ctx.resume();
      const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource();
      s.buffer = b; s.connect(this.ctx.destination); s.start(0);
    } catch (e) {}
  },
  level() { if (this.out) this.out.gain.value = isMama() ? 0.25 : 0.35; },   // share of the voice's loudness
  ready() {
    if (!st.settings.sfx || !this.ctx) return false;
    if (this.ctx.state !== 'running') { try { this.ctx.resume(); } catch (e) {} }
    return true;
  },
  hold(sec) { this.busyUntil = Math.max(this.busyUntil, performance.now() + sec * 1000); },
  tone(f, at, dur, peak, type = 'sine', attack = 0.012) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + 0.02 + at;
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out);
    o.start(t); o.stop(t + dur + 0.05);
  },
  bell(f, at, dur, peak) { this.tone(f, at, dur, peak, 'sine'); this.tone(f, at, dur * 0.8, peak * 0.2, 'triangle'); },
  flip() {
    if (!this.ready()) return;
    const c = this.ctx;
    if (!this.noise) {
      const len = Math.floor(c.sampleRate * 0.2), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = b;
    }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + 0.01;
    s.buffer = this.noise;
    f.type = 'bandpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(3200, t + 0.15);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    s.connect(f); f.connect(g); g.connect(this.out);
    s.start(t); s.stop(t + 0.18);
    this.hold(0.18);
  },
  good() { if (!this.ready()) return; this.bell(1318.5, 0, 0.32, 0.5); this.bell(1760, 0.1, 0.65, 0.5); this.hold(0.8); },
  again() { if (!this.ready()) return; this.tone(440, 0, 0.24, 0.3); this.tone(329.6, 0.15, 0.34, 0.3); this.hold(0.52); },
  star(at = 0) { if (!this.ready()) return; this.tone(2093, at, 0.09, 0.3, 'sine', 0.006); this.tone(4186, at, 0.06, 0.05, 'sine', 0.004); this.hold(at + 0.13); },
  unlock() { if (!this.ready()) return; [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.bell(f, i * 0.12, i === 3 ? 0.9 : 0.4, 0.42)); this.hold(1.3); }
};
// Speech always waits for sound effects to finish, plus about 250 ms.
function speechDelay(min = 0) { return Math.max(min, Math.max(0, SFX.busyUntil - performance.now()) + 250); }

/* ---------- screens ---------- */
const SCREENS = ['home', 'session', 'done', 'parent', 'picker'];
function show(name) { SCREENS.forEach(s => { $('#' + s).hidden = s !== name; }); }
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2600);
}

/* ---------- home ---------- */
function renderHome() {
  document.body.dataset.profile = prof;
  $('#profileChip').textContent = isMama() ? 'Mama' : 'Maria';
  $('#brand').textContent = isMama() ? PDECK.name : "Maria's Talk Cards";
  if (isMama()) {
    const left = Math.max(0, st.settings.newPerDay - introducedToday());
    $('#mDue').textContent = dueIds().length;
    $('#mNew').textContent = Math.min(left, newOrder().length);
    const w = weekStats();
    $('#mWeek').textContent = w.reviews ? `Last 7 days: ${w.reviews} reviews · ${Math.round(w.good / w.reviews * 100)}% right first time`
      : 'Last 7 days: no reviews yet';
    return show('home');
  }
  $('#todayStars').textContent = starsToday();
  const { bank } = st.stars, { target, prize } = st.settings;
  $('#prizeFill').style.width = Math.min(100, bank / target * 100) + '%';
  $('#prizeCount').textContent = `${bank} / ${target}`;
  $('#prizeName').textContent = prize;
  const box = $('#badges'); box.textContent = '';
  SETS.forEach(s => {
    const done = st.passed.includes(s.id), open = s.id <= st.open;
    const canPractice = open && setPracticeIds(s.id).length > 0;     // tap a set she has done to practise it
    const b = document.createElement(canPractice ? 'button' : 'div');
    if (canPractice) b.dataset.set = s.id;
    b.className = 'badge ' + (done ? 'done' : open ? 'current' : 'locked');
    b.setAttribute('aria-label', `Set ${s.id}: ${s.title}${done ? ', done' : open ? '' : ', locked'}${canPractice ? ', tap to practise' : ''}`);
    if (!done && !open) b.innerHTML = '<svg aria-hidden="true"><use href="#i-lock"/></svg>';
    else b.textContent = s.id;
    box.append(b);
  });
  const cur = SET[st.open];
  $('#currentSet').textContent = cur ? `Set ${cur.id} · ${cur.title}` : '';
  show('home');
}

/* ---------- profiles ---------- */
function showPicker() { Speech.stop(); S = null; document.body.dataset.profile = lsGet(LAST_KEY) || 'maria'; show('picker'); }
function openProfile(p) {
  Speech.stop(); S = null;
  if (p !== prof) { load(p); unlockVoice.done = false; }
  lsSet(LAST_KEY, p);
  SFX.level();
  renderHome();
}

/* ---------- session ---------- */
let S = null;    // current session or practice round
function newSession(mode, ids) {
  S = { mode, queue: ids.slice(), all: new Set(ids), good: new Set(), again: new Set(), hint: new Set(), rated: new Set(),
        cur: null, flipped: false, seenBack: false, flipping: false, busy: false, celeb: [], frontPlan: null, backPlan: null,
        shownAt: 0, flipMs: null };
  $('#session').classList.toggle('practice', mode !== 'normal' || isMama());
  $('#starNum').textContent = starsToday();
  show('session');
  progress();
  nextCard();
}
function startNormal() {
  SFX.init(); primeSpeech(); unlockVoice();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  const begin = () => {
    const ids = buildQueue();
    if (!ids.length) return showDone();
    newSession('normal', ids);
  };
  const celeb = isMama() ? [] : sweepPasses();
  const next = () => { if (!celeb.length) return begin(); showCelebration(celeb.shift(), next); };
  next();
}
function primeSpeech() {           // iOS needs speech started from a tap once
  if (!hasSpeech || primeSpeech.done) return;
  primeSpeech.done = true;
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; u.lang = 'en-US'; speechSynthesis.speak(u); } catch (e) {}
}
function progress() {
  const p = S.all.size ? S.good.size / S.all.size : 0;
  $('#progFill').style.width = (p * 100) + '%';
}
function nextCard() {
  Speech.stop();
  if (!S) return;                      // the session was closed meanwhile
  if (!S.queue.length) return endSession();
  S.cur = S.queue.shift();
  S.flipped = false; S.seenBack = false; S.flipping = false; S.busy = false;
  if (CARD[S.cur].kind === 'gap') renderGapCard(CARD[S.cur]); else renderCard(CARD[S.cur]);
  S.shownAt = performance.now(); S.flipMs = null;
}
function endSession() {
  Speech.stop();
  const fromHome = S && S.mode === 'set';
  S = null;
  if (fromHome) renderHome(); else showDone();
}

function iconBtn(cls, icon, label) {
  const b = document.createElement('button');
  b.className = cls; b.setAttribute('aria-label', label);
  b.innerHTML = `<svg aria-hidden="true"><use href="#${icon}"/></svg>`;
  return b;
}
function renderCard(c) {
  const card = $('#card'), front = $('#front'), back = $('#back');
  card.classList.add('no-anim'); card.classList.remove('flipped');
  void card.offsetWidth; card.classList.remove('no-anim');
  front.textContent = ''; back.textContent = '';

  // front
  const label = document.createElement('div');
  label.className = 'label' + (c.kind === 'ask' ? ' ask' : '');
  label.textContent = c.kind === 'ask' ? 'Your turn to ask!' : 'Answer!';
  const fArea = document.createElement('div'); fArea.className = 'text-area';
  const fTxt = document.createElement('div'); fTxt.className = 'txt'; fArea.append(fTxt);
  const frontText = c.kind === 'ask' ? c.cue : c.q;
  const speakFront = c.kind === 'ans' || (c.stage === 3 && !ARABIC.test(c.cue));
  S.frontPlan = renderText(fTxt, frontText, speakFront);
  const fFoot = document.createElement('div'); fFoot.className = 'foot';
  if (S.frontPlan) {
    const sp = iconBtn('round speak', 'i-speaker', 'Listen again');
    sp.addEventListener('click', e => { e.stopPropagation(); Speech.play(S.frontPlan, 0, fTxt); });
    fFoot.append(sp);
  } else fFoot.append(Object.assign(document.createElement('span'), { className: 'spacer' }));
  if (c.kind === 'ans' && c.hint) {
    const hb = document.createElement('button');
    hb.className = 'hint-btn'; hb.lang = 'ar'; hb.dir = 'rtl'; hb.textContent = 'مساعدة';
    hb.addEventListener('click', e => {
      e.stopPropagation();
      const h = document.createElement('div'); h.className = 'hint'; h.lang = 'ar'; h.dir = 'rtl'; h.textContent = c.hint;
      fArea.append(h); hb.classList.add('used');
      if (S.mode === 'normal') {
        S.hint.add(c.id);
        const r = rec(c.id); r.hints = (r.hints || 0) + 1; r.hintDay = today(); save();
      }
      fit(front);
    });
    fFoot.append(hb);
  }
  const turn = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  turn.setAttribute('class', 'turn-icon'); turn.setAttribute('aria-hidden', 'true');
  turn.innerHTML = '<use href="#i-turn"/>';
  fFoot.append(turn);
  front.append(label, fArea, fFoot);

  // back
  const bArea = document.createElement('div'); bArea.className = 'text-area';
  const bTxt = document.createElement('div'); bTxt.className = 'txt'; bArea.append(bTxt);
  S.backPlan = renderText(bTxt, c.kind === 'ask' ? c.q : c.a, true);
  const bFoot = document.createElement('div'); bFoot.className = 'foot';
  const sp2 = iconBtn('round speak', 'i-speaker', 'Listen again');
  sp2.addEventListener('click', e => { e.stopPropagation(); Speech.play(S.backPlan, 0, bTxt); });
  bFoot.append(sp2, Object.assign(document.createElement('span'), { className: 'spacer' }));
  back.append(bArea, bFoot);

  if (DEV) {
    const r = peek(c.id), d = document.createElement('div');
    d.className = 'dev-info'; d.textContent = `${c.id} · box ${r.box} · due ${r.due || '-'}`;
    front.append(d);
  }

  [...(S.frontPlan || []), ...(S.backPlan || [])].forEach(seg => { if (seg.clip) getClip(seg.clip).catch(() => {}); });
  fit(front); fit(back);
  setActions('front');
  const wrap = $('#cardWrap');
  wrap.classList.remove('enter'); void wrap.offsetWidth; wrap.classList.add('enter');
  if (S.frontPlan) Speech.play(S.frontPlan, speechDelay(), fTxt);
}

const div = cls => Object.assign(document.createElement('div'), { className: cls });
function turnIcon() {
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  t.setAttribute('class', 'turn-icon'); t.setAttribute('aria-hidden', 'true'); t.innerHTML = '<use href="#i-turn"/>';
  return t;
}
// The rule may contain <b> and <i> only; any other markup is dropped and its text kept.
function safeRule(html) {
  const tpl = document.createElement('template'); tpl.innerHTML = html;
  const out = div('rule');
  const walk = (from, to) => from.childNodes.forEach(n => {
    if (n.nodeType === 3) to.append(n.textContent);
    else if (n.nodeType === 1) {
      const tag = n.tagName.toLowerCase();
      if (tag === 'b' || tag === 'i') { const e = document.createElement(tag); walk(n, e); to.append(e); }
      else if (tag !== 'script' && tag !== 'style') walk(n, to);
    }
  });
  walk(tpl.content, out);
  return out;
}
// Mama's sentence: an empty slot on the front; on the back the answer fills it, or for Ø the gap closes
// and a small "no preposition" marker sits where it was. Returns the word spans in speaking order.
function sentenceInto(el, c, filled) {
  el.textContent = ''; el.className = 'txt sent'; el.dir = 'ltr';
  const els = [];
  const word = (t, into) => { const w = document.createElement('span'); w.className = 'w'; w.textContent = t; into.append(w); els.push(w); };
  const words = t => t.split(/(\s+)/).forEach(part => { if (!part) return; if (/^\s+$/.test(part)) el.append(' '); else word(part, el); });
  words(c.before);
  if (!filled) el.append(Object.assign(document.createElement('span'), { className: 'slot empty' }));
  else if (c.zero) el.append(Object.assign(document.createElement('span'), { className: 'zero', textContent: 'no preposition' }));
  else {
    const slot = Object.assign(document.createElement('span'), { className: 'slot' });
    c.answer.split(/\s+/).forEach((t, i) => { if (i) slot.append(' '); word(t, slot); });
    el.append(slot);
  }
  words(c.after);
  return els;
}
function renderGapCard(c) {
  const card = $('#card'), front = $('#front'), back = $('#back');
  card.classList.add('no-anim'); card.classList.remove('flipped');
  void card.offsetWidth; card.classList.remove('no-anim');
  front.textContent = ''; back.textContent = '';

  const label = div('label'); label.textContent = 'Say the whole sentence';
  const fArea = div('text-area'), fTxt = div('txt'); fArea.append(fTxt);
  sentenceInto(fTxt, c, false);
  const fFoot = div('foot'); fFoot.append(div('spacer'), turnIcon());
  front.append(label, fArea, fFoot);

  const bArea = div('text-area'), bTxt = div('txt'); bArea.append(bTxt);
  const els = sentenceInto(bTxt, c, true);
  bArea.append(safeRule(c.rule));
  const rec = clipFor(c.spoken);
  if (rec && rec.w.length === els.length) S.backPlan = [{ clip: rec.f, dur: rec.d, words: els.map((e, i) => ({ el: e, start: rec.w[i][0], end: rec.w[i][1] })) }];
  else if (rec) S.backPlan = [{ clip: rec.f, dur: rec.d, words: [] }];
  else {
    let at = 0;
    S.backPlan = [{ text: c.spoken, words: els.map(e => { const w = { el: e, start: at, end: at + e.textContent.length }; at = w.end + 1; return w; }) }];
  }
  S.frontPlan = null;
  const bFoot = div('foot');
  const sp = iconBtn('round speak', 'i-speaker', 'Listen again');
  sp.addEventListener('click', e => { e.stopPropagation(); Speech.play(S.backPlan, 0, bTxt); });
  bFoot.append(sp, div('spacer'));
  back.append(bArea, bFoot);

  if (DEV) {
    const r = peek(c.id), d = div('dev-info');
    d.textContent = `${c.id} · box ${r.box} · due ${r.due || '-'}`;
    front.append(d);
  }
  S.backPlan.forEach(seg => { if (seg.clip) getClip(seg.clip).catch(() => {}); });
  fit(front); fit(back);
  setActions('front');
  const wrap = $('#cardWrap');
  wrap.classList.remove('enter'); void wrap.offsetWidth; wrap.classList.add('enter');
}

// Biggest text size that fits the card: Maria 56 down to 32 px, Mama's sentences 44 down to 24 px.
function fit(face) {
  const area = face.querySelector('.text-area'), txt = face.querySelector('.txt');
  if (!area || !txt) return;
  area.classList.remove('scroll');
  const wide = area.clientWidth >= 520;
  let size = isMama() ? (wide ? 44 : 34) : (wide ? 56 : 44);
  const min = isMama() ? 24 : 32;
  txt.style.fontSize = size + 'px';
  const over = () => area.scrollHeight > area.clientHeight + 1 || area.scrollWidth > area.clientWidth + 1;
  while (over() && size > min) { size -= 2; txt.style.fontSize = size + 'px'; }
  if (over()) area.classList.add('scroll');
}
function setActions(side) {
  $('#flipBtn').hidden = side !== 'front';
  $('#rateRow').hidden = side !== 'back';
}

function flip() {
  if (!S || S.busy || S.flipping) return;
  S.flipping = true;
  Speech.stop();
  SFX.flip();
  const toBack = !S.flipped; S.flipped = toBack;
  if (toBack && S.flipMs == null) S.flipMs = Math.round(performance.now() - S.shownAt);
  $('#card').classList.toggle('flipped', toBack);
  const dur = reduced() ? 220 : 600;
  if (!reduced()) liftAnim();
  setActions('none');
  setTimeout(() => { if (!S) return; S.flipping = false; setActions(toBack ? 'back' : 'front'); }, dur + 20);
  if (toBack && !S.seenBack) { S.seenBack = true; Speech.play(S.backPlan, speechDelay(dur + 40), $('#back .txt')); }
}
function liftAnim() {
  const ease = { duration: 600, easing: 'ease-in-out' };
  try {
    $('#cardLift').animate([{ transform: 'none' }, { transform: 'translateY(-14px) scale(1.035)' }, { transform: 'none' }], ease);
    $('#cardShadow').animate([
      { transform: 'translate(0, 16px) scale(1)', opacity: 1, filter: 'blur(14px)' },
      { transform: 'translate(24px, 40px) scale(.62, .94)', opacity: .55, filter: 'blur(24px)' },
      { transform: 'translate(0, 16px) scale(1)', opacity: 1, filter: 'blur(14px)' }
    ], ease);
  } catch (e) {}
}

function rate(good) {
  if (!S || S.busy || S.flipping || !S.flipped) return;
  S.busy = true;
  Speech.stop();
  const id = S.cur;
  if (S.mode === 'normal') logReview(id, good);
  S.rated.add(id);
  if (good) {
    SFX.good();
    if (S.mode === 'normal') { applyGood(id); if (!isMama()) flyStar(); }
    else if (S.mode === 'tricky' && !isMama()) { sparkle(); SFX.star(0.3); }
    S.good.add(id);
  } else {
    SFX.again();
    if (S.mode === 'normal') applyAgain(id);
    S.again.add(id);
    S.queue.splice(Math.min(3, S.queue.length), 0, id);   // back after 3 other cards
  }
  progress();
  const celebrate = S.celeb.length > 0;
  setTimeout(() => {
    if (!S) return;
    if (celebrate) runCelebrations(nextCard); else nextCard();
  }, celebrate ? STAR_FLIGHT + 260 : 380);
}

function flyStar() {
  const from = $('#goodBtn .star').getBoundingClientRect(), to = $('#starCount .star').getBoundingClientRect();
  const done = () => { $('#starNum').textContent = starsToday(); const sc = $('#starCount'); sc.classList.remove('bump'); void sc.offsetWidth; sc.classList.add('bump'); };
  SFX.star(STAR_FLIGHT / 1000);
  if (reduced()) { setTimeout(done, STAR_FLIGHT); return; }
  const x0 = from.left + from.width / 2, y0 = from.top + from.height / 2;
  const x1 = to.left + to.width / 2, y1 = to.top + to.height / 2;
  const s = document.createElement('div'); s.className = 'fly-star';
  s.innerHTML = '<svg class="star" viewBox="0 0 24 24"><use href="#i-star"/></svg>';
  document.body.append(s);
  const a = s.animate([
    { transform: `translate(${x0}px, ${y0}px) scale(1)` },
    { transform: `translate(${(x0 + x1) / 2 - 40}px, ${Math.min(y0, y1) + (y0 - y1) * 0.25}px) scale(1.5)`, offset: 0.45 },
    { transform: `translate(${x1}px, ${y1}px) scale(.7)` }
  ], { duration: STAR_FLIGHT, easing: 'ease-in' });
  a.onfinish = () => { s.remove(); done(); };
}
function sparkle() {
  if (reduced()) return;
  const r = $('#goodBtn').getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  for (let i = 0; i < 8; i++) {
    const s = document.createElement('div'); s.className = 'spark';
    s.innerHTML = '<svg class="star" viewBox="0 0 24 24"><use href="#i-star"/></svg>';
    document.body.append(s);
    const ang = i / 8 * Math.PI * 2, d = 70 + (i % 2) * 24;
    s.animate([
      { transform: `translate(${x}px, ${y}px) scale(.4)`, opacity: 1 },
      { transform: `translate(${x + Math.cos(ang) * d}px, ${y + Math.sin(ang) * d}px) scale(1)`, opacity: 0 }
    ], { duration: 520, easing: 'ease-out' }).onfinish = () => s.remove();
  }
}

/* ---------- celebrations ---------- */
function runCelebrations(then) {
  if (!S || !S.celeb.length) return then();
  const c = S.celeb.shift();
  showCelebration(c, () => runCelebrations(then));
}
function showCelebration(c, then) {
  Speech.stop();
  const ov = $('#celebrate'), badge = $('#celBadge'), btn = $('#celBtn');
  badge.className = 'cel-badge';
  if (c.type === 'unlock') {
    badge.textContent = c.set;
    $('#celKicker').textContent = 'New set!';
    $('#celTitle').textContent = SET[c.set].title;
    btn.textContent = "Let's go!";
  } else if (c.type === 'final') {
    badge.innerHTML = '<svg class="star" viewBox="0 0 24 24"><use href="#i-star"/></svg>';
    $('#celKicker').textContent = `All ${SETS.length} sets!`;
    $('#celTitle').textContent = 'You did it!';
    btn.textContent = 'Yay!';
  } else {
    badge.classList.add('gift');
    badge.innerHTML = '<svg viewBox="0 0 24 24"><use href="#i-gift"/></svg>';
    $('#celKicker').textContent = `${c.target} stars!`;
    $('#celTitle').textContent = c.name;
    btn.textContent = 'Yay!';
  }
  ov.hidden = false;
  badge.style.animation = 'none'; void badge.offsetWidth; badge.style.animation = '';
  if (c.type === 'prize') { SFX.good(); SFX.star(0.75); }
  else { SFX.unlock(); confetti(); }
  btn.disabled = true;
  setTimeout(() => { btn.disabled = false; }, 900);
  btn.onclick = () => { ov.hidden = true; stopConfetti(); then(); };
}
let confettiRun = 0;
function stopConfetti() { confettiRun++; const cv = $('#confetti'); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); }
function confetti() {
  if (reduced()) return;
  const run = ++confettiRun;
  const cv = $('#confetti'), ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = innerWidth, H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cols = ['#FFD84D', '#8FE3BF', '#FF6FA8', '#DCD6F7', '#2B2340'];
  const P = Array.from({ length: 150 }, (_, i) => {
    const left = i % 2 === 0;
    return { x: left ? W * 0.1 : W * 0.9, y: H * 0.85, vx: (left ? 1 : -1) * (3 + Math.random() * 9), vy: -(12 + Math.random() * 12),
             r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35, w: 9 + Math.random() * 8, h: 5 + Math.random() * 6,
             c: cols[i % cols.length], round: Math.random() < 0.3 };
  });
  const t0 = performance.now();
  const frame = now => {
    if (run !== confettiRun) return;
    const t = now - t0;
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = t > 2600 ? Math.max(0, 1 - (t - 2600) / 700) : 1;
    P.forEach(p => {
      p.vy += 0.38; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.h * 0.7, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 1.7)) + 1);
      ctx.restore();
    });
    if (t < 3300) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
  };
  requestAnimationFrame(frame);
}

/* ---------- done + practice rounds ---------- */
function showDone() {
  $('#doneStars').textContent = starsToday();
  const pb = $('#practiceBtn');
  if (trickyIds().length) { pb.textContent = 'Tricky ones'; pb.dataset.kind = 'tricky'; pb.hidden = false; }
  else if (funIds().length) { pb.textContent = 'Play again (just for fun)'; pb.dataset.kind = 'fun'; pb.hidden = false; }
  else pb.hidden = true;
  show('done');
}
// Practising one set from Home: every card of it she has already learned (answer cards, and ask cards once
// the set is passed). Like the other practice rounds it never changes the schedule and gives no stars.
function setPracticeIds(setId) {
  const set = SET[setId];
  return [...set.ans, ...(st.passed.includes(setId) ? set.ask : [])].filter(id => peek(id).box >= 1);
}
function startSetPractice(setId) {
  SFX.init(); primeSpeech(); unlockVoice();
  const ids = setPracticeIds(setId);
  if (ids.length) newSession('set', ids);
}
function startPractice() {
  SFX.init(); primeSpeech(); unlockVoice();
  const kind = $('#practiceBtn').dataset.kind;
  const ids = kind === 'tricky' ? trickyIds() : funIds();
  if (ids.length) newSession(kind, ids);
}

/* ---------- parent area ---------- */
function holdToOpen(el, ms, fn) {
  let timer = null;
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } el.classList.remove('holding'); };
  el.addEventListener('pointerdown', e => {
    e.preventDefault(); cancel();
    el.classList.add('holding');
    timer = setTimeout(() => { timer = null; el.classList.remove('holding'); fn(); }, ms);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, cancel));
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('click', e => e.preventDefault());
}
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
function stepper(key, val) {
  return `<div class="step"><button class="p-btn" data-step="${key}" data-d="-1" aria-label="Less">−</button><output>${val}</output><button class="p-btn" data-step="${key}" data-d="1" aria-label="More">+</button></div>`;
}
const STEPS = { newPerDay: [1, 20, 1], perSession: [4, 30, 1], target: [5, 500, 5] };
const MAMA_STEPS = { newPerDay: [1, 40, 1], perSession: [5, 100, 5] };
function voiceNote() {
  const d = deckVoice();
  const n = d ? Object.keys(d.clips).length : 0;
  if (!n) return 'Device voice (no recordings yet)';
  return d.placeholder ? `Placeholder recordings (${n} lines): record the real voice before using`
    : `${esc(d.voice)}, recorded with Gemini (${n} lines; any others use the device voice)`;
}
const commonRows = s => `
    <div class="p-group">
      <div class="p-row"><span>Voice<span class="sub">${voiceNote()}</span></span></div>
      <div class="p-row"><span>Speed</span>
        <div class="seg">${Object.keys(SPEEDS).map(k => `<button data-speed="${k}" aria-pressed="${s.speed === k}">${k}</button>`).join('')}</div></div>
      <div class="p-row"><span></span><button class="p-btn" data-act="test">Test voice</button></div>
    </div>
    <div class="p-group">
      <div class="p-row"><span>Sound effects</span><button class="switch" role="switch" aria-checked="${s.sfx}" data-act="sfx" aria-label="Sound effects"></button></div>
    </div>`;
const backupRows = () => `
    <div class="p-group">
      <div class="p-row"><span>Both profiles<span class="sub">Maria and Mama in one file</span></span></div>
      <div class="p-row"><div class="btns">
        <button class="p-btn" data-act="backup">Back up progress</button>
        <button class="p-btn" data-act="restore">Restore from a backup file</button>
      </div></div>
    </div>
    <div class="p-group">
      <div class="p-row"><button class="p-btn danger" data-act="reset">Reset ${isMama() ? "Mama's" : "Maria's"} profile</button></div>
    </div>
    <input id="pFile" type="file" accept=".json,application/json" hidden>`;
function renderMamaSettings() {
  const s = st.settings, t = today();
  const learned = Object.values(st.cards).filter(c => c.box >= 1).length;
  $('#parent').innerHTML = `<div class="p-wrap">
    <div class="p-head"><h1>Settings</h1><button class="p-btn primary" data-act="close">Done</button></div>
    <p class="p-sum">${learned} of ${PCARDS.length} cards learned · ${dueIds().length} due today${DEV ? ` · dev date ${t}` : ''}</p>
    <div class="p-group">
      <div class="p-row"><span>New cards per day</span>${stepper('newPerDay', s.newPerDay)}</div>
      <div class="p-row"><span>Cards per session</span>${stepper('perSession', s.perSession)}</div>
    </div>
    ${commonRows(s)}
    ${backupRows()}
  </div>`;
}
function renderParent() {
  if (isMama()) return renderMamaSettings();
  const s = st.settings, t = today();
  const learned = Object.values(st.cards).filter(c => c.box >= 1).length;
  const due = dueIds().length;
  const cur = SET[st.open];
  const p = $('#parent');
  p.innerHTML = `<div class="p-wrap">
    <div class="p-head"><h1>Parent area</h1><button class="p-btn primary" data-act="close">Done</button></div>
    <p class="p-sum">${learned} cards learned · ${due} due today · ${st.prizes.length} prize${st.prizes.length === 1 ? '' : 's'} won${DEV ? ` · dev date ${t}` : ''}</p>

    <div class="p-group">
      <div class="p-row"><span>New cards per day</span>${stepper('newPerDay', s.newPerDay)}</div>
      <div class="p-row"><span>Cards per session</span>${stepper('perSession', s.perSession)}</div>
    </div>

    <div class="p-group">
      <div class="p-row"><span>Star target</span>${stepper('target', s.target)}</div>
      <div class="p-row"><label for="pPrize">Prize</label><input id="pPrize" class="p-input" type="text" maxlength="60" value="${esc(s.prize)}"></div>
    </div>

    ${commonRows(s)}

    <div class="p-group">
      <div class="p-row"><span>Sets open: 1–${st.open}<span class="sub">Newest: ${esc(cur ? cur.title : '')}</span></span></div>
      <div class="p-row"><div class="btns">
        <button class="p-btn" data-act="open-next"${st.open >= lastSetId() ? ' disabled' : ''}>Open the next set now</button>
        <button class="p-btn" data-act="close-newest"${st.open <= SETS[0].id ? ' disabled' : ''}>Close the newest set</button>
      </div></div>
    </div>

    ${backupRows()}
  </div>`;
}
function openParent() { Speech.stop(); renderParent(); show('parent'); $('#parent').scrollTop = 0; }
function onParentClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  const s = st.settings;
  if (b.dataset.step) {
    const k = b.dataset.step, [lo, hi, inc] = (isMama() ? MAMA_STEPS : STEPS)[k];
    s[k] = Math.min(hi, Math.max(lo, s[k] + inc * Number(b.dataset.d)));
    save(); b.parentElement.querySelector('output').textContent = s[k];
    return;
  }
  if (b.dataset.speed) {
    s.speed = b.dataset.speed; save();
    b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    return;
  }
  switch (b.dataset.act) {
    case 'close': renderHome(); break;
    case 'test': {
      const el = document.createElement('div');
      SFX.init(); primeSpeech(); unlockVoice();
      Speech.play(renderText(el, isMama() ? CARD[PCARDS[0]].spoken : "Hello! / What's your name?", true));
      break;
    }
    case 'sfx':
      s.sfx = !s.sfx; save(); b.setAttribute('aria-checked', String(s.sfx));
      if (s.sfx) { SFX.init(); SFX.good(); }
      break;
    case 'open-next':
      if (st.open < lastSetId()) { st.open++; save(); renderParent(); toast(`Set ${st.open} is open.`); }
      break;
    case 'close-newest':
      if (st.open > SETS[0].id && confirm(`Close set ${st.open} (${SET[st.open].title})? Its progress is kept.`)) {
        st.passed = st.passed.filter(id => id !== st.open);
        st.open--; save(); renderParent(); toast(`Set ${st.open + 1} is closed.`);
      }
      break;
    case 'backup': backup(); break;
    case 'restore': $('#pFile').click(); break;
    case 'reset':
    {
      const who = isMama() ? "Mama's" : "Maria's";
      if (confirm(`Reset ${who} profile? All of ${who} progress will be deleted. The other profile is not touched.`) &&
          confirm('Are you sure? This cannot be undone.')) {
        st = defaults(); save(); renderParent(); toast(`${who} profile has been reset.`);
      }
    }
      break;
  }
}
function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function backup() {
  save();
  const profiles = {};
  Object.keys(PROFILE_KEY).forEach(p => { profiles[p] = p === prof ? st : readProfile(p); });
  const data = JSON.stringify({ app: 'maria-talk-cards', v: 2, saved: new Date().toISOString(), profiles });
  const name = `talk-cards-backup-${today()}.json`;
  let file = null;
  try { file = new File([data], name, { type: 'application/json' }); } catch (e) {}
  if (file && isIOS() && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file] }).catch(() => {});
    return;
  }
  const url = URL.createObjectURL(file || new Blob([data], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Backup saved.');
}
async function restore(file) {
  try {
    const obj = JSON.parse(await file.text());
    if (!obj || obj.app !== 'maria-talk-cards') throw new Error('bad');
    const profiles = obj.profiles || (obj.state ? { maria: obj.state } : null);   // v1 files held Maria only
    const ok = profiles && Object.keys(profiles).filter(p => PROFILE_KEY[p] && profiles[p] && typeof profiles[p].cards === 'object');
    if (!ok || !ok.length) throw new Error('bad');
    if (!confirm(`Replace the progress on this device with this backup (${ok.map(p => p === 'mama' ? 'Mama' : 'Maria').join(' and ')})?`)) return;
    ok.forEach(p => lsSet(PROFILE_KEY[p], JSON.stringify(merge(profiles[p], p))));
    load(prof); renderParent(); toast('Progress restored.');
  } catch (e) { toast('That file is not a Talk Cards backup.'); }
}

/* ---------- developer mode (?dev=1) ---------- */
function renderDev() {
  const bar = $('#devbar');
  bar.hidden = false;
  bar.innerHTML = `<span>dev · ${today()} (+${devOffset}d)</span><button data-dev="plus">+1 day</button><button data-dev="zero">real date</button>`;
}
function onDevClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  devOffset = b.dataset.dev === 'plus' ? devOffset + 1 : 0;
  lsSet(DEV_KEY, String(devOffset));
  Speech.stop(); S = null;
  $('#celebrate').hidden = true;
  renderDev();
  if ($('#picker').hidden) renderHome();
}

/* ---------- wiring ---------- */
function wire() {
  $('#startBtn').addEventListener('click', startNormal);
  $('#card').addEventListener('click', e => { if (!e.target.closest('button')) flip(); });
  $('#flipBtn').addEventListener('click', flip);
  $('#againBtn').addEventListener('click', () => rate(false));
  $('#goodBtn').addEventListener('click', () => rate(true));
  $('#quitBtn').addEventListener('click', () => { Speech.stop(); S = null; renderHome(); });
  $('#practiceBtn').addEventListener('click', startPractice);
  $('#homeBtn').addEventListener('click', renderHome);
  $('#profileChip').addEventListener('click', showPicker);
  $('#badges').addEventListener('click', e => { const b = e.target.closest('[data-set]'); if (b) startSetPractice(Number(b.dataset.set)); });
  $('#picker').addEventListener('click', e => { const t = e.target.closest('[data-profile]'); if (t) openProfile(t.dataset.profile); });
  holdToOpen($('#gear'), 2000, openParent);
  $('#parent').addEventListener('click', onParentClick);
  $('#parent').addEventListener('change', e => {
    if (e.target.id === 'pFile' && e.target.files[0]) { restore(e.target.files[0]); e.target.value = ''; }
  });
  $('#parent').addEventListener('input', e => {
    if (e.target.id === 'pPrize') { st.settings.prize = e.target.value.trim() || 'a prize'; save(); }
  });
  $('#devbar').addEventListener('click', onDevClick);
  document.addEventListener('pointerdown', () => { if (SFX.ctx && SFX.ctx.state !== 'running') { try { SFX.ctx.resume(); } catch (e) {} } }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) Speech.stop(); });
  window.addEventListener('pagehide', () => Speech.stop());
  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (S) { fit($('#front')); fit($('#back')); } }, 120); });
  if (hasSpeech) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => {};
  }
}

async function boot() {
  wire();
  try {
    const res = await fetch('sets.json');
    buildCatalog(await res.json());
  } catch (e) {
    document.body.innerHTML = '<p style="font:24px var(--en);padding:40px;text-align:center">The cards could not load. Please connect to the internet once and try again.</p>';
    return;
  }
  try { buildPrepCatalog(await (await fetch('prepositions.json')).json()); } catch (e) { /* Mama's deck missing: her profile shows no cards */ }
  try {
    const r = await fetch('audio/voice.json');
    if (r.ok) VOICE = await r.json();
  } catch (e) { VOICE = null; }
  if (VOICE) fetch('audio/_unlock.m4a').then(r => r.blob()).then(b => { unlockUrl = URL.createObjectURL(b); }).catch(() => {});
  migrateOldVersion();
  const last = lsGet(LAST_KEY);
  load(PROFILE_KEY[last] ? last : 'maria');
  if (DEV) {
    renderDev();
    window.TC = { get st() { return st; }, get S() { return S; }, CARD, SET, SETS, today, buildQueue, newOrder, dueIds, eligible, trickyIds, funIds, flip, rate, save, Speech, SFX, setPracticeIds, get VOICE() { return VOICE; }, renderText, voiceEl, get prof() { return prof; }, openProfile, showPicker, PCARDS, weekStats, readProfile,
      showCard(id) { if (!S) newSession('fun', [id]); else { S.queue = S.queue.filter(x => x !== id); S.cur = id; S.flipped = S.seenBack = S.flipping = S.busy = false; if (CARD[id].kind === 'gap') renderGapCard(CARD[id]); else renderCard(CARD[id]); } } };
  }
  if (PROFILE_KEY[last]) renderHome(); else showPicker();   // first launch: choose a profile
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
boot();
})();
