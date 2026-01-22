/**
 * Retry utilities with exponential backoff for network requests
 * @module skymarshal-core/utils/retry
 */
/**
 * Configuration options for retry behavior
 */
export interface RetryConfig {
    /** Maximum number of retry attempts (default: 3) */
    maxAttempts?: number;
    /** Base delay in milliseconds before first retry (default: 1000) */
    baseDelayMs?: number;
    /** Maximum delay in milliseconds between retries (default: 30000) */
    maxDelayMs?: number;
    /** Multiplier for exponential backoff (default: 2) */
    backoffMultiplier?: number;
    /** HTTP status codes that should trigger a retry (default: [429, 500, 502, 503, 504]) */
    retryableStatusCodes?: number[];
    /** Custom function to determine if error should be retried */
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    /** Callback invoked before each retry attempt */
    onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}
/**
 * Error response that includes HTTP status code and headers
 */
export interface HttpError extends Error {
    status?: number;
    response?: {
        status?: number;
        headers?: Headers | Record<string, string>;
    };
}
/**
 * Wrap an async function with retry logic and exponential backoff
 *
 * Automatically retries failed operations with exponential backoff and jitter.
 * Respects HTTP 429 Retry-After headers for rate limiting.
 *
 * @example
 * ```typescript
 * // Basic usage with defaults
 * const result = await withRetry(async () => {
 *   return fetch('https://api.example.com/data');
 * });
 *
 * // Custom configuration
 * const result = await withRetry(
 *   async () => fetch('https://api.example.com/data'),
 *   {
 *     maxAttempts: 5,
 *     baseDelayMs: 2000,
 *     onRetry: (error, attempt, delayMs) => {
 *       console.log(`Retry ${attempt + 1} after ${delayMs}ms:`, error.message);
 *     }
 *   }
 * );
 *
 * // Custom retry logic
 * const result = await withRetry(
 *   async () => processData(),
 *   {
 *     shouldRetry: (error, attempt) => {
 *       // Only retry on specific error types
 *       return error instanceof NetworkError && attempt < 3;
 *     }
 *   }
 * );
 * ```
 *
 * @template T - Return type of the wrapped function
 * @param fn - Async function to execute with retry logic
 * @param config - Retry configuration options
 * @returns Promise that resolves to the function's return value
 * @throws The last error encountered if all retry attempts fail
 */
export declare function withRetry<T>(fn: () => Promise<T>, config?: RetryConfig): Promise<T>;
/**
 * Create a retryable version of a function with preset configuration
 *
 * Useful for creating reusable functions with specific retry behavior.
 *
 * @example
 * ```typescript
 * // Create a retryable API client
 * const retryableClient = createRetryable(
 *   (url: string) => fetch(url).then(r => r.json()),
 *   { maxAttempts: 5, baseDelayMs: 2000 }
 * );
 *
 * // Use it multiple times
 * const users = await retryableClient('https://api.example.com/users');
 * const posts = await retryableClient('https://api.example.com/posts');
 * ```
 *
 * @template Args - Argument types of the function
 * @template Return - Return type of the function
 * @param fn - Function to make retryable
 * @param config - Retry configuration
 * @returns New function with retry logic baked in
 */
export declare function createRetryable<Args extends any[], Return>(fn: (...args: Args) => Promise<Return>, config?: RetryConfig): (...args: Args) => Promise<Return>;
/**
 * Retry configuration presets for common scenarios
 */
export declare const RetryPresets: {
    /**
     * Conservative retry for user-facing requests
     * 3 attempts, 1s base delay, 10s max
     */
    readonly conservative: {
        maxAttempts: number;
        baseDelayMs: number;
        maxDelayMs: number;
        backoffMultiplier: number;
    };
    /**
     * Aggressive retry for background jobs
     * 5 attempts, 2s base delay, 60s max
     */
    readonly aggressive: {
        maxAttempts: number;
        baseDelayMs: number;
        maxDelayMs: number;
        backoffMultiplier: number;
    };
    /**
     * Quick retry for fast APIs
     * 3 attempts, 500ms base delay, 5s max
     */
    readonly quick: {
        maxAttempts: number;
        baseDelayMs: number;
        maxDelayMs: number;
        backoffMultiplier: number;
    };
    /**
     * Patient retry for slow or rate-limited APIs
     * 7 attempts, 5s base delay, 120s max
     */
    readonly patient: {
        maxAttempts: number;
        baseDelayMs: number;
        maxDelayMs: number;
        backoffMultiplier: number;
    };
};
//# sourceMappingURL=retry.d.ts.map