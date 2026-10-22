/**
 * Chiptune engine (#41) + SFX (#42) on Web Audio.
 *
 * Four channels like the NES APU: pulse1, pulse2, triangle, noise. A song is a
 * list of patterns; each pattern has one note string per channel. Notes are
 * space-separated tokens at 16th-note resolution: `C4`, `A#3`, `--` (rest),
 * `==` (hold). Sequencing uses look-ahead scheduling so timing is sample-accurate.
 *
 * SFX are generated on the same four channel types with a *channel budget*:
 * each effect declares which channel it uses and, while it plays, the music on
 * that channel ducks so effects never clash with the tune.
 */
export type Channel = 'pulse1' | 'pulse2' | 'tri' | 'noise';
export const CHANNELS: Channel[] = ['pulse1', 'pulse2', 'tri', 'noise'];

export interface Pattern {
  pulse1?: string;
  pulse2?: string;
  tri?: string;
  noise?: string;
}
export interface Song {
  name: string;
  bpm: number;
  patterns: Pattern[];
  order: number[];
  /** Pulse duty per channel (0.125, 0.25, 0.5). */
  duty?: { pulse1?: number; pulse2?: number };
}

const NOTE_INDEX: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

export function noteToHz(token: string): number {
  const m = /^([A-G]#?)(\d)$/.exec(token);
  if (!m) throw new Error(`Bad note ${token}`);
  const semis = NOTE_INDEX[m[1]] + (parseInt(m[2], 10) - 4) * 12 - 9; // A4 = 0
  return 440 * Math.pow(2, semis / 12);
}

export interface Step {
  hz: number | null;
  /** duration in 16th steps */
  len: number;
}

/** Parse a note string into steps (pure, tested). */
export function parsePattern(src: string | undefined, length = 16): Step[] {
  const out: Step[] = [];
  const tokens = (src ?? '').trim().split(/\s+/).filter(Boolean);
  for (let i = 0; i < length; i++) {
    const t = tokens[i] ?? '--';
    if (t === '==') {
      if (out.length) out[out.length - 1].len++;
      else out.push({ hz: null, len: 1 });
      continue;
    }
    if (t === '--') {
      out.push({ hz: null, len: 1 });
      continue;
    }
    // noise uses 'N1'..'N9' for pitch bands
    if (/^N\d$/.test(t)) {
      out.push({ hz: parseInt(t[1], 10), len: 1 });
      continue;
    }
    out.push({ hz: noteToHz(t), len: 1 });
  }
  return out;
}

export function patternLength(p: Pattern): number {
  let n = 16;
  for (const c of CHANNELS) {
    const s = p[c];
    if (s) n = Math.max(n, s.trim().split(/\s+/).filter(Boolean).length);
  }
  return n;
}

export interface SfxDef {
  channel: Channel;
  /** Frequency envelope: [startHz, endHz]; for noise, band 1..9. */
  freq: [number, number];
  duration: number;
  volume?: number;
  /** 'exp' slides frequency exponentially, 'step' arpeggiates through freq list. */
  slide?: 'lin' | 'exp';
  arp?: number[];
  duty?: number;
}

export const SFX: Record<string, SfxDef> = {
  jump: { channel: 'pulse1', freq: [220, 660], duration: 0.12, slide: 'exp', duty: 0.25 },
  land: { channel: 'noise', freq: [3, 1], duration: 0.06, volume: 0.35 },
  hit: { channel: 'noise', freq: [6, 2], duration: 0.12, volume: 0.6 },
  hurt: { channel: 'pulse2', freq: [440, 110], duration: 0.3, slide: 'exp', duty: 0.125 },
  swap: { channel: 'pulse2', freq: [330, 330], duration: 0.18, arp: [0, 4, 7, 12], duty: 0.5 },
  pickup: { channel: 'pulse1', freq: [880, 880], duration: 0.22, arp: [0, 7, 12, 19], duty: 0.25 },
  page: { channel: 'pulse1', freq: [523, 523], duration: 0.5, arp: [0, 4, 7, 12, 16, 19], duty: 0.5 },
  shoot: { channel: 'pulse2', freq: [900, 300], duration: 0.08, slide: 'exp', duty: 0.125 },
  charge: { channel: 'pulse2', freq: [200, 1200], duration: 0.5, slide: 'exp', duty: 0.125, volume: 0.3 },
  bomb: { channel: 'noise', freq: [9, 1], duration: 0.4, volume: 0.7 },
  lob: { channel: 'tri', freq: [300, 600], duration: 0.15, slide: 'lin' },
  break: { channel: 'noise', freq: [5, 1], duration: 0.25, volume: 0.6 },
  push: { channel: 'tri', freq: [80, 60], duration: 0.1, volume: 0.4 },
  roar: { channel: 'tri', freq: [160, 40], duration: 0.7, slide: 'exp', volume: 0.9 },
  howl: { channel: 'pulse1', freq: [300, 900], duration: 0.9, slide: 'exp', duty: 0.5, volume: 0.7 },
  bossHit: { channel: 'noise', freq: [8, 3], duration: 0.2, volume: 0.8 },
  bossDie: { channel: 'tri', freq: [400, 30], duration: 1.4, slide: 'exp', volume: 1 },
  stun: { channel: 'pulse2', freq: [660, 660], duration: 0.3, arp: [0, -2, 0, -2, 0, -2], duty: 0.25 },
  menu: { channel: 'pulse1', freq: [660, 660], duration: 0.05, duty: 0.25, volume: 0.5 },
  confirm: { channel: 'pulse1', freq: [660, 660], duration: 0.2, arp: [0, 5, 12], duty: 0.25 },
  checkpoint: { channel: 'pulse1', freq: [440, 440], duration: 0.4, arp: [0, 4, 7, 4, 7, 12], duty: 0.5 },
  tick: { channel: 'noise', freq: [2, 2], duration: 0.03, volume: 0.4 },
  splash: { channel: 'noise', freq: [4, 7], duration: 0.3, volume: 0.5 },
  die: { channel: 'pulse1', freq: [660, 55], duration: 1.0, slide: 'exp', duty: 0.5 },
  portal: { channel: 'tri', freq: [60, 600], duration: 1.5, slide: 'exp', volume: 0.8 },
  thunder: { channel: 'noise', freq: [3, 1], duration: 1.6, volume: 0.9 },
};

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private chanGain: Record<Channel, GainNode> | null = null;
  private duckUntil: Record<Channel, number> = { pulse1: 0, pulse2: 0, tri: 0, noise: 0 };
  private noiseBuf: AudioBuffer | null = null;
  private song: Song | null = null;
  private songPos = 0; // index into order
  private stepPos = 0; // step within pattern
  private nextStepTime = 0;
  private timer = 0;
  musicVolume = 0.6;
  sfxVolume = 0.8;
  muted = false;

  /** Must be called from a user gesture. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.chanGain = { pulse1: this.ctx.createGain(), pulse2: this.ctx.createGain(), tri: this.ctx.createGain(), noise: this.ctx.createGain() };
    for (const c of CHANNELS) this.chanGain[c].connect(this.musicGain);
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    // NES-style 15-bit LFSR noise
    let lfsr = 1;
    for (let i = 0; i < len; i++) {
      const bit = (lfsr ^ (lfsr >> 1)) & 1;
      lfsr = (lfsr >> 1) | (bit << 14);
      d[i] = lfsr & 1 ? 1 : -1;
    }
    this.applyVolumes();
    if (this.song) this.startSequencer();
  }

  applyVolumes(): void {
    if (!this.musicGain || !this.sfxGain || !this.master) return;
    this.master.gain.value = this.muted ? 0 : 1;
    this.musicGain.gain.value = this.musicVolume * 0.25;
    this.sfxGain.gain.value = this.sfxVolume * 0.3;
  }

  playSong(song: Song | null): void {
    if (this.song?.name === song?.name) return;
    this.song = song;
    this.songPos = 0;
    this.stepPos = 0;
    if (this.ctx) {
      this.stopSequencer();
      if (song) this.startSequencer();
    }
  }

  get currentSong(): string | null {
    return this.song?.name ?? null;
  }

  private startSequencer(): void {
    if (!this.ctx) return;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.schedule();
    this.timer = window.setInterval(() => this.schedule(), 40);
  }
  private stopSequencer(): void {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = 0;
  }

  private schedule(): void {
    const ctx = this.ctx;
    const song = this.song;
    if (!ctx || !song) return;
    const stepDur = 60 / song.bpm / 4;
    while (this.nextStepTime < ctx.currentTime + 0.15) {
      const pat = song.patterns[song.order[this.songPos % song.order.length]];
      const len = patternLength(pat);
      for (const c of CHANNELS) {
        const steps = parsePattern(pat[c], len);
        // find the step covering stepPos and whether it starts here
        let acc = 0;
        for (const s of steps) {
          if (acc === this.stepPos) {
            if (s.hz !== null) this.voice(c, s.hz, this.nextStepTime, s.len * stepDur * 0.95, song.duty?.[c === 'pulse1' ? 'pulse1' : 'pulse2'] ?? 0.5, this.chanGain![c]);
            break;
          }
          acc += s.len;
          if (acc > this.stepPos) break;
        }
      }
      this.stepPos++;
      if (this.stepPos >= len) {
        this.stepPos = 0;
        this.songPos = (this.songPos + 1) % song.order.length;
      }
      this.nextStepTime += stepDur;
    }
  }

  /** Create a voice on a channel type. Pulse uses a PeriodicWave for the duty. */
  private voice(c: Channel, hz: number, t: number, dur: number, duty: number, dest: AudioNode, vol = 1, slideTo?: number, slide?: 'lin' | 'exp'): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.connect(dest);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.setValueAtTime(vol, t + Math.max(0.006, dur - 0.02));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    if (c === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      // band 1..9 maps to playback rate
      const band = Math.max(1, Math.min(9, hz));
      src.playbackRate.setValueAtTime(band / 9, t);
      if (slideTo !== undefined) src.playbackRate.linearRampToValueAtTime(Math.max(1, Math.min(9, slideTo)) / 9, t + dur);
      src.connect(g);
      src.start(t);
      src.stop(t + dur + 0.01);
      return;
    }
    const osc = ctx.createOscillator();
    if (c === 'tri') osc.type = 'triangle';
    else osc.setPeriodicWave(this.pulseWave(duty));
    osc.frequency.setValueAtTime(hz, t);
    if (slideTo !== undefined) {
      if (slide === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
      else osc.frequency.linearRampToValueAtTime(slideTo, t + dur);
    }
    osc.connect(g);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  private waves = new Map<number, PeriodicWave>();
  private pulseWave(duty: number): PeriodicWave {
    let w = this.waves.get(duty);
    if (w) return w;
    const n = 32;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) {
      // Fourier series of a pulse wave with the given duty
      real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      imag[k] = 0;
    }
    w = this.ctx!.createPeriodicWave(real, imag, { disableNormalization: false });
    this.waves.set(duty, w);
    return w;
  }

  play(name: keyof typeof SFX | string): void {
    const def = SFX[name as keyof typeof SFX];
    if (!def || !this.ctx || !this.sfxGain || this.muted) return;
    const t = this.ctx.currentTime;
    const vol = def.volume ?? 0.8;
    // Channel budget: duck the music channel for the SFX duration.
    const cg = this.chanGain![def.channel].gain;
    cg.cancelScheduledValues(t);
    cg.setValueAtTime(0.15, t);
    cg.setValueAtTime(1, t + def.duration);
    this.duckUntil[def.channel] = t + def.duration;
    if (def.arp) {
      const step = def.duration / def.arp.length;
      def.arp.forEach((semi, i) => {
        const hz = def.freq[0] * Math.pow(2, semi / 12);
        this.voice(def.channel, hz, t + i * step, step, def.duty ?? 0.5, this.sfxGain!, vol);
      });
      return;
    }
    this.voice(def.channel, def.freq[0], t, def.duration, def.duty ?? 0.5, this.sfxGain, vol, def.freq[1], def.slide ?? 'lin');
  }
}

/** Shared engine instance; scenes call `audio.play('jump')`. */
export const audio = new AudioEngine();
