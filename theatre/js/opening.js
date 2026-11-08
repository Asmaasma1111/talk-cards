/* مسرح المسائل: the opening on Home (her request, 8 Nov 2026: new ChatGPT curtains that open beautifully, with a beautiful sound).
   TH.opening.stage(title) builds the clay stage (assets/stage/stage.webp) with the two clay curtain panels (curtain.webp) between
   its frame and its valance; adding the class 'open' parts them, 'closing' draws them shut.
   TH.opening.play(name) plays one of the opening sounds, all made here with Web Audio (no sound files, nothing downloaded):
     piano   a piano glissando running down the white keys, landing on a soft chord (her example)
     harp    a harp sweeping up a pentatonic scale
     musicbox a music box tinkling a little falling tune
     chimes  wind chimes shimmering, high and soft
     swell   a warm string swell that rises as the curtains part, with a sparkle at the top
   The sound she picks becomes the default (DEFAULT below); the test page theatre/_sounds.html plays all five. */
(function (TH) {
'use strict';
const DEFAULT = 'swell';      // her pick, 8 Nov 2026: "5 strings it is"
let ctx = null, verb = null;
function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
// a small hall: decaying noise as the room's echo, mixed in under the dry sound
function out(a) {
  if (!verb) {
    const len = Math.floor(a.sampleRate * 2.2), buf = a.createBuffer(2, len, a.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    const conv = a.createConvolver(); conv.buffer = buf;
    const wet = a.createGain(); wet.gain.value = 0.32; const dry = a.createGain(); dry.gain.value = 0.85;
    const master = a.createGain(); master.gain.value = 0.9;
    master.connect(dry).connect(a.destination); master.connect(conv).connect(wet).connect(a.destination);
    verb = master;
  }
  return verb;
}
// one struck note: partials [ratio, level], a quick attack and a long fall
function note(a, f, t, opts) {
  const o = Object.assign({ vol: 0.06, dec: 1.2, parts: [[1, 1]], type: 'sine', pan: 0, att: 0.004 }, opts);
  const g = a.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.vol, t + o.att); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dec);
  let tail = g;
  if (a.createStereoPanner && o.pan) { const p = a.createStereoPanner(); p.pan.value = o.pan; g.connect(p); tail = p; }
  tail.connect(out(a));
  o.parts.forEach(([r, l]) => {
    const osc = a.createOscillator(), pg = a.createGain(); osc.type = o.type; osc.frequency.setValueAtTime(f * r, t);
    pg.gain.value = l; osc.connect(pg).connect(g); osc.start(t); osc.stop(t + o.dec + 0.05);
  });
}
const hz = m => 440 * Math.pow(2, (m - 69) / 12);          // a MIDI note number to its pitch
const WHITE = [0, 2, 4, 5, 7, 9, 11];
const SOUNDS = {
  piano(a, t) {   // down the white keys from C7 to C4, quick and light, then a soft C major chord
    const keys = []; for (let m = 96; m >= 60; m--) if (WHITE.includes(m % 12)) keys.push(m);
    keys.forEach((m, i) => note(a, hz(m), t + i * 0.045, { vol: 0.05 - i * 0.0006, dec: 0.9, type: 'triangle', parts: [[1, 1], [2, 0.18], [3, 0.06]], pan: 0.5 - i / keys.length }));
    const end = t + keys.length * 0.045 + 0.05;
    [60, 64, 67, 72].forEach((m, i) => note(a, hz(m), end + i * 0.02, { vol: 0.045, dec: 2.2, type: 'triangle', parts: [[1, 1], [2, 0.2]] }));
  },
  harp(a, t) {    // up two octaves of D major pentatonic, each string plucked, then one high ring
    const scale = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88, 90, 93];
    scale.forEach((m, i) => note(a, hz(m), t + i * 0.06, { vol: 0.055, dec: 1.6, parts: [[1, 1], [2, 0.35], [3, 0.12], [4, 0.05]], pan: -0.5 + i / scale.length }));
    note(a, hz(98), t + scale.length * 0.06 + 0.12, { vol: 0.04, dec: 2.4, parts: [[1, 1], [2, 0.3]] });
  },
  musicbox(a, t) { // a little falling tune on a music box comb (bright, bell-like, slightly out of tune overtones)
    const tune = [91, 88, 84, 86, 83, 79, 81, 84];
    tune.forEach((m, i) => note(a, hz(m), t + i * 0.16, { vol: 0.05, dec: 1.5, parts: [[1, 1], [4.07, 0.25], [6.9, 0.08]], pan: (i % 2 ? 0.25 : -0.25) }));
  },
  chimes(a, t) {   // wind chimes: high pentatonic bells at uneven times, left and right
    const bells = [84, 86, 88, 91, 93, 96, 98, 100];
    let s = 7; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;     // the same shimmer every time
    for (let i = 0; i < 14; i++) note(a, hz(bells[Math.floor(rnd() * bells.length)]), t + rnd() * 1.6, { vol: 0.035, dec: 2.6, parts: [[1, 1], [2.76, 0.3], [5.4, 0.1]], pan: rnd() * 1.6 - 0.8 });
  },
  swell(a, t) {    // strings: a warm chord that grows as the curtains part, then a sparkle on top
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(350, t); f.frequency.exponentialRampToValueAtTime(3200, t + 1.5);
    const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 1.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    f.connect(g).connect(out(a));
    [48, 55, 60, 64, 67].forEach((m, i) => [-6, 6].forEach(cents => {
      const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = cents + i;
      const v = a.createGain(); v.gain.value = 0.12; o.connect(v).connect(f); o.start(t); o.stop(t + 3.3);
    }));
    [79, 84, 88, 91, 96].forEach((m, i) => note(a, hz(m), t + 1.25 + i * 0.07, { vol: 0.03, dec: 1.4, type: 'triangle', parts: [[1, 1], [2, 0.2]] }));
  }
};
function play(name) {
  const a = ac(); if (!a) return;
  try { (SOUNDS[name] || SOUNDS[DEFAULT])(a, a.currentTime + 0.03); } catch (e) {}
}

// the stage: back picture, light, title, two curtains, then the frame and valance again on top (so the curtains hang behind them)
function stage(title) {
  const d = (cls, kids) => { const n = document.createElement('div'); n.className = cls; (kids || []).forEach(k => n.append(k)); return n; };
  const h = document.createElement('h1'); h.className = 'home-title'; h.textContent = title;
  const sparks = d('op-sparks', Array.from({ length: 14 }, (_, i) => { const s = document.createElement('i'); s.style.setProperty('--x', (8 + (i * 61) % 84) + '%'); s.style.setProperty('--d', (i * 0.11).toFixed(2) + 's'); return s; }));
  const box = d('op-box', [d('op-back'), d('op-spot'), h, sparks, d('op-curtain l'), d('op-curtain r'), d('op-front')]);
  return d('theatre op', [box]);
}

TH.opening = { play, stage, DEFAULT, names: Object.keys(SOUNDS) };
})(window.TH = window.TH || {});
