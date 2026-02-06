import { Cid } from './cid.js';
export type LexScalar = number | string | boolean | null | Cid | Uint8Array;
export type LexValue = LexScalar | LexValue[] | {
    [_ in string]?: LexValue;
};
export type LexMap = {
    [_ in string]?: LexValue;
};
export type LexArray = LexValue[];
export declare function isLexMap(value: unknown): value is LexMap;
export declare function isLexArray(value: unknown): value is LexArray;
export declare function isLexScalar(value: unknown): value is LexScalar;
export declare function isLexValue(value: unknown): value is LexValue;
export type TypedLexMap = LexMap & {
    $type: string;
};
export declare function isTypedLexMap(value: LexValue): value is TypedLexMap;
//# sourceMappingURL=lex.d.ts.map