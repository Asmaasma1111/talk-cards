/* تطبيقات ماريا اليوميّة: the entrance page of Talk Cards (Maria only).
   Three big tiles open her three apps (Talk Cards, جدول الضرب, مكتبتي); each app has a «تطبيقاتي» chip back here.
   Her photo is chosen on the iPad, made small and kept in her progress (and her backup file), never in the app's files. */
(function (root) {
'use strict';

const AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const homeIcon = '<svg class="ap-chip-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.8 11.2 12 4.3l8.2 6.9M6.3 9.4V19a1 1 0 0 0 1 1h3.4v-5.2h2.6V20h3.4a1 1 0 0 0 1-1V9.4" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// the way back, on every app's Home: one pink chip where the deck chips used to be
function backChip() {
  const b = document.createElement('button');
  b.className = 'deck-chip deck-apps'; b.lang = 'ar'; b.dir = 'rtl';
  b.innerHTML = homeIcon + 'تطبيقاتي';
  return b;
}

function mount(api) {
  const $ = s => document.querySelector(s);
  const tick = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.6l4.3 4.3L19 7.4" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  document.body.insertAdjacentHTML('beforeend', `
<section id="apps" class="screen ap" dir="rtl" lang="ar" hidden>
  <div class="ap-sky" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
  <header class="ap-head">
    <button class="ap-photo" id="apPhoto" aria-label="صورتي"><span class="ap-ring"></span><span class="ap-pic" id="apPic"></span><span class="ap-cam" aria-hidden="true">📷</span></button>
    <div class="ap-words">
      <h1 class="ap-title">تطبيقات ماريا اليوميّة</h1>
      <p class="ap-hello" id="apHello"></p>
      <p class="ap-date" id="apDate"></p>
    </div>
  </header>
  <div class="ap-today" id="apToday"></div>
  <div class="ap-tiles">
    <button class="ap-tile t-talk" data-app="talk"><span class="ap-art"><img src="assets/apps/talk.webp" alt=""></span><span class="ap-name">بطاقات الكلام</span><span class="ap-en" lang="en" dir="ltr">Talk Cards</span><span class="ap-state" id="apTalk"></span></button>
    <button class="ap-tile t-math" data-app="math"><span class="ap-art"><img src="assets/apps/math.webp" alt=""></span><span class="ap-name">جدول الضرب</span><span class="ap-en">أرقام وألعاب</span><span class="ap-state" id="apMath"></span></button>
    <button class="ap-tile t-lib" data-app="lib"><span class="ap-art"><img src="assets/apps/lib.webp" alt=""></span><span class="ap-name">مكتبتي</span><span class="ap-en">قصّة كلّ يوم</span><span class="ap-state" id="apLib"></span></button>
  </div>
  <div class="ap-foot" lang="en" dir="ltr">Designed by Dr Asma Khattala</div>
  <input type="file" id="apFile" accept="image/*" hidden>
</section>`);

  // the English Home and the times-tables Home: their deck chips give way to the chip back here
  [['#home', () => api.leaveTalk()], ['#mhome', () => api.leaveMath()]].forEach(([sel, leave]) => {
    const scr = $(sel); if (!scr) return;
    scr.querySelectorAll('.deck-row').forEach(r => r.remove());
    const row = document.createElement('div'); row.className = 'deck-row';
    const b = backChip(); b.addEventListener('click', () => { leave(); home(); });
    row.append(b); scr.append(row);
  });

  /* ---------- the page ---------- */
  function hello() {
    const h = new Date().getHours();
    return (h < 12 ? 'صباح الخير' : 'مساء الخير') + ' يا ماريا! اختاري تطبيقاً.';
  }
  function dateText() {
    const [y, m, d] = api.today().split('-').map(Number);
    try { return new Date(y, m - 1, d).toLocaleDateString('ar-u-ca-gregory-nu-arab', { weekday: 'long', day: 'numeric', month: 'long' }); }
    catch (e) { return AR(`${d}/${m}`); }
  }
  function photo() {
    const url = api.photo();
    $('#apPic').style.backgroundImage = url ? `url(${url})` : '';
    $('#apPhoto').classList.toggle('empty', !url);
  }
  function state(el, done, text) {
    el.className = 'ap-state' + (done ? ' done' : '');
    el.innerHTML = done ? `${tick}<span>${text}</span>` : `<span>${text}</span>`;
  }
  function home() {
    api.leaveAll();
    $('#apHello').textContent = hello();
    $('#apDate').textContent = dateText();
    photo();
    const s = api.status();
    state($('#apTalk'), s.talk.done, s.talk.done ? 'أنجزتِها اليوم' : s.talk.stars ? `${AR(s.talk.stars)} نجوم اليوم` : 'تنتظركِ اليوم');
    state($('#apMath'), s.math.done, s.math.done ? 'أنجزتِ هدف اليوم' : s.math.min ? `${AR(s.math.min)} من ${AR(s.math.goal)} دقائق` : 'تنتظركِ اليوم');
    state($('#apLib'), s.lib.done, s.lib.done ? 'قرأتِ قصّة اليوم' : s.lib.open ? 'قصّة اليوم مفتوحة' : 'قصّة اليوم تنتظركِ');
    const n = [s.talk.done, s.math.done, s.lib.done].filter(Boolean).length;
    $('#apToday').innerHTML = `<span class="ap-dots">${['talk', 'math', 'lib'].map(k => `<i class="d-${k}${s[k].done ? ' on' : ''}"></i>`).join('')}</span>`
      + `<span>${n === 3 ? 'أنجزتِ تطبيقاتكِ الثلاثة اليوم! 🌸' : n ? `أنجزتِ ${n === 1 ? 'تطبيقاً واحداً' : 'تطبيقين'} من ثلاثة اليوم` : 'ثلاثة تطبيقات تنتظركِ اليوم'}</span>`;
    api.show('apps');
  }

  $('#apps').addEventListener('click', e => {
    const t = e.target.closest('[data-app]'); if (!t) return;
    api.SFX.init();
    t.classList.remove('press'); void t.offsetWidth; t.classList.add('press');
    setTimeout(() => api.open(t.dataset.app), 170);
  });
  $('#apPhoto').addEventListener('click', () => { api.SFX.init(); $('#apFile').click(); });
  $('#apFile').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    try { api.setPhoto(await shrink(f)); photo(); } catch (err) { api.toast('هذه الصورة لا تفتح، جرّبي صورة أخرى'); }
  });

  // her photo, made small: a square crop from the middle, 420 px (it stays on the iPad, in her progress and her backup)
  function shrink(file) {
    return new Promise((ok, bad) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        const side = Math.min(im.width, im.height), S = Math.min(420, side), cv = document.createElement('canvas');
        cv.width = cv.height = S;
        cv.getContext('2d').drawImage(im, (im.width - side) / 2, (im.height - side) / 2.6, side, side, 0, 0, S, S);
        URL.revokeObjectURL(url); ok(cv.toDataURL('image/jpeg', 0.84));
      };
      im.onerror = () => { URL.revokeObjectURL(url); bad(new Error('not a picture')); };
      im.src = url;
    });
  }

  return { home, isOn: () => !$('#apps').hidden };
}

root.MariaApps = { mount, chip: backChip };
})(typeof window !== 'undefined' ? window : globalThis);
