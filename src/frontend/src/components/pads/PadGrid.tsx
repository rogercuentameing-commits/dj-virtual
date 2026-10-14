/**
 * PadGrid — the 4x2 grid of eight performance pads.
 *
 * Renders the eight slots for the active tab. The grid is a fixed 4-column
 * layout so it reads as a hardware pad bank on both portrait and landscape
 * phones, and it never scrolls the page: pads are `touch-none` buttons.
 */

import { PadButton } from "@/components/pads/PadButton";
import type { DeckId, PadTab } from "@/types/dj";

/** One resolved pad row, produced by the parent from deck state. */
export interface PadCell {
  slot: number;
  label: string;
  detail?: string;
  active?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  /** Present on SMP pads to enable the replace-sample affordance. */
  onReplace?: (file: File) => void;
  /** Upload progress 0..100 for this pad, or null. */
  uploadProgress?: number | null;
}

interface PadGridProps {
  tab: PadTab;
  deck: DeckId;
  cells: PadCell[];
  /** Slot currently held down (scratch), or null. */
  pressedSlot: number | null;
  onPress: (slot: number) => void;
  onRelease: (slot: number) => void;
}

export function PadGrid({
  tab,
  deck,
  cells,
  pressedSlot,
  onPress,
  onRelease,
}: PadGridProps) {
  return (
    <fieldset
      className="grid grid-cols-4 grid-rows-2 gap-2"
      aria-label={`Pads de ${tab} del Deck ${deck}`}
      data-ocid="pads.grid"
    >
      {cells.map((cell) => (
        <PadButton
          key={cell.slot}
          slot={cell.slot}
          tab={tab}
          deck={deck}
          label={cell.label}
          detail={cell.detail}
          active={cell.active}
          pressed={pressedSlot === cell.slot}
          disabled={cell.disabled}
          ariaLabel={cell.ariaLabel}
          onPress={() => onPress(cell.slot)}
          onRelease={() => onRelease(cell.slot)}
          onReplace={cell.onReplace}
          uploadProgress={cell.uploadProgress}
        />
      ))}
    </fieldset>
  );
}
