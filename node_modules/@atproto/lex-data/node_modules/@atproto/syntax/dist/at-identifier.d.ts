import { DidString } from './did.js';
import { HandleString } from './handle.js';
export type AtIdentifierString = DidString | HandleString;
export declare function ensureValidAtIdentifier(input: string): asserts input is AtIdentifierString;
//# sourceMappingURL=at-identifier.d.ts.map