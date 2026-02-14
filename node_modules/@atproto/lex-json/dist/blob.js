"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBlobRef = parseBlobRef;
const lex_data_1 = require("@atproto/lex-data");
const link_js_1 = require("./link.js");
function parseBlobRef(input, options) {
    if (input.$type !== 'blob')
        return undefined;
    const ref = input?.ref;
    if (!ref || typeof ref !== 'object')
        return undefined;
    // @NOTE Because json to lex conversion can be performed both in a depth-first
    // manner (e.g. via lexParse) or in a breadth-first manner (e.g. via
    // jsonToLex), the `ref` property may either be a LexMap with a $link
    // property, or it may already be a CID instance.
    if ('$link' in ref) {
        const cid = (0, link_js_1.parseLexLink)(ref);
        if (!cid)
            return undefined;
        const blob = { ...input, ref: cid };
        if ((0, lex_data_1.isBlobRef)(blob, options))
            return blob;
    }
    if ((0, lex_data_1.isBlobRef)(input)) {
        return input;
    }
    return undefined;
}
//# sourceMappingURL=blob.js.map