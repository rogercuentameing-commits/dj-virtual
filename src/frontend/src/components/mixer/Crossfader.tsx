/**
 * Crossfader — horizontal blend control between Deck A and Deck B.
 *
 * Wraps the reusable Fader in its horizontal variant and adds the A/B end
 * labels plus a live readout of which side dominates the mix.
 */

import { Fader } from "@/components/controls/Fader";
import { cn } from "@/lib/utils";

export interface CrossfaderProps {
  /** Crossfader position 0 (full A) .. 1 (full B). */
  value: number;
  /** Called with the next position while dragging. */
  onChange: (value: number) => void;
  /** Extra classes for the wrapper. */
  className?: string;
  /** Deterministic test marker. */
  ocid?: string;
}

export function Crossfader({
  value,
  onChange,
  className,
  ocid,
}: CrossfaderProps) {
  const aShare = Math.round((1 - value) * 100);
  const bShare = Math.round(value * 100);

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <span className="label-hardware text-muted-foreground">CROSSFADER</span>
      <div className="flex w-full items-center gap-2">
        <span
          className={cn(
            "font-mono text-[10px] font-semibold tabular-nums",
            aShare >= bShare ? "text-deck-a" : "text-muted-foreground",
          )}
        >
          A {aShare}
        </span>
        <Fader
          label="Crossfader"
          value={value}
          onChange={onChange}
          orientation="horizontal"
          accent="neutral"
          formatValue={(next) =>
            next < 0.45 ? "A" : next > 0.55 ? "B" : "MIX"
          }
          className="flex-1"
          ocid={ocid}
        />
        <span
          className={cn(
            "font-mono text-[10px] font-semibold tabular-nums",
            bShare > aShare ? "text-deck-b" : "text-muted-foreground",
          )}
        >
          B {bShare}
        </span>
      </div>
    </div>
  );
}
