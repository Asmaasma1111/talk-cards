// Station 1, هدفي (My goal): the four jar jobs → the "why" sentence in the copybook → split 12 coins into jars.
import * as store from './store.js';
import { el, ar, art, topbar, taskCard, screen, primary, ICON, award, celebrate } from './ui.js';
import { play } from './sound.js';
import { createDnD } from './dnd.js';
import { renderPage } from './copybook.js';

const ACCENT = 'pink';
const STEPS = ['jobs', 'why', 'split', 'done'];
export const SHARES = 12;

// Order on screen follows the brief: Grow, Spend, Save, Give.
export const JARS = [
  { key: 'grow', name: 'ينمو', job: 'يصنع مشروعي القادم: موادّ وأدوات.' },
  { key: 'spend', name: 'أنفق', job: 'لشيء أختاره ويُفرحني.' },
  { key: 'save', name: 'أدّخر', job: 'وسادة أمان صغيرة.' },
  { key: 'give', name: 'أعطي', job: 'صدقة، أدّخرها للآخرة.' },
];

// Fraction words she knows from school, shown under a jar when they fit.
const FRACTION = { 2: 'السُّدس', 3: 'الرُّبع', 4: 'الثُّلث', 6: 'النِّصف', 8: 'الثُّلثان', 9: 'ثلاثة أرباع' };

function data() {
  const p = store.get().current;
  if (!p.data.s1) p.data.s1 = { step: 'jobs', split: { grow: 3, spend: 3, save: 3, give: 3 }, starWhy: false };
  return p.data.s1;
}
const whyPageId = () => `${store.get().current.id}-s1-why`;
const WHY_TITLE = 'أحتاج ___ ريالًا لكي ___.';

function go(step) { location.hash = 'station/1/' + step; }

function frame(step, task, pose, body, footer) {
  return screen(ACCENT,
    topbar({ title: 'هدفي', back: () => { location.hash = 'home'; }, step: [STEPS.indexOf(step) + 1, STEPS.length] }),
    taskCard(task, pose),
    el('main', { class: 'work' }, body),
    el('footer', { class: 'actions' }, ...footer),
  );
}

export function station1Screen(app, step) {
  const d = data();
  if (!STEPS.includes(step)) step = d.step;
  // Steps open in order; she can always go back to an earlier one.
  if (STEPS.indexOf(step) > STEPS.indexOf(d.step)) step = d.step;
  ({ jobs, why, split, done })[step](app, d);
}

function advance(d, next) {
  store.update(() => { if (STEPS.indexOf(next) > STEPS.indexOf(d.step)) d.step = next; });
  go(next);
}

// 1. Four jobs for every riyal (read-only cards).
function jobs(app, d) {
  app.replaceChildren(frame('jobs', 'لماذا تحتاجين المال؟ اختاري عمل كل ريال.', 'think',
    el('div', { class: 'jobs' }, JARS.map(j => el('div', { class: 'job' },
      art(`jar_${j.key}_empty.png`), el('h3', {}, j.name), el('p', {}, j.job)))),
    [primary('فهمتُ', () => advance(d, 'why'))],
  ));
}

// 2. The "why" sentence, handwritten in the copybook.
async function why(app, d) {
  const page = await store.getPage(whyPageId());
  const written = !!page?.strokes?.some(s => s.tool !== 'eraser');
  const open = () => {
    location.hash = `copybook/${whyPageId()}?title=${encodeURIComponent(WHY_TITLE)}&back=station/1/why&accent=${ACCENT}`;
  };
  const body = el('div', { class: 'center-col' },
    el('div', { class: 'card name-card' },
      written ? el('img', { class: 'why-thumb', src: renderPage(page, 4), alt: 'جملتي في الدفتر' })
              : el('p', { class: 'big-line' }, WHY_TITLE),
      el('button', { class: 'btn', onclick: () => { play('tap'); open(); } },
        el('span', { html: ICON.book, style: { width: '28px', height: '28px', display: 'inline-flex' } }),
        written ? 'عدّلي جملتي' : 'افتحي دفتري'),
    ),
  );
  app.replaceChildren(frame('why', written ? 'جميل! هذا سبب مشروعك.' : 'أكملي الجملة في دفترك.', 'write', body, [
    primary('التالي', () => {
      if (!d.starWhy) { store.update(() => { d.starWhy = true; }); award(1); }
      advance(d, 'split');
    }, { disabled: !written }),
  ]));
}

// 3. Drag 12 coins into the four jars. Default 3 each; Give can never be emptied.
function split(app, d) {
  const counts = { ...d.split, pile: SHARES - Object.values(d.split).reduce((a, b) => a + b, 0) };
  const note = el('p', { class: 'note', role: 'status', 'aria-live': 'polite' });
  const pile = el('div', { class: 'pile', 'aria-label': 'كومة العملات' });
  const jarEls = {};
  let hidden = null; // the jar/pile whose top coin is currently lifted

  const undoBtn = el('button', { class: 'btn side', disabled: true, onclick: () => dnd.undo() },
    el('span', { html: ICON.undo, style: { width: '28px', height: '28px', display: 'inline-flex' } }), 'تراجع');
  const doneBtn = primary('هذا تقسيمي', () => {
    store.update(() => { d.split = { grow: counts.grow, spend: counts.spend, save: counts.save, give: counts.give }; });
    advance(d, 'done');
  });

  const dnd = createDnD({
    sound: 'coin',
    accepts: (from, to) => from !== to,
    onDrop(from, to) {
      if (from === 'give' && counts.give <= 1) return false;
      counts[from]--; counts[to]++;
      render();
      return () => { counts[to]--; counts[from]++; render(); };
    },
    onHistory: (n) => { undoBtn.disabled = n === 0; },
  });

  function source(el, key) {
    dnd.draggable(el, {
      data: key,
      ghost: () => art('coin.png', { cls: 'coin-token' }),
      canPick: () => {
        if (counts[key] === 0) return false;
        if (key === 'give' && counts.give <= 1) return false;
        return true;
      },
      onDeny: () => {
        if (key === 'give' && counts.give <= 1) {
          note.textContent = 'الصدقة دائمًا جزء من النمو.';
          el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
        }
      },
      onLift: () => { hidden = key; render(); },
      onDone: () => { hidden = null; render(); },
    });
    dnd.zone(el, key);
  }

  function coinsFor(key) {
    const n = counts[key] - (hidden === key ? 1 : 0);
    return Array.from({ length: Math.max(0, n) }, () => art('coin.png'));
  }

  function render() {
    pile.replaceChildren(...(counts.pile - (hidden === 'pile' ? 1 : 0) > 0
      ? coinsFor('pile').map(c => { c.classList.add('coin-token'); return c; })
      : [el('span', { class: 'hint' }, 'كل العملات في الزجاجات. اسحبي عملة إلى هنا لتغيّري.')]));
    for (const j of JARS) {
      const box = jarEls[j.key];
      box.querySelector('.coins').replaceChildren(...coinsFor(j.key));
      box.querySelector('.share').textContent = `${ar(counts[j.key])} من ${ar(SHARES)}`;
      box.querySelector('.frac').textContent = FRACTION[counts[j.key]] || '';
      box.setAttribute('aria-label', `${j.name}: ${ar(counts[j.key])} من ${ar(SHARES)}`);
    }
    if (counts.give > 1 && note.textContent) note.textContent = '';
    doneBtn.disabled = counts.pile > 0;
  }

  const jars = el('div', { class: 'jars' }, JARS.map(j => {
    const box = el('div', { class: 'jar', role: 'button' },
      el('div', { class: 'glass' }, art(`jar_${j.key}_empty.png`), el('div', { class: 'coins' })),
      el('h3', {}, j.name),
      el('span', { class: 'share' }),
      el('span', { class: 'frac' }),
    );
    jarEls[j.key] = box;
    return box;
  }));

  app.replaceChildren(frame('split', 'اسحبي العملات إلى الزجاجات. كل عملة جزء من كل ريال.', 'think',
    el('div', { class: 'split' }, pile, jars, note),
    [undoBtn, doneBtn],
  ));
  source(pile, 'pile');
  for (const j of JARS) source(jarEls[j.key], j.key);
  render();
}

// 4. Done: a star, the summary, back to the path.
function done(app, d) {
  const p = store.get().current;
  const first = !p.stationsDone.includes(1);
  if (first) {
    store.update(s => { s.current.stationsDone.push(1); });
  }
  const body = el('div', { class: 'center-col' },
    el('p', { class: 'big-line' }, 'لكل ريال عمل الآن!'),
    el('div', { class: 'summary' }, JARS.map(j => el('div', { class: 'jar' },
      el('div', { class: 'glass' }, art(`jar_${j.key}_empty.png`),
        el('div', { class: 'coins' }, Array.from({ length: d.split[j.key] }, () => art('coin.png')))),
      el('h3', {}, j.name),
      el('span', { class: 'share' }, `${ar(d.split[j.key])} من ${ar(SHARES)}`),
    ))),
    el('button', { class: 'btn', onclick: () => { play('tap'); go('split'); } }, 'غيّري التقسيم'),
  );
  app.replaceChildren(frame('done', 'أحسنتِ! أنهيتِ محطة «هدفي».', 'celebrate', body, [
    primary('إلى الطريق', () => { location.hash = 'home'; }),
  ]));
  if (first) { celebrate(); award(1); }
}
