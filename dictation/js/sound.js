/* كرّاس الإملاء: calm sounds (Web Audio, no files) and the page-turn sound of her library (../assets/audio/lib-flip1.m4a).
   One mute switch for sounds and voice (prefs.muted). */
(function (KD) {
'use strict';
let ctx = null;
function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, start, dur, vol = 0.06, type = 'sine') {
  const a = ac(); if (!a) return;
  const t = a.currentTime + start, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.03);
}
let flip = null;
const SOUNDS = {
  tap: () => tone(620, 0, 0.06, 0.035),
  good: () => { tone(784, 0, 0.16, 0.05, 'triangle'); tone(1046, 0.09, 0.22, 0.045, 'triangle'); },
  soft: () => tone(330, 0, 0.22, 0.04),                       // a wrong answer: low and gentle, never a buzzer
  drop: () => { tone(523, 0, 0.09, 0.04); tone(659, 0.05, 0.12, 0.035); },
  back: () => tone(294, 0, 0.16, 0.03),
  done: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.32, 0.045, 'triangle')),
  page: () => { try { flip = flip || new Audio('../assets/audio/lib-flip1.m4a'); flip.currentTime = 0; flip.volume = 0.6; flip.play().catch(() => {}); } catch (e) {} }
};
const muted = () => !!(KD.store && KD.store.get() && KD.store.get().prefs.muted);
function play(name) { if (muted()) return; try { SOUNDS[name] && SOUNDS[name](); } catch (e) { /* sound is optional */ } }
window.addEventListener('pointerdown', () => { if (!muted()) ac(); }, { once: true });
KD.sound = { play, muted };
})(window.KD = window.KD || {});
