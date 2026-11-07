"""كرّاس الإملاء: brings the ChatGPT pictures into the app.
Takes ~/Downloads/dk-<name>.png (as saved from ChatGPT, about 2 MB each), shrinks each to the size the app shows it at,
compresses it with pngquant (kept as PNG, transparency kept) and writes dictation/assets/<name>.png. The originals are
moved to ~/Downloads/dictation-pictures-originals/ so they are kept but never published. Then run
node scripts/build_dictation.js so the offline list includes them.
  python3 scripts/dictation_pictures.py            every dk-*.png waiting in Downloads
"""
import glob, os, shutil, subprocess, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'dictation', 'assets')
SRC = os.path.expanduser('~/Downloads')
KEEP = os.path.join(SRC, 'dictation-pictures-originals')
# longest side in pixels, by name (about twice the largest size the app shows it at, for the iPad's sharp screen)
def target(name):
    if name.startswith('cover_') or name == 'paper':
        return 1200
    if name == 'shelf':
        return 1400
    if name.startswith('shelf_'):
        return 720
    if name.startswith('sticker_'):
        return 400
    return 600   # the tile, baskets, sun, moon, pens, the finished copybook, the skill pictures


def main():
    files = sorted(f for f in glob.glob(os.path.join(SRC, 'dk-*.png')) if not f.endswith('-alt.png') and ' (' not in f)
    os.makedirs(KEEP, exist_ok=True)
    for f in files:
        name = os.path.basename(f)[3:-4]
        im = Image.open(f)
        im.load()
        if name == 'shelf' and im.mode == 'RGBA':
            # the app stands the copybooks on the bottom fifth: crop to the board and put it along the bottom edge
            box = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
            board = im.crop(box)
            canvas = Image.new('RGBA', (board.width, board.height * 5), (0, 0, 0, 0))
            canvas.paste(board, (0, canvas.height - board.height))
            im = canvas
        n = target(name)
        if max(im.size) > n:
            im.thumbnail((n, n), Image.LANCZOS)
        out = os.path.join(OUT, name + '.png')
        im.save(out, optimize=True)
        subprocess.run(['pngquant', '--force', '--skip-if-larger', '--quality', '70-92', '--speed', '1', '--output', out, out], check=False)
        print(f'{name}: {im.size[0]}x{im.size[1]} {im.mode}, {os.path.getsize(out) // 1024} KB')
        shutil.move(f, os.path.join(KEEP, os.path.basename(f)))
    for f in glob.glob(os.path.join(SRC, 'dk-*-alt.png')):   # ChatGPT's second drafts: kept with the originals, not used
        shutil.move(f, os.path.join(KEEP, os.path.basename(f)))
    print(f'{len(files)} pictures brought in')


if __name__ == '__main__':
    sys.exit(main())
