// All sound is synthesized with Web Audio, so there are no audio files to load.
// Browsers only allow audio after a user gesture, so `unlock()` is called from
// the Start / Try Again buttons.

const MUTE_KEY = 'breakout-bolt-muted';

interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  freqEnd?: number;
  dur: number;
  vol?: number;
  delay?: number;
  out?: GainNode;
}

interface NoiseOpts {
  dur: number;
  vol?: number;
  filter?: BiquadFilterType;
  freq?: number;
  freqEnd?: number;
  delay?: number;
  out?: GainNode;
}

// Music: A minor, i–VI–III–VII (Am F C G), one chord per bar of 16 steps
const BASS = [45, 41, 48, 43]; // MIDI root per bar
const CHORDS = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]];
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class SfxEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private muted = false;
  private chain = 0;
  private lastCollect = 0;

  // Music scheduler
  private musicOn = false;
  private step = 0;
  private nextStepTime = 0;
  private tempo = 128;
  private timer: number | null = null;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  isMuted(): boolean { return this.muted; }

  setMuted(m: boolean): void {
    this.muted = m;
    try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* storage unavailable */ }
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.02);
  }

  /** Create/resume the audio context. Must run inside a user gesture. */
  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.7;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.22;
      this.musicBus.connect(this.master);
      this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Freeze/unfreeze all audio (pause menu). */
  suspend(on: boolean): void {
    if (!this.ctx) return;
    if (on) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  // ------------------------------------------------------------ primitives

  private tone({ type = 'sine', freq, freqEnd, dur, vol = 0.3, delay = 0, out }: ToneOpts): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(out ?? this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise({ dur, vol = 0.3, filter = 'bandpass', freq = 2000, freqEnd, delay = 0, out }: NoiseOpts): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out ?? this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  // ------------------------------------------------------------ effects

  /** Rising pitch for quick chains of bolts — the classic coin-run feel. */
  collect(): void {
    const now = performance.now();
    this.chain = now - this.lastCollect < 450 ? Math.min(this.chain + 1, 12) : 0;
    this.lastCollect = now;
    const f = midi(76 + this.chain);
    this.tone({ type: 'square', freq: f, dur: 0.07, vol: 0.12 });
    this.tone({ type: 'sine', freq: f * 2, dur: 0.12, vol: 0.1, delay: 0.04 });
  }

  jump(): void {
    this.tone({ type: 'square', freq: 260, freqEnd: 620, dur: 0.16, vol: 0.12 });
  }

  slide(): void {
    this.noise({ dur: 0.35, vol: 0.25, filter: 'lowpass', freq: 3000, freqEnd: 400 });
  }

  lane(): void {
    this.noise({ dur: 0.09, vol: 0.08, filter: 'bandpass', freq: 1800, freqEnd: 3500 });
  }

  hit(): void {
    this.noise({ dur: 0.3, vol: 0.5, filter: 'lowpass', freq: 1800, freqEnd: 200 });
    this.tone({ type: 'sawtooth', freq: 180, freqEnd: 50, dur: 0.35, vol: 0.25 });
  }

  nearMiss(): void {
    this.noise({ dur: 0.25, vol: 0.18, filter: 'bandpass', freq: 800, freqEnd: 5000 });
    this.tone({ type: 'sine', freq: 1400, freqEnd: 2200, dur: 0.18, vol: 0.08, delay: 0.05 });
  }

  powerUp(): void {
    [0, 4, 7, 12].forEach((s, i) => this.tone({ type: 'square', freq: midi(72 + s), dur: 0.12, vol: 0.1, delay: i * 0.06 }));
  }

  shieldPop(): void {
    this.tone({ type: 'sine', freq: 1800, freqEnd: 300, dur: 0.3, vol: 0.2 });
    this.noise({ dur: 0.2, vol: 0.2, filter: 'highpass', freq: 3000 });
  }

  overdrive(): void {
    this.tone({ type: 'sawtooth', freq: 110, freqEnd: 880, dur: 0.6, vol: 0.18 });
    this.tone({ type: 'square', freq: 220, freqEnd: 1760, dur: 0.6, vol: 0.08 });
    this.noise({ dur: 0.6, vol: 0.2, filter: 'bandpass', freq: 500, freqEnd: 6000 });
  }

  knock(): void {
    this.tone({ type: 'sine', freq: 160, freqEnd: 40, dur: 0.2, vol: 0.45 });
    this.noise({ dur: 0.12, vol: 0.3, filter: 'lowpass', freq: 2500 });
  }

  levelUp(): void {
    [0, 4, 7, 12, 16].forEach((s, i) => this.tone({ type: 'triangle', freq: midi(67 + s), dur: 0.18, vol: 0.14, delay: i * 0.07 }));
  }

  gameOver(): void {
    [12, 7, 3, 0].forEach((s, i) => this.tone({ type: 'triangle', freq: midi(57 + s), dur: 0.3, vol: 0.16, delay: i * 0.16 }));
  }

  // ------------------------------------------------------------ music

  startMusic(level: number): void {
    if (!this.ctx) return;
    this.setLevel(level);
    if (this.musicOn) return;
    this.musicOn = true;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stopMusic(): void {
    this.musicOn = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  /** Music speeds up a little with each level. */
  setLevel(level: number): void {
    this.tempo = 124 + (level - 1) * 4;
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicOn) return;
    const stepDur = 60 / this.tempo / 4; // 16th notes
    while (this.nextStepTime < ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextStepTime - ctx.currentTime, stepDur);
      this.nextStepTime += stepDur;
      this.step = (this.step + 1) % 64;
    }
  }

  private playStep(step: number, delay: number, stepDur: number): void {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const out = this.musicBus;
    if (s % 4 === 0) this.tone({ type: 'sine', freq: 140, freqEnd: 45, dur: 0.16, vol: 0.7, delay, out }); // kick
    if (s % 4 === 2) this.noise({ dur: 0.04, vol: 0.18, filter: 'highpass', freq: 7000, delay, out }); // hat
    if (s === 4 || s === 12) this.noise({ dur: 0.12, vol: 0.25, filter: 'bandpass', freq: 1800, delay, out }); // snare
    if (s % 2 === 0) {
      const octave = s % 4 === 2 ? 12 : 0;
      this.tone({ type: 'sawtooth', freq: midi(BASS[bar] + octave), dur: stepDur * 1.8, vol: 0.22, delay, out });
    }
    const chord = CHORDS[bar];
    this.tone({ type: 'square', freq: midi(chord[s % 3] + 12), dur: stepDur * 0.9, vol: 0.05, delay, out }); // arp
  }
}

export const sfx = new SfxEngine();
