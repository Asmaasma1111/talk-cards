"""علبة الفضول (Curiosity Box): build curiosity.json from Mama's content bank and the parent cards.

    python3 -I scripts/make_curiosity.py

Reads (local only, content/ is not in the repository):
  content/curiosity/bank.md            her 75 mysteries, word for word (a copy of ~/Downloads/Curiosity_Box_Mysteries.md)
  content/curiosity/parent-cards-*.md  the parent cards (English), one "## N. ... · ID · ..." section per mystery
  scripts/curiosity_photo_picks.json   which real photo each mystery uses (made by scripts/curiosity_photos.py)
Writes curiosity.json, which the app reads.

Maria's Arabic (the mystery line and the hints) is taken from the bank exactly, never retyped. The Qur'anic verses
(theme G) are shown in full mushaf orthography, from the verified texts below (checked with a Qur'an source on
20 Oct 2026); the bank keeps her own spelling. A mystery with no parent card yet is kept, marked not ready, so the app
never shows it to Maria.
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'content', 'curiosity')
OUT = os.path.join(ROOT, 'curiosity.json')
PICKS = os.path.join(ROOT, 'scripts', 'curiosity_photo_picks.json')

# theme G: the verses in full mushaf orthography (verified), with the reference as she wrote it
VERSES = {
    'G1': ('أَفَلَا يَنظُرُونَ إِلَى ٱلْإِبِلِ كَيْفَ خُلِقَتْ', 'الغاشية: ١٧'),
    'G2': ('وَإِلَى ٱلسَّمَآءِ كَيْفَ رُفِعَتْ', 'الغاشية: ١٨'),
    'G3': ('وَإِلَى ٱلْجِبَالِ كَيْفَ نُصِبَتْ', 'الغاشية: ١٩'),
    'G4': ('وَإِلَى ٱلْأَرْضِ كَيْفَ سُطِحَتْ', 'الغاشية: ٢٠'),
    'G5': ('وَأَوْحَىٰ رَبُّكَ إِلَى ٱلنَّحْلِ', 'النحل: ٦٨'),
    'G6': ('قَالَتْ نَمْلَةٌ يَـٰٓأَيُّهَا ٱلنَّمْلُ ٱدْخُلُوا۟ مَسَـٰكِنَكُمْ', 'النمل: ١٨'),
    'G7': ('وَأَنزَلْنَا مِنَ ٱلسَّمَآءِ مَآءًۢ بِقَدَرٍ', 'المؤمنون: ١٨'),
    'G8': ('أَلَمْ تَرَ إِلَىٰ رَبِّكَ كَيْفَ مَدَّ ٱلظِّلَّ', 'الفرقان: ٤٥'),
}
THEMES = {'A': ('ألوان وفن', 'Colours and art'), 'B': ('أشياء أحبّها', 'Things I love'), 'C': ('الحيوانات', 'Animals'),
          'D': ('الفضاء والسماء', 'Space and sky'), 'E': ('جسمي', 'My body'), 'F': ('خدعة اليوم', 'Trick of the day'),
          'G': ('«انظر كيف»', '"Look how" (Fridays)'), 'H': ('صوتٌ غامض', 'Mystery sound'), 'I': ('من كتاب العلوم', 'From her science book')}
# her weekly rotation, by weekday (0 = Sunday): two themes on one day take turns, the first one first
ROTATION = [['A'], ['C'], ['D', 'E'], ['B'], ['F'], ['G'], ['E', 'H']]
# what kind of mystery each one is, when it is not a plain photo
DRAWING = {'A5', 'D8'}          # her own drawing: Mama photographs it the evening before (or she holds the real one)
SOUND = {'H1'}                  # a real recording, then the photo
MYVOICE = {'H2'}                # she records a few words and hears them back
# mysteries that are best with Mama's own photo (a real object at home); the parent area says so the evening before
HOME_PHOTO = {'B1': 'one of her own squishies', 'B3': 'your own face cream and a sunscreen tube', 'B8': 'your perfume bottle',
              'E3': 'her wrinkly fingers after a bath', 'F1': 'a clean nappy with a cup of water beside it',
              'F2': 'pepper sprinkled on water in a white plate', 'F3': 'the cups and paper-towel strips, set up',
              'F4': 'an egg in a glass of water', 'I2': 'a pebble and a bean in two cups of damp cotton',
              'I15': 'sand and clay soil in two funnels'}
TIPS = ['Give real explanations, never just "because".', 'Show your own surprise.',
        'Say «لا أعرف... هيا نبحث معًا» ("I don\'t know, let\'s find out together").', 'Praise the question, not the answer.']


def cells(line):
    return [c.strip() for c in line.strip().strip('|').split('|')]


def hints(s):
    out = []
    for part in s.split('·'):
        part = part.strip()
        if not part:
            continue
        w, _, ks = part.partition(':')
        out.append({'w': w.strip(), 'k': [k.strip() for k in ks.split('،') if k.strip()]})
    return out


def bank():
    text = open(os.path.join(SRC, 'bank.md'), encoding='utf-8').read()
    M, theme, head = {}, None, None
    for line in text.splitlines():
        m = re.match(r'^## ([A-I])\. ', line)
        if m:
            theme, head = m.group(1), None; continue
        if line.startswith('## '):
            theme = None; continue
        if not theme or not line.startswith('|'):
            continue
        c = cells(line)
        if c[0] == '#':
            head = c; continue
        if set(''.join(c)) <= set('-: '):
            continue
        row = dict(zip(head, c))
        mid = row['#']
        shown = row['Mystery shown']
        week = re.search(r'\(week (\d)\+\)', shown)
        line_ar = re.sub(r'\s*\(week \d\+\)', '', shown).strip()
        x = {'id': mid, 'theme': theme, 'n': int(mid[1:]), 'line': line_ar, 'weekMin': int(week.group(1)) if week else 1,
             'hints': hints(row['Hints']), 'brief': row.get('Picture brief') or row.get('What happens') or row.get('Sound') or '',
             'find': row.get('Find out together') or ''}
        if theme == 'F':
            x['what'] = row['What happens']; x['predictEn'] = row['Prediction to record']; x['find'] = ''
        if theme == 'I':
            ch = re.match(r'(\d+)\s+(.+)', row['Chapter'])
            x['chapter'] = int(ch.group(1)); x['chapterName'] = ch.group(2)
        if theme == 'G':
            v, ref = VERSES[mid]
            x['verse'] = {'text': v, 'ref': ref}; x['bankLine'] = line_ar
        if mid in HOME_PHOTO:
            x['homeTip'] = HOME_PHOTO[mid]
        x['kind'] = 'drawing' if mid in DRAWING else 'sound' if mid in SOUND else 'myvoice' if mid in MYVOICE else 'photo'
        M[mid] = x
    week1 = re.search(r'\*\*Week 1[^*]*\*\*\s*([A-I0-9, ]+)', text).group(1)
    week1 = [w.strip() for w in week1.split(',') if w.strip()]
    tags = {}
    m = re.search(r'Other mysteries that also fit her book:(.+)', text)
    for grp in re.finditer(r'((?:[A-H]\d+(?:,| and)?\s*)+)\(chapters? ([\d and]+)\)', m.group(1)):
        ids = re.findall(r'[A-H]\d+', grp.group(1)); chs = [int(n) for n in re.findall(r'\d+', grp.group(2))]
        for i in ids:
            tags.setdefault(i, []).extend(chs)
    return M, week1, tags


def cards():
    out = {}
    for f in sorted(glob.glob(os.path.join(SRC, 'parent-cards-*.md'))):
        cur = None
        for line in open(f, encoding='utf-8').read().splitlines():
            m = re.match(r'^## \d+\. .*?·\s*([A-I]\d+)\s*·', line)
            if m:
                cur = out.setdefault(m.group(1), {'sections': [], 'predictAr': None}); sec = None; continue
            if line.startswith('## ') or line.startswith('---'):    # a heading that is not a card, or the end of the cards
                cur = None; continue
            if cur is None:
                continue
            m = re.match(r'^- \*\*([^*]+?):?\*\*:?\s*(.*)$', line)
            if m:
                label, rest = m.group(1).strip().rstrip(':'), m.group(2)
                sec = {'label': label, 'md': [rest] if rest else []}
                if label.startswith('Her prediction'):
                    a = re.search(r'«([^»]+)»', rest)
                    cur['predictAr'] = a.group(1) if a else None; sec = None; continue
                if label.split(' ')[0] in ('Photo', 'Hints', 'Sound', 'Shown') or label.startswith('Photo'):
                    sec = None; continue
                cur['sections'].append(sec); continue
            if sec is not None and line.strip():
                sec['md'].append(line)
    for c in out.values():
        for s in c['sections']:
            s['md'] = '\n'.join(s['md']).rstrip()
    return out


def main():
    M, week1, tags = bank()
    C = cards()
    picks = json.load(open(PICKS, encoding='utf-8')) if os.path.exists(PICKS) else {}
    cred_f = os.path.join(SRC, 'photos', 'credits.json')
    credits = {c['photo']: c for c in json.load(open(cred_f, encoding='utf-8'))} if os.path.exists(cred_f) else {}
    rows = []
    for mid, x in M.items():
        c = C.get(mid)
        x['card'] = c['sections'] if c else None
        if c and c['predictAr']:
            x['predict'] = c['predictAr']
        if mid in tags:
            x['tags'] = sorted(set(tags[mid]))
        p = picks.get(mid)
        if p:
            x['photo'] = f"assets/curiosity/photos/{mid.lower()}.webp"
            cr = credits.get(mid)
            if cr:
                x['credit'] = ', '.join(v for v in (cr.get('via'), cr.get('creator'), cr.get('licence')) if v)
            if p.get('sound'):
                x['sound'] = f"assets/curiosity/sounds/{mid.lower()}.m4a"
        need_photo = x['kind'] in ('photo', 'sound')
        x['ready'] = bool(c) and (not need_photo or 'photo' in x) and (x['theme'] != 'F' or bool(x.get('predict'))) \
            and (x['kind'] != 'sound' or 'sound' in x)
        x.pop('brief', None)
        rows.append(x)
    order = 'ABCDEFGHI'
    rows.sort(key=lambda x: (order.index(x['theme']), x['n']))
    chapters = {}
    for x in rows:
        if x['theme'] == 'I':
            chapters[str(x['chapter'])] = x['chapterName']
    D = {'v': 1, 'goal': 'اليوم نتدرّب لنكون سائلات ماهرات',
         'rules': ['اسألي أكبر عدد من الأسئلة', 'لا تتوقفي لتجيبي', 'قوليها كما خطرت لكِ', 'حوّلي الجملة إلى سؤال'],
         'themes': {k: {'ar': a, 'en': e} for k, (a, e) in THEMES.items()}, 'rotation': ROTATION, 'week1': week1,
         'chapters': chapters, 'tips': TIPS, 'mysteries': rows}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(D, f, ensure_ascii=False, indent=1)
    ready = [x['id'] for x in rows if x['ready']]
    carded = [x['id'] for x in rows if x['card']]
    print(f"curiosity.json: {len(rows)} mysteries, {len(carded)} with parent cards, {len(ready)} ready")
    print('  cards but not ready (photo or prediction missing):', ' '.join(i for i in carded if i not in ready) or 'none')
    missing = [i for i in C if i not in M]
    if missing:
        sys.exit('cards for unknown mysteries: ' + ' '.join(missing))


if __name__ == '__main__':
    main()
