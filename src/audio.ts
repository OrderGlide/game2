// Tiny WebAudio synth — every sound is generated, no audio files needed. Horror edition.

export type Sfx =
  | 'tap' | 'click' | 'pick' | 'open' | 'close' | 'creak' | 'drawer' | 'slide' | 'unlock' | 'wrong' | 'switch' | 'paper'
  | 'combine' | 'ding' | 'thud' | 'metal' | 'locked' | 'chain' | 'bang' | 'door' | 'scare' | 'whisper' | 'knock' | 'drip'
  | 'buzz' | 'step' | 'power' | 'uv' | 'heartbeat' | 'win';

let ctx: AudioContext | null = null;
let muted = false;
let vibrationOn = true;
let onUnlock: (() => void)[] = [];
const lastPlayed: Partial<Record<Sfx, number>> = {};

export function getAudioContext(): AudioContext | null { return ctx; }
export function whenAudioUnlocked(fn: () => void): void { if (ctx) fn(); else onUnlock.push(fn); }
export function setMuted(m: boolean): void { muted = m; }
export function setVibration(on: boolean): void { vibrationOn = on; }

export function unlockAudio(): void {
  if (!ctx) {
    try { ctx = new AudioContext(); } catch { return; }
    for (const fn of onUnlock) fn();
    onUnlock = [];
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

function out(vol: number, t0: number, dur: number, attack = 0.01): GainNode {
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  g.connect(ctx!.destination);
  return g;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slide = 0, attack = 0.01): void {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  osc.connect(out(vol, t0, dur, attack));
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

let noiseBuf: AudioBuffer | null = null;
function noise(dur: number, vol: number, freq: number, delay = 0, q = 1, type: BiquadFilterType = 'bandpass', attack = 0.005): void {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  src.connect(f).connect(out(vol, t0, dur, attack));
  src.start(t0, Math.random());
  src.stop(t0 + dur + 0.05);
}

/** Breathy whisper: noise swept through a moving formant. */
function whisper(): void {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    const src = ctx.createBufferSource();
    if (!noiseBuf) noise(0.01, 0.0001, 100);
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 8;
    const s = t0 + i * 0.35;
    f.frequency.setValueAtTime(900 + Math.random() * 800, s);
    f.frequency.linearRampToValueAtTime(1800 + Math.random() * 1500, s + 0.25);
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 2 - 1;
    src.connect(f).connect(pan).connect(out(0.12, s, 0.4, 0.08));
    src.start(s, Math.random());
    src.stop(s + 0.45);
  }
}

/** The jump-scare stinger: dissonant screech + impact. */
function scare(): void {
  if (!ctx) return;
  for (const f of [440, 466, 622, 932]) tone(f, 1.1, 'sawtooth', 0.07, 0, -f * 0.3, 0.005);
  noise(0.9, 0.35, 2500, 0, 0.6, 'bandpass', 0.002);
  tone(55, 0.8, 'sine', 0.5, 0, -25);
}

export function sfx(name: Sfx): void {
  if (muted || !ctx) return;
  const now = performance.now();
  if (now - (lastPlayed[name] ?? 0) < 60) return;
  lastPlayed[name] = now;
  const j = 1 + (Math.random() - 0.5) * 0.1;
  switch (name) {
    case 'tap': noise(0.05, 0.08, 600 * j, 0, 2); break;
    case 'click': tone(1400 * j, 0.03, 'square', 0.04); break;
    case 'pick': tone(420 * j, 0.12, 'triangle', 0.12, 0, 120); noise(0.08, 0.06, 3000); break;
    case 'open': noise(0.25, 0.12, 700, 0, 0.8); tone(150, 0.2, 'triangle', 0.06, 0, 40); break;
    case 'close': noise(0.1, 0.18, 400); tone(90, 0.12, 'triangle', 0.15); break;
    case 'creak': tone(140 * j, 0.9, 'sawtooth', 0.035, 0, 110, 0.1); tone(210 * j, 0.7, 'sawtooth', 0.02, 0.15, -60, 0.1); noise(0.8, 0.03, 1800, 0, 8); break;
    case 'drawer': noise(0.35, 0.12, 380, 0, 0.6); tone(70, 0.15, 'triangle', 0.1, 0.3); break;
    case 'slide': noise(0.3, 0.1, 600, 0, 0.5); break;
    case 'unlock': tone(900, 0.05, 'square', 0.05); tone(600, 0.08, 'square', 0.05, 0.07); noise(0.1, 0.12, 2500, 0.05, 2); break;
    case 'wrong': tone(110, 0.25, 'sawtooth', 0.08); tone(104, 0.3, 'sawtooth', 0.08, 0.05); break;
    case 'switch': tone(2000, 0.02, 'square', 0.05); noise(0.04, 0.12, 3000); break;
    case 'paper': noise(0.25, 0.08, 3500, 0, 0.7); break;
    case 'combine': tone(300, 0.08, 'triangle', 0.1); noise(0.08, 0.08, 2000, 0.05); break;
    case 'ding': tone(880, 0.6, 'sine', 0.07); tone(932, 0.6, 'sine', 0.05); break;
    case 'thud': tone(70 * j, 0.25, 'triangle', 0.25, 0, -30); noise(0.12, 0.12, 200); break;
    case 'metal': noise(0.3, 0.1, 1200, 0, 3); tone(310 * j, 0.4, 'square', 0.03, 0, -40); tone(470 * j, 0.3, 'square', 0.02); break;
    case 'locked': noise(0.08, 0.15, 900, 0, 2); noise(0.08, 0.12, 700, 0.12, 2); break;
    case 'chain': for (let i = 0; i < 5; i++) noise(0.06, 0.1, 3000 + i * 300, i * 0.05, 4); break;
    case 'bang': tone(50, 0.6, 'sine', 0.6, 0, -20); noise(0.4, 0.5, 300, 0, 0.5, 'lowpass'); break;
    case 'door': tone(90, 1.6, 'sawtooth', 0.04, 0, 60, 0.3); noise(1.5, 0.05, 900, 0, 6); tone(45, 0.5, 'sine', 0.3, 1.3); break;
    case 'scare': scare(); break;
    case 'whisper': whisper(); break;
    case 'knock': for (let i = 0; i < 3; i++) { tone(95, 0.12, 'triangle', 0.3, i * 0.28, -30); noise(0.05, 0.15, 400, i * 0.28); } break;
    case 'drip': tone(1200 * j, 0.08, 'sine', 0.06, 0, -700); tone(1600 * j, 0.06, 'sine', 0.03, 0.4, -900); break;
    case 'buzz': tone(100, 0.4, 'sawtooth', 0.04); tone(120, 0.4, 'square', 0.02); break;
    case 'step': noise(0.12, 0.05, 250, 0, 1, 'lowpass'); break;
    case 'power': tone(60, 1.2, 'sawtooth', 0.05, 0, 60, 0.2); noise(0.3, 0.1, 2500, 0, 2); break;
    case 'uv': tone(1800, 0.5, 'sine', 0.04, 0, 400); noise(0.4, 0.04, 6000, 0, 3); break;
    case 'heartbeat': tone(55, 0.12, 'sine', 0.5); tone(50, 0.15, 'sine', 0.4, 0.22); break;
    case 'win': tone(110, 2.2, 'sine', 0.2, 0, 0, 0.3); tone(165, 2.2, 'sine', 0.12, 0.2, 0, 0.3); tone(220, 2.0, 'triangle', 0.06, 0.5, 0, 0.3); break;
  }
}

export function vibrate(ms: number): void {
  if (!vibrationOn) return;
  try { navigator.vibrate?.(ms); } catch { /* not supported */ }
}
