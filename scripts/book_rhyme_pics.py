"""ماريا تقرأ, Book Edition: pictures for the nursery rhymes in the books' rhyme file (Stage 2), drawn in Khaled's ChatGPT
in the 3D style of the book story pictures (chat "Rhyme Pictures", started with a story picture as the reference).

    python3 -I scripts/book_rhyme_pics.py all       # every picture still to draw, as JSON [{name, prompt}] for the page queue
    python3 -I scripts/book_rhyme_pics.py take      # file the saved pictures from ~/Downloads and cut their panels
    python3 -I scripts/book_rhyme_pics.py status

PRIVATE, like the rest of the Book Edition: the plan (content/reads/book/rhyme-briefs.json, scenes in our own words), the
ChatGPT originals (content/reads/book/rhymes/orig/) and the cut pictures (content/reads/book/rhymes/<id>-<n>.webp).
Rhymes marked "ask" wait for Mama's decision and are not drawn.
"""
import glob, json, os, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOOK = os.path.join(ROOT, 'content', 'reads', 'book')
BRIEFS = os.path.join(BOOK, 'rhyme-briefs.json')
ORIG = os.path.join(BOOK, 'rhymes', 'orig')
OUT = os.path.join(BOOK, 'rhymes')
DL = os.path.expanduser('~/Downloads')
PY = os.path.expanduser('~/Downloads/06_Projects_and_Code/maria-tenses/.venv/bin/python')

STYLE = ('same soft 3D storybook style as the reference picture (rounded characters, warm gentle light, soft colours), '
         '{shape}, no text, letters, numbers or signs anywhere, and nothing frightening. Girls wear long modest dresses '
         'and women wear a headscarf and long modest clothes.')


def plan():
    return [r for r in json.load(open(BRIEFS, encoding='utf-8'))['rhymes'] if not r.get('ask')]


def name(r):
    return f"rhyme-{r['id']}.png"


def request(r):
    ps = r['panels']
    shape = ('two pictures side by side in one wide 3:2 image with a thin white gap between them' if len(ps) == 2
             else 'ONE single picture, wide 3:2')
    text = f"Next nursery rhyme picture ({r['title']}): {STYLE.format(shape=shape)}"
    if len(ps) == 2:
        return text + f" Left picture: {ps[0]}. Right picture: {ps[1]}."
    return text + f" The picture: {ps[0]}."


def done():
    return {os.path.basename(f) for f in glob.glob(os.path.join(ORIG, 'rhyme-*.png'))}


def cmd_all():
    have = done()
    print(json.dumps([{'name': name(r), 'prompt': request(r)} for r in plan() if name(r) not in have], ensure_ascii=False))


def cmd_take():
    os.makedirs(ORIG, exist_ok=True)
    rs = {name(r): r for r in plan()}
    for f in sorted(glob.glob(os.path.join(DL, 'rhyme-r*.png'))):
        n = os.path.basename(f)
        if n not in rs:
            print('not in the plan, left in Downloads:', n); continue
        r = rs[n]
        dest = os.path.join(ORIG, n); shutil.move(f, dest)
        ids = [f"{r['id']}-{i + 1}" for i in range(len(r['panels']))]
        subprocess.run([PY, '-I', os.path.join(ROOT, 'scripts', 'reads_story_pics.py'), '--out', OUT, dest, *ids], check=True)


def cmd_status():
    have = done(); rs = plan()
    print(f"{len([r for r in rs if name(r) in have])} of {len(rs)} rhyme pictures; cut: {len(glob.glob(os.path.join(OUT, '*.webp')))}")


if __name__ == '__main__':
    {'all': cmd_all, 'take': cmd_take, 'status': cmd_status}[sys.argv[1]]()
