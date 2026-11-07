/* كرّاس الإملاء: the home screen. Her current copybook in the centre (tap to open it), a big button to start today's
   dictation, and the shelf كراريسي. Nothing else, apart from the way back to her apps and Mama's gear (held 2 seconds). */
(function (KD) {
'use strict';
const { el, icon, pic } = KD.ui;

function render(app) {
  KD.voice.stop();
  const B = KD.book;
  const cur = B ? B.current() : null;
  const back = el('a', { class: 'top-btn', href: '../', 'aria-label': 'تطبيقاتي' }, icon('home'));
  const gear = el('button', { class: 'top-btn gear', 'aria-label': 'parent' }, icon('gear'));
  KD.ui.holdToOpen(gear, 2000, () => { location.hash = '#parent'; });

  const book = el('button', { class: 'home-book', 'aria-label': 'كرّاسي', onclick: () => { KD.sound.play('page'); location.hash = '#book'; } },
    B && cur ? B.coverEl(cur) : pic('cover_purple.png', 'cover-art'));
  const start = el('button', { class: 'btn btn-start', onclick: () => { KD.sound.play('tap'); location.hash = '#session'; } }, icon('pencil'), 'ابدئي');
  const shelf = el('button', { class: 'home-shelf', 'aria-label': 'كراريسي', onclick: () => { location.hash = '#shelf'; } },
    B ? B.shelfStrip() : pic('shelf.png', 'shelf-art'));

  app.replaceChildren(el('section', { class: 'screen home' },
    el('header', { class: 'h-top' }, back, el('span', { class: 'grow' }), gear),
    el('div', { class: 'home-main' }, book, start),
    shelf));
}
KD.home = { render };
})(window.KD = window.KD || {});
