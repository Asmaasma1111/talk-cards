/* كرّاس الإملاء: the sticker of the day. Once a day, at the end of her first finished session, three stickers (from the
   60 made in ChatGPT, sticker_01.png ... sticker_60.png, offered in a random order, none twice until all have been offered)
   wait in a small tray beside today's page. She drags one anywhere on the page; it can be moved until she taps the tick,
   then it stays there for good. */
(function (KD) {
'use strict';
const { el, icon, pic, hasPic } = KD.ui;
const COUNT = 60;
// only stickers already made (in files.json) are offered, so she never sees an empty box while the rest are being drawn
const made = () => { const m = []; for (let n = 1; n <= COUNT; n++) if (hasPic(KD.page.stickerFile(n))) m.push(n); return m.length >= 3 ? m : Array.from({ length: COUNT }, (_, i) => i + 1); };

function offer() {
  const b = KD.store.get().book;
  const all = made();
  let left = all.filter(n => !b.seenStickers.includes(n));
  if (left.length < 3) { b.seenStickers = b.seenStickers.filter(n => !all.includes(n)); left = all.slice(); }
  const three = [];
  while (three.length < 3) { const n = left.splice(Math.floor(Math.random() * left.length), 1)[0]; three.push(n); }
  b.seenStickers.push(...three);
  KD.store.save();
  return three;
}

function choose(app, book, page, after) {
  KD.page.freeUrls();
  const end = KD.data.end;
  KD.sound.play('done');
  KD.voice.say([{ pause: 500 }, { id: end.audio, text: end.text }]);
  if (!page._offer) { page._offer = offer(); KD.store.save(); }   // the same three if she comes back to this screen today
  const three = page._offer;
  const sheet = KD.page.pageEl(book, page, book.pages.indexOf(page) + 1);
  const tray = el('div', { class: 'st-tray' });
  const tick = el('button', { class: 'btn btn-yes', 'aria-label': '✓', hidden: true }, icon('tick'));
  let placed = null;              // { n, node, x, y }
  three.forEach(n => {
    const s = el('div', { class: 'st-pick' + (n % 10 === 0 ? ' sparkly' : ''), 'data-n': n }, pic(KD.page.stickerFile(n), 'st-art'));
    tray.append(s); drag(s, n);
  });
  app.replaceChildren(el('section', { class: 'screen today sticker-time' },
    el('div', { class: 'sticker-main' }, el('div', { class: 'book-stage' }, sheet), tray),
    el('div', { class: 'bar' }, tick)));

  // drag from the tray onto the page, or move it on the page
  function drag(node, n) {
    node.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { node.setPointerCapture(e.pointerId); } catch (err) {}
      const r = node.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
      node.classList.add('lifting');
      const move = ev => { node.style.position = 'fixed'; node.style.left = (ev.clientX - ox) + 'px'; node.style.top = (ev.clientY - oy) + 'px'; node.style.width = r.width + 'px'; };
      const up = ev => {
        node.removeEventListener('pointermove', move); node.removeEventListener('pointerup', up); node.removeEventListener('pointercancel', up);
        node.classList.remove('lifting');
        const pr = sheet.getBoundingClientRect(), w = r.width;
        const cx = ev.clientX - ox + w / 2, cy = ev.clientY - oy + w / 2;
        const onPage = cx > pr.left && cx < pr.right && cy > pr.top && cy < pr.bottom;
        node.style.position = ''; node.style.left = ''; node.style.top = ''; node.style.width = '';
        if (!onPage) { if (placed && placed.node === node) { tray.append(node); node.className = node.className.replace(' p-sticker', ''); placed = null; tick.hidden = true; } return; }
        if (placed && placed.node !== node) tray.append(placed.node), placed.node.classList.remove('p-sticker');   // only one a day
        const x = Math.max(0, Math.min(86, (cx - pr.left) / pr.width * 100 - 7)), y = Math.max(0, Math.min(88, (cy - pr.top) / pr.height * 100 - 6));
        node.classList.add('p-sticker'); node.style.left = x + '%'; node.style.top = y + '%';
        sheet.append(node); placed = { n, node, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
        KD.sound.play('drop'); tick.hidden = false;
      };
      node.addEventListener('pointermove', move); node.addEventListener('pointerup', up); node.addEventListener('pointercancel', up);
    });
  }
  tick.addEventListener('click', () => {
    if (!placed) return;
    page.sticker = { n: placed.n, x: placed.x, y: placed.y };
    delete page._offer;
    KD.store.get().book.stickerDays[page.day] = placed.n;
    KD.store.save();
    KD.sound.play('good');
    placed.node.classList.add('stuck');
    tick.replaceWith(el('button', { class: 'btn btn-next', 'aria-label': 'next', onclick: () => { KD.voice.stop(); KD.page.freeUrls(); after(); } }, icon('next')));
    tray.replaceChildren();
  });
}

KD.sticker = { choose, offer, COUNT };
})(window.KD = window.KD || {});
