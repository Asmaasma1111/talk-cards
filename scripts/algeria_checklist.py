"""هيا نتعلم في الجزائر: Mama's checklist, made from algeria.json so it always matches the app (every Arabic line she should
check, city by city).   python3 -I scripts/algeria_checklist.py   ->   ~/Downloads/Algeria_Week1_Checklist.md"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, 'algeria.json'), encoding='utf-8'))
OUT = os.path.expanduser('~/Downloads/Algeria_Week1_Checklist.md')

HEAD = """# هيا نتعلم في الجزائر: checklist for Mama

For Mama. British English; the Arabic is exactly as in the app. Made from the app's content, so it matches what Maria sees.

## How it works now

- The tile opens on **two doors**: **العربية** (the trip across the map) and **الرياضيات** (the maths train).
- **The trip (Arabic), about 10 minutes a day:**
  1. On the first day in a city, the postcard is **read to her once, in full**, line by line; «التالي» appears only at the
     end. Then she reads it aloud herself. No replay.
  2. Warm-up cards (Talk Cards' flip card, ✓ and ✗). A card she gets wrong comes back at the end of the warm-up and again
     tomorrow; a known card comes back after 1, 2, 4, 8... days.
  3. The city's Arabic step: watch and listen to a worked example, one question with help, then 8 alone. **A question she
     gets wrong comes back once at the end** («مرّةً أخرى 🔁») and becomes a card of **«أخطائي»**, seen again tomorrow
     and then after 1, 2 and 4 days. Right on four spaced days and it leaves the deck.
  4. The picture of the day: five prompts (👀 what she sees, 🎨 colours, 🏞️ background, 💛 feeling, 🤔 what she thinks).
     Writing in her notebook (📷 photo, 🎙️ reading) and speaking take turns, day by day. Then the WHOLE model description
     is read once, in the same five parts, whatever her level.
  5. An easy last question, then «عودي غداً 🌟». The step passes after two different days with at most one mistake
     alone; then the city's stamp goes into her passport and the trip moves on.
- **What the words mean:** on a lesson's first day, «ما معنى هذا؟» is read to her line by line; later «📖 الشرح»
  opens it again.
- **More practice:** «تدرّبي أكثر» after every lesson, as often as she likes. For الماضي the rounds alternate: the
  verb's table to choose, 8 mixed questions, the verb's table to WRITE with the pen, 8 mixed... Two verbs a day in the
  lesson itself are written by hand on copybook lines (red margin on the right); she checks herself against the answer.
- **The maths train:** one station a lesson (15), opening one by one. Each lesson has a worked example with its reasons
  **in red**, also behind «👀 المثال» during practice. Every question has squared rough paper beside it for the iPad pen.
  A question she misses comes back at the end of the round and at the start of her next rounds, until she gets it right
  on three spaced days. When a new station opens, the train rolls there with its whistle and chugging.
- **Mama's view:** hold the gear on the trip home for 2 seconds (English).

## Tick as you go

- [ ] The two doors open the trip and the train.
- [ ] Postcard: the voice reads every line once; she cannot skip; then she reads it herself.
- [ ] A wrong answer in the Arabic step comes back at the end, and as a «أخطائي» card the next day.
- [ ] The rough paper works with the pen, and a resting hand does not draw.
- [ ] The train's whistle and chugging are pleasant, not too loud.
- [ ] The session takes about 10 minutes. Tell me if it is longer or shorter.

## Things to tell me

- Is any step too hard or too easy? (Mama's view can repeat or pass a step.)
- Are the pictures clear enough to describe?
- Any Arabic line below to correct.

"""

def card_line(c):
    f = c.get('num') or c['f']
    ask = f" ({c['ask']} {c['mark']})" if c.get('mark') else ''
    return f"- {f}{ask} → {c['b']}" + (f" · {c['s']}" if c.get('s') else '')

out = [HEAD]
for c in [c for c in D['cities'] if c.get('ready')]:
    out.append(f"## City {c['n']}: {c['name']} ({c['nick']})\n")
    out.append('### The postcard (heard once, then she reads it)')
    out += [f"- {p['t']}" for p in c['post']]
    out.append('\n### Its culture cards')
    out += [card_line(D['cards'][k]) for k in c['cards'] if k in D['cards']]
    teach = sorted({k for p in c['pics'] for k in D['pics'][p].get('teach', [])} - set(c['cards']))
    out += [card_line(D['cards'][k]) + ' (with its photo)' for k in teach if k in D['cards']]
    for sid in c['steps']:
        st = D['steps'][sid]
        out.append(f"\n### Arabic step: {st['title']}")
        out += [f"- {x['t']}" for x in st['rule']]
        out.append('- Grammar cards:')
        out += ['  ' + card_line(D['cards'][k]) for k in st.get('teachDay1', []) + st.get('teachPass', []) if k in D['cards']]
        if st.get('worked') and isinstance(st['worked'][0], dict):
            out.append('- Worked examples (heard):')
            out += [f"  - {x['t']}" for x in st['worked']]
        for bank in ('jarr', 'dami'):
            if st.get(bank):
                out.append('- Sentences:'); out += [f"  - {' '.join(j['w'])}." for j in st[bank].values()]
        if st.get('fill'):
            out.append('- Fill the gap (the right word, then the two wrong ones):')
            out += [f"  - {q} → {r} (not {' / '.join(w)})" for q, r, w in st['fill']]
    out.append('\n### The pictures of the day (the model description, read once)')
    for p in c['pics']:
        pic = D['pics'][p]
        out.append(f"**{p}**")
        heads = {'see': '👀 ماذا أرى؟', 'colours': '🎨 الألوان', 'back': '🏞️ في الخلفيّة', 'feel': '💛 بماذا أشعر؟', 'think': '🤔 ماذا أظنّ؟'}
        for d in pic.get('desc', []):
            out.append(f"- {heads[d['k']]}: " + ' '.join(x['t'] for x in d['lines']))
        out.append('')
out.append('## Photos\nAll content pictures are real photos (Wikimedia Commons and Pexels), credited in assets/algeria/photos/CREDITS.md. '
           'ChatGPT drew only the trip world: the icon, the map, the stamps, the train and the maths pictures.\n')
open(OUT, 'w', encoding='utf-8').write('\n'.join(out))
print(OUT, sum(len(x.splitlines()) for x in out), 'lines')
