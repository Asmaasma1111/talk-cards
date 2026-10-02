"""Record the app's voice with Gemini TTS, cut it into one clip per line, time every word,
and publish audio/*.m4a plus audio/voice.json for the app.

Same pipeline as the explainer videos: many lines per TTS request (the free tier allows 10
requests a day per model), cut at the long pauses, check every clip by transcription, then
re-record only the lines that fail. Two decks: Maria's cards (sets.json) and Mama's
prepositions (prepositions.json, full sentences with the gap filled). Each batch holds one deck.

  python scripts/voice.py lines                     list the lines and the batch plan (no API calls)
  python scripts/voice.py record [--max N]          TTS: one request per batch of about 41 lines
  python scripts/voice.py record --lines ID,ID      re-record chosen lines in a new batch
  python scripts/voice.py split [BATCH ...]         cut recorded batches into line clips
  python scripts/voice.py verify [--redo]           transcribe each clip and compare with its text
  python scripts/voice.py align                     word timings for every clip (local, no API)
  python scripts/voice.py build                     encode audio/*.m4a and write audio/voice.json (real clips only)
  python scripts/voice.py status

`record --engine say` makes placeholder batches with the Mac's own voice, for testing only;
build marks them as placeholders and the real recording replaces them.

Exit codes: 0 done, 10 GEMINI_API_KEY missing from .env, 11 daily quota used up (run again after
the reset, about 10:00 Riyadh time), 1 error. `record` ends with a TTS_RESULT line, also saved
to voice-work/tts-result.json. The key is read from .env and never printed.
"""
import argparse, base64, hashlib, json, os, re, subprocess, sys, tempfile, time, wave
from difflib import SequenceMatcher

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT, 'voice-work')
BATCH_DIR = os.path.join(WORK, 'batches')
CLIP_DIR = os.path.join(WORK, 'clips')
AUDIO = os.path.join(ROOT, 'audio')
PLAN = os.path.join(WORK, 'plan.json')
CLIPS = os.path.join(WORK, 'clips.json')
VERIFY = os.path.join(WORK, 'verify.json')
ALIGN = os.path.join(WORK, 'align.json')
RESULT = os.path.join(WORK, 'tts-result.json')

MODEL = 'gemini-3.8-flash-tts'
DECKS = {   # American voice for both; the style travels in its own field, so it is never read aloud
    'maria': {'voice': 'Kore', 'style': 'warm, clear and friendly, speaking slowly for a young English learner', 'say_rate': 165},
    'mama': {'voice': 'Kore', 'style': 'clear, natural and friendly, at an easy conversational pace', 'say_rate': 185},
}
CHECK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest']
SR = 24000
BATCH_SIZE = 41
LINE_GAP = 1.2      # a silence this long separates two lines in a batch take
MAX_INNER = 0.8     # longest pause kept inside one clip (the blank in "I want ___, please.")
ARABIC = re.compile('[؀-ۿ]')
SPELL = re.compile(r'^([A-Z](?:-[A-Z])+)([.,!?]*)$')
BLANK = re.compile(r'^(.*?)___(.*)$')


# ---------- small helpers ----------
def load(p, default):
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else default


def dump(p, obj):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump(obj, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def read_wav(p):
    with wave.open(p, 'rb') as w:
        sr, ch = w.getframerate(), w.getnchannels()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    if ch > 1:
        x = x.reshape(-1, ch).mean(1)
    if sr != SR:
        raise SystemExit(f'{p}: expected {SR} Hz, got {sr}')
    return x


def write_wav(p, x):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with wave.open(p, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def envelope(x, hop=0.01):
    h = int(hop * SR)
    n = max(1, len(x) // h)
    return np.sqrt(np.mean(x[:n * h].reshape(n, h) ** 2, axis=1))


def silence_threshold(env):
    loud = np.percentile(env, 95) if len(env) else 0
    return max(0.004, 0.06 * loud)


def runs(mask):
    """(start, end) frame index pairs of consecutive True values."""
    out, i = [], 0
    while i < len(mask):
        if mask[i]:
            j = i
            while j < len(mask) and mask[j]:
                j += 1
            out.append((i, j)); i = j
        else:
            i += 1
    return out


def trim(x, pad=0.06):
    env = envelope(x)
    loud = np.where(env > silence_threshold(env))[0]
    if not len(loud):
        return x
    a = max(0, int((loud[0] * 0.01 - pad) * SR)); b = min(len(x), int(((loud[-1] + 1) * 0.01 + pad) * SR))
    return x[a:b]


def squeeze(x, longest=MAX_INNER):
    """Shorten any inner pause longer than `longest` seconds."""
    env = envelope(x); q = env < silence_threshold(env)
    keep, last = [], 0
    for a, b in runs(q):
        if a == 0 or b >= len(q) or (b - a) * 0.01 <= longest:
            continue
        cut_a = int((a * 0.01 + longest / 2) * SR); cut_b = int((b * 0.01 - longest / 2) * SR)
        keep.append(x[last:cut_a]); last = cut_b
    keep.append(x[last:])
    return np.concatenate(keep)


def duration(p):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p],
                                capture_output=True, text=True).stdout or 0)


# ---------- lines (mirrors renderText in app.js) ----------
def tokens(line):
    """Word, letter and blank tokens in the same order as the app's highlight spans."""
    out = []
    for tok in line.split():
        m = SPELL.match(tok)
        if m:
            out += [['letter', L] for L in m.group(1).split('-')]
            continue
        b = BLANK.match(tok)
        if b:
            if b.group(1):
                out.append(['w', b.group(1)])
            out.append(['blank', ''])
            continue
        out.append(['w', tok])
    return out


def tts_text(line):
    """What the voice is asked to say: blanks become a pause, spelling becomes letters."""
    toks, out = tokens(line), ''
    for i, (kind, t) in enumerate(toks):
        if kind == 'letter':
            piece = t + (',' if i + 1 < len(toks) and toks[i + 1][0] == 'letter' else '.')
        elif kind == 'blank':
            piece = '...'
        else:
            piece = t
        if out and not (kind == 'blank' and not out.endswith('.')):
            out += ' '
        out += piece
    return out


def clip_id(line, deck='maria'):
    slug = re.sub(r'[^a-z0-9]+', '-', line.lower()).strip('-')[:28].strip('-')
    return f"{'mama-' if deck == 'mama' else ''}{slug}-{hashlib.sha1(line.encode('utf-8')).hexdigest()[:5]}"


GAP = re.compile(r'\{\{c1::(.*?)\}\}')


def mama_sentence(text):
    """The sentence Mama hears: the gap filled with its answer, or closed for Ø (mirrors app.js)."""
    m = GAP.search(text)
    ans = m.group(1).strip()
    return re.sub(r'\s+', ' ', text[:m.start()] + ('' if ans == 'Ø' else ans) + text[m.end():]).strip()


def inventory():
    """Every line the app speaks. Maria: questions, answers (each alternative), stage 3 English cues.
    Mama: each prepositions sentence with the answer in place."""
    S = json.load(open(os.path.join(ROOT, 'sets.json'), encoding='utf-8'))
    out = {}
    for s in S['sets']:
        for c in s['cards']:
            texts = [c['q'], c['a']]
            if c.get('ask') and s['stage'] == 3 and not ARABIC.search(c['ask']):
                texts.append(c['ask'])
            for t in texts:
                for line in t.split(' / '):
                    if line not in out:
                        out[line] = {'id': clip_id(line), 'deck': 'maria', 'text': line, 'tts': tts_text(line), 'tokens': tokens(line)}
    lines = list(out.values())
    pp = os.path.join(ROOT, 'prepositions.json')
    if os.path.exists(pp):
        seen = set()
        for s in json.load(open(pp, encoding='utf-8'))['sets']:
            for c in s['cards']:
                if not GAP.search(c.get('text', '')):
                    continue
                line = mama_sentence(c['text'])
                if line in seen:
                    continue
                seen.add(line)
                lines.append({'id': clip_id(line, 'mama'), 'deck': 'mama', 'text': line, 'tts': line,
                              'tokens': [['w', t] for t in line.split()]})
    return lines


NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
       'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']


def norm(t):
    """Letters only, so punctuation and spacing never count; numbers as words; OK = okay."""
    t = t.lower().replace('___', '')
    t = re.sub(r'\b(\d{1,2})\b', lambda m: NUM[int(m.group(1))] if int(m.group(1)) < len(NUM) else m.group(1), t)
    t = re.sub(r"\bok\b", 'okay', t)
    t = re.sub(r'\bza[iy]n[ae]b\b', 'zaineb', t)         # the transcriber spells the name either way
    return re.sub(r'[^a-z0-9]', '', t)


# ---------- Gemini ----------
def api_key():
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(ROOT, '.env'))
    except ImportError:
        pass
    k = os.getenv('GEMINI_API_KEY')
    if not k:
        finish(10, 'GEMINI_API_KEY missing from .env')
    return k


def is_daily_quota(msg):
    return 'per day' in msg.lower() or 'PerDay' in msg


def synth_gemini(client, text, deck):
    cfg = DECKS[deck]
    for attempt in range(4):
        try:
            it = client.interactions.create(
                model=MODEL,
                input=[{'type': 'user_input', 'content': [{'type': 'text', 'text': text,
                        'annotations': [{'type': 'speech_metadata', 'style': cfg['style']}]}]}],
                response_format={'type': 'audio'},
                generation_config={'speech_config': [{'voice': cfg['voice']}]})
            data = it.output_audio.data
            return base64.b64decode(data) if isinstance(data, str) else data
        except Exception as e:
            msg = str(e)
            if is_daily_quota(msg):
                raise QuotaUsedUp(msg)
            m = re.search(r'retry in ([\d.]+)s', msg)
            wait = float(m.group(1)) + 2 if m else 20 * (attempt + 1)
            print(f'  TTS attempt {attempt + 1} failed ({type(e).__name__}); retrying in {wait:.0f}s', file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError('TTS failed 4 times')


def synth_say(text_lines, deck):
    """Placeholder take with the Mac's built-in voice (testing only)."""
    with tempfile.TemporaryDirectory() as d:
        aiff = os.path.join(d, 'take.aiff')
        subprocess.run(['say', '-v', 'Samantha', '-r', str(DECKS[deck]['say_rate']), '-o', aiff,
                        ' [[slnc 2600]] '.join(text_lines)], check=True)
        out = os.path.join(d, 'take.wav')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', aiff, '-ar', str(SR), '-ac', '1', out], check=True)
        return open(out, 'rb').read()


def save_take(raw, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if raw[:4] == b'RIFF':
        open(path, 'wb').write(raw)
    else:  # headerless 16-bit PCM
        with wave.open(path, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(raw)


class QuotaUsedUp(Exception):
    pass


class Ear:
    """Transcribes short clips with a text model (separate quota from TTS), rotating models."""

    def __init__(self):
        from google import genai
        from google.genai import types
        self.types = types
        self.client = genai.Client(api_key=api_key(), http_options=types.HttpOptions(
            timeout=90000, retry_options=types.HttpRetryOptions(attempts=1)))
        self.mi = 0

    def hear(self, wav_path, prompt=None):
        """Short clips are padded with half a second of silence: without it the model answers "0:00"."""
        x = read_wav(wav_path)
        pad = np.zeros(int(0.5 * SR), np.float32)
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, 'padded.wav')
            write_wav(p, np.concatenate([pad, x, pad]))
            return self._hear(p, prompt)

    def _hear(self, wav_path, prompt=None):
        t = self.types
        prompt = prompt or ('Transcribe this short English clip verbatim, exactly as spoken. If letters are spelled '
                            'out, write each as a single capital letter. Reply with the words only, or "-" if silent.')
        for tries in range(12):
            model = CHECK_MODELS[self.mi % len(CHECK_MODELS)]
            try:
                r = self.client.models.generate_content(
                    model=model, contents=[t.Part.from_bytes(data=open(wav_path, 'rb').read(), mime_type='audio/wav'), prompt],
                    config=t.GenerateContentConfig(temperature=0,
                                                   automatic_function_calling=t.AutomaticFunctionCallingConfig(disable=True)))
                return (r.text or '').strip()
            except Exception as e:
                msg = str(e)
                if is_daily_quota(msg) or 'NOT_FOUND' in msg or '404' in msg:
                    self.mi += 1
                    continue
                m = re.search(r'retry in ([\d.]+)s', msg)
                time.sleep(float(m.group(1)) + 1 if m else 6)
                self.mi += 1
        return '?'


def is_current(line_id, deck, clips, plan):
    """A clip counts only if it was recorded with Gemini in the voice the deck uses now."""
    c = clips.get(line_id)
    if not c or c.get('engine') != 'gemini':
        return False
    b = plan['batches'].get(c.get('batch'), {})
    return b.get('voice') == DECKS[deck]['voice']


# ---------- result reporting ----------
def finish(code, note, **extra):
    res = {'code': code, 'note': note, **extra}
    dump(RESULT, res)
    print('TTS_RESULT ' + json.dumps(res, ensure_ascii=False))
    sys.exit(code)


# ---------- commands ----------
def cmd_lines(a):
    lines = inventory()
    clips, plan = load(CLIPS, {}), load(PLAN, {'batches': {}})
    todo = [l for l in lines if not is_current(l['id'], l['deck'], clips, plan)]
    for deck in DECKS:
        dl = [l for l in lines if l['deck'] == deck]; dt = [l for l in todo if l['deck'] == deck]
        print(f'{deck} ({DECKS[deck]["voice"]}): {len(dl)} lines, {sum(len(l["tokens"]) for l in dl)} words; {len(dl) - len(dt)} recorded; '
              f'{len(dt)} to record = {-(-len(dt) // a.size)} request(s) of up to {a.size} lines')
    if a.show:
        for l in lines:
            print(f"  {l['id']:<36} {l['tts']}")


def cmd_record(a):
    lines = inventory()
    by_id = {l['id']: l for l in lines}
    plan = load(PLAN, {'batches': {}})
    plan['batches'] = {k: v for k, v in plan['batches'].items() if v.get('recorded')}   # drop failed attempts
    clips = load(CLIPS, {})

    def same(b):   # a batch in this engine and, for Gemini, in the voice its deck uses now
        return b.get('engine') == a.engine and (a.engine != 'gemini' or b.get('voice') == DECKS[b.get('deck', 'maria')]['voice'])
    if a.lines:
        want = a.lines.split(',')
        bad = [i for i in want if i not in by_id]
        if bad:
            finish(1, 'unknown line ids: ' + ','.join(bad))
        todo = [by_id[i] for i in want]
    else:
        # placeholder clips and clips in an earlier voice do not count
        covered = {i for i, c in clips.items() if c.get('engine') == a.engine and same(plan['batches'].get(c.get('batch'), {}))} | \
                  {i for b in plan['batches'].values() if not b.get('split') and same(b) for i in b['lines']}
        todo = [l for l in lines if l['id'] not in covered]
    if not todo:
        finish(0, 'nothing to record', recorded=[], remaining=0)
    chunks = []
    for deck in DECKS:
        dt = [l for l in todo if l['deck'] == deck]
        chunks += [dt[i:i + a.size] for i in range(0, len(dt), a.size)]
    if a.max:
        chunks = chunks[:a.max]
    client = None
    if a.engine == 'gemini':
        from google import genai
        client = genai.Client(api_key=api_key())
    n = max([int(k[1:]) for k in plan['batches']] + [0])
    done = []
    for chunk in chunks:
        n += 1
        bid = f'b{n:02d}'
        try:
            deck = chunk[0]['deck']
            if a.engine == 'gemini':
                raw = synth_gemini(client, '\n<long pause>\n'.join(l['tts'] for l in chunk), deck)
            else:
                raw = synth_say([l['tts'] for l in chunk], deck)
        except QuotaUsedUp:
            left = len(todo) - sum(len(plan['batches'][b]['lines']) for b in done)
            dump(PLAN, plan)
            finish(11, f'daily quota used up for {MODEL}', recorded=done, remaining_lines=left)
        except Exception as e:
            dump(PLAN, plan)
            finish(1, f'{type(e).__name__}: {str(e)[:200]}', recorded=done)
        path = os.path.join(BATCH_DIR, f'{bid}.wav')
        save_take(raw, path)
        plan['batches'][bid] = {'lines': [l['id'] for l in chunk], 'deck': deck, 'engine': a.engine,
                                'model': MODEL if a.engine == 'gemini' else 'say:Samantha',
                                'voice': DECKS[deck]['voice'] if a.engine == 'gemini' else 'Samantha',
                                'recorded': time.strftime('%Y-%m-%d %H:%M'), 'seconds': round(duration(path), 1)}
        dump(PLAN, plan)
        done.append(bid)
        print(f'{bid}: {deck}, {len(chunk)} lines, {plan["batches"][bid]["seconds"]} s ({a.engine})')
        if a.engine == 'gemini' and chunk is not chunks[-1]:
            time.sleep(8)   # stay under the per-minute limit
    done_ids = {i for i, c in clips.items() if c.get('engine') == a.engine and same(plan['batches'].get(c.get('batch'), {}))} | \
               {i for b in plan['batches'].values() if same(b) for i in b['lines']}
    left = len([l for l in lines if l['id'] not in done_ids])
    finish(0, 'recorded', recorded=done, remaining_lines=left)


def split_batch(bid, plan, by_id, clips, ear=None):
    b = plan['batches'][bid]
    lines = [by_id[i] for i in b['lines'] if i in by_id]
    x = read_wav(os.path.join(BATCH_DIR, f'{bid}.wav'))
    x = x / (np.abs(x).max() or 1) * 0.89            # one gain per take keeps every clip at the same level
    env = envelope(x); q = env < silence_threshold(env)
    n = len(lines)
    gaps = [(s, e) for s, e in runs(q) if s > 0 and e < len(q) and (e - s) * 0.01 >= LINE_GAP]
    if len(gaps) < n - 1:
        # the pause between lines is not always long: take the n-1 longest pauses if they stand clearly
        # apart from the pauses inside lines (the next-longest is at least 25% shorter)
        allg = sorted([(s, e) for s, e in runs(q) if s > 0 and e < len(q) and (e - s) >= 25], key=lambda g: g[0] - g[1])
        if n == 1 or (len(allg) >= n - 1 and (len(allg) == n - 1 or
                      (allg[n - 2][1] - allg[n - 2][0]) >= 1.25 * (allg[n - 1][1] - allg[n - 1][0]))):
            gaps = allg[:n - 1]
    if len(gaps) >= n - 1:
        cuts = sorted(sorted(gaps, key=lambda g: g[0] - g[1])[:n - 1])
        bounds = [0] + [c for g in cuts for c in g] + [len(env)]
        spans = [(bounds[2 * k], bounds[2 * k + 1]) for k in range(n)]
        # keep up to 0.3 s of the pause on each side so a soft first or last sound is never clipped
        spans = [(max(0, s - 30) if k else s, min(len(env), e + 30) if k < n - 1 else e, None) for k, (s, e) in enumerate(spans)]
        how = f'{len(gaps) + 1} pieces'
    else:
        spans = match_by_transcript(x, env, q, lines, ear or Ear())
        how = f'only {len(gaps) + 1} pieces for {n} lines: matched by transcript'
    cache = load(VERIFY, {})
    for l, (s, e, heard) in zip(lines, spans):
        if s is None:
            print(f'  MISSING {l["id"]} ({l["text"]})'); clips.pop(l['id'], None); continue
        seg = squeeze(trim(x[int(s * 0.01 * SR):int(e * 0.01 * SR)]))
        path = os.path.join(CLIP_DIR, f"{l['id']}.wav")
        write_wav(path, seg)
        if heard is not None and heard == norm(l['text']):      # the cut was already checked by transcript
            cache[f"{l['id']}:{os.path.getmtime(path):.0f}"] = l['text']
        clips[l['id']] = {'batch': bid, 'engine': b['engine'], 'from': round(s * 0.01, 2), 'to': round(e * 0.01, 2)}
    dump(VERIFY, cache)
    b['split'] = True
    print(f'{bid}: {n} lines, {how}')


def match_by_transcript(x, env, q, lines, ear):
    """Cut at every pause, transcribe each piece, then match pieces to lines in order (pieces may be dropped)."""
    pieces = [(s, e) for s, e in runs(~q) if (e - s) * 0.01 > 0.12]
    merged = []
    for s, e in pieces:   # join pieces separated by short pauses
        if merged and (s - merged[-1][1]) * 0.01 < 0.35:
            merged[-1] = (merged[-1][0], e)
        else:
            merged.append((s, e))
    heard = []
    with tempfile.TemporaryDirectory() as d:
        for s, e in merged:
            p = os.path.join(d, 'piece.wav')
            write_wav(p, x[max(0, int((s * 0.01 - 0.05) * SR)):int((e * 0.01 + 0.05) * SR)])
            h = ear.hear(p)
            heard.append(norm(h) if h.strip() not in ('-', '?') else '')
            time.sleep(4)
    L = [norm(l['text']) for l in lines]
    N, M, K = len(merged), len(lines), 6
    NEG = -1e9
    dp = np.full((N + 1, M + 1), NEG); bk = {}; dp[0][0] = 0
    for i in range(N + 1):
        for j in range(M + 1):
            if dp[i][j] == NEG:
                continue
            if i < N and dp[i][j] - 0.6 > dp[i + 1][j]:
                dp[i + 1][j] = dp[i][j] - 0.6; bk[(i + 1, j)] = ('skip', i, j)
            if j < M and dp[i][j] - 1.0 > dp[i][j + 1]:            # line not found in the take
                dp[i][j + 1] = dp[i][j] - 1.0; bk[(i, j + 1)] = ('miss', i, j)
            if j < M:
                for k in range(1, K + 1):
                    if i + k > N:
                        break
                    sc = SequenceMatcher(None, L[j], ''.join(heard[i:i + k])).ratio() * 2 - 0.05 * (k - 1)
                    if dp[i][j] + sc > dp[i + k][j + 1]:
                        dp[i + k][j + 1] = dp[i][j] + sc; bk[(i + k, j + 1)] = ('take', i, j)
    i, j, spans = N, M, [(None, None, None)] * M
    while (i, j) != (0, 0):
        kind, pi, pj = bk[(i, j)]
        if kind == 'take':
            spans[pj] = (merged[pi][0], merged[i - 1][1], ''.join(heard[pi:i]))
        i, j = pi, pj
    return spans


def cmd_split(a):
    lines = inventory(); by_id = {l['id']: l for l in lines}
    plan = load(PLAN, {'batches': {}}); clips = load(CLIPS, {})
    todo = a.batches or [k for k, v in plan['batches'].items() if not v.get('split')]
    for bid in todo:
        split_batch(bid, plan, by_id, clips)
        dump(PLAN, plan); dump(CLIPS, clips)


def repair(l, clips, plan, ear):
    """A failed clip is often cut too tight: part of the line sits in the unused audio next to it.
    Try widening it into that audio (before, after, both); keep the first version that transcribes exactly."""
    c = clips.get(l['id'])
    if not c or c.get('batch') not in plan['batches']:
        return None
    b = plan['batches'][c['batch']]
    order = [i for i in b['lines'] if i in clips and clips[i].get('batch') == c['batch']]
    k = order.index(l['id'])
    x = read_wav(os.path.join(BATCH_DIR, f"{c['batch']}.wav"))
    x = x / (np.abs(x).max() or 1) * 0.89
    lo = clips[order[k - 1]]['to'] + 0.05 if k > 0 else 0.0
    hi = clips[order[k + 1]]['from'] - 0.05 if k + 1 < len(order) else len(x) / SR
    for a_, b_ in ((lo, c['to']), (c['from'], hi), (lo, hi)):
        if b_ - a_ <= 0.1 or (a_, b_) == (c['from'], c['to']):
            continue
        seg = squeeze(trim(x[int(a_ * SR):int(b_ * SR)]))
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, 'try.wav'); write_wav(p, seg)
            heard = ear.hear(p); time.sleep(3)
        if norm(heard) == norm(l['text']):
            write_wav(os.path.join(CLIP_DIR, f"{l['id']}.wav"), seg)
            c['from'], c['to'] = round(a_, 2), round(b_, 2)
            return heard
    return None


def cmd_verify(a):
    clips_, plan_ = load(CLIPS, {}), load(PLAN, {'batches': {}})      # placeholders and old voices are not checked
    lines = [l for l in inventory() if is_current(l['id'], l['deck'], clips_, plan_)
             and os.path.exists(os.path.join(CLIP_DIR, f"{l['id']}.wav"))]
    if a.only:
        lines = [l for l in lines if l['id'] in set(a.only.split(','))]
    cache = load(VERIFY, {})
    ear, low = None, []
    for l in lines:
        p = os.path.join(CLIP_DIR, f"{l['id']}.wav")
        key = f"{l['id']}:{os.path.getmtime(p):.0f}"
        if key not in cache or a.redo:
            ear = ear or Ear()
            cache[key] = ear.hear(p)
            dump(VERIFY, cache)
            time.sleep(a.pace)
        heard = cache[key]
        sim = SequenceMatcher(None, norm(l['text']), norm(heard)).ratio()
        ok = norm(l['text']) == norm(heard)          # the whole line, every word
        if not ok:
            low.append(l['id'])
        if not ok or a.all:
            print(f"{'OK ' if ok else 'LOW'} {sim:.2f} {l['id']:<36} said: {heard!r}  want: {l['text']!r}")
    print(f'{len(lines) - len(low)}/{len(lines)} clips match their text.')
    if low and not a.no_repair:
        clips, plan = load(CLIPS, {}), load(PLAN, {'batches': {}})
        by_id = {l['id']: l for l in lines}
        fixed = []
        for i in low:
            ear = ear or Ear()
            heard = repair(by_id[i], clips, plan, ear)
            if heard is not None:
                fixed.append(i); dump(CLIPS, clips)
                print(f'REPAIRED {i}: now {heard!r}')
        low = [i for i in low if i not in fixed]
        if fixed:
            print(f'{len(fixed)} repaired by widening the cut; {len(lines) - len(low)}/{len(lines)} clips now match.')
    if low:
        print('Re-record with: python scripts/voice.py record --lines ' + ','.join(low))


def syllables(word):
    w = re.sub(r'[^a-z]', '', word.lower())
    n = len(re.findall(r'[aeiouy]+', w)) or 1
    if len(w) > 2 and w.endswith('e') and not w.endswith(('le', 'ee')) and n > 1:
        n -= 1
    return n


def vowel_db(x, hop=0.01, win=0.03):
    """Loudness in the vowel band (300-2500 Hz), in dB, one value per 10 ms. Hiss like "s" stays out,
    so every syllable shows as its own peak."""
    h, w = int(hop * SR), int(win * SR)
    n = max(1, len(x) // h)
    frames = np.lib.stride_tricks.sliding_window_view(np.pad(x, (0, w)), w)[::h][:n] * np.hanning(w)
    spec = np.abs(np.fft.rfft(frames, axis=1)) ** 2
    f = np.fft.rfftfreq(w, 1 / SR)
    db = 20 * np.log10(np.sqrt(spec[:, (f >= 300) & (f <= 2500)].sum(1)) + 1e-6)
    return np.convolve(db, np.ones(3) / 3, mode='same')


def nuclei(vdb, a, b, dip=1.0, floor=25):
    """Syllable peaks between frames a and b: local maxima separated by a dip of at least `dip` dB."""
    top = vdb[a:b].max() if b > a else 0
    peaks = [i for i in range(max(a, 2), min(b, len(vdb) - 2)) if vdb[i] >= vdb[i - 2:i + 3].max() and vdb[i] > top - floor]
    out = []
    for p in peaks:
        if out and min(vdb[out[-1]], vdb[p]) - vdb[out[-1]:p + 1].min() < dip:
            if vdb[p] > vdb[out[-1]]:
                out[-1] = p
            continue
        out.append(p)
    return out


def align_by_syllables(vdb, s0, s1, toks):
    """Word boundaries can only sit in the dip between two syllable peaks; the syllable count of each
    word decides which dips. Returns None when the peaks give too few choices."""
    n = len(toks)
    pk = nuclei(vdb, s0, s1)
    if len(pk) < n:
        return None
    valleys = [pk[j] + int(np.argmin(vdb[pk[j]:pk[j + 1] + 1])) for j in range(len(pk) - 1)]
    depth = [min(vdb[pk[j]], vdb[pk[j + 1]]) - vdb[v] for j, v in enumerate(valleys)]
    syl = [1 if k == 'letter' else syllables(t) for k, t in toks]
    weight = np.array([sy + 0.3 for sy in syl], float)
    exp = weight / weight.sum() * (s1 - s0)
    V_ = len(valleys)
    INF = 1e18

    def seg(a_idx, b_idx, k):          # word k covers peaks a_idx..b_idx-1
        cnt = b_idx - a_idx
        start = s0 if a_idx == 0 else valleys[a_idx - 1]
        end = s1 if b_idx == len(pk) else valleys[b_idx - 1]
        return 1.2 * (cnt - syl[k]) ** 2 + 0.5 * np.log(max(end - start, 2) / exp[k]) ** 2

    # dp[k][j]: words 0..k-1 cover peaks 0..j-1 (word k starts at peak j)
    dp = np.full((n + 1, len(pk) + 1), INF); back = np.zeros((n + 1, len(pk) + 1), int)
    dp[0][0] = 0
    for k in range(1, n + 1):
        for j in range(k, len(pk) + 1 - (n - k)):
            for i in range(k - 1, j):
                if dp[k - 1][i] >= INF:
                    continue
                cut = 0 if j == len(pk) else max(0.0, 1 - depth[j - 1] / 10)
                v = dp[k - 1][i] + seg(i, j, k - 1) + (cut if k < n else 0)
                if v < dp[k][j]:
                    dp[k][j] = v; back[k][j] = i
    if dp[n][len(pk)] >= INF:
        return None
    js, j = [], len(pk)
    for k in range(n, 0, -1):
        js.append(j); j = back[k][j]
    js = sorted(js)[:-1]                     # peak index where each next word starts
    b = [s0] + [valleys[j - 1] for j in js] + [s1]
    return [(b[k], b[k + 1]) for k in range(n)]


def align_words(env, s0, s1, toks, vdb=None):
    """Place word boundaries at dips in the loudness curve, sized by syllable count."""
    n = len(toks)
    if n == 1:
        return [(s0, s1)]
    if vdb is not None and not all(k == 'letter' for k, _ in toks):
        by_syl = align_by_syllables(vdb, s0, s1, toks)
        if by_syl:
            return by_syl
    part = env[s0:s1]
    thr = silence_threshold(env)
    if all(k == 'letter' for k, _ in toks):        # spelled letters are separated by short pauses
        isl = [(s0 + s, s0 + e) for s, e in runs(part > thr) if e - s >= 4]
        merged = []
        for s, e in isl:
            if merged and s - merged[-1][1] < 8:
                merged[-1] = (merged[-1][0], e)
            else:
                merged.append((s, e))
        if len(merged) == n:
            return merged
    weight = np.array([0.7 if k == 'letter' else syllables(t) + 0.3 + (0.35 if re.search(r'[.?!,]$', t) else 0)
                       for k, t in toks], float)
    total = s1 - s0
    exp = weight / weight.sum() * total
    sm = np.convolve(part, np.ones(3) / 3, mode='same')
    peak = sm.max() or 1
    cands = [i for i in range(3, len(sm) - 3) if sm[i] <= sm[i - 3:i + 4].min() + 1e-9]
    if len(cands) < n - 1:
        edges = np.cumsum(exp)[:-1].astype(int)
        b = [s0] + [s0 + int(e) for e in edges] + [s1]
        return [(b[k], b[k + 1]) for k in range(n)]
    C = len(cands)
    INF = 1e18
    cost = lambda d, k: (np.log(max(d, 2) / exp[k])) ** 2
    depth = [3.0 * sm[c] / peak for c in cands]
    dp = np.full((n, C), INF); back = np.zeros((n, C), int)
    for m in range(C):
        dp[1][m] = cost(cands[m], 0) + depth[m]
    for k in range(2, n):
        for m in range(C):
            best, arg = INF, 0
            for p in range(m):
                v = dp[k - 1][p] + cost(cands[m] - cands[p], k - 1)
                if v < best:
                    best, arg = v, p
            dp[k][m] = best + depth[m]; back[k][m] = arg
    final = [dp[n - 1][m] + cost(len(sm) - cands[m], n - 1) for m in range(C)]
    m = int(np.argmin(final)); cut = [m]
    for k in range(n - 1, 1, -1):
        m = back[k][m]; cut.append(m)
    b = [s0] + [s0 + cands[c] for c in sorted(cut)] + [s1]
    return [(b[k], b[k + 1]) for k in range(n)]


def align_clip(x, toks):
    env = envelope(x)
    vdb = vowel_db(x)[:len(env)]
    thr = silence_threshold(env)
    loud = np.where(env > thr)[0]
    s0, s1 = (int(loud[0]), int(loud[-1]) + 1) if len(loud) else (0, len(env))
    trailing = bool(toks) and toks[-1][0] == 'blank'
    body = toks[:-1] if trailing else toks
    inner = [i for i, t in enumerate(body) if t[0] == 'blank']
    out = [None] * len(toks)
    if inner:   # each inner blank sits in one of the longest pauses
        pauses = sorted([(s, e) for s, e in runs(env < thr) if s > s0 and e < s1], key=lambda r: r[0] - r[1])[:len(inner)]
        pauses = sorted(pauses)
        if len(pauses) < len(inner):
            inner = []
    edges, start = [], s0
    for bi, (ps, pe) in zip(inner, sorted(pauses) if inner else []):
        edges.append((start, ps)); out[bi] = (ps, pe); start = pe
    edges.append((start, s1))
    groups, cur = [], []
    for i, t in enumerate(body):
        if i in inner:
            groups.append(cur); cur = []
        else:
            cur.append(i)
    groups.append(cur)
    for (a, b), idx in zip(edges, groups):
        if not idx:
            continue
        for i, span in zip(idx, align_words(env, a, b, [body[i] for i in idx], vdb)):
            out[i] = span
    return [[round(s * 0.01, 2), round(e * 0.01, 2)] if s is not None else None
            for s, e in (o if o else (None, None) for o in out)]


def cmd_align(a):
    res = {}
    for l in inventory():
        p = os.path.join(CLIP_DIR, f"{l['id']}.wav")
        if os.path.exists(p):
            res[l['id']] = align_clip(read_wav(p), l['tokens'])
    dump(ALIGN, res)
    print(f'word timings for {len(res)} clips')
    if a.show:
        for l in inventory():
            if l['id'] in res and (not a.show or l['id'] in a.show.split(',') or a.show == 'all'):
                print(l['text'])
                for (k, t), w in zip(l['tokens'], res[l['id']]):
                    print(f'   {w}  {t or "___"}')


def cmd_build(a):
    lines = inventory()
    clips = load(CLIPS, {}); align = load(ALIGN, {})
    plan = load(PLAN, {'batches': {}})
    os.makedirs(AUDIO, exist_ok=True)
    manifest = {'v': 2, 'decks': {d: {'voice': c['voice'], 'model': MODEL, 'placeholder': False, 'clips': {}} for d, c in DECKS.items()}}
    keep, missing = {'voice.json', '_unlock.m4a'}, []
    for l in lines:
        wav = os.path.join(CLIP_DIR, f"{l['id']}.wav")
        if l['id'] not in clips or not os.path.exists(wav) or \
                (not is_current(l['id'], l['deck'], clips, plan) and not a.with_placeholders):
            missing.append(l['id']); continue
        if l['id'] not in align:
            raise SystemExit('run "voice.py align" first')
        name = f"{l['id']}.m4a"; out = os.path.join(AUDIO, name)
        if not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(wav):
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'aac', '-b:a', '64k', '-ac', '1',
                            '-movflags', '+faststart', out], check=True)
        keep.add(name)
        dk = manifest['decks'][l['deck']]
        dk['clips'][l['text']] = {'f': name, 'd': round(len(read_wav(wav)) / SR, 2), 'w': align[l['id']]}
        if clips[l['id']].get('engine') != 'gemini':
            dk['placeholder'] = True
    unlock = os.path.join(AUDIO, '_unlock.m4a')
    if not os.path.exists(unlock):
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', f'anullsrc=r={SR}:cl=mono', '-t', '0.2',
                        '-c:a', 'aac', '-b:a', '32k', unlock], check=True)
    for f in os.listdir(AUDIO):
        if f not in keep:
            os.remove(os.path.join(AUDIO, f))
    json.dump(manifest, open(os.path.join(AUDIO, 'voice.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    size = sum(os.path.getsize(os.path.join(AUDIO, f)) for f in os.listdir(AUDIO))
    print('audio/: ' + ', '.join(f"{d} {len(v['clips'])} clips" + (' (PLACEHOLDER)' if v['placeholder'] else '')
                                 for d, v in manifest['decks'].items()) + f', {size / 1e6:.1f} MB'
          + (f"; {len(missing)} lines have no clip yet (the app uses device speech for them)" if missing else ''))


def cmd_status(a):
    lines = inventory(); clips = load(CLIPS, {}); plan = load(PLAN, {'batches': {}})
    cache = load(VERIFY, {}); align = load(ALIGN, {})
    real = [i for i, c in clips.items() if c.get('engine') == 'gemini']
    print(f'lines {len(lines)} | clips {len(clips)} (Gemini {len(real)}, placeholder {len(clips) - len(real)}) | '
          f'aligned {len(align)} | batches {len(plan["batches"])}')
    for k, v in plan['batches'].items():
        print(f"  {k}: {len(v['lines'])} lines, {v.get('seconds')} s, {v['engine']}, split={bool(v.get('split'))}")
    print('last TTS_RESULT:', json.dumps(load(RESULT, {})))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    p = sub.add_parser('lines'); p.add_argument('--size', type=int, default=BATCH_SIZE); p.add_argument('--show', action='store_true')
    p = sub.add_parser('record'); p.add_argument('--size', type=int, default=BATCH_SIZE); p.add_argument('--max', type=int)
    p.add_argument('--lines'); p.add_argument('--engine', choices=['gemini', 'say'], default='gemini')
    p = sub.add_parser('split'); p.add_argument('batches', nargs='*')
    p = sub.add_parser('verify'); p.add_argument('--redo', action='store_true'); p.add_argument('--all', action='store_true')
    p.add_argument('--only'); p.add_argument('--pace', type=float, default=4.5); p.add_argument('--no-repair', action='store_true')
    p = sub.add_parser('align'); p.add_argument('--show')
    p = sub.add_parser('build'); p.add_argument('--with-placeholders', action='store_true', help='testing only')
    sub.add_parser('status')
    a = ap.parse_args()
    {'lines': cmd_lines, 'record': cmd_record, 'split': cmd_split, 'verify': cmd_verify,
     'align': cmd_align, 'build': cmd_build, 'status': cmd_status}[a.cmd](a)


if __name__ == '__main__':
    main()
