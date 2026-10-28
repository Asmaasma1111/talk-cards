// Soft, synthesized sounds (no audio files, so they work offline).
import * as store from './store.js';

let ctx = null;

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, vol = 0.08, type = 'sine') {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const SOUNDS = {
  tap: () => tone(660, 0, 0.07, 0.05),
  coin: () => { tone(1320, 0, 0.09, 0.06, 'triangle'); tone(1760, 0.07, 0.14, 0.05, 'triangle'); },
  drop: () => { tone(220, 0, 0.12, 0.09); tone(330, 0.03, 0.1, 0.05); },
  celebrate: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.28, 0.06, 'triangle')),
};

export function play(name) {
  if (store.get().muted) return;
  try { SOUNDS[name]?.(); } catch (e) { /* sound is optional */ }
}

// iPad Safari only allows audio after a user gesture.
window.addEventListener('pointerdown', () => { if (!store.get().muted) ac(); }, { once: true });
