/**
 * TrackList — a titled section of library tracks.
 *
 * Renders a loading skeleton, a helpful empty state, or the list of rows. Used
 * for both the built-in demo catalog and the signed-in user's uploads.
 */

import { TrackRow } from "@/components/library/TrackRow";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DeckId } from "@/types/dj";
import { Music4 } from "lucide-react";
import type { ReactNode } from "react";

/** One normalised entry rendered by the list. */
export interface TrackListItem {
  /** Stable identity for React keys. */
  id: string;
  name: string;
  artist: string;
  /** Pre-formatted duration, e.g. "4:54". */
  duration: string;
  uploaded: boolean;
}

interface TrackListProps {
  /** Section heading, e.g. "Pistas demo". */
  title: string;
  /** Optional count badge shown next to the heading. */
  count?: number;
  items: TrackListItem[];
  /** Deck the tracks will load into. */
  target: DeckId;
  /** True while the source is still loading. */
  loading?: boolean;
  /** Copy shown when the source has no entries. */
  emptyMessage: string;
  /** Optional action rendered inside the empty state. */
  emptyAction?: ReactNode;
  /** Marker namespace, e.g. "demo" or "uploads". */
  scope: string;
  onLoad: (item: TrackListItem) => void;
  onDelete?: (item: TrackListItem) => void;
  /** Id of the row whose delete request is in flight. */
  deletingId?: string | null;
}

export function TrackList({
  title,
  count,
  items,
  target,
  loading = false,
  emptyMessage,
  emptyAction,
  scope,
  onLoad,
  onDelete,
  deletingId,
}: TrackListProps) {
  return (
    <section
      className="flex flex-col gap-2"
      aria-label={title}
      data-ocid={`library.${scope}.section`}
    >
      <header className="flex items-center justify-between gap-2 px-1">
        <h3 className="label-hardware text-muted-foreground">{title}</h3>
        {typeof count === "number" ? (
          <span className="font-mono text-[0.625rem] tabular-nums text-muted-foreground/70">
            {count.toString().padStart(2, "0")}
          </span>
        ) : null}
      </header>

      {loading ? (
        <ul
          className="flex flex-col gap-2"
          aria-hidden="true"
          data-ocid={`library.${scope}.loading_state`}
        >
          {Array.from({ length: 3 }, (_, i) => `skeleton-${scope}-${i}`).map(
            (id) => (
              <li key={id}>
                <Skeleton className="h-14 w-full rounded-md" />
              </li>
            ),
          )}
        </ul>
      ) : items.length === 0 ? (
        <div
          className={cn(
            "flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-background/40 px-4 py-6 text-center",
          )}
          data-ocid={`library.${scope}.empty_state`}
        >
          <Music4
            className="h-5 w-5 text-muted-foreground/60"
            aria-hidden="true"
          />
          <p className="text-xs text-muted-foreground">{emptyMessage}</p>
          {emptyAction}
        </div>
      ) : (
        <ul className="flex flex-col gap-2" data-ocid={`library.${scope}.list`}>
          {items.map((item, index) => (
            <TrackRow
              key={item.id}
              index={index}
              name={item.name}
              artist={item.artist}
              duration={item.duration}
              target={target}
              uploaded={item.uploaded}
              onLoad={() => onLoad(item)}
              onDelete={onDelete ? () => onDelete(item) : undefined}
              deleting={deletingId === item.id}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
