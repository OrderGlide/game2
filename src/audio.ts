// Tiny WebAudio synth — every sound is generated, no audio files needed.

export type Sfx =
  | 'tap' | 'pick' | 'open' | 'close' | 'unlock' | 'wrong' | 'meow' | 'purr' | 'eat' | 'win' | 'slide' | 'water'
  | 'paper' | 'click' | 'creak' | 'drawer' | 'switch' | 'fish' | 'combine' | 'ding' | 'whoosh' | 'thud';

let ctx: AudioContext | null = null;
let muted = false;
let vibrationOn = true;
let onUnlock: (() => void) | null = null;
const lastPlayed: Partial<Record<Sfx, number>> = {};

export function getAudioContext(): AudioContext | null { return ctx; }
export function whenAudioUnlocked(fn: () => void): void { if (ctx) fn(); else onUnlock = fn; }
export function setMuted(m: boolean): void { muted = m; }
export function setVibration(on: boolean): void { vibrationOn = on; }

export function unlockAudio(): void {
  if (!ctx) {
    try { ctx = new AudioContext(); } catch { return; }
    onUnlock?.();
    onUnlock = null;
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slide = 0): void {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, vol: number, freq: number, delay = 0, q = 1): void {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(t0);
}

/** A little "mrrrau": a sliding tone shaped by a vowel-ish filter. */
function meow(pitch: number): void {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(pitch * 0.8, t0);
  osc.frequency.linearRampToValueAtTime(pitch * 1.25, t0 + 0.15);
  osc.frequency.linearRampToValueAtTime(pitch * 0.7, t0 + 0.45);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 3;
  f.frequency.setValueAtTime(700, t0);
  f.frequency.linearRampToValueAtTime(1500, t0 + 0.15);
  f.frequency.linearRampToValueAtTime(600, t0 + 0.45);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.05);
  g.gain.setValueAtTime(0.25, t0 + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
  osc.connect(f).connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.55);
}

function purr(): void {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 42;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 24;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.05;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(0.06, t0 + 0.2);
  g.gain.linearRampToValueAtTime(0.0001, t0 + 1.3);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 300;
  lfo.connect(lfoGain).connect(g.gain);
  osc.connect(f).connect(g).connect(ctx.destination);
  osc.start(t0);
  lfo.start(t0);
  osc.stop(t0 + 1.4);
  lfo.stop(t0 + 1.4);
}

export function sfx(name: Sfx): void {
  if (muted || !ctx) return;
  const now = performance.now();
  if (now - (lastPlayed[name] ?? 0) < 60) return;
  lastPlayed[name] = now;
  const j = 1 + (Math.random() - 0.5) * 0.1;
  switch (name) {
    case 'tap': tone(700 * j, 0.05, 'triangle', 0.06); break;
    case 'click': tone(1400 * j, 0.03, 'square', 0.04); break;
    case 'pick': tone(620 * j, 0.09, 'triangle', 0.14, 0, 380); tone(1240 * j, 0.1, 'sine', 0.06, 0.06); break;
    case 'open': noise(0.18, 0.12, 900, 0, 0.8); tone(300, 0.12, 'triangle', 0.06, 0, 80); break;
    case 'close': noise(0.1, 0.15, 500); tone(160, 0.1, 'triangle', 0.12); break;
    case 'creak': tone(180 * j, 0.5, 'sawtooth', 0.03, 0, 90); noise(0.5, 0.03, 1600, 0, 6); break;
    case 'drawer': noise(0.25, 0.1, 400, 0, 0.6); break;
    case 'slide': noise(0.3, 0.08, 700, 0, 0.5); break;
    case 'unlock': tone(900, 0.05, 'square', 0.05); tone(1300, 0.08, 'square', 0.05, 0.07); [659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.1, 0.15 + i * 0.07)); break;
    case 'wrong': tone(220, 0.14, 'square', 0.06); tone(180, 0.2, 'square', 0.06, 0.12); break;
    case 'switch': tone(2000, 0.02, 'square', 0.05); noise(0.04, 0.1, 3000); break;
    case 'water': for (let i = 0; i < 5; i++) tone(500 + Math.random() * 700, 0.08, 'sine', 0.05, i * 0.06, 400); noise(0.8, 0.05, 1200, 0, 0.5); break;
    case 'paper': noise(0.2, 0.08, 3500, 0, 0.7); break;
    case 'eat': for (let i = 0; i < 3; i++) noise(0.06, 0.12, 1800, i * 0.12, 1.5); break;
    case 'fish': [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.25, 'sine', 0.1, i * 0.08)); break;
    case 'combine': tone(500, 0.08, 'triangle', 0.1); tone(750, 0.12, 'triangle', 0.1, 0.08); break;
    case 'ding': tone(1320, 0.4, 'sine', 0.1); break;
    case 'whoosh': noise(0.35, 0.08, 800, 0, 0.4); break;
    case 'thud': tone(90 * j, 0.15, 'triangle', 0.2, 0, -40); noise(0.08, 0.1, 200); break;
    case 'meow': meow(520 * j); break;
    case 'purr': purr(); break;
    case 'win': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, i * 0.1)); break;
  }
}

export function vibrate(ms: number): void {
  if (!vibrationOn) return;
  try { navigator.vibrate?.(ms); } catch { /* not supported */ }
}
