import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import Expose "mo:caffeineai-oql/Expose";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Blob "mo:core/Blob";
import OQL "mo:caffeineai-oql";
import Entity "mo:caffeineai-oql/Entity";
import MapEntity "mo:caffeineai-oql/MapEntity";
import RecordValue "mo:caffeineai-oql/RecordValue";
import NatValue "mo:caffeineai-oql/NatValue";
import TextValue "mo:caffeineai-oql/TextValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import BlobValue "mo:caffeineai-oql/BlobValue";
import LibraryTypes "types/library";
import SettingsTypes "types/settings";
import LibraryApi "mixins/library-api";
import SettingsApi "mixins/settings-api";
import ApiDocMixin "mixins/api-doc";

actor {
  let accessControlState : AccessControl.AccessControlState;

  // Per-user track library: owner -> (entry id -> track).
  let tracks : Map.Map<Principal, Map.Map<Nat, LibraryTypes.Track>>;
  // Per-user pad samples: owner -> (entry id -> sample).
  let samples : Map.Map<Principal, Map.Map<Nat, LibraryTypes.Sample>>;
  // Per-user cabin settings: owner -> settings.
  let settings : Map.Map<Principal, SettingsTypes.CabinSettings>;
  // Monotonic id counter shared across library entries.
  let state : { var nextEntryId : Nat };

  include MixinAuthorization(accessControlState, null);
  include MixinObjectStorage();
  include LibraryApi(tracks, samples, state);
  include SettingsApi(settings);
  include ApiDocMixin();

  transient let anyP = Principal.fromText("aaaaa-aa");

  // Flatten the nested per-user maps into one row per entry so each entry is a
  // queryable table row carrying its own owner and id.
  func flattenTracks() : Iter.Iter<LibraryTypes.Track> =
    tracks.values().map(
      func(inner) = inner.values()
    ).flatten();

  func flattenSamples() : Iter.Iter<LibraryTypes.Sample> =
    samples.values().map(
      func(inner) = inner.values()
    ).flatten();

  include Expose({
    entities = [
      OQL.Entity.new<LibraryTypes.Track>("track", flattenTracks, "Track", "id")
        .sample({
          id = 0;
          owner = anyP;
          file = "" : Blob;
          name = "";
          durationMs = 0;
          createdAt = 0;
        })
        .ownedBy("owner")
        .controllerOrScoped()
        .build(),
      OQL.Entity.new<LibraryTypes.Sample>("sample", flattenSamples, "Sample", "id")
        .sample({
          id = 0;
          owner = anyP;
          padSlot = 0;
          file = "" : Blob;
          name = "";
          createdAt = 0;
        })
        .ownedBy("owner")
        .controllerOrScoped()
        .build(),
      settings.toEntity("settings", "CabinSettings", "owner")
        .sample({ owner = anyP; payload = ""; updatedAt = 0 })
        .ownedBy("owner")
        .controllerOrScoped()
        .build(),
    ];
  });
};
