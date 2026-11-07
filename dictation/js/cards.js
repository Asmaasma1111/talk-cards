/* كرّاس الإملاء: the card types, each a copybook page with a front and a back.
   A SHOW, B CHOOSE, C SORT, D MISSING LETTER, E RED WORD, F WORD DICTATION, G SENTENCE DICTATION, H TEXT DICTATION, I TEXT RED WORDS.
   A card never flips before her answer is complete, and has no flip button. The session (session.js) gives each card S:
     S.front / S.back (the two faces), S.bar (the buttons under the page), S.flip(), S.finish(correct, extra),
     S.say(steps), S.prompt(key) -> steps, S.saveWriting(pad) -> writing id, S.check(kind, onAnswer) (the ✓ / ✗ self-check).
   Each render returns { audio } : the steps the ear button replays (at most 3 times a card). */
(function (KD) {
'use strict';
const { el, icon, coloured, shown, ar, pic } = KD.ui;
const T = window.KDText;
const P = () => KD.data.prompts;

/* ---------- speech steps ---------- */
const line = (id, text, slow) => ({ id, text, slow });
const pauseFor = s => ({ pause: 1600 + 900 * String(s).split(/\s+/).length });
function dictation(c) {
  const A = c.audio;
  if (c.type === 'word' || c.type === 'hard') return [line(A.say, c.w, true), { pause: 1600 }, line(A.say, c.w, true)];
  if (c.type === 'sent') {
    if (!A.chunks.length) return [line(A.full, c.s, true), pauseFor(c.s), line(A.full, c.s, true)];
    return [line(A.full, c.s, true), { pause: 1200 }, ...c.chunks.flatMap((ch, i) => [line(A.chunks[i], ch, true), pauseFor(ch)]), line(A.full, c.s, true)];
  }
  if (c.type === 'text') {
    const steps = [line(A.full, c.s, true), { pause: 1500 }];
    c.sentences.forEach((x, i) => {
      const a = A.sentences[i];
      if (a.chunks.length) x.chunks.forEach((ch, k) => steps.push(line(a.chunks[k], ch, true), pauseFor(ch)));
      else steps.push(line(a.full, x.s, true), pauseFor(x.s));
      steps.push({ pause: 700 });
    });
    steps.push(line(A.full, c.s, true));
    return steps;
  }
  return [];
}
const promptSteps = key => [line(P()[key].audio, P()[key].text)];

/* ---------- pieces of a page ---------- */
const promptEl = key => el('div', { class: 'prompt' }, P()[key].text);
const big = (text, tg, card, cls = '') => el('div', { class: 'big ar ' + cls, lang: 'ar' }, coloured(text, tg, card));
const ruleEl = card => el('div', { class: 'rule' }, card.rule);
const btn = (cls, content, onclick, label) => el('button', { class: 'btn ' + cls, onclick, 'aria-label': label || null }, content);
const doneBtn = (onclick) => btn('btn-done', P().done.text, onclick);
function writingSpace(S, tall, lines = 3) {
  const host = el('div', { class: 'write' + (tall ? ' tall' : ''), style: tall ? null : { height: (lines * KD.pad.SQ + 8) + 'px' } });
  return host;
}
// her writing on the back, just under the correct version
function inkImg(w) { return el('img', { class: 'ink', src: w.url, alt: '', style: { width: w.w + 'px' } }); }

/* ---------- A. SHOW ---------- */
function show(c, S) {
  let text = '', tg = [];
  if (c.type === 'choose') { text = c.full || c.right; tg = c.full ? [] : c.tg; }
  if (c.type === 'missing') { text = c.word; tg = c.tg; }
  if (c.type === 'red') text = c.fixed;
  if (c.type === 'sent' || c.type === 'text') text = c.s;
  if (c.type === 'textred') text = c.fixed;
  if (c.type === 'word' || c.type === 'hard') return showWord(c, S);
  if (c.type === 'sort') {
    S.front.append(sortedBaskets(c));
    S.bar.append(btn('btn-next', icon('next'), () => S.finish(null)));
    return { audio: [] };
  }
  const say = c.audio.show ? [line(c.audio.show, text, c.type === 'sent' || c.type === 'text')] : [];
  S.front.append(big(text, tg, c, c.type === 'text' || c.type === 'textred' ? 'para' : (text.includes(' ') ? 'sentence' : '')));
  S.say(say);
  S.bar.append(btn('btn-next', icon('next'), () => S.finish(null)));
  return { audio: say };
}
// look, say, cover, write, check
function showWord(c, S) {
  const say = [line(c.audio.say, c.w, true)];
  const word = big(c.w, c.tg, c);
  const cover = el('div', { class: 'cover' });
  const box = el('div', { class: 'show-word' }, word, cover);
  S.front.append(promptEl('show'), box);
  S.say([...promptSteps('show'), { pause: 300 }, ...say]);
  const coverBtn = btn('btn-cover', icon('cover'), () => {
    KD.sound.play('tap'); KD.voice.stop();
    box.classList.add('covered'); coverBtn.remove();
    const host = writingSpace(S, false, 3); S.front.append(host);
    const pad = KD.pad.create(host, { onChange: () => { done.disabled = pad.empty; } });
    S.tools(pad);
    const done = doneBtn(async () => {
      const w = await pad.export(); S.clearTools();
      S.back.append(big(c.w, c.tg, c), inkImg(w));
      S.flip(); S.say(say);
      S.bar.replaceChildren(btn('btn-next', icon('next'), () => S.finish(null)));
    });
    done.disabled = true;
    S.bar.replaceChildren(done);
  }, 'غطّي');
  S.bar.append(coverBtn);
  return { audio: say };
}

/* ---------- B. CHOOSE ---------- */
function choose(c, S) {
  const say = promptSteps('choose');
  S.front.append(promptEl('choose'));
  if (c.gap) S.front.append(el('div', { class: 'big ar sentence gap', lang: 'ar' }, shown(c.gap, c).replace(/_+/g, '…')));
  const opts = Math.random() < 0.5 ? [c.right, c.wrong] : [c.wrong, c.right];
  const row = el('div', { class: 'options' });
  opts.forEach(o => row.append(el('button', { class: 'option ar', lang: 'ar', onclick: () => pick(o) }, shown(o, c))));
  S.front.append(row);
  S.say(say);
  function pick(o) {
    const ok = o === c.right;
    row.querySelectorAll('button').forEach(b => { b.disabled = true; });
    S.back.append(big(c.full || c.right, c.full ? [] : c.tg, c, c.full ? 'sentence' : ''), ruleEl(c));
    S.flip();
    S.finish(ok, { read: [line(c.audio.show, c.full || c.right)] });
  }
  return { audio: say };
}

/* ---------- C. SORT ---------- */
function basketEl(b, i) {
  const label = b.pic ? el('span', { class: 'b-label pic-label' }, pic(b.pic, 'b-pic'), ar(b.label)) : el('span', { class: 'b-label ar', lang: 'ar' }, b.label);
  return el('div', { class: `basket b${i % 3}`, 'data-i': i }, pic(`basket_${['pink', 'yellow', 'green'][i % 3]}.png`, 'b-art'), label, el('div', { class: 'b-words' }));
}
function sortedBaskets(c) {
  const row = el('div', { class: 'baskets n' + c.baskets.length });
  c.baskets.forEach((b, i) => {
    const bk = basketEl(b, i);
    c.words.filter(w => w[1] === i).forEach(([w, , tg]) => bk.querySelector('.b-words').append(el('span', { class: 'chip ar', lang: 'ar' }, coloured(w, tg, c))));
    row.append(bk);
  });
  return row;
}
function sort(c, S) {
  const say = promptSteps('sort');
  S.front.append(promptEl('sort'));
  const pile = el('div', { class: 'pile' });
  const order = c.words.map((w, i) => ({ w, i })).sort(() => Math.random() - 0.5);
  order.forEach(({ w, i }) => pile.append(el('span', { class: 'chip ar drag', lang: 'ar', 'data-i': i }, shown(w[0], c))));
  const row = el('div', { class: 'baskets n' + c.baskets.length });
  c.baskets.forEach((b, i) => row.append(basketEl(b, i)));
  S.front.append(pile, row);
  S.say(say);
  let perfect = true, left = c.words.length;
  // drag a chip into a basket: a wrong basket sends it back gently
  pile.addEventListener('pointerdown', e => {
    const chip = e.target.closest('.drag'); if (!chip || chip.classList.contains('in')) return;
    e.preventDefault();
    const r = chip.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    try { chip.setPointerCapture(e.pointerId); } catch (err) {} chip.classList.add('lift');
    const move = ev => { chip.style.transform = `translate(${ev.clientX - dx - r.left}px, ${ev.clientY - dy - r.top}px)`; };
    const up = ev => {
      chip.removeEventListener('pointermove', move); chip.removeEventListener('pointerup', up); chip.removeEventListener('pointercancel', up);
      chip.classList.remove('lift');
      chip.style.visibility = 'hidden';
      const under = document.elementFromPoint(ev.clientX, ev.clientY);
      chip.style.visibility = '';
      const bk = under && under.closest('.basket');
      const want = c.words[Number(chip.dataset.i)][1];
      if (!bk) { chip.style.transform = ''; return; }
      if (Number(bk.dataset.i) === want) {
        KD.sound.play('drop'); chip.style.transform = ''; chip.classList.add('in'); bk.querySelector('.b-words').append(chip);
        if (--left === 0) setTimeout(finish, 450);
      } else {
        perfect = false; KD.sound.play('back');
        chip.classList.add('slide'); chip.style.transform = '';
        setTimeout(() => chip.classList.remove('slide'), 450);
      }
    };
    chip.addEventListener('pointermove', move); chip.addEventListener('pointerup', up); chip.addEventListener('pointercancel', up);
  });
  function finish() {
    S.back.append(sortedBaskets(c), ruleEl(c));
    if (c.extra) S.back.append(el('div', { class: 'rule extra' }, c.extra));
    S.flip(); S.finish(perfect);
  }
  return { audio: say };
}

/* ---------- D. MISSING LETTER ---------- */
function missing(c, S) {
  const say = promptSteps('missing');
  S.front.append(promptEl('missing'));
  const boxHost = el('div', { class: 'letter-box' });
  const word = el('div', { class: 'big ar missing-word', lang: 'ar' }, shown(c.before, c), boxHost, shown(c.after, c));
  S.front.append(word);
  const pad = KD.pad.create(boxHost, { onChange: () => { done.disabled = pad.empty; } });
  S.tools(pad);
  S.say(say);
  const done = doneBtn(async () => {
    const w = await pad.export(240); S.clearTools();
    if (c.none) { back(w); S.finish(false, { read: [line(c.audio.show, c.word)] }); return; }   // nothing was missing
    const id = await S.saveWriting(pad, w);
    back(w);
    S.check('checkLetter', okv => { KD.store.setCheck(id, okv); S.finish(okv, { writing: id, selfCheck: true }); });
  });
  done.disabled = true;
  S.bar.append(done);
  if (c.noneBtn) S.bar.append(btn('btn-none', P().none.text, () => {
    S.clearTools(); back(null);
    S.finish(c.none, { read: [line(c.audio.show, c.word)] });
  }));
  function back(w) {
    S.back.append(big(c.word, c.tg, c));
    if (w) S.back.append(el('div', { class: 'her-letter' }, inkImg({ ...w, w: 110 })));
    S.back.append(ruleEl(c));
    S.flip(); S.say([line(c.audio.show, c.word)]);
  }
  return { audio: say };
}

/* ---------- E. RED WORD ---------- */
function redSentence(text, reds, card, cls = 'red') {
  // the sentence with its red word(s) in red (the text may be shown without tashkeel)
  const out = el('div', { class: 'big ar sentence' + (card.type === 'textred' ? ' para' : ''), lang: 'ar' });
  let rest = text;
  const marks = [];
  reds.forEach(r => { const i = rest.indexOf(r); if (i >= 0) marks.push([i, r]); });
  marks.sort((a, b) => a[0] - b[0]);
  let pos = 0;
  marks.forEach(([i, r], k) => {
    out.append(shown(text.slice(pos, i), card));
    out.append(el('b', { class: cls, 'data-k': k }, shown(r, card)));
    pos = i + r.length;
  });
  out.append(shown(text.slice(pos), card));
  return out;
}
function red(c, S) {
  const say = promptSteps('red');
  S.front.append(promptEl('red'), redSentence(c.s, [c.red], c));
  S.say(say);
  const yes = btn('btn-yes', icon('tick'), () => judge(true), '✓');
  const no = btn('btn-no', icon('cross'), () => judge(false), '✗');
  S.bar.append(yes, no);
  function judge(saysRight) {
    KD.voice.stop();
    if (saysRight !== c.ok) {            // judged wrongly: straight to the correct sentence, read aloud
      S.back.append(big(c.fixed, [], c, 'sentence'), ruleEl(c));
      S.flip(); S.finish(false, { read: [line(c.audio.show, c.fixed)] });
      return;
    }
    if (c.ok) {                          // a right word, rightly judged
      S.back.append(big(c.s, [], c, 'sentence'), ruleEl(c));
      S.flip(); S.finish(true);
      return;
    }
    // a wrong word, rightly judged: now she writes it correctly
    S.bar.replaceChildren();
    S.front.querySelector('.prompt').textContent = P().redFix.text;
    S.say(promptSteps('redFix'));
    const host = writingSpace(S, false, 3); S.front.append(host);
    const pad = KD.pad.create(host, { onChange: () => { done.disabled = pad.empty; } });
    S.tools(pad);
    const done = doneBtn(async () => {
      const w = await pad.export(); S.clearTools();
      const id = await S.saveWriting(pad, w);
      S.back.append(big(c.fix, c.tg, c), inkImg(w), ruleEl(c));
      S.flip(); S.say([line(c.audio.show, c.fixed)]);
      S.check('checkWord', okv => { KD.store.setCheck(id, okv); S.finish(okv, { writing: id, selfCheck: true }); });
    });
    done.disabled = true;
    S.bar.append(done);
  }
  return { audio: say };
}

/* ---------- F, G, H. DICTATION ---------- */
function dictate(c, S) {
  const key = c.type === 'text' ? 'text' : 'dictate';
  const steps = dictation(c);
  S.front.append(el('div', { class: 'listen' }, icon('ear', 'ear-big'), promptEl(key)));
  const tall = c.type === 'text';
  const host = writingSpace(S, tall, c.type === 'sent' ? (c.long ? 6 : 5) : 3);
  S.front.append(host);
  const pad = KD.pad.create(host, { tall, onChange: () => { done.disabled = pad.empty; } });
  S.tools(pad);
  S.say([...promptSteps(key), { pause: 400 }, ...steps]);
  const done = doneBtn(async () => {
    KD.voice.stop();
    const w = await pad.export(); S.clearTools();
    const id = await S.saveWriting(pad, w);
    const words = c.type === 'word' || c.type === 'hard' ? null : c.s.split(/\s+/);
    if (!words) {
      S.back.append(big(c.w, c.tg, c), inkImg(w), c.rule ? ruleEl(c) : '');
      S.flip(); S.say([line(c.audio.say, c.w, true)]);
      S.check('checkWord', okv => { KD.store.setCheck(id, okv); S.finish(okv, { writing: id, selfCheck: true }); });
      return;
    }
    // the correct sentence (or text): she taps every word she got wrong (orange), then ✓ (none tapped) or ✗
    const sent = el('div', { class: 'big ar sentence tappable' + (c.type === 'text' ? ' para' : ''), lang: 'ar' });
    const tapped = new Set();
    words.forEach((wd, i) => {
      const sp = el('span', { class: 'word', onclick: () => {
        KD.sound.play('tap');
        if (tapped.has(i)) tapped.delete(i); else tapped.add(i);
        sp.classList.toggle('wrong', tapped.has(i)); S.checkState(tapped.size === 0);
      } }, shown(wd, c));
      sent.append(sp, ' ');
    });
    S.back.append(sent, el('div', { class: 'ink-wrap' }, inkImg(w)), ruleEl(c));
    S.flip();
    S.check('checkWord', okv => {
      KD.store.setCheck(id, okv && !tapped.size);
      S.finish(okv && !tapped.size, { writing: id, selfCheck: true, hard: [...tapped].map(i => words[i].replace(/[.,،؛؟!:«»"]/g, '')) });
    });
  });
  done.disabled = true;
  S.bar.append(done);
  return { audio: steps };
}

/* ---------- I. TEXT RED WORDS ---------- */
function textred(c, S) {
  const say = promptSteps('redPick');
  S.front.append(promptEl('redPick'));
  const para = redSentence(c.s, c.reds.map(r => r.red), c);
  S.front.append(para);
  S.say(say);
  const answers = [];
  let k = 0;
  const yes = btn('btn-yes', icon('tick'), () => judge(true), '✓');
  const no = btn('btn-no', icon('cross'), () => judge(false), '✗');
  S.bar.append(yes, no);
  const focus = () => para.querySelectorAll('b.red').forEach((b, i) => b.classList.toggle('focus', i === k));
  focus();
  function judge(saysRight) {
    KD.sound.play('tap');
    const r = c.reds[k];
    answers.push(saysRight);
    para.querySelectorAll('b.red')[k].classList.add(saysRight ? 'said-ok' : 'said-no');
    if (++k < c.reds.length) { focus(); return; }
    focus();
    const misjudged = c.reds.some((x, i) => answers[i] !== x.ok);
    if (misjudged) {
      S.back.append(big(c.fixed, [], c, 'para'), ruleEl(c));
      S.flip(); S.finish(false, { read: [line(c.audio.show, c.fixed)] });
      return;
    }
    const toFix = c.reds.filter(x => !x.ok);
    if (!toFix.length) { S.back.append(big(c.fixed, [], c, 'para'), ruleEl(c)); S.flip(); S.finish(true); return; }
    S.bar.replaceChildren();
    S.front.querySelector('.prompt').textContent = P().redFix.text;
    S.say(promptSteps('redFix'));
    const host = writingSpace(S, false, 3); S.front.append(host);
    const pad = KD.pad.create(host, { onChange: () => { done.disabled = pad.empty; } });
    S.tools(pad);
    const done = doneBtn(async () => {
      const w = await pad.export(); S.clearTools();
      const id = await S.saveWriting(pad, w);
      const fixes = el('div', { class: 'fixes' });
      toFix.forEach(x => fixes.append(big(x.fix, x.tg, c)));
      S.back.append(fixes, inkImg(w), ruleEl(c));
      S.flip(); S.say([line(c.audio.show, c.fixed)]);
      S.check('checkWord', okv => { KD.store.setCheck(id, okv); S.finish(okv, { writing: id, selfCheck: true }); });
    });
    done.disabled = true;
    S.bar.append(done);
  }
  return { audio: say };
}

function render(c, step, S) {
  if (step === 'show') return show(c, S);
  switch (c.type) {
    case 'choose': return choose(c, S);
    case 'sort': return sort(c, S);
    case 'missing': return missing(c, S);
    case 'red': return red(c, S);
    case 'word': case 'hard': case 'sent': case 'text': return dictate(c, S);
    case 'textred': return textred(c, S);
  }
  return { audio: [] };
}
KD.cards = { render, dictation };
})(window.KD = window.KD || {});
