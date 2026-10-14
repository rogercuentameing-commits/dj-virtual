import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
import type { ExternalBlob } from "@caffeineai/object-storage";
export type { ExternalBlob } from "@caffeineai/object-storage";
export interface CabinSettings {
    owner: Principal;
    updatedAt: Timestamp;
    payload: string;
}
export interface Cell {
    value: Value;
    name: string;
}
export type DurationMs = bigint;
export type EntryId = bigint;
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export type PadSlot = bigint;
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface Sample {
    id: EntryId;
    owner: Principal;
    file: ExternalBlob;
    name: string;
    createdAt: Timestamp;
    padSlot: PadSlot;
}
export type Timestamp = bigint;
export interface Track {
    id: EntryId;
    owner: Principal;
    file: ExternalBlob;
    name: string;
    createdAt: Timestamp;
    durationMs: DurationMs;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    /**
     * / Assign an uploaded audio file to a pad slot for the caller.
     * / Requires a signed-in caller; the entry is scoped to the caller.
     */
    addSample(padSlot: PadSlot, file: ExternalBlob, name: string): Promise<Sample>;
    /**
     * / Add an uploaded audio file to the caller's track library.
     * / Requires a signed-in caller; the entry is scoped to the caller.
     */
    addTrack(file: ExternalBlob, name: string, durationMs: DurationMs): Promise<Track>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    /**
     * / Delete one of the caller's samples by id. Requires a signed-in caller.
     */
    deleteSample(id: EntryId): Promise<boolean>;
    /**
     * / Delete one of the caller's tracks by id. Requires a signed-in caller.
     */
    deleteTrack(id: EntryId): Promise<boolean>;
    execute(qJson: string): Promise<Result>;
    /**
     * / Return the backend API documentation as Markdown.
     */
    getApiDoc(): Promise<string>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / Return the caller's saved cabin settings, or null when none are stored.
     * / Requires a signed-in caller.
     */
    getSettings(): Promise<CabinSettings | null>;
    isCallerAdmin(): Promise<boolean>;
    /**
     * / List the caller's pad samples. Requires a signed-in caller.
     */
    listSamples(): Promise<Array<Sample>>;
    /**
     * / List the caller's uploaded tracks. Requires a signed-in caller.
     */
    listTracks(): Promise<Array<Track>>;
    schema(): Promise<string>;
    /**
     * / Persist the caller's cabin settings. Requires a signed-in caller;
     * / the record is scoped to the caller.
     */
    setSettings(payload: string): Promise<CabinSettings>;
}
