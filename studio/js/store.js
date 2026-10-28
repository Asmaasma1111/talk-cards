// Project data lives in localStorage; handwriting pages live in IndexedDB.
// Every read and write is wrapped so a storage failure never breaks the app.

const KEY = 'mariaStudio.v1';

function newProject(name = 'كتاب تلوين السكويشي') {
  return {
    id: 'p' + Date.now().toString(36),
    name,
    startedAt: new Date().toISOString(),
    stationsDone: [],
    firstSaleAt: null,
    data: {},
  };
}

function defaults() {
  return {
    v: 1,
    setupDone: false,
    mascotName: '',
    mascotNameImg: null,
    muted: false,
    pencilOnly: null, // null = not decided yet; turns on when an Apple Pencil is first seen
    stars: 0,
    badges: [],
    projectsFinished: 0,
    jars: { spend: 0, save: 0, grow: 0, give: 0 },
    grownTotal: 0, // every riyal ever put in Grow (the Grow machine's level)
    givenTotal: 0, // every riyal ever put in Give (one plant each in the garden)
    giveLog: [],
    gardenSeen: 0, // plants already shown growing
    sadaqa: { target: null },
    current: newProject(),
    gallery: [],
    nextProjects: [],
    parent: { pin: null, schoolOk: false }, // schoolOk: Mama confirmed the school allows telling friends there
  };
}

let state = defaults();
const listeners = new Set();

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...defaults(), ...JSON.parse(raw) };
  } catch (e) {
    console.warn('load failed', e);
  }
  return state;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('save failed', e);
    return false;
  }
}

export function get() { return state; }

export function update(fn) {
  fn(state);
  const ok = save();
  listeners.forEach(l => l(state));
  return ok;
}

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function resetAll() {
  state = defaults();
  save();
}

// Restore from a backup file: the whole state at once (the parent corner checks it first).
export function replaceState(next) {
  state = { ...defaults(), ...next };
  return save();
}

export { newProject };

// ---------- IndexedDB: handwriting pages ----------
const memPages = new Map(); // fallback if IndexedDB is unavailable
let dbp = null;

function db() {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      const req = indexedDB.open('mariaStudio', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('pages', { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
  return dbp;
}

export async function getPage(id) {
  if (memPages.has(id)) return memPages.get(id); // newest copy written this session
  try {
    const d = await db();
    if (!d) return memPages.get(id) || null;
    return await new Promise((resolve) => {
      const r = d.transaction('pages').objectStore('pages').get(id);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => resolve(memPages.get(id) || null);
    });
  } catch (e) {
    return memPages.get(id) || null;
  }
}

export async function putPage(page) {
  memPages.set(page.id, page);
  try {
    const d = await db();
    if (!d) return false;
    return await new Promise((resolve) => {
      const tx = d.transaction('pages', 'readwrite');
      tx.objectStore('pages').put(page);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

export async function clearPages() {
  memPages.clear();
  try {
    const d = await db();
    if (!d) return true;
    return await new Promise((resolve) => {
      const tx = d.transaction('pages', 'readwrite');
      tx.objectStore('pages').clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

export async function allPages() {
  try {
    const d = await db();
    if (!d) return [...memPages.values()];
    return await new Promise((resolve) => {
      const r = d.transaction('pages').objectStore('pages').getAll();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = () => resolve([...memPages.values()]);
    });
  } catch (e) {
    return [...memPages.values()];
  }
}
