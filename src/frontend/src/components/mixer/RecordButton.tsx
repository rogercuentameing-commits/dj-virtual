/**
 * RecordButton — starts/stops recording the master mix.
 *
 * While recording it shows an elapsed timer and a pulsing indicator. Once a
 * take has finished it reveals a download action for the recorded file.
 */

import { useRecorder } from "@/hooks/useRecorder";
import { cn } from "@/lib/utils";
import { Circle, Download } from "lucide-react";

export interface RecordButtonProps {
  /** Extra classes for the wrapper. */
  className?: string;
  /** Deterministic test marker for the REC toggle. */
  ocid?: string;
}

/** Format seconds as m:ss. */
function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function RecordButton({ className, ocid }: RecordButtonProps) {
  const { recording, elapsed, downloadUrl, filename, start, stop, download } =
    useRecorder();

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <span className="label-hardware text-muted-foreground">GRABAR</span>
      <button
        type="button"
        onClick={recording ? stop : start}
        aria-pressed={recording}
        className={cn(
          "label-hardware touch-target flex w-full items-center justify-center gap-2 rounded-md border px-3 transition-snap",
          recording
            ? "border-destructive bg-destructive/20 text-destructive"
            : "border-border bg-control text-control-foreground hover:bg-control-active",
        )}
        data-ocid={ocid}
      >
        <Circle
          className={cn(
            "h-3 w-3 fill-destructive",
            recording && "animate-pulse-rec",
          )}
          aria-hidden="true"
        />
        {recording ? formatClock(elapsed) : "REC"}
      </button>
      {downloadUrl ? (
        <button
          type="button"
          onClick={download}
          className="label-hardware touch-target flex w-full items-center justify-center gap-2 rounded-md border border-success/50 bg-success/15 px-3 text-success transition-snap hover:bg-success/25"
          data-ocid={ocid ? `${ocid}.download` : undefined}
          title={filename ?? undefined}
        >
          <Download className="h-3 w-3" aria-hidden="true" />
          Descargar
        </button>
      ) : null}
    </div>
  );
}
