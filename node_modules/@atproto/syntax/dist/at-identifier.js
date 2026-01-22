"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureValidAtIdentifier = ensureValidAtIdentifier;
const did_js_1 = require("./did.js");
const handle_js_1 = require("./handle.js");
function ensureValidAtIdentifier(input) {
    try {
        if (input.startsWith('did:')) {
            (0, did_js_1.ensureValidDidRegex)(input);
        }
        else {
            (0, handle_js_1.ensureValidHandleRegex)(input);
        }
    }
    catch (cause) {
        throw new handle_js_1.InvalidHandleError('Invalid DID or handle', { cause });
    }
}
//# sourceMappingURL=at-identifier.js.map