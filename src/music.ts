// Generated horror ambience: a low detuned drone, a cold wind and now and then a lonely out-of-tune piano note.
import { getAudioContext, whenAudioUnlocked } from './audio';

export class Music {
  private enabled = true;
  private gain: GainNode | null = null;
  private oscs: OscillatorNode[] = [];
  private base = 50;
  private timer = 0;

  constructor() {
    whenAudioUnlocked(() => this.start());
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    const ctx = getAudioContext();
    if (this.gain && ctx) this.gain.gain.setTargetAtTime(on ? 0.09 : 0, ctx.currentTime, 0.5);
  }

  /** Retune the drone for the current place (Hz). */
  setDrone(hz: number): void {
    this.base = hz;
    const ctx = getAudioContext();
    if (!ctx) return;
    const ratios = [1, 1.005, 1.5, 2.01];
    this.oscs.forEach((o, i) => o.frequency.setTargetAtTime(hz * ratios[i], ctx.currentTime, 2));
  }

  private start(): void {
    const ctx = getAudioContext();
    if (!ctx || this.gain) return;
    this.gain = ctx.createGain();
    this.gain.gain.value = this.enabled ? 0.09 : 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(lp.frequency);
    lfo.start();
    lp.connect(this.gain).connect(ctx.destination);
    const ratios = [1, 1.005, 1.5, 2.01];
    for (const r of ratios) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = this.base * r;
      const g = ctx.createGain();
      g.gain.value = r === 1 ? 0.5 : 0.25;
      o.connect(g).connect(lp);
      o.start();
      this.oscs.push(o);
    }
    // wind
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const wind = ctx.createBufferSource();
    wind.buffer = buf;
    wind.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 500;
    wf.Q.value = 0.8;
    const wg = ctx.createGain();
    wg.gain.value = 0.18;
    const wlfo = ctx.createOscillator();
    wlfo.frequency.value = 0.11;
    const wlg = ctx.createGain();
    wlg.gain.value = 300;
    wlfo.connect(wlg).connect(wf.frequency);
    wlfo.start();
    wind.connect(wf).connect(wg).connect(this.gain);
    wind.start();
    this.timer = window.setInterval(() => this.piano(), 7000);
  }

  private piano(): void {
    const ctx = getAudioContext();
    if (!ctx || !this.gain || document.hidden || Math.random() < 0.45) return;
    const notes = [0, 1, 6, 7, 11, 12, 13];
    const n = notes[Math.floor(Math.random() * notes.length)];
    const f = this.base * 8 * Math.pow(2, n / 12);
    const t0 = ctx.currentTime;
    for (const [mul, v] of [[1, 0.25], [2.01, 0.08], [3.02, 0.04]]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mul;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.5);
      o.connect(g).connect(this.gain);
      o.start(t0);
      o.stop(t0 + 3.6);
    }
  }

  dispose(): void { clearInterval(this.timer); }
}
