import AccessControl "mo:caffeineai-authorization/access-control";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Blob "mo:core/Blob";

module {
  type Track = {
    id : Nat;
    owner : Principal;
    file : Blob;
    name : Text;
    durationMs : Nat;
    createdAt : Nat;
  };

  type Sample = {
    id : Nat;
    owner : Principal;
    padSlot : Nat;
    file : Blob;
    name : Text;
    createdAt : Nat;
  };

  type CabinSettings = {
    owner : Principal;
    payload : Text;
    updatedAt : Nat;
  };

  type OldActor = {};

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    tracks : Map.Map<Principal, Map.Map<Nat, Track>>;
    samples : Map.Map<Principal, Map.Map<Nat, Sample>>;
    settings : Map.Map<Principal, CabinSettings>;
    state : { var nextEntryId : Nat };
  };

  public func migration(_ : OldActor) : NewActor {
    {
      accessControlState = AccessControl.initState();
      tracks = Map.empty();
      samples = Map.empty();
      settings = Map.empty();
      state = { var nextEntryId = 0 };
    };
  };
};
