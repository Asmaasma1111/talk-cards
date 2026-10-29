"""مختبر ماريا للمال: the studio's pictures, drawn in ChatGPT (Khaled's chat "Create app icons image") in the glossy clay style of
her other apps (her choice, 29 Oct 2026: "see how I designed Maria apps"). Every picture and its description come from Part A
of the studio brief (~/Downloads/Maria_Studio_Prompts.md); the messages are in content/studio/plan.json.

    ~/Downloads/06_Projects_and_Code/maria-tenses/.venv/bin/python -I scripts/studio_pics.py

Reads (local only) content/studio/<sheet>-chatgpt.png: sheets of separate pictures on white, in reading order (left to right,
top row first), and the full backgrounds. Writes studio/assets/<name>.webp, the names the studio asks for (studio/js/ui.js).
"""
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
from curiosity_tree import cutout, webp
from garden_pics import pieces, main_part, square

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'studio', 'assets')


def source_dir():
    """content/ is local only: in a git worktree it lives in the main checkout"""
    here = os.path.join(ROOT, 'content', 'studio')
    if os.path.isdir(here):
        return here
    common = subprocess.run(['git', 'rev-parse', '--git-common-dir'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    return os.path.join(os.path.dirname(os.path.abspath(os.path.join(ROOT, common))), 'content', 'studio')


SHEETS = {   # the pictures on each sheet, in reading order, and the size of each picture (px, square)
    # the mascot is the girl of the تطبيقات ماريا logo (her request, 29 Oct 2026, in place of the brief's squishy creature)
    'girl': (['mascot_wave', 'mascot_think', 'mascot_celebrate', 'mascot_write'], 512),
    'stations': (['st1_dream', 'st2_ideas', 'st3_customers', 'st4_plan', 'st5_make', 'st6_market', 'st7_sell', 'st8_jars', 'st9_next'], 256),
    'jars-empty': (['jar_spend_empty', 'jar_save_empty', 'jar_grow_empty', 'jar_give_empty'], 320),
    'jars-full': (['jar_spend_full', 'jar_save_full', 'jar_grow_full', 'jar_give_full'], 320),
    'grow-garden': (['grow_machine_1', 'grow_machine_2', 'grow_machine_3', 'seed', 'sprout', 'stalks7'], 320),
    'badges': (['badge_spoke', 'badge_brave', 'badge_fix', 'badge_finish', 'badge_give', 'badge_pitch'], 320),
    'items': (['coin', 'item_paper', 'item_print', 'item_markers', 'item_stapler', 'item_bag', 'item_stickers'], 256),
    # the small icons on the screens, in place of the emoji used as stand-ins (her request, 29 Oct 2026: "revamp the whole thing with ChatGPT for visuals")
    'ui-sell': (['ic_book', 'ic_gift', 'ic_online', 'ic_tag', 'ic_basket', 'ic_later', 'ic_poster', 'ic_receipt'], 160),
    'ui-tell': (['ic_family', 'ic_neighbours', 'ic_school', 'ic_tablet', 'ic_sun', 'ic_plain', 'ic_nophoto', 'ic_money'], 160),
    'ui-feel': (['ic_happy', 'ic_ok', 'ic_unsure', 'ic_worried', 'ic_thanks', 'ic_tick', 'ic_sparkle', 'ic_heart'], 160),
    'ui-people': (['ic_mama', 'ic_baba', 'ic_sister', 'ic_friend', 'ic_tools', 'ic_star', 'ic_camera', 'ic_lock'], 160),
    'ui-extra': (['item_other', 'ic_list', 'ic_home'], 160),
    'ui-palette': (['ic_palette'], 160),
    'cards': (['card_pink', 'card_yellow', 'card_green'], 360),   # the fronts of the flip cards
    # the girl on each station of the home path (her request, 29 Oct 2026: "the girl standing on the phase rather than those icons")
    'girl-stations-a': (['girl_st1', 'girl_st2', 'girl_st3', 'girl_st4', 'girl_st5'], 360),
    'girl-stations-b': (['girl_st6', 'girl_st7', 'girl_st8', 'girl_st9'], 360),   # the «شيء آخر» card, «مشاريعي القادمة», «تطبيقاتي»
}
NO_TRIM = set()   # (every sheet is trimmed to its main picture)
KEEP_BITS = {'girl', 'girl-stations-a', 'girl-stations-b'}   # the light bulb, confetti and stars float beside the mascot: cut at the white gaps between them and keep every bit
BACKGROUNDS = ['garden_bg', 'studio_1', 'studio_2', 'studio_3', 'home_bg', 'home_bg_portrait', 'cork'] + [f'scene_{n}' for n in range(1, 10)]   # full pictures, 1600 px on the long side


def no_slivers(im):
    """drop small bits that touch the left or right edge of a crop: slivers of the neighbour's hair or confetti"""
    import numpy as np
    from scipy import ndimage as nd
    a = np.asarray(im).copy(); solid = a[..., 3] > 40
    lab, n = nd.label(nd.binary_dilation(solid, iterations=2))
    total = solid.sum()
    for i in range(1, n + 1):
        part = lab == i
        cols = np.nonzero(part.any(axis=0))[0]
        if (cols[0] == 0 or cols[-1] == part.shape[1] - 1) and (solid & part).sum() < total * 0.06:
            a[..., 3][part] = 0
    return Image.fromarray(a, 'RGBA')


def even_columns(im, n):
    """n pictures in one row, close together: near each n-th of the width, cut where the fewest coloured pixels are"""
    import numpy as np
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    ink = ((a.min(axis=2) < 225) | (a.max(axis=2) - a.min(axis=2) > 24)).sum(axis=0)
    W = im.width; win = int(W / n * 0.18)
    cuts = []
    for k in range(1, n):
        c = int(W * k / n)
        lo, hi = max(1, c - win), min(W - 1, c + win)
        cuts.append(lo + int(np.argmin(ink[lo:hi])))
    edges = [0] + cuts + [W]
    return [(edges[i], edges[i + 1]) for i in range(n)]


def figures(src, n):
    """the girl's sheets: n figures in a row, with hearts, coins or a light bulb floating close to the next one.
    Cut the whole sheet out, then give every separate shape to the figure whose column its middle falls in."""
    import numpy as np
    from scipy import ndimage as nd
    full, _ = cutout(src)
    a = np.asarray(full)
    solid = a[..., 3] > 40
    lab, k = nd.label(nd.binary_dilation(solid, iterations=2))
    masks = [np.zeros_like(solid) for _ in range(n)]
    sizes = nd.sum(solid, lab, range(1, k + 1))
    bodies = sorted((np.argsort(sizes)[::-1][:n] + 1).tolist(),
                    key=lambda i: np.nonzero(lab == i)[1].mean())     # the n biggest shapes: the girls, left to right
    slices = nd.find_objects(lab)
    for j, b in enumerate(bodies):
        masks[j] |= lab == b
    # the bigger floating things first (a light bulb, a star, hearts), then the small bits (its rays) go with the nearest
    rest = sorted((i for i in range(1, k + 1) if i not in bodies and sizes[i - 1] >= 40), key=lambda i: -sizes[i - 1])
    for big in (True, False):
        near = [nd.distance_transform_edt(~m) for m in masks]             # how far every pixel is from each girl's shapes
        for i in [i for i in rest if (sizes[i - 1] >= 1500) == big]:
            sl = slices[i - 1]; part = lab[sl] == i
            j = min(range(n), key=lambda q: near[q][sl][part].min())
            masks[j][sl] |= part
    out = []
    for m in masks:
        b = a.copy(); b[..., 3] = np.where(m, b[..., 3], 0)
        out.append(Image.fromarray(b, 'RGBA').crop(Image.fromarray((m * 255).astype('uint8')).getbbox()))
    return out


def rings(path, box):
    """where the nine empty rings of the home path are, as % of the map the app shows (box = its width/height ratio):
    the cream insides of the rings, in path order (the rows top to bottom, each row's three spots left to right)"""
    import numpy as np
    from scipy import ndimage as nd
    im = Image.open(path).convert('RGB'); W, H = im.size
    a = np.asarray(im).astype(int); R, G, B = a[..., 0], a[..., 1], a[..., 2]
    inside = (R >= 250) & (G >= 222) & (G <= 242) & (B >= 188) & (B <= 212)
    inside[:H // 14] = False                                           # the sky
    lab, n = nd.label(nd.binary_opening(inside, iterations=4))
    found = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(xs) > W * H * 0.0015:
            found.append(((xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2))
    found.sort(key=lambda c: (round(c[1] / (H / 8)), c[0]))
    cx = (1 - box / (W / H)) / 2 if W / H > box else 0                  # object-fit: cover trims the sides
    cy = (1 - (W / H) / box) / 2 if W / H < box else 0                  # ... or the top and bottom
    return [(round(float((x / W - cx) / (1 - 2 * cx) * 100), 1), round(float((y / H - cy) / (1 - 2 * cy) * 100), 1)) for x, y in found]


if __name__ == '__main__':
    src_dir = source_dir()
    os.makedirs(OUT, exist_ok=True)
    made, missing = [], []
    for sheet, (ids, size) in SHEETS.items():
        p = os.path.join(src_dir, f'{sheet}-chatgpt.png')
        if not os.path.exists(p):
            missing.append(sheet); continue
        src = Image.open(p).convert('RGB')
        if sheet in KEEP_BITS:   # the girl: every floating bit stays with its own figure
            for k, im in zip(ids, figures(src, len(ids))):
                made.append(f'{k} {webp(square(im, size), os.path.join(OUT, k + ".webp"))}KB')
            continue
        for k, (x0, y0, x1, y1) in zip(ids, pieces(src, len(ids))):
            m = 8
            im, _ = cutout(src.crop((max(0, x0 - m), max(0, y0 - m), min(src.width, x1 + m), min(src.height, y1 + m))))
            im = im if sheet in NO_TRIM else main_part(im)
            made.append(f'{k} {webp(square(im, size), os.path.join(OUT, k + ".webp"))}KB')
    for name in BACKGROUNDS:
        p = os.path.join(src_dir, f'{name}-chatgpt.png')
        if not os.path.exists(p):
            missing.append(name); continue
        im = Image.open(p).convert('RGB')
        side, q = (1000, 70) if name == 'cork' else (1600, 82)          # cork grain is heavy: smaller is plenty behind cards
        k = side / max(im.size)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        made.append(f'{name} {webp(im, os.path.join(OUT, name + ".webp"), q=q)}KB')
    import shutil   # the pencil-on-a-card picture is both the «شيء آخر» item and the ✍️ icon
    if os.path.exists(os.path.join(OUT, 'item_other.webp')):
        shutil.copyfile(os.path.join(OUT, 'item_other.webp'), os.path.join(OUT, 'ic_write.webp'))
    p = os.path.join(src_dir, 'tile-coin-chatgpt.png')   # her apps-page tile: the girl hugging a big coin
    if os.path.exists(p):
        im, _ = cutout(Image.open(p).convert('RGB'))
        made.append(f"tile {webp(square(im, 360, pad=0.02), os.path.join(ROOT, 'assets', 'apps', 'studio.webp'))}KB")
    print('\n'.join(made))
    for name, box in (('home_bg', 4 / 3), ('home_bg_portrait', 3 / 4)):
        p = os.path.join(src_dir, f'{name}-chatgpt.png')
        if os.path.exists(p):
            r = rings(p, box)
            print(name, 'rings:', r)
            if len(r) == 9:   # studio/js/journey.js: the picture is shown mirrored and walked from the front row
                rows = [sorted(((round(100 - x, 1), y) for x, y in r[i:i + 3])) for i in (0, 3, 6)]   # top, middle, bottom
                order = rows[2][::-1] + rows[1] + rows[0][::-1]
                print('  spots:', ', '.join(f'[{x}, {round(y + 1, 1)}]' for x, y in order))
    if missing:
        print('still to draw:', ', '.join(missing))
    # the offline cache lists every picture the studio has (sw.js)
    names = sorted(f[:-5] for f in os.listdir(OUT) if f.endswith('.webp'))
    sw = os.path.join(ROOT, 'sw.js'); t = open(sw).read()
    import re
    t2 = re.sub(r"\.\.\.'[^']*'\.split\(' '\)\.map\(n => `studio/assets/\$\{n\}\.webp`\)",
                "...'" + ' '.join(names) + "'.split(' ').map(n => `studio/assets/${n}.webp`)", t)
    if t2 != t:
        open(sw, 'w').write(t2)
    print(len(names), 'pictures in the offline cache')
