/**
 * Knob — a rotary control driven by vertical touch/mouse drag.
 *
 * Drag up to increase, down to decrease. Double-tap (or double-click) resets
 * to the center value. The rotation is rendered with a transform only, so the
 * control stays cheap to animate. Pointer capture keeps the drag alive when the
 * finger leaves the knob, and `touch-none` stops the page from scrolling while
 * the user is turning it.
 */

import { cn } from "@/lib/utils";
import { useCallback, useRef, useState } from "react";

export interface KnobProps {
  /** Accessible name, e.g. "GAIN". */
  label: string;
  /** Current value. */
  value: number;
  /** Minimum value. */
  min?: number;
  /** Maximum value. */
  max?: number;
  /** Value restored on double-tap. Defaults to the midpoint. */
  center?: number;
  /** Called with the next value while dragging. */
  onChange: (value: number) => void;
  /** Accent family used for the indicator arc. */
  accent?: "deck-a" | "deck-b" | "neutral";
  /** Formats the readout under the knob. */
  formatValue?: (value: number) => string;
  /** Extra classes for the wrapper. */
  className?: string;
  /** Deterministic test marker. */
  ocid?: string;
}

/** Total sweep of the indicator, in degrees. */
const SWEEP = 270;
/** Pixels of vertical travel that span the full range. */
const DRAG_RANGE = 160;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function Knob({
  label,
  value,
  min = 0,
  max = 1,
  center,
  onChange,
  accent = "neutral",
  formatValue,
  className,
  ocid,
}: KnobProps) {
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ y: 0, value: 0 });
  const lastTapRef = useRef(0);

  const resetValue = center ?? (min + max) / 2;
  const ratio = max === min ? 0 : (value - min) / (max - min);
  const angle = -SWEEP / 2 + ratio * SWEEP;

  const accentClass =
    accent === "deck-a"
      ? "text-deck-a"
      : accent === "deck-b"
        ? "text-deck-b"
        : "text-foreground";

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const now = performance.now();
      if (now - lastTapRef.current < 320) {
        lastTapRef.current = 0;
        onChange(resetValue);
        return;
      }
      lastTapRef.current = now;
      startRef.current = { y: event.clientY, value };
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [onChange, resetValue, value],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const delta = startRef.current.y - event.clientY;
      const next = startRef.current.value + (delta / DRAG_RANGE) * (max - min);
      onChange(clamp(next, min, max));
    },
    [dragging, max, min, onChange],
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
      if (event.key === "ArrowUp" || event.key === "ArrowRight") {
        event.preventDefault();
        onChange(clamp(value + step, min, max));
      } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
        event.preventDefault();
        onChange(clamp(value - step, min, max));
      } else if (event.key === "Home") {
        event.preventDefault();
        onChange(resetValue);
      }
    },
    [max, min, onChange, resetValue, value],
  );

  const readout = formatValue
    ? formatValue(value)
    : `${Math.round(ratio * 100)}`;

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <span className="label-hardware text-muted-foreground">{label}</span>
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
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
          "touch-none select-none rounded-full outline-none transition-snap",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          dragging && "cursor-grabbing",
        )}
        data-ocid={ocid}
      >
        <div
          className={cn(
            "surface-control relative flex h-12 w-12 items-center justify-center rounded-full border border-border shadow-raised-control",
            dragging && "shadow-pad-press",
          )}
        >
          {/* Indicator needle */}
          <div
            className="absolute inset-0 flex items-start justify-center"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <span
              className={cn(
                "mt-[3px] h-3 w-[3px] rounded-full",
                accent === "deck-a"
                  ? "bg-deck-a"
                  : accent === "deck-b"
                    ? "bg-deck-b"
                    : "bg-foreground",
              )}
            />
          </div>
          {/* Center cap */}
          <span className="h-2 w-2 rounded-full bg-background/70 shadow-inset-control" />
        </div>
      </div>
      <span
        className={cn(
          "font-mono text-[10px] font-semibold tabular-nums",
          accentClass,
        )}
      >
        {readout}
      </span>
    </div>
  );
}
