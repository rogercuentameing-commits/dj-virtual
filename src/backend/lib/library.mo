import Storage "mo:caffeineai-object-storage/Storage";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Types "../types/library";
import Common "../types/common";

module {
  /// Shared mutable id counter for library entries.
  public type IdState = { var nextEntryId : Nat };

  /// Per-user track library: owner -> (entry id -> track).
  public type TrackStore = Map.Map<Principal, Map.Map<Nat, Types.Track>>;

  /// Per-user pad samples: owner -> (entry id -> sample).
  public type SampleStore = Map.Map<Principal, Map.Map<Nat, Types.Sample>>;

  func tracksOf(store : TrackStore, owner : Principal) : Map.Map<Nat, Types.Track> {
    switch (store.get(owner)) {
      case (?inner) { inner };
      case null {
        let inner = Map.empty<Nat, Types.Track>();
        store.add(owner, inner);
        inner;
      };
    };
  };

  func samplesOf(store : SampleStore, owner : Principal) : Map.Map<Nat, Types.Sample> {
    switch (store.get(owner)) {
      case (?inner) { inner };
      case null {
        let inner = Map.empty<Nat, Types.Sample>();
        store.add(owner, inner);
        inner;
      };
    };
  };

  /// List all tracks owned by the caller, newest first.
  public func listTracks(store : TrackStore, owner : Principal) : [Types.Track] {
    let inner = switch (store.get(owner)) {
      case (?m) { m };
      case null { return [] };
    };
    let all = inner.values().toArray();
    all.sort(func(a, b) = Nat.compare(b.createdAt, a.createdAt));
  };

  /// Add a track to the caller's library and return its id.
  public func addTrack(
    store : TrackStore,
    state : IdState,
    owner : Principal,
    file : Storage.ExternalBlob,
    name : Text,
    durationMs : Common.DurationMs,
  ) : Types.Track {
    let id = state.nextEntryId;
    state.nextEntryId := id + 1;
    let track : Types.Track = {
      id;
      owner;
      file;
      name;
      durationMs;
      createdAt = Time.now().toNat();
    };
    tracksOf(store, owner).add(id, track);
    track;
  };

  /// Delete a track from the caller's library. Returns false when not found.
  public func deleteTrack(store : TrackStore, owner : Principal, id : Common.EntryId) : Bool {
    switch (store.get(owner)) {
      case (?inner) {
        if (inner.containsKey(id)) {
          inner.remove(id);
          true;
        } else {
          false;
        };
      };
      case null { false };
    };
  };

  /// List all samples owned by the caller.
  public func listSamples(store : SampleStore, owner : Principal) : [Types.Sample] {
    let inner = switch (store.get(owner)) {
      case (?m) { m };
      case null { return [] };
    };
    let all = inner.values().toArray();
    all.sort(func(a, b) = Nat.compare(b.createdAt, a.createdAt));
  };

  /// Assign an uploaded audio file to a pad slot and return the entry.
  public func addSample(
    store : SampleStore,
    state : IdState,
    owner : Principal,
    padSlot : Common.PadSlot,
    file : Storage.ExternalBlob,
    name : Text,
  ) : Types.Sample {
    let id = state.nextEntryId;
    state.nextEntryId := id + 1;
    let sample : Types.Sample = {
      id;
      owner;
      padSlot;
      file;
      name;
      createdAt = Time.now().toNat();
    };
    samplesOf(store, owner).add(id, sample);
    sample;
  };

  /// Delete a sample from the caller's library. Returns false when not found.
  public func deleteSample(store : SampleStore, owner : Principal, id : Common.EntryId) : Bool {
    switch (store.get(owner)) {
      case (?inner) {
        if (inner.containsKey(id)) {
          inner.remove(id);
          true;
        } else {
          false;
        };
      };
      case null { false };
    };
  };
};
