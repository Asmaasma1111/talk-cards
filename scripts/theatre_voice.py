"""مسرح المسائل read aloud with Gemini TTS (her request, 8 Nov 2026: "use Gemini to record the cases ... to sound more like a
human being"). The same voice and method as علبة الفضول and هيا نتعلم في الجزائر (Aoede): lines recorded in batches, each take
cut at its pauses into one clip per line, every clip checked by transcription (numbers compared as words, scripts/algeria_voice.py),
then published as theatre/audio/<id>.m4a with theatre/audio/voice.json, which the theatre's own voice reads (js/ui.js say()).

  python scripts/theatre_voice.py lines                     the lines and the batch plan (no API calls)
  python scripts/theatre_voice.py record [--max N] [--model M]   one TTS request per batch (free tier: 10 a day per model)
  python scripts/theatre_voice.py split | verify [--redo] | build

What is read, for every story (stages 1-3 and the twins first, then 4-6):
  <id>     the whole story, as on screen
  <id>:h   the story with every number said as «كذا» (scene 1, choosing the kind of story, before the numbers matter)
  <id>:a   the question and its answer, at the end («كم شخصًا في الحفل؟ ٣٦٣»)
Stage 1 (place value) has no kind scene and no ending line, so only <id>.
Run it with the venv that has google-genai: ~/Downloads/06_Projects_and_Code/maria-tenses/.venv/bin/python -u
Work files: voice-work/theatre/ (local). Exit codes: 0 done, 10 GEMINI_API_KEY missing, 11 daily TTS quota used up, 1 error.
"""
import json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import curiosity_voice as CV
import algeria_voice as AV          # (sets CV.close and CV.speakable to its number-aware versions)
import voice as V

ROOT = V.ROOT
CV.WORK = os.path.join(V.WORK, 'theatre')
CV.PLAN = os.path.join(CV.WORK, 'plan.json')
CV.BATCH = 8                        # whole stories are long: 8 to a take keeps the cuts reliable
OUT = os.path.join(ROOT, 'theatre', 'audio')
CV.STYLE = ('a warm, kind Saudi woman teacher telling a short maths story in clear Modern Standard Arabic to an eight-year-old girl; '
            'natural and human, lively and friendly, at an easy pace, every number said clearly, each line said once')
NUM = re.compile('[٠-٩]+')


def question(t):                    # the same as question() in theatre/js/story.js
    i = max(t.rfind('.', 0, len(t) - 1), t.rfind('،', 0, len(t) - 1))
    return t[i + 1:].strip()


def lines():
    D = json.load(open(os.path.join(ROOT, 'theatre', 'data', 'stories.json'), encoding='utf-8'))
    early = [s for s in D['stories'] if s['stage'] <= 3] + D['twins']
    late = [s for s in D['stories'] if s['stage'] > 3]
    out = []
    for s in early + late:
        out.append((s['id'], s['text']))
        if not s.get('shape', '').startswith('pv'):
            out.append((s['id'] + ':h', NUM.sub('كذا', s['text'])))
            out.append((s['id'] + ':a', question(s['text']) + ' ' + ''.join('٠١٢٣٤٥٦٧٨٩'[int(c)] for c in str(s['ans']))))
    return [(i, CV.clean(t)) for i, t in out]


CV.lines = lines


def fname(i):
    return i.replace(':', '_') + '.m4a'


def cmd_build(a):
    plan = V.load(CV.PLAN, {'batches': {}, 'clips': {}})
    os.makedirs(OUT, exist_ok=True)
    want = dict(lines()); clips = {}
    for i, c in sorted(plan['clips'].items()):
        if not c.get('ok') or i not in want:
            continue
        dst = os.path.join(OUT, fname(i))
        if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(os.path.join(CV.WORK, 'clips', f'{i}.wav')):
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(CV.WORK, 'clips', f'{i}.wav'),
                            '-ac', '1', '-c:a', 'aac', '-b:a', '48k', dst], check=True)
        clips[i] = fname(i)
    json.dump({'voice': CV.VOICE, 'model': 'gemini TTS', 'clips': clips}, open(os.path.join(OUT, 'voice.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=0)
    print(len(clips), 'of', len(want), 'clips in theatre/audio and theatre/audio/voice.json')


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
