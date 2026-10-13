// Node tests for مكتبتي's rules (library.js core) and stories.json. Run: node scripts/test_library.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'library.js'), 'utf8'), ctx);
const C = ctx.Maktabati.core;
const ST = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'stories.json'), 'utf8')).stories;
let fails = 0;
const eq = (a, b, msg) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) { fails++; console.log('FAIL', msg, '\n  got ', JSON.stringify(a), '\n  want', JSON.stringify(b)); } };
const by = id => ST.find(s => s.id === id);

eq(ST.length, 30, '30 stories'); eq(C.shelves(ST), [1, 2, 3], 'three shelves');
eq(ST.map(s => C.leaves(s).slice(-5).map(l => l.kind).join()).every(x => x === 'other,magic,feeling,tool,mission'), true, 'every book ends with the five end pages');
eq(C.leaves(by('d01')).map(l => l.kind).join(), 'page,page,page,page,q,page,page,page,page,other,magic,feeling,tool,mission', 'Day 1: the question comes after page 4');
eq(ST.filter(s => s.unlocks_baba_message).map(s => s.day), [10, 16, 22, 27, 30], 'Baba messages');

let L = C.blank(); const t = '2026-10-13', t2 = '2026-10-14';
eq(C.status(L, ST, by('d01'), t), 'new', 'Day 1 is new'); eq(C.status(L, ST, by('d05'), t), 'new', 'any book on shelf 1, any order');
eq(C.status(L, ST, by('d11'), t), 'door', 'shelf 2 is behind glass');
C.start(L, by('d03'), t);
eq(C.status(L, ST, by('d01'), t), 'tomorrow', 'one new book a day'); eq(C.status(L, ST, by('d03'), t), 'new', 'the book she opened today stays open');
eq(C.status(L, ST, by('d01'), t2), 'new', 'the next day another book opens');
eq(C.finish(L, by('d03'), t), { first: true, n: 1 }, 'finishing: first circle');
eq([L.tools, L.notebook, L.feelings, L.order], [['d03'], ['d03'], ['d03'], ['d03']], 'tool, sentence, feeling collected');
eq(C.status(L, ST, by('d03'), t), 'read', 'reread any time'); eq(C.status(L, ST, by('d01'), t), 'tomorrow', 'still one a day after finishing');
eq(C.finish(L, by('d03'), t2), { first: false, n: 1 }, 'rereading gives no new circle'); eq(L.read.d03.times, 2, 'reread counted');
eq(C.path(L, { d03: by('d03') })[0].tool.emoji, '🖍️', 'the path shows the book\'s tool'); eq(C.path(L, {}).length, 30, '30 circles');
['d01', 'd02', 'd04', 'd05', 'd06', 'd07', 'd08', 'd09'].forEach(id => C.finish(L, by(id), t));
eq(C.shelfOpen(L, ST, 2), false, 'shelf 2 waits for Day 10');
C.finish(L, by('d10'), t);
eq(C.shelfOpen(L, ST, 2), true, 'shelf 1 done: shelf 2 opens'); eq(C.doorsWaiting(L, ST), [2], 'its door swings open once');
L.doors[2] = t; eq(C.doorsWaiting(L, ST), [], 'and only once');
ST.filter(s => s.shelf === 2).forEach(s => C.finish(L, s, t));
eq(C.status(L, ST, by('d30'), t2), 'last', 'Day 30 waits for the other nine');
ST.filter(s => s.shelf === 3 && s.day < 30).forEach(s => C.finish(L, s, t2));
L.today = { day: '', id: '' };
eq(C.status(L, ST, by('d30'), '2026-10-20'), 'new', 'then Day 30 opens');
eq(C.setMission(L, 'd01', 'later', t).state, 'later', 'mission later'); eq(C.setMission(L, 'd01', 'done', t, '😊'), { state: 'done', day: t, feel: '😊' }, 'mission done with a feeling');
eq(C.setMission(L, 'd01', 'later', t2).state, 'done', 'a done mission stays done');
// saved state survives a round trip and bad data
eq(C.clean(JSON.parse(JSON.stringify(L))).order.length, 29, 'clean keeps progress'); eq(C.clean(null).order, [], 'clean of nothing');
eq(C.clean({ read: [], order: 'x', sound: false }).sound, false, 'clean keeps the sound choice'); eq(C.valid({ read: {}, order: [] }), true, 'valid backup'); eq(C.valid({}), false, 'invalid backup');
console.log(fails ? `${fails} failed` : 'library core: all passed');
process.exit(fails ? 1 : 0);
