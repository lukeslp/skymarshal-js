/**
 * IndexedDB Provider for Skymarshal
 *
 * Provides a high-level abstraction over IndexedDB for storing and querying
 * Bluesky content, engagement metrics, and user settings.
 *
 * Features:
 * - Automatic schema versioning and migrations
 * - Type-safe CRUD operations
 * - Index-based querying
 * - Transaction management
 * - Error handling and recovery
 * - Browser environment detection
 *
 * @module database/IndexedDBProvider
 */
import { type StoreName, type DatabaseSchema } from './schema.js';
/**
 * Query range for index-based queries
 */
export interface QueryRange {
    lower?: unknown;
    upper?: unknown;
    lowerOpen?: boolean;
    upperOpen?: boolean;
}
/**
 * Configuration options for IndexedDBProvider
 */
export interface IndexedDBProviderConfig {
    schema?: DatabaseSchema;
    onUpgradeNeeded?: (db: IDBDatabase, oldVersion: number, newVersion: number) => void;
    onBlocked?: () => void;
    onVersionChange?: () => void;
}
/**
 * Result of a database operation
 */
export interface OperationResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: Error;
}
/**
 * IndexedDB Provider Class
 *
 * Manages database lifecycle, CRUD operations, and queries.
 * Only works in browser environments with IndexedDB support.
 *
 * @example
 * ```ts
 * const db = new IndexedDBProvider();
 * await db.init();
 *
 * // Store a content item
 * await db.put('contentItems', { uri: 'at://...', text: 'Hello' });
 *
 * // Query by index
 * const recentPosts = await db.query('contentItems', 'by_createdAt', {
 *   lower: new Date('2024-01-01').toISOString()
 * });
 *
 * // Batch operations
 * await db.putBatch('contentItems', [item1, item2, item3]);
 * ```
 */
export declare class IndexedDBProvider {
    private db;
    private schema;
    private initPromise;
    constructor(config?: IndexedDBProviderConfig);
    /**
     * Check if IndexedDB is available in this environment
     */
    static isAvailable(): boolean;
    /**
     * Initialize the database
     *
     * Opens the database connection and runs migrations if needed.
     * Safe to call multiple times - subsequent calls return the same promise.
     *
     * @returns Promise that resolves when database is ready
     * @throws Error if IndexedDB is not available or initialization fails
     */
    init(): Promise<void>;
    /**
     * Ensure database is initialized before operations
     */
    private ensureInit;
    /**
     * Get the underlying IDBDatabase instance
     *
     * @returns IDBDatabase instance
     * @throws Error if database is not initialized
     */
    getDB(): IDBDatabase;
    /**
     * Get a single item from a store by key
     *
     * @param store - Name of the object store
     * @param key - Primary key value
     * @returns The item or null if not found
     */
    get<T = unknown>(store: StoreName, key: IDBValidKey): Promise<T | null>;
    /**
     * Get all items from a store, optionally filtered by index
     *
     * @param store - Name of the object store
     * @param indexName - Optional index name to query
     * @param query - Optional key or key range for index query
     * @returns Array of items
     */
    getAll<T = unknown>(store: StoreName, indexName?: string, query?: IDBValidKey | IDBKeyRange): Promise<T[]>;
    /**
     * Insert or update an item in a store
     *
     * @param store - Name of the object store
     * @param value - Item to store
     * @returns The key of the stored item
     */
    put<T = unknown>(store: StoreName, value: T): Promise<IDBValidKey>;
    /**
     * Delete an item from a store by key
     *
     * @param store - Name of the object store
     * @param key - Primary key value
     */
    delete(store: StoreName, key: IDBValidKey): Promise<void>;
    /**
     * Clear all items from a store
     *
     * @param store - Name of the object store
     */
    clear(store: StoreName): Promise<void>;
    /**
     * Query items using an index with a range
     *
     * @param store - Name of the object store
     * @param indexName - Name of the index to query
     * @param range - Query range specification
     * @returns Array of matching items
     */
    query<T = unknown>(store: StoreName, indexName: string, range?: QueryRange): Promise<T[]>;
    /**
     * Count items in a store, optionally filtered by index
     *
     * @param store - Name of the object store
     * @param indexName - Optional index name
     * @param query - Optional key or key range
     * @returns Number of matching items
     */
    count(store: StoreName, indexName?: string, query?: IDBValidKey | IDBKeyRange): Promise<number>;
    /**
     * Batch insert/update multiple items in a single transaction
     *
     * @param store - Name of the object store
     * @param items - Array of items to store
     * @returns Array of keys for stored items
     */
    putBatch<T = unknown>(store: StoreName, items: T[]): Promise<IDBValidKey[]>;
    /**
     * Batch delete multiple items in a single transaction
     *
     * @param store - Name of the object store
     * @param keys - Array of primary keys to delete
     */
    deleteBatch(store: StoreName, keys: IDBValidKey[]): Promise<void>;
    /**
     * Get current database storage estimate
     *
     * @returns Storage estimate with usage and quota
     */
    getStorageEstimate(): Promise<StorageEstimate | null>;
    /**
     * Close the database connection
     */
    close(): void;
    /**
     * Delete the entire database
     *
     * WARNING: This removes all stored data permanently.
     */
    destroy(): Promise<void>;
}
/**
 * Get the default IndexedDBProvider instance
 *
 * @returns Singleton provider instance
 */
export declare function getDefaultProvider(): IndexedDBProvider;
//# sourceMappingURL=IndexedDBProvider.d.ts.map