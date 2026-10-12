/* Maria's Sticker Book: one sticker for every 7 days in a row on the English cards.
   Loaded before app.js; app.js calls StickerBook.mount(api) for Maria. Collected stickers live in her profile
   (st.stk), so the backup file carries them. The pictures and their order are in stickers/stickers.json. */
(function (root) {
'use strict';

const PER = 7;   // days in a row for one sticker

/* ---------- which days earn a sticker (no DOM: scripts/test_stickers.js runs this in Node) ---------- */
// The 7th, 14th, 21st... day of every run of days in a row.
function earnedDays(days, addDays) {
  const out = [];
  let run = 0, prev = null;
  [...new Set(days)].sort().forEach(d => {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    prev = d;
    if (run % PER === 0) out.push(d);
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
// Adds the stickers she has earned and not yet received. Stickers are never taken away.
function sync(stk, days, addDays) {
  const e = earnedDays(days, addDays);
  let added = 0;
  while (stk.got.length < e.length) { stk.got.push({ day: e[stk.got.length], seen: false }); added++; }
  return added;
}
const core = { PER, earnedDays, currentRun, sync };

/* ---------- the screens ---------- */
function mount(api) {
  const $ = (s, r = document) => r.querySelector(s);
  let META = [];
  let page = 0;
  let onClose = null;
  const st = () => api.st();
  function stk() { const s = st(); if (!s.stk || !Array.isArray(s.stk.got)) s.stk = { got: [] }; return s.stk; }
  const meta = i => META.length ? META[i % META.length] : null;
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
    <div class="sb-count"><svg class="star" aria-hidden="true"><use href="#i-star"/></svg><b id="sbHave">0</b><span id="sbHaveWord">stickers</span></div>
  </div>
  <div class="sb-book" id="sbBook">
    <div class="sb-page left"><h1><span>Maria's Sticker Book</span></h1><h2>One sticker for every 7 days in a row</h2><div class="sb-grid" id="sbG1"></div></div>
    <div class="sb-page right"><h2 class="sb-pno" id="sbPageNo"></h2><div class="sb-grid" id="sbG2"></div></div>
  </div>
  <div class="sb-pager"><button id="sbPrev" aria-label="Previous page">‹</button><div class="sb-pd" id="sbPd"></div><button id="sbNext" aria-label="Next page">›</button></div>
</section>
<section id="sbAward" class="overlay sb-award" hidden>
  <canvas id="sbConfetti" aria-hidden="true"></canvas>
  <div class="sb-kicker">7 days in a row!</div>
  <div class="sb-big" id="sbBig"></div>
  <h2 class="sb-title" id="sbTitle"></h2>
  <div class="sb-week" id="sbWeek"></div>
  <button id="sbStick" class="btn btn-good">Stick it in my book</button>
</section>`);

  // the way in, on the English Home screen
  const card = document.createElement('button');
  card.className = 'sb-card maria-only'; card.id = 'sbCard';
  card.innerHTML = `<span class="sb-cover"><img id="sbCoverImg" alt="" hidden><b id="sbCoverQ">?</b></span>
    <span class="sb-info"><b>My Sticker Book</b><span class="sb-dots" id="sbDots"></span><span class="sb-left" id="sbLeft"></span></span>`;
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
    const p = run.n % PER, justGot = run.today && run.n > 0 && p === 0;
    const filled = justGot ? PER : p;
    $('#sbDots').innerHTML = Array.from({ length: PER }, (_, k) => `<i class="${k < filled ? 'on' : ''}"></i>`).join('');
    const left = PER - p;
    $('#sbLeft').textContent = justGot ? 'A new sticker today!' : `${plural(left, 'more day')} to the next sticker`;
    const last = got.length ? meta(got.length - 1) : null;
    $('#sbCoverImg').hidden = !last; $('#sbCoverQ').hidden = !!last;
    if (last) $('#sbCoverImg').src = src(last);
    card.setAttribute('aria-label', `My Sticker Book: ${plural(got.length, 'sticker')}. ${$('#sbLeft').textContent}`);
  }

  /* ---------- the book ---------- */
  const perView = () => (matchMedia('(orientation: landscape) and (min-width: 700px)').matches ? 12 : 6);
  const total = () => Math.max(META.length, Math.ceil((stk().got.length + 1) / 6) * 6);
  function renderBook(hideIndex = -1) {
    const got = stk().got, per = perView(), pages = Math.ceil(total() / per);
    page = Math.min(Math.max(0, page), pages - 1);
    const run = currentRun(st().days || [], api.today(), api.addDays), p = run.n % PER;
    $('#sbHave').textContent = got.length; $('#sbHaveWord').textContent = got.length === 1 ? 'sticker' : 'stickers';
    const fill = (grid, from) => {
      grid.textContent = '';
      for (let i = from; i < from + 6; i++) {
        const slot = document.createElement('div'), spot = document.createElement('div'), lbl = document.createElement('div');
        slot.dataset.i = i; spot.className = 'sb-spot'; lbl.className = 'sb-lbl';
        const m = meta(i);
        if (i < got.length && m) {
          slot.className = 'sb-slot got';
          if (i !== hideIndex) { const e = stickerEl(m); e.style.transform = `rotate(${rot(i)}deg)`; spot.append(e); }
          else slot.classList.add('waiting');
          lbl.textContent = m.name + (i >= META.length ? ` ×${Math.floor(i / META.length) + 1}` : '');
        } else if (i === got.length) {
          slot.className = 'sb-slot next';
          spot.innerHTML = `<span class="sb-q">?</span><span class="sb-dots">${Array.from({ length: PER }, (_, k) => `<i class="${k < p ? 'on' : ''}"></i>`).join('')}</span>`;
          lbl.textContent = `${p} of ${PER} days`;
        } else if (i < total()) {
          slot.className = 'sb-slot';
          lbl.textContent = `Week ${i + 1}`;
        } else { slot.className = 'sb-slot empty'; }
        slot.append(spot, lbl); grid.append(slot);
      }
    };
    fill($('#sbG1'), page * per);
    fill($('#sbG2'), page * per + 6);
    $('#sbPageNo').textContent = `Page ${page + 1}`;
    $('#sbPd').innerHTML = Array.from({ length: pages }, (_, k) => `<i class="${k === page ? 'on' : ''}"></i>`).join('');
    $('#sbPrev').disabled = page === 0; $('#sbNext').disabled = page >= pages - 1;
  }
  function open(then) {
    api.stopEnglish();
    onClose = then || null;
    page = Math.floor(Math.max(0, stk().got.length - 1) / perView());
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
    const kind = m.sparkle ? 'sparkly' : (m.kind || 'animal'), r = rot(i);
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
  const pending = () => stk().got.findIndex(g => !g.seen);
  function celebrate(then) {
    const i = pending();
    if (i < 0 || !META.length) return then();
    api.stopEnglish();
    const g = stk().got[i], m = meta(i);
    const ov = $('#sbAward'), big = $('#sbBig');
    big.textContent = ''; big.append(stickerEl(m, true));
    big.style.animation = 'none'; void big.offsetWidth; big.style.animation = '';
    $('#sbTitle').textContent = `A new sticker: ${m.name}!`;
    const days = Array.from({ length: PER }, (_, k) => api.addDays(g.day, k - PER + 1));
    $('#sbWeek').innerHTML = days.map(d => { const [y, mo, dd] = d.split('-').map(Number); return `<i>${'SMTWTFS'[new Date(y, mo - 1, dd).getDay()]}</i>`; }).join('');
    ov.hidden = false;
    api.SFX.init(); api.SFX.unlock();
    api.confetti($('#sbConfetti'));
    const btn = $('#sbStick');
    btn.disabled = true; setTimeout(() => { btn.disabled = false; }, 900);
    btn.onclick = () => {
      ov.hidden = true; api.stopConfetti($('#sbConfetti'));
      stickIn(i, () => {
        g.seen = true; api.save();
        if (pending() >= 0) setTimeout(() => celebrate(then), 900);   // more than one waiting (her earlier weeks)
        else onClose = then;
      });
    };
  }
  // The new sticker flies from the middle of the screen into its place in the book, then squishes down.
  function stickIn(i, done) {
    onClose = null;
    page = Math.floor(i / perView());
    renderBook(i);
    api.show('sbook');
    const slot = document.querySelector(`#sbook .sb-slot[data-i="${i}"]`), m = meta(i);
    const reveal = () => {
      slot.classList.remove('waiting');
      const spot = slot.querySelector('.sb-spot'), e = stickerEl(m);
      e.style.transform = `rotate(${rot(i)}deg)`; spot.append(e);
      if (!api.reduced()) e.animate([{ transform: `rotate(${rot(i)}deg) scale(1.18, .86)` }, { transform: `rotate(${rot(i)}deg) scale(.94, 1.06)` }, { transform: `rotate(${rot(i)}deg) scale(1)` }], { duration: 420, easing: 'ease-out' });
      burst(spot); api.SFX.flip(); api.SFX.star(.1); api.SFX.star(.28);
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
        { transform: `translate(${tx}px, ${ty}px) scale(${size / W}) rotate(${rot(i)}deg)` }
      ], { duration: 950, easing: 'cubic-bezier(.45, 0, .3, 1)' }).onfinish = () => { fly.remove(); reveal(); };
    });
  }

  /* ---------- wiring ---------- */
  card.addEventListener('click', () => { api.SFX.init(); open(); });
  $('#sbClose').addEventListener('click', close);
  $('#sbPrev').addEventListener('click', () => turn(-1));
  $('#sbNext').addEventListener('click', () => turn(1));
  $('#sbook').addEventListener('click', e => {
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

  const ready = fetch('stickers/stickers.json').then(r => r.json()).then(j => { META = Array.isArray(j.stickers) ? j.stickers : []; }).catch(() => { META = []; });

  return {
    ready,
    sync() { const n = sync(stk(), st().days || [], api.addDays); if (n) api.save(); return n; },
    homeCard() { if (META.length) homeCard(); },
    pending: () => META.length ? pending() >= 0 : false,
    celebrate, open,
    busy: () => !$('#sbook').hidden || !$('#sbAward').hidden,
    count: () => stk().got.length,
    nextIn: () => PER - currentRun(st().days || [], api.today(), api.addDays).n % PER,
    get meta() { return META; }, core
  };
}

root.StickerBook = { core, mount };
})(typeof window !== 'undefined' ? window : globalThis);
