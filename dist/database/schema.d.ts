/**
 * IndexedDB Schema Definition for Skymarshal
 *
 * Defines the database structure, object stores, and indexes for
 * client-side storage of Bluesky content and metadata.
 *
 * @module database/schema
 */
/**
 * Index definition for an object store
 */
export interface StoreIndex {
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters;
}
/**
 * Object store definition
 */
export interface ObjectStoreDefinition {
    name: string;
    keyPath: string;
    autoIncrement?: boolean;
    indexes: StoreIndex[];
}
/**
 * Database schema definition
 */
export interface DatabaseSchema {
    name: string;
    version: number;
    stores: ObjectStoreDefinition[];
}
/**
 * Main database schema - Version 1
 *
 * Object Stores:
 * - contentItems: Core content storage (posts, replies, likes, reposts)
 * - engagementCache: Cached engagement metrics with TTL
 * - userSettings: User preferences per handle
 * - searchHistory: Search query history for UX
 * - backups: Local snapshots of user data
 * - carFiles: CAR file import metadata
 */
export declare const SCHEMA: DatabaseSchema;
/**
 * Store names as constants for type safety
 */
export declare const STORE_NAMES: {
    readonly CONTENT_ITEMS: "contentItems";
    readonly ENGAGEMENT_CACHE: "engagementCache";
    readonly USER_SETTINGS: "userSettings";
    readonly SEARCH_HISTORY: "searchHistory";
    readonly BACKUPS: "backups";
    readonly CAR_FILES: "carFiles";
};
/**
 * Type for valid store names
 */
export type StoreName = typeof STORE_NAMES[keyof typeof STORE_NAMES];
//# sourceMappingURL=schema.d.ts.map