/* ركن الرياضيات: the maths corner of هيا نتعلم في الجزائر (her request, 23 Oct 2026: "add maths corner... make sure practice is
   there and all missing contents from the KSA curriculum is there"). Every maths gap of Mama's comparison report, in the
   order of the trip's maths ladder, each with a short lesson and practice that never runs out (generated, a new set each
   round). Her rules: Saudi digits (٢٣٥١٩), the content not the symbols (Arabic unit names, ٩:٣٠ for times, أ ب for points);
   «التالي» after every answer; the corner never moves the trip on or holds it back.
   Opened from the trip's home; its progress lives inside the trip's progress (so it is in the one backup file). */
(function (root) {
'use strict';

const AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const seedOf = str => [...String(str)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
const int = (rnd, a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (rnd, a) => a[Math.floor(rnd() * a.length)];
function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const digitsNum = (rnd, d) => int(rnd, 10 ** (d - 1), 10 ** d - 1);
// three different options, the right one among them; returns {opts, ok}
function three(rnd, right, wrongs) {
  const seen = new Set([String(right)]), w = [];
  for (const x of wrongs) if (!seen.has(String(x)) && w.length < 2) { seen.add(String(x)); w.push(x); }
  const opts = shuffle([right, ...w], rnd);
  return { opts, ok: opts.findIndex(x => String(x) === String(right)) };
}
// the topic's picture, drawn in ChatGPT (her rule: "if there are any drawings, use ChatGPT"); the emoji if it is missing
const pic = (t, cls = 'mc-pic-ic') => `<img class="${cls}" src="assets/algeria/corner/${t.id}.webp" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'mc-ic',textContent:'${t.icon}'}))">`;
const TRIP = () => (root.AlgeriaTrip && root.AlgeriaTrip.core) || null;

/* =====================================================================================================
   The topics: every maths gap of the report (the trip's maths ladder). Each: a lesson (rule lines and a worked example)
   and gen(rnd, level) -> one practice item. Items:
     {k:'mc', q, opts, ok, show?}     choose one of three (show: 'num' | 'svg' | text)
     {k:'pad', q, ans, unit?}         type the answer on the keypad
     {k:'multi', q, blanks:[...]}     several answers in turn (q has {0} {1} ... where they go)
     {k:'mulcol', a, b}               vertical multiplication by one digit, digit by digit, with the carries
     {k:'subcol', a, b}               «الطرح بالإضافة», digit by digit
   ===================================================================================================== */
const TOPICS = [];
const T = (id, icon, title, lesson, gen) => TOPICS.push({ id, icon, title, lesson, gen });

T('words', '✍️', 'كتابة الأعداد بالحروف', {
  rule: ['نقسمُ العددَ منزلتين: منزلةَ الآلافِ ومنزلةَ الوحدات.', 'نقرأُ الآلافَ أوّلًا، ونقولُ بعدَها: ألف، ثمّ نقرأُ الباقي.'],
  ex: ['٢٣٥١٩ = ثلاثة وعشرون ألفًا وخمسمائة وتسعة عشر', '٤٢٠٥ = أربعة آلاف ومئتان وخمسة'] },
  (rnd, lv) => {
    const tc = TRIP(); const it = tc.mathItems(Math.floor(rnd() * 1e9), 1, [[3, 4], [4, 5], [5, 5]][lv - 1])[0];
    if (it.t === 'place') return { k: 'mc', q: `ما رقمُ ${tc.PLACE_NAMES[it.p]} في العدد ${AR(it.n)}؟`, opts: it.opts.map(AR), ok: it.ok, show: 'num' };
    if (it.t === 'n2w') return { k: 'mc', q: `اختاري الكتابةَ الصحيحةَ للعدد ${AR(it.n)}`, opts: it.opts, ok: it.ok };
    if (it.t === 'expand') return { k: 'mc', q: `ما العدد: ${tc.expanded(it.n).map(AR).join(' + ')}؟`, opts: it.opts.map(AR), ok: it.ok, show: 'num' };
    return { k: 'mc', q: `اختاري العدد: ${tc.numWords(it.n)}`, opts: it.opts.map(AR), ok: it.ok, show: 'num' };
  });

T('x10', '✖️', 'الضرب في ١٠ و١٠٠ و١٠٠٠', {
  rule: ['عند الضرب في ١٠ نضيفُ صفرًا واحدًا إلى يمين العدد.', 'وفي ١٠٠ نضيفُ صفرين، وفي ١٠٠٠ نضيفُ ثلاثةَ أصفار.'],
  ex: ['٤٣ × ١٠ = ٤٣٠', '٤٣ × ١٠٠ = ٤٣٠٠', '٤٣ × ١٠٠٠ = ٤٣٠٠٠'] },
  (rnd, lv) => {
    const m = pick(rnd, lv === 1 ? [10, 100] : [10, 100, 1000]), a = digitsNum(rnd, int(rnd, 1, lv === 3 ? 3 : 2));
    if (lv >= 2 && rnd() < 0.3) return { k: 'pad', q: `${AR(a)} × ؟ = ${AR(a * m)}`, ans: m };
    return { k: 'pad', q: `${AR(a)} × ${AR(m)} = ؟`, ans: a * m };
  });

T('double', '🔁', 'الضعف والنصف والربع', {
  rule: ['ضعفُ العدد: نضربه في ٢.  نصفُ العدد: نقسمه على ٢.', 'ربعُ العدد: نقسمه على ٤ (نصفُ النصف).  أربعةُ أمثاله: نضربه في ٤.'],
  ex: ['ضعفُ ٣١٤٢ = ٦٢٨٤', 'نصفُ ٨٢٤٦ = ٤١٢٣', 'ربعُ ٤٠٠ = ١٠٠'] },
  (rnd, lv) => {
    const d = [2, 3, 4][lv - 1], kind = pick(rnd, lv === 1 ? ['double', 'half'] : ['double', 'half', 'quarter', 'four']);
    let n = digitsNum(rnd, d);
    if (kind === 'half') n -= n % 2;
    if (kind === 'quarter') n -= n % 4;
    if (n < 4) n = 8;
    const name = { double: 'ضعفُ', half: 'نصفُ', quarter: 'ربعُ', four: 'أربعةُ أمثالِ' }[kind];
    const ans = { double: n * 2, half: n / 2, quarter: n / 4, four: n * 4 }[kind];
    return { k: 'pad', q: `ما ${name} العدد ${AR(n)}؟`, ans };
  });

T('distrib', '🧩', 'خاصية التوزيع', {
  rule: ['نفكّكُ العددَ إلى عشراتٍ وآحاد، ونضربُ كلَّ جزءٍ وحدَه، ثمّ نجمع.'],
  ex: ['١٥ × ٦ = (١٠ × ٦) + (٥ × ٦) = ٦٠ + ٣٠ = ٩٠'] },
  (rnd, lv) => {
    const t = int(rnd, 1, lv === 1 ? 2 : lv === 2 ? 4 : 9), u = int(rnd, 1, 9), b = int(rnd, 2, 9), a = t * 10 + u;
    return { k: 'multi', q: `${AR(a)} × ${AR(b)} = (${AR(t * 10)} × ${AR(b)}) + (${AR(u)} × ${AR(b)}) = {0} + {1} = {2}`, blanks: [t * 10 * b, u * b, a * b] };
  });

T('mul1', '🧮', 'الضرب العمودي في رقم واحد', {
  rule: ['نبدأُ من الآحاد: نضربُ ونكتبُ رقمَ الآحاد، ونحتفظُ بالعشرات فوقَ المنزلة التالية.', 'ثمّ نضربُ المنزلةَ التالية ونجمعُ ما احتفظنا به.'],
  ex: ['٥٧ × ٤: ٧ × ٤ = ٢٨، نكتب ٨ ونحتفظ بـ ٢. ثمّ ٥ × ٤ = ٢٠، و٢٠ + ٢ = ٢٢. الجواب ٢٢٨'] },
  (rnd, lv) => ({ k: 'mulcol', a: digitsNum(rnd, lv + 1), b: int(rnd, 2, 9) }));

T('mul2', '📐', 'الضرب العمودي في رقمين', {
  rule: ['نضربُ في رقم الآحاد أوّلًا، ثمّ في رقم العشرات ونضعُ صفرًا في منزلة الآحاد.', 'ثمّ نجمعُ الناتجين.'],
  ex: ['١٢ × ١٤: ١٢ × ٤ = ٤٨، و١٢ × ١٠ = ١٢٠، و٤٨ + ١٢٠ = ١٦٨'] },
  (rnd, lv) => {
    const a = digitsNum(rnd, lv === 3 ? 3 : 2), b = int(rnd, lv === 1 ? 11 : 12, lv === 1 ? 19 : 99), u = b % 10, t = b - u;
    if (!u) return { k: 'multi', q: `${AR(a)} × ${AR(b)} = {0}`, blanks: [a * b], col: [a, b] };
    return { k: 'multi', q: `${AR(a)} × ${AR(u)} = {0}\n${AR(a)} × ${AR(t)} = {1}\n{0} + {1} = {2}`, blanks: [a * u, a * t, a * b], col: [a, b] };
  });

T('subadd', '➖', 'الطرح بالإضافة', {
  rule: ['إذا كان الرقمُ في الأعلى أصغرَ من الرقم في الأسفل:', 'نضيفُ ١٠ إلى الرقم في الأعلى، ونضيفُ ١ إلى رقم الأسفل في المنزلة التالية.'],
  ex: ['٥٢ − ٢٧: ٢ أصغرُ من ٧، فنجعلُ ٢ ← ١٢، و١٢ − ٧ = ٥. ونجعلُ ٢ في العشرات ← ٣، و٥ − ٣ = ٢. الجواب ٢٥'] },
  (rnd, lv) => {
    const d = lv + 1;
    for (;;) {
      const a = digitsNum(rnd, d), b = int(rnd, 10 ** (d - 2), a - 1);
      const A = String(a).split('').reverse(), B = String(b).padStart(d, '0').split('').reverse();
      if (A.some((x, i) => Number(x) < Number(B[i]))) return { k: 'subcol', a, b };
    }
  });

// lengths: كلم, م, دسم, سم, ملم (each 10 times the next, and the kilometre 1000 metres)
const LEN = [['كلم', 'كيلومتر'], ['م', 'متر'], ['دسم', 'ديسيمتر'], ['سم', 'سنتيمتر'], ['ملم', 'مليمتر']], LF = [1000, 10, 10, 10];
T('length', '📏', 'وحدات الطول', {
  rule: ['١ م = ١٠ دسم (ديسيمتر)، و١ دسم = ١٠ سم، و١ سم = ١٠ ملم.', '١ كلم = ١٠٠٠ م.'],
  ex: ['٣ م = ٣٠ دسم', '٢ كلم و٦٠٠ م = ٢٦٠٠ م', '٤٥ سم = ٤ دسم و٥ سم'] },
  (rnd, lv) => convert(rnd, lv, LEN, LF, 'الطول'));
// mass and capacity: كجم, هكتوجرام, ديكاجرام, جم (each 10 times the next); لتر = ١٠٠ سنتيلتر, سنتيلتر = ١٠ مل
const MASS = [['كجم', 'كيلوجرام'], ['هكتوجرام', 'هكتوجرام'], ['ديكاجرام', 'ديكاجرام'], ['جم', 'جرام']], MF = [10, 10, 10];
const CAP = [['ل', 'لتر'], ['سنتيلتر', 'سنتيلتر'], ['مل', 'مليلتر']], CF = [100, 10];
T('mass', '⚖️', 'الكتلة والسعة', {
  rule: ['١ كجم = ١٠ هكتوجرام، و١ هكتوجرام = ١٠ ديكاجرام، و١ ديكاجرام = ١٠ جم. إذن ١ كجم = ١٠٠٠ جم.', '١ لتر = ١٠٠ سنتيلتر، و١ سنتيلتر = ١٠ مل.'],
  ex: ['٣ كجم و٧٠٠ جم = ٣٧٠٠ جم', '٢ ل = ٢٠٠ سنتيلتر', '٥ سنتيلتر = ٥٠ مل'] },
  (rnd, lv) => (rnd() < 0.6 ? convert(rnd, lv, MASS, MF) : convert(rnd, lv, CAP, CF)));
function convert(rnd, lv, U, F) {
  const i = int(rnd, 0, U.length - 2), j = lv === 1 ? i + 1 : int(rnd, i + 1, U.length - 1);
  const f = F.slice(i, j).reduce((x, y) => x * y, 1), a = int(rnd, 1, lv === 3 ? 30 : 9);
  if (lv === 3 && f >= 10) {   // a mixed measure: ٢ كلم و٦٠٠ م = ؟ م
    const b = int(rnd, 1, f - 1);
    return { k: 'pad', q: `${AR(a)} ${U[i][0]} و${AR(b)} ${U[j][0]} = ؟ ${U[j][0]}`, ans: a * f + b, unit: U[j][0] };
  }
  if (rnd() < 0.3) return { k: 'pad', q: `${AR(a * f)} ${U[j][0]} = ؟ ${U[i][0]}`, ans: a, unit: U[i][0] };
  return { k: 'pad', q: `${AR(a)} ${U[i][0]} = ؟ ${U[j][0]}`, ans: a * f, unit: U[j][0] };
}

T('time', '⏰', 'المُدَد الزمنية', {
  rule: ['الساعةُ ستّون دقيقة.', 'لنحسبَ المدّة: نعدُّ الدقائقَ من البداية إلى النهاية، ونكملُ إلى الساعة أوّلًا.'],
  ex: ['من ١٠:٣٠ إلى ١١:١٥: إلى ١١:٠٠ ثلاثون دقيقة، ثمّ ١٥ دقيقة. المدّة ٤٥ دقيقة.'] },
  (rnd, lv) => {
    const step = lv === 1 ? 30 : lv === 2 ? 15 : 5, h = int(rnd, 7, 16), m = int(rnd, 0, 60 / step - 1) * step;
    const dur = int(rnd, 1, lv === 1 ? 3 : lv === 2 ? 6 : 24) * (lv === 3 ? 5 : step);
    const end = h * 60 + m + dur, tt = x => AR(`${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`);
    if (rnd() < 0.5) return { k: 'pad', q: `بدأ الدرسُ الساعة ${tt(h * 60 + m)} وانتهى الساعة ${tt(end)}. كم دقيقةً دام؟`, ans: dur, unit: 'دقيقة' };
    const r3 = three(rnd, tt(end), [tt(end + 60), tt(end - step), tt(end + step), tt(h * 60 + m + 100)]);
    return { k: 'mc', q: `خرجنا الساعة ${tt(h * 60 + m)} ووصلنا بعد ${AR(dur)} دقيقة. متى وصلنا؟`, ...r3, show: 'num' };
  });

T('tools', '🧰', 'الأدوات الهندسية', {
  rule: ['المسطرةُ المدرّجة: نقيسُ بها الطولَ ونرسمُ قطعةً مستقيمة.', 'الكوس: نرسمُ به الزاويةَ القائمةَ ونتحقّقُ منها.', 'المدوَر (الفرجار): نرسمُ به الدائرة.'],
  ex: [] },
  (rnd, lv) => {
    if (lv >= 2 && rnd() < 0.5) {
      const right = pick(rnd, ['ang90a', 'ang90b']), opts = shuffle([right, 'ang45', 'ang135'], rnd);
      return { k: 'mc', q: 'أيُّ زاويةٍ قائمة؟', opts: opts.map(paperImg), ok: opts.indexOf(right), show: 'svg' };
    }
    const qs = [['بماذا نرسمُ دائرة؟', 'compass'], ['بماذا نتحقّقُ من الزاوية القائمة؟', 'square'], ['بماذا نقيسُ طولَ قطعةٍ مستقيمة؟', 'ruler']];
    const [q, right] = pick(rnd, qs), opts = shuffle(['ruler', 'square', 'compass'], rnd);
    return { k: 'mc', q, opts: opts.map(t => svgTool(t)), ok: opts.indexOf(right), show: 'svg' };
  });

T('midpoint', '📍', 'منتصف القطعة المستقيمة', {
  rule: ['منتصفُ القطعة: نقطةٌ عليها، تبعدُ المسافةَ نفسَها عن طرفيها.', 'نقيسُ طولَ القطعة، ونقسمه على ٢.'],
  ex: ['طولُ [أب] = ٨ سم، فمنتصفها م يبعدُ ٤ سم عن أ و٤ سم عن ب.'] },
  (rnd, lv) => {
    const L = 2 * int(rnd, 2, 6);
    if (lv >= 2 && rnd() < 0.5) return { k: 'pad', q: `طولُ القطعة [أب] ${AR(L)} سم. كم يبعدُ منتصفُها عن أ؟`, ans: L / 2, unit: 'سم' };
    const gap = L >= 8 ? 2 : 1, marks = shuffle([L / 2, L / 2 - gap, L / 2 + gap], rnd);
    return { k: 'mc', q: 'أيُّ نقطةٍ هي منتصفُ القطعة [أب]؟', opts: ['م', 'ن', 'هـ'], ok: marks.indexOf(L / 2), show: 'text', pic: svgSegment(L, marks) };
  });

T('lines', '➕', 'المستقيمات المتوازية والمتعامدة', {
  rule: ['المستقيمان المتوازيان لا يلتقيان أبدًا.', 'المستقيمان المتعامدان يلتقيان ويصنعان زاويةً قائمة.'],
  ex: [] },
  (rnd) => {
    const par = pick(rnd, ['par', 'parv']), want = pick(rnd, [par, 'perp']), opts = shuffle([par, 'perp', 'cross'], rnd);
    return { k: 'mc', q: want === 'perp' ? 'أيُّ مستقيمين متعامدان؟' : 'أيُّ مستقيمين متوازيان؟', opts: opts.map(paperImg), ok: opts.indexOf(want), show: 'svg' };
  });

T('program', '📝', 'برنامج إنشاء', {
  rule: ['برنامجُ الإنشاء: خطواتٌ مكتوبة نرسمُها بالأدوات، واحدةً بعد الأخرى.', 'نقرأُ كلَّ خطوةٍ جيّدًا، ونتأكّدُ من الأطوال.'],
  ex: ['ارسمي قطعةً [أب] طولها ٦ سم، ثمّ عيّني منتصفها م.'] },
  (rnd) => {
    if (rnd() < 0.5) {
      const L = 2 * int(rnd, 2, 4), opts = shuffle(['ok', 'mid', 'len'], rnd);
      return { k: 'mc', q: `ارسمي قطعةً [أب] طولها ${AR(L)} سم، ثمّ عيّني منتصفها م. أيُّ رسمٍ صحيح؟`, opts: opts.map(o => svgProgSeg(L, o)), ok: opts.indexOf('ok'), show: 'svg' };
    }
    const s = int(rnd, 2, 4), opts = shuffle(['ok', 'rect', 'nomid'], rnd);
    return { k: 'mc', q: `ارسمي مربعًا طولُ ضلعه ${AR(s)} سم، ثمّ عيّني منتصفَ ضلعه الأسفل. أيُّ رسمٍ صحيح؟`, opts: opts.map(o => svgProgSq(s, o)), ok: opts.indexOf('ok'), show: 'svg' };
  });

T('net', '🎲', 'منشور المكعب', {
  rule: ['منشورُ المكعب: ستّةُ مربعاتٍ متلاصقة، إذا طويناها صنعنا مكعبًا.', 'ليس كلُّ شكلٍ من ستّة مربعات منشورًا لمكعب.'],
  ex: [] },
  (rnd) => {
    const opts = shuffle(['net_cross', 'net_block', 'net_row'], rnd);
    return { k: 'mc', q: 'أيُّ شكلٍ نطويه فنحصلُ على مكعب؟', opts: opts.map(paperImg), ok: opts.indexOf('net_cross'), show: 'svg' };
  });

/* ---------- the cube nets: a row of four with one square above and one below is always a net; others are not ---------- */
const cubeNet = (i, j) => [[i, 0], [0, 1], [1, 1], [2, 1], [3, 1], [j, 2]];
const NET_BAD = { block: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], five: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [1, 0]], six: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]] };
function sameSide(rnd) { const i = int(rnd, 0, 2); return [[i, 0], [i + 1, 0], [0, 1], [1, 1], [2, 1], [3, 1]]; }   // both on the same side: they meet

/* ---------- the drawings, as she draws them on paper (her rule): pencil and ruler on squared exercise-book paper.
   The fixed ones are ChatGPT's paper pictures (scripts/corner_pics.py, checked exact); the ones whose lengths change with
   each question are drawn here in the same look, one square of the paper for one centimetre. ---------- */
const paperImg = id => `<img class="mc-paper" src="assets/algeria/corner/${id}.webp" alt="">`;
const PENCIL = '#3A3A3A', GRID = 22;
const SV = (w, h, body) => `<svg class="mc-svg paper" viewBox="0 0 ${w} ${h}" aria-hidden="true"><rect width="${w}" height="${h}" fill="#FBFBF8"/>`
  + Array.from({ length: Math.ceil(w / GRID) + 1 }, (_, i) => `<line x1="${i * GRID}" y1="0" x2="${i * GRID}" y2="${h}" stroke="#BFD6EF" stroke-width="1"/>`).join('')
  + Array.from({ length: Math.ceil(h / GRID) + 1 }, (_, i) => `<line x1="0" y1="${i * GRID}" x2="${w}" y2="${i * GRID}" stroke="#BFD6EF" stroke-width="1"/>`).join('')
  + `${body}</svg>`;
const pen = (x1, y1, x2, y2, w = 2.6) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${PENCIL}" stroke-width="${w}" stroke-linecap="round"/>`;
const label = (x, y, t) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="18" font-weight="700" fill="${PENCIL}" font-family="Tajawal, sans-serif">${t}</text>`;
const endCross = (x, y) => pen(x, y - 7, x, y + 7, 2.2);
function svgAngle(a) {
  const r = 70, x = 30 + r * Math.cos(a * Math.PI / 180), y = 110 - r * Math.sin(a * Math.PI / 180);
  return SV(160, 130, `<path d="M30 110 L130 110 M30 110 L${x.toFixed(1)} ${y.toFixed(1)}" stroke="#0B5530" stroke-width="5" stroke-linecap="round" fill="none"/>`
    + (a === 90 ? '<path d="M30 92 H48 V110" fill="none" stroke="#23A862" stroke-width="3"/>' : `<path d="M55 110 A25 25 0 0 0 ${(30 + 25 * Math.cos(a * Math.PI / 180)).toFixed(1)} ${(110 - 25 * Math.sin(a * Math.PI / 180)).toFixed(1)}" fill="none" stroke="#23A862" stroke-width="3"/>`));
}
const TOOL_NAMES = { ruler: 'المسطرة', square: 'الكوس', compass: 'المدوَر' };
function svgTool(t) { return `<img class="mc-tool" src="assets/algeria/corner/${t}.webp" alt=""><b>${TOOL_NAMES[t]}</b>`; }
function svgToolDrawn(t) {   // the drawn tools, kept for when the pictures are not there
  if (t === 'ruler') return SV(160, 80, `<rect x="10" y="22" width="140" height="36" rx="6" fill="#FFE08A" stroke="#B8860B" stroke-width="3"/>${Array.from({ length: 13 }, (_, i) => `<line x1="${20 + i * 10}" y1="22" x2="${20 + i * 10}" y2="${i % 5 ? 32 : 40}" stroke="#7A5A10" stroke-width="2"/>`).join('')}`) + '<b>المسطرة</b>';
  if (t === 'square') return SV(160, 120, '<path d="M30 105 L30 15 L130 105 Z" fill="#CDEBFF" stroke="#2F7FB8" stroke-width="4" stroke-linejoin="round"/><path d="M50 85 L50 60 L77 85 Z" fill="#fff" stroke="#2F7FB8" stroke-width="2"/><path d="M30 92 H43 V105" fill="none" stroke="#2F7FB8" stroke-width="2"/>') + '<b>الكوس</b>';
  return SV(160, 130, '<circle cx="80" cy="18" r="8" fill="#D21034"/><path d="M80 24 L50 115 M80 24 L110 115" stroke="#0B5530" stroke-width="6" stroke-linecap="round"/><path d="M110 115 l-4 10" stroke="#555" stroke-width="3"/><circle cx="50" cy="116" r="3" fill="#333"/>') + '<b>المدوَر</b>';
}
function svgSegment(L, marks) {   // [أب] of L cm: one square a centimetre, أ on the right
  const u = GRID, x0 = u, y = 3 * u, W = (L + 2) * u, names = ['م', 'ن', 'هـ'];
  const pts = marks.map((m, i) => `<circle cx="${x0 + m * u}" cy="${y}" r="5" fill="#D9393F"/>${label(x0 + m * u, y - 12, names[i])}`).join('');
  return SV(W, 5 * u, pen(x0, y, x0 + L * u, y) + endCross(x0, y) + endCross(x0 + L * u, y) + label(x0 + L * u, y + 26, 'أ') + label(x0, y + 26, 'ب') + pts);
}
function svgLines(k, rot) {
  const l = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0B5530" stroke-width="5" stroke-linecap="round"/>`;
  const body = k === 'par' ? l(20, 45, 140, 45) + l(20, 85, 140, 85) : k === 'perp' ? l(20, 65, 140, 65) + l(80, 10, 80, 120) + '<path d="M80 50 H95 V65" fill="none" stroke="#23A862" stroke-width="3"/>' : l(20, 30, 140, 100) + l(20, 100, 140, 50);
  return SV(160, 130, `<g transform="rotate(${rot} 80 65)">${body}</g>`);
}
function svgProgSeg(L, o) {   // her drawing of the programme: right, or with the midpoint or the length wrong
  const u = GRID, len = o === 'len' ? L + 2 : L, mid = o === 'mid' ? len / 2 + 1 : len / 2, x0 = u, y = 2 * u;
  return SV((L + 4) * u, 4 * u, pen(x0, y, x0 + len * u, y) + endCross(x0, y) + endCross(x0 + len * u, y)
    + `<circle cx="${x0 + mid * u}" cy="${y}" r="5" fill="#D9393F"/>` + label(x0 + mid * u, y - 12, 'م') + label(x0 + len * u, y + 26, 'أ') + label(x0, y + 26, 'ب'));
}
function svgProgSq(s, o) {   // a square of s cm on the squared paper (or a rectangle, or no midpoint marked)
  const u = GRID, w = (o === 'rect' ? s + 2 : s) * u, h = s * u, x0 = u, y0 = u;
  const mid = o === 'nomid' ? '' : `<circle cx="${x0 + w / 2}" cy="${y0 + h}" r="5" fill="#D9393F"/>`;
  return SV(w + 2 * u, h + 2 * u, pen(x0, y0, x0 + w, y0) + pen(x0 + w, y0, x0 + w, y0 + h) + pen(x0 + w, y0 + h, x0, y0 + h) + pen(x0, y0 + h, x0, y0) + mid);
}
function svgNet(cells) {
  const u = 26, W = (Math.max(...cells.map(c => c[0])) + 1) * u, H = (Math.max(...cells.map(c => c[1])) + 1) * u;
  return SV(W + 8, H + 8, cells.map(([x, y]) => `<rect x="${4 + x * u}" y="${4 + y * u}" width="${u}" height="${u}" fill="#D3F2DF" stroke="#0B5530" stroke-width="2.5"/>`).join(''));
}

/* ---------- a round: eight items of one topic, at her level in it ---------- */
function round(topicId, level, seed, n = 8) {
  const t = TOPICS.find(x => x.id === topicId), rnd = rng(seed);
  return Array.from({ length: n }, () => t.gen(rnd, level));
}
// her progress in the corner: {topic: {rounds, best, right, total, level, last}}; a round with 7 of 8 or more moves her level up
function cleanCorner(o) { return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; }
function addRound(c, topicId, right, total, day) {
  const x = c[topicId] || (c[topicId] = { rounds: 0, best: 0, right: 0, total: 0, level: 1, last: null });
  x.rounds++; x.right += right; x.total += total; x.best = Math.max(x.best, right); x.last = day;
  if (!Array.isArray(x.good)) x.good = [];
  if (right >= total - 1 && !x.good.includes(day)) x.good.push(day);
  const up = right >= total - 1 && x.level < 3;
  if (up) x.level++;
  return { up, level: x.level };
}
// the digits she writes in a column sum, right to left: {c, d} and, for multiplication, the carry written above the next
// column; for «الطرح بالإضافة», borrow (ten added to the top digit) and add (one added to the bottom digit)
function colSteps(a, b, op) {
  const A = String(a).split('').reverse().map(Number), B = String(b).split('').reverse().map(Number), steps = [];
  if (op === 'mul') {
    let carry = 0;
    for (let c = 0; c < A.length; c++) { const p = A[c] * b + carry; steps.push({ c, d: p % 10, carryNext: Math.floor(p / 10) }); carry = Math.floor(p / 10); }
    for (let c = A.length; carry; c++) { steps.push({ c, d: carry % 10, carryNext: 0, last: true }); carry = Math.floor(carry / 10); }
  } else {
    let add = 0;
    for (let c = 0; c < A.length; c++) {
      const bot = (B[c] || 0) + add, low = A[c] < bot;
      steps.push({ c, d: (low ? A[c] + 10 : A[c]) - bot, borrow: low, add });
      add = low ? 1 : 0;
    }
    while (steps.length > 1 && steps[steps.length - 1].d === 0) steps.pop();   // no zero in front
  }
  return steps;
}
// one by one (her request, 23 Oct 2026): the topics open in order; the next opens when the one before is mastered (two good
// rounds on two different days, the trip's own rule). A topic the trip has reached is open too, and Mama can open them all.
const mastered = (c, id) => !!(c[id] && Array.isArray(c[id].good) && c[id].good.length >= 2);
function openTopics(c, trip = [], all = false) {
  if (all) return TOPICS.map(t => t.id);
  const out = [];
  TOPICS.forEach((t, i) => { if (i === 0 || mastered(c, TOPICS[i - 1].id) || trip.includes(t.id) || (c[t.id] && c[t.id].rounds)) out.push(t.id); });
  return out;
}
const core = { TOPICS, round, addRound, mastered, openTopics, cleanCorner, cubeNet, NET_BAD, colSteps, rng, seedOf, AR };

/* =====================================================================================================
   The screens. ctx from algeria.js: api, state() (the trip's progress), save(), back() (the trip's home), say(id).
   ===================================================================================================== */
function mount(ctx) {
  const { api } = ctx, $ = (s, el = document) => el.querySelector(s);
  const corner = () => { const r = ctx.state(); r.corner = cleanCorner(r.corner); return r.corner; };
  document.body.insertAdjacentHTML('beforeend', `<section id="dzmc" class="screen dz dz-mc" dir="rtl" lang="ar" hidden></section>`);
  const el = $('#dzmc');
  let S = null;
  const live = s => S === s;
  const stars = x => (!x ? '' : '⭐'.repeat(x.level - 1) + (x.level < 3 ? '☆'.repeat(3 - x.level) : ''));

  const lessonsLeft = n => (n === 1 ? 'درسٌ واحد ينتظركِ' : n === 2 ? 'درسان ينتظرانكِ' : n <= 10 ? `${AR(n)} دروس تنتظركِ` : `${AR(n)} درسًا ينتظركِ`);
  const rounds = n => `${AR(n)} ${n === 1 ? 'جولة' : n === 2 ? 'جولتان' : n <= 10 ? 'جولات' : 'جولة'}`;
  function open() {
    S = null;
    const c = corner(), ids = openTopics(c, ctx.tripTopics ? ctx.tripTopics() : [], !!ctx.allOpen && ctx.allOpen());
    const shown = TOPICS.filter(t => ids.includes(t.id)), now = shown.find(t => !mastered(c, t.id));
    const tile = (t, big) => { const x = c[t.id], i = TOPICS.indexOf(t), done = mastered(c, t.id);
      return `<button class="mc-tile${big ? ' now' : ''}${done ? ' done' : ''}" data-t="${t.id}"><span class="mc-n">${AR(i + 1)}</span>${done ? '<span class="mc-done">✓</span>' : ''}${pic(t)}<b>${esc(t.title)}</b>
        <small>${x ? `${stars(x)} · ${rounds(x.rounds)}` : 'درسكِ الجديد'}</small>${big ? '<span class="mc-go">ابدئي ←</span>' : ''}</button>`; };
    const left = TOPICS.length - shown.length;
    el.innerHTML = `<div class="dz-top"><button class="quit" id="mcQuit" aria-label="رحلتي"><svg aria-hidden="true"><use href="#i-close"/></svg></button><h1 class="dz-ptitle">🧮 ركن الرياضيات</h1></div>
      <p class="mc-sub">درسٌ بعد درس: إذا أتقنتِ الدرس (٧ من ٨ في يومين مختلفين) فُتح الدرسُ التالي.</p>
      ${now ? `<div class="mc-nowrow">${tile(now, true)}</div>` : ''}
      ${shown.filter(t => t !== now).length ? `<h2 class="mc-h">دروسي</h2><div class="mc-grid">${shown.filter(t => t !== now).map(t => tile(t, false)).join('')}</div>` : ''}
      ${left ? `<p class="mc-left">🔒 ${lessonsLeft(left)}</p>` : '<p class="mc-left">🌟 فتحتِ كلَّ الدروس!</p>'}`;
    $('#mcQuit').onclick = () => { api.SFX.init(); ctx.back(); };
    el.querySelectorAll('.mc-tile').forEach(b => { b.onclick = () => { api.SFX.init(); lesson(b.dataset.t); }; });
    api.show('dzmc');
  }
  function lesson(id) {
    const t = TOPICS.find(x => x.id === id), x = corner()[id];
    el.innerHTML = `<div class="dz-top"><button class="quit" id="mcBack" aria-label="الركن"><svg aria-hidden="true"><use href="#i-close"/></svg></button><h1 class="dz-ptitle">${pic(t, 'mc-pic-h')} ${esc(t.title)}</h1></div>
      <div class="dz-pane"><div class="dz-rule mc-lesson"><h3>تعلّمتُ</h3>${t.lesson.rule.map(l => `<p>${esc(l)}</p>`).join('')}
        ${t.lesson.ex.length ? `<h3>مثال</h3>${t.lesson.ex.map(l => `<p class="mc-ex">${esc(l)}</p>`).join('')}` : ''}
        ${id === 'tools' ? `<div class="mc-tools">${['ruler', 'square', 'compass'].map(k => `<span class="mc-svgopt">${svgTool(k)}</span>`).join('')}</div>` : ''}
        ${id === 'net' ? `<div class="mc-tools"><span class="mc-svgopt">${paperImg('net_cross')}<b>منشور مكعب ✓</b></span></div>` : ''}
        ${id === 'lines' ? `<div class="mc-tools"><span class="mc-svgopt">${paperImg('par')}<b>متوازيان</b></span><span class="mc-svgopt">${paperImg('perp')}<b>متعامدان</b></span></div>` : ''}
        ${id === 'midpoint' ? `<div class="mc-tools"><span class="mc-svgopt">${paperImg('seg_mid')}<b>المنتصف</b></span></div>` : ''}</div>
        <p class="mc-lv">مستواكِ في هذا الدرس: ${AR(x ? x.level : 1)} من ٣</p>
        <div class="dz-row"><button class="dz-big" id="mcGo">ابدئي التدريب ✏️</button></div></div>`;
    $('#mcBack').onclick = () => { api.SFX.init(); open(); };
    $('#mcGo').onclick = () => { api.SFX.init(); play(id); };
    api.show('dzmc');
  }
  async function play(id) {
    const t = TOPICS.find(x => x.id === id), lv = (corner()[id] || { level: 1 }).level;
    const s = S = { id, right: 0 }, items = round(id, lv, seedOf(Date.now() + id));
    for (let i = 0; i < items.length && live(s); i++) {
      const ok = await item(s, t, items[i], i, items.length);
      if (ok) s.right++;
    }
    if (!live(s)) return;
    const res = addRound(corner(), id, s.right, items.length, api.today()); ctx.save();
    el.innerHTML = `<div class="dz-top"><span></span><h1 class="dz-ptitle">${pic(t, 'mc-pic-h')} ${esc(t.title)}</h1></div><div class="dz-pane"><div class="dz-result ok"><span class="dz-reic">${s.right >= 7 ? '🌟' : '✓'}</span>
      <p>${AR(s.right)} من ${AR(items.length)}${res.up ? '<br>مستوى جديد! 🎉' : ''}</p></div>
      <div class="dz-row"><button class="dz-btn soft" id="mcList">إلى الركن</button><button class="dz-big" id="mcAgain">جولة أخرى ✏️</button></div></div>`;
    if (s.right >= 7) api.SFX.good();
    $('#mcList').onclick = () => { api.SFX.init(); open(); };
    $('#mcAgain').onclick = () => { api.SFX.init(); play(id); };
  }

  /* ---------- one item; resolves true if right at the first try. Her rule: «التالي» after every answer ---------- */
  function frame(t, i, n, body) {
    el.innerHTML = `<div class="dz-top"><button class="quit" id="mcStop" aria-label="الركن"><svg aria-hidden="true"><use href="#i-close"/></svg></button><h1 class="dz-ptitle sm">${pic(t, 'mc-pic-h')} ${esc(t.title)}</h1><p class="dz-count">${AR(i + 1)} من ${AR(n)}</p></div>
      <div class="dz-pane mc-item">${body}<div class="dz-fb" id="mcFb"></div><div class="dz-row dz-nextrow" id="mcNextRow"></div></div>`;
    $('#mcStop').onclick = () => { api.SFX.init(); S = null; open(); };
  }
  const nextTap = () => new Promise(ok => { $('#mcNextRow').innerHTML = '<button class="dz-big" id="mcNext">التالي</button>'; $('#mcNext').onclick = () => { api.SFX.init(); ok(); }; });
  const pad = () => `<div class="mc-pad" dir="ltr">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button data-d="${d}">${AR(d)}</button>`).join('')}<button data-d="del" class="del">⌫</button><button data-d="0">${AR(0)}</button><button data-d="ok" class="ok">✓</button></div>`;
  async function item(s, t, it, i, n) {
    if (it.k === 'mc') return mcItem(s, t, it, i, n);
    if (it.k === 'pad') return multiItem(s, t, { q: it.q.replace('؟', '{0}'), blanks: [it.ans], unit: it.unit }, i, n);
    if (it.k === 'multi') return multiItem(s, t, it, i, n);
    if (it.k === 'mulcol') return colItem(s, t, it, i, n, 'mul');
    return colItem(s, t, it, i, n, 'sub');
  }
  function mcItem(s, t, it, i, n) {
    const optHTML = (o, j) => `<button class="dz-opt mc-o ${it.show === 'svg' ? 'svg' : it.show === 'num' ? 'n' : ''}" data-i="${j}">${it.show === 'svg' ? o : `<span class="${it.show === 'num' ? 'dz-n' : ''}" ${it.show === 'num' ? 'dir="ltr"' : ''}>${esc(o)}</span>`}</button>`;
    frame(t, i, n, `<p class="dz-q mc-q">${esc(it.q)}</p>${it.pic ? `<div class="mc-pic">${it.pic}</div>` : ''}<div class="dz-opts ${it.show === 'svg' || it.opts.length <= 3 && it.show !== undefined ? 'three' : ''}" id="mcOpts">${it.opts.map(optHTML).join('')}</div>`);
    return new Promise(done => {
      let tries = 0;
      $('#mcOpts').onclick = async e => {
        const b = e.target.closest('[data-i]'); if (!b || b.disabled || !live(s)) return;
        api.SFX.init(); tries++;
        const right = Number(b.dataset.i) === it.ok;
        if (right) { b.classList.add('yes'); api.SFX.good(); $('#mcFb').textContent = 'أحسنتِ!'; }
        else { b.classList.add('no'); b.disabled = true; $('#mcFb').textContent = tries < 2 ? 'فكّري مرّةً أخرى.' : 'انظري إلى الجواب.'; if (tries < 2) return; }
        el.querySelectorAll('#mcOpts button').forEach(x => { x.disabled = true; if (Number(x.dataset.i) === it.ok) x.classList.add('yes'); });
        $('#mcOpts').onclick = null;
        await nextTap(); done(right && tries === 1);
      };
    });
  }
  // blanks filled in turn on the keypad: «{0}» in the question shows where each answer goes
  function multiItem(s, t, it, i, n) {
    const parts = it.q.split('\n').map(line => esc(line).replace(/\{(\d)\}/g, (_, k) => `<span class="mc-blank" data-b="${k}">؟</span>`));
    const col = it.col ? `<div class="mc-col" dir="ltr"><span></span><span>${AR(it.col[0])}</span><span>×</span><span>${AR(it.col[1])}</span></div>` : '';
    frame(t, i, n, `<div class="mc-qlines">${parts.map(p => `<p class="dz-q mc-q">${p}</p>`).join('')}</div>${col}<div class="mc-ans" dir="ltr"><span id="mcIn"></span>${it.unit ? `<small>${esc(it.unit)}</small>` : ''}</div>${pad()}`);
    return new Promise(done => {
      let k = 0, typed = '', tries = 0, clean = true;
      const mark = () => el.querySelectorAll('.mc-blank').forEach(b => b.classList.toggle('cur', Number(b.dataset.b) === k && !b.classList.contains('done')));
      const show = () => { $('#mcIn').textContent = typed ? AR(typed) : ' '; };
      mark(); show();
      el.querySelector('.mc-pad').onclick = async e => {
        const b = e.target.closest('[data-d]'); if (!b || !live(s)) return;
        api.SFX.init();
        const d = b.dataset.d;
        if (d === 'del') { typed = typed.slice(0, -1); return show(); }
        if (d !== 'ok') { if (typed.length < 7) typed += d; return show(); }
        if (!typed) return;
        const want = it.blanks[k];
        if (Number(typed) === want) {
          el.querySelectorAll(`.mc-blank[data-b="${k}"]`).forEach(x => { x.textContent = AR(want); x.classList.add('done'); });
          api.SFX.good(); typed = ''; tries = 0; k++; show();
          if (k < it.blanks.length) { $('#mcFb').textContent = 'أحسنتِ! والآن التالي.'; mark(); return; }
          $('#mcFb').textContent = 'أحسنتِ!';
        } else {
          tries++; clean = false; typed = ''; show();
          if (tries < 2) { $('#mcFb').textContent = 'فكّري مرّةً أخرى.'; return; }
          el.querySelectorAll(`.mc-blank[data-b="${k}"]`).forEach(x => { x.textContent = AR(want); x.classList.add('done', 'shown'); });
          tries = 0; k++;
          if (k < it.blanks.length) { $('#mcFb').textContent = 'انظري إلى الجواب، ثمّ أكملي.'; mark(); return; }
          $('#mcFb').textContent = 'انظري إلى الجواب.';
        }
        el.querySelector('.mc-pad').onclick = null; el.querySelector('.mc-pad').classList.add('off');
        await nextTap(); done(clean);
      };
    });
  }
  /* the column: vertical multiplication by one digit (the carry is written above the next column), or «الطرح بالإضافة»
     (when the top digit is smaller: ١ before it makes it ten more, and +١ goes under the next digit below) */
  function colItem(s, t, it, i, n, op) {
    const a = it.a, b = it.b, A = String(a).split('').reverse().map(Number), B = String(b).split('').reverse().map(Number);
    const res = op === 'mul' ? a * b : a - b, R = String(res).split('').reverse().map(Number);
    const W = Math.max(A.length, op === 'mul' ? R.length : A.length);
    const cols = W + 1;   // one spare column on the left for the sign
    const cell = (row, c, txt = '', cls = '') => `<span class="mc-c ${cls}" data-r="${row}" data-c="${c}">${txt}</span>`;
    let html = '<div class="mc-grid-col" dir="ltr" style="grid-template-columns:repeat(' + cols + ', var(--cw))">';
    for (let c = W; c >= 0; c--) html += cell('carry', c, '', 'carry');
    for (let c = W; c >= 0; c--) html += cell('a', c, c < A.length ? AR(A[c]) : '');
    for (let c = W; c >= 0; c--) html += cell('b', c, c === W ? (op === 'mul' ? '×' : '−') : op === 'mul' ? (c === 0 ? AR(b) : '') : c < B.length ? AR(B[c]) : '', c === W ? 'sign' : '');
    for (let c = W; c >= 0; c--) html += cell('plus', c, '', 'plus');
    html += `<span class="mc-line" style="grid-column:1 / span ${cols}"></span>`;
    const steps = colSteps(a, b, op);   // the digits she writes, right to left (no box for a zero in front)
    for (let c = W; c >= 0; c--) html += cell('res', c, '', c < steps.length ? 'in' : '');
    html += '</div>';
    const hint = op === 'mul' ? 'ابدئي من الآحاد (يمين). اكتبي رقمًا رقمًا.' : 'ابدئي من الآحاد (يمين). إذا كان الرقمُ في الأعلى أصغر: نضيفُ ١٠ في الأعلى، و١ في الأسفل في المنزلة التالية.';
    frame(t, i, n, `<p class="dz-q mc-q">${AR(a)} ${op === 'mul' ? '×' : '−'} ${AR(b)} = ؟</p><p class="mc-hint">${hint}</p>${html}${pad()}`);
    const get = (row, c) => el.querySelector(`.mc-c[data-r="${row}"][data-c="${c}"]`);
    return new Promise(done => {
      let k = 0, tries = 0, clean = true;
      const mark = () => { el.querySelectorAll('.mc-c.cur').forEach(x => x.classList.remove('cur')); if (k < steps.length) get('res', steps[k].c).classList.add('cur'); };
      const before = () => {   // what is written before she writes this column's digit
        const st = steps[k]; if (!st || op !== 'sub') return;
        if (st.add) { const p = get('plus', st.c); p.textContent = '+' + AR(1); p.classList.add('on'); }
        if (st.borrow) { const x = get('a', st.c); x.innerHTML = `<i class="ten">${AR(1)}</i>${AR(A[st.c])}`; x.classList.add('tenned'); }
      };
      before(); mark();
      el.querySelector('.mc-pad').onclick = async e => {
        const btn = e.target.closest('[data-d]'); if (!btn || !live(s) || k >= steps.length) return;
        api.SFX.init();
        const d = btn.dataset.d; if (d === 'del' || d === 'ok') return;
        const st = steps[k], right = Number(d) === st.d;
        if (!right) {
          tries++; clean = false;
          if (tries < 2) { $('#mcFb').textContent = 'فكّري مرّةً أخرى.'; get('res', st.c).classList.add('shake'); setTimeout(() => get('res', st.c).classList.remove('shake'), 400); return; }
        }
        get('res', st.c).textContent = AR(st.d); get('res', st.c).classList.add(right ? 'done' : 'shown');
        $('#mcFb').textContent = right ? 'أحسنتِ!' : 'انظري إلى الرقم الصحيح.';
        if (op === 'mul' && st.carryNext) { const x = get('carry', st.c + 1); if (x && !st.last) { x.textContent = AR(st.carryNext); x.classList.add('on'); } }
        tries = 0; k++;
        if (right) api.SFX.good();
        if (k < steps.length) { before(); mark(); return; }
        mark(); el.querySelector('.mc-pad').onclick = null; el.querySelector('.mc-pad').classList.add('off');
        $('#mcFb').textContent = clean ? `أحسنتِ! ${AR(a)} ${op === 'mul' ? '×' : '−'} ${AR(b)} = ${AR(res)}` : `${AR(a)} ${op === 'mul' ? '×' : '−'} ${AR(b)} = ${AR(res)}`;
        await nextTap(); done(clean);
      };
    });
  }
  return { open, isOn: () => !el.hidden, busy: () => !!S, leave: () => { S = null; } };
}

root.AlgeriaMaths = { core, mount };
if (typeof module !== 'undefined') module.exports = { core };
})(typeof window !== 'undefined' ? window : globalThis);
