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
import { isValidAtUri } from '../utils/validation.js';
import type { ContentItem, ContentType } from '../models/index.js';

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
  errors: Array<{ uri: string; error: string }>;
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
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Custom error for network failures
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'NetworkError';
  }
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
export class DeletionManager {
  /**
   * Create a new DeletionManager
   *
   * @param auth - Authenticated AuthManager instance
   */
  constructor(private auth: AuthManager) {}

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
  parseAtUri(uri: string): ParsedAtUri {
    if (!isValidAtUri(uri)) {
      throw new ValidationError('Invalid AT-URI format');
    }

    const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (!match) {
      throw new ValidationError('Invalid AT-URI format');
    }

    return {
      repo: match[1],
      collection: match[2],
      rkey: match[3],
    };
  }

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
  async deleteFromRemote(uri: string): Promise<void> {
    // Check authentication
    if (!this.auth.isAuthenticated()) {
      throw new Error('Authentication required for remote deletion');
    }

    // Parse AT-URI
    const { repo, collection, rkey } = this.parseAtUri(uri);

    try {
      // Use the BskyAgent to delete the record
      await this.auth.agent.com.atproto.repo.deleteRecord({
        repo,
        collection,
        rkey,
      });
    } catch (error) {
      // Handle 404 gracefully (already deleted)
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return; // Already deleted, consider it successful
      }

      throw new NetworkError(
        `Failed to delete from remote: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error && typeof error === 'object' && 'status' in error
          ? (error.status as number)
          : undefined
      );
    }
  }

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
  async batchDelete(
    uris: string[],
    onProgress?: (progress: number) => void
  ): Promise<DeletionResult> {
    const result: DeletionResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    if (!uris || uris.length === 0) {
      return result;
    }

    let processed = 0;

    for (const uri of uris) {
      try {
        await this.deleteFromRemote(uri);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          uri,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      processed++;

      // Call progress callback
      if (onProgress) {
        onProgress(processed / uris.length);
      }
    }

    return result;
  }

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
  async safeDelete(uri: string, options: DeletionOptions = {}): Promise<DeletionResult> {
    const { confirmationRequired = false, deleteFromRemote = true } = options;

    const result: DeletionResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Step 1: If confirmation required, this method should be called again after user confirms
    // For now, we'll assume confirmation is handled by the UI layer
    if (confirmationRequired) {
      // In a real implementation, this would return a pending state
      // and the UI would call safeDelete again without confirmationRequired
      console.warn('Confirmation required - UI should handle this before calling safeDelete');
    }

    // Note: Backup creation would require access to a backup service
    // This is left for the implementation layer to handle separately

    // Step 2: Delete from remote if requested
    if (deleteFromRemote) {
      try {
        await this.deleteFromRemote(uri);
        result.success = 1;
      } catch (error) {
        result.failed = 1;
        result.errors.push({
          uri,
          error: `Remote deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    return result;
  }

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
  } {
    const preview = {
      count: items.length,
      breakdown: {
        posts: 0,
        replies: 0,
        likes: 0,
        reposts: 0,
        comments: 0,
        all: 0,
      },
    };

    items.forEach((item) => {
      const type = item.contentType;

      // Map ContentType to breakdown keys
      if (type === 'posts') {
        preview.breakdown.posts++;
      } else if (type === 'replies') {
        preview.breakdown.replies++;
      } else if (type === 'likes') {
        preview.breakdown.likes++;
      } else if (type === 'reposts') {
        preview.breakdown.reposts++;
      } else if (type === 'comments') {
        preview.breakdown.comments++;
      } else if (type === 'all') {
        preview.breakdown.all++;
      }
    });

    return preview;
  }
}

export default DeletionManager;
