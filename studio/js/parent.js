// ركن الأهل (brief, section 10): small lock icon, a 4-digit PIN set on first use.
// Add online sales (amount and date) at her digital price from 4f · edit or correct any sale ·
// Backup / Restore (JSON with drawings) · reset a project or the whole app (double confirm).
// Also from section 6f: Mama confirms the school allows the friends card, and posts the online photo.
import * as store from './store.js';
import { el, ar, topbar, screen, ICON, toast, confirmBox, riyals, copiesWord } from './ui.js';
import { play } from './sound.js';
import { renderPage } from './copybook.js';
import { planData, stepper } from './station4.js';
import { salesData, addDigitalSale, removeEntry } from './station7.js';

let unlockedUntil = 0; // stays open for 10 minutes, and only in this visit
const OPEN_MS = 10 * 60 * 1000;

async function hash(pin) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mariaStudio:' + pin));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return 'plain:' + pin; // older browsers without crypto.subtle
  }
}

const btnIcon = (name) => el('span', { html: ICON[name], style: { width: '24px', height: '24px', display: 'inline-flex' } });
const dateWord = (iso) => {
  try { return new Date(iso).toLocaleDateString('ar-u-nu-arab-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch (e) { return ''; }
};
const isoDay = (iso) => (iso || new Date().toISOString()).slice(0, 10);

export async function parentScreen(app) {
  if (Date.now() > unlockedUntil) return pinScreen(app);
  unlockedUntil = Date.now() + OPEN_MS;
  return cornerScreen(app);
}

// ---------- The 4-digit code ----------
function pinScreen(app) {
  const s = store.get();
  const setting = !s.parent?.pin;
  let first = null, typed = '';
  const dots = el('div', { class: 'pin-dots', 'aria-hidden': 'true' });
  const msg = el('p', { class: 'pin-msg', role: 'status', 'aria-live': 'polite' });
  const title = el('h2', {});

  function show() {
    title.textContent = setting ? (first ? 'أعيدي كتابة الرمز للتأكيد' : 'اختاري رمزًا من ٤ أرقام لركن الأهل') : 'اكتبي رمز ركن الأهل';
    dots.replaceChildren(...[0, 1, 2, 3].map(i => el('i', { class: i < typed.length ? 'on' : '' })));
  }
  async function full() {
    if (setting && !first) { first = typed; typed = ''; msg.textContent = ''; show(); return; }
    if (setting) {
      if (typed !== first) { msg.textContent = 'الرمزان مختلفان. ابدئي من جديد.'; first = null; typed = ''; show(); return; }
      const h = await hash(typed);
      store.update(st => { st.parent = { ...(st.parent || {}), pin: h }; });
      unlockedUntil = Date.now() + OPEN_MS;
      toast('حُفظ الرمز.');
      return cornerScreen(app);
    }
    if (await hash(typed) === s.parent.pin) { unlockedUntil = Date.now() + OPEN_MS; return cornerScreen(app); }
    msg.textContent = 'الرمز غير صحيح.';
    dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake');
    typed = ''; show();
  }
  const key = (label, fn, cls = '') => el('button', { class: 'key ' + cls, onclick: () => { play('tap'); fn(); show(); } }, label);
  const pad = el('div', { class: 'numpad', dir: 'ltr' },
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => key(ar(n), () => { if (typed.length < 4) typed += n; if (typed.length === 4) setTimeout(full, 120); })),
    key('⌫', () => { typed = typed.slice(0, -1); }, 'del'),
    key(ar(0), () => { if (typed.length < 4) typed += '0'; if (typed.length === 4) setTimeout(full, 120); }),
    el('span'));

  show();
  app.replaceChildren(screen('yellow',
    topbar({ title: 'ركن الأهل', back: () => { location.hash = 'home'; } }),
    el('main', { class: 'work' }, el('div', { class: 'center-col' },
      el('div', { class: 'card pin-card' }, el('span', { class: 'lock', html: ICON.lock }), title, dots, msg, pad,
        setting ? null : el('button', { class: 'link', onclick: forgot }, 'نسيتُ الرمز')))),
  ));

  // Not in the brief: a way back in if the code is forgotten (an adult sum, then a new code).
  async function forgot() {
    play('tap');
    const a = 12 + Math.floor(Math.random() * 8), b = 13 + Math.floor(Math.random() * 7);
    const ans = prompt(`لإعادة تعيين الرمز: ${a} × ${b} = ؟`);
    if (ans != null && Number(String(ans).replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c))) === a * b) {
      store.update(st => { st.parent = { ...(st.parent || {}), pin: null }; });
      pinScreen(app);
    } else if (ans != null) toast('الجواب غير صحيح.');
  }
}

// ---------- The corner ----------
async function cornerScreen(app) {
  const s = store.get();
  const pid = s.current.id;
  const plan = planData();
  const sales = salesData();
  const [photo, line] = await Promise.all([store.getPage(`${pid}-s6-online-photo`), store.getPage(`${pid}-s6-online-line`)]);

  // A. Online sales: how many copies, and the date (price = her digital price from 4f).
  let count = 1;
  const dateIn = el('input', { type: 'date', class: 'date-in', value: isoDay(), 'aria-label': 'التاريخ' });
  const online = section('🌐 مبيعات على الإنترنت',
    plan.digital == null
      ? el('p', { class: 'hint' }, 'لم تحدّد ماريا سعر النسخة الرقمية بعد (المحطة ٤).')
      : [
        el('p', {}, `بسعر النسخة الرقمية الذي اختارته: ${riyals(plan.digital)}.`),
        el('div', { class: 'form-row' },
          el('label', {}, 'عدد النسخ'), stepper({ value: 1, min: 1, max: 50, label: 'عدد النسخ', format: copiesWord, onChange: (v) => { count = v; } }),
          el('label', {}, 'التاريخ'), dateIn),
        el('button', { class: 'btn primary small', onclick: () => {
          play('coin');
          const at = new Date((dateIn.value || isoDay()) + 'T12:00:00').toISOString();
          addDigitalSale(count, at);
          toast(`أُضيفت ${copiesWord(count)}.`);
          cornerScreen(app);
        } }, 'أضيفي البيع'),
      ]);

  // B. Every sale, gift and discount: correct the price or date, or delete it.
  const entries = [
    ...sales.sales.map(x => ({ at: x.at, x, kind: x.kind })),
    ...sales.gifts.filter(g => !g.group).map(g => ({ at: g.at, x: g, kind: 'gift' })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const list = section('🧾 كل البيعات',
    entries.length ? el('div', { class: 'p-list' }, entries.map(({ x, kind }) => saleRow(x, kind))) : el('p', { class: 'hint' }, 'لا توجد بيعات بعد.'));

  function saleRow(x, kind) {
    const disc = kind === 'print' && sales.gifts.find(g => g.group === x.id);
    const label = kind === 'digital' ? 'بيعة رقمية' : kind === 'gift' ? 'هدية (نسخة مجانية)' : disc ? 'بيعة بخصم' : 'بيعة ورقية';
    const money = kind === 'gift' ? '' : disc ? `${riyals(x.price - disc.amount)} (السعر ${riyals(x.price)})` : riyals(x.price);
    const row = el('div', { class: 'p-row' },
      el('span', { class: 'ic' }, kind === 'digital' ? '🌐' : kind === 'gift' ? '🎁' : disc ? '🏷️' : '📘'),
      el('b', {}, label), el('span', {}, money), el('small', {}, dateWord(x.at)),
      kind === 'gift' ? null : el('button', { class: 'btn small', onclick: () => { play('tap'); editRow(); } }, btnIcon('pencil'), 'تعديل'),
      el('button', { class: 'btn small', onclick: async () => {
        if (!await confirmBox('حذف هذا السطر؟', 'نعم، احذفي')) return;
        removeEntry(x.id);
        cornerScreen(app);
      } }, btnIcon('trash'), 'حذف'));
    function editRow() {
      let price = x.price, paid = disc ? x.price - disc.amount : null;
      const d = el('input', { type: 'date', class: 'date-in', value: isoDay(x.at), 'aria-label': 'التاريخ' });
      const paidBox = el('div', {});
      const drawPaid = () => paidBox.replaceChildren(...(disc ? [el('label', {}, 'دفع الزبون'),
        stepper({ value: Math.min(paid, price), min: 0, max: price, label: 'دفع الزبون', format: riyals, onChange: (v) => { paid = v; } })] : []));
      drawPaid();
      row.replaceChildren(el('div', { class: 'form-row' },
        el('label', {}, 'السعر'), stepper({ value: price, min: 1, max: 99, label: 'السعر', format: riyals, onChange: (v) => { price = v; if (paid != null) paid = Math.min(paid, v); drawPaid(); } }),
        paidBox,
        el('label', {}, 'التاريخ'), d,
        el('button', { class: 'btn primary small', onclick: () => {
          play('tap');
          store.update(() => {
            x.price = price;
            x.at = new Date(d.value + 'T12:00:00').toISOString();
            if (disc) { disc.amount = Math.max(0, price - paid); disc.at = x.at; }
          });
          toast('حُفظ التعديل.');
          cornerScreen(app);
        } }, 'حفظ'),
        el('button', { class: 'btn small', onclick: () => { play('tap'); cornerScreen(app); } }, 'إلغاء')));
    }
    return row;
  }

  // C. "Mama posts it" (6f): her product photo and the line she wrote.
  const post = section('📱 لتنشريه على الإنترنت',
    photo?.photo || line
      ? el('div', { class: 'post' },
        photo?.photo ? el('img', { class: 'post-photo', src: photo.photo, alt: 'صورة المنتج' }) : el('p', { class: 'hint' }, 'لم تصوّر المنتج بعد.'),
        line?.strokes?.length ? el('img', { class: 'post-line', src: renderPage(line, 4), alt: 'وصف بخطّ ماريا' }) : el('p', { class: 'hint' }, 'لم تكتب الوصف بعد.'),
        photo?.photo ? el('a', { class: 'btn small', href: photo.photo, download: 'maria-product.jpg' }, 'حفظ الصورة') : null)
      : el('p', { class: 'hint' }, 'ستظهر هنا صورة المنتج والوصف عندما تختار ماريا «على الإنترنت» في المحطة ٦.'));

  // D. The school (6f): friends at school only after Mama confirms it is allowed.
  const sw = el('button', { class: 'switch-btn', role: 'switch', 'aria-checked': String(!!s.parent?.schoolOk), onclick: () => {
    play('tap');
    store.update(st => { st.parent = { ...(st.parent || {}), schoolOk: !st.parent?.schoolOk }; });
    sw.setAttribute('aria-checked', String(!!store.get().parent.schoolOk));
  } }, el('span', { class: 'switch' }), 'المدرسة تسمح لماريا أن تُخبر صديقاتها هناك');
  const school = section('🏫 المدرسة', sw);

  // E. Backup and restore (JSON, with every drawing, photo and recording).
  const backup = section('💾 نسخة احتياطية',
    el('div', { class: 'form-row' },
      el('button', { class: 'btn', onclick: downloadBackup }, 'تنزيل نسخة احتياطية'),
      el('button', { class: 'btn', onclick: () => restore(app) }, 'استرجاع من نسخة')),
    el('p', { class: 'hint' }, 'النسخة ملف واحد فيه كل الصفحات والصور والتسجيلات. احفظيه في «الملفات».'));

  // F. Reset (double confirm).
  const reset = section('↺ البدء من جديد',
    el('div', { class: 'form-row' },
      el('button', { class: 'btn', onclick: () => resetProject(app) }, 'إعادة المشروع الحالي من البداية'),
      el('button', { class: 'btn danger', onclick: resetApp }, 'مسح التطبيق كله')));

  const more = section('🔑 الرمز',
    el('div', { class: 'form-row' },
      el('button', { class: 'btn', onclick: () => { play('tap'); store.update(st => { st.parent.pin = null; }); pinScreen(app); } }, 'تغيير الرمز'),
      el('button', { class: 'btn', onclick: () => { play('tap'); unlockedUntil = 0; location.hash = 'home'; } }, btnIcon('lock'), 'اقفلي ركن الأهل')));

  app.replaceChildren(screen('yellow',
    topbar({ title: 'ركن الأهل', back: () => { location.hash = 'home'; } }),
    el('main', { class: 'work' }, el('div', { class: 'parent-page' },
      el('p', { class: 'hint' }, `المشروع الحالي: ${s.current.name}`),
      online, list, post, school, backup, reset, more)),
  ));
}

function section(title, ...body) {
  return el('section', { class: 'card p-section' }, el('h3', {}, title), ...body);
}

// ---------- Backup / Restore ----------
async function downloadBackup() {
  play('tap');
  const data = { app: 'mariaStudio', v: 1, at: new Date().toISOString(), state: store.get(), pages: await store.allPages() };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `maria-studio-${isoDay()}.json` });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  toast('جُهّزت النسخة الاحتياطية.');
}

function restore(app) {
  play('tap');
  const input = el('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' } });
  input.onchange = async () => {
    const f = input.files?.[0];
    input.remove();
    if (!f) return;
    let data;
    try { data = JSON.parse(await f.text()); } catch (e) { toast('هذا الملف ليس نسخة احتياطية.'); return; }
    if (data?.app !== 'mariaStudio' || !data.state?.current || !Array.isArray(data.pages)) { toast('هذا الملف ليس نسخة احتياطية من الاستوديو.'); return; }
    if (!await confirmBox(`استرجاع نسخة ${dateWord(data.at)}؟ سيُستبدل كل ما في التطبيق الآن.`, 'نعم، استرجعي')) return;
    await store.clearPages();
    for (const p of data.pages) if (p?.id) await store.putPage(p);
    store.replaceState(data.state);
    unlockedUntil = 0;
    toast('تمّ الاسترجاع.');
    location.hash = 'home';
  };
  document.body.append(input);
  input.click();
}

// ---------- Reset (double confirm) ----------
async function resetProject(app) {
  if (!await confirmBox('إعادة المشروع الحالي من البداية؟ ستُحذف خطواته وبيعاته.', 'نعم')) return;
  if (!await confirmBox('هل أنتِ متأكدة؟ لا يمكن التراجع.', 'نعم، أعيديه')) return;
  store.update(st => { st.current = store.newProject(st.current.name); });
  toast('بدأ المشروع من جديد.');
  cornerScreen(app);
}

async function resetApp() {
  if (!await confirmBox('مسح التطبيق كله؟ ستُحذف كل المشاريع والصفحات والزجاجات.', 'نعم')) return;
  if (!await confirmBox('هل أنتِ متأكدة؟ نزّلي نسخة احتياطية أولًا. لا يمكن التراجع.', 'نعم، امسحي كل شيء')) return;
  await store.clearPages();
  store.resetAll();
  unlockedUntil = 0;
  location.hash = 'welcome';
}
