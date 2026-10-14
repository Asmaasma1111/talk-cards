"""Full tashkeel (diacritics) for مكتبتي's stories.

python3 scripts/tashkeel.py export        writes content/stories/tashkeel/src/dXX.json: every Arabic text of a story, as {key: text}
python3 scripts/tashkeel.py check [dXX]   checks content/stories/tashkeel/dXX.json against the source: every key present and,
                                          with the marks taken away, exactly the same letters, spaces and punctuation
build_stories.py then uses the checked text (a text that fails the check keeps its plain form).
"""
import glob, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, 'content', 'stories', 'tashkeel')
MARKS = re.compile('[ً-ٰٟ]')        # fathatan ... sukun, extra marks, the small alef above
strip = lambda t: MARKS.sub('', t)

def texts(story):
    """Every Arabic text of a story, keyed by its place: title, pages.3, q.0.prompt, q.0.opt.1.label ..."""
    out = {'title': story['title'], 'tool': story['tool']['name']}
    for i, p in enumerate(story['pages']): out[f'pages.{i}'] = p['text']
    for qi, q in enumerate(story['questions']):
        out[f'q.{qi}.prompt'] = q['prompt']
        if q.get('back_line'): out[f'q.{qi}.back'] = q['back_line']
        for oi, o in enumerate(q['options']):
            out[f'q.{qi}.opt.{oi}.label'] = o['label']
            if o.get('result'): out[f'q.{qi}.opt.{oi}.result'] = o['result']
    for k in ('other_side', 'magic_sentence', 'feeling_word'):
        if story.get(k): out[k] = story[k]
    out['mission'] = story['mission']['text']
    for ci, c in enumerate(story['mission'].get('choices') or []):
        if isinstance(c, str): out[f'mission.choice.{ci}'] = c
    return out

def apply(story, tk):
    """Put the checked tashkeel into a story (stories.json form). Returns the keys that failed the check."""
    src, bad = texts(story), []
    def get(k):
        v = tk.get(k)
        if v is None or strip(v) != strip(src[k]): bad.append(k); return src[k]
        return v
    story['title'] = get('title'); story['tool']['name'] = get('tool')
    for i, p in enumerate(story['pages']): p['text'] = get(f'pages.{i}')
    for qi, q in enumerate(story['questions']):
        q['prompt'] = get(f'q.{qi}.prompt')
        if q.get('back_line'): q['back_line'] = get(f'q.{qi}.back')
        for oi, o in enumerate(q['options']):
            o['label'] = get(f'q.{qi}.opt.{oi}.label')
            if o.get('result'): o['result'] = get(f'q.{qi}.opt.{oi}.result')
    for k in ('other_side', 'magic_sentence', 'feeling_word'):
        if story.get(k): story[k] = get(k)
    story['mission']['text'] = get('mission')
    ch = story['mission'].get('choices') or []
    for ci, c in enumerate(ch):
        if isinstance(c, str): ch[ci] = get(f'mission.choice.{ci}')
    return bad

def marks_share(t):
    letters = [c for c in strip(t) if 'ء' <= c <= 'ي']
    return len(MARKS.findall(t)) / max(1, len(letters))

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    stories = json.load(open(os.path.join(ROOT, 'stories.json'), encoding='utf-8'))['stories']
    if cmd == 'export':
        os.makedirs(os.path.join(DIR, 'src'), exist_ok=True)
        for s in stories:
            json.dump(texts(s), open(os.path.join(DIR, 'src', f"{s['id']}.json"), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('exported', len(stories), 'stories to', os.path.join(DIR, 'src'))
    elif cmd == 'check':
        want = sys.argv[2:] or [s['id'] for s in stories]
        total = 0
        for s in stories:
            if s['id'] not in want: continue
            f = os.path.join(DIR, f"{s['id']}.json")
            if not os.path.exists(f): print(s['id'], 'missing'); total += 1; continue
            tk, src = json.load(open(f, encoding='utf-8')), texts(s)
            bad = [k for k in src if k not in tk or strip(tk[k]) != strip(src[k])]
            thin = [k for k in src if k in tk and k not in bad and marks_share(tk[k]) < 0.6]
            for k in bad:
                print(f"{s['id']} {k}: letters differ\n   src: {src[k]}\n   new: {tk.get(k)}")
            for k in thin: print(f"{s['id']} {k}: few marks ({marks_share(tk[k]):.2f} per letter): {tk[k]}")
            total += len(bad)
            if not bad: print(s['id'], 'ok', f'({len(src)} texts)' + (f', {len(thin)} with few marks' if thin else ''))
        sys.exit(1 if total else 0)
    else:
        print(__doc__)
