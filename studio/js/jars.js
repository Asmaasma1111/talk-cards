// The four زجاجات after a project: amounts, the Grow machine, and the Akhira garden behind the Give jar.
// Riyals only arrive here from real profit (Station 8) or, after a loss, a gift she moves from Save to Give.
import * as store from './store.js';
import { el, ar, art, topbar, screen, primary, riyals, awardBadge, setStyle } from './ui.js';
import { play } from './sound.js';
import { JARS } from './station1.js';
import { renderPage } from './copybook.js';
import { stepper } from './station4.js';

export const JAR_COLOR = { grow: 'var(--green)', spend: 'var(--pink)', save: 'var(--yellow)', give: '#FFE7A3' };
export const growLevel = (s = store.get()) => ((s.grownTotal || 0) >= 60 ? 3 : (s.grownTotal || 0) >= 20 ? 2 : 1);

// Puts riyals into the jars and keeps the running totals the garden and the Grow machine use.
export function addToJars(amounts, why = 'profit') {
  const s = store.get();
  store.update(st => {
    for (const k of Object.keys(amounts)) st.jars[k] = Math.round(((st.jars[k] || 0) + amounts[k]) * 100) / 100;
    if (amounts.grow > 0) st.grownTotal = (st.grownTotal || 0) + amounts.grow;
    if (amounts.give > 0) {
      st.givenTotal = (st.givenTotal || 0) + amounts.give;
      st.giveLog = [...(st.giveLog || []), { at: new Date().toISOString(), amount: amounts.give, project: s.current.id, why }];
    }
  });
  if (amounts.give > 0) setTimeout(() => awardBadge('give'), 600);
}

// Four jars with their amounts, the Grow machine and a door to the garden.
export function jarsPanel() {
  const s = store.get();
  return el('div', { class: 'jars-panel' },
    el('div', { class: 'jars' }, JARS.map(j => {
      const v = s.jars[j.key] || 0;
      return el('div', { class: 'jar' + (v > 0 ? ' has' : '') },
        el('div', { class: 'glass' }, art(`jar_${j.key}_${v > 0 ? 'full' : 'empty'}.png`)),   // the full picture shows its coins
        el('h3', {}, j.name),
        el('span', { class: 'share' }, v ? riyals(v) : 'فارغة'),
        j.key === 'give' ? el('button', { class: 'btn garden-btn', onclick: () => { play('tap'); location.hash = 'garden'; } }, '🌾 حديقة الآخرة') : null);
    })),
    el('div', { class: 'card grow-card' },
      art(`grow_machine_${growLevel(s)}.png`, { alt: 'آلة النمو' }),
      el('div', {},
        el('p', { class: 'big-line' }, 'مالكِ الآن يعمل لكِ!'),
        el('p', { class: 'hint' }, `زجاجة «ينمو» تصنع مشروعك القادم. كل ما نمّيتِه حتى الآن: ${riyals(s.grownTotal || 0)}.`))));
}

export function jarsScreen(app) {
  app.replaceChildren(screen('yellow',
    topbar({ title: 'زجاجاتي', back: () => { location.hash = 'home'; } }),
    el('main', { class: 'work' }, jarsPanel()),
    el('footer', { class: 'actions' }, primary('إلى الطريق', () => { location.hash = 'home'; })),
  ));
}

// ---------- The Akhira garden ----------
// Texts to verify against a mushaf and a hadith collection before Maria uses the app (see the plan's gaps).
const AYAH = 'مَثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ فِي كُلِّ سُنبُلَةٍ مِّائَةُ حَبَّةٍ';
const HADITH = 'ما نقصت صدقة من مال';
const MAX_PLANTS = 60;
const SADAQA_PAGE = 'sadaqa-goal';

export async function gardenScreen(app) {
  const s = store.get();
  const given = Math.floor(s.givenTotal || 0);
  const seen = Math.min(s.gardenSeen || 0, given);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const goalPage = await store.getPage(SADAQA_PAGE);
  const hasGoal = !!goalPage?.strokes?.some(x => x.tool !== 'eraser');

  const shown = Math.min(given, MAX_PLANTS);
  const field = el('div', { class: 'garden-field', role: 'img', 'aria-label': `${ar(given)} نبتة في حديقتي` },
    ...Array.from({ length: shown }, (_, i) => {
      const fresh = i >= seen && !reduce;
      const p = el('div', { class: 'plant' + (fresh ? ' fresh' : ''), style: { '--d': `${(i - seen) * 250}ms` } },
        art('stalks7.png'));
      if (fresh) {
        // seed → sprout → seven ears
        p.replaceChildren(art('seed.png'));
        const delay = Math.max(0, i - seen) * 250;
        setTimeout(() => { p.replaceChildren(art('sprout.png')); }, delay + 500);
        setTimeout(() => { p.replaceChildren(art('stalks7.png')); p.classList.add('grown'); }, delay + 1100);
      }
      return p;
    }),
    given > MAX_PLANTS ? el('b', { class: 'more' }, `+${ar(given - MAX_PLANTS)}`) : null,
    !given ? el('p', { class: 'hint empty-field' }, 'كل ريال تضعينه في زجاجة «أعطي» يزرع هنا حبّة.') : null);
  store.update(st => { st.gardenSeen = given; });

  const balance = s.jars.give || 0;
  const target = s.sadaqa?.target || null;
  const goalCard = el('section', { class: 'card sadaqa' },
    el('h3', {}, 'صدقتي الجارية'),
    hasGoal
      ? el('img', { class: 'goal-img', src: renderPage(goalPage, 3), alt: 'صدقتي الجارية' })
      : el('p', { class: 'hint' }, 'سمّي شيئًا يبقى نفعه، مثل برّادة ماء.'),
    el('button', { class: 'btn', onclick: () => {
      play('tap');
      const q = new URLSearchParams({ title: 'صدقتي الجارية', back: 'garden', accent: 'yellow', size: 'card', task: 'اكتبي الصدقة الجارية التي تجمعين لها.' });
      location.hash = `copybook/${SADAQA_PAGE}?${q}`;
    } }, hasGoal ? 'عدّلي' : 'اكتبيها'),
    hasGoal ? el('div', { class: 'target' },
      el('span', {}, 'هدفي:'),
      stepper({ value: (target || 50) / 10, min: 1, max: 100, label: 'هدف الصدقة', format: (v) => riyals(v * 10),
        onChange: (v) => { store.update(st => { st.sadaqa = { target: v * 10 }; }); bar(); } })) : null,
    hasGoal ? el('div', { class: 'goal' }, el('span', { class: 'bar' }, el('span', { class: 'fill' })), el('span', { class: 'goal-line' })) : null);
  function bar() {
    const t = store.get().sadaqa?.target || 50;
    const fill = goalCard.querySelector('.fill'), line = goalCard.querySelector('.goal-line');
    if (!fill) return;
    setStyle(fill, { width: Math.min(100, Math.round(balance / t * 100)) + '%' });
    line.textContent = `في زجاجة «أعطي» ${riyals(balance)} من ${riyals(t)}`;
  }
  if (hasGoal && !target) store.update(st => { st.sadaqa = { target: 50 }; });

  app.replaceChildren(screen('green',
    topbar({ title: 'حديقة الآخرة', back: () => { location.hash = 'jars'; } }),
    el('main', { class: 'work garden' },
      el('div', { class: 'garden-scene' }, art('garden_bg.png', { cls: 'garden-bg' }), field),
      el('div', { class: 'garden-side' },
        el('blockquote', { class: 'card ayah' }, el('p', { lang: 'ar' }, `﴿${AYAH}﴾`), el('cite', {}, 'سورة البقرة، الآية ٢٦١')),
        el('blockquote', { class: 'card hadith' }, el('p', {}, `«${HADITH}»`), el('cite', {}, 'رواه مسلم (٢٥٨٨)')),
        el('p', { class: 'hint barakah' }, 'البركة قد تكون سعادة، أو صديقًا، أو فكرة جميلة، وليس مالًا فقط.'),
        goalCard)),
    el('footer', { class: 'actions' }, primary('زجاجاتي', () => { location.hash = 'jars'; })),
  ));
  bar();
}
