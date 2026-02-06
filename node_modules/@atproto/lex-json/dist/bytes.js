"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLexBytes = parseLexBytes;
exports.encodeLexBytes = encodeLexBytes;
const lex_data_1 = require("@atproto/lex-data");
function parseLexBytes(input) {
    if (!input || !('$bytes' in input)) {
        return undefined;
    }
    for (const key in input) {
        if (key !== '$bytes') {
            return undefined;
        }
    }
    if (typeof input.$bytes !== 'string') {
        throw new TypeError('$bytes must be a base64-encoded string');
    }
    return (0, lex_data_1.fromBase64)(input.$bytes);
}
function encodeLexBytes(bytes) {
    return { $bytes: (0, lex_data_1.toBase64)(bytes) };
}
//# sourceMappingURL=bytes.js.map