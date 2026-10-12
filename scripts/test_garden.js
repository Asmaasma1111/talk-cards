// Node tests for the science garden's journey (garden.js core). Run: node scripts/test_garden.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'garden.js'), 'utf8'), ctx);
const G = ctx.ScienceGarden.core;
let fails = 0;
const eq = (a, b, msg) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) { fails++; console.log('FAIL', msg, '\n  got ', JSON.stringify(a), '\n  want', JSON.stringify(b)); } };
const L = G.JOURNEY.length;

eq(L, 34, 'journey length: 3 plants x 6 + 3 cycles x 4 + 4 visitors');
eq(G.stepsFor(0), 0, 'no stars'); eq(G.stepsFor(49), 0, '49 stars'); eq(G.stepsFor(50), 1, '50 stars'); eq(G.stepsFor(349), 6, '349 stars'); eq(G.stepsFor(-5), 0, 'negative');
eq(G.JOURNEY.slice(0, 6).map(s => s.k), [0, 1, 2, 3, 4, 5], 'pomegranate first, all six stages');
eq(G.JOURNEY.slice(18, 22).map(s => s.kind), ['butterfly', 'butterfly', 'butterfly', 'butterfly'], 'insects come once the plants are grown');
eq(G.JOURNEY.slice(22, 26).map(s => s.kind), ['frog', 'frog', 'frog', 'frog'], 'then the frog');
eq(G.CREATURES.frog.stages, ['البيضة', 'أبو ذُنَيبة', 'الضفدع الصغير', 'الضفدع المكتمل النمو'], 'frog stages as in her book');
eq(G.CREATURES.butterfly.stages, ['بيضة', 'يرقة', 'عذراء', 'فراشة'], 'butterfly stages as in her book');

let g = G.stateAt(0);
eq(g.plants, [-1, -1, -1], 'nothing planted'); eq(g.counts, { plants: 0, insects: 0, frogs: 0, birds: 0 }, 'all counts 0');
g = G.stateAt(1); eq(g.plants, [0, -1, -1], 'pomegranate seed');
g = G.stateAt(5); eq(g.bee, true, 'the bee comes with pollination'); eq(g.counts.insects, 1, 'bee counted');
g = G.stateAt(6); eq(g.plants, [5, -1, -1], 'pomegranate fruit'); eq(g.counts.plants, 1, 'one plant grown');
g = G.stateAt(18); eq(g.plants, [5, 5, 5], 'all three grown'); eq(g.counts.plants, 3, 'three plants'); eq(g.butterfly.stage, -1, 'no butterfly yet');
g = G.stateAt(19); eq(g.butterfly, { stage: 0, adults: 0 }, 'butterfly eggs');
g = G.stateAt(22); eq(g.butterfly, { stage: 3, adults: 1 }, 'butterfly out'); eq(g.counts.insects, 2, 'bee + butterfly');
g = G.stateAt(24); eq(g.frog, { stage: 1, adults: 0 }, 'tadpole');
g = G.stateAt(26); eq(g.counts.frogs, 1, 'one frog');
g = G.stateAt(30); eq(g.counts.birds, 1, 'one sparrow');
g = G.stateAt(31); eq(g.hog, true, 'hedgehog');
g = G.stateAt(32); eq(g.hopper, true, 'grasshopper'); eq(g.counts.insects, 3, 'bee + butterfly + grasshopper');
g = G.stateAt(33); eq([g.leaves, g.humus], [true, false], 'leaves and worm');
g = G.stateAt(34); eq([g.round, g.humus], [1, true], 'round 2 begins on rich soil'); eq(g.plants, [5, 5, 5], 'plants still shown before replanting');
g = G.stateAt(35); eq(g.plants, [0, 5, 5], 'new pomegranate seed in round 2'); eq(g.counts.plants, 3, 'count keeps the first round');
g = G.stateAt(34 + 22); eq(g.butterfly.adults, 2, 'a second butterfly'); eq(g.counts.insects, 4, 'insects grow in round 2');
g = G.stateAt(68); eq(g.counts, { plants: 6, insects: 4, frogs: 2, birds: 2 }, 'end of round 2');
for (let n = 0; n <= 3 * L; n++) {
  const a = G.stateAt(n), b = G.stateAt(n + 1);
  ['plants', 'insects', 'frogs', 'birds'].forEach(k => { if (b.counts[k] < a.counts[k]) { fails++; console.log('FAIL count went down', k, n); } });
}
console.log(fails ? `${fails} failed` : 'garden core: all passed');
process.exit(fails ? 1 : 0);
