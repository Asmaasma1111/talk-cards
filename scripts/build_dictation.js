// كرّاس الإملاء: builds dictation/data/cards.json (the cards, in release order), dictation/audio/lines.json (every line to record)
// and dictation/files.json (the files the service worker caches) from dictation/data/skills.json.
//   node scripts/build_dictation.js
// Stops with an error if an item cannot be built (a target letter or a red word not found, a missing letter that does not rebuild its word).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'dictation');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(DIR, 'js', 'tashkeel.js'), 'utf8'), ctx);
const T = ctx.KDText;

const SRC = JSON.parse(fs.readFileSync(path.join(DIR, 'data', 'skills.json'), 'utf8'));
const errors = [];
const fail = (id, msg) => errors.push(`${id}: ${msg}`);

/* ---------- speech: every line gets an id from its text, so a sentence used twice is recorded once ---------- */
const VOICED = SRC.voiced || {};   // prompt and praise lines: the fully vowelled text the voice reads
const LINES = new Map();   // id -> {text, kind, uses: [card ids]}
function say(text, kind, use) {
  const t = String(text).trim(), id = T.clipId(t);
  if (!LINES.has(id)) LINES.set(id, Object.assign({ id, text: t, kind, uses: [] }, VOICED[t] ? { tts: VOICED[t] } : {}));
  if (use && !LINES.get(id).uses.includes(use)) LINES.get(id).uses.push(use);
  return id;
}

/* ---------- colouring: letter ranges ---------- */
// the letters where two spellings differ (right vs wrong, red vs fix), as letter positions in `right`
function diffLetters(right, wrong) {
  const a = T.clusters(right).filter(c => T.isLetter(c.ch)).map(c => c.ch), b = T.clusters(wrong).filter(c => T.isLetter(c.ch)).map(c => c.ch);
  let p = 0; while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let q = 0; while (q < a.length - p && q < b.length - p && a[a.length - 1 - q] === b[b.length - 1 - q]) q++;
  let from = p, to = a.length - 1 - q;
  if (to < from) from = to = Math.min(p, a.length - 1);   // a letter only added or dropped: colour the letter next to it
  return [[from, to]];
}
const toLetters = (w, ranges) => T.letterIndex(w, ranges);
function targetOf(w, t, pos, id) {
  const r = T.findTarget(w, t, pos);
  if (!r.length) { fail(id, `target «${t}» not found in «${w}»`); return []; }
  return toLetters(w, r);
}

/* ---------- the cards ---------- */
const cards = {}, units = [], sets = [], skills = [];
const ruleText = (sk, r, all) => all ? sk.rules.join(' ') : sk.rules[r || 0];

function addStageCards(unit, stage, list) {
  if (!list.length) return;
  // sets of about 4 in the order listed: 7 -> 4, 3; 18 -> 4, 4, 4, 3, 3 (as the times tables split a table)
  const n = Math.ceil(list.length / 4);
  for (let g = 0, i = 0; g < n; g++) {
    const len = Math.ceil((list.length - i) / (n - g));
    const id = `${unit.id}-${stage}${String.fromCharCode(97 + g)}`;
    const ids = list.slice(i, i + len).map(c => c.id);
    list.slice(i, i + len).forEach(c => { c.set = id; c.stage = stage; c.unit = unit.id; cards[c.id] = c; });
    sets.push({ id, unit: unit.id, stage, cards: ids });
    unit.sets.push(id);
    i += len;
  }
  unit.stages.push(stage);
}

function wordCard(sk, it, pos) {
  return { id: it.id, type: 'word', skill: sk.id, w: it.word, tg: targetOf(it.word, it.target, pos, it.id), rule: ruleText(sk, it.r, sk.showAllRules),
    keep: sk.partial[it.id] || [], audio: { say: say(it.word, 'word', it.id) } };
}
function chooseCard(sk, it) {
  const c = { id: it.id, type: 'choose', skill: sk.id, right: it.right, wrong: it.wrong, tg: diffLetters(it.right, it.wrong),
    rule: ruleText(sk, it.r, sk.showAllRules), keep: sk.partial[it.id] || [] };
  if (it.gap) {   // a short sentence with a gap: meaning decides (الحروف المتشابهة)
    const tok = it.gap.split(/\s+/).find(x => x.includes('_'));
    if (!tok) fail(it.id, 'gap sentence without _');
    c.gap = it.gap;
    c.full = it.gap.replace(tok, it.right + (/[.،؟!]$/.test(tok) ? tok.slice(-1) : ''));
    c.audio = { show: say(c.full, 'sentence', it.id) };
  } else c.audio = { show: say(it.right, 'word', it.id) };
  if (T.strip(it.right) === T.strip(it.wrong) && it.right === it.wrong) fail(it.id, 'the two spellings are the same');
  return c;
}
function sortCard(sk, it, pos) {
  const words = [];
  it.words.forEach((list, b) => list.forEach(w => words.push([w, b])));
  if (words.length < 6 || words.length > 11) fail(it.id, `a sort card has ${words.length} words (6 to 9; skill 7's has 11, as written in the brief)`);
  return { id: it.id, type: 'sort', skill: sk.id, baskets: it.baskets, words, rule: ruleText(sk, 0, sk.showAllRules), keep: [],
    extra: sk.moonLetters ? `الحروف القمرية: ${sk.moonLetters}` : '', audio: {} };
}
function missingCard(sk, it) {
  const c = { id: it.id, type: 'missing', skill: sk.id, word: it.word, fill: it.fill, none: !!it.none, noneBtn: !!sk.noneButton,
    rule: ruleText(sk, it.r, sk.showAllRules), keep: sk.partial[it.id] || [], audio: { show: say(it.word, it.word.includes(' ') ? 'sentence' : 'word', it.id) } };
  if (it.none) { c.before = it.word; c.after = ''; c.tg = []; return c; }
  // where the letter goes: the first (or last) place its letter-and-marks appear as a whole letter
  const hits = [];
  for (let i = it.word.indexOf(it.fill); i >= 0; i = it.word.indexOf(it.fill, i + 1)) {
    const after = it.word[i + it.fill.length];
    if (!after || !T.isMark(after)) hits.push(i);
  }
  if (!hits.length) { fail(it.id, `«${it.fill}» not found in «${it.word}»`); return c; }
  const at = it.at === 'last' ? hits[hits.length - 1] : hits[0];
  c.before = it.word.slice(0, at); c.after = it.word.slice(at + it.fill.length);
  if (c.before + it.fill + c.after !== it.word) fail(it.id, 'does not rebuild its word');
  c.tg = toLetters(it.word, [[at, at + it.fill.length]]);
  return c;
}
function redCard(sk, it, stage) {
  const parts = it.s.split(it.red);
  if (parts.length !== 2) fail(it.id, `the red word «${it.red}» appears ${parts.length - 1} times in the sentence`);
  const fixed = it.ok ? it.s : it.s.replace(it.red, it.fix);
  return { id: it.id, type: 'red', skill: sk.id, s: it.s, red: it.red, ok: it.ok, fix: it.fix || '', fixed, long: stage === 4,
    tg: it.ok ? [] : diffLetters(it.fix, it.red), rule: ruleText(sk, it.r, sk.showAllRules), keep: sk.partial[it.id] || [],
    audio: { show: say(fixed, 'sentence', it.id) } };
}
function sentCard(sk, it, stage) {
  const ch = T.chunks(it.s), s = ch.join(' ');
  ch.forEach(c => { const n = c.split(/\s+/).length; if (ch.length > 1 && (n < 1 || n > 3)) fail(it.id, `the chunk «${c}» has ${n} words (2 or 3)`); });
  if (ch.length === 1 && s.split(/\s+/).length > 3) fail(it.id, 'a sentence of more than 3 words needs its chunk marks |');
  return { id: it.id, type: 'sent', skill: sk.id, s, chunks: ch, long: stage === 4, rule: ruleText(sk, it.r, sk.showAllRules), keep: sk.partial[it.id] || [],
    audio: { full: say(s, 'dictation', it.id), chunks: ch.length > 1 ? ch.map(c => say(c, 'chunk', it.id)) : [] } };
}
function textCard(sk, it) {
  // sentences end at . ? ! (each with its chunks)
  const raw = it.s.match(/[^.؟!]+[.؟!]+/g) || [it.s];
  const sentences = raw.map(x => x.trim()).filter(Boolean).map(x => ({ s: T.unchunk(x), chunks: T.chunks(x) }));
  const s = sentences.map(x => x.s).join(' ');
  if (sentences.length < 3) fail(it.id, `a text needs 3 sentences (found ${sentences.length})`);
  sentences.forEach(x => x.chunks.forEach(c => { const n = c.split(/\s+/).length; if (x.chunks.length > 1 && n > 3) fail(it.id, `the chunk «${c}» has ${n} words`); }));
  return { id: it.id, type: 'text', skill: sk.id, s, sentences, rule: ruleText(sk, it.r, sk.showAllRules), keep: sk.partial[it.id] || [],
    audio: { full: say(s, 'dictation', it.id), sentences: sentences.map(x => ({ full: say(x.s, 'dictation', it.id), chunks: x.chunks.length > 1 ? x.chunks.map(c => say(c, 'chunk', it.id)) : [] })) } };
}
function textRedCard(sk, it) {
  let fixed = it.s;
  const reds = it.reds.map(r => {
    if (it.s.split(r.red).length !== 2) fail(it.id, `the red word «${r.red}» must appear once`);
    if (!r.ok) fixed = fixed.replace(r.red, r.fix);
    return { red: r.red, ok: r.ok, fix: r.fix || '', tg: r.ok ? [] : diffLetters(r.fix, r.red) };
  });
  return { id: it.id, type: 'textred', skill: sk.id, s: it.s, reds, fixed, rule: ruleText(sk, it.r, sk.showAllRules), keep: sk.partial[it.id] || [],
    audio: { show: say(fixed, 'sentence', it.id) } };
}

function buildUnit(sk, src, id, label, withStage5) {
  const unit = { id, skill: sk.id, label, stages: [], sets: [] };
  const pos = sk.pos === 'end' ? 'last' : sk.pos;
  addStageCards(unit, 1, [...(src.choose || []).map(it => chooseCard(sk, it)), ...(src.sort || []).map(it => sortCard(sk, it, pos))]);
  addStageCards(unit, 2, [...(src.missing || []).map(it => missingCard(sk, it)), ...(src.words || []).map(it => wordCard(sk, it, pos))]);
  addStageCards(unit, 3, [...(src.redSimple || []).map(it => redCard(sk, it, 3)), ...(src.simple || []).map(it => sentCard(sk, it, 3))]);
  addStageCards(unit, 4, [...(src.redComplex || []).map(it => redCard(sk, it, 4)), ...(src.complex || []).map(it => sentCard(sk, it, 4))]);
  if (withStage5) addStageCards(unit, 5, [...(src.text ? [textCard(sk, src.text)] : []), ...(src.textRed ? [textRedCard(sk, src.textRed)] : [])]);
  units.push(unit);
  return unit;
}

SRC.skills.forEach(sk => {
  const entry = { id: sk.id, n: sk.n, name: sk.name, heading: sk.heading, pic: sk.pic, rules: sk.rules, units: [] };
  if (sk.pairs) {
    sk.pairs.forEach(pr => entry.units.push(buildUnit(sk, pr, pr.id, pr.letters.join(' / '), false).id));
    entry.units.push(buildUnit(sk, { text: sk.text, textRed: sk.textRed }, `${sk.id}x`, 'مراجعة', true).id);
  } else entry.units.push(buildUnit(sk, sk, sk.id, '', true).id);
  skills.push(entry);
});

// the sort cards' words get their target letters too (the basket letter, coloured on the back)
Object.values(cards).filter(c => c.type === 'sort').forEach(c => {
  const sk = SRC.skills.find(s => s.id === c.skill);
  c.words = c.words.map(([w, b]) => {
    const label = c.baskets[b].label;
    let t = T.strip(label).replace(/ـ/g, '');
    if (sk.pos === 'end') t = 'END';
    else if (t.length > 2) t = 'ال';                       // الشَّمْسُ / الْقَمَرُ baskets: the ال
    const r = T.findTarget(w, t, sk.pos === 'end' ? 'last' : sk.pos === 'all' ? 'all' : (sk.pos === 'last' ? 'last' : 'first'));
    return [w, b, r.length ? T.letterIndex(w, r) : []];
  });
});

/* ---------- Maria-facing lines (prompts, praise) ---------- */
const prompts = {};
Object.entries(SRC.prompts).forEach(([k, v]) => { prompts[k] = { text: v, audio: say(v, 'prompt') }; });
const praise = SRC.praise.map(v => ({ text: v, audio: say(v, 'praise') }));
const start = SRC.start.map(v => ({ text: v, audio: say(v, 'prompt') }));
const end = { text: SRC.end, audio: say(SRC.end, 'prompt') };

if (errors.length) { console.error('Errors:\n  ' + errors.join('\n  ')); process.exit(1); }

const order = sets.map(s => s.id);
const out = { v: 1, built: 'scripts/build_dictation.js from data/skills.json', skills, units, sets, order, cards, prompts, praise, start, end };
fs.writeFileSync(path.join(DIR, 'data', 'cards.json'), JSON.stringify(out));

/* ---------- the lines to record ---------- */
const lines = [...LINES.values()];
fs.mkdirSync(path.join(DIR, 'audio'), { recursive: true });
fs.writeFileSync(path.join(DIR, 'audio', 'lines.json'), JSON.stringify(lines, null, 1));

/* ---------- files.json: what the service worker caches (code, data, fonts, the pictures that exist so far) ---------- */
function walk(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]); }
const ship = walk(DIR).map(f => path.relative(ROOT, f).split(path.sep).join('/'))
  .filter(f => /\.(html|css|js|json|png|webp|woff2|m4a)$/.test(f) && !/audio\/(lines\.json|voice\.json)$/.test(f) && !/data\/skills\.json$/.test(f) && !/\/_/.test(f))
  .filter(f => !f.startsWith('dictation/audio/') || f.endsWith('.m4a') ? !f.startsWith('dictation/audio/') : true)
  .sort();
fs.writeFileSync(path.join(DIR, 'files.json'), JSON.stringify({ files: ['dictation/', ...ship] }, null, 1) + '\n');

const by = t => Object.values(cards).filter(c => c.type === t).length;
console.log(`cards.json: ${Object.keys(cards).length} cards (${['choose', 'sort', 'missing', 'word', 'red', 'sent', 'text', 'textred'].map(t => `${t} ${by(t)}`).join(', ')}), ${units.length} units, ${sets.length} sets`);
console.log(`audio/lines.json: ${lines.length} lines to record`);
console.log(`files.json: ${ship.length + 1} files`);
