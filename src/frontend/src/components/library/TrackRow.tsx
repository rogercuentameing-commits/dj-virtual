/**
 * TrackRow — one selectable entry in the library picker.
 *
 * Shows the track name, artist and duration, a large LOAD action that hands the
 * track to the target deck, and an optional delete action for the user's own
 * uploads. The whole row is a button so a single tap loads the track.
 */

import { cn } from "@/lib/utils";
import type { DeckId } from "@/types/dj";
import { Disc3, Trash2 } from "lucide-react";

interface TrackRowProps {
  /** Display name of the track. */
  name: string;
  /** Artist or source label. */
  artist: string;
  /** Pre-formatted duration, e.g. "4:54". */
  duration: string;
  /** Deck the track will load into — drives the accent colour. */
  target: DeckId;
  /** Stable index used for deterministic markers. */
  index: number;
  /** True when the entry belongs to the signed-in user's uploads. */
  uploaded?: boolean;
  /** Load this track into the target deck. */
  onLoad: () => void;
  /** Delete this uploaded track. Omitted for demo tracks. */
  onDelete?: () => void;
  /** True while this row's delete request is in flight. */
  deleting?: boolean;
}

export function TrackRow({
  name,
  artist,
  duration,
  target,
  index,
  uploaded = false,
  onLoad,
  onDelete,
  deleting = false,
}: TrackRowProps) {
  const accentText = target === "A" ? "text-deck-a" : "text-deck-b";
  const accentBorder = target === "A" ? "border-deck-a/40" : "border-deck-b/40";
  const accentFill = target === "A" ? "deck-a-fill" : "deck-b-fill";

  return (
    <li className="flex items-stretch gap-2" data-ocid={`library.row.${index}`}>
      <button
        type="button"
        onClick={onLoad}
        className={cn(
          "surface-control group flex min-h-[56px] min-w-0 flex-1 items-center gap-3 rounded-md border px-3 py-2 text-left shadow-raised-control transition-snap hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          accentBorder,
        )}
        data-ocid={`library.load_button.${index}`}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            accentFill,
          )}
          aria-hidden="true"
        >
          <Disc3 className="h-4 w-4 text-background" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-display text-sm font-semibold uppercase tracking-wide text-foreground">
            {name}
          </span>
          <span className="label-hardware truncate text-muted-foreground">
            {artist}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {duration}
          </span>
          <span className={cn("label-hardware", accentText)}>
            {uploaded ? "SUBIDA" : "DEMO"}
          </span>
        </span>
      </button>

      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label={`Eliminar ${name}`}
          className="surface-control touch-target flex w-12 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground shadow-raised-control transition-snap hover:border-destructive hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          data-ocid={`library.delete_button.${index}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </li>
  );
}
