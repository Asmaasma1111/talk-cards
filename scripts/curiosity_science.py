"""علبة الفضول: the science-class mysteries (6 Nov 2026), kept in scripts/curiosity_science_extra.json.

    python3 -I scripts/curiosity_science.py          photos for them, credits, and adds them to curiosity.json

Their photos are real photos the apps already have (Maria Reads, the Algeria app), cropped to 4:3 like the others, so
nothing needs downloading. make_curiosity.py calls merge() too, so rebuilding from her bank keeps them; a mystery with
the same id in her bank wins.
"""
import io, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXTRA = os.path.join(ROOT, 'scripts', 'curiosity_science_extra.json')
OUT = os.path.join(ROOT, 'assets', 'curiosity', 'photos')
CREDITS = os.path.join(OUT, 'CREDITS.md')
JSON = os.path.join(ROOT, 'curiosity.json')
W, H = 1024, 768


def extra():
    return json.load(open(EXTRA, encoding='utf-8'))


def row(x):
    m = {k: v for k, v in x.items() if k != 'src'}
    m['photo'] = f"assets/curiosity/photos/{x['id'].lower()}.webp"
    m['credit'] = x['src']['credit']
    m['ready'] = os.path.exists(os.path.join(ROOT, m['photo']))
    return m


def merge(D):
    """add the science mysteries (and the default daily focus) to a curiosity.json dict"""
    E = extra()
    have = {m['id'] for m in D['mysteries']}
    D['mysteries'] += [row(x) for x in E['mysteries'] if x['id'] not in have]
    order = 'ABCDEFGHI'
    D['mysteries'].sort(key=lambda m: (order.index(m['theme']), m['n']))
    for m in D['mysteries']:
        if m['theme'] == 'I':
            D.setdefault('chapters', {}).setdefault(str(m['chapter']), m['chapterName'])
    D['focus'] = E.get('focus', [])
    D['first'], D['firstFrom'] = E.get('first'), E.get('firstFrom')      # Mama's choice of what comes first (see firstUp in curiosity.js)
    return D


def photos():
    from PIL import Image, ImageOps
    rows = []
    for x in extra()['mysteries']:
        s = x['src']
        im = ImageOps.exif_transpose(Image.open(os.path.join(ROOT, s['from'])).convert('RGB'))
        w, h = im.size
        cw = min(w, h * W / H) / s.get('zoom', 1); ch = cw * H / W
        x0 = (w - cw) * s.get('fx', .5); y0 = (h - ch) * s.get('fy', .5)
        im = im.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((W, H), Image.LANCZOS)
        q = 80
        while True:
            buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6)
            if buf.tell() < 140 * 1024 or q <= 44:
                break
            q -= 6
        open(os.path.join(OUT, x['id'].lower() + '.webp'), 'wb').write(buf.getvalue())
        src, lic = s['credit'].split(', ', 1)[0], s['credit'].rsplit(', ', 1)[-1]
        who = s['credit'][len(src) + 2:-len(lic) - 2] if s['credit'].count(', ') == 2 else ''
        rows.append(f"| {x['id']} | {src}{f' ({who})' if who else ''} | {lic} | {s['link']} |")
        print(x['id'], buf.tell() // 1024, 'KB')
    text = open(CREDITS, encoding='utf-8').read()
    for r in rows:
        if r.split(' |')[0] + ' |' not in text:
            text = text.rstrip('\n') + '\n' + r + '\n'
    open(CREDITS, 'w', encoding='utf-8').write(text)


if __name__ == '__main__':
    photos()
    D = merge(json.load(open(JSON, encoding='utf-8')))
    with open(JSON, 'w', encoding='utf-8') as f:
        json.dump(D, f, ensure_ascii=False, indent=1)
    print('curiosity.json:', len(D['mysteries']), 'mysteries; daily focus: chapters', D['focus'])
