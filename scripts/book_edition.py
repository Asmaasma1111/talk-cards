"""Maria Reads: build the private Book Edition from Mama's own copy of the books, on her Mac.

The books are for personal use only, so their text never goes into this repository or online. This script holds no
book text: it reads the PDFs in the folder you give it (with pdftotext) and writes one JSON file OUTSIDE the
repository. That file is loaded on the iPad through Mama's view ("Load content pack").

    python3 -I scripts/book_edition.py "<folder with the PDFs>" "<output .json>"

What it keeps, exactly as printed (only the page footers removed and the lines of a paragraph joined):
  - each main book cut into the chapters and lessons of its table of contents;
  - each lesson cut into the book's own blocks (the opening text, Step 1, Step 2 ..., Discussion and so on), every line
    of every block, plus what can be read from it: word groups, sentences, story lines, rhymes, questions;
  - the printouts, the story book, the bingo cards, the rhymes, the sight-word list and the worksheet instructions,
    page by page.
A final check makes sure every line of every book landed in exactly one place.
"""
import json, re, subprocess, sys, os, unicodedata
from collections import OrderedDict

FILES = OrderedDict([
    ('stage1', 'Children-Learning-Reading-Stage-1.pdf'),
    ('stage2', 'Children-Learning-Reading-Stage-2.pdf'),
    ('printouts1', 'Stage-1-Lesson-Printouts.pdf'),
    ('printouts2', 'Stage-2-Lesson-Printouts.pdf'),
    ('stories1', 'Stage-1-Lesson-Stories.pdf'),
    ('bingo', 'Reading-Bingo.pdf'),
    ('rhymes', 'Childrens-Favorite- Rhymes.pdf'),
    ('sightwords', 'The-Most-Common-Sight-Words.pdf'),
    ('worksheets', 'read-me-first-instructions-phonics-worksheets.pdf'),
])

# page footers and running heads, which are not part of the text
FOOTER = re.compile(r'^\s*(C\s*h\s*i\s*l\s*d\s*r\s*e\s*n\s+L\s*e\s*a\s*r\s*n\s*i\s*n\s*g\s+R\s*e\s*a\s*d\s*i\s*n\s*g\s*\|\s*\d+'
                    r'|ChildrenLearningReading\.com\s*(Page\s*)?\|\s*\d+'
                    r'|Copyright Jim Yang & ChildrenLearningReading\.com'
                    r'|Children\'s Favorite Nursery Rhymes)\s*$', re.I)
STEP = re.compile(r'^(Step\s+\d+[a-z]?)\s*(?:[:\-–—.]\s*|\s+(?=[A-Z]))(.*)$')
BULLET = re.compile(r'^[•●▪\-\*]\s*')


def pages_of(pdf, layout=True):
    n = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout).group(1))
    txt = subprocess.run(['pdftotext'] + (['-layout'] if layout else []) + [pdf, '-'], capture_output=True, text=True).stdout
    out = txt.split('\f')[:n]
    return out + [''] * (n - len(out))


def lines_of(page):
    """The page's lines without footers, each as (indent, text). Blank lines are kept as None (paragraph breaks)."""
    out = []
    for raw in page.replace('\f', '').split('\n'):
        if FOOTER.match(raw):
            continue
        t = raw.rstrip()
        if not t.strip():
            out.append(None)
            continue
        ind = len(t) - len(t.lstrip(' '))
        out.append((ind, re.sub(r' {2,}', ' ', t.strip())))
    while out and out[-1] is None:
        out.pop()
    while out and out[0] is None:
        out.pop(0)
    return out


def fold(s):
    s = unicodedata.normalize('NFKC', s).replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    return re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip()


# ---------------------------------------------------------------------------------------------------------------------
# The table of contents of a main book: [(heading, page, depth)]
# ---------------------------------------------------------------------------------------------------------------------
def toc(pages, first, last):
    out = []
    for p in range(first, last + 1):
        for ln in lines_of(pages[p - 1]):
            if not ln:
                continue
            ind, t = ln
            m = re.match(r'^(.*?)\s*\.{3,}\s*(\d+)\s*$', t) or re.match(r'^(.*?\S)\s{1,}(\d+)\s*$', t)
            if not m:
                continue
            h, pg = m.group(1).strip(' .'), int(m.group(2))
            if not h or h.lower().startswith(('table of contents', 'important copyright')):
                continue
            out.append((h, pg, 1 if ind >= 1 else 0))
    return out


def find_heading(pages, h, pg, after=None):
    """(page, line index) where heading h starts, on page pg or the pages near it."""
    key = fold(h)
    key = key[:60]
    for p in [pg, pg + 1, pg - 1, pg + 2]:
        if p < 1 or p > len(pages):
            continue
        ls = lines_of(pages[p - 1])
        for i, ln in enumerate(ls):
            if not ln:
                continue
            if after and (p, i) <= after:
                continue
            f = fold(ln[1])
            if f.startswith(key) or (len(key) > 8 and key.startswith(f) and len(f) > 0.6 * len(key)):
                return (p, i)
    return None


def cut(pages, entries, end_page, start_page=None):
    """Each entry's lines (with page numbers), from its heading to the next entry's heading."""
    marks = []
    last = (0, -1)
    for h, pg, depth in entries:
        at = find_heading(pages, h, pg, after=last)
        if at:
            marks.append((h, pg, depth, at))
            last = at
        else:
            marks.append((h, pg, depth, None))
    found = [m for m in marks if m[3]]
    out = []
    if found and start_page and found[0][3] > (start_page, 0):    # text before the first heading (e.g. "Dear Parent")
        body, p = [], start_page
        while (p, 0) < found[0][3]:
            ls = lines_of(pages[p - 1])
            for i, ln in enumerate(ls):
                if (p, i) < found[0][3]:
                    body.append((p, ln))
            p += 1
        first = next((ln[1] for _, ln in body if ln), 'Front matter')
        out.append({'heading': first.rstrip(','), 'toc_page': start_page, 'depth': 0, 'lines': body})
    for k, (h, pg, depth, at) in enumerate(found):
        stop = found[k + 1][3] if k + 1 < len(found) else (end_page + 1, 0)
        body = []
        p, i = at
        while (p, i) < stop and p <= end_page:
            ls = lines_of(pages[p - 1])
            while i < len(ls) and (p, i) < stop:
                body.append((p, ls[i]))
                i += 1
            p, i = p + 1, 0
        out.append({'heading': h, 'toc_page': pg, 'depth': depth, 'lines': body})
    missing = [m[0] for m in marks if not m[3]]
    return out, missing


# ---------------------------------------------------------------------------------------------------------------------
# Text of a block: paragraphs and bullet items, exactly as printed
# ---------------------------------------------------------------------------------------------------------------------
def join(a, b):
    if a.endswith('-') and b[:1].islower():
        return a + b
    return a + ' ' + b


def paragraphs(lines):
    """[(kind, text, indent, page)]: kind 'p' paragraph, 'b' bullet item."""
    out, cur = [], None
    for p, ln in lines:
        if ln is None:
            cur = None
            continue
        ind, t = ln
        if (BULLET.match(t) and not t.startswith('--')) or re.match(r'^o\s+(?=[a-z])', t):
            t = re.sub(r'^o\s+', '', t) if re.match(r'^o\s+(?=[a-z])', t) else t
            cur = ['b', BULLET.sub('', t), ind, p]
            out.append(cur)
            continue
        if cur is not None and (cur[0] == 'b' and ind > cur[2] or cur[0] == 'p' and (abs(ind - cur[2]) <= 3 or ind < cur[2] and cur[4]) and not STEP.match(t)):
            cur[1] = join(cur[1], t)
            if cur[0] == 'p':
                cur[2], cur[4] = min(cur[2], ind), False
            continue
        cur = ['p', t, ind, p, True]          # True: the next line may sit further left (a first-line indent)
        out.append(cur)
        continue
    return [tuple(x[:4]) for x in out]


UPPER_LINE = re.compile(r"^[A-Z0-9'’ ,.!?;:\-\"“”()]+$")


def is_upper_sentence(t):
    letters = re.sub(r'[^A-Za-z]', '', t)
    return len(letters) >= 2 and UPPER_LINE.match(t) is not None and letters.isupper()


def words_in(t):
    t = re.sub(r'^\s*(Optional\s+)?(Sight\s+)?Words?\s*(\([^)]*\))?\s*[:\-–—]\s*', '', t, flags=re.I)
    t = re.split(r'(?<=[a-zA-Z])\.\s+[A-Z]', t)[0]
    ws = [w.strip(' .;') for w in re.split(r',|\band\b', t) if w.strip(' .;')]
    return [w for w in ws if re.match(r"^[A-Za-z'’_]+(\s[A-Za-z'’_]+)?$", w) and len(w) <= 24]


KINDS = [   # the step's first line (after "Step N:") decides its kind; first match wins
    ('sight_word', r'^sight words|first sight word'),
    ('word_pairs', r'word pairs'),
    ('sentences', r'sentence'),
    ('words', r'^\(optional\)\s*:?\s*words|^words\b|^teach (the )?words|^now teach .*words|^teach .*\bwords\b|^teach [A-Z]+ and [A-Z]+ to|^we will start with'),
    ('questions', r'comprehension'),
    ('story', r'\bstory\b'),
    ('rhyme', r'\brhyme'),
    ('difference', r"what.s the difference"),
    ('addition_substitution', r'phoneme addition'),
    ('dictation', r'spell that word'),
    ('talk_about_sound', r'talk about that sound'),
    ('stretchy_words', r'stretchy'),
    ('trace', r'\btrac(e|ing)\b|practice writing'),
    ('review', r'^review|^quickly review'),
    ('new_sound', r'^teach|^the (sound|letter|proper)|^this is the|^n is a|^in (this|lesson|our|the final)|^we (teach|introduce)|^a new letter|^continuing|^when teaching your child the letter|^so far|^combining flashcards|^now (show|we)|^once you|^i hope'),
]


def kind_of(first):
    f = first.strip().lower()
    for k, rx in KINDS:
        if re.search(rx, f):
            return k
    return 'other'


LIST_ITEM = re.compile(r"^[A-Za-z'’_]+( [A-Za-z'’_]+)?$")


def word_list(t):
    """'bee, beep, see' -> ['bee', 'beep', 'see'] when the text is only a list of words, else None."""
    t = re.split(r'\s+Note\s*:', t)[0].strip().rstrip('.,; ')
    ws = [w.strip(' .;') for w in t.split(',')]
    ws = [w for w in ws if w]
    if len(ws) >= 1 and all(LIST_ITEM.match(w) and len(w) <= 20 for w in ws):
        return ws
    if len(ws) >= 2 and all(LIST_ITEM.match(w) for w in ws[:-1]) and LIST_ITEM.match(ws[-1].split(' ')[0]):
        return ws
    return None


def split_note(t):
    m = re.search(r'\s+(Note\s*:.*|\(Note\s*:.*\))$', t)
    return (t[:m.start()].strip(), m.group(1)) if m else (t, None)


def block(label, lines, stage, lesson):
    paras = paragraphs(lines)
    pages = sorted({p for p, ln in lines if ln})
    text_parts = [('• ' if k == 'b' else '') + t for k, t, ind, p in paras]
    first = paras[0][1] if paras else ''
    m = STEP.match(first)
    rest = m.group(2) if m else first
    kind = kind_of(re.split(r'(?<=[.!?:])\s', rest)[0][:110]) if m else ('discussion' if label == 'Discussion' else 'opening' if label == 'opening' else 'section')
    title = re.split(r'[:–—.]|\s-\s', rest, maxsplit=1)[0].strip() if m else label
    b = OrderedDict(label=label, title=title if len(title) <= 48 else '', kind=kind,
                    optional=bool(m and re.search(r'\boptional\b', rest[:40].lower())),
                    pages=[pages[0], pages[-1]] if pages else [], text=text_parts)
    groups, pairs, sents, notes, qs = [], [], [], [], []
    if kind in ('words', 'sight_word', 'review', 'word_pairs'):
        head = re.sub(r'^\s*\(optional\)\s*:?\s*', '', rest, flags=re.I)
        head = re.sub(r'^(Sight\s+)?Words?\s*[:\-–—]\s*', '', head, flags=re.I)
        wl = word_list(head)
        if wl:
            groups.append(wl)
    lowercase = stage == 2 or lesson >= 25
    for k, t, ind, p in (paras[1:] if m else paras):
        if k == 'b':
            if kind in ('words', 'sight_word', 'review', 'new_sound') and word_list(t):
                groups.append(word_list(t))
            elif kind == 'word_pairs' and re.match(r"^[A-Za-z']+ [–\-] [A-Za-z']+$", t):
                pairs.append(re.split(r' [–\-] ', t))
            elif kind == 'questions':
                qs += [x.strip() for x in re.split(r'\s+o\s+(?=[A-Z])', t) if x.strip()]
            elif kind in ('sentences', 'story', 'rhyme') or (not lowercase and is_upper_sentence(t)):
                if not t.startswith(('"', '“')):
                    st, note = split_note(t)
                    sents.append(st)
                    if note:
                        notes.append({'after': len(sents) - 1, 'text': note})
        elif kind == 'questions' and '?' in t:
            qs += [x.strip() for x in re.split(r'(?:^|\s+)o\s+(?=[A-Z])', t) if x.strip()]
        elif t.startswith('(') and sents:
            notes.append({'after': len(sents) - 1, 'text': t})
    if groups:
        b['groups'] = groups
    if pairs:
        b['pairs'] = pairs
    if sents and kind not in ('story', 'rhyme'):
        b['sentences'] = sents
    if notes:
        b['notes'] = notes
    if qs:
        b['questions'] = qs
    if kind in ('story', 'rhyme'):
        body = []
        for p, x in lines[1:]:
            if not x or STEP.match(x[1]):
                continue
            ind, t = x
            if lowercase:
                if ind >= 3 or (len(t) < 62 and not t.endswith(',') and re.search(r'[.!?;:"”]$', t)):
                    body.append(t)
            elif is_upper_sentence(t):
                body.append(t)
        if body:
            b['lines'] = body
    return b


def lesson_blocks(lines, stage, lesson, subs):
    """A lesson's lines cut into the book's blocks: the opening, each Step, and each sub-heading of the contents."""
    blocks, cur, label = [], [], 'opening'
    lines = lines[1:]                            # the heading line itself is the lesson heading
    words_line = []
    k = 0
    while k < len(lines) and lines[k][1] and re.match(r'^(Words|Sight Words)\s*[:\-–]', lines[k][1][1]):
        words_line.append(lines[k][1][1])
        k += 1
        while k < len(lines) and lines[k][1] and not re.match(r'^(Step|Lesson|Discussion|Review)', lines[k][1][1]) and len(lines[k][1][1]) < 70 and (',' in lines[k][1][1] or words_line[-1].rstrip().endswith(',')):
            words_line[-1] += ' ' + lines[k][1][1]
            k += 1
    keys = [(fold(h), h) for h in subs]
    for p, ln in lines[k:]:
        t = ln[1] if ln else ''
        new = None
        if ln and ln[0] <= 2:
            if STEP.match(t):
                new = STEP.match(t).group(1)
            elif re.match(r'^Discussion\s*:', t):
                new = 'Discussion'
            else:
                f = fold(t)
                hit = next((h for key, h in keys if key and f.startswith(key)), None)
                if hit:
                    new = hit.rstrip(':')
        if new:
            if any(x for _, x in cur):
                blocks.append(block(label, cur, stage, lesson))
            cur, label = [], new
        cur.append((p, ln))
    if any(x for _, x in cur):
        blocks.append(block(label, cur, stage, lesson))
    return words_line, blocks


def main_book(pages, toc_pages, first_text_page, stage):
    entries = toc(pages, *toc_pages)
    secs, missing = cut(pages, entries, len(pages), first_text_page)
    lessons, chapters = [], []
    i = 0
    while i < len(secs):
        s = secs[i]
        m = re.match(r'^Lesson\s+(\d+)\s*[:\-–]\s*(.*)$', s['heading'])
        if m and s['lines'] and s['lines'][0][1][1].lower().startswith('lesson'):
            k = int(m.group(1))
            lines, subs = list(s['lines']), []
            while i + 1 < len(secs) and secs[i + 1]['depth'] == 1:
                i += 1
                subs.append(secs[i]['heading'])
                lines += secs[i]['lines']
            n = k if stage == 1 else 32 + k
            wl, bl = lesson_blocks(lines, stage, n, subs)
            lessons.append(OrderedDict(n=n, stage=stage, book_lesson=k, heading=lines[0][1][1], toc_title=m.group(2).strip(),
                                       pages=[lines[0][0], lines[-1][0]], words_line=wl, blocks=bl))
        else:
            paras = paragraphs(s['lines'])
            chapters.append(OrderedDict(heading=s['heading'], depth=s['depth'],
                                        pages=[s['lines'][0][0], s['lines'][-1][0]] if s['lines'] else [],
                                        text=[('• ' if k2 == 'b' else '') + t for k2, t, ind, p in paras]))
        i += 1
    return lessons, chapters, missing, secs


def paged(pages, layout_pages=None):
    """A supplementary file, page by page: every line exactly."""
    out = []
    for i, pg in enumerate(pages, 1):
        ls = [x[1] for x in lines_of(pg) if x]
        out.append({'page': i, 'lines': ls, 'image_only': len(''.join(ls).replace(' ', '')) < 40})
    return out


def sets_by_marker(pg, marker):
    """Group a supplementary file's pages into sets, each starting at a page whose first line matches marker."""
    out, cur = [], None
    for x in pg:
        first = x['lines'][0] if x['lines'] else ''
        m = re.match(marker, first)
        if m:
            cur = {'title': first, 'pages': [x['page']], 'lines': x['lines'][1:] if len(x['lines']) > 1 else [], 'picture_pages': []}
            out.append(cur)
        elif cur is not None:
            cur['pages'].append(x['page'])
            if x['image_only']:
                cur['picture_pages'].append(x['page'])
            cur['lines'] += x['lines']
    return out


def lessons_named(title, stage):
    """'Lesson 7 - 9' -> [7, 8, 9]; 'Lesson 11 and 12' -> [11, 12]; Stage 2 lesson k -> 32 + k."""
    ns = [int(x) for x in re.findall(r'\d+', title)]
    if re.search(r'\d+\s*(-|to)\s*\d+', title) and len(ns) >= 2:
        ns = list(range(ns[0], ns[1] + 1))
    return [n + (32 if stage == 2 else 0) for n in ns]


def supplements(P):
    pg = {k: paged(P[k]) for k in ('printouts1', 'printouts2', 'stories1', 'bingo', 'rhymes', 'sightwords', 'worksheets')}
    f1 = sets_by_marker(pg['printouts1'], r'^Lesson\s+\d+')
    for x in f1:
        x['for_lessons'] = lessons_named(x['title'], 1)
    f2 = sets_by_marker([x for x in pg['printouts2'] if x['page'] >= 6], r'^(Lesson\s+\d+|Silent)')
    for x in f2:
        x['for_lessons'] = lessons_named(x['title'], 2) if x['title'].startswith('Lesson') else []
    st = sets_by_marker(pg['stories1'], r'^\d+\s*-\s*\S')
    for x in st:
        x['for_lessons'] = [int(re.match(r'^(\d+)', x['title']).group(1))]
        x['colour_pages'] = [p for p in x['pages'] if any(re.match(r'^Please colou?r', l) for l in pg['stories1'][p - 1]['lines'])]
    bg = sets_by_marker(pg['bingo'], r'^Stage\s+\d')
    for x in bg:
        st2 = 2 if x['title'].startswith('Stage 2') else 1
        ns = [int(v) for v in re.findall(r'\d+', x['title'])[1:]]
        x['for_lessons'] = ([n + (32 if st2 == 2 else 0) for n in range(ns[0], ns[-1] + 1)] if len(ns) >= 2
                            else list(range(1, ns[0] + 1)) if ns else [])
    rh = [{'title': h, 'page': p} for h, p, d in toc([x and P['rhymes'][i] for i, x in enumerate(P['rhymes'])], 2, 4)
          if not h.lower().startswith(('table of contents', 'important'))]
    return {'pages': pg, 'flashcards_stage1': f1, 'printouts_stage2': f2, 'stories_stage1': st, 'bingo': bg, 'rhymes': rh}


def check_complete(name, pages, secs, start_page):
    """Every line from start_page on must sit in exactly one section."""
    want = []
    for p in range(start_page, len(pages) + 1):
        want += [(p, ln[1]) for ln in lines_of(pages[p - 1]) if ln]
    got = [(p, ln[1]) for s in secs for p, ln in s['lines'] if ln]
    gs = set(got)
    lost = [x for x in want if x not in gs]
    dup = len(got) - len(set(got))
    return {'file': name, 'lines': len(want), 'placed': len(gs & set(want)), 'lost': lost[:40], 'lost_count': len(lost), 'duplicated': dup}


def main(src, dst):
    if os.path.abspath(dst).startswith(os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))):
        sys.exit('The Book Edition must be written OUTSIDE the repository.')
    P = {k: pages_of(os.path.join(src, f)) for k, f in FILES.items()}
    report = []
    l1, c1, miss1, s1 = main_book(P['stage1'], (5, 8), 9, 1)
    l2, c2, miss2, s2 = main_book(P['stage2'], (5, 6), 7, 2)
    report.append(check_complete('stage1', P['stage1'], s1, 9))
    report.append(check_complete('stage2', P['stage2'], s2, 7))
    pack = OrderedDict(
        edition='book', title='Children Learning Reading (Jim Yang): Book Edition, for Maria only',
        private=True, note='Made on Mama\'s Mac from her own copy. Personal use only: never put this file online.',
        lessons=l1 + l2, chapters={'stage1': c1, 'stage2': c2},
        supplements=supplements(P),
        check={'toc_headings_not_found': {'stage1': miss1, 'stage2': miss2}, 'completeness': report})
    with open(dst, 'w', encoding='utf-8') as f:
        json.dump(pack, f, ensure_ascii=False, indent=1)
    # a short summary with no book text in it
    nb = sum(len(L['blocks']) for L in pack['lessons'])
    print(f"lessons {len(pack['lessons'])} ({len(l1)} + {len(l2)}), blocks {nb}, chapters {len(c1)} + {len(c2)}")
    for r in report:
        print(f"{r['file']}: {r['placed']} of {r['lines']} lines placed, {r['lost_count']} lost, {r['duplicated']} duplicated")
    print('TOC headings not found:', len(miss1), len(miss2))
    S = pack['supplements']
    print(f"stage 1 flashcard sets {len(S['flashcards_stage1'])}, stage 2 printouts {len(S['printouts_stage2'])}, "
          f"stories {len(S['stories_stage1'])}, bingo levels {len(S['bingo'])}, rhymes {len(S['rhymes'])}")


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
