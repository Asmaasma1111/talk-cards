"""كرّاس الإملاء read aloud: the same Gemini TTS method as علبة الفضول (scripts/curiosity_voice.py) and جدول الضرب.
  python scripts/dictation_voice.py lines        how many lines and TTS requests (no API calls)
  python scripts/dictation_voice.py samples      the 3 voice samples, each reading the same sentence, for Mama to choose
                                                 (voice-work/dictation/samples/<voice>.m4a, then a transcript check)
The lines come from dictation/audio/lines.json (built by scripts/build_dictation.js); prompt and praise lines carry a
'tts' text with full tashkeel, every other line is the content's own fully vowelled text. Nothing is recorded for the
app until Mama has chosen a voice and approved dictation/audio/lines.md: the record, split, verify and build commands
are added after that.
Run it with the venv that has google-genai: ~/Downloads/06_Projects_and_Code/maria-tenses/.venv/bin/python -u
Exit codes: 0 done, 10 GEMINI_API_KEY missing, 11 daily TTS quota used up, 1 error.
"""
import argparse, base64, json, os, re, signal, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import voice as V

ROOT = V.ROOT
WORK = os.path.join(V.WORK, 'dictation')
SAMPLES = os.path.join(WORK, 'samples')
LINES = os.path.join(ROOT, 'dictation', 'audio', 'lines.json')
SAMPLE = 'اِسْمَعِي جَيِّدًا، ثُمَّ اكْتُبِي: الشَّمْسُ سَاطِعَةٌ.'
# three warm female voices: Aoede already speaks in Maria's times tables and علبة الفضول; Sulafat (warm), Achernar (soft)
VOICES = ['Aoede', 'Sulafat', 'Achernar']
MODELS = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts']          # each has its own 10 a day
STYLE = ('a warm, kind woman teacher reading a dictation in clear Modern Standard Arabic to an eight-year-old girl; '
         'natural and human, calm and encouraging, a little slower than normal speech, every vowel clear, said once')
VOICE = 'Sulafat'   # chosen by Asma on 7 Nov 2026 from the three samples
BATCH = 21
CHECK_MODEL = 'gemini-3.5-flash-lite'


def lines():
    return [(l['id'], l.get('tts') or l['text']) for l in json.load(open(LINES, encoding='utf-8')) if l['text'] not in ('انتهيت', 'لا شيء')]


def cmd_lines(a):
    ls = lines()
    for i, t in ls:
        print(i, '|', t)
    print(len(ls), 'lines,', (len(ls) + BATCH - 1) // BATCH, 'TTS requests')


class Hang(Exception):
    pass


def synth(client, text, voice, model):
    """One take through the interactions API: the style travels in its own field and is never read aloud."""
    def alarm(*_):
        raise Hang()
    signal.signal(signal.SIGALRM, alarm)
    for attempt in range(3):
        signal.alarm(120)
        try:
            it = client.interactions.create(
                model=model,
                input=[{'type': 'user_input', 'content': [{'type': 'text', 'text': text, 'annotations': [{'type': 'speech_metadata', 'style': STYLE}]}]}],
                response_format={'type': 'audio'}, generation_config={'speech_config': [{'voice': voice}]})
            data = it.output_audio.data
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
            wait = float(m.group(1)) + 2 if m else 15 * (attempt + 1)
            print(f'  TTS attempt {attempt + 1} failed ({type(e).__name__}); retrying in {wait:.0f}s', flush=True)
            time.sleep(wait)
        finally:
            signal.alarm(0)
    raise RuntimeError('TTS failed 3 times')


def transcribe(client, path):
    from google.genai import types as T
    r = client.models.generate_content(model=CHECK_MODEL, contents=[
        T.Part.from_bytes(data=open(path, 'rb').read(), mime_type='audio/wav'),
        'Transcribe this short Arabic clip verbatim, exactly as spoken, with full tashkeel. Write only the words you hear.'])
    return (r.text or '').strip()


def cmd_samples(a):
    from google import genai
    client = genai.Client(api_key=V.api_key())
    os.makedirs(SAMPLES, exist_ok=True)
    done = {}
    for voice in VOICES:
        m4a = os.path.join(SAMPLES, f'{voice}.m4a')
        if os.path.exists(m4a) and not a.redo:
            print(f'{voice}: already made'); done[voice] = m4a; continue
        raw = None
        for model in MODELS:
            try:
                raw = synth(client, SAMPLE, voice, model); break
            except V.QuotaUsedUp:
                print(f'  {model}: daily quota used up; trying the next model', flush=True)
            except RuntimeError:
                print(f'  {model}: no answer; trying the next model', flush=True)
        if raw is None:
            V.finish(11, 'daily TTS quota used up on every model', made=list(done))
        wav = os.path.join(SAMPLES, f'{voice}.wav')
        V.save_take(raw, wav)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'aac', '-b:a', '64k', m4a], check=True)
        heard = ''
        try:
            heard = transcribe(client, wav)
        except Exception as e:
            heard = f'(transcript check failed: {type(e).__name__})'
        print(f'{voice} ({model}): {V.duration(wav):.1f} s · heard: {heard}', flush=True)
        done[voice] = m4a
        time.sleep(3)
    V.finish(0, 'samples made', samples=done)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('cmd', choices=['lines', 'samples'])
    p.add_argument('--redo', action='store_true')
    a = p.parse_args()
    try:
        {'lines': cmd_lines, 'samples': cmd_samples}[a.cmd](a)
    except SystemExit:
        raise
    except Exception as e:
        V.finish(1, f'{type(e).__name__}: {e}')


if __name__ == '__main__':
    main()
