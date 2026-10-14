/**
 * Shared Web Audio engine for the DJ cabin.
 *
 * Owns a single AudioContext and the full signal graph:
 *
 *   deck source -> deck gain -> 3-band EQ -> filter -> FX -> channel gain
 *     -> crossfader gain -> master gain -> analyser -> destination
 *                                        \-> MediaStreamDestination (REC)
 *
 * The engine is deliberately defensive: every public method is a no-op when
 * the context has not been created yet or when a deck has no track loaded, so
 * the UI can call it freely before the first user gesture.
 */

import type { DeckId, EqState } from "@/types/dj";

/** Per-deck audio nodes. */
interface DeckNodes {
  /** Gain applied to the source (channel fader). */
  channelGain: GainNode;
  /** Input gain node. */
  inputGain: GainNode;
  /** Three-band EQ nodes. */
  eqHigh: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqLow: BiquadFilterNode;
  /** Sweep filter. */
  filter: BiquadFilterNode;
  /** FX wet/dry mix. */
  fxSend: GainNode;
  fxReturn: GainNode;
  fxDelay: DelayNode;
  fxFeedback: GainNode;
  /** Crossfader contribution. */
  crossGain: GainNode;
  /** Currently playing source, if any. */
  source: AudioBufferSourceNode | null;
  /** Decoded buffer for the loaded track. */
  buffer: AudioBuffer | null;
  /** Context time when playback started. */
  startedAt: number;
  /** Offset into the buffer when playback started. */
  startOffset: number;
  /** Playback rate multiplier. */
  rate: number;
  /** Temporary scratch rate multiplier for this deck. */
  scratchRate: number;
}

const EQ_UNITY = 0.5;
const FILTER_NEUTRAL = 0.5;

/** Map a 0..1 EQ value to a gain in dB (-26 .. +6). */
function eqToDb(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return (clamped - EQ_UNITY) * 2 * 32;
}

/** Map a 0..1 filter value to a cutoff frequency. */
function filterToHz(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  if (clamped < FILTER_NEUTRAL) {
    // Low-pass sweep from 20 kHz down to 200 Hz.
    const t = clamped / FILTER_NEUTRAL;
    return 200 + t * t * 19800;
  }
  // High-pass sweep from 20 Hz up to 8 kHz.
  const t = (clamped - FILTER_NEUTRAL) / FILTER_NEUTRAL;
  return 20 + t * t * 7980;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private decks: Record<DeckId, DeckNodes> | null = null;
  private buffers = new Map<string, AudioBuffer>();

  /** Create the AudioContext and graph. Safe to call repeatedly. */
  async ensureContext(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        await this.ctx.resume();
      }
      return;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.9;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.75;
    const streamDest = ctx.createMediaStreamDestination();

    master.connect(analyser);
    analyser.connect(ctx.destination);
    master.connect(streamDest);

    this.masterGain = master;
    this.analyser = analyser;
    this.streamDest = streamDest;
    this.decks = {
      A: this.createDeckNodes(ctx, master),
      B: this.createDeckNodes(ctx, master),
    };

    if (ctx.state === "suspended") {
      await ctx.resume();
    }
  }

  private createDeckNodes(ctx: AudioContext, master: GainNode): DeckNodes {
    const inputGain = ctx.createGain();
    const eqHigh = ctx.createBiquadFilter();
    eqHigh.type = "highshelf";
    eqHigh.frequency.value = 3200;
    const eqMid = ctx.createBiquadFilter();
    eqMid.type = "peaking";
    eqMid.frequency.value = 1000;
    eqMid.Q.value = 0.9;
    const eqLow = ctx.createBiquadFilter();
    eqLow.type = "lowshelf";
    eqLow.frequency.value = 250;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 20000;
    filter.Q.value = 0.7;

    const fxSend = ctx.createGain();
    fxSend.gain.value = 0;
    const fxReturn = ctx.createGain();
    fxReturn.gain.value = 1;
    const fxDelay = ctx.createDelay(1.5);
    fxDelay.delayTime.value = 0.28;
    const fxFeedback = ctx.createGain();
    fxFeedback.gain.value = 0.35;

    const channelGain = ctx.createGain();
    channelGain.gain.value = 0.85;
    const crossGain = ctx.createGain();
    crossGain.gain.value = 1;

    inputGain.connect(eqHigh);
    eqHigh.connect(eqMid);
    eqMid.connect(eqLow);
    eqLow.connect(filter);
    filter.connect(channelGain);
    // Dry path.
    channelGain.connect(crossGain);
    // FX path.
    channelGain.connect(fxSend);
    fxSend.connect(fxDelay);
    fxDelay.connect(fxFeedback);
    fxFeedback.connect(fxDelay);
    fxDelay.connect(fxReturn);
    fxReturn.connect(crossGain);
    crossGain.connect(master);

    return {
      channelGain,
      inputGain,
      eqHigh,
      eqMid,
      eqLow,
      filter,
      fxSend,
      fxReturn,
      fxDelay,
      fxFeedback,
      crossGain,
      source: null,
      buffer: null,
      startedAt: 0,
      startOffset: 0,
      rate: 1,
      scratchRate: 1,
    };
  }

  /** Decode and cache an audio file. Returns null on failure. */
  async loadBuffer(url: string): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(url);
    if (cached) return cached;
    if (!this.ctx) return null;
    try {
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) return null;
      const bytes = await response.arrayBuffer();
      const buffer = await this.ctx.decodeAudioData(bytes);
      this.buffers.set(url, buffer);
      return buffer;
    } catch {
      return null;
    }
  }

  /** Attach a decoded buffer to a deck without starting playback. */
  setDeckBuffer(deck: DeckId, buffer: AudioBuffer | null): void {
    const nodes = this.decks?.[deck];
    if (!nodes) return;
    this.stopSource(deck);
    nodes.buffer = buffer;
    nodes.startOffset = 0;
    nodes.startedAt = 0;
  }

  private stopSource(deck: DeckId): void {
    const nodes = this.decks?.[deck];
    if (!nodes?.source) return;
    try {
      nodes.source.onended = null;
      nodes.source.stop();
    } catch {
      // Already stopped.
    }
    nodes.source = null;
  }

  /** Start playback on a deck from its current offset. */
  play(deck: DeckId, offset: number): void {
    const ctx = this.ctx;
    const nodes = this.decks?.[deck];
    if (!ctx || !nodes?.buffer) return;
    this.stopSource(deck);
    const source = ctx.createBufferSource();
    source.buffer = nodes.buffer;
    source.playbackRate.value = nodes.rate * nodes.scratchRate;
    source.connect(nodes.inputGain);
    const safeOffset = Math.min(Math.max(0, offset), nodes.buffer.duration);
    source.start(0, safeOffset);
    nodes.source = source;
    nodes.startedAt = ctx.currentTime;
    nodes.startOffset = safeOffset;
  }

  /** Stop playback on a deck. */
  pause(deck: DeckId): void {
    this.stopSource(deck);
  }

  /** Current playhead position in seconds. */
  getPosition(deck: DeckId): number {
    const ctx = this.ctx;
    const nodes = this.decks?.[deck];
    if (!ctx || !nodes) return 0;
    if (!nodes.source) return nodes.startOffset;
    const elapsed = (ctx.currentTime - nodes.startedAt) * nodes.rate;
    const duration = nodes.buffer?.duration ?? 0;
    return Math.min(nodes.startOffset + elapsed, duration);
  }

  /** Set the playback rate multiplier for a deck. */
  setRate(deck: DeckId, rate: number): void {
    const nodes = this.decks?.[deck];
    if (!nodes) return;
    nodes.rate = rate;
    if (nodes.source) {
      nodes.source.playbackRate.value = rate * nodes.scratchRate;
    }
  }

  /** Apply a temporary scratch rate multiplier to a single deck. */
  setScratch(deck: DeckId, active: boolean): void {
    const nodes = this.decks?.[deck];
    if (!nodes) return;
    nodes.scratchRate = active ? 0.35 : 1;
    if (nodes.source) {
      nodes.source.playbackRate.value = nodes.rate * nodes.scratchRate;
    }
  }

  setChannelGain(deck: DeckId, value: number): void {
    const nodes = this.decks?.[deck];
    if (nodes) nodes.channelGain.gain.value = value;
  }

  setInputGain(deck: DeckId, value: number): void {
    const nodes = this.decks?.[deck];
    if (nodes) nodes.inputGain.gain.value = value;
  }

  setEq(deck: DeckId, band: keyof EqState, value: number): void {
    const nodes = this.decks?.[deck];
    if (!nodes) return;
    const db = eqToDb(value);
    if (band === "high") nodes.eqHigh.gain.value = db;
    else if (band === "mid") nodes.eqMid.gain.value = db;
    else nodes.eqLow.gain.value = db;
  }

  setFilter(deck: DeckId, value: number): void {
    const nodes = this.decks?.[deck];
    if (!nodes) return;
    nodes.filter.frequency.value = filterToHz(value);
  }

  setCrossfader(value: number): void {
    if (!this.decks) return;
    const clamped = Math.min(1, Math.max(0, value));
    // Equal-power crossfade.
    this.decks.A.crossGain.gain.value = Math.cos((clamped * Math.PI) / 2);
    this.decks.B.crossGain.gain.value = Math.sin((clamped * Math.PI) / 2);
  }

  setMasterVolume(value: number): void {
    if (this.masterGain) this.masterGain.gain.value = value;
  }

  /** Configure the FX send for a deck. */
  setFx(deck: DeckId, active: boolean, amount: number): void {
    const nodes = this.decks?.[deck];
    if (!nodes) return;
    nodes.fxSend.gain.value = active ? amount * 0.9 : 0;
    nodes.fxFeedback.gain.value = active ? 0.2 + amount * 0.45 : 0.35;
  }

  /** Play a one-shot sample through a deck's channel. */
  playSample(deck: DeckId, buffer: AudioBuffer, volume: number): void {
    const ctx = this.ctx;
    const nodes = this.decks?.[deck];
    if (!ctx || !nodes) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(nodes.inputGain);
    source.start(0);
  }

  /** Read the current master level 0..1 for the VU meter. */
  getLevel(): number {
    if (!this.analyser) return 0;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    let peak = 0;
    for (let i = 0; i < data.length; i += 1) {
      const v = Math.abs(data[i] - 128) / 128;
      if (v > peak) peak = v;
    }
    return Math.min(1, peak * 1.4);
  }

  /** The MediaStream carrying the master mix, for MediaRecorder. */
  getStream(): MediaStream | null {
    return this.streamDest?.stream ?? null;
  }

  /** Release all resources. */
  dispose(): void {
    this.stopSource("A");
    this.stopSource("B");
    void this.ctx?.close();
    this.ctx = null;
    this.decks = null;
    this.masterGain = null;
    this.analyser = null;
    this.streamDest = null;
    this.buffers.clear();
  }
}

/** Singleton engine shared by the whole cabin. */
export const audioEngine = new AudioEngine();
