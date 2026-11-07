"""مسرح المسائل: one picture sheet of every icon (the thing, then what holds 10, 100, 1000 of it) for Mama to approve.
python3 -I scripts/theatre_icon_sheet.py  ->  content/theatre/icons-review-1.png, -2.png (local only)"""
import os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'theatre', 'assets')
F = os.path.expanduser('~/Library/Fonts/Tajawal-Bold.ttf')
AR = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')
NAME = {'book': 'كتاب', 'story': 'قصّة', 'story2': 'قصّة (٢)', 'page': 'صفحة', 'paper': 'ورقة', 'sticker': 'ملصق', 'egg': 'بيضة',
        'chicken': 'دجاجة', 'visitor': 'زائر', 'passenger': 'راكب', 'student': 'طالبة', 'girl': 'بنت', 'student2': 'طالب', 'boy': 'ولد',
        'mother': 'أمّ', 'glasses': 'نظّارة', 'cube': 'سنتيمتر / كيلوغرام', 'riyal': 'ريال', 'date': 'تمرة', 'squishy': 'سكويشي',
        'water': 'لتر ماء', 'step': 'خطوة', 'ball': 'كرة', 'ball-red': 'كرة حمراء', 'ball-blue': 'كرة زرقاء', 'sheep': 'خروف',
        'goat': 'ماعز', 'palm': 'نخلة', 'lemon': 'ليمونة', 'pencil': 'قلم', 'crayon': 'قلم تلوين', 'crate': 'صندوق', 'orange': 'برتقالة',
        'apple': 'تفّاحة', 'cake': 'كعكة', 'strawberry': 'فراولة', 'banana': 'موزة', 'candy': 'حلوى', 'tree': 'شجرة'}
PACKS = {}   # filled from theatre/js/ui.js below, so the sheet shows exactly what the app shows
import re, json
src = open(os.path.join(ROOT, 'theatre', 'js', 'ui.js'), encoding='utf-8').read()
m = re.search(r'const PACKS = (\{.*?\n\});', src, re.S)
PACKS = json.loads(re.sub(r"'", '"', re.sub(r'([{,]\s*)([A-Za-z_][\w-]*|\d+)\s*:', r'\1"\2":', m.group(1))))
f_big, f_mid, f_n = ImageFont.truetype(F, 34), ImageFont.truetype(F, 22), ImageFont.truetype(F, 24)
ICON, ROWH, W = 96, 140, 1100


def pack_cell(im, x, y, key, v, cont):
    c = Image.open(os.path.join(A, 'packs', cont + '.webp')).convert('RGBA').resize((ICON, ICON))
    t = Image.open(os.path.join(A, 'things', key + '.webp')).convert('RGBA').resize((44, 44))
    im.alpha_composite(c, (x, y))
    d = ImageDraw.Draw(im); d.ellipse([x + ICON - 40, y + ICON - 46, x + ICON + 8, y + ICON + 2], fill=(255, 255, 255, 255), outline=(220, 210, 230, 255), width=2)
    im.alpha_composite(t, (x + ICON - 38, y + ICON - 44))
    lab = str(v).translate(AR); w = d.textlength(lab, font=f_n)
    d.rounded_rectangle([x + ICON / 2 - w / 2 - 12, y + ICON + 4, x + ICON / 2 + w / 2 + 12, y + ICON + 36], 16, fill=(59, 30, 63, 255))
    d.text((x + ICON / 2, y + ICON + 20), lab, font=f_n, fill='white', anchor='mm')


keys = list(NAME)
per = 14
for k in range(0, len(keys), per):
    rows = keys[k:k + per]
    im = Image.new('RGBA', (W, 70 + len(rows) * ROWH), (255, 250, 244, 255)); d = ImageDraw.Draw(im)
    for x, txt in ((W - 40, 'الشيء'), (W - 450, 'العلبة التي فيها ١٠'), (W - 680, 'فيها ١٠٠'), (W - 900, 'فيها ١٠٠٠')):
        d.text((x, 30), txt, font=f_mid, fill=(120, 90, 130), anchor='rm', direction='rtl')
    for r, key in enumerate(rows):
        y = 70 + r * ROWH
        d.line([20, y - 6, W - 20, y - 6], fill=(235, 225, 230), width=1)
        t = Image.open(os.path.join(A, 'things', key + '.webp')).convert('RGBA').resize((ICON, ICON))
        im.alpha_composite(t, (W - 40 - ICON, y + 10))
        d.text((W - 160, y + 58), NAME[key], font=f_big, fill=(59, 30, 63), anchor='rm', direction='rtl')
        p = PACKS.get(key, {})
        if key == 'riyal':
            d.text((W - 450, y + 58), 'أوراق نقدية خضراء: ١٠ ريال، ١٠٠ ريال، ١٠٠٠ ريال', font=f_mid, fill=(47, 158, 99), anchor='rm', direction='rtl'); continue
        for v, x in ((10, W - 560), (100, W - 780), (1000, W - 1000)):
            cont = p.get(str(v)) or (PACKS['_'].get(str(v)) if not p else None)
            if cont: pack_cell(im, x, y + 6, key, v, cont)
    out = os.path.join(ROOT, 'content', 'theatre', f'icons-review-{k // per + 1}.png'); im.convert('RGB').save(out); print(out)
