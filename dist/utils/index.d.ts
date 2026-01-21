/**
 * Shared utilities for skymarshal-core
 * @module skymarshal-core/utils
 */
/**
 * TTL configuration for engagement cache
 * Based on post age for optimal caching
 */
export interface TTLConfig {
    /** TTL for posts less than 1 hour old (in ms) */
    recent: number;
    /** TTL for posts 1-24 hours old (in ms) */
    medium: number;
    /** TTL for posts older than 24 hours (in ms) */
    old: number;
}
/** Default TTL configuration */
export declare const DEFAULT_TTL: TTLConfig;
/**
 * EngagementCache - TTL-based cache for engagement metrics
 * Uses age-based TTL: recent posts expire faster than old posts
 */
export declare class EngagementCache<T = unknown> {
    private cache;
    private ttlConfig;
    private maxSize;
    constructor(ttlConfig?: TTLConfig, maxSize?: number);
    /**
     * Get TTL based on post creation time
     * @param createdAt - Post creation timestamp
     */
    private getTTL;
    /**
     * Get value from cache
     * @param key - Cache key
     */
    get(key: string): T | undefined;
    /**
     * Set value in cache
     * @param key - Cache key
     * @param value - Value to cache
     * @param createdAt - Post creation time for TTL calculation
     */
    set(key: string, value: T, createdAt?: string | Date): void;
    /**
     * Check if key exists and is not expired
     * @param key - Cache key
     */
    has(key: string): boolean;
    /**
     * Delete a key from cache
     * @param key - Cache key
     */
    delete(key: string): boolean;
    /**
     * Clear all entries
     */
    clear(): void;
    /**
     * Get cache size
     */
    get size(): number;
    /**
     * Clean up expired entries
     */
    cleanup(): number;
}
/**
 * PaginationHelper - Utilities for cursor-based pagination
 */
export declare class PaginationHelper {
    /**
     * Iterate through all pages of a paginated API
     * @param fetcher - Function that fetches a page
     * @param options - Pagination options
     */
    static iterate<T>(fetcher: (cursor?: string) => Promise<{
        records: T[];
        cursor?: string;
    }>, options?: {
        maxPages?: number;
        delayMs?: number;
    }): AsyncGenerator<T[], void, unknown>;
    /**
     * Collect all items from a paginated API
     * @param fetcher - Function that fetches a page
     * @param options - Pagination options
     */
    static collectAll<T>(fetcher: (cursor?: string) => Promise<{
        records: T[];
        cursor?: string;
    }>, options?: {
        maxPages?: number;
        delayMs?: number;
        onProgress?: (count: number) => void;
    }): Promise<T[]>;
}
/**
 * ExportHelper - Utilities for exporting data
 */
export declare class ExportHelper {
    /**
     * Convert array of objects to CSV string
     * @param data - Array of objects
     * @param columns - Column configuration
     */
    static toCSV<T extends Record<string, unknown>>(data: T[], columns?: {
        key: keyof T;
        header?: string;
    }[]): string;
    /**
     * Convert array of objects to JSON string
     * @param data - Array of objects
     * @param pretty - Whether to format with indentation
     */
    static toJSON<T>(data: T[], pretty?: boolean): string;
    /**
     * Download data as a file (browser environment)
     * @param content - File content
     * @param filename - Output filename
     * @param mimeType - MIME type
     */
    static download(content: string | Uint8Array, filename: string, mimeType?: string): void;
    /**
     * Download data as CSV file
     * @param data - Array of objects
     * @param filename - Output filename
     */
    static downloadCSV<T extends Record<string, unknown>>(data: T[], filename: string): void;
    /**
     * Download data as JSON file
     * @param data - Data to export
     * @param filename - Output filename
     */
    static downloadJSON<T>(data: T, filename: string): void;
}
/**
 * Date utilities
 */
export declare const DateUtils: {
    /**
     * Get relative time string (e.g., "2 hours ago")
     * @param date - Date to format
     */
    relativeTime(date: string | Date): string;
    /**
     * Check if a date is within a time range
     * @param date - Date to check
     * @param range - Time range in milliseconds
     */
    isWithin(date: string | Date, range: number): boolean;
    /**
     * Get post age category
     * @param date - Post creation date
     */
    getAgeCategory(date: string | Date): "recent" | "medium" | "old";
};
/**
 * Engagement scoring utilities
 */
export declare const EngagementUtils: {
    /**
     * Calculate engagement score
     * Formula: likes + (2 × reposts) + (2.5 × replies)
     */
    calculateScore(likes: number, reposts: number, replies: number): number;
    /**
     * Get engagement preset based on score relative to average
     */
    getPreset(score: number, average: number): "dead" | "bombers" | "mid" | "bangers" | "viral";
    /**
     * Get percentile rank
     */
    getPercentile(score: number, allScores: number[]): number;
};
/**
 * URI parsing utilities
 */
export declare const UriUtils: {
    /**
     * Parse an AT URI into components
     */
    parse(uri: string): {
        repo: string;
        collection: string;
        rkey: string;
    } | null;
    /**
     * Build an AT URI from components
     */
    build(repo: string, collection: string, rkey: string): string;
    /**
     * Extract DID from AT URI
     */
    getDid(uri: string): string | null;
    /**
     * Extract collection from AT URI
     */
    getCollection(uri: string): string | null;
};
/**
 * Batch processing utilities
 */
export declare const BatchUtils: {
    /**
     * Split array into chunks
     */
    chunk<T>(array: T[], size: number): T[][];
    /**
     * Process items in batches with concurrency limit
     */
    processBatches<T, R>(items: T[], processor: (batch: T[]) => Promise<R[]>, options?: {
        batchSize?: number;
        delayMs?: number;
        onProgress?: (processed: number, total: number) => void;
    }): Promise<R[]>;
};
//# sourceMappingURL=index.d.ts.map