import Storage "mo:caffeineai-object-storage/Storage";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Types "../types/library";
import Common "../types/common";
import LibraryLib "../lib/library";

mixin (
  tracks : LibraryLib.TrackStore,
  samples : LibraryLib.SampleStore,
  state : LibraryLib.IdState,
) {
  func requireSignedInLibrary(caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("Sign in required");
    };
  };

  /// List the caller's uploaded tracks. Requires a signed-in caller.
  public query ({ caller }) func listTracks() : async [Types.Track] {
    requireSignedInLibrary(caller);
    LibraryLib.listTracks(tracks, caller);
  };

  /// Add an uploaded audio file to the caller's track library.
  /// Requires a signed-in caller; the entry is scoped to the caller.
  public shared ({ caller }) func addTrack(
    file : Storage.ExternalBlob,
    name : Text,
    durationMs : Common.DurationMs,
  ) : async Types.Track {
    requireSignedInLibrary(caller);
    LibraryLib.addTrack(tracks, state, caller, file, name, durationMs);
  };

  /// Delete one of the caller's tracks by id. Requires a signed-in caller.
  public shared ({ caller }) func deleteTrack(id : Common.EntryId) : async Bool {
    requireSignedInLibrary(caller);
    LibraryLib.deleteTrack(tracks, caller, id);
  };

  /// List the caller's pad samples. Requires a signed-in caller.
  public query ({ caller }) func listSamples() : async [Types.Sample] {
    requireSignedInLibrary(caller);
    LibraryLib.listSamples(samples, caller);
  };

  /// Assign an uploaded audio file to a pad slot for the caller.
  /// Requires a signed-in caller; the entry is scoped to the caller.
  public shared ({ caller }) func addSample(
    padSlot : Common.PadSlot,
    file : Storage.ExternalBlob,
    name : Text,
  ) : async Types.Sample {
    requireSignedInLibrary(caller);
    LibraryLib.addSample(samples, state, caller, padSlot, file, name);
  };

  /// Delete one of the caller's samples by id. Requires a signed-in caller.
  public shared ({ caller }) func deleteSample(id : Common.EntryId) : async Bool {
    requireSignedInLibrary(caller);
    LibraryLib.deleteSample(samples, caller, id);
  };
};
