/* كرّاس الإملاء: the card scheduler, ported from the times tables (maths.js). No DOM: scripts/test_dictation.js runs it in Node.
   KDEngine.create(DATA) takes the built cards.json and returns the scheduler for it.

   Leitner boxes: box 0 = not learned yet; boxes 1-6 come back after 1, 2, 4, 7, 14 and 30 days; a card moves up at most once a day.
   New cards come in sets of about 4, in the fixed order of cards.json, only when the last set is mostly learned
   (every card in box 1 or above, all but one in box 2 or above), at most `newSets` new sets a day.
   A new card is first a SHOW step, then a LEARN step, then it enters the boxes.
   Right first time = Good (up one box). Wrong (or right only after help) = Again: box 1, tomorrow, and once more later in the session.
   No speed and no Easy: spelling is about care.
   Units: one per skill, except skill 8 (one per sound-alike pair, then one for the mixed text). A unit's stage starts when the
   stage before it is mostly learned; the next unit starts when the last stage of this one is mostly learned. Mama can unlock or
   relock a unit by hand (manual[unit] = true / false); a relocked unit's cards are kept but not shown. */
(function (root) {
'use strict';

const INTERVAL = [0, 1, 2, 4, 7, 14, 30];
const TOP_BOX = 6;
const KNOWN_BOX = 2;
const MIN_SESSION = 5;    // short sessions are topped up with learned cards ("تذكّري")
const MAX_VIEWS = 3;      // a card is shown at most three times in one session
const MAX_HARD_NEW = 2;   // new كلماتي الصعبة cards in one session, at most
const DEFAULT_SETTINGS = { perSession: 8, newSets: 2, tashkeel: {} };
const pad2 = n => String(n).padStart(2, '0');
function addDays(ds, n) {
  const [y, mo, d] = ds.split('-').map(Number); const x = new Date(y, mo - 1, d); x.setDate(x.getDate() + n);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
}
const isDay = x => typeof x === 'string' && /^\d{4}-\d\d-\d\d$/.test(x);

function create(DATA, idOf) {
  const SET = {}, UNIT = {}, CARD = DATA.cards;
  DATA.sets.forEach((s, i) => { SET[s.id] = { ...s, order: i }; });
  DATA.units.forEach((u, i) => { UNIT[u.id] = { ...u, order: i }; });
  const unitOf = id => (CARD[id] ? CARD[id].unit : null);
  const skillNum = id => { const c = CARD[id]; return c ? Number(c.skill.slice(1)) : 0; };

  function blank() {
    return {
      v: 1,
      cards: {},          // id -> {box, due, up, intro, seen, right, wrong, lapses, again:[days], aTs}
      open: [],           // cards released so far, in order
      sets: {},           // set id -> day it was released
      batch: [],          // the most recent set's cards
      manual: {},         // unit id -> true (unlocked by hand) / false (relocked by hand)
      hard: {},           // كلماتي الصعبة: 'H-…' -> {w, from, n, first, last}
      days: {},           // day -> {n: answers, ok: right, sessions}
      reg: [],            // days Mama registered by hand
      log: [],            // [day, id, 1/0]
      settings: { ...DEFAULT_SETTINGS, tashkeel: {} }
    };
  }
  function clean(s) {
    const d = blank();
    if (!s || typeof s !== 'object') return d;
    const obj = x => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
    const known = id => !!CARD[id] || /^H-/.test(id);
    const o = { ...d, ...s,
      cards: obj(s.cards), sets: obj(s.sets), manual: obj(s.manual), hard: obj(s.hard), days: obj(s.days),
      settings: { ...d.settings, ...obj(s.settings), tashkeel: { ...obj(obj(s.settings).tashkeel) } },
      open: Array.isArray(s.open) ? [...new Set(s.open.filter(known))] : [],
      batch: Array.isArray(s.batch) ? s.batch.filter(known) : [],
      log: Array.isArray(s.log) ? s.log : [],
      reg: Array.isArray(s.reg) ? s.reg.filter(isDay) : [] };
    return o;
  }
  const valid = s => !!(s && typeof s === 'object' && s.cards && typeof s.cards === 'object' && Array.isArray(s.open));
  const EMPTY = Object.freeze({ box: 0, due: '', seen: 0, right: 0, wrong: 0 });
  const peek = (m, id) => m.cards[id] || EMPTY;
  const rec = (m, id) => m.cards[id] || (m.cards[id] = { box: 0, due: '', seen: 0, right: 0, wrong: 0 });

  /* ---------- sets, stages, units ---------- */
  function mostlyLearned(m, ids) {
    if (!ids.length) return true;
    const known = ids.filter(id => peek(m, id).box >= KNOWN_BOX).length;
    return ids.every(id => peek(m, id).box >= 1) && known >= (ids.length >= 3 ? ids.length - 1 : ids.length);
  }
  const released = (m, setId) => !!m.sets[setId];
  const stageSets = (unitId, stage) => UNIT[unitId].sets.filter(id => SET[id].stage === stage);
  const stageReady = (m, unitId, stage) => stageSets(unitId, stage).every(id => released(m, id) && mostlyLearned(m, SET[id].cards));
  function unitComplete(m, unitId) {
    const u = UNIT[unitId];
    return u.sets.every(id => released(m, id)) && stageReady(m, unitId, u.stages[u.stages.length - 1]);
  }
  // open: unlocked by hand, or reached (the first unit, or the unit before it is complete); relocked by hand wins
  function unitOpen(m, unitId) {
    if (m.manual[unitId] === false) return false;
    if (m.manual[unitId] === true) return true;
    const i = UNIT[unitId].order;
    return i === 0 || unitComplete(m, DATA.units[i - 1].id) || UNIT[unitId].sets.some(id => released(m, id));
  }
  const active = (m, id) => /^H-/.test(id) || (CARD[id] && m.manual[CARD[id].unit] !== false);
  // the most recent set is mostly learned (a relocked unit's set does not hold the others back)
  const batchReady = m => mostlyLearned(m, m.batch.filter(id => active(m, id)));
  // the next set: the first unreleased set of an open unit whose stage may start
  function nextSet(m) {
    for (const u of DATA.units) {
      if (!unitOpen(m, u.id)) continue;
      const sid = u.sets.find(id => !released(m, id));
      if (!sid) continue;
      const st = SET[sid].stage, i = u.stages.indexOf(st);
      if (i > 0 && stageSets(u.id, st)[0] === sid && !stageReady(m, u.id, u.stages[i - 1])) continue;
      return sid;
    }
    return null;
  }
  const setsReleasedOn = (m, t) => Object.values(m.sets).filter(d => d === t).length;
  function canRelease(m, t) {
    const next = nextSet(m);
    return !!next && batchReady(m) && setsReleasedOn(m, t) < m.settings.newSets;
  }
  function release(m, t) {
    const sid = nextSet(m); if (!sid) return null;
    m.sets[sid] = t;
    const ids = SET[sid].cards.filter(id => !m.open.includes(id));
    m.open.push(...ids); m.batch = [...SET[sid].cards];
    return sid;
  }

  /* ---------- sessions ---------- */
  function weakness(c) {
    const n = c.seen || 0;
    return ((c.wrong || 0) + 1) / (n + 2) * 2 + (TOP_BOX - (c.box || 0)) * 0.1;
  }
  const pool = m => [...m.open, ...Object.keys(m.hard)].filter(id => active(m, id));
  function dueIds(m, t) {
    return pool(m).filter(id => { const c = peek(m, id); return c.box >= 1 && c.due && c.due <= t; })
      .sort((x, y) => {
        const a = peek(m, x), b = peek(m, y);
        // the lowest box first (the cards still being learned hold back the next set), then the oldest due date
        if (a.box !== b.box) return a.box - b.box;
        if (a.due !== b.due) return a.due < b.due ? -1 : 1;
        return (weakness(b) - weakness(a)) || ((SET[CARD[x] && CARD[x].set] || {}).order || 0) - ((SET[CARD[y] && CARD[y].set] || {}).order || 0);
      });
  }
  // the skill she is on now (the newest released set's)
  function currentUnit(m) {
    const sid = Object.keys(m.sets).sort((a, b) => SET[b].order - SET[a].order)[0];
    return sid ? SET[sid].unit : DATA.units[0].id;
  }
  const MIX = ['red', 'sent', 'text', 'textred', 'word'];
  // A session: cards due today, the cards still being learned, a new set when the last one is mostly learned, up to 2 new
  // كلماتي الصعبة words, topped up to five with learned cards that are not due ("تذكّري"; from skill 3 on, red-word and dictation
  // cards from every skill learned so far come first). Returns [{id, step}], starting with a card she knows.
  function buildSession(m, t, rand = Math.random) {
    while (canRelease(m, t)) { release(m, t); if (!batchReady(m)) break; }
    const fresh = m.open.filter(id => active(m, id) && peek(m, id).box === 0).map(id => ({ id, step: peek(m, id).seen ? 'learn' : 'show' }));
    Object.keys(m.hard).filter(id => peek(m, id).box === 0).slice(0, MAX_HARD_NEW)
      .forEach(id => fresh.push({ id, step: peek(m, id).seen ? 'learn' : 'show' }));
    const due = dueIds(m, t);
    const room = Math.max(m.settings.perSession - fresh.length, Math.min(due.length, 2));
    const reviews = due.slice(0, room).map(id => ({ id, step: 'review' }));
    const items = [];
    for (let i = 0; i < Math.max(reviews.length, fresh.length); i++) {
      if (reviews[i]) items.push(reviews[i]);
      if (fresh[i]) items.push(fresh[i]);
    }
    if (items.length < MIN_SESSION) {
      const used = new Set(items.map(x => x.id));
      const mixed = skillNum(m.open[m.open.length - 1] || '') >= 3;
      const warm = pool(m).filter(id => { const c = peek(m, id); return c.box >= 1 && !(c.due && c.due <= t) && !used.has(id); })
        .map(id => ({ id, w: weakness(peek(m, id)) + rand() * 0.6 + (mixed && CARD[id] && MIX.includes(CARD[id].type) ? 1 : 0) }))
        .sort((a, b) => b.w - a.w).slice(0, MIN_SESSION - items.length).map(x => ({ id: x.id, step: 'warm' }));
      items.unshift(...warm);
    }
    return items;
  }
  // Returns the step to show the card again later in this session, or null.
  function schedule(c, step, g, t, views) {
    const put = box => { c.box = box; c.due = addDays(t, INTERVAL[box]); c.up = t; };
    if (step === 'show') return 'learn';
    if (step === 'learn') {
      if (g === 'again') return views < MAX_VIEWS ? 'learn' : null;
      put(1);
      return null;
    }
    if (step === 'relearn') return g === 'again' && views < MAX_VIEWS ? 'relearn' : null;
    // 'review' (due today) or 'warm' (learned, not due: a right answer leaves its schedule alone)
    if (g === 'again') { c.lapses = (c.lapses || 0) + 1; put(1); return views < MAX_VIEWS ? 'relearn' : null; }
    if (step === 'review' && c.up !== t) put(Math.min(TOP_BOX, c.box + 1));
    return null;
  }
  // One answer: right first time = Good, anything else = Again. The show step is not an answer.
  function answer(m, item, correct, t, views) {
    const c = rec(m, item.id);
    if (item.step === 'show') { c.seen = (c.seen || 0) + 1; if (!c.intro) c.intro = t; return { grade: null, again: 'learn' }; }
    const g = correct ? 'good' : 'again';
    c.seen = (c.seen || 0) + 1;
    if (correct) c.right = (c.right || 0) + 1;
    else {
      c.wrong = (c.wrong || 0) + 1;
      (c.again = c.again || []).push(t); if (c.again.length > 20) c.again.splice(0, c.again.length - 20);
      c.aTs = Date.now();
    }
    const day = m.days[t] || (m.days[t] = { n: 0, ok: 0, sessions: 0 });
    day.n++; if (correct) day.ok++;
    m.log.push([t, item.id, correct ? 1 : 0]);
    if (m.log.length > 4000) m.log.splice(0, m.log.length - 4000);
    if (!c.intro) c.intro = t;
    return { grade: g, again: schedule(c, item.step, g, t, views) };
  }
  // Insert a card again after two others.
  function requeue(queue, item, gap = 2) { queue.splice(Math.min(gap, queue.length), 0, item); return queue; }
  // The next card to show: never the same card twice in a row. If only that card is left, another learned card comes
  // between them (a تذكّري card: a right answer leaves its schedule alone).
  function next(queue, lastId, m, t, rand = Math.random) {
    if (!queue.length) return null;
    if (queue[0].id !== lastId) return queue.shift();
    const i = queue.findIndex(x => x.id !== lastId);
    if (i > 0) return queue.splice(i, 1)[0];
    const other = pool(m).filter(id => id !== lastId && peek(m, id).box >= 1);
    if (other.length) return { id: other[Math.floor(rand() * other.length)], step: 'warm' };
    return queue.shift();     // nothing else learned yet (her very first set): it has to come again
  }

  /* ---------- كلماتي الصعبة ---------- */
  const hardId = w => 'H-' + (idOf ? idOf(w) : w);
  // a word she tapped as wrong in a sentence or a text becomes its own word card (box 0: show, learn, then the boxes);
  // a word already in the deck comes back tomorrow
  function addHard(m, word, fromId, t) {
    const w = String(word).replace(/[.،؛:؟!«»"]/g, '').trim();
    if (!w) return null;
    const id = hardId(w);
    const h = m.hard[id] || (m.hard[id] = { w, from: fromId, n: 0, first: t });
    h.n++; h.last = t;
    const c = m.cards[id];
    if (c && c.box >= 1) { c.box = 1; c.due = addDays(t, 1); c.up = t; c.lapses = (c.lapses || 0) + 1; }
    return id;
  }
  // Mama: a self-check marked right that was wrong. The card goes back to box 1 (tomorrow).
  function markWrong(m, id, t) {
    const c = rec(m, id);
    c.box = 1; c.due = addDays(t, 1); c.up = t; c.lapses = (c.lapses || 0) + 1;
    c.wrong = (c.wrong || 0) + 1; c.right = Math.max(0, (c.right || 0) - 1);
    (c.again = c.again || []).push(t);
  }

  /* ---------- what the parent view shows ---------- */
  function unitStats(m) {
    return DATA.units.map(u => {
      const ids = u.sets.flatMap(id => SET[id].cards);
      const rel = u.sets.filter(id => released(m, id));
      const stage = rel.length ? SET[rel[rel.length - 1]].stage : 0;
      return { id: u.id, skill: u.skill, label: u.label, total: ids.length, learned: ids.filter(id => peek(m, id).box >= 1).length,
        open: unitOpen(m, u.id), manual: m.manual[u.id], stage, stages: u.stages, complete: unitComplete(m, u.id), sets: rel.length, setsTotal: u.sets.length };
    });
  }
  const practisedDays = m => [...new Set([...Object.keys(m.days).filter(d => m.days[d].n > 0), ...m.reg])].sort();
  function hardest(m, k = 12) {
    return Object.entries(m.hard).map(([id, h]) => ({ id, w: h.w, n: h.n, box: peek(m, id).box, wrong: peek(m, id).wrong || 0 }))
      .sort((a, b) => (b.n + b.wrong) - (a.n + a.wrong)).slice(0, k);
  }

  return { INTERVAL, TOP_BOX, KNOWN_BOX, MIN_SESSION, MAX_VIEWS, DEFAULT_SETTINGS, SET, UNIT, addDays, blank, clean, valid, peek, rec,
    mostlyLearned, stageReady, unitComplete, unitOpen, active, batchReady, nextSet, canRelease, release, setsReleasedOn, dueIds,
    currentUnit, buildSession, schedule, answer, requeue, next, addHard, hardId, markWrong, unitStats, practisedDays, hardest, weakness };
}

root.KDEngine = { create, addDays, INTERVAL, MAX_VIEWS };
})(typeof window !== 'undefined' ? window : globalThis);
