/**
 * QR Buddy — sound engine.
 *
 * - Plays the recorded set from the spec (e.g. /sounds/qr/qr_call.mp3) when present.
 * - Falls back to soft synthesized stand-ins in C major pentatonic when a file is missing,
 *   so every cue is audible today.
 * - Routes voice sounds through an analyser so the buddy's mouth follows real loudness.
 *   Movement sounds (steps, claps) skip the analyser, so the mouth stays still for them.
 *
 * Browsers only allow audio after a user gesture: call `unlock()` from a tap or key press.
 */
import type { Cue } from './buddyTypes';

export type BuddySound =
  | 'call' | 'giggle' | 'hmm' | 'yawn' | 'ding'
  | 'count1' | 'count2' | 'count3' | 'count4' | 'count5'
  | 'count6' | 'count7' | 'count8' | 'count9' | 'count10'
  | 'lullaby' | 'birthday'
  | 'step' | 'land' | 'clap' | 'whoosh'
  | 'crack1' | 'crack2' | 'crack3' | 'hatch';

/** Spec file names (without extension). Several takes = picked at random. */
const FILES: Record<BuddySound, string[]> = {
  call: ['qr_call'],
  giggle: ['qr_giggle_1', 'qr_giggle_2', 'qr_giggle_3'],
  hmm: ['qr_hmm'],
  yawn: ['qr_yawn'],
  ding: ['qr_ding'],
  count1: ['qr_count_01'], count2: ['qr_count_02'], count3: ['qr_count_03'],
  count4: ['qr_count_04'], count5: ['qr_count_05'], count6: ['qr_count_06'],
  count7: ['qr_count_07'], count8: ['qr_count_08'], count9: ['qr_count_09'],
  count10: ['qr_count_10'],
  lullaby: ['qr_lullaby'],
  birthday: ['qr_birthday'],
  step: ['qr_step'],
  land: ['qr_land'],
  clap: ['qr_clap'],
  whoosh: ['qr_whoosh'],
  crack1: ['qr_crack_1'], crack2: ['qr_crack_2'], crack3: ['qr_crack_3'],
  hatch: ['qr_hatch'],
};

/** Sounds that move the mouth. */
const VOICE: ReadonlySet<BuddySound> = new Set<BuddySound>([
  'call', 'giggle', 'hmm', 'yawn', 'lullaby', 'birthday',
  'count1', 'count2', 'count3', 'count4', 'count5',
  'count6', 'count7', 'count8', 'count9', 'count10',
]);

export const CUE_SOUNDS: Record<Cue, BuddySound> = {
  cueStep: 'step',
  cueLand: 'land',
  cueClap: 'clap',
  cueWhoosh: 'whoosh',
  cueGiggle: 'giggle',
  cuePop: 'ding',
  cueYawn: 'yawn',
};

/* C major pentatonic (C D E G A), Hz */
const N = {
  C3: 130.81, G3: 196.0, A3: 220.0,
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
  C6: 1046.5, E6: 1318.51, G6: 1567.98,
} as const;
const COUNT_NOTES = [N.C4, N.D4, N.E4, N.G4, N.A4, N.C5, N.D5, N.E5, N.G5, N.A5];

export interface BuddyAudioOptions {
  /** Folder holding the recorded set. Default "/sounds/qr/". */
  baseUrl?: string;
  /** File extension. Default "mp3". */
  ext?: string;
  /** 0 to 1. Default 0.8. */
  volume?: number;
  /** Play synth stand-ins for missing files. Default true. */
  synthFallback?: boolean;
  /** Set false to skip loading files and use only the stand-ins (prototyping). */
  useFiles?: boolean;
}

type AudioCtor = typeof AudioContext;
/** Typed so it works with both older and newer TypeScript DOM libs. */
const newFloatBuffer = (n: number) => new Float32Array(n);

export class BuddyAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voiceBus: GainNode | null = null;
  private fxBus: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private data: ReturnType<typeof newFloatBuffer> | null = null;
  private buffers = new Map<string, AudioBuffer | null>();
  private loading = new Map<string, Promise<AudioBuffer | null>>();
  private music: AudioScheduledSourceNode[] = [];
  private musicGain: GainNode | null = null;
  private level = 0;
  private readonly opts: Required<BuddyAudioOptions>;

  constructor(options: BuddyAudioOptions = {}) {
    this.opts = {
      baseUrl: options.baseUrl ?? '/sounds/qr/',
      ext: options.ext ?? 'mp3',
      volume: options.volume ?? 0.8,
      synthFallback: options.synthFallback ?? true,
      useFiles: options.useFiles ?? true,
    };
  }

  /** True once a user gesture has started the audio context. */
  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Call from a tap, click or key press. Safe to call many times. */
  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctor: AudioCtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = this.opts.volume;
      // Gentle limiter: nothing ever gets loud or sharp.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      comp.attack.value = 0.005;
      comp.release.value = 0.2;
      master.connect(comp).connect(ctx.destination);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.2;
      const voiceBus = ctx.createGain();
      voiceBus.connect(analyser);
      voiceBus.connect(master);
      const fxBus = ctx.createGain();
      fxBus.connect(master);

      this.ctx = ctx;
      this.master = master;
      this.voiceBus = voiceBus;
      this.fxBus = fxBus;
      this.analyser = analyser;
      this.data = newFloatBuffer(analyser.fftSize);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setVolume(v: number): void {
    this.opts.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.opts.volume;
  }

  /** Fetch and decode recorded files ahead of time (optional). */
  async preload(sounds: BuddySound[] = Object.keys(FILES) as BuddySound[]): Promise<void> {
    if (!this.ctx || !this.opts.useFiles) return;
    await Promise.all(sounds.flatMap((s) => FILES[s].map((f) => this.load(f))));
  }

  /** Play a sound by name. */
  play(sound: BuddySound): void {
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;
    const takes = FILES[sound];
    const file = takes[Math.floor(Math.random() * takes.length)];
    const bus = VOICE.has(sound) ? this.voiceBus! : this.fxBus!;
    const isMusic = sound === 'lullaby' || sound === 'birthday';
    if (isMusic) this.stopMusic();

    const cached = this.buffers.get(file);
    if (cached) {
      const src = ctx.createBufferSource();
      src.buffer = cached;
      const out = isMusic ? this.musicOut(bus) : bus;
      src.connect(out);
      src.start();
      if (isMusic) {
        src.loop = sound === 'lullaby';
        this.music.push(src);
      }
      return;
    }
    // Not decoded yet: try to fetch it for next time, play the stand-in now.
    if (cached === undefined && this.opts.useFiles) void this.load(file);
    if (this.opts.synthFallback) this.synth(sound, bus);
  }

  /** Play the sound mapped to a cue from the buddy. */
  cue(cue: Cue): void {
    this.play(CUE_SOUNDS[cue]);
  }

  /** Counting note for 1 to 10. */
  count(n: number): void {
    const i = Math.max(1, Math.min(10, Math.round(n)));
    this.play(`count${i}` as BuddySound);
  }

  /** Egg crack 1 to 3. */
  crack(n: number): void {
    const i = Math.max(1, Math.min(3, Math.round(n)));
    this.play(`crack${i}` as BuddySound);
  }

  stopMusic(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.musicGain) {
      const g = this.musicGain;
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      const nodes = this.music;
      setTimeout(() => {
        nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } });
        g.disconnect();
      }, 800);
    }
    this.music = [];
    this.musicGain = null;
  }

  /**
   * Voice loudness, 0 to 1, smoothed for a natural mouth.
   * Call once per animation frame.
   */
  getLevel(): number {
    const a = this.analyser;
    const d = this.data;
    if (!a || !d) return 0;
    a.getFloatTimeDomainData(d);
    let sum = 0;
    for (let i = 0; i < d.length; i++) sum += d[i] * d[i];
    const rms = Math.sqrt(sum / d.length);
    const target = Math.max(0, Math.min(1, (rms - 0.008) * 9));
    // Fast to open, slower to close.
    const k = target > this.level ? 0.55 : 0.18;
    this.level += (target - this.level) * k;
    return this.level < 0.02 ? 0 : this.level;
  }

  dispose(): void {
    this.stopMusic();
    void this.ctx?.close();
    this.ctx = null;
  }

  /* ------------------------------------------------------------ internals */

  private load(file: string): Promise<AudioBuffer | null> {
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve(null);
    const existing = this.loading.get(file);
    if (existing) return existing;
    const url = `${this.opts.baseUrl}${file}.${this.opts.ext}`;
    const p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((buf) => ctx.decodeAudioData(buf))
      .then((b) => { this.buffers.set(file, b); return b; })
      .catch(() => { this.buffers.set(file, null); return null; });
    this.loading.set(file, p);
    return p;
  }

  private musicOut(bus: AudioNode): GainNode {
    const g = this.ctx!.createGain();
    g.connect(bus);
    this.musicGain = g;
    return g;
  }

  /* Soft stand-ins. Everything is short, gentle and pentatonic. */
  private synth(sound: BuddySound, bus: AudioNode): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + 0.01;
    switch (sound) {
      case 'call':
        this.voice(bus, t, [[N.G4, 0.2], [N.C5, 0.34]], { glide: 0.06 });
        break;
      case 'giggle': {
        const runs = [
          [N.E5, N.D5, N.C5, N.A4, N.G4],
          [N.G5, N.E5, N.D5, N.E5, N.C5],
          [N.D5, N.C5, N.A4, N.C5, N.A4],
        ];
        const run = runs[Math.floor(Math.random() * runs.length)];
        run.forEach((f, i) => this.voice(bus, t + i * 0.11, [[f, 0.08]], { gain: 0.5 }));
        break;
      }
      case 'hmm':
        this.voice(bus, t, [[N.E4, 0.28], [N.A4, 0.3]], { glide: 0.22, gain: 0.6 });
        break;
      case 'yawn':
        this.voice(bus, t, [[N.G4, 0.25], [N.C4, 0.95]], { glide: 0.8, gain: 0.55 });
        break;
      case 'ding':
        this.bell(bus, t, N.C6, 0.9, 0.5);
        this.bell(bus, t, N.G6, 0.6, 0.12);
        break;
      case 'lullaby':
        this.lullaby(bus, t);
        break;
      case 'birthday':
        this.birthday(bus, t);
        break;
      case 'step':
        this.noise(bus, t, 0.05, 700, 'lowpass', 0.25);
        break;
      case 'land':
        this.thump(bus, t);
        break;
      case 'clap':
        this.noise(bus, t, 0.05, 1400, 'bandpass', 0.3);
        break;
      case 'whoosh':
        this.whoosh(bus, t);
        break;
      case 'crack1':
      case 'crack2':
      case 'crack3': {
        const n = Number(sound.slice(-1));
        for (let i = 0; i < n + 1; i++) this.noise(bus, t + i * 0.045, 0.02, 3000, 'highpass', 0.12 + n * 0.05);
        break;
      }
      case 'hatch':
        [N.C5, N.E5, N.G5, N.A5, N.C6].forEach((f, i) => this.bell(bus, t + i * 0.07, f, 0.6, 0.18));
        break;
      default:
        if (sound.startsWith('count')) {
          const i = Number(sound.slice(5)) - 1;
          this.bell(bus, t, COUNT_NOTES[i] ?? N.C5, 0.45, 0.45, 'triangle');
        }
    }
  }

  /** A soft, voice-like tone: triangle + low-pass + gentle vibrato. */
  private voice(
    bus: AudioNode,
    t: number,
    notes: Array<[number, number]>,
    o: { glide?: number; gain?: number } = {},
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    const g = ctx.createGain();
    const vib = ctx.createOscillator();
    const vibDepth = ctx.createGain();
    vib.frequency.value = 5.5;
    vibDepth.gain.value = 4;
    vib.connect(vibDepth).connect(osc.frequency);

    let at = t;
    osc.frequency.setValueAtTime(notes[0][0], t);
    notes.forEach(([f, d], i) => {
      if (i > 0) {
        if (o.glide) osc.frequency.linearRampToValueAtTime(f, at + o.glide);
        else osc.frequency.setValueAtTime(f, at);
      }
      at += d;
    });
    const peak = (o.gain ?? 0.7) * 0.5;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.03);
    g.gain.setValueAtTime(peak, Math.max(t + 0.03, at - 0.08));
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
    osc.connect(lp).connect(g).connect(bus);
    osc.start(t);
    vib.start(t);
    osc.stop(at + 0.1);
    vib.stop(at + 0.1);
  }

  private bell(bus: AudioNode, t: number, f: number, dur: number, gain: number, type: OscillatorType = 'sine'): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * 0.5, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private noiseBuffer(): AudioBuffer {
    const key = '__noise';
    const cached = this.buffers.get(key);
    if (cached) return cached;
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const ch = b.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    this.buffers.set(key, b);
    return b;
  }

  private noise(bus: AudioNode, t: number, dur: number, freq: number, type: BiquadFilterType, gain: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private thump(bus: AudioNode, t: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.45, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + 0.2);
    this.noise(bus, t, 0.06, 500, 'lowpass', 0.15);
  }

  private whoosh(bus: AudioNode, t: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(1600, t + 0.18);
    f.frequency.exponentialRampToValueAtTime(600, t + 0.38);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    src.connect(f).connect(g).connect(bus);
    src.start(t);
    src.stop(t + 0.45);
  }

  /** Original lullaby: 75 bpm in 3/4, one bar = one 2.4 s sway. */
  private lullaby(bus: AudioNode, t0: number): void {
    const beat = 0.8;
    // [note, beats]
    const melody: Array<[number, number]> = [
      [N.E4, 2], [N.G4, 1], [N.A4, 2], [N.G4, 1], [N.E4, 2], [N.D4, 1], [N.C4, 3],
      [N.E4, 1], [N.G4, 1], [N.A4, 1], [N.C5, 2], [N.A4, 1], [N.G4, 2], [N.E4, 1], [N.D4, 3],
      [N.A4, 1], [N.G4, 1], [N.E4, 1], [N.D4, 2], [N.E4, 1], [N.D4, 2], [N.D4, 1], [N.C4, 3],
    ];
    const out = this.musicOut(bus);
    let t = t0;
    melody.forEach(([f, b]) => {
      this.musicNote(out, t, f, b * beat * 0.95, 0.32);
      t += b * beat;
    });
    const bars = Math.round((t - t0) / (beat * 3));
    for (let i = 0; i < bars; i++) {
      this.musicNote(out, t0 + i * beat * 3, i % 2 ? N.G3 : N.C3, beat * 2.6, 0.18);
    }
  }

  /** Original birthday jingle: bouncy, pentatonic, about 9 s. */
  private birthday(bus: AudioNode, t0: number): void {
    const beat = 60 / 112;
    const melody: Array<[number, number]> = [
      [N.C5, 0.5], [N.A4, 0.5], [N.G4, 1], [N.E4, 1], [N.G4, 1],
      [N.A4, 0.5], [N.C5, 0.5], [N.D5, 1], [N.C5, 2],
      [N.E5, 0.5], [N.D5, 0.5], [N.C5, 1], [N.A4, 1], [N.C5, 1],
      [N.D5, 0.5], [N.E5, 0.5], [N.G5, 1], [N.E5, 1], [N.C5, 2],
    ];
    const out = this.musicOut(bus);
    let t = t0;
    melody.forEach(([f, b]) => {
      this.musicNote(out, t, f, b * beat * 0.85, 0.34, 'triangle');
      t += b * beat;
    });
    [N.C3, N.A3, N.G3, N.C3].forEach((f, i) => this.musicNote(out, t0 + i * beat * 4, f, beat * 3.5, 0.16));
  }

  private musicNote(out: AudioNode, t: number, f: number, dur: number, gain: number, type: OscillatorType = 'sine'): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.04);
    g.gain.exponentialRampToValueAtTime(gain * 0.6, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    this.music.push(osc);
  }
}
