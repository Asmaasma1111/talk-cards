// كرّاس الإملاء: writes dictation/audio/lines.md, every line the voice will record, for Mama to check before recording.
// Reads dictation/audio/lines.json and dictation/data/cards.json (run node scripts/build_dictation.js first).
//   node scripts/dictation_lines_md.js
'use strict';
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'dictation');
const lines = JSON.parse(fs.readFileSync(path.join(DIR, 'audio', 'lines.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(DIR, 'data', 'cards.json'), 'utf8'));
const byId = new Map(lines.map(l => [l.id, l]));
const done = new Set();
const NOT_SPOKEN = ['انتهيت', 'لا شيء'];   // button labels only: never read aloud
const PACE = { word: 'slow and clear', dictation: 'a little slower than normal', chunk: 'slow, dictation pace', sentence: 'normal pace' };

let n = 0;
const out = [];
const row = (l, label) => { done.add(l.id); n++; return `${n}. ${l.tts || l.text}  \n   <sub>${label} · ${PACE[l.kind] || 'normal pace'} · \`${l.id}\`</sub>`; };

out.push('# كرّاس الإملاء: the lines to record', '',
  'Please check the Arabic of every line below. The voice reads exactly what is written here, with its tashkeel.',
  'Nothing is recorded until you approve it.', '',
  `There are ${lines.length - NOT_SPOKEN.length} lines to record. A sentence used by several cards is recorded once.`, '',
  '## Questions for you', '',
  '1. **Several red words.** In the red-words text cards more than one word is red, so the voice says «الْكَلِمَاتُ الْحَمْرَاءُ: صَحِيحَةٌ أَمْ خَطَأٌ؟» (the brief only had the singular). Is this wording right?',
  '2. **ثُمَّ اُكْتُبُوا.** In skill 6 (همزة الوصل) the sentence «قَالَ الْمُعَلِّمُ: اِسْتَمِعُوا جَيِّدًا، ثُمَّ اُكْتُبُوا.» puts a damma on the alif after ثُمَّ. Inside speech this alif is silent («ثُمَّ اكْتُبُوا»), and the voice may wrongly say a hamza there. Shall I write it «ثُمَّ اكْتُبُوا» (lines 275 and 280)?',
  '3. **ذَهَبٌ لَامِعٌ.** In skill 8 one missing-letter card has two words, «ذَهَبٌ لَامِعٌ». Keep it as a pair, or use «ذَهَبٌ» alone?',
  '4. **كُرَّاسُكِ.** The voice reads كرّاس as «كُرَّاس». Is that how you want it said?',
  '5. **The skill opening page** (the picture and the skill name, shown once per skill) has no voice. Should the voice read the skill name there?', '',
  '## Card prompts, praise, start and end', '',
  'The card shows the short form; the voice reads the fully vowelled form below.', '');
for (const l of lines) {
  if (l.kind !== 'prompt' && l.kind !== 'praise') continue;
  if (NOT_SPOKEN.includes(l.text)) { done.add(l.id); continue; }
  out.push(row(l, l.kind === 'praise' ? 'praise' : 'prompt'));
}
out.push('', `Not recorded (button labels only): ${NOT_SPOKEN.map(t => `«${t}»`).join(' and ')}.`);

// the cards' lines, skill by skill, in the order she meets them
const ids = [];
const walk = a => { if (!a) return; if (typeof a === 'string') ids.push(a); else if (Array.isArray(a)) a.forEach(walk); else Object.values(a).forEach(walk); };
let skill = null;
for (const setId of data.order) {
  const set = data.sets.find(s => s.id === setId);
  for (const cid of set.cards) {
    const c = data.cards[cid];
    if (c.skill !== skill) {
      skill = c.skill;
      const sk = data.skills.find(s => s.id === skill);
      out.push('', `## Skill ${sk.n}: ${sk.name}`, '');
    }
    ids.length = 0; walk(c.audio);
    const fresh = ids.filter(id => !done.has(id));
    if (!fresh.length) continue;
    const label = { word: 'word', sent: 'sentence dictation', text: 'text dictation', textred: 'red-words text', red: 'red word', choose: 'which is right', missing: 'missing letter' }[c.type] || c.type;
    fresh.forEach(id => { const l = byId.get(id); out.push(row(l, `${cid}, ${l.kind === 'chunk' ? 'chunk' : label}`)); });
  }
}
const left = lines.filter(l => !done.has(l.id));
if (left.length) { out.push('', '## Other lines', ''); left.forEach(l => out.push(row(l, l.kind))); }

fs.writeFileSync(path.join(DIR, 'audio', 'lines.md'), out.join('\n') + '\n');
console.log(`audio/lines.md: ${n} lines to record`);
