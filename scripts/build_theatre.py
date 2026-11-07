#!/usr/bin/env python3
"""مسرح المسائل: builds theatre/data/stories.json from scripts/theatre_bank.py and theatre/files.json (the list the
service worker caches). Each story's numbers are read from its own text (Arabic-Indic digits).

  python3 scripts/build_theatre.py            build
  python3 scripts/build_theatre.py --pdf F    also compare every story, letter by letter, with the PDF's text layer
                                              (pdftotext; tashkeel and letter order are ignored, the letters must match)
The answers are checked by node scripts/test_theatre.js (it works each one out from the shape and the numbers)."""
import json, os, re, subprocess, sys, unicodedata
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from theatre_bank import STORIES, TWINS, TASKS  # noqa: E402

AR = '٠١٢٣٤٥٦٧٨٩'
def nums(text):
    return [int(''.join(str(AR.index(c)) for c in m)) for m in re.findall('[٠-٩]+', text)]

def letters(s):
    s = unicodedata.normalize('NFKC', s)
    return Counter(c for c in s if unicodedata.category(c).startswith('L'))

def check_pdf(path, texts):
    raw = subprocess.run(['pdftotext', path, '-'], capture_output=True, text=True).stdout
    raw = unicodedata.normalize('NFKC', raw)
    # the PDF wraps a story over lines inside its table cell: try every run of 1 to 4 neighbouring lines
    lines = [l.strip() for l in raw.split('\n') if l.strip()]
    pool = []
    for i in range(len(lines)):
        for k in range(1, 5):
            pool.append(letters(' '.join(lines[i:i + k])))
    bad = []
    for key, t in texts:
        want = letters(t)
        if not any(p == want for p in pool):
            best = min(pool, key=lambda p: sum(((p - want) + (want - p)).values()))
            bad.append((key, t, dict((best - want)), dict((want - best))))
    return bad

def main():
    out = {'stories': [], 'twins': [], 'tasks': []}
    for stage, n, shape, thing, text, ans, extra in STORIES:
        out['stories'].append({'id': f's{stage}-{n:02d}', 'stage': stage, 'n': n, 'shape': shape, 'thing': thing,
                               'text': text, 'nums': nums(text), 'ans': ans, **{k: v for k, v in extra.items() if k != 'pieces'},
                               **({'pieces': {str(k): v for k, v in extra['pieces'].items()}} if 'pieces' in extra else {})})
    for key, shape, thing, text, ans, extra in TWINS:
        out['twins'].append({'id': 't' + key, 'pair': int(key[0]), 'shape': shape, 'thing': thing, 'text': text,
                             'nums': nums(text), 'ans': ans, **extra})
    for n, kind, text in TASKS:
        out['tasks'].append({'id': f'w{n}', 'n': n, 'kind': kind, 'text': text})
    ids = [s['id'] for s in out['stories'] + out['twins'] + out['tasks']]
    assert len(ids) == len(set(ids)), 'duplicate id'
    os.makedirs(os.path.join(ROOT, 'theatre/data'), exist_ok=True)
    with open(os.path.join(ROOT, 'theatre/data/stories.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    per = Counter(s['stage'] for s in out['stories'])
    print('stories per stage:', dict(sorted(per.items())), '| twins:', len(out['twins']), '| tasks:', len(out['tasks']))

    # the files the service worker keeps for offline use
    files = []
    for d in ('theatre',):
        for root, _, names in os.walk(os.path.join(ROOT, d)):
            for nm in sorted(names):
                if nm.startswith(('.', '_')) or nm.endswith('.md'): continue
                p = os.path.relpath(os.path.join(root, nm), ROOT)
                if p == 'theatre/files.json': continue
                files.append(p)
    with open(os.path.join(ROOT, 'theatre/files.json'), 'w', encoding='utf-8') as f:
        json.dump({'files': sorted(files)}, f, ensure_ascii=False, indent=1)
    print('files.json:', len(files), 'files')

    if '--pdf' in sys.argv:
        pdf = sys.argv[sys.argv.index('--pdf') + 1]
        texts = [(s['id'], s['text']) for s in out['stories'] + out['twins']] + [(t['id'], t['text']) for t in out['tasks']]
        bad = check_pdf(pdf, texts)
        print(f'PDF check: {len(texts) - len(bad)}/{len(texts)} match letter for letter')
        for key, t, extra_in_pdf, missing_in_pdf in bad:
            print(' ', key, t, '| PDF has more:', extra_in_pdf, '| PDF lacks:', missing_in_pdf)

if __name__ == '__main__':
    main()
