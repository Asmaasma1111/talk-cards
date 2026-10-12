/* Maria's Sticker Book: one sticker for every 2 days in a row on the English cards (a parent can change the 2), and
   every 7th reward a big Star Friend instead (about every 2 weeks): a person who dances on her own page.
   Loaded before app.js; app.js calls StickerBook.mount(api) for Maria. Collected stickers live in her profile
   (st.stk), so the backup file carries them. The pictures and their order are in stickers/stickers.json. */
(function (root) {
'use strict';

const DEFAULT_PER = 2;   // days in a row for one sticker (Maria's settings.stickerDays; it was 7 until 13 Oct 2026)
const FRIEND_EVERY = 7;  // the 7th, 14th, 21st... reward is a Star Friend

/* ---------- which days earn a sticker (no DOM: scripts/test_stickers.js runs this in Node) ---------- */
// The 2nd, 4th, 6th... day of every run of days in a row (with per = 2).
function earnedDays(days, addDays, per = DEFAULT_PER) {
  const out = [];
  let run = 0, prev = null;
  [...new Set(days)].sort().forEach(d => {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    prev = d;
    if (run % per === 0) out.push(d);
  });
  return out;
}
// The run of days in a row that is still going: it ends today, or yesterday if she has not practised yet today.
function currentRun(days, t, addDays) {
  const set = new Set(days);
  let d = set.has(t) ? t : addDays(t, -1), n = 0;
  while (set.has(d)) { n++; d = addDays(d, -1); }
  return { n, today: set.has(t) };
}
// Adds the stickers she has earned and not yet received, each with its own picture (so a new order of the book
// never changes a sticker she has). Stickers are never taken away.
function sync(stk, days, addDays, per, order, friends = []) {
  const e = earnedDays(days, addDays, per);
  let added = 0;
  while (stk.got.length < e.length) {
    const day = e[stk.got.length], f = (stk.got.length + 1) % FRIEND_EVERY === 0 ? nextFriend(friends, stk.got) : '';
    stk.got.push(f ? { day, seen: false, file: f, friend: true }
                   : { day, seen: false, file: nextFile(order, stk.got.filter(g => !g.friend)) });
    added++;
  }
  return added;
}
// The next Star Friend she has not met yet; when all of them are in her book, a sticker comes instead.
function nextFriend(friends, got) {
  const have = new Set(got.filter(g => g.friend).map(g => g.file));
  const f = friends.find(x => !have.has(x.file));
  return f ? f.file : '';
}
const isFriend = g => !!(g && g.friend);
// How many stickers until the next Star Friend (0: the next reward is one).
function toNextFriend(got, friends) {
  if (!nextFriend(friends, got)) return -1;
  return (FRIEND_EVERY - (got.length + 1) % FRIEND_EVERY) % FRIEND_EVERY;
}
// The next sticker: the first in the book's order she does not have yet; when she has them all, round again.
function nextFile(order, got) {
  if (!order.length) return '';
  const have = new Map(); got.forEach(g => have.set(g.file, (have.get(g.file) || 0) + 1));
  const round = Math.floor(got.length / order.length);
  const s = order.find(x => (have.get(x.file) || 0) <= round);
  return (s || order[got.length % order.length]).file;
}
// Stickers given before each one kept its picture (cache v18-v19) were the book's old order by position.
function fillFiles(got, legacy, order) {
  let changed = false;
  got.forEach((g, i) => { if (!g.file) { g.file = legacy[i % Math.max(1, legacy.length)] || (order[i % order.length] || {}).file; changed = true; } });
  return changed;
}
const core = { DEFAULT_PER, FRIEND_EVERY, earnedDays, currentRun, sync, nextFile, nextFriend, toNextFriend, fillFiles };

/* ---------- the screens ---------- */
function mount(api) {
  const $ = (s, r = document) => r.querySelector(s);
  let META = [], LEGACY = [], FRIENDS = [];
  let tab = 'stickers';
  const PERD = () => Math.max(1, Math.min(7, Number(api.perDays && api.perDays()) || DEFAULT_PER));
  let page = 0;
  let onClose = null;
  const st = () => api.st();
  function stk() {
    const s = st(); if (!s.stk || !Array.isArray(s.stk.got)) s.stk = { got: [] };
    if (META.length && fillFiles(s.stk.got, LEGACY, META)) api.save();
    return s.stk;
  }
  const byFile = f => META.find(x => x.file === f) || FRIENDS.find(x => x.file === f) || null;
  const meta = i => { const g = stk().got[i]; return g ? byFile(g.file) : null; };   // the reward in place i of her list
  const stickerIds = () => stk().got.map((g, i) => (isFriend(g) ? -1 : i)).filter(i => i >= 0);
  const friendIds = () => stk().got.map((g, i) => (isFriend(g) ? i : -1)).filter(i => i >= 0);
  const nStickers = (upTo = Infinity) => stk().got.filter((g, i) => i <= upTo && !isFriend(g)).length;
  const nFriends = (upTo = Infinity) => stk().got.filter((g, i) => i <= upTo && isFriend(g)).length;
  const countLine = (n, one, many) => `You have <em>${n}</em> ${n === 1 ? one : many} now!`;   // the number in a big pink bubble
  function friendHint(got) {
    const k = toNextFriend(got, FRIENDS);
    if (k < 0) return '';
    return k === 0 ? 'Your next reward is a Star Friend!' : `${k} more sticker${k === 1 ? '' : 's'} to your next Star Friend`;
  }
  const src = m => 'stickers/' + m.file;
  const rot = i => [-7, 5, -3, 8, -5, 3, -8, 6, -2, 7, -6, 4][i % 12];
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  document.body.insertAdjacentHTML('beforeend', `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.3C.8 8.1 2.9 4.5 6.4 4.3c2.2-.1 3.9 1.2 5.6 3.2 1.7-2 3.4-3.3 5.6-3.2 3.5.2 5.6 3.8 4 7.4C19.5 16.4 12 21 12 21z"/></symbol>
  <symbol id="i-spark" viewBox="0 0 24 24"><path d="M12 1.5c.9 5.6 2.9 8.6 10.5 10.5-7.6 1.9-9.6 4.9-10.5 10.5-.9-5.6-2.9-8.6-10.5-10.5C9.1 10.1 11.1 7.1 12 1.5z"/></symbol>
</svg>
<section id="sbook" class="screen sb-screen" hidden>
  <div class="sb-top">
    <button class="sb-x" id="sbClose" aria-label="Close the sticker book"><svg aria-hidden="true"><use href="#i-close"/></svg></button>
    <div class="sb-tabs" role="tablist">
      <button class="sb-tab on" id="sbTabS" role="tab"><svg class="star" aria-hidden="true"><use href="#i-star"/></svg><span>Stickers</span><b id="sbHave">0</b></button>
      <button class="sb-tab" id="sbTabF" role="tab"><span class="sb-crown" aria-hidden="true">👑</span><span>Star Friends</span><b id="sbHaveF">0</b></button>
    </div>
    <span class="sb-gap"></span>
  </div>
  <div class="sb-book" id="sbBook">
    <div class="sb-page left"><h1><span id="sbH1">Maria's Sticker Book</span></h1><h2 id="sbSub">One sticker for every 2 days in a row</h2><div class="sb-grid" id="sbG1"></div></div>
    <div class="sb-page right"><h2 class="sb-pno" id="sbPageNo"></h2><div class="sb-grid" id="sbG2"></div></div>
  </div>
  <div class="sb-pager"><button id="sbPrev" aria-label="Previous page">‹</button><div class="sb-pd" id="sbPd"></div><button id="sbNext" aria-label="Next page">›</button></div>
</section>
<section id="sbAward" class="overlay sb-award" hidden>
  <canvas id="sbConfetti" aria-hidden="true"></canvas>
  <div class="sb-kicker" id="sbKicker">2 days in a row!</div>
  <div class="sb-big" id="sbBig"></div>
  <h2 class="sb-title" id="sbTitle"></h2>
  <div class="sb-week" id="sbWeek"></div>
  <div class="sb-tally"><b id="sbTally"></b><span id="sbTallyNext"></span></div>
  <button id="sbStick" class="btn btn-good">Stick it in my book</button>
</section>
<section id="sfAward" class="overlay sf-award" hidden>
  <canvas id="sfConfetti" aria-hidden="true"></canvas>
  <div class="sb-kicker sf-kicker">2 weeks of practice!</div>
  <div class="sf-stage"><div class="sf-light"></div><div class="sf-floor"></div>
    <div class="sf-hero" id="sfHero"><div class="sf-orbit" id="sfOrbit"></div><div class="sf-notes" id="sfNotes"></div></div></div>
  <h2 class="sb-title" id="sfTitle"></h2>
  <div class="sb-tally"><b id="sfTally"></b></div>
  <button id="sfPut" class="btn btn-good">Put her in my book</button>
</section>`);

  // the way in, on the English Home screen
  const card = document.createElement('button');
  card.className = 'sb-card maria-only'; card.id = 'sbCard';
  card.innerHTML = `<span class="sb-cover"><img id="sbCoverImg" alt="" hidden><b id="sbCoverQ">?</b></span>
    <span class="sb-info"><b>My Sticker Book</b><span class="sb-dots" id="sbDots"></span><span class="sb-left" id="sbLeft"></span><span class="sb-have" id="sbCardHave"></span></span>`;
  $('#home .daily').after(card);

  /* ---------- a sticker, with a shine and twinkles when it is a sparkly one ---------- */
  function twinkles(el, n) {
    const spots = [[-6, 4], [80, -6], [90, 70], [4, 86], [44, -12], [-12, 46]];
    for (let i = 0; i < n; i++) {
      const t = document.createElement('span'); t.className = 'sb-tw';
      t.innerHTML = '<svg aria-hidden="true"><use href="#i-spark"/></svg>';
      t.style.left = spots[i][0] + '%'; t.style.top = spots[i][1] + '%'; t.style.animationDelay = (i * .45) + 's';
      t.style.width = t.style.height = (14 + (i % 2) * 10) + 'px';
      el.append(t);
    }
  }
  function stickerEl(m, big) {
    const wrap = document.createElement('div'); wrap.className = 'sb-st';
    const img = new Image(); img.src = src(m); img.alt = m.name; img.draggable = false; wrap.append(img);
    if (m.sparkle) {
      const sh = document.createElement('div'); sh.className = 'sb-shine';
      sh.style.webkitMaskImage = sh.style.maskImage = `url(${src(m)})`;
      wrap.append(sh); twinkles(wrap, big ? 6 : 4);
    }
    return wrap;
  }

  /* ---------- Home ---------- */
  function homeCard() {
    const got = stk().got, run = currentRun(st().days || [], api.today(), api.addDays);
    const PER = PERD(), p = run.n % PER, justGot = run.today && run.n > 0 && p === 0;
    const filled = justGot ? PER : p;
    $('#sbDots').innerHTML = Array.from({ length: PER }, (_, k) => `<i class="${k < filled ? 'on' : ''}"></i>`).join('');
    const left = PER - p;
    $('#sbLeft').textContent = justGot ? 'A new sticker today!' : `${plural(left, 'more day')} to the next sticker`;
    const ids = stickerIds(), last = ids.length ? meta(ids[ids.length - 1]) : null;
    $('#sbCoverImg').hidden = !last; $('#sbCoverQ').hidden = !!last;
    if (last) $('#sbCoverImg').src = src(last);
    const f = nFriends();
    $('#sbCardHave').innerHTML = `<b>${nStickers()}</b> sticker${nStickers() === 1 ? '' : 's'}${f || FRIENDS.length ? ` · <b>${f}</b> Star Friend${f === 1 ? '' : 's'}` : ''}`;
    card.setAttribute('aria-label', `My Sticker Book: ${plural(nStickers(), 'sticker')}, ${plural(f, 'Star Friend')}. ${$('#sbLeft').textContent}`);
  }

  /* ---------- the book ---------- */
  const perView = () => (matchMedia('(orientation: landscape) and (min-width: 700px)').matches ? 12 : 6);
  const perViewF = () => (perView() === 12 ? 4 : 2);              // Star Friends: big frames, 2 on a page
  function renderBook(hideIndex = -1) {
    const got = stk().got;
    $('#sbHave').textContent = nStickers(); $('#sbHaveF').textContent = nFriends();
    $('#sbTabS').classList.toggle('on', tab === 'stickers'); $('#sbTabF').classList.toggle('on', tab === 'friends');
    $('#sbTabS').setAttribute('aria-selected', tab === 'stickers'); $('#sbTabF').setAttribute('aria-selected', tab === 'friends');
    $('#sbook').classList.toggle('friends', tab === 'friends');
    if (tab === 'friends') return renderFriends(hideIndex);
    const ids = stickerIds(), per = perView(), total = Math.max(META.length, Math.ceil((ids.length + 1) / 6) * 6), pages = Math.ceil(total / per);
    page = Math.min(Math.max(0, page), pages - 1);
    const PER = PERD(), run = currentRun(st().days || [], api.today(), api.addDays), p = run.n % PER;
    $('#sbH1').textContent = "Maria's Sticker Book";
    $('#sbSub').textContent = `One sticker for every ${PER} days in a row`;
    const fill = (grid, from) => {
      grid.textContent = '';
      for (let k = from; k < from + 6; k++) {
        const slot = document.createElement('div'), spot = document.createElement('div'), lbl = document.createElement('div');
        spot.className = 'sb-spot'; lbl.className = 'sb-lbl';
        const i = ids[k], m = i != null ? meta(i) : null;
        if (m) {
          slot.className = 'sb-slot got'; slot.dataset.i = i; slot.dataset.k = k;
          if (i !== hideIndex) { const e = stickerEl(m); e.style.transform = `rotate(${rot(k)}deg)`; spot.append(e); }
          else slot.classList.add('waiting');
          const n = ids.slice(0, k + 1).filter(j => got[j].file === got[i].file).length;   // the same sticker again: ×2
          lbl.textContent = m.name + (n > 1 ? ` ×${n}` : '');
        } else if (k === ids.length) {
          slot.className = 'sb-slot next';
          spot.innerHTML = `<span class="sb-q">?</span><span class="sb-dots">${Array.from({ length: PER }, (_, d) => `<i class="${d < p ? 'on' : ''}"></i>`).join('')}</span>`;
          lbl.textContent = `${p} of ${PER} days`;
        } else if (k < total) {
          slot.className = 'sb-slot';
          lbl.textContent = String(k + 1);
        } else { slot.className = 'sb-slot empty'; }
        slot.append(spot, lbl); grid.append(slot);
      }
    };
    fill($('#sbG1'), page * per);
    fill($('#sbG2'), page * per + 6);
    $('#sbPageNo').textContent = `Page ${page + 1}`;
    pager(pages);
  }
  function pager(pages) {
    $('#sbPd').innerHTML = Array.from({ length: pages }, (_, k) => `<i class="${k === page ? 'on' : ''}"></i>`).join('');
    $('#sbPrev').disabled = page === 0; $('#sbNext').disabled = page >= pages - 1;
  }
  // Star Friends: each in a big golden frame, dancing; the next one is a "?" with the stickers still to go.
  function renderFriends(hideIndex = -1) {
    const ids = friendIds(), per = perViewF(), total = Math.max(FRIENDS.length, ids.length + 1), pages = Math.max(1, Math.ceil(total / per));
    page = Math.min(Math.max(0, page), pages - 1);
    $('#sbH1').textContent = 'My Star Friends';
    $('#sbSub').textContent = 'A big friend for every 2 weeks';
    const left = toNextFriend(stk().got, FRIENDS);
    const fill = (grid, from) => {
      grid.textContent = ''; grid.className = 'sb-grid sf-grid';
      for (let k = from; k < from + 2; k++) {                     // two big frames on each page
        const fr = document.createElement('div'); fr.className = 'sf-frame';
        const i = ids[k], m = i != null ? meta(i) : null;
        if (m) {
          fr.classList.add('got'); fr.dataset.i = i;
          if (i !== hideIndex) fr.append(friendEl(m)); else fr.classList.add('waiting');
          fr.insertAdjacentHTML('beforeend', `<div class="sf-name">${m.name}</div><div class="sf-no">Star Friend ${k + 1}</div>`);
        } else if (k === ids.length && left >= 0) {
          fr.classList.add('next');
          fr.innerHTML = `<span class="sb-q">?</span><div class="sf-name">${left === 0 ? 'Next reward!' : `${left} more sticker${left === 1 ? '' : 's'}`}</div>`;
        } else if (k < total) {
          fr.classList.add('locked');
          fr.innerHTML = `<span class="sb-q">?</span><div class="sf-no">Star Friend ${k + 1}</div>`;
        } else fr.classList.add('empty');
        grid.append(fr);
      }
    };
    fill($('#sbG1'), page * per);
    fill($('#sbG2'), page * per + 2);
    $('#sbPageNo').textContent = `Page ${page + 1}`;
    pager(pages);
  }
  function friendEl(m) {
    const wrap = document.createElement('div'); wrap.className = 'sf-pic';
    const img = new Image(); img.src = src(m); img.alt = m.name; img.draggable = false; img.className = 'sf-d-' + (m.dance || 'bounce');
    wrap.append(img);
    return wrap;
  }
  function setTab(t) {
    if (tab === t) return;
    tab = t;
    $('#sbG1').className = 'sb-grid'; $('#sbG2').className = 'sb-grid';
    page = t === 'friends' ? Math.floor(Math.max(0, friendIds().length - 1) / perViewF()) : Math.floor(Math.max(0, stickerIds().length - 1) / perView());
    renderBook();
    api.SFX.init(); api.SFX.flip();
  }
  function open(then) {
    api.stopEnglish();
    onClose = then || null;
    tab = 'stickers'; $('#sbG1').className = 'sb-grid'; $('#sbG2').className = 'sb-grid';
    page = Math.floor(Math.max(0, stickerIds().length - 1) / perView());
    renderBook();
    api.show('sbook');
  }
  function close() {
    const then = onClose; onClose = null;
    (then || api.home)();
  }
  function turn(d) { page += d; renderBook(); try { $('#sbBook').animate([{ opacity: .4, transform: `translateX(${d * 30}px)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' }); } catch (e) {} }
  /* ---------- tapping a sticker: it comes alive, with a glow, sparkles and a sound for its kind ---------- */
  // glitter squishy: a jelly squeeze and wobble; food: a squish and bounce; animal: a hop; sparkly: a spin.
  const GLOW = { glitter: 'rgba(255, 120, 200, .75)', food: 'rgba(255, 190, 90, .7)', animal: 'rgba(255, 216, 77, .75)' };
  const BURST = { glitter: ['#FFB3DD', '#E2CCFF', '#C7EEFF', '#FFFFFF'], food: ['#FFD27A', '#FFB3DD', '#FFFFFF'],
                  animal: ['#FFE36E', '#FFFFFF', '#B8F0D6'], sparkly: ['#FFB3D6', '#FFE98A', '#A8F0CC', '#9FD2FF', '#CDB0FF'] };
  function moves(kind, r) {
    const R = d => `rotate(${r + d}deg)`;
    if (kind === 'glitter') return [[`${R(0)} scale(1)`, 0], [`${R(0)} translateY(4%) scale(1.28, .74)`, .16], [`${R(0)} translateY(-14%) scale(.82, 1.22)`, .36],
      [`${R(0)} translateY(2%) scale(1.14, .9)`, .56], [`${R(0)} scale(.94, 1.07)`, .74], [`${R(0)} scale(1.03, .98)`, .88], [`${R(0)} scale(1)`, 1]];
    if (kind === 'food') return [[`${R(0)} scale(1)`, 0], [`${R(0)} scale(1.22, .8)`, .2], [`${R(0)} translateY(-10%) scale(.9, 1.14)`, .45],
      [`${R(0)} scale(1.06, .95)`, .7], [`${R(0)} scale(1)`, 1]];
    if (kind === 'animal') return [[`${R(0)} scale(1)`, 0], [`${R(0)} translateY(4%) scale(1.12, .9)`, .14], [`${R(-12)} translateY(-34%) scale(1.12)`, .42],
      [`${R(10)} translateY(-26%) scale(1.1)`, .6], [`${R(0)} translateY(3%) scale(1.1, .9)`, .82], [`${R(0)} scale(1)`, 1]];
    return [[`${R(0)} scale(1)`, 0], [`${R(180)} scale(1.3)`, .5], [`${R(360)} scale(1.1)`, .8], [`${R(360)} scale(1)`, 1]];   // sparkly: a spin
  }
  function play(slot) {
    const st0 = slot.querySelector('.sb-st'), spot = slot.querySelector('.sb-spot'), i = Number(slot.dataset.i), m = meta(i);
    if (!st0 || !m || slot.classList.contains('playing')) return;
    const kind = m.sparkle ? 'sparkly' : (['glitter', 'food', 'animal'].includes(m.kind) ? m.kind : 'animal'), r = rot(Number(slot.dataset.k));
    slot.classList.add('playing');
    const glow = document.createElement('div');
    glow.className = 'sb-glow' + (kind === 'sparkly' ? ' rainbow' : '');
    if (kind !== 'sparkly') glow.style.background = `radial-gradient(circle, ${GLOW[kind] || GLOW.animal} 0%, rgba(255, 255, 255, 0) 68%)`;
    spot.prepend(glow);
    const dur = kind === 'sparkly' ? 1000 : kind === 'glitter' ? 950 : 800;
    glow.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1.25)', offset: .35 }, { opacity: .9, transform: 'scale(1.15)', offset: .7 }, { opacity: 0, transform: 'scale(1.4)' }],
      { duration: dur + 300, easing: 'ease-out' }).onfinish = () => glow.remove();
    const done = () => slot.classList.remove('playing');
    if (api.reduced()) setTimeout(done, dur);
    else st0.animate(moves(kind, r).map(([transform, offset]) => ({ transform, offset })), { duration: dur, easing: 'ease-in-out' }).onfinish = done;
    st0.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.18) saturate(1.15)', offset: .35 }, { filter: 'brightness(1)' }], { duration: dur });
    setTimeout(() => burst(spot, BURST[kind], kind === 'glitter' || kind === 'food' ? 4 : 0, kind === 'sparkly' ? 18 : 12), kind === 'animal' ? 260 : 120);
    sound(kind);
  }
  function dance(fr) {                          // tapping a Star Friend: a big spin and jump, a rainbow glow
    if (fr.classList.contains('playing')) return;
    fr.classList.add('playing');
    const pic = fr.querySelector('.sf-pic');
    const glow = document.createElement('div'); glow.className = 'sb-glow rainbow'; fr.prepend(glow);
    glow.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1.1)', offset: .4 }, { opacity: 0, transform: 'scale(1.3)' }], { duration: 1400, easing: 'ease-out' }).onfinish = () => glow.remove();
    if (!api.reduced()) pic.animate([{ transform: 'none' }, { transform: 'translateY(-18%) rotate(-12deg) scale(1.15)', offset: .3 }, { transform: 'translateY(-22%) rotate(360deg) scale(1.15)', offset: .65 }, { transform: 'translateY(2%) scale(1.06, .94)', offset: .85 }, { transform: 'none' }], { duration: 1200, easing: 'ease-in-out' });
    burst(fr, BURST.sparkly, 4, 16); sound('sparkly');
    setTimeout(() => fr.classList.remove('playing'), 1300);
  }
  function nudge(slot) {                        // the next sticker's "?": a bounce, and the week's dots light up
    if (slot.classList.contains('playing')) return;
    slot.classList.add('playing');
    const spot = slot.querySelector('.sb-spot');
    if (!api.reduced()) spot.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1) rotate(-3deg)', offset: .3 }, { transform: 'scale(.96) rotate(2deg)', offset: .6 }, { transform: 'scale(1)' }], { duration: 600, easing: 'ease-out' });
    slot.querySelectorAll('.sb-dots i').forEach((d, k) => d.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.6)', boxShadow: '0 0 0 4px rgba(255, 111, 168, .35)' }, { transform: 'scale(1)' }], { duration: 380, delay: k * 70 }));
    api.SFX.init(); api.SFX.star(0); api.SFX.star(.18);
    setTimeout(() => slot.classList.remove('playing'), 900);
  }
  // little sounds made on the spot (Web Audio), quiet beside the voice
  function sound(kind) {
    const S = api.SFX; S.init();
    if (!S.ready()) return;
    const c = S.ctx, t = c.currentTime + .01;
    const glide = (f0, f1, at, dur, peak, type = 'sine') => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(f1, t + at + dur);
      g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(peak, t + at + .02); g.gain.exponentialRampToValueAtTime(.0001, t + at + dur);
      o.connect(g); g.connect(S.out); o.start(t + at); o.stop(t + at + dur + .05);
    };
    if (kind === 'glitter' || kind === 'food') { glide(520, 170, 0, .22, .35); glide(260, 620, .2, .2, .22, 'triangle'); S.star(.42); }   // squish... and back
    else if (kind === 'animal') { glide(300, 760, 0, .18, .3); glide(760, 420, .18, .2, .2); }                                     // boing
    else { [1318.5, 1568, 2093, 2637].forEach((f, k) => S.star(k * .09)); glide(880, 1760, 0, .5, .12, 'triangle'); }              // twinkle
  }
  function burst(el, colors, hearts = 0, n = 10) {
    if (api.reduced() || !el) return;
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    for (let i = 0; i < n + hearts; i++) {
      const heart = i >= n;
      const s = document.createElement('div'); s.className = 'sb-burst' + (heart ? ' heart' : '');
      s.innerHTML = `<svg aria-hidden="true"><use href="#${heart ? 'i-heart' : 'i-spark'}"/></svg>`;
      if (colors) s.style.setProperty('--c', colors[i % colors.length]);
      document.body.append(s);
      const a = (heart ? -Math.PI / 2 + (i - n - (hearts - 1) / 2) * .5 : i / n * Math.PI * 2), d = r.width * (heart ? .85 : .55 + (i % 2) * .25);
      s.animate([{ transform: `translate(${x}px, ${y}px) scale(.3)`, opacity: 1 },
                 { transform: `translate(${x + Math.cos(a) * d * .6}px, ${y + Math.sin(a) * d * .6}px) scale(1.15)`, opacity: 1, offset: .55 },
                 { transform: `translate(${x + Math.cos(a) * d}px, ${y + Math.sin(a) * d - (heart ? 20 : 0)}px) scale(.9)`, opacity: 0 }],
                { duration: heart ? 1100 : 800, easing: 'ease-out' }).onfinish = () => s.remove();
    }
  }

  /* ---------- a new sticker ---------- */
  const pendingList = () => stk().got.map((g, i) => (g.seen ? -1 : i)).filter(i => i >= 0);
  const pending = () => { const l = pendingList(); return l.length ? l[0] : -1; };
  function celebrate(then) {
    const list = pendingList();
    if (!list.length || !META.length) return then();
    api.stopEnglish();
    const got = stk().got;
    if (isFriend(got[list[0]])) return friendAward(list[0], then);
    const run = [];
    for (const i of list) { if (isFriend(got[i])) break; run.push(i); }
    stickerAward(run, then);
  }
  const more = then => { if (pending() >= 0) setTimeout(() => celebrate(then), 900); else onClose = then; };
  function stickerAward(list, then) {
    const PER = PERD(), many = list.length >= 3;          // her earlier days can give several at once
    const ov = $('#sbAward'), big = $('#sbBig'), last = list[list.length - 1];
    big.textContent = ''; big.classList.toggle('fan', many);
    if (many) {
      list.slice(0, 5).forEach((i, k, arr) => {
        const e = stickerEl(meta(i)); e.style.setProperty('--k', k - (arr.length - 1) / 2); big.append(e);
      });
      $('#sbKicker').textContent = 'Look what you earned!';
      $('#sbTitle').textContent = `${list.length} new stickers!`;
      $('#sbWeek').innerHTML = '';
      $('#sbStick').textContent = 'Stick them in my book';
    } else {
      const g = stk().got[list[0]], m = meta(list[0]);
      big.append(stickerEl(m, true));
      $('#sbKicker').textContent = `${PER} days in a row!`;
      $('#sbTitle').textContent = `A new sticker: ${m.name}!`;
      const days = Array.from({ length: PER }, (_, k) => api.addDays(g.day, k - PER + 1));
      $('#sbWeek').innerHTML = days.map(d => { const [y, mo, dd] = d.split('-').map(Number); return `<i>${'SMTWTFS'[new Date(y, mo - 1, dd).getDay()]}</i>`; }).join('');
      $('#sbStick').textContent = 'Stick it in my book';
    }
    $('#sbTally').innerHTML = countLine(nStickers(last), 'sticker', 'stickers');
    $('#sbTallyNext').textContent = friendHint(stk().got.slice(0, last + 1));
    big.style.animation = 'none'; void big.offsetWidth; big.style.animation = '';
    ov.hidden = false;
    api.SFX.init(); api.SFX.unlock();
    api.confetti($('#sbConfetti'));
    const btn = $('#sbStick');
    btn.disabled = true; setTimeout(() => { btn.disabled = false; }, 900);
    btn.onclick = () => {
      ov.hidden = true; api.stopConfetti($('#sbConfetti'));
      const queue = list.slice();
      const next = () => {
        const i = queue.shift();
        stickIn(i, () => {
          stk().got[i].seen = true; api.save();
          if (queue.length) setTimeout(next, 650); else more(then);
        });
      };
      next();
    };
  }
  // A Star Friend: a big stage with a spotlight; she dances; then she goes onto her page in the book.
  function friendAward(i, then) {
    const m = meta(i), ov = $('#sfAward'), hero = $('#sfHero');
    hero.querySelectorAll('.sf-pic').forEach(e => e.remove());
    hero.prepend(friendEl(m));
    const orbit = $('#sfOrbit'); orbit.textContent = '';
    for (let k = 0; k < 6; k++) { const s2 = document.createElement('i'); s2.innerHTML = '<svg aria-hidden="true"><use href="#i-spark"/></svg>'; const a = k / 6 * Math.PI * 2; s2.style.left = `${50 + Math.cos(a) * 50 - 3}%`; s2.style.top = `${50 + Math.sin(a) * 50 - 3}%`; orbit.append(s2); }
    const notes = $('#sfNotes'); notes.textContent = '';
    ['♪', '♫', '♪', '♬'].forEach((n, k) => { const s2 = document.createElement('span'); s2.textContent = n; s2.style.left = `${[6, 86, 16, 76][k]}%`; s2.style.top = `${[60, 50, 30, 20][k]}%`; s2.style.animationDelay = `${k * .6}s`; s2.style.color = ['#FF6FA8', '#B892F2', '#2EAD5B', '#FFB21E'][k]; notes.append(s2); });
    $('#sfTitle').textContent = `A big Star Friend: ${m.name}!`;
    $('#sfTally').innerHTML = countLine(nFriends(i), 'Star Friend', 'Star Friends');
    ov.hidden = false;
    api.SFX.init(); api.SFX.unlock(); setTimeout(() => api.SFX.unlock(), 700);
    api.confetti($('#sfConfetti'));
    const btn = $('#sfPut');
    btn.disabled = true; setTimeout(() => { btn.disabled = false; }, 1200);
    btn.onclick = () => {
      ov.hidden = true; api.stopConfetti($('#sfConfetti'));
      putIn(i, () => { stk().got[i].seen = true; api.save(); more(then); });
    };
  }
  function putIn(i, done) {
    onClose = null;
    tab = 'friends';
    page = Math.floor(friendIds().indexOf(i) / perViewF());
    renderBook(i);
    api.show('sbook');
    const fr = document.querySelector(`#sbook .sf-frame[data-i="${i}"]`);
    if (!fr) return done();
    fr.classList.remove('waiting');
    const pic = friendEl(meta(i)); fr.prepend(pic);
    if (!api.reduced()) pic.animate([{ transform: 'scale(.2) rotate(-20deg)', opacity: 0 }, { transform: 'scale(1.15) rotate(5deg)', opacity: 1, offset: .6 }, { transform: 'scale(1)' }], { duration: 900, easing: 'cubic-bezier(.3, 1.4, .5, 1)' });
    setTimeout(() => { burst(fr, BURST.sparkly, 4, 18); sound('sparkly'); bump($('#sbTabF')); done(); }, api.reduced() ? 0 : 500);
  }
  // the count on the tab grows: a little jump and a "+1"
  function bump(tabEl) {
    if (!tabEl) return;
    const b = tabEl.querySelector('b');
    if (!api.reduced()) b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.6)', offset: .4 }, { transform: 'scale(1)' }], { duration: 600, easing: 'ease-out' });
    const r = tabEl.getBoundingClientRect(), plus = document.createElement('div');
    plus.className = 'sb-plus'; plus.textContent = '+1';
    plus.style.left = (r.right - 22) + 'px'; plus.style.top = (r.top - 4) + 'px';
    document.body.append(plus);
    plus.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-36px)', opacity: 0 }], { duration: 1000, easing: 'ease-out' }).onfinish = () => plus.remove();
  }
  // The new sticker flies from the middle of the screen into its place in the book, then squishes down.
  function stickIn(i, done) {
    onClose = null;
    tab = 'stickers'; $('#sbG1').className = 'sb-grid'; $('#sbG2').className = 'sb-grid';
    const k0 = stickerIds().indexOf(i);
    page = Math.floor(k0 / perView());
    renderBook(i);
    api.show('sbook');
    const slot = document.querySelector(`#sbook .sb-slot[data-i="${i}"]`), m = meta(i);
    // the stickers still waiting to be stuck in stay empty on this page until their turn
    stk().got.forEach((g, k) => { if (!g.seen && k !== i) { const o = document.querySelector(`#sbook .sb-slot[data-i="${k}"]`); if (o) { o.classList.add('waiting'); const e = o.querySelector('.sb-st'); if (e) e.remove(); } } });
    $('#sbHave').textContent = stk().got.filter(g => !isFriend(g) && g.seen).length;
    const reveal = () => {
      slot.classList.remove('waiting');
      const spot = slot.querySelector('.sb-spot'), e = stickerEl(m), r = rot(k0);
      e.style.transform = `rotate(${r}deg)`; spot.append(e);
      if (!api.reduced()) e.animate([{ transform: `rotate(${r}deg) scale(1.18, .86)` }, { transform: `rotate(${r}deg) scale(.94, 1.06)` }, { transform: `rotate(${r}deg) scale(1)` }], { duration: 420, easing: 'ease-out' });
      burst(spot); api.SFX.flip(); api.SFX.star(.1); api.SFX.star(.28);
      // the count goes up where she can see it
      $('#sbHave').textContent = stk().got.filter((g, j) => !isFriend(g) && (g.seen || j === i)).length; bump($('#sbTabS'));
      done();
    };
    if (!slot) return done();
    if (api.reduced()) return reveal();
    requestAnimationFrame(() => {
      const t = slot.querySelector('.sb-spot').getBoundingClientRect();
      const W = Math.min(innerWidth, innerHeight) * .42, size = t.width * 1.18;
      const fly = new Image(); fly.src = src(m); fly.className = 'sb-fly'; fly.style.width = fly.style.height = W + 'px';
      document.body.append(fly);
      const cx = innerWidth / 2 - W / 2, cy = innerHeight / 2 - W / 2, tx = t.left + t.width / 2 - W / 2, ty = t.top + t.height / 2 - W / 2;
      fly.animate([
        { transform: `translate(${cx}px, ${cy}px) scale(1) rotate(-10deg)` },
        { transform: `translate(${(cx + tx) / 2}px, ${Math.min(cy, ty) - 40}px) scale(${(1 + size / W) / 2 + .1}) rotate(6deg)`, offset: .55 },
        { transform: `translate(${tx}px, ${ty}px) scale(${size / W}) rotate(${rot(k0)}deg)` }
      ], { duration: 950, easing: 'cubic-bezier(.45, 0, .3, 1)' }).onfinish = () => { fly.remove(); reveal(); };
    });
  }

  /* ---------- wiring ---------- */
  card.addEventListener('click', () => { api.SFX.init(); open(); });
  $('#sbClose').addEventListener('click', close);
  $('#sbTabS').addEventListener('click', () => setTab('stickers'));
  $('#sbTabF').addEventListener('click', () => setTab('friends'));
  $('#sbPrev').addEventListener('click', () => turn(-1));
  $('#sbNext').addEventListener('click', () => turn(1));
  $('#sbook').addEventListener('click', e => {
    const f = e.target.closest('.sf-frame.got');
    if (f && !f.classList.contains('waiting')) return dance(f);
    const s = e.target.closest('.sb-slot'); if (!s || s.classList.contains('waiting')) return;
    if (s.classList.contains('got')) play(s); else if (s.classList.contains('next')) nudge(s);
  });
  let sx = null;                                   // swipe to turn the page
  $('#sbook').addEventListener('pointerdown', e => { sx = e.clientX; });
  $('#sbook').addEventListener('pointerup', e => {
    if (sx == null) return; const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 60) { if (dx < 0 && !$('#sbNext').disabled) turn(1); else if (dx > 0 && !$('#sbPrev').disabled) turn(-1); }
  });
  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (!$('#sbook').hidden && !document.querySelector('.sb-fly')) renderBook(); }, 150); });

  const ready = fetch('stickers/stickers.json').then(r => r.json())
    .then(j => { META = Array.isArray(j.stickers) ? j.stickers : []; LEGACY = Array.isArray(j.legacy) ? j.legacy : []; FRIENDS = Array.isArray(j.friends) ? j.friends : []; })
    .catch(() => { META = []; });

  return {
    ready,
    sync() { if (!META.length) return 0; const n = sync(stk(), st().days || [], api.addDays, PERD(), META, FRIENDS); if (n) api.save(); return n; },
    homeCard() { if (META.length) homeCard(); },
    pending: () => META.length ? pending() >= 0 : false,
    celebrate, open,
    busy: () => !$('#sbook').hidden || !$('#sbAward').hidden || !$('#sfAward').hidden,
    count: () => nStickers(),
    friends: () => nFriends(),
    friendsTotal: () => FRIENDS.length,
    toFriend: () => toNextFriend(stk().got, FRIENDS),
    nextIn: () => PERD() - currentRun(st().days || [], api.today(), api.addDays).n % PERD(),
    per: PERD,
    get meta() { return META; }, core
  };
}

root.StickerBook = { core, mount };
})(typeof window !== 'undefined' ? window : globalThis);
