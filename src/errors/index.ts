/**
 * Error hierarchy for skymarshal-core
 *
 * Provides type-safe error handling with retry logic and HTTP status codes.
 *
 * @example
 * ```ts
 * import { AuthenticationError, NetworkError, isRetryableError } from 'skymarshal-core';
 *
 * try {
 *   await api.call();
 * } catch (error) {
 *   if (error instanceof AuthenticationError) {
 *     // Re-authenticate
 *   } else if (isRetryableError(error)) {
 *     // Retry with backoff
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// Base Error Class
// ============================================================================

/**
 * Base error class for all skymarshal errors
 *
 * @example
 * ```ts
 * throw new SkymarshalError(
 *   'Operation failed',
 *   'UNKNOWN_ERROR',
 *   { statusCode: 500, retryable: false }
 * );
 * ```
 */
export class SkymarshalError extends Error {
  /**
   * Machine-readable error code
   */
  readonly code: string;

  /**
   * HTTP status code (if applicable)
   */
  readonly statusCode?: number;

  /**
   * Whether this error is safe to retry
   */
  readonly retryable: boolean;

  /**
   * Original error that caused this error
   */
  readonly cause?: Error;

  constructor(
    message: string,
    code: string,
    options: {
      statusCode?: number;
      retryable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'SkymarshalError';
    this.code = code;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
    this.cause = options.cause;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ============================================================================
// Specific Error Classes
// ============================================================================

/**
 * Authentication or authorization error
 *
 * Thrown when credentials are invalid, expired, or missing.
 * Not retryable - requires user intervention.
 *
 * @example
 * ```ts
 * if (!session || session.expired) {
 *   throw new AuthenticationError('Session expired');
 * }
 * ```
 */
export class AuthenticationError extends SkymarshalError {
  constructor(message: string, cause?: Error) {
    super(message, 'AUTH_ERROR', {
      statusCode: 401,
      retryable: false,
      cause,
    });
    this.name = 'AuthenticationError';
  }
}

/**
 * Network connectivity or request error
 *
 * Thrown when network requests fail due to connectivity issues,
 * DNS failures, or connection timeouts. Generally retryable.
 *
 * @example
 * ```ts
 * try {
 *   await fetch(url);
 * } catch (error) {
 *   throw new NetworkError('Failed to connect', error);
 * }
 * ```
 */
export class NetworkError extends SkymarshalError {
  constructor(message: string, cause?: Error) {
    super(message, 'NETWORK_ERROR', {
      statusCode: 503,
      retryable: true,
      cause,
    });
    this.name = 'NetworkError';
  }
}

/**
 * Input validation error
 *
 * Thrown when user input fails validation checks.
 * Not retryable - requires fixing the input.
 *
 * @example
 * ```ts
 * if (!isValidHandle(handle)) {
 *   throw new ValidationError(`Invalid handle: ${handle}`);
 * }
 * ```
 */
export class ValidationError extends SkymarshalError {
  constructor(message: string, cause?: Error) {
    super(message, 'VALIDATION_ERROR', {
      statusCode: 400,
      retryable: false,
      cause,
    });
    this.name = 'ValidationError';
  }
}

/**
 * Rate limit exceeded error
 *
 * Thrown when API rate limits are hit. Retryable after the
 * specified retry-after period.
 *
 * @example
 * ```ts
 * if (response.status === 429) {
 *   const retryAfter = response.headers.get('retry-after');
 *   throw new RateLimitError(
 *     'Rate limit exceeded',
 *     retryAfter ? parseInt(retryAfter) : 60
 *   );
 * }
 * ```
 */
export class RateLimitError extends SkymarshalError {
  /**
   * Number of seconds to wait before retrying
   */
  readonly retryAfter: number;

  constructor(message: string, retryAfter: number = 60, cause?: Error) {
    super(message, 'RATE_LIMIT', {
      statusCode: 429,
      retryable: true,
      cause,
    });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Resource not found error
 *
 * Thrown when a requested resource doesn't exist.
 * Not retryable - the resource is genuinely missing.
 *
 * @example
 * ```ts
 * const post = await getPost(uri);
 * if (!post) {
 *   throw new NotFoundError(`Post not found: ${uri}`);
 * }
 * ```
 */
export class NotFoundError extends SkymarshalError {
  constructor(message: string, cause?: Error) {
    super(message, 'NOT_FOUND', {
      statusCode: 404,
      retryable: false,
      cause,
    });
    this.name = 'NotFoundError';
  }
}

/**
 * Permission denied error
 *
 * Thrown when user lacks permission to access a resource or
 * perform an action. Not retryable - requires permission changes.
 *
 * @example
 * ```ts
 * if (!canModerate(user, post)) {
 *   throw new PermissionError('Cannot moderate this post');
 * }
 * ```
 */
export class PermissionError extends SkymarshalError {
  constructor(message: string, cause?: Error) {
    super(message, 'PERMISSION_DENIED', {
      statusCode: 403,
      retryable: false,
      cause,
    });
    this.name = 'PermissionError';
  }
}

/**
 * Request timeout error
 *
 * Thrown when an operation exceeds its time limit.
 * Retryable with backoff.
 *
 * @example
 * ```ts
 * const controller = new AbortController();
 * setTimeout(() => controller.abort(), 30000);
 *
 * try {
 *   await fetch(url, { signal: controller.signal });
 * } catch (error) {
 *   if (error.name === 'AbortError') {
 *     throw new TimeoutError('Request timed out after 30s');
 *   }
 * }
 * ```
 */
export class TimeoutError extends SkymarshalError {
  constructor(message: string, cause?: Error) {
    super(message, 'TIMEOUT', {
      statusCode: 408,
      retryable: true,
      cause,
    });
    this.name = 'TimeoutError';
  }
}

/**
 * Server error
 *
 * Thrown when the server returns a 5xx error or encounters
 * an internal error. Generally retryable.
 *
 * @example
 * ```ts
 * if (response.status >= 500) {
 *   throw new ServerError(
 *     `Server error: ${response.status} ${response.statusText}`
 *   );
 * }
 * ```
 */
export class ServerError extends SkymarshalError {
  constructor(message: string, statusCode: number = 500, cause?: Error) {
    super(message, 'SERVER_ERROR', {
      statusCode,
      retryable: true,
      cause,
    });
    this.name = 'ServerError';
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if an error is retryable
 *
 * @param error - Error to check
 * @returns True if error is retryable
 *
 * @example
 * ```ts
 * try {
 *   await operation();
 * } catch (error) {
 *   if (isRetryableError(error)) {
 *     await delay(1000);
 *     await operation(); // retry
 *   } else {
 *     throw error; // don't retry
 *   }
 * }
 * ```
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof SkymarshalError) {
    return error.retryable;
  }
  return false;
}
