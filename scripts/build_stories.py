"""Build stories.json for مكتبتي from the story files in content/stories/ (kept off GitHub).

Every Arabic word is copied exactly as written, tashkeel included: the parser only removes the markdown around it.
Run from the anki folder:  python3 scripts/build_stories.py
It prints a validation report and stops without writing if something is wrong.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'content', 'stories')
FILES = ['maria-stories-days-01-10.md', 'maria-stories-days-11-20.md', 'maria-stories-days-21-30.md']
OUT = os.path.join(ROOT, 'stories.json')
IMAGES = os.path.join(ROOT, 'assets', 'stories')

# value tags from section 3 of story-library-roadmap.md
TAGS = {1: ['assertive-dislike'], 2: ['body-signals'], 3: ['flexibility'], 4: ['clear-voice'], 5: ['problem-size'],
        6: ['patience'], 7: ['expectations'], 8: ['no-excuse'], 9: ['body-signals'], 10: ['baba'], 11: ['no-judging'],
        12: ['joining'], 13: ['newcomer-empathy'], 14: ['gift-ownership'], 15: ['assertive-dislike'], 16: ['baba'],
        17: ['jealousy'], 18: ['apology'], 19: ['clear-voice'], 20: ['retry'], 21: ['clear-voice', 'greeting-adults'],
        22: ['baba'], 23: ['assumptions'], 24: ['problem-size', 'teasing'], 25: ['sharing-lead'], 26: ['unappreciated-stop'],
        27: ['baba'], 28: ['problem-size', 'losing-well'], 29: ['comforting'], 30: ['baba', 'affection-choice']}

CONTINUES = '(تكمل القصّة)'
NOTE = re.compile(r'\s*\*\(([^)]*)\)\*\s*$')          # an English note in italics at the end of a line


def split_note(s):
    m = NOTE.search(s)
    return (s[:m.start()].rstrip(), m.group(1)) if m else (s.strip(), None)


def parse_story(day, title, body):
    lines = [l.rstrip() for l in body.split('\n')]
    st = {'id': f'd{day:02d}', 'day': day, 'shelf': (day - 1) // 10 + 1, 'stage': (day - 1) // 10 + 1, 'title': title,
          'skill_en': '', 'value_tags': TAGS.get(day, []), 'revisits': [], 'tool': None, 'pages': [], 'questions': [],
          'other_side': '', 'magic_sentence': '', 'feeling_word': '', 'mission': None,
          'unlocks_baba_message': False, 'locked_until_shelf_done': day == 30}
    q = None
    for l in lines:
        s = l.strip()
        if not s or s == '---':
            continue
        m = re.match(r'^\*\*Skill:\*\*\s*(.+?)\s*·\s*\*\*Tool:\*\*\s*(.+)$', s)
        if m:
            st['skill_en'] = m.group(1)
            tool, note = split_note(m.group(2))
            name, emoji = tool.rsplit(' ', 1)
            st['tool'] = {'name': name.strip(), 'emoji': emoji.strip()}
            if note:
                st['tool']['note'] = note
            continue
        m = re.match(r'^\*\*ص(\d+)\*\*\s*(.+)$', s)
        if m:
            q = None
            st['pages'].append({'n': int(m.group(1)), 'text': m.group(2).strip(), 'scene': ''})
            continue
        m = re.match(r'^\*Scene:\s*(.+?)\*$', s)
        if m:
            st['pages'][-1]['scene'] = m.group(1).strip()
            continue
        m = re.match(r'^\*\*❓\s*(.+?)\*\*\s*(.*)$', s)
        if m:
            q = {'after_page': st['pages'][-1]['n'], 'prompt': m.group(1).strip(), 'options': [], 'back_line': ''}
            rest = m.group(2).strip()
            if rest:
                q['note'] = split_note(rest)[1] or rest.strip('*() ')
            st['questions'].append(q)
            continue
        m = re.match(r'^-\s*\*\*(.+?)\*\*\s*←\s*(.+)$', s)
        if m and q is not None:
            res = m.group(2).strip()
            q['options'].append({'label': m.group(1).strip(), 'result': None if res == CONTINUES else res})
            continue
        m = re.match(r'^\*Back line(?:\s*\(([^)]*)\))?:\s*(.*?)\*$', s)
        if m and q is not None:
            q['back_line'] = m.group(2).strip()
            continue
        m = re.match(r'^\*\*🔄 من الجهة الأخرى:\*\*\s*(.+)$', s)
        if m:
            st['other_side'] = m.group(1).strip(); continue
        m = re.match(r'^\*\*✨ جملة سحرية:\*\*\s*(.+)$', s)
        if m:
            st['magic_sentence'] = m.group(1).strip(); continue
        m = re.match(r'^\*\*💬 كلمة الشعور:\*\*\s*(.+)$', s)
        if m:
            st['feeling_word'] = m.group(1).strip(); continue
        m = re.match(r'^\*\*🎯 مهمّة اليوم:\*\*\s*(.+)$', s)
        if m:
            text, note = split_note(m.group(1))
            st['mission'] = {'text': text, 'choices': []}
            if note:
                st['mission']['note'] = note
            continue
        m = re.match(r'^\*\*💌 Unlocks:\*\*\s*(.+)$', s)
        if m:
            st['unlocks_baba_message'] = 'رسالة من بابا' in m.group(1); continue
        raise SystemExit(f'Day {day}: line not understood: {s[:80]}')
    for qu in st['questions']:                       # opinion questions where every answer goes on with the story
        if all(o['result'] for o in qu['options']):
            qu['all_continue'] = True
    return st


def images_for(sid):
    d = os.path.join(IMAGES, sid)
    if not os.path.isdir(d):
        return []
    return sorted(f[:-5] for f in os.listdir(d) if f.endswith('.webp'))


def main():
    stories = []
    for fn in FILES:
        text = open(os.path.join(SRC, fn), encoding='utf-8').read()
        for m in re.finditer(r'^## Day (\d+): (.+)$', text, re.M):
            start = m.end()
            nxt = re.search(r'^## ', text[start:], re.M)
            body = text[start: start + nxt.start()] if nxt else text[start:]
            stories.append(parse_story(int(m.group(1)), m.group(2).strip(), body))
    for s in stories:
        s['images'] = images_for(s['id'])

    # validation report
    problems, opinion = [], []
    if [s['day'] for s in stories] != list(range(1, 31)):
        problems.append(f"days found: {[s['day'] for s in stories]}")
    for s in stories:
        d = s['day']
        if not s['tool'] or not s['mission'] or not all([s['other_side'], s['magic_sentence'], s['feeling_word']]):
            problems.append(f'Day {d}: an end page is missing')
        if [p['n'] for p in s['pages']] != list(range(1, len(s['pages']) + 1)):
            problems.append(f'Day {d}: page numbers out of order')
        if any(not p['scene'] for p in s['pages']):
            problems.append(f'Day {d}: a page has no scene note')
        want = 1 if s['stage'] == 1 else 2 if s['stage'] == 2 else 3
        if len(s['questions']) != want:
            problems.append(f"Day {d}: {len(s['questions'])} questions (stage {s['stage']} expects {want})")
        for i, q in enumerate(s['questions'], 1):
            if len(q['options']) != 3:
                problems.append(f'Day {d} q{i}: {len(q["options"])} options')
            cont = sum(o['result'] is None for o in q['options'])
            if q.get('all_continue'):
                opinion.append(f"Day {d} q{i} ({q['prompt']})")
            elif cont != 1:
                problems.append(f'Day {d} q{i}: {cont} continuing options')
    baba = [s['day'] for s in stories if s['unlocks_baba_message']]
    if baba != [10, 16, 22, 27, 30]:
        problems.append(f'Baba messages on days {baba}')

    print(f'Stories: {len(stories)} · pages: {sum(len(s["pages"]) for s in stories)} · questions: {sum(len(s["questions"]) for s in stories)}')
    for sh in (1, 2, 3):
        ss = [s for s in stories if s['shelf'] == sh]
        print(f'  Shelf {sh}: days {ss[0]["day"]}-{ss[-1]["day"]}, pages {min(len(s["pages"]) for s in ss)}-{max(len(s["pages"]) for s in ss)}, '
              f'{sum(len(s["questions"]) for s in ss)} questions, words {min(words(s) for s in ss)}-{max(words(s) for s in ss)}')
    print(f'Baba messages: days {", ".join(map(str, baba))}')
    print('Every question has exactly one option that goes on with the story, except these, where every answer goes on:')
    for o in opinion:
        print('  ' + o)
    print(f'Pictures found: {sum(len(s["images"]) for s in stories)}')
    if problems:
        print('PROBLEMS:'); [print('  ' + p) for p in problems]
        sys.exit(1)
    print('All checks passed.')
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump({'v': 1, 'shelves': [{'n': 1, 'days': [1, 10]}, {'n': 2, 'days': [11, 20]}, {'n': 3, 'days': [21, 30]}],
                   'stories': stories}, f, ensure_ascii=False, indent=1)
    print(f'Wrote {os.path.relpath(OUT, ROOT)}')


def words(s):
    t = ' '.join([p['text'] for p in s['pages']])
    return len(t.split())


if __name__ == '__main__':
    main()
