/**
 * AudioProvider domain tests.
 *
 * The provider owns the cabin state and drives the shared Web Audio engine.
 * These tests mount it with a probe component that exposes the state and
 * actions, and mock the engine module so no real AudioContext is required.
 * They assert the observable state transitions the acceptance criteria depend
 * on: SYNC matching BPMs, pitch updating the shown BPM, crossfader position,
 * hot cues, stem isolation, sample triggering and mode toggles.
 */

import { AudioProvider, useAudio } from "@/audio/AudioProvider";
import type { DemoTrack } from "@/types/dj";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const engineMock = vi.hoisted(() => ({
  ensureContext: vi.fn(async () => {}),
  loadBuffer: vi.fn(async () => ({ duration: 120 }) as unknown as AudioBuffer),
  setDeckBuffer: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  getPosition: vi.fn(() => 0),
  setRate: vi.fn(),
  setScratch: vi.fn(),
  setChannelGain: vi.fn(),
  setInputGain: vi.fn(),
  setEq: vi.fn(),
  setFilter: vi.fn(),
  setCrossfader: vi.fn(),
  setMasterVolume: vi.fn(),
  setFx: vi.fn(),
  playSample: vi.fn(),
  getLevel: vi.fn(() => 0),
  getStream: vi.fn(() => null),
  dispose: vi.fn(),
}));

vi.mock("@/audio/engine", () => ({ audioEngine: engineMock }));

const TRACK_A: DemoTrack = {
  id: "neon-drive",
  name: "Neon Drive",
  artist: "Pixabay Audio",
  durationMs: 120_000,
  url: "https://example.test/a.mp3",
  bpm: 124,
  accent: "A",
};

const TRACK_B: DemoTrack = {
  id: "midnight-circuit",
  name: "Midnight Circuit",
  artist: "Pixabay Audio",
  durationMs: 120_000,
  url: "https://example.test/b.mp3",
  bpm: 128,
  accent: "B",
};

/** Probe that renders the state and exposes action buttons. */
function Probe() {
  const { decks, master, actions } = useAudio();
  return (
    <div>
      <span data-ocid="probe.bpm-a">{decks.A.bpm}</span>
      <span data-ocid="probe.bpm-b">{decks.B.bpm}</span>
      <span data-ocid="probe.pitch-a">{decks.A.pitch}</span>
      <span data-ocid="probe.crossfader">{master.crossfader}</span>
      <span data-ocid="probe.cues-a">{decks.A.cues.length}</span>
      <span data-ocid="probe.stem-vocal-a">{String(decks.A.stems.vocal)}</span>
      <span data-ocid="probe.eq-high-a">{decks.A.eq.high}</span>
      <span data-ocid="probe.mode-slip-a">{String(decks.A.modes.slip)}</span>
      <span data-ocid="probe.volume-a">{decks.A.volume}</span>
      <button type="button" onClick={() => actions.load("A", TRACK_A)}>
        load-a
      </button>
      <button type="button" onClick={() => actions.load("B", TRACK_B)}>
        load-b
      </button>
      <button type="button" onClick={() => actions.sync("B")}>
        sync-b
      </button>
      <button type="button" onClick={() => actions.setPitch("A", 1.5)}>
        pitch-a-150
      </button>
      <button type="button" onClick={() => actions.setCrossfader(0)}>
        cross-left
      </button>
      <button type="button" onClick={() => actions.setCue("A", 0)}>
        cue-a-0
      </button>
      <button type="button" onClick={() => actions.toggleStem("A", "vocal")}>
        stem-vocal-a
      </button>
      <button type="button" onClick={() => actions.toggleMode("A", "slip")}>
        mode-slip-a
      </button>
      <button type="button" onClick={() => actions.setVolume("A", 0.3)}>
        volume-a-30
      </button>
      <button type="button" onClick={() => actions.triggerSample("A", 0)}>
        sample-a-0
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AudioProvider>
      <Probe />
    </AudioProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AudioProvider", () => {
  it("loads a track and seeds the deck BPM from the track", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByText("load-a"));
    expect(await screen.findByText("124")).toBeInTheDocument();
  });

  it("SYNC matches the deck BPM to the other deck", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByText("load-a"));
    await user.click(screen.getByText("load-b"));
    await screen.findByText("128");

    await user.click(screen.getByText("sync-b"));
    // Deck B now matches Deck A's 124 BPM.
    expect(screen.getByTestId("probe.bpm-b")).toHaveTextContent("124");
    expect(engineMock.setRate).toHaveBeenCalledWith("B", expect.any(Number));
  });

  it("pitch adjusts the playback rate and the shown BPM", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByText("load-a"));
    await screen.findByText("124");

    await user.click(screen.getByText("pitch-a-150"));
    // 124 * 1.5 = 186
    expect(screen.getByTestId("probe.bpm-a")).toHaveTextContent("186");
    expect(screen.getByTestId("probe.pitch-a")).toHaveTextContent("1.5");
    expect(engineMock.setRate).toHaveBeenCalledWith("A", 1.5);
  });

  it("crossfader updates the master position and the engine", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByText("cross-left"));
    expect(screen.getByTestId("probe.crossfader")).toHaveTextContent("0");
    expect(engineMock.setCrossfader).toHaveBeenCalledWith(0);
  });

  it("sets a hot cue at the current position", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByText("load-a"));
    await screen.findByText("124");

    await user.click(screen.getByText("cue-a-0"));
    expect(screen.getByTestId("probe.cues-a")).toHaveTextContent("1");
  });

  it("toggles stem isolation and pulls the matching EQ band down", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByText("stem-vocal-a"));
    expect(screen.getByTestId("probe.stem-vocal-a")).toHaveTextContent("true");
    expect(screen.getByTestId("probe.eq-high-a")).toHaveTextContent("0.15");
    expect(engineMock.setEq).toHaveBeenCalledWith("A", "high", 0.15);
  });

  it("toggles a deck mode", async () => {
    const user = userEvent.setup();
    renderProbe();

    expect(screen.getByTestId("probe.mode-slip-a")).toHaveTextContent("false");
    await user.click(screen.getByText("mode-slip-a"));
    expect(screen.getByTestId("probe.mode-slip-a")).toHaveTextContent("true");
  });

  it("updates the channel volume and the engine gain", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByText("volume-a-30"));
    expect(screen.getByTestId("probe.volume-a")).toHaveTextContent("0.3");
    expect(engineMock.setChannelGain).toHaveBeenCalledWith("A", 0.3);
  });

  it("triggers a pad sample through the engine", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByText("sample-a-0"));
    // The sample load is async; flush the microtask queue.
    await act(async () => {
      await Promise.resolve();
    });
    expect(engineMock.loadBuffer).toHaveBeenCalled();
    expect(engineMock.playSample).toHaveBeenCalledWith(
      "A",
      expect.anything(),
      0.9,
    );
  });
});
