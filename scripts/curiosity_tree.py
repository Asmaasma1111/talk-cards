"""علبة الفضول: her question tree. Drawn in ChatGPT (Mama's choice, 21 Oct 2026) in the glossy clay style of the app icons:
a bare young tree with buds, and a sheet of leaves, blossoms and fruits in the same style. This script makes the app's
pieces from them; the app then puts a leaf on the branches for every question, a blossom for every flipped question and
a fruit for every question found out together.

    ~/Downloads/06_Projects_and_Code/maria-tenses/.venv/bin/python -I scripts/curiosity_tree.py

Reads (local only): content/curiosity/tree/tree-chatgpt.png and sprites-chatgpt.png (4 columns x 3 rows on white: 6
leaves, 3 blossoms, 3 fruits, in reading order). Writes assets/curiosity/tree/: tree.webp (cut out of its white
background), leaf-1..6.webp, flower-1..3.webp, fruit-1..3.webp, and tree.json with the places where they grow: points on
the branches, buds first, in a fixed order, so the tree only ever grows and looks the same every time it is drawn.
"""
import io, json, os, random
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'content', 'curiosity', 'tree')
OUT = os.path.join(ROOT, 'assets', 'curiosity', 'tree')


def cutout(im, tol=14):
    """The plain white background (joined to the edge of the picture) becomes transparent; the edge pixels keep their
    colour without a white fringe."""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    lo, hi = a.min(axis=2), a.max(axis=2)
    whiteish = (lo >= 255 - 3 * tol) & (hi - lo <= tol * 1.5)
    lab, _ = nd.label(whiteish)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, edge[edge > 0])
    sub = ~bg
    band = sub & nd.binary_dilation(bg, iterations=2)                 # the subject's outer rim
    w = np.clip((lo - 205) / 50, 0, 1)                                 # how white a rim pixel is
    alpha = np.where(sub, 1.0, 0.0)
    alpha = np.where(band, 1 - w * 0.85, alpha)
    al = alpha[..., None]
    rgb = np.where(al > 0.02, (a - (1 - al) * 255) / np.maximum(al, 0.02), a)   # take the white back out of the rim
    out = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA'), sub


def webp(im, path, q=86):
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6); open(path, 'wb').write(buf.getvalue())
    return buf.tell() // 1024


def anchors(img, sub):
    """Where the leaves grow: the buds, then the thin twigs, then the edges of the bigger branches, inside the crown."""
    a = np.asarray(img.convert('RGB')).astype(np.int16)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    H, W = sub.shape
    ys, xs = np.nonzero(sub)
    top = ys.min()
    grass_top = H
    green = sub & (G > R + 20) & (G > B + 40)                          # buds and grass
    # the grass mound: the lowest wide band of green
    rows = green.sum(axis=1)
    for y in range(H - 1, top, -1):
        if rows[y] > W * 0.25:
            grass_top = y
        elif grass_top < H and rows[y] < W * 0.05:
            break
    crown_bottom = int(top + (grass_top - top) * 0.70)
    brown = sub & (R > 140) & (R > G + 25) & (G > B + 10)
    inside = np.zeros_like(sub); inside[:crown_bottom] = True
    buds = green & inside
    thin = brown & ~nd.binary_opening(brown, structure=np.ones((15, 15))) & inside
    edge = brown & ~nd.binary_erosion(brown, iterations=4) & inside
    cx = (xs.min() + xs.max()) / 2
    pick, taken = [], np.zeros((H // 22 + 2, W // 22 + 2), bool)
    rnd = random.Random(1729)
    for mask, kind in ((buds, 0), (thin, 1), (edge, 2)):
        yy, xx = np.nonzero(mask)
        order = list(range(len(yy))); rnd.shuffle(order)
        group = []
        for i in order:
            y, x = int(yy[i]), int(xx[i])
            cell = (y // 22, x // 22)
            if taken[cell]:
                continue
            taken[cell] = True
            ang = np.degrees(np.arctan2(y - crown_bottom * 1.05, x - cx)) + 90     # pointing away from the trunk
            group.append([x, y, round(float(ang + rnd.uniform(-35, 35)), 1), kind])
        rnd.shuffle(group)
        pick += group
    return pick, crown_bottom, grass_top


def sprites(sheet):
    """The 12 pieces of the sheet, in reading order: each one cut out, trimmed and made 128 px tall; leaves turned so that
    their long side stands upright."""
    im, sub = cutout(sheet, tol=16)
    lab, n = nd.label(nd.binary_closing(sub, iterations=2))
    objs = nd.find_objects(lab)
    pieces = []
    for k, sl in enumerate(objs):
        area = (lab[sl] == k + 1).sum()
        if area < 800:
            continue
        pieces.append((sl, k + 1, area))
    pieces.sort(key=lambda p: p[2], reverse=True)
    pieces = pieces[:12]
    W = sheet.width
    pieces.sort(key=lambda p: (int(((p[0][0].start + p[0][0].stop) / 2) // (sheet.height / 3)), (p[0][1].start + p[0][1].stop) / 2))
    out = []
    for sl, lb, _ in pieces:
        crop = im.crop((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop))
        m = np.asarray(crop)[..., 3] > 0
        crop = Image.fromarray(np.dstack([np.asarray(crop)[..., :3], np.asarray(crop)[..., 3] * m]).astype(np.uint8), 'RGBA')
        out.append(crop)
    return out


def upright(im):
    a = np.asarray(im)[..., 3] > 30
    ys, xs = np.nonzero(a)
    c = np.cov(np.vstack([xs - xs.mean(), ys - ys.mean()]))
    vals, vecs = np.linalg.eigh(c)
    vx, vy = vecs[:, np.argmax(vals)]
    if vy > 0:                                                         # the end that points up in the sheet (the tip; the stem is below)
        vx, vy = -vx, -vy
    ang = np.degrees(np.arctan2(-vy, vx))                              # its angle, counted the usual way (y up)
    im = im.rotate(90 - ang, resample=Image.BICUBIC, expand=True)      # turn it so the tip points straight up
    return im.crop(im.getbbox())


def fit(im, h=128):
    k = h / max(im.width, im.height)
    return im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    src = Image.open(os.path.join(SRC, 'tree-chatgpt.png'))
    tree, sub = cutout(src)
    S = 1000
    k = S / src.width
    pts, crown_bottom, grass_top = anchors(src, sub)
    print('tree.webp', webp(tree.resize((S, S), Image.LANCZOS), os.path.join(OUT, 'tree.webp')), 'KB;', len(pts), 'places',
          f'(buds {sum(p[3] == 0 for p in pts)}, twigs {sum(p[3] == 1 for p in pts)}, branches {sum(p[3] == 2 for p in pts)})')
    names = []
    sheet = os.path.join(SRC, 'sprites-chatgpt.png')
    if os.path.exists(sheet):
        ps = sprites(Image.open(sheet))
        kinds = ['leaf'] * 6 + ['flower'] * 3 + ['fruit'] * 3
        count = {'leaf': 0, 'flower': 0, 'fruit': 0}
        for im, kd in zip(ps, kinds):
            count[kd] += 1
            name = f'{kd}-{count[kd]}'
            im = fit(upright(im) if kd == 'leaf' else im)
            webp(im, os.path.join(OUT, name + '.webp'), q=90)
            names.append({'id': name, 'kind': kd, 'w': im.width, 'h': im.height})
        print(len(names), 'pieces:', ' '.join(n['id'] for n in names))
    meta = {'size': S, 'image': 'assets/curiosity/tree/tree.webp', 'crownBottom': round(crown_bottom * k), 'ground': round(grass_top * k),
            'pieces': names, 'places': [[round(x * k), round(y * k), a, kd] for x, y, a, kd in pts]}
    json.dump(meta, open(os.path.join(OUT, 'tree.json'), 'w'), separators=(',', ':'))
    # a check picture: the tree with every place marked (buds green, twigs blue, branches red)
    chk = tree.resize((S, S)).convert('RGBA'); bg = Image.new('RGBA', (S, S), (255, 255, 255, 255)); bg.alpha_composite(chk)
    from PIL import ImageDraw
    d = ImageDraw.Draw(bg)
    for x, y, a, kd in meta['places']:
        d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=[(40, 170, 60), (40, 90, 220), (220, 50, 50)][kd])
    bg.convert('RGB').save(os.path.join(SRC, 'places-check.jpg'), quality=80)


if __name__ == '__main__':
    main()
