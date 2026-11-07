"""مسرح المسائل: the things she drags and the containers that hold 10, 100 or 1000 of them, as 3D icons from
Microsoft Fluent Emoji (https://github.com/microsoft/fluentui-emoji, MIT licence: free to use, keep the notice).
Her request, 7 Nov 2026: better pictures from the web than squares and system emoji; three boxes with a number under each.

  python3 -I scripts/theatre_icons.py      downloads the 3D PNGs, trims them, saves 160 px WebP files:
                                           theatre/assets/things/<thing>.webp and theatre/assets/packs/<container>.webp
People use the medium skin tone (dark hair). Things without a Fluent icon (none in stages 1 to 3 today) keep their emoji.
"""
import io, os, sys, urllib.parse, urllib.request
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CDN = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/'
TONE = 'Medium'
# thing key -> Fluent folder name (the app's THINGS list in theatre/js/ui.js)
THINGS = {
    'book': 'Closed book', 'story': 'Green book', 'story2': 'Blue book', 'page': 'Page facing up', 'paper': 'Page facing up',
    'sticker': 'Star', 'egg': 'Egg', 'chicken': 'Chicken', 'visitor': 'Person standing*', 'passenger': 'Person standing*',
    'student': 'Girl*', 'girl': 'Girl*', 'student2': 'Boy*', 'boy': 'Boy*', 'mother': 'Woman with headscarf*', 'glasses': 'Glasses',
    'cube': 'Brick', 'riyal': 'Coin', 'card': 'Joker', 'date': 'Chestnut', 'squishy': 'Dango', 'water': 'Droplet', 'step': 'Footprints',
    'ball': 'Soccer ball', 'ball-red': 'Red circle', 'ball-blue': 'Blue circle', 'sheep': 'Ewe', 'goat': 'Goat', 'palm': 'Palm tree',
    'lemon': 'Lemon', 'pencil': 'Pencil', 'crayon': 'Crayon', 'crate': 'Package', 'orange': 'Tangerine', 'apple': 'Red apple',
    'cake': 'Cupcake', 'strawberry': 'Strawberry', 'banana': 'Banana', 'candy': 'Candy', 'tree': 'Deciduous tree',
    'chair': 'Chair', 'wheel': 'Wheel', 'paw': 'Paw prints', 'day': 'Calendar', 'seat': 'Seat', 'balloon': 'Balloon', 'star': 'Star',
    'choc': 'Chocolate bar', 'tile': 'Brick', 'plant': 'Potted plant', 'necklace': 'Prayer beads',
}
# container name -> Fluent folder name (the app's PACKS list says which container holds 10, 100 or 1000 of each thing)
PACKS = {
    'box': 'Package', 'books': 'Books', 'basket': 'Basket', 'nest': 'Nest with eggs', 'bags': 'Shopping bags', 'minibus': 'Minibus',
    'bus': 'Bus', 'stadium': 'Stadium', 'bucket': 'Bucket', 'bath': 'Bathtub', 'island': 'Desert island', 'park': 'National park',
    'hut': 'Hut', 'houses': 'Houses', 'pickup': 'Pickup truck', 'truck': 'Delivery truck', 'notebook': 'Notebook',
    'ledger': 'Ledger', 'filebox': 'Card file box', 'steps': 'Footprints', 'album': 'Notebook with decorative cover',
}


def url(name):
    tone = name.endswith('*'); name = name.rstrip('*')
    file = name.lower().replace(' ', '_')
    if tone:
        return CDN + urllib.parse.quote(f'{name}/{TONE}/3D/{file}_3d_{TONE.lower()}.png')
    return CDN + urllib.parse.quote(f'{name}/3D/{file}_3d.png')


def save(name, dest):
    data = urllib.request.urlopen(urllib.request.Request(url(name), headers={'User-Agent': 'maria-theatre/0.1'}), timeout=40).read()
    im = Image.open(io.BytesIO(data)).convert('RGBA')
    im = im.crop(im.getbbox())
    s = max(im.size); sq = Image.new('RGBA', (s, s), (0, 0, 0, 0)); sq.paste(im, ((s - im.width) // 2, (s - im.height) // 2))
    sq = sq.resize((160, 160), Image.LANCZOS)
    sq.save(dest, 'WEBP', quality=86, method=6)


def main():
    done, failed, cache = 0, [], {}
    for sub, table in (('things', THINGS), ('packs', PACKS)):
        d = os.path.join(ROOT, 'theatre', 'assets', sub); os.makedirs(d, exist_ok=True)
        for key, name in table.items():
            dest = os.path.join(d, key + '.webp')
            try:
                if name in cache:
                    open(dest, 'wb').write(open(cache[name], 'rb').read())
                else:
                    save(name, dest); cache[name] = dest
                done += 1
            except Exception as e:
                failed.append(f'{sub}/{key} ({name}): {type(e).__name__}')
    open(os.path.join(ROOT, 'theatre', 'assets', 'ICONS.md'), 'w', encoding='utf-8').write(
        '# مسرح المسائل icons\n\nThe things and containers are 3D icons from Microsoft Fluent Emoji\n'
        '(https://github.com/microsoft/fluentui-emoji), MIT licence, Copyright (c) Microsoft Corporation.\n'
        'Made by scripts/theatre_icons.py (trimmed, 160 px WebP).\n')
    print(done, 'icons saved'); print('\n'.join(failed) or 'none failed')


if __name__ == '__main__':
    main()
