/**
 * PadButton — one performance pad.
 *
 * A single large, deck-tinted pad whose content and behaviour depend on the
 * active tab:
 *
 *   CUE   — empty pad sets a hot cue at the playhead; filled pad jumps to it.
 *   SMP   — plays the assigned sample; a small affordance replaces it.
 *   SCRT  — press-and-hold applies a scratch effect, release stops it.
 *   STEMS — toggles isolation of one stem band.
 *
 * The pad never triggers page scroll: it is a real <button> with `touch-none`
 * and pointer handlers that call `preventDefault` on touch.
 */

import { cn } from "@/lib/utils";
import type { PadTab } from "@/types/dj";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";

interface PadButtonProps {
  /** Slot index 0..7. */
  slot: number;
  tab: PadTab;
  /** Deck accent the pad inherits. */
  deck: "A" | "B";
  /** Primary label shown on the pad face. */
  label: string;
  /** Secondary line (cue time, band state, …). */
  detail?: string;
  /** Whether the pad reads as engaged (filled cue, active stem, held scratch). */
  active?: boolean;
  /** Whether the pad is currently held down. */
  pressed?: boolean;
  /** Whether the pad is disabled (e.g. no track loaded for a cue). */
  disabled?: boolean;
  /** Accessible description of what the pad does. */
  ariaLabel: string;
  onPress: () => void;
  onRelease?: () => void;
  /** When provided, renders the "replace sample" affordance (SMP pads). */
  onReplace?: (file: File) => void;
  /** Upload progress 0..100 while a replacement is in flight. */
  uploadProgress?: number | null;
}

export function PadButton({
  slot,
  tab,
  deck,
  label,
  detail,
  active = false,
  pressed = false,
  disabled = false,
  ariaLabel,
  onPress,
  onRelease,
  onReplace,
  uploadProgress = null,
}: PadButtonProps) {
  const [flash, setFlash] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const accentText = deck === "A" ? "text-deck-a" : "text-deck-b";
  const accentBorder = deck === "A" ? "border-deck-a/40" : "border-deck-b/40";
  const accentGlow = deck === "A" ? "glow-deck-a" : "glow-deck-b";
  const accentFill = deck === "A" ? "deck-a-fill" : "deck-b-fill";
  const accentForeground =
    deck === "A" ? "text-deck-a-foreground" : "text-deck-b-foreground";

  const engaged = active || pressed;

  const handlePress = () => {
    if (disabled) return;
    setFlash((count) => count + 1);
    onPress();
  };

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-pressed={tab === "STEMS" || tab === "SCRT" ? engaged : undefined}
        onPointerDown={(event) => {
          event.preventDefault();
          handlePress();
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          onRelease?.();
        }}
        onPointerLeave={() => {
          if (pressed) onRelease?.();
        }}
        onContextMenu={(event) => event.preventDefault()}
        className={cn(
          "relative flex h-full min-h-[64px] w-full touch-none select-none flex-col items-center justify-center gap-1 overflow-hidden rounded-md border px-1.5 py-2 text-center transition-snap",
          "shadow-inset-control active:shadow-pad-press",
          engaged
            ? cn(accentFill, accentForeground, accentGlow, "border-transparent")
            : cn("surface-control text-control-foreground", accentBorder),
          disabled && "cursor-not-allowed opacity-45",
        )}
        data-ocid={`pads.pad.${slot + 1}`}
      >
        {/* Press flash overlay — keyed so each press restarts the animation. */}
        {flash > 0 ? (
          <span
            key={flash}
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 animate-pad-flash",
              deck === "A" ? "bg-deck-a" : "bg-deck-b",
            )}
          />
        ) : null}

        <span
          className={cn(
            "label-hardware relative z-10 max-w-full truncate",
            engaged ? accentForeground : accentText,
          )}
        >
          {label}
        </span>
        {detail ? (
          <span
            className={cn(
              "relative z-10 font-mono text-[10px] tabular-nums",
              engaged ? accentForeground : "text-muted-foreground",
            )}
          >
            {detail}
          </span>
        ) : null}
      </button>

      {onReplace ? (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              fileRef.current?.click();
            }}
            aria-label={`Reemplazar sample del pad ${slot + 1}`}
            className="absolute right-1 top-1 z-20 flex h-6 w-6 items-center justify-center rounded-sm border border-border bg-background/80 text-muted-foreground transition-snap hover:bg-control hover:text-control-foreground"
            data-ocid={`pads.replace_button.${slot + 1}`}
          >
            <Upload className="h-3 w-3" aria-hidden="true" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onReplace(file);
              event.target.value = "";
            }}
            data-ocid={`pads.file_input.${slot + 1}`}
          />
          {uploadProgress !== null ? (
            <span
              className="absolute inset-x-1 bottom-1 z-20 h-1 overflow-hidden rounded-full bg-background/70"
              aria-hidden="true"
            >
              <span
                className={cn(
                  "block h-full",
                  deck === "A" ? "bg-deck-a" : "bg-deck-b",
                )}
                style={{
                  width: `${Math.min(100, Math.max(0, uploadProgress))}%`,
                }}
              />
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
