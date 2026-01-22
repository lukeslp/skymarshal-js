export type DidString<M extends string = string> = `did:${M}:${string}`;
export declare function ensureValidDid(did: string): asserts did is DidString;
export declare function ensureValidDidRegex(did: string): asserts did is DidString;
export declare class InvalidDidError extends Error {
}
//# sourceMappingURL=did.d.ts.map