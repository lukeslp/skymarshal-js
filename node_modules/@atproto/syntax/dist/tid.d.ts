export type TidString = string;
export declare function ensureValidTid(tid: string): asserts tid is TidString;
export declare function isValidTid(tid: string): tid is TidString;
export declare class InvalidTidError extends Error {
}
//# sourceMappingURL=tid.d.ts.map