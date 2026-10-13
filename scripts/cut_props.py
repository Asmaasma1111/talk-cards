"""Cut the separate objects out of a transparent PNG made by the picture tool (one object per connected blob of opaque pixels).
python3 scripts/cut_props.py content/library-design/props/sheet1.png window plant
Names go from left to right. Each object is trimmed and saved as content/library-design/props/<name>.png (full quality)
and assets/library/<name>.webp (for the app)."""
import os, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src, names = sys.argv[1], sys.argv[2:]
im = Image.open(src).convert('RGBA'); W, H = im.size
a = im.getchannel('A').point(lambda v: 255 if v > 40 else 0)
# columns that hold any opaque pixel: the gaps between objects are empty columns
cols = [any(a.getpixel((x, y)) for y in range(0, H, 3)) for x in range(W)]
spans, x = [], 0
while x < W:
    if cols[x]:
        s = x
        while x < W and (cols[x] or any(cols[x:x + 12])): x += 1
        if x - s > 20: spans.append((s, x))
    else: x += 1
if len(spans) != len(names): sys.exit(f'found {len(spans)} objects {spans}, expected {len(names)}')
os.makedirs(os.path.join(ROOT, 'assets', 'library'), exist_ok=True)
for (s, e), name in zip(spans, names):
    part = im.crop((s, 0, e, H)); part = part.crop(part.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    part.save(os.path.join(ROOT, 'content', 'library-design', 'props', f'{name}.png'))
    part.save(os.path.join(ROOT, 'assets', 'library', f'{name}.webp'), 'WEBP', quality=86, method=6)
    print(name, part.size)
