/**
 * MixerPanel — the central mixer of the cabin.
 *
 * Hosts the two channel strips (A and B), the master VU meter, the horizontal
 * crossfader and the REC button. Everything is wired to useAudio(), so the
 * panel is the single place where the mix is shaped.
 */

import { useAudio } from "@/audio/AudioProvider";
import { ChannelStrip } from "@/components/mixer/ChannelStrip";
import { Crossfader } from "@/components/mixer/Crossfader";
import { RecordButton } from "@/components/mixer/RecordButton";
import { VuMeter } from "@/components/mixer/VuMeter";
import { cn } from "@/lib/utils";

export interface MixerPanelProps {
  /** Extra classes for the wrapper. */
  className?: string;
}

export function MixerPanel({ className }: MixerPanelProps) {
  const { decks, master, actions } = useAudio();
  const active = decks.A.playing || decks.B.playing;

  return (
    <section
      className={cn(
        "surface-panel flex min-h-0 flex-col gap-2 rounded-lg border border-border p-2 shadow-panel-depth",
        className,
      )}
      aria-label="Mezclador"
      data-ocid="mixer.panel"
    >
      <header className="flex items-center justify-between">
        <span className="label-hardware text-foreground">MEZCLADOR</span>
        <span className="label-hardware text-muted-foreground">
          MASTER {Math.round(master.volume * 100)}
        </span>
      </header>

      {/* Channel strips side by side, with the master VU between them. */}
      <div className="flex min-h-0 flex-1 items-stretch gap-2">
        <ChannelStrip deck="A" className="flex-1" />
        <VuMeter
          active={active}
          className="shrink-0 justify-center"
          ocid="mixer.vu_meter"
        />
        <ChannelStrip deck="B" className="flex-1" />
      </div>

      {/* Crossfader + REC */}
      <div className="flex items-end gap-3">
        <Crossfader
          value={master.crossfader}
          onChange={actions.setCrossfader}
          className="flex-1"
          ocid="mixer.crossfader"
        />
        <RecordButton className="w-28 shrink-0" ocid="mixer.rec_button" />
      </div>
    </section>
  );
}
