// First launch: the mascot waves, Maria names it (typed or handwritten), then a short welcome.
import * as store from './store.js';
import { el, ICON, art, screen, primary, taskCard, mascotName, celebrate } from './ui.js';
import { play } from './sound.js';
import { mountInk } from './copybook.js';

export function welcomeScreen(app, step = 'name') {
  if (step === 'hello') return helloStep(app);

  let mode = 'type';
  let ink = null;
  const input = el('input', {
    class: 'field', type: 'text', maxlength: '16', dir: 'rtl', lang: 'ar',
    autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
    'aria-label': 'اسم صديقتي', placeholder: 'اكتبي الاسم هنا',
    oninput: () => refresh(),
  });
  const padHost = el('div', { class: 'pad-wrap' });
  const clearBtn = el('button', { class: 'btn', onclick: () => { play('tap'); ink?.clear(); } }, el('span', { html: ICON.trash, style: { width: '24px', height: '24px', display: 'inline-flex' } }), 'امسحي');
  const padBox = el('div', { class: 'name-card', hidden: true }, padHost, clearBtn);
  const typeBox = el('div', { class: 'name-card' }, input);

  const segType = el('button', { 'aria-pressed': 'true', onclick: () => setMode('type') }, '⌨️ أكتبه');
  const segHand = el('button', { 'aria-pressed': 'false', onclick: () => setMode('hand') }, '✍️ بخطّي');

  const go = primary('هذا اسمي', () => {
    store.update(s => {
      if (mode === 'type') { s.mascotName = input.value.trim(); s.mascotNameImg = null; }
      else { s.mascotName = ''; s.mascotNameImg = ink.inkPNG(); }
    });
    location.hash = 'welcome/hello';
  }, { disabled: true });

  function setMode(m) {
    play('tap');
    mode = m;
    segType.setAttribute('aria-pressed', String(m === 'type'));
    segHand.setAttribute('aria-pressed', String(m === 'hand'));
    typeBox.hidden = m !== 'type';
    padBox.hidden = m !== 'hand';
    if (m === 'hand' && !ink) {
      ink = mountInk(padHost, { w: 150, h: 40, top: 8, margin: 0, ruled: true, penWidth: 1.2, label: 'اكتبي الاسم بخطّك', onChange: refresh });
    }
    refresh();
  }

  function refresh() {
    go.disabled = mode === 'type' ? !input.value.trim() : !ink || ink.isEmpty();
  }

  app.replaceChildren(screen('pink',
    el('header', { class: 'topbar' }, el('h1', { class: 'title' }, 'مختبر ماريا للمال')),
    taskCard('مرحبًا! أنا صديقتكِ الجديدة. ما اسمي؟', 'wave'),
    el('main', { class: 'work' },
      el('div', { class: 'center-col' },
        el('div', { class: 'seg', role: 'group', 'aria-label': 'طريقة كتابة الاسم' }, segType, segHand),
        typeBox, padBox,
      ),
    ),
    el('footer', { class: 'actions' }, go),
  ));
}

function helloStep(app) {
  app.replaceChildren(screen('pink',
    el('header', { class: 'topbar' }, el('h1', { class: 'title' }, 'مختبر ماريا للمال')),
    el('section', { class: 'task' }, art('mascot_celebrate.png'), el('p', {}, 'أنا ', mascotName(), '! سأكون معكِ في كل خطوة.')),
    el('main', { class: 'work' },
      el('div', { class: 'center-col' },
        el('div', { class: 'card name-card' },
          art('studio_1.png', { size: 160 }),
          el('p', { class: 'big-line' }, 'هذا مختبرك. هنا تجرّبين مشاريعك، وتجعلين المال يعمل لكِ.'),
        ),
      ),
    ),
    el('footer', { class: 'actions' }, primary('هيّا نبدأ', () => {
      store.update(s => { s.setupDone = true; });
      celebrate();
      location.hash = 'home';
    })),
  ));
}
