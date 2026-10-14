/**
 * ChannelStrip — one mixer channel (Deck A or Deck B).
 *
 * Layout follows the reference controller: a vertical volume fader on the
 * right, a GAIN knob and the three-band EQ (HIGH / MID / LOW) plus FILTER on
 * the left, all tinted with the deck's accent family. Every control is wired
 * straight to useAudio().
 */

import { useAudio } from "@/audio/AudioProvider";
import { Fader } from "@/components/controls/Fader";
import { Knob } from "@/components/controls/Knob";
import { cn } from "@/lib/utils";
import type { DeckId, EqState } from "@/types/dj";

export interface ChannelStripProps {
  /** Which deck this strip controls. */
  deck: DeckId;
  /** Extra classes for the wrapper. */
  className?: string;
}

/** EQ bands in display order, top to bottom. */
const EQ_BANDS: { band: keyof EqState; label: string }[] = [
  { band: "high", label: "HIGH" },
  { band: "mid", label: "MID" },
  { band: "low", label: "LOW" },
];

/** Format a 0..1 EQ/filter value as a signed dB-ish readout. */
function formatEq(value: number): string {
  const db = Math.round((value - 0.5) * 2 * 12);
  return `${db > 0 ? "+" : ""}${db}`;
}

/** Format the 0..2 gain as a percentage. */
function formatGain(value: number): string {
  return `${Math.round(value * 100)}`;
}

export function ChannelStrip({ deck, className }: ChannelStripProps) {
  const { decks, actions } = useAudio();
  const state = decks[deck];
  const accent = deck === "A" ? "deck-a" : "deck-b";
  const accentText = deck === "A" ? "text-deck-a" : "text-deck-b";
  const accentBorder = deck === "A" ? "border-deck-a/40" : "border-deck-b/40";

  return (
    <section
      className={cn(
        "surface-panel flex min-h-0 flex-col gap-2 rounded-lg border p-2 shadow-panel-depth",
        accentBorder,
        className,
      )}
      aria-label={`Canal ${deck}`}
      data-ocid={`mixer.channel.${deck.toLowerCase()}`}
    >
      <header className="flex items-center justify-between">
        <span className={cn("label-hardware", accentText)}>CANAL {deck}</span>
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {state.track ? state.track.name : "SIN PISTA"}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 items-stretch justify-between gap-2">
        {/* Knob column: GAIN + EQ + FILTER */}
        <div className="flex flex-1 flex-col items-center justify-between gap-1">
          <Knob
            label="GAIN"
            value={state.gain}
            min={0}
            max={2}
            center={1}
            accent={accent}
            formatValue={formatGain}
            onChange={(value) => actions.setGain(deck, value)}
            ocid={`mixer.gain.${deck.toLowerCase()}`}
          />
          <div className="grid w-full grid-cols-2 gap-x-1 gap-y-2">
            {EQ_BANDS.map(({ band, label }) => (
              <Knob
                key={band}
                label={label}
                value={state.eq[band]}
                accent={accent}
                formatValue={formatEq}
                onChange={(value) => actions.setEq(deck, band, value)}
                ocid={`mixer.eq.${band}.${deck.toLowerCase()}`}
              />
            ))}
            <Knob
              label="FILTER"
              value={state.filter}
              accent={accent}
              formatValue={formatEq}
              onChange={(value) => actions.setFilter(deck, value)}
              ocid={`mixer.filter.${deck.toLowerCase()}`}
            />
          </div>
        </div>

        {/* Volume fader column */}
        <div className="flex items-end justify-center">
          <Fader
            label="VOL"
            value={state.volume}
            accent={accent}
            formatValue={(value) => `${Math.round(value * 100)}`}
            onChange={(value) => actions.setVolume(deck, value)}
            ocid={`mixer.volume.${deck.toLowerCase()}`}
          />
        </div>
      </div>
    </section>
  );
}
