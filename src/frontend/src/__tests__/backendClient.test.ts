/**
 * backendClient consumer-contract tests.
 *
 * The client adapts the generated actor into the UI's library shapes. These
 * tests pin the transformation contract with a typed actor mock: a backend
 * record maps to a `LibraryTrack`/`LibrarySample`, the upload helpers forward
 * the file bytes and report progress, and the settings helpers unwrap the
 * optional payload. The actor is mocked, so this proves the adapter, not the
 * canister.
 */

import type { Sample, Track, backendInterface } from "@/backend";
import {
  addSample,
  addTrack,
  deleteSample,
  deleteTrack,
  getSettings,
  listSamples,
  listTracks,
  setSettings,
} from "@/lib/backendClient";
import { beforeEach, describe, expect, it, vi } from "vitest";

// `ExternalBlob.fromBytes` is the only object-storage surface the client uses.
// Mocking it keeps the test off `file-type` and the network while preserving
// the shape the client forwards to the actor.
const blobMock = vi.hoisted(() => {
  const instances: Array<{
    bytes: Uint8Array;
    contentType?: string;
    filename?: string;
    onProgress?: (percentage: number) => void;
  }> = [];
  class ExternalBlob {
    bytes: Uint8Array;
    contentType?: string;
    filename?: string;
    onProgress?: (percentage: number) => void;
    constructor(bytes: Uint8Array, contentType?: string, filename?: string) {
      this.bytes = bytes;
      this.contentType = contentType;
      this.filename = filename;
      instances.push(this);
    }
    static fromBytes(
      bytes: Uint8Array,
      contentType?: string,
      filename?: string,
    ) {
      return new ExternalBlob(bytes, contentType, filename);
    }
    withUploadProgress(onProgress: (percentage: number) => void) {
      this.onProgress = onProgress;
      return this;
    }
    getDirectURL() {
      return "https://example.test/blob";
    }
  }
  return { ExternalBlob, instances };
});

vi.mock("@caffeineai/object-storage", () => ({
  ExternalBlob: blobMock.ExternalBlob,
}));

/** A minimal typed actor mock; only the methods under test are implemented. */
function createActorMock(
  overrides: Partial<backendInterface> = {},
): backendInterface {
  const base = {
    listTracks: vi.fn(async () => [] as Track[]),
    listSamples: vi.fn(async () => [] as Sample[]),
    addTrack: vi.fn(),
    addSample: vi.fn(),
    deleteTrack: vi.fn(async () => true),
    deleteSample: vi.fn(async () => true),
    getSettings: vi.fn(async () => null),
    setSettings: vi.fn(),
  };
  return { ...base, ...overrides } as unknown as backendInterface;
}

/** A backend Track record with a direct URL. */
function trackRecord(overrides: Partial<Track> = {}): Track {
  return {
    id: 7n,
    owner: {} as Track["owner"],
    file: {
      getDirectURL: () => "https://example.test/track.mp3",
    } as Track["file"],
    name: "Neon Drive",
    createdAt: 1n,
    durationMs: 294_000n,
    ...overrides,
  };
}

/** A backend Sample record with a direct URL. */
function sampleRecord(overrides: Partial<Sample> = {}): Sample {
  return {
    id: 3n,
    owner: {} as Sample["owner"],
    file: {
      getDirectURL: () => "https://example.test/sample.mp3",
    } as Sample["file"],
    name: "Kick",
    createdAt: 1n,
    padSlot: 2n,
    ...overrides,
  };
}

/**
 * A `File`-shaped upload input. jsdom's `File` does not implement
 * `arrayBuffer()` in this environment, so the client's `file.arrayBuffer()`
 * call is served by an explicit stub while `name`/`type` stay real.
 */
function audioFile(bytes: number[], name: string, type = "audio/mpeg"): File {
  const data = new Uint8Array(bytes);
  return {
    name,
    type,
    arrayBuffer: async () =>
      data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  } as unknown as File;
}

beforeEach(() => {
  blobMock.instances.length = 0;
});

describe("backendClient", () => {
  it("maps backend tracks into library entries", async () => {
    const actor = createActorMock({
      listTracks: vi.fn(async () => [trackRecord()]),
    });

    const tracks = await listTracks(actor);
    expect(tracks).toEqual([
      {
        id: "7",
        name: "Neon Drive",
        durationMs: 294_000,
        url: "https://example.test/track.mp3",
        uploaded: true,
      },
    ]);
  });

  it("maps backend samples into library entries", async () => {
    const actor = createActorMock({
      listSamples: vi.fn(async () => [sampleRecord()]),
    });

    const samples = await listSamples(actor);
    expect(samples).toEqual([
      {
        id: "3",
        name: "Kick",
        slot: 2,
        url: "https://example.test/sample.mp3",
      },
    ]);
  });

  it("forwards uploaded track bytes and reports progress", async () => {
    const added = trackRecord({ id: 11n, name: "Mi Pista" });
    const actor = createActorMock({
      addTrack: vi.fn(async () => added),
    });
    const file = audioFile([1, 2, 3], "mi-pista.mp3");
    const onProgress = vi.fn();

    const result = await addTrack(actor, file, 180_000, onProgress);

    expect(result.id).toBe("11");
    expect(result.name).toBe("Mi Pista");
    expect(actor.addTrack).toHaveBeenCalledWith(
      expect.anything(),
      "mi-pista.mp3",
      180_000n,
    );
    // The client wires the progress callback onto the blob it forwards.
    expect(blobMock.instances[0]?.onProgress).toBe(onProgress);
  });

  it("forwards uploaded sample bytes with the pad slot", async () => {
    const added = sampleRecord({ id: 5n, padSlot: 4n });
    const actor = createActorMock({
      addSample: vi.fn(async () => added),
    });
    const file = audioFile([9], "snare.mp3");

    const result = await addSample(actor, file, 4);

    expect(result.slot).toBe(4);
    expect(actor.addSample).toHaveBeenCalledWith(
      4n,
      expect.anything(),
      "snare.mp3",
    );
  });

  it("deletes tracks and samples by numeric id", async () => {
    const actor = createActorMock();

    await expect(deleteTrack(actor, "7")).resolves.toBe(true);
    await expect(deleteSample(actor, "3")).resolves.toBe(true);
    expect(actor.deleteTrack).toHaveBeenCalledWith(7n);
    expect(actor.deleteSample).toHaveBeenCalledWith(3n);
  });

  it("unwraps the optional settings payload", async () => {
    const actor = createActorMock({
      getSettings: vi.fn(async () => ({
        owner: {} as never,
        updatedAt: 1n,
        payload: '{"crossfader":0.5}',
      })),
    });

    await expect(getSettings(actor)).resolves.toBe('{"crossfader":0.5}');
  });

  it("returns null when no settings are stored", async () => {
    const actor = createActorMock({ getSettings: vi.fn(async () => null) });
    await expect(getSettings(actor)).resolves.toBeNull();
  });

  it("persists the settings payload", async () => {
    const actor = createActorMock();
    await setSettings(actor, '{"volume":0.9}');
    expect(actor.setSettings).toHaveBeenCalledWith('{"volume":0.9}');
  });
});
