# skymarshal-core v2.3.0 Implementation Plan

**Target**: Production-ready release with rate limiting, enhanced analytics, and relationship management
**Estimated Effort**: 46-60 hours
**Priority**: Critical path to production

---

## Phase 1: Production Infrastructure (14 hours)

### 1.1 Rate Limiting Module
**File**: `src/utils/rateLimiter.ts`
**Priority**: CRITICAL

```typescript
export interface RateLimitConfig {
  maxRequests: number;      // requests per window
  windowMs: number;         // window duration in ms
  retryAfterMs?: number;    // default retry delay
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(config: RateLimitConfig);
  async acquire(): Promise<void>;
  tryAcquire(): boolean;
  getRemainingTokens(): number;
}

// Presets for AT Protocol endpoints
export const RATE_LIMITS = {
  search: { maxRequests: 30, windowMs: 60000 },
  write: { maxRequests: 100, windowMs: 300000 },
  read: { maxRequests: 300, windowMs: 60000 },
} as const;
```

### 1.2 Retry Logic with Exponential Backoff
**File**: `src/utils/retry.ts`

```typescript
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T>;

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [429, 500, 502, 503, 504],
};
```

### 1.3 Complete Error Hierarchy
**File**: `src/errors/index.ts`

```typescript
// Base error
export class SkymarshalError extends Error {
  code: string;
  statusCode?: number;
  retryable: boolean;
}

// Specific errors
export class AuthenticationError extends SkymarshalError {}
export class NetworkError extends SkymarshalError {}
export class ValidationError extends SkymarshalError {}
export class RateLimitError extends SkymarshalError {}
export class NotFoundError extends SkymarshalError {}
export class PermissionError extends SkymarshalError {}
export class TimeoutError extends SkymarshalError {}
export class ServerError extends SkymarshalError {}
```

---

## Phase 2: Relationship Management (20 hours)

### 2.1 RelationshipManager
**File**: `src/managers/relationship.ts`
**Source**: Port from bluevibes/src/app.py

```typescript
export class RelationshipManager {
  constructor(private agent: BskyAgent);

  // Non-followers
  async getNonFollowers(did: string): Promise<Profile[]>;
  async getNonFollowersCount(did: string): Promise<number>;

  // Low-ratio accounts
  async getLowRatioFollowing(
    did: string,
    maxRatio?: number
  ): Promise<Profile[]>;

  // Mutual analysis
  async getMutuals(did: string): Promise<Profile[]>;
  async getMutualsCount(did: string): Promise<number>;

  // Bulk operations
  async bulkUnfollow(
    dids: string[],
    options?: BulkUnfollowOptions
  ): Promise<BulkOperationResult>;

  async bulkUnfollowByRule(
    did: string,
    rules: UnfollowRule[]
  ): Promise<BulkOperationResult>;
}

export interface UnfollowRule {
  type: 'bot' | 'lowRatio' | 'inactive' | 'noProfile' | 'noEngagement';
  threshold?: number;
  daysInactive?: number;
}

export interface BulkOperationResult {
  processed: number;
  successful: number;
  failed: number;
  errors: { did: string; error: string }[];
}
```

### 2.2 Follower Ranking
**File**: `src/utils/analytics/followerRanking.ts`
**Source**: Port from bluevibes

```typescript
export interface InfluenceMetrics {
  followersCount: number;
  followsCount: number;
  postsCount: number;
  ratio: number;
  engagementRate: number;
  influenceScore: number;
  tier: 'mega' | 'macro' | 'micro' | 'nano';
}

export function calculateInfluenceScore(profile: Profile): number;
export function getInfluenceTier(followersCount: number): InfluenceMetrics['tier'];
export function rankByInfluence(profiles: Profile[]): Profile[];
export function groupByTier(profiles: Profile[]): Record<string, Profile[]>;
```

---

## Phase 3: Enhanced Bot Detection (8 hours)

### 3.1 Extended Bot Signals
**File**: `src/utils/analytics/botDetection.ts`
**Source**: Port from bluevibes/src/app.py lines 1427-1475

```typescript
export interface BotSignals {
  // Existing
  highFollowing: boolean;
  lowRatio: boolean;
  noAvatar: boolean;

  // NEW signals to add
  massFollowing: boolean;          // Following > 1000 with low followers
  veryLowRatio: boolean;           // ratio < 0.02 with high following
  noPostsMassFollow: boolean;      // 0 posts but following 100+
  roundFollowingCount: boolean;    // Exactly 1000, 2000, 5000, 10000
  noProfileInfo: boolean;          // Missing displayName AND bio
  newAccountMassFollow: boolean;   // < 30 days old with many follows
  suspiciousUrls: boolean;         // Bad link patterns in bio
  defaultHandle: boolean;          // handle matches did pattern
}

export interface BotAnalysis {
  signals: BotSignals;
  signalCount: number;
  botScore: number;           // 0-10
  confidence: number;         // 0-1
  category: 'bot_likely' | 'low_quality' | 'legitimate';
  reasons: string[];
}

export function analyzeBotSignals(profile: Profile): BotAnalysis;
export function getBotCategory(score: number): BotAnalysis['category'];
export function batchAnalyzeBots(profiles: Profile[]): BotAnalysis[];
```

---

## Phase 4: Real-time Foundation (24 hours)

### 4.1 JetstreamService
**File**: `src/services/JetstreamService.ts`
**Source**: Port from html/bluesky/firehose

```typescript
export interface JetstreamOptions {
  endpoint?: string;  // default: wss://jetstream2.us-east.bsky.network
  collections?: string[];
  wantedDids?: string[];
  reconnectOnError?: boolean;
  maxReconnectAttempts?: number;
}

export type JetstreamEvent =
  | { type: 'post'; post: Post; author: Profile }
  | { type: 'like'; subject: string; author: string }
  | { type: 'repost'; subject: string; author: string }
  | { type: 'follow'; subject: string; author: string }
  | { type: 'error'; error: Error };

export class JetstreamService extends EventEmitter {
  constructor(options?: JetstreamOptions);

  async connect(): Promise<void>;
  async disconnect(): Promise<void>;

  on(event: 'post', handler: (data: Post) => void): this;
  on(event: 'like', handler: (data: LikeEvent) => void): this;
  on(event: 'repost', handler: (data: RepostEvent) => void): this;
  on(event: 'follow', handler: (data: FollowEvent) => void): this;
  on(event: 'error', handler: (error: Error) => void): this;

  // Filtered streams
  streamFromDid(did: string): AsyncIterableIterator<JetstreamEvent>;
  streamWithHashtag(tag: string): AsyncIterableIterator<JetstreamEvent>;
  streamMentions(handle: string): AsyncIterableIterator<JetstreamEvent>;
}
```

---

## Implementation Order

### Week 1 (Parallel Execution)

| Task | Agent | Files | Est. Hours |
|------|-------|-------|------------|
| Rate limiting | @geepers_typescript | utils/rateLimiter.ts | 4 |
| Retry logic | @geepers_typescript | utils/retry.ts | 4 |
| Error hierarchy | @geepers_typescript | errors/index.ts | 3 |
| Bot detection | @geepers_typescript | utils/analytics/botDetection.ts | 4 |
| Follower ranking | @geepers_typescript | utils/analytics/followerRanking.ts | 4 |

### Week 2 (Sequential - Dependencies)

| Task | Agent | Files | Est. Hours |
|------|-------|-------|------------|
| RelationshipManager | @geepers_typescript | managers/relationship.ts | 8 |
| JetstreamService | @geepers_typescript | services/JetstreamService.ts | 12 |
| Tests | @geepers_testing | tests/*.test.ts | 8 |
| Documentation | @geepers_docs | README.md, API docs | 4 |

---

## File Structure After Implementation

```
src/
├── errors/
│   └── index.ts              # NEW - Complete error hierarchy
├── managers/
│   ├── relationship.ts       # NEW - RelationshipManager
│   └── index.ts              # Update exports
├── services/
│   ├── JetstreamService.ts   # NEW - Real-time streaming
│   └── index.ts              # Update exports
├── utils/
│   ├── rateLimiter.ts        # NEW - Token bucket rate limiter
│   ├── retry.ts              # NEW - Exponential backoff
│   └── analytics/
│       ├── botDetection.ts   # ENHANCE - 8 new signals
│       ├── followerRanking.ts # NEW - Influence scoring
│       └── index.ts          # Update exports
└── index.ts                  # Update main exports
```

---

## Success Criteria

- [ ] All new modules have >80% test coverage
- [ ] Rate limiter handles burst traffic gracefully
- [ ] Retry logic respects 429 headers
- [ ] Bot detection identifies >90% of obvious bots
- [ ] RelationshipManager handles 10k+ followers efficiently
- [ ] JetstreamService reconnects automatically
- [ ] Build passes with no TypeScript errors
- [ ] Package size increase < 50KB

---

## Version Bump

```json
{
  "version": "2.3.0",
  "description": "Production-ready release with rate limiting, relationship management, and real-time streaming"
}
```
