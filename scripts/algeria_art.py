"""هيا نتعلم في الجزائر: the trip-world pictures, drawn in ChatGPT (Khaled's chat "Create app icons image") in the glossy clay
style of the entrance icons (her decision, 23 Oct 2026: ChatGPT only for the trip world; real photos for the content).

    ~/Downloads/06_Projects_and_Code/maria-tenses/.venv/bin/python -I scripts/algeria_art.py

Reads (local only) content/algeria/art/: icon-chatgpt.png, map-chatgpt.png, stamp-<city>-chatgpt.png. Writes:
  assets/apps/algeria.webp            the entrance tile icon, 360 px, cut out of its white background
  assets/algeria/map.webp             the map, cut out and fitted to the box of the real border (1000 x 990, the box the
                                      cities are placed in, scripts/make_algeria.py), so the city dots sit where they are
  assets/algeria/stamps/<city>.webp   the passport stamps, 400 px
The map is drawn from the true outline (assets/algeria/outline.svg, Natural Earth) uploaded to ChatGPT.
"""
import glob, io, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'content', 'algeria', 'art')
BOX = (1000, 990)


def cutout(im, tol=14):
    """The plain white background (joined to the edge of the picture) becomes transparent; the rim keeps its colour without
    a white fringe (the same cut as scripts/curiosity_tree.py)."""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    lo, hi = a.min(axis=2), a.max(axis=2)
    whiteish = (lo >= 255 - 3 * tol) & (hi - lo <= tol * 1.5)
    lab, _ = nd.label(whiteish)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, edge[edge > 0])
    sub = ~bg
    band = sub & nd.binary_dilation(bg, iterations=2)
    w = np.clip((lo - 205) / 50, 0, 1)
    alpha = np.where(sub, 1.0, 0.0)
    alpha = np.where(band, 1 - w * 0.85, alpha)
    al = alpha[..., None]
    rgb = np.where(al > 0.02, (a - (1 - al) * 255) / np.maximum(al, 0.02), a)
    out = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA'), sub


def webp(im, path, q=86):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6); open(path, 'wb').write(buf.getvalue())
    print(os.path.relpath(path, ROOT), im.size, buf.tell() // 1024, 'KB')


def square(im, size, pad=0.04):
    bb = im.getbbox(); im = im.crop(bb)
    s = int(max(im.size) * (1 + 2 * pad)); c = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    c.paste(im, ((s - im.width) // 2, (s - im.height) // 2)); return c.resize((size, size), Image.LANCZOS)


def land(im):
    """the country itself: coloured (not white, not the grey shadow) pixels; its box is what is fitted to the real border"""
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    sat = a.max(axis=2) - a.min(axis=2)
    m = sat > 38
    m = nd.binary_opening(m, iterations=3)
    lab, n = nd.label(m)
    if not n:
        return None
    sizes = nd.sum(m, lab, range(1, n + 1)); keep = lab == (int(np.argmax(sizes)) + 1)
    ys, xs = np.nonzero(keep)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def outline_pts():
    """the real border, from assets/algeria/outline.svg (the same box the cities are placed in)"""
    import re
    d = re.search(r' d="([^"]+)"', open(os.path.join(ROOT, 'assets', 'algeria', 'outline.svg')).read()).group(1)
    return [(float(x), float(y)) for x, y in re.findall(r'(-?[\d.]+) (-?[\d.]+)', d)]


def clay_map(tex, M=40, K=2):
    """ChatGPT's clay landscape cut to the true border, raised like a clay tile: a soft shadow, a darker side, a light rim"""
    from PIL import ImageDraw, ImageFilter, ImageChops, ImageEnhance
    W, H = BOX; CW, CH = (W + 2 * M) * K, (H + 2 * M) * K
    pts = [((x + M) * K, (y + M) * K) for x, y in outline_pts()]
    mask = Image.new('L', (CW, CH), 0); ImageDraw.Draw(mask).polygon(pts, fill=255)
    t = tex.resize((max(CW, CH),) * 2, Image.LANCZOS).crop((0, 0, CW, CH))
    shift = lambda im, dx, dy: ImageChops.offset(im, dx, dy)
    out = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    sh = shift(mask, 0, 22 * K).filter(ImageFilter.GaussianBlur(16 * K))      # the shadow on the page
    out.paste(Image.new('RGBA', (CW, CH), (6, 60, 30, 255)), (0, 0), sh.point(lambda v: int(v * .33)))
    side = shift(mask, 0, 12 * K)                                              # the clay side, under the top
    dark = ImageEnhance.Brightness(t).enhance(.62).convert('RGBA')
    out.paste(dark, (0, 0), side)
    out.paste(t.convert('RGBA'), (0, 0), mask)
    rim = ImageChops.subtract(mask, shift(mask, 3 * K, 4 * K)).filter(ImageFilter.GaussianBlur(1.5 * K))   # light on the top-left rim
    out.paste(Image.new('RGBA', (CW, CH), (255, 255, 255, 255)), (0, 0), rim.point(lambda v: int(v * .7)))
    edge = ImageChops.subtract(mask.filter(ImageFilter.MaxFilter(5)), mask.filter(ImageFilter.MinFilter(5)))
    out.paste(Image.new('RGBA', (CW, CH), (255, 255, 255, 255)), (0, 0), edge.point(lambda v: int(v * .55)))
    return out.resize((W + 2 * M, H + 2 * M), Image.LANCZOS)


def main():
    p = os.path.join(SRC, 'icon-chatgpt.png')
    if os.path.exists(p):
        im, _ = cutout(Image.open(p)); webp(square(im, 360), os.path.join(ROOT, 'assets', 'apps', 'algeria.webp'))
    p = os.path.join(SRC, 'map-texture-chatgpt.png')
    if os.path.exists(p):
        webp(clay_map(Image.open(p).convert('RGB')), os.path.join(ROOT, 'assets', 'algeria', 'map.webp'), q=88)
    for p in sorted(glob.glob(os.path.join(SRC, 'stamp-*-chatgpt.png'))):
        cid = os.path.basename(p).split('-')[1]
        im, _ = cutout(Image.open(p)); webp(square(im, 400, 0.02), os.path.join(ROOT, 'assets', 'algeria', 'stamps', f'{cid}.webp'))


if __name__ == '__main__':
    main()
