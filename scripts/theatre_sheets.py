"""مسرح المسائل: cut the ChatGPT clay sprite sheets into the app's pictures (her request, 8 Nov 2026: every picture
in the story stage drawn again in ChatGPT, from scratch). Each sheet is a grid of objects on a transparent (or plain
white) background; the names below follow the grid, row by row, left to right, as the prompts asked
(prompts: theatre/assets/CHATGPT_IMAGES.md). Sheets live in content/theatre/sheets/ (local only, off GitHub).

  python3 -I scripts/theatre_sheets.py A content/theatre/sheets/A.png      cut one sheet
  python3 -I scripts/theatre_sheets.py A content/theatre/sheets/A.png --preview   also write a labelled check picture

Each object becomes a trimmed square 200 px WebP: theatre/assets/things/<name>.webp or theatre/assets/packs/<name>.webp.
An object is found as everything not background whose centre falls in its grid cell, so a hat or a tail that
pokes over the cell line stays with its owner.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIZE = 200
SHEETS = {
    'A': (4, 4, 'things', ['student', 'boy', 'mother', 'visitor',
                           'passenger', 'sheep', 'goat', 'chicken',
                           'egg', 'palm', 'tree', 'water',
                           'step', 'glasses', 'candy', 'squishy']),
    'B': (4, 4, 'things', ['riyal', 'sticker', 'page', 'book',
                           'story', 'story2', 'cube', 'card',
                           'ball', 'ball-red', 'ball-blue', 'pencil',
                           'crayon', 'crate', 'date', 'cake']),
    'C': (4, 4, 'things', ['apple', 'orange', 'lemon', 'banana',
                           'strawberry', 'balloon', 'chair', 'choc',
                           'day', 'necklace', 'paw', 'plant',
                           'seat', 'star', 'tile', 'wheel']),
    'D': (4, 4, 'packs', ['bags', 'box', 'truck', 'books',
                          'notebook', 'ledger', 'album', 'nest',
                          'basket', 'hut', 'houses', 'minibus',
                          'bus', 'stadium', 'bucket', 'bath']),
    'E': (2, 3, 'packs', ['island', 'park', 'pickup',
                          'filebox', 'steps', 'tank']),
}
# the same picture under a second name (the app looks each thing up by its own name)
ALSO = {'things': {'paper': 'page', 'girl': 'student', 'student2': 'boy'}}


def alpha_of(im):
    a = np.array(im.convert('RGBA')).astype(np.int16)
    if (a[..., 3] < 250).mean() > 0.2:          # a real transparent background
        return (a[..., 3] > 24)
    # a plain light background: everything far from the corner colour is the object
    h, w = a.shape[:2]
    corners = np.array([a[2, 2, :3], a[2, w - 3, :3], a[h - 3, 2, :3], a[h - 3, w - 3, :3]]).mean(0)
    d = np.abs(a[..., :3] - corners).sum(-1)
    return d > 40


def components(mask):
    """labels of 4-connected regions (no scipy): a simple two-pass union-find on a reduced grid"""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32); parent = [0]
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    nxt = 1
    for y in range(h):
        row = mask[y]
        for x in np.nonzero(row)[0]:
            up = lab[y - 1, x] if y else 0
            left = lab[y, x - 1] if x else 0
            if up and left:
                a, b = find(up), find(left); lab[y, x] = min(a, b)
                if a != b: parent[max(a, b)] = min(a, b)
            elif up or left:
                lab[y, x] = up or left
            else:
                parent.append(nxt); lab[y, x] = nxt; nxt += 1
    roots = np.array([find(i) for i in range(nxt)], np.int32)
    return roots[lab]


def cut(key, path, preview=False):
    rows, cols, sub, names = SHEETS[key]
    im = Image.open(path).convert('RGBA')
    W, H = im.size
    mask = alpha_of(im)
    small = 4                                   # find the pieces on a quarter-size mask (fast enough in pure python)
    m2 = mask[::small, ::small]
    lab = components(m2)
    out = os.path.join(ROOT, 'theatre', 'assets', sub); os.makedirs(out, exist_ok=True)
    cells = {i: np.zeros_like(mask) for i in range(rows * cols)}
    for l in np.unique(lab):
        if l == 0: continue
        ys, xs = np.nonzero(lab == l)
        if len(ys) < 12: continue                # specks
        cy, cx = ys.mean() * small, xs.mean() * small
        i = min(rows - 1, int(cy / H * rows)) * cols + min(cols - 1, int(cx / W * cols))
        big = np.kron(lab == l, np.ones((small, small), bool))[:H, :W]
        big[1:] |= big[:-1]; big[:-1] |= big[1:]; big[:, 1:] |= big[:, :-1]; big[:, :-1] |= big[:, 1:]   # one pixel wider: keeps the soft edge
        cells[i] |= big
    arr = np.array(im)
    made = []
    for i, name in enumerate(names):
        m = cells[i]
        if not m.any():
            print('nothing found for', name); continue
        ys, xs = np.nonzero(m & mask)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        piece = arr[y0:y1, x0:x1].copy()
        clear = (arr[..., 3] < 250).mean() > 0.2
        keep = m[y0:y1, x0:x1] if clear else (m & mask)[y0:y1, x0:x1]
        piece[..., 3] = np.where(keep, piece[..., 3] if clear else 255, 0)
        p = Image.fromarray(piece)
        s = max(p.size); sq = Image.new('RGBA', (s, s), (0, 0, 0, 0)); sq.paste(p, ((s - p.width) // 2, (s - p.height) // 2))
        sq = sq.resize((SIZE, SIZE), Image.LANCZOS)
        sq.save(os.path.join(out, name + '.webp'), 'WEBP', quality=88, method=6)
        made.append(name)
        for other, same in ALSO.get(sub, {}).items():
            if same == name:
                sq.save(os.path.join(out, other + '.webp'), 'WEBP', quality=88, method=6); made.append(other)
    print(key, len(made), 'pictures:', ' '.join(made))
    if preview:
        cell = 150; pv = Image.new('RGB', (cols * cell, rows * (cell + 24)), 'white'); d = ImageDraw.Draw(pv)
        for i, name in enumerate(names):
            f = os.path.join(out, name + '.webp')
            if not os.path.exists(f): continue
            t = Image.open(f).resize((cell - 20, cell - 20)); x = (i % cols) * cell; y = (i // cols) * (cell + 24)
            pv.paste(t, (x + 10, y + 4), t); d.text((x + 10, y + cell - 12), name, fill='black')
        dst = os.path.join(ROOT, 'content', 'theatre', 'sheets', f'check-{key}.png'); pv.save(dst); print(dst)


if __name__ == '__main__':
    if len(sys.argv) < 3 or sys.argv[1] not in SHEETS:
        print(__doc__); sys.exit(1)
    cut(sys.argv[1], sys.argv[2], '--preview' in sys.argv)
