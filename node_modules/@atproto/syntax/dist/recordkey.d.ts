export type RecordKeyString = string;
export declare function ensureValidRecordKey(rkey: string): asserts rkey is RecordKeyString;
export declare function isValidRecordKey(rkey: string): rkey is RecordKeyString;
export declare class InvalidRecordKeyError extends Error {
}
//# sourceMappingURL=recordkey.d.ts.map