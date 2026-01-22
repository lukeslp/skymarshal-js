# Error Hierarchy

Complete error handling system for skymarshal-core with retry logic and HTTP status codes.

## Overview

The error hierarchy provides:
- Type-safe error handling
- Automatic retry detection
- HTTP status code mapping
- Error chaining with `cause`
- Clear error codes for programmatic handling

## Error Classes

### Base Class: `SkymarshalError`

All skymarshal errors extend this base class.

**Properties:**
- `code: string` - Machine-readable error code
- `statusCode?: number` - HTTP status code (if applicable)
- `retryable: boolean` - Whether error is safe to retry
- `cause?: Error` - Original error that caused this error

```ts
import { SkymarshalError } from 'skymarshal-core';

throw new SkymarshalError('Operation failed', 'UNKNOWN_ERROR', {
  statusCode: 500,
  retryable: false,
  cause: originalError
});
```

### Specific Error Classes

| Error Class | Code | Status | Retryable | Use Case |
|-------------|------|--------|-----------|----------|
| `SkymarshalAuthenticationError` | `AUTH_ERROR` | 401 | No | Invalid/expired credentials |
| `SkymarshalNetworkError` | `NETWORK_ERROR` | 503 | Yes | Connection failures |
| `SkymarshalValidationError` | `VALIDATION_ERROR` | 400 | No | Invalid input |
| `RateLimitError` | `RATE_LIMIT` | 429 | Yes | Rate limit exceeded |
| `NotFoundError` | `NOT_FOUND` | 404 | No | Resource doesn't exist |
| `PermissionError` | `PERMISSION_DENIED` | 403 | No | Insufficient permissions |
| `TimeoutError` | `TIMEOUT` | 408 | Yes | Operation timed out |
| `ServerError` | `SERVER_ERROR` | 500 | Yes | Server-side error |

## Usage Examples

### Basic Error Handling

```ts
import {
  SkymarshalAuthenticationError,
  SkymarshalNetworkError,
  isRetryableError
} from 'skymarshal-core';

try {
  await api.call();
} catch (error) {
  if (error instanceof SkymarshalAuthenticationError) {
    // Redirect to login
    await redirectToLogin();
  } else if (isRetryableError(error)) {
    // Retry with exponential backoff
    await retryWithBackoff(() => api.call());
  } else {
    // Fatal error - show message to user
    showError(error.message);
  }
}
```

### Rate Limit Handling

```ts
import { RateLimitError } from 'skymarshal-core';

try {
  await makeApiCall();
} catch (error) {
  if (error instanceof RateLimitError) {
    // Wait for the specified time before retrying
    await delay(error.retryAfter * 1000);
    await makeApiCall();
  }
}
```

### Network Error with Retry

```ts
import { SkymarshalNetworkError, isRetryableError } from 'skymarshal-core';

async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (!isRetryableError(error) || attempt === maxRetries - 1) {
        throw error;
      }
      // Exponential backoff
      await delay(Math.pow(2, attempt) * 1000);
    }
  }
}
```

### Validation Error

```ts
import { SkymarshalValidationError } from 'skymarshal-core';

function createPost(text: string) {
  if (!text || text.length === 0) {
    throw new SkymarshalValidationError('Post text cannot be empty');
  }
  if (text.length > 300) {
    throw new SkymarshalValidationError('Post text exceeds 300 characters');
  }
  // Create post...
}
```

### Error Chaining

```ts
import { SkymarshalNetworkError } from 'skymarshal-core';

try {
  await nativeApiCall();
} catch (error) {
  // Wrap the native error for better context
  throw new SkymarshalNetworkError(
    'Failed to fetch user profile',
    error instanceof Error ? error : undefined
  );
}
```

## Helper Functions

### `isRetryableError(error: unknown): boolean`

Checks if an error is safe to retry.

```ts
import { isRetryableError } from 'skymarshal-core';

try {
  await operation();
} catch (error) {
  if (isRetryableError(error)) {
    console.log('Retrying...');
    await operation();
  } else {
    console.error('Fatal error:', error);
  }
}
```

## Migration from Old Errors

The library previously had simple error classes in individual managers:
- `AuthenticationError` in `managers/auth.ts`
- `ValidationError` and `NetworkError` in `managers/deletion.ts`

These are now **deprecated** in favor of the centralized error hierarchy.

### Migration Guide

**Old code:**
```ts
import { AuthenticationError } from 'skymarshal-core';
// Uses simple Error with no retry logic or status codes
```

**New code:**
```ts
import { SkymarshalAuthenticationError } from 'skymarshal-core';
// Uses enhanced error with code, statusCode, retryable, and cause
```

### Backward Compatibility

The old error classes are still exported for backward compatibility but are deprecated:
- `AuthenticationError` → Use `SkymarshalAuthenticationError`
- `NetworkError` → Use `SkymarshalNetworkError`
- `ValidationError` → Use `SkymarshalValidationError`

## Best Practices

### 1. Always Chain Errors

When catching and re-throwing, preserve the original error:

```ts
try {
  await lowLevelOperation();
} catch (error) {
  throw new SkymarshalNetworkError(
    'High-level operation failed',
    error instanceof Error ? error : undefined
  );
}
```

### 2. Use Specific Error Types

Don't use the base `SkymarshalError` when a specific type exists:

```ts
// ❌ Bad
throw new SkymarshalError('Invalid handle', 'VALIDATION_ERROR');

// ✅ Good
throw new SkymarshalValidationError('Invalid handle');
```

### 3. Check Retryability

Always check if an error is retryable before implementing retry logic:

```ts
catch (error) {
  if (isRetryableError(error)) {
    // Safe to retry
  } else {
    // Don't retry - will fail again
  }
}
```

### 4. Respect Rate Limits

For `RateLimitError`, always respect the `retryAfter` value:

```ts
catch (error) {
  if (error instanceof RateLimitError) {
    await delay(error.retryAfter * 1000);
    // Now retry
  }
}
```

## Error Code Reference

| Code | Error Class | Meaning |
|------|-------------|---------|
| `AUTH_ERROR` | SkymarshalAuthenticationError | Authentication failed |
| `NETWORK_ERROR` | SkymarshalNetworkError | Network connectivity issue |
| `VALIDATION_ERROR` | SkymarshalValidationError | Input validation failed |
| `RATE_LIMIT` | RateLimitError | API rate limit exceeded |
| `NOT_FOUND` | NotFoundError | Resource not found |
| `PERMISSION_DENIED` | PermissionError | Insufficient permissions |
| `TIMEOUT` | TimeoutError | Operation timed out |
| `SERVER_ERROR` | ServerError | Server-side error |

## HTTP Status Code Mapping

| Status Code | Error Class | Description |
|-------------|-------------|-------------|
| 400 | SkymarshalValidationError | Bad Request |
| 401 | SkymarshalAuthenticationError | Unauthorized |
| 403 | PermissionError | Forbidden |
| 404 | NotFoundError | Not Found |
| 408 | TimeoutError | Request Timeout |
| 429 | RateLimitError | Too Many Requests |
| 500 | ServerError | Internal Server Error |
| 503 | SkymarshalNetworkError | Service Unavailable |

## TypeScript Type Guards

All error classes work with TypeScript's `instanceof` checks:

```ts
function handleError(error: unknown) {
  if (error instanceof SkymarshalAuthenticationError) {
    // TypeScript knows error.code === 'AUTH_ERROR'
    // TypeScript knows error.statusCode === 401
    // TypeScript knows error.retryable === false
  } else if (error instanceof RateLimitError) {
    // TypeScript knows error.retryAfter exists
  }
}
```

## Testing

```ts
import { SkymarshalValidationError, isRetryableError } from 'skymarshal-core';

describe('Error handling', () => {
  it('should identify validation errors as non-retryable', () => {
    const error = new SkymarshalValidationError('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.retryable).toBe(false);
    expect(isRetryableError(error)).toBe(false);
  });

  it('should preserve error chain', () => {
    const cause = new Error('Original error');
    const error = new SkymarshalNetworkError('Wrapped error', cause);
    expect(error.cause).toBe(cause);
  });
});
```

## Related Documentation

- [API Reference](./API.md)
- [Manager Documentation](./MANAGERS.md)
- [Retry Strategies](./RETRY_STRATEGIES.md)
