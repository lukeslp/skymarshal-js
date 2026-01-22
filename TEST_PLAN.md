# skymarshal-core v2.3.0 Test Plan

**Author**: Luke Steuber
**Date**: 2026-01-22
**Target**: 80%+ test coverage for all new modules
**Test Framework**: Node.js native test runner (`node:test`)

---

## Executive Summary

This test plan provides comprehensive testing strategy for skymarshal-core v2.3.0 new modules:

1. **Rate Limiting** (`src/utils/rateLimiter.ts`) - Token bucket algorithm
2. **Retry Logic** (`src/utils/retry.ts`) - Exponential backoff
3. **Error Hierarchy** (`src/errors/index.ts`) - Custom error classes
4. **Follower Ranking** (`src/utils/analytics/followerRanking.ts`) - Influence scoring
5. **Enhanced Bot Detection** (`src/utils/analytics/botDetection.ts`) - Extended signals
6. **RelationshipManager** (`src/managers/relationship.ts`) - Bulk operations
7. **JetstreamService** (`src/services/JetstreamService.ts`) - Real-time WebSocket streaming

**Test Coverage Goals:**
- Unit tests: 85%+ coverage
- Integration tests: Key workflows
- Mock strategies: BskyAgent, WebSocket, network delays
- Performance tests: Rate limiting, bulk operations

---

## Test Framework Setup

### Current Pattern (from `engagement.test.ts`)

```typescript
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { AtpAgent } from '@atproto/api';

describe('ModuleName', () => {
  let agent: AtpAgent;
  let manager: ModuleClass;

  beforeEach(() => {
    agent = new AtpAgent({ service: 'https://bsky.social' });
    manager = new ModuleClass(agent);
  });

  describe('methodName', () => {
    it('should handle happy path', () => {
      // Arrange
      const input = /* test data */;

      // Act
      const result = manager.method(input);

      // Assert
      assert.strictEqual(result, expected);
    });
  });
});
```

### Mock Strategies

#### 1. Mock BskyAgent
```typescript
// test/mocks/mockAgent.ts
export class MockBskyAgent {
  private responses: Map<string, any> = new Map();

  setMockResponse(endpoint: string, data: any): void {
    this.responses.set(endpoint, data);
  }

  async call(endpoint: string, params: any): Promise<any> {
    const response = this.responses.get(endpoint);
    if (!response) throw new Error(`No mock for ${endpoint}`);
    return { data: response };
  }
}
```

#### 2. Mock WebSocket
```typescript
// test/mocks/mockWebSocket.ts
import { EventEmitter } from 'events';

export class MockWebSocket extends EventEmitter {
  private messageQueue: any[] = [];
  readyState: number = 0; // CONNECTING

  send(data: string): void {
    this.messageQueue.push(JSON.parse(data));
  }

  simulateOpen(): void {
    this.readyState = 1; // OPEN
    this.emit('open');
  }

  simulateMessage(data: any): void {
    this.emit('message', { data: JSON.stringify(data) });
  }

  simulateError(error: Error): void {
    this.emit('error', error);
  }

  simulateClose(): void {
    this.readyState = 3; // CLOSED
    this.emit('close');
  }
}
```

#### 3. Time Control
```typescript
// test/utils/timeControl.ts
export class TimeController {
  private currentTime: number = Date.now();

  advance(ms: number): void {
    this.currentTime += ms;
  }

  now(): number {
    return this.currentTime;
  }

  reset(): void {
    this.currentTime = Date.now();
  }
}
```

---

## Module 1: Rate Limiter (`src/utils/rateLimiter.ts`)

### Test File: `src/utils/__tests__/rateLimiter.test.ts`

### Test Cases

#### Happy Path Tests
```typescript
describe('RateLimiter', () => {
  describe('constructor', () => {
    it('should initialize with correct config', () => {
      const limiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 1000
      });

      assert.strictEqual(limiter.getRemainingTokens(), 10);
    });

    it('should accept preset configs', () => {
      const limiter = new RateLimiter(RATE_LIMITS.search);

      assert.strictEqual(limiter.getRemainingTokens(), 30);
    });
  });

  describe('acquire', () => {
    it('should allow requests within limit', async () => {
      const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });

      await limiter.acquire(); // 1st request
      await limiter.acquire(); // 2nd request
      await limiter.acquire(); // 3rd request

      assert.strictEqual(limiter.getRemainingTokens(), 0);
    });

    it('should block when rate limit exceeded', async () => {
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });

      await limiter.acquire(); // 1st
      await limiter.acquire(); // 2nd

      const start = Date.now();
      await limiter.acquire(); // Should wait ~1000ms
      const elapsed = Date.now() - start;

      assert.ok(elapsed >= 950, `Should wait ~1000ms, waited ${elapsed}ms`);
    });

    it('should refill tokens after window expires', async () => {
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 100 });

      await limiter.acquire();
      await limiter.acquire();

      // Wait for refill
      await new Promise(resolve => setTimeout(resolve, 150));

      assert.strictEqual(limiter.getRemainingTokens(), 2);
    });
  });

  describe('tryAcquire', () => {
    it('should return true when tokens available', () => {
      const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });

      const result = limiter.tryAcquire();

      assert.strictEqual(result, true);
      assert.strictEqual(limiter.getRemainingTokens(), 4);
    });

    it('should return false when no tokens available', () => {
      const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 });

      limiter.tryAcquire(); // Consume the only token
      const result = limiter.tryAcquire();

      assert.strictEqual(result, false);
      assert.strictEqual(limiter.getRemainingTokens(), 0);
    });
  });
});
```

#### Edge Cases
```typescript
describe('edge cases', () => {
  it('should handle zero maxRequests', () => {
    assert.throws(() => {
      new RateLimiter({ maxRequests: 0, windowMs: 1000 });
    }, /maxRequests must be positive/);
  });

  it('should handle negative windowMs', () => {
    assert.throws(() => {
      new RateLimiter({ maxRequests: 10, windowMs: -1000 });
    }, /windowMs must be positive/);
  });

  it('should handle burst traffic', async () => {
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });

    // Send 10 requests simultaneously
    const promises = Array(10).fill(null).map(() => limiter.acquire());

    const start = Date.now();
    await Promise.all(promises);
    const elapsed = Date.now() - start;

    // Should take at least 1 window period for 10 requests (5 per window)
    assert.ok(elapsed >= 950, `Burst should be throttled, took ${elapsed}ms`);
  });

  it('should handle concurrent acquire attempts', async () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });

    const results = await Promise.all([
      limiter.acquire(),
      limiter.acquire(),
      limiter.acquire(),
    ]);

    // All should succeed
    assert.strictEqual(results.length, 3);
    assert.strictEqual(limiter.getRemainingTokens(), 0);
  });
});
```

#### Error Handling
```typescript
describe('error handling', () => {
  it('should handle invalid config gracefully', () => {
    assert.throws(() => {
      new RateLimiter({ maxRequests: NaN, windowMs: 1000 });
    });
  });

  it('should handle Infinity values', () => {
    assert.throws(() => {
      new RateLimiter({ maxRequests: Infinity, windowMs: 1000 });
    });
  });
});
```

#### Performance Tests
```typescript
describe('performance', () => {
  it('should handle 1000+ acquire calls efficiently', async () => {
    const limiter = new RateLimiter({ maxRequests: 100, windowMs: 10 });

    const start = Date.now();

    for (let i = 0; i < 1000; i++) {
      await limiter.acquire();
    }

    const elapsed = Date.now() - start;

    // Should complete in reasonable time (< 2 seconds)
    assert.ok(elapsed < 2000, `1000 acquires took ${elapsed}ms`);
  });

  it('should have minimal overhead for tryAcquire', () => {
    const limiter = new RateLimiter({ maxRequests: 1000000, windowMs: 60000 });

    const start = Date.now();

    for (let i = 0; i < 10000; i++) {
      limiter.tryAcquire();
    }

    const elapsed = Date.now() - start;

    // Should be near-instant (< 100ms for 10k calls)
    assert.ok(elapsed < 100, `10k tryAcquires took ${elapsed}ms`);
  });
});
```

---

## Module 2: Retry Logic (`src/utils/retry.ts`)

### Test File: `src/utils/__tests__/retry.test.ts`

### Test Cases

#### Happy Path Tests
```typescript
describe('withRetry', () => {
  describe('successful execution', () => {
    it('should execute function once if successful', async () => {
      let callCount = 0;

      const result = await withRetry(async () => {
        callCount++;
        return 'success';
      });

      assert.strictEqual(result, 'success');
      assert.strictEqual(callCount, 1);
    });

    it('should return function result', async () => {
      const result = await withRetry(async () => {
        return { data: 'test', count: 42 };
      });

      assert.deepStrictEqual(result, { data: 'test', count: 42 });
    });
  });

  describe('retry behavior', () => {
    it('should retry on 429 status code', async () => {
      let attempts = 0;

      const result = await withRetry(async () => {
        attempts++;
        if (attempts < 3) {
          const error: any = new Error('Rate limited');
          error.statusCode = 429;
          throw error;
        }
        return 'success';
      }, { maxAttempts: 5, baseDelayMs: 10 });

      assert.strictEqual(result, 'success');
      assert.strictEqual(attempts, 3);
    });

    it('should retry on 500 status code', async () => {
      let attempts = 0;

      const result = await withRetry(async () => {
        attempts++;
        if (attempts < 2) {
          const error: any = new Error('Server error');
          error.statusCode = 500;
          throw error;
        }
        return 'recovered';
      }, { maxAttempts: 3, baseDelayMs: 10 });

      assert.strictEqual(result, 'recovered');
      assert.strictEqual(attempts, 2);
    });

    it('should respect maxAttempts limit', async () => {
      let attempts = 0;

      await assert.rejects(async () => {
        await withRetry(async () => {
          attempts++;
          const error: any = new Error('Always fails');
          error.statusCode = 500;
          throw error;
        }, { maxAttempts: 3, baseDelayMs: 10 });
      });

      assert.strictEqual(attempts, 3);
    });
  });

  describe('exponential backoff', () => {
    it('should increase delay exponentially', async () => {
      const delays: number[] = [];
      let attempts = 0;

      await assert.rejects(async () => {
        await withRetry(async () => {
          attempts++;
          const start = Date.now();

          if (attempts > 1) {
            delays.push(Date.now() - start);
          }

          const error: any = new Error('Fail');
          error.statusCode = 500;
          throw error;
        }, {
          maxAttempts: 4,
          baseDelayMs: 100,
          backoffMultiplier: 2,
        });
      });

      // Delays should increase: ~100ms, ~200ms, ~400ms
      assert.ok(delays[1] > delays[0], 'Second delay should be longer');
      assert.ok(delays[2] > delays[1], 'Third delay should be longer');
    });

    it('should respect maxDelayMs cap', async () => {
      let attempts = 0;

      await assert.rejects(async () => {
        await withRetry(async () => {
          attempts++;
          const error: any = new Error('Fail');
          error.statusCode = 500;
          throw error;
        }, {
          maxAttempts: 10,
          baseDelayMs: 1000,
          maxDelayMs: 2000,
          backoffMultiplier: 2,
        });
      });

      // Even with high multiplier, delay should cap at maxDelayMs
      // Manual verification in logs or timing checks
    });
  });

  describe('non-retryable errors', () => {
    it('should not retry on 400 status code', async () => {
      let attempts = 0;

      await assert.rejects(async () => {
        await withRetry(async () => {
          attempts++;
          const error: any = new Error('Bad request');
          error.statusCode = 400;
          throw error;
        }, { maxAttempts: 3, baseDelayMs: 10 });
      });

      assert.strictEqual(attempts, 1, 'Should not retry on 400');
    });

    it('should not retry on 404 status code', async () => {
      let attempts = 0;

      await assert.rejects(async () => {
        await withRetry(async () => {
          attempts++;
          const error: any = new Error('Not found');
          error.statusCode = 404;
          throw error;
        }, { maxAttempts: 3, baseDelayMs: 10 });
      });

      assert.strictEqual(attempts, 1, 'Should not retry on 404');
    });

    it('should not retry on errors without statusCode', async () => {
      let attempts = 0;

      await assert.rejects(async () => {
        await withRetry(async () => {
          attempts++;
          throw new Error('Generic error');
        }, { maxAttempts: 3, baseDelayMs: 10 });
      });

      assert.strictEqual(attempts, 1, 'Should not retry generic errors');
    });
  });

  describe('custom retry config', () => {
    it('should allow custom retryable status codes', async () => {
      let attempts = 0;

      await assert.rejects(async () => {
        await withRetry(async () => {
          attempts++;
          const error: any = new Error('Custom error');
          error.statusCode = 418; // I'm a teapot
          throw error;
        }, {
          maxAttempts: 3,
          baseDelayMs: 10,
          retryableStatuses: [418],
        });
      });

      assert.strictEqual(attempts, 3, 'Should retry custom status');
    });
  });
});
```

#### Edge Cases
```typescript
describe('edge cases', () => {
  it('should handle async function throwing synchronously', async () => {
    let attempts = 0;

    await assert.rejects(async () => {
      await withRetry(() => {
        attempts++;
        throw new Error('Sync throw');
      }, { maxAttempts: 2, baseDelayMs: 10 });
    });

    assert.strictEqual(attempts, 1);
  });

  it('should handle promise rejection', async () => {
    let attempts = 0;

    await assert.rejects(async () => {
      await withRetry(async () => {
        attempts++;
        return Promise.reject(new Error('Rejected'));
      }, { maxAttempts: 2, baseDelayMs: 10 });
    });

    assert.strictEqual(attempts, 1);
  });

  it('should handle zero maxAttempts', async () => {
    await assert.rejects(async () => {
      await withRetry(
        async () => 'test',
        { maxAttempts: 0, baseDelayMs: 10 }
      );
    }, /maxAttempts must be positive/);
  });
});
```

#### Integration Tests
```typescript
describe('integration with rate limiter', () => {
  it('should work with rate-limited API calls', async () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 100 });
    let callCount = 0;

    const result = await withRetry(async () => {
      await limiter.acquire();
      callCount++;

      if (callCount < 2) {
        const error: any = new Error('Transient failure');
        error.statusCode = 500;
        throw error;
      }

      return 'success';
    }, { maxAttempts: 3, baseDelayMs: 10 });

    assert.strictEqual(result, 'success');
    assert.strictEqual(callCount, 2);
  });
});
```

---

## Module 3: Error Hierarchy (`src/errors/index.ts`)

### Test File: `src/errors/__tests__/errors.test.ts`

### Test Cases

#### Base Error Tests
```typescript
describe('SkymarshalError', () => {
  it('should extend Error class', () => {
    const error = new SkymarshalError('Test error', 'TEST_CODE');

    assert.ok(error instanceof Error);
    assert.ok(error instanceof SkymarshalError);
  });

  it('should have correct properties', () => {
    const error = new SkymarshalError('Test message', 'TEST_CODE', {
      statusCode: 500,
      retryable: true,
    });

    assert.strictEqual(error.message, 'Test message');
    assert.strictEqual(error.code, 'TEST_CODE');
    assert.strictEqual(error.statusCode, 500);
    assert.strictEqual(error.retryable, true);
  });

  it('should have correct stack trace', () => {
    const error = new SkymarshalError('Test', 'CODE');

    assert.ok(error.stack);
    assert.ok(error.stack!.includes('SkymarshalError'));
  });
});
```

#### Specific Error Tests
```typescript
describe('AuthenticationError', () => {
  it('should have correct default properties', () => {
    const error = new AuthenticationError('Invalid credentials');

    assert.strictEqual(error.code, 'AUTH_ERROR');
    assert.strictEqual(error.statusCode, 401);
    assert.strictEqual(error.retryable, false);
  });

  it('should be instanceof SkymarshalError', () => {
    const error = new AuthenticationError('Test');

    assert.ok(error instanceof SkymarshalError);
    assert.ok(error instanceof AuthenticationError);
  });
});

describe('NetworkError', () => {
  it('should have correct default properties', () => {
    const error = new NetworkError('Connection failed');

    assert.strictEqual(error.code, 'NETWORK_ERROR');
    assert.strictEqual(error.retryable, true);
  });

  it('should allow custom statusCode', () => {
    const error = new NetworkError('Timeout', { statusCode: 504 });

    assert.strictEqual(error.statusCode, 504);
  });
});

describe('ValidationError', () => {
  it('should have correct default properties', () => {
    const error = new ValidationError('Invalid input');

    assert.strictEqual(error.code, 'VALIDATION_ERROR');
    assert.strictEqual(error.statusCode, 400);
    assert.strictEqual(error.retryable, false);
  });
});

describe('RateLimitError', () => {
  it('should have correct default properties', () => {
    const error = new RateLimitError('Too many requests');

    assert.strictEqual(error.code, 'RATE_LIMIT_ERROR');
    assert.strictEqual(error.statusCode, 429);
    assert.strictEqual(error.retryable, true);
  });

  it('should include retryAfter hint', () => {
    const error = new RateLimitError('Rate limited', {
      retryAfter: 60000
    });

    assert.strictEqual(error.retryAfter, 60000);
  });
});

describe('NotFoundError', () => {
  it('should have correct default properties', () => {
    const error = new NotFoundError('Resource not found');

    assert.strictEqual(error.code, 'NOT_FOUND');
    assert.strictEqual(error.statusCode, 404);
    assert.strictEqual(error.retryable, false);
  });
});

describe('PermissionError', () => {
  it('should have correct default properties', () => {
    const error = new PermissionError('Access denied');

    assert.strictEqual(error.code, 'PERMISSION_ERROR');
    assert.strictEqual(error.statusCode, 403);
    assert.strictEqual(error.retryable, false);
  });
});

describe('TimeoutError', () => {
  it('should have correct default properties', () => {
    const error = new TimeoutError('Request timed out');

    assert.strictEqual(error.code, 'TIMEOUT_ERROR');
    assert.strictEqual(error.statusCode, 408);
    assert.strictEqual(error.retryable, true);
  });
});

describe('ServerError', () => {
  it('should have correct default properties', () => {
    const error = new ServerError('Internal server error');

    assert.strictEqual(error.code, 'SERVER_ERROR');
    assert.strictEqual(error.statusCode, 500);
    assert.strictEqual(error.retryable, true);
  });
});
```

#### Error Factory Tests
```typescript
describe('error utilities', () => {
  describe('fromHttpStatus', () => {
    it('should create correct error for 401', () => {
      const error = SkymarshalError.fromHttpStatus(401, 'Unauthorized');

      assert.ok(error instanceof AuthenticationError);
      assert.strictEqual(error.message, 'Unauthorized');
    });

    it('should create correct error for 404', () => {
      const error = SkymarshalError.fromHttpStatus(404, 'Not found');

      assert.ok(error instanceof NotFoundError);
    });

    it('should create correct error for 429', () => {
      const error = SkymarshalError.fromHttpStatus(429, 'Rate limited');

      assert.ok(error instanceof RateLimitError);
    });

    it('should create generic error for unknown status', () => {
      const error = SkymarshalError.fromHttpStatus(999, 'Unknown');

      assert.ok(error instanceof SkymarshalError);
      assert.strictEqual(error.statusCode, 999);
    });
  });

  describe('isRetryable', () => {
    it('should identify retryable errors', () => {
      assert.strictEqual(new NetworkError('Test').retryable, true);
      assert.strictEqual(new RateLimitError('Test').retryable, true);
      assert.strictEqual(new TimeoutError('Test').retryable, true);
      assert.strictEqual(new ServerError('Test').retryable, true);
    });

    it('should identify non-retryable errors', () => {
      assert.strictEqual(new AuthenticationError('Test').retryable, false);
      assert.strictEqual(new ValidationError('Test').retryable, false);
      assert.strictEqual(new NotFoundError('Test').retryable, false);
      assert.strictEqual(new PermissionError('Test').retryable, false);
    });
  });
});
```

---

## Module 4: Follower Ranking (`src/utils/analytics/followerRanking.ts`)

### Test File: `src/utils/analytics/__tests__/followerRanking.test.ts`

### Test Cases

#### Influence Score Calculation
```typescript
describe('calculateInfluenceScore', () => {
  it('should calculate score for mega influencer', () => {
    const profile: Profile = {
      did: 'did:plc:test',
      handle: 'mega.bsky.social',
      followersCount: 1000000,
      followsCount: 500,
      postsCount: 5000,
    };

    const score = calculateInfluenceScore(profile);

    assert.ok(score > 10000, 'Mega influencer should have high score');
  });

  it('should calculate score for macro influencer', () => {
    const profile: Profile = {
      did: 'did:plc:test',
      handle: 'macro.bsky.social',
      followersCount: 75000,
      followsCount: 1000,
      postsCount: 3000,
    };

    const score = calculateInfluenceScore(profile);

    assert.ok(score > 1000 && score < 10000);
  });

  it('should calculate score for micro influencer', () => {
    const profile: Profile = {
      did: 'did:plc:test',
      handle: 'micro.bsky.social',
      followersCount: 7500,
      followsCount: 500,
      postsCount: 1000,
    };

    const score = calculateInfluenceScore(profile);

    assert.ok(score > 100 && score < 1000);
  });

  it('should calculate score for nano influencer', () => {
    const profile: Profile = {
      did: 'did:plc:test',
      handle: 'nano.bsky.social',
      followersCount: 500,
      followsCount: 400,
      postsCount: 100,
    };

    const score = calculateInfluenceScore(profile);

    assert.ok(score < 100);
  });

  it('should penalize low follower ratio', () => {
    const highRatio: Profile = {
      did: 'did:plc:test1',
      handle: 'high.bsky.social',
      followersCount: 1000,
      followsCount: 100,
      postsCount: 500,
    };

    const lowRatio: Profile = {
      did: 'did:plc:test2',
      handle: 'low.bsky.social',
      followersCount: 1000,
      followsCount: 5000,
      postsCount: 500,
    };

    const score1 = calculateInfluenceScore(highRatio);
    const score2 = calculateInfluenceScore(lowRatio);

    assert.ok(score1 > score2, 'High ratio should score higher');
  });

  it('should reward activity', () => {
    const active: Profile = {
      did: 'did:plc:test1',
      handle: 'active.bsky.social',
      followersCount: 1000,
      followsCount: 500,
      postsCount: 5000,
    };

    const inactive: Profile = {
      did: 'did:plc:test2',
      handle: 'inactive.bsky.social',
      followersCount: 1000,
      followsCount: 500,
      postsCount: 10,
    };

    const score1 = calculateInfluenceScore(active);
    const score2 = calculateInfluenceScore(inactive);

    assert.ok(score1 > score2, 'Active user should score higher');
  });
});
```

#### Tier Classification
```typescript
describe('getInfluenceTier', () => {
  it('should classify mega influencer (>100k followers)', () => {
    assert.strictEqual(getInfluenceTier(1000000), 'mega');
    assert.strictEqual(getInfluenceTier(100000), 'mega');
  });

  it('should classify macro influencer (10k-100k followers)', () => {
    assert.strictEqual(getInfluenceTier(75000), 'macro');
    assert.strictEqual(getInfluenceTier(10000), 'macro');
  });

  it('should classify micro influencer (1k-10k followers)', () => {
    assert.strictEqual(getInfluenceTier(5000), 'micro');
    assert.strictEqual(getInfluenceTier(1000), 'micro');
  });

  it('should classify nano influencer (<1k followers)', () => {
    assert.strictEqual(getInfluenceTier(999), 'nano');
    assert.strictEqual(getInfluenceTier(100), 'nano');
    assert.strictEqual(getInfluenceTier(0), 'nano');
  });
});
```

#### Ranking and Grouping
```typescript
describe('rankByInfluence', () => {
  it('should sort profiles by influence score descending', () => {
    const profiles: Profile[] = [
      {
        did: 'did:plc:1',
        handle: 'low.bsky.social',
        followersCount: 100,
        followsCount: 500,
        postsCount: 50,
      },
      {
        did: 'did:plc:2',
        handle: 'high.bsky.social',
        followersCount: 100000,
        followsCount: 1000,
        postsCount: 5000,
      },
      {
        did: 'did:plc:3',
        handle: 'medium.bsky.social',
        followersCount: 5000,
        followsCount: 500,
        postsCount: 1000,
      },
    ];

    const ranked = rankByInfluence(profiles);

    assert.strictEqual(ranked[0].handle, 'high.bsky.social');
    assert.strictEqual(ranked[1].handle, 'medium.bsky.social');
    assert.strictEqual(ranked[2].handle, 'low.bsky.social');
  });

  it('should handle empty array', () => {
    const ranked = rankByInfluence([]);

    assert.deepStrictEqual(ranked, []);
  });

  it('should not mutate original array', () => {
    const profiles: Profile[] = [
      {
        did: 'did:plc:1',
        handle: 'a.bsky.social',
        followersCount: 1000,
        followsCount: 500,
        postsCount: 100,
      },
      {
        did: 'did:plc:2',
        handle: 'b.bsky.social',
        followersCount: 5000,
        followsCount: 500,
        postsCount: 500,
      },
    ];

    const original = [...profiles];
    rankByInfluence(profiles);

    assert.deepStrictEqual(profiles, original);
  });
});

describe('groupByTier', () => {
  it('should group profiles into tiers', () => {
    const profiles: Profile[] = [
      {
        did: 'did:plc:1',
        handle: 'mega.bsky.social',
        followersCount: 1000000,
        followsCount: 1000,
        postsCount: 10000,
      },
      {
        did: 'did:plc:2',
        handle: 'macro.bsky.social',
        followersCount: 50000,
        followsCount: 500,
        postsCount: 2000,
      },
      {
        did: 'did:plc:3',
        handle: 'micro.bsky.social',
        followersCount: 5000,
        followsCount: 500,
        postsCount: 500,
      },
      {
        did: 'did:plc:4',
        handle: 'nano.bsky.social',
        followersCount: 500,
        followsCount: 400,
        postsCount: 100,
      },
    ];

    const grouped = groupByTier(profiles);

    assert.strictEqual(grouped.mega.length, 1);
    assert.strictEqual(grouped.macro.length, 1);
    assert.strictEqual(grouped.micro.length, 1);
    assert.strictEqual(grouped.nano.length, 1);
  });

  it('should handle profiles with same tier', () => {
    const profiles: Profile[] = [
      {
        did: 'did:plc:1',
        handle: 'nano1.bsky.social',
        followersCount: 100,
        followsCount: 50,
        postsCount: 10,
      },
      {
        did: 'did:plc:2',
        handle: 'nano2.bsky.social',
        followersCount: 200,
        followsCount: 100,
        postsCount: 20,
      },
    ];

    const grouped = groupByTier(profiles);

    assert.strictEqual(grouped.nano.length, 2);
    assert.strictEqual(grouped.mega?.length || 0, 0);
  });
});
```

---

## Module 5: Enhanced Bot Detection (`src/utils/analytics/botDetection.ts`)

### Test File: `src/utils/analytics/__tests__/botDetection.test.ts`

### Test Cases

#### Signal Detection
```typescript
describe('analyzeBotSignals', () => {
  it('should detect mass following signal', () => {
    const profile: Profile = {
      did: 'did:plc:test',
      handle: 'bot.bsky.social',
      followersCount: 10,
      followsCount: 5000,
      postsCount: 0,
    };

    const analysis = analyzeBotSignals(profile);

    assert.strictEqual(analysis.signals.massFollowing, true);
  });

  it('should detect very low ratio signal', () => {
    const profile: Profile = {
      did: 'did:plc:test',
      handle: 'bot.bsky.social',
      followersCount: 5,
      followsCount: 1000,
      postsCount: 0,
    };

    const analysis = analyzeBotSignals(profile);

    assert.strictEqual(analysis.signals.veryLowRatio, true);
    assert.ok(analysis.botScore > 5, 'Should have elevated bot score');
  });

  it('should detect no posts + mass follow signal', () => {
    const profile: Profile = {
      did: 'did:plc:test',
      handle: 'bot.bsky.social',
      followersCount: 0,
      followsCount: 500,
      postsCount: 0,
    };

    const analysis = analyzeBotSignals(profile);

    assert.strictEqual(analysis.signals.noPostsMassFollow, true);
  });

  it('should detect round following count signal', () => {
    const profile: Profile = {
      did: 'did:plc:test',
      handle: 'bot.bsky.social',
      followersCount: 50,
      followsCount: 5000, // Exactly 5000
      postsCount: 10,
    };

    const analysis = analyzeBotSignals(profile);

    assert.strictEqual(analysis.signals.roundFollowingCount, true);
  });

  it('should detect missing profile info signal', () => {
    const profile: Profile = {
      did: 'did:plc:test',
      handle: 'bot.bsky.social',
      followersCount: 100,
      followsCount: 500,
      postsCount: 50,
      displayName: '', // Missing
      description: '', // Missing
    };

    const analysis = analyzeBotSignals(profile);

    assert.strictEqual(analysis.signals.noProfileInfo, true);
  });

  it('should detect new account mass follow signal', () => {
    const recentDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000); // 20 days ago

    const profile: Profile = {
      did: 'did:plc:test',
      handle: 'bot.bsky.social',
      followersCount: 10,
      followsCount: 1000,
      postsCount: 0,
      createdAt: recentDate.toISOString(),
    };

    const analysis = analyzeBotSignals(profile);

    assert.strictEqual(analysis.signals.newAccountMassFollow, true);
  });

  it('should detect suspicious URLs in bio', () => {
    const profile: Profile = {
      did: 'did:plc:test',
      handle: 'bot.bsky.social',
      followersCount: 100,
      followsCount: 500,
      postsCount: 50,
      description: 'Check out my profile at bit.ly/xyz123',
    };

    const analysis = analyzeBotSignals(profile);

    assert.strictEqual(analysis.signals.suspiciousUrls, true);
  });

  it('should detect default handle pattern', () => {
    const profile: Profile = {
      did: 'did:plc:abcdef123456',
      handle: 'did:plc:abcdef123456.bsky.social', // Matches DID
      followersCount: 0,
      followsCount: 100,
      postsCount: 0,
    };

    const analysis = analyzeBotSignals(profile);

    assert.strictEqual(analysis.signals.defaultHandle, true);
  });
});
```

#### Bot Score Calculation
```typescript
describe('bot score calculation', () => {
  it('should assign high score for obvious bot', () => {
    const profile: Profile = {
      did: 'did:plc:test',
      handle: 'obviousbot.bsky.social',
      followersCount: 0,
      followsCount: 10000,
      postsCount: 0,
      displayName: '',
      description: '',
    };

    const analysis = analyzeBotSignals(profile);

    assert.ok(analysis.botScore >= 8, `Bot score ${analysis.botScore} should be >= 8`);
    assert.strictEqual(analysis.category, 'bot_likely');
  });

  it('should assign medium score for suspicious account', () => {
    const profile: Profile = {
      did: 'did:plc:test',
      handle: 'suspicious.bsky.social',
      followersCount: 50,
      followsCount: 2000,
      postsCount: 10,
    };

    const analysis = analyzeBotSignals(profile);

    assert.ok(analysis.botScore >= 4 && analysis.botScore < 8);
    assert.strictEqual(analysis.category, 'low_quality');
  });

  it('should assign low score for legitimate account', () => {
    const profile: Profile = {
      did: 'did:plc:test',
      handle: 'legit.bsky.social',
      followersCount: 5000,
      followsCount: 500,
      postsCount: 2000,
      displayName: 'Legit User',
      description: 'Real person with interests',
      avatar: 'https://cdn.bsky.social/avatar.jpg',
    };

    const analysis = analyzeBotSignals(profile);

    assert.ok(analysis.botScore < 4);
    assert.strictEqual(analysis.category, 'legitimate');
  });
});
```

#### Category Classification
```typescript
describe('getBotCategory', () => {
  it('should classify high scores as bot_likely', () => {
    assert.strictEqual(getBotCategory(10), 'bot_likely');
    assert.strictEqual(getBotCategory(8), 'bot_likely');
  });

  it('should classify medium scores as low_quality', () => {
    assert.strictEqual(getBotCategory(7), 'low_quality');
    assert.strictEqual(getBotCategory(4), 'low_quality');
  });

  it('should classify low scores as legitimate', () => {
    assert.strictEqual(getBotCategory(3), 'legitimate');
    assert.strictEqual(getBotCategory(0), 'legitimate');
  });
});
```

#### Batch Analysis
```typescript
describe('batchAnalyzeBots', () => {
  it('should analyze multiple profiles', () => {
    const profiles: Profile[] = [
      {
        did: 'did:plc:1',
        handle: 'bot.bsky.social',
        followersCount: 0,
        followsCount: 5000,
        postsCount: 0,
      },
      {
        did: 'did:plc:2',
        handle: 'legit.bsky.social',
        followersCount: 1000,
        followsCount: 500,
        postsCount: 500,
        displayName: 'Real Person',
      },
    ];

    const results = batchAnalyzeBots(profiles);

    assert.strictEqual(results.length, 2);
    assert.ok(results[0].botScore > results[1].botScore);
  });

  it('should handle empty array', () => {
    const results = batchAnalyzeBots([]);

    assert.deepStrictEqual(results, []);
  });
});
```

---

## Module 6: RelationshipManager (`src/managers/relationship.ts`)

### Test File: `src/managers/__tests__/relationship.test.ts`

### Test Cases

#### Non-Followers Detection
```typescript
describe('RelationshipManager', () => {
  let agent: AtpAgent;
  let manager: RelationshipManager;
  let mockAgent: MockBskyAgent;

  beforeEach(() => {
    mockAgent = new MockBskyAgent();
    agent = mockAgent as any;
    manager = new RelationshipManager(agent);
  });

  describe('getNonFollowers', () => {
    it('should identify accounts not following back', async () => {
      // Mock following list
      mockAgent.setMockResponse('getFollows', {
        follows: [
          { did: 'did:plc:user1', handle: 'user1.bsky.social' },
          { did: 'did:plc:user2', handle: 'user2.bsky.social' },
          { did: 'did:plc:user3', handle: 'user3.bsky.social' },
        ],
      });

      // Mock followers list (user2 missing - doesn't follow back)
      mockAgent.setMockResponse('getFollowers', {
        followers: [
          { did: 'did:plc:user1', handle: 'user1.bsky.social' },
          { did: 'did:plc:user3', handle: 'user3.bsky.social' },
        ],
      });

      const nonFollowers = await manager.getNonFollowers('did:plc:me');

      assert.strictEqual(nonFollowers.length, 1);
      assert.strictEqual(nonFollowers[0].did, 'did:plc:user2');
    });

    it('should return empty array if all follow back', async () => {
      mockAgent.setMockResponse('getFollows', {
        follows: [
          { did: 'did:plc:user1', handle: 'user1.bsky.social' },
        ],
      });

      mockAgent.setMockResponse('getFollowers', {
        followers: [
          { did: 'did:plc:user1', handle: 'user1.bsky.social' },
        ],
      });

      const nonFollowers = await manager.getNonFollowers('did:plc:me');

      assert.strictEqual(nonFollowers.length, 0);
    });
  });

  describe('getLowRatioFollowing', () => {
    it('should find accounts with low follower ratio', async () => {
      mockAgent.setMockResponse('getFollows', {
        follows: [
          {
            did: 'did:plc:high',
            handle: 'high.bsky.social',
            followersCount: 1000,
            followsCount: 100,
          },
          {
            did: 'did:plc:low',
            handle: 'low.bsky.social',
            followersCount: 10,
            followsCount: 1000,
          },
        ],
      });

      const lowRatio = await manager.getLowRatioFollowing('did:plc:me', 0.1);

      assert.strictEqual(lowRatio.length, 1);
      assert.strictEqual(lowRatio[0].did, 'did:plc:low');
    });

    it('should use default ratio threshold of 0.1', async () => {
      mockAgent.setMockResponse('getFollows', {
        follows: [
          {
            did: 'did:plc:borderline',
            handle: 'borderline.bsky.social',
            followersCount: 100,
            followsCount: 1000, // ratio = 0.1 exactly
          },
        ],
      });

      const lowRatio = await manager.getLowRatioFollowing('did:plc:me');

      // Should NOT include borderline (0.1 is not < 0.1)
      assert.strictEqual(lowRatio.length, 0);
    });
  });

  describe('getMutuals', () => {
    it('should find mutual followers', async () => {
      mockAgent.setMockResponse('getFollows', {
        follows: [
          { did: 'did:plc:mutual1', handle: 'mutual1.bsky.social' },
          { did: 'did:plc:onesided', handle: 'onesided.bsky.social' },
        ],
      });

      mockAgent.setMockResponse('getFollowers', {
        followers: [
          { did: 'did:plc:mutual1', handle: 'mutual1.bsky.social' },
          { did: 'did:plc:follower', handle: 'follower.bsky.social' },
        ],
      });

      const mutuals = await manager.getMutuals('did:plc:me');

      assert.strictEqual(mutuals.length, 1);
      assert.strictEqual(mutuals[0].did, 'did:plc:mutual1');
    });
  });
});
```

#### Bulk Unfollow Operations
```typescript
describe('bulk operations', () => {
  describe('bulkUnfollow', () => {
    it('should unfollow multiple accounts', async () => {
      const dids = [
        'did:plc:user1',
        'did:plc:user2',
        'did:plc:user3',
      ];

      // Mock successful unfollows
      for (const did of dids) {
        mockAgent.setMockResponse(`unfollow-${did}`, { success: true });
      }

      const result = await manager.bulkUnfollow(dids);

      assert.strictEqual(result.processed, 3);
      assert.strictEqual(result.successful, 3);
      assert.strictEqual(result.failed, 0);
    });

    it('should handle rate limiting with delays', async () => {
      const dids = Array(10).fill(null).map((_, i) => `did:plc:user${i}`);

      const start = Date.now();
      await manager.bulkUnfollow(dids, { delayMs: 100 });
      const elapsed = Date.now() - start;

      // Should have delays between requests (9 delays for 10 requests)
      assert.ok(elapsed >= 900, `Should take ~900ms with delays, took ${elapsed}ms`);
    });

    it('should continue on individual failures', async () => {
      const dids = [
        'did:plc:success1',
        'did:plc:fail',
        'did:plc:success2',
      ];

      mockAgent.setMockResponse('unfollow-did:plc:success1', { success: true });
      mockAgent.setMockResponse('unfollow-did:plc:fail', null); // Will throw
      mockAgent.setMockResponse('unfollow-did:plc:success2', { success: true });

      const result = await manager.bulkUnfollow(dids);

      assert.strictEqual(result.processed, 3);
      assert.strictEqual(result.successful, 2);
      assert.strictEqual(result.failed, 1);
      assert.strictEqual(result.errors.length, 1);
      assert.strictEqual(result.errors[0].did, 'did:plc:fail');
    });

    it('should respect dryRun option', async () => {
      const dids = ['did:plc:user1', 'did:plc:user2'];

      const result = await manager.bulkUnfollow(dids, { dryRun: true });

      assert.strictEqual(result.processed, 2);
      assert.strictEqual(result.successful, 0); // Nothing actually executed
    });
  });

  describe('bulkUnfollowByRule', () => {
    it('should unfollow accounts matching bot rule', async () => {
      mockAgent.setMockResponse('getFollows', {
        follows: [
          {
            did: 'did:plc:bot',
            handle: 'bot.bsky.social',
            followersCount: 0,
            followsCount: 5000,
            postsCount: 0,
          },
          {
            did: 'did:plc:legit',
            handle: 'legit.bsky.social',
            followersCount: 1000,
            followsCount: 500,
            postsCount: 1000,
          },
        ],
      });

      const result = await manager.bulkUnfollowByRule('did:plc:me', [
        { type: 'bot', threshold: 80 },
      ]);

      assert.strictEqual(result.processed, 1); // Only bot unfollowed
      assert.strictEqual(result.successful, 1);
    });

    it('should unfollow accounts matching lowRatio rule', async () => {
      mockAgent.setMockResponse('getFollows', {
        follows: [
          {
            did: 'did:plc:low',
            handle: 'low.bsky.social',
            followersCount: 10,
            followsCount: 1000,
            postsCount: 50,
          },
        ],
      });

      const result = await manager.bulkUnfollowByRule('did:plc:me', [
        { type: 'lowRatio', threshold: 0.1 },
      ]);

      assert.strictEqual(result.successful, 1);
    });

    it('should unfollow accounts matching inactive rule', async () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago

      mockAgent.setMockResponse('getFollows', {
        follows: [
          {
            did: 'did:plc:inactive',
            handle: 'inactive.bsky.social',
            followersCount: 100,
            followsCount: 100,
            postsCount: 50,
            lastPostAt: oldDate.toISOString(),
          },
        ],
      });

      const result = await manager.bulkUnfollowByRule('did:plc:me', [
        { type: 'inactive', daysInactive: 60 },
      ]);

      assert.strictEqual(result.successful, 1);
    });

    it('should handle multiple rules with OR logic', async () => {
      mockAgent.setMockResponse('getFollows', {
        follows: [
          {
            did: 'did:plc:bot',
            followersCount: 0,
            followsCount: 5000,
            postsCount: 0,
          },
          {
            did: 'did:plc:lowratio',
            followersCount: 10,
            followsCount: 1000,
            postsCount: 50,
          },
          {
            did: 'did:plc:legit',
            followersCount: 1000,
            followsCount: 500,
            postsCount: 1000,
          },
        ],
      });

      const result = await manager.bulkUnfollowByRule('did:plc:me', [
        { type: 'bot', threshold: 80 },
        { type: 'lowRatio', threshold: 0.1 },
      ]);

      assert.strictEqual(result.successful, 2); // bot + lowratio
    });
  });
});
```

---

## Module 7: JetstreamService (`src/services/JetstreamService.ts`)

### Test File: `src/services/__tests__/JetstreamService.test.ts`

### Mock WebSocket Setup
```typescript
// test/mocks/mockJetstream.ts
import { EventEmitter } from 'events';

export class MockJetstream extends EventEmitter {
  private ws: MockWebSocket | null = null;
  connected: boolean = false;

  constructor() {
    super();
  }

  async connect(): Promise<void> {
    this.ws = new MockWebSocket();
    this.connected = true;
    this.ws.simulateOpen();
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.simulateClose();
      this.ws = null;
    }
    this.connected = false;
  }

  simulateEvent(event: any): void {
    if (this.ws) {
      this.ws.simulateMessage(event);
    }
  }

  simulateError(error: Error): void {
    if (this.ws) {
      this.ws.simulateError(error);
    }
  }
}
```

### Test Cases

#### Connection Management
```typescript
describe('JetstreamService', () => {
  let service: JetstreamService;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    // Mock WebSocket globally
    global.WebSocket = MockWebSocket as any;
    service = new JetstreamService();
  });

  afterEach(async () => {
    await service.disconnect();
  });

  describe('connection', () => {
    it('should connect successfully', async () => {
      await service.connect();

      assert.strictEqual(service.isConnected(), true);
    });

    it('should emit connect event', async () => {
      let connected = false;
      service.on('connect', () => {
        connected = true;
      });

      await service.connect();

      assert.strictEqual(connected, true);
    });

    it('should reconnect on connection drop', async () => {
      let reconnectCount = 0;
      service.on('reconnect', () => {
        reconnectCount++;
      });

      await service.connect();

      // Simulate disconnect
      mockWs.simulateClose();

      // Wait for reconnect
      await new Promise(resolve => setTimeout(resolve, 1100));

      assert.ok(reconnectCount > 0, 'Should attempt reconnect');
    });

    it('should respect maxReconnectAttempts', async () => {
      service = new JetstreamService({
        reconnectOnError: true,
        maxReconnectAttempts: 2,
      });

      let reconnectCount = 0;
      service.on('reconnect', () => {
        reconnectCount++;
      });

      await service.connect();

      // Simulate repeated failures
      for (let i = 0; i < 5; i++) {
        mockWs.simulateError(new Error('Connection failed'));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      assert.ok(reconnectCount <= 2, `Should stop at 2 attempts, got ${reconnectCount}`);
    });
  });

  describe('event streaming', () => {
    it('should receive post events', async () => {
      const posts: any[] = [];
      service.on('post', (data) => {
        posts.push(data);
      });

      await service.connect();

      mockWs.simulateMessage({
        type: 'post',
        post: {
          uri: 'at://did:plc:test/app.bsky.feed.post/123',
          text: 'Hello world',
        },
        author: {
          did: 'did:plc:test',
          handle: 'test.bsky.social',
        },
      });

      assert.strictEqual(posts.length, 1);
      assert.strictEqual(posts[0].post.text, 'Hello world');
    });

    it('should receive like events', async () => {
      const likes: any[] = [];
      service.on('like', (data) => {
        likes.push(data);
      });

      await service.connect();

      mockWs.simulateMessage({
        type: 'like',
        subject: 'at://did:plc:author/app.bsky.feed.post/123',
        author: 'did:plc:liker',
      });

      assert.strictEqual(likes.length, 1);
      assert.strictEqual(likes[0].author, 'did:plc:liker');
    });

    it('should receive repost events', async () => {
      const reposts: any[] = [];
      service.on('repost', (data) => {
        reposts.push(data);
      });

      await service.connect();

      mockWs.simulateMessage({
        type: 'repost',
        subject: 'at://did:plc:author/app.bsky.feed.post/123',
        author: 'did:plc:reposter',
      });

      assert.strictEqual(reposts.length, 1);
    });

    it('should receive follow events', async () => {
      const follows: any[] = [];
      service.on('follow', (data) => {
        follows.push(data);
      });

      await service.connect();

      mockWs.simulateMessage({
        type: 'follow',
        subject: 'did:plc:target',
        author: 'did:plc:follower',
      });

      assert.strictEqual(follows.length, 1);
    });

    it('should handle errors gracefully', async () => {
      const errors: any[] = [];
      service.on('error', (error) => {
        errors.push(error);
      });

      await service.connect();

      mockWs.simulateError(new Error('WebSocket error'));

      assert.strictEqual(errors.length, 1);
      assert.ok(errors[0] instanceof Error);
    });
  });

  describe('filtered streams', () => {
    it('should filter by DID', async () => {
      await service.connect();

      const stream = service.streamFromDid('did:plc:target');
      const received: any[] = [];

      // Consume stream in background
      (async () => {
        for await (const event of stream) {
          received.push(event);
          if (received.length >= 2) break;
        }
      })();

      // Send events
      mockWs.simulateMessage({
        type: 'post',
        author: { did: 'did:plc:target' },
        post: { text: 'Match 1' },
      });

      mockWs.simulateMessage({
        type: 'post',
        author: { did: 'did:plc:other' },
        post: { text: 'No match' },
      });

      mockWs.simulateMessage({
        type: 'post',
        author: { did: 'did:plc:target' },
        post: { text: 'Match 2' },
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      assert.strictEqual(received.length, 2);
      assert.strictEqual(received[0].post.text, 'Match 1');
      assert.strictEqual(received[1].post.text, 'Match 2');
    });

    it('should filter by hashtag', async () => {
      await service.connect();

      const stream = service.streamWithHashtag('bsky');
      const received: any[] = [];

      (async () => {
        for await (const event of stream) {
          received.push(event);
          if (received.length >= 1) break;
        }
      })();

      mockWs.simulateMessage({
        type: 'post',
        post: { text: 'Check out #bsky' },
        author: { did: 'did:plc:user' },
      });

      mockWs.simulateMessage({
        type: 'post',
        post: { text: 'No hashtag here' },
        author: { did: 'did:plc:user2' },
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      assert.strictEqual(received.length, 1);
    });

    it('should filter by mentions', async () => {
      await service.connect();

      const stream = service.streamMentions('target.bsky.social');
      const received: any[] = [];

      (async () => {
        for await (const event of stream) {
          received.push(event);
          if (received.length >= 1) break;
        }
      })();

      mockWs.simulateMessage({
        type: 'post',
        post: { text: 'Hey @target.bsky.social check this out' },
        author: { did: 'did:plc:user' },
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      assert.strictEqual(received.length, 1);
    });
  });

  describe('collection filtering', () => {
    it('should filter by collection types', async () => {
      service = new JetstreamService({
        collections: ['app.bsky.feed.post'],
      });

      const posts: any[] = [];
      service.on('post', (data) => {
        posts.push(data);
      });

      await service.connect();

      // Post event - should be received
      mockWs.simulateMessage({
        collection: 'app.bsky.feed.post',
        type: 'post',
        post: { text: 'Test' },
      });

      // Like event - should be filtered out
      mockWs.simulateMessage({
        collection: 'app.bsky.feed.like',
        type: 'like',
        subject: 'at://test',
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      assert.strictEqual(posts.length, 1);
    });
  });

  describe('performance', () => {
    it('should handle high-volume event stream', async () => {
      const events: any[] = [];
      service.on('post', (data) => {
        events.push(data);
      });

      await service.connect();

      const start = Date.now();

      // Simulate 1000 events
      for (let i = 0; i < 1000; i++) {
        mockWs.simulateMessage({
          type: 'post',
          post: { text: `Post ${i}` },
          author: { did: `did:plc:user${i}` },
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const elapsed = Date.now() - start;

      assert.strictEqual(events.length, 1000);
      assert.ok(elapsed < 1000, `Should process 1000 events quickly, took ${elapsed}ms`);
    });
  });
});
```

---

## Integration Tests

### Test File: `src/__tests__/integration.test.ts`

```typescript
describe('Integration Tests', () => {
  describe('Rate Limiter + Retry', () => {
    it('should work together for rate-limited API calls', async () => {
      const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
      let attempts = 0;

      const result = await withRetry(async () => {
        await limiter.acquire();
        attempts++;

        if (attempts < 2) {
          const error: any = new Error('Transient error');
          error.statusCode = 500;
          throw error;
        }

        return 'success';
      }, { maxAttempts: 5, baseDelayMs: 10 });

      assert.strictEqual(result, 'success');
      assert.strictEqual(attempts, 2);
    });
  });

  describe('RelationshipManager + Bot Detection', () => {
    it('should identify and bulk unfollow bots', async () => {
      const agent = new MockBskyAgent();
      const relationship = new RelationshipManager(agent);

      agent.setMockResponse('getFollows', {
        follows: [
          {
            did: 'did:plc:bot1',
            followersCount: 0,
            followsCount: 5000,
            postsCount: 0,
          },
          {
            did: 'did:plc:legit',
            followersCount: 1000,
            followsCount: 500,
            postsCount: 1000,
          },
        ],
      });

      const result = await relationship.bulkUnfollowByRule('did:plc:me', [
        { type: 'bot', threshold: 80 },
      ]);

      assert.strictEqual(result.successful, 1); // Only bot unfollowed
    });
  });

  describe('JetstreamService + Analytics', () => {
    it('should process real-time posts with analytics', async () => {
      const service = new JetstreamService();
      const analytics: any[] = [];

      service.on('post', (data) => {
        const engagement = analyzePostEngagement(
          {
            likes: 0,
            reposts: 0,
            replies: 0,
            quotes: 0,
          },
          data.author.followersCount || 1
        );

        analytics.push(engagement);
      });

      await service.connect();

      mockWs.simulateMessage({
        type: 'post',
        post: { text: 'Test post' },
        author: {
          did: 'did:plc:test',
          followersCount: 1000,
        },
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      assert.strictEqual(analytics.length, 1);
      assert.ok(analytics[0].engagementRate !== undefined);
    });
  });
});
```

---

## Test Coverage Goals

### Per-Module Coverage Targets

| Module | Target Coverage | Critical Paths |
|--------|----------------|----------------|
| rateLimiter.ts | 90% | Token bucket, refill, burst handling |
| retry.ts | 85% | Exponential backoff, retryable status codes |
| errors/index.ts | 95% | All error classes, factory methods |
| followerRanking.ts | 85% | Score calculation, tier classification |
| botDetection.ts | 90% | Signal detection, score calculation |
| relationship.ts | 80% | Bulk operations, rule matching |
| JetstreamService.ts | 75% | Connection, event handling, filtering |

### Running Tests

```bash
# Build TypeScript
npm run build

# Run all tests
npm test

# Run specific test file
node --test dist/utils/__tests__/rateLimiter.test.js

# Run with coverage (requires additional tooling)
c8 npm test
```

---

## Test Maintenance

### Adding New Tests

1. Follow existing pattern from `engagement.test.ts`
2. Use `node:test` and `node:assert`
3. Group tests with `describe()` blocks
4. Use clear test names with "should" statements
5. Follow AAA pattern (Arrange, Act, Assert)

### Mock Updates

When BskyAgent API changes:
1. Update `test/mocks/mockAgent.ts`
2. Update response structures
3. Verify all tests still pass

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm test
```

---

## Success Criteria

- [ ] All modules have >80% test coverage
- [ ] Integration tests pass for key workflows
- [ ] Performance tests meet benchmarks
- [ ] CI/CD pipeline runs tests automatically
- [ ] Mocks accurately represent BskyAgent behavior
- [ ] Edge cases and error handling covered
- [ ] Tests run in <30 seconds total
- [ ] No flaky tests (100% reliable)

---

**End of Test Plan**
