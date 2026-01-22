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
/**
 * Default TTL values
 */
const DEFAULT_TTL = {
    recent: 60 * 60 * 1000, // 1 hour
    medium: 6 * 60 * 60 * 1000, // 6 hours
    old: 24 * 60 * 60 * 1000, // 24 hours
};
/**
 * Sleep utility for rate limiting
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Parallel map with concurrency control
 */
async function parallelMap(items, mapper, maxConcurrency) {
    const results = [];
    const queue = [...items];
    async function worker() {
        while (queue.length > 0) {
            const item = queue.shift();
            if (!item)
                break;
            const result = await mapper(item);
            results.push(result);
        }
    }
    const workers = Array.from({ length: maxConcurrency }, () => worker());
    await Promise.all(workers);
    return results;
}
/**
 * EngagementManager - Manages engagement metrics (likes, reposts, replies) with
 * intelligent caching based on content age. Newer posts change frequently
 * and need shorter cache TTLs, while old posts are stable.
 */
export class EngagementManager {
    agent;
    cache = new Map();
    ttlConfig;
    config = {
        baseUrl: 'https://public.api.bsky.app/xrpc',
        minDelay: 20,
        maxDelay: 50,
        maxConcurrency: 10,
        pageSize: 100
    };
    /** Statistics for monitoring cache performance */
    stats = {
        hits: 0,
        misses: 0,
        apiCalls: 0,
        errors: 0
    };
    constructor(agent, ttlConfig = DEFAULT_TTL) {
        this.agent = agent;
        this.ttlConfig = ttlConfig;
    }
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
    calculateTTL(createdAt) {
        const postAge = Date.now() - new Date(createdAt).getTime();
        const oneDay = 24 * 60 * 60 * 1000;
        const sevenDays = 7 * oneDay;
        if (postAge < oneDay)
            return this.ttlConfig.recent;
        if (postAge < sevenDays)
            return this.ttlConfig.medium;
        return this.ttlConfig.old;
    }
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
    isStale(cachedAt, ttl) {
        return Date.now() - cachedAt > ttl;
    }
    /**
     * Cache engagement metrics for a URI
     *
     * Stores in memory cache with TTL metadata.
     *
     * @param uri - Content URI
     * @param metrics - Engagement metrics to cache
     */
    cacheEngagement(uri, metrics) {
        try {
            this.cache.set(uri, metrics);
        }
        catch (error) {
            console.error(`Failed to cache engagement for ${uri}:`, error);
            this.stats.errors++;
            // Don't throw - graceful degradation
        }
    }
    /**
     * Get cached engagement metrics
     *
     * Checks memory cache and validates TTL. Returns null if missing or stale.
     *
     * @param uri - Content URI
     * @returns Engagement metrics or null if not cached/stale
     */
    getEngagement(uri) {
        try {
            const cached = this.cache.get(uri);
            if (!cached) {
                this.stats.misses++;
                return null;
            }
            // Check if expired
            if (Date.now() > cached.expiresAt) {
                this.stats.misses++;
                // Delete stale entry
                this.cache.delete(uri);
                return null;
            }
            this.stats.hits++;
            return cached;
        }
        catch (error) {
            console.error(`Failed to get engagement for ${uri}:`, error);
            this.stats.errors++;
            return null;
        }
    }
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
    async batchUpdateEngagement(uris) {
        const results = new Map();
        const staleUris = [];
        // Step 1: Check cache for each URI
        for (const uri of uris) {
            const cached = this.getEngagement(uri);
            if (cached) {
                results.set(uri, cached);
            }
            else {
                staleUris.push(uri);
            }
        }
        // Step 2: If all cached, return early
        if (staleUris.length === 0) {
            return results;
        }
        // Step 3: Batch fetch stale URIs with concurrency control
        try {
            const fetchedMetrics = await parallelMap(staleUris, async (uri) => this.fetchEngagementFromAPI(uri), this.config.maxConcurrency);
            // Step 4: Cache fetched data and add to results
            for (const metrics of fetchedMetrics) {
                if (metrics) {
                    this.cacheEngagement(metrics.uri, metrics);
                    results.set(metrics.uri, metrics);
                }
            }
        }
        catch (error) {
            console.error('Batch update engagement failed:', error);
            this.stats.errors++;
            // Continue with cached data - graceful degradation
        }
        return results;
    }
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
    async hydrateItems(items) {
        if (!items || items.length === 0) {
            return;
        }
        const now = Date.now();
        const urisToUpdate = [];
        // Step 1: Identify stale items
        for (const item of items) {
            const shouldUpdate = this.shouldUpdateEngagement(item);
            if (shouldUpdate) {
                urisToUpdate.push(item.uri);
            }
        }
        // Step 2: Batch fetch stale engagement
        if (urisToUpdate.length === 0) {
            return;
        }
        const engagementMap = await this.batchUpdateEngagement(urisToUpdate);
        // Step 3: Update items with fresh data
        for (const item of items) {
            const metrics = engagementMap.get(item.uri);
            if (metrics) {
                item.likeCount = metrics.likeCount;
                item.repostCount = metrics.repostCount;
                item.replyCount = metrics.replyCount;
                if (metrics.quoteCount !== undefined) {
                    item.quoteCount = metrics.quoteCount;
                }
                item.engagementCachedAt = now;
            }
        }
    }
    /**
     * Check if item needs engagement update
     *
     * @param item - Content item to check
     * @returns True if engagement should be refreshed
     */
    shouldUpdateEngagement(item) {
        // Never cached - needs update
        if (!item.engagementCachedAt) {
            return true;
        }
        // No creation date - use default 1 hour TTL
        if (!item.createdAt) {
            return this.isStale(item.engagementCachedAt, 3600000);
        }
        // Calculate dynamic TTL and check staleness
        const ttl = this.calculateTTL(item.createdAt);
        return this.isStale(item.engagementCachedAt, ttl);
    }
    /**
     * Fetch engagement metrics from Bluesky API
     *
     * Makes paginated requests to app.bsky.feed.getPosts (batch of 25)
     *
     * @param uri - Content URI
     * @returns Engagement metrics or null on failure
     */
    async fetchEngagementFromAPI(uri) {
        try {
            this.stats.apiCalls++;
            // Add random delay for rate limiting (20-50ms)
            const delay = this.config.minDelay +
                Math.random() * (this.config.maxDelay - this.config.minDelay);
            await sleep(delay);
            // Fetch post data (includes engagement metrics)
            const response = await this.agent.app.bsky.feed.getPosts({ uris: [uri] });
            if (!response.data.posts || response.data.posts.length === 0) {
                return null;
            }
            const post = response.data.posts[0];
            // Extract creation date from URI for TTL calculation
            // URI format: at://did:plc:xxx/app.bsky.feed.post/yyy
            const record = post.record;
            const createdAt = record?.createdAt || new Date().toISOString();
            const ttl = this.calculateTTL(createdAt);
            const now = Date.now();
            const metrics = {
                uri,
                likeCount: post.likeCount || 0,
                repostCount: post.repostCount || 0,
                replyCount: post.replyCount || 0,
                quoteCount: post.quoteCount || 0,
                cachedAt: now,
                expiresAt: now + ttl,
                source: 'api'
            };
            return metrics;
        }
        catch (error) {
            console.error(`Failed to fetch engagement for ${uri}:`, error);
            this.stats.errors++;
            // Return null on error - graceful degradation
            return null;
        }
    }
    /**
     * Fetch like count with pagination (single page for performance)
     *
     * @param uri - Content URI
     * @returns Like count
     */
    async fetchLikeCount(uri) {
        try {
            const response = await fetch(`${this.config.baseUrl}/app.bsky.feed.getLikes?uri=${encodeURIComponent(uri)}&limit=${this.config.pageSize}`);
            if (!response.ok) {
                if (response.status === 429) {
                    await this.handleRateLimit(response);
                }
                return 0;
            }
            const data = await response.json();
            return data.likes?.length || 0;
        }
        catch (error) {
            console.error(`Failed to fetch likes for ${uri}:`, error);
            return 0;
        }
    }
    /**
     * Fetch repost count with pagination (single page for performance)
     *
     * @param uri - Content URI
     * @returns Repost count
     */
    async fetchRepostCount(uri) {
        try {
            const response = await fetch(`${this.config.baseUrl}/app.bsky.feed.getRepostedBy?uri=${encodeURIComponent(uri)}&limit=${this.config.pageSize}`);
            if (!response.ok) {
                if (response.status === 429) {
                    await this.handleRateLimit(response);
                }
                return 0;
            }
            const data = await response.json();
            return data.repostedBy?.length || 0;
        }
        catch (error) {
            console.error(`Failed to fetch reposts for ${uri}:`, error);
            return 0;
        }
    }
    /**
     * Handle API rate limit with exponential backoff
     *
     * @param response - Rate limit response
     */
    async handleRateLimit(response) {
        // Check for Retry-After header
        const retryAfter = response.headers.get('Retry-After');
        const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000;
        console.warn(`Rate limited. Waiting ${delayMs}ms before retry...`);
        await sleep(delayMs);
    }
    /**
     * Get cache statistics
     *
     * @returns Cache performance metrics
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? this.stats.hits / total : 0;
        return {
            ...this.stats,
            hitRate
        };
    }
    /**
     * Clear cache statistics
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            apiCalls: 0,
            errors: 0
        };
    }
    /**
     * Clear all cached engagement data
     */
    clearCache() {
        this.cache.clear();
        this.resetStats();
    }
}
export default EngagementManager;
//# sourceMappingURL=engagement.js.map