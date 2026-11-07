/* كرّاس الإملاء: the entry point and the screens' router. The page is locked (index.html sends her back) until Mama
   opens it in تطبيقات ماريا's parent area. Screens: #home, #session, #welcome (first copybook: cover colour and name),
   #book (her current copybook) or #book/N (a copybook from the shelf), #shelf, #parent. */
(function (KD) {
'use strict';
const app = document.getElementById('app');

async function boot() {
  try {
    const [, , data] = await Promise.all([KD.ui.initAssets(), KD.voice.init(), fetch('data/cards.json').then(r => r.json())]);
    KD.data = data;
    KD.E = window.KDEngine.create(data, window.KDText.clipId);
    KD.skill = id => (Array.isArray(data.skills) ? data.skills.find(s => s.id === id) : data.skills[id]) || null;
    KD.store.load();
    KD.store.save();
  } catch (e) {
    console.error(e);
    app.replaceChildren(KD.ui.el('section', { class: 'screen home' }, KD.ui.el('a', { class: 'top-btn', href: '../' }, KD.ui.icon('home'))));
    return;
  }
  window.addEventListener('hashchange', route);
  route();
}

function route() {
  const [name, arg] = (location.hash.slice(1) || 'home').split('/');
  const B = KD.book;
  // her first visit: she chooses the cover colour and writes her name before anything else
  // (after a full copybook, the next one begins when she comes back to the home screen)
  if (B && !B.current() && (name === 'home' || name === 'session')) { location.replace('#welcome'); return; }
  KD.voice.stop();
  if (name === 'session') return KD.session.start(app);
  if (name === 'welcome' && B) return B.welcome(app);
  if (name === 'book' && B) return B.open(app, arg == null ? null : Number(arg));
  if (name === 'shelf' && B) return B.shelf(app);
  if (name === 'parent' && KD.parent) return KD.parent.render(app);
  return KD.home.render(app);
}

boot();
})(window.KD = window.KD || {});
