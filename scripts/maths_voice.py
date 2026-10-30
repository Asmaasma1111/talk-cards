"""جدول الضرب read aloud in a human voice (Maria's request): the 100 questions («ثلاثة في أربعة») are recorded with Gemini TTS
in four batches, each take is cut at its pauses into one clip per question, every clip is checked by transcription, and
the clips are published as audio/mx/m{a}x{b}.m4a plus a 'maths' deck in audio/voice.json (so the service worker caches them).

  python scripts/maths_voice.py lines             the 100 questions and the batch plan (no API calls)
  python scripts/maths_voice.py record [--max N]  one TTS request per batch of 25 questions (free tier: 10 a day)
  python scripts/maths_voice.py split             cut the takes into clips
  python scripts/maths_voice.py verify [--redo]   transcribe each clip and check its two numbers; --redo re-records the misses
  python scripts/maths_voice.py build             encode audio/mx/*.m4a and add the deck to audio/voice.json

Run it with the venv that has google-genai: ~/Downloads/06_Projects_and_Code/maria-tenses/.venv/bin/python
It reuses the helpers in voice.py (same TTS call, wav tools and transcriber). The key is read from .env and never printed.
Exit codes: 0 done, 10 GEMINI_API_KEY missing, 11 daily TTS quota used up, 1 error.
"""
import argparse, json, os, re, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import voice as V

WORK = os.path.join(V.WORK, 'maths')
PLAN = os.path.join(WORK, 'plan.json')
OUT = os.path.join(V.AUDIO, 'mx')
V.DECKS['maths'] = {'voice': 'Aoede', 'say_rate': 180,
                    'style': 'a warm, kind Saudi woman teacher speaking clear Modern Standard Arabic to an eight-year-old girl; '
                             'natural and human, cheerful, at a brisk easy pace, each line said once as a friendly question'}
TABLES = [0, 1, 10, 2, 5, 3, 4, 9, 6, 7, 8]           # the teaching order in maths.js (table 0 from 30 Oct 2026)
WORDS = ['صفر', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة']
# what the voice reads: fully vowelled, so every letter is said clearly (without marks it said «عشرة» with a weak «ع»)
VOWELLED = ['صِفْر', 'وَاحِد', 'اِثْنَان', 'ثَلَاثَة', 'أَرْبَعَة', 'خَمْسَة', 'سِتَّة', 'سَبْعَة', 'ثَمَانِيَة', 'تِسْعَة', 'عَشَرَة']
BATCH = 25
GAP = 1.0                                            # a silence this long separates two questions in a take


def facts():
    return [(t, k) for t in TABLES for k in range(1, 11)]


def fid(a, b):
    return f'm{a}x{b}'


def said(a, b):                                      # after «في» the number is genitive: اثنين
    return f"{WORDS[a]} في {'اثنين' if b == 2 else WORDS[b]}"


def spoken(a, b):                                    # the same words, vowelled, as sent to the voice
    return f"{VOWELLED[a]} فِي {'اِثْنَيْن' if b == 2 else VOWELLED[b]}"


def cmd_lines(a):
    fs = facts()
    for i in range(0, len(fs), BATCH):
        print(f'batch {i // BATCH + 1}:', ' · '.join(said(*f) for f in fs[i:i + BATCH][:4]), '…')
    print(len(fs), 'questions,', (len(fs) + BATCH - 1) // BATCH, 'TTS requests')


def cmd_record(a, only=None):
    plan = V.load(PLAN, {'batches': {}, 'clips': {}})
    have = {i for b in plan['batches'].values() for i in b['ids']}
    todo = [f for f in facts() if fid(*f) in (only or set()) or (not only and fid(*f) not in have)]
    if not todo:
        V.finish(0, 'nothing to record')
    chunks = [todo[i:i + BATCH] for i in range(0, len(todo), BATCH)][:a.max or None]
    from google import genai
    client = genai.Client(api_key=V.api_key())
    n = max([int(k[1:]) for k in plan['batches']] + [0])
    for chunk in chunks:
        n += 1; bid = f'b{n:02d}'
        try:
            raw = V.synth_gemini(client, '\n<long pause>\n'.join(spoken(*f) + '؟' for f in chunk), 'maths')
        except V.QuotaUsedUp:
            V.dump(PLAN, plan); V.finish(11, f'daily quota used up for {V.MODEL}')
        path = os.path.join(WORK, 'batches', f'{bid}.wav')
        V.save_take(raw, path)
        plan['batches'][bid] = {'ids': [fid(*f) for f in chunk], 'voice': V.DECKS['maths']['voice'], 'model': V.MODEL,
                                'recorded': time.strftime('%Y-%m-%d %H:%M'), 'seconds': round(V.duration(path), 1)}
        V.dump(PLAN, plan)
        print(f'{bid}: {len(chunk)} questions, {plan["batches"][bid]["seconds"]} s')
        if chunk is not chunks[-1]:
            time.sleep(8)
    V.finish(0, 'recorded')


def pieces(x, want):
    """Cut a take at its long silences; try a few thresholds until it gives exactly `want` pieces."""
    env = V.envelope(x)
    for k in (0.06, 0.04, 0.09, 0.03, 0.12):
        thr = max(0.004, k * np.percentile(env, 95))
        quiet = env < thr
        for gap in (GAP, 0.8, 1.3):
            gs = [(s, e) for s, e in V.runs(quiet) if (e - s) * 0.01 >= gap and s > 0 and e < len(env)]
            if len(gs) == want - 1:
                cuts = [0] + [int((s + e) / 2 * 0.01 * V.SR) for s, e in gs] + [len(x)]
                return [V.trim(x[cuts[i]:cuts[i + 1]]) for i in range(want)]
    # pauses of uneven length: cut at the (want - 1) longest silences of at least 0.3 s
    thr = max(0.004, 0.06 * np.percentile(env, 95))
    gs = [(s, e) for s, e in V.runs(env < thr) if (e - s) * 0.01 >= 0.3 and s > 0 and e < len(env)]
    if len(gs) >= want - 1:
        gs = sorted(sorted(gs, key=lambda g: g[1] - g[0], reverse=True)[:want - 1])
        cuts = [0] + [int((s + e) / 2 * 0.01 * V.SR) for s, e in gs] + [len(x)]
        ps = [V.trim(x[cuts[i]:cuts[i + 1]]) for i in range(want)]
        if all(0.45 < len(p) / V.SR < 3.5 for p in ps):          # every piece the length of one short question
            return ps
    return None


def cmd_split(a):
    plan = V.load(PLAN, {'batches': {}, 'clips': {}})
    for bid, b in sorted(plan['batches'].items()):
        if b.get('split'):
            continue
        x = V.read_wav(os.path.join(WORK, 'batches', f'{bid}.wav'))
        ps = pieces(x, len(b['ids']))
        if not ps:
            print(f'{bid}: could not cut into {len(b["ids"])} pieces; re-record these questions'); continue
        for i, p in zip(b['ids'], ps):
            V.write_wav(os.path.join(WORK, 'clips', f'{i}.wav'), p)
            plan['clips'][i] = {'batch': bid, 'seconds': round(len(p) / V.SR, 2)}
        b['split'] = True
        print(f'{bid}: {len(ps)} clips')
    V.dump(PLAN, plan)


ASK = 'Transcribe this short Arabic clip verbatim, in Arabic script, exactly as spoken. Reply with the words only, or "-" if silent.'
NUMS = {'صفر': 0, 'واحد': 1, 'اثنان': 2, 'اثنين': 2, 'ثلاثه': 3, 'ثلاث': 3, 'اربعه': 4, 'اربع': 4, 'خمسه': 5, 'خمس': 5, 'سته': 6, 'ست': 6,
        'سبعه': 7, 'سبع': 7, 'ثمانيه': 8, 'ثمان': 8, 'تسعه': 9, 'تسع': 9, 'عشره': 10, 'عشر': 10}


def two_numbers(text):
    """The two numbers in what the checker heard: digits, or the number words (marks and letter shapes ignored)."""
    t = text.translate(str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789'))
    t = re.sub('[\u064B-\u065F\u0670\u0640]', '', t).replace('أ', 'ا').replace('إ', 'ا').replace('ة', 'ه')
    out = []
    for w in re.findall(r'\d+|[\u0621-\u064A]+', t):
        if w.isdigit(): out.append(int(w))
        elif w in NUMS: out.append(NUMS[w])
        elif w.startswith('و') and w[1:] in NUMS: out.append(NUMS[w[1:]])
    return out


def cmd_verify(a):
    plan = V.load(PLAN, {'batches': {}, 'clips': {}})
    ear = V.Ear(); bad = []
    for i, c in sorted(plan['clips'].items()):
        if c.get('ok') and not a.all:
            continue
        heard = ear.hear(os.path.join(WORK, 'clips', f'{i}.wav'), ASK)
        n = two_numbers(heard)
        ok = len(n) == 2 and f'm{n[0]}x{n[1]}' == i
        c['heard'] = heard; c['ok'] = ok
        if not ok:
            bad.append(i)
        print(i, 'ok' if ok else f'MISS ({heard})')
    V.dump(PLAN, plan)
    print(len(plan['clips']) - len(bad), 'ok,', len(bad), 'to redo:', ','.join(bad))
    if a.redo and bad:
        for i in bad:
            plan['clips'].pop(i, None)
        for b in plan['batches'].values():
            b['ids'] = [x for x in b['ids'] if x not in bad]
        V.dump(PLAN, plan)
        cmd_record(a, only=set(bad))


def cmd_build(a):
    plan = V.load(PLAN, {'batches': {}, 'clips': {}})
    os.makedirs(OUT, exist_ok=True)
    clips = {}
    for i, c in sorted(plan['clips'].items()):
        if not c.get('ok'):
            continue
        dst = os.path.join(OUT, f'{i}.m4a')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(WORK, 'clips', f'{i}.wav'),
                        '-ac', '1', '-c:a', 'aac', '-b:a', '48k', dst], check=True)
        clips[i] = {'f': f'mx/{i}.m4a', 'd': c['seconds']}
    vj = os.path.join(V.AUDIO, 'voice.json')
    manifest = V.load(vj, {'v': 2, 'decks': {}})
    manifest['decks']['maths'] = {'voice': V.DECKS['maths']['voice'], 'model': V.MODEL, 'placeholder': False, 'clips': clips}
    V.dump(vj, manifest)
    print(len(clips), 'clips in audio/mx and the maths deck of audio/voice.json')


if __name__ == '__main__':
    p = argparse.ArgumentParser(); sub = p.add_subparsers(dest='cmd', required=True)
    sub.add_parser('lines')
    r = sub.add_parser('record'); r.add_argument('--max', type=int, default=0)
    sub.add_parser('split')
    v = sub.add_parser('verify'); v.add_argument('--redo', action='store_true'); v.add_argument('--all', action='store_true'); v.add_argument('--max', type=int, default=0)
    sub.add_parser('build')
    a = p.parse_args()
    {'lines': cmd_lines, 'record': cmd_record, 'split': cmd_split, 'verify': cmd_verify, 'build': cmd_build}[a.cmd](a)
