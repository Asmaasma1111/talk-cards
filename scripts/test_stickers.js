// Tests for the sticker book's rule (stickerbook.js): node scripts/test_stickers.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'stickerbook.js'), 'utf8'), ctx);
const C = ctx.StickerBook.core;
let failed = 0, passed = 0;
const eq = (a, b, msg) => { if (JSON.stringify(a) === JSON.stringify(b)) passed++; else { failed++; console.log(`FAIL: ${msg}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); } };
const pad = n => String(n).padStart(2, '0');
function addDays(ds, n) { const [y, m, d] = ds.split('-').map(Number); const x = new Date(y, m - 1, d); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; }
const T = '2026-10-01', day = n => addDays(T, n), range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => day(a + i));

eq(C.DEFAULT_PER, 2, 'a sticker for every 2 days in a row');
eq(C.earnedDays([day(0)], addDays), [], 'one day: no sticker yet');
eq(C.earnedDays(range(0, 1), addDays), [day(1)], '2 days in a row: one sticker, on the 2nd day');
eq(C.earnedDays(range(0, 5), addDays), [day(1), day(3), day(5)], '6 days: three');
eq(C.earnedDays([day(0), day(2), day(3)], addDays), [day(3)], 'a missed day starts the count again');
eq(C.earnedDays(range(0, 6), addDays, 7), [day(6)], 'with 7 (the old rule): one on the 7th day');
eq(C.earnedDays(['2026-10-31', '2026-11-01'], addDays), ['2026-11-01'], 'across the end of a month');
eq(C.currentRun(range(0, 3), day(3), addDays), { n: 4, today: true }, 'run counts today');
eq(C.currentRun(range(0, 3), day(4), addDays), { n: 4, today: false }, 'run still alive the next day, before she practises');
eq(C.currentRun(range(0, 3), day(5), addDays).n, 0, 'a missed day ends the run');
const book = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'stickers', 'stickers.json'), 'utf8'));
const order = book.stickers;
// a sticker she got under the old 7-day rule keeps its picture; new ones come in the book's order
const stk = { got: [{ day: day(6), seen: true }] };
eq(C.fillFiles(stk.got, book.legacy, order), true, 'old sticker gets its picture');
eq(stk.got[0].file, '01-purpleglittersquishy.webp', 'her first sticker stays the purple glitter squishy');
eq(C.sync(stk, range(0, 13), addDays, 2, order), 6, '14 registered days with the 2-day rule: 7 in all, 6 new');
eq(stk.got.map(g => g.file).slice(0, 4), order.slice(0, 4).map(s => s.file), 'new ones follow the book, none twice');
eq(new Set(stk.got.map(g => g.file)).size, 7, 'all different');
eq(C.sync(stk, range(0, 13), addDays, 2, order), 0, 'nothing twice');
eq(C.sync(stk, range(0, 3), addDays, 2, order), 0, 'a day taken off never takes a sticker away');
const all = { got: [] };
for (let k = 0; k < order.length; k++) all.got.push({ day: day(k), seen: true, file: C.nextFile(order, all.got) });
eq(new Set(all.got.map(g => g.file)).size, order.length, 'the whole book, every sticker once');
eq(C.nextFile(order, all.got), order[0].file, 'then round again from the first');
eq(order.length, 80, '80 stickers');
eq(order.filter(s => s.sparkle).length, 20, 'every 4th is sparkly');
eq(order.every((s, i) => s.sparkle === (i % 4 === 3)), true, 'sparkly ones in place 4, 8, 12...');
eq(order.every(s => fs.existsSync(path.join(__dirname, '..', 'stickers', s.file))), true, 'every picture is there');
eq(book.legacy.length, 40, 'the old order kept for stickers given before');
eq(order.slice(0, 4).map(s => s.name), ['Purple glitter squishy', 'Strawberry', 'Panda', 'Unicorn'], 'the first four did not move');
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
