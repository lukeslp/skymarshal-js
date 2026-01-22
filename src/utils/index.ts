/**
 * Shared utilities for skymarshal-core
 * @module skymarshal-core/utils
 */

// Re-export validation utilities (primary source for these utilities)
export * from './validation.js';

// Re-export image processing utilities
export * from './image.js';

// Re-export thread utilities (excluding duplicates from validation.js)
export {
  type ThreadPost,
  PostCache,
  fetchThread,
  fetchPreviewReplies,
  flattenThread,
  resolvePostUrl,
  clearPostCache,
  getPostCache,
  countThreadPosts,
  getThreadDepth,
  findPostInThread,
  getThreadAuthors,
} from './threads.js';

// Re-export graph analysis utilities
export * from './graph.js';

// Re-export analytics utilities
export * from './analytics.js';

// Re-export follower ranking analytics (excluding calculateEngagementRate to avoid conflict)
export {
  type InfluenceTier,
  type RankableProfile,
  type InfluenceMetrics,
  type RankedProfile,
  type ProfilesByTier,
  calculateRatio,
  getInfluenceTier,
  calculateInfluenceScore,
  calculateInfluenceMetrics,
  rankByInfluence,
  groupByTier,
  getTopInfluencers,
  filterByMinScore,
  filterByTier,
  getInfluenceStats,
  compareInfluence,
} from './analytics/followerRanking.js';

// Re-export rate limiter utilities
export * from './rateLimiter.js';

// Re-export retry utilities
export * from './retry.js';

/**
 * Cache entry with TTL
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

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
export const DEFAULT_TTL: TTLConfig = {
  recent: 60 * 1000,        // 1 minute for very recent posts
  medium: 6 * 60 * 60 * 1000,   // 6 hours for medium age
  old: 24 * 60 * 60 * 1000,     // 24 hours for old posts
};

/**
 * EngagementCache - TTL-based cache for engagement metrics
 * Uses age-based TTL: recent posts expire faster than old posts
 */
export class EngagementCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private ttlConfig: TTLConfig;
  private maxSize: number;

  constructor(ttlConfig: TTLConfig = DEFAULT_TTL, maxSize: number = 10000) {
    this.ttlConfig = ttlConfig;
    this.maxSize = maxSize;
  }

  /**
   * Get TTL based on post creation time
   * @param createdAt - Post creation timestamp
   */
  private getTTL(createdAt?: string | Date): number {
    if (!createdAt) return this.ttlConfig.medium;

    const postAge = Date.now() - new Date(createdAt).getTime();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;

    if (postAge < oneHour) return this.ttlConfig.recent;
    if (postAge < oneDay) return this.ttlConfig.medium;
    return this.ttlConfig.old;
  }

  /**
   * Get value from cache
   * @param key - Cache key
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) return undefined;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param createdAt - Post creation time for TTL calculation
   */
  set(key: string, value: T, createdAt?: string | Date): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    const ttl = this.getTTL(createdAt);
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Check if key exists and is not expired
   * @param key - Cache key
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a key from cache
   * @param key - Cache key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

/**
 * PaginationHelper - Utilities for cursor-based pagination
 */
export class PaginationHelper {
  /**
   * Iterate through all pages of a paginated API
   * @param fetcher - Function that fetches a page
   * @param options - Pagination options
   */
  static async *iterate<T>(
    fetcher: (cursor?: string) => Promise<{ records: T[]; cursor?: string }>,
    options: { maxPages?: number; delayMs?: number } = {}
  ): AsyncGenerator<T[], void, unknown> {
    const { maxPages = Infinity, delayMs = 0 } = options;
    let cursor: string | undefined;
    let pageCount = 0;

    do {
      const result = await fetcher(cursor);
      yield result.records;
      
      cursor = result.cursor;
      pageCount++;

      if (delayMs > 0 && cursor) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } while (cursor && pageCount < maxPages);
  }

  /**
   * Collect all items from a paginated API
   * @param fetcher - Function that fetches a page
   * @param options - Pagination options
   */
  static async collectAll<T>(
    fetcher: (cursor?: string) => Promise<{ records: T[]; cursor?: string }>,
    options: { maxPages?: number; delayMs?: number; onProgress?: (count: number) => void } = {}
  ): Promise<T[]> {
    const { onProgress } = options;
    const all: T[] = [];

    for await (const page of this.iterate(fetcher, options)) {
      all.push(...page);
      onProgress?.(all.length);
    }

    return all;
  }
}

/**
 * ExportHelper - Utilities for exporting data
 */
export class ExportHelper {
  /**
   * Convert array of objects to CSV string
   * @param data - Array of objects
   * @param columns - Column configuration
   */
  static toCSV<T extends Record<string, unknown>>(
    data: T[],
    columns?: { key: keyof T; header?: string }[]
  ): string {
    if (data.length === 0) return '';

    // Determine columns
    const cols = columns || Object.keys(data[0]).map(key => ({ key: key as keyof T, header: String(key) }));
    
    // Header row
    const header = cols.map(col => (col as any).header || String(col.key)).join(',');
    
    // Data rows
    const rows = data.map(item => 
      cols.map(col => {
        const value = item[col.key];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      }).join(',')
    );

    return [header, ...rows].join('\n');
  }

  /**
   * Convert array of objects to JSON string
   * @param data - Array of objects
   * @param pretty - Whether to format with indentation
   */
  static toJSON<T>(data: T[], pretty: boolean = true): string {
    return JSON.stringify(data, null, pretty ? 2 : 0);
  }

  /**
   * Download data as a file (browser environment)
   * @param content - File content
   * @param filename - Output filename
   * @param mimeType - MIME type
   */
  static download(content: string | Uint8Array, filename: string, mimeType: string = 'text/plain'): void {
    const blob = new Blob([content as BlobPart], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Download data as CSV file
   * @param data - Array of objects
   * @param filename - Output filename
   */
  static downloadCSV<T extends Record<string, unknown>>(data: T[], filename: string): void {
    const csv = this.toCSV(data);
    this.download(csv, filename, 'text/csv');
  }

  /**
   * Download data as JSON file
   * @param data - Data to export
   * @param filename - Output filename
   */
  static downloadJSON<T>(data: T, filename: string): void {
    const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    this.download(json, filename, 'application/json');
  }
}

/**
 * Date utilities
 */
export const DateUtils = {
  /**
   * Get relative time string (e.g., "2 hours ago")
   * @param date - Date to format
   */
  relativeTime(date: string | Date): string {
    const now = Date.now();
    const then = new Date(date).getTime();
    const diff = now - then;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years}y ago`;
    if (months > 0) return `${months}mo ago`;
    if (weeks > 0) return `${weeks}w ago`;
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  },

  /**
   * Check if a date is within a time range
   * @param date - Date to check
   * @param range - Time range in milliseconds
   */
  isWithin(date: string | Date, range: number): boolean {
    const then = new Date(date).getTime();
    return Date.now() - then <= range;
  },

  /**
   * Get post age category
   * @param date - Post creation date
   */
  getAgeCategory(date: string | Date): 'recent' | 'medium' | 'old' {
    const age = Date.now() - new Date(date).getTime();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;

    if (age < oneHour) return 'recent';
    if (age < oneDay) return 'medium';
    return 'old';
  },
};

/**
 * Engagement scoring utilities
 */
export const EngagementUtils = {
  /**
   * Calculate engagement score
   * Formula: likes + (2 × reposts) + (2.5 × replies)
   */
  calculateScore(likes: number, reposts: number, replies: number): number {
    return likes + (2 * reposts) + (2.5 * replies);
  },

  /**
   * Get engagement preset based on score relative to average
   */
  getPreset(score: number, average: number): 'dead' | 'bombers' | 'mid' | 'bangers' | 'viral' {
    if (average === 0) return score === 0 ? 'dead' : 'bangers';
    
    const ratio = score / average;
    
    if (ratio < 0.1) return 'dead';
    if (ratio < 0.5) return 'bombers';
    if (ratio < 1.0) return 'mid';
    if (ratio < 5.0) return 'bangers';
    return 'viral';
  },

  /**
   * Get percentile rank
   */
  getPercentile(score: number, allScores: number[]): number {
    if (allScores.length === 0) return 0;
    const sorted = [...allScores].sort((a, b) => a - b);
    const rank = sorted.filter(s => s <= score).length;
    return (rank / sorted.length) * 100;
  },
};

/**
 * URI parsing utilities
 */
export const UriUtils = {
  /**
   * Parse an AT URI into components
   */
  parse(uri: string): { repo: string; collection: string; rkey: string } | null {
    const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (!match) return null;
    return {
      repo: match[1],
      collection: match[2],
      rkey: match[3],
    };
  },

  /**
   * Build an AT URI from components
   */
  build(repo: string, collection: string, rkey: string): string {
    return `at://${repo}/${collection}/${rkey}`;
  },

  /**
   * Extract DID from AT URI
   */
  getDid(uri: string): string | null {
    const parsed = this.parse(uri);
    return parsed?.repo || null;
  },

  /**
   * Extract collection from AT URI
   */
  getCollection(uri: string): string | null {
    const parsed = this.parse(uri);
    return parsed?.collection || null;
  },
};

/**
 * Batch processing utilities
 */
export const BatchUtils = {
  /**
   * Split array into chunks
   */
  chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  /**
   * Process items in batches with concurrency limit
   */
  async processBatches<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    options: { batchSize?: number; delayMs?: number; onProgress?: (processed: number, total: number) => void } = {}
  ): Promise<R[]> {
    const { batchSize = 25, delayMs = 0, onProgress } = options;
    const batches = this.chunk(items, batchSize);
    const results: R[] = [];
    let processed = 0;

    for (const batch of batches) {
      const batchResults = await processor(batch);
      results.push(...batchResults);
      processed += batch.length;
      onProgress?.(processed, items.length);

      if (delayMs > 0 && processed < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  },
};
