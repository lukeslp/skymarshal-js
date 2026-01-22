/**
 * Rate limiting utilities using token bucket algorithm
 * @module skymarshal-core/utils/rateLimiter
 */
/**
 * Configuration for rate limiter
 */
export interface RateLimiterConfig {
    /** Maximum number of tokens in the bucket */
    maxTokens: number;
    /** Number of tokens to refill per interval */
    refillRate: number;
    /** Refill interval in milliseconds */
    refillInterval: number;
}
/**
 * Rate limiter presets for AT Protocol endpoints
 */
export declare const RateLimiterPresets: {
    /** Search endpoints: 30 requests per minute */
    readonly search: {
        readonly maxTokens: 30;
        readonly refillRate: 30;
        readonly refillInterval: number;
    };
    /** Write endpoints: 100 requests per 5 minutes */
    readonly write: {
        readonly maxTokens: 100;
        readonly refillRate: 100;
        readonly refillInterval: number;
    };
    /** Read endpoints: 300 requests per minute */
    readonly read: {
        readonly maxTokens: 300;
        readonly refillRate: 300;
        readonly refillInterval: number;
    };
};
/**
 * Token bucket rate limiter
 *
 * Implements the token bucket algorithm for rate limiting:
 * - Tokens are consumed on each request
 * - Tokens refill at a constant rate
 * - Requests wait if no tokens available (async acquire)
 * - Requests fail immediately if no tokens (sync tryAcquire)
 *
 * @example
 * ```typescript
 * // Using preset
 * const limiter = new RateLimiter(RateLimiterPresets.search);
 *
 * // Async wait for token
 * await limiter.acquire();
 * makeSearchRequest();
 *
 * // Sync check without waiting
 * if (limiter.tryAcquire()) {
 *   makeRequest();
 * } else {
 *   console.log('Rate limited');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Custom configuration
 * const limiter = new RateLimiter({
 *   maxTokens: 50,
 *   refillRate: 10,
 *   refillInterval: 1000, // 10 tokens per second
 * });
 * ```
 */
export declare class RateLimiter {
    private tokens;
    private readonly maxTokens;
    private readonly refillRate;
    private readonly refillInterval;
    private lastRefill;
    private refillTimer?;
    private waitQueue;
    /**
     * Create a new rate limiter
     * @param config - Rate limiter configuration
     */
    constructor(config: RateLimiterConfig);
    /**
     * Start automatic token refill timer
     * @private
     */
    private startRefill;
    /**
     * Stop automatic token refill timer
     */
    stop(): void;
    /**
     * Refill tokens based on elapsed time
     * @private
     */
    private refill;
    /**
     * Process queued requests that are waiting for tokens
     * @private
     */
    private processWaitQueue;
    /**
     * Acquire a token, waiting if necessary
     *
     * This method will wait until a token is available.
     * Use this for operations that should eventually succeed.
     *
     * @returns Promise that resolves when a token is acquired
     *
     * @example
     * ```typescript
     * // Wait for rate limit
     * await limiter.acquire();
     * await makeApiCall();
     * ```
     */
    acquire(): Promise<void>;
    /**
     * Try to acquire a token without waiting
     *
     * Returns true if token was acquired, false otherwise.
     * Use this for operations that should fail fast if rate limited.
     *
     * @returns true if token acquired, false if rate limited
     *
     * @example
     * ```typescript
     * // Fail fast if rate limited
     * if (!limiter.tryAcquire()) {
     *   throw new Error('Rate limited');
     * }
     * makeApiCall();
     * ```
     */
    tryAcquire(): boolean;
    /**
     * Get current number of available tokens
     * @returns Number of available tokens
     */
    getAvailableTokens(): number;
    /**
     * Get time until next token refill (approximate)
     * @returns Milliseconds until next refill
     */
    getTimeUntilRefill(): number;
    /**
     * Reset the rate limiter to full capacity
     */
    reset(): void;
    /**
     * Get rate limiter statistics
     * @returns Current state information
     */
    getStats(): {
        availableTokens: number;
        maxTokens: number;
        refillRate: number;
        refillInterval: number;
        queuedRequests: number;
        timeUntilRefill: number;
    };
}
/**
 * Rate limiter manager for multiple endpoints
 *
 * Manages separate rate limiters for different endpoints or categories.
 *
 * @example
 * ```typescript
 * const manager = new RateLimiterManager({
 *   search: RateLimiterPresets.search,
 *   write: RateLimiterPresets.write,
 *   read: RateLimiterPresets.read,
 * });
 *
 * await manager.acquire('search');
 * makeSearchRequest();
 *
 * if (manager.tryAcquire('write')) {
 *   makeWriteRequest();
 * }
 * ```
 */
export declare class RateLimiterManager {
    private limiters;
    /**
     * Create a new rate limiter manager
     * @param configs - Map of endpoint names to configurations
     */
    constructor(configs: Record<string, RateLimiterConfig>);
    /**
     * Acquire a token for a specific endpoint
     * @param endpoint - Endpoint name
     * @throws Error if endpoint not found
     */
    acquire(endpoint: string): Promise<void>;
    /**
     * Try to acquire a token for a specific endpoint
     * @param endpoint - Endpoint name
     * @returns true if token acquired, false if rate limited
     * @throws Error if endpoint not found
     */
    tryAcquire(endpoint: string): boolean;
    /**
     * Get rate limiter for specific endpoint
     * @param endpoint - Endpoint name
     * @returns Rate limiter instance or undefined
     */
    getLimiter(endpoint: string): RateLimiter | undefined;
    /**
     * Add a new rate limiter
     * @param endpoint - Endpoint name
     * @param config - Rate limiter configuration
     */
    addLimiter(endpoint: string, config: RateLimiterConfig): void;
    /**
     * Remove a rate limiter
     * @param endpoint - Endpoint name
     */
    removeLimiter(endpoint: string): void;
    /**
     * Get statistics for all rate limiters
     * @returns Map of endpoint names to statistics
     */
    getAllStats(): Record<string, ReturnType<RateLimiter['getStats']>>;
    /**
     * Reset all rate limiters
     */
    resetAll(): void;
    /**
     * Stop all rate limiters
     */
    stopAll(): void;
}
//# sourceMappingURL=rateLimiter.d.ts.map