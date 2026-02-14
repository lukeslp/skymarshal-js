"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpiredTokenError = exports.InvalidTokenError = exports.AccountTakedownError = void 0;
exports.toKnownErr = toKnownErr;
/**
 * GENERATED CODE - DO NOT MODIFY
 */
const xrpc_1 = require("@atproto/xrpc");
const lexicons_1 = require("../../../../lexicons");
const util_1 = require("../../../../util");
const is$typed = util_1.is$typed, validate = lexicons_1.validate;
const id = 'com.atproto.server.refreshSession';
class AccountTakedownError extends xrpc_1.XRPCError {
    constructor(src) {
        super(src.status, src.error, src.message, src.headers, { cause: src });
    }
}
exports.AccountTakedownError = AccountTakedownError;
class InvalidTokenError extends xrpc_1.XRPCError {
    constructor(src) {
        super(src.status, src.error, src.message, src.headers, { cause: src });
    }
}
exports.InvalidTokenError = InvalidTokenError;
class ExpiredTokenError extends xrpc_1.XRPCError {
    constructor(src) {
        super(src.status, src.error, src.message, src.headers, { cause: src });
    }
}
exports.ExpiredTokenError = ExpiredTokenError;
function toKnownErr(e) {
    if (e instanceof xrpc_1.XRPCError) {
        if (e.error === 'AccountTakedown')
            return new AccountTakedownError(e);
        if (e.error === 'InvalidToken')
            return new InvalidTokenError(e);
        if (e.error === 'ExpiredToken')
            return new ExpiredTokenError(e);
    }
    return e;
}
//# sourceMappingURL=refreshSession.js.map