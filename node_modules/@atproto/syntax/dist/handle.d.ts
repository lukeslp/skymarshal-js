export declare const INVALID_HANDLE = "handle.invalid";
export type HandleString = `${string}.${string}`;
export declare const DISALLOWED_TLDS: string[];
export declare function ensureValidHandle(handle: string): asserts handle is HandleString;
export declare function ensureValidHandleRegex(handle: string): asserts handle is HandleString;
export declare function normalizeHandle(handle: string): string;
export declare function normalizeAndEnsureValidHandle(handle: string): HandleString;
export declare function isValidHandle(handle: string): handle is HandleString;
export declare function isValidTld(handle: string): boolean;
export declare class InvalidHandleError extends Error {
}
/** @deprecated Never used */
export declare class ReservedHandleError extends Error {
}
/** @deprecated Never used */
export declare class UnsupportedDomainError extends Error {
}
/** @deprecated Never used */
export declare class DisallowedDomainError extends Error {
}
//# sourceMappingURL=handle.d.ts.map