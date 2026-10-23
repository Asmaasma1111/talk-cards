"""حديقة العالِمة ماريا: the garden's pictures, drawn in ChatGPT (Khaled's chat "Create app icons image") in the glossy clay
style of the question tree (her request, 23 Oct 2026: "fine tuned, similar to the tree in the questions app"). They take the
place of the SVG drawings in garden.js, one picture for each drawing id.

    ~/Downloads/06_Projects_and_Code/maria-tenses/.venv/bin/python -I scripts/garden_pics.py

Reads (local only) content/garden/<sheet>-chatgpt.png: sheets of separate pictures on white, in reading order (left to
right, top row first). Writes assets/garden/<id>.webp (400 px squares, standing on the bottom edge, like the drawings).
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from curiosity_tree import cutout, webp

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'content', 'garden')
OUT = os.path.join(ROOT, 'assets', 'garden')
SHEETS = {   # the drawing ids of garden.js, in the order they stand on each sheet
    'plants': ['p0', 'p1', 'p3', 'p4', 'pp', 'p5'],
    'fruits': ['rumF', 'rumP', 'rum', 'strF', 'strP', 'straw'],
    'cycles': ['b0', 'b1', 'b2', 'b3', 'f0', 'f1', 'f3', 'f4'],
    'animals': ['nest0', 'nest1', 'nest2', 'sparrow', 'hog', 'hopper', 'worm', 'leaves'],
    'things': ['humus', 'bee', 'can', 'sun', 'cloud', 'tree', 'mag'],
}

TOL = {'cloud': 2}
GRID = {'things': [4, 3]}   # pictures in each row      # a white cloud: only the pure white page around it is background


def pieces(im, n):
    """the n pictures on a sheet: the n biggest blobs of colour, in reading order"""
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    ink = (a.min(axis=2) < 212) | (a.max(axis=2) - a.min(axis=2) > 30)     # not the pale grey shadows under them
    base = nd.binary_closing(ink, iterations=6)
    big = lambda lab, k: [i + 1 for i, v in enumerate(nd.sum(np.ones_like(lab), lab, range(1, k + 1))) if v > lab.size * 0.008]
    for grow in (10, 6, 3, 1):        # pictures close together: grow less, so they stay apart (specks do not count)
        ink = nd.binary_dilation(base, iterations=grow)
        lab, k = nd.label(ink)
        if len(big(lab, k)) >= n:
            break
    sizes = nd.sum(ink, lab, range(1, k + 1))
    keep = sorted(np.argsort(sizes)[::-1][:n] + 1)
    boxes = [nd.find_objects((lab == i).astype(int))[0] for i in keep]
    boxes = [(b[1].start, b[0].start, b[1].stop, b[0].stop) for b in boxes]
    # rows: pictures whose vertical middles are close belong to one row
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows, cur = [], []
    for b in boxes:
        if cur and (b[1] + b[3]) / 2 - (cur[-1][1] + cur[-1][3]) / 2 > im.height * 0.18:
            rows.append(cur); cur = []
        cur.append(b)
    rows.append(cur)
    return [b for row in rows for b in sorted(row, key=lambda b: b[0])]


def main_part(im):
    """only the picture itself: bits of a neighbour at the crop's edge are taken away"""
    a = np.asarray(im).copy(); solid = a[..., 3] > 40
    lab, k = nd.label(nd.binary_dilation(solid, iterations=12))
    if k > 1:
        sizes = nd.sum(solid, lab, range(1, k + 1)); keep = lab == (int(np.argmax(sizes)) + 1)
        a[..., 3] = np.where(keep, a[..., 3], 0)
    return Image.fromarray(a, 'RGBA')


def square(im, size, pad=0.04):
    bb = im.getbbox(); im = im.crop(bb)
    s = int(max(im.size) * (1 + 2 * pad)); c = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    c.paste(im, ((s - im.width) // 2, s - im.height - int(s * pad * .5)))     # stands on the bottom edge
    return c.resize((size, size), Image.LANCZOS)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    done = []
    for sheet, ids in SHEETS.items():
        p = os.path.join(SRC, f'{sheet}-chatgpt.png')
        if not os.path.exists(p):
            print(sheet, 'not drawn yet'); continue
        src = Image.open(p).convert('RGB')
        if sheet in GRID:                 # touching pictures and a white cloud: cut by the sheet's grid instead
            per = GRID[sheet]; h = src.height // len(per); bs = []
            for r, C in enumerate(per):
                w = src.width // C; bs += [(c * w, r * h, (c + 1) * w, (r + 1) * h) for c in range(C)]
        else:
            bs = pieces(src, len(ids))
        if len(bs) != len(ids):
            print(sheet, f'found {len(bs)} pictures, wants {len(ids)}: check it'); continue
        for gid, (x0, y0, x1, y1) in zip(ids, bs):
            m = 6
            crop = src.crop((max(0, x0 - m), max(0, y0 - m), min(src.width, x1 + m), min(src.height, y1 + m)))
            im, _ = cutout(crop, tol=TOL.get(gid, 14))
            im = main_part(im)
            kb = webp(square(im, 400), os.path.join(OUT, f'{gid}.webp'))
            done.append(gid); print(sheet, gid, kb, 'KB')
    print(len(done), 'pictures:', ' '.join(done))
