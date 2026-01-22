/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from '@atproto/xrpc';
import type * as AppBskyDraftDefs from './defs.js';
export type QueryParams = {};
export interface InputSchema {
    draft: AppBskyDraftDefs.Draft;
}
export interface OutputSchema {
    /** The ID of the created draft. */
    id: string;
}
export interface CallOptions {
    signal?: AbortSignal;
    headers?: HeadersMap;
    qp?: QueryParams;
    encoding?: 'application/json';
}
export interface Response {
    success: boolean;
    headers: HeadersMap;
    data: OutputSchema;
}
export declare class DraftLimitReachedError extends XRPCError {
    constructor(src: XRPCError);
}
export declare function toKnownErr(e: any): any;
//# sourceMappingURL=createDraft.d.ts.map