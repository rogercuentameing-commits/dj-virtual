import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Types "../types/settings";
import SettingsLib "../lib/settings";

mixin (settings : SettingsLib.SettingsStore) {
  func requireSignedInSettings(caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("Sign in required");
    };
  };

  /// Return the caller's saved cabin settings, or null when none are stored.
  /// Requires a signed-in caller.
  public query ({ caller }) func getSettings() : async ?Types.CabinSettings {
    requireSignedInSettings(caller);
    SettingsLib.getSettings(settings, caller);
  };

  /// Persist the caller's cabin settings. Requires a signed-in caller;
  /// the record is scoped to the caller.
  public shared ({ caller }) func setSettings(payload : Text) : async Types.CabinSettings {
    requireSignedInSettings(caller);
    SettingsLib.setSettings(settings, caller, payload);
  };
};
