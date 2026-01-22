/**
 * Retry utilities with exponential backoff for network requests
 * @module skymarshal-core/utils/retry
 */
/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableStatusCodes: [429, 500, 502, 503, 504],
};
/**
 * Calculate delay for exponential backoff with jitter
 *
 * Formula: min(maxDelay, baseDelay * (multiplier ^ attempt)) + random jitter
 * Jitter prevents thundering herd problem when many clients retry simultaneously
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt, config) {
    const { baseDelayMs, maxDelayMs, backoffMultiplier } = config;
    // Calculate exponential delay: baseDelay * (multiplier ^ attempt)
    const exponentialDelay = baseDelayMs * Math.pow(backoffMultiplier, attempt);
    // Cap at maximum delay
    const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
    // Add jitter (±25% random variation)
    const jitter = cappedDelay * 0.25 * (Math.random() - 0.5);
    return Math.round(cappedDelay + jitter);
}
/**
 * Extract Retry-After header value from HTTP response
 * Supports both seconds (integer) and HTTP date formats
 *
 * @param error - Error object that may contain response headers
 * @returns Delay in milliseconds, or null if not present
 */
function getRetryAfterDelay(error) {
    if (!isHttpError(error) || !error.response?.headers) {
        return null;
    }
    const headers = error.response.headers;
    let retryAfter = null;
    // Handle both Headers object and plain object
    if (headers instanceof Headers) {
        retryAfter = headers.get('retry-after');
    }
    else if (typeof headers === 'object') {
        // Case-insensitive lookup
        const key = Object.keys(headers).find(k => k.toLowerCase() === 'retry-after');
        retryAfter = key ? String(headers[key]) : null;
    }
    if (!retryAfter) {
        return null;
    }
    // Parse as seconds (integer)
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
        return seconds * 1000;
    }
    // Parse as HTTP date
    const retryDate = new Date(retryAfter);
    if (!isNaN(retryDate.getTime())) {
        return Math.max(0, retryDate.getTime() - Date.now());
    }
    return null;
}
/**
 * Type guard to check if error is an HTTP error with status code
 *
 * @param error - Error to check
 * @returns True if error has HTTP status information
 */
function isHttpError(error) {
    return (error !== null &&
        typeof error === 'object' &&
        ('status' in error || ('response' in error && typeof error.response === 'object')));
}
/**
 * Extract HTTP status code from error
 *
 * @param error - Error object
 * @returns HTTP status code, or null if not available
 */
function getStatusCode(error) {
    if (!isHttpError(error)) {
        return null;
    }
    return error.status ?? error.response?.status ?? null;
}
/**
 * Determine if an error should be retried based on configuration
 *
 * @param error - Error that occurred
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns True if the error should be retried
 */
function shouldRetryError(error, attempt, config) {
    // Check if we've exceeded max attempts
    if (attempt >= config.maxAttempts - 1) {
        return false;
    }
    // Use custom retry logic if provided
    if (config.shouldRetry) {
        return config.shouldRetry(error, attempt);
    }
    // Check if status code is retryable
    const statusCode = getStatusCode(error);
    if (statusCode !== null) {
        return config.retryableStatusCodes.includes(statusCode);
    }
    // Retry network errors (connection refused, timeout, etc.)
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (message.includes('fetch') ||
            message.includes('network') ||
            message.includes('timeout') ||
            message.includes('econnrefused') ||
            message.includes('enotfound') ||
            message.includes('etimedout'));
    }
    return false;
}
/**
 * Sleep for specified milliseconds
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
export async function withRetry(fn, config = {}) {
    const finalConfig = {
        ...DEFAULT_RETRY_CONFIG,
        ...config,
    };
    let lastError;
    for (let attempt = 0; attempt < finalConfig.maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            // Check if we should retry this error
            if (!shouldRetryError(error, attempt, finalConfig)) {
                throw error;
            }
            // Calculate delay for next retry
            let delayMs;
            // Check for Retry-After header (HTTP 429)
            const retryAfterDelay = getRetryAfterDelay(error);
            if (retryAfterDelay !== null) {
                delayMs = Math.min(retryAfterDelay, finalConfig.maxDelayMs);
            }
            else {
                delayMs = calculateBackoffDelay(attempt, finalConfig);
            }
            // Notify about retry attempt
            if (config.onRetry) {
                config.onRetry(error, attempt, delayMs);
            }
            // Wait before retrying
            await sleep(delayMs);
        }
    }
    // All attempts failed
    throw lastError;
}
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
export function createRetryable(fn, config = {}) {
    return (...args) => withRetry(() => fn(...args), config);
}
/**
 * Retry configuration presets for common scenarios
 */
export const RetryPresets = {
    /**
     * Conservative retry for user-facing requests
     * 3 attempts, 1s base delay, 10s max
     */
    conservative: {
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
    },
    /**
     * Aggressive retry for background jobs
     * 5 attempts, 2s base delay, 60s max
     */
    aggressive: {
        maxAttempts: 5,
        baseDelayMs: 2000,
        maxDelayMs: 60000,
        backoffMultiplier: 2,
    },
    /**
     * Quick retry for fast APIs
     * 3 attempts, 500ms base delay, 5s max
     */
    quick: {
        maxAttempts: 3,
        baseDelayMs: 500,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
    },
    /**
     * Patient retry for slow or rate-limited APIs
     * 7 attempts, 5s base delay, 120s max
     */
    patient: {
        maxAttempts: 7,
        baseDelayMs: 5000,
        maxDelayMs: 120000,
        backoffMultiplier: 2,
    },
};
//# sourceMappingURL=retry.js.map