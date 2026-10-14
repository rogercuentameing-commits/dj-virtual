/**
 * DeckFxStrip — per-deck effects unit.
 *
 * Deck A exposes Echo / Flanger / Band Pass; Deck B exposes Filter LP /
 * Filter HP / Band Pass. Each effect has an on/off toggle and an intensity
 * knob. Selecting an effect engages it; tapping the active effect disengages.
 */

import { cn } from "@/lib/utils";
import type { DeckId } from "@/types/dj";
import { useRef } from "react";

interface FxOption {
  id: string;
  label: string;
}

const FX_BY_DECK: Record<DeckId, FxOption[]> = {
  A: [
    { id: "echo", label: "Echo" },
    { id: "flanger", label: "Flanger" },
    { id: "bandpass", label: "Band Pass" },
  ],
  B: [
    { id: "filter-lp", label: "Filter LP" },
    { id: "filter-hp", label: "Filter HP" },
    { id: "bandpass", label: "Band Pass" },
  ],
};

interface DeckFxStripProps {
  deck: DeckId;
  /** Active effect id, or null. */
  activeFx: string | null;
  /** Intensity 0..1. */
  amount: number;
  onSelectFx: (fx: string | null) => void;
  onAmount: (amount: number) => void;
  className?: string;
}

export function DeckFxStrip({
  deck,
  activeFx,
  amount,
  onSelectFx,
  onAmount,
  className,
}: DeckFxStripProps) {
  const options = FX_BY_DECK[deck];
  const accentText = deck === "A" ? "text-deck-a" : "text-deck-b";
  const accentFill = deck === "A" ? "deck-a-fill" : "deck-b-fill";
  const accentBorder = deck === "A" ? "border-deck-a/50" : "border-deck-b/50";
  const knobRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const setFromPointer = (clientY: number) => {
    const node = knobRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const ratio = 1 - (clientY - rect.top) / rect.height;
    onAmount(Math.min(1, Math.max(0, ratio)));
  };

  const knobAngle = -135 + amount * 270;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-panel/60 p-2",
        className,
      )}
      data-ocid={`deck_${deck.toLowerCase()}.fx_strip`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="label-hardware text-muted-foreground">FX</span>
        <div className="flex flex-wrap gap-1">
          {options.map((option) => {
            const active = activeFx === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectFx(active ? null : option.id)}
                aria-pressed={active}
                className={cn(
                  "label-hardware touch-target rounded-md border px-2 py-1 transition-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? cn(accentFill, accentBorder, "text-deck-a-foreground")
                    : "border-border bg-control text-control-foreground hover:bg-control-active",
                )}
                data-ocid={`deck_${deck.toLowerCase()}.fx.${option.id}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Intensity knob */}
      <div className="flex shrink-0 flex-col items-center gap-1">
        <div
          ref={knobRef}
          className={cn(
            "relative h-12 w-12 touch-none select-none rounded-full border-2 bg-control shadow-raised-control transition-snap",
            activeFx ? accentBorder : "border-border",
          )}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            draggingRef.current = true;
            setFromPointer(event.clientY);
          }}
          onPointerMove={(event) => {
            if (!draggingRef.current) return;
            setFromPointer(event.clientY);
          }}
          onPointerUp={(event) => {
            draggingRef.current = false;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={() => {
            draggingRef.current = false;
          }}
          role="slider"
          aria-label={`Intensidad de FX del deck ${deck}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(amount * 100)}
          tabIndex={0}
        >
          <span
            className={cn(
              "absolute left-1/2 top-1/2 h-[42%] w-[2px] origin-bottom -translate-x-1/2 rounded-full",
              activeFx
                ? accentText.replace("text-", "bg-")
                : "bg-muted-foreground",
            )}
            style={{
              transform: `translate(-50%, -100%) rotate(${knobAngle}deg)`,
              transformOrigin: "50% 100%",
            }}
            aria-hidden="true"
          />
        </div>
        <span
          className={cn("font-mono text-[10px] tabular-nums", accentText)}
          data-ocid={`deck_${deck.toLowerCase()}.fx_amount`}
        >
          {Math.round(amount * 100)}
        </span>
      </div>
    </div>
  );
}
