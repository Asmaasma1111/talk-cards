"""Build the shareable Prepositions app from this folder (same code, Mama's deck only, nothing of Maria's).

Usage: python3 scripts/export_prepositions.py [TARGET]   (default ~/Downloads/06_Projects_and_Code/prepositions-app)
Then commit and push TARGET; it is published at https://asmaasma1111.github.io/prepositions/.
"""
import json, os, re, shutil, sys

SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else '~/Downloads/06_Projects_and_Code/prepositions-app')
os.makedirs(os.path.join(DST, 'fonts'), exist_ok=True)

for f in ['app.js', 'style.css', 'sw.js', 'prepositions.json', '.nojekyll',
          'fonts/literata.woff2', 'fonts/atkinson-400.woff2', 'fonts/atkinson-700.woff2',
          'fonts/atkinson-400-italic.woff2', 'fonts/atkinson-700-italic.woff2']:
    shutil.copy2(os.path.join(SRC, f), os.path.join(DST, f))

# page: same markup, switched to the Prepositions app and Mama's look from the first paint
page = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
subs = [
    ('<html lang="en">', '<html lang="en" data-app="prepositions">'),
    ('<title>Talk Cards</title>', '<title>Prepositions</title>'),
    ('<meta name="theme-color" content="#F6F8FF">', '<meta name="theme-color" content="#EEF2F7">'),
    ('<meta name="apple-mobile-web-app-title" content="Talk Cards">', '<meta name="apple-mobile-web-app-title" content="Prepositions">'),
    ('<link rel="preload" href="fonts/andika-700.woff2" as="font" type="font/woff2" crossorigin>\n', ''),
    ('<body>', '<body data-profile="mama" class="single">'),
]
for old, new in subs:
    if old not in page:
        raise SystemExit(f'index.html changed, update export_prepositions.py: {old[:50]}')
    page = page.replace(old, new)
open(os.path.join(DST, 'index.html'), 'w', encoding='utf-8').write(page)

json.dump({
    'name': 'Prepositions', 'short_name': 'Prepositions', 'start_url': './', 'scope': './',
    'display': 'standalone', 'orientation': 'any', 'background_color': '#EEF2F7', 'theme_color': '#EEF2F7',
    'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
              {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'}],
}, open(os.path.join(DST, 'manifest.json'), 'w'), indent=2)

# recorded voice: Mama's deck only (if any clips exist yet)
audio_src, audio_dst = os.path.join(SRC, 'audio'), os.path.join(DST, 'audio')
shutil.rmtree(audio_dst, ignore_errors=True)
vj = os.path.join(audio_src, 'voice.json')
clips = 0
if os.path.exists(vj):
    v = json.load(open(vj, encoding='utf-8'))
    mama = v.get('decks', {}).get('mama')
    if mama and mama['clips']:
        os.makedirs(audio_dst)
        for c in mama['clips'].values():
            shutil.copy2(os.path.join(audio_src, c['f']), audio_dst)
        shutil.copy2(os.path.join(audio_src, '_unlock.m4a'), audio_dst)
        json.dump({'v': 2, 'decks': {'mama': mama}}, open(os.path.join(audio_dst, 'voice.json'), 'w', encoding='utf-8'),
                  ensure_ascii=False, separators=(',', ':'))
        clips = len(mama['clips'])

# icon: a white card with a yellow gap on the accent blue
if not os.path.exists(os.path.join(DST, 'icon-512.png')):
    from PIL import Image, ImageDraw, ImageFilter
    S = 2048
    img = Image.new('RGB', (S, S), (45, 91, 211))
    sh = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([370, 520, 1678, 1600], radius=150, fill=(10, 20, 60, 110))
    img.paste(sh.filter(ImageFilter.GaussianBlur(60)), (0, 40), sh.filter(ImageFilter.GaussianBlur(60)))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([370, 480, 1678, 1560], radius=150, fill=(255, 255, 255))
    grey, slot = (214, 221, 233), (255, 227, 110)
    d.rounded_rectangle([560, 760, 1488, 840], radius=40, fill=grey)
    d.rounded_rectangle([560, 980, 860, 1060], radius=40, fill=grey)
    d.rounded_rectangle([910, 960, 1190, 1080], radius=30, fill=slot)
    d.rounded_rectangle([1240, 980, 1488, 1060], radius=40, fill=grey)
    d.rounded_rectangle([560, 1200, 1250, 1280], radius=40, fill=grey)
    for n in (512, 192):
        img.resize((n, n), Image.LANCZOS).save(os.path.join(DST, f'icon-{n}.png'), optimize=True)

readme = """# Prepositions

Flashcards for English prepositions in conversation, with spaced repetition.

**Open it:** https://asmaasma1111.github.io/prepositions/

- Each card is a sentence with one gap. Say the whole sentence aloud, then flip the card.
- The back fills the gap (or shows "no preposition"), gives the rule, and reads the sentence aloud.
- Rate yourself with **Again** or **Good!** Cards come back after 1, 2, 4, 8 … 64 days.
- 10 new cards a day by default (change it under the gear).
- Works offline. On an iPad or iPhone: open the link in Safari, tap Share, then Add to Home Screen.
- Your progress stays on your own device. No account, no tracking.

Made by Dr. Asma Khattala. The cards are in `prepositions.json`.
"""
open(os.path.join(DST, 'README.md'), 'w', encoding='utf-8').write(readme)
open(os.path.join(DST, '.gitignore'), 'w').write('.DS_Store\n_dev_mock.js\n')
print(f'Prepositions app written to {DST} ({clips} recorded clips)')
