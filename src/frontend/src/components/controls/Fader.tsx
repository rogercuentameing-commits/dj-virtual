/**
 * Fader — a linear control with vertical and horizontal variants.
 *
 * The track is a fixed-size rail; the handle is positioned with a transform so
 * dragging never triggers layout. Pointer capture keeps the gesture alive past
 * the handle bounds, and `touch-none` prevents page scroll while dragging.
 */

import { cn } from "@/lib/utils";
import { useCallback, useRef, useState } from "react";

export interface FaderProps {
  /** Accessible name, e.g. "VOLUMEN". */
  label: string;
  /** Current value. */
  value: number;
  /** Minimum value. */
  min?: number;
  /** Maximum value. */
  max?: number;
  /** Called with the next value while dragging. */
  onChange: (value: number) => void;
  /** Orientation of the rail. */
  orientation?: "vertical" | "horizontal";
  /** Accent family used for the filled portion. */
  accent?: "deck-a" | "deck-b" | "neutral";
  /** Formats the readout beside the fader. */
  formatValue?: (value: number) => string;
  /** Extra classes for the wrapper. */
  className?: string;
  /** Deterministic test marker. */
  ocid?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function Fader({
  label,
  value,
  min = 0,
  max = 1,
  onChange,
  orientation = "vertical",
  accent = "neutral",
  formatValue,
  className,
  ocid,
}: FaderProps) {
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const vertical = orientation === "vertical";

  const ratio = max === min ? 0 : (value - min) / (max - min);

  const accentFill =
    accent === "deck-a"
      ? "bg-deck-a"
      : accent === "deck-b"
        ? "bg-deck-b"
        : "bg-foreground";

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const next = vertical
        ? 1 - (clientY - rect.top) / rect.height
        : (clientX - rect.left) / rect.width;
      onChange(clamp(min + next * (max - min), min, max));
    },
    [max, min, onChange, vertical],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      updateFromPointer(event.clientX, event.clientY);
    },
    [updateFromPointer],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      updateFromPointer(event.clientX, event.clientY);
    },
    [dragging, updateFromPointer],
  );

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const step = (max - min) / 20;
      const up = vertical ? "ArrowUp" : "ArrowRight";
      const down = vertical ? "ArrowDown" : "ArrowLeft";
      if (event.key === up) {
        event.preventDefault();
        onChange(clamp(value + step, min, max));
      } else if (event.key === down) {
        event.preventDefault();
        onChange(clamp(value - step, min, max));
      }
    },
    [max, min, onChange, value, vertical],
  );

  const readout = formatValue
    ? formatValue(value)
    : `${Math.round(ratio * 100)}`;

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        vertical ? "flex-col" : "flex-row",
        className,
      )}
    >
      <span className="label-hardware text-muted-foreground">{label}</span>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-orientation={orientation}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number(value.toFixed(3))}
        aria-valuetext={readout}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
        className={cn(
          "touch-none select-none rounded-full border border-border bg-background/60 shadow-inset-control outline-none transition-snap",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          vertical ? "h-32 w-9" : "h-9 w-40",
        )}
        data-ocid={ocid}
      >
        <div
          className={cn(
            "relative h-full w-full",
            vertical ? "flex flex-col justify-end" : "flex items-center",
          )}
        >
          {/* Filled portion */}
          <div
            className={cn(
              "rounded-full",
              accentFill,
              vertical ? "w-full" : "h-full",
            )}
            style={
              vertical
                ? { height: `${ratio * 100}%` }
                : { width: `${ratio * 100}%` }
            }
          />
          {/* Handle */}
          <div
            className={cn(
              "absolute rounded-sm border border-border bg-control shadow-raised-control",
              vertical
                ? "left-1/2 h-4 w-7 -translate-x-1/2 -translate-y-1/2"
                : "top-1/2 h-7 w-4 -translate-x-1/2 -translate-y-1/2",
              dragging && "shadow-pad-press",
            )}
            style={
              vertical
                ? { bottom: `calc(${ratio * 100}% - 8px)` }
                : { left: `calc(${ratio * 100}% - 8px)` }
            }
          >
            <span
              className={cn(
                "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
                accentFill,
                vertical ? "h-[2px] w-4" : "h-4 w-[2px]",
              )}
            />
          </div>
        </div>
      </div>
      <span className="font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
        {readout}
      </span>
    </div>
  );
}
