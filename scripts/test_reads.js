// Maria Reads rules (reads.js core), no browser: node scripts/test_reads.js
const assert = require('assert');
const { core } = require('../reads.js');
const D = require('../reads.json');
const day = n => core.addDays('2026-10-20', n);

// lesson states come from the current lesson number only
let r = core.blank(); r.current = 3;
assert.deepStrictEqual([1, 2, 3, 4].map(n => core.stateOf(r, n)), ['done', 'done', 'current', 'locked']);

// minimum days: 3, or 1 in the fast lane (lessons 1-12 whose sounds she knew at placement)
r = core.blank();
assert.strictEqual(core.minDays(r, D, 1), 3);
r.placement = { known: ['a', 'b'] };
assert.strictEqual(core.minDays(r, D, 1), 1);
assert.strictEqual(core.minDays(r, D, 3), 1);      // AB, BA: both sounds known
assert.strictEqual(core.minDays(r, D, 4), 3);      // C not known
r.placement = { known: ['a', 'b', 'k', 't', 'u', 's', 'p', 'o', 'h', 'n'] };
assert.strictEqual(core.minDays(r, D, 13), 3);     // never past lesson 12

// three days on a sound, then the next lesson the following day (no mastery check needed)
r = core.blank(); r.placement = { known: [] };
core.finish(r, { n: 1, mode: 'lesson' }, day(0));
assert.strictEqual(core.canAdvance(r, D, 1, day(1)), false);
core.finish(r, { n: 1, mode: 'lesson' }, day(1)); core.finish(r, { n: 1, mode: 'lesson' }, day(2));
assert.strictEqual(core.canAdvance(r, D, 1, day(2)), false);     // not in the middle of her third day
assert.strictEqual(core.canAdvance(r, D, 1, day(3)), true);

// after 5 lesson days without mastery: 2 review days, then the lesson again
r = core.blank();
for (let i = 0; i < 5; i++) core.finish(r, { n: 2, mode: 'lesson' }, day(i));
assert.strictEqual(core.reviewToday(r, 2, day(5)), true);
core.finish(r, { n: 2, mode: 'review' }, day(5));
assert.strictEqual(core.reviewToday(r, 2, day(6)), true);
core.finish(r, { n: 2, mode: 'review' }, day(6));
assert.strictEqual(core.reviewToday(r, 2, day(7)), false);

// a puzzle a week: one piece a day of use, the last two on day 7; a missed day keeps the pieces
r = core.blank();
const got = [];
for (const i of [0, 1, 3, 4, 6, 7, 9]) {       // days 2, 5 and 8 are missed
  core.finish(r, { n: 1, mode: 'lesson' }, day(i));
  const b = core.board(r, day(i), 4); got.push(b.get); r.opened.push(day(i));
}
assert.deepStrictEqual(got, [1, 2, 3, 4, 5, 6, 8]);
assert.strictEqual(core.board(r, day(10), 4).fresh, true);   // the next day of use starts puzzle 2
core.finish(r, { n: 1, mode: 'lesson' }, day(10));
assert.strictEqual(core.board(r, day(10), 4).puzzle, 1);
assert.strictEqual(core.streakOf(r, day(10)), 2);            // days 9 and 10

// stars: 1 a session, +1 when Mama taps Alone
r = core.blank();
core.finish(r, { n: 1, mode: 'lesson' }, day(0)); core.applyTap(r, day(0), 1, 'alone');
core.finish(r, { n: 1, mode: 'lesson' }, day(0)); core.applyTap(r, day(0), 1, 'help');
assert.strictEqual(r.stars.total, 3);
assert.strictEqual(r.use.length, 1);

// every lesson word can be spelt with sounds taught by then, and has its voice clips
const voice = require('../audio/voice.json').decks.reads.clips;
D.lessons.filter(L => L.ready).forEach(L => {
  const known = core.taught(D, L.n, true);
  (L.words || []).forEach(w => {
    D.words[w].says.forEach(s => assert(known.includes(s), `lesson ${L.n}: ${w} needs /${s}/`));
    assert(voice['w-' + w], `no clip for ${w}`);
  });
});
// ear-game words of the lessons that are open (later lessons open only when their voice is recorded)
D.lessons.filter(L => L.ready).forEach(L => L.beats.filter(b => b[0] === 'hear' || b[0] === 'where').forEach(b => {
  const e = D.ear[b[1]]; ['beg', 'mid', 'end', 'no'].forEach(k => e[k].forEach(w => assert(voice['w-' + w], `lesson ${L.n}: no clip for ${w}`)));
}));
// every sound lessons 1-8 use has a built-in clip, so no lesson waits for a recording
D.lessons.filter(L => L.ready).forEach(L => core.taught(D, L.n, true).forEach(id => assert(voice['p-' + id], `no built-in sound /${id}/ for lesson ${L.n}`)));
console.log('Maria Reads rules: all tests passed');
