/**
 * Rate limiting utilities using token bucket algorithm
 * @module skymarshal-core/utils/rateLimiter
 */
/**
 * Rate limiter presets for AT Protocol endpoints
 */
export const RateLimiterPresets = {
    /** Search endpoints: 30 requests per minute */
    search: {
        maxTokens: 30,
        refillRate: 30,
        refillInterval: 60 * 1000, // 60 seconds
    },
    /** Write endpoints: 100 requests per 5 minutes */
    write: {
        maxTokens: 100,
        refillRate: 100,
        refillInterval: 5 * 60 * 1000, // 5 minutes
    },
    /** Read endpoints: 300 requests per minute */
    read: {
        maxTokens: 300,
        refillRate: 300,
        refillInterval: 60 * 1000, // 60 seconds
    },
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
export class RateLimiter {
    tokens;
    maxTokens;
    refillRate;
    refillInterval;
    lastRefill;
    refillTimer;
    waitQueue = [];
    /**
     * Create a new rate limiter
     * @param config - Rate limiter configuration
     */
    constructor(config) {
        this.maxTokens = config.maxTokens;
        this.refillRate = config.refillRate;
        this.refillInterval = config.refillInterval;
        this.tokens = config.maxTokens;
        this.lastRefill = Date.now();
        // Start automatic refill
        this.startRefill();
    }
    /**
     * Start automatic token refill timer
     * @private
     */
    startRefill() {
        this.refillTimer = setInterval(() => {
            this.refill();
        }, this.refillInterval);
        // Prevent timer from keeping process alive
        if (this.refillTimer.unref) {
            this.refillTimer.unref();
        }
    }
    /**
     * Stop automatic token refill timer
     */
    stop() {
        if (this.refillTimer) {
            clearInterval(this.refillTimer);
            this.refillTimer = undefined;
        }
    }
    /**
     * Refill tokens based on elapsed time
     * @private
     */
    refill() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        // Calculate tokens to add (proportional to elapsed time)
        const tokensToAdd = Math.floor((elapsed / this.refillInterval) * this.refillRate);
        if (tokensToAdd > 0) {
            this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
            this.lastRefill = now;
            // Process waiting requests
            this.processWaitQueue();
        }
    }
    /**
     * Process queued requests that are waiting for tokens
     * @private
     */
    processWaitQueue() {
        while (this.waitQueue.length > 0 && this.tokens > 0) {
            const resolve = this.waitQueue.shift();
            if (resolve) {
                this.tokens--;
                resolve();
            }
        }
    }
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
    async acquire() {
        // Force a refill check
        this.refill();
        // If tokens available, consume immediately
        if (this.tokens > 0) {
            this.tokens--;
            return;
        }
        // Otherwise, queue and wait
        return new Promise((resolve) => {
            this.waitQueue.push(resolve);
        });
    }
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
    tryAcquire() {
        // Force a refill check
        this.refill();
        if (this.tokens > 0) {
            this.tokens--;
            return true;
        }
        return false;
    }
    /**
     * Get current number of available tokens
     * @returns Number of available tokens
     */
    getAvailableTokens() {
        this.refill();
        return this.tokens;
    }
    /**
     * Get time until next token refill (approximate)
     * @returns Milliseconds until next refill
     */
    getTimeUntilRefill() {
        const elapsed = Date.now() - this.lastRefill;
        return Math.max(0, this.refillInterval - elapsed);
    }
    /**
     * Reset the rate limiter to full capacity
     */
    reset() {
        this.tokens = this.maxTokens;
        this.lastRefill = Date.now();
        this.waitQueue = [];
    }
    /**
     * Get rate limiter statistics
     * @returns Current state information
     */
    getStats() {
        this.refill();
        return {
            availableTokens: this.tokens,
            maxTokens: this.maxTokens,
            refillRate: this.refillRate,
            refillInterval: this.refillInterval,
            queuedRequests: this.waitQueue.length,
            timeUntilRefill: this.getTimeUntilRefill(),
        };
    }
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
export class RateLimiterManager {
    limiters = new Map();
    /**
     * Create a new rate limiter manager
     * @param configs - Map of endpoint names to configurations
     */
    constructor(configs) {
        for (const [name, config] of Object.entries(configs)) {
            this.limiters.set(name, new RateLimiter(config));
        }
    }
    /**
     * Acquire a token for a specific endpoint
     * @param endpoint - Endpoint name
     * @throws Error if endpoint not found
     */
    async acquire(endpoint) {
        const limiter = this.limiters.get(endpoint);
        if (!limiter) {
            throw new Error(`Rate limiter not found for endpoint: ${endpoint}`);
        }
        return limiter.acquire();
    }
    /**
     * Try to acquire a token for a specific endpoint
     * @param endpoint - Endpoint name
     * @returns true if token acquired, false if rate limited
     * @throws Error if endpoint not found
     */
    tryAcquire(endpoint) {
        const limiter = this.limiters.get(endpoint);
        if (!limiter) {
            throw new Error(`Rate limiter not found for endpoint: ${endpoint}`);
        }
        return limiter.tryAcquire();
    }
    /**
     * Get rate limiter for specific endpoint
     * @param endpoint - Endpoint name
     * @returns Rate limiter instance or undefined
     */
    getLimiter(endpoint) {
        return this.limiters.get(endpoint);
    }
    /**
     * Add a new rate limiter
     * @param endpoint - Endpoint name
     * @param config - Rate limiter configuration
     */
    addLimiter(endpoint, config) {
        this.limiters.set(endpoint, new RateLimiter(config));
    }
    /**
     * Remove a rate limiter
     * @param endpoint - Endpoint name
     */
    removeLimiter(endpoint) {
        const limiter = this.limiters.get(endpoint);
        if (limiter) {
            limiter.stop();
            this.limiters.delete(endpoint);
        }
    }
    /**
     * Get statistics for all rate limiters
     * @returns Map of endpoint names to statistics
     */
    getAllStats() {
        const stats = {};
        for (const [name, limiter] of this.limiters.entries()) {
            stats[name] = limiter.getStats();
        }
        return stats;
    }
    /**
     * Reset all rate limiters
     */
    resetAll() {
        for (const limiter of this.limiters.values()) {
            limiter.reset();
        }
    }
    /**
     * Stop all rate limiters
     */
    stopAll() {
        for (const limiter of this.limiters.values()) {
            limiter.stop();
        }
    }
}
//# sourceMappingURL=rateLimiter.js.map