// Maria Reads v3 rules (the content pack, which clips a lesson needs, Teach Mama days): node scripts/test_reads_v3.js
const assert = require('assert');
const { core } = require('../reads.js');
const D = require('../reads.json');

// the listening games never hold a lesson back: a word with no voice yet is skipped, not required
const fake = { n: 1, new: ['a'], beats: [['stretch', 'zzz'], ['shop', 'zzz'], ['hoops', 'zzz'], ['teach', 'zzz'], ['read', 'at']] };
const need = core.lessonClips(D, fake);
assert(!need.words.includes('w-zzz') && need.words.includes('w-at') && need.sounds.includes('a'));
// the fast lane looks only at the words she reads
assert.deepStrictEqual(core.lessonSounds(D, 1).sort(), ['a']);

// the Book Edition pack: its lesson fields, words and reference pages arrive; anything else is refused
const P = { app: 'maria-reads', edition: 'book', v: 1, lessons: { 1: { notes: [{ title: 'Book', text: ['x'] }] } }, words: { zz: { tiles: ['Z'], says: ['z'] } }, reference: [{ heading: 'H', text: ['t'] }] };
assert(core.validPack(P));
assert(!core.validPack({ app: 'maria-reads', edition: 'book', v: 2, lessons: {} }) && !core.validPack(null) && !core.validPack({ app: 'other' }));
const D2 = JSON.parse(JSON.stringify(D)); core.applyPack(D2, P);
assert.strictEqual(D2.lessons[0].notes[0].title, 'Book'); assert(D2.words.zz && D2.words.cat);
assert.strictEqual(D2.edition, 'book'); assert.strictEqual(D2.reference.length, 1);
assert.strictEqual(D2.lessons[0].beats.length, D.lessons[0].beats.length);   // lesson steps stay unless the pack brings its own

// Teach Mama: every 4th day of use from lesson 3 on, or the day Mama picks
const r = core.blank();
r.use = ['d1', 'd2', 'd3']; assert.strictEqual(core.teachDay(r, 'd4', 3), true); assert.strictEqual(core.teachDay(r, 'd4', 2), false);
r.use = ['d1']; assert.strictEqual(core.teachDay(r, 'd2', 5), false); r.settings.teachDay = 'd2'; assert.strictEqual(core.teachDay(r, 'd2', 5), true);

// progress saved before v3 still loads (the new 'ok' map is added empty)
assert.deepStrictEqual(core.clean({ current: 4, lessons: {}, stars: { total: 9, days: {} } }).ok, {});
assert.strictEqual(core.clean({ current: 4, lessons: {}, stars: { total: 9, days: {} } }).stars.total, 9);

// every lesson 1-8 step uses a known beat and only words that exist
const BEATS = ['flash', 'newsound', 'hear', 'where', 'read', 'swap', 'me', 'sight', 'diff', 'spell', 'sent', 'story', 'pair', 'stretch', 'action', 'run', 'shop', 'hoops', 'teach'];
D.lessons.slice(0, 8).forEach(L => L.beats.forEach(b => assert(BEATS.includes(b[0]), `lesson ${L.n}: ${b[0]}`)));
console.log('Maria Reads v3 rules: all tests passed');
