/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap } from '@atproto/xrpc';
import type * as AppBskyDraftDefs from './defs.js';
export type QueryParams = {};
export interface InputSchema {
    draft: AppBskyDraftDefs.DraftWithId;
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
}
export declare function toKnownErr(e: any): any;
//# sourceMappingURL=updateDraft.d.ts.map