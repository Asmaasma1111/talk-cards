"""كتاب ألغازي: the puzzle book drawn in ChatGPT (her request, 26 Oct 2026: "beautify the puzzle book... it's outdated, use
ChatGPT"): the clay cover and the clay page, each with an empty white frame where her finished puzzle is shown.

    ~/Downloads/06_Projects_and_Code/maria-tenses/.venv/bin/python -I scripts/book_art.py

Reads (local only) content/reads/book/cover-chatgpt.png and page-chatgpt.png; writes assets/reads/book/cover.webp and
page.webp (1200 x 800, the white around the book made transparent) and prints where the empty frame and the title band
sit, in % of the picture, for style.css (.rb-cover, .rb-pg).
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from curiosity_tree import cutout, webp

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'content', 'reads', 'book')
OUT = os.path.join(ROOT, 'assets', 'reads', 'book')


def window(im):
    """the empty frame: the biggest pure white patch that does not touch the edge of the picture"""
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    white = (a.min(axis=2) > 238) & (a.max(axis=2) - a.min(axis=2) < 12)
    lab, k = nd.label(white)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    sizes = nd.sum(white, lab, range(1, k + 1))
    best = max((i + 1 for i in range(k) if i + 1 not in edge), key=lambda i: sizes[i - 1])
    ys, xs = np.nonzero(lab == best); h, w = white.shape
    return [round(100 * v, 1) for v in (xs.min() / w, ys.min() / h, (xs.max() + 1) / w, (ys.max() + 1) / h)]


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name in ('cover', 'page'):
        p = os.path.join(SRC, f'{name}-chatgpt.png')
        if not os.path.exists(p):
            print(name, 'not drawn yet'); continue
        src = Image.open(p).convert('RGB').resize((1200, 800), Image.LANCZOS)
        print(name, 'frame (left, top, right, bottom %):', window(src))
        im, _ = cutout(src)
        print(name, webp(im, os.path.join(OUT, f'{name}.webp'), q=84), 'KB')
