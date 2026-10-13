"""Split a tall picture holding two stacked 4:3 pages (with a white gap) into two pages.
python3 scripts/split_pair.py content/pairs/d02-pair1.png d02 p01 p02
Saves content/pages/<day>-<page>.png (full quality) and assets/stories/<day>/<page>.webp (for the app)."""
import os, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src, day, a, b = sys.argv[1:5]
im = Image.open(src).convert('RGB'); W, H = im.size
g = im.convert('L')
def white_row(y):  # a row of the gap: almost white across the middle 80% of the width
    xs = range(int(W * .1), int(W * .9), 4)
    vals = [g.getpixel((x, y)) for x in xs]
    return min(vals) > 232
mid = H // 2
rows = [y for y in range(int(H * .3), int(H * .7)) if white_row(y)]
if not rows: sys.exit('no white gap found')
# the white band closest to the middle
best = min(rows, key=lambda y: abs(y - mid)); top = best; bot = best
while top - 1 in rows: top -= 1
while bot + 1 in rows: bot += 1
def trim(part):  # drop white edges, then cut to exactly 4:3 from the centre
    p = part
    bw = p.convert('L').point(lambda v: 0 if v > 240 else 255).getbbox()
    if bw: p = p.crop(bw)
    w, h = p.size
    if w / h > 4 / 3: nw = round(h * 4 / 3); x = (w - nw) // 2; p = p.crop((x, 0, x + nw, h))
    else: nh = round(w * 3 / 4); y = (h - nh) // 2; p = p.crop((0, y, w, y + nh))
    return p
os.makedirs(os.path.join(ROOT, 'content', 'pages'), exist_ok=True)
os.makedirs(os.path.join(ROOT, 'assets', 'stories', day), exist_ok=True)
for name, part in ((a, im.crop((0, 0, W, top))), (b, im.crop((0, bot + 1, W, H)))):
    p = trim(part)
    p.save(os.path.join(ROOT, 'content', 'pages', f'{day}-{name}.png'))
    p.save(os.path.join(ROOT, 'assets', 'stories', day, f'{name}.webp'), 'WEBP', quality=84, method=6)
    print(day, name, p.size)
print('gap rows', top, bot)
