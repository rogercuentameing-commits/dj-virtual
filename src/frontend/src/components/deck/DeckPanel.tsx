/**
 * DeckPanel — one complete deck of the cabin.
 *
 * Parameterized by deck id ("A" or "B") so it inherits the blue or orange
 * accent tokens. Composes the load button + track picker, the title/artist
 * readout, the jog wheel, the BPM and time readouts, the waveform, the pitch
 * fader, the mode buttons and the transport row, plus the per-deck FX strip.
 * Everything is wired to useAudio().
 */

import { useAudio } from "@/audio/AudioProvider";
import { DeckFxStrip } from "@/components/deck/DeckFxStrip";
import { JogWheel } from "@/components/deck/JogWheel";
import { TransportControls } from "@/components/deck/TransportControls";
import { Waveform } from "@/components/deck/Waveform";
import { LibraryPanel } from "@/components/library/LibraryPanel";
import { cn } from "@/lib/utils";
import type { DeckId, DeckModes } from "@/types/dj";
import { FolderOpen } from "lucide-react";
import { useState } from "react";

/** Format seconds as m:ss. */
function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

const MODE_ORDER: (keyof DeckModes)[] = ["slip", "beat", "qntz", "pitch"];
const MODE_LABELS: Record<keyof DeckModes, string> = {
  slip: "SLIP",
  beat: "BEAT",
  qntz: "QNTZ",
  pitch: "PITCH",
};

interface DeckPanelProps {
  deck: DeckId;
  className?: string;
}

export function DeckPanel({ deck, className }: DeckPanelProps) {
  const { decks, actions } = useAudio();
  const state = decks[deck];
  const [pickerOpen, setPickerOpen] = useState(false);

  const accentText = deck === "A" ? "text-deck-a" : "text-deck-b";
  const accentFill = deck === "A" ? "deck-a-fill" : "deck-b-fill";
  const accentBorder = deck === "A" ? "border-deck-a/40" : "border-deck-b/40";
  const accentGlow = deck === "A" ? "glow-deck-a" : "glow-deck-b";
  const deckKey = deck.toLowerCase();

  const remaining = Math.max(0, state.duration - state.position);
  const pitchPercent = Math.round((state.pitch - 1) * 100);

  return (
    <section
      className={cn(
        "surface-panel flex min-h-0 flex-col gap-2 overflow-y-auto rounded-lg border p-2 shadow-panel-depth scrollbar-none",
        accentBorder,
        className,
      )}
      aria-label={`Deck ${deck}`}
      data-ocid={`deck_${deckKey}.panel`}
    >
      {/* Header: load button + track readout */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className={cn(
            "label-hardware touch-target flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-deck-a-foreground shadow-raised-control transition-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            accentFill,
            accentBorder,
          )}
          data-ocid={`deck_${deckKey}.load_button`}
        >
          <FolderOpen className="h-4 w-4" aria-hidden="true" />
          LOAD {deck} SONG
        </button>

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold text-foreground"
            data-ocid={`deck_${deckKey}.track_title`}
          >
            {state.track ? state.track.name : "Sin pista cargada"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {state.track ? state.track.artist : "Toca LOAD para elegir"}
          </p>
        </div>
      </div>

      <LibraryPanel
        target={pickerOpen ? deck : null}
        onClose={() => setPickerOpen(false)}
      />

      {/* Jog wheel + readouts */}
      <div className="flex items-center gap-3">
        <JogWheel
          deck={deck}
          playing={state.playing}
          position={state.position}
          duration={state.duration}
          hasTrack={!!state.track}
          onScrub={(position) => actions.seek(deck, position)}
          onScratch={(active) => actions.scratch(deck, active)}
          className="w-[42%] max-w-[168px] shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div
            className={cn(
              "rounded-md border border-border bg-background/70 p-2 text-center shadow-inset-control",
              state.playing && accentGlow,
            )}
          >
            <span className="label-hardware block text-muted-foreground">
              BPM
            </span>
            <span
              className={cn(
                "font-mono text-2xl font-bold tabular-nums",
                accentText,
              )}
              data-ocid={`deck_${deckKey}.bpm`}
            >
              {state.bpm > 0 ? state.bpm.toFixed(1) : "--.-"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-background/70 px-2 py-1 shadow-inset-control">
            <span
              className="font-mono text-xs tabular-nums text-foreground"
              data-ocid={`deck_${deckKey}.time_elapsed`}
            >
              {formatClock(state.position)}
            </span>
            <span className="label-hardware text-muted-foreground">/</span>
            <span
              className="font-mono text-xs tabular-nums text-muted-foreground"
              data-ocid={`deck_${deckKey}.time_remaining`}
            >
              -{formatClock(remaining)}
            </span>
          </div>
        </div>
      </div>

      {/* Waveform */}
      <Waveform
        deck={deck}
        track={state.track}
        position={state.position}
        duration={state.duration}
        playing={state.playing}
        onSeek={(position) => actions.seek(deck, position)}
      />

      {/* Pitch fader */}
      <div className="flex items-center gap-2 rounded-md border border-border bg-panel/60 p-2">
        <span className="label-hardware shrink-0 text-muted-foreground">
          PITCH
        </span>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.01}
          value={state.pitch}
          onChange={(event) =>
            actions.setPitch(deck, Number(event.target.value))
          }
          className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-control accent-current"
          style={{
            accentColor: deck === "A" ? "var(--deck-a)" : "var(--deck-b)",
          }}
          aria-label={`Pitch del deck ${deck}`}
          data-ocid={`deck_${deckKey}.pitch_fader`}
        />
        <span
          className={cn(
            "w-12 shrink-0 text-right font-mono text-xs tabular-nums",
            accentText,
          )}
          data-ocid={`deck_${deckKey}.pitch_value`}
        >
          {pitchPercent >= 0 ? "+" : ""}
          {pitchPercent}%
        </span>
      </div>

      {/* Mode buttons */}
      <div className="grid grid-cols-4 gap-1.5">
        {MODE_ORDER.map((mode) => {
          const active = state.modes[mode];
          return (
            <button
              key={mode}
              type="button"
              onClick={() => actions.toggleMode(deck, mode)}
              aria-pressed={active}
              className={cn(
                "label-hardware touch-target rounded-md border px-1 py-1.5 transition-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? cn(accentFill, accentBorder, "text-deck-a-foreground")
                  : "border-border bg-control text-control-foreground hover:bg-control-active",
              )}
              data-ocid={`deck_${deckKey}.mode.${mode}`}
            >
              {MODE_LABELS[mode]}
            </button>
          );
        })}
      </div>

      {/* Transport */}
      <TransportControls
        deck={deck}
        playing={state.playing}
        hasTrack={!!state.track}
        onCue={() => actions.cue(deck)}
        onPlayPause={() =>
          state.playing ? actions.pause(deck) : actions.play(deck)
        }
        onSync={() => actions.sync(deck)}
      />

      {/* FX strip */}
      <DeckFxStrip
        deck={deck}
        activeFx={state.fx}
        amount={state.fxState.amount}
        onSelectFx={(fx) => actions.setFx(deck, fx)}
        onAmount={(amount) => actions.setFxAmount(deck, amount)}
      />
    </section>
  );
}
