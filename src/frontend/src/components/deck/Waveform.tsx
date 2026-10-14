/**
 * Waveform — canvas strip for one deck.
 *
 * Draws a deterministic peak envelope derived from the loaded track's identity
 * (stable across renders, no audio-buffer access required), a moving playhead
 * and a progress fill. Tapping or dragging the strip seeks the deck. When no
 * track is loaded it draws a flat baseline instead of crashing.
 */

import { cn } from "@/lib/utils";
import type { DeckId, DemoTrack } from "@/types/dj";
import { useEffect, useMemo, useRef } from "react";

interface WaveformProps {
  deck: DeckId;
  track: DemoTrack | null;
  position: number;
  duration: number;
  playing: boolean;
  onSeek: (position: number) => void;
  className?: string;
}

/** Deterministic 0..1 pseudo-random from a string seed. */
function seededUnit(seed: string, index: number): number {
  let hash = 2166136261;
  const key = `${seed}:${index}`;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

/** Build a smooth peak envelope for a track. */
function buildPeaks(track: DemoTrack | null, count: number): number[] {
  if (!track) return new Array(count).fill(0);
  const peaks: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / count;
    // Layered sine "energy" plus seeded noise for a musical-looking envelope.
    const groove =
      0.45 +
      0.3 * Math.sin(t * Math.PI * 6) +
      0.18 * Math.sin(t * Math.PI * 17 + 1.3);
    const noise = seededUnit(track.id, i) * 0.35;
    peaks.push(Math.min(1, Math.max(0.08, groove * 0.7 + noise)));
  }
  return peaks;
}

export function Waveform({
  deck,
  track,
  position,
  duration,
  playing,
  onSeek,
  className,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const peaks = useMemo(() => buildPeaks(track, 160), [track]);
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const styles = getComputedStyle(canvas);
    const waveColor =
      styles.getPropertyValue("--wave-color").trim() ||
      (deck === "A" ? "oklch(0.78 0.16 240)" : "oklch(0.8 0.16 60)");
    const waveAlt =
      styles.getPropertyValue("--wave-alt").trim() ||
      (deck === "A" ? "oklch(0.5 0.12 255)" : "oklch(0.55 0.12 45)");
    const playedColor =
      deck === "A" ? "oklch(0.72 0.2 245)" : "oklch(0.76 0.2 55)";

    const mid = height / 2;
    const barWidth = width / peaks.length;
    const gap = Math.max(0.5, barWidth * 0.28);

    for (let i = 0; i < peaks.length; i += 1) {
      const x = i * barWidth;
      const amplitude = peaks[i] * (height * 0.44);
      const isPlayed = x / width <= progress;
      ctx.fillStyle = isPlayed
        ? playedColor
        : i % 2 === 0
          ? waveColor
          : waveAlt;
      ctx.globalAlpha = isPlayed ? 1 : 0.55;
      ctx.fillRect(
        x,
        mid - amplitude,
        Math.max(1, barWidth - gap),
        amplitude * 2,
      );
    }
    ctx.globalAlpha = 1;

    // Playhead.
    if (track) {
      const px = progress * width;
      ctx.fillStyle = "oklch(0.97 0.01 265)";
      ctx.fillRect(
        Math.min(width - 1.5, Math.max(0, px - 0.75)),
        0,
        1.5,
        height,
      );
    }
  }, [peaks, progress, track, deck]);

  const seekFromEvent = (clientX: number, target: HTMLCanvasElement) => {
    if (!track || duration <= 0) return;
    const rect = target.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <div
      className={cn(
        "relative h-14 w-full overflow-hidden rounded-md border border-border bg-background/70 shadow-inset-control",
        className,
      )}
      style={
        {
          "--wave-color":
            deck === "A" ? "oklch(0.78 0.16 240)" : "oklch(0.8 0.16 60)",
          "--wave-alt":
            deck === "A" ? "oklch(0.5 0.12 255)" : "oklch(0.55 0.12 45)",
        } as React.CSSProperties
      }
      data-ocid={`deck_${deck.toLowerCase()}.waveform`}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-pointer touch-none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          seekFromEvent(event.clientX, event.currentTarget);
        }}
        onPointerMove={(event) => {
          if (event.buttons !== 1) return;
          seekFromEvent(event.clientX, event.currentTarget);
        }}
        aria-label={
          track
            ? `Forma de onda de ${track.name}. Toca para saltar de posición.`
            : "Forma de onda vacía. Carga una pista."
        }
        role="img"
      />
      {!track ? (
        <span className="label-hardware pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground/70">
          Sin pista
        </span>
      ) : null}
      {playing ? (
        <span
          className={cn(
            "pointer-events-none absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full",
            deck === "A" ? "bg-deck-a" : "bg-deck-b",
          )}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
