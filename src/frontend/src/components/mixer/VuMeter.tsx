/**
 * VuMeter — master level meter driven by useVuMeter().
 *
 * Renders a vertical stack of segments that light from the bottom up as the
 * master level rises. The top segments shift to warning and destructive tones
 * so clipping is obvious at a glance.
 */

import { useVuMeter } from "@/hooks/useVuMeter";
import { cn } from "@/lib/utils";

export interface VuMeterProps {
  /** Whether audio is currently flowing; the meter idles at zero otherwise. */
  active: boolean;
  /** Number of segments in the ladder. */
  segments?: number;
  /** Extra classes for the wrapper. */
  className?: string;
  /** Deterministic test marker. */
  ocid?: string;
}

export function VuMeter({
  active,
  segments = 14,
  className,
  ocid,
}: VuMeterProps) {
  const level = useVuMeter(active);
  const lit = Math.round(level * segments);

  return (
    <div
      className={cn("flex flex-col items-center gap-1", className)}
      data-ocid={ocid}
    >
      <span className="label-hardware text-muted-foreground">NIVEL</span>
      <div
        role="meter"
        aria-label="Nivel master"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(level * 100)}
        className="flex h-32 w-4 flex-col-reverse justify-start gap-[2px] rounded-sm border border-border bg-background/60 p-[2px] shadow-inset-control"
      >
        {Array.from({ length: segments }, (_, index) => `vu-seg-${index}`).map(
          (id, index) => {
            const on = index < lit;
            const tone =
              index >= segments - 2
                ? "bg-destructive"
                : index >= segments - 5
                  ? "bg-warning"
                  : "bg-success";
            return (
              <span
                key={id}
                className={cn(
                  "min-h-[3px] flex-1 rounded-[1px] transition-snap",
                  on ? tone : "bg-control/60",
                )}
              />
            );
          },
        )}
      </div>
      <span className="font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
        {Math.round(level * 100)}
      </span>
    </div>
  );
}
