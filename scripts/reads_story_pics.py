"""ماريا تقرأ: the stories' own pictures (her request, 21 Oct 2026), drawn in ChatGPT in the clay style of her apps.
Each ChatGPT picture holds two square panels side by side (two pages, so the characters stay the same) or one panel.

    python3 -I scripts/reads_story_pics.py PICTURE.png PAGE_ID [PAGE_ID]
    python3 -I scripts/reads_story_pics.py --out DIR PICTURE.png PAGE_ID [PAGE_ID]

--out writes somewhere else: the Book Edition's story pictures go to a private folder, never into assets/.

finds the white gap between the panels, cuts each panel, trims its white edge and writes
assets/reads/story/<page id>.webp (960 px tall). Then run scripts/make_reads.py, which shows them after she reads a page.
"""
import io, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'reads', 'story')
S = 960                                               # panel height in pixels


def panels(im, n):
    if n == 1:
        return [im]
    a = np.asarray(im.convert('L')).astype(np.int16)
    W = a.shape[1]
    # the column nearest the middle that is (almost) all white: the gap between the panels
    whiteness = (a > 238).mean(axis=0)
    mid = W // 2
    cand = [x for x in range(int(W * 0.35), int(W * 0.65)) if whiteness[x] > 0.97]
    cut = min(cand, key=lambda x: abs(x - mid)) if cand else mid
    return [im.crop((0, 0, cut, im.height)), im.crop((cut, 0, W, im.height))]


def trim(p):
    """take away the white border round a panel (rounded panels leave white corners: those stay, inside the square)"""
    a = np.asarray(p.convert('L')).astype(np.int16)
    rows = np.nonzero((a < 236).mean(axis=1) > 0.25)[0]
    cols = np.nonzero((a < 236).mean(axis=0) > 0.25)[0]
    if len(rows) and len(cols):
        p = p.crop((cols[0], rows[0], cols[-1] + 1, rows[-1] + 1))
    k = S / p.height                                  # the panel keeps its own shape (ChatGPT's are about 3:4)
    return p.resize((round(p.width * k), S), Image.LANCZOS)


def main(src, ids):
    os.makedirs(OUT, exist_ok=True)
    im = Image.open(src).convert('RGB')
    for pid, p in zip(ids, panels(im, len(ids))):
        q = trim(p)
        buf = io.BytesIO(); q.save(buf, 'WEBP', quality=84, method=6)
        open(os.path.join(OUT, pid + '.webp'), 'wb').write(buf.getvalue())
        print(pid, buf.tell() // 1024, 'KB')


if __name__ == '__main__':
    args = sys.argv[1:]
    if args[:1] == ['--out']:
        OUT = os.path.abspath(args[1]); args = args[2:]
    main(args[0], args[1:])
