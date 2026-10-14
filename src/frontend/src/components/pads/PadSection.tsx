/**
 * PadSection — the performance pad bank.
 *
 * Owns the active tab and target deck, resolves the eight pad cells from the
 * selected deck's state, and dispatches each pad press to the shared audio
 * engine:
 *
 *   CUE   — set a hot cue on an empty pad, jump to it on a filled pad.
 *   SMP   — trigger the assigned sample; each pad can replace its sample by
 *           uploading an audio file through the backend client.
 *   SCRT  — press-and-hold scratch, release to stop.
 *   STEMS — toggle isolation of one stem band.
 *
 * The section is a controlled shell around PadTabs + PadGrid so the header and
 * the grid always agree on the active tab and deck.
 */

import { useAudio } from "@/audio/AudioProvider";
import { createActor } from "@/backend";
import { type PadCell, PadGrid } from "@/components/pads/PadGrid";
import { PadTabs } from "@/components/pads/PadTabs";
import { addSample } from "@/lib/backendClient";
import { cn } from "@/lib/utils";
import type { DeckId, PadTab, StemBand } from "@/types/dj";
import { useActor } from "@caffeineai/core-infrastructure";
import { useCallback, useMemo, useState } from "react";

/** The four stem bands, in pad order. */
const STEM_BANDS: StemBand[] = ["vocal", "drums", "bass", "melody"];

/** Spanish labels for the stem bands. */
const STEM_LABELS: Record<StemBand, string> = {
  vocal: "VOZ",
  drums: "BATERÍA",
  bass: "BAJO",
  melody: "MELODÍA",
};

/** Format a cue position in seconds as m:ss.d. */
function formatCue(seconds: number): string {
  const total = Math.max(0, seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toFixed(1).padStart(4, "0")}`;
}

export function PadSection() {
  const { decks, actions } = useAudio();
  const { actor } = useActor(createActor);
  const [tab, setTab] = useState<PadTab>("CUE");
  const [deck, setDeck] = useState<DeckId>("A");
  const [pressedSlot, setPressedSlot] = useState<number | null>(null);
  const [uploads, setUploads] = useState<Record<number, number>>({});

  const deckState = decks[deck];

  /** Upload a replacement sample for one SMP pad. */
  const replaceSample = useCallback(
    (slot: number, file: File) => {
      if (!actor) return;
      setUploads((prev) => ({ ...prev, [slot]: 0 }));
      void addSample(actor, file, slot, (percentage) => {
        setUploads((prev) => ({ ...prev, [slot]: percentage }));
      })
        .then((sample) => {
          if (sample.url) {
            actions.setSample(deck, slot, {
              slot,
              name: sample.name,
              url: sample.url,
            });
          }
          setUploads((prev) => {
            const next = { ...prev };
            delete next[slot];
            return next;
          });
        })
        .catch(() => {
          setUploads((prev) => {
            const next = { ...prev };
            delete next[slot];
            return next;
          });
        });
    },
    [actor, actions, deck],
  );

  /** Resolve the eight pad cells for the active tab. */
  const cells = useMemo<PadCell[]>(() => {
    return Array.from({ length: 8 }, (_, slot) => {
      if (tab === "CUE") {
        const cuePoint = deckState.cues.find((entry) => entry.slot === slot);
        const filled = cuePoint !== undefined;
        return {
          slot,
          label: filled ? formatCue(cuePoint.position) : `${slot + 1}`,
          detail: filled ? "SALTAR" : "MARCAR",
          active: filled,
          disabled: !deckState.track,
          ariaLabel: filled
            ? `Saltar al hot cue ${slot + 1} en ${formatCue(cuePoint.position)}`
            : `Marcar hot cue ${slot + 1} en la posición actual`,
        };
      }

      if (tab === "SMP") {
        const sample = deckState.samples[slot];
        return {
          slot,
          label: sample?.name ?? `PAD ${slot + 1}`,
          detail: "SAMPLE",
          ariaLabel: sample
            ? `Reproducir sample ${sample.name}`
            : `Pad ${slot + 1} sin sample asignado`,
          onReplace: (file: File) => replaceSample(slot, file),
          uploadProgress: uploads[slot] ?? null,
        };
      }

      if (tab === "SCRT") {
        return {
          slot,
          label: `SCR ${slot + 1}`,
          detail: "MANTENER",
          ariaLabel: `Aplicar scratch con el pad ${slot + 1}, mantener pulsado`,
        };
      }

      const band = STEM_BANDS[slot];
      const isolated = deckState.stems[band];
      return {
        slot,
        label: STEM_LABELS[band],
        detail: isolated ? "AISLADO" : "MEZCLA",
        active: isolated,
        ariaLabel: isolated
          ? `Reactivar la banda ${STEM_LABELS[band]}`
          : `Aislar la banda ${STEM_LABELS[band]}`,
      };
    });
  }, [tab, deckState, uploads, replaceSample]);

  const handlePress = useCallback(
    (slot: number) => {
      if (tab === "CUE") {
        const filled = deckState.cues.some((entry) => entry.slot === slot);
        if (filled) actions.jumpCue(deck, slot);
        else actions.setCue(deck, slot);
        return;
      }
      if (tab === "SMP") {
        actions.triggerSample(deck, slot);
        return;
      }
      if (tab === "SCRT") {
        setPressedSlot(slot);
        actions.scratch(deck, true);
        return;
      }
      actions.toggleStem(deck, STEM_BANDS[slot]);
    },
    [tab, deck, deckState.cues, actions],
  );

  const handleRelease = useCallback(
    (slot: number) => {
      if (tab !== "SCRT") return;
      setPressedSlot((current) => (current === slot ? null : current));
      actions.scratch(deck, false);
    },
    [tab, deck, actions],
  );

  return (
    <section
      className={cn(
        "surface-panel flex min-h-0 flex-col gap-2 rounded-lg border p-2 shadow-panel-depth",
        deck === "A" ? "border-deck-a/30" : "border-deck-b/30",
      )}
      aria-label="Pads de performance"
      data-ocid="pads.panel"
    >
      <PadTabs
        activeTab={tab}
        onTabChange={setTab}
        deck={deck}
        onDeckChange={setDeck}
      />
      <PadGrid
        tab={tab}
        deck={deck}
        cells={cells}
        pressedSlot={pressedSlot}
        onPress={handlePress}
        onRelease={handleRelease}
      />
    </section>
  );
}
