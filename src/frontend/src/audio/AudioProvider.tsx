/**
 * AudioProvider — React context that owns the cabin state and drives the
 * shared Web Audio engine.
 *
 * Deck state lives in React so the UI re-renders on every change, while the
 * engine holds the actual audio graph. Actions are stable across renders and
 * never throw when no track is loaded or the context is not yet unlocked.
 */

import { audioEngine } from "@/audio/engine";
import { DEFAULT_SAMPLES } from "@/data/demoTracks";
import type {
  AudioActions,
  AudioContextValue,
  DeckId,
  DeckModes,
  DeckState,
  DemoTrack,
  EqState,
  MasterState,
  PadSample,
  RecorderState,
  StemBand,
} from "@/types/dj";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const AudioCtx = createContext<AudioContextValue | null>(null);

const DEFAULT_MODES: DeckModes = {
  slip: false,
  beat: true,
  qntz: true,
  pitch: false,
};

const DEFAULT_EQ: EqState = { high: 0.5, mid: 0.5, low: 0.5 };

function createDeck(id: DeckId): DeckState {
  return {
    id,
    track: null,
    playing: false,
    position: 0,
    duration: 0,
    bpm: 0,
    pitch: 1,
    volume: 0.85,
    gain: 1,
    eq: { ...DEFAULT_EQ },
    filter: 0.5,
    fx: null,
    fxState: { active: false, amount: 0.5 },
    cues: [],
    samples: DEFAULT_SAMPLES.map((sample) => ({ ...sample })),
    stems: { vocal: false, drums: false, bass: false, melody: false },
    modes: { ...DEFAULT_MODES },
  };
}

/** Clamp a number into an inclusive range. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const [decks, setDecks] = useState<Record<DeckId, DeckState>>(() => ({
    A: createDeck("A"),
    B: createDeck("B"),
  }));
  const [master, setMaster] = useState<MasterState>({
    crossfader: 0.5,
    volume: 0.9,
  });
  const [recorder, setRecorder] = useState<RecorderState>({
    recording: false,
    elapsed: 0,
    downloadUrl: null,
    filename: null,
  });
  const [ready, setReady] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  /** Mirror of `decks` so callbacks can read current state without re-creating. */
  const decksRef = useRef(decks);
  decksRef.current = decks;

  /** Patch a single deck's state immutably. */
  const patchDeck = useCallback((deck: DeckId, patch: Partial<DeckState>) => {
    setDecks((prev) => ({ ...prev, [deck]: { ...prev[deck], ...patch } }));
  }, []);

  /** Create/resume the AudioContext from a user gesture. */
  const unlock = useCallback(() => {
    void audioEngine.ensureContext().then(() => setReady(true));
  }, []);

  // Drive the playhead readout while any deck is playing.
  useEffect(() => {
    const anyPlaying = decks.A.playing || decks.B.playing;
    if (!anyPlaying) return;
    const interval = window.setInterval(() => {
      setDecks((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const id of ["A", "B"] as DeckId[]) {
          const deck = prev[id];
          if (!deck.playing) continue;
          const position = audioEngine.getPosition(id);
          if (position >= deck.duration && deck.duration > 0) {
            audioEngine.pause(id);
            next[id] = { ...deck, playing: false, position: deck.duration };
          } else {
            next[id] = { ...deck, position };
          }
          changed = true;
        }
        return changed ? next : prev;
      });
    }, 100);
    return () => window.clearInterval(interval);
  }, [decks.A.playing, decks.B.playing]);

  // Track recording elapsed time.
  useEffect(() => {
    if (!recorder.recording) return;
    const interval = window.setInterval(() => {
      setRecorder((prev) => ({
        ...prev,
        elapsed: (performance.now() - startedAtRef.current) / 1000,
      }));
    }, 250);
    return () => window.clearInterval(interval);
  }, [recorder.recording]);

  const load = useCallback(
    (deck: DeckId, track: DemoTrack) => {
      void audioEngine.ensureContext().then(async () => {
        setReady(true);
        const buffer = await audioEngine.loadBuffer(track.url);
        audioEngine.setDeckBuffer(deck, buffer);
        patchDeck(deck, {
          track,
          playing: false,
          position: 0,
          duration: buffer ? buffer.duration : track.durationMs / 1000,
          bpm: track.bpm,
          pitch: 1,
          cues: [],
        });
        audioEngine.setRate(deck, 1);
      });
    },
    [patchDeck],
  );

  const play = useCallback((deck: DeckId) => {
    void audioEngine.ensureContext().then(() => {
      setReady(true);
      setDecks((prev) => {
        const current = prev[deck];
        if (!current.track) return prev;
        const offset =
          current.position >= current.duration ? 0 : current.position;
        audioEngine.play(deck, offset);
        return {
          ...prev,
          [deck]: { ...current, playing: true, position: offset },
        };
      });
    });
  }, []);

  const pause = useCallback((deck: DeckId) => {
    audioEngine.pause(deck);
    setDecks((prev) => {
      const current = prev[deck];
      return {
        ...prev,
        [deck]: {
          ...current,
          playing: false,
          position: audioEngine.getPosition(deck),
        },
      };
    });
  }, []);

  const cue = useCallback(
    (deck: DeckId) => {
      audioEngine.pause(deck);
      patchDeck(deck, { playing: false, position: 0 });
    },
    [patchDeck],
  );

  const sync = useCallback((deck: DeckId) => {
    setDecks((prev) => {
      const other: DeckId = deck === "A" ? "B" : "A";
      const target = prev[other].bpm;
      const current = prev[deck];
      if (!current.track || target <= 0) return prev;
      const pitch = clamp(target / current.bpm, 0.5, 2);
      audioEngine.setRate(deck, pitch);
      return { ...prev, [deck]: { ...current, pitch, bpm: target } };
    });
  }, []);

  const seek = useCallback((deck: DeckId, position: number) => {
    setDecks((prev) => {
      const current = prev[deck];
      if (!current.track) return prev;
      const clamped = clamp(position, 0, current.duration);
      if (current.playing) {
        audioEngine.play(deck, clamped);
      } else {
        audioEngine.pause(deck);
      }
      return { ...prev, [deck]: { ...current, position: clamped } };
    });
  }, []);

  const setPitch = useCallback((deck: DeckId, pitch: number) => {
    const clamped = clamp(pitch, 0.5, 2);
    audioEngine.setRate(deck, clamped);
    setDecks((prev) => {
      const current = prev[deck];
      const baseBpm = current.track?.bpm ?? current.bpm;
      return {
        ...prev,
        [deck]: {
          ...current,
          pitch: clamped,
          bpm: Math.round(baseBpm * clamped * 10) / 10,
        },
      };
    });
  }, []);

  const setVolume = useCallback(
    (deck: DeckId, volume: number) => {
      const clamped = clamp(volume, 0, 1);
      audioEngine.setChannelGain(deck, clamped);
      patchDeck(deck, { volume: clamped });
    },
    [patchDeck],
  );

  const setGain = useCallback(
    (deck: DeckId, gain: number) => {
      const clamped = clamp(gain, 0, 2);
      audioEngine.setInputGain(deck, clamped);
      patchDeck(deck, { gain: clamped });
    },
    [patchDeck],
  );

  const setEq = useCallback(
    (deck: DeckId, band: keyof EqState, value: number) => {
      const clamped = clamp(value, 0, 1);
      audioEngine.setEq(deck, band, clamped);
      setDecks((prev) => ({
        ...prev,
        [deck]: { ...prev[deck], eq: { ...prev[deck].eq, [band]: clamped } },
      }));
    },
    [],
  );

  const setFilter = useCallback(
    (deck: DeckId, value: number) => {
      const clamped = clamp(value, 0, 1);
      audioEngine.setFilter(deck, clamped);
      patchDeck(deck, { filter: clamped });
    },
    [patchDeck],
  );

  const setCrossfader = useCallback((value: number) => {
    const clamped = clamp(value, 0, 1);
    audioEngine.setCrossfader(clamped);
    setMaster((prev) => ({ ...prev, crossfader: clamped }));
  }, []);

  const setMasterVolume = useCallback((value: number) => {
    const clamped = clamp(value, 0, 1);
    audioEngine.setMasterVolume(clamped);
    setMaster((prev) => ({ ...prev, volume: clamped }));
  }, []);

  const setFx = useCallback((deck: DeckId, fx: string | null) => {
    setDecks((prev) => {
      const current = prev[deck];
      const active = fx !== null;
      audioEngine.setFx(deck, active, current.fxState.amount);
      return {
        ...prev,
        [deck]: { ...current, fx, fxState: { ...current.fxState, active } },
      };
    });
  }, []);

  const setFxAmount = useCallback((deck: DeckId, amount: number) => {
    const clamped = clamp(amount, 0, 1);
    setDecks((prev) => {
      const current = prev[deck];
      audioEngine.setFx(deck, current.fxState.active, clamped);
      return {
        ...prev,
        [deck]: {
          ...current,
          fxState: { ...current.fxState, amount: clamped },
        },
      };
    });
  }, []);

  const toggleMode = useCallback((deck: DeckId, mode: keyof DeckModes) => {
    setDecks((prev) => ({
      ...prev,
      [deck]: {
        ...prev[deck],
        modes: { ...prev[deck].modes, [mode]: !prev[deck].modes[mode] },
      },
    }));
  }, []);

  const triggerSample = useCallback((deck: DeckId, slot: number) => {
    const sample = decksRef.current[deck].samples[slot];
    if (!sample) return;
    void audioEngine.ensureContext().then(async () => {
      const buffer = await audioEngine.loadBuffer(sample.url);
      if (buffer) audioEngine.playSample(deck, buffer, 0.9);
    });
  }, []);

  const setSample = useCallback(
    (deck: DeckId, slot: number, sample: PadSample) => {
      setDecks((prev) => {
        const current = prev[deck];
        const samples = current.samples.map((entry) =>
          entry.slot === slot ? { ...sample, slot } : entry,
        );
        return { ...prev, [deck]: { ...current, samples } };
      });
    },
    [],
  );

  const setCue = useCallback((deck: DeckId, slot: number) => {
    setDecks((prev) => {
      const current = prev[deck];
      if (!current.track) return prev;
      const cues = current.cues.filter((cuePoint) => cuePoint.slot !== slot);
      cues.push({ slot, position: current.position });
      cues.sort((a, b) => a.slot - b.slot);
      return { ...prev, [deck]: { ...current, cues } };
    });
  }, []);

  const jumpCue = useCallback((deck: DeckId, slot: number) => {
    setDecks((prev) => {
      const current = prev[deck];
      const cuePoint = current.cues.find((entry) => entry.slot === slot);
      if (!cuePoint) return prev;
      if (current.playing) {
        audioEngine.play(deck, cuePoint.position);
      } else {
        audioEngine.pause(deck);
      }
      return { ...prev, [deck]: { ...current, position: cuePoint.position } };
    });
  }, []);

  const scratch = useCallback((deck: DeckId, active: boolean) => {
    audioEngine.setScratch(deck, active);
  }, []);

  const toggleStem = useCallback((deck: DeckId, band: StemBand) => {
    setDecks((prev) => {
      const current = prev[deck];
      const stems = { ...current.stems, [band]: !current.stems[band] };
      // Approximate stem isolation through EQ: muting a band pulls its EQ down.
      const eq = { ...current.eq };
      if (band === "vocal") eq.high = stems.vocal ? 0.15 : 0.5;
      if (band === "melody") eq.mid = stems.melody ? 0.2 : 0.5;
      if (band === "bass") eq.low = stems.bass ? 0.1 : 0.5;
      if (band === "drums") {
        eq.low = stems.drums ? 0.15 : eq.low;
        eq.high = stems.drums ? 0.2 : eq.high;
      }
      audioEngine.setEq(deck, "high", eq.high);
      audioEngine.setEq(deck, "mid", eq.mid);
      audioEngine.setEq(deck, "low", eq.low);
      return { ...prev, [deck]: { ...current, stems, eq } };
    });
  }, []);

  const startRecording = useCallback(() => {
    void audioEngine.ensureContext().then(() => {
      setReady(true);
      const stream = audioEngine.getStream();
      if (!stream || recorderRef.current) return;
      try {
        const recorderInstance = new MediaRecorder(stream);
        chunksRef.current = [];
        recorderInstance.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorderInstance.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const url = URL.createObjectURL(blob);
          const stamp = new Date().toISOString().replace(/[:.]/g, "-");
          setRecorder((prev) => ({
            ...prev,
            recording: false,
            downloadUrl: url,
            filename: `cabin-mix-${stamp}.webm`,
          }));
          recorderRef.current = null;
        };
        recorderInstance.start();
        recorderRef.current = recorderInstance;
        startedAtRef.current = performance.now();
        setRecorder({
          recording: true,
          elapsed: 0,
          downloadUrl: null,
          filename: null,
        });
      } catch {
        recorderRef.current = null;
      }
    });
  }, []);

  const stopRecording = useCallback(() => {
    const recorderInstance = recorderRef.current;
    if (!recorderInstance) return;
    recorderInstance.stop();
  }, []);

  const actions = useMemo<AudioActions>(
    () => ({
      load,
      play,
      pause,
      cue,
      sync,
      seek,
      setPitch,
      setVolume,
      setGain,
      setEq,
      setFilter,
      setCrossfader,
      setMasterVolume,
      setFx,
      setFxAmount,
      toggleMode,
      triggerSample,
      setSample,
      setCue,
      jumpCue,
      scratch,
      toggleStem,
      startRecording,
      stopRecording,
      unlock,
    }),
    [
      load,
      play,
      pause,
      cue,
      sync,
      seek,
      setPitch,
      setVolume,
      setGain,
      setEq,
      setFilter,
      setCrossfader,
      setMasterVolume,
      setFx,
      setFxAmount,
      toggleMode,
      triggerSample,
      setSample,
      setCue,
      jumpCue,
      scratch,
      toggleStem,
      startRecording,
      stopRecording,
      unlock,
    ],
  );

  const value = useMemo<AudioContextValue>(
    () => ({ decks, master, recorder, ready, actions }),
    [decks, master, recorder, ready, actions],
  );

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

/** Access the cabin audio context. Throws outside the provider. */
export function useAudio(): AudioContextValue {
  const context = useContext(AudioCtx);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
}
