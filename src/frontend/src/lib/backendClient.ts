/**
 * Backend client for the DJ cabin.
 *
 * Wraps the generated actor with typed helpers for the track library, the pad
 * samples and the persisted cabin settings, plus object-storage upload helpers
 * that report progress. The generated bindings in `@/backend` remain the
 * production data layer; this module only adapts them for the UI.
 */

import type { Sample, Track, backendInterface } from "@/backend";
import { ExternalBlob } from "@caffeineai/object-storage";

/** A library entry shown in the UI, normalised from a backend record. */
export interface LibraryTrack {
  id: string;
  name: string;
  durationMs: number;
  /** Direct URL of the stored audio, or null when unavailable. */
  url: string | null;
  /** True when the entry came from the user's uploaded library. */
  uploaded: boolean;
}

/** A pad sample normalised from a backend record. */
export interface LibrarySample {
  id: string;
  name: string;
  slot: number;
  url: string | null;
}

/** Progress callback for uploads, receiving 0..100. */
export type UploadProgress = (percentage: number) => void;

/** Convert a backend Track into a UI library entry. */
function toLibraryTrack(track: Track): LibraryTrack {
  return {
    id: track.id.toString(),
    name: track.name,
    durationMs: Number(track.durationMs),
    url: track.file?.getDirectURL() ?? null,
    uploaded: true,
  };
}

/** Convert a backend Sample into a UI pad sample. */
function toLibrarySample(sample: Sample): LibrarySample {
  return {
    id: sample.id.toString(),
    name: sample.name,
    slot: Number(sample.padSlot),
    url: sample.file?.getDirectURL() ?? null,
  };
}

/** Read the caller's uploaded tracks. */
export async function listTracks(
  actor: backendInterface,
): Promise<LibraryTrack[]> {
  const tracks = await actor.listTracks();
  return tracks.map(toLibraryTrack);
}

/** Read the caller's pad samples. */
export async function listSamples(
  actor: backendInterface,
): Promise<LibrarySample[]> {
  const samples = await actor.listSamples();
  return samples.map(toLibrarySample);
}

/** Upload an audio file and register it in the caller's track library. */
export async function addTrack(
  actor: backendInterface,
  file: File,
  durationMs: number,
  onProgress?: UploadProgress,
): Promise<LibraryTrack> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const blob = ExternalBlob.fromBytes(
    bytes,
    file.type || "audio/mpeg",
    file.name,
  );
  if (onProgress) blob.withUploadProgress(onProgress);
  const track = await actor.addTrack(
    blob,
    file.name,
    BigInt(Math.round(durationMs)),
  );
  return toLibraryTrack(track);
}

/** Upload an audio file and assign it to a pad slot. */
export async function addSample(
  actor: backendInterface,
  file: File,
  slot: number,
  onProgress?: UploadProgress,
): Promise<LibrarySample> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const blob = ExternalBlob.fromBytes(
    bytes,
    file.type || "audio/mpeg",
    file.name,
  );
  if (onProgress) blob.withUploadProgress(onProgress);
  const sample = await actor.addSample(BigInt(slot), blob, file.name);
  return toLibrarySample(sample);
}

/** Delete one of the caller's tracks. */
export async function deleteTrack(
  actor: backendInterface,
  id: string,
): Promise<boolean> {
  return actor.deleteTrack(BigInt(id));
}

/** Delete one of the caller's samples. */
export async function deleteSample(
  actor: backendInterface,
  id: string,
): Promise<boolean> {
  return actor.deleteSample(BigInt(id));
}

/** Read the caller's persisted cabin settings payload. */
export async function getSettings(
  actor: backendInterface,
): Promise<string | null> {
  const settings = await actor.getSettings();
  return settings?.payload ?? null;
}

/** Persist the caller's cabin settings payload. */
export async function setSettings(
  actor: backendInterface,
  payload: string,
): Promise<void> {
  await actor.setSettings(payload);
}
