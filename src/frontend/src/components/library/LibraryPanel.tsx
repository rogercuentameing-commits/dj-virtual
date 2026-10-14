/**
 * LibraryPanel — the track library picker.
 *
 * Opens as a bottom sheet when a deck's LOAD button is tapped. It lists the
 * built-in royalty-free demo catalog and the signed-in user's uploaded tracks
 * (fetched from the backend), filters both by name, uploads new audio files
 * with visible progress, deletes the user's own uploads, and loads the chosen
 * track into the target deck before closing.
 */

import { useAudio } from "@/audio/AudioProvider";
import { createActor } from "@/backend";
import { TrackList, type TrackListItem } from "@/components/library/TrackList";
import { UploadControl } from "@/components/library/UploadControl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DEMO_TRACKS, formatDuration } from "@/data/demoTracks";
import {
  type LibraryTrack,
  addTrack,
  deleteTrack,
  listTracks,
} from "@/lib/backendClient";
import { cn } from "@/lib/utils";
import type { DeckId, DemoTrack } from "@/types/dj";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface LibraryPanelProps {
  /** Deck the selected track loads into, or null when the sheet is closed. */
  target: DeckId | null;
  /** Close the sheet. */
  onClose: () => void;
}

/** Read an audio file's duration in milliseconds via a temporary element. */
function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const cleanup = () => URL.revokeObjectURL(url);
    audio.addEventListener("loadedmetadata", () => {
      const ms = Number.isFinite(audio.duration) ? audio.duration * 1000 : 0;
      cleanup();
      resolve(ms);
    });
    audio.addEventListener("error", () => {
      cleanup();
      resolve(0);
    });
    audio.src = url;
  });
}

/** Map a demo catalog entry into a list item. */
function demoToItem(track: DemoTrack): TrackListItem {
  return {
    id: `demo-${track.id}`,
    name: track.name,
    artist: track.artist,
    duration: formatDuration(track.durationMs),
    uploaded: false,
  };
}

/** Map a backend library entry into a list item. */
function uploadedToItem(track: LibraryTrack): TrackListItem {
  return {
    id: `upload-${track.id}`,
    name: track.name,
    artist: "Tu biblioteca",
    duration: formatDuration(track.durationMs),
    uploaded: true,
  };
}

export function LibraryPanel({ target, onClose }: LibraryPanelProps) {
  const { actions } = useAudio();
  const { actor, isFetching } = useActor(createActor);
  const { isAuthenticated, login } = useInternetIdentity();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const open = target !== null;

  // Reset transient state each time the sheet opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setProgress(0);
      setUploadError(null);
    }
  }, [open]);

  const uploadsQuery = useQuery({
    queryKey: ["library-tracks"],
    queryFn: async () => {
      if (!actor) return [];
      return listTracks(actor);
    },
    enabled: open && isAuthenticated && !!actor && !isFetching,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!actor) throw new Error("Backend no disponible");
      const durationMs = await readAudioDuration(file);
      return addTrack(actor, file, durationMs, setProgress);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["library-tracks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Backend no disponible");
      return deleteTrack(actor, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["library-tracks"] });
    },
  });

  const demoItems = useMemo(() => DEMO_TRACKS.map(demoToItem), []);
  const uploadedItems = useMemo(
    () => (uploadsQuery.data ?? []).map(uploadedToItem),
    [uploadsQuery.data],
  );

  const normalized = query.trim().toLowerCase();
  const filterItems = (items: TrackListItem[]) =>
    normalized === ""
      ? items
      : items.filter((item) => item.name.toLowerCase().includes(normalized));

  const filteredDemo = filterItems(demoItems);
  const filteredUploads = filterItems(uploadedItems);

  /** Load the chosen track into the target deck and close the sheet. */
  const handleLoad = (item: TrackListItem) => {
    if (!target) return;
    const demo = DEMO_TRACKS.find((track) => `demo-${track.id}` === item.id);
    if (demo) {
      actions.load(target, demo);
      onClose();
      return;
    }
    const uploaded = (uploadsQuery.data ?? []).find(
      (track) => `upload-${track.id}` === item.id,
    );
    if (uploaded?.url) {
      actions.load(target, {
        id: `upload-${uploaded.id}`,
        name: uploaded.name,
        artist: "Tu biblioteca",
        durationMs: uploaded.durationMs,
        url: uploaded.url,
        bpm: 0,
        accent: target,
      });
      onClose();
    }
  };

  const handleUpload = (file: File) => {
    setUploadError(null);
    setProgress(0);
    uploadMutation.mutate(file, {
      onError: () =>
        setUploadError("No se pudo subir la pista. Inténtalo de nuevo."),
    });
  };

  const handleDelete = (item: TrackListItem) => {
    const id = item.id.replace(/^upload-/, "");
    deleteMutation.mutate(id);
  };

  const accentFill = target === "B" ? "deck-b-fill" : "deck-a-fill";

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <SheetContent
        side="bottom"
        className="surface-panel flex h-[85dvh] flex-col gap-0 rounded-t-2xl border-t border-border p-0 shadow-panel-depth [&>button.absolute]:hidden"
        data-ocid="library.sheet"
      >
        <SheetHeader className="shrink-0 gap-3 border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-md font-display text-lg font-bold text-background",
                  accentFill,
                )}
                aria-hidden="true"
              >
                {target ?? "A"}
              </span>
              <div className="min-w-0">
                <SheetTitle className="truncate font-display text-sm font-bold uppercase tracking-widest text-foreground">
                  Biblioteca
                </SheetTitle>
                <SheetDescription className="label-hardware truncate text-muted-foreground">
                  Cargar en Deck {target ?? "A"}
                </SheetDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar biblioteca"
              className="touch-target flex items-center justify-center rounded-md border border-border bg-control text-control-foreground transition-snap hover:bg-control-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-ocid="library.close_button"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre…"
              aria-label="Buscar pistas por nombre"
              className="h-11 w-full rounded-md border border-input bg-background/60 pl-9 pr-3 text-sm text-foreground shadow-inset-control outline-none transition-snap placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
              data-ocid="library.search_input"
            />
          </div>
        </SheetHeader>

        <div
          className="scrollbar-none flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-4 py-4"
          data-ocid="library.scroll_area"
        >
          <TrackList
            title="Pistas demo"
            count={filteredDemo.length}
            items={filteredDemo}
            target={target ?? "A"}
            scope="demo"
            emptyMessage="Ninguna pista demo coincide con la búsqueda."
            onLoad={handleLoad}
          />

          <TrackList
            title="Tus subidas"
            count={filteredUploads.length}
            items={filteredUploads}
            target={target ?? "A"}
            scope="uploads"
            loading={isAuthenticated && uploadsQuery.isLoading}
            emptyMessage={
              isAuthenticated
                ? "Aún no has subido pistas. Añade tu primer archivo de audio."
                : "Inicia sesión para ver y subir tus propias pistas."
            }
            onLoad={handleLoad}
            onDelete={handleDelete}
            deletingId={
              deleteMutation.isPending
                ? `upload-${String(deleteMutation.variables)}`
                : null
            }
          />

          <UploadControl
            authenticated={isAuthenticated}
            uploading={uploadMutation.isPending}
            progress={progress}
            error={uploadError}
            onSelect={handleUpload}
            onSignIn={() => login()}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
