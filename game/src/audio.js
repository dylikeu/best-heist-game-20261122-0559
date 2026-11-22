// WebAudio bleeps only — no audio files. The context is created on
// the first user gesture, so the game stays silent until played.

let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, seconds, type, gainValue, slideTo) {
  if (muted) return;
  const audio = ensureCtx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, audio.currentTime + seconds);
  gain.gain.setValueAtTime(gainValue || 0.08, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + seconds);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + seconds);
}

export function soundClick() {
  tone(660, 0.07, 'square', 0.05);
}

export function soundGrab() {
  tone(880, 0.09, 'sine', 0.09);
  setTimeout(() => tone(1320, 0.12, 'sine', 0.08), 70);
}

export function soundSpotted() {
  tone(220, 0.28, 'sawtooth', 0.09, 440);
}

export function soundAlarm() {
  tone(520, 0.16, 'square', 0.07, 380);
  setTimeout(() => tone(520, 0.16, 'square', 0.07, 380), 200);
}

export function soundCaught() {
  tone(330, 0.5, 'sawtooth', 0.1, 110);
}

export function soundVaultTick() {
  tone(1200, 0.04, 'square', 0.04);
}

export function soundVaultOpen() {
  tone(523, 0.14, 'sine', 0.09);
  setTimeout(() => tone(659, 0.14, 'sine', 0.09), 120);
  setTimeout(() => tone(784, 0.22, 'sine', 0.09), 240);
}

export function soundWin() {
  const notes = [523, 659, 784, 1046];
  notes.forEach((n, i) => setTimeout(() => tone(n, 0.25, 'sine', 0.09), i * 140));
}

export function soundLose() {
  const notes = [392, 330, 262, 196];
  notes.forEach((n, i) => setTimeout(() => tone(n, 0.3, 'triangle', 0.08), i * 160));
}

export function soundSmoke() {
  tone(180, 0.35, 'sine', 0.07, 90);
}

export function soundEmp() {
  tone(1400, 0.3, 'sawtooth', 0.06, 220);
}
