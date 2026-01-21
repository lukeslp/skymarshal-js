/** An ISO 8601 formatted datetime string (YYYY-MM-DDTHH:mm:ss.sssZ) */
export type DatetimeString = `${string}-${string}-${string}T${string}:${string}:${string}${'Z' | `+${string}` | `-${string}`}`;
declare global {
    interface Date {
        toISOString(): `${string}-${string}-${string}T${string}:${string}:${string}Z`;
    }
}
export declare function ensureValidDatetime(dtStr: string): asserts dtStr is DatetimeString;
export declare function isValidDatetime(dtStr: string): dtStr is DatetimeString;
export declare function normalizeDatetime(dtStr: string): DatetimeString;
export declare const normalizeDatetimeAlways: (dtStr: string) => DatetimeString;
export declare class InvalidDatetimeError extends Error {
}
//# sourceMappingURL=datetime.d.ts.map