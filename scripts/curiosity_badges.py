"""علبة الفضول: cut the round badges out of a ChatGPT sheet (badges in one row on a white background).

    python -I scripts/curiosity_badges.py content/curiosity/phases/phase2-chatgpt.png game big dinner

The white that touches the edge of the sheet becomes transparent (white inside a badge, like the plate, stays); each
badge is cut at the empty columns between them and saved 320 px tall as assets/curiosity/phases/<name>.webp.
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src, names = sys.argv[1], sys.argv[2:]
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(int)
white = (a.min(axis=2) > 236)
lab, _ = ndimage.label(white)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(edge))
alpha = Image.fromarray(np.where(bg, 0, 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))
rgba = im.copy(); rgba.putalpha(alpha)
cols = (~bg).sum(axis=0) > 3
runs, start = [], None
for x, on in enumerate(list(cols) + [False]):
    if on and start is None:
        start = x
    if not on and start is not None:
        if x - start > 60:
            runs.append((start, x))
        start = None
if len(runs) != len(names):
    sys.exit(f'found {len(runs)} badges, expected {len(names)}: {runs}')
for (x0, x1), name in zip(runs, names):
    part = rgba.crop((x0, 0, x1, rgba.height))
    part = part.crop(part.getbbox())
    pad = 6
    out = Image.new('RGBA', (part.width + 2 * pad, part.height + 2 * pad)); out.paste(part, (pad, pad))
    out = out.resize((round(out.width * 320 / out.height), 320), Image.LANCZOS)
    path = os.path.join(ROOT, 'assets', 'curiosity', 'phases', f'{name}.webp')
    out.save(path, 'WEBP', quality=88, method=6)
    print(name, out.size, os.path.getsize(path) // 1024, 'KB')
