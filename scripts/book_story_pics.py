"""ماريا تقرأ, Book Edition: pictures for the book's 25 stories, drawn in Khaled's ChatGPT (chat "Create Story Pictures").

    python3 -I scripts/book_story_pics.py next      # the next request to send ChatGPT, and the file name to save it as
    python3 -I scripts/book_story_pics.py take      # file the saved pictures from ~/Downloads and cut their panels
    python3 -I scripts/book_story_pics.py all       # every request still to send, as JSON (for a queue on the ChatGPT page)
    python3 -I scripts/book_story_pics.py status

Everything stays PRIVATE, like the Book Edition: the plan (content/reads/book/story-briefs.json, scenes in our own
words, one panel per sentence), the ChatGPT originals (content/reads/book/story/) and the cut pages
(content/reads/book/pages/<story>-<n>.webp). content/ is never committed, and nothing here holds the book's text.
"""
import glob, json, os, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOOK = os.path.join(ROOT, 'content', 'reads', 'book')
BRIEFS = os.path.join(BOOK, 'story-briefs.json')
ORIG = os.path.join(BOOK, 'story')
PAGES = os.path.join(BOOK, 'pages')
DL = os.path.expanduser('~/Downloads')
PY = os.path.expanduser('~/Downloads/06_Projects_and_Code/maria-tenses/.venv/bin/python')

CAST = {'dad': 'Dad is the same Saudi dad as in our earlier pictures (red-and-white shemagh, white thobe, short black beard)',
        'mum': 'Mum is the same mum as before (pink hijab, kind smile)',
        'girl': 'the girl is the same little girl in purple as before (long dark wavy hair, purple clothes)',
        'pup': 'the dog is the same fluffy cream pup as before'}
STYLE = ('same 3D style as before, {shape}, no text, letters, numbers or signs anywhere, and nothing frightening')


def plan():
    return json.load(open(BRIEFS, encoding='utf-8'))


def jobs():
    """[(file name, story, first panel number, panels)]: two panels a picture, the last one alone when a story is odd"""
    out = []
    for s in plan()['stories']:
        ps = s['panels']
        for k in range(0, len(ps), 2):
            two = ps[k:k + 2]
            name = f"book-{s['id']}-{k + 1}" + (f"-{k + 2}" if len(two) == 2 else '') + '.png'
            out.append((name, s, k + 1, two))
    return out


def done():
    return {os.path.basename(f) for f in glob.glob(os.path.join(ORIG, 'book-*.png'))}


def request(s, two, first=1):
    cast = [CAST[c] for c in s.get('cast', [])]
    shape = ('two pictures side by side in one wide 3:2 image with a thin white gap between them' if len(two) == 2
             else 'ONE single picture only, tall 2:3')
    text = f"Next: {STYLE.format(shape=shape)}."
    if cast:
        text += ' ' + '; '.join(cast) + '.'
    if s.get('look'):          # after a story's first picture its new characters are the ones already drawn
        text += ' ' + (s['look'] if first == 1 else s['look'].replace('is a new character,', 'is the same as in the last picture,')
                       .replace('are two new boys', 'are the same two boys as in the last picture'))
    if len(two) == 2:
        text += f" Left picture: {two[0]}. Right picture: {two[1]}."
    else:
        text += f" The picture: {two[0]}."
    return text


def cmd_next():
    have = done()
    todo = [j for j in jobs() if j[0] not in have]
    if not todo:
        print('all pictures done'); return
    name, s, first, two = todo[0]
    print('SAVE AS:', name)
    print(request(s, two, first))


def cmd_all():
    """every picture still to draw, as JSON [{name, prompt}], for a queue on the ChatGPT page"""
    have = done()
    print(json.dumps([{'name': n, 'prompt': request(s, two, first)} for n, s, first, two in jobs() if n not in have], ensure_ascii=False))


def cmd_take():
    os.makedirs(ORIG, exist_ok=True); os.makedirs(PAGES, exist_ok=True)
    names = {j[0]: j for j in jobs()}
    for f in sorted(glob.glob(os.path.join(DL, 'book-L*.png'))):
        n = os.path.basename(f)
        if n not in names:
            print('not in the plan, left in Downloads:', n); continue
        _, s, first, two = names[n]
        dest = os.path.join(ORIG, n); shutil.move(f, dest)
        ids = [f"{s['id']}-{first + i}" for i in range(len(two))]
        subprocess.run([PY, '-I', os.path.join(ROOT, 'scripts', 'reads_story_pics.py'), '--out', PAGES, dest, *ids], check=True)


def cmd_status():
    have = done(); js = jobs()
    print(f"{len([j for j in js if j[0] in have])} of {len(js)} pictures; pages cut: {len(glob.glob(os.path.join(PAGES, '*.webp')))}")


if __name__ == '__main__':
    {'next': cmd_next, 'all': cmd_all, 'take': cmd_take, 'status': cmd_status}[sys.argv[1]]()
