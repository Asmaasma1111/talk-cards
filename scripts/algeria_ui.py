"""هيا نتعلم في الجزائر: the small icons of the trip (her request, 26 Oct 2026: "modernize the icons on top, use ChatGPT"),
drawn in ChatGPT in the clay style: one sheet of six in a row, cut out to assets/algeria/ui/<id>.webp (200 px).

    ~/Downloads/06_Projects_and_Code/maria-tenses/.venv/bin/python -I scripts/algeria_ui.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
from curiosity_tree import cutout, webp
from garden_pics import pieces, main_part, square

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDS = ['warm', 'step', 'pic', 'easy', 'door', 'explain']   # cards, lesson, picture, easy star, the doors, what it means

if __name__ == '__main__':
    src = Image.open(os.path.join(ROOT, 'content', 'algeria', 'ui', 'icons-chatgpt.png')).convert('RGB')
    boxes = pieces(src, len(IDS))
    out = os.path.join(ROOT, 'assets', 'algeria', 'ui'); os.makedirs(out, exist_ok=True)
    for k, (x0, y0, x1, y1) in zip(IDS, boxes):
        m = 8; im, _ = cutout(src.crop((max(0, x0 - m), max(0, y0 - m), min(src.width, x1 + m), min(src.height, y1 + m))))
        print(k, webp(square(main_part(im), 200), os.path.join(out, f'{k}.webp')), 'KB')
