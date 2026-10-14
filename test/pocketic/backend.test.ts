/**
 * PocketIC backend lane for the DJ cabin.
 *
 * Installs the app's own compiled `src/backend/dist/backend.wasm` into the
 * platform's PocketIC replica and calls the real public API. This is the only
 * place in the build that exercises the canister at all: the frontend suite
 * mocks the actor, so it passes unchanged against a backend whose public
 * methods are unimplemented stubs.
 *
 * The runner proves `@dfinity/pic` resolves from this directory before Vitest
 * starts, so every runtime import here is limited to `@dfinity/pic`, `vitest`,
 * Node built-ins and the app's own declarations.
 */

import { PocketIc, createIdentity } from "@dfinity/pic";
import type { Actor, CanisterFixture } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";
// Set only on a converted project: the last pre-EM revision, whose schema this
// app's migration chain replays from. Installing the current wasm onto an empty
// canister there traps IC0503 before any test runs.
const BASELINE_WASM = process.env.BACKEND_WASM_BASELINE;

let pic: PocketIc | undefined;
let actor: Actor<_SERVICE>;
let canisterId: CanisterFixture<_SERVICE>["canisterId"];

/** A deterministic signed-in caller. */
const alice = createIdentity("alice");
/** A second deterministic caller, used for isolation checks. */
const bob = createIdentity("bob");

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  if (BASELINE_WASM === undefined) {
    ({ actor, canisterId } = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: BACKEND_WASM,
    }));
    return;
  }
  // `[baseline, current]`, the same install contract the hosted deploy uses for
  // a converted project. The upgrade replays the chain from the legacy schema.
  const installed = await pic.setupCanister<_SERVICE>({
    idlFactory,
    wasm: BASELINE_WASM,
  });
  await pic.upgradeCanister({
    canisterId: installed.canisterId,
    wasm: BACKEND_WASM,
    arg: new Uint8Array(),
  });
  ({ actor, canisterId } = installed);
});

afterAll(async () => {
  // `?.` because `beforeAll` may not have got that far. A failed
  // `PocketIc.create` otherwise stacks "Cannot read properties of undefined"
  // on top of the real error and buries the one line that explains the run.
  await pic?.tearDown();
});

it("answers an empty-state read instead of trapping", async () => {
  actor.setIdentity(alice);
  await expect(actor.listTracks()).resolves.toEqual([]);
  await expect(actor.listSamples()).resolves.toEqual([]);
  await expect(actor.getSettings()).resolves.toEqual([]);
});

it("round-trips a track through the real canister", async () => {
  actor.setIdentity(alice);
  const file = new Uint8Array([1, 2, 3, 4]);
  const track = await actor.addTrack(file, "Mi Pista", 180_000n);
  expect(track.name).toBe("Mi Pista");
  expect(track.durationMs).toBe(180_000n);

  const tracks = await actor.listTracks();
  expect(tracks).toHaveLength(1);
  expect(tracks[0]).toMatchObject({ id: track.id, name: "Mi Pista" });
});

it("deletes a track and reports the missing id", async () => {
  actor.setIdentity(alice);
  const track = await actor.addTrack(new Uint8Array([9]), "Borrar", 60_000n);
  await expect(actor.deleteTrack(track.id)).resolves.toBe(true);
  await expect(actor.deleteTrack(track.id)).resolves.toBe(false);
});

it("round-trips a pad sample through the real canister", async () => {
  actor.setIdentity(alice);
  const sample = await actor.addSample(3n, new Uint8Array([7, 7]), "Kick");
  expect(sample.padSlot).toBe(3n);
  expect(sample.name).toBe("Kick");

  const samples = await actor.listSamples();
  expect(samples.some((entry) => entry.id === sample.id)).toBe(true);
});

it("persists and reads back cabin settings", async () => {
  actor.setIdentity(alice);
  await actor.setSettings('{"crossfader":0.5}');
  const settings = await actor.getSettings();
  expect(settings).toHaveLength(1);
  expect(settings[0].payload).toBe('{"crossfader":0.5}');
});

it("does not show one caller's library to another", async () => {
  actor.setIdentity(alice);
  await actor.addTrack(new Uint8Array([5]), "Privada", 30_000n);

  actor.setIdentity(bob);
  const bobTracks = await actor.listTracks();
  expect(bobTracks).toEqual([]);
});

it("rejects an anonymous caller", async () => {
  // A freshly created actor calls as the anonymous principal until an identity
  // is set. `pic` is optional only so `afterAll` can tear down a partial setup;
  // `beforeAll` has set it here.
  const guest = pic!.createActor<_SERVICE>(idlFactory, canisterId);
  await expect(guest.listTracks()).rejects.toThrow();
});
