/**
 * DeletionManager - Safe deletion workflows for Bluesky content
 *
 * Provides controlled deletion of content from Bluesky with:
 * - Confirmation workflows
 * - Batch processing with progress tracking
 * - Automatic backup creation
 * - Graceful error handling
 * - AT-URI parsing and validation
 *
 * @module managers/deletion
 */
import { AuthManager } from './auth.js';
import type { ContentItem } from '../models/index.js';
/**
 * Options for deletion operations
 */
export interface DeletionOptions {
    /** Require confirmation before deletion */
    confirmationRequired?: boolean;
    /** Delete from remote Bluesky server (not just local) */
    deleteFromRemote?: boolean;
    /** Create backup before deletion */
    createBackup?: boolean;
    /** Optional name for the backup */
    backupName?: string;
}
/**
 * Result of a deletion operation
 */
export interface DeletionResult {
    /** Number of items successfully deleted */
    success: number;
    /** Number of items that failed to delete */
    failed: number;
    /** Array of errors encountered */
    errors: Array<{
        uri: string;
        error: string;
    }>;
    /** ID of backup created (if createBackup was true) */
    backupId?: string;
}
/**
 * Parsed AT-URI components
 */
export interface ParsedAtUri {
    /** Repository DID */
    repo: string;
    /** Collection name */
    collection: string;
    /** Record key */
    rkey: string;
}
/**
 * Custom error for validation failures
 * @deprecated Use ValidationError from 'skymarshal-core/errors' instead
 */
export declare class ValidationError extends Error {
    constructor(message: string);
}
/**
 * Custom error for network failures
 * @deprecated Use NetworkError from 'skymarshal-core/errors' instead
 */
export declare class NetworkError extends Error {
    readonly statusCode?: number | undefined;
    constructor(message: string, statusCode?: number | undefined);
}
/**
 * Deletion Manager
 *
 * Handles safe deletion of content from local and remote storage.
 * Supports batch operations, progress tracking, and automatic backups.
 *
 * @example
 * ```ts
 * const auth = new AuthManager();
 * await auth.login('user.bsky.social', 'app-password');
 *
 * const deletion = new DeletionManager(auth);
 *
 * // Delete single item with backup
 * const result = await deletion.safeDelete(uri, {
 *   createBackup: true,
 *   deleteFromRemote: true
 * });
 *
 * // Batch delete with progress
 * await deletion.batchDelete(uris, (progress) => {
 *   console.log(`${Math.round(progress * 100)}% complete`);
 * });
 * ```
 */
export declare class DeletionManager {
    private auth;
    /**
     * Create a new DeletionManager
     *
     * @param auth - Authenticated AuthManager instance
     */
    constructor(auth: AuthManager);
    /**
     * Parse AT-URI into components
     *
     * @param uri - AT-URI to parse (e.g., at://did:plc:xyz/app.bsky.feed.post/abc)
     * @returns Parsed components
     * @throws ValidationError if URI format is invalid
     *
     * @example
     * ```ts
     * parseAtUri('at://did:plc:xyz123/app.bsky.feed.post/abc456')
     * // { repo: 'did:plc:xyz123', collection: 'app.bsky.feed.post', rkey: 'abc456' }
     * ```
     */
    parseAtUri(uri: string): ParsedAtUri;
    /**
     * Delete a single item from remote Bluesky server
     *
     * Requires authentication. Parses AT-URI and calls the deleteRecord API.
     *
     * @param uri - AT-URI of the item to delete
     * @throws Error if not authenticated
     * @throws ValidationError if URI format is invalid
     * @throws NetworkError if API request fails
     *
     * @example
     * ```ts
     * await deleteFromRemote('at://did:plc:xyz/app.bsky.feed.post/abc')
     * ```
     */
    deleteFromRemote(uri: string): Promise<void>;
    /**
     * Delete multiple items from remote server with progress tracking
     *
     * Processes deletions in chunks for better performance.
     * Calls progress callback after each item.
     *
     * @param uris - Array of AT-URIs to delete
     * @param onProgress - Optional callback for progress updates (0-1)
     * @returns Deletion result with success/failure counts
     *
     * @example
     * ```ts
     * await batchDelete(
     *   uris,
     *   (progress) => console.log(`${Math.round(progress * 100)}% complete`)
     * )
     * ```
     */
    batchDelete(uris: string[], onProgress?: (progress: number) => void): Promise<DeletionResult>;
    /**
     * Safe deletion workflow with confirmation and backup options
     *
     * This is the main entry point for deletion operations. It handles:
     * 1. Confirmation requirement (returns pending state if needed)
     * 2. Backup creation (if requested)
     * 3. Remote deletion (if requested)
     *
     * @param uri - AT-URI of the item to delete
     * @param options - Deletion options
     * @returns Deletion result
     *
     * @example
     * ```ts
     * // Delete from remote with backup
     * await safeDelete(uri, {
     *   createBackup: true,
     *   backupName: 'Before deletion',
     *   deleteFromRemote: true
     * })
     * ```
     */
    safeDelete(uri: string, options?: DeletionOptions): Promise<DeletionResult>;
    /**
     * Preview deletion without executing (dry run)
     *
     * Returns what would be deleted without actually deleting anything.
     * Useful for confirmation dialogs.
     *
     * @param items - Content items to preview deletion for
     * @returns Preview object with counts and estimates
     *
     * @example
     * ```ts
     * const preview = previewDeletion(items);
     * console.log(`Will delete ${preview.count} items: ${preview.breakdown.posts} posts, ${preview.breakdown.likes} likes`);
     * ```
     */
    previewDeletion(items: ContentItem[]): {
        count: number;
        breakdown: {
            posts: number;
            replies: number;
            likes: number;
            reposts: number;
            comments: number;
            all: number;
        };
    };
}
export default DeletionManager;
//# sourceMappingURL=deletion.d.ts.map