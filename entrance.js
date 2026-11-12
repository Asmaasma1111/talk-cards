/* تطبيقات ماريا اليوميّة: the entrance page of Talk Cards (Maria only).
   Big tiles open her apps (Talk Cards, جدول الضرب, مكتبتي, ماريا تقرأ, علبة الفضول, هيا نتعلم في الجزائر, مختبر ماريا للمال, كرّاس الإملاء); each app has a «تطبيقاتي» chip back here.
   مختبر ماريا للمال is its own page in studio/ (its own styles and ES modules), so its tile opens that page instead of a screen here;
   كرّاس الإملاء likewise opens dictation/.
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
  <!-- Mama's parent area in the top right corner, as in Talk Cards (her request, 7 Nov 2026); press and hold 2 seconds -->
  <button class="gear ap-gear" id="apGear" aria-label="Parent area: press and hold"><svg class="ring" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="24"/></svg><svg class="cog" aria-hidden="true"><use href="#i-gear"/></svg></button>
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
    <button class="ap-tile t-reads" data-app="reads" hidden><span class="ap-art"><img src="assets/apps/reads.webp" alt=""></span><span class="ap-name">ماريا تقرأ</span><span class="ap-en" lang="en" dir="ltr">Maria Reads</span><span class="ap-state" id="apReads"></span></button>
    <button class="ap-tile t-cbox" data-app="cbox" hidden><span class="ap-art"><img src="assets/apps/curiosity.webp" alt=""></span><span class="ap-name">علبة الفضول</span><span class="ap-en">سؤال كلّ يوم</span><span class="ap-state" id="apCbox"></span></button>
    <button class="ap-tile t-dz" data-app="dz" hidden><span class="ap-art"><img src="assets/apps/algeria.webp" alt=""></span><span class="ap-name">هيا نتعلم في الجزائر</span><span class="ap-en">مدينة بعد مدينة</span><span class="ap-state" id="apDz"></span></button>
    <button class="ap-tile t-studio" data-app="studio"><span class="ap-art"><img src="assets/apps/studio.webp" alt=""></span><span class="ap-name">مختبر ماريا للمال</span><span class="ap-en">أكسب وأدّخر وأعطي</span><span class="ap-state" id="apStudio"></span></button>
    <button class="ap-tile t-dict" data-app="dict"><span class="ap-art"><img src="dictation/assets/dict_tile.png" alt=""></span><span class="ap-name">كرّاس الإملاء</span><span class="ap-en">إملاء كلّ يوم</span><span class="ap-state" id="apDict"></span></button>
    <button class="ap-tile t-theatre" data-app="theatre"><span class="ap-art"><img src="theatre/assets/theatre_tile.png" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ap-emo',textContent:'🎭'}))"></span><span class="ap-name">مسرح المسائل</span><span class="ap-en">قصّة وحساب</span><span class="ap-state" id="apTheatre"></span></button>
    <button class="ap-tile t-locked" id="apLocked" hidden><span class="ap-art ap-stack" id="apLockArt"></span><span class="ap-name">تطبيقات مقفلة</span><span class="ap-state" id="apLockN"></span></button>
  </div>
  <!-- the apps Mama has not opened yet wait in one tile, so the page does not look like a long list of waiting apps (her request, 7 Nov 2026) -->
  <div class="ap-lockbox" id="apLockBox" hidden><div class="ap-lockcard"><button class="ap-lockclose" id="apLockClose" aria-label="إغلاق">✕</button><h2 class="ap-locktitle">🔒 تطبيقات مقفلة</h2><div class="ap-lockgrid" id="apLockGrid"></div></div></div>
  <!-- backup and restore: one small grey line in English at the foot, for Mama (her request, 23 Oct 2026: Maria was tapping the big buttons) -->
  <div class="ap-foot" lang="en" dir="ltr">Designed by Dr Asma Khattala<span class="ap-sep">·</span><button class="ap-footlink" id="apBackup">Back up</button><span class="ap-sep">·</span><label class="ap-footlink">Restore<input type="file" id="apRestore" accept="application/json,.json" hidden></label><span class="ap-sep ap-autosep" hidden>·</span><button class="ap-footlink" id="apAuto" hidden>Online copies</button></div>
  <input type="file" id="apFile" accept="image/*" hidden>
</section>`);

  // a tile picture not made yet (ChatGPT): a soft box with its file name instead of a broken image
  document.querySelectorAll('#apps .ap-art img').forEach(im => {
    const swap = () => {
      if (!im.isConnected) return;
      const ph = document.createElement('span'); ph.className = 'ap-ph'; ph.lang = 'en'; ph.dir = 'ltr';
      ph.textContent = im.getAttribute('src').split('/').pop(); im.replaceWith(ph);
    };
    if (im.complete && !im.naturalWidth) swap(); else im.addEventListener('error', swap, { once: true });
  });

  // the English Home and the times-tables Home: their deck chips give way to the chip back here
  [['#home', () => api.leaveTalk()], ['#mhome', () => api.leaveMath()]].forEach(([sel, leave]) => {
    const scr = $(sel); if (!scr) return;
    scr.querySelectorAll('.deck-row').forEach(r => r.remove());
    const row = document.createElement('div'); row.className = 'deck-row';
    const b = backChip(); b.addEventListener('click', () => { leave(); home(); });
    row.append(b); scr.append(row);
  });

  /* ---------- the page ---------- */
  const hello = () => 'مرحباً يا ماريا! اختاري تطبيقاً.';   // no morning or evening: she may open it at any time
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
  // مختبر ماريا للمال keeps its progress in localStorage under mariaStudio.v1 (studio/js/store.js); the tile shows her next station.
  const STUDIO = ['هدفي', 'أفكاري', 'أسأل زبائني', 'خُطّتي', 'أَصنع', 'أُخبِر الناس', 'أَبيع', 'حساباتي وزجاجاتي', 'مشروعي القادم'];
  const studioOpen = () => { try { return localStorage.getItem('tc:maria:studioOpen') === '1'; } catch (e) { return false; } };
  function studioText() {
    if (!studioOpen()) return 'قريبًا 🔒';
    let s = null;
    try { s = JSON.parse(localStorage.getItem('mariaStudio.v1') || 'null'); } catch (e) {}
    if (!s || !s.setupDone) return 'مشروعكِ الأوّل ينتظركِ';
    const done = (s.current && s.current.stationsDone) || [];
    const open = n => n === 1 || done.includes(n - 1) || (n === 9 && !!(s.current && s.current.firstSaleAt));
    const n = [1, 2, 3, 4, 5, 6, 7, 8, 9].find(k => !done.includes(k) && open(k)) || 9;
    return `«${STUDIO[n - 1]}» تنتظركِ`;
  }
  // كرّاس الإملاء is its own page in dictation/ (progress under mariaDictation.v1); locked until Mama opens it in the parent area
  const dictOpen = () => { try { return localStorage.getItem('tc:maria:dictationOpen') === '1'; } catch (e) { return false; } };
  function dictText() {
    if (!dictOpen()) return 'قريبًا 🔒';
    let d = null;
    try { d = JSON.parse(localStorage.getItem('mariaDictation.v1') || 'null'); } catch (e) {}
    return d && d.days && d.days[api.today()] && d.days[api.today()].n ? 'كتبتِ إملاء اليوم' : 'إملاء اليوم ينتظركِ';
  }
  // مسرح المسائل is its own page in theatre/ (progress under mariaTheatre.v1); locked until Mama opens it in the parent area
  const theatreOpen = () => { try { return localStorage.getItem('tc:maria:theatreOpen') === '1'; } catch (e) { return false; } };
  function theatreDone() {
    if (!theatreOpen()) return false;
    let d = null;
    try { d = JSON.parse(localStorage.getItem('mariaTheatre.v1') || 'null'); } catch (e) {}
    const t = d && d.days && d.days[api.today()];
    return !!(t && t.ids && t.i >= t.ids.length);
  }
  const theatreText = () => (!theatreOpen() ? 'قريبًا 🔒' : theatreDone() ? 'أنجزتِ قصص اليوم' : 'قصص اليوم تنتظركِ');
  function home() {
    api.leaveAll();
    if (api.autoBackup) setTimeout(api.autoBackup, 800);   // a copy of her progress goes online when it is due
    $('#apHello').textContent = hello();
    $('#apDate').textContent = dateText();
    photo();
    const s = api.status();
    state($('#apTalk'), s.talk.done, s.talk.done ? 'أنجزتِها اليوم' : s.talk.stars ? `${AR(s.talk.stars)} نجوم اليوم` : 'تنتظركِ اليوم');
    state($('#apMath'), s.math.done, s.math.done ? 'أنجزتِ هدف اليوم' : s.math.min ? `${AR(s.math.min)} من ${AR(s.math.goal)} دقائق` : 'تنتظركِ اليوم');
    state($('#apLib'), s.lib.done, s.lib.done ? 'قرأتِ قصّة اليوم' : s.lib.open ? 'قصّة اليوم مفتوحة' : 'قصّة اليوم تنتظركِ');
    const keys = ['talk', 'math', 'lib'].concat(s.reads ? ['reads'] : [], s.cbox ? ['cbox'] : [], s.dz ? ['dz'] : []);
    if (theatreOpen()) { s.theatre = { done: theatreDone() }; keys.push('theatre'); }   // green when today's stories are done, and one of the day's dots (her request, 8 Nov 2026)
    $('#apps .t-reads').hidden = !s.reads; $('#apps .t-cbox').hidden = !s.cbox; $('#apps .t-dz').hidden = !s.dz;
    // the studio, dictation and theatre tiles (not in the day's dots): open ones stay on the page, locked ones go into the «تطبيقات مقفلة» tile
    const later = [['.t-studio', studioOpen()], ['.t-dict', dictOpen()], ['.t-theatre', theatreOpen()]];
    const grid = $('#apps .ap-tiles'), folder = $('#apLocked'), shut = later.filter(([, o]) => !o).map(([c]) => c);
    later.forEach(([c, o]) => { const el = $('#apps ' + c); if (o) grid.insertBefore(el, folder); else $('#apLockGrid').appendChild(el); });
    folder.hidden = !shut.length;
    $('#apLockArt').innerHTML = shut.map(c => { const a = $('#apLockGrid ' + c + ' .ap-art'); return `<span>${a ? a.innerHTML : ''}</span>`; }).join('') + '<b class="ap-lockpin">🔒</b>';
    $('#apLockArt').dataset.n = shut.length;
    $('#apLockN').textContent = shut.length === 1 ? 'تطبيق واحد' : shut.length === 2 ? 'تطبيقان' : `${AR(shut.length)} تطبيقات`;
    if (!shut.length) $('#apLockBox').hidden = true;
    const tiles = keys.filter(k => k !== 'theatre').length + (3 - shut.length) + (shut.length ? 1 : 0);   // 8 tiles use the 4-a-row layout of 7
    $('#apps .ap-tiles').classList.toggle('four', tiles === 4); $('#apps .ap-tiles').classList.toggle('five', tiles === 5); $('#apps .ap-tiles').classList.toggle('six', tiles === 6); $('#apps .ap-tiles').classList.toggle('seven', tiles >= 7); $('#apps .ap-tiles').classList.toggle('nine', tiles >= 9);
    state($('#apStudio'), false, studioText());
    $('#apps .t-studio').classList.toggle('locked', !studioOpen());
    state($('#apDict'), false, dictText());
    $('#apps .t-dict').classList.toggle('locked', !dictOpen());
    state($('#apTheatre'), theatreDone(), theatreText());
    $('#apps .t-theatre').classList.toggle('locked', !theatreOpen());
    if (s.reads) state($('#apReads'), s.reads.done, s.reads.done ? 'قرأتِ اليوم' : `الدرس ${AR(s.reads.lesson)} ينتظركِ`);
    if (s.cbox) state($('#apCbox'), s.cbox.done, s.cbox.done ? 'فتحتِ علبة اليوم' : 'علبة اليوم تنتظركِ');
    if (s.dz) state($('#apDz'), s.dz.done, s.dz.done ? 'أنجزتِ رحلة اليوم' : s.dz.city ? `${s.dz.city} تنتظركِ` : 'رحلة اليوم تنتظركِ');
    const n = keys.filter(k => s[k].done).length, all = keys.length;
    const WORD = { 3: 'ثلاثة', 4: 'أربعة', 5: 'خمسة', 6: 'ستّة', 7: 'سبعة' }, ofAll = WORD[all] || AR(all);
    const some = n === 1 ? 'تطبيقاً واحداً' : n === 2 ? 'تطبيقين' : `${WORD[n] || AR(n)} تطبيقات`;
    $('#apToday').innerHTML = `<span class="ap-dots">${keys.map(k => `<i class="d-${k}${s[k].done ? ' on' : ''}"></i>`).join('')}</span>`
      + `<span>${n === all ? `أنجزتِ تطبيقاتكِ ال${ofAll} اليوم! 🌸` : n ? `أنجزتِ ${some} من ${ofAll} اليوم` : `${ofAll} تطبيقات تنتظركِ اليوم`}</span>`;
    api.show('apps');
  }

  $('#apLocked').addEventListener('click', () => { api.SFX.init(); $('#apLockBox').hidden = false; });
  $('#apLockBox').addEventListener('click', e => { if (e.target.id === 'apLockBox' || e.target.closest('#apLockClose')) $('#apLockBox').hidden = true; });
  $('#apps').addEventListener('click', e => {
    const t = e.target.closest('[data-app]'); if (!t) return;
    api.SFX.init();
    t.classList.remove('press'); void t.offsetWidth; t.classList.add('press');
    if (t.dataset.app === 'studio' && !studioOpen()) { api.toast('مختبر ماريا للمال يُفتح قريبًا'); return; }   // Mama opens it in the parent area
    if (t.dataset.app === 'dict' && !dictOpen()) { api.toast('كرّاس الإملاء يُفتح قريبًا'); return; }
    if (t.dataset.app === 'theatre' && !theatreOpen()) { api.toast('مسرح المسائل يُفتح قريبًا'); return; }
    setTimeout(() => { if (t.dataset.app === 'studio') location.href = 'studio/'; else if (t.dataset.app === 'dict') location.href = 'dictation/'; else if (t.dataset.app === 'theatre') location.href = 'theatre/'; else api.open(t.dataset.app); }, 170);
  });
  if (api.holdToOpen && api.openParent) api.holdToOpen($('#apGear'), 2000, api.openParent);
  $('#apPhoto').addEventListener('click', () => { api.SFX.init(); $('#apFile').click(); });
  $('#apFile').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    try { api.setPhoto(await shrink(f)); photo(); } catch (err) { api.toast('هذه الصورة لا تفتح، جرّبي صورة أخرى'); }
  });

  /* ---------- her photo, made small: a 420 px square (it stays on the iPad, in her progress and her backup) ----------
     A cut-out photo (plain white around her) is framed on her head and shoulders and the white turns pink, like the
     page; any other photo is cropped from the middle as it is. */
  function shrink(file) {
    return new Promise((ok, bad) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => { URL.revokeObjectURL(url); try { ok(frame(im)); } catch (e) { bad(e); } };
      im.onerror = () => { URL.revokeObjectURL(url); bad(new Error('not a picture')); };
      im.src = url;
    });
  }
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d', { willReadFrequently: true })]; };
  const isWhite = (d, i) => { const lo = Math.min(d[i], d[i + 1], d[i + 2]); return lo >= 222 && Math.max(d[i], d[i + 1], d[i + 2]) - lo <= 28; };
  // the plain background: near-white pixels joined to the edge of the picture
  function backdrop(d, w, h) {
    const bg = new Uint8Array(w * h), stack = [];
    const seed = p => { if (!bg[p] && isWhite(d, p * 4)) { bg[p] = 1; stack.push(p); } };
    for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
    while (stack.length) {
      const p = stack.pop(), x = p % w;
      if (x > 0) seed(p - 1);
      if (x < w - 1) seed(p + 1);
      if (p >= w) seed(p - w);
      if (p < w * (h - 1)) seed(p + w);
    }
    return bg;
  }
  // a quick look at a small copy: is it a cut-out, and where is her head? Returns the square to keep, or null.
  function headBox(im) {
    const W = im.width, H = im.height, k = Math.min(1, 240 / Math.max(W, H));
    const w = Math.max(8, Math.round(W * k)), h = Math.max(8, Math.round(H * k)), [, c] = canvas(w, h);
    c.drawImage(im, 0, 0, w, h);
    const bg = backdrop(c.getImageData(0, 0, w, h).data, w, h);
    let topWhite = 0, area = 0;
    for (let x = 0; x < w; x++) topWhite += bg[x];
    for (let p = 0; p < w * h; p++) area += bg[p];
    if (topWhite < w * 0.85 || area < w * h * 0.15) return null;          // a normal photo
    const row = y => { let l = -1, r = -1; for (let x = 0; x < w; x++) if (!bg[y * w + x]) { if (l < 0) l = x; r = x; } return [l, r]; };
    let top = 0;
    while (top < h && row(top)[0] < 0) top++;
    if (top >= h) return null;
    const ls = [], rs = [];
    for (let y = top; y < top + Math.max(2, (h - top) * 0.22) && y < h; y++) { const [l, r] = row(y); if (l >= 0) { ls.push(l); rs.push(r); } }
    const mid = a => a.sort((x, y) => x - y)[a.length >> 1];
    const L = mid(ls) / k, R = mid(rs) / k, side = Math.min(Math.max(W, H), Math.max(Math.min(W, H) * 0.45, (R - L) * 2.2)) || Math.min(W, H);
    return { sx: (L + R) / 2 - side / 2, sy: top / k - side * 0.09, side };
  }
  function frame(im) {
    const S = 420, box = headBox(im), [cv, c] = canvas(S, S);
    if (!box) {
      const side = Math.min(im.width, im.height);
      c.drawImage(im, (im.width - side) / 2, (im.height - side) / 2.6, side, side, 0, 0, S, S);
      return cv.toDataURL('image/jpeg', 0.84);
    }
    // the square may reach past the photo's edges: that part is white too, so it turns pink with the rest
    const z = S / box.side;
    c.fillStyle = '#fff'; c.fillRect(0, 0, S, S);
    c.drawImage(im, -box.sx * z, -box.sy * z, im.width * z, im.height * z);
    const img = c.getImageData(0, 0, S, S), d = img.data, bg = backdrop(d, S, S);
    const [, pc] = canvas(S, S), g = pc.createRadialGradient(S * 0.5, S * 0.4, S * 0.08, S * 0.5, S * 0.45, S * 0.72);
    g.addColorStop(0, '#FFE0EC'); g.addColorStop(1, '#FFAFCB');
    pc.fillStyle = g; pc.fillRect(0, 0, S, S);
    const pk = pc.getImageData(0, 0, S, S).data;
    for (let p = 0; p < S * S; p++) {
      const i = p * 4, x = p % S;
      let t = bg[p] ? 1 : 0;
      if (!t && ((x > 0 && bg[p - 1]) || (x < S - 1 && bg[p + 1]) || (p >= S && bg[p - S]) || (p < S * (S - 1) && bg[p + S]))) {
        const lo = Math.min(d[i], d[i + 1], d[i + 2]), hi = Math.max(d[i], d[i + 1], d[i + 2]);   // her soft edge: light pixels lean pink
        t = hi - lo < 40 ? Math.max(0, Math.min(1, (lo - 165) / 60)) * 0.85 : 0;
      }
      if (t) for (let ch = 0; ch < 3; ch++) d[i + ch] = Math.round(d[i + ch] * (1 - t) + pk[i + ch] * t);
    }
    c.putImageData(img, 0, 0);
    return cv.toDataURL('image/jpeg', 0.86);
  }

  // one backup for all her apps (Talk Cards, times tables, her library, Maria Reads, the Curiosity Box, the trip to Algeria, her recordings): one file, one tap
  $('#apBackup').addEventListener('click', () => { api.SFX.init(); if (api.backup) api.backup(); });
  $('#apRestore').addEventListener('change', e => { const f = e.target.files[0]; if (f && api.restore) api.restore(f); e.target.value = ''; });
  $('#apAuto').addEventListener('click', () => { api.SFX.init(); if (api.online) api.online(); });   // the automatic online copies (her request, 12 Nov 2026)
  return { home, isOn: () => !$('#apps').hidden };
}

root.MariaApps = { mount, chip: backChip };
})(typeof window !== 'undefined' ? window : globalThis);
