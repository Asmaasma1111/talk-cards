/* Offline cache for Maria's Talk Cards.
   Bump VERSION on every deploy so the iPad picks up new files (sets.json, audio/). */
// The same file serves both apps: Talk Cards registers sw.js, Prepositions registers sw.js?app=prepositions.
const APP = new URL(location.href).searchParams.get('app') === 'prepositions' ? 'prepositions' : 'talk-cards';
const VERSION = APP + '-v47';
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
  'fonts/atkinson-700.woff2',
  'fonts/atkinson-400-italic.woff2',
  'fonts/atkinson-700-italic.woff2'
] : [
  './',
  'index.html',
  'style.css',
  'app.js',
  'garden.js',
  'maths.js',
  'stickerbook.js',
  'library.js',
  'stories.json',
  'stickers/stickers.json',
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
  'fonts/atkinson-700.woff2',
  'fonts/tajawal-500.woff2',
  'fonts/tajawal-800.woff2',
  'fonts/baloo-bhaijaan2-arabic.woff2',
  'fonts/baloo-bhaijaan2-latin.woff2',
  'fonts/marhey-700-arabic.woff2',
  'assets/audio/lib-slide.m4a',
  'assets/audio/lib-open.m4a',
  'assets/audio/lib-close.m4a',
  'assets/audio/lib-place.m4a',
  'assets/audio/lib-flip1.m4a',
  'assets/audio/lib-creak.m4a',
  'assets/audio/lib-chair.m4a',
  'assets/audio/lib-room.m4a',
  'assets/library/window.webp',
  'assets/library/plant.webp',
  'assets/library/trailing.webp',
  'assets/library/leaves.webp',
  'assets/library/medal.webp',
  'assets/library/studio.webp',
  // the pictures of the pages after every story
  'assets/library/end/other.webp',
  'assets/library/end/magic.webp',
  'assets/library/end/feeling.webp',
  'assets/library/end/tool.webp',
  'assets/library/end/mission.webp',
  // the 30 tools that stand on the studio shelves (one for each book)
  ...Array.from({ length: 30 }, (_, i) => `assets/library/tools/d${String(i + 1).padStart(2, '0')}.webp`),
  'assets/library/deco/frame.webp',
  'assets/library/deco/plant.webp',
  'assets/library/deco/camel.webp',
  'assets/library/deco/bear.webp',
  'assets/library/deco/trophy.webp',
  'assets/library/deco/jar.webp',
  'assets/library/deco/globe.webp',
  'assets/library/deco/butterfly.webp',
  'assets/library/deco/starlamp.webp',
  'assets/library/deco/books.webp',
  'assets/library/deco/lights.webp',
  'assets/library/deco/bunting.webp'
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

// Maria's sticker book: every picture listed in stickers/stickers.json, so the book opens offline too.
// مرسمي: the colouring pictures (same ids as PICS in library.js), one by one, so a picture not drawn yet never stops the install
const COLOUR = ['glitter-balls', 'mega-dumpling', 'squishy-stickers', 'butter-stick', 'peanut', 'cheese', 'banana', 'noodles', 'paper-squishy',
  'butter-toast', 'bunny', 'cat', 'rainbow', 'treasure', 'bracelet', 'bookmark'];
async function cacheColour(cache) {
  if (APP !== 'talk-cards') return;
  await Promise.all(COLOUR.map(id => cache.add(`assets/library/color/${id}.webp`).catch(() => {})));
}

async function cacheStickers(cache) {
  if (APP !== 'talk-cards') return;
  try {
    const m = await (await fetch('stickers/stickers.json', { cache: 'no-cache' })).json();
    await cache.addAll([...m.stickers, ...(m.friends || [])].map(s => 'stickers/' + s.file));
  } catch (e) { /* the book still opens when online */ }
}

// مكتبتي: the story pictures that exist so far (listed in stories.json), so the books open offline with their pictures.
async function cacheStories(cache) {
  if (APP !== 'talk-cards') return;
  try {
    const d = await (await fetch('stories.json', { cache: 'no-cache' })).json();
    // 'no-cache' asks the server each time, so a redone picture (same file name) is not taken from the browser's own cache
    const files = d.stories.flatMap(s => s.images.map(k => new Request(`assets/stories/${s.id}/${k}.webp`, { cache: 'no-cache' })));
    for (let i = 0; i < files.length; i += 40) await cache.addAll(files.slice(i, i + 40));
  } catch (e) { /* placeholders still show */ }
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(async c => { await c.addAll(FILES); await cacheVoice(c); await cacheStickers(c); await cacheStories(c); await cacheColour(c); }).then(() => self.skipWaiting()));
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
