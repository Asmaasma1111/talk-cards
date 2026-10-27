# python3 scripts/cut_sheet.py [--cuts=x1,x2,...] SHEET.png FULLDIR WEBPDIR name1 name2 ...
# cut a transparent sheet into N objects (left to right): 2-D blobs on a 1/4 mask, grouped into N clusters by x; save PNG + webp
import sys, os
from collections import deque
import numpy as np
from PIL import Image
args = sys.argv[1:]; cuts = None
if args[0].startswith('--cuts='): cuts = [int(v) for v in args.pop(0)[7:].split(',')]   # x borders (full size) between the objects
src, outdir, webdir, names = args[0], args[1], args[2], args[3:]
im = Image.open(src).convert('RGBA'); A = np.asarray(im)[:, :, 3]
k = 4; m = A[::k, ::k] > 100; H, W = m.shape
lab = np.zeros(m.shape, int); comps = []
for y in range(H):
    for x in range(W):
        if m[y, x] and not lab[y, x]:
            n = len(comps) + 1; q = deque([(y, x)]); lab[y, x] = n; xs = []; ys = []
            while q:
                cy, cx = q.popleft(); xs.append(cx); ys.append(cy)
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not lab[ny, nx]: lab[ny, nx] = n; q.append((ny, nx))
            comps.append([min(xs), max(xs), min(ys), max(ys), len(xs)])
big = sorted([c for c in comps if c[4] > 40], key=lambda c: c[0])
groups = [[c] for c in big]
if cuts:
    groups = [[] for _ in range(len(cuts) + 1)]
    for c in big: groups[sum((c[0] + c[1]) / 2 * k > b for b in cuts)].append(c)
def span(g): return min(c[0] for c in g), max(c[1] for c in g)
while len(groups) > len(names):            # merge the two neighbouring groups with the smallest gap (or most overlap)
    gaps = [span(groups[i + 1])[0] - span(groups[i])[1] for i in range(len(groups) - 1)]
    i = int(np.argmin(gaps)); groups[i:i + 2] = [groups[i] + groups[i + 1]]
print('blobs', len(big), 'groups', len(groups))
if len(groups) != len(names): sys.exit('count differs')
os.makedirs(outdir, exist_ok=True); os.makedirs(webdir, exist_ok=True)
for g, n in zip(groups, names):
    keep = np.isin(lab, [comps.index(c) + 1 for c in g])
    big_mask = np.kron(keep, np.ones((k, k), bool))[:A.shape[0], :A.shape[1]]
    from PIL import ImageFilter
    mk = Image.fromarray((big_mask * 255).astype('uint8')).filter(ImageFilter.MaxFilter(13))
    arr = np.asarray(im).copy(); arr[:, :, 3] = np.minimum(arr[:, :, 3], np.asarray(mk))
    c = Image.fromarray(arr); c = c.crop(c.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox())
    c.save(f'{outdir}/{n}.png'); w = c.copy(); w.thumbnail((520, 520)); w.save(f'{webdir}/{n}.webp', 'WEBP', quality=88, method=6)
    print(n, c.size)
