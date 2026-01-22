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
export const SCHEMA: DatabaseSchema = {
  name: 'skymarshal',
  version: 1,
  stores: [
    // Core content storage
    {
      name: 'contentItems',
      keyPath: 'uri',
      indexes: [
        {
          name: 'by_cid',
          keyPath: 'cid',
          options: { unique: false }
        },
        {
          name: 'by_createdAt',
          keyPath: 'createdAt',
          options: { unique: false }
        },
        {
          name: 'by_contentType',
          keyPath: 'contentType',
          options: { unique: false }
        },
        {
          name: 'by_handle',
          keyPath: 'authorHandle',
          options: { unique: false }
        },
        {
          name: 'by_engagementScore',
          keyPath: 'engagementScore',
          options: { unique: false }
        }
      ]
    },

    // Engagement metrics cache with TTL
    {
      name: 'engagementCache',
      keyPath: 'uri',
      indexes: [
        {
          name: 'by_cachedAt',
          keyPath: 'cachedAt',
          options: { unique: false }
        },
        {
          name: 'by_ttlExpires',
          keyPath: 'expiresAt',
          options: { unique: false }
        }
      ]
    },

    // User settings and preferences
    {
      name: 'userSettings',
      keyPath: 'handle',
      indexes: []
    },

    // Search history for UX improvements
    {
      name: 'searchHistory',
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        {
          name: 'by_timestamp',
          keyPath: 'timestamp',
          options: { unique: false }
        },
        {
          name: 'by_handle',
          keyPath: 'handle',
          options: { unique: false }
        }
      ]
    },

    // Local backup snapshots
    {
      name: 'backups',
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        {
          name: 'by_handle',
          keyPath: 'handle',
          options: { unique: false }
        },
        {
          name: 'by_createdAt',
          keyPath: 'createdAt',
          options: { unique: false }
        }
      ]
    },

    // CAR file import metadata
    {
      name: 'carFiles',
      keyPath: 'handle',
      indexes: [
        {
          name: 'by_importedAt',
          keyPath: 'importedAt',
          options: { unique: false }
        }
      ]
    }
  ]
};

/**
 * Store names as constants for type safety
 */
export const STORE_NAMES = {
  CONTENT_ITEMS: 'contentItems',
  ENGAGEMENT_CACHE: 'engagementCache',
  USER_SETTINGS: 'userSettings',
  SEARCH_HISTORY: 'searchHistory',
  BACKUPS: 'backups',
  CAR_FILES: 'carFiles'
} as const;

/**
 * Type for valid store names
 */
export type StoreName = typeof STORE_NAMES[keyof typeof STORE_NAMES];
