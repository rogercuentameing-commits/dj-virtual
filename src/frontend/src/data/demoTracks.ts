/**
 * Demo track catalog.
 *
 * Every URL below was verified to return HTTP 200/206 with an
 * `access-control-allow-origin: *` header, so the Web Audio API can fetch and
 * decode them cross-origin. Sources are royalty-free / CC0.
 */

import type { DemoTrack, PadSample } from "@/types/dj";

export const DEMO_TRACKS: DemoTrack[] = [
  {
    id: "neon-drive",
    name: "Neon Drive",
    artist: "Pixabay Audio",
    durationMs: 294_000,
    url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
    bpm: 124,
    accent: "A",
  },
  {
    id: "midnight-circuit",
    name: "Midnight Circuit",
    artist: "Pixabay Audio",
    durationMs: 379_000,
    url: "https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3",
    bpm: 128,
    accent: "B",
  },
  {
    id: "afterglow",
    name: "Afterglow",
    artist: "Pixabay Audio",
    durationMs: 288_000,
    url: "https://cdn.pixabay.com/audio/2022/11/22/audio_febc508520.mp3",
    bpm: 122,
    accent: "A",
  },
  {
    id: "deep-signal",
    name: "Deep Signal",
    artist: "Pixabay Audio",
    durationMs: 196_000,
    url: "https://cdn.pixabay.com/audio/2024/07/29/audio_4e09b35d5b.mp3",
    bpm: 126,
    accent: "B",
  },
  {
    id: "test-tone",
    name: "Reference Tone",
    artist: "Pixabay Audio",
    durationMs: 192_000,
    url: "https://cdn.pixabay.com/audio/2024/03/26/audio_6846775846.mp3",
    bpm: 120,
    accent: "A",
  },
];

/** Default pad samples, one per slot, shared by both decks. */
export const DEFAULT_SAMPLES: PadSample[] = [
  {
    slot: 0,
    name: "Kick",
    url: "https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3",
  },
  {
    slot: 1,
    name: "Snare",
    url: "https://cdn.pixabay.com/audio/2021/11/25/audio_91b32e02f9.mp3",
  },
  {
    slot: 2,
    name: "Clap",
    url: "https://cdn.pixabay.com/audio/2024/07/24/audio_e449d10473.mp3",
  },
  {
    slot: 3,
    name: "Hat",
    url: "https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3",
  },
  {
    slot: 4,
    name: "Riser",
    url: "https://cdn.pixabay.com/audio/2023/10/24/audio_9408f7326a.mp3",
  },
  {
    slot: 5,
    name: "Vox",
    url: "https://cdn.pixabay.com/audio/2021/07/24/audio_14fa6dcab6.mp3",
  },
  {
    slot: 6,
    name: "Bass",
    url: "https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3",
  },
  {
    slot: 7,
    name: "FX",
    url: "https://cdn.pixabay.com/audio/2021/11/25/audio_91b32e02f9.mp3",
  },
];

/** Format a millisecond duration as m:ss. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
