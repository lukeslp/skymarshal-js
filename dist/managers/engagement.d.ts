/**
 * EngagementManager - TTL-based caching for Bluesky engagement metrics
 *
 * Provides efficient engagement data management with:
 * - Dynamic TTL based on content age (new posts: 1h, recent: 6h, old: 24h)
 * - Batch API hydration with concurrency control (10 parallel max)
 * - Rate limiting (20-50ms delays between requests)
 * - Memory cache with automatic expiration
 * - >75% cache hit rate target
 *
 * Performance targets:
 * - Get engagement for 100 items: <500ms (if cached)
 * - Batch 100 API calls: <1s
 * - Cache hit rate: >75%
 *
 * @module skymarshal-core/managers/engagement
 */
import { AtpAgent } from '@atproto/api';
import type { PostWithEngagement } from './content.js';
/**
 * Engagement metrics for a post
 */
export interface EngagementMetrics {
    uri: string;
    likeCount: number;
    repostCount: number;
    replyCount: number;
    quoteCount?: number;
    cachedAt: number;
    expiresAt: number;
    source: 'api' | 'cache';
}
/**
 * TTL configuration based on content age
 */
interface TTLConfig {
    /** Posts < 1 day old */
    recent: number;
    /** Posts 1-7 days old */
    medium: number;
    /** Posts > 7 days old */
    old: number;
}
/**
 * EngagementManager - Manages engagement metrics (likes, reposts, replies) with
 * intelligent caching based on content age. Newer posts change frequently
 * and need shorter cache TTLs, while old posts are stable.
 */
export declare class EngagementManager {
    private agent;
    private cache;
    private ttlConfig;
    private config;
    /** Statistics for monitoring cache performance */
    private stats;
    constructor(agent: AtpAgent, ttlConfig?: TTLConfig);
    /**
     * Calculate dynamic TTL based on content age
     *
     * - Content <1 day old: 1 hour cache
     * - Content <7 days old: 6 hour cache
     * - Content >7 days old: 24 hour cache
     *
     * @param createdAt - ISO8601 timestamp when content was created
     * @returns TTL in milliseconds
     *
     * @example
     * calculateTTL('2024-01-15T10:00:00Z') // 3600000 for new post
     * calculateTTL('2023-01-15T10:00:00Z') // 86400000 for old post
     */
    calculateTTL(createdAt: string): number;
    /**
     * Check if cached data is stale
     *
     * @param cachedAt - Timestamp when item was cached (milliseconds)
     * @param ttl - Time-to-live in milliseconds
     * @returns True if cache is stale and needs refresh
     *
     * @example
     * isStale(Date.now() - 7200000, 3600000) // true (cached 2h ago, TTL 1h)
     * isStale(Date.now() - 1800000, 3600000) // false (cached 30m ago, TTL 1h)
     */
    isStale(cachedAt: number, ttl: number): boolean;
    /**
     * Cache engagement metrics for a URI
     *
     * Stores in memory cache with TTL metadata.
     *
     * @param uri - Content URI
     * @param metrics - Engagement metrics to cache
     */
    cacheEngagement(uri: string, metrics: EngagementMetrics): void;
    /**
     * Get cached engagement metrics
     *
     * Checks memory cache and validates TTL. Returns null if missing or stale.
     *
     * @param uri - Content URI
     * @returns Engagement metrics or null if not cached/stale
     */
    getEngagement(uri: string): EngagementMetrics | null;
    /**
     * Batch update engagement for multiple URIs
     *
     * Optimized workflow:
     * 1. Check cache for each URI with TTL validation
     * 2. Build list of stale/missing URIs
     * 3. Batch fetch from API (10 concurrent max, 20-50ms delays)
     * 4. Update cache with fresh data
     * 5. Return Map of all metrics (cached + fetched)
     *
     * @param uris - Array of content URIs
     * @returns Map of URI to EngagementMetrics
     */
    batchUpdateEngagement(uris: string[]): Promise<Map<string, EngagementMetrics>>;
    /**
     * Hydrate content items with fresh engagement data
     *
     * Main entry point for updating engagement metrics. This method:
     * 1. Checks each item's engagementCachedAt against TTL
     * 2. Builds list of stale/missing URIs
     * 3. Batch fetches engagement for stale URIs
     * 4. Updates item.likeCount, repostCount, replyCount
     * 5. Sets item.engagementCachedAt = Date.now()
     *
     * Mutates the items array in place for efficiency.
     *
     * @param items - Array of content items to hydrate
     */
    hydrateItems(items: PostWithEngagement[]): Promise<void>;
    /**
     * Check if item needs engagement update
     *
     * @param item - Content item to check
     * @returns True if engagement should be refreshed
     */
    private shouldUpdateEngagement;
    /**
     * Fetch engagement metrics from Bluesky API
     *
     * Makes paginated requests to app.bsky.feed.getPosts (batch of 25)
     *
     * @param uri - Content URI
     * @returns Engagement metrics or null on failure
     */
    private fetchEngagementFromAPI;
    /**
     * Fetch like count with pagination (single page for performance)
     *
     * @param uri - Content URI
     * @returns Like count
     */
    fetchLikeCount(uri: string): Promise<number>;
    /**
     * Fetch repost count with pagination (single page for performance)
     *
     * @param uri - Content URI
     * @returns Repost count
     */
    fetchRepostCount(uri: string): Promise<number>;
    /**
     * Handle API rate limit with exponential backoff
     *
     * @param response - Rate limit response
     */
    private handleRateLimit;
    /**
     * Get cache statistics
     *
     * @returns Cache performance metrics
     */
    getStats(): {
        hits: number;
        misses: number;
        hitRate: number;
        apiCalls: number;
        errors: number;
    };
    /**
     * Clear cache statistics
     */
    resetStats(): void;
    /**
     * Clear all cached engagement data
     */
    clearCache(): void;
}
export default EngagementManager;
//# sourceMappingURL=engagement.d.ts.map