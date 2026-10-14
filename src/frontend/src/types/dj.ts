/**
 * Shared DJ cabin types.
 *
 * These describe the front-end domain model for the two-deck cabin, the
 * central mixer, the performance pads and the recording pipeline. Backend
 * records (Track / Sample) are mapped into these shapes by the audio layer.
 */

export type DeckId = "A" | "B";

/** Performance pad tabs. */
export type PadTab = "CUE" | "SMP" | "SCRT" | "STEMS";

/** Stem bands approximated through EQ isolation. */
export type StemBand = "vocal" | "drums" | "bass" | "melody";

/** A track available to load into a deck. */
export interface DemoTrack {
  /** Stable identity, unique across the catalog. */
  id: string;
  name: string;
  artist: string;
  /** Duration in milliseconds. */
  durationMs: number;
  /** Publicly reachable, CORS-enabled audio URL. */
  url: string;
  /** Nominal tempo used to seed the deck BPM readout. */
  bpm: number;
  /** Accent family the track is tinted with in the library. */
  accent: DeckId;
}

/** A pad sample assigned to one of the eight slots. */
export interface PadSample {
  /** Slot index 0..7. */
  slot: number;
  name: string;
  /** Publicly reachable, CORS-enabled audio URL. */
  url: string;
}

/** A hot cue marker on a deck timeline. */
export interface CuePoint {
  /** Slot index 0..7. */
  slot: number;
  /** Position in seconds. */
  position: number;
}

/** Per-deck FX unit state. */
export interface FxState {
  /** Whether the FX unit is engaged. */
  active: boolean;
  /** Intensity 0..1. */
  amount: number;
}

/** Deck A FX names. */
export type DeckAFx = "echo" | "flanger" | "bandpass";
/** Deck B FX names. */
export type DeckBFx = "filter-lp" | "filter-hp" | "bandpass";

/** Three-band EQ values, each 0..1 with 0.5 as unity. */
export interface EqState {
  high: number;
  mid: number;
  low: number;
}

/** Full runtime state for one deck. */
export interface DeckState {
  id: DeckId;
  /** Currently loaded track, or null when the deck is empty. */
  track: DemoTrack | null;
  playing: boolean;
  /** Playhead position in seconds. */
  position: number;
  /** Track duration in seconds (0 when empty). */
  duration: number;
  /** Effective BPM after pitch adjustment. */
  bpm: number;
  /** Pitch adjustment as a multiplier (1 = original tempo). */
  pitch: number;
  /** Channel fader 0..1. */
  volume: number;
  /** Input gain 0..2 (1 = unity). */
  gain: number;
  eq: EqState;
  /** Filter sweep 0..1 with 0.5 as neutral. */
  filter: number;
  /** Active FX unit name, or null. */
  fx: string | null;
  fxState: FxState;
  /** Hot cues indexed by slot. */
  cues: CuePoint[];
  /** Pad samples indexed by slot. */
  samples: PadSample[];
  /** Stem isolation flags. */
  stems: Record<StemBand, boolean>;
  /** Deck mode toggles. */
  modes: DeckModes;
}

/** Deck mode toggles shown as hardware buttons. */
export interface DeckModes {
  slip: boolean;
  beat: boolean;
  qntz: boolean;
  pitch: boolean;
}

/** Master bus state. */
export interface MasterState {
  /** Crossfader 0 (full A) .. 1 (full B). */
  crossfader: number;
  /** Master output level 0..1. */
  volume: number;
}

/** Recording pipeline state. */
export interface RecorderState {
  recording: boolean;
  /** Elapsed recording time in seconds. */
  elapsed: number;
  /** Object URL of the finished recording, or null. */
  downloadUrl: string | null;
  /** Suggested filename for the finished recording. */
  filename: string | null;
}

/** Actions exposed by the audio provider. */
export interface AudioActions {
  load: (deck: DeckId, track: DemoTrack) => void;
  play: (deck: DeckId) => void;
  pause: (deck: DeckId) => void;
  cue: (deck: DeckId) => void;
  sync: (deck: DeckId) => void;
  seek: (deck: DeckId, position: number) => void;
  setPitch: (deck: DeckId, pitch: number) => void;
  setVolume: (deck: DeckId, volume: number) => void;
  setGain: (deck: DeckId, gain: number) => void;
  setEq: (deck: DeckId, band: keyof EqState, value: number) => void;
  setFilter: (deck: DeckId, value: number) => void;
  setCrossfader: (value: number) => void;
  setMasterVolume: (value: number) => void;
  setFx: (deck: DeckId, fx: string | null) => void;
  setFxAmount: (deck: DeckId, amount: number) => void;
  toggleMode: (deck: DeckId, mode: keyof DeckModes) => void;
  triggerSample: (deck: DeckId, slot: number) => void;
  /** Replace the in-memory sample assigned to a pad slot. */
  setSample: (deck: DeckId, slot: number, sample: PadSample) => void;
  setCue: (deck: DeckId, slot: number) => void;
  jumpCue: (deck: DeckId, slot: number) => void;
  scratch: (deck: DeckId, active: boolean) => void;
  toggleStem: (deck: DeckId, band: StemBand) => void;
  startRecording: () => void;
  stopRecording: () => void;
  /** Resume the AudioContext from a user gesture. */
  unlock: () => void;
}

/** Value exposed by the audio context. */
export interface AudioContextValue {
  decks: Record<DeckId, DeckState>;
  master: MasterState;
  recorder: RecorderState;
  /** True once the AudioContext has been created and resumed. */
  ready: boolean;
  actions: AudioActions;
}
