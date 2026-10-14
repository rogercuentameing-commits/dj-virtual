/**
 * PadTabs — the performance-pad mode bar plus the deck selector.
 *
 * The tab bar switches the pad grid between CUE, SMP, SCRT and STEMS, and the
 * deck selector decides which deck the pads act on. Both are pure controlled
 * components: the parent owns the active tab and deck so the grid and the
 * header stay in sync.
 */

import { cn } from "@/lib/utils";
import type { DeckId, PadTab } from "@/types/dj";

const TABS: PadTab[] = ["CUE", "SMP", "SCRT", "STEMS"];

/** Human-readable Spanish label for each tab. */
const TAB_LABELS: Record<PadTab, string> = {
  CUE: "CUE",
  SMP: "SMP",
  SCRT: "SCRT",
  STEMS: "STEMS",
};

interface PadTabsProps {
  activeTab: PadTab;
  onTabChange: (tab: PadTab) => void;
  deck: DeckId;
  onDeckChange: (deck: DeckId) => void;
}

export function PadTabs({
  activeTab,
  onTabChange,
  deck,
  onDeckChange,
}: PadTabsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div
        className="flex items-center gap-1 rounded-md border border-border bg-background/60 p-1 shadow-inset-control"
        role="tablist"
        aria-label="Modo de pads"
        data-ocid="pads.tab_bar"
      >
        {TABS.map((tab) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab)}
              className={cn(
                "label-hardware touch-target rounded-sm px-2.5 transition-snap",
                active
                  ? deck === "A"
                    ? "deck-a-fill text-deck-a-foreground glow-deck-a"
                    : "deck-b-fill text-deck-b-foreground glow-deck-b"
                  : "text-muted-foreground hover:bg-control hover:text-control-foreground",
              )}
              data-ocid={`pads.tab.${tab.toLowerCase()}`}
            >
              {TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>

      <fieldset
        className="flex items-center gap-1 rounded-md border border-border bg-background/60 p-1 shadow-inset-control"
        aria-label="Deck de destino"
        data-ocid="pads.deck_selector"
      >
        {(["A", "B"] as DeckId[]).map((id) => {
          const active = id === deck;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onDeckChange(id)}
              className={cn(
                "label-hardware touch-target rounded-sm px-3 transition-snap",
                active
                  ? id === "A"
                    ? "deck-a-fill text-deck-a-foreground glow-deck-a"
                    : "deck-b-fill text-deck-b-foreground glow-deck-b"
                  : "text-muted-foreground hover:bg-control hover:text-control-foreground",
              )}
              data-ocid={`pads.deck.${id.toLowerCase()}`}
            >
              DECK {id}
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}
