/**
 * useRecorder — exposes the recording state and a download action for the
 * finished master mix.
 */

import { useAudio } from "@/audio/AudioProvider";
import { useCallback } from "react";

export interface RecorderControls {
  recording: boolean;
  elapsed: number;
  downloadUrl: string | null;
  filename: string | null;
  start: () => void;
  stop: () => void;
  download: () => void;
}

export function useRecorder(): RecorderControls {
  const { recorder, actions } = useAudio();

  const download = useCallback(() => {
    if (!recorder.downloadUrl) return;
    const anchor = document.createElement("a");
    anchor.href = recorder.downloadUrl;
    anchor.download = recorder.filename ?? "cabin-mix.webm";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, [recorder.downloadUrl, recorder.filename]);

  return {
    recording: recorder.recording,
    elapsed: recorder.elapsed,
    downloadUrl: recorder.downloadUrl,
    filename: recorder.filename,
    start: actions.startRecording,
    stop: actions.stopRecording,
    download,
  };
}
