/* كرّاس الإملاء: the voice. Recorded clips (Gemini TTS, scripts/dictation_voice.py) are listed in audio/voice.json as
   {clips: {id: file}}; ids come from cards.json. Until a line is recorded, the iPad's own Arabic voice reads its text
   (full tashkeel), slower than normal speech for dictation. say() plays a list of steps in order; stop() ends it. */
(function (KD) {
'use strict';
let clips = {};
let run = 0;            // each say() call gets a number; an older one stops when a newer one starts
const audio = new Audio();
audio.preload = 'auto';

async function init() {
  try { const r = await fetch('audio/voice.json', { cache: 'no-cache' }); if (r.ok) clips = (await r.json()).clips || {}; } catch (e) { clips = {}; }
}
const has = id => !!clips[id];
const wait = ms => new Promise(r => setTimeout(r, ms));
function playClip(id, n) {
  return new Promise(ok => {
    if (n !== run) return ok(false);
    audio.onended = () => ok(true); audio.onerror = () => ok(false);
    audio.src = 'audio/' + clips[id];
    audio.play().catch(() => ok(false));
  });
}
let arVoice = null;
function pickVoice() {
  if (arVoice || !window.speechSynthesis) return arVoice;
  const vs = speechSynthesis.getVoices().filter(v => /^ar/i.test(v.lang));
  arVoice = vs.find(v => /SA/i.test(v.lang)) || vs[0] || null;
  return arVoice;
}
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { arVoice = null; pickVoice(); };
function speak(text, rate, n) {
  return new Promise(ok => {
    if (n !== run || !window.speechSynthesis) return ok(false);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA'; const v = pickVoice(); if (v) u.voice = v;
    u.rate = rate; u.onend = () => ok(true); u.onerror = () => ok(false);
    speechSynthesis.speak(u);
    setTimeout(() => ok(false), 4000 + text.length * 160);   // never hang on a device that does not answer
  });
}
// steps: [{id, text, slow}] or {pause: ms}
async function say(steps, onDone) {
  stop();
  const n = ++run;
  if (KD.sound.muted()) { if (onDone) onDone(); return; }
  for (const s of steps) {
    if (n !== run) return;
    if (s.pause) { await wait(s.pause); continue; }
    if (has(s.id)) await playClip(s.id, n);
    else if (s.text) await speak(s.text, s.slow ? 0.72 : 0.9, n);
  }
  if (n === run && onDone) onDone();
}
function stop() {
  run++;
  try { audio.pause(); } catch (e) {}
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
}
KD.voice = { init, say, stop, has };
})(window.KD = window.KD || {});
