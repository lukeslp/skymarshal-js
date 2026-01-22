/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap } from '@atproto/xrpc';
import type * as AppBskyDraftDefs from './defs.js';
export type QueryParams = {
    limit?: number;
    cursor?: string;
};
export type InputSchema = undefined;
export interface OutputSchema {
    cursor?: string;
    drafts: AppBskyDraftDefs.DraftView[];
}
export interface CallOptions {
    signal?: AbortSignal;
    headers?: HeadersMap;
}
export interface Response {
    success: boolean;
    headers: HeadersMap;
    data: OutputSchema;
}
export declare function toKnownErr(e: any): any;
//# sourceMappingURL=getDrafts.d.ts.map