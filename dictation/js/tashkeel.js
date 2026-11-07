/* كرّاس الإملاء: Arabic text helpers, no DOM (the build script and the tests load this file in Node too).
   - the three tashkeel levels (كامل / جزئي / بدون), computed from the fully vowelled content
   - the target letters of an item (to colour them)
   - the full-tashkeel check used by scripts/test_dictation.js */
(function (root) {
'use strict';

const MARK = /[ً-ْٰ]/;            // tanween, short vowels, shadda, sukun, dagger alif
const MARKS = /[ً-ْٰ]/g;
const TANWEEN = /[ً-ٍ]/;
const SHADDA = 'ّ', SUKUN = 'ْ', FATHA = 'َ', DAMMA = 'ُ', KASRA = 'ِ', FATHATAN = 'ً';
const LETTER = /[ء-غف-ي]/;     // Arabic letters (no tatweel, no marks)
const isMark = c => MARK.test(c);
const isLetter = c => LETTER.test(c);
const strip = s => String(s).replace(MARKS, '');
const plain = s => strip(s).replace(/[^ء-غف-ي\s]/g, '').trim();   // for comparing words
const chunks = s => String(s).split('|').map(x => x.trim()).filter(Boolean);
const unchunk = s => chunks(s).join(' ');

// a word as letters, each with the marks after it: [{ch, marks, start, end}]
function clusters(w) {
  const out = [];
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    if (isMark(c) && out.length) { out[out.length - 1].marks += c; out[out.length - 1].end = i + 1; continue; }
    out.push({ ch: c, marks: '', start: i, end: i + 1 });
  }
  return out;
}

/* ---------- the three levels ---------- */
// جزئي: shadda and tanween stay everywhere (they change how a word is read); the words listed for the item keep all their marks.
function partial(s, keep = []) {
  const set = new Set((keep || []).map(plain));
  return String(s).split(/(\s+)/).map(tok => {
    if (/^\s+$/.test(tok) || set.has(plain(tok))) return tok;
    return tok.replace(/[َ-ِْٰ]/g, '');
  }).join('');
}
function level(s, lvl, keep) {
  if (lvl === 'none') return strip(s);
  if (lvl === 'partial') return partial(s, keep);
  return String(s);
}

/* ---------- target letters ----------
   t: the letter(s) to colour ('ا', 'ال', 'لل', 'ئ'...), or 'END' (the last letter and its tanween alif: التنوين).
   pos: 'first' | 'last' | 'all'. Returns [[start, end]] character ranges in w. */
function findTarget(w, t, pos = 'first') {
  const cl = clusters(w);
  const letters = cl.filter(c => isLetter(c.ch));
  if (!letters.length) return [];
  if (t === 'END') {
    let i = letters.length - 1;
    if (letters[i].ch === 'ا' && i > 0 && TANWEEN.test(letters[i - 1].marks)) i--;   // the alif of tanween goes with it
    return [[letters[i].start, letters[letters.length - 1].end]];
  }
  const want = strip(t).split('');
  const hits = [];
  for (let i = 0; i + want.length <= letters.length; i++) {
    if (want.every((ch, k) => letters[i + k].ch === ch)) hits.push([letters[i].start, letters[i + want.length - 1].end]);
  }
  if (!hits.length) return [];
  if (pos === 'all') return hits;
  if (pos === 'last') return [hits[hits.length - 1]];
  return [hits[0]];
}
// the same ranges in a string where the text may be shown at another tashkeel level: works on letter positions
function letterIndex(w, ranges) {
  const cl = clusters(w).filter(c => isLetter(c.ch));
  return ranges.map(([a, b]) => [cl.findIndex(c => c.start === a), cl.findIndex(c => c.end === b)]);
}
// splits a (possibly stripped) word into [before, target, after] by letter positions, for colouring
function splitByLetters(shown, idx) {
  const cl = clusters(shown);
  let n = -1;
  const pos = [];
  cl.forEach(c => { if (isLetter(c.ch)) n++; pos.push(n); });
  const parts = [];
  let cur = { on: false, s: '' };
  cl.forEach((c, i) => {
    const on = idx.some(([a, b]) => pos[i] >= a && pos[i] <= b);
    if (on !== cur.on && cur.s) { parts.push(cur); cur = { on, s: '' }; }
    cur.on = on; cur.s += shown.slice(c.start, c.end);
  });
  if (cur.s) parts.push(cur);
  return parts;
}

/* ---------- the full-tashkeel check ----------
   Every Arabic letter carries a mark, except the letters that take none: the alif of madd (after a fatha) and the alif of
   tanwin, the و and ي of madd (after a damma or a kasra), alif maqsura (ى), the alif of «ال» and the ل of a sun «ال»,
   a hamzat-wasl alif at the start of a word, the alif after the و of the plural (اكْتُبُوا), and a lone hamza after an alif.
   Returns the problems: [{word, at, letter}]. */
function fullCheck(text) {
  const bad = [];
  for (const raw of String(text).replace(/\|/g, ' ').split(/\s+/)) {
    const w = raw.replace(/[^ء-غـ-ْٰ]/g, '');
    if (!w || w.includes('ـ')) continue;            // a word with a gap (هَـ_ـا) is shown, never read
    const cl = clusters(w).filter(c => isLetter(c.ch));
    cl.forEach((c, i) => {
      if (c.marks) return;
      const prev = cl[i - 1], next = cl[i + 1];
      const pm = prev ? prev.marks : '';
      if (c.ch === 'ى') return;
      if (c.ch === 'ا' || c.ch === 'آ') {
        if (pm.includes(FATHA) || pm.includes(FATHATAN)) return;                       // madd, tanwin alif
        if (next && next.ch === 'ل') return;                                         // the alif of ال
        if (i === 0) return;                                                         // hamzat wasl (اسْمُهُ)
        if (prev && prev.ch === 'و' && !next) return;                                // اكْتُبُوا
        if (prev && (prev.ch === 'و' || prev.ch === 'ف' || prev.ch === 'ب' || prev.ch === 'ك' || prev.ch === 'ل') && i === 1) return;   // وَاسْمِي after a prefix
      }
      if (c.ch === 'و' && pm.includes(DAMMA)) return;
      if (c.ch === 'ي' && pm.includes(KASRA)) return;
      if (c.ch === 'ل' && prev && prev.ch === 'ا' && next && next.marks.includes(SHADDA)) return;   // sun lam
      if (c.ch === 'ل' && prev && prev.ch === 'ل' && next && next.marks.includes(SHADDA)) return;   // لِلشَّجَرَةِ
      bad.push({ word: raw, at: i, letter: c.ch });
    });
  }
  return bad;
}

// a short, stable id for a line of speech (the same text always gets the same recording)
function clipId(text) {
  let h = 0x811c9dc5;
  const s = String(text).normalize('NFC');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return 'c' + h.toString(16).padStart(8, '0');
}

root.KDText = { MARK, isMark, isLetter, strip, plain, chunks, unchunk, clusters, partial, level, findTarget, letterIndex, splitByLetters, fullCheck, clipId };
})(typeof window !== 'undefined' ? window : globalThis);
