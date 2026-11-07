/* كرّاس الإملاء: a page of her copybook, and the copybook reader.
   A page: the date at the top right in green (السبت 7 نوفمبر 2026), a red underlined heading إملاء: <the skill>, her own
   handwriting from that day (the writings she marked right, most recent first), كلمات جديدة: in green with the new words
   in blue, and her sticker of the day where she put it. The reader opens on the cover; the pages turn from right to left
   (the spine is on the right, as in an Arabic copybook) with the page sound. */
(function (KD) {
'use strict';
const { el, icon, pic, copyDate } = KD.ui;
const urls = [];
function freeUrls() { while (urls.length) URL.revokeObjectURL(urls.pop()); }

function pageEl(book, page, num) {
  const skill = KD.skill(page.skill);
  const writings = el('div', { class: 'p-writings' });
  page.writings.forEach(async id => {
    const slot = el('div', { class: 'p-writing' }); writings.append(slot);
    const r = await KD.store.getWriting(id);
    if (!r || !r.png) return;
    const u = URL.createObjectURL(r.png); urls.push(u);
    slot.append(el('img', { class: 'p-ink', src: u, alt: '', draggable: 'false' }));
  });
  const p = el('div', { class: 'cpage page' },
    el('div', { class: 'p-date ar' }, copyDate(page.day)),
    el('div', { class: 'p-head ar' }, 'إملاء: ' + (skill ? skill.heading : '')),
    writings,
    page.words.length ? el('div', { class: 'p-words ar' }, el('span', { class: 'p-wl' }, 'كلمات جديدة: '), el('span', { class: 'p-ww' }, page.words.map(w => KD.ui.shown(w, { skill: page.skill, keep: [] })).join('، '))) : null,
    el('span', { class: 'p-num' }, String(num)));
  if (page.sticker) p.append(stickerEl(page.sticker));
  return p;
}
function stickerEl(s) {
  return el('div', { class: 'p-sticker' + (s.n % 10 === 0 ? ' sparkly' : ''), style: { left: s.x + '%', top: s.y + '%' } }, pic(stickerFile(s.n), 'st-art'));
}
const stickerFile = n => `sticker_${String(n).padStart(2, '0')}.png`;

/* ---------- the reader ---------- */
function reader(app, book) {
  KD.voice.stop(); freeUrls();
  let at = 0;                                   // 0 = the cover, 1.. = pages
  const total = book.pages.length;
  const stage = el('div', { class: 'book-stage' });
  const prev = el('button', { class: 'tool turn', 'aria-label': 'previous', onclick: () => go(-1) }, icon('next', 'flip-x'));
  const next = el('button', { class: 'tool turn', 'aria-label': 'next', onclick: () => go(1) }, icon('next'));
  app.replaceChildren(el('section', { class: 'screen reader' },
    el('header', { class: 'h-top' }, el('button', { class: 'top-btn', 'aria-label': 'home', onclick: () => { freeUrls(); history.length > 1 ? history.back() : (location.hash = '#home'); } }, icon('close'))),
    stage, el('div', { class: 'bar' }, prev, next)));
  const face = i => i === 0 ? el('div', { class: 'cpage cover-page' }, KD.book.coverEl(book)) : pageEl(book, book.pages[i - 1], i);
  let cur = face(0); stage.append(cur);
  sync();

  function sync() { prev.disabled = at === 0; next.disabled = at >= total; }
  let busy = false;
  function go(d) {
    const to = at + d;
    if (busy || to < 0 || to > total) return;
    busy = true; KD.sound.play('page');
    const nxt = face(to);
    if (d > 0) {                                 // forward: this page lifts and turns over to the right, onto the spine
      stage.prepend(nxt);
      cur.classList.add('turn-away');
      setTimeout(() => { cur.remove(); cur = nxt; busy = false; }, 620);
    } else {                                     // back: the previous page turns back over from the right
      nxt.classList.add('turn-back'); stage.append(nxt);
      setTimeout(() => { cur.remove(); cur = nxt; nxt.classList.remove('turn-back'); busy = false; }, 620);
    }
    at = to; sync();
  }
  // a swipe turns the page too: from left to right (towards the spine) is forward
  let sx = null;
  stage.addEventListener('pointerdown', e => { sx = e.clientX; });
  stage.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) go(dx > 0 ? 1 : -1); });
}

/* ---------- today's page at the end of a session (a second session the same day: no new sticker) ---------- */
function today(app, book, page, after) {
  freeUrls();
  KD.sound.play('done');
  app.replaceChildren(el('section', { class: 'screen today' },
    el('div', { class: 'book-stage' }, pageEl(book, page, book.pages.indexOf(page) + 1)),
    el('div', { class: 'bar' }, el('button', { class: 'btn btn-next', 'aria-label': 'next', onclick: () => { freeUrls(); after(); } }, icon('next')))));
}

KD.page = { pageEl, reader, today, stickerEl, stickerFile, freeUrls };
})(window.KD = window.KD || {});
