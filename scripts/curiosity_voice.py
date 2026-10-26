"""علبة الفضول read aloud: the same Arabic voice method as جدول الضرب (scripts/maths_voice.py). The lines are recorded with
Gemini TTS in batches, each take is cut at its pauses into one clip per line, every clip is checked by transcription, and
the clips are published as audio/cb/<id>.m4a plus a 'cbox' deck in audio/voice.json (so the service worker caches them).

  python scripts/curiosity_voice.py lines                   the lines and the batch plan (no API calls)
  python scripts/curiosity_voice.py record [--max N] [--model M]   one TTS request per batch (free tier: 10 a day per model)
  python scripts/curiosity_voice.py split                   cut the takes into clips
  python scripts/curiosity_voice.py verify [--redo]         transcribe each clip and compare it with its line
  python scripts/curiosity_voice.py build                   encode audio/cb/*.m4a and add the deck to audio/voice.json

What is read: the goal line, the four rules and the app's prompts (their Arabic is taken from curiosity.js, so the words
on screen and the words heard are the same), every ready mystery's line, its three hints (the question word and the two
keywords, never a full question) and, for the tricks, the prediction question. A Qur'anic verse is never read by TTS.
Run it with the venv that has google-genai: ~/Downloads/06_Projects_and_Code/maria-tenses/.venv/bin/python -u
Exit codes: 0 done, 10 GEMINI_API_KEY missing, 11 daily TTS quota used up, 1 error.
"""
import argparse, base64, json, os, re, signal, subprocess, sys, time
from difflib import SequenceMatcher
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import voice as V

ROOT = V.ROOT
WORK = os.path.join(V.WORK, 'curiosity')
PLAN = os.path.join(WORK, 'plan.json')
OUT = os.path.join(V.AUDIO, 'cb')
VOICE = 'Aoede'
STYLE = ('a warm, kind Saudi woman teacher speaking clear Modern Standard Arabic to an eight-year-old girl; natural and human, '
         'curious and encouraging, at an easy pace, each line said once')
BATCH = 21
GAP = 1.0
# the prompts she hears (the keys of the L block in curiosity.js), with the clip id the app plays
UI = {'stormGo': 'stormGo', 'needOne': 'needOne', 'sort': 'sort', 'praiseLong': 'praiseLong', 'praiseShort': 'praiseShort',
      'flip': 'flip', 'flipDone': 'flipDone', 'star': 'star', 'predict': 'predict', 'end': 'end', 'found': 'found',
      'surprised': 'surprised', 'wonderOk': 'wonderOk', 'fruit': 'fruit', 'sayHello': 'hello',
      'ph1': 'ph1', 'ph2': 'ph2', 'ph3': 'ph3', 'ph4': 'ph4', 'ph5': 'ph5', 'describe': 'describe', 'describeSound': 'describeSound',
      # Phase 2: Baba's dinner question, Big Question Day, the Mystery Box game (the lines Baba reads himself are not said)
      'dinnerDone': 'dinnerDone', 'bigPick': 'bigPick', 'bigTalk': 'bigTalk', 'bigDone': 'bigDone',
      'gameIntro': 'gameIntro', 'gameSecretA': 'gameSecretA', 'gameSecretM': 'gameSecretM', 'gameHand': 'gameHand', 'gameAsk': 'gameAsk',
      'gameCross': 'gameCross', 'gameTap': 'gameTap', 'gameNot': 'gameNot', 'gameNone': 'gameNone', 'gameHalf': 'gameHalf',
      'gameMissed': 'gameMissed', 'gameWide': 'gameWide'}
EMOJI = re.compile('[\U0001F000-\U0001FAFF☀-➿⬀-⯿️‍]')


def ui_lines():
    js = open(os.path.join(ROOT, 'curiosity.js'), encoding='utf-8').read()
    block = js[js.index('const L = {'):js.index('};', js.index('const L = {'))]
    found = dict(re.findall(r"(\w+): '([^']*)'", block))
    return {cid: found[key] for key, cid in UI.items()}


def clean(t):
    t = EMOJI.sub('', t).replace('«', '').replace('»', '')
    return re.sub(r'\s+', ' ', t).strip()


# what the voice is given for a few lines: the same words, fully vowelled, so every word is said clearly
SPOKEN = {'goal': 'اليومَ نتدرَّبُ لِنكونَ سائِلاتٍ ماهِرات', 'r1': 'اِسْألي أكبرَ عددٍ مِنَ الأسئلة',
          # the phases: their number is said with their name (on screen, the number is a giant digit)
          'ph1': 'المرحلةُ الأولى: صِفي الصورة', 'ph2': 'المرحلةُ الثانية: اِسألي كلَّ أسئلتِكِ', 'ph3': 'المرحلةُ الثالثة: قصيرٌ أم طويل؟',
          'ph4': 'المرحلةُ الرابعة: اِختاري أفضلَ سؤال', 'ph5': 'المرحلةُ الخامسة: نبحثُ معًا',
          # said wrongly bare (26 Oct check): vowelled
          'gameSecretA': 'لِلكِبار: اِختاروا صورةً سِرًّا', 'gameHand': 'الآنَ أَعْطوا الآيباد لِمَن يَسأل',
          'm-A6': 'ظِلُّ يَدي صارَ طائِرًا', 'm-E8': 'بُؤْبُؤُ العَيْنِ يَكْبُرُ وَيَصْغُر', 'm-I8': 'غُصْنٌ يَمْشي!'}


def lines():
    """[(clip id, what is said)], in the order the app needs them: the prompts, then week by week"""
    D = json.load(open(os.path.join(ROOT, 'curiosity.json'), encoding='utf-8'))
    out = [('goal', D['goal'])] + [(f'r{i + 1}', x) for i, x in enumerate(D['rules'])]
    out += [(k, v) for k, v in ui_lines().items()]
    first = ['A5', 'C1', 'D8', 'B1', 'F1', 'G1', 'E4', 'A1', 'C2', 'E1', 'B2', 'F2', 'G2', 'H1', 'A2', 'C3', 'D1', 'B3', 'F3', 'G3', 'E2',
             'A3', 'C4', 'E3', 'B4', 'F4', 'G4', 'H2', 'A4', 'C5']          # the order she meets them (from a Sunday start)
    rank = lambda m: (first.index(m['id']) if m['id'] in first else 100 + 'ABCDEFGHI'.index(m['theme']) * 20 + m['n'])
    for m in sorted(D['mysteries'], key=rank):
        if not m['ready']:
            continue
        if m['theme'] != 'G':
            out.append((f"m-{m['id']}", m['line']))
        if m.get('predict'):
            out.append((f"p-{m['id']}", m['predict']))
    out += [(wid(w), say_word(w)) for w in hint_words(D)]
    return [(i, clean(SPOKEN.get(i, t))) for i, t in out]


# the hints are said word by word (40 words to a take): «لماذا؟ ... مطر ... شمس». Inside one take the voice pauses after each word as long
# as between lines, so a hint recorded as one line cannot be cut reliably; every word is recorded on its own instead
# (a word said once serves every hint that uses it) and build joins the three words of each hint.
import hashlib
def wid(w):
    return 'k-' + hashlib.md5(w.encode('utf-8')).hexdigest()[:8]


# words the voice said wrongly when given them bare (26 Oct check): fully vowelled, so an isolated word is said one way only
VOWELLED = {'من': 'مَن', 'ظل': 'ظِلّ', 'ماء': 'ماءٌ', 'بطء': 'بُطْءٌ', 'أشعة': 'أَشِعَّة', 'تتشابك': 'تَتَشابَكُ', 'رأى': 'رَأى', 'صيف': 'صَيْفٌ',
            'تمر': 'تَمْرٌ', 'عالٍ': 'عالٍ', 'دفء': 'دِفْءٌ', 'رقص': 'رَقْصٌ', 'عائلة': 'عائِلَة', 'تبقى': 'تَبْقى', 'سريع': 'سَريعٌ',
            'يطفو': 'يَطْفو', 'تطفو': 'تَطْفو', 'نسكب': 'نَسْكُبُ', 'كأس': 'كَأْسٌ', 'غبار': 'غُبارٌ', 'عرفنا': 'عَرَفْنا', 'اهتدى': 'اِهْتَدى',
            'تسافر': 'تُسافِرُ', 'حول': 'حَوْلَ', 'يرى': 'يَرى', 'تعب': 'تَعَبٌ', 'طعم': 'طَعْمٌ', 'زكام': 'زُكامٌ', 'عظمة': 'عَظْمَة',
            'نرى': 'نَرى', 'كبار': 'كِبارٌ', 'عضلة': 'عَضَلَة', 'يذوب': 'يَذوبُ', 'صوف': 'صوفٌ', 'غيوم': 'غُيومٌ', 'نراها': 'نَراها',
            'شمع': 'شَمْعٌ', 'غيمة': 'غَيْمَة', 'فم': 'فَمٌ', 'صدى': 'صَدًى', 'ساق': 'ساقٌ', 'صهارة': 'صُهارَة', 'سوداء': 'سَوْداء'}


def say_word(w):
    return VOWELLED.get(w, w) + ('؟' if w in QWORDS else '')


QWORDS = {'لماذا', 'كيف', 'ماذا لو', 'ماذا', 'هل', 'كم', 'متى', 'أين', 'من', 'أيّ', 'من أين'}


def hint_words(D):
    seen = []
    for m in D['mysteries']:
        if m['ready']:
            for h in m['hints']:
                for w in [h['w']] + h['k']:
                    if w not in seen:
                        seen.append(w)
    return seen


def cmd_lines(a):
    ls = lines()
    for i, t in ls:
        print(i, '|', t)
    print(len(ls), 'lines,', (len(ls) + BATCH - 1) // BATCH, 'TTS requests')


class Hang(Exception):
    pass


def synth(client, text, model):
    """One take. The 3.8 models take the style in its own field (never read aloud); the others get it as an instruction."""
    def alarm(*_):
        raise Hang()
    signal.signal(signal.SIGALRM, alarm)
    for attempt in range(3):
        signal.alarm(150)
        try:
            if model.startswith('gemini-3.8'):
                it = client.interactions.create(
                    model=model,
                    input=[{'type': 'user_input', 'content': [{'type': 'text', 'text': text, 'annotations': [{'type': 'speech_metadata', 'style': STYLE}]}]}],
                    response_format={'type': 'audio'}, generation_config={'speech_config': [{'voice': VOICE}]})
                data = it.output_audio.data
            else:
                from google.genai import types as T
                r = client.models.generate_content(
                    model=model, contents=f'Read these Arabic lines aloud as {STYLE}. Pause between lines.\n\n' + text,
                    config=T.GenerateContentConfig(response_modalities=['AUDIO'], speech_config=T.SpeechConfig(
                        voice_config=T.VoiceConfig(prebuilt_voice_config=T.PrebuiltVoiceConfig(voice_name=VOICE)))))
                data = r.candidates[0].content.parts[0].inline_data.data
            signal.alarm(0)
            return base64.b64decode(data) if isinstance(data, str) else data
        except Hang:
            print('  the TTS call hung; trying again', flush=True)
        except Exception as e:
            signal.alarm(0)
            msg = str(e)
            if V.is_daily_quota(msg) or 'RESOURCE_EXHAUSTED' in msg:
                raise V.QuotaUsedUp(msg)
            m = re.search(r'retry in ([\d.]+)s', msg)
            wait = float(m.group(1)) + 2 if m else 20 * (attempt + 1)
            print(f'  TTS attempt {attempt + 1} failed ({type(e).__name__}); retrying in {wait:.0f}s', flush=True)
            time.sleep(wait)
        finally:
            signal.alarm(0)
    raise RuntimeError('TTS failed 3 times')


def cmd_record(a, only=None):
    plan = V.load(PLAN, {'batches': {}, 'clips': {}})
    have = {i for b in plan['batches'].values() for i in b['ids']}
    text = dict(lines())
    todo = [i for i in text if (i in only if only else i not in have)]
    if not todo:
        V.finish(0, 'nothing to record')
    ls_ = [i for i in todo if not i.startswith('k-')]; ws_ = [i for i in todo if i.startswith('k-')]
    chunks = ([ls_[k:k + BATCH] for k in range(0, len(ls_), BATCH)] + [ws_[k:k + 40] for k in range(0, len(ws_), 40)])[:a.max or None]
    from google import genai
    client = genai.Client(api_key=V.api_key())
    n = max([int(k[1:]) for k in plan['batches']] + [0])
    for chunk in chunks:
        n += 1; bid = f'b{n:02d}'
        try:
            raw = synth(client, '\n<long pause>\n'.join(text[i] for i in chunk), a.model)
        except V.QuotaUsedUp:
            V.dump(PLAN, plan); V.finish(11, f'daily quota used up for {a.model}')
        path = os.path.join(WORK, 'batches', f'{bid}.wav')
        V.save_take(raw, path)
        plan['batches'][bid] = {'ids': chunk, 'voice': VOICE, 'model': a.model, 'recorded': time.strftime('%Y-%m-%d %H:%M'),
                                'seconds': round(V.duration(path), 1)}
        V.dump(PLAN, plan)
        print(f'{bid}: {len(chunk)} lines, {plan["batches"][bid]["seconds"]} s', flush=True)
        if chunk is not chunks[-1]:
            time.sleep(8)
    V.finish(0, 'recorded')


def pieces(x, want):
    """Cut a take at its long silences; try a few thresholds until it gives exactly `want` pieces."""
    env = V.envelope(x)
    for k in (0.06, 0.04, 0.09, 0.03, 0.12):
        thr = max(0.004, k * np.percentile(env, 95))
        for gap in (GAP, 0.8, 1.3, 0.6):
            gs = [(s, e) for s, e in V.runs(env < thr) if (e - s) * 0.01 >= gap and s > 0 and e < len(env)]
            if len(gs) == want - 1:
                cuts = [0] + [int((s + e) / 2 * 0.01 * V.SR) for s, e in gs] + [len(x)]
                return [V.trim(x[cuts[i]:cuts[i + 1]]) for i in range(want)]
    thr = max(0.004, 0.06 * np.percentile(env, 95))
    gs = [(s, e) for s, e in V.runs(env < thr) if (e - s) * 0.01 >= 0.3 and s > 0 and e < len(env)]
    if len(gs) >= want - 1:
        gs = sorted(sorted(gs, key=lambda g: g[1] - g[0], reverse=True)[:want - 1])
        cuts = [0] + [int((s + e) / 2 * 0.01 * V.SR) for s, e in gs] + [len(x)]
        return [V.trim(x[cuts[i]:cuts[i + 1]]) for i in range(want)]
    return None


def pieces_fit(x, texts):
    """Cut a take into len(texts) pieces at the pauses that best match where each line should end: a line's share of
    the take follows its length in letters, and a longer pause is a better cut (a line can hold a short pause inside,
    as after «ما رأيكِ؟»). Dynamic programming over the pauses, in order."""
    env = V.envelope(x); n = len(env); K = len(texts)
    if K == 1:
        return [V.trim(x)]                             # one line: the whole take is its clip
    thr = max(0.004, 0.06 * np.percentile(env, 95))
    gaps = [(s, e) for s, e in V.runs(env < thr) if (e - s) * 0.01 >= 0.22 and s > 0 and e < n]
    if len(gaps) < K - 1:
        return None
    w = [len(re.sub(r'[\s\u064B-\u065F]', '', t)) + 8 for t in texts]
    exp = np.cumsum(w)[:-1] / sum(w) * n
    unit = n / K
    mids = [(s + e) / 2 for s, e in gaps]; lens = [min(1.6, (e - s) * 0.01) for s, e in gaps]
    G = len(gaps); INF = 1e18
    cost = lambda i, g: ((mids[g] - exp[i]) / unit) ** 2 * 1.2 - 2.5 * lens[g]
    dp = np.full((K - 1, G), INF); back = np.zeros((K - 1, G), int)
    for g in range(G):
        dp[0][g] = cost(0, g)
    for i in range(1, K - 1):
        best, arg = INF, -1
        for g in range(G):
            if g > 0 and dp[i - 1][g - 1] < best:
                best, arg = dp[i - 1][g - 1], g - 1
            if arg >= 0:
                dp[i][g] = best + cost(i, g); back[i][g] = arg
    g = int(np.argmin(dp[K - 2])); chosen = [g]
    for i in range(K - 2, 0, -1):
        g = int(back[i][g]); chosen.append(g)
    chosen.reverse()
    cuts = [0] + [int(mids[g] * 0.01 * V.SR) for g in chosen] + [len(x)]
    return [V.trim(x[cuts[i]:cuts[i + 1]]) for i in range(K)]


def cmd_split(a):
    plan = V.load(PLAN, {'batches': {}, 'clips': {}})
    text = dict(lines())
    for bid, b in sorted(plan['batches'].items()):
        if b.get('split') and bid not in (a.again or []):
            continue
        x = V.read_wav(os.path.join(WORK, 'batches', f'{bid}.wav'))
        ps = pieces_fit(x, [text[i] for i in b['ids']]) or pieces(x, len(b['ids']))
        if not ps:
            print(f'{bid}: could not cut into {len(b["ids"])} pieces; re-record these lines'); continue
        for i, p in zip(b['ids'], ps):
            V.write_wav(os.path.join(WORK, 'clips', f'{i}.wav'), p)
            plan['clips'][i] = {'batch': bid, 'seconds': round(len(p) / V.SR, 2)}      # (a new cut is checked again)
        b['split'] = True
        print(f'{bid}: {len(ps)} clips')
    V.dump(PLAN, plan)


ASK = 'Transcribe this short Arabic clip verbatim, in Arabic script, exactly as spoken. Reply with the words only, or "-" if silent.'


def norm(t):
    t = re.sub('[ً-ٰٟـ]', '', t)
    t = t.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ة', 'ه').replace('ى', 'ي')
    return re.sub(r'[^ء-ي ]', ' ', t).split()


def close(want, heard):
    a, b = ' '.join(norm(want)), ' '.join(norm(heard))
    return SequenceMatcher(None, a, b).ratio()


def word_heard(want, heard):
    """one hint word: right if every word of it is among the words heard, allowing «ال» or «و» in front (لون / اللون).
    A word heard alone is often written with a long vowel the transcriber guessed for a short one (لسان as «ليسان», نطبخ
    as «نطبوخ»), and ض as ظ: those pass when the wanted letters appear in order and the only extra letters are ا و ي.
    A changed or missing letter still fails (ساق heard as «سوق» fails)."""
    strip = lambda w: w[2:] if w.startswith('ال') and len(w) > 3 else (w[1:] if w.startswith('و') and len(w) > 3 else w)
    same = lambda t: t.replace('ظ', 'ض')
    hs = {same(strip(h)) for h in norm(heard)} | {same(h) for h in norm(heard)}
    def fits(w, h):
        i = 0
        for ch in h:
            if i < len(w) and ch == w[i]:
                i += 1
            elif ch not in 'اوي':
                return False
        return i == len(w)
    return all(any(fits(same(x), h) for h in hs for x in (w, strip(w))) for w in norm(want))


def cmd_verify(a):
    plan = V.load(PLAN, {'batches': {}, 'clips': {}})
    text = dict(lines())
    ear = V.Ear(); bad = []
    for i, c in sorted(plan['clips'].items()):
        if c.get('ok') is not None and not a.all:
            if not c['ok']:
                bad.append(i)
            continue
        heard = ear.hear(os.path.join(WORK, 'clips', f'{i}.wav'), ASK)
        score = close(text.get(i, ''), heard)
        good = word_heard(text.get(i, ''), heard) if i.startswith('k-') else score >= 0.9
        c['heard'] = heard; c['score'] = round(score, 2); c['ok'] = bool(good)
        if not c['ok']:
            bad.append(i)
        print(i, 'ok' if c['ok'] else 'MISS', f'{score:.2f}', '|', text.get(i), '|', heard, flush=True)
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
    want = dict(lines())
    clips = {}
    for i, c in sorted(plan['clips'].items()):
        if not c.get('ok') or i not in want:
            continue
        dst = os.path.join(OUT, f'{i}.m4a')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(WORK, 'clips', f'{i}.wav'),
                        '-ac', '1', '-c:a', 'aac', '-b:a', '48k', dst], check=True)
        clips[i] = {'f': f'cb/{i}.m4a', 'd': c['seconds']}
    D = json.load(open(os.path.join(ROOT, 'curiosity.json'), encoding='utf-8'))
    ok = lambda i: plan['clips'].get(i, {}).get('ok')
    for m in D['mysteries']:
        if not m['ready']:
            continue
        for k, h in enumerate(m['hints']):
            ws = [h['w']] + h['k']
            if not all(ok(wid(w)) for w in ws):
                continue
            parts = []
            for j, w in enumerate(ws):
                parts.append(V.read_wav(os.path.join(WORK, 'clips', f'{wid(w)}.wav')))
                if j < len(ws) - 1:
                    parts.append(np.zeros(int((0.45 if j == 0 else 0.3) * V.SR), np.float32))
            hid = f"h-{m['id']}-{k + 1}"; x = np.concatenate(parts)
            V.write_wav(os.path.join(WORK, 'clips', f'{hid}.wav'), x)
            dst = os.path.join(OUT, f'{hid}.m4a')
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(WORK, 'clips', f'{hid}.wav'), '-ac', '1', '-c:a', 'aac', '-b:a', '48k', dst], check=True)
            clips[hid] = {'f': f'cb/{hid}.m4a', 'd': round(len(x) / V.SR, 2)}
    for i in [i for i in clips if i.startswith('k-')]:
        clips.pop(i)                                   # the single words are only parts of the hints
    vj = os.path.join(V.AUDIO, 'voice.json')
    manifest = V.load(vj, {'v': 2, 'decks': {}})
    manifest['decks']['cbox'] = {'voice': VOICE, 'model': 'gemini TTS', 'placeholder': False, 'clips': clips}
    V.dump(vj, manifest)
    print(len(clips), 'of', len(want), 'clips in audio/cb and the cbox deck of audio/voice.json')


if __name__ == '__main__':
    p = argparse.ArgumentParser(); sub = p.add_subparsers(dest='cmd', required=True)
    sub.add_parser('lines')
    r = sub.add_parser('record'); r.add_argument('--max', type=int, default=0); r.add_argument('--model', default='gemini-3.8-flash-tts')
    sp = sub.add_parser('split'); sp.add_argument('--again', nargs='*', help='cut these batches again')
    v = sub.add_parser('verify'); v.add_argument('--redo', action='store_true'); v.add_argument('--all', action='store_true')
    v.add_argument('--max', type=int, default=0); v.add_argument('--model', default='gemini-3.8-flash-tts')
    sub.add_parser('build')
    a = p.parse_args()
    {'lines': cmd_lines, 'record': cmd_record, 'split': cmd_split, 'verify': cmd_verify, 'build': cmd_build}[a.cmd](a)
