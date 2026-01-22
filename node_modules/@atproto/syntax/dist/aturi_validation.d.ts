import { AtIdentifierString } from './at-identifier.js';
import { NsidString } from './nsid.js';
export type AtUriString = `at://${AtIdentifierString}` | `at://${AtIdentifierString}/${NsidString}` | `at://${AtIdentifierString}/${NsidString}/${string}`;
export declare function ensureValidAtUri(input: string): asserts input is AtUriString;
export declare function ensureValidAtUriRegex(uri: string): asserts uri is AtUriString;
//# sourceMappingURL=aturi_validation.d.ts.map