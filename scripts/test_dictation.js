// Tests for كرّاس الإملاء (no browser needed): node scripts/test_dictation.js [--audio]
//   content: the brief's section 12 checks on dictation/data/skills.json and the built cards.json
//   engine:  the card scheduler in dictation/js/engine.js (ported from the times tables)
// --audio also fails when a recording is missing (before the voice is recorded, missing clips are only counted).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const DIR = path.join(__dirname, '..', 'dictation');
const ctx = { console }; vm.createContext(ctx);
for (const f of ['tashkeel.js', 'engine.js']) {
  const p = path.join(DIR, 'js', f);
  if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx);
}
const T = ctx.KDText, E = ctx.KDEngine;
const SRC = JSON.parse(fs.readFileSync(path.join(DIR, 'data', 'skills.json'), 'utf8'));
const DATA = JSON.parse(fs.readFileSync(path.join(DIR, 'data', 'cards.json'), 'utf8'));
const LINES = JSON.parse(fs.readFileSync(path.join(DIR, 'audio', 'lines.json'), 'utf8'));
const STRICT_AUDIO = process.argv.includes('--audio');

let failed = 0, passed = 0;
function ok(cond, msg) { if (cond) passed++; else { failed++; console.log('FAIL:', msg); } }
function eq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }

/* =================================== content =================================== */
const C = Object.values(DATA.cards);
const units = s => (s.pairs ? [...s.pairs, { ...s, pairs: undefined, words: [], choose: [], sort: [], missing: [], redSimple: [], simple: [], redComplex: [], complex: [] }] : [s]);

// 1. full tashkeel on everything she reads or hears (the wrong spellings too: they are shown)
{
  const texts = [];
  C.forEach(c => {
    if (c.type === 'word') texts.push([c.id, c.w]);
    if (c.type === 'choose') { texts.push([c.id, c.right], [c.id, c.wrong]); if (c.full) texts.push([c.id, c.full]); }
    if (c.type === 'sort') c.words.forEach(([w]) => texts.push([c.id, w]));
    if (c.type === 'missing') texts.push([c.id, c.word]);
    if (c.type === 'red') texts.push([c.id, c.s], [c.id, c.fixed]);
    if (c.type === 'sent' || c.type === 'text') texts.push([c.id, c.s]);
    if (c.type === 'textred') texts.push([c.id, c.s], [c.id, c.fixed]);
  });
  let bad = 0;
  texts.forEach(([id, t]) => { const b = T.fullCheck(t); if (b.length) { bad++; console.log(`  tashkeel ${id}: «${b.map(x => x.word + ' (' + x.letter + ')').join('، ')}»`); } });
  ok(bad === 0, `every item has full tashkeel (${bad} of ${texts.length} texts have a bare letter)`);
  // the check itself
  eq(T.fullCheck('الشَّمْسُ سَاطِعَةٌ.').length, 0, 'check: sun lam and madd alif need no mark');
  eq(T.fullCheck('كِتَابًا وَقَلَمًا').length, 0, 'check: tanwin alif needs no mark');
  eq(T.fullCheck('ثُمَّ اكْتُبُوا').length, 0, 'check: wasl alif and the alif after plural waw');
  eq(T.fullCheck('كتب').length, 3, 'check: a bare word fails');
  eq(T.fullCheck('لَامِعٌ').length, 0, 'check: لَامِعٌ');
  eq(T.fullCheck('لامِعٌ').length, 1, 'check: لامِعٌ lacks a fatha');
}

// 2. red words: a wrong one has a correction, every red word appears exactly once in its sentence
C.filter(c => c.type === 'red').forEach(c => {
  ok(c.ok || (c.fix && c.fix !== c.red), `${c.id}: a wrong red word has a correction`);
  eq(c.s.split(c.red).length - 1, 1, `${c.id}: the red word appears once in its sentence`);
});
C.filter(c => c.type === 'textred').forEach(c => {
  eq(c.reds.length, 2, `${c.id}: two red words`);
  c.reds.forEach(r => { ok(r.ok || r.fix, `${c.id}: «${r.red}» has a correction`); eq(c.s.split(r.red).length - 1, 1, `${c.id}: «${r.red}» appears once`); });
});

// 3. choose: exactly one correct option
C.filter(c => c.type === 'choose').forEach(c => {
  ok(c.right && c.wrong && c.right !== c.wrong, `${c.id}: two different spellings`);
  ok(T.strip(c.right) !== T.strip(c.wrong), `${c.id}: they differ in letters, not only marks`);
});

// 4. missing: filling the box rebuilds the word
C.filter(c => c.type === 'missing').forEach(c => {
  eq(c.before + c.fill + c.after, c.word, `${c.id}: the missing letter rebuilds «${c.word}»`);
  ok(c.none ? c.fill === '' : c.fill.length > 0, `${c.id}: a letter to write (or nothing, for لا شيء)`);
});

// 5. dictation items: chunk marks and audio
{
  const lineIds = new Set(LINES.map(l => l.id));
  let pending = 0;
  const audioDir = path.join(DIR, 'audio');
  let voice = {}; try { voice = JSON.parse(fs.readFileSync(path.join(audioDir, 'voice.json'), 'utf8')).clips || {}; } catch (e) {}
  const need = id => { ok(lineIds.has(id), `audio ${id} is in lines.json`); if (!voice[id] || !fs.existsSync(path.join(audioDir, voice[id]))) pending++; };
  C.filter(c => c.type === 'sent').forEach(c => {
    if (c.s.split(/\s+/).length > 3) ok(c.chunks.length > 1, `${c.id}: chunk marks (|)`);
    c.chunks.forEach(ch => ok(ch.split(/\s+/).length <= 3, `${c.id}: chunk «${ch}» has 2 or 3 words`));
    need(c.audio.full); c.audio.chunks.forEach(need);
  });
  C.filter(c => c.type === 'text').forEach(c => {
    eq(c.sentences.length >= 3, true, `${c.id}: 3 sentences`);
    need(c.audio.full); c.audio.sentences.forEach(x => { need(x.full); x.chunks.forEach(need); });
  });
  C.filter(c => c.type === 'word').forEach(c => need(c.audio.say));
  const all = LINES.length;
  if (STRICT_AUDIO) ok(pending === 0, `every dictation line is recorded (${pending} missing)`);
  else console.log(`  audio: ${pending} dictation clips not recorded yet (of ${all} lines in lines.json); run with --audio after recording`);
}

// 6. the right/wrong mix of red words is close to half and half in each skill
SRC.skills.forEach(s => {
  const cs = C.filter(c => c.skill === s.id);
  const reds = [...cs.filter(c => c.type === 'red').map(c => c.ok), ...cs.filter(c => c.type === 'textred').flatMap(c => c.reds.map(r => r.ok))];
  const right = reds.filter(Boolean).length, share = right / reds.length;
  ok(share >= 0.35 && share <= 0.65, `${s.id}: red words right ${right} of ${reds.length} (${Math.round(share * 100)}%), close to half`);
});

// 7. the release order follows the brief: per unit, stage 1 (choose, sort), 2 (missing, words), 3, 4, 5; sets of about 4
{
  const typeOrder = { 1: ['choose', 'sort'], 2: ['missing', 'word'], 3: ['red', 'sent'], 4: ['red', 'sent'], 5: ['text', 'textred'] };
  DATA.sets.forEach(st => {
    ok(st.cards.length >= 1 && st.cards.length <= 4, `${st.id}: 1 to 4 cards`);
    st.cards.forEach(id => ok(typeOrder[st.stage].includes(DATA.cards[id].type), `${id} belongs in stage ${st.stage}`));
  });
  eq(DATA.units.map(u => u.id), ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8a', 'S8b', 'S8c', 'S8d', 'S8e', 'S8x'], 'unit order (skill 8 = five pairs, then the mixed text)');
  eq(DATA.units.find(u => u.id === 'S1').stages, [1, 2, 3, 4, 5], 'skill 1 has stages 1 to 5');
  eq(DATA.units.find(u => u.id === 'S8a').stages.includes(5), false, 'a sound-alike pair has no stage 5');
  eq(DATA.units.find(u => u.id === 'S8x').stages, [5], 'the mixed unit is stage 5 only');
  const s1 = DATA.sets.filter(s => s.unit === 'S1' && s.stage === 1);
  eq(s1.map(s => s.cards.length), [4, 3], 'skill 1 stage 1: 6 choose + 1 sort = sets of 4 and 3');
  eq(s1[0].cards, ['S1-CH1', 'S1-CH2', 'S1-CH3', 'S1-CH4'], 'in the order listed');
  eq(DATA.sets.filter(s => s.unit === 'S1' && s.stage === 2).map(s => s.cards.length), [4, 4, 4, 3, 3], 'skill 1 stage 2: 6 missing + 12 words');
  eq(Object.keys(DATA.cards).length, C.length, 'card ids are unique');
  ok(C.every(c => /^S\d[a-ex]?-(W\d\d|CH\d|SO\d|MI\d|RW\d|SS\d|RC\d|CS\d|TX\d|TR\d)$/.test(c.id)), 'ids like S4-W03, S4-CH2, S4-RW5');
}

// 8. target letters: every word, choose and missing card has letters to colour
C.filter(c => ['word', 'choose', 'missing'].includes(c.type) && !c.none).forEach(c => ok(c.tg && c.tg.length && c.tg[0][0] >= 0, `${c.id}: target letters`));
{
  const w = DATA.cards['S1-W04'];   // كِتَابٌ (ا)
  const parts = T.splitByLetters(w.w, w.tg);
  eq(parts.filter(p => p.on).map(p => p.s), ['ا'], 'كِتَابٌ: the madd alif is coloured');
  const t = DATA.cards['S3-W07'];   // كِتَابًا: the tanwin
  eq(T.splitByLetters(t.w, t.tg).filter(p => p.on).map(p => p.s), ['بًا'], 'كِتَابًا: the tanwin and its alif are coloured');
  eq(T.splitByLetters(T.strip(w.w), w.tg).filter(p => p.on).map(p => p.s), ['ا'], 'colouring still works without tashkeel');
  const ch = DATA.cards['S2-CH1'];  // الشَّمْسُ / اشَّمْسُ
  eq(T.splitByLetters(ch.right, ch.tg).filter(p => p.on).map(p => p.s), ['ل'], 'الشَّمْسُ / اشَّمْسُ: the ل is coloured');
}

// 9. the tashkeel levels
{
  const s = 'كَتَبَتِ الْبِنْتُ قِصَّةً.';
  eq(T.level(s, 'full'), s, 'كامل keeps every mark');
  eq(T.level(s, 'none'), 'كتبت البنت قصة.', 'بدون removes every mark');
  eq(T.level(s, 'partial'), 'كتبت البنت قصّةً.', 'جزئي keeps shadda and tanwin');
  eq(T.level(s, 'partial', ['كَتَبَتِ']), 'كَتَبَتِ البنت قصّةً.', 'جزئي keeps the listed words whole');
}

/* =================================== engine =================================== */
if (E) require('./test_dictation_engine.js')(E, DATA, { ok, eq });
else console.log('  (engine tests skipped: dictation/js/engine.js not written yet)');

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
