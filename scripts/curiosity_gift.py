"""علبة الفضول: the gift box, drawn in ChatGPT (Khaled's chat "Create app icons image") in the glossy clay style of the other
icons (her request, 23 Oct 2026: the old box was "too basic"). The same box twice: open with a pink question mark
popping out, and closed.

    ~/Downloads/06_Projects_and_Code/maria-tenses/.venv/bin/python -I scripts/curiosity_gift.py

Reads (local only) content/curiosity/gift/gift-open-chatgpt.png and gift-closed-chatgpt.png. Writes:
  assets/apps/curiosity.webp            the entrance tile icon and the app's logo (the open box), 360 px
  assets/curiosity/gift-open.webp       the box after she opens it, 640 px
  assets/curiosity/gift-closed.webp     the box she taps to open (and the one on the start button), 640 px
Both boxes are cut to the same square, so the open one replaces the closed one in place.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
from curiosity_tree import cutout, webp

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'content', 'curiosity', 'gift')


def square(im, size, box=None, pad=0.03):
    bb = box or im.getbbox(); im = im.crop(bb)
    s = int(max(im.size) * (1 + 2 * pad)); c = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    c.paste(im, ((s - im.width) // 2, s - im.height - int(s * pad)))      # standing on the same floor
    return c.resize((size, size), Image.LANCZOS)


if __name__ == '__main__':
    cut = {}
    for k in ('open', 'closed'):
        p = os.path.join(SRC, f'gift-{k}-chatgpt.png')
        if os.path.exists(p):
            cut[k] = cutout(Image.open(p))[0]
    if 'open' in cut:
        print('icon', webp(square(cut['open'], 360), os.path.join(ROOT, 'assets', 'apps', 'curiosity.webp')), 'KB')
    # one box for both, so the open box takes the closed one's place exactly
    boxes = [c.getbbox() for c in cut.values()]
    W = max(b[2] - b[0] for b in boxes); H = max(b[3] - b[1] for b in boxes)
    for k, im in cut.items():
        x0, y0, x1, y1 = im.getbbox(); cx = (x0 + x1) // 2
        box = (cx - W // 2, y1 - H, cx - W // 2 + W, y1)
        print(k, webp(square(im, 640, box), os.path.join(ROOT, 'assets', 'curiosity', f'gift-{k}.webp')), 'KB')
