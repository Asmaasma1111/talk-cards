"""Cut the Phase 2 built-in sounds into voice-work/reads/sounds/final (then reads_voice.py build). Run from the anki folder
after `reads_voice.py sounds2` (the stretchy take) and the lesson words (raw-hat). Checked 20 Oct 2026: /p/ from the end of
"uuup", /d/ and /g/ from the last 140 ms of "saaad" and "baaag", /h/ a soft cut of the start of "hat"."""
import sys, os, numpy as np
sys.path.insert(0, 'scripts'); import voice as V
SR = V.SR; H = int(0.01 * SR); S = 'voice-work/reads/sounds'; F = S + '/final'
def env(x): return np.array([np.sqrt(np.mean(x[i:i + H] ** 2)) for i in range(0, len(x) - H, H)])
def zcr(x): return np.array([np.mean(np.abs(np.diff(np.sign(x[i:i + H]))) > 0) for i in range(0, len(x) - H, H)])
def fade(y, a, b):
    y = y.copy(); na, nb = max(1, int(a * SR)), max(1, int(b * SR)); y[:na] *= np.linspace(0, 1, na); y[-nb:] *= np.linspace(1, 0, nb); return y
def norm(y):
    y = y / (np.abs(y).max() + 1e-9) * 0.85
    return np.concatenate([np.zeros(int(0.04 * SR), np.float32), y.astype(np.float32), np.zeros(int(0.06 * SR), np.float32)])
def save(name, y): V.write_wav(f'{F}/{name}.wav', norm(y))
def onset(x, k=0.06):
    e = env(x); return int(np.argmax(e > k * e.max()))
def held(src, t0=None, t1=None, k=0.25):   # a held sound: from its start (or t0) to where it fades (or t1)
    x = V.read_wav(src); e = env(x); top = e.max()
    a = onset(x, k) if t0 is None else int(t0 * 100)
    b = a
    while b < len(e) and e[b] > k * top: b += 1
    if t1 is not None: b = min(b, int(t1 * 100))
    return fade(x[a * H:b * H], 0.01, 0.08)
def noise_start(src):        # a breathy or hissing start, up to the first voiced frame
    x = V.read_wav(src); e = env(x); z = zcr(x); top = e.max(); a = onset(x, 0.04); b = a
    while b < len(e) and b < a + 80 and not (z[b] < 0.2 and e[b] > 0.35 * top): b += 1
    return fade(x[a * H:max(b, a + 4) * H], 0.004, 0.03)
def end_release(src, ms):    # lips or tongue closed and the release at the end of a word
    x = V.read_wav(src); e = env(x); top = e.max(); last = len(e) - 1
    while last > 0 and e[last] < 0.03 * top: last -= 1
    return fade(x[max(0, (last + 1) * H - int(ms / 1000 * SR)):(last + 1) * H], 0.01, 0.012)
def with_short(sid, y):
    save(sid, y); save(sid + '-short', fade(y[:int(0.4 * SR)], 0.01, 0.1))
src = lambda sid, t: f'{S}/src-{sid}-{t}.wav'
with_short('u', held(src('u', 'uuup')))
with_short('o', held(src('o', 'ooon'), t1=0.95))
with_short('i', held(src('i', 'iiit')))
with_short('e', held(src('e', 'eeegg')))
with_short('f', noise_start(src('f', 'fffan')))
with_short('s', noise_start('voice-work/reads/3.8flashtts-sun.wav'))
with_short('m', held(src('m', 'mmmom'), t1=0.55))
with_short('n', held(src('n', 'nnnet'), t1=0.6))
with_short('r', held(src('r', 'rrrun'), t0=0.08, t1=0.5, k=0.1))
save('d', end_release(src('d', 'saaad'), 140))
save('g', end_release(src('g', 'baaag'), 140))
save('h', fade(V.read_wav('voice-work/reads/words/raw-hat.wav')[int(0.06 * SR):int(0.15 * SR)], 0.03, 0.03))
x = V.read_wav(src('u', 'uuup')); e = env(x); top = e.max(); last = len(e) - 1     # /p/: the burst at the end of "uuup"
while last > 0 and e[last] < 0.05 * top: last -= 1
st = last
while st > 0 and e[st - 1] >= 0.05 * top: st -= 1
save('p', fade(x[max(0, int((st / 100 - 0.03) * SR)):min(len(x), int(((last + 1) / 100 + 0.03) * SR))], 0.002, 0.03))
for f in sorted(os.listdir(F)): print(f, f'{V.duration(F + "/" + f):.2f}s')
