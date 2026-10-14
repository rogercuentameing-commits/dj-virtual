/**
 * JogWheel — large circular scrub control for one deck.
 *
 * A colored ring with a center indicator. Dragging rotates the platter and
 * scrubs the playhead; while a track plays the wheel spins continuously. The
 * rotation is driven by requestAnimationFrame so it stays smooth without
 * re-rendering React on every frame.
 */

import { cn } from "@/lib/utils";
import type { DeckId } from "@/types/dj";
import { useEffect, useRef, useState } from "react";

interface JogWheelProps {
  deck: DeckId;
  playing: boolean;
  /** Current playhead position in seconds. */
  position: number;
  /** Track duration in seconds (0 when empty). */
  duration: number;
  /** Whether a track is loaded. */
  hasTrack: boolean;
  /** Scrub to an absolute position in seconds. */
  onScrub: (position: number) => void;
  /** Notify the engine that a scratch gesture started/ended. */
  onScratch: (active: boolean) => void;
  className?: string;
}

export function JogWheel({
  deck,
  playing,
  position,
  duration,
  hasTrack,
  onScrub,
  onScratch,
  className,
}: JogWheelProps) {
  const [angle, setAngle] = useState(0);
  const angleRef = useRef(0);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const positionRef = useRef(position);
  const durationRef = useRef(duration);

  positionRef.current = position;
  durationRef.current = duration;

  // Continuous spin while playing; idle otherwise.
  useEffect(() => {
    if (!playing || !hasTrack) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const delta = now - previous;
      previous = now;
      angleRef.current = (angleRef.current + delta * 0.18) % 360;
      setAngle(angleRef.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, hasTrack]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!hasTrack) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    lastXRef.current = event.clientX;
    lastTimeRef.current = performance.now();
    onScratch(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !hasTrack) return;
    const now = performance.now();
    const dx = event.clientX - lastXRef.current;
    const dt = Math.max(1, now - lastTimeRef.current);
    lastXRef.current = event.clientX;
    lastTimeRef.current = now;

    // Rotate the platter with the drag.
    angleRef.current = (angleRef.current + dx * 0.6) % 360;
    setAngle(angleRef.current);

    // Scrub the playhead proportionally to the drag distance.
    const duration = durationRef.current;
    if (duration > 0) {
      const deltaSeconds = (dx / 220) * (dt / 1000) * 4;
      const next = Math.min(
        duration,
        Math.max(0, positionRef.current + deltaSeconds),
      );
      positionRef.current = next;
      onScrub(next);
    }
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onScratch(false);
  };

  const accentRing = deck === "A" ? "border-deck-a" : "border-deck-b";
  const accentText = deck === "A" ? "text-deck-a" : "text-deck-b";
  const accentBg = deck === "A" ? "bg-deck-a" : "bg-deck-b";
  const glow = deck === "A" ? "glow-deck-a" : "glow-deck-b";

  return (
    <div
      className={cn("flex flex-col items-center gap-1", className)}
      data-ocid={`deck_${deck.toLowerCase()}.jog_wheel`}
    >
      <div
        className={cn(
          "relative aspect-square w-full max-w-[168px] touch-none select-none rounded-full border-2 bg-control shadow-raised-control transition-snap",
          accentRing,
          playing && glow,
          hasTrack ? "cursor-grab active:cursor-grabbing" : "opacity-70",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-label={`Jog wheel del deck ${deck}. Arrastra para hacer scratch.`}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(position)}
        aria-disabled={!hasTrack}
        tabIndex={hasTrack ? 0 : -1}
      >
        {/* Platter grooves */}
        <div className="absolute inset-[10%] rounded-full border border-border/60" />
        <div className="absolute inset-[22%] rounded-full border border-border/40" />
        {/* Rotating indicator */}
        <div
          className="absolute inset-0"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <span
            className={cn(
              "absolute left-1/2 top-[6%] h-[18%] w-[3px] -translate-x-1/2 rounded-full",
              accentBg,
            )}
            aria-hidden="true"
          />
        </div>
        {/* Center hub */}
        <div className="absolute inset-[34%] flex items-center justify-center rounded-full border border-border bg-background/80">
          <span className={cn("font-mono text-xs font-semibold", accentText)}>
            {deck}
          </span>
        </div>
      </div>
      <span className="label-hardware text-muted-foreground">JOG</span>
    </div>
  );
}
