/* Offline cache for Maria's Talk Cards.
   Bump VERSION on every deploy so the iPad picks up new files (sets.json, audio/). */
// The same file serves both apps: Talk Cards registers sw.js, Prepositions registers sw.js?app=prepositions.
const APP = new URL(location.href).searchParams.get('app') === 'prepositions' ? 'prepositions' : 'talk-cards';
const VERSION = APP + '-v8';
const FILES = APP === 'prepositions' ? [
  './',
  'index.html',
  'style.css',
  'app.js',
  'prepositions.json',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'fonts/literata.woff2',
  'fonts/atkinson-400.woff2',
  'fonts/atkinson-700.woff2'
] : [
  './',
  'index.html',
  'style.css',
  'app.js',
  'sets.json',
  'prepositions.json',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'fonts/andika-400.woff2',
  'fonts/andika-700.woff2',
  'fonts/noto-naskh-arabic.woff2',
  'fonts/literata.woff2',
  'fonts/atkinson-400.woff2',
  'fonts/atkinson-700.woff2'
];

// The recorded voice: audio/voice.json lists every clip; all of them are cached so the car works offline.
async function cacheVoice(cache) {
  try {
    const res = await fetch('audio/voice.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const manifest = await res.clone().json();
    await cache.put('audio/voice.json', res);
    const clips = Object.values(manifest.decks || {}).flatMap(d => Object.values(d.clips));
    const files = ['audio/_unlock.m4a', ...new Set(clips.map(c => 'audio/' + c.f))];
    for (let i = 0; i < files.length; i += 40) await cache.addAll(files.slice(i, i + 40));
  } catch (e) { /* no recordings yet: the app falls back to the device voice */ }
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(async c => { await c.addAll(FILES); await cacheVoice(c); }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      // several apps share this web address (Talk Cards, Prepositions, the games), so only this app's old caches go
      .then(keys => Promise.all(keys.filter(k => k.startsWith(APP + '-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const put = res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; };
  // On a local test server, fetch fresh files first so edits show up; fall back to the cache offline.
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    // (a page navigation cannot be re-fetched with options, so it is fetched by its URL)
    e.respondWith(fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-store' }).then(put).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  // Everywhere else: cache first, so the app opens instantly and works with no signal.
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(put)));
});
