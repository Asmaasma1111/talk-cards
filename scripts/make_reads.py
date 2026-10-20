"""python3 scripts/make_reads.py   writes reads.json: Maria Reads content (Phase 1 = lessons 1-8 in full, the rest as path labels only).
Every word and sentence here is our own; the book only gives the lesson order and method."""
import json, os
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'reads.json')

LABELS = ['A', 'B', 'AB', 'C', 'T', 'AT', 'TAB', '★', 'U', 'S', 'P', 'THE', 'O', 'H', 'N', '★', 'G', 'D', 'I', 'F', 'R', 'M', 'E',
          'J K', 'Aa', 'l', 'x', 'y', 'qu', 'w', 'v', 'z', 'th', 'ar', 'sh', 'ee', 'ea', 'er', 'ir', 'ur', 'ng', 'ch', 'ow', 'ou', 'or',
          'th', 'oo', 'ew', 'ai', 'ay', 'oi', 'oy', 'aw', 'au', 'a_e', 'e_e', 'i_e', 'o_e', 'u_e', 'ce', 'igh', 'oa', 'ow', 'ol', 'ph']
TITLES = ['A', 'B', 'AB, BA', 'C', 'T', 'AT, BAT, CAT', 'BAT, TAB', 'Review', 'U', 'S', 'P', 'THE', 'O', 'H', 'N', 'Review', 'G', 'D',
          'I', 'F', 'R', 'M', 'E', 'J, K', 'Capital and small letters', 'L', 'X', 'Y', 'QU', 'W, WH', 'V', 'Z', 'th (this)', 'ar', 'sh',
          'ee', 'ea', 'er', 'ir', 'ur', 'ng', 'ch, tch', 'ow (cow)', 'ou', 'or, ore', 'th (thin)', 'oo', 'ew', 'ai', 'ay', 'oi', 'oy',
          'aw', 'au', 'a_e', 'e_e', 'i_e', 'o_e', 'u_e', 'soft c', 'igh', 'oa', 'ow (snow)', 'ol', 'ph']
assert len(LABELS) == len(TITLES) == 65

# Mama's recordings, in lesson order (the spec's list). kind: hold = continuous (record ~2 s, the app cuts a short one), short = say it once
CONT = 'Hold it for about 2 seconds, smooth and steady.'
STOP = 'Short and crisp, with no vowel after it.'
SOUNDS = [
    ('a', '/a/', 'A', 'apple', 'hold', 1, 'The a in apple, mouth open. ' + CONT),
    ('b', '/b/', 'B', 'bat', 'short', 2, STOP + ' Say /b/, not "buh".'),
    ('k', '/k/', 'C K', 'cat', 'short', 4, 'One sound for C and K. ' + STOP),
    ('t', '/t/', 'T', 'top', 'short', 5, STOP + ' Just air, no voice: /t/, not "tuh".'),
    ('u', '/u/', 'U', 'up', 'hold', 9, 'The u in up. ' + CONT),
    ('s', '/s/', 'S', 'sun', 'hold', 10, 'A snake sound. ' + CONT),
    ('p', '/p/', 'P', 'pot', 'short', 11, STOP + ' A puff of air: /p/, not "puh".'),
    ('o', '/o/', 'O', 'hot', 'hold', 13, 'American o, like "awe" in hot. ' + CONT),
    ('h', '/h/', 'H', 'hat', 'short', 14, 'Just a soft breath out, short.'),
    ('n', '/n/', 'N', 'net', 'hold', 15, CONT),
    ('g', '/g/', 'G', 'go', 'short', 17, STOP + ' /g/, not "guh".'),
    ('d', '/d/', 'D', 'dog', 'short', 18, STOP + ' /d/, not "duh".'),
    ('i', '/i/', 'I', 'it', 'hold', 19, 'The i in it. ' + CONT),
    ('f', '/f/', 'F', 'fan', 'hold', 20, 'Top teeth on the bottom lip. ' + CONT),
    ('r', '/r/', 'R', 'run', 'hold', 21, 'A growl, no vowel before it. ' + CONT),
    ('m', '/m/', 'M', 'map', 'hold', 22, 'Lips closed, a hum. ' + CONT),
    ('e', '/e/', 'E', 'egg', 'hold', 23, 'The e in egg. ' + CONT),
    ('j', '/j/', 'J', 'jam', 'short', 24, STOP + ' /j/, not "juh".'),
    ('l', '/l/', 'L', 'leg', 'hold', 26, CONT),
    ('x', '/ks/', 'X', 'box', 'short', 27, 'Quick /ks/, as at the end of box.'),
    ('ee', '/ee/', 'Y EE EA', 'funny', 'hold', 28, 'The y at the end of funny (also used for ee and ea later). ' + CONT),
    ('igh', '/igh/', 'Y IGH', 'fly', 'hold', 28, 'The y in fly (also used for igh and i_e later). ' + CONT),
    ('qu', '/koo/', 'QU', 'quick', 'short', 29, 'A quick /koo/.'),
    ('w', '/woo/', 'W WH', 'win', 'short', 30, 'A quick /woo/.'),
    ('v', '/v/', 'V', 'van', 'hold', 31, 'Like /f/ but with voice. ' + CONT),
    ('z', '/z/', 'Z', 'zip', 'hold', 32, 'A buzzing bee. ' + CONT),
    ('dh', 'voiced /th/', 'TH', 'this', 'hold', 33, 'Tongue between the teeth, with voice. ' + CONT),
    ('ar', '/ar/', 'AR', 'car', 'hold', 34, CONT),
    ('sh', '/sh/', 'SH', 'ship', 'hold', 35, 'Finger on the lips: shh. ' + CONT),
    ('er', '/er/', 'ER IR UR', 'her', 'hold', 38, CONT),
    ('ang', '/ang/', 'ANG', 'bang', 'short', 41, 'Say it as one chunk.'),
    ('ing', '/ing/', 'ING', 'sing', 'short', 41, 'Say it as one chunk.'),
    ('ong', '/ong/', 'ONG', 'long', 'short', 41, 'Say it as one chunk.'),
    ('ung', '/ung/', 'UNG', 'hung', 'short', 41, 'Say it as one chunk.'),
    ('ch', '/ch/', 'CH TCH', 'chop', 'short', 42, STOP + ' /ch/, not "chuh".'),
    ('ow', '/ow/', 'OW OU', 'cow', 'hold', 43, 'As if something hurts: ow. ' + CONT),
    ('or', '/or/', 'OR ORE', 'for', 'hold', 45, CONT),
    ('th', 'unvoiced /th/', 'TH', 'thin', 'hold', 46, 'Tongue between the teeth, only air. ' + CONT),
    ('ooh', 'short /oo/', 'OO', 'book', 'short', 47, 'The oo in book, short.'),
    ('oo', 'long /oo/', 'OO EW', 'moon', 'hold', 47, 'The oo in moon. ' + CONT),
    ('yoo', '/yoo/', 'EW U_E', 'few', 'hold', 48, 'The ew in few. ' + CONT),
    ('ay', '/ay/', 'AI AY A_E', 'rain', 'hold', 49, CONT),
    ('oy', '/oy/', 'OI OY', 'oil', 'hold', 51, CONT),
    ('aw', '/aw/', 'AW AU', 'saw', 'hold', 53, CONT),
    ('oh', '/oh/', 'OA OW O_E', 'boat', 'hold', 58, CONT),
    ('ol', '/ol/', 'OL', 'old', 'hold', 64, CONT),
]
sounds = [{'id': i, 'say': s, 'g': g, 'ex': ex, 'kind': k, 'lesson': l, 'tip': tip} for i, s, g, ex, k, l, tip in SOUNDS]

# words: pic = shown only after she swipes; sound = a pretend word for blending, sparkles and no picture
WORDS = {
    'ab': {'sound': True}, 'ba': {'sound': True}, 'tab': {'sound': True}, 'at': {},
    'cab': {'pic': 'assets/reads/pics/cab.webp', 'e': '🚕'}, 'bat': {'pic': 'assets/reads/pics/bat.webp', 'e': '🦇'},
    'cat': {'pic': 'assets/reads/pics/cat.webp', 'e': '🐱'}, 'act': {'pic': 'assets/reads/pics/act.webp', 'e': '🎭'},
}
# what each letter of a word says (left to right): one entry per tile
SPELL = {'ab': ['a', 'b'], 'ba': ['b', 'a'], 'cab': ['k', 'a', 'b'], 'at': ['a', 't'], 'bat': ['b', 'a', 't'], 'cat': ['k', 'a', 't'],
         'act': ['a', 'k', 't'], 'tab': ['t', 'a', 'b']}
for w, d in WORDS.items():
    d['tiles'] = list(w.upper()); d['says'] = SPELL[w]

# ear games: words she only hears (an emoji shows after she answers)
E = {'apple': '🍎', 'ant': '🐜', 'alligator': '🐊', 'astronaut': '🧑‍🚀', 'cat': '🐱', 'map': '🗺️', 'hat': '👒', 'cap': '🧢', 'sad': '😢',
     'bat': '🦇', 'sun': '☀️', 'dog': '🐶', 'pen': '🖊️', 'bus': '🚌', 'cup': '🥤', 'fish': '🐟', 'egg': '🥚', 'moon': '🌙', 'bed': '🛏️',
     'ball': '⚽', 'bee': '🐝', 'rabbit': '🐰', 'robot': '🤖', 'zebra': '🦓', 'tub': '🛁', 'crab': '🦀', 'web': '🕸️', 'cab': '🚕',
     'kite': '🪁', 'car': '🚗', 'key': '🔑', 'rocket': '🚀', 'bucket': '🪣', 'monkey': '🐒', 'duck': '🦆', 'book': '📖', 'sock': '🧦',
     'clock': '⏰', 'tea': '🍵', 'ten': '🔟', 'toy': '🧸', 'tent': '⛺', 'tiger': '🐯', 'hotel': '🏨', 'guitar': '🎸', 'boat': '⛵',
     'net': '🥅', 'foot': '🦶'}
EAR = {
    'a': {'beg': ['apple', 'ant', 'alligator', 'astronaut'], 'mid': ['cat', 'map', 'hat', 'cap', 'sad', 'bat'], 'end': [],
          'no': ['sun', 'dog', 'pen', 'bus', 'cup', 'fish', 'egg', 'moon', 'bed']},
    'b': {'beg': ['bat', 'bus', 'ball', 'bed', 'bee'], 'mid': ['rabbit', 'robot', 'zebra'], 'end': ['tub', 'crab', 'web', 'cab'],
          'no': ['sun', 'fish', 'moon', 'cat', 'dog', 'cup', 'pen', 'egg']},
    'k': {'beg': ['cat', 'cup', 'kite', 'car', 'key'], 'mid': ['rocket', 'bucket', 'monkey'], 'end': ['duck', 'book', 'sock', 'clock'],
          'no': ['sun', 'fish', 'moon', 'bed', 'ball', 'pen', 'egg', 'web']},
    't': {'beg': ['tea', 'ten', 'toy', 'tent', 'tiger'], 'mid': ['hotel', 'guitar'], 'end': ['cat', 'hat', 'boat', 'net', 'foot'],
          'no': ['sun', 'fish', 'moon', 'ball', 'dog', 'cup', 'bus', 'egg']},
}
for s, d in EAR.items():
    for k in ('beg', 'mid', 'end', 'no'):
        for w in d[k]:
            assert w in E, w

# the lesson routine, beat by beat (Phase 1). flash = review cards of letters she knows; newsound = hear it, trace it;
# hear = ear game "is the sound in this word?"; where = beginning, middle or end; read = point and swipe;
# swap = add or swap a letter tile; me = record herself next to the model voice
L = [
    {'n': 1, 'new': ['a'], 'beats': [['newsound', 'a'], ['hear', 'a'], ['where', 'a'], ['me', 'sound:a']]},
    {'n': 2, 'new': ['b'], 'beats': [['flash'], ['newsound', 'b'], ['hear', 'b'], ['where', 'b'], ['me', 'sound:b']]},
    {'n': 3, 'new': [], 'words': ['ab', 'ba'], 'beats': [['flash'], ['read', 'ab', 'ba', 'ab', 'ba'], ['me', 'word:ab']]},
    {'n': 4, 'new': ['k'], 'words': ['ab', 'cab', 'ba'], 'beats': [['flash'], ['newsound', 'k'], ['hear', 'k'], ['read', 'ab', 'cab', 'ba', 'cab'], ['me', 'word:cab']]},
    {'n': 5, 'new': ['t'], 'words': ['ab', 'cab'], 'beats': [['flash'], ['newsound', 't'], ['hear', 't'], ['where', 't'], ['read', 'ab', 'cab']]},
    {'n': 6, 'new': [], 'words': ['at', 'bat', 'cat', 'act'], 'beats': [['flash'], ['read', 'at', 'bat', 'cat', 'act'], ['swap', 'at>bat', 'at>cat'], ['read', 'cat', 'at', 'bat'], ['me', 'word:cat']]},
    {'n': 7, 'new': [], 'words': ['bat', 'tab'], 'beats': [['flash'], ['read', 'bat', 'tab', 'bat', 'tab'], ['swap', 'cat>bat', 'cab>tab'], ['read', 'cat', 'cab', 'at'], ['me', 'word:tab']]},
    {'n': 8, 'new': [], 'words': ['at', 'bat', 'cat', 'ab', 'cab', 'tab'], 'beats': [['flash'], ['read', 'at', 'bat', 'cat', 'ab', 'cab', 'tab'], ['swap', 'ab>cab', 'cab>tab', 'cab>cat'], ['hear', 't'], ['me', 'word:bat']]},
]
lessons = []
for i in range(65):
    d = {'n': i + 1, 'label': LABELS[i], 'title': TITLES[i], 'stage': 1 if i < 32 else 2, 'case': 'upper' if i < 24 else 'lower'}
    if i < len(L):
        d.update(L[i]); d['ready'] = True
    lessons.append(d)

data = {
    'v': 1,
    'note': 'Maria Reads: our own words, following the lesson order of Children Learning Reading. Phase 1 = lessons 1-8.',
    'timer': [[1, 6, 3], [7, 19, 5], [20, 65, 7]], 'cap': 10,
    'placement': {'words': ['MAP', 'SUN', 'DOG', 'BED', 'PIN'], 'letters': list('ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
                  'letterSound': {'A': 'a', 'B': 'b', 'C': 'k', 'D': 'd', 'E': 'e', 'F': 'f', 'G': 'g', 'H': 'h', 'I': 'i', 'J': 'j', 'K': 'k',
                                  'L': 'l', 'M': 'm', 'N': 'n', 'O': 'o', 'P': 'p', 'Q': 'qu', 'R': 'r', 'S': 's', 'T': 't', 'U': 'u', 'V': 'v',
                                  'W': 'w', 'X': 'x', 'Y': 'ee', 'Z': 'z'}},
    'sounds': sounds, 'words': WORDS, 'ear': EAR, 'emoji': E, 'lessons': lessons,
    'puzzles': [{'id': f'p0{i}', 'img': f'assets/reads/puzzles/p0{i}.webp'} for i in range(1, 5)],
    'puzzleRule': 'one piece per day of use (days 1-6), the last two on day 7: the finished puzzle is the big reward',
}
json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('wrote', OUT, len(lessons), 'lessons,', len(sounds), 'sounds,', len(E), 'ear words')
