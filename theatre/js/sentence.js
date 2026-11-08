/* مسرح المسائل: scene 4, the numbers arrive. She builds the number sentence herself from tiles (+ − × ÷, the story's
   numbers and ?), written right to left as in her book, then writes the answer on a number pad.
   Any true sentence with the story's numbers and one ? is right (١٢٥ + ٢٤٨ = ؟, ٢٤٥ + ؟ = ٤٠٠, ٤٠٠ − ٢٤٥ = ؟).
   Wrong is never red: the story is read again; after two tries the bar shows the number she counted. */
(function (TH) {
'use strict';
const C = TH.core, U = TH.ui, { el } = U;

// iPad on its side: a phone-style block of keys in the answer column. Upright: one row of keys under the stage
// (CSS reorders them to ١ ٢ ... ٩ ٠ ⌫ with --o).
// her request (8 Nov 2026): the phone order of جدول الضرب, ١ ٢ ٣ on the top row (written right to left), then ٤ ٥ ٦, ٧ ٨ ٩,
// and the delete key and ٠ at the bottom. Upright, the keys make one row in the same order.
const GLASS = true;           // the see-through keypad, approved 8 Nov 2026 ("the keyboard is nice")
function keypad(onKey) {
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'del', 0];
  const row = k => (k === 'del' ? 11 : k === 0 ? 10 : k);
  const pad = el('div', { class: 'keypad' + (GLASS ? ' glass' : ''), dir: 'rtl' }, ...keys.map(k => el('button', {
    class: 'key' + (k === 'del' ? ' del' : ''), type: 'button', style: { '--o': row(k) }, onclick: () => { U.sound('tap'); onKey(k); }
  }, k === 'del' ? U.icon('del') : C.ar(k))));
  // the key lights up the moment her finger touches it, then fades
  pad.addEventListener('pointerdown', e => { const b = e.target.closest('.key'); if (!b) return; b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), 260); });
  return pad;
}

function mount(S, m, story, { reread, done }) {
  const picture = TH.bars.draw(m, story, { show: Object.fromEntries(Object.entries(TH.bars.slotValues(m)).map(([k, v]) => [k, TH.bars.label(v)])) });
  const slots = [0, 1, 2, 3].map(i => el('button', { class: 'sl' + (i === 1 ? ' op' : ''), type: 'button', 'data-i': i }));
  const line = el('div', { class: 'sentence', dir: 'rtl' }, slots[0], slots[1], slots[2], el('span', { class: 'eq' }, '='), slots[3]);
  const nums = m.tiles.map(String).concat('?');
  const tiles = el('div', { class: 'tiles' },
    el('div', { class: 'tiles-n' }, ...nums.map(v => el('button', { class: 'tile num', type: 'button', 'data-v': v }, TH.bars.label(v === '?' ? '?' : +v)))),
    el('div', { class: 'tiles-o' }, ...['+', '−', '×', '÷'].map(v => el('button', { class: 'tile opk', type: 'button', 'data-v': v }, v))));
  const ok = el('button', { class: 'btn btn-done', type: 'button' }, U.icon('tick'));
  const wrap = S.root;
  S.board.append(el('div', { class: 'sentence-step' }, el('div', { class: 'mini-pic' }, picture), line));
  U.fit(S.board, { max: 1.3 });
  S.dock.append(tiles, ok);
  const val = Array(4).fill(null);
  const tileOf = v => Array.from(tiles.querySelectorAll('.tile')).find(t => t.dataset.v === v && t.classList.contains('used'));
  function put(i, t) {
    if (val[i] != null) clear(i);
    val[i] = t.dataset.v; slots[i].textContent = t.textContent; slots[i].classList.add('filled');
    if (t.classList.contains('num')) t.classList.add('used');
    U.sound('drop');
  }
  function clear(i) {
    const v = val[i]; if (v == null) return;
    if (i !== 1) { const t = tileOf(v); if (t) t.classList.remove('used'); }
    val[i] = null; slots[i].textContent = ''; slots[i].classList.remove('filled'); U.sound('tap');
  }
  slots.forEach((s, i) => s.addEventListener('click', () => { if (val[i] != null) clear(i); }));
  TH.bars.drag(wrap, {
    chip: '.tile', target: '.sl',
    accept(t, s) {
      const i = +s.dataset.i, isOp = t.classList.contains('opk');
      if ((i === 1) !== isOp) return false;
      put(i, t); return true;
    },
    tap(t) {   // a plain tap fills the next empty place of its kind
      if (t.classList.contains('used')) return;
      const i = t.classList.contains('opk') ? 1 : [0, 2, 3].find(k => val[k] == null);
      if (i != null) put(i, t);
    }
  });
  let tries = 0;
  ok.addEventListener('click', () => {
    const slotsV = [val[0], val[1], val[2], val[3]].map((v, i) => i === 1 || v == null || v === '?' ? v : +v);
    if (C.checkSentence(m, slotsV)) { U.sound('good'); ok.disabled = true; askAnswer(slotsV); return; }
    tries++; U.sound('soft');
    if (val.some(v => v == null)) { U.toast('أكملي الجملة.'); return; }
    U.toast('اقرئي القصّة مرّة أخرى.'); reread();
  });

  function askAnswer(sentence) {
    S.dock.textContent = '';
    const box = el('span', { class: 'ans-box' }, '');
    const ok2 = el('button', { class: 'btn btn-done', type: 'button' }, U.icon('tick'));
    let typed = '';
    const pad = keypad(k => {
      if (k === 'del') typed = typed.slice(0, -1); else if (typed.length < 5) typed += k;
      box.textContent = C.ar(typed);
    });
    const ansRow = el('div', { class: 'ans-row', dir: 'rtl' }, el('span', { class: 'q' }, '؟'), el('span', { class: 'eq' }, '='), box);
    S.dock.append(el('div', { class: 'ans-wrap' }, ansRow, el('div', { class: 'ans-foot' }, pad, ok2)));
    let wrong = 0;
    ok2.addEventListener('click', () => {
      if (!typed) return;
      if (+typed === m.ans) {
        U.sound('good'); ok2.disabled = true;
        const qSlot = slots[sentence.indexOf('?')]; if (qSlot) { qSlot.textContent = C.ar(m.ans); qSlot.classList.add('answer'); }
        setTimeout(() => done({ sentence, answer: m.ans, tries, wrong }), 700);
        return;
      }
      wrong++; U.sound('soft'); typed = ''; box.textContent = '';
      if (wrong >= 2) {   // the number she counted when she acted it out
        const q = picture.querySelector(`.slot[data-slot="${m.bar.unknown}"]`);
        if (q) { q.textContent = C.ar(m.ans); q.classList.add('help'); }
        U.toast('انظري إلى الرسم.');
      } else U.toast('عُدّي مرّة أخرى.');
    });
  }
}

TH.sentence = { mount, keypad };
})(window.TH);
