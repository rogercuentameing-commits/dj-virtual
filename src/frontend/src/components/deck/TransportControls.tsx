/**
 * TransportControls — CUE / PLAY-PAUSE / SYNC row for one deck.
 *
 * Large touch targets sized for mixing on a phone. PLAY toggles playback,
 * CUE returns the playhead to the start, and SYNC matches this deck's BPM to
 * the other deck.
 */

import { cn } from "@/lib/utils";
import type { DeckId } from "@/types/dj";
import { Pause, Play, RotateCcw, Waves } from "lucide-react";

interface TransportControlsProps {
  deck: DeckId;
  playing: boolean;
  hasTrack: boolean;
  onCue: () => void;
  onPlayPause: () => void;
  onSync: () => void;
  className?: string;
}

export function TransportControls({
  deck,
  playing,
  hasTrack,
  onCue,
  onPlayPause,
  onSync,
  className,
}: TransportControlsProps) {
  const accentText = deck === "A" ? "text-deck-a" : "text-deck-b";
  const accentFill = deck === "A" ? "deck-a-fill" : "deck-b-fill";
  const accentBorder = deck === "A" ? "border-deck-a/50" : "border-deck-b/50";

  const base =
    "label-hardware touch-target flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-control text-control-foreground shadow-raised-control transition-snap hover:bg-control-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <div
      className={cn("flex items-stretch gap-2", className)}
      data-ocid={`deck_${deck.toLowerCase()}.transport`}
    >
      <button
        type="button"
        onClick={onCue}
        disabled={!hasTrack}
        className={base}
        data-ocid={`deck_${deck.toLowerCase()}.cue_button`}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        CUE
      </button>

      <button
        type="button"
        onClick={onPlayPause}
        disabled={!hasTrack}
        aria-pressed={playing}
        className={cn(
          "label-hardware touch-target flex flex-[1.4] items-center justify-center gap-1.5 rounded-md border text-foreground shadow-raised-control transition-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45",
          accentBorder,
          playing
            ? cn(accentFill, "text-deck-a-foreground")
            : "bg-control hover:bg-control-active",
        )}
        data-ocid={`deck_${deck.toLowerCase()}.play_button`}
      >
        {playing ? (
          <Pause className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Play className="h-4 w-4" aria-hidden="true" />
        )}
        {playing ? "PAUSA" : "PLAY"}
      </button>

      <button
        type="button"
        onClick={onSync}
        disabled={!hasTrack}
        className={cn(base, accentText)}
        data-ocid={`deck_${deck.toLowerCase()}.sync_button`}
      >
        <Waves className="h-4 w-4" aria-hidden="true" />
        SYNC
      </button>
    </div>
  );
}
