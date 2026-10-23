"""هيا نتعلم في الجزائر read aloud: the same Arabic voice and method as علبة الفضول (scripts/curiosity_voice.py, Aoede):
lines recorded with Gemini TTS in batches, each take cut at its pauses into one clip per line, every clip checked by
transcription, then published as audio/dz/<id>.m4a and a 'dz' deck in audio/voice.json (the service worker caches them).

  python scripts/algeria_voice.py lines                     the lines and the batch plan (no API calls)
  python scripts/algeria_voice.py record [--max N] [--model M]
  python scripts/algeria_voice.py split | verify [--redo] | build

What is read: the app's prompts (their Arabic is taken from algeria.js, so the words on screen and the words heard are the
same) and every line listed in algeria.json (postcards, cards, model descriptions, rules, sentences, words, numbers).
Run it with the venv that has google-genai: ~/Downloads/06_Projects_and_Code/maria-tenses/.venv/bin/python -u
"""
import json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import curiosity_voice as CV
import voice as V

ROOT = V.ROOT
CV.WORK = os.path.join(V.WORK, 'algeria')
CV.PLAN = os.path.join(CV.WORK, 'plan.json')
OUT = os.path.join(V.AUDIO, 'dz')
CV.STYLE = ('a warm, kind woman teacher speaking clear Modern Standard Arabic to an eight-year-old girl; natural and human, '
            'gentle and encouraging, at an easy pace, each line said once')
# the prompts she hears (keys of the L block in algeria.js); the app plays them as u-<key>
UI = ['readPost', 'warm', 'watch', 'yourTurn', 'alone', 'think', 'okToday', 'okDone', 'notYet', 'pickWords',
      'pickNum', 'pickDigit', 'findJar', 'fillJar', 'pickEnd', 'model', 'easy', 'stamp', 'end']


def ui_lines():
    js = open(os.path.join(ROOT, 'algeria.js'), encoding='utf-8').read()
    block = js[js.index('const L = {'):js.index('};', js.index('const L = {'))]
    found = dict(re.findall(r"(\w+): '([^']*)'", block))
    return [(f'u-{k}', found[k]) for k in UI]


def lines():
    D = json.load(open(os.path.join(ROOT, 'algeria.json'), encoding='utf-8'))
    out = ui_lines() + [(i, t) for i, t in D['lines']]
    return [(i, CV.clean(t)) for i, t in out]


CV.lines = lines


def cmd_build(a):
    plan = V.load(CV.PLAN, {'batches': {}, 'clips': {}})
    os.makedirs(OUT, exist_ok=True)
    want = dict(lines()); clips = {}
    for i, c in sorted(plan['clips'].items()):
        if not c.get('ok') or i not in want:
            continue
        dst = os.path.join(OUT, f'{i}.m4a')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(CV.WORK, 'clips', f'{i}.wav'),
                        '-ac', '1', '-c:a', 'aac', '-b:a', '48k', dst], check=True)
        clips[i] = {'f': f'dz/{i}.m4a', 'd': c['seconds']}
    vj = os.path.join(V.AUDIO, 'voice.json')
    manifest = V.load(vj, {'v': 2, 'decks': {}})
    manifest['decks']['dz'] = {'voice': CV.VOICE, 'model': 'gemini TTS', 'placeholder': False, 'clips': clips}
    V.dump(vj, manifest)
    print(len(clips), 'of', len(want), 'clips in audio/dz and the dz deck of audio/voice.json')


if __name__ == '__main__':
    import argparse
    p = argparse.ArgumentParser(); sub = p.add_subparsers(dest='cmd', required=True)
    sub.add_parser('lines')
    r = sub.add_parser('record'); r.add_argument('--max', type=int, default=0); r.add_argument('--model', default='gemini-3.8-flash-tts')
    sp = sub.add_parser('split'); sp.add_argument('--again', nargs='*')
    v = sub.add_parser('verify'); v.add_argument('--redo', action='store_true'); v.add_argument('--all', action='store_true')
    v.add_argument('--max', type=int, default=0); v.add_argument('--model', default='gemini-3.8-flash-tts')
    sub.add_parser('build')
    a = p.parse_args()
    {'lines': CV.cmd_lines, 'record': CV.cmd_record, 'split': CV.cmd_split, 'verify': CV.cmd_verify, 'build': cmd_build}[a.cmd](a)
