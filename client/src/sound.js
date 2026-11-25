// All sounds are synthesized with the Web Audio API, so there are no audio files to download.
let ctx, master, osc, gain, muted = false, lastBump = 0;

export function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
  osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 38;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
  gain = ctx.createGain(); gain.gain.value = 0;
  osc.connect(lp); lp.connect(gain); gain.connect(master); osc.start();
}

export function setEngine(speed) {
  if (!ctx) return;
  const k = Math.min(1, Math.abs(speed) / 18), t = ctx.currentTime;
  osc.frequency.setTargetAtTime(38 + k * 80, t, 0.1);
  gain.gain.setTargetAtTime(0.03 + k * 0.1, t, 0.1);
}

function tone(freq, dur, type = 'sine', vol = 0.2, delay = 0, to = freq) {
  if (!ctx) return;
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur);
}

export const sfx = {
  chime() { [660, 880, 1320].forEach((f, i) => tone(f, 0.35, 'sine', 0.16, i * 0.09)); },
  honk() { tone(310, 0.3, 'square', 0.1); tone(392, 0.3, 'square', 0.08); },
  click() { tone(900, 0.06, 'triangle', 0.12); },
  bump() { if (ctx && ctx.currentTime - lastBump > 0.4) { lastBump = ctx.currentTime; tone(110, 0.18, 'sawtooth', 0.2, 0, 45); } },
};

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}
