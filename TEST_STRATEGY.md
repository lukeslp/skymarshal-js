# Test Strategy: Skymarshal-Core New Modules

**Project:** skymarshal-core (Bluesky/AT Protocol npm package)
**Purpose:** Test plan for new thread, analytics, graph, engagement, and deletion modules
**Framework:** Vitest (recommended for TypeScript projects)
**Date:** 2026-01-22

---

## Overview

This document outlines the testing strategy for five new modules being added to skymarshal-core:

1. **utils/threads.ts** - Thread caching and fetching utilities
2. **utils/analytics.ts** - Engagement and bot detection analytics (PARTIAL - already exists)
3. **utils/graph.ts** - Network graph analysis (centrality, PageRank, communities)
4. **managers/engagement.ts** - Engagement tracking manager
5. **managers/deletion.ts** - Deletion workflow manager

---

## 1. Module: utils/threads.ts

### Purpose
Thread fetching, caching, and flattening utilities for Bluesky post threads.

### Components to Test

#### PostCache
- **Purpose:** TTL-based cache for post threads
- **Key Features:**
  - Age-based TTL (recent posts cache shorter)
  - Max size eviction (LRU-like behavior)
  - Expiration cleanup

#### fetchThread
- **Purpose:** Fetch a complete thread from AT Protocol API
- **Key Features:**
  - Recursive thread fetching
  - Error handling for deleted/missing posts
  - Pagination handling

#### flattenThread
- **Purpose:** Convert nested thread structure to flat array
- **Key Features:**
  - Depth-first traversal
  - Reply ordering
  - Depth tracking

---

### Test Cases: PostCache

#### Unit Tests (15 cases)

**Basic Operations**
1. **set/get happy path**
   - Set value with key, retrieve successfully
   - Assert value matches input

2. **get returns undefined for missing key**
   - Request non-existent key
   - Assert returns undefined

3. **has returns false for missing key**
   - Check non-existent key
   - Assert returns false

4. **has returns true for existing key**
   - Set value, check key
   - Assert returns true

5. **delete removes entry**
   - Set value, delete, get
   - Assert get returns undefined

6. **clear removes all entries**
   - Set multiple values, clear, check size
   - Assert size === 0

**TTL Behavior**
7. **age-based TTL: recent posts (< 1 hour old)**
   - Set post with createdAt = 30 minutes ago
   - Assert TTL === ttlConfig.recent (1 minute default)

8. **age-based TTL: medium posts (1-24 hours old)**
   - Set post with createdAt = 12 hours ago
   - Assert TTL === ttlConfig.medium (6 hours default)

9. **age-based TTL: old posts (> 24 hours old)**
   - Set post with createdAt = 48 hours ago
   - Assert TTL === ttlConfig.old (24 hours default)

10. **get returns undefined for expired entry**
    - Set entry with createdAt for recent post
    - Mock Date.now() to advance time past expiration
    - Assert get returns undefined

11. **has returns false for expired entry**
    - Set entry, advance time past expiration
    - Assert has returns false

12. **expired entries auto-deleted on get**
    - Set entry, advance time
    - Call get(), check size decreased
    - Assert entry removed from cache

**Capacity Management**
13. **eviction when at max size**
    - Fill cache to maxSize
    - Add one more entry
    - Assert oldest entry evicted
    - Assert size === maxSize

14. **cleanup removes all expired entries**
    - Set 10 entries with different ages
    - Advance time to expire 5 entries
    - Call cleanup()
    - Assert returns 5, size === 5

**Edge Cases**
15. **default TTL when no createdAt provided**
    - Set value without createdAt
    - Assert uses ttlConfig.medium

16. **custom TTL config**
    - Create cache with custom TTL values
    - Verify custom values used for each age category

---

### Test Cases: fetchThread

#### Unit Tests (12 cases)

**Successful Fetches**
1. **fetch simple thread (no replies)**
   - Mock API to return single post with no replies
   - Assert returns ThreadViewPost with empty replies array

2. **fetch thread with direct replies**
   - Mock API to return post with 3 direct replies
   - Assert returns correct structure with 3 replies

3. **fetch deeply nested thread**
   - Mock API to return 5-level deep thread
   - Assert all levels fetched and structured correctly

4. **fetch thread with multiple branches**
   - Mock API to return post with 3 top-level replies, each with sub-replies
   - Assert all branches captured

**Error Handling**
5. **handle deleted post gracefully**
   - Mock API to throw "NotFound" error
   - Assert function returns null or partial thread

6. **handle blocked author**
   - Mock API to throw blocked error
   - Assert appropriate error handling

7. **handle rate limit**
   - Mock API to throw rate limit error
   - Assert retry logic or appropriate error

8. **handle network timeout**
   - Mock API to timeout
   - Assert timeout error caught and handled

**Caching Integration**
9. **use cached thread when available**
   - Pre-populate PostCache with thread
   - Call fetchThread
   - Assert API not called, cache hit

10. **cache miss triggers API call**
    - Empty cache
    - Call fetchThread
    - Assert API called and result cached

11. **respect cache TTL**
    - Cache thread, advance time past TTL
    - Call fetchThread
    - Assert API called again (cache expired)

**Edge Cases**
12. **handle empty thread (post exists but no content)**
    - Mock API to return post with null text
    - Assert handles gracefully

13. **handle very large thread (> 1000 posts)**
    - Mock API to return paginated large thread
    - Assert pagination handled correctly

---

### Test Cases: flattenThread

#### Unit Tests (8 cases)

**Basic Flattening**
1. **flatten single post (no replies)**
   - Input: ThreadViewPost with no replies
   - Assert output: [post] with depth 0

2. **flatten thread with linear replies**
   - Input: Post → Reply1 → Reply2 → Reply3
   - Assert output: [post, reply1, reply2, reply3] with depths [0,1,2,3]

3. **flatten thread with branching replies**
   - Input: Post with 3 top-level replies
   - Assert output: [post, reply1, reply2, reply3] in correct order

**Depth Tracking**
4. **track depth correctly for nested replies**
   - Input: 5-level deep thread
   - Assert each post has correct depth value (0-4)

5. **preserve parent-child relationships**
   - Input: Complex thread
   - Assert each reply has correct parent reference

**Ordering**
6. **maintain chronological order within level**
   - Input: Post with 3 replies at different times
   - Assert replies ordered by timestamp

7. **depth-first traversal order**
   - Input: Tree with multiple branches
   - Assert DFS order: root, first branch (all depths), second branch (all depths)

**Edge Cases**
8. **handle circular references (malformed data)**
   - Input: Thread with circular parent-child reference
   - Assert detects and breaks cycle, doesn't infinite loop

9. **handle missing parent references**
   - Input: Reply with parent.uri pointing to non-existent post
   - Assert handles gracefully

---

### Mock Requirements: utils/threads.ts

#### External Dependencies
- **@atproto/api AgentClient**
  - `agent.getPostThread()` method
  - Return type: `ThreadViewPost`
  - Mock different response scenarios (success, errors, pagination)

#### Time Mocking
- **Date.now()** for TTL testing
  - Use `vi.useFakeTimers()` in Vitest
  - Advance time with `vi.advanceTimersByTime(ms)`

#### Sample Mock Data
```typescript
const mockThreadSimple = {
  thread: {
    $type: 'app.bsky.feed.defs#threadViewPost',
    post: {
      uri: 'at://did:plc:user/app.bsky.feed.post/abc123',
      cid: 'bafyrei...',
      author: { did: 'did:plc:user', handle: 'user.bsky.social' },
      record: { text: 'Hello world', createdAt: '2026-01-22T10:00:00Z' },
      indexedAt: '2026-01-22T10:00:01Z',
      likeCount: 5,
      repostCount: 2,
      replyCount: 0,
    },
    replies: [],
  },
};

const mockThreadWithReplies = {
  thread: {
    ...mockThreadSimple.thread,
    post: {
      ...mockThreadSimple.thread.post,
      replyCount: 2,
    },
    replies: [
      {
        $type: 'app.bsky.feed.defs#threadViewPost',
        post: { /* reply 1 */ },
        replies: [],
      },
      {
        $type: 'app.bsky.feed.defs#threadViewPost',
        post: { /* reply 2 */ },
        replies: [],
      },
    ],
  },
};
```

---

## 2. Module: utils/analytics.ts

### Purpose
Engagement scoring, popularity metrics, and bot detection.

**Note:** AnalyticsManager already exists (reviewed in managers/analytics.ts), but this section covers additional utilities for score calculation and data transformations.

---

### Test Cases: Engagement Scoring (8 cases)

**calculateEngagementScore**
1. **calculate score with all metrics**
   - Input: likes=10, reposts=5, replies=4
   - Expected: 10 + (2×5) + (2.5×4) = 30

2. **calculate score with zero metrics**
   - Input: likes=0, reposts=0, replies=0
   - Expected: 0

3. **calculate score with only likes**
   - Input: likes=100, reposts=0, replies=0
   - Expected: 100

4. **verify weights correct (reposts worth 2x likes)**
   - Input: likes=10, reposts=10, replies=0
   - Expected: 10 + 20 = 30

5. **verify weights correct (replies worth 2.5x likes)**
   - Input: likes=10, reposts=0, replies=10
   - Expected: 10 + 25 = 35

**getEngagementPreset**
6. **dead preset (< 10% of average)**
   - Input: score=5, average=100
   - Expected: 'dead'

7. **bombers preset (10-50% of average)**
   - Input: score=30, average=100
   - Expected: 'bombers'

8. **mid preset (50-100% of average)**
   - Input: score=75, average=100
   - Expected: 'mid'

9. **bangers preset (100-500% of average)**
   - Input: score=300, average=100
   - Expected: 'bangers'

10. **viral preset (> 500% of average)**
    - Input: score=600, average=100
    - Expected: 'viral'

11. **edge case: zero average, zero score**
    - Input: score=0, average=0
    - Expected: 'dead'

12. **edge case: zero average, non-zero score**
    - Input: score=10, average=0
    - Expected: 'bangers' (any engagement is good)

---

### Test Cases: Bot Detection (10 cases)

**Pattern Detection**
1. **extreme following ratio (20x+ more following than followers)**
   - Input: followers=10, following=500, posts=0
   - Expected: botScore >= 0.8, signal 'extreme_following_ratio'

2. **high following ratio (10x+ more following)**
   - Input: followers=20, following=300, posts=0
   - Expected: botScore >= 0.6, signal 'high_following_ratio'

3. **moderate following ratio (5x+ more following)**
   - Input: followers=50, following=300, posts=0
   - Expected: botScore >= 0.4, signal 'moderate_following_ratio'

4. **extreme follower ratio (engagement farmer pattern)**
   - Input: followers=10000, following=50, posts=0
   - Expected: botScore >= 0.7, signal 'extreme_follower_ratio'

5. **mass following (> 5000 following)**
   - Input: followers=100, following=6000, posts=0
   - Expected: botScore >= 0.4, signal 'mass_following'

6. **no engagement pattern (no posts but following many)**
   - Input: followers=50, following=500, posts=0
   - Expected: botScore >= 0.5, signal 'no_engagement'

**Recommendation Generation**
7. **highly suspicious recommendation (score >= 0.7)**
   - Input: botScore=0.8
   - Expected: recommendation='highly_suspicious'

8. **suspicious recommendation (0.4 <= score < 0.7)**
   - Input: botScore=0.5
   - Expected: recommendation='suspicious'

9. **potentially suspicious (0.3 <= score < 0.4)**
   - Input: botScore=0.35
   - Expected: recommendation='potentially_suspicious'

10. **likely human (score < 0.3)**
    - Input: botScore=0.1
    - Expected: recommendation='likely_human'

**Batch Analysis**
11. **getStatistics calculates percentages correctly**
    - Input: 100 profiles, 20 highly_suspicious, 30 suspicious
    - Expected: botPercentage=50%, correct counts

12. **getStatistics signal distribution**
    - Input: Mix of accounts with different signals
    - Expected: Correct count for each signal type

---

### Mock Requirements: utils/analytics.ts

No external API mocks needed - pure calculation functions. However:

- **Profile data structure mock**
```typescript
const mockProfile = {
  did: 'did:plc:test123',
  handle: 'testuser.bsky.social',
  followersCount: 100,
  followsCount: 150,
  postsCount: 50,
};
```

---

## 3. Module: utils/graph.ts

### Purpose
Network graph analysis: centrality metrics, PageRank, community detection.

**Note:** This is a NEW module to be created.

---

### Test Cases: Centrality Metrics (12 cases)

**Degree Centrality**
1. **calculate degree centrality for simple graph**
   - Input: 5 nodes, node A connected to all others
   - Expected: A has centrality = 1.0, others = 0.25

2. **calculate for disconnected node**
   - Input: Node with no edges
   - Expected: centrality = 0.0

3. **directed vs undirected graphs**
   - Input: Same graph, once directed, once undirected
   - Expected: Different centrality values

**Betweenness Centrality**
4. **calculate betweenness for bridge node**
   - Input: Two clusters connected by single node
   - Expected: Bridge node has high betweenness

5. **calculate betweenness for peripheral node**
   - Input: Node at edge of graph
   - Expected: Low betweenness (not on many shortest paths)

6. **handle disconnected components**
   - Input: Graph with 2 separate components
   - Expected: Cross-component betweenness = 0

**Closeness Centrality**
7. **calculate closeness for central node**
   - Input: Star graph (hub and spokes)
   - Expected: Hub has closeness = 1.0

8. **calculate closeness for peripheral node**
   - Input: Node far from center
   - Expected: Lower closeness value

9. **handle unreachable nodes**
   - Input: Disconnected graph
   - Expected: Infinite distance handled (closeness = 0 or undefined)

**Eigenvector Centrality**
10. **calculate eigenvector centrality**
    - Input: Node connected to high-centrality nodes
    - Expected: High eigenvector centrality (quality over quantity)

11. **compare with degree centrality**
    - Input: Node with many low-centrality connections
    - Expected: High degree, low eigenvector centrality

**Edge Cases**
12. **empty graph**
    - Input: No nodes or edges
    - Expected: Empty results or appropriate error

13. **single node graph**
    - Input: 1 node, 0 edges
    - Expected: centrality = 0 or 1 (depending on definition)

---

### Test Cases: PageRank (8 cases)

**Basic Algorithm**
1. **calculate PageRank for simple graph**
   - Input: 4 nodes in square with directed edges
   - Expected: Equal rank distribution

2. **calculate with damping factor**
   - Input: Graph with cycles, damping=0.85
   - Expected: Converges to stable ranks

3. **verify rank sum equals 1.0**
   - Input: Any graph
   - Expected: Sum of all ranks ≈ 1.0

4. **high-authority node receives higher rank**
   - Input: Many nodes pointing to one node
   - Expected: That node has highest PageRank

**Convergence**
5. **algorithm converges within max iterations**
   - Input: Complex graph, maxIter=100
   - Expected: Converges in < 100 iterations

6. **early stopping on convergence**
   - Input: Simple graph with tolerance=0.001
   - Expected: Stops before maxIter when delta < tolerance

**Edge Cases**
7. **handle dangling nodes (no outgoing edges)**
   - Input: Node with incoming but no outgoing edges
   - Expected: Rank distributed to other nodes

8. **handle self-loops**
   - Input: Node with edge to itself
   - Expected: Handled correctly in calculation

---

### Test Cases: Community Detection (10 cases)

**Louvain Algorithm (or similar)**
1. **detect two clear communities**
   - Input: Graph with 2 densely connected clusters, 1 bridge edge
   - Expected: 2 communities identified

2. **detect three communities**
   - Input: Triangle of clusters
   - Expected: 3 communities

3. **handle single community (fully connected)**
   - Input: Complete graph (all nodes connected)
   - Expected: 1 community

4. **calculate modularity score**
   - Input: Graph with known community structure
   - Expected: High modularity (> 0.3)

5. **hierarchical community structure**
   - Input: Nested communities
   - Expected: Detects at appropriate resolution

**Label Propagation**
6. **label propagation converges**
   - Input: Graph with communities
   - Expected: Algorithm converges to stable labels

7. **handle tie-breaking in label selection**
   - Input: Node with equal neighbors from 2 communities
   - Expected: Consistent tie-breaking rule applied

**Edge Cases**
8. **disconnected components are separate communities**
   - Input: Graph with 3 disconnected components
   - Expected: At least 3 communities

9. **single node in own community**
   - Input: Isolated node
   - Expected: Forms own community or assigned to nearest

10. **very small communities**
    - Input: Graph where some nodes barely connect
    - Expected: Option to merge small communities (threshold)

---

### Mock Requirements: utils/graph.ts

#### Graph Data Structure
```typescript
interface Graph {
  nodes: string[]; // Node IDs
  edges: { source: string; target: string; weight?: number }[];
  directed?: boolean;
}

const mockGraphSimple: Graph = {
  nodes: ['A', 'B', 'C', 'D'],
  edges: [
    { source: 'A', target: 'B' },
    { source: 'B', target: 'C' },
    { source: 'C', target: 'D' },
    { source: 'D', target: 'A' },
  ],
  directed: false,
};

const mockGraphCommunities: Graph = {
  nodes: ['A', 'B', 'C', 'D', 'E', 'F'],
  edges: [
    // Community 1: A, B, C (densely connected)
    { source: 'A', target: 'B' },
    { source: 'B', target: 'C' },
    { source: 'C', target: 'A' },
    // Community 2: D, E, F (densely connected)
    { source: 'D', target: 'E' },
    { source: 'E', target: 'F' },
    { source: 'F', target: 'D' },
    // Bridge
    { source: 'C', target: 'D' },
  ],
  directed: false,
};
```

#### External Libraries (Optional)
- If using graphology or similar library, mock its methods
- Or implement from scratch and test mathematical correctness

---

## 4. Module: managers/engagement.ts

### Purpose
High-level engagement tracking and management across user's posts and interactions.

**Note:** This is a NEW module to be created. It orchestrates utils/analytics.ts functions.

---

### Test Cases: EngagementManager (15 cases)

**Initialization**
1. **initialize with default config**
   - Assert manager created with default TTL, cache size

2. **initialize with custom config**
   - Input: Custom TTL values, cache size
   - Assert config applied correctly

**Tracking Engagement**
3. **track post engagement over time**
   - Input: Post URI, fetch engagement at T0, T1, T2
   - Assert engagement metrics change tracked

4. **cache engagement data**
   - Input: Fetch engagement twice within TTL
   - Assert second fetch uses cache (API not called)

5. **invalidate cache after TTL**
   - Input: Fetch engagement, wait past TTL, fetch again
   - Assert API called second time

**Batch Operations**
6. **fetch engagement for multiple posts**
   - Input: Array of 20 post URIs
   - Assert all engagements fetched in batch

7. **batch operations respect rate limits**
   - Input: 100 post URIs
   - Assert batching with delays to avoid rate limit

**Analysis**
8. **get top performing posts**
   - Input: User's posts (various engagement levels)
   - Assert top 10 returned sorted by score

9. **get dead threads**
   - Input: User's posts (some with 0 engagement)
   - Assert all zero-engagement posts identified

10. **categorize by preset**
    - Input: User's posts
    - Assert posts grouped into dead/bombers/mid/bangers/viral

**Statistics**
11. **calculate user engagement stats**
    - Input: User's 100 posts
    - Expected: avg score, median, percentiles, trend

12. **compare to network average**
    - Input: User stats + network stats
    - Expected: percentile rank, above/below average flag

**Notifications/Alerts**
13. **detect viral post**
    - Input: Post with > 5x average engagement
    - Expected: Alert/notification triggered

14. **detect engagement drop**
    - Input: Recent posts consistently below average
    - Expected: Alert for engagement drop

**Edge Cases**
15. **handle deleted posts gracefully**
    - Input: URI for deleted post
    - Expected: Returns null or default values, no crash

16. **handle private/blocked accounts**
    - Input: Post from blocked user
    - Expected: Appropriate error handling

---

### Mock Requirements: managers/engagement.ts

#### External Dependencies
- **@atproto/api AgentClient**
  - `agent.getPostThread()` - to fetch engagement counts
  - `agent.app.bsky.feed.getPosts()` - batch fetch

- **utils/analytics.ts**
  - Mock or import actual functions (unit vs integration choice)

- **utils/threads.ts (PostCache)**
  - May use PostCache internally for caching

#### Sample Mock Data
```typescript
const mockEngagementData = {
  uri: 'at://did:plc:user/app.bsky.feed.post/abc123',
  likeCount: 45,
  repostCount: 12,
  replyCount: 8,
  score: 45 + (2*12) + (2.5*8) = 89,
  preset: 'bangers',
  percentile: 85,
};
```

---

## 5. Module: managers/deletion.ts

### Purpose
Manage post deletion workflows: identify candidates, preview impact, batch delete.

**Note:** This is a NEW module to be created.

---

### Test Cases: DeletionManager (18 cases)

**Initialization**
1. **initialize with default config**
   - Assert manager created with safety defaults

2. **initialize with custom rules**
   - Input: Custom deletion rules (age, engagement threshold)
   - Assert rules applied

**Candidate Identification**
3. **find posts older than threshold**
   - Input: User posts, age threshold = 1 year
   - Assert returns only posts > 1 year old

4. **find posts below engagement threshold**
   - Input: User posts, engagement threshold = 10
   - Assert returns only posts with score < 10

5. **combine multiple criteria (AND logic)**
   - Input: Posts must be old AND low engagement
   - Assert correct subset identified

6. **combine multiple criteria (OR logic)**
   - Input: Posts are old OR low engagement
   - Assert broader set identified

**Exclusion Rules**
7. **exclude posts with replies**
   - Input: Include rule to exclude if replyCount > 0
   - Assert posts with replies not included

8. **exclude pinned posts**
   - Input: User has pinned posts
   - Assert pinned posts never marked for deletion

9. **exclude posts in threads you replied to**
   - Input: Original post + your replies
   - Assert only replies deletable, not original

**Preview & Safety**
10. **preview deletion impact**
    - Input: List of candidate posts
    - Expected: Summary (count, oldest, newest, engagement loss)

11. **require confirmation for large deletions**
    - Input: 100+ posts to delete
    - Expected: Confirmation step required

12. **dry-run mode**
    - Input: Run deletion in dry-run mode
    - Expected: Returns what WOULD be deleted, no actual deletions

**Deletion Execution**
13. **delete single post**
    - Mock API: deletePost() call
    - Assert API called with correct URI
    - Assert post removed from local cache/state

14. **batch delete posts**
    - Input: 50 posts to delete
    - Assert batched with rate limiting
    - Assert all deleted successfully

15. **handle partial failures**
    - Input: 20 posts, 5 fail to delete (permissions, already deleted)
    - Expected: Report successes and failures separately
    - Assert retries on transient errors

**Rollback/Undo (if supported by API)**
16. **undo recent deletion (if possible)**
    - Note: AT Protocol may not support undelete
    - If supported: test undo within time window
    - If not: Document limitation

**Audit & Logging**
17. **log all deletions**
    - Input: Delete posts
    - Expected: Audit log with timestamps, URIs, reasons

18. **export deletion report**
    - Input: After batch deletion
    - Expected: CSV/JSON report of what was deleted

**Edge Cases**
19. **attempt to delete already-deleted post**
    - Mock API: 404 error
    - Expected: Handle gracefully, mark as already deleted

20. **attempt to delete post without permission**
    - Mock API: 403 error
    - Expected: Skip, log error, continue with others

---

### Mock Requirements: managers/deletion.ts

#### External Dependencies
- **@atproto/api AgentClient**
  - `agent.deletePost(uri)` method
  - `agent.app.bsky.feed.getPosts()` for fetching post details

- **EngagementManager**
  - May use to fetch engagement data for criteria

- **User confirmation prompts (if interactive)**
  - Mock or skip in tests (use auto-confirm flag)

#### Sample Mock Data
```typescript
const mockDeletionCandidate = {
  uri: 'at://did:plc:user/app.bsky.feed.post/old123',
  createdAt: '2023-01-15T10:00:00Z', // Old post
  likeCount: 2,
  repostCount: 0,
  replyCount: 0,
  score: 2,
  reason: 'low_engagement',
  ageInDays: 730,
};

const mockDeletionResult = {
  success: true,
  uri: 'at://did:plc:user/app.bsky.feed.post/old123',
  deletedAt: '2026-01-22T12:00:00Z',
};
```

---

## Cross-Module Integration Tests (8 cases)

**Scenario: Complete Engagement Workflow**
1. **fetch thread → analyze engagement → make deletion decision**
   - fetchThread() → EngagementManager.analyze() → DeletionManager.identify()
   - Assert data flows correctly between modules

2. **cache thread → fetch engagement → cache engagement**
   - PostCache stores thread, EngagementCache stores metrics
   - Assert no redundant API calls

**Scenario: Network Analysis + Bot Detection**
3. **build follower graph → calculate centrality → detect bot clusters**
   - NetworkManager → GraphUtils.centrality() → AnalyticsManager.detectBots()
   - Assert bots clustered together have low centrality

**Scenario: Batch Deletion with Engagement Analysis**
4. **analyze all posts → categorize → delete dead threads**
   - EngagementManager.categorize() → DeletionManager.delete(deadPosts)
   - Assert only dead threads deleted, others preserved

**Error Propagation**
5. **API error in fetchThread propagates correctly**
   - Thread fetch fails → EngagementManager handles gracefully
   - Assert error logged, doesn't crash manager

**Cache Consistency**
6. **deletion invalidates caches**
   - Delete post → assert PostCache and EngagementCache invalidated

7. **engagement update invalidates thread cache**
   - Post gets new engagement → assert caches updated consistently

**Performance**
8. **batch operations across modules**
   - Fetch 100 threads + analyze engagement + check for deletions
   - Assert completes in reasonable time with batching

---

## Testing Infrastructure

### Framework Setup

**Vitest Configuration** (`vitest.config.ts`)
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    },
    setupFiles: ['./tests/setup.ts'],
  },
});
```

### Test File Organization

```
tests/
├── setup.ts                    # Global test setup
├── mocks/
│   ├── agent.mock.ts          # Mock AT Protocol agent
│   ├── fixtures.ts            # Sample data
│   └── timers.ts              # Time manipulation
├── utils/
│   ├── threads.test.ts        # 35 tests
│   ├── analytics.test.ts      # 22 tests
│   └── graph.test.ts          # 30 tests
├── managers/
│   ├── engagement.test.ts     # 16 tests
│   └── deletion.test.ts       # 20 tests
└── integration/
    └── workflows.test.ts      # 8 tests
```

### Coverage Targets

| Module | Unit Tests | Integration Tests | Target Coverage |
|--------|------------|-------------------|-----------------|
| utils/threads.ts | 35 | 2 | 90%+ |
| utils/analytics.ts | 22 | 1 | 95%+ (pure logic) |
| utils/graph.ts | 30 | 1 | 85%+ |
| managers/engagement.ts | 16 | 3 | 85%+ |
| managers/deletion.ts | 20 | 1 | 85%+ |

**Total:** ~123 unit tests + 8 integration tests = 131 tests

---

## Type Safety Checks

### TypeScript Strict Mode
Ensure `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Type Tests (Not Executable, Compile-Time Only)

```typescript
// Type test examples (these should compile without errors)
import { expectType, expectError } from 'tsd';
import type { PostCache, EngagementAnalysis } from './types';

// PostCache generic type
const cache = new PostCache<ThreadViewPost>();
expectType<ThreadViewPost | undefined>(cache.get('key'));

// EngagementAnalysis has all required fields
const analysis: EngagementAnalysis = {
  uri: 'at://...',
  score: 100,
  preset: 'bangers',
  percentile: 80,
  isAboveAverage: true,
  relativeScore: 1.5,
};

// Should error on invalid preset
expectError<EngagementAnalysis>({
  ...analysis,
  preset: 'invalid_preset', // Should fail
});
```

---

## Performance Benchmarks

### Cache Performance
- **Test:** 10,000 set/get operations
- **Target:** < 50ms for all operations
- **Memory:** < 50MB for 10,000 entries

### Graph Algorithms
- **PageRank:** 1,000 nodes, 5,000 edges
  - **Target:** < 500ms convergence

- **Community Detection:** 1,000 nodes
  - **Target:** < 1s for detection

### Batch Operations
- **Engagement fetch:** 100 posts
  - **Target:** < 5s with rate limiting

- **Batch deletion:** 50 posts
  - **Target:** < 10s with rate limiting

---

## Mock Data Generators

Create helper functions for generating test data:

```typescript
// tests/mocks/generators.ts

export function generateMockPost(overrides?: Partial<PostView>): PostView {
  return {
    uri: `at://did:plc:test/app.bsky.feed.post/${Math.random().toString(36)}`,
    cid: `bafyrei${Math.random().toString(36)}`,
    author: generateMockProfile(),
    record: {
      text: 'Mock post content',
      createdAt: new Date().toISOString(),
    },
    indexedAt: new Date().toISOString(),
    likeCount: Math.floor(Math.random() * 100),
    repostCount: Math.floor(Math.random() * 20),
    replyCount: Math.floor(Math.random() * 10),
    ...overrides,
  };
}

export function generateMockProfile(overrides?: Partial<Profile>): Profile {
  return {
    did: `did:plc:test${Math.random().toString(36).substring(7)}`,
    handle: `user${Math.random().toString(36).substring(7)}.bsky.social`,
    followersCount: Math.floor(Math.random() * 1000),
    followsCount: Math.floor(Math.random() * 1000),
    postsCount: Math.floor(Math.random() * 500),
    ...overrides,
  };
}

export function generateMockThread(depth: number, repliesPerLevel: number): ThreadViewPost {
  // Recursive generation of thread structure
  // ...
}

export function generateMockGraph(nodeCount: number, edgeDensity: number): Graph {
  // Generate random graph with specified properties
  // ...
}
```

---

## Continuous Integration

### GitHub Actions Workflow (example)

```yaml
# .github/workflows/test.yml
name: Test

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
      - run: npm run check      # TypeScript type checking
      - run: npm run test       # Vitest tests
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Test Implementation Priority

### Phase 1: Core Utilities (Week 1)
1. **PostCache** - 16 tests (2-3 hours)
2. **calculateEngagementScore + getEngagementPreset** - 12 tests (2 hours)
3. **AnalyticsManager.analyzeAccount** - 12 tests (3 hours)

### Phase 2: Thread Operations (Week 2)
4. **fetchThread** - 13 tests (4 hours + API mocking setup)
5. **flattenThread** - 9 tests (2 hours)

### Phase 3: Graph Analysis (Week 3)
6. **Centrality metrics** - 13 tests (4 hours)
7. **PageRank** - 8 tests (3 hours)
8. **Community detection** - 10 tests (4 hours)

### Phase 4: Managers (Week 4)
9. **EngagementManager** - 16 tests (5 hours)
10. **DeletionManager** - 20 tests (6 hours)

### Phase 5: Integration (Week 5)
11. **Integration tests** - 8 tests (4 hours)
12. **Performance benchmarks** - 4 tests (3 hours)

**Estimated Total:** 131 tests, ~40-45 hours of implementation

---

## Open Questions & Decisions Needed

1. **Graph library choice:**
   - Implement from scratch vs. use graphology?
   - Trade-off: bundle size vs. development time

2. **Community detection algorithm:**
   - Louvain, Label Propagation, or both?
   - Consensus: Louvain is standard, Label Propagation is faster

3. **Deletion undo support:**
   - Does AT Protocol support post restoration?
   - If not: Document as limitation

4. **Cache persistence:**
   - In-memory only or persist to IndexedDB?
   - For EngagementCache: Consider persistence for offline

5. **Rate limiting strategy:**
   - Manager-level or centralized rate limiter?
   - Recommendation: Centralized in AgentClient wrapper

6. **Error handling philosophy:**
   - Throw vs. return error objects?
   - Recommendation: Return Result<T, E> types for predictable errors

7. **Real-time updates:**
   - Should caches subscribe to websocket updates?
   - Future enhancement: Real-time invalidation

---

## Test Maintenance Guidelines

1. **Keep mocks synchronized with @atproto/api**
   - Pin @atproto/api version
   - Update mocks when upgrading

2. **Regenerate fixtures periodically**
   - Use real API calls to generate fixture data
   - Script: `npm run fixtures:generate`

3. **Monitor flaky tests**
   - Time-based tests can be flaky
   - Use deterministic time mocking

4. **Coverage drift**
   - Set up coverage ratcheting (coverage can't decrease)
   - Alert on coverage drops in CI

---

## Next Steps

1. **Review this test plan** with team
2. **Create test file stubs** with describe blocks
3. **Set up mock infrastructure** (agent, fixtures, timers)
4. **Implement Phase 1 tests** (PostCache, basic analytics)
5. **Implement modules alongside tests** (TDD approach)
6. **Run coverage reports** and fill gaps
7. **Document test patterns** for future contributors

---

## References

- **Vitest docs:** https://vitest.dev/
- **@atproto/api:** https://github.com/bluesky-social/atproto
- **Graph algorithms:** Introduction to Algorithms (CLRS)
- **Testing best practices:** Kent C. Dodds - Testing JavaScript
- **Type testing:** https://github.com/SamVerschueren/tsd

---

**End of Test Strategy Document**

**Document version:** 1.0
**Author:** Testing Agent (geepers)
**Project:** skymarshal-core npm package
**Next review:** After Phase 1 completion
