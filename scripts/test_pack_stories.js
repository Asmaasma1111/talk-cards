// the Book Edition pack: lessons 20, 21, 23, 24 tell the book's story, each page with its picture (prints no book text)
const assert = require('assert'), path = require('path'), os = require('os');
const A = path.join(__dirname, '..') + '/';
const { core } = require(A + 'reads.js');
const D = JSON.parse(JSON.stringify(require(A + 'reads.json')));
const P = require(path.join(os.homedir(), 'Documents/Maria/Maria reads/Book Edition/maria-reads-pack.json'));
assert(core.validPack(P));
core.applyPack(D, P);
const want = { 20: 4, 21: 4, 23: 5, 24: 6 };
for (const [n, k] of Object.entries(want)) {
  const L = D.lessons[n - 1], st = L.beats.find(b => b[0] === 'story');
  assert.strictEqual(st[1], 'b' + n, `lesson ${n} tells the book's story`);
  const S = D.stories['b' + n];
  assert.strictEqual(S.pages.length, k); assert.deepStrictEqual(S.questions, []);
  S.pages.forEach(id => { const X = D.sentences[id]; assert(X.text && X.words.length && X.pic.startsWith('data:image/webp;base64,')); assert(/[.!?]$/.test(X.text)); });
  assert(L.notes && L.notes.length, 'tutor note still there');
  const need = core.lessonClips(D, L);
  console.log(`lesson ${n}: ${k} pages with pictures; needs ${need.lines.filter(x => x.startsWith('x-b')).length} story lines voiced, ${need.words.length} words`);
}
assert(D.stories.gift, 'the Original stories stay in the data');
console.log('ok');
