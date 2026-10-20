"""علبة الفضول: real photos for the mysteries (her rule, 20 Oct 2026: "make sure all pictures are REAL").
The same tools as Maria Reads (scripts/reads_photos.py): Wikimedia Commons with open licences (CC0 and public domain
first), and Pexels photos found by searching pexels.com in the browser. Candidates go to content/curiosity/photos/cand/
(local only); the chosen ones become assets/curiosity/photos/<id>.webp (4:3, 1024 x 768) and a credits list.

  python3 -I scripts/curiosity_photos.py commons [ID ...]   Commons candidates for the plan (or ID=WORDS to try other words)
  python3 -I scripts/curiosity_photos.py pexels             candidates listed in content/curiosity/photos/pexels-ids.txt (id:n,n;...)
  python3 -I scripts/curiosity_photos.py sheet [ID ...]     contact sheets to choose from
  python3 -I scripts/curiosity_photos.py build              scripts/curiosity_photo_picks.json -> assets/curiosity/photos/*.webp
Picks: {"C1": {"dir": "C1", "i": 2, "fx": .5, "fy": .5, "zoom": 1}}; "dir" is the candidate folder (ID, or ID-p for Pexels).
"""
import io, json, os, sys, time, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import reads_photos as R

ROOT = R.ROOT
R.PLAN = os.path.join(ROOT, 'scripts', 'curiosity_photo_plan.json')
R.PICKS = os.path.join(ROOT, 'scripts', 'curiosity_photo_picks.json')
R.CAND = os.path.join(ROOT, 'content', 'curiosity', 'photos', 'cand')
R.OUT = os.path.join(ROOT, 'assets', 'curiosity', 'photos')
R.CREDITS = os.path.join(ROOT, 'content', 'curiosity', 'photos', 'credits.json')
R.UA = {'User-Agent': 'curiosity-box/0.1 (personal question-asking app for a child; github Asmaasma1111)'}
_plan = R.plan
R.plan = lambda: {k: v for k, v in _plan().items() if not k.startswith('_')}
W, H = 1024, 768
R.N = 8                    # eight candidates a row on the contact sheets


def big(meta, d, i):
    """the chosen photo at a size good for the iPad (the candidates are only 500 px wide)"""
    if meta.get('via') == 'Pexels':
        return R.get(f"https://images.pexels.com/photos/{meta['id']}/pexels-photo-{meta['id']}.jpeg?auto=compress&cs=tinysrgb&w=1280")
    if meta.get('via') == 'Wikimedia Commons':
        q = ('https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=1280&titles='
             + urllib.parse.quote(meta['id']))
        pages = json.loads(R.get(q))['query']['pages']
        ii = list(pages.values())[0]['imageinfo'][0]
        return R.get(ii.get('thumburl') or ii['url'])
    return open(os.path.join(R.CAND, d, f'{i}.jpg'), 'rb').read()


def build():
    from PIL import Image, ImageOps
    picks = json.load(open(R.PICKS, encoding='utf-8'))
    os.makedirs(R.OUT, exist_ok=True)
    big_dir = os.path.join(R.CAND, '..', 'big'); os.makedirs(big_dir, exist_ok=True)
    credits = []
    for c, pk in picks.items():
        if c.startswith('_'):
            continue
        d = pk.get('dir', c); i = pk['i']
        meta = {m['i']: m for m in json.load(open(os.path.join(R.CAND, d, 'meta.json')))}[i]
        cache = os.path.join(big_dir, f'{d}-{i}.jpg')
        for tries in range(5):    # Wikimedia answers 429 when files come too fast: wait and try again
            if os.path.exists(cache):
                break
            try:
                data = big(meta, d, i); open(cache, 'wb').write(data)
            except Exception as e:
                print(c, 'waiting', type(e).__name__, flush=True); time.sleep(6 + tries * 8)
        im = ImageOps.exif_transpose(Image.open(cache).convert('RGB'))
        w, h = im.size; z = pk.get('zoom', 1)
        cw = min(w, h * W / H) / z; ch = cw * H / W
        x0 = (w - cw) * pk.get('fx', .5); y0 = (h - ch) * pk.get('fy', .5)
        im = im.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((W, H), Image.LANCZOS)
        q = 80
        while True:
            buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6)
            if buf.tell() < 140 * 1024 or q <= 44:
                break
            q -= 6
        open(os.path.join(R.OUT, c.lower() + '.webp'), 'wb').write(buf.getvalue())
        lic = meta['license']; lic = 'CC0 1.0' if lic == 'cc0' else 'Public Domain Mark' if lic == 'pdm' else lic
        credits.append({'photo': c, 'title': meta.get('title'), 'creator': meta.get('creator'), 'licence': lic,
                        'link': meta.get('link'), 'via': meta.get('via')})
        print(c, buf.tell() // 1024, 'KB', flush=True)
    json.dump(credits, open(R.CREDITS, 'w'), ensure_ascii=False, indent=1)
    lines = ['# Curiosity Box photos', '', 'Real photos (her rule, 20 Oct 2026), cropped to 4:3. Pexels photos are under the Pexels License',
             '(https://www.pexels.com/license/: free to use, no attribution required); Wikimedia Commons photos carry the licence shown.', '',
             '| Mystery | Source | Licence | Link |', '|---|---|---|---|']
    for c in sorted(credits, key=lambda x: x['photo']):
        lines.append(f"| {c['photo']} | {c.get('via') or ''}{(' (' + c['creator'] + ')') if c.get('creator') else ''} | {c['licence']} | {c.get('link') or ''} |")
    sounds = [(c, pk['sound']) for c, pk in picks.items() if not c.startswith('_') and pk.get('sound')]
    if sounds:
        lines += ['', '## Sounds', '', '| Mystery | Source | Licence | Link |', '|---|---|---|---|']
        lines += [f"| {c} | {s['via']} ({s['file']}, faded in and out, made gentler) | {s['licence']} | {s['link']} |" for c, s in sounds]
    open(os.path.join(R.OUT, 'CREDITS.md'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    print(len(credits), 'photos in assets/curiosity/photos (and its CREDITS.md)')


def pexels():
    R.ROOT_P = os.path.join(ROOT, 'content', 'curiosity', 'photos', 'pexels-ids.txt')
    src = R.ROOT_P
    for part in open(src, encoding='utf-8').read().strip().split(';'):
        if not part.strip():
            continue
        c, ids = part.strip().split(':'); ids = [x for x in ids.split(',') if x]
        d = os.path.join(R.CAND, c + '-p'); os.makedirs(d, exist_ok=True)
        if os.path.exists(os.path.join(d, 'meta.json')):
            continue
        meta = []
        for i, pid in enumerate(ids[:8]):
            try:
                open(os.path.join(d, f'{i}.jpg'), 'wb').write(R.get(f'https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg?auto=compress&cs=tinysrgb&w=500'))
            except Exception as e:
                print(c, pid, 'download failed', type(e).__name__, flush=True); continue
            meta.append({'i': i, 'id': pid, 'title': f'Pexels photo {pid}', 'creator': '', 'license': 'Pexels License', 'source': 'pexels',
                         'link': f'https://www.pexels.com/photo/{pid}/', 'via': 'Pexels'})
        json.dump(meta, open(os.path.join(d, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
        print(c, len(meta), flush=True)


if __name__ == '__main__':
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == 'commons': R.commons(args)
    elif cmd == 'pexels': pexels()
    elif cmd == 'sheet': R.sheet(args)
    elif cmd == 'build': build()
