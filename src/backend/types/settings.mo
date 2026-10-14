import Common "common";

module {
  /// Per-user cabin settings: serialized control values and layout.
  public type CabinSettings = {
    owner : Principal;
    /// Serialized control values / layout (opaque JSON string).
    payload : Text;
    updatedAt : Common.Timestamp;
  };
};
