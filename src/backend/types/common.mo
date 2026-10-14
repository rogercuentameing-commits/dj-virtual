module {
  /// Identifier for a per-user library entry (track or sample).
  public type EntryId = Nat;

  /// Pad slot index on the sample bank (0-based).
  public type PadSlot = Nat;

  /// Creation timestamp in nanoseconds since the Unix epoch.
  public type Timestamp = Nat;

  /// Duration of an audio file in milliseconds.
  public type DurationMs = Nat;
};
