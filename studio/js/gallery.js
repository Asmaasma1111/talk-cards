// معرض مشاريعي: every finished project, "with their copybook pages, photos, sales and jar results"
// (brief, Station 9), plus its project statement (8d). Pages and photos stay in IndexedDB under the project id.
import * as store from './store.js';
import { el, ar, art, topbar, screen, primary, riyals, copiesWord, BADGES } from './ui.js';
import { play } from './sound.js';
import { renderPage, printWith } from './copybook.js';
import { JARS } from './station1.js';
import { statementSheet } from './station8.js';

const dateWord = (iso) => {
  try { return new Date(iso).toLocaleDateString('ar-u-nu-arab-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch (e) { return ''; }
};
const hasInk = (pg) => !!pg?.strokes?.some(s => s.tool !== 'eraser');

async function pagesOf(id) {
  const all = await store.allPages();
  return all.filter(p => p.id.startsWith(id + '-'));
}

function view(src, alt) {
  const scrim = el('div', { class: 'scrim', onclick: () => scrim.remove() },
    el('div', { class: 'photo-view' },
      el('img', { src, alt }),
      el('button', { class: 'btn', onclick: () => { play('tap'); scrim.remove(); } }, 'إغلاق')));
  document.body.append(scrim);
}

export async function galleryScreen(app, id) {
  if (id) return projectScreen(app, id);
  const list = [...(store.get().gallery || [])].reverse();
  const covers = await Promise.all(list.map(async g => {
    const pages = await pagesOf(g.id);
    return pages.find(p => p.photo && p.id.includes('-photo-'))?.photo || pages.find(p => p.photo)?.photo || null;
  }));
  app.replaceChildren(screen('pink',
    topbar({ title: 'معرض مشاريعي', back: () => { location.hash = 'home'; } }),
    el('main', { class: 'work' },
      list.length
        ? el('div', { class: 'gallery-grid' }, list.map((g, i) => el('button', { class: 'card g-card', onclick: () => { play('tap'); location.hash = 'gallery/' + g.id; } },
          covers[i] ? el('img', { src: covers[i], alt: '' }) : el('span', { class: 'big', 'aria-hidden': 'true' }, '📘'),
          el('b', {}, g.name),
          el('small', {}, dateWord(g.finishedAt)),
          el('div', { class: 'g-badges' }, (g.badges || []).map(b => BADGES[b] ? art(BADGES[b].file, { size: 40, alt: BADGES[b].name }) : null)))))
        : el('div', { class: 'empty' }, art('mascot_wave.png'), el('p', {}, 'عندما تُنهين مشروعًا، يظهر هنا.'))),
    el('footer', { class: 'actions' }, primary('إلى الطريق', () => { location.hash = 'home'; })),
  ));
}

async function projectScreen(app, id) {
  const g = (store.get().gallery || []).find(x => x.id === id);
  if (!g) { location.hash = 'gallery'; return; }
  const pages = await pagesOf(id);
  const written = pages.filter(hasInk).filter(p => !p.id.endsWith('-poster-ink'));
  const photos = pages.filter(p => p.photo);
  const s7 = g.data?.s7, s8 = g.data?.s8;

  const section = (title, ...body) => el('section', { class: 'card g-section' }, el('h3', {}, title), ...body);

  const pagesSec = section('📒 صفحات دفتري',
    written.length
      ? el('div', { class: 'g-thumbs' }, written.map(p => {
        const src = renderPage(p, 3);
        return el('button', { class: 'g-thumb', onclick: () => { play('tap'); view(renderPage(p, 8), p.title || 'صفحة'); } }, el('img', { src, alt: p.title || 'صفحة' }));
      }))
      : el('p', { class: 'hint' }, 'لا توجد صفحات.'));

  const photosSec = section('📷 صوري',
    photos.length
      ? el('div', { class: 'g-thumbs' }, photos.map(p => el('button', { class: 'g-thumb photo', onclick: () => { play('tap'); view(p.photo, 'صورة'); } }, el('img', { src: p.photo, alt: 'صورة' }))))
      : el('p', { class: 'hint' }, 'لا توجد صور.'));

  const sold = (k) => (s7?.sales || []).filter(x => x.kind === k).length;
  const gifts = (s7?.gifts || []).filter(x => x.kind === 'gift').length;
  const disc = (s7?.gifts || []).filter(x => x.kind === 'discount').reduce((a, x) => a + x.amount, 0);
  const salesSec = section('🏪 مبيعاتي',
    el('div', { class: 'g-facts' },
      fact('📘 نسخ ورقية', copiesWord(sold('print'))),
      fact('🌐 نسخ رقمية', copiesWord(sold('digital'))),
      fact('🎁 هدايا', gifts ? copiesWord(gifts) : '٠'),
      fact('🏷️ خصومات', disc ? riyals(disc) : '٠')));

  const jarsSec = section('🫙 زجاجاتي من هذا المشروع',
    s8?.dist
      ? el('div', { class: 'g-facts' }, JARS.map(j => fact(j.name, s8.dist[j.key] > 0 ? riyals(s8.dist[j.key]) : s8.dist[j.key] < 0 ? `خرج ${riyals(-s8.dist[j.key])}` : '٠')))
      : el('p', { class: 'hint' }, 'لم يُوزَّع ربح على الزجاجات.'));

  const st = s8?.statement;
  const stSec = st ? section('🧾 كشف حساب مشروعي', statementSheet(st),
    el('button', { class: 'btn', onclick: () => { play('tap'); printWith([el('div', { class: 'sheet statement-print' }, statementSheet(st))]); } }, 'اطبعي الكشف')) : null;

  const badgesSec = section('🏅 شاراتي',
    (g.badges || []).length
      ? el('div', { class: 'g-badges big' }, g.badges.map(b => BADGES[b] ? el('div', { class: 'g-badge' }, art(BADGES[b].file, { size: 72 }), el('small', {}, BADGES[b].name)) : null))
      : el('p', { class: 'hint' }, 'لا توجد شارات.'));

  app.replaceChildren(screen('pink',
    topbar({ title: g.name, back: () => { location.hash = 'gallery'; } }),
    el('main', { class: 'work' }, el('div', { class: 'g-detail' },
      el('p', { class: 'hint' }, `من ${dateWord(g.startedAt)} إلى ${dateWord(g.finishedAt)}`),
      badgesSec, salesSec, jarsSec, stSec, pagesSec, photosSec)),
    el('footer', { class: 'actions' }, primary('معرض مشاريعي', () => { location.hash = 'gallery'; })),
  ));
}

function fact(k, v) {
  return el('div', { class: 'g-fact' }, el('span', {}, k), el('b', {}, v));
}
