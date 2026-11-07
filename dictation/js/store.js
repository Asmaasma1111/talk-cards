/* كرّاس الإملاء: saved progress.
   localStorage 'mariaDictation.v1': the engine's state (cards, sets, days, settings...) plus her copybooks (book) and prefs.
   IndexedDB 'mariaDictation', store 'writing' (keyPath 'id'): each writing answer as a small PNG with its day, card and self-check.
   Both are in تطبيقات ماريا's Back up / Restore (app.js: DEVICE_KEYS and DEVICE_DBS). Nothing here ever deletes her work. */
(function (KD) {
'use strict';
const KEY = 'mariaDictation.v1';
let state = null;

const pad2 = n => String(n).padStart(2, '0');
function today() {
  // a test date on the local server only: ?day=2026-11-20
  if (location.hostname === 'localhost') { const q = new URLSearchParams(location.search).get('day'); if (q && /^\d{4}-\d\d-\d\d$/.test(q)) return q; }
  const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function extras(s) {
  s.book = s.book && typeof s.book === 'object' ? s.book : { books: [], stickerDays: {}, seenStickers: [] };
  if (!Array.isArray(s.book.books)) s.book.books = [];
  if (!s.book.stickerDays || typeof s.book.stickerDays !== 'object') s.book.stickerDays = {};
  if (!Array.isArray(s.book.seenStickers)) s.book.seenStickers = [];
  s.prefs = { muted: false, pencilOnly: null, pen: 'blue', met: [], ...(s.prefs && typeof s.prefs === 'object' ? s.prefs : {}) };
  if (!Array.isArray(s.prefs.met)) s.prefs.met = [];        // the skills whose opening page she has seen
  return s;
}
function load() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
  state = extras(KD.E.clean(raw));
  return state;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { console.warn('save failed', e); return false; }
}
function replace(next) { state = extras(KD.E.clean(next)); return save(); }

/* ---------- her handwriting (IndexedDB) ---------- */
let dbp = null;
const mem = new Map();   // when IndexedDB is not there (private browsing): kept for this visit
function db() {
  if (dbp) return dbp;
  dbp = new Promise(ok => {
    try {
      const q = indexedDB.open('mariaDictation', 1);
      q.onupgradeneeded = () => { if (!q.result.objectStoreNames.contains('writing')) q.result.createObjectStore('writing', { keyPath: 'id' }); };
      q.onsuccess = () => ok(q.result); q.onerror = () => ok(null);
    } catch (e) { ok(null); }
  });
  return dbp;
}
async function putWriting(row) {
  mem.set(row.id, row);
  const d = await db(); if (!d) return false;
  return new Promise(ok => { try { const tx = d.transaction('writing', 'readwrite'); tx.objectStore('writing').put(row); tx.oncomplete = () => ok(true); tx.onerror = () => ok(false); } catch (e) { ok(false); } });
}
async function getWriting(id) {
  if (mem.has(id)) return mem.get(id);
  const d = await db(); if (!d) return null;
  return new Promise(ok => { try { const q = d.transaction('writing').objectStore('writing').get(id); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null); } catch (e) { ok(null); } });
}
async function allWriting() {
  const d = await db(); if (!d) return [...mem.values()];
  return new Promise(ok => { try { const q = d.transaction('writing').objectStore('writing').getAll(); q.onsuccess = () => ok(q.result || []); q.onerror = () => ok([...mem.values()]); } catch (e) { ok([...mem.values()]); } });
}
async function setCheck(id, okv) {
  const r = await getWriting(id); if (!r) return false;
  r.ok = okv; return putWriting(r);
}

KD.store = { KEY, today, load, save, replace, get: () => state, putWriting, getWriting, allWriting, setCheck };
})(window.KD = window.KD || {});
