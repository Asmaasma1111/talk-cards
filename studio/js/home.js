// Home screen: the journey path with nine stations.
import * as store from './store.js';
import { el, ar, art, assetOk, starsPill, soundBtn, primary, toast, iconBtn } from './ui.js';
import { play } from './sound.js';
import { STATIONS, SPOTS, SPOTS_PORTRAIT, statusOf, currentStation, studioLevel } from './journey.js';

const portraitMQ = matchMedia('(orientation: portrait)');

const JARS = [
  ['grow', 'ينمو', '#7CCB8B'],
  ['spend', 'أنفق', '#F7A8C4'],
  ['save', 'أدّخر', '#FFD966'],
  ['give', 'أعطي', '#FFF8EC'],
];

// Soft hills and a winding path, used until home_bg.png arrives.
function placeholderBg(spots, W, H) {
  const P = spots.map(([x, y]) => [x * W / 100, y * H / 100]);
  const t = (n) => n * W / 400; // keep stroke widths the same in both shapes
  const q = (a, b, dy) => `Q ${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2 + dy} ${b[0]} ${b[1]}`;
  const d = [
    `M ${P[0][0] + t(40)} ${P[0][1] - t(10)} L ${P[0][0]} ${P[0][1]}`,
    q(P[0], P[1], t(10)), q(P[1], P[2], t(-10)),
    `C ${P[2][0] - t(56)} ${P[2][1]} ${P[3][0] - t(56)} ${P[3][1]} ${P[3][0]} ${P[3][1]}`,
    q(P[3], P[4], t(10)), q(P[4], P[5], t(-10)),
    `C ${P[5][0] + t(56)} ${P[5][1]} ${P[6][0] + t(56)} ${P[6][1]} ${P[6][0]} ${P[6][1]}`,
    q(P[6], P[7], t(10)), q(P[7], P[8], t(-10)),
  ].join(' ');
  return el('div', { class: 'bg', html: `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFF8EC"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#sky)"/>
      <circle cx="${W * .86}" cy="${H * .1}" r="${t(16)}" fill="#FFD966" opacity=".55"/>
      <g transform="scale(${W / 400} ${H / 300})">
        <path d="M0 120 C 80 90 160 110 220 100 S 340 80 400 100 V300 H0z" fill="#7CCB8B" opacity=".14"/>
        <path d="M0 190 C 90 160 180 200 260 180 S 360 160 400 175 V300 H0z" fill="#7CCB8B" opacity=".18"/>
        <path d="M0 250 C 100 230 200 262 300 245 S 380 236 400 240 V300 H0z" fill="#FFD966" opacity=".22"/>
      </g>
      <path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="${t(18)}" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="#F7A8C4" stroke-width="${t(2.5)}" stroke-dasharray="${t(2)} ${t(9)}" stroke-linecap="round" opacity=".9"/>
    </svg>` });
}

export function homeScreen(app) {
  const s = store.get();
  const cur = currentStation();

  const portrait = portraitMQ.matches;
  const spots = portrait ? SPOTS_PORTRAIT : SPOTS;
  const map = el('div', { class: 'map' + (portrait ? ' portrait' : '') },
    portrait ? placeholderBg(spots, 300, 400) : placeholderBg(spots, 400, 300));
  const bgFile = portrait ? 'home_bg_portrait.png' : 'home_bg.png';
  assetOk(bgFile).then(ok => {
    if (ok) map.querySelector('.bg').replaceChildren(el('img', { src: 'assets/' + bgFile, alt: '' }));
  });

  STATIONS.forEach((st, i) => {
    const status = statusOf(st.n);
    const [x, y] = spots[i];
    const node = el('button', {
      class: `station ${status}`,
      'data-accent': st.accent,
      style: { left: x + '%', top: y + '%' },
      'aria-label': `${st.name}${status === 'done' ? '، انتهت' : status === 'locked' ? '، مقفلة' : ''}`,
      onclick: () => {
        if (status === 'locked') { play('tap'); toast('أكملي المحطة التي قبلها أولًا.'); return; }
        play('tap');
        location.hash = 'station/' + st.n;
      },
    },
      el('span', { class: 'disc' },
        art(st.icon, { size: 96 }),
        status === 'done' ? el('span', { class: 'badge' }, '✓') : null,
        status === 'locked' ? el('span', { class: 'badge' }, '🔒') : null,
      ),
      el('span', { class: 'label' }, st.name),
    );
    map.append(node);
  });

  const studio = el('div', { class: 'studio-thumb', 'aria-label': 'الاستوديو' }, art(`studio_${studioLevel()}.png`));
  const jars = el('button', { class: 'jars-mini', 'aria-label': 'زجاجاتي', onclick: () => { play('tap'); location.hash = 'jars'; } },
    JARS.map(([k, name, c]) => el('span', { class: 'j', title: name },
      el('i', { class: 'dot', style: { '--c': c } }),
      el('b', {}, ar(s.jars[k])),
    )));

  const curSt = STATIONS[cur - 1];
  const view = el('div', { class: 'screen home', 'data-accent': curSt.accent },
    el('header', { class: 'topbar' },
      // back to تطبيقات ماريا, like the «تطبيقاتي» chip on every one of her apps
      el('button', { class: 'apps-chip', onclick: () => { play('tap'); location.href = '../'; } }, el('span', { 'aria-hidden': 'true' }, '🏠'), 'تطبيقاتي'),
      studio,
      el('h1', { class: 'project-name' }, s.current.name),
      el('div', { class: 'spacer' }),
      jars,
      starsPill(),
      soundBtn(),
      iconBtn('gallery', 'معرض مشاريعي', () => { location.hash = 'gallery'; }),
      iconBtn('lock', 'ركن الأهل', () => { location.hash = 'parent'; }),
    ),
    el('main', { class: 'map-wrap' }, map),
    el('footer', { class: 'actions' },
      el('button', { class: 'btn side', onclick: () => { play('tap'); location.hash = 'next-projects'; } }, '📝 مشاريعي القادمة'),
      primary('خطوتي التالية', () => { location.hash = 'station/' + cur; }),
    ),
  );
  app.replaceChildren(view);
}

// Redraw the path when the iPad turns.
portraitMQ.addEventListener('change', () => {
  if (location.hash.replace('#', '').split('?')[0] === 'home') homeScreen(document.getElementById('app'));
});
