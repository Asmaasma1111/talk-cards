/* مسرح المسائل: stage 1, place value (القيمة المنزلية). Squares of hundreds, sticks of tens, single cubes.
   Numbers are written left to right with their place-value columns (آلاف مئات عشرات آحاد), as in her school book.
   mount(host, m, story, done): each shape has its own small act-out that ends with the answer. */
(function (TH) {
'use strict';
const C = TH.core, U = TH.ui, { el } = U;
const COLS = [[1000, 'آلاف'], [100, 'مئات'], [10, 'عشرات'], [1, 'آحاد']];
const colsFor = n => COLS.filter(([v]) => v === 1 || v <= n);

// the place-value colours, the same on every screen: آلاف pink, مئات blue, عشرات orange, آحاد green
function chart(n, key, opts) {
  opts = opts || {};
  const cols = colsFor(Math.max(n, opts.atLeast || 0));
  return el('div', { class: 'pv-chart', dir: 'ltr' }, ...cols.map(([v, name]) => {
    const k = Math.floor(n / v) % 10;
    const body = el('div', { class: 'pv-body' });
    // empty: places kept for the pieces still to come, so nothing jumps when they arrive
    for (let i = 0; i < k; i++) body.append(opts.empty ? el('span', { class: 'pc-hole', 'data-v': v }, TH.act.pieceEl(v, key, 'blocks')) : TH.act.pieceEl(v, key, 'blocks'));
    return el('div', { class: 'pv-col c' + v, 'data-v': v }, el('div', { class: 'pv-name' }, name), body, el('div', { class: 'pv-digit' }, opts.empty ? '' : C.ar(k)));
  }));
}
// the question and a number pad in the answer place; it waits (dimmed) until the act-out is finished
function answerPad(dock, ask, want, done) {
  const box = el('span', { class: 'ans-box' }, '');
  let typed = '', wrong = 0;
  const ok = el('button', { class: 'btn btn-done', type: 'button' }, U.icon('tick'));
  const pad = TH.sentence.keypad(k => { if (wrap.classList.contains('wait')) return; if (k === 'del') typed = typed.slice(0, -1); else if (typed.length < 5) typed += k; box.textContent = C.ar(typed); });
  const row = el('div', { class: 'ans-row', dir: 'rtl' }, el('span', { class: 'ask' }, ask), box);
  const wrap = el('div', { class: 'ans-wrap pv-answer' }, row, el('div', { class: 'ans-foot' }, pad, ok));
  dock.append(wrap);
  ok.addEventListener('click', () => {
    if (!typed || wrap.classList.contains('wait')) return;
    if (+typed === want) { U.sound('good'); ok.disabled = true; setTimeout(() => done(+typed), 600); return; }
    wrong++; typed = ''; box.textContent = ''; U.sound('soft'); U.toast(wrong >= 2 ? 'انظري إلى الأعمدة: كم في كل عمود؟' : 'عُدّي مرّة أخرى.');
  });
  return wrap;
}
const askOf = story => story.text.split('.').pop().trim();

/* تكوين عدد: the pieces wait in a pile; she drags each into its column; the digits appear; she writes the number */
function make(S, m, story, done) {
  const key = story.thing;
  const pile = el('div', { class: 'pv-pile', 'data-col': 'pile', dir: 'ltr' });
  Object.entries(story.pieces).sort((a, b) => b[0] - a[0]).forEach(([v, k]) => { for (let i = 0; i < k; i++) pile.append(TH.act.pieceEl(+v, key, 'blocks')); });
  const ch = chart(m.ans, key, { empty: true });
  S.board.append(el('div', { class: 'pv make' }, pile, ch)); U.fit(S.board, { max: 1.6 });
  const pad = answerPad(S.dock, askOf(story), m.ans, done); pad.classList.add('wait');
  const left = () => pile.querySelectorAll('.pc:not(.used)').length;
  TH.bars.drag(S.root, {
    chip: '.pv-pile .pc', target: '.pv-col',
    accept(p, col) {
      if (+col.dataset.v !== +p.dataset.v) return false;
      const spot = col.querySelector('.pc-hole:not(.full)');
      if (!spot) return false;
      // its place in the pile stays (empty), and it fills the next place kept for it in the column: nothing else moves
      p.classList.add('used');
      spot.textContent = ''; spot.append(TH.act.pieceEl(+p.dataset.v, key, 'blocks')); spot.classList.add('full');
      const k = col.querySelectorAll('.pc-hole.full').length; col.querySelector('.pv-digit').textContent = C.ar(k);
      U.sound('drop'); U.count(k);
      if (!left()) {
        ch.querySelectorAll('.pv-digit').forEach(d => { if (!d.textContent) d.textContent = '٠'; });
        setTimeout(() => { pad.classList.remove('wait'); U.sound('pop'); }, 400);
      }
      return true;
    }
  });
}

/* مقارنة أعداد: one table, a row for each child, the places one above the other (as in her book); she puts > < or =
   between the two numbers, then picks who has more. The signs and the names are always on screen, beside or under the table. */
function compare(S, m, story, done) {
  const [a, b] = C.known(story), key = story.thing;
  const cols = colsFor(Math.max(a, b));
  const cell = (n, v) => { const k = Math.floor(n / v) % 10; return el('div', { class: 'pt-cell c' + v }, el('div', { class: 'pv-body' }, ...Array.from({ length: k }, () => TH.act.pieceEl(v, key, 'blocks'))), el('div', { class: 'pv-digit' }, C.ar(k))); };
  const table = el('div', { class: 'pv-table', dir: 'ltr', style: { '--n': cols.length } },
    ...cols.map(([v, name]) => el('div', { class: 'pt-head c' + v }, name)), el('div', { class: 'pt-corner' }),
    ...[a, b].map((n, i) => [...cols.map(([v]) => cell(n, v)), el('div', { class: 'pt-who' }, el('b', {}, story.who[i]), el('span', { class: 'pv-num' }, C.ar(n)))]).flat());
  S.board.append(el('div', { class: 'pv compare' }, table)); U.fit(S.board, { max: 1.5 });
  const slot = el('span', { class: 'sl op' });
  const line = el('div', { class: 'cmp-line', dir: 'ltr' }, el('span', { class: 'n' }, C.ar(a)), slot, el('span', { class: 'n' }, C.ar(b)));
  // left to right, as the line reads: in a right-to-left row the iPad would draw < as > (bidi mirroring)
  const signs = el('div', { class: 'tiles-o', dir: 'ltr' }, ...['>', '<', '='].map(s => el('button', { class: 'tile opk', type: 'button', 'data-v': s }, s)));
  S.dock.append(line, signs);
  const pick = s => {
    if (slot.classList.contains('filled')) return;
    if (s !== m.sign) { U.sound('soft'); U.toast('قارني ' + (cols.length > 3 ? 'الآلاف' : 'المئات') + ' أوّلًا.'); return; }
    slot.textContent = s; slot.classList.add('filled'); signs.remove(); U.sound('good');
    S.dock.append(el('div', { class: 'who-pick' }, el('div', { class: 'ask' }, askOf(story)), el('div', { class: 'who-row' }, ...story.who.map(n => el('button', { class: 'btn btn-who', type: 'button', onclick: e => {
      if (n === m.ans) { U.sound('good'); e.currentTarget.classList.add('right'); setTimeout(() => done(n), 500); } else { U.sound('soft'); U.toast('انظري إلى العلامة.'); }
    } }, n)))));
  };
  TH.bars.drag(S.root, { chip: '.tile', target: '.sl', accept: (t) => { pick(t.dataset.v); return true; }, tap: t => pick(t.dataset.v) });
}

/* ترتيب أعداد: three cards into three places, from the most to the least */
function order(S, m, story, done) {
  const n = C.known(story);
  const cards = story.who.map((w, i) => el('button', { class: 'ord-card', type: 'button', 'data-w': w }, el('b', {}, w), el('span', {}, C.ar(n[i]))));
  const places = ['الأكثر', '', 'الأقلّ'].map((t, i) => el('div', { class: 'ord-place', 'data-i': i }, el('span', { class: 'ord-tag' }, t)));
  const ok = el('button', { class: 'btn btn-done', type: 'button' }, U.icon('tick'));
  const tray = el('div', { class: 'ord-cards' }, ...cards);
  S.board.append(el('div', { class: 'pv order' }, tray, el('div', { class: 'ord-places' }, ...places))); U.fit(S.board, { max: 1.5 });
  S.dock.append(ok);
  TH.bars.drag(S.root, {
    chip: '.ord-card', target: '.ord-place, .ord-cards',
    accept(c, t) {
      if (t.classList.contains('ord-cards')) { t.append(c); U.sound('tap'); return true; }
      const old = t.querySelector('.ord-card'); if (old) tray.append(old);
      t.append(c); U.sound('drop'); return true;
    }
  });
  ok.addEventListener('click', () => {
    const got = places.map(p => { const c = p.querySelector('.ord-card'); return c && c.dataset.w; });
    if (got.some(x => !x)) { U.sound('soft'); U.toast('ضعي البطاقات الثلاث.'); return; }
    if (got.join() === m.ans.join()) { U.sound('good'); done(got); }
    else { U.sound('soft'); U.toast('قارني الآلاف أوّلًا، ثم المئات.'); }
  });
}

/* تقريب: a number line between the two round numbers; she drags the ball to the nearer one */
function round(S, m, story, done) {
  const lo = Math.floor(m.from / m.to) * m.to, hi = lo + m.to, mid = lo + m.to / 2;
  const at = v => ((v - lo) / (hi - lo)) * 100;
  const ball = el('span', { class: 'nl-ball', style: { left: at(m.from) + '%' } }, C.ar(m.from));
  const ends = [lo, hi].map(v => el('span', { class: 'nl-end', 'data-v': v, style: { left: at(v) + '%' } }, el('i'), el('b', {}, C.ar(v))));
  const line = el('div', { class: 'nl', dir: 'ltr' }, el('span', { class: 'nl-bar' }), ...ends,
    el('span', { class: 'nl-mid', style: { left: '50%' } }, el('i'), el('b', {}, C.ar(mid))), ball);
  S.board.append(el('div', { class: 'pv round' }, line)); U.fit(S.board, { max: 1.4 });
  const res = el('div', { class: 'cmp-line', dir: 'ltr' }, el('span', { class: 'n' }, C.ar(m.from)), el('span', { class: 'sl op' }, '≈'), el('span', { class: 'sl ans' }, ''));
  S.dock.append(res);
  let d = null;
  const xOf = e => { const r = line.getBoundingClientRect(); return (e.clientX - r.left) / r.width; };
  ball.addEventListener('pointerdown', e => { e.preventDefault(); d = { id: e.pointerId }; try { ball.setPointerCapture(e.pointerId); } catch (err) {} ball.classList.add('lifted'); U.sound('pick'); });
  ball.addEventListener('pointermove', e => { if (!d) return; ball.style.left = (Math.max(0, Math.min(1, xOf(e))) * 100) + '%'; });
  const up = e => {
    if (!d) return; d = null; ball.classList.remove('lifted');
    const x = xOf(e);
    const end = x < 0.3 ? lo : x > 0.7 ? hi : null;
    if (end == null) { ball.style.left = at(m.from) + '%'; U.sound('tap'); return; }
    ball.style.left = at(end) + '%';
    if (end === m.ans) { U.sound('good'); ball.textContent = C.ar(end); ends.forEach(e2 => e2.classList.toggle('won', +e2.dataset.v === end));
      const a = res.querySelector('.ans'); a.textContent = C.ar(end); a.classList.add('filled');
      setTimeout(() => done(end), 900); }
    else { U.sound('soft'); U.toast('أيّهما أقرب؟ انظري إلى المنتصف.'); setTimeout(() => { ball.style.left = at(m.from) + '%'; }, 700); }
  };
  ball.addEventListener('pointerup', up);
  ball.addEventListener('pointercancel', () => { d = null; ball.classList.remove('lifted'); ball.style.left = at(m.from) + '%'; });
}

/* أكبر عدد / أصغر عدد: three digit cards into the columns */
function digits(S, m, story, done, smallest) {
  const cards = m.digits.map(d => el('button', { class: 'dg-card', type: 'button', 'data-d': d }, C.ar(d)));
  const cols = [[100, 'مئات'], [10, 'عشرات'], [1, 'آحاد']].map(([v, name]) => el('div', { class: 'dg-col c' + v, 'data-v': v }, el('div', { class: 'pv-name' }, name), el('div', { class: 'dg-slot' })));
  const ok = el('button', { class: 'btn btn-done', type: 'button' }, U.icon('tick'));
  const tray = el('div', { class: 'dg-cards' }, ...cards);
  S.board.append(el('div', { class: 'pv digits' }, tray, el('div', { class: 'dg-cols', dir: 'ltr' }, ...cols))); U.fit(S.board, { max: 1.5 });
  S.dock.append(ok);
  TH.bars.drag(S.root, {
    chip: '.dg-card', target: '.dg-slot, .dg-cards',
    accept(c, t) {
      if (t.classList.contains('dg-cards')) { t.append(c); U.sound('tap'); return true; }
      const old = t.querySelector('.dg-card'); if (old) tray.append(old);
      t.append(c); U.sound('drop'); return true;
    }
  });
  ok.addEventListener('click', () => {
    const got = cols.map(c => { const k = c.querySelector('.dg-card'); return k ? k.dataset.d : null; });
    if (got.some(x => x == null)) { U.sound('soft'); U.toast('ضعي البطاقات الثلاث.'); return; }
    if (smallest && got[0] === '0') { U.sound('soft'); U.toast('لا يبدأ العدد بصفر.'); return; }
    if (+got.join('') === m.ans) { U.sound('good'); done(m.ans); }
    else { U.sound('soft'); U.toast(smallest ? 'هل يمكن أن يكون أصغر؟' : 'هل يمكن أن يكون أكبر؟'); }
  });
}

/* قيمة منزلية: notes of 1000, 100, 10 and 1 riyal into the wallet until it holds the price */
function notes(S, m, story, done) {
  // the notes lie in the same order as the wallet's columns under them (آلاف on the left, as in her book)
  const supply = el('div', { class: 'notes-supply', dir: 'ltr' }, ...[1000, 100, 10, 1].map(v => el('button', { class: 'note n' + v, type: 'button', 'data-v': v }, C.ar(v))));
  const wallet = el('div', { class: 'wallet', dir: 'ltr' }, ...COLS.map(([v, name]) => el('div', { class: 'w-col c' + v, 'data-v': v }, el('div', { class: 'pv-name' }, name), el('div', { class: 'w-body' }), el('div', { class: 'pv-digit' }, '٠'))));
  const total = el('span', { class: 'z-count' }, '٠');
  const ok = el('button', { class: 'btn btn-done', type: 'button' }, U.icon('tick'));
  S.board.append(el('div', { class: 'pv notes' }, supply, wallet)); U.fit(S.board, { max: 1.4 });
  S.dock.append(el('div', { class: 'wallet-head' }, el('span', {}, 'المحفظة'), total), ok);
  const sum = () => Array.from(wallet.querySelectorAll('.note')).reduce((t, n) => t + +n.dataset.v, 0);
  const refresh = () => { total.textContent = C.ar(sum()); wallet.querySelectorAll('.w-col').forEach(c => { c.querySelector('.pv-digit').textContent = C.ar(c.querySelectorAll('.note').length); }); };
  TH.bars.drag(S.root, {
    chip: '.note', target: '.w-col, .notes-supply',
    accept(n, t) {
      if (t.classList.contains('notes-supply')) { if (n.closest('.wallet')) { n.remove(); refresh(); U.sound('tap'); } return true; }
      if (+t.dataset.v !== +n.dataset.v) return false;
      const c = n.closest('.wallet') ? n : n.cloneNode(true);
      c.classList.remove('lifted', 'picked'); t.querySelector('.w-body').append(c); refresh(); U.sound('drop'); U.count(sum());
      return true;
    }
  });
  ok.addEventListener('click', () => {
    const counts = [1000, 100, 10, 1].map(v => wallet.querySelectorAll(`.w-col[data-v="${v}"] .note`).length);
    if (sum() !== m.total) { U.sound('soft'); U.toast(sum() < m.total ? 'المحفظة فيها أقلّ من الثمن.' : 'المحفظة فيها أكثر من الثمن.'); return; }
    if (counts.some(k => k >= 10)) { U.sound('soft'); U.toast('عشر أوراق تساوي ورقة أكبر.'); return; }
    U.sound('good'); done(counts);
  });
}

function mount(S, m, story, done) {
  ({ 'pv-make': make, 'pv-compare': compare, 'pv-order': order, 'pv-round': round, 'pv-notes': notes,
     'pv-max': (h, a, b, d) => digits(h, a, b, d, false), 'pv-min': (h, a, b, d) => digits(h, a, b, d, true) })[m.shape](S, m, story, done);
}
TH.pv = { mount, chart };
})(window.TH);
