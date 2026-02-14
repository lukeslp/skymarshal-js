/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from '@atproto/xrpc';
export type QueryParams = {};
export type InputSchema = undefined;
export interface CallOptions {
    signal?: AbortSignal;
    headers?: HeadersMap;
    qp?: QueryParams;
}
export interface Response {
    success: boolean;
    headers: HeadersMap;
}
export declare class InvalidTokenError extends XRPCError {
    constructor(src: XRPCError);
}
export declare class ExpiredTokenError extends XRPCError {
    constructor(src: XRPCError);
}
export declare function toKnownErr(e: any): any;
//# sourceMappingURL=deleteSession.d.ts.map