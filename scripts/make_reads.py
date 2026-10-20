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

# ---------- words ----------
# pic = a picture shown only after she swipes; e = an emoji picture (the same rule); sound = a pretend word (sparkles);
# sight = a word she learns whole (one tile, no sounding out). Tiles: one letter each, except CK FF SS GG (one sound).
LETTER = {'A': 'a', 'B': 'b', 'C': 'k', 'D': 'd', 'E': 'e', 'F': 'f', 'G': 'g', 'H': 'h', 'I': 'i', 'J': 'j', 'K': 'k', 'M': 'm',
          'N': 'n', 'O': 'o', 'P': 'p', 'R': 'r', 'S': 's', 'T': 't', 'U': 'u'}
PAIRS = {'CK': 'k', 'FF': 'f', 'SS': 's', 'GG': 'g'}
def tiles_of(w):
    W, out, i = w.upper(), [], 0
    while i < len(W):
        if W[i:i + 2] in PAIRS: out.append(W[i:i + 2]); i += 2
        else: out.append(W[i]); i += 1
    return out
WORDS = {}
def word(w, e=None, pic=None, sound=False, sight=False):
    d = {}
    if pic: d['pic'] = pic
    if e: d['e'] = e
    if sound: d['sound'] = True
    if sight:
        d['sight'] = True; d['tiles'] = [w.upper()]; d['says'] = []
    else:
        d['tiles'] = tiles_of(w); d['says'] = [PAIRS.get(t, LETTER.get(t)) for t in d['tiles']]
        assert all(d['says']), w
    WORDS[w] = d
# Phase 1 (lessons 1-8)
word('ab', sound=True); word('ba', sound=True); word('tab', sound=True); word('at')
word('cab', '🚕', 'assets/reads/pics/cab.webp'); word('bat', '🦇', 'assets/reads/pics/bat.webp')
word('cat', '🐱', 'assets/reads/pics/cat.webp'); word('act', '🎭', 'assets/reads/pics/act.webp')
# Phase 2 (lessons 9-24): the approved list (no PUB, SNOT, HOG, HAM, BUM, JOCK and the rest)
for w, e in [('but', None), ('cut', '✂️'), ('cub', '🐻'), ('tub', '🛁'),
             ('bus', '🚌'), ('us', '👭'), ('sat', '🪑'), ('cats', '🐱🐱'), ('bats', '🦇🦇'), ('cubs', '🐻🐻'), ('cuts', '✂️'), ('tubs', '🛁🛁'),
             ('pat', '🤚'), ('tap', '🚰'), ('cup', '🥤'), ('cups', '🥤🥤'), ('pup', '🐶'), ('pups', '🐶🐶'), ('up', '⬆️'), ('cap', '🧢'), ('past', None),
             ('pot', '🍲'), ('pots', '🍲🍲'), ('top', '🔝'), ('tops', None), ('stop', '🛑'), ('spot', '🔴'), ('pop', '🎈'),
             ('hat', '👒'), ('hats', '👒👒'), ('hut', '🛖'), ('hot', '🔥'), ('hop', '🐰'), ('hops', '🐰'), ('has', None),
             ('on', None), ('sun', '☀️'), ('not', '🚫'), ('can', '🥫'), ('bun', '🥯'), ('buns', '🥯🥯'), ('pan', '🍳'), ('nut', '🥜'), ('nuts', '🥜🥜'), ('snap', '🫰'),
             ('hug', '🤗'), ('hugs', '🤗'), ('bug', '🐞'), ('bugs', '🐞🐞'), ('gap', None), ('got', None), ('tug', '🪢'), ('bag', '👜'), ('bags', '👜👜'), ('tag', '🏷️'), ('snug', '🛌'),
             ('dad', '👨'), ('sad', '😢'), ('had', None), ('bad', '👎'), ('dog', '🐶'), ('and', None), ('hand', '✋'), ('sand', '🏖️'), ('stand', '🧍'), ('dot', '⚫'), ('dug', '⛏️'),
             ('is', None), ('it', None), ('in', '📥'), ('sit', '🪑'), ('bit', None), ('big', '🐘'), ('dig', '⛏️'), ('did', None), ('hid', '🙈'), ('his', None),
             ('bin', '🗑️'), ('pin', '📌'), ('spin', '🌀'), ('tip', None), ('sip', '🧃'),
             ('if', None), ('fan', '🪭'), ('fun', '🎉'), ('fog', '🌫️'), ('fit', None), ('fast', '💨'), ('gift', '🎁'), ('soft', '🧸'), ('fin', '🐟'), ('off', None),
             ('run', '🏃‍♀️'), ('ran', '🏃‍♀️'), ('rug', None), ('frog', '🐸'), ('drip', '💧'), ('drop', '💧'), ('trip', '🧳'), ('grin', '😁'), ('grins', '😁'),
             ('grab', '✊'), ('crab', '🦀'), ('crust', '🍞'),
             ('map', '🗺️'), ('man', '👨'), ('mat', None), ('mud', '🟤'), ('mug', '☕'), ('mom', '👩'), ('mist', '🌫️'), ('must', None), ('bump', None),
             ('hum', '🎶'), ('gum', None), ('muffin', '🧁'),
             ('red', '🔴'), ('bed', '🛏️'), ('fed', None), ('pet', '🐾'), ('met', '🤝'), ('net', '🥅'), ('end', '🏁'), ('bend', None), ('den', None), ('ten', '🔟'),
             ('bent', None), ('best', '🏆'), ('rest', '😌'), ('test', '📝'), ('pen', '🖊️'), ('hen', '🐔'), ('hens', '🐔🐔'), ('get', None), ('naps', '😴'),
             ('jog', '🏃‍♀️'), ('jug', '🫗'), ('job', None), ('jump', '🤸‍♀️'), ('just', None), ('jam', '🫙'), ('jet', '✈️'), ('kid', '🧒'), ('kit', '🧰'), ('skip', None),
             ('back', None), ('pack', '🎒'), ('duck', '🦆'), ('backpack', '🎒'), ('jacket', '🧥'), ('pocket', None)]:
    word(w, e)
for w in ['the', 'he', 'no', 'so', "don't", 'to', 'be', 'your']:
    word(w, sight=True)

# ear games: words she only hears (an emoji shows after she answers)
E = {'apple': '🍎', 'ant': '🐜', 'alligator': '🐊', 'astronaut': '🧑‍🚀', 'cat': '🐱', 'map': '🗺️', 'hat': '👒', 'cap': '🧢', 'sad': '😢',
     'bat': '🦇', 'sun': '☀️', 'dog': '🐶', 'pen': '🖊️', 'bus': '🚌', 'cup': '🥤', 'fish': '🐟', 'egg': '🥚', 'moon': '🌙', 'bed': '🛏️',
     'ball': '⚽', 'bee': '🐝', 'rabbit': '🐰', 'robot': '🤖', 'zebra': '🦓', 'tub': '🛁', 'crab': '🦀', 'web': '🕸️', 'cab': '🚕',
     'kite': '🪁', 'car': '🚗', 'key': '🔑', 'rocket': '🚀', 'bucket': '🪣', 'monkey': '🐒', 'duck': '🦆', 'book': '📖', 'sock': '🧦',
     'clock': '⏰', 'tea': '🍵', 'ten': '🔟', 'toy': '🧸', 'tent': '⛺', 'tiger': '🐯', 'hotel': '🏨', 'guitar': '🎸', 'boat': '⛵',
     'net': '🥅', 'foot': '🦶',
     # Phase 2
     'up': '⬆️', 'umbrella': '☂️', 'under': '⬇️', 'mud': '🟤', 'bug': '🐞', 'seal': '🦭', 'basket': '🧺', 'dress': '👗', 'glass': '🥛',
     'pan': '🍳', 'pear': '🍐', 'pot': '🍲', 'puppy': '🐶', 'top': '🔝', 'mop': '🧹', 'on': '🔛', 'octopus': '🐙', 'olive': '🫒', 'box': '📦',
     'frog': '🐸', 'hen': '🐔', 'hot': '🔥', 'horse': '🐴', 'house': '🏠', 'nut': '🥜', 'nose': '👃', 'nest': '🪺', 'banana': '🍌',
     'panda': '🐼', 'bun': '🥯', 'goat': '🐐', 'gift': '🎁', 'gum': '🍬', 'dragon': '🐉', 'bag': '👜', 'door': '🚪', 'dad': '👨',
     'ladder': '🪜', 'red': '🔴', 'hand': '✋', 'bird': '🐦', 'in': '📥', 'insect': '🐛', 'igloo': '🛖', 'pin': '📌', 'six': '6️⃣',
     'milk': '🥛', 'fan': '🪭', 'fox': '🦊', 'coffee': '☕', 'leaf': '🍃', 'scarf': '🧣', 'giraffe': '🦒', 'ring': '💍', 'rain': '🌧️',
     'carrot': '🥕', 'parrot': '🦜', 'star': '⭐', 'mouse': '🐭', 'mom': '👩', 'lemon': '🍋', 'camel': '🐫', 'jam': '🫙', 'drum': '🥁',
     'elephant': '🐘', 'jet': '✈️', 'juice': '🧃', 'jug': '🫗', 'orange': '🍊', 'bridge': '🌉',
     # the /p/ and /b/ game, the /e/ and /i/ game
     'pat': '🤚', 'bear': '🐻', 'pea': '🫛', 'bin': '🗑️', 'pack': '🎒', 'back': '🔙', 'tin': '🥫', 'set': None, 'sit': '🪑', 'bet': None, 'bit': None}
EAR = {
    'a': {'beg': ['apple', 'ant', 'alligator', 'astronaut'], 'mid': ['cat', 'map', 'hat', 'cap', 'sad', 'bat'], 'end': [],
          'no': ['sun', 'dog', 'pen', 'bus', 'cup', 'fish', 'egg', 'moon', 'bed']},
    'b': {'beg': ['bat', 'bus', 'ball', 'bed', 'bee'], 'mid': ['rabbit', 'robot', 'zebra'], 'end': ['tub', 'crab', 'web', 'cab'],
          'no': ['sun', 'fish', 'moon', 'cat', 'dog', 'cup', 'pen', 'egg']},
    'k': {'beg': ['cat', 'cup', 'kite', 'car', 'key'], 'mid': ['rocket', 'bucket', 'monkey'], 'end': ['duck', 'book', 'sock', 'clock'],
          'no': ['sun', 'fish', 'moon', 'bed', 'ball', 'pen', 'egg', 'web']},
    't': {'beg': ['tea', 'ten', 'toy', 'tent', 'tiger'], 'mid': ['hotel', 'guitar'], 'end': ['cat', 'hat', 'boat', 'net', 'foot'],
          'no': ['sun', 'fish', 'moon', 'ball', 'dog', 'cup', 'bus', 'egg']},
    'u': {'beg': ['up', 'umbrella', 'under'], 'mid': ['sun', 'bus', 'cup', 'duck', 'bug', 'mud'], 'end': [],
          'no': ['cat', 'pen', 'dog', 'fish', 'bed', 'hat', 'tent', 'ten']},
    's': {'beg': ['sun', 'sock', 'sad', 'seal'], 'mid': ['basket'], 'end': ['bus', 'dress', 'glass'],
          'no': ['cat', 'hat', 'dog', 'pen', 'cup', 'bed']},
    'p': {'beg': ['pen', 'pan', 'pear', 'pot'], 'mid': ['apple', 'puppy'], 'end': ['cup', 'map', 'top', 'mop'],
          'no': ['cat', 'bed', 'sun', 'dog', 'bus', 'fish']},
    'o': {'beg': ['on', 'octopus', 'olive'], 'mid': ['dog', 'pot', 'sock', 'top', 'box', 'frog'], 'end': [],
          'no': ['cat', 'sun', 'pen', 'cup', 'bed', 'fish']},
    'h': {'beg': ['hat', 'hen', 'hot', 'horse', 'house'], 'mid': [], 'end': [],
          'no': ['cat', 'sun', 'dog', 'bus', 'pen', 'egg']},
    'n': {'beg': ['net', 'nut', 'nose', 'nest'], 'mid': ['banana', 'panda'], 'end': ['sun', 'pen', 'ten', 'moon', 'bun'],
          'no': ['cat', 'dog', 'bus', 'cup', 'hat', 'bed']},
    'g': {'beg': ['goat', 'gift', 'gum'], 'mid': ['tiger', 'dragon'], 'end': ['bag', 'bug', 'dog', 'egg', 'frog'],
          'no': ['cat', 'sun', 'pen', 'bus', 'cup', 'hat']},
    'd': {'beg': ['dog', 'duck', 'door', 'dad'], 'mid': ['panda', 'ladder'], 'end': ['bed', 'red', 'hand', 'bird'],
          'no': ['cat', 'sun', 'pen', 'bus', 'cup', 'hat']},
    'i': {'beg': ['in', 'insect', 'igloo'], 'mid': ['fish', 'pin', 'six', 'gift', 'milk'], 'end': [],
          'no': ['cat', 'sun', 'dog', 'bus', 'cup', 'hat']},
    'f': {'beg': ['fish', 'fan', 'frog', 'fox'], 'mid': ['coffee'], 'end': ['leaf', 'scarf', 'giraffe'],
          'no': ['cat', 'sun', 'dog', 'bus', 'cup', 'pen']},
    'r': {'beg': ['rabbit', 'red', 'ring', 'rain'], 'mid': ['carrot', 'parrot', 'zebra'], 'end': ['car', 'star'],
          'no': ['cat', 'sun', 'dog', 'bus', 'pen', 'hat']},
    'm': {'beg': ['map', 'moon', 'mouse', 'mom'], 'mid': ['lemon', 'camel'], 'end': ['jam', 'drum', 'gum'],
          'no': ['cat', 'sun', 'dog', 'bus', 'pen', 'hat']},
    'e': {'beg': ['egg', 'elephant'], 'mid': ['bed', 'pen', 'ten', 'net', 'hen', 'red'], 'end': [],
          'no': ['cat', 'sun', 'dog', 'bus', 'cup', 'hat']},
    'j': {'beg': ['jam', 'jet', 'juice', 'jug'], 'mid': [], 'end': ['orange', 'bridge'],
          'no': ['cat', 'sun', 'dog', 'bus', 'pen', 'hat']},
}
for s_, d in EAR.items():
    for k in ('beg', 'mid', 'end', 'no'):
        for w in d[k]:
            assert w in E, w
# the extra ear games for sounds Arabic does not have: which one did she hear? (lesson 11: /p/ or /b/, lesson 23: /e/ or /i/)
PAIRGAMES = {
    'pb': {'a': 'p', 'b': 'b', 'pairs': [['pat', 'bat'], ['cap', 'cab'], ['pear', 'bear'], ['pea', 'bee'], ['pin', 'bin'], ['pack', 'back']]},
    'ei': {'a': 'e', 'b': 'i', 'pairs': [['pen', 'pin'], ['ten', 'tin'], ['set', 'sit'], ['bet', 'bit']]},
}
for g in PAIRGAMES.values():
    for pr in g['pairs']:
        for w in pr: assert w in E, w

# ---------- sentences and stories (our own) ----------
# a sentence: its words appear one at a time; she reads each, then swipes under the whole sentence
SENT = {}
def sent(sid, text, e=None):
    toks = [t.strip('.,!?"').lower() for t in text.split()]
    for t in toks: assert t in WORDS, (sid, t)
    SENT[sid] = {'text': text, 'words': toks, **({'e': e} if e else {})}
for sid, text, e in [
    ('l12a', 'THE CAT.', '🐱'), ('l12b', 'THE PUP.', '🐶'), ('l12c', 'THE BUS.', '🚌'), ('l12d', 'THE CUP.', '🥤'),
    ('l13a', 'THE CAT SAT.', '🐱🪑'), ('l13b', 'STOP THE BUS!', '🛑🚌'), ('l13c', 'THE PUP SAT UP.', '🐶'), ('l13d', 'PAT THE PUP.', '🤚🐶'),
    ('l14a', 'HE HAS THE HAT.', '👦👒'), ('l14b', 'THE PUP HOPS.', '🐶'), ('l14c', 'HE HOPS UP.', '👦⬆️'), ('l14d', 'HOP, PUP, HOP!', '🐶'),
    ('l15a', 'HE CAN HOP.', '👦'), ('l15b', 'THE CAT SAT ON THE BUS.', '🐱🚌'), ('l15c', 'THE PUP CAN NOT STOP.', '🐶💨'), ('l15d', 'HE HAS THE BUN.', '🥯'),
    ('l16a', 'THE CAT CAN HOP.', '🐱'), ('l16b', 'STOP, BUS, STOP!', '🚌🛑'), ('l16c', 'HE HAS THE HOT POT.', '🍲🔥'), ('l16d', 'THE PUP SAT ON THE CAP.', '🐶🧢'),
    ('l17a', 'NO, PUP, NO!', '🐶'), ('l17b', 'HE GOT THE BAG.', '👜'), ('l17c', 'THE BUG HOPS.', '🐞'), ('l17d', 'HUG THE PUP.', '🤗🐶'),
    ('l18a', 'DAD AND THE DOG.', '👨🐶'), ('l18b', 'THE DOG DUG.', '🐶⛏️'), ('l18c', 'STAND UP, DAD!', '👨'), ('l18d', 'THE CAT AND THE DOG SAT.', '🐱🐶'),
    ('l19a', 'THE PUP IS BIG.', '🐶'), ('l19b', 'IT IS IN THE BAG.', '👜'), ('l19c', 'SIT, PUP, SIT!', '🐶🪑'), ('l19d', 'THE DOG CAN DIG.', '🐶⛏️'),
    ('l20a', 'THE FAN IS ON.', '🪭'), ('l20b', 'IT IS SO FUN!', '🎉'), ('l20c', "DON'T STOP!", '🛑'), ('l20d', 'THE CAT IS SO SOFT.', '🐱'),
    ('l21a', 'THE FROG CAN HOP.', '🐸'), ('l21b', 'RUN, DOG, RUN!', '🐶💨'), ('l21c', 'THE CRAB IS ON THE SAND.', '🦀🏖️'),
    ('l22a', 'MOM HAS THE MAP.', '👩🗺️'), ('l22b', 'THE DOG IS IN THE MUD.', '🐶🟤'), ('l22c', "DON'T BUMP THE MUG!", '☕'), ('l22d', 'IT CAN BE FUN.', '🎉'), ('l22e', 'RUN TO MOM!', '👩'),
    ('l23a', 'THE HEN IS RED.', '🐔'), ('l23b', 'GET IN BED!', '🛏️'), ('l23c', 'THE PET IS IN THE DEN.', '🐾'), ('l23d', 'TEN HENS IN THE SUN!', '🐔☀️'),
    ('l24a', 'JUMP, KID, JUMP!', '🤸‍♀️'), ('l24b', 'THE JAM IS IN THE JUG.', '🫙'), ('l24c', 'PACK YOUR BACKPACK.', '🎒'),
]:
    sent(sid, text, e)
# a story: pages (sentences), 2 curiosity questions with picture answers, and a "draw it" prompt
STORIES = {}
def story(sid, title, pages, questions, draw, draw_ar):
    ids = []
    for i, (text, e) in enumerate(pages):
        sent(f'{sid}{i + 1}', text, e); ids.append(f'{sid}{i + 1}')
    STORIES[sid] = {'title': title, 'pages': ids, 'questions': questions, 'draw': draw, 'drawAr': draw_ar}
story('gift', 'THE BIG GIFT', [('DAD HAS THE BIG GIFT.', '👨🎁'), ('IT IS SO SOFT.', '🎁'), ('IS IT THE HAT? NO!', '👒'), ('IS IT THE BAG? NO!', '👜'),
      ('IT IS THE PUP!', '🐶'), ('THE PUP HOPS ON DAD.', '🐶👨'), ('IT IS SO FUN!', '🎉')],
      [{'q': 'What is in the gift?', 'opts': ['🐶', '👒', '👜'], 'ok': 0}, {'q': 'Who has the gift?', 'opts': ['🐱', '👨', '👵'], 'ok': 1}],
      'Draw the pup on Dad!', 'ارسمي الجرو يقفز على بابا!')
story('frog', 'THE FROG AND THE CRAB', [('THE FROG IS ON THE RUG.', '🐸'), ('HOP, FROG, HOP!', '🐸'), ('THE CRAB IS ON THE SAND.', '🦀🏖️'),
      ('THE CRAB CAN NOT HOP.', '🦀'), ('THE CRAB CAN RUN!', '🦀💨'), ('THE FROG AND THE CRAB GRIN.', '🐸🦀')],
      [{'q': 'Who is on the rug?', 'opts': ['🐸', '🦀', '🐶'], 'ok': 0}, {'q': 'Can the crab hop?', 'opts': ['👍', '👎'], 'ok': 1}],
      'Draw the frog and the crab!', 'ارسمي الضفدع والسلطعون!')
story('bed', 'THE BEST BED', [('THE PUP IS SO SAD.', '🐶'), ('IS THE RUG THE BEST BED? NO.', '🐶'), ('IS THE BAG THE BEST BED? NO.', '👜'),
      ('MOM HAS THE BEST BED.', '👩🛏️'), ('THE PUP NAPS IN THE BED.', '🐶🛏️'), ('IT IS THE BEST!', '🏆')],
      [{'q': 'Where does the pup nap?', 'opts': ['👜', '🛏️', '🚌'], 'ok': 1}, {'q': 'Is the pup happy at the end?', 'opts': ['👍', '👎'], 'ok': 0}],
      'Draw the best bed for the pup!', 'ارسمي أجمل سرير للجرو!')
story('jet', 'THE JET', [('THE KID HAS THE RED BACKPACK.', '🧒🎒'), ('IN IT IS THE JAM AND THE MUFFIN.', '🫙🧁'),
      ('THE KID AND MOM GET ON THE JET.', '✈️'), ('THE JET IS BIG AND FAST.', '✈️💨'), ('THE KID GRINS AND GRINS.', '😁'), ('IT IS SO FUN!', '🎉')],
      [{'q': 'What is in the backpack?', 'opts': ['🧸', '🧁', '👟'], 'ok': 1}, {'q': 'Who gets on the jet?', 'opts': ['🐶', '🐸', '👩‍👧'], 'ok': 2}],
      'Draw the big red backpack!', 'ارسمي حقيبة الظهر الحمراء الكبيرة!')

# the lesson routine, beat by beat. flash = review cards of letters she knows; newsound = hear it, trace it;
# hear = ear game "is the sound in this word?"; where = beginning, middle or end; read = point and swipe;
# swap = add or swap a letter tile; me = record herself next to the model voice;
# (Phase 2) sight = a word she learns whole; diff = what's the difference?; spell = build a word she hears;
# sent = sentences, one word at a time; story = a short story, questions, draw it; pair = which sound did she hear?
L = [
    {'n': 1, 'new': ['a'], 'beats': [['newsound', 'a'], ['stretch', 'at', 'cat', 'map', 'sad', 'apple'], ['hear', 'a'], ['where', 'a'], ['me', 'sound:a']]},
    {'n': 2, 'new': ['b'], 'beats': [['flash'], ['newsound', 'b'], ['stretch', 'ab', 'bat', 'cab', 'bus'], ['action', 'a', 'b'], ['hear', 'b'], ['where', 'b'], ['me', 'sound:b']]},
    {'n': 3, 'new': [], 'words': ['ab', 'ba'], 'beats': [['flash'], ['read', 'ab', 'ba', 'ab', 'ba'], ['stretch', 'bat', 'tab', 'cab', 'sad'], ['hoops', 'ab', 'bat', 'cab'], ['me', 'word:ab']]},
    {'n': 4, 'new': ['k'], 'words': ['ab', 'cab', 'ba'], 'beats': [['flash'], ['newsound', 'k'], ['hear', 'k'], ['read', 'ab', 'cab', 'ba', 'cab'], ['swap', 'ab>cab'], ['spell', 'cab', 'ab'], ['run', 'a', 'b', 'k'], ['me', 'word:cab']]},
    {'n': 5, 'new': ['t'], 'words': ['ab', 'cab'], 'beats': [['flash'], ['newsound', 't'], ['hear', 't'], ['where', 't'], ['action', 'k', 't'], ['read', 'ab', 'cab'], ['spell', 'cab']]},
    {'n': 6, 'new': [], 'words': ['at', 'bat', 'cat', 'act'], 'beats': [['flash'], ['read', 'at', 'bat', 'cat', 'act'], ['swap', 'at>bat', 'at>cat'], ['spell', 'at', 'bat', 'cat'], ['shop', 'cat', 'bat', 'cab'], ['read', 'cat', 'at', 'bat'], ['me', 'word:cat']]},
    {'n': 7, 'new': [], 'words': ['bat', 'tab'], 'beats': [['flash'], ['read', 'bat', 'tab', 'bat', 'tab'], ['swap', 'cat>bat', 'cab>tab'], ['hoops', 'tab', 'bat', 'cat'], ['run', 'b', 'k', 't'], ['read', 'cat', 'cab', 'at'], ['me', 'word:tab']]},
    {'n': 8, 'new': [], 'words': ['at', 'bat', 'cat', 'ab', 'cab', 'tab'], 'beats': [['flash'], ['read', 'at', 'bat', 'cat', 'ab', 'cab', 'tab'], ['swap', 'ab>cab', 'cab>tab', 'cab>cat'], ['spell', 'tab', 'cab', 'bat'], ['shop', 'cab', 'cat', 'bat'], ['hear', 't'], ['me', 'word:bat']]},
    # Phase 2
    {'n': 9, 'new': ['u'], 'words': ['but', 'cut', 'cub', 'tub'],
     'beats': [['flash'], ['newsound', 'u'], ['hear', 'u'], ['read', 'cut', 'cub', 'tub', 'but'], ['diff', 'but/cut', 'cub/tub'], ['swap', 'cut>but', 'tub>cub'], ['me', 'word:cub']]},
    {'n': 10, 'new': ['s'], 'words': ['bus', 'us', 'sat', 'cats', 'bats', 'cubs', 'cuts', 'tubs'],
     'beats': [['flash'], ['newsound', 's'], ['hear', 's'], ['where', 's'], ['read', 'bus', 'sat', 'us', 'cats', 'bats', 'cubs'], ['diff', 'cat/cats', 'sat/bat'], ['swap', 'at>sat', 'cat>cats'], ['me', 'word:bus']]},
    {'n': 11, 'new': ['p'], 'words': ['pat', 'tap', 'cup', 'cups', 'pup', 'pups', 'up', 'cap', 'past'],
     'beats': [['flash'], ['newsound', 'p'], ['pair', 'pb'], ['read', 'pup', 'cup', 'cap', 'tap', 'pat', 'up'], ['diff', 'cap/cup', 'pup/cup'], ['spell', 'cap', 'pup'], ['swap', 'cup>pup', 'cap>tap'], ['me', 'word:pup']]},
    {'n': 12, 'new': [], 'sight': ['the'], 'words': ['cat', 'pup', 'bus', 'cup'],
     'beats': [['flash'], ['sight', 'the'], ['sent', 'l12a', 'l12b', 'l12c', 'l12d'], ['read', 'cups', 'pups', 'past', 'cuts'], ['spell', 'bus', 'cup'], ['me', 'word:the']]},
    {'n': 13, 'new': ['o'], 'words': ['pot', 'pots', 'top', 'tops', 'stop', 'spot', 'pop'],
     'beats': [['flash'], ['newsound', 'o'], ['hear', 'o'], ['read', 'pot', 'top', 'stop', 'spot', 'pop'], ['sent', 'l13a', 'l13b', 'l13c', 'l13d'], ['diff', 'pot/pop', 'top/tap'], ['spell', 'top', 'pot'], ['swap', 'top>pop', 'pot>pots'], ['me', 'word:stop']]},
    {'n': 14, 'new': ['h'], 'sight': ['he'], 'words': ['hat', 'hats', 'hut', 'hot', 'hop', 'hops', 'has'],
     'beats': [['flash'], ['newsound', 'h'], ['hear', 'h'], ['sight', 'he'], ['read', 'hat', 'hot', 'hop', 'hut', 'has'], ['sent', 'l14a', 'l14b', 'l14c', 'l14d'], ['diff', 'hat/hut', 'hot/hop'], ['spell', 'hat', 'hop'], ['me', 'word:hat']]},
    {'n': 15, 'new': ['n'], 'words': ['on', 'sun', 'not', 'can', 'bun', 'buns', 'pan', 'nut', 'nuts', 'snap'],
     'beats': [['flash'], ['newsound', 'n'], ['hear', 'n'], ['where', 'n'], ['read', 'sun', 'nut', 'can', 'pan', 'not', 'snap'], ['sent', 'l15a', 'l15b', 'l15c', 'l15d'], ['diff', 'not/nut', 'sun/bun'], ['spell', 'sun', 'nut'], ['swap', 'sun>bun', 'can>pan'], ['me', 'word:sun']]},
    {'n': 16, 'new': [], 'words': ['cut', 'bus', 'cup', 'pot', 'stop', 'hat', 'hop', 'sun', 'pan', 'nuts'],
     'beats': [['flash'], ['read', 'cut', 'bus', 'pot', 'stop', 'hop', 'pan', 'nuts'], ['sent', 'l16a', 'l16b', 'l16c', 'l16d'], ['diff', 'hat/hot', 'cup/pup'], ['spell', 'stop', 'pan'], ['swap', 'hot>pot', 'cut>nut'], ['hear', 'n'], ['me', 'word:stop']]},
    {'n': 17, 'new': ['g'], 'sight': ['no'], 'words': ['hug', 'hugs', 'bug', 'bugs', 'gap', 'got', 'tug', 'bag', 'bags', 'tag', 'snug'],
     'beats': [['flash'], ['newsound', 'g'], ['hear', 'g'], ['where', 'g'], ['sight', 'no'], ['read', 'bug', 'bag', 'hug', 'tag', 'got', 'snug'], ['sent', 'l17a', 'l17b', 'l17c', 'l17d'], ['diff', 'bug/bag', 'hug/tug'], ['spell', 'bug', 'bag'], ['swap', 'bug>hug', 'bag>tag'], ['me', 'word:hug']]},
    {'n': 18, 'new': ['d'], 'words': ['dad', 'sad', 'had', 'bad', 'dog', 'and', 'hand', 'sand', 'stand', 'dot', 'dug'],
     'beats': [['flash'], ['newsound', 'd'], ['hear', 'd'], ['where', 'd'], ['read', 'dad', 'dog', 'sad', 'hand', 'sand', 'and'], ['sent', 'l18a', 'l18b', 'l18c', 'l18d'], ['diff', 'dad/sad', 'hand/sand'], ['spell', 'dad', 'sand'], ['swap', 'sad>dad', 'and>hand'], ['me', 'word:dog']]},
    {'n': 19, 'new': ['i'], 'words': ['is', 'it', 'in', 'sit', 'bit', 'big', 'dig', 'did', 'hid', 'his', 'bin', 'pin', 'spin', 'tip', 'sip'],
     'beats': [['flash'], ['newsound', 'i'], ['hear', 'i'], ['read', 'big', 'dig', 'sit', 'pin', 'bin', 'spin', 'it', 'is'], ['sent', 'l19a', 'l19b', 'l19c', 'l19d'], ['diff', 'big/dig', 'pin/bin'], ['spell', 'big', 'pin'], ['swap', 'bin>pin', 'big>dig'], ['me', 'word:big']]},
    {'n': 20, 'new': ['f'], 'sight': ['so', "don't"], 'words': ['if', 'fan', 'fun', 'fog', 'fit', 'fast', 'gift', 'soft', 'fin', 'off'],
     'beats': [['flash'], ['newsound', 'f'], ['hear', 'f'], ['sight', 'so', "don't"], ['read', 'fan', 'fun', 'fog', 'gift', 'soft', 'fast'], ['sent', 'l20a', 'l20b', 'l20c', 'l20d'], ['story', 'gift'], ['diff', 'fan/fin', 'fun/fan'], ['spell', 'fan', 'gift'], ['me', 'word:gift']]},
    {'n': 21, 'new': ['r'], 'words': ['run', 'ran', 'rug', 'frog', 'drip', 'drop', 'trip', 'grin', 'grins', 'grab', 'crab', 'crust'],
     'beats': [['flash'], ['newsound', 'r'], ['hear', 'r'], ['read', 'run', 'rug', 'frog', 'crab', 'drip', 'drop', 'grin'], ['sent', 'l21a', 'l21b', 'l21c'], ['story', 'frog'], ['diff', 'ran/run', 'crab/grab'], ['spell', 'frog', 'run'], ['swap', 'ran>run', 'crab>grab'], ['me', 'word:frog']]},
    {'n': 22, 'new': ['m'], 'sight': ['to', 'be'], 'words': ['map', 'man', 'mat', 'mud', 'mug', 'mom', 'mist', 'must', 'bump', 'hum', 'gum', 'muffin'],
     'beats': [['flash'], ['newsound', 'm'], ['hear', 'm'], ['where', 'm'], ['sight', 'to', 'be'], ['read', 'mom', 'map', 'mud', 'mug', 'man', 'gum', 'muffin'], ['sent', 'l22a', 'l22b', 'l22c', 'l22d', 'l22e'], ['diff', 'man/mat', 'mug/mud'], ['spell', 'map', 'mud'], ['swap', 'mat>map', 'mug>hug'], ['me', 'word:mom']]},
    {'n': 23, 'new': ['e'], 'words': ['red', 'bed', 'fed', 'pet', 'met', 'net', 'end', 'bend', 'den', 'ten', 'bent', 'best', 'rest', 'test', 'pen', 'hen', 'hens', 'get', 'naps'],
     'beats': [['flash'], ['newsound', 'e'], ['pair', 'ei'], ['read', 'red', 'bed', 'hen', 'pen', 'ten', 'net', 'best'], ['sent', 'l23a', 'l23b', 'l23c', 'l23d'], ['story', 'bed'], ['diff', 'bed/red', 'pen/hen'], ['spell', 'bed', 'ten'], ['swap', 'bed>red', 'pen>hen'], ['me', 'word:red']]},
    {'n': 24, 'new': ['j', 'k'], 'sight': ['your'], 'words': ['jog', 'jug', 'job', 'jump', 'just', 'jam', 'jet', 'kid', 'kit', 'skip', 'back', 'pack', 'duck', 'backpack', 'jacket', 'pocket'],
     'beats': [['flash'], ['newsound', 'j'], ['hear', 'j'], ['sight', 'your'], ['read', 'jam', 'jet', 'jug', 'jump', 'kid', 'duck', 'back', 'pack'], ['sent', 'l24a', 'l24b', 'l24c'], ['story', 'jet'], ['diff', 'jug/jog', 'back/pack'], ['spell', 'jam', 'duck'], ['swap', 'back>pack', 'jug>jog'], ['me', 'word:jump']]},
]
# the day's tutor note in Mama's view (our own words; the Book Edition pack replaces them with the book's notes)
NOTES = {
    1: [('The first sound', ['Say the sound, not the letter name: A says /a/ as in apple. Keep it short and clean, with no "uh".',
         'While she traces, she says the sound with every stroke.',
         'Stretchy words are only heard today: say them slowly, then at normal speed, and let her copy you. She does not read them yet.'])],
    2: [('Two sounds', ['/b/ is short: lips together, a little pop, no "buh".',
         'Hear a Sound and Perform an Action: each sound has its own move. Join in with the moves, it makes the sounds stick.'])],
    3: [('Blending begins', ['Point and swipe: she taps A, then B, then swipes and says AB smoothly.',
         'If she says the two sounds but cannot join them, say them slowly together and a little shorter each time.',
         'Hopping Hoops: one hop for each sound, then out with the whole word. It is all listening: she does not need to see the word.'])],
    4: [('C says /k/', ['C and K share one sound, /k/. It is short, with no vowel after it.',
         'Spelling: she hears CAB and builds it with the letter tiles, left to right.'])],
    5: [('T says /t/', ['/t/ is only air, no voice. Listen for any "tuh" and help her keep it crisp.',
         'The action game now uses /k/ and /t/, two sounds that are easy to mix up.'])],
    6: [('First real words', ['AT, BAT, CAT, ACT: she sounds out every word, then reads it at normal speed.',
         'The Shopping Game: she buys a thing by saying each of its sounds. One coin for each sound.'])],
    7: [('Reading the other way', ['BAT and TAB use the same letters in another order. This shows her why left to right matters.',
         'In Hop to that Sound she hears a sound and finds its letter.'])],
    8: [('Review', ['Everything so far, mixed together. Short and cheerful.',
         'If a word is hard, go back to its sounds: tap, tap, tap, then swipe.'])],
}
GUIDE = {
    'soundsIntro': 'Say every sound short and clean. Stop sounds (b, c, d, g, j, k, p, t) are never stretched and never end in "uh". Long sounds (a, e, i, o, u, f, l, m, n, r, s, v, z) can be held.',
    'pairsIntro': 'Each pair is made the same way in the mouth. The first one has voice (put a hand on your throat: it buzzes); the second is only air. Arabic has some of these sounds but not all, so the ear games practise them.',
    'pairs': [['/b/ bat', '/p/ pat'], ['/d/ dog', '/t/ top'], ['/g/ go', '/k/ cat'], ['/j/ jam', '/ch/ chop'], ['/th/ this', '/th/ thin'], ['/z/ zip', '/s/ sun'], ['/v/ van', '/f/ fan']],
    'stretchTalk': ['"Go and waaash your hands." Stretch one word a day in everyday talk.', '"Can you find the c-a-t?" Say a word in sounds and let her join them.',
                    '"What sound does sun start with?" Play with first sounds in the car or at dinner.', '"Mmmilk or mmmuffin?" Stretch the first sound of things you offer her.'],
    'bedtime': ['Bedtime is for books, not lessons. Keep the lessons in the day.', 'While you read to her, point under the words as you read them, left to right.',
                'Let her find a word she knows on the page, and praise it.'],
    'tips': ['Two or three short sessions at the same times every day work better than one long one.', 'Praise what she did well, by name: "You said every sound!"',
             'If she is tired, stop. A short break, then a happy finish, is better than pushing on.', 'Point under the words at bedtime, left to right, as you read to her.',
             '"Go and waaash your hands": stretch one word a day in everyday talk.', 'Do not hold her back because blending is not perfect yet: it grows with practice.'],
}
for n, notes in NOTES.items():
    L[n - 1]['notes'] = [{'title': t, 'text': x} for t, x in notes]

# real photos (her request, 20 Oct 2026): assets/reads/photos/<concept>.webp, from scripts/reads_photos.py. A word's photo is
# its own concept, or its singular (CATS -> cat); a sentence shows the photo of its last word that has one
PHOTO_DIR = os.path.join(os.path.dirname(OUT), 'assets', 'reads', 'photos')
PHOTOS = sorted(f[:-5] for f in os.listdir(PHOTO_DIR) if f.endswith('.webp')) if os.path.isdir(PHOTO_DIR) else []
def photo_of(w):
    return w if w in PHOTOS else (w[:-1] if w.endswith('s') and w[:-1] in PHOTOS else None)
for x in SENT.values():
    ph = [photo_of(w) for w in x['words'] if not WORDS[w].get('sight') and photo_of(w)]
    if ph: x['photo'] = ph[-1]
QOPT = {'🐶': 'pup', '👒': 'hat', '👜': 'bag', '🐱': 'cat', '👨': 'dad', '👵': 'grandma', '🐸': 'frog', '🦀': 'crab', '👍': 'yes', '👎': 'no',
        '🛏️': 'bed', '🚌': 'bus', '🧸': 'toy', '🧁': 'muffin', '👟': 'sneakers', '👩‍👧': 'mom'}
for st in STORIES.values():
    for q in st['questions']:
        q['photos'] = [QOPT.get(o) for o in q['opts']]

# every clip a lesson needs (words, sentences, story pages and questions, single sounds): a lesson opens only when all exist
VOICE = os.path.join(os.path.dirname(OUT), 'audio', 'voice.json')
CLIPS = json.load(open(VOICE, encoding='utf-8'))['decks'].get('reads', {}).get('clips', {}) if os.path.exists(VOICE) else {}
def needs(L):
    ws, xs, sounds = set(L.get('words', [])), set(), set()
    for b in L['beats']:
        t, args = b[0], b[1:]
        if t in ('read', 'spell', 'sight'): ws.update(args)
        elif t == 'diff': [ws.update(a.split('/')) for a in args]
        elif t == 'swap': [ws.update(a.split('>')) for a in args]
        elif t in ('hear', 'where'): ws.update(EAR[args[0]]['beg'] + EAR[args[0]]['mid'] + EAR[args[0]]['end'] + EAR[args[0]]['no'])
        elif t == 'pair': [ws.update(pr) for pr in PAIRGAMES[args[0]]['pairs']]
        elif t == 'sent': xs.update(args)
        elif t == 'story':
            st = STORIES[args[0]]; xs.update(st['pages'])
            ws.update(f'q:{args[0]}{i}' for i in range(len(st['questions']) + 1))
        elif t == 'me':
            k, v = args[0].split(':'); (ws if k == 'word' else sounds).add(v)
        elif t == 'newsound': sounds.add(args[0])
    for x in xs: ws.update(SENT[x]['words'])
    return ws, xs, sounds
for M in L:
    for b in M['beats']:
        if b[0] in ('stretch', 'shop', 'hoops'):
            for w in b[1:]: assert w in WORDS or w in E, (M['n'], w)
        if b[0] in ('action', 'run'):
            for x in b[1:]: assert any(x == t[0] for t in SOUNDS), (M['n'], x)
taught_so_far = []
lessons = []
for i in range(65):
    d = {'n': i + 1, 'label': LABELS[i], 'title': TITLES[i], 'stage': 1 if i < 32 else 2, 'case': 'upper' if i < 24 else 'lower'}
    if i < len(L):
        d.update(L[i])
        taught_so_far += [x for x in d['new'] if x not in taught_so_far]
        ws, xs, snd = needs(d)
        sight_known = [w for M in L[:i + 1] for w in M.get('sight', [])]
        for w in ws:   # every word she reads uses only sounds taught so far (or is a sight word she has met)
            if w.startswith('q:') or w not in WORDS or w in E and not any(w in M.get('words', []) for M in L[:i + 1]) and w not in sum([SENT[x]['words'] for x in xs], []):
                continue
            W = WORDS[w]
            assert W.get('sight') and w in sight_known or not W.get('sight') and all(x in taught_so_far for x in W['says']), (i + 1, w)
        missing = [w for w in ws if (('qq-' + w[2:]) if w.startswith('q:') else 'w-' + w) not in CLIPS] + [x for x in xs if 'x-' + x not in CLIPS] \
            + [x for x in set(snd) | set(taught_so_far) if 'p-' + x not in CLIPS]
        d['ready'] = not missing
        if missing and i >= 8: print(f'lesson {i + 1}: {len(missing)} clips to record, e.g.', ', '.join(sorted(missing)[:6]))
    lessons.append(d)

data = {
    'v': 1,
    'note': 'Maria Reads: our own words, following the lesson order of Children Learning Reading. Phase 1 = lessons 1-8, Phase 2 = lessons 9-24.',
    'timer': [[1, 6, 3], [7, 19, 5], [20, 65, 7]], 'cap': 10,
    'placement': {'words': ['MAP', 'SUN', 'DOG', 'BED', 'PIN'], 'letters': list('ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
                  'letterSound': {'A': 'a', 'B': 'b', 'C': 'k', 'D': 'd', 'E': 'e', 'F': 'f', 'G': 'g', 'H': 'h', 'I': 'i', 'J': 'j', 'K': 'k',
                                  'L': 'l', 'M': 'm', 'N': 'n', 'O': 'o', 'P': 'p', 'Q': 'qu', 'R': 'r', 'S': 's', 'T': 't', 'U': 'u', 'V': 'v',
                                  'W': 'w', 'X': 'x', 'Y': 'ee', 'Z': 'z'}},
    'sounds': sounds, 'words': WORDS, 'ear': EAR, 'emoji': E, 'pairs': PAIRGAMES, 'sentences': SENT, 'stories': STORIES, 'lessons': lessons, 'guide': GUIDE,
    'photos': PHOTOS,
    'puzzles': [{'id': f'p0{i}', 'img': f'assets/reads/puzzles/p0{i}.webp', 'title': t} for i, t in
                enumerate(['أصدقاء لطاف', 'حلويات سعيدة', 'حديقة مبتسمة', 'كنوز السكويشي'], 1)],
    'bookPages': 12,
    'puzzleRule': 'one piece per day of use (days 1-6), the last two on day 7: the finished puzzle is the big reward',
}
json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# what still needs the voice, in lesson order (scripts/reads_voice.py records from this list; local only)
def say_text(text):
    t = text.lower(); return t[0].upper() + t[1:]
order, seen = [], set()
for d in lessons[8:]:
    if 'beats' not in d: continue
    ws, xs, snd = needs(d)
    for w in sorted(ws, key=lambda w: (w.startswith('q:'), w)):
        if w.startswith('q:'):
            sid, k = w[2:-1], int(w[-1]); st = STORIES[sid]
            cid, text = 'qq-' + w[2:], (st['questions'][k]['q'] if k < len(st['questions']) else st['draw'])
            kind = 'line'
        else:
            cid, text, kind = 'w-' + w, w, 'word'
        if cid not in seen and cid not in CLIPS: seen.add(cid); order.append({'id': cid, 'text': text, 'kind': kind, 'lesson': d['n']})
    for x in sorted(xs):
        cid = 'x-' + x
        if cid not in seen and cid not in CLIPS: seen.add(cid); order.append({'id': cid, 'text': say_text(SENT[x]['text']), 'kind': 'line', 'lesson': d['n']})
    for x in sorted(set(snd) | set(d['new'])):
        cid = 'p-' + x
        if cid not in seen and cid not in CLIPS: seen.add(cid); order.append({'id': cid, 'text': x, 'kind': 'sound', 'lesson': d['n']})
NEEDS = os.path.join(os.path.dirname(OUT), 'voice-work', 'reads', 'needs.json')
os.makedirs(os.path.dirname(NEEDS), exist_ok=True)
json.dump(order, open(NEEDS, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(order), 'clips still to record:', sum(o['kind'] == 'word' for o in order), 'words,', sum(o['kind'] == 'line' for o in order), 'lines,', sum(o['kind'] == 'sound' for o in order), 'sounds')
print('wrote', OUT, len(lessons), 'lessons,', sum(1 for x in lessons if x.get('ready')), 'ready,', len(WORDS), 'words,', len(SENT), 'sentences,', len(STORIES), 'stories')
