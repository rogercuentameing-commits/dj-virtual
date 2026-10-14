import Storage "mo:caffeineai-object-storage/Storage";
import Common "common";

module {
  /// A user-uploaded audio track in the personal library.
  public type Track = {
    id : Common.EntryId;
    owner : Principal;
    /// Reference to the uploaded audio file in platform object storage.
    file : Storage.ExternalBlob;
    /// Display name shown in the library.
    name : Text;
    /// Duration of the audio file in milliseconds.
    durationMs : Common.DurationMs;
    createdAt : Common.Timestamp;
  };

  /// A user-uploaded audio sample assigned to a pad slot.
  public type Sample = {
    id : Common.EntryId;
    owner : Principal;
    /// Pad slot this sample is assigned to.
    padSlot : Common.PadSlot;
    /// Reference to the uploaded audio file in platform object storage.
    file : Storage.ExternalBlob;
    /// Display name shown on the pad.
    name : Text;
    createdAt : Common.Timestamp;
  };
};
