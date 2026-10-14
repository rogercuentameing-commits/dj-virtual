/**
 * App — the single-screen DJ cabin shell.
 *
 * Renders the full-screen cabin: a compact top bar (title, master BPM
 * readouts, REC button) and a main area that hosts the two decks, the central
 * mixer and the pad section. The deck, mixer, pad and library components are
 * built by later tasks; this shell owns the layout, the audio provider and the
 * shared chrome.
 */

import { AudioProvider, useAudio } from "@/audio/AudioProvider";
import { DeckPanel } from "@/components/deck/DeckPanel";
import { MixerPanel } from "@/components/mixer/MixerPanel";
import { PadSection } from "@/components/pads/PadSection";
import { useRecorder } from "@/hooks/useRecorder";
import { useVuMeter } from "@/hooks/useVuMeter";
import { cn } from "@/lib/utils";
import { Circle, Disc3 } from "lucide-react";
import { useEffect } from "react";

/** Format seconds as m:ss. */
function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/** Compact master BPM readout for one deck. */
function BpmReadout({ deck }: { deck: "A" | "B" }) {
  const { decks } = useAudio();
  const state = decks[deck];
  const accent = deck === "A" ? "text-deck-a" : "text-deck-b";
  return (
    <div
      className="flex flex-col items-center"
      data-ocid={`topbar.bpm.${deck.toLowerCase()}`}
    >
      <span className="label-hardware text-muted-foreground">DECK {deck}</span>
      <span
        className={cn("font-mono text-sm font-semibold tabular-nums", accent)}
      >
        {state.bpm > 0 ? state.bpm.toFixed(1) : "--.-"}
      </span>
    </div>
  );
}

/** Master VU meter driven by the analyser. */
function MasterVu() {
  const { decks } = useAudio();
  const active = decks.A.playing || decks.B.playing;
  const level = useVuMeter(active);
  const segments = 12;
  const lit = Math.round(level * segments);
  return (
    <div
      className="flex h-6 items-end gap-[2px]"
      role="meter"
      aria-label="Nivel master"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(level * 100)}
      data-ocid="topbar.vu_meter"
    >
      {Array.from({ length: segments }, (_, index) => `vu-${index}`).map(
        (id, index) => {
          const on = index < lit;
          const tone =
            index > segments - 3
              ? "bg-destructive"
              : index > segments - 6
                ? "bg-warning"
                : "bg-success";
          return (
            <span
              key={id}
              className={cn(
                "w-[3px] rounded-sm transition-snap",
                on ? tone : "bg-control",
              )}
              style={{ height: `${30 + index * 5}%` }}
            />
          );
        },
      )}
    </div>
  );
}

/** REC button with elapsed timer and download affordance. */
function RecordButton() {
  const { recording, elapsed, downloadUrl, start, stop, download } =
    useRecorder();
  return (
    <div className="flex items-center gap-2">
      {downloadUrl ? (
        <button
          type="button"
          onClick={download}
          className="label-hardware touch-target rounded-md border border-border bg-control px-3 text-control-foreground transition-snap hover:bg-control-active"
          data-ocid="topbar.download_button"
        >
          Descargar
        </button>
      ) : null}
      <button
        type="button"
        onClick={recording ? stop : start}
        aria-pressed={recording}
        className={cn(
          "label-hardware touch-target flex items-center gap-2 rounded-md border px-3 transition-snap",
          recording
            ? "border-destructive bg-destructive/20 text-destructive"
            : "border-border bg-control text-control-foreground hover:bg-control-active",
        )}
        data-ocid="topbar.rec_button"
      >
        <Circle
          className={cn(
            "h-3 w-3",
            recording
              ? "animate-pulse-rec fill-destructive"
              : "fill-destructive",
          )}
          aria-hidden="true"
        />
        {recording ? formatClock(elapsed) : "REC"}
      </button>
    </div>
  );
}

/** Top bar: title, master readouts and REC. */
function TopBar() {
  return (
    <header className="surface-panel flex items-center justify-between gap-3 border-b border-border px-3 py-2 shadow-panel-depth">
      <div className="flex min-w-0 items-center gap-2">
        <Disc3 className="h-5 w-5 shrink-0 text-deck-a" aria-hidden="true" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-sm font-bold uppercase tracking-widest text-foreground">
            Cabina Doble
          </h1>
          <p className="label-hardware truncate text-muted-foreground">
            Controlador DJ
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <BpmReadout deck="A" />
        <MasterVu />
        <BpmReadout deck="B" />
        <RecordButton />
      </div>
    </header>
  );
}

/** The cabin body: decks, mixer and pads. */
function Cabin() {
  const { ready, actions } = useAudio();

  // Unlock the AudioContext on the first user gesture anywhere in the cabin.
  useEffect(() => {
    const handler = () => actions.unlock();
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, [actions]);

  return (
    <main
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden bg-background p-2"
      data-ocid="cabin.panel"
    >
      {!ready ? (
        <div
          className="label-hardware flex items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-1 text-muted-foreground"
          data-ocid="cabin.loading_state"
        >
          <span
            className="h-2 w-2 animate-pulse-rec rounded-full bg-deck-a"
            aria-hidden="true"
          />
          Toca para activar el audio
        </div>
      ) : null}

      {/* Portrait: decks stacked with the mixer between them.
          Landscape: classic side-by-side cabin. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[1fr_auto_1fr] gap-2 landscape:grid-cols-[1fr_minmax(180px,0.7fr)_1fr] landscape:grid-rows-1">
        <DeckPanel deck="A" />
        <MixerPanel className="landscape:min-h-0" />
        <DeckPanel deck="B" />
      </div>

      <PadSection />
    </main>
  );
}

export default function App() {
  return (
    <AudioProvider>
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground">
        <TopBar />
        <Cabin />
      </div>
    </AudioProvider>
  );
}
