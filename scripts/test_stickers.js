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

eq(C.earnedDays(range(0, 5), addDays), [], '6 days: no sticker yet');
eq(C.earnedDays(range(0, 6), addDays), [day(6)], '7 days in a row: one sticker, on the 7th day');
eq(C.earnedDays(range(0, 13), addDays), [day(6), day(13)], '14 days: two');
eq(C.earnedDays([...range(0, 4), ...range(6, 12)], addDays), [day(12)], 'a missed day starts the count again');
eq(C.earnedDays([...range(0, 6), day(3), day(6)], addDays), [day(6)], 'the same day twice counts once');
eq(C.earnedDays(['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'], addDays), ['2026-11-04'], 'across the end of a month');
eq(C.currentRun(range(0, 3), day(3), addDays), { n: 4, today: true }, 'run counts today');
eq(C.currentRun(range(0, 3), day(4), addDays), { n: 4, today: false }, 'run still alive the next day, before she practises');
eq(C.currentRun(range(0, 3), day(5), addDays).n, 0, 'a missed day ends the run');
const stk = { got: [] };
eq(C.sync(stk, range(0, 13), addDays), 2, 'her earlier weeks give their stickers at once');
eq(stk.got, [{ day: day(6), seen: false }, { day: day(13), seen: false }], 'each waits to be stuck in');
eq(C.sync(stk, range(0, 13), addDays), 0, 'nothing twice');
eq(C.sync(stk, range(0, 3), addDays), 0, 'a day taken off never takes a sticker away');
eq(stk.got.length, 2, 'still two');
const book = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'stickers', 'stickers.json'), 'utf8'));
eq(book.stickers.length, 40, '40 stickers');
eq(book.stickers.filter(s => s.sparkle).length, 10, 'every 4th is sparkly');
eq(book.stickers.every(s => fs.existsSync(path.join(__dirname, '..', 'stickers', s.file))), true, 'every picture is there');
eq(book.stickers[0].name, 'Purple glitter squishy', 'week 1 is the purple glitter squishy');
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
