// Soft generated background music: a slow lo-fi chord loop with a gentle music-box melody.
import { getAudioContext, whenAudioUnlocked } from './audio';

const CHORDS = [
  [57, 60, 64, 67], // Am7
  [53, 57, 60, 64], // Fmaj7
  [48, 52, 55, 59], // Cmaj7
  [55, 59, 62, 65], // G7
];
const MELODY = [76, 72, 74, 71, 72, 69, 67, 69, 72, 71, 67, 64, 65, 67, 69, 71];
const BEAT = 0.75;

const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class Music {
  private enabled = true;
  private gain: GainNode | null = null;
  private next = 0;
  private step = 0;
  private timer = 0;

  constructor() {
    whenAudioUnlocked(() => this.start());
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    const ctx = getAudioContext();
    if (this.gain && ctx) this.gain.gain.setTargetAtTime(on ? 0.05 : 0, ctx.currentTime, 0.3);
  }

  private start(): void {
    const ctx = getAudioContext();
    if (!ctx || this.gain) return;
    this.gain = ctx.createGain();
    this.gain.gain.value = this.enabled ? 0.05 : 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    this.gain.connect(lp).connect(ctx.destination);
    this.next = ctx.currentTime + 0.2;
    this.timer = window.setInterval(() => this.schedule(), 200);
  }

  private note(freq: number, t: number, dur: number, type: OscillatorType, vol: number): void {
    const ctx = getAudioContext()!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.gain!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private schedule(): void {
    const ctx = getAudioContext();
    if (!ctx || !this.gain) return;
    if (document.hidden) { this.next = ctx.currentTime + 0.2; return; }
    while (this.next < ctx.currentTime + 0.6) {
      const t = this.next;
      const bar = Math.floor(this.step / 4) % CHORDS.length;
      if (this.step % 4 === 0) for (const n of CHORDS[bar]) this.note(hz(n - 12), t, BEAT * 4, 'triangle', 0.35);
      if (this.step % 2 === 0) this.note(hz(CHORDS[bar][0] - 24), t, BEAT * 1.8, 'sine', 0.5);
      if (this.step % 16 < 12 || this.step % 2 === 0) this.note(hz(MELODY[this.step % MELODY.length]), t, BEAT * 1.2, 'sine', 0.25);
      this.step++;
      this.next += BEAT;
    }
  }

  dispose(): void { clearInterval(this.timer); }
}
