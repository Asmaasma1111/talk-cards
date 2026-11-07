/* كرّاس الإملاء: one dictation session. The engine builds the queue; each card is drawn by cards.js on a copybook page that
   turns over (flips) only when her answer is complete. Right first time = Good, anything else = Again (the card comes back
   later in the session). Her writing answers are saved as small PNGs. At the end, her copybook gets today's page (book.js). */
(function (KD) {
'use strict';
const { el, icon } = KD.ui;

function cardOf(id) {
  if (KD.data.cards[id]) return KD.data.cards[id];
  const h = KD.store.get().hard[id];          // كلماتي الصعبة: a word card made from a tapped word
  if (!h) return null;
  const from = KD.data.cards[h.from] || {};
  return { id, type: 'hard', skill: from.skill || 'S1', w: h.w, tg: [], keep: [], rule: from.rule || '', audio: { say: window.KDText.clipId(h.w) } };
}

let lastPraise = -1;
function praiseLine() {
  const list = KD.data.praise;
  let i; do { i = Math.floor(Math.random() * list.length); } while (list.length > 1 && i === lastPraise);
  lastPraise = i; return list[i];
}

function start(app) {
  const E = KD.E, m = KD.store.get(), t = KD.store.today();
  KD.voice.stop();
  // on the local test server only: ?cards=S1-W1:learn,S2-SO1:show opens those cards in that order
  const pick = location.hostname === 'localhost' && new URLSearchParams(location.search).get('cards');
  const queue = pick ? pick.split(',').map(x => { const [id, step = 'learn'] = x.split(':'); return { id, step }; }) : E.buildSession(m, t);
  KD.store.save();
  const run = { t, total: queue.length, done: 0, views: {}, last: null, writings: [], newWords: [], skills: {}, answered: 0 };

  const prog = el('i');
  const ear = el('button', { class: 'top-btn ear', 'aria-label': 'ear' }, icon('ear'));
  const mute = el('button', { class: 'top-btn', 'aria-label': 'sound' }, icon(m.prefs.muted ? 'mute' : 'sound'));
  const front = el('div', { class: 'face front page' }), back = el('div', { class: 'face back page' });
  const card = el('div', { class: 'card' }, front, back);
  const toolsRow = el('div', { class: 'tools-row' });
  const bar = el('div', { class: 'bar' });
  const bubble = el('div', { class: 'bubble', hidden: true });
  const screen = el('section', { class: 'screen session' },
    el('header', { class: 's-top' },
      el('button', { class: 'top-btn', 'aria-label': 'home', onclick: quit }, icon('close')),
      el('div', { class: 'prog' }, prog), ear, mute),
    el('div', { class: 'stage' }, card, bubble), toolsRow, bar);
  app.replaceChildren(screen);

  mute.addEventListener('click', () => {
    m.prefs.muted = !m.prefs.muted; KD.store.save();
    mute.innerHTML = KD.ui.ICON[m.prefs.muted ? 'mute' : 'sound'];
    if (m.prefs.muted) KD.voice.stop();
  });
  let earSteps = [], earLeft = 3;
  ear.addEventListener('click', () => {
    if (earLeft <= 0 || !earSteps.length) return;
    earLeft--; ear.classList.toggle('spent', earLeft <= 0);
    KD.voice.say(earSteps);
  });

  function quit() { KD.voice.stop(); KD.store.save(); location.hash = '#home'; }

  // the opening line, then the first card
  const st = KD.data.start[Math.floor(Math.random() * KD.data.start.length)];
  if (!queue.length) { finishAll(); return; }
  KD.voice.say([{ id: st.audio, text: st.text }]);
  setTimeout(next, 250);

  function next() {
    const item = E.next(queue, run.last, m, t);
    if (!item) { finishAll(); return; }
    const c = cardOf(item.id);
    if (!c) { next(); return; }
    run.views[item.id] = (run.views[item.id] || 0) + 1;
    run.skills[c.skill] = (run.skills[c.skill] || 0) + 1;
    prog.style.width = Math.min(100, (run.done / Math.max(1, run.done + queue.length + 1)) * 100) + '%';
    front.replaceChildren(); back.replaceChildren(); bar.replaceChildren(); toolsRow.replaceChildren();
    card.style.transition = 'none';             // the new page is simply there: no turning back of the old one
    card.className = 'card t-' + c.type + (item.step === 'show' ? ' is-show' : '');
    void card.offsetWidth; card.style.transition = '';
    card.classList.add('enter'); setTimeout(() => card.classList.remove('enter'), 400);
    earLeft = 3; ear.classList.remove('spent');
    let finished = false;
    const S = {
      front, back, bar,
      flip() { card.classList.add('flipped'); KD.sound.play('page'); },
      say(steps) { KD.voice.say(steps); },
      tools(pad) { toolsRow.replaceChildren(KD.pad.tools(pad)); },
      clearTools() { toolsRow.replaceChildren(); },
      async saveWriting(pad, w) {
        const id = 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        await KD.store.putWriting({ id, day: t, card: c.id, step: item.step, ok: null, png: w.blob, w: w.w, h: w.h, ts: Date.now() });
        return id;
      },
      // the self-check: هل كتبتِها صحيحة؟ with two big buttons
      check(kind, onAnswer) {
        const p = KD.data.prompts[kind];
        const yes = el('button', { class: 'btn btn-yes', 'aria-label': '✓', onclick: () => { lock(); onAnswer(true); } }, icon('tick'));
        const no = el('button', { class: 'btn btn-no', 'aria-label': '✗', onclick: () => { lock(); onAnswer(false); } }, icon('cross'));
        const lock = () => { yes.disabled = no.disabled = true; };
        S._yes = yes;
        bar.replaceChildren(el('span', { class: 'ask' }, p.text), yes, no);
        setTimeout(() => KD.voice.say([{ id: p.audio, text: p.text }]), 900);
      },
      checkState(tickOk) { if (S._yes) S._yes.disabled = !tickOk; },
      finish(correct, extra = {}) {
        if (finished) return; finished = true;
        if (correct === null) {                    // the show step: no answer, the card comes again as learn
          const r = E.answer(m, item, true, t, run.views[item.id]);
          if (r.again) E.requeue(queue, { id: item.id, step: r.again });
          if (['word', 'choose', 'missing'].includes(c.type)) { const w = c.w || c.right || c.word; if (!run.newWords.includes(w)) run.newWords.push(w); }
          KD.store.save(); run.last = item.id; next(); return;
        }
        const r = E.answer(m, item, correct, t, run.views[item.id]);
        if (r.again) E.requeue(queue, { id: item.id, step: r.again });
        (extra.hard || []).forEach(w => E.addHard(m, w, c.id, t));
        if (extra.writing && correct) run.writings.push(extra.writing);
        run.done++; run.answered++;
        KD.store.save();
        run.last = item.id;
        if (correct) {
          const p = praiseLine();
          KD.sound.play('good'); pop(p.text);
          KD.voice.say([{ pause: 500 }, { id: p.audio, text: p.text }]);
        } else {
          KD.sound.play('soft');
          const w = KD.data.prompts.wrong;
          KD.voice.say([{ pause: 400 }, { id: w.audio, text: w.text }, ...(extra.read || [])]);
        }
        bar.replaceChildren(el('button', { class: 'btn btn-next', 'aria-label': 'next', onclick: () => { KD.voice.stop(); next(); } }, icon('next')));
      }
    };
    const r = KD.cards.render(c, item.step, S) || {};
    earSteps = r.audio || [];
  }

  function pop(text) {
    bubble.textContent = text; bubble.hidden = false; bubble.classList.remove('on'); void bubble.offsetWidth; bubble.classList.add('on');
    setTimeout(() => { bubble.hidden = true; }, 1600);
  }

  function finishAll() {
    KD.voice.stop();
    const day = m.days[t] || (m.days[t] = { n: 0, ok: 0, sessions: 0 });
    if (run.answered) day.sessions = (day.sessions || 0) + 1;
    KD.store.save();
    const skill = Object.entries(run.skills).sort((a, b) => b[1] - a[1])[0];
    const info = { t, writings: run.writings.slice(-4).reverse(), newWords: run.newWords, skill: skill ? skill[0] : KD.data.units.find(u => u.id === E.currentUnit(m)).skill, answered: run.answered };
    if (KD.book && run.answered) KD.book.endSession(app, info);
    else location.hash = '#home';
  }
}
KD.session = { start, cardOf };
})(window.KD = window.KD || {});
