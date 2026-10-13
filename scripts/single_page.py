"""Turn one picture into one page (4:3) or the cover (3:4), cut from the centre.
python3 scripts/single_page.py content/pairs/d05-p07.png d05 p07
python3 scripts/single_page.py content/pages/d05-cover.png d05 cover
Saves content/pages/<day>-<page>.png (full quality) and assets/stories/<day>/<page>.webp (for the app)."""
import os, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src, day, name = sys.argv[1:4]
p = Image.open(src).convert('RGB')
ratio = 3 / 4 if name == 'cover' else 4 / 3
w, h = p.size
if w / h > ratio: nw = round(h * ratio); x = (w - nw) // 2; p = p.crop((x, 0, x + nw, h))
else: nh = round(w / ratio); y = (h - nh) // 2; p = p.crop((0, y, w, y + nh))
os.makedirs(os.path.join(ROOT, 'content', 'pages'), exist_ok=True)
os.makedirs(os.path.join(ROOT, 'assets', 'stories', day), exist_ok=True)
out = os.path.join(ROOT, 'content', 'pages', f'{day}-{name}.png')
if os.path.abspath(src) != out: p.save(out)
p.save(os.path.join(ROOT, 'assets', 'stories', day, f'{name}.webp'), 'WEBP', quality=84, method=6)
print(day, name, p.size)
