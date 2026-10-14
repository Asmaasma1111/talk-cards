"""Second opinion on the stories' tashkeel: Gemini vocalizes the same texts on its own, then every word where the two
versions differ is listed for a person (or Claude) to decide.

python3 scripts/tashkeel_compare.py d01 d02 ...      (default: every story that has content/stories/tashkeel/dXX.json)
Gemini's versions go to content/stories/tashkeel/gemini/dXX.json; the report to content/stories/tashkeel/compare.md.
The key is read from .env (GEMINI_API_KEY). Only the text is sent, never anything about Maria.
"""
import json, os, re, sys, time, unicodedata, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tashkeel import DIR, ROOT, MARKS, strip

KEY = next(l.split('=', 1)[1].strip() for l in open(os.path.join(ROOT, '.env')) if l.startswith('GEMINI_API_KEY='))
MODELS = os.environ.get('MODELS', 'gemini-3.8-flash,gemini-3.5-flash').split(',')
PROMPT = """You are an expert Arabic teacher. Add FULL, correct tashkeel (all short vowels, sukun, shadda, tanween and the grammatical
case and mood endings on every word, sentence-final words included) to every value of this JSON object. It is a children's
story in Modern Standard Arabic for an 8-year-old girl. Never change, add or remove a letter, space or punctuation mark; keep
every hamza form, ة/ه and ى/ي exactly as written. Names: لِينَا، نُوف، جُود، هِنْد، رِيم، جَنَى، هَيْفَاء، مَامَا، بَابَا. Answer with the
JSON object only, same keys."""

def ask(src):
    body = {'contents': [{'parts': [{'text': PROMPT + '\n\n' + json.dumps(src, ensure_ascii=False)}]}],
            'generationConfig': {'response_mime_type': 'application/json', 'temperature': 0}}
    for model in MODELS:
        for _ in range(3):
            req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
                                         data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'x-goog-api-key': KEY})
            try:
                r = json.load(urllib.request.urlopen(req, timeout=180))
                return json.loads(r['candidates'][0]['content']['parts'][0]['text']), model
            except Exception as e:
                print('  ', model, str(e)[:120]); time.sleep(8)
    raise SystemExit('Gemini did not answer')

def norm(w):
    w = unicodedata.normalize('NFC', w)
    w = re.sub('ًا$', 'اً', w)               # tanween fath before or on the final alef: the same
    w = re.sub('اً', 'ًا', w)
    return w

def words(t): return re.findall(r'[ء-ْٰ]+', t)

if __name__ == '__main__':
    ids = sys.argv[1:] or sorted(f[:-5] for f in os.listdir(DIR) if re.match(r'd\d\d\.json$', f))
    os.makedirs(os.path.join(DIR, 'gemini'), exist_ok=True)
    out = ['# Tashkeel: where Claude and Gemini differ\n']
    total = 0
    for sid in ids:
        src = json.load(open(os.path.join(DIR, 'src', f'{sid}.json'), encoding='utf-8'))
        mine = json.load(open(os.path.join(DIR, f'{sid}.json'), encoding='utf-8'))
        gf = os.path.join(DIR, 'gemini', f'{sid}.json')
        if os.path.exists(gf): gem, model = json.load(open(gf, encoding='utf-8')), 'cached'
        else:
            gem, model = ask(src); json.dump(gem, open(gf, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        out.append(f'\n## {sid} ({model})\n')
        n = 0
        for k, text in src.items():
            g = gem.get(k, '')
            if strip(g) != strip(text): out.append(f'- {k}: Gemini changed letters, skipped'); continue
            a, b = words(mine[k]), words(g)
            if len(a) != len(b): out.append(f'- {k}: word count differs, skipped'); continue
            for i, (x, y) in enumerate(zip(a, b)):
                if norm(x) != norm(y):
                    n += 1
                    out.append(f'- `{k}` word {i + 1}: Claude **{x}** · Gemini **{y}**  ⟶ {mine[k]}')
        print(sid, n, 'words differ'); total += n
    open(os.path.join(DIR, 'compare.md'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print('total', total, 'differences; report:', os.path.join(DIR, 'compare.md'))
