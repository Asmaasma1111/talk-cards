"""ركن الرياضيات: the corner's pictures, drawn in ChatGPT (Khaled's chat "Create app icons image") in the glossy clay style of the
garden (her rule, 23 Oct 2026: "if there are any drawings, use ChatGPT"): one icon for each topic and the three geometry
tools. The measured diagrams (angles, lines, nets, segments) stay exact drawings made by the app, so the geometry is right.

    ~/Downloads/06_Projects_and_Code/maria-tenses/.venv/bin/python -I scripts/corner_pics.py

Reads (local only) content/algeria/corner/<sheet>-chatgpt.png, pictures on white in rows; writes assets/algeria/corner/<id>.webp.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from curiosity_tree import cutout, webp
from garden_pics import main_part, square

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'content', 'algeria', 'corner')
OUT = os.path.join(ROOT, 'assets', 'algeria', 'corner')
SHEETS = {   # the pictures in reading order, and how many stand in each row
    'icons1': (['words', 'x10', 'double', 'distrib', 'mul1', 'mul2', 'subadd', 'time'], [4, 4]),
    'icons2': (['length', 'mass', 'tools', 'midpoint', 'lines', 'program', 'net'], [4, 3]),
    'tools': (['ruler', 'square', 'compass'], [3]),
}

def columns(row, C):
    """the C pictures of a row: cut at the C-1 widest white gaps (ChatGPT does not keep to an even grid)"""
    a = np.asarray(row.convert('RGB')).astype(np.int16)
    ink = ((a.min(axis=2) < 212) | (a.max(axis=2) - a.min(axis=2) > 30)).any(axis=0)
    runs, x = [], 0
    while x < len(ink):
        if not ink[x]:
            s = x
            while x < len(ink) and not ink[x]:
                x += 1
            if s > 0 and x < len(ink):
                runs.append((x - s, s, x))
        x += 1
    cuts = sorted((s + e) // 2 for _, s, e in sorted(runs, reverse=True)[:C - 1])
    edges = [0] + cuts + [row.width]
    return [(edges[i], edges[i + 1]) for i in range(C)]


# the geometry drawn as on paper (her rule, 23 Oct 2026: "as we draw them on the paper"): pencil and ruler on squared paper.
# Kept on its paper (no cut-out), each cell of the 4 x 3 sheet as it is; checked exact before use.
PAPER = ['ang90a', 'ang45', 'ang135', 'ang90b', 'par', 'perp', 'cross', 'parv', 'net_cross', 'net_block', 'net_row', 'seg_mid']


def paper_sheet():
    p = os.path.join(SRC, 'geometry-paper-chatgpt.png')
    if not os.path.exists(p):
        return print('geometry-paper not drawn yet')
    src = Image.open(p).convert('RGB'); w, h = src.width // 4, src.height // 3
    for k, gid in enumerate(PAPER):
        c, r = k % 4, k // 4
        print('paper', gid, webp(src.crop((c * w, r * h, (c + 1) * w, (r + 1) * h)).resize((360, 320), Image.LANCZOS),
                                 os.path.join(OUT, f'{gid}.webp'), q=84), 'KB')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    paper_sheet()
    for sheet, (ids, per) in SHEETS.items():
        p = os.path.join(SRC, f'{sheet}-chatgpt.png')
        if not os.path.exists(p):
            print(sheet, 'not drawn yet'); continue
        src = Image.open(p).convert('RGB'); h = src.height // len(per); k = 0
        for r, C in enumerate(per):
            for x0, x1 in columns(src.crop((0, r * h, src.width, (r + 1) * h)), C):
                im, _ = cutout(src.crop((x0, r * h, x1, (r + 1) * h)))
                print(sheet, ids[k], webp(square(main_part(im), 320), os.path.join(OUT, f'{ids[k]}.webp')), 'KB'); k += 1
