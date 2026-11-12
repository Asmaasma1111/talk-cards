/* مسرح المسائل: her progress and her prizes (Mama's requests, 12 Nov 2026: "something to enable tracking progress",
   "she takes no prize after finishing the questions").
   Progress: a row of six stage lamps on Home, one per level; a finished level is lit, her level glows with its count.
   Prizes: «صندوق الأزياء», a costume and prop trunk. Every finished day gives one piece (54 of them, in order: props and clothes); finishing a
   level gives a big prize (6). Nothing new is saved for the pieces: they are counted from the finished days and the
   finished levels in mariaTheatre.v1, so a backup always brings them back. Only what she has already been shown is kept
   (st.seenProps, st.seenBig), so each prize is celebrated once.
   Pictures: assets/prizes/ (ChatGPT clay, approved by Mama 12 Nov 2026). */
(function (TH) {
'use strict';
const PROPS = [
  'قبّعة المهرّج', 'أنف المهرّج', 'قبّعة القرصان', 'التاج الذهبي', 'جناحا الجنّية', 'العصا السحرية',
  'قبّعة الساحر', 'أذنا القطّة', 'قناع الكرنفال', 'ربطة العنق', 'القبّعة العالية', 'قفّازا المسرح',
  'السيف الخشبي', 'الدرع', 'خوذة الفارس', 'تاج الأميرة', 'الرداء الأحمر', 'صندوق الكنز',
  'دمية الثعلب', 'دمية الأرنب', 'دمية الجورب', 'دمية الخيوط', 'دمى الأصابع', 'مسرح الدمى',
  'الدفّ', 'الطبل', 'البوق', 'الإكسيليفون', 'الخشخيشتان', 'الجرس',
  'الفانوس', 'الهلال', 'الغيمة', 'الشمس', 'الشجرة', 'النجوم المعلّقة',
  'باقة الأزهار', 'مكبّر الصوت', 'لوحة التصوير', 'كشّاف المسرح', 'التذاكر الذهبية', 'الفشار'
].map((name, i) => ({ id: 'p' + String(i + 1).padStart(2, '0'), name }));
// clothes and decorations for the dressing room (js/dress.js; Mama's idea, 12 Nov 2026)
const WEAR = ['النظّارة الحمراء', 'نظّارة النجوم', 'نظّارة القلوب', 'نظّارة السباحة', 'عقد اللؤلؤ', 'عقد الأزهار',
  'تنّورة الباليه', 'السترة', 'الوشاح', 'الفستان', 'المعطف الأصفر', 'الحذاء الأحمر',
  'الفيونكة', 'تاج الأزهار', 'الحقيبة', 'قناع البطل', 'الشارب', 'وشاح الريش'
].map((name, i) => ({ id: 'w' + String(i + 1).padStart(2, '0'), name }));
const FREE = ['w01', 'w13', 'w09', 'w07', 'w15', 'w03'].map(id => WEAR.find(w => w.id === id));   // in the wardrobe from the first day
// a finished day gives the next piece of this list: her first three stay as they were, then clothes and props take turns
const DAILY = (() => {
  const w = WEAR.filter(x => !FREE.includes(x)), out = PROPS.slice(0, 3);
  PROPS.slice(3).forEach((p, i) => { if (w[i]) out.push(w[i]); out.push(p); });
  return out;
})();
const BIG = ['كأس المسرح', 'قناعا المسرح', 'وسام النجمة', 'الميكروفون الذهبي', 'كرسي المخرجة', 'جائزة النجمة'].map((name, i) => ({ id: 'big' + (i + 1), name, stage: i + 1 }));

// the days she finished (every story of the day done), oldest first
const doneDays = st => Object.keys(st.days || {}).filter(k => { const d = st.days[k]; return d && Array.isArray(d.ids) && d.ids.length && d.i >= d.ids.length; }).sort();
const propCount = st => Math.min(DAILY.length, doneDays(st).length);
const inStage = (bank, s) => bank.stories.filter(x => x.stage === s);
const doneIn = (bank, st, s) => inStage(bank, s).filter(x => st.done[x.id] && st.done[x.id].n).length;
const stageDone = (bank, st, s) => { const all = inStage(bank, s); return all.length > 0 && doneIn(bank, st, s) === all.length; };
const bigWon = (bank, st) => BIG.filter(b => stageDone(bank, st, b.stage));
// her level now: the first unfinished one (null when all six are done)
function current(bank, st) { for (let s = 1; s <= 6; s++) if (!stageDone(bank, st, s)) return s; return null; }

// the first time this version meets her saved progress: what she already earned goes into the trunk quietly
function sync(bank, st) {
  let changed = false;
  if (typeof st.seenProps !== 'number') { st.seenProps = propCount(st); changed = true; }
  if (!Array.isArray(st.seenBig)) { st.seenBig = bigWon(bank, st).map(b => b.stage); changed = true; }
  return changed;
}
// what is new since she last looked: { props: [...], big: [...] }, and marks it as shown
function claim(bank, st) {
  sync(bank, st);
  const n = propCount(st), props = DAILY.slice(Math.min(st.seenProps, n), n);
  const big = bigWon(bank, st).filter(b => !st.seenBig.includes(b.stage));
  st.seenProps = n; big.forEach(b => st.seenBig.push(b.stage));
  return { props, big };
}
const src = id => `assets/prizes/${id}.webp`;

/* ---------- screens ---------- */
// the six lamps of Home's top bar
function path(bank, st) {
  const { el } = TH.ui, C = TH.core, cur = current(bank, st);
  return el('div', { class: 'lv-path', role: 'img', 'aria-label': cur ? `المستوى ${C.ar(cur)}` : 'كلّ المستويات' },
    ...[1, 2, 3, 4, 5, 6].map(s => {
      const done = stageDone(bank, st, s), here = s === cur;
      return el('span', { class: 'lv' + (done ? ' done' : here ? ' cur' : '') },
        el('img', { src: src(done || here ? 'lamp-on' : 'lamp-off'), alt: '', draggable: 'false' }),
        el('b', {}, done ? '✓' : C.ar(s)),
        here ? el('small', {}, `${C.ar(doneIn(bank, st, s))} من ${C.ar(inStage(bank, s).length)}`) : null);
    }));
}
// the trunk button of Home's top bar
function trunkBtn(bank, st, onBack) {
  const { el } = TH.ui;
  const b = el('button', { class: 'top-btn trunk-btn', type: 'button', 'aria-label': 'صندوق الأزياء' }, el('img', { src: src('trunk'), alt: '', draggable: 'false' }));
  b.addEventListener('click', () => { TH.ui.sound('pick'); if (TH.dress) TH.dress.room(bank, st, onBack); else trunk(bank, st, onBack); });
  return b;
}
// «صندوق الأزياء»: everything she has won, and grey shapes for what is still to come
function trunk(bank, st, onBack) {
  const { el } = TH.ui, app = document.getElementById('app');
  sync(bank, st);
  const n = propCount(st), won = bigWon(bank, st).map(b => b.stage);
  const cell = (p, has, cls) => el('span', { class: 'pz ' + cls + (has ? ' has' : '') }, el('img', { src: src(p.id), alt: has ? p.name : '', draggable: 'false' }));
  const close = el('button', { class: 'top-btn', type: 'button', 'aria-label': 'رجوع' }, TH.ui.icon('close'));
  app.textContent = '';
  app.append(el('section', { class: 'screen trunk', dir: 'rtl' },
    el('header', { class: 'tk-top' }, el('img', { class: 'tk-box', src: src('trunk-open'), alt: '', draggable: 'false' }), el('h2', {}, 'صندوق الأزياء'), close),
    el('div', { class: 'tk-scroll' },
      el('div', { class: 'tk-big' }, ...BIG.map(b => cell(b, won.includes(b.stage), 'big'))),
      el('div', { class: 'tk-grid' }, ...FREE.map(p => cell(p, true, 'prop')), ...DAILY.map((p, i) => cell(p, i < n, 'prop'))))));
  close.addEventListener('click', onBack);
}
// one prize shown big, with its name: resolves when she taps the button
function reveal(title, prize, big) {
  const { el } = TH.ui, app = document.getElementById('app');
  return new Promise(ok => {
    const go = el('button', { class: 'btn btn-next big', type: 'button', 'aria-label': 'التالي' }, TH.ui.icon('next'));
    const pic = el('img', { class: 'gift-pic', src: src(prize.id), alt: '', draggable: 'false' });
    const box = el('img', { class: 'gift-box', src: src('trunk-open'), alt: '', draggable: 'false' });
    app.textContent = '';
    app.append(el('section', { class: 'screen gift' + (big ? ' big' : ''), dir: 'rtl' },
      el('h2', {}, title), el('div', { class: 'gift-stage' }, big ? el('img', { class: 'gift-cushion', src: src('cushion'), alt: '', draggable: 'false' }) : box, pic),
      el('p', { class: 'gift-name' }, prize.name), go));
    TH.ui.sound('star');
    if (big && TH.story && TH.story.starBurst) TH.story.starBurst(app);
    go.addEventListener('click', () => { TH.ui.sound('tap'); ok(); }, { once: true });
  });
}
// after the day's last story: the level prize first (when a level was finished), then the day's piece
async function celebrate(bank, st, save) {
  const C = TH.core, got = claim(bank, st);
  save();
  for (const b of got.big) await reveal(`أنهيتِ المستوى ${C.ar(b.stage)}!`, b, true);
  for (const p of got.props.slice(-1)) await reveal('هديّة اليوم', p, false);     // one a day (older unseen ones are in the trunk)
}
// her newest piece stands on Home's stage
function newest(st) { const n = propCount(st); return n ? DAILY[n - 1] : null; }
// everything in her wardrobe now, newest first; and what is still to come
const owned = st => [...DAILY.slice(0, propCount(st)).reverse(), ...FREE];
const toCome = st => DAILY.slice(propCount(st));

TH.prizes = { PROPS, WEAR, FREE, DAILY, owned, toCome, stageDone, BIG, doneDays, propCount, bigWon, current, doneIn, sync, claim, path, trunkBtn, trunk, celebrate, newest, src };
if (typeof module !== 'undefined') module.exports = TH.prizes;
})(typeof window !== 'undefined' ? (window.TH = window.TH || {}) : {});
