"""Maria Reads: real photos for every picture (her request, 20 Oct 2026: "realistic, real-life photos", not emoji or drawings).
Free licences only. Wikimedia Commons is the main source (Openverse did not answer from this Mac on 20 Oct 2026):
CC0 and public domain first, then CC BY and CC BY-SA, whose photographers are named in the credits.
Candidates go to content/reads/photos/cand/<concept>/ (local only); the chosen ones become assets/reads/photos/<concept>.webp
and a row in content/reads/photos/credits.json (the app's CREDITS.md lists them).

  python3 scripts/reads_photos.py fetch [CONCEPT ...]     Openverse, 4 candidates each (anonymous API: 20 a minute, 200 a day)
  python3 scripts/reads_photos.py commons [CONCEPT ...]   Wikimedia Commons candidates for the plan (or CONCEPT=QUERY to try other words)
  python3 scripts/reads_photos.py pexels                  download the Pexels candidates listed in content/reads/photos/pexels-ids.txt
                                                          (concept:id,id,...; found by searching pexels.com in the browser, since
                                                          its search page refuses scripts; the image server is open; Pexels License)
  python3 scripts/reads_photos.py sheet [CONCEPT ...]     contact sheets content/reads/photos/sheet-N.jpg to choose from
  python3 scripts/reads_photos.py build                   picks.json -> assets/reads/photos/*.webp and credits.json
The concepts and their search words are in scripts/reads_photo_plan.json; picks.json says which candidate (and crop) to use.
"""
import io, json, os, sys, time, urllib.parse, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAN = os.path.join(ROOT, 'scripts', 'reads_photo_plan.json')
PICKS = os.path.join(ROOT, 'scripts', 'reads_photo_picks.json')
CAND = os.path.join(ROOT, 'content', 'reads', 'photos', 'cand')
OUT = os.path.join(ROOT, 'assets', 'reads', 'photos')
CREDITS = os.path.join(ROOT, 'content', 'reads', 'photos', 'credits.json')
UA = {'User-Agent': 'maria-reads/0.1 (personal phonics app for a child; github Asmaasma1111)'}
N = 5


def get(url, timeout=40):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()


def plan():
    return json.load(open(PLAN, encoding='utf-8'))


def fetch(only):
    for c, q in plan().items():
        if only and c not in only:
            continue
        d = os.path.join(CAND, c); os.makedirs(d, exist_ok=True)
        if os.path.exists(os.path.join(d, 'meta.json')) and not only:
            continue
        url = f"https://api.openverse.org/v1/images/?q={urllib.parse.quote(q)}&license=cc0,pdm&page_size=20&mature=false&size=medium,large&category=photograph"
        try:
            res = json.loads(get(url))
        except Exception as e:
            print(c, 'API FAIL', e, flush=True); time.sleep(5); continue
        picked = [r for r in res.get('results', []) if r.get('license') in ('cc0', 'pdm') and (r.get('width') or 0) >= 500 and (r.get('height') or 0) >= 400
                  and not any(x in (r.get('title') or '').lower() for x in ('vector', 'clipart', 'logo', 'icon', 'drawing', 'illustration', 'cartoon'))][:N]
        meta = []
        for i, r in enumerate(picked):
            try:
                open(os.path.join(d, f'{i}.jpg'), 'wb').write(get(r.get('thumbnail') or r['url']))   # Openverse thumbnails (about 600 px) are enough for 480 px
            except Exception as e:
                print(c, i, 'download fail', type(e).__name__, flush=True); continue
            meta.append({'i': i, 'id': r['id'], 'title': r.get('title'), 'creator': r.get('creator'), 'license': r['license'],
                         'source': r.get('source'), 'link': r.get('foreign_landing_url'), 'url': r['url'], 'via': 'Openverse'})
        json.dump(meta, open(os.path.join(d, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
        print(c, len(meta), 'candidates', flush=True)
        time.sleep(3.4)


FREE = ('CC0', 'Public domain', 'PD', 'CC BY 4.0', 'CC BY 3.0', 'CC BY 2.0', 'CC BY 2.5', 'CC BY-SA 4.0', 'CC BY-SA 3.0', 'CC BY-SA 2.0', 'CC BY-SA 2.5')


def commons(args):
    pairs = [a.split('=', 1) for a in args if '=' in a]
    if not pairs:
        pairs = [(c, q) for c, q in plan().items() if (not args or c in args)]
    import re
    for c, q in pairs:
        d = os.path.join(CAND, c); os.makedirs(d, exist_ok=True)
        if os.path.exists(os.path.join(d, 'meta.json')) and json.load(open(os.path.join(d, 'meta.json'))) and not args:
            continue
        url = ('https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=40&gsrsearch='
               + urllib.parse.quote(f'{q} filetype:bitmap') + '&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=500')   # a standard size Commons keeps ready (other sizes are rendered on demand and rate-limited)
        try:
            res = json.loads(get(url))
        except Exception as e:
            print(c, 'API FAIL', e, flush=True); time.sleep(3); continue
        pages = sorted((res.get('query', {}).get('pages', {}) or {}).values(), key=lambda p: p.get('index', 99))
        rows = []
        for pg in pages:
            ii = (pg.get('imageinfo') or [{}])[0]; em = ii.get('extmetadata', {})
            lic = (em.get('LicenseShortName', {}).get('value') or '').strip()
            if not any(lic.startswith(f) for f in FREE) or ii.get('mime') not in ('image/jpeg', 'image/png', 'image/webp'):
                continue
            if (ii.get('width') or 0) < 500 or (ii.get('height') or 0) < 400:
                continue
            title = pg['title'].replace('File:', '')
            if any(x in title.lower() for x in ('drawing', 'illustration', 'clipart', 'logo', 'icon', 'cartoon', 'diagram', 'map of', 'svg')):
                continue
            rank = 0 if lic.startswith(('CC0', 'Public', 'PD')) else 1
            rows.append((rank, pg, ii, em, lic, title))
        rows.sort(key=lambda r: r[0])
        meta = []
        for i, (rank, pg, ii, em, lic, title) in enumerate(rows[:N]):
            data = None
            for tries in range(4):   # Wikimedia answers 429 when thumbnails come too fast: wait and try again
                try:
                    data = get(ii['thumburl']); break
                except Exception as e:
                    time.sleep(3 + tries * 4)
            if not data:
                print(c, i, 'download failed', flush=True); continue
            open(os.path.join(d, f'{i}.jpg'), 'wb').write(data)
            artist = re.sub('<[^>]+>', '', em.get('Artist', {}).get('value') or '').strip()[:120]
            meta.append({'i': i, 'id': pg['title'], 'title': title, 'creator': artist, 'license': lic, 'source': 'wikimedia commons',
                         'link': ii.get('descriptionurl'), 'url': ii.get('url'), 'via': 'Wikimedia Commons'})
            time.sleep(0.4)
        json.dump(meta, open(os.path.join(d, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
        print(c, len(meta), 'candidates', flush=True); time.sleep(0.8)


def pexels():
    src = os.path.join(ROOT, 'content', 'reads', 'photos', 'pexels-ids.txt')
    for part in open(src, encoding='utf-8').read().strip().split(';'):
        c, ids = part.split(':'); ids = [x for x in ids.split(',') if x]
        d = os.path.join(CAND, c + '-p'); os.makedirs(d, exist_ok=True)
        if os.path.exists(os.path.join(d, 'meta.json')):
            continue
        meta = []
        for i, pid in enumerate(ids[:5]):
            try:
                open(os.path.join(d, f'{i}.jpg'), 'wb').write(get(f'https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg?auto=compress&cs=tinysrgb&w=500'))
            except Exception as e:
                print(c, pid, 'download failed', type(e).__name__, flush=True); continue
            meta.append({'i': i, 'id': pid, 'title': f'Pexels photo {pid}', 'creator': '', 'license': 'Pexels License', 'source': 'pexels',
                         'link': f'https://www.pexels.com/photo/{pid}/', 'via': 'Pexels'})
        json.dump(meta, open(os.path.join(d, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
        print(c, len(meta), flush=True)


def sheet(only):
    from PIL import Image, ImageDraw, ImageFont, ImageOps
    names = [c for c in plan() if (not only or c in only)]
    dirs = []
    for c in names:
        for d in ((c + '-p',) if os.environ.get('ONLY_P') else (c + '-p', c, c + '-c')):
            if os.path.exists(os.path.join(CAND, d, 'meta.json')):
                dirs.append(d)
    T, per = 170, 12
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 18)
    except Exception:
        font = ImageFont.load_default()
    out = []
    for k in range(0, len(dirs), per):
        rows = dirs[k:k + per]
        im = Image.new('RGB', (150 + N * (T + 6), len(rows) * (T + 6)), 'white'); dr = ImageDraw.Draw(im)
        for r, d in enumerate(rows):
            dr.text((6, r * (T + 6) + T // 2 - 10), d, fill='black', font=font)
            for m in json.load(open(os.path.join(CAND, d, 'meta.json'))):
                try:
                    t = ImageOps.fit(ImageOps.exif_transpose(Image.open(os.path.join(CAND, d, f"{m['i']}.jpg")).convert('RGB')), (T, T))
                except Exception:
                    continue
                x = 150 + m['i'] * (T + 6); y = r * (T + 6); im.paste(t, (x, y))
                dr.rectangle([x, y, x + 24, y + 22], fill='yellow'); dr.text((x + 6, y + 1), str(m['i']), fill='black', font=font)
        p = os.path.join(CAND, '..', f'sheet-{k // per + 1}.jpg'); im.save(p, quality=80); out.append(os.path.abspath(p))
    print('\n'.join(out))


def build():
    from PIL import Image, ImageOps
    picks = json.load(open(PICKS, encoding='utf-8'))
    os.makedirs(OUT, exist_ok=True)
    credits = []
    for c, pk in picks.items():
        if c.startswith('_'):
            continue
        if isinstance(pk, int):
            pk = {'i': pk}
        d = pk.get('dir', c); i = pk['i']
        meta = {m['i']: m for m in json.load(open(os.path.join(CAND, d, 'meta.json')))}[i]
        im = ImageOps.exif_transpose(Image.open(os.path.join(CAND, d, f'{i}.jpg')).convert('RGB'))
        w, h = im.size; z = pk.get('zoom', 1); s = int(min(w, h) / z)
        x0 = int((w - s) * pk.get('fx', .5)); y0 = int((h - s) * pk.get('fy', .5))
        im = im.crop((x0, y0, x0 + s, y0 + s)).resize((480, 480), Image.LANCZOS)
        q = 80
        while True:
            buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6)
            if buf.tell() < 60 * 1024 or q <= 40:
                break
            q -= 8
        open(os.path.join(OUT, c + '.webp'), 'wb').write(buf.getvalue())
        lic = meta['license']; lic = 'CC0 1.0' if lic == 'cc0' else 'Public Domain Mark' if lic == 'pdm' else lic
        credits.append({'photo': c, 'title': meta.get('title'), 'creator': meta.get('creator'), 'licence': lic,
                        'link': meta.get('link'), 'via': meta.get('via')})
    json.dump(credits, open(CREDITS, 'w'), ensure_ascii=False, indent=1)
    lines = ['# Maria Reads photos', '', 'Real photos (her request, 20 Oct 2026), cropped to squares. Pexels photos are under the Pexels License',
             '(https://www.pexels.com/license/: free to use, no attribution required); Wikimedia Commons photos carry the licence shown.', '',
             '| Photo | Source | Licence | Link |', '|---|---|---|---|']
    for c in sorted(credits, key=lambda x: x['photo']):
        lines.append(f"| {c['photo']} | {c.get('via') or ''}{(' (' + c['creator'] + ')') if c.get('creator') else ''} | {c['licence']} | {c.get('link') or ''} |")
    open(os.path.join(OUT, 'CREDITS.md'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    print(len(credits), 'photos in assets/reads/photos (and its CREDITS.md)')


if __name__ == '__main__':
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == 'fetch': fetch(args)
    elif cmd == 'commons': commons(args)
    elif cmd == 'pexels': pexels()
    elif cmd == 'sheet': sheet(args)
    elif cmd == 'build': build()
