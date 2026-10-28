// Entry point: load saved data, route by URL hash, register the offline worker.
import * as store from './store.js';
import { homeScreen } from './home.js';
import { welcomeScreen } from './welcome.js';
import { copybookScreen } from './copybook.js';
import { stationScreen } from './station.js';
import { nextProjectsScreen } from './projects.js';
import { jarsScreen, gardenScreen } from './jars.js';
import { parentScreen } from './parent.js';
import { galleryScreen } from './gallery.js';
import { toast } from './ui.js';

store.load();
const app = document.getElementById('app');
let cleanup = null;

async function route() {
  try { cleanup?.(); } catch (e) { /* ignore */ }
  cleanup = null;
  document.querySelectorAll('.menu-scrim, .scrim').forEach(n => n.remove());

  const [path, query = ''] = location.hash.slice(1).split('?');
  const parts = path.split('/').filter(Boolean);
  const q = Object.fromEntries(new URLSearchParams(query));
  const s = store.get();

  if (!s.setupDone && parts[0] !== 'welcome') { location.replace('#welcome'); return; }

  switch (parts[0]) {
    case 'welcome': welcomeScreen(app, parts[1]); break;
    case 'station': { const r = await stationScreen(app, Number(parts[1]), parts[2]); cleanup = typeof r === 'function' ? r : null; break; }
    case 'copybook': cleanup = await copybookScreen(app, { id: parts[1], ...q }); break;
    case 'next-projects': await nextProjectsScreen(app); break;
    case 'jars': jarsScreen(app); break;
    case 'parent': await parentScreen(app); break;
    case 'gallery': await galleryScreen(app, parts[1]); break;
    case 'garden': await gardenScreen(app); break;
    case 'home': homeScreen(app); break;
    default: location.replace('#home');
  }
}

window.addEventListener('hashchange', route);
document.fonts?.ready.then(route) ?? route();

// Warn once if the iPad refuses to save (private browsing, storage full).
if (!store.save()) toast('تنبيه: لا يمكن الحفظ على هذا الجهاز.');

// Offline: تطبيقات ماريا's sw.js (one folder up) caches the studio's files too, so the studio registers no worker of its own.

// Small helper for testing from the browser console.
window.studio = {
  store,
  demo(doneUpTo = 0, opts = {}) {
    store.update(s => {
      s.setupDone = true;
      s.mascotName = s.mascotName || 'مَرشملو';
      s.current.stationsDone = Array.from({ length: doneUpTo }, (_, i) => i + 1);
      s.current.firstSaleAt = opts.sale ? new Date().toISOString() : null;
      if (opts.stars != null) s.stars = opts.stars;
      if (opts.jars) s.jars = opts.jars;
    });
    route();
  },
  reset() { store.resetAll(); location.hash = 'welcome'; route(); },
};
