/// Static, human-readable documentation of the backend's public API.
/// This mixin declares no state and reads no runtime data: it returns a
/// fixed Markdown document authored from the current backend source.
mixin () {
  /// Return the backend API documentation as Markdown.
  public query func getApiDoc() : async Text {
    "# DJ Cabin Backend API\n\n" #
    "Backend for a mobile-first DJ controller app. It stores each user's personal\n" #
    "audio library (tracks and pad samples) and their cabin settings, and exposes\n" #
    "that data to the Caffeine Data Intelligence agent through OQL.\n\n" #
    "## Identity and authentication\n\n" #
    "- Every method below is scoped to the **caller's principal** (`msg_caller`).\n" #
    "  There is no cross-user access: a caller can only read or write its own rows.\n" #
    "- `listTracks`, `addTrack`, `deleteTrack`, `listSamples`, `addSample`,\n" #
    "  `deleteSample`, `getSettings` and `setSettings` all require a **signed-in\n" #
    "  (non-anonymous) caller**. An anonymous caller is rejected with the trap\n" #
    "  message `Sign in required`.\n" #
    "- The frontend pins an **Internet Identity derivation origin**, published at\n" #
    "  `/.well-known/ii-derivation-origin` when available. An agent that already\n" #
    "  holds the user's Internet Identity authorization derives the correct per-app\n" #
    "  principal against that origin (for example\n" #
    "  `icp identity link web <name> --app <host>`). Such a delegation acts with the\n" #
    "  user's full authority in this app until it expires.\n" #
    "- Because the principal is derived per app origin, a signed-in caller derived\n" #
    "  against a **different** origin is a different principal than the one the\n" #
    "  frontend registered, and will see an empty library and no settings.\n\n" #
    "## Units and encodings\n\n" #
    "- `Timestamp` (`createdAt`, `updatedAt`) is **nanoseconds since the Unix\n" #
    "  epoch**, as a `Nat`.\n" #
    "- `durationMs` is the audio duration in **milliseconds**, as a `Nat`.\n" #
    "- `EntryId` and `padSlot` are `Nat`. `padSlot` is a **0-based** pad index.\n" #
    "- `file` is a `Storage.ExternalBlob` reference into platform object storage.\n" #
    "  The audio bytes are uploaded through the object-storage flow; the backend\n" #
    "  stores only the reference, never the raw bytes.\n" #
    "- `payload` in cabin settings is an **opaque serialized string** (JSON) holding\n" #
    "  the control values and layout. The backend does not parse or validate it.\n\n" #
    "## Methods\n\n" #
    "### `listTracks() : async [Track]` (query)\n" #
    "Return the caller's tracks, **newest first** (sorted by `createdAt`\n" #
    "descending). Returns `[]` when the caller has no tracks. Requires a signed-in\n" #
    "caller.\n\n" #
    "### `addTrack(file : ExternalBlob, name : Text, durationMs : Nat) : async Track` (update)\n" #
    "Add an uploaded audio file to the caller's library and return the created\n" #
    "`Track` (including its server-assigned `id` and `createdAt`). Requires a\n" #
    "signed-in caller.\n\n" #
    "### `deleteTrack(id : Nat) : async Bool` (update)\n" #
    "Delete one of the caller's tracks by `id`. Returns `true` when a track was\n" #
    "removed, `false` when no track with that id exists for the caller. Requires a\n" #
    "signed-in caller.\n\n" #
    "### `listSamples() : async [Sample]` (query)\n" #
    "Return the caller's pad samples, **newest first** (sorted by `createdAt`\n" #
    "descending). Returns `[]` when the caller has none. Requires a signed-in\n" #
    "caller.\n\n" #
    "### `addSample(padSlot : Nat, file : ExternalBlob, name : Text) : async Sample` (update)\n" #
    "Assign an uploaded audio file to a pad slot for the caller and return the\n" #
    "created `Sample`. Requires a signed-in caller.\n\n" #
    "### `deleteSample(id : Nat) : async Bool` (update)\n" #
    "Delete one of the caller's samples by `id`. Returns `true` when a sample was\n" #
    "removed, `false` when none exists for the caller. Requires a signed-in caller.\n\n" #
    "### `getSettings() : async ?CabinSettings` (query)\n" #
    "Return the caller's saved cabin settings, or `null` when none have been stored\n" #
    "yet. Requires a signed-in caller.\n\n" #
    "### `setSettings(payload : Text) : async CabinSettings` (update)\n" #
    "Persist the caller's cabin settings, replacing any previous value, and return\n" #
    "the stored record with a fresh `updatedAt`. Requires a signed-in caller.\n\n" #
    "## Lifecycle and polling\n\n" #
    "- All reads (`listTracks`, `listSamples`, `getSettings`) are `query` calls and\n" #
    "  return the current committed state immediately; there is no async job to\n" #
    "  poll and no completion condition to wait for.\n" #
    "- Uploads are two-phase: the audio bytes go to object storage first, then the\n" #
    "  resulting `ExternalBlob` reference is passed to `addTrack` / `addSample`.\n" #
    "  Poll the object-storage upload for progress; the backend call is synchronous\n" #
    "  once the reference exists.\n" #
    "- `getSettings` returning `null` is the normal 'not yet configured' state, not\n" #
    "  an error.\n\n" #
    "## Mutation retry safety\n\n" #
    "- `addTrack` and `addSample` are **not idempotent**: each successful call\n" #
    "  allocates a new `id` and appends a new entry. Retrying a call that already\n" #
    "  succeeded creates a duplicate entry. On an ambiguous failure, re-list and\n" #
    "  check before retrying.\n" #
    "- `deleteTrack` and `deleteSample` are **idempotent in effect**: deleting an\n" #
    "  already-deleted id returns `false` and changes nothing.\n" #
    "- `setSettings` is **idempotent by value**: calling it again with the same\n" #
    "  `payload` leaves the same settings (only `updatedAt` advances).\n\n" #
    "## Errors and gotchas\n\n" #
    "- Anonymous callers receive a trap with the message `Sign in required` on every\n" #
    "  method above; the frontend should gate these calls behind authentication.\n" #
    "- There is no per-entry ownership check beyond the caller scope: ids are\n" #
    "  per-user, so an id belonging to another user simply does not exist in the\n" #
    "  caller's store and delete returns `false`.\n" #
    "- `payload` is stored verbatim; malformed JSON is the caller's responsibility\n" #
    "  and will not be rejected by the backend.\n" #
    "- The OQL query surface (`schema` / `execute`) is separate from these methods\n" #
    "  and applies its own per-entity authorization; it is not part of this\n" #
    "  documented API.\n"
  };
};
