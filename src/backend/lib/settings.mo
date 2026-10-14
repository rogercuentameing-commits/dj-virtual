import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Types "../types/settings";

module {
  /// Per-user cabin settings: owner -> settings.
  public type SettingsStore = Map.Map<Principal, Types.CabinSettings>;

  /// Return the caller's saved cabin settings, or null when none are stored.
  public func getSettings(store : SettingsStore, owner : Principal) : ?Types.CabinSettings {
    store.get(owner);
  };

  /// Persist the caller's cabin settings and return the stored record.
  public func setSettings(store : SettingsStore, owner : Principal, payload : Text) : Types.CabinSettings {
    let record : Types.CabinSettings = {
      owner;
      payload;
      updatedAt = Time.now().toNat();
    };
    store.add(owner, record);
    record;
  };
};
