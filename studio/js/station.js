// Station screens. Phase 1: the shared skeleton for every station; the real steps are added station by station.
import { el, art, topbar, taskCard, screen, primary } from './ui.js';
import { STATIONS, isUnlocked } from './journey.js';
import { station1Screen } from './station1.js';
import { station2Screen } from './station2.js';
import { station3Screen } from './station3.js';
import { station4Screen } from './station4.js';
import { station5Screen } from './station5.js';
import { station6Screen } from './station6.js';
import { station7Screen } from './station7.js';
import { station8Screen } from './station8.js';
import { station9Screen } from './station9.js';

export function stationScreen(app, n, sub) {
  const st = STATIONS[n - 1];
  if (!st || !isUnlocked(n)) { location.hash = 'home'; return; }
  if (n === 1) return station1Screen(app, sub);
  if (n === 2) return station2Screen(app, sub);
  if (n === 3) return station3Screen(app, sub);
  if (n === 4) return station4Screen(app, sub);
  if (n === 5) return station5Screen(app, sub);
  if (n === 6) return station6Screen(app, sub);
  if (n === 7) return station7Screen(app);
  if (n === 8) return station8Screen(app, sub);
  if (n === 9) return station9Screen(app, sub);

  const body = el('div', { class: 'empty' }, art(st.icon, { size: 120 }), el('p', {}, 'هذه المحطة تُجهَّز لكِ الآن. قريبًا!'));

  app.replaceChildren(screen(st.accent,
    topbar({ title: st.name, back: () => { location.hash = 'home'; } }),
    taskCard(st.task, 'think'),
    el('main', { class: 'work' }, body),
    el('footer', { class: 'actions' }, primary('العودة إلى الطريق', () => { location.hash = 'home'; })),
  ));
}
