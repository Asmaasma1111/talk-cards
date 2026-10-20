"""Maria Reads: the model voice for words (Gemini TTS, Kore, American English), the same pipeline as maths_voice.py.
Single sounds are never made with TTS: Mama records them on the iPad (the Record sounds screen in reads.js).

  python scripts/reads_voice.py test [--model M]   the 10 stretchy test words in one request, cut, transcribed,
                                                   and a listening page at voice-work/reads/test.html (nothing published)
  python scripts/reads_voice.py compare            one listening page for every model tried, each word as recorded and
                                                   with a clean ending (no API calls)
  python scripts/reads_voice.py words [--max N]    record every word in reads.json (reading words and ear-game words) in
                                                   batches, cut, clean ending, transcription check
  python scripts/reads_voice.py sounds             the built-in single sounds, cut from the approved Voice A words so
                                                   no "uh" follows a stop: /a/ (held, from "aaat"), /t/ (the end of "aaat"),
                                                   /k/ (the start of "key"), /b/ (the end of "aaab"); then run build
  python scripts/reads_voice.py build              audio/rd/*.m4a and the 'reads' deck in audio/voice.json (words that
                                                   passed, the stretchy models, and the built-in sounds)
  python scripts/reads_voice.py rec words|lines [--upto N] [--max K]
                                                   Phase 2: record what voice-work/reads/needs.json lists (written by
                                                   make_reads.py), lesson by lesson up to lesson N, then cut and check
  python scripts/reads_voice.py sounds2 [--upto N] the built-in sounds for lessons 9-24, cut from one stretchy take
Voice: Kore on gemini-3.8-flash-tts with the clean ending (her choice, 20 Oct 2026).

Run it with the venv that has google-genai: ~/Downloads/06_Projects_and_Code/maria-tenses/.venv/bin/python
It reuses the helpers in voice.py (TTS call, wav tools, transcriber). The key is read from .env and never printed.
Exit codes: 0 done, 10 GEMINI_API_KEY missing, 11 daily TTS quota used up, 1 error.
"""
import argparse, base64, glob, html, json, os, signal, subprocess, sys, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import voice as V
import maths_voice as MV

WORK = os.path.join(V.WORK, 'reads')
V.DECKS['reads'] = {'voice': 'Kore', 'say_rate': 150,
                    'style': 'a warm, clear American English teacher modelling stretchy blending for a young beginner reader: '
                             'say each word once, slowly and smoothly, holding the long sounds with no gaps between sounds, '
                             'and stop cleanly on the last sound with no extra "uh"'}
V.DECKS['readsw'] = {'voice': 'Kore', 'say_rate': 160,
                     'style': 'a warm, clear American English teacher saying single words to a young English learner: '
                              'each word said once, clearly and a little slowly, ending cleanly with no extra "uh"'}
WORDS_DIR = os.path.join(WORK, 'words')
WPLAN = os.path.join(WORDS_DIR, 'plan.json')
OUT = os.path.join(V.AUDIO, 'rd')
SAY = {'ab': 'abb', 'ba': 'baa'}                    # pretend words, spelled so the voice reads them as one syllable
HEARD_OK = {'ab': {'ab', 'abb', 'abe'}, 'ba': {'ba', 'baa', 'bah'}, 'bee': {'b'}, 'tea': {'t'}, 'bin': {'been'}, 'pea': {'p', 'pee'}}   # bee and tea sound like the letter names
STRETCHY = ['at', 'cat', 'bat', 'tab', 'cab', 'ab', 'ba', 'act']   # from the approved test take (Voice A)
BATCH = 18
V.DECKS['readsx'] = {'voice': 'Kore', 'say_rate': 160,
                     'style': 'a warm, clear American English teacher reading short, simple lines to a young English learner: '
                              'natural and friendly, a little slow, each line said once'}
LINES_DIR = os.path.join(WORK, 'lines')
LPLAN = os.path.join(LINES_DIR, 'plan.json')
NEEDS = os.path.join(WORK, 'needs.json')
# what Maria sees, and what the voice is given (held letters written out, stop sounds written once)
TEST = [('map', 'mmmaaap'), ('sun', 'sssuuunnn'), ('at', 'aaat'), ('cat', 'caaat'), ('bat', 'baaat'),
        ('tab', 'taaab'), ('cab', 'caaab'), ('ab', 'aaab'), ('ba', 'baaa'), ('act', 'aaact')]


def alarm(secs):
    def boom(*_):
        raise TimeoutError('TTS call took too long')
    signal.signal(signal.SIGALRM, boom); signal.alarm(secs)


def synth_gc(client, model, lines):
    from google.genai import types
    prompt = ('Say the following words as ' + V.DECKS['reads']['style'] + '. Leave a long pause of about two seconds '
              'between words. Read only the words, one after another, nothing else:\n\n' + '\n'.join(l + '.' for l in lines))
    try:
        r = client.models.generate_content(model=model, contents=prompt, config=types.GenerateContentConfig(
            response_modalities=['AUDIO'], speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=V.DECKS['reads']['voice'])))))
    except Exception as e:
        if V.is_daily_quota(str(e)) or 'RESOURCE_EXHAUSTED' in str(e):
            raise V.QuotaUsedUp(str(e))
        raise
    return r.candidates[0].content.parts[0].inline_data.data


def cmd_test(a):
    os.makedirs(WORK, exist_ok=True)
    tag = a.model.replace('gemini-', '').replace('-', '')
    take = os.path.join(WORK, f'test-{tag}.wav')
    if not os.path.exists(take):
        V.MODEL = a.model
        from google import genai
        client = genai.Client(api_key=V.api_key())
        alarm(240)
        try:
            if a.model.startswith('gemini-3.8'):     # interactions API: the style is never read aloud
                raw = V.synth_gemini(client, '\n<long pause>\n'.join(t + '.' for _, t in TEST), 'reads')
            else:                                     # 3.1 and 2.5 only work through generate_content, style as an instruction
                raw = synth_gc(client, a.model, [t for _, t in TEST])
        except V.QuotaUsedUp:
            V.finish(11, f'daily quota used up for {a.model}')
        finally:
            signal.alarm(0)
        V.save_take(raw, take)
    x = V.read_wav(take)
    print(f'take: {V.duration(take):.1f} s')
    ps = MV.pieces(x, len(TEST))
    if not ps:
        V.finish(1, f'could not cut the take into {len(TEST)} pieces; listen to {take}')
    ear = V.Ear(); rows = []
    for (word, text), p in zip(TEST, ps):
        wav = os.path.join(WORK, f'{tag}-{word}.wav'); m4a = wav[:-4] + '.m4a'
        V.write_wav(wav, p)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-c:a', 'aac', '-b:a', '64k', m4a], check=True)
        heard = ear.hear(wav)
        rows.append({'word': word, 'text': text, 'secs': round(len(p) / V.SR, 2), 'heard': heard, 'file': os.path.basename(m4a)})
        print(f'{word:5} {text:10} {len(p) / V.SR:4.2f} s  heard: {heard}')
    V.dump(os.path.join(WORK, f'test-{tag}.json'), rows)
    page(tag, rows, a.model)
    V.finish(0, 'test words ready')


def page(tag, rows, model):
    items = ''.join(
        f'<li><button onclick="new Audio(\'{r["file"]}\').play()">&#9654;</button>'
        f'<b>{html.escape(r["word"].upper())}</b><span>{html.escape(r["text"])}</span><i>{r["secs"]} s</i></li>' for r in rows)
    out = f'''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Maria Reads voice test</title>
<style>body{{font:18px/1.4 Verdana,sans-serif;background:#FFF3F8;color:#4A2340;margin:0;padding:28px}}
h1{{font-size:24px;margin:0 0 4px}}p{{margin:0 0 18px;color:#8A5577}}ul{{list-style:none;padding:0;display:grid;gap:10px;max-width:640px}}
li{{display:flex;align-items:center;gap:16px;background:#fff;border-radius:16px;padding:10px 16px;box-shadow:0 4px 12px rgba(200,80,140,.12)}}
button{{width:52px;height:52px;border-radius:50%;border:0;background:#F27BA8;color:#fff;font-size:20px;cursor:pointer}}
b{{font-size:28px;min-width:90px}}span{{color:#8A5577;flex:1}}i{{color:#B58AA6;font-style:normal;font-size:14px}}</style>
<h1>Kore, stretchy words</h1><p>{html.escape(model)}. Tap to listen.</p><ul>{items}</ul>'''
    open(os.path.join(WORK, f'test-{tag}.html'), 'w', encoding='utf-8').write(out)


# ---------- a clean ending: a final stop sound (b c d g k p t) with no "uh" after it ----------
VOICED = set('bdg')


def crisp(x, word, gentle=False):
    """Shorten the hold before a final stop and keep only its short release, so the word ends on the sound itself.
    gentle (plain words, said at normal speed): keep the hold and a longer release, only the tail after it goes
    (the strong cut turned "crab" into "crap" and "web" into "wet")."""
    last = word[-1].lower()
    if last not in 'bcdgkpt':
        return x
    n = int(0.01 * V.SR)
    env = np.array([np.sqrt(np.mean(x[i:i + n] ** 2)) for i in range(0, len(x) - n, n)])
    if len(env) < 30:
        return x
    top = env.max()
    # the release: the last little peak that comes after a dip (the lips or tongue closed)
    r = None
    for i in range(len(env) - 2, max(len(env) - 45, 30), -1):
        if env[i] >= env[i - 1] and env[i] >= env[i + 1] and env[i] >= 0.25 * top and env[max(0, i - 30):i].min() < 0.6 * env[i]:
            r = i; break
    if r is None:
        return x
    rs = max(0, r - 1)
    c1 = rs
    while c1 > 0 and env[c1 - 1] < 0.6 * env[r]:
        c1 -= 1
    hold = 5 if last in VOICED else 6                       # frames of closure kept (50 or 60 ms)
    keep = 2 if last in VOICED else 9                       # frames of release kept (20 or 90 ms): a b just closes
    if len(word) > 1 and word[-2].lower() in 'bcdgkpt':     # ACT: the c sits in that hold, so it stays whole
        c1 = rs
    if gentle:
        c1 = rs; keep = 7 if last in VOICED else 11
    a = x[:(c1 + hold // 2) * n]; b = x[(rs - (hold - hold // 2)) * n:(rs + keep) * n].copy()
    if rs - c1 <= hold:
        a = x[:rs * n]; b = x[rs * n:(rs + keep) * n].copy()
    f = min(len(b), int(0.015 * V.SR))
    b[-f:] *= np.linspace(1, 0, f)
    x2 = np.concatenate([a, b])
    if len(a) and (rs - c1) > hold:                            # smooth the join where the hold was shortened
        k = min(int(0.008 * V.SR), len(a), len(b))
        x2[len(a) - k:len(a)] *= np.linspace(1, 0.4, k)
    return np.concatenate([x2, np.zeros(int(0.06 * V.SR), np.float32)])


def cmd_compare(a):
    takes = sorted(glob.glob(os.path.join(WORK, 'test-*.json')), reverse=True)   # newest model first
    models = []
    for j in takes:
        tag = os.path.basename(j)[5:-5]
        rows = V.load(j, [])
        for r in rows:
            wav = os.path.join(WORK, r['file'][:-4] + '.wav')
            cw = wav[:-4] + '-clean.wav'
            V.write_wav(cw, crisp(V.read_wav(wav), r['word']))
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', cw, '-ac', '1', '-c:a', 'aac', '-b:a', '64k', cw[:-4] + '.m4a'], check=True)
            r['clean'] = os.path.basename(cw[:-4] + '.m4a')
        models.append((tag, rows))
    words = [w for w, _ in TEST]
    head = ''.join(f'<th colspan="2">Voice {chr(65 + i)}<small>{html.escape(t)}</small></th>' for i, (t, _) in enumerate(models))
    sub = ''.join('<th>as made</th><th>clean end</th>' for _ in models)
    body = ''
    for w in words:
        cells = ''
        for _, rows in models:
            r = next((x for x in rows if x['word'] == w), None)
            cells += (f'<td><button onclick="play(\'{r["file"]}\',this)">&#9654;</button></td>'
                      f'<td><button class="c" onclick="play(\'{r["clean"]}\',this)">&#9654;</button></td>') if r else '<td></td><td></td>'
        body += f'<tr><th class="w">{w.upper()}</th>{cells}</tr>'
    out = f'''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Maria Reads voice test</title>
<style>body{{font:17px/1.4 Verdana,sans-serif;background:#FFF3F8;color:#4A2340;margin:0;padding:28px}}
h1{{font-size:24px;margin:0 0 6px}}p{{margin:0 0 18px;color:#8A5577;max-width:720px}}
table{{border-collapse:separate;border-spacing:8px 6px}}th small{{display:block;font-weight:400;font-size:12px;color:#B58AA6}}
th{{font-size:14px;color:#8A5577}}th.w{{font-size:28px;color:#4A2340;text-align:left;padding-right:12px}}
button{{width:50px;height:50px;border-radius:50%;border:0;background:#F27BA8;color:#fff;font-size:18px;cursor:pointer}}
button.c{{background:#5DBB7A}}button.on{{outline:4px solid #FFD25E}}</style>
<h1>Kore, stretchy words</h1>
<p>Pink plays the word as the voice made it. Green plays the same word with a clean ending: the hold before a final b or t is shorter and nothing comes after the sound.</p>
<table><tr><th></th>{head}</tr><tr><th></th>{sub}</tr>{body}</table>
<script>let au=null;function play(f,b){{if(au)au.pause();document.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));b.classList.add('on');au=new Audio(f);au.play();}}</script>'''
    open(os.path.join(WORK, 'compare.html'), 'w', encoding='utf-8').write(out)
    print('page: voice-work/reads/compare.html,', len(models), 'voices')


# ---------- the words: one clip per word, Voice A, clean ending ----------
def all_words():
    d = json.load(open(os.path.join(V.ROOT, 'reads.json'), encoding='utf-8'))
    ws = list(d['words'])
    for e in d['ear'].values():
        for k in ('beg', 'mid', 'end', 'no'):
            ws += e[k]
    out = []
    for w in ws:
        if w not in out:
            out.append(w)
    return out


def cmd_words(a):
    os.makedirs(os.path.join(WORDS_DIR, 'batches'), exist_ok=True)
    plan = V.load(WPLAN, {'batches': {}, 'clips': {}})
    done = {w for b in plan['batches'].values() for w in b['ids'] if plan['clips'].get(w, {}).get('ok') or not b.get('split')}
    todo = [w for w in all_words() if w not in done]
    if a.only:
        todo = [w for w in a.only.split(',')]
    chunks = [todo[i:i + BATCH] for i in range(0, len(todo), BATCH)][:a.max or None]
    if chunks:
        V.MODEL = 'gemini-3.8-flash-tts'
        from google import genai
        client = genai.Client(api_key=V.api_key())
        n = max([int(k[1:]) for k in plan['batches']] + [0])
        for chunk in chunks:
            n += 1; bid = f'b{n:02d}'
            alarm(240)
            try:
                raw = V.synth_gemini(client, '\n<long pause>\n'.join(SAY.get(w, w) + '.' for w in chunk), 'readsw')
            except V.QuotaUsedUp:
                V.dump(WPLAN, plan); V.finish(11, 'daily quota used up for gemini-3.8-flash-tts')
            finally:
                signal.alarm(0)
            path = os.path.join(WORDS_DIR, 'batches', f'{bid}.wav')
            V.save_take(raw, path)
            plan['batches'][bid] = {'ids': chunk, 'model': V.MODEL, 'recorded': time.strftime('%Y-%m-%d %H:%M')}
            V.dump(WPLAN, plan)
            print(f'{bid}: {len(chunk)} words, {V.duration(path):.1f} s')
            time.sleep(6)
    reading = set(json.load(open(os.path.join(V.ROOT, 'reads.json'), encoding='utf-8'))['words'])
    ear = V.Ear()
    for bid, b in sorted(plan['batches'].items()):
        if b.get('split'):
            continue
        x = V.read_wav(os.path.join(WORDS_DIR, 'batches', f'{bid}.wav'))
        ps = MV.pieces(x, len(b['ids']))
        if not ps:
            print(f'{bid}: could not cut into {len(b["ids"])} words; record again with --only'); b['split'] = True; continue
        for w, p in zip(b['ids'], ps):
            V.write_wav(os.path.join(WORDS_DIR, f'raw-{w}.wav'), p)
            clean = crisp(p, w, gentle=True) if w in reading else p   # ear-game words stay natural (a trim made crab sound rude)
            wav = os.path.join(WORDS_DIR, f'w-{w}.wav')
            V.write_wav(wav, clean)
            heard = ear.hear(wav)
            got = V.norm(heard)
            ok = got == V.norm(w) or got in HEARD_OK.get(w, set())
            plan['clips'][w] = {'batch': bid, 'seconds': round(len(clean) / V.SR, 2), 'heard': heard, 'ok': ok}
            print(f'  {w:10} {len(clean) / V.SR:4.2f} s  {"ok" if ok else "MISS"}  heard: {heard}')
        b['split'] = True
        V.dump(WPLAN, plan)
    bad = [w for w, c in plan['clips'].items() if not c.get('ok')]
    print(len(plan['clips']) - len(bad), 'ok;', len(bad), 'to redo:', ','.join(bad))
    V.finish(0, 'words recorded')


def cmd_build(a):
    plan = V.load(WPLAN, {'batches': {}, 'clips': {}})
    os.makedirs(OUT, exist_ok=True)
    clips = {}
    enc = lambda src, dst: subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-ac', '1', '-c:a', 'aac', '-b:a', '48k', dst], check=True)
    for w, c in sorted(plan['clips'].items()):
        if not c.get('ok'):
            continue
        enc(os.path.join(WORDS_DIR, f'w-{w}.wav'), os.path.join(OUT, f'w-{w}.m4a'))
        clips['w-' + w] = {'f': f'rd/w-{w}.m4a', 'd': c['seconds']}
    for w in STRETCHY:   # the stretchy models: Voice A test take, clean ending
        src = os.path.join(WORK, f'3.8flashtts-{w}-clean.wav')
        enc(src, os.path.join(OUT, f's-{w}.m4a'))
        clips['s-' + w] = {'f': f'rd/s-{w}.m4a', 'd': round(V.duration(src), 2)}
    if os.path.isdir(SOUNDS_DIR):   # the built-in single sounds: p-<id> held (or the only one), q-<id> short
        for f in sorted(os.listdir(SOUNDS_DIR)):
            if not f.endswith('.wav'):
                continue
            sid = f[:-4]; key = ('q-' + sid[:-6]) if sid.endswith('-short') else 'p-' + sid
            enc(os.path.join(SOUNDS_DIR, f), os.path.join(OUT, f'snd-{sid}.m4a'))
            clips[key] = {'f': f'rd/snd-{sid}.m4a', 'd': round(V.duration(os.path.join(SOUNDS_DIR, f)), 2)}
    vj = os.path.join(V.AUDIO, 'voice.json')
    manifest = V.load(vj, {'v': 2, 'decks': {}})
    manifest['decks']['reads'] = {'voice': 'Kore', 'model': 'gemini-3.8-flash-tts', 'placeholder': False, 'clips': clips}
    V.dump(vj, manifest)
    print(len(clips), "clips in audio/rd and the 'reads' deck of audio/voice.json")


# ---------- built-in single sounds (her choice, 20 Oct 2026: no recording needed; Mama may still record her own) ----------
SOUNDS_DIR = os.path.join(WORK, 'sounds', 'final')


def _env(x):
    h = int(0.01 * V.SR)
    return np.array([np.sqrt(np.mean(x[i:i + h] ** 2)) for i in range(0, len(x) - h, h)]), h


def _fade(y, a, b):
    y = y.copy(); na, nb = max(1, int(a * V.SR)), max(1, int(b * V.SR))
    y[:na] *= np.linspace(0, 1, na); y[-nb:] *= np.linspace(1, 0, nb)
    return y


def _norm(y):
    y = y / (np.abs(y).max() + 1e-9) * 0.85
    return np.concatenate([np.zeros(int(0.04 * V.SR), np.float32), y.astype(np.float32), np.zeros(int(0.06 * V.SR), np.float32)])


def cmd_sounds(a):
    os.makedirs(SOUNDS_DIR, exist_ok=True)
    SR = V.SR
    x = V.read_wav(os.path.join(WORK, '3.8flashtts-at-clean.wav')); e, h = _env(x); top = e.max()
    on = int(np.argmax(e > 0.25 * top)); off = on
    while off < len(e) and e[off] > 0.25 * top: off += 1
    held = _fade(x[on * h:off * h], 0.01, 0.08)                        # /a/ held: the vowel of "aaat"
    V.write_wav(os.path.join(SOUNDS_DIR, 'a.wav'), _norm(held))
    V.write_wav(os.path.join(SOUNDS_DIR, 'a-short.wav'), _norm(_fade(held[:int(0.4 * SR)], 0.01, 0.1)))
    last = len(e) - 1
    while last > 0 and e[last] < 0.08 * top: last -= 1
    st = last
    while st > 0 and e[st - 1] >= 0.08 * top: st -= 1
    V.write_wav(os.path.join(SOUNDS_DIR, 't.wav'), _norm(_fade(x[max(0, st - 1) * h:(last + 2) * h], 0.002, 0.03)))   # /t/: the release of "aaat"
    x = V.read_wav(os.path.join(WORDS_DIR, 'raw-key.wav')); e, h = _env(x); top = e.max()
    on = int(np.argmax(e > 0.06 * top))
    z = np.array([np.mean(np.abs(np.diff(np.sign(x[i:i + h]))) > 0) for i in range(0, len(x) - h, h)])
    endf = on
    while endf < len(e) and endf < on + 14 and not (z[endf] < 0.2 and e[endf] > 0.35 * top): endf += 1
    V.write_wav(os.path.join(SOUNDS_DIR, 'k.wav'), _norm(_fade(x[on * h:max(endf, on + 4) * h], 0.002, 0.02)))   # /k/: the burst of "key"
    x = V.read_wav(os.path.join(WORK, '3.8flashtts-ab-clean.wav')); e, h = _env(x); top = e.max()
    last = len(e) - 1
    while last > 0 and e[last] < 0.03 * top: last -= 1
    V.write_wav(os.path.join(SOUNDS_DIR, 'b.wav'), _norm(_fade(x[max(0, (last + 1) * h - int(0.09 * SR)):(last + 1) * h], 0.01, 0.012)))   # /b/: lips closed and the release, the end of "aaab"
    for f in sorted(os.listdir(SOUNDS_DIR)):
        print(f, f'{V.duration(os.path.join(SOUNDS_DIR, f)):.2f} s')


# ---------- Phase 2: words and lines from needs.json, in lesson order ----------
def synth_once(client, text, deck, tries=3):
    """One TTS take with a time limit on every attempt. The interactions API hangs (no error) once the day's quota is
    gone, so a second time-out in a row is taken as the quota (20 Oct 2026: generate_content then answered 429)."""
    cfg, outs = V.DECKS[deck], 0
    for attempt in range(tries):
        alarm(150)
        try:
            it = client.interactions.create(
                model='gemini-3.8-flash-tts',
                input=[{'type': 'user_input', 'content': [{'type': 'text', 'text': text, 'annotations': [{'type': 'speech_metadata', 'style': cfg['style']}]}]}],
                response_format={'type': 'audio'}, generation_config={'speech_config': [{'voice': cfg['voice']}]})
            signal.alarm(0)
            data = it.output_audio.data
            return base64.b64decode(data) if isinstance(data, str) else data
        except TimeoutError:
            outs += 1
            if outs >= 2:
                raise V.QuotaUsedUp('no answer twice: the daily quota is probably used up')
        except Exception as e:
            signal.alarm(0)
            if V.is_daily_quota(str(e)) or 'RESOURCE_EXHAUSTED' in str(e):
                raise V.QuotaUsedUp(str(e))
            print(f'  TTS attempt {attempt + 1} failed ({type(e).__name__}); retrying', file=sys.stderr); time.sleep(20)
        finally:
            signal.alarm(0)
    raise RuntimeError('TTS failed')


def _record_batches(todo, plan, path_dir, deck, size, say):
    from google import genai
    V.MODEL = 'gemini-3.8-flash-tts'
    client = genai.Client(api_key=V.api_key())
    n = max([int(k[1:]) for k in plan['batches']] + [0])
    for i in range(0, len(todo), size):
        chunk = todo[i:i + size]
        n += 1; bid = f'b{n:02d}'
        try:
            raw = synth_once(client, '\n<long pause>\n'.join(say(x) for x in chunk), deck)
        except V.QuotaUsedUp:
            V.dump(plan['_path'], {k: v for k, v in plan.items() if k != '_path'}); V.finish(11, 'daily quota used up for gemini-3.8-flash-tts')
        wav = os.path.join(path_dir, 'batches', f'{bid}.wav'); V.save_take(raw, wav)
        plan['batches'][bid] = {'ids': [x['id'] for x in chunk], 'texts': [x['text'] for x in chunk], 'recorded': time.strftime('%Y-%m-%d %H:%M')}
        V.dump(plan['_path'], {k: v for k, v in plan.items() if k != '_path'})
        print(f'{bid}: {len(chunk)} lines, {V.duration(wav):.1f} s', flush=True)
        time.sleep(6)


def cmd_rec(a):
    needs = [x for x in V.load(NEEDS, []) if x['lesson'] <= a.upto and x['kind'] == ('word' if a.what == 'words' else 'line')]
    reading = {w for w, d in json.load(open(os.path.join(V.ROOT, 'reads.json'), encoding='utf-8'))['words'].items() if not d.get('sight')}
    if a.what == 'words':
        path_dir, plan_path, deck, size = WORDS_DIR, WPLAN, 'readsw', 22
        say = lambda x: SAY.get(x['text'], x['text']) + '.'
    else:
        path_dir, plan_path, deck, size = LINES_DIR, LPLAN, 'readsx', 14
        say = lambda x: x['text']
    os.makedirs(os.path.join(path_dir, 'batches'), exist_ok=True)
    plan = V.load(plan_path, {'batches': {}, 'clips': {}}); plan['_path'] = plan_path
    key = (lambda x: x['id'][2:]) if a.what == 'words' else (lambda x: x['id'])
    have = {k for k, c in plan['clips'].items() if c.get('ok')} | {i for b in plan['batches'].values() if not b.get('split') for i in b['ids']}
    todo = [x for x in needs if key(x) not in have and x['id'] not in have]
    if a.redo:
        todo = [x for x in needs if key(x) in a.redo.split(',') or x['id'] in a.redo.split(',')]
    todo = todo[:a.max * size] if a.max else todo
    if todo and not a.split_only:
        print(len(todo), a.what, 'to record', flush=True)
        _record_batches(todo, plan, path_dir, deck, size, say)
    ear = V.Ear()
    for bid, b in sorted(plan['batches'].items()):
        if b.get('split'):
            continue
        x = V.read_wav(os.path.join(path_dir, 'batches', f'{bid}.wav'))
        ps = MV.pieces(x, len(b['ids']))
        if not ps:
            print(f'{bid}: could not cut into {len(b["ids"])} pieces; they are recorded again next time'); b['split'] = True; continue
        for cid, text, p in zip(b['ids'], b['texts'], ps):
            k = cid[2:] if a.what == 'words' else cid
            if a.what == 'words':
                V.write_wav(os.path.join(path_dir, f'raw-{k}.wav'), p)
                p = crisp(p, k, gentle=True) if k in reading and k not in SAY and k[-1] not in 'dg' else p   # the trim made MUD sound like 'much'
                out = os.path.join(path_dir, f'w-{k}.wav')
            else:
                out = os.path.join(path_dir, f'{k}.wav')
            V.write_wav(out, p)
            heard = ear.hear(out); got = V.norm(heard)
            ok = got == V.norm(text) or got in HEARD_OK.get(text, set())
            plan['clips'][k] = {'batch': bid, 'seconds': round(len(p) / V.SR, 2), 'heard': heard, 'ok': ok, 'text': text}
            print(f'  {k:12} {len(p) / V.SR:4.2f} s  {"ok" if ok else "MISS"}  heard: {heard}', flush=True)
        b['split'] = True
        V.dump(plan_path, {k: v for k, v in plan.items() if k != '_path'})
    bad = [k for k, c in plan['clips'].items() if not c.get('ok')]
    print(len(plan['clips']) - len(bad), 'ok;', len(bad), 'to redo:', ','.join(bad))
    V.finish(0, a.what + ' recorded')


# the built-in sounds for lessons 9-24: one stretchy take, each sound cut where it is clean
SOUND_TAKE = [('u', 'uuup'), ('o', 'ooon'), ('i', 'iiit'), ('f', 'fffan'), ('r', 'rrrun'), ('e', 'eeegg'), ('d', 'saaad'),
              ('g', 'baaag'), ('n', 'nnnet'), ('m', 'mmmom')]


def cmd_sounds2(a):
    os.makedirs(SOUNDS_DIR, exist_ok=True)
    take = os.path.join(WORK, 'sounds', 'take2.wav')
    if not os.path.exists(take):
        from google import genai
        V.MODEL = 'gemini-3.8-flash-tts'
        client = genai.Client(api_key=V.api_key())
        alarm(240)
        try:
            raw = V.synth_gemini(client, '\n<long pause>\n'.join(t + '.' for _, t in SOUND_TAKE), 'reads')
        except V.QuotaUsedUp:
            V.finish(11, 'daily quota used up for gemini-3.8-flash-tts')
        finally:
            signal.alarm(0)
        V.save_take(raw, take)
    x = V.read_wav(take); ps = MV.pieces(x, len(SOUND_TAKE))
    if not ps:
        V.finish(1, 'could not cut the sound take')
    for (sid, text), p in zip(SOUND_TAKE, ps):
        V.write_wav(os.path.join(WORK, 'sounds', f'src-{sid}-{text}.wav'), p)
    print('take cut into', len(ps), 'pieces')


if __name__ == '__main__':
    p = argparse.ArgumentParser(); sub = p.add_subparsers(dest='cmd', required=True)
    t = sub.add_parser('test'); t.add_argument('--model', default='gemini-3.8-flash-tts')
    sub.add_parser('compare')
    w = sub.add_parser('words'); w.add_argument('--max', type=int, default=0); w.add_argument('--only', default='')
    sub.add_parser('build'); sub.add_parser('sounds'); sub.add_parser('sounds2')
    r = sub.add_parser('rec'); r.add_argument('what', choices=['words', 'lines']); r.add_argument('--upto', type=int, default=24)
    r.add_argument('--max', type=int, default=0); r.add_argument('--redo', default='')
    r.add_argument('--split-only', action='store_true', help='cut and check takes already recorded; no TTS calls')
    a = p.parse_args()
    {'test': cmd_test, 'compare': cmd_compare, 'words': cmd_words, 'build': cmd_build, 'sounds': cmd_sounds, 'sounds2': cmd_sounds2, 'rec': cmd_rec}[a.cmd](a)
