"""Maria Reads: build the private content pack (Book Edition) that Mama loads on the iPad.

    python3 -I scripts/build_pack.py "<maria-reads-book-edition.json>" "<output pack .json>"

The first file is made by scripts/book_edition.py from Mama's own PDFs. This script holds no book text: it takes the
book's blocks from that file and puts them in the app's own layout (the same as reads.json), lesson by lesson. The
pack must stay OUT of the repository and off the internet; the app keeps it in the iPad's own database.

What the pack carries so far (Phase 1):
  - every lesson's tutor note: the book's own blocks for that lesson (opening, each step, discussion), exactly;
  - lessons 1 to 3: the book's stretchy words for the "heard only" step;
  - the reference pages: the book's chapters on sounds, blending, routine, motivation, reading direction and more.
Later phases add the book's word lists, sentences and stories (and their recorded voice) here.
"""
import json, os, re, sys, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
# which of the books' chapters Mama's reference pages show: a private list kept next to the Book Edition
# (reference-chapters.json, chapter headings in the order to show them), so no book text sits in this repository
def reference_list(src):
    f = os.path.join(os.path.dirname(os.path.abspath(src)), 'reference-chapters.json')
    return json.load(open(f, encoding='utf-8')) if os.path.exists(f) else []


def stretch_words(lesson):
    """The book's stretchy words (heard only): the word on a line of its own, 'Word: X', and the 'other word suggestions'."""
    out = []
    for b in lesson['blocks']:
        text = b['text']
        if not any('slowly' in t.lower() for t in text):
            continue
        for t in text:
            t = t.strip()
            m = re.match(r'^(?:Word:\s*)?([A-Z]{2,8})$', t)
            if m:
                out.append(m.group(1).lower())
            m = re.match(r'^Other word suggestions?:\s*(.+)$', t, re.I)
            if m:
                out += [w.strip(' .').lower() for w in m.group(1).split(',') if re.fullmatch(r'[A-Za-z]{2,10}', w.strip(' .'))]
    seen = []
    for w in out:
        if w not in seen:
            seen.append(w)
    return seen


def main(src, dst):
    if os.path.abspath(dst).startswith(REPO + os.sep):
        sys.exit('The pack must be written OUTSIDE the repository.')
    B = json.load(open(src, encoding='utf-8'))
    pub = json.load(open(os.path.join(REPO, 'reads.json'), encoding='utf-8'))
    lessons = {}
    for L in B['lessons']:
        n = L['n']
        notes = [{'title': b['label'] if b['label'] != 'opening' else 'Before the steps', 'text': b['text']} for b in L['blocks'] if b['text']]
        x = {'notes': notes}
        P = pub['lessons'][n - 1]
        if n <= 3 and P.get('beats'):
            ws = stretch_words(L)
            if ws:
                x['beats'] = [['stretch', *ws] if b[0] == 'stretch' else b for b in P['beats']]
        lessons[str(n)] = x
    chapters = B['chapters']['stage1'] + B['chapters']['stage2']
    byhead = {c['heading']: c for c in chapters}
    reference = [{'heading': h, 'text': byhead[h]['text']} for h in reference_list(src) if h in byhead and byhead[h]['text']]
    pack = {'app': 'maria-reads', 'edition': 'book', 'v': 1, 'title': 'Children Learning Reading: Book Edition',
            'made': datetime.date.today().isoformat(), 'private': 'For Maria only. Never put this file online.',
            'lessons': lessons, 'reference': reference, 'clips': {}}
    with open(dst, 'w', encoding='utf-8') as f:
        json.dump(pack, f, ensure_ascii=False, separators=(',', ':'))
    # a summary with no book text
    print(f"pack: {len(lessons)} lessons with tutor notes ({sum(len(x['notes']) for x in lessons.values())} blocks), "
          f"{len(reference)} reference chapters, stretchy words for lessons "
          f"{', '.join(str(n) for n in (1, 2, 3) if 'beats' in lessons[str(n)])}; {os.path.getsize(dst) // 1024} KB")


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
