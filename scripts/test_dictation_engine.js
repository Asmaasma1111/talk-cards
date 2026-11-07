// The card-engine half of scripts/test_dictation.js (run that file, not this one).
'use strict';
module.exports = function (KD, DATA, { ok, eq }) {
  const E = KD.create(DATA, w => w);
  const T0 = '2026-11-07';
  const day = n => E.addDays(T0, n);
  function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  const firstSet = DATA.sets[0];

  // a session as the app runs it: the queue, show/learn steps, requeue after two others, at most 3 views a card
  function run(m, t, answerFn, rand = rng(1)) {
    const queue = E.buildSession(m, t, rand), views = {}, seen = [];
    let last = null, guard = 0;
    while (queue.length && guard++ < 200) {
      const item = E.next(queue, last, m, t, rand);
      views[item.id] = (views[item.id] || 0) + 1;
      seen.push(item);
      const r = E.answer(m, item, answerFn(item), t, views[item.id]);
      if (r.again) E.requeue(queue, { id: item.id, step: r.again });
      last = item.id;
    }
    return seen;
  }

  /* ---------- a new learner ---------- */
  {
    const m = E.blank();
    eq(E.nextSet(m), firstSet.id, 'the first set is skill 1, stage 1');
    ok(E.unitOpen(m, 'S1') && !E.unitOpen(m, 'S2'), 'only skill 1 is open at first');
    const s = E.buildSession(m, T0, rng(2));
    eq(m.sets[firstSet.id], T0, 'the first set is released today');
    eq(s.map(x => x.step), firstSet.cards.map(() => 'show'), 'new cards start with their SHOW step');
    eq(s.map(x => x.id), firstSet.cards, 'in the order of the set');
    ok(!E.canRelease(m, T0), 'no new set while the first is not learned');
  }

  /* ---------- show, learn, the boxes ---------- */
  {
    const m = E.blank(); E.buildSession(m, T0);
    const id = firstSet.cards[0];
    eq(E.answer(m, { id, step: 'show' }, true, T0, 1).again, 'learn', 'show is followed by learn');
    eq(E.peek(m, id).box, 0, 'show does not move the card');
    eq(E.answer(m, { id, step: 'learn' }, false, T0, 2).again, 'learn', 'a wrong learn comes again in the session');
    eq(E.answer(m, { id, step: 'learn' }, false, T0, 3).again, null, 'but at most 3 views a card');
    eq(E.answer(m, { id, step: 'learn' }, true, T0, 1), { grade: 'good', again: null }, 'right = Good');
    eq([E.peek(m, id).box, E.peek(m, id).due], [1, day(1)], 'learned: box 1, back tomorrow');
    E.answer(m, { id, step: 'review' }, true, day(1), 1);
    eq([E.peek(m, id).box, E.peek(m, id).due], [2, day(3)], 'Good on review: box 2, two days later');
    E.answer(m, { id, step: 'review' }, true, day(1), 1);
    eq(E.peek(m, id).box, 2, 'a card moves up at most once a day');
    const r = E.answer(m, { id, step: 'review' }, false, day(3), 1);
    eq([E.peek(m, id).box, E.peek(m, id).due, r.again], [1, day(4), 'relearn'], 'Again: box 1, tomorrow, and once more in the session');
    eq(E.answer(m, { id, step: 'relearn' }, true, day(3), 2).again, null, 'a right relearn ends it for today');
    eq(E.answer(m, { id, step: 'warm' }, true, day(3), 1).grade, 'good', 'no Easy grade, ever');
    // the boxes: 1, 2, 4, 7, 14, 30 days
    const c = { box: 1, due: '' };
    const gaps = [];
    for (let b = 1; b < 6; b++) { E.schedule(c, 'review', 'good', day(b * 40), 1); gaps.push(E.INTERVAL[c.box]); }
    eq(gaps, [2, 4, 7, 14, 30], 'intervals after 2, 4, 7, 14, 30 days');
    E.schedule(c, 'review', 'good', day(400), 1); eq(c.box, 6, 'box 6 is the top');
  }

  /* ---------- a session: never twice in a row, at most 3 views ---------- */
  {
    const m = E.blank();
    const seen = run(m, T0, item => item.step !== 'learn' || Math.random() < 0.3);
    // her first session has only the first set: a card can follow itself only when nothing else is learned yet
    let twice = 0; for (let i = 1; i < seen.length; i++) if (seen[i].id === seen[i - 1].id) twice++;
    const m5 = E.blank(); run(m5, T0, () => true); run(m5, day(1), () => true);
    const seen2 = run(m5, day(2), item => item.step !== 'learn' || Math.random() < 0.2);
    let twice2 = 0; for (let i = 1; i < seen2.length; i++) if (seen2[i].id === seen2[i - 1].id) twice2++;
    eq(twice2, 0, 'never the same card twice in a row (once she has learned cards)');
    const q = [{ id: 'S1-CH1', step: 'relearn' }];
    const nx = E.next(q, 'S1-CH1', m5, day(2), rng(9));
    ok(nx.id !== 'S1-CH1' && nx.step === 'warm', 'the last card left after itself: a learned card comes between');
    const views = {}; seen.forEach(x => { views[x.id] = (views[x.id] || 0) + 1; });
    ok(Object.values(views).every(n => n <= 3 + 1), 'a card is shown at most 3 times after its show step');
  }

  /* ---------- sets: mostly learned, new sets a day ---------- */
  {
    const m = E.blank();
    run(m, T0, () => true);
    ok(firstSet.cards.every(id => E.peek(m, id).box === 1), 'day 1: the first set is in box 1');
    ok(!E.batchReady(m), 'box 1 is not "mostly learned"');
    run(m, day(1), () => true);
    ok(E.batchReady(m), 'day 2: all in box 2: mostly learned');
    const second = DATA.sets[1];
    ok(!m.sets[second.id], 'a set is released when a session starts, so not in that session');
    run(m, day(2), () => true);
    eq(m.sets[second.id], day(2), 'the next set comes in the next session');
    // all but one in box 2 is enough
    const m2 = E.blank(); E.release(m2, T0);
    firstSet.cards.forEach((id, i) => { const c = E.rec(m2, id); c.box = i === 0 ? 1 : 2; });
    ok(E.batchReady(m2), 'every card in box 1 or above and all but one in box 2: ready');
    E.rec(m2, firstSet.cards[1]).box = 1;
    ok(!E.batchReady(m2), 'two cards still in box 1: not ready');
    // the daily limit
    const m3 = E.blank(); m3.settings.newSets = 1; E.release(m3, T0);
    firstSet.cards.forEach(id => { E.rec(m3, id).box = 2; });
    ok(!E.canRelease(m3, T0), 'newSets = 1: no second set today');
    ok(E.canRelease(m3, day(1)), 'but tomorrow');
  }

  /* ---------- stages and skills open in order; Mama can unlock or relock ---------- */
  {
    const m = E.blank();
    const s1 = DATA.units.find(u => u.id === 'S1');
    const stage1 = s1.sets.filter(id => E.SET[id].stage === 1), stage2 = s1.sets.filter(id => E.SET[id].stage === 2);
    stage1.forEach(id => { m.sets[id] = T0; E.SET[id].cards.forEach(c => { m.open.push(c); E.rec(m, c).box = 1; }); });
    m.batch = E.SET[stage1[stage1.length - 1]].cards.slice();
    eq(E.nextSet(m), null, 'stage 2 waits until stage 1 is mostly learned');
    ok(!E.batchReady(m), 'and the last set is not ready either');
    m.batch.forEach(c => { E.rec(m, c).box = 2; });
    eq(E.nextSet(m), null, 'stage 2 does not start while an earlier set of stage 1 is in box 1');
    E.SET[stage1[0]].cards.forEach(c => { E.rec(m, c).box = 2; });
    eq(E.nextSet(m), stage2[0], 'stage 1 mostly learned: stage 2 starts');
    ok(!E.unitOpen(m, 'S2'), 'skill 2 waits for skill 1');
    m.manual.S3 = true;
    ok(E.unitOpen(m, 'S3'), 'Mama unlocked skill 3 by hand');
    const blocked = E.blank(); blocked.manual.S3 = true;
    E.release(blocked, T0);
    const s1first = E.SET[DATA.sets[0].id];
    eq(E.SET[E.nextSet(blocked)].unit, 'S1', 'skill 1 still comes first in the order');
    m.manual.S1 = false;
    ok(!E.unitOpen(m, 'S1'), 'relocked by hand');
    ok(E.dueIds(m, day(30)).every(id => DATA.cards[id] ? DATA.cards[id].unit !== 'S1' : true), "a relocked skill's cards are not shown");
    ok(E.batchReady({ ...m, batch: s1first.cards }), "a relocked skill's set does not hold the others back");
    // a whole skill complete opens the next one
    const m4 = E.blank();
    s1.sets.forEach(id => { m4.sets[id] = T0; E.SET[id].cards.forEach(c => { m4.open.push(c); E.rec(m4, c).box = 2; }); });
    ok(E.unitComplete(m4, 'S1') && E.unitOpen(m4, 'S2'), "skill 1's stage 5 mostly learned: skill 2 opens");
    eq(E.SET[E.nextSet(m4)].unit, 'S2', 'and its first set is next');
  }

  /* ---------- top-up, mixed review ---------- */
  {
    const m = E.blank();
    DATA.sets.slice(0, 3).forEach(s => { m.sets[s.id] = day(-20); s.cards.forEach(c => { m.open.push(c); const r = E.rec(m, c); r.box = 3; r.due = day(10); }); });
    m.batch = DATA.sets[2].cards.slice();
    m.settings.newSets = 0;
    const s = E.buildSession(m, T0, rng(3));
    eq(s.length, E.MIN_SESSION, 'nothing due and no new set: topped up to 5 learned cards');
    ok(s.every(x => x.step === 'warm'), 'as تذكّري cards');
    const due = DATA.sets[0].cards[0]; E.rec(m, due).due = T0;
    const s2 = E.buildSession(m, T0, rng(3));
    ok(s2.some(x => x.id === due && x.step === 'review'), 'a due card is in the session');
  }

  /* ---------- كلماتي الصعبة and Mama's correction ---------- */
  {
    const m = E.blank();
    const id = E.addHard(m, 'الشَّجَرَةِ،', 'S2-CS1', T0);
    eq(id, 'H-الشَّجَرَةِ', 'a tapped word becomes its own card (punctuation off)');
    eq(m.hard[id].n, 1, 'counted once');
    const s = E.buildSession(m, T0, rng(4));
    ok(s.some(x => x.id === id && x.step === 'show'), 'it comes in the next session, from its show step');
    E.answer(m, { id, step: 'learn' }, true, T0, 1);
    E.addHard(m, 'الشَّجَرَةِ', 'S2-CS3', day(5));
    eq([m.hard[id].n, E.peek(m, id).box, E.peek(m, id).due], [2, 1, day(6)], 'tapped again: back to box 1, tomorrow');
    eq(E.hardest(m)[0].w, 'الشَّجَرَةِ', 'her hardest words, most often wrong first');
    const c = DATA.sets[0].cards[0]; const r = E.rec(m, c); r.box = 4; r.right = 3;
    E.markWrong(m, c, T0);
    eq([E.peek(m, c).box, E.peek(m, c).due], [1, day(1)], "Mama marks a self-check wrong: the card goes back to box 1");
  }

  /* ---------- clean() and a whole year for a careful learner ---------- */
  {
    const dirty = { cards: { 'S1-CH1': { box: 2 }, nope: { box: 1 } }, open: ['S1-CH1', 'nope', 'H-x'], settings: { perSession: 6 } };
    const c = E.clean(dirty);
    eq(c.open, ['S1-CH1', 'H-x'], 'clean() keeps known cards and her hard words');
    eq([c.settings.perSession, c.settings.newSets], [6, 2], 'clean() keeps settings, fills the rest');
    ok(E.valid(c) && !E.valid({}), 'valid()');

    const m = E.blank(), perDay = {};
    let t = T0, days = 0;
    for (; days < 800 && Object.keys(m.sets).length < DATA.sets.length; days++, t = E.addDays(t, 1)) {
      const before = Object.keys(m.sets).length;
      run(m, t, () => true, rng(days + 7));
      perDay[t] = Object.keys(m.sets).length - before;
    }
    eq(Object.keys(m.sets).length, DATA.sets.length, `a careful learner meets every set (${days} days)`);
    ok(Object.values(perDay).every(n => n <= 2), 'never more than 2 new sets a day');
    const order = Object.entries(m.sets).sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : E.SET[a[0]].order - E.SET[b[0]].order)).map(x => x[0]);
    eq(order, DATA.order, 'sets come in the fixed order');
    console.log(`  engine: a learner who is always right meets all ${DATA.sets.length} sets in ${days} days`);
  }
};
