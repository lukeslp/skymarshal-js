# Error Quick Reference

Fast lookup for skymarshal-core error handling.

## Import

```ts
import {
  SkymarshalError,
  SkymarshalAuthenticationError,
  SkymarshalNetworkError,
  SkymarshalValidationError,
  RateLimitError,
  NotFoundError,
  PermissionError,
  TimeoutError,
  ServerError,
  isRetryableError,
} from 'skymarshal-core';
```

## Error Matrix

| Error | Code | Status | Retry? | Common Causes |
|-------|------|--------|--------|---------------|
| SkymarshalAuthenticationError | AUTH_ERROR | 401 | ❌ | Invalid credentials, expired session |
| SkymarshalNetworkError | NETWORK_ERROR | 503 | ✅ | DNS failure, connection timeout |
| SkymarshalValidationError | VALIDATION_ERROR | 400 | ❌ | Invalid input, malformed data |
| RateLimitError | RATE_LIMIT | 429 | ✅ | Too many requests |
| NotFoundError | NOT_FOUND | 404 | ❌ | Missing resource |
| PermissionError | PERMISSION_DENIED | 403 | ❌ | Insufficient privileges |
| TimeoutError | TIMEOUT | 408 | ✅ | Operation exceeded time limit |
| ServerError | SERVER_ERROR | 500 | ✅ | Server malfunction |

## Quick Patterns

### Standard Try-Catch

```ts
try {
  await operation();
} catch (error) {
  if (error instanceof SkymarshalAuthenticationError) {
    await reAuthenticate();
  } else if (isRetryableError(error)) {
    await retry();
  } else {
    throw error;
  }
}
```

### Rate Limit

```ts
catch (error) {
  if (error instanceof RateLimitError) {
    await delay(error.retryAfter * 1000);
  }
}
```

### Validation

```ts
if (!isValid(input)) {
  throw new SkymarshalValidationError('Invalid input');
}
```

### Network

```ts
catch (error) {
  throw new SkymarshalNetworkError('Connection failed', error);
}
```

### Not Found

```ts
if (!resource) {
  throw new NotFoundError(`Resource not found: ${id}`);
}
```

### Permission

```ts
if (!hasPermission(user)) {
  throw new PermissionError('Access denied');
}
```

### Timeout

```ts
catch (error) {
  if (error.name === 'AbortError') {
    throw new TimeoutError('Request timed out');
  }
}
```

### Server Error

```ts
if (response.status >= 500) {
  throw new ServerError('Server error', response.status);
}
```

## Retry Logic

```ts
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableError(error) || i === maxAttempts - 1) {
        throw error;
      }
      await delay(Math.pow(2, i) * 1000); // Exponential backoff
    }
  }
  throw new Error('Unreachable');
}
```

## When to Use Each Error

| Situation | Error to Throw |
|-----------|----------------|
| Bad login credentials | SkymarshalAuthenticationError |
| Session expired | SkymarshalAuthenticationError |
| Connection refused | SkymarshalNetworkError |
| DNS lookup failed | SkymarshalNetworkError |
| Invalid handle format | SkymarshalValidationError |
| Text too long | SkymarshalValidationError |
| HTTP 429 response | RateLimitError |
| Resource doesn't exist | NotFoundError |
| User can't access resource | PermissionError |
| Request took too long | TimeoutError |
| HTTP 500 response | ServerError |
| Database error | ServerError |

## Decision Tree

```
Error occurred?
│
├─ Authentication issue? → SkymarshalAuthenticationError
│
├─ Network connectivity? → SkymarshalNetworkError
│
├─ Invalid input? → SkymarshalValidationError
│
├─ Rate limited? → RateLimitError
│
├─ Resource missing? → NotFoundError
│
├─ Permission denied? → PermissionError
│
├─ Operation timeout? → TimeoutError
│
└─ Server error? → ServerError
```

## Cheat Sheet

```ts
// ❌ Don't do this
throw new Error('Authentication failed');

// ✅ Do this
throw new SkymarshalAuthenticationError('Authentication failed');

// ❌ Don't do this
catch (error) {
  await retry();
}

// ✅ Do this
catch (error) {
  if (isRetryableError(error)) {
    await retry();
  }
}

// ❌ Don't do this
throw new SkymarshalNetworkError('Failed');

// ✅ Do this
throw new SkymarshalNetworkError('Failed to connect to API', originalError);
```
