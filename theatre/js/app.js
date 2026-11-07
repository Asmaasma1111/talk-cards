/* مسرح المسائل: home, the day's stories, and Mama's view (hold the gear for 2 seconds).
   The day's plan is made once a day (TH.core.plan) and kept in mariaTheatre.v1 so it never changes under her. */
(function (TH) {
'use strict';
const C = TH.core, U = TH.ui, S = TH.store, { el } = U;
const STAGES = [1, 2, 3];         // the stages whose screens are built; 4 to 6 come with their pictures
let BANK = null;
const app = () => document.getElementById('app');

function todayPlan() {
  const st = S.get(), day = S.today();
  if (st.days[day] && Array.isArray(st.days[day].ids)) return st.days[day];
  const p = C.plan(BANK, st, day, st.perDay, STAGES);
  if (p.introduce && !st.met.includes(p.introduce)) st.met.push(p.introduce);
  if (p.ids.length) { st.lastKind = p.kind; if (p.twin) st.twinNext = (st.twinNext || 0) + 1; }
  st.stage = p.stage;
  st.days[day] = { ids: p.ids, i: 0, kind: p.kind, twin: p.twin || null, stars: 0 };
  S.save();
  return st.days[day];
}
// step 2 (numbers onto drawn bars) for the first two stories of a shape and for the twins; then step 3 (she builds them)
function stepFor(story) {
  if (story.pair) return 2;
  const st = S.get();
  const n = BANK.stories.filter(s => s.shape === story.shape && st.done[s.id] && st.done[s.id].n).length;
  return n < 2 ? 2 : 3;
}

function home() {
  U.stop();
  const st = S.get(), d = todayPlan();
  const total = d.ids.length, left = total - d.i;
  const gear = el('button', { class: 'top-btn gear', type: 'button', 'aria-label': 'ماما' }, U.icon('gear'));
  const mute = el('button', { class: 'top-btn', type: 'button', 'aria-label': 'الصوت' }, U.icon(st.muted ? 'mute' : 'sound'));
  const back = el('a', { class: 'chip-home', href: '../' }, U.icon('home'), 'تطبيقاتي');
  const dots = el('div', { class: 'day-dots' }, ...d.ids.map((id, i) => el('i', { class: i < d.i ? 'on' : '' })));
  const go = el('button', { class: 'btn btn-start', type: 'button' }, d.i ? 'أكملي' : 'ابدئي');
  const doneMsg = el('p', { class: 'home-done' }, 'أحسنتِ! انتهت قصص اليوم.');
  const stage = el('div', { class: 'theatre' },
    el('div', { class: 'wall-stars' }), el('div', { class: 'beam l' }), el('div', { class: 'beam r' }), el('div', { class: 'spot' }),
    el('div', { class: 'stage-floor' }), el('div', { class: 'lights' }),
    el('h1', { class: 'home-title' }, 'مسرح المسائل'),
    el('div', { class: 'curtain l' }), el('div', { class: 'curtain r' }), el('div', { class: 'tie l' }), el('div', { class: 'tie r' }),
    el('div', { class: 'valance' }), ...[8, 33, 58, 83].map(x => el('span', { class: 'tassel', style: { left: x + '%', animationDelay: (-x / 30) + 's' } })));
  // the ChatGPT clay stage and curtain, once their pictures are in assets/stage/
  if (U.hasPic('stage/stage.webp')) {
    stage.classList.add('pic'); stage.style.setProperty('--stage', 'url(assets/stage/stage.webp)');
    if (U.hasPic('stage/curtain.webp')) stage.style.setProperty('--curtain', 'url(assets/stage/curtain.webp)'); else stage.classList.remove('pic');
  }
  const body = total ? (left > 0 ? go : doneMsg) : el('p', { class: 'home-done' }, 'قصص جديدة قريبًا.');
  const screen = el('section', { class: 'screen home', dir: 'rtl' },
    el('header', { class: 'h-top' }, back, el('span', { class: 'stars' }, '⭐ ', C.ar(st.stars || 0)), mute, gear),
    stage, el('div', { class: 'home-foot' }, total ? dots : null, body));
  app().textContent = ''; app().append(screen);
  setTimeout(() => { stage.classList.add('open'); U.sound('curtain'); }, 450);
  go.addEventListener('click', () => { U.sound('curtain'); stage.classList.add('closing'); setTimeout(next, 750); });
  mute.addEventListener('click', () => { st.muted = !st.muted; S.save(); U.stop(); home(); });
  U.holdToOpen(gear, 2000, parent);
}

function next() {
  const st = S.get(), d = todayPlan();
  if (d.i >= d.ids.length) { dayDone(); return; }
  const story = C.byId(BANK, d.ids[d.i]);
  TH.story.run(app(), story, {
    met: st.met, step: stepFor(story),
    onQuit: home,
    onDone(r) {
      const old = st.done[story.id] || { n: 0 };
      st.done[story.id] = { n: old.n + 1, last: S.today(), first: old.first || S.today(), act: r.actTries || 0, kind: r.kindTries || 0, sent: r.tries || 0, ans: r.wrong || 0 };
      d.i++; d.stars = (d.stars || 0) + 1; st.stars = (st.stars || 0) + 1;
      S.save(); next();
    }
  });
}
function dayDone() {
  const st = S.get(), d = todayPlan();
  const ok = el('button', { class: 'btn btn-next big', type: 'button' }, U.icon('home'));
  app().textContent = '';
  app().append(el('section', { class: 'screen day-done', dir: 'rtl' },
    el('div', { class: 'dd-stars' }, ...Array.from({ length: d.ids.length }, () => el('span', {}, '⭐'))),
    el('h2', {}, 'أحسنتِ! انتهت قصص اليوم.'),
    el('p', {}, `معكِ ${C.ar(st.stars)} نجمة.`), ok));
  TH.story.starBurst(app());
  ok.addEventListener('click', home);
}

/* ---------- Mama's view (English, as in her other parent areas) ---------- */
async function parent() {
  U.stop();
  const st = S.get(), d = todayPlan();
  const per = s => BANK.stories.filter(x => x.stage === s);
  const doneIn = s => per(s).filter(x => st.done[x.id]).length;
  const close = el('button', { class: 'top-btn', type: 'button', 'aria-label': 'Close' }, U.icon('close'));
  const rows = [1, 2, 3, 4, 5, 6].map(s => el('div', { class: 'p-row' },
    el('span', {}, `Stage ${s}`, el('span', { class: 'sub' }, s <= 3 ? `${doneIn(s)} of ${per(s).length} stories` : `${per(s).length} stories ready; screens come with their pictures`)),
    s <= 3 ? el('button', { class: 'p-btn' + (st.stage === s ? ' on' : ''), type: 'button', 'data-stage': s }, st.stage === s ? 'Now' : 'Start here') : null));
  const today = el('ol', { class: 'p-today', dir: 'rtl', lang: 'ar' }, ...d.ids.map((id, i) => { const s = C.byId(BANK, id); return el('li', { class: i < d.i ? 'done' : '' }, s.text); }));
  const perDay = el('span', { class: 'p-n' }, String(st.perDay));
  const minus = el('button', { class: 'p-btn', type: 'button' }, '−'), plus = el('button', { class: 'p-btn', type: 'button' }, '+');
  const pads = el('div', { class: 'p-pads' }, el('p', { class: 'sub' }, 'Loading…'));
  const view = el('section', { class: 'screen parent', dir: 'ltr', lang: 'en' },
    el('header', { class: 'p-head' }, el('h2', {}, 'Maths Theatre: Mama\'s view'), close),
    el('div', { class: 'p-scroll' },
      el('div', { class: 'p-group' }, ...rows),
      el('div', { class: 'p-group' }, el('div', { class: 'p-row' }, el('span', {}, 'Stories a day', el('span', { class: 'sub' }, 'A mixed day has one twin pair in it. A change starts tomorrow.')), el('span', { class: 'stepper' }, minus, perDay, plus))),
      el('h3', {}, `Today (${d.i} of ${d.ids.length} done${d.twin ? `, twin pair ${d.twin}` : ''})`), today,
      el('h3', {}, 'Shapes met'), el('p', { class: 'sub' }, st.met.join(', ') || 'none yet'),
      el('h3', {}, 'Her drawings'), pads,
      el('p', { class: 'sub' }, 'Her progress and drawings are in the Back up file of her apps page.')));
  app().textContent = ''; app().append(view);
  close.addEventListener('click', home);
  minus.addEventListener('click', () => { st.perDay = Math.max(2, st.perDay - 1); S.save(); perDay.textContent = st.perDay; });
  plus.addEventListener('click', () => { st.perDay = Math.min(6, st.perDay + 1); S.save(); perDay.textContent = st.perDay; });
  view.addEventListener('click', e => {
    const b = e.target.closest('[data-stage]'); if (!b) return;
    st.stage = +b.dataset.stage;
    const t = st.days[S.today()];
    if (t && !t.i) delete st.days[S.today()];   // today's plan is made again only if no story is done yet
    S.save(); U.toast(`Stage ${st.stage} from ${t && t.i ? 'tomorrow' : 'now'}.`); parent();
  });
  const list = (await TH.pads.all()).sort((a, b) => b.at - a.at);
  pads.textContent = '';
  if (!list.length) pads.append(el('p', { class: 'sub' }, 'None yet. The pencil button on every story opens her pad.'));
  list.forEach(p => { const s = C.byId(BANK, p.story); pads.append(el('figure', {}, el('img', { src: p.png, alt: '' }), el('figcaption', { dir: 'rtl', lang: 'ar' }, `${p.day} · ${s ? s.text : p.story}`))); });
}

async function start() {
  await Promise.all([U.initAssets(), U.initVoice()]);
  try { BANK = await (await fetch('data/stories.json', { cache: 'no-cache' })).json(); } catch (e) { BANK = null; }
  if (!BANK) { app().append(el('p', { class: 'home-done' }, 'تعذّر فتح القصص.')); return; }
  TH.bank = BANK;
  // testing on the local server only: ?story=s2-01 opens one story (step 3 with &step=3); nothing is saved
  const q = new URLSearchParams(location.search), one = q.get('story');
  if ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') && one && C.byId(BANK, one)) {
    const st = S.get();
    TH.story.run(app(), C.byId(BANK, one), { met: q.get('met') ? q.get('met').split(',') : st.met, step: +q.get('step') || 2, onQuit: home, onDone: r => { TH.lastResult = r; app().textContent = 'done'; } });
    return;
  }
  home();
}
TH.app = { home, start };
start();
})(window.TH);
