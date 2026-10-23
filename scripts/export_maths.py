"""Build Times Table Cards (بطاقات جدول الضرب), the shareable times tables, from this folder: the same maths.js and sticker
book as Maria's app, with nothing of Maria's in it.

Usage: python3 scripts/export_maths.py [TARGET]   (default ~/Downloads/06_Projects_and_Code/times-table-cards)
It reads the last commit (git HEAD), never work in progress, so commit Maria's app first.
Then commit and push TARGET; it is published at https://asmaasma1111.github.io/times-table-cards/.

What is different from Maria's app:
- The first page asks the child's name and whether the child is a boy or a girl. The Arabic then speaks to a boy
  (ابدأ، أحسنت) or a girl (ابدئي، أحسنتِ): every child-facing file is built twice, maths-boy.js and maths-girl.js.
- The digits are 0 to 9 (1, 2, 3), not ١، ٢، ٣.
- No science garden. The reward is the sticker book, in Arabic: one sticker for every 2 days in a row on which the
  child reaches the daily goal (5 minutes by default). Two separate sections: a girl's book (pink, Maria's stickers
  and Star Friends plus more) and a boy's book (blue, its own stickers, squishies and Star Friends). The extra
  stickers live in TARGET/stickers/boy and /girl, made by TARGET/tools/make_stickers.py (stickers/extra.json).
- "Created by Dr Asma Khattala" at the bottom links to her LinkedIn page.
- Every app on asmaasma1111.github.io shares one origin, so this one keeps its progress under its own keys (tt:...;
  Maria's are tc:...) and its own service-worker caches ('times-table-cards-...'). Opened on Maria's iPad, it can
  never read or overwrite her progress, and her app never deletes its files.
"""
import hashlib, io, json, os, re, shutil, subprocess, sys

SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else '~/Downloads/06_Projects_and_Code/times-table-cards')
URL = 'https://asmaasma1111.github.io/times-table-cards/'
LINKEDIN = 'https://www.linkedin.com/in/dr-asma-khattala/'
CACHE = 'times-table-cards-'
PAPER = '#FFF7EF'                                   # the times tables' paper colour (.mx in style.css)
FONTS = ['andika-400', 'andika-700', 'noto-naskh-arabic', 'tajawal-500', 'tajawal-800']
WHO = ('girl', 'boy')


def git(path):
    """A file as it is in the last commit."""
    r = subprocess.run(['git', '-C', SRC, 'show', f'HEAD:{path}'], capture_output=True)
    if r.returncode:
        raise SystemExit(f'{path} is not in the last commit of {SRC}')
    return r.stdout


def text(path):
    return git(path).decode('utf-8')


def patch(name, s, subs):
    for old, new in subs:
        if old not in s:
            raise SystemExit(f'{name} changed, update export_maths.py: {old[:70]!r}')
        s = s.replace(old, new)
    return s


def resub(name, s, pattern, new):
    s, n = re.subn(pattern, lambda _: new, s, count=1, flags=re.S | re.M)
    if not n:
        raise SystemExit(f'{name} changed, update export_maths.py: {pattern[:60]!r}')
    return s


def block(src, start):
    """A top-level definition copied whole from app.js: from the line matching `start` to its closing line in column 0."""
    lines = src.split('\n')
    i = next((k for k, l in enumerate(lines) if re.match(start, l)), None)
    if i is None:
        raise SystemExit(f'app.js changed, update export_maths.py: {start!r}')
    j = i
    if lines[i].count('{') != lines[i].count('}'):
        j = next(k for k in range(i + 1, len(lines)) if re.match(r'\}', lines[k]))
    return '\n'.join(lines[i:j + 1])


shipped = {}
def write(path, data):
    data = data.encode('utf-8') if isinstance(data, str) else data
    full = os.path.join(DST, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'wb') as f:
        f.write(data)
    shipped[path] = data


os.makedirs(DST, exist_ok=True)
for d in ('audio', 'fonts', 'stickers/friends'):
    shutil.rmtree(os.path.join(DST, d), ignore_errors=True)

# ======================= maths.js: the cards =======================
maths = text('maths.js')
maths = resub('maths.js', maths, r'\A/\*.*?\*/', """/* جدول الضرب: the times tables (Times Table Cards).
   Loaded by tt.js, which calls TimesTables.mount(api). Progress has its own key, 'tt:math'.
   The scheduler (TimesTables.core) has no DOM code, so it can be tested in Node. */""")
maths = resub('maths.js', maths, r"^  // the way in, on the English Home screen\n.*?^  \$\('#home'\)\.append\(chip\);\n", '')
maths = patch('maths.js', maths, [
    ("const KEY = 'tc:maria:math';", "const KEY = 'tt:math';"),
    # the digits 0 to 9, not ٠ to ٩ (answers can still be typed or said either way)
    ("const toAr = v => String(v).replace(/[0-9]/g, d => AR_DIGITS[d]);", "const toAr = v => String(v);   // this app writes 1, 2, 3 (not ١، ٢، ٣)"),
    ('style="grid-area:k0">٠</button>', 'style="grid-area:k0">0</button>'),
    # Home: no deck chip, a greeting with the child's name, the credit links to LinkedIn
    ('  <button class="deck-chip deck-talk" id="mxToTalk" lang="en" dir="ltr">Talk Cards</button>\n', ''),
    ('<h1 class="mx-title"><span class="mx-logo" aria-hidden="true">×</span>جدول الضرب</h1>',
     '<h1 class="mx-title"><span class="mx-logo" aria-hidden="true">×</span>جدول الضرب</h1>\n  <div class="tt-hello" id="ttHello"></div>'),
    ('<div class="app-foot maria-only" lang="en" dir="ltr">', '<div class="app-foot" lang="en" dir="ltr">'),
    ('<div class="credit">Designed by Dr Asma Khattala</div>',
     f'<a class="credit" href="{LINKEDIN}" target="_blank" rel="noopener">Created by Dr Asma Khattala</a>'),
    ("    document.body.dataset.profile = 'maria';\n", ''),
    ("the sum read aloud (Maria's request):", 'the sum read aloud:'),
    ("Reduce Motion is on: her mother asked for it as Maria's sign that she was right.", 'Reduce Motion is on: it is the sign of a right answer.'),
    ("  chip.addEventListener('click', home);\n", ''),
    ("  $('#mxToTalk').addEventListener('click', () => { stopRound(); api.english(); });\n", ''),
    # the sticker book (tt.js) hears when Home or Done opens
    ('if (garden) garden.homeCard();', 'if (garden) garden.homeCard(); if (api.onHome) api.onHome();'),
    ('if (garden) garden.afterRound(done.starsAt);', 'if (garden) garden.afterRound(done.starsAt); if (api.onDone) api.onDone();'),
    # the parent area: the child and the sticker book (from tt.js); there are no English cards here
    ('<h2 class="mx-h2">Settings</h2>', "${api.parentRows ? api.parentRows() : ''}<h2 class=\"mx-h2\">Settings</h2>"),
    ('<span class="sub">Shared with the English cards</span>', ''),
    ("'The first set opens with her first session'", "'The first set opens with the first session'"),
    ('Right to left is how her school book writes it', 'Right to left is how Arabic school books write it'),
    ('One file holds the English cards and the times tables', 'One file holds the cards, the name and the sticker book'),
    ('<span class="sub">The English cards are not touched</span>', '<span class="sub">The name and the sticker book are kept</span>'),
    (' and stickers start again. The English cards are not touched.', ' and the table stickers start again. The name and the sticker book are kept.'),
])
MASC_MATHS = [                                      # the girl's words -> the boy's
    ('ابدئي', 'ابدأ'), ('اقرئي السؤال بصوت', 'اقرأ السؤال بصوت'), ('aria-label="امسحي"', 'aria-label="امسح"'),
    ('قولي الجواب', 'قل الجواب'), ('قولي الرقم', 'قل الرقم'), ('تذكّري', 'تذكّر'), ('صحّحتِها!', 'صحّحتها!'),
    ("'سريعة!'", "'سريع!'"), ('أحسنتِ', 'أحسنت'), ('وصلتِ', 'وصلت'), ('أتقنتِ', 'أتقنت'), ('أسمعكِ', 'أسمعك'),
    ('اضغطي', 'اضغط'), ('لتستعملي', 'لتستعمل'), ('حاولي', 'حاول'),
]

# ======================= stickerbook.js: the reward, in Arabic =======================
sb = text('stickerbook.js')
sb = resub('stickerbook.js', sb, r'\A/\*.*?\*/', """/* كتاب الملصقات: one sticker for every 2 days in a row on which the child reaches the daily goal (a parent can change
   the 2), and every 7th reward a big Star Friend instead, who dances on a page of its own.
   Loaded by tt.js, which calls StickerBook.mount(api). A girl's book and a boy's book have their own stickers
   (stickers/girl.json, stickers/boy.json); the collected stickers are kept under 'tt:stickers'. */""")
sb = patch('stickerbook.js', sb, [
    ("(Maria's settings.stickerDays; it was 7 until 13 Oct 2026)", '(a parent can change it)'),
    ("const countLine = (n, one, many) => `You have <em>${n}</em> ${n === 1 ? one : many} now!`;   // the number in a big pink bubble",
     "const countLine = (n, one, many) => `معكِ الآن <em>${n}</em> ${arN(n, one, many)}!`;   // the number in a big bubble"),
    ("countLine(nStickers(last), 'sticker', 'stickers')", "countLine(nStickers(last), 'ملصق', 'ملصقات')"),
    ("countLine(nFriends(i), 'Star Friend', 'Star Friends')", "countLine(nFriends(i), 'صديق', 'أصدقاء')"),
    ("return k === 0 ? 'Your next reward is a Star Friend!' : `${k} more sticker${k === 1 ? '' : 's'} to your next Star Friend`;",
     "return k === 0 ? 'جائزتكِ القادمة صديق من أصدقاء النجوم!' : `بعد ${k} ${arN(k, 'ملصق', 'ملصقات')} يأتي صديق من أصدقاء النجوم`;"),
    ("  const src = m => 'stickers/' + m.file;\n",
     "  const src = m => 'stickers/' + m.file;\n  const nm = m => m.ar || m.name;                                // the Arabic name\n"
     "  const arN = (n, one, many) => (n >= 3 && n <= 10 ? many : one);   // ٣ ملصقات، ١١ ملصق\n"),
    ('<section id="sbook" class="screen sb-screen" hidden>', '<section id="sbook" class="screen sb-screen" dir="rtl" lang="ar" hidden>'),
    ('aria-label="Close the sticker book"', 'aria-label="إغلاق كتاب الملصقات"'),
    ('<span>Stickers</span>', '<span>الملصقات</span>'), ('<span>Star Friends</span>', '<span>أصدقاء النجوم</span>'),
    ('<span id="sbH1">Maria\'s Sticker Book</span>', '<span id="sbH1">كتاب ملصقاتي</span>'),
    ('<h2 id="sbSub">One sticker for every 2 days in a row</h2>', '<h2 id="sbSub"></h2>'),
    ('<button id="sbPrev" aria-label="Previous page">‹</button>', '<button id="sbPrev" aria-label="الصفحة السابقة">›</button>'),
    ('<button id="sbNext" aria-label="Next page">›</button>', '<button id="sbNext" aria-label="الصفحة التالية">‹</button>'),
    ('<section id="sbAward" class="overlay sb-award" hidden>', '<section id="sbAward" class="overlay sb-award" dir="rtl" lang="ar" hidden>'),
    ('<div class="sb-kicker" id="sbKicker">2 days in a row!</div>', '<div class="sb-kicker" id="sbKicker"></div>'),
    ('<button id="sbStick" class="btn btn-good">Stick it in my book</button>', '<button id="sbStick" class="btn btn-good">ألصقيه في كتابي</button>'),
    ('<section id="sfAward" class="overlay sf-award" hidden>', '<section id="sfAward" class="overlay sf-award" dir="rtl" lang="ar" hidden>'),
    ('<div class="sb-kicker sf-kicker">2 weeks of practice!</div>', '<div class="sb-kicker sf-kicker">أسبوعان من التدرّب!</div>'),
    ('<button id="sfPut" class="btn btn-good">Put her in my book</button>', '<button id="sfPut" class="btn btn-good">ضعيها في كتابي</button>'),
    # the way in: a card on the times-tables Home
    ('  // the way in, on the English Home screen\n', '  // the way in: a card on the times-tables Home\n'),
    ("card.className = 'sb-card maria-only';", "card.className = 'sb-card';"), ('<b>My Sticker Book</b>', '<b>كتاب ملصقاتي</b>'),
    ("$('#home .daily').after(card);", "$('#mxNow').after(card);"),
    ("$('#sbLeft').textContent = justGot ? 'A new sticker today!' : `${plural(left, 'more day')} to the next sticker`;",
     "$('#sbLeft').textContent = justGot ? 'ملصق جديد اليوم!' : `${left === 1 ? 'يوم واحد' : left === 2 ? 'يومان' : left + ' أيام'} للملصق القادم`;"),
    ("`<b>${nStickers()}</b> sticker${nStickers() === 1 ? '' : 's'}${f || FRIENDS.length ? ` · <b>${f}</b> Star Friend${f === 1 ? '' : 's'}` : ''}`",
     "`<b>${nStickers()}</b> ${arN(nStickers(), 'ملصق', 'ملصقات')}${f || FRIENDS.length ? ` · <b>${f}</b> ${arN(f, 'صديق', 'أصدقاء')}` : ''}`"),
    ("`My Sticker Book: ${plural(nStickers(), 'sticker')}, ${plural(f, 'Star Friend')}. ${$('#sbLeft').textContent}`",
     "`كتاب ملصقاتي: ${nStickers()} ${arN(nStickers(), 'ملصق', 'ملصقات')}. ${$('#sbLeft').textContent}`"),
    # the book
    ("$('#sbH1').textContent = \"Maria's Sticker Book\";", "$('#sbH1').textContent = api.name && api.name() ? `كتاب ملصقات ${api.name()}` : 'كتاب ملصقاتي';"),
    ("$('#sbSub').textContent = `One sticker for every ${PER} days in a row`;",
     "$('#sbSub').textContent = `ملصق ${PER === 1 ? 'لكلّ يوم' : PER === 2 ? 'لكلّ يومين متتاليين' : `لكلّ ${PER} أيام متتالية`} من هدف اليوم`;"),
    ("lbl.textContent = `${p} of ${PER} days`;", "lbl.textContent = `${p} من ${PER}`;"),
    ("`Page ${page + 1}`", "`صفحة ${page + 1}`"),
    ("$('#sbH1').textContent = 'My Star Friends';", "$('#sbH1').textContent = 'أصدقاء النجوم';"),
    ("$('#sbSub').textContent = 'A big friend for every 2 weeks';", "$('#sbSub').textContent = 'صديق كبير كلّ أسبوعين تقريباً';"),
    ('<div class="sf-no">Star Friend ${k + 1}</div>', '<div class="sf-no">الصديق ${k + 1}</div>'),
    ("${left === 0 ? 'Next reward!' : `${left} more sticker${left === 1 ? '' : 's'}`}", "${left === 0 ? 'الجائزة القادمة!' : `بعد ${left} ${arN(left, 'ملصق', 'ملصقات')}`}"),
    # a new sticker, a new Star Friend
    ("$('#sbKicker').textContent = 'Look what you earned!';", "$('#sbKicker').textContent = 'انظري ماذا ربحتِ!';"),
    ("$('#sbTitle').textContent = `${list.length} new stickers!`;", "$('#sbTitle').textContent = `${list.length} ${arN(list.length, 'ملصقاً جديداً', 'ملصقات جديدة')}!`;"),
    ("$('#sbStick').textContent = 'Stick them in my book';", "$('#sbStick').textContent = 'ألصقيها في كتابي';"),
    ("$('#sbKicker').textContent = `${PER} days in a row!`;", "$('#sbKicker').textContent = PER === 1 ? 'هدف اليوم!' : PER === 2 ? 'يومان متتاليان!' : `${PER} أيام متتالية!`;"),
    ("$('#sbTitle').textContent = `A new sticker: ${m.name}!`;", "$('#sbTitle').textContent = `ملصق جديد: ${nm(m)}!`;"),
    ("'SMTWTFS'[new Date(y, mo - 1, dd).getDay()]", "['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'][new Date(y, mo - 1, dd).getDay()]"),
    ("$('#sbStick').textContent = 'Stick it in my book';", "$('#sbStick').textContent = 'ألصقيه في كتابي';"),
    ("$('#sfTitle').textContent = `A big Star Friend: ${m.name}!`;", "$('#sfTitle').textContent = `صديق كبير جديد: ${nm(m)}!`;"),
    # right to left: the next page is on the left, a swipe to the right turns forward
    ("transform: `translateX(${d * 30}px)`", "transform: `translateX(${-d * 30}px)`"),
    ("if (dx < 0 && !$('#sbNext').disabled) turn(1); else if (dx > 0 && !$('#sbPrev').disabled) turn(-1);",
     "if (dx > 0 && !$('#sbNext').disabled) turn(1); else if (dx < 0 && !$('#sbPrev').disabled) turn(-1);"),
    ("fetch('stickers/stickers.json')", "fetch('stickers/girl.json')"),
])
sb = sb.replace('m.name', 'nm(m)').replace('const nm = m => m.ar || nm(m);', 'const nm = m => m.ar || m.name;')
MASC_SB = [
    ('معكِ', 'معك'), ('جائزتكِ', 'جائزتك'), ('ألصقيها', 'ألصقها'), ('ألصقيه', 'ألصقه'), ('ضعيها في كتابي', 'ضعه في كتابي'),
    ('انظري ماذا ربحتِ!', 'انظر ماذا ربحت!'), ("fetch('stickers/girl.json')", "fetch('stickers/boy.json')"),
]
FEMININE = re.compile(r'ابدئي|اقرئي|امسحي|قولي|تذكّري|اضغطي|حاولي|لتستعملي|ألصقي|ضعيها|انظري|[كت]ِ')

for who in WHO:
    m_ = maths if who == 'girl' else patch('maths.js (boy)', maths, MASC_MATHS)
    s_ = sb if who == 'girl' else patch('stickerbook.js (boy)', sb, MASC_SB)
    if who == 'boy':
        for name, s in (('maths', m_), ('stickerbook', s_)):
            bad = FEMININE.search(s)
            if bad:
                raise SystemExit(f'{name}-boy.js still speaks to a girl: "{bad.group(0)}" near {s[max(0, bad.start() - 40):bad.end() + 20]!r}')
    write(f'maths-{who}.js', m_)
    write(f'stickerbook-{who}.js', s_)

# ======================= the stickers: two sections =======================
maria = json.loads(text('stickers/stickers.json'))
AR = {  # Arabic names for the original stickers and Star Friends
    '01-purpleglittersquishy': 'سكويشي بنفسجي لامع', '02-strawberry': 'فراولة', '03-panda': 'باندا', '04-unicorn': 'يونيكورن',
    'n-sauropod': 'ديناصور', '05-pinkglittersquishy': 'سكويشي وردي لامع', 'n-rocket': 'صاروخ', 'n-ringedplanet': 'كوكب',
    '06-doughnut': 'دونات', 'n-sloth': 'كسلان', '07-hamster': 'هامستر', '08-rainbow': 'قوس قزح', 'n-avocado': 'أفوكادو',
    '09-kittysquishy': 'سكويشي القطّة', 'n-camel': 'جمل', 'n-crystalball': 'كرة بلّورية', '10-cupcake': 'كب كيك',
    'n-guitar': 'غيتار', '11-rabbit_face': 'أرنب', '12-rainbowsquishy': 'سكويشي قوس قزح', 'n-otter': 'قضاعة',
    '13-mintmochi': 'موتشي بالنعناع', 'n-pizza': 'بيتزا', 'n-magicwand': 'عصا سحرية', '14-bubble_tea': 'شاي الفقاعات',
    'n-robot': 'روبوت', '15-seal': 'فقمة', '16-sparkling_heart': 'قلب لامع', 'n-flamingo': 'فلامنغو',
    '17-bunnysquishy': 'سكويشي الأرنب', 'n-ghost': 'شبح لطيف', 'n-mirrorball': 'كرة الديسكو', '18-peach': 'خوخ',
    'n-dumpling': 'دامبلنغ', '19-cat_face': 'قطّة', '20-glowing_star': 'نجمة متوهّجة', 'n-koala': 'كوالا',
    '21-bearsquishy': 'سكويشي الدبدوب', 'n-kite': 'طائرة ورقية', 'n-trophy': 'كأس', '22-dango': 'دانغو',
    'n-hedgehog': 'قنفذ', '23-penguin': 'بطريق', '24-clearsparklesquishy': 'سكويشي شفّاف لامع', 'n-popcorn': 'فشار',
    '25-heartsquishy': 'سكويشي القلب', 'n-owl': 'بومة', 'n-gemstone': 'جوهرة', '26-soft_ice_cream': 'آيس كريم',
    'n-alien': 'كائن فضائي', '27-teddy_bear': 'دبدوب', '28-butterfly': 'فراشة', 'n-turtle': 'سلحفاة',
    '29-cloudsquishy': 'سكويشي الغيمة', 'n-watermelon': 'بطّيخ', 'n-carouselhorse': 'حصان الدوّامة', '30-shortcake': 'كعكة',
    'n-dragonface': 'تنّين', '31-chicksquishy': 'سكويشي الكتكوت', '32-starsquishy': 'سكويشي النجمة', 'n-snail': 'حلزون',
    '33-frogsquishy': 'سكويشي الضفدع', 'n-videogame': 'يد ألعاب', 'n-partypopper': 'مفرقعة الحفلة', '34-custard': 'بودينغ',
    'n-pancakes': 'بان كيك', '35-jellybeansquishy': 'سكويشي حبّة الجيلي', '36-crown': 'تاج', 'n-llama': 'لاما',
    '37-peachbunsquishy': 'سكويشي كعكة الخوخ', 'n-nestingdolls': 'دمى متداخلة', 'n-fullmoonface': 'قمر مبتسم',
    '38-rice_ball': 'كرة أرز', 'n-cactus': 'صبّار', '39-honey_pot': 'جرّة عسل', '40-unicornsquishy': 'سكويشي اليونيكورن',
    'n-lion': 'أسد', 'n-croissant': 'كرواسون', 'n-fox': 'ثعلب', 'n-wrappedgift': 'هدية',
    'friends/princess': 'الأميرة', 'friends/health-worker': 'الطبيبة', 'friends/fairy': 'الجنّية', 'friends/astronaut': 'رائدة الفضاء',
    'friends/cartwheeling': 'البهلوانة', 'friends/scientist': 'العالِمة', 'friends/superhero': 'البطلة الخارقة',
    'friends/artist': 'الرسّامة', 'friends/pilot': 'الطيّارة',
}
TO_BOYS = ['n-sauropod', 'n-rocket', 'n-ringedplanet', 'n-guitar', 'n-robot', 'n-ghost', 'n-kite', 'n-trophy',
           'n-alien', 'n-dragonface', 'n-videogame', 'n-lion']     # boyish ones from the original set: the boys' section only
key = lambda f: f.rsplit('.', 1)[0]
missing = [s['file'] for s in maria['stickers'] + maria['friends'] if key(s['file']) not in AR]
if missing:
    raise SystemExit(f'stickers.json has new stickers: add their Arabic names to AR in export_maths.py: {missing}')
extra_path = os.path.join(DST, 'stickers', 'extra.json')
if not os.path.exists(extra_path):
    raise SystemExit(f'{extra_path} is missing: run tools/make_stickers.py in {DST} first')
extra = json.load(open(extra_path, encoding='utf-8'))
for s in extra['boy'] + extra['girl'] + extra['friendsBoy']:
    if not os.path.exists(os.path.join(DST, 'stickers', s['file'])):
        raise SystemExit(f"stickers/{s['file']} is missing: run tools/make_stickers.py again")
    shipped['stickers/' + s['file']] = open(os.path.join(DST, 'stickers', s['file']), 'rb').read()

def spread(a, b):
    """b's items spread evenly through a, starting with a's first item."""
    a, b, out, placed = list(a), list(b), [], 0
    n, nb = len(a) + len(b), len(b)
    for i in range(n):
        if b and (not a or placed < (i + 1) * nb / n - .5):
            out.append(b.pop(0)); placed += 1
        else:
            out.append(a.pop(0))
    return out

def first(lst, pred):
    """The first item that matches moves to the front (the boy's book opens with a squishy, as the girl's does)."""
    i = next(k for k, x in enumerate(lst) if pred(x))
    return [lst[i]] + lst[:i] + lst[i + 1:]

def book(regular, sparkly):
    """Three stickers, then a sparkly one, as in the original book."""
    out = []
    while regular or sparkly:
        out += regular[:3]; regular = regular[3:]
        if sparkly: out.append(sparkly.pop(0))
    return out

orig = [dict(s, ar=AR[key(s['file'])]) for s in maria['stickers']]
for s in orig:
    write('stickers/' + s['file'], git('stickers/' + s['file']))
girls_own = [s for s in orig if key(s['file']) not in TO_BOYS]
boys_from_orig = [s for s in orig if key(s['file']) in TO_BOYS]
sq = [s for s in extra['boy'] if s['file'].startswith('boy/sq-')]
fl = [s for s in extra['boy'] if not s['file'].startswith('boy/sq-')]
part = lambda lst, sp: [s for s in lst if bool(s['sparkle']) == sp]
girl_stickers = book(spread(part(girls_own, False), part(extra['girl'], False)), spread(part(girls_own, True), part(extra['girl'], True)))
boy_stickers = book(first(spread(spread(part(fl, False), part(boys_from_orig, False)), part(sq, False)), lambda x: x['file'].startswith('boy/sq-')),
                    spread(spread(part(fl, True), part(boys_from_orig, True)), part(sq, True)))
girl_friends = [dict(f, ar=AR[key(f['file'])]) for f in maria['friends']]
for f in girl_friends:
    write('stickers/' + f['file'], git('stickers/' + f['file']))
assert not {s['file'] for s in girl_stickers} & {s['file'] for s in boy_stickers}, 'a sticker is in both sections'
for who, st_, fr in (('girl', girl_stickers, girl_friends), ('boy', boy_stickers, extra['friendsBoy'])):
    write(f'stickers/{who}.json', json.dumps({'v': 1, 'stickers': st_, 'legacy': [], 'friendEvery': maria.get('friendEvery', 7), 'friends': fr},
                                            ensure_ascii=False, indent=1))
lic = text('stickers/LICENSE.txt')
write('stickers/LICENSE.txt', """Stickers in Times Table Cards

The glitter squishies in the girls' section (purple, pink, kitty, mint mochi, bunny, bear, heart, cloud, chick, frog,
jelly bean, peach bun, rainbow, clear sparkle, star and unicorn) and the squishies in the boys' section
(boy/sq-*.webp) were drawn for this app.

All other stickers and the Star Friends are made from Microsoft Fluent Emoji
(https://github.com/microsoft/fluentui-emoji), with a sticker border added. Fluent Emoji is released under the MIT License:

""" + lic[lic.index('MIT License'):])

# ======================= tt.js: the start-up file =======================
app = text('app.js')
pieces = '\n'.join(block(app, p) for p in [
    r'const TRACK_FROM = ', r'const SFX = \{', r'let confettiRun = ', r'function stopConfetti\(', r'function confetti\(',
    r'function holdToOpen\(', r'function calendarHTML\(', r'function show\(', r'function toast\(', r'function isIOS\('])
tt = """/* Times Table Cards (بطاقات جدول الضرب): the start-up file.
   The first page asks the child's name and whether the child is a boy or a girl; then maths-boy.js or maths-girl.js
   (the cards) and stickerbook-boy.js or stickerbook-girl.js (the reward) are loaded, so the Arabic speaks to the child.
   Everything stays on this device: 'tt:profile' (name, boy or girl), 'tt:math' (the cards), 'tt:stickers' (the
   sticker book) and 'tt:sfx' (sound effects on or off). */
(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const DEV = new URLSearchParams(location.search).get('dev') === '1';
const PROFILE_KEY = 'tt:profile', SB_KEY = 'tt:stickers', SFX_KEY = 'tt:sfx', DEV_KEY = 'tt:devOffset';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
const readJSON = k => { try { return JSON.parse(lsGet(k) || 'null'); } catch (e) { return null; } };
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

let devOffset = DEV ? (parseInt(lsGet(DEV_KEY) || '0', 10) || 0) : 0;
const pad = n => String(n).padStart(2, '0');
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function today() { const d = new Date(); d.setDate(d.getDate() + devOffset); return fmt(d); }
function addDays(ds, n) { const [y, m, d] = ds.split('-').map(Number); const x = new Date(y, m - 1, d); x.setDate(x.getDate() + n); return fmt(x); }
const isDay = x => typeof x === 'string' && /^\\d{4}-\\d\\d-\\d\\d$/.test(x);

// the child: a name, and a boy or a girl
const cleanProfile = p => ({ name: p && typeof p.name === 'string' ? p.name.trim().slice(0, 30) : '', who: p && (p.who === 'boy' || p.who === 'girl') ? p.who : '' });
let profile = cleanProfile(readJSON(PROFILE_KEY));
const saveProfile = () => lsSet(PROFILE_KEY, JSON.stringify(profile));

// the sound effects below ask for these: one look, and the sound effects switch
const isMama = () => false;
const st = { settings: { sfx: lsGet(SFX_KEY) !== '0' } };

/* ---------- sound effects, confetti, press and hold, the practice calendar, screens (as in the original app) ---------- */
""" + pieces + """

/* ---------- the sticker book: a sticker for every 2 days in a row with the daily goal reached ---------- */
// The goal days are kept here as they happen (the cards keep only the last 120 days of minutes), with any day a parent
// registers on the calendar. A girl's book and a boy's book each have their own stickers.
const cleanSB = s => {
  const o = s && typeof s === 'object' ? s : {};
  const book = b => ({ got: b && Array.isArray(b.got) ? b.got : [] });
  return { days: Array.isArray(o.days) ? o.days.filter(isDay) : [], per: Math.max(1, Math.min(7, Number(o.per) || 2)), girl: book(o.girl), boy: book(o.boy) };
};
let sbState = cleanSB(readJSON(SB_KEY));
const saveSB = () => lsSet(SB_KEY, JSON.stringify(sbState));
let MATHS = null, SB = null;
function goalDays() {
  const m = MATHS.state, goal = m.settings.goalMin * 60, set = new Set(sbState.days);
  Object.keys(m.active || {}).forEach(d => { if (isDay(d) && m.active[d] >= goal) set.add(d); });
  (m.reg || []).forEach(d => { if (isDay(d)) set.add(d); });
  if (set.size !== sbState.days.length) { sbState.days = [...set].sort(); saveSB(); }
  return sbState.days;
}
const sbView = {
  get days() { return goalDays(); },
  get stk() { return sbState[profile.who]; },
  set stk(v) { sbState[profile.who] = v; }
};

/* ---------- backup and restore: one small file with everything ---------- */
function backup() {
  const data = JSON.stringify({ app: 'times-table-cards', v: 1, saved: new Date().toISOString(), profile, math: MATHS.snapshot(), stickers: sbState });
  const name = `times-table-cards-backup-${today()}.json`;
  let file = null;
  try { file = new File([data], name, { type: 'application/json' }); } catch (e) {}
  if (file && isIOS() && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file] }).catch(() => {});
    return;
  }
  const url = URL.createObjectURL(file || new Blob([data], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Backup saved.');
}
async function restore(file) {
  try {
    const obj = JSON.parse(await file.text());
    if (!obj || obj.app !== 'times-table-cards' || !MATHS.valid(obj.math)) throw new Error('bad');
    if (!confirm('Replace the progress on this device with this backup?')) return;
    MATHS.replace(obj.math);
    lsSet(SB_KEY, JSON.stringify(cleanSB(obj.stickers)));
    const p = cleanProfile(obj.profile);
    if (p.name && p.who) lsSet(PROFILE_KEY, JSON.stringify(p));
    location.reload();                    // a boy's backup on a girl's page (or the other way) needs the other words
  } catch (e) { toast('That file is not a Times Table Cards backup.'); }
}

/* ---------- the parent area: the child, and the sticker book ---------- */
function parentRows() {
  const per = sbState.per, n = SB ? SB.count() : 0, f = SB ? SB.friends() : 0, total = SB ? SB.friendsTotal() : 0, next = SB ? SB.nextIn() : per;
  const seg = v => `<button data-tt-who="${v}" aria-pressed="${profile.who === v}">${v === 'boy' ? 'Boy' : 'Girl'}</button>`;
  return `<h2 class="mx-h2">The child</h2>
    <div class="p-group">
      <div class="p-row"><label for="ttName">Name<span class="sub">Shown on Home and on the sticker book</span></label><input id="ttName" class="p-input" type="text" maxlength="30" value="${esc(profile.name)}"></div>
      <div class="p-row"><span>Boy or girl<span class="sub">The Arabic speaks to a boy (ابدأ، أحسنت) or a girl (ابدئي، أحسنتِ). Each has a sticker book of its own: blue with boys' stickers, or pink with girls' stickers.</span></span><div class="seg">${seg('boy')}${seg('girl')}</div></div>
    </div>
    <h2 class="mx-h2">Sticker book</h2>
    <div class="p-group">
      <div class="p-row"><span>${n} sticker${n === 1 ? '' : 's'} · ${f} of ${total} Star Friends<span class="sub">A day counts when the daily goal is reached (or when you register it on the calendar above). Next sticker after ${next} more day${next === 1 ? '' : 's'} in a row · every 7th reward is a Star Friend</span></span><button class="p-btn" data-tt="stickers">Open the sticker book</button></div>
      <div class="p-row"><span>Days in a row for one sticker<span class="sub">Stickers already earned are kept if you change this</span></span><div class="step"><button class="p-btn" data-tt-per="-1" aria-label="Less">−</button><output>${per}</output><button class="p-btn" data-tt-per="1" aria-label="More">+</button></div></div>
    </div>

    `;
}
function onParent(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.ttWho && b.dataset.ttWho !== profile.who) {
    if (!confirm(b.dataset.ttWho === 'boy' ? 'Change to a boy? The Arabic will speak to a boy, and the blue sticker book with boys\\' stickers will open.'
      : 'Change to a girl? The Arabic will speak to a girl, and the pink sticker book with girls\\' stickers will open.')) return;
    profile.who = b.dataset.ttWho; saveProfile(); location.reload();
  } else if (b.dataset.ttPer) {
    sbState.per = Math.max(1, Math.min(7, sbState.per + Number(b.dataset.ttPer))); saveSB();
    b.parentElement.querySelector('output').textContent = sbState.per;
  } else if (b.dataset.tt === 'stickers' && SB) SB.open(() => MATHS.renderParent() || show('mparent'));
}

/* ---------- updates: a new version reloads by itself, but never in the middle of a round ---------- */
function reloadForUpdate() {
  if (!reloadForUpdate.pending || (MATHS && MATHS.busy()) || (SB && SB.busy())) return;
  location.reload();
}

/* ---------- developer mode (?dev=1): move the date on to test the schedule ---------- */
function renderDev() {
  const bar = $('#devbar');
  bar.hidden = false;
  bar.innerHTML = `<span>dev · ${today()} (+${devOffset}d)</span><button data-dev="plus">+1 day</button><button data-dev="zero">real date</button>`;
}

/* ---------- the first page: the name, and a boy or a girl ---------- */
function askWho() {
  const name = $('#ttNameIn'), go = $('#ttGo');
  let who = profile.who;
  const ready = () => { go.disabled = !(name.value.trim() && who); };
  name.value = profile.name;
  document.querySelectorAll('[data-pick]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.pick === who));
    b.addEventListener('click', () => {
      who = b.dataset.pick; document.documentElement.dataset.who = who;
      document.querySelectorAll('[data-pick]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      ready();
    });
  });
  name.addEventListener('input', ready);
  name.addEventListener('keydown', e => { if (e.key === 'Enter') name.blur(); });
  go.addEventListener('click', () => {
    if (go.disabled) return;
    profile = cleanProfile({ name: name.value, who }); saveProfile();
    start();
  });
  ready();
  show('ttWho');
}

function load(src) {
  return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.body.append(s); });
}
async function start() {
  if (!profile.name || !profile.who) return askWho();
  document.documentElement.dataset.who = profile.who;
  try { await load(`maths-${profile.who}.js`); await load(`stickerbook-${profile.who}.js`); }
  catch (e) { document.body.innerHTML = '<p style="font:24px sans-serif;padding:40px;text-align:center">The app could not load. Please connect to the internet once and try again.</p>'; return; }
  MATHS = window.TimesTables.mount({
    today, lsGet, lsSet, show, toast, SFX, confetti, stopConfetti, holdToOpen, reduced, DEV, backup, restore, calendarHTML,
    sfx: v => { if (v !== undefined) { st.settings.sfx = !!v; lsSet(SFX_KEY, v ? '1' : '0'); } return st.settings.sfx; },
    setDeck: () => {}, stopEnglish: () => {}, english: () => {},
    parentRows,
    onHome() {
      $('#ttHello').textContent = `أهلاً يا ${profile.name}!`;
      if (!SB) return;
      SB.sync(); SB.homeCard();
      if (SB.pending()) setTimeout(() => { if (!$('#mhome').hidden && SB.pending()) SB.celebrate(() => MATHS.home()); }, 700);
    },
    onDone() {
      if (!SB) return;
      SB.sync();
      if (SB.pending()) setTimeout(() => { if (!$('#mdone').hidden && SB.pending()) SB.celebrate(() => MATHS.home()); }, 900);
    }
  });
  SB = window.StickerBook.mount({
    st: () => sbView, save: saveSB, today, addDays, show, SFX, confetti, stopConfetti, reduced, toast,
    perDays: () => sbState.per, name: () => profile.name, stopEnglish: () => {}, home: () => MATHS.home()
  });
  await SB.ready;
  document.addEventListener('click', e => { if (e.target.closest('[data-backup]')) backup(); });   // the line under "Created by" on Home
  document.addEventListener('pointerdown', () => { if (SFX.ctx && SFX.ctx.state !== 'running') { try { SFX.ctx.resume(); } catch (e) {} } }, true);
  $('#mparent').addEventListener('click', onParent);
  $('#mparent').addEventListener('input', e => { if (e.target.id === 'ttName' && e.target.value.trim()) { profile.name = e.target.value.trim().slice(0, 30); saveProfile(); } });
  if (DEV) {
    renderDev();
    $('#devbar').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      devOffset = b.dataset.dev === 'plus' ? devOffset + 1 : 0;
      lsSet(DEV_KEY, String(devOffset));
      renderDev(); MATHS.home();
    });
    window.TT = { get MATHS() { return MATHS; }, get SB() { return SB; }, get sbState() { return sbState; }, get profile() { return profile; } };
  }
  MATHS.home();
}

start();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloadForUpdate.pending) return;
    reloadForUpdate.pending = true;
    reloadForUpdate();
  });
  navigator.serviceWorker.register('sw.js').then(reg => {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
}
})();
"""
write('tt.js', tt)

# ======================= style.css =======================
css = text('style.css')
HEAD = re.compile(r'^/\* (?:-{10}|={10,}) ', re.M)
starts = [0] + [m.start() for m in HEAD.finditer(css)]
sections = [css[a:b] for a, b in zip(starts, starts[1:] + [len(css)])]
KEEP = ['buttons', 'home', 'session', 'done', 'celebration', 'parent area', 'small screens', 'reduced motion',
        'جدول الضرب', 'days in a row', "Maria's sticker book", 'counting', 'Star Friends']
kept = [0]
for k in KEEP:
    found = [i for i, s in enumerate(sections) if i and s.startswith('/* ---------- ' + k)]
    if not found:
        raise SystemExit(f'style.css changed, update export_maths.py: no section "{k}"')
    kept += found
css = ''.join(sections[i] for i in sorted(set(kept)))
css = resub('style.css', css, r'\A/\*.*?\*/', '/* Times Table Cards: the times tables and the sticker book */')
css = re.sub(r"^@font-face \{[^}]*url\(fonts/([\w-]+)\.woff2\)[^}]*\}\n", lambda m: m.group(0) if m.group(1) in FONTS else '', css, flags=re.M)
css = re.sub(r'/\*.*?\*/', lambda m: re.sub(r"\bMaria's\s+", '', m.group(0)).replace('Maria', 'the child'), css, flags=re.S)
# the pinks become settings, so a boy's app can be blue
css = css.replace('rgba(255, 111, 168,', 'rgba(var(--gum-rgb),').replace('#FFE9F2', 'var(--tint)').replace('#FFD6E8', 'var(--tint2)') \
         .replace('#FFC2DD', 'var(--tint3)').replace('linear-gradient(135deg, #B892F2, #FF6FA8)', 'linear-gradient(135deg, var(--friends-a), var(--friends-b))')
css += """
/* ---------- Times Table Cards: pink for a girl (as in the original), blue for a boy; the first page; the greeting ---------- */
:root { --gum-rgb: 255, 111, 168; --tint: #FFE9F2; --tint2: #FFD6E8; --tint3: #FFC2DD; --friends-a: #B892F2; --friends-b: #FF6FA8;
  --mx: 'Tajawal', 'Geeza Pro', 'Noto Naskh Arabic', sans-serif; }
html[data-who="boy"] { --gum: #3C8CF0; --gum-rgb: 60, 140, 240; --tint: #E4F0FF; --tint2: #D2E6FF; --tint3: #BCD9FF; --friends-a: #4FD1C5; --friends-b: #3C6FF0; }
#sbook, #sbAward, #sfAward, #sbCard { font-family: var(--mx); }
#sbook[dir="rtl"] .sb-page.left { border-radius: 6px 18px 18px 6px; box-shadow: inset 22px 0 26px -18px rgba(43, 35, 64, .28); }
#sbook[dir="rtl"] .sb-page.right { border-radius: 18px 6px 6px 18px; box-shadow: inset -22px 0 26px -18px rgba(43, 35, 64, .28); }
@media (orientation: portrait), (max-width: 699px) { #sbook[dir="rtl"] .sb-page.left { border-radius: 18px; box-shadow: none; } }
@media (max-width: 600px) { .sb-pager { gap: 10px; } .sb-pd { flex-wrap: wrap; justify-content: center; gap: 5px; max-width: calc(100vw - 170px); } .sb-pd i { width: 8px; height: 8px; } }
.tt-hello { margin: -4px 0 0; font-size: clamp(22px, 3.4vw, 30px); font-weight: 800; color: var(--gum); }
.app-foot a.credit { pointer-events: auto; padding: 6px 10px; color: inherit; text-decoration: underline; text-underline-offset: 3px; }
.tt-who { align-items: center; justify-content: center; gap: 16px; text-align: center; overflow-y: auto; }
.tt-q { font-size: clamp(24px, 4vw, 32px); font-weight: 800; }
.tt-name { width: min(420px, 86vw); min-height: 64px; padding: 0 18px; font: 800 30px var(--mx); text-align: center; color: var(--ink);
  background: var(--white); border: 3px solid var(--ink); border-radius: var(--hand-btn); -webkit-user-select: text; user-select: text; }
.tt-picks { display: flex; gap: 22px; }
.tt-pick { width: 150px; height: 150px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  font: 800 30px var(--mx); background: var(--white); border: 3px solid var(--ink); border-radius: var(--hand); box-shadow: 0 6px 0 var(--ink); }
.tt-pick span { font-size: 60px; line-height: 1; }
.tt-pick:active { transform: translateY(4px); box-shadow: 0 2px 0 var(--ink); }
.tt-pick.boy[aria-pressed="true"] { background: #D2E6FF; border-color: #1F5FB8; box-shadow: 0 6px 0 #1F5FB8; }
.tt-pick.girl[aria-pressed="true"] { background: #FFD6E8; border-color: #C2386F; box-shadow: 0 6px 0 #C2386F; }
.btn-start.tt-go { min-height: 96px; min-width: 260px; font-family: var(--mx); font-weight: 800; font-size: 44px; background: var(--gum); }
.btn-start.tt-go:disabled { opacity: .4; }
.tt-note { max-width: 470px; margin: 0; font: 14px/1.4 var(--en); color: var(--ink-soft); }
@media (max-height: 760px) { .tt-pick { width: 116px; height: 116px; font-size: 24px; } .tt-pick span { font-size: 44px; } .tt-name { min-height: 54px; }
  .btn-start.tt-go { min-height: 76px; font-size: 36px; } .tt-who .mx-title { font-size: 34px; } }
"""
write('style.css', css)

# ======================= index.html =======================
sprite = re.search(r'<svg width="0" height="0" style="position:absolute" aria-hidden="true">.*?</svg>', text('index.html'), re.S)
if not sprite:
    raise SystemExit('index.html changed, update export_maths.py: the icon sprite')
write('index.html', f"""<!doctype html>
<html lang="ar">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Times Table Cards · جدول الضرب</title>
<meta name="description" content="Practise the times tables from 1 to 10 in Arabic, with a recorded voice and a sticker book.">
<meta name="theme-color" content="{PAPER}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="جدول الضرب">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="icon-192.png">
<link rel="icon" type="image/png" href="icon-192.png">
<link rel="preload" href="fonts/tajawal-500.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/tajawal-800.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="style.css">
</head>
<body>

{sprite.group(0)}

<!-- the first page: the child's name, and a boy or a girl -->
<section id="ttWho" class="screen mx tt-who" dir="rtl" lang="ar" hidden>
  <h1 class="mx-title"><span class="mx-logo" aria-hidden="true">×</span>جدول الضرب</h1>
  <label class="tt-q" for="ttNameIn">ما اسمك؟</label>
  <input id="ttNameIn" class="tt-name" type="text" maxlength="30" autocomplete="off" autocorrect="off" enterkeyhint="done">
  <div class="tt-q">ولد أم بنت؟</div>
  <div class="tt-picks">
    <button class="tt-pick boy" data-pick="boy" aria-pressed="false"><span aria-hidden="true">👦</span>ولد</button>
    <button class="tt-pick girl" data-pick="girl" aria-pressed="false"><span aria-hidden="true">👧</span>بنت</button>
  </div>
  <button id="ttGo" class="btn-start tt-go" disabled>هيا بنا!</button>
  <p class="tt-note" lang="en" dir="ltr">For parents: the Arabic will speak to a boy or a girl, and the sticker book will be blue or pink with its own stickers. You can change both later in the parent area (press and hold the gear on the home screen).</p>
</section>

<div id="toast" class="toast" hidden></div>
<div id="devbar" class="devbar" hidden></div>

<script src="tt.js"></script>
</body>
</html>
""")

write('manifest.json', json.dumps({
    'name': 'Times Table Cards · جدول الضرب', 'short_name': 'جدول الضرب', 'lang': 'ar', 'dir': 'rtl', 'start_url': './', 'scope': './',
    'display': 'standalone', 'orientation': 'any', 'background_color': PAPER, 'theme_color': PAPER,
    'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
              {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'}],
}, ensure_ascii=False, indent=2) + '\n')

for f in FONTS:
    write(f'fonts/{f}.woff2', git(f'fonts/{f}.woff2'))

# ======================= the recorded voice: the 'maths' deck only (100 sums, «ثلاثة في أربعة») =======================
deck = json.loads(text('audio/voice.json'))['decks'].get('maths')
if not deck or len(deck['clips']) != 100:
    raise SystemExit('audio/voice.json has no complete maths deck: run scripts/maths_voice.py first')
for c in deck['clips'].values():
    write(f"audio/{c['f']}", git(f"audio/{c['f']}"))
write('audio/_unlock.m4a', git('audio/_unlock.m4a'))
write('audio/voice.json', json.dumps({'v': 2, 'decks': {'maths': deck}}, ensure_ascii=False, separators=(',', ':')))

# ======================= the icon: the times-tables tile, on the paper colour =======================
from PIL import Image
tile = Image.open(io.BytesIO(git('assets/apps/math.webp'))).convert('RGBA')
for n in (512, 192):
    img = Image.new('RGBA', (n, n), PAPER)
    s = round(n * 0.84)
    img.alpha_composite(tile.resize((s, s), Image.LANCZOS), ((n - s) // 2, (n - s) // 2))
    out = io.BytesIO()
    img.convert('RGB').save(out, 'PNG', optimize=True)
    write(f'icon-{n}.png', out.getvalue())

write('README.md', f"""# Times Table Cards (بطاقات جدول الضرب)

Practise the times tables from 1 to 10 in Arabic, with spaced repetition, a recorded voice and a sticker book.

**Open it:** {URL}

- The first page asks the child's name and whether the child is a boy or a girl, so the Arabic speaks to the child (ابدأ or ابدئي).
- Each card is a sum such as 3 × 4. Type the answer on the number pad, or tap 🎤 and say it, then tap تحقّق. The sum is read aloud by a recorded voice (tap 🔊 to turn it off).
- A new fact first comes with a picture of dots. A fact answered right comes back after 1, 2, 4, 7, 14 and then 30 days; a missed fact comes back sooner.
- The tables are taught in this order: 1, 10, 2, 5, 3, 4, 9, 6, 7, 8. A table earns its star when all ten facts are well learned.
- The daily goal is a few minutes of practice (5 by default). Every 2 days in a row with the goal reached earn a sticker, and every 7th reward is a big Star Friend who dances in the book. Girls and boys have separate books: pink or blue, each with its own 94 stickers and 9 Star Friends.
- Parents: press and hold the gear for two seconds. It shows the accuracy for each table, the weakest facts, a practice calendar and the settings, and lets you change the name or the boy/girl choice.
- Works offline. On an iPad or iPhone: open the link in Safari, tap Share, then Add to Home Screen.
- Progress stays on this device only. No account, no tracking. To keep a copy, tap "Back up progress" at the bottom of the home screen.

Created by [Dr Asma Khattala]({LINKEDIN}). Sticker credits: `stickers/LICENSE.txt`.
""")
write('.gitignore', '.DS_Store\n')
write('.nojekyll', '')

# ======================= sw.js: offline cache; its version changes whenever a file changes =======================
files = sorted(p for p in shipped if p not in ('README.md', '.gitignore', '.nojekyll', 'stickers/LICENSE.txt'))
version = CACHE + hashlib.sha1(b''.join(p.encode() + shipped[p] for p in files)).hexdigest()[:10]
write('sw.js', """/* Offline cache for Times Table Cards. Written by the export script: the version changes whenever a file changes.
   Several apps share this web address, so this app's caches all start with '%s' and only those are deleted. */
const VERSION = '%s';
const FILES = %s;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(async c => {
    for (let i = 0; i < FILES.length; i += 40) await c.addAll(FILES.slice(i, i + 40));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('%s') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const put = res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; };
  // On a local test server, fetch fresh files first so edits show up; fall back to the cache offline.
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    e.respondWith(fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-store' }).then(put).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  // Everywhere else: cache first, so the app opens instantly and works with no signal.
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(put)));
});
""" % (CACHE, version, json.dumps(['./'] + files, ensure_ascii=False, indent=2), CACHE))

# ======================= checks: nothing of Maria's, none of her keys, no ١٢٣ =======================
for root, dirs, names in os.walk(DST):
    dirs[:] = [d for d in dirs if d != '.git']
    for n in names:
        path = os.path.relpath(os.path.join(root, n), DST)
        if not n.endswith(('.js', '.css', '.html', '.json', '.md', '.txt', '.py')):
            continue
        s = open(os.path.join(root, n), encoding='utf-8').read()
        bad = re.search(r"maria|ماريا|talk cards|['\"`]tc:|mariaTalkCards", s, re.I)
        if bad:
            raise SystemExit(f'{path} still has "{bad.group(0)}": update export_maths.py')
        if path not in shipped and not path.startswith('tools/') and path != 'stickers/extra.json':
            print(f'note: {path} is in {DST} but is not part of the app')
for who in WHO:
    s = shipped[f'maths-{who}.js'].decode('utf-8')
    if "const KEY = 'tt:math';" not in s:
        raise SystemExit('maths.js: the progress key was not changed')
    shown = re.sub(r"const AR_DIGITS = '[^']*';|\[٠-٩\]|\[۰-۹\]|//[^\n]*|/\*.*?\*/", '', s, flags=re.S)
    if re.search(r'[٠-٩]', shown):
        raise SystemExit(f'maths-{who}.js still shows ١٢٣ digits')
print(f'Times Table Cards written to {DST}: {len(girl_stickers)} girls\' and {len(boy_stickers)} boys\' stickers, '
      f'{len(deck["clips"])} recorded clips, cache {version}')
