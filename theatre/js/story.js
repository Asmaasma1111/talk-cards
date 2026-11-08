/* مسرح المسائل: one story in five scenes.
   1 The story without numbers: she picks what happened.   2 Act it out.   3 Draw it (step 2: numbers onto the bars;
   step 3: she builds the bars).   4 The numbers arrive: she writes the number sentence and the answer.
   5 Watch your answer: the scene plays again with her answer.
   Stage 1 (place value) has three: the story, its own act-out that ends with the answer, then the star.
   Nothing gives the operation away: no + or − on the card, no title naming the shape, the same screen for every kind. */
(function (TH) {
'use strict';
const C = TH.core, U = TH.ui, { el } = U;
const KIND_ORDER = ['more', 'less', 'parts', 'compare'];

// the scene-1 pictures: each kind's bar picture, small, without numbers
function kindPic(k) {
  const p = {
    more: '<svg viewBox="0 0 120 50"><rect x="6" y="20" width="62" height="22" rx="5" fill="currentColor" opacity=".85"/><rect x="72" y="20" width="40" height="22" rx="5" fill="currentColor" opacity=".45"/><path d="M90 6v10M85 11h10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    less: '<svg viewBox="0 0 120 50"><rect x="6" y="20" width="62" height="22" rx="5" fill="currentColor" opacity=".85"/><rect x="78" y="14" width="36" height="22" rx="5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="5 4" transform="rotate(-8 96 25)"/></svg>',
    parts: '<svg viewBox="0 0 120 50"><path d="M8 16q0-8 8-8h36q8 0 8-6 0 6 8 6h36q8 0 8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><rect x="6" y="22" width="62" height="22" rx="5" fill="currentColor" opacity=".85"/><rect x="70" y="22" width="44" height="22" rx="5" fill="currentColor" opacity=".5"/></svg>',
    compare: '<svg viewBox="0 0 120 50"><rect x="6" y="4" width="108" height="18" rx="5" fill="currentColor" opacity=".85"/><rect x="6" y="28" width="66" height="18" rx="5" fill="currentColor" opacity=".5"/><rect x="74" y="28" width="40" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="3 4"/></svg>'
  }[k];
  return el('span', { class: 'kind-pic', html: p });
}
function hiddenText(story) {
  return el('p', { class: 'story-text hidden-n' }, ...C.parts(story.text).map(p => p.n != null ? el('span', { class: 'cloud', 'aria-label': 'عدد' }) : p.t));
}
function fullText(story) {
  return el('p', { class: 'story-text' }, ...C.parts(story.text).map(p => p.n != null ? el('b', { class: 'num' }, C.ar(p.n)) : p.t));
}
const question = story => { const t = story.text; const i = Math.max(t.lastIndexOf('.', t.length - 2), t.lastIndexOf('،', t.length - 2)); return t.slice(i + 1).trim(); };

/* run(host, story, opts): opts.met (shapes met), opts.step (2 or 3), opts.onQuit, opts.onDone({answer, ...})
   Every scene fits the screen with nothing to scroll (her report, 8 Nov 2026). A working scene has three places:
   the story (sc-script), the stage where things move (sc-board) and her answer: signs, number pad, ✔ (sc-dock).
   iPad on its side: the story and the answer stand in a column beside the stage. Upright: story on top, stage, answer below. */
function run(host, story, opts) {
  const m = C.model(story);
  const pv = m.op === 'pv';
  const scenes = pv ? ['story', 'act', 'done'] : ['kind', 'act', 'draw', 'sentence', 'replay'];
  let k = 0, result = {};
  const dots = el('div', { class: 'scene-dots' }, ...scenes.map(() => el('i')));
  const quit = el('button', { class: 'top-btn', type: 'button', 'aria-label': 'رجوع' }, U.icon('home'));
  const padBtn = el('button', { class: 'top-btn pad-btn', type: 'button', 'aria-label': 'لوحي' }, U.icon('pencil'));
  const hear = el('button', { class: 'top-btn', type: 'button', 'aria-label': 'اسمعي القصّة', hidden: TH.store.get().reader === false }, U.icon('sound'));
  let stageEl = el('div', { class: 'scene' });
  const screen = el('section', { class: 'screen story-screen', dir: 'rtl' }, el('header', { class: 's-top' }, quit, dots, hear, padBtn), stageEl);
  host.textContent = ''; host.append(screen);
  quit.addEventListener('click', () => { U.stop(); opts.onQuit(); });
  // the pad shows the story with its numbers, except in scene 1
  padBtn.addEventListener('click', () => { U.sound('tap'); U.stop(); TH.pad.open(story, scenes[k] === 'kind' ? hiddenText(story) : fullText(story)); });
  const readFull = () => U.say(story.text, story.id);
  const readHidden = () => U.say(C.spokenHidden(story.text), story.id + ':h');
  hear.addEventListener('click', () => { U.sound('tap'); scenes[k] === 'kind' ? readHidden() : readFull(); });

  function go(i) {
    k = i; U.stop();
    // a new element for each scene, so no scene keeps the last one's finger listeners
    const fresh = el('div', { class: 'scene sc-' + scenes[i] });
    stageEl.replaceWith(fresh); stageEl = fresh;
    dots.querySelectorAll('i').forEach((d, j) => { d.classList.toggle('on', j === i); d.classList.toggle('past', j < i); });
    ({ kind, story: storyCard, act, draw, sentence, replay, done: finish })[scenes[i]]();
  }
  function split(cls) {
    const S = { script: el('div', { class: 'script-in' }), board: el('div', { class: 'sc-board' }), dock: el('div', { class: 'dock-in' }), root: stageEl };
    const script = el('div', { class: 'sc-script' }, S.script), dock = el('div', { class: 'sc-dock' }, S.dock);
    stageEl.classList.add('split'); if (cls) stageEl.classList.add(cls);
    // the ChatGPT stage picture behind the things, when it exists (assets/stage/board.webp; board-tall.webp for a board taller than wide)
    if (U.hasPic('stage/board.webp')) {
      // full addresses: a url() inside a CSS variable is read from the stylesheet's folder in some browsers, the page's in others
      const at = f => `url("${new URL('assets/stage/' + f, location.href).href}")`;
      const tall = U.hasPic('stage/board-tall.webp');
      S.board.classList.add('pic'); S.board.style.setProperty('--board', at('board.webp'));
      // the picture is stretched to the board: the wide stage unless the board is clearly taller than wide.
      // The margins keep the things between the curtains and follow the board's own size.
      let seen = '';
      const pad = () => { const w = S.board.offsetWidth, h = S.board.offsetHeight; if (!w || !h || seen === w + 'x' + h) return; seen = w + 'x' + h;
        S.board.style.setProperty('--board', at(tall && h > w * 1.15 ? 'board-tall.webp' : 'board.webp'));
        S.board.style.setProperty('--pt', Math.round(h * 0.11) + 'px'); S.board.style.setProperty('--px', Math.round(w * 0.1) + 'px'); S.board.style.setProperty('--pb', Math.round(h * 0.03) + 'px'); };
      new ResizeObserver(() => requestAnimationFrame(pad)).observe(S.board);
      requestAnimationFrame(pad);
    }
    stageEl.append(script, S.board, dock);
    U.fit(script, { max: 1.25 }); U.fit(dock, { max: 1.15 });
    return S;
  }
  function strip(still) {
    const s = el(still ? 'div' : 'button', { class: 'story-strip' + (still ? ' still' : ''), type: still ? null : 'button' }, fullText(story));
    if (!still) s.addEventListener('click', () => { U.sound('tap'); readFull(); });
    return s;
  }
  const glow = s => { s.classList.remove('glow'); void s.offsetWidth; s.classList.add('glow'); };

  /* 1: the story without numbers; she picks what happened */
  function kind() {
    const S = split('no-dock');
    const options = KIND_ORDER.filter(x => x === 'more' || x === 'less' || x === m.kind || (opts.met || []).some(sh => C.SHAPES[sh] && C.SHAPES[sh].kind === x));
    S.script.append(el('div', { class: 'story-card' }, hiddenText(story)));
    const kinds = el('div', { class: 'kinds n' + options.length }, ...options.map(x => el('button', { class: 'kind', type: 'button', 'data-k': x }, kindPic(x), el('span', {}, C.KINDS[x]))));
    S.board.append(kinds); U.fit(S.board, { max: 1.4 });
    readHidden();
    kinds.addEventListener('click', e => {
      const b = e.target.closest('.kind'); if (!b || b.classList.contains('dim')) return;
      if (b.dataset.k === m.kind) { U.sound('good'); b.classList.add('right'); setTimeout(() => go(k + 1), 650); }
      else { U.sound('soft'); b.classList.add('dim'); result.kindTries = (result.kindTries || 0) + 1; readHidden(); }
    });
  }
  /* stage 1: the story with its numbers */
  function storyCard() {
    const go2 = el('button', { class: 'btn btn-start', type: 'button' }, 'هيّا');
    stageEl.append(el('div', { class: 'kind-step' }, el('div', { class: 'story-card big' }, fullText(story)), el('div', { class: 'act-foot' }, go2)));
    readFull();
    go2.addEventListener('click', () => { U.sound('tap'); go(k + 1); });
  }
  /* 2: act it out. The story is heard and shown once; the things wait until she starts. */
  function act() {
    if (pv) {
      const S = split('pv-scene');
      S.script.append(strip());
      TH.pv.mount(S, m, story, ans => { result.answer = ans; go(k + 1); }); return;
    }
    const card = el('div', { class: 'story-card big' }, fullText(story));
    const start = el('button', { class: 'btn btn-start', type: 'button' }, 'هيّا');
    const intro = el('div', { class: 'act-intro' }, card, start);
    stageEl.append(intro);
    readFull();
    start.addEventListener('click', () => {
      U.sound('curtain'); U.stop(); intro.remove();
      const S = split('act-scene'), st = strip();
      S.script.append(st);
      const ok = el('button', { class: 'btn btn-done', type: 'button' }, U.icon('tick'));
      S.dock.append(ok);
      const view = TH.act.mount(S.board, m, story);
      result.actTries = 0;
      ok.addEventListener('click', () => {
        if (view.check()) { U.sound('good'); ok.disabled = true; S.board.classList.add('solved'); setTimeout(() => go(k + 1), 800); return; }
        // not red: the story is read again and she can move things back
        result.actTries++; U.sound('soft'); glow(st);
        U.toast('اسمعي القصّة مرّة أخرى.'); setTimeout(readFull, 600);
      });
    });
  }
  /* 3: the same things slide together into bars; then the drawing passes to her */
  function draw() {
    const S = split('draw-scene');
    S.script.append(strip());
    // the slide: a row of her things that shrinks into a bar
    const row = el('div', { class: 'slide-row', style: { '--c': U.colour(story.thing) } }, ...Array.from({ length: 8 }, () => U.thing(story.thing)));
    const wrap = el('div', { class: 'draw-area' }, row);
    S.board.append(wrap);
    setTimeout(() => {
      row.remove();
      (opts.step === 3 ? TH.bars.build : TH.bars.numbers)(S, m, story, () => go(k + 1));
    }, 1100);
  }
  /* 4: the number sentence, then the answer */
  function sentence() {
    const S = split('sentence-scene'), st = strip();
    S.script.append(st);
    TH.sentence.mount(S, m, story, {
      reread: () => { glow(st); readFull(); },
      done: r => { Object.assign(result, r); go(k + 1); }
    });
  }
  /* 5: the scene plays again with her answer */
  async function replay() {
    const S = split('replay-scene');
    S.script.append(strip(true));
    const pic = TH.bars.draw(m, story, { show: Object.fromEntries(Object.entries(TH.bars.slotValues(m)).map(([s, v]) => [s, C.ar(v === '?' ? m.ans : v)])) });
    const sent = el('div', { class: 'sentence done', dir: 'rtl' }, ...result.sentence.map((v, i) => [el('span', { class: 'sl filled' + (v === '?' ? ' answer' : '') }, v === '?' ? C.ar(m.ans) : i === 1 ? v : C.ar(v)), i === 2 ? el('span', { class: 'eq' }, '=') : null]).flat().filter(Boolean));
    const next = el('button', { class: 'btn btn-next big', type: 'button', hidden: true }, U.icon('next'));
    S.dock.append(el('div', { class: 'replay-pic' }, pic), sent, next);
    await TH.act.replay(S.board, m, story);
    const q = pic.querySelector(`.slot[data-slot="${m.bar.unknown}"]`); if (q) q.classList.add('answer');
    U.say(question(story) + ' ' + C.ar(m.ans), story.id + ':a');
    starBurst(stageEl);
    next.hidden = false;
    next.addEventListener('click', () => { U.stop(); opts.onDone(result); });
  }
  function finish() {
    const next = el('button', { class: 'btn btn-next big', type: 'button' }, U.icon('next'));
    const ans = Array.isArray(result.answer) ? result.answer.map(x => (typeof x === 'number' ? C.ar(x) : x)).join('، ') : typeof result.answer === 'number' ? C.ar(result.answer) : result.answer;
    stageEl.append(el('div', { class: 'kind-step' }, el('div', { class: 'story-card' }, fullText(story)), el('div', { class: 'answer-big' }, ans), el('div', { class: 'act-foot' }, next)));
    starBurst(stageEl);
    next.addEventListener('click', () => { U.stop(); opts.onDone(result); });
  }
  go(0);
}

function starBurst(host) {
  U.sound('star');
  const b = el('div', { class: 'star-burst', 'aria-hidden': 'true' }, el('span', { class: 'big-star' }, '⭐'), ...Array.from({ length: 10 }, (_, i) => el('i', { style: { '--a': (i * 36) + 'deg' } })));
  host.append(b); setTimeout(() => b.remove(), 1800);
}

TH.story = { run, fullText, hiddenText, starBurst };
})(window.TH);
