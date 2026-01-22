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
import { SCHEMA } from './schema.js';
import { runMigrations } from './migrations.js';
/**
 * Check if we're in a browser environment with IndexedDB support
 */
function isBrowserWithIndexedDB() {
    return typeof window !== 'undefined' &&
        typeof window.indexedDB !== 'undefined';
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
export class IndexedDBProvider {
    db = null;
    schema;
    initPromise = null;
    constructor(config = {}) {
        this.schema = config.schema || SCHEMA;
    }
    /**
     * Check if IndexedDB is available in this environment
     */
    static isAvailable() {
        return isBrowserWithIndexedDB();
    }
    /**
     * Initialize the database
     *
     * Opens the database connection and runs migrations if needed.
     * Safe to call multiple times - subsequent calls return the same promise.
     *
     * @returns Promise that resolves when database is ready
     * @throws Error if IndexedDB is not available or initialization fails
     */
    async init() {
        if (this.db) {
            return Promise.resolve();
        }
        if (this.initPromise) {
            return this.initPromise;
        }
        this.initPromise = new Promise((resolve, reject) => {
            if (!isBrowserWithIndexedDB()) {
                reject(new Error('IndexedDB is not available. This module only works in browser environments.'));
                return;
            }
            const request = window.indexedDB.open(this.schema.name, this.schema.version);
            request.onerror = () => {
                reject(new Error(`Failed to open database: ${request.error?.message}`));
            };
            request.onsuccess = () => {
                this.db = request.result;
                // Handle version change (database deleted elsewhere)
                this.db.onversionchange = () => {
                    this.db?.close();
                    this.db = null;
                    console.warn('Database version changed. Please reload the page.');
                };
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = request.result;
                const oldVersion = event.oldVersion;
                const newVersion = event.newVersion || this.schema.version;
                try {
                    // Run migrations
                    runMigrations(db, oldVersion, newVersion, this.schema);
                }
                catch (error) {
                    console.error('Migration failed:', error);
                    reject(error);
                }
            };
            request.onblocked = () => {
                console.warn('Database upgrade blocked. Close all other tabs with this site.');
            };
        });
        return this.initPromise;
    }
    /**
     * Ensure database is initialized before operations
     */
    async ensureInit() {
        if (!this.db) {
            await this.init();
        }
        if (!this.db) {
            throw new Error('Database initialization failed');
        }
        return this.db;
    }
    /**
     * Get the underlying IDBDatabase instance
     *
     * @returns IDBDatabase instance
     * @throws Error if database is not initialized
     */
    getDB() {
        if (!this.db) {
            throw new Error('Database is not initialized. Call init() first.');
        }
        return this.db;
    }
    /**
     * Get a single item from a store by key
     *
     * @param store - Name of the object store
     * @param key - Primary key value
     * @returns The item or null if not found
     */
    async get(store, key) {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([store], 'readonly');
                const objectStore = transaction.objectStore(store);
                const request = objectStore.get(key);
                request.onsuccess = () => {
                    resolve(request.result || null);
                };
                request.onerror = () => {
                    reject(new Error(`Failed to get item: ${request.error?.message}`));
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Get all items from a store, optionally filtered by index
     *
     * @param store - Name of the object store
     * @param indexName - Optional index name to query
     * @param query - Optional key or key range for index query
     * @returns Array of items
     */
    async getAll(store, indexName, query) {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([store], 'readonly');
                const objectStore = transaction.objectStore(store);
                let request;
                if (indexName) {
                    const index = objectStore.index(indexName);
                    request = index.getAll(query);
                }
                else {
                    request = objectStore.getAll(query);
                }
                request.onsuccess = () => {
                    resolve(request.result || []);
                };
                request.onerror = () => {
                    reject(new Error(`Failed to get all items: ${request.error?.message}`));
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Insert or update an item in a store
     *
     * @param store - Name of the object store
     * @param value - Item to store
     * @returns The key of the stored item
     */
    async put(store, value) {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([store], 'readwrite');
                const objectStore = transaction.objectStore(store);
                const request = objectStore.put(value);
                request.onsuccess = () => {
                    resolve(request.result);
                };
                request.onerror = () => {
                    reject(new Error(`Failed to put item: ${request.error?.message}`));
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Delete an item from a store by key
     *
     * @param store - Name of the object store
     * @param key - Primary key value
     */
    async delete(store, key) {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([store], 'readwrite');
                const objectStore = transaction.objectStore(store);
                const request = objectStore.delete(key);
                request.onsuccess = () => {
                    resolve();
                };
                request.onerror = () => {
                    reject(new Error(`Failed to delete item: ${request.error?.message}`));
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Clear all items from a store
     *
     * @param store - Name of the object store
     */
    async clear(store) {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([store], 'readwrite');
                const objectStore = transaction.objectStore(store);
                const request = objectStore.clear();
                request.onsuccess = () => {
                    resolve();
                };
                request.onerror = () => {
                    reject(new Error(`Failed to clear store: ${request.error?.message}`));
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Query items using an index with a range
     *
     * @param store - Name of the object store
     * @param indexName - Name of the index to query
     * @param range - Query range specification
     * @returns Array of matching items
     */
    async query(store, indexName, range) {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([store], 'readonly');
                const objectStore = transaction.objectStore(store);
                const index = objectStore.index(indexName);
                let keyRange;
                if (range) {
                    if (range.lower !== undefined && range.upper !== undefined) {
                        keyRange = IDBKeyRange.bound(range.lower, range.upper, range.lowerOpen, range.upperOpen);
                    }
                    else if (range.lower !== undefined) {
                        keyRange = IDBKeyRange.lowerBound(range.lower, range.lowerOpen);
                    }
                    else if (range.upper !== undefined) {
                        keyRange = IDBKeyRange.upperBound(range.upper, range.upperOpen);
                    }
                }
                const request = index.getAll(keyRange);
                request.onsuccess = () => {
                    resolve(request.result || []);
                };
                request.onerror = () => {
                    reject(new Error(`Failed to query items: ${request.error?.message}`));
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Count items in a store, optionally filtered by index
     *
     * @param store - Name of the object store
     * @param indexName - Optional index name
     * @param query - Optional key or key range
     * @returns Number of matching items
     */
    async count(store, indexName, query) {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([store], 'readonly');
                const objectStore = transaction.objectStore(store);
                let request;
                if (indexName) {
                    const index = objectStore.index(indexName);
                    request = index.count(query);
                }
                else {
                    request = objectStore.count(query);
                }
                request.onsuccess = () => {
                    resolve(request.result);
                };
                request.onerror = () => {
                    reject(new Error(`Failed to count items: ${request.error?.message}`));
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Batch insert/update multiple items in a single transaction
     *
     * @param store - Name of the object store
     * @param items - Array of items to store
     * @returns Array of keys for stored items
     */
    async putBatch(store, items) {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([store], 'readwrite');
                const objectStore = transaction.objectStore(store);
                const keys = [];
                let completed = 0;
                let failed = false;
                items.forEach((item, index) => {
                    const request = objectStore.put(item);
                    request.onsuccess = () => {
                        keys[index] = request.result;
                        completed++;
                        if (completed === items.length && !failed) {
                            resolve(keys);
                        }
                    };
                    request.onerror = () => {
                        if (!failed) {
                            failed = true;
                            transaction.abort();
                            reject(new Error(`Batch put failed at item ${index}: ${request.error?.message}`));
                        }
                    };
                });
                if (items.length === 0) {
                    resolve([]);
                }
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Batch delete multiple items in a single transaction
     *
     * @param store - Name of the object store
     * @param keys - Array of primary keys to delete
     */
    async deleteBatch(store, keys) {
        const db = await this.ensureInit();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction([store], 'readwrite');
                const objectStore = transaction.objectStore(store);
                let completed = 0;
                let failed = false;
                keys.forEach((key, index) => {
                    const request = objectStore.delete(key);
                    request.onsuccess = () => {
                        completed++;
                        if (completed === keys.length && !failed) {
                            resolve();
                        }
                    };
                    request.onerror = () => {
                        if (!failed) {
                            failed = true;
                            transaction.abort();
                            reject(new Error(`Batch delete failed at key ${index}: ${request.error?.message}`));
                        }
                    };
                });
                if (keys.length === 0) {
                    resolve();
                }
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Get current database storage estimate
     *
     * @returns Storage estimate with usage and quota
     */
    async getStorageEstimate() {
        if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
            return null;
        }
        try {
            return await navigator.storage.estimate();
        }
        catch (error) {
            console.error('Failed to get storage estimate:', error);
            return null;
        }
    }
    /**
     * Close the database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.initPromise = null;
        }
    }
    /**
     * Delete the entire database
     *
     * WARNING: This removes all stored data permanently.
     */
    async destroy() {
        this.close();
        if (!isBrowserWithIndexedDB()) {
            return;
        }
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.deleteDatabase(this.schema.name);
            request.onsuccess = () => {
                resolve();
            };
            request.onerror = () => {
                reject(new Error(`Failed to delete database: ${request.error?.message}`));
            };
            request.onblocked = () => {
                console.warn('Database deletion blocked. Close all other tabs with this site.');
            };
        });
    }
}
/**
 * Create a singleton instance
 */
let defaultProvider = null;
/**
 * Get the default IndexedDBProvider instance
 *
 * @returns Singleton provider instance
 */
export function getDefaultProvider() {
    if (!defaultProvider) {
        defaultProvider = new IndexedDBProvider();
    }
    return defaultProvider;
}
//# sourceMappingURL=IndexedDBProvider.js.map