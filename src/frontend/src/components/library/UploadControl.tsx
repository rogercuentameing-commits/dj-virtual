/**
 * UploadControl — audio file picker with a visible upload progress bar.
 *
 * Accepts audio files, reports progress through the backend client, and calls
 * back on success so the library can refresh. When the user is not signed in it
 * renders a sign-in prompt instead of the picker.
 */

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { UploadCloud } from "lucide-react";
import { useId, useRef } from "react";

interface UploadControlProps {
  /** True when a signed-in identity is available. */
  authenticated: boolean;
  /** True while an upload is in flight. */
  uploading: boolean;
  /** Upload progress 0..100. */
  progress: number;
  /** Human-readable error from the last failed upload, if any. */
  error?: string | null;
  /** Called with the chosen audio file. */
  onSelect: (file: File) => void;
  /** Prompt the user to sign in. */
  onSignIn: () => void;
}

export function UploadControl({
  authenticated,
  uploading,
  progress,
  error,
  onSelect,
  onSignIn,
}: UploadControlProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();

  if (!authenticated) {
    return (
      <div
        className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-background/40 px-4 py-5 text-center"
        data-ocid="library.upload.signin_state"
      >
        <UploadCloud
          className="h-5 w-5 text-muted-foreground/60"
          aria-hidden="true"
        />
        <p className="text-xs text-muted-foreground">
          Inicia sesión para subir tus propias pistas a la biblioteca.
        </p>
        <button
          type="button"
          onClick={onSignIn}
          className="label-hardware touch-target rounded-md border border-border bg-control px-4 text-control-foreground shadow-raised-control transition-snap hover:bg-control-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-ocid="library.upload.signin_button"
        >
          Iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" data-ocid="library.upload.panel">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="audio/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file);
          event.target.value = "";
        }}
        data-ocid="library.upload.input"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "surface-control flex min-h-[52px] items-center justify-center gap-2 rounded-md border border-border px-4 text-control-foreground shadow-raised-control transition-snap hover:border-input hover:bg-control-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        )}
        data-ocid="library.upload.button"
      >
        <UploadCloud className="h-4 w-4" aria-hidden="true" />
        <span className="label-hardware">
          {uploading ? "Subiendo…" : "Subir pista"}
        </span>
      </button>

      {uploading ? (
        <output
          className="flex flex-col gap-1"
          data-ocid="library.upload.progress"
          aria-live="polite"
        >
          <Progress
            value={progress}
            className="h-1.5 bg-control"
            aria-label="Progreso de subida"
          />
          <span className="label-hardware text-right text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </output>
      ) : null}

      {error ? (
        <p
          className="text-xs text-destructive"
          role="alert"
          data-ocid="library.upload.error_state"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
