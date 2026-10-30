/* Offline cache for Maria's Talk Cards.
   Bump VERSION on every deploy so the iPad picks up new files (sets.json, audio/). */
// The same file serves both apps: Talk Cards registers sw.js, Prepositions registers sw.js?app=prepositions.
const APP = new URL(location.href).searchParams.get('app') === 'prepositions' ? 'prepositions' : 'talk-cards';
const VERSION = APP + '-v145';
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
  'squishy.js',
  'library.js',
  'entrance.js',
  'reads.js',
  'reads.json',
  'curiosity.js',
  'curiosity.json',
  'algeria.js',
  'algeria-maths.js',
  // the maths corner's pictures (ChatGPT, scripts/corner_pics.py)
  ...'words x10 double distrib mul1 mul2 subadd time length mass tools midpoint lines program net ruler square compass ang90a ang45 ang135 ang90b par perp cross parv net_cross net_block net_row seg_mid'.split(' ').map(n => `assets/algeria/corner/${n}.webp`),
  'algeria.json',
  'assets/apps/curiosity.webp',
  // the science garden's pictures (ChatGPT, scripts/garden_pics.py): the same list as PICS in garden.js
  ...'p0 p1 p3 p4 pp p5 rumF rumP rum strF strP straw b0 b1 b2 b3 f0 f1 f3 f4 nest0 nest1 nest2 sparrow hog hopper worm leaves humus bee can sun cloud tree mag pond'.split(' ').map(n => `assets/garden/${n}.webp`),
  'assets/curiosity/gift-closed.webp',
  'assets/curiosity/gift-open.webp',
  'assets/curiosity/sounds/h1.m4a',
  // the five phases' badges (drawn in ChatGPT, her request of 26 Oct 2026)
  ...[1, 2, 3, 4, 5].map(n => `assets/curiosity/phases/p${n}.webp`), ...['game', 'big', 'dinner'].map(n => `assets/curiosity/phases/${n}.webp`),
  // her question tree (drawn in ChatGPT): the tree, its leaves, blossoms and fruits, and where they grow
  'assets/curiosity/tree/tree.json',
  'assets/curiosity/tree/tree.webp',
  ...[1, 2, 3, 4, 5, 6].map(n => `assets/curiosity/tree/leaf-${n}.webp`),
  ...[1, 2, 3].flatMap(n => [`assets/curiosity/tree/flower-${n}.webp`, `assets/curiosity/tree/fruit-${n}.webp`]),
  'assets/apps/talk.webp',
  'assets/apps/math.webp',
  'assets/apps/lib.webp',
  'assets/apps/reads.webp',
  // ماريا تقرأ: the meaning pictures and the weekly puzzles (her words are in audio/voice.json, deck 'reads')
  ...['cat', 'bat', 'cab', 'act'].map(n => `assets/reads/pics/${n}.webp`),
  ...Array.from({ length: 24 }, (_, i) => `assets/reads/puzzles/p${String(i + 1).padStart(2, '0')}.webp`),
  'assets/reads/book/cover.webp', 'assets/reads/book/page.webp',   // كتاب ألغازي (ChatGPT, scripts/book_art.py)
  'stories.json',
  'stickers/stickers.json',
  'sets.json',
  'prepositions.json',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
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
  'assets/library/deco/bunting.webp',
  // مختبر ماريا للمال (studio/): its own page, styles, ES modules and fonts; its tile picture
  'assets/apps/studio.webp',
  'studio/', 'studio/index.html', 'studio/css/app.css',
  ...'app copybook dnd gallery home jars journey parent projects sound station station1 station2 station3 station4 station5 station6 station7 station8 station9 store ui welcome'.split(' ').map(n => `studio/js/${n}.js`),
  'studio/fonts/baloo2-arabic.woff2', 'studio/fonts/baloo2-latin.woff2', 'studio/fonts/Tajawal-Regular.ttf', 'studio/fonts/Tajawal-Bold.ttf',
  // its ChatGPT pictures (scripts/studio_pics.py writes this line)
  ...'badge_brave badge_finish badge_fix badge_give badge_pitch badge_spoke card_green card_pink card_yellow coin cork garden_bg girl_st1 girl_st2 girl_st3 girl_st4 girl_st5 girl_st6 girl_st7 girl_st8 girl_st9 grow_machine_1 grow_machine_2 grow_machine_3 home_bg home_bg_portrait ic_baba ic_basket ic_book ic_camera ic_family ic_friend ic_gift ic_happy ic_heart ic_home ic_later ic_list ic_lock ic_mama ic_money ic_neighbours ic_nophoto ic_ok ic_online ic_palette ic_plain ic_poster ic_receipt ic_school ic_sister ic_sparkle ic_star ic_sun ic_tablet ic_tag ic_thanks ic_tick ic_tools ic_unsure ic_worried ic_write item_bag item_markers item_other item_paper item_print item_stapler item_stickers jar_give_empty jar_give_full jar_grow_empty jar_grow_full jar_save_empty jar_save_full jar_spend_empty jar_spend_full mascot_celebrate mascot_think mascot_wave mascot_write scene_1 scene_2 scene_3 scene_4 scene_5 scene_6 scene_7 scene_8 scene_9 seed sprout st1_dream st2_ideas st3_customers st4_plan st5_make st6_market st7_sell st8_jars st9_next stalks7 studio_1 studio_2 studio_3'.split(' ').map(n => `studio/assets/${n}.webp`)
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
// صانعة السكويشي (month 2): the realistic squishy parts and the glass jar
const SQUISHY = ['ball', 'butter', 'cat', 'peanut', 'cloud', 'cheese', 'banana', 'strawberry', 'noodles', 'star',
  'top-bow', 'top-cherry', 'top-crown', 'top-flower', 'top-leaf', 'top-shades', 'jar'].map(n => `assets/library/squishy/${n}.webp`);
const COLOUR = ['glitter-balls', 'mega-dumpling', 'squishy-stickers', 'butter-stick', 'peanut', 'cheese', 'banana', 'noodles', 'paper-squishy',
  'butter-toast', 'bunny', 'cat', 'rainbow', 'treasure', 'bracelet', 'bookmark'];
async function cacheColour(cache) {
  if (APP !== 'talk-cards') return;
  await Promise.all([...COLOUR.map(id => `assets/library/color/${id}.webp`), ...SQUISHY].map(u => cache.add(u).catch(() => {})));
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

// ماريا تقرأ: the real photos listed in reads.json, one by one (a missing one never stops the install)
async function cacheReads(cache) {
  if (APP !== 'talk-cards') return;
  try {
    const d = await (await fetch('reads.json', { cache: 'no-cache' })).json();
    await Promise.all((d.photos || []).map(k => cache.add(new Request(`assets/reads/photos/${k}.webp`, { cache: 'no-cache' })).catch(() => {})));
    await Promise.all(Object.values(d.sentences || {}).filter(x => x.pic).map(x => cache.add(new Request(x.pic, { cache: 'no-cache' })).catch(() => {})));
  } catch (e) { /* the pictures still load when online */ }
}

// هيا نتعلم في الجزائر: the trip-world pictures (map, icon, stamps, passport) and the real photos listed in algeria.json, one by one
async function cacheAlgeria(cache) {
  if (APP !== 'talk-cards') return;
  try {
    const d = await (await fetch('algeria.json', { cache: 'no-cache' })).json();
    const files = ['assets/apps/algeria.webp', 'assets/algeria/map.webp', 'assets/algeria/outline.svg', 'assets/algeria/train.webp', 'assets/algeria/station.webp', ...['warm', 'step', 'pic', 'easy', 'door', 'explain'].map(k => `assets/algeria/ui/${k}.webp`), ...d.cities.map(c => `assets/algeria/stamps/${c.id}.webp`), ...d.photos];
    await Promise.all(files.map(f => cache.add(new Request(f, { cache: 'no-cache' })).catch(() => {})));
  } catch (e) { /* the pictures still load when online */ }
}

// علبة الفضول: the real photos listed in curiosity.json, one by one
async function cacheCuriosity(cache) {
  if (APP !== 'talk-cards') return;
  try {
    const d = await (await fetch('curiosity.json', { cache: 'no-cache' })).json();
    await Promise.all(d.mysteries.filter(m => m.photo).map(m => cache.add(new Request(m.photo, { cache: 'no-cache' })).catch(() => {})));
  } catch (e) { /* the pictures still load when online */ }
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(async c => { await c.addAll(FILES); await cacheVoice(c); await cacheStickers(c); await cacheStories(c); await cacheColour(c); await cacheReads(c); await cacheCuriosity(c); await cacheAlgeria(c); }).then(() => self.skipWaiting()));
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
  if (url.pathname.startsWith('/signin')) return;     // the sign-in page (Cloudflare) is never cached
  // only a real file is kept: never an error, and never the sign-in page a request was sent to when signed out
  const put = res => { if (res.ok && !res.redirected) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; };
  // On a local test server, fetch fresh files first so edits show up; fall back to the cache offline.
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    // (a page navigation cannot be re-fetched with options, so it is fetched by its URL)
    e.respondWith(fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-store' }).then(put).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  // Everywhere else: cache first, so the app opens instantly and works with no signal.
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(put)));
});
