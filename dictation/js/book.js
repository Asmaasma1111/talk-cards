/* كرّاس الإملاء: her dictation copybooks (the reward). Saved in mariaDictation.v1 as book:
     books: [{ n, colour, name (her handwritten name, a small PNG data URL), pages: [{ day, skill, writings: [ids], words: [], sticker }], full }]
     stickerDays: { day: sticker number }, seenStickers: [numbers offered so far]
   A page is made the first time she finishes a session on a day; a second session that day adds to it. Nothing on a page is
   ever removed. 30 pages fill a copybook: it closes with a short celebration, goes onto the shelf كراريسي, and on her next
   visit she chooses the cover colour of the next one and writes her name again. The pages and the reader are in page.js,
   the sticker of the day in sticker.js. */
(function (KD) {
'use strict';
const { el, icon, pic } = KD.ui;
const PAGES = 30, COLOURS = ['pink', 'yellow', 'green'];
const B = () => KD.store.get().book;

const current = () => { const b = B().books; const last = b[b.length - 1]; return last && !last.full ? last : null; };
const pageOf = (book, day) => book.pages.find(p => p.day === day) || null;

/* ---------- the cover: the ChatGPT picture (or its placeholder) with her name on the white label ---------- */
function coverEl(book, cls = '') {
  const label = el('div', { class: 'c-label' },
    book.name ? el('img', { class: 'c-name', src: book.name, alt: '' }) : null,
    el('span', { class: 'c-num' }, `كرّاس ${book.n}`));
  return el('div', { class: `cover c-${book.colour} ${cls}` }, pic(`cover_${book.colour}.png`, 'cover-art'), label);
}
function spine(book) {
  return el('div', { class: `spine s-${book.colour}` },             // the whole shelf opens كراريسي
    pic(`shelf_${book.colour}.png`, 'spine-art'), el('span', { class: 's-num' }, String(book.n)));
}
// the shelf on the home screen: her full copybooks standing on it
function shelfStrip() {
  return el('div', { class: 'shelf-strip' }, pic('shelf.png', 'shelf-art'), el('div', { class: 'spines' }, B().books.filter(b => b.full).map(spine)));
}

/* ---------- كراريسي: every copybook, to open and read ---------- */
function shelf(app) {
  const books = B().books;
  app.replaceChildren(el('section', { class: 'screen shelf-screen' },
    el('header', { class: 'h-top' }, el('button', { class: 'top-btn', 'aria-label': 'home', onclick: () => { location.hash = '#home'; } }, icon('close')),
      el('h1', { class: 'shelf-title ar' }, 'كراريسي'), el('span', { class: 'top-gap' })),
    el('div', { class: 'shelf-books' }, books.map(b => el('button', { class: 'shelf-book', 'aria-label': `كرّاس ${b.n}`, onclick: () => { KD.sound.play('page'); location.hash = '#book/' + (b.n - 1); } }, coverEl(b, 'small')))),
    el('div', { class: 'shelf-board' }, pic('shelf.png', 'shelf-art'))));
}

/* ---------- a new copybook: first the cover colour, then her name on the label ---------- */
function welcome(app) {
  KD.voice.stop();
  const n = B().books.length + 1;
  const pick = el('div', { class: 'cover-pick' }, COLOURS.map(colour => el('button', { class: 'pick', 'aria-label': colour, onclick: () => { KD.sound.play('tap'); nameStep(colour); } },
    coverEl({ n, colour, name: '' }, 'small'))));
  app.replaceChildren(el('section', { class: 'screen welcome' }, el('div', { class: 'welcome-main' }, pick)));

  function nameStep(colour) {
    const cover = coverEl({ n, colour, name: '' }, 'naming');
    const label = cover.querySelector('.c-label');
    const host = el('div', { class: 'name-pad' });
    label.prepend(host);
    const pad = KD.pad.create(host, { plain: true, onChange: () => { done.disabled = pad.empty; } });
    const done = el('button', { class: 'btn btn-done', onclick: async () => {
      done.disabled = true;
      const w = await pad.export(360);
      B().books.push({ n, colour, name: w.url, pages: [], full: false });
      KD.store.save(); KD.sound.play('page');
      if (KD.book._pending) { const info = KD.book._pending; KD.book._pending = null; endSession(app, info); return; }
      location.replace('#home');
    } }, KD.data.prompts.done.text);
    done.disabled = true;
    app.replaceChildren(el('section', { class: 'screen welcome' },
      el('header', { class: 'h-top' }, el('button', { class: 'top-btn', 'aria-label': 'back', onclick: () => welcome(app) }, icon('close'))),
      el('div', { class: 'welcome-main' }, cover), el('div', { class: 'tools-row' }, KD.pad.tools(pad)), el('div', { class: 'bar' }, done)));
  }
}

/* ---------- the end of a session: today's page gets her work, then the sticker of the day ---------- */
function endSession(app, info) {
  history.replaceState(null, '', '#today');     // (a reload from here goes home, not into a new session)
  const book = current();
  if (!book) { KD.book._pending = info; location.hash = '#welcome'; return; }   // (only if her copybook was never begun)
  let page = pageOf(book, info.t);
  if (!page) { page = { day: info.t, skill: info.skill, writings: [], words: [], sticker: null }; book.pages.push(page); }
  // up to 4 writings from a session, most recent first; a second session that day adds to the page (at most 6 in all)
  info.writings.slice(0, 4).forEach(id => { if (page.writings.length < 6 && !page.writings.includes(id)) page.writings.push(id); });
  info.newWords.forEach(w => { if (!page.words.includes(w)) page.words.push(w); });
  KD.store.save();
  const stickerToday = B().stickerDays[info.t] != null;
  if (!stickerToday && KD.sticker) { KD.sticker.choose(app, book, page, () => afterPage(app, book)); return; }
  KD.page.today(app, book, page, () => afterPage(app, book));
}
function afterPage(app, book) {
  if (book.pages.length >= PAGES && !book.full) { book.full = true; KD.store.save(); celebrate(app, book); return; }
  location.hash = '#home';
}
// a full copybook: a short celebration, then it goes onto the shelf
function celebrate(app, book) {
  KD.sound.play('done');
  app.replaceChildren(el('section', { class: 'screen celebrate' },
    el('div', { class: 'celebrate-main' }, pic('copybook_done.png', 'done-art'), coverEl(book, 'small closing')),
    el('div', { class: 'bar' }, el('button', { class: 'btn btn-next', 'aria-label': 'next', onclick: () => { location.hash = '#shelf'; } }, icon('next')))));
}

/* ---------- open a copybook (the current one, or one from the shelf) ---------- */
function open(app, idx) {
  const books = B().books;
  const book = idx == null ? (current() || books[books.length - 1]) : books[idx];
  if (!book) { location.replace('#home'); return; }
  KD.page.reader(app, book);
}

KD.book = { current, coverEl, shelfStrip, shelf, welcome, endSession, open, pageOf, PAGES, COLOURS, _pending: null };
})(window.KD = window.KD || {});
