# GAP ANALYSIS: skymarshal-core v2.2.0

**Analysis Date**: 2026-01-22
**Scope**: Comparing skymarshal-core (TypeScript/NPM) with:
- blueballs (Python graph analytics + visualization)
- bluevibes (Python Flask sentiment + follower analysis)
- unified (React/TypeScript Bluesky dashboard)
- bluesky/html (Multiple visualization and CLI tools)

---

## Executive Summary

**Current skymarshal-core**: 14 Managers, 3 Services, comprehensive thread + graph utilities
**Gap Analysis**: Identified **42 missing features** across 8 categories
**Priority Score**: High-value features span visualization, advanced analytics, and real-time processing
**Est. Implementation Effort**: 200-400 hours for all features

### Gap Categories

| Category | Missing Features | Priority | Est. Hours |
|----------|-----------------|----------|-----------|
| **Visualization** | 8 features | HIGH | 80-120 |
| **Advanced Analytics** | 9 features | HIGH | 60-100 |
| **Follower/Network Mgmt** | 7 features | MEDIUM | 40-80 |
| **Real-time Processing** | 6 features | HIGH | 50-100 |
| **Data Export/Import** | 5 features | MEDIUM | 30-60 |
| **Content Moderation** | 4 features | MEDIUM | 25-50 |
| **UI/UX Components** | 3 features | LOW | 15-30 |

---

## CATEGORY 1: VISUALIZATION & LAYOUT ENGINES

**Current State**: Thread utilities, basic graph centrality metrics
**Gap**: No spatial layout algorithms, no Swiss Design support, no visualization presets

### 1.1 Spiral Layout Engine ⭐ HIGH PRIORITY
**Source**: blueballs/backend/app/analytics/swiss_analytics.py
**User Value**: Visual clustering breaks massive networks into readable concentric rings
**Impact**: 5/5 | **Effort**: 3/5 | **Priority**: 7.0

**What it does:**
- Places nodes in concentric rings (tier 0: strong, tier 1: medium, tier 2: weak)
- Ring radii follow Swiss grid modules (200px, 400px, 600px)
- Distributes nodes evenly around each ring by angle
- Computes orbit strength ratio (% nodes in each tier)

**TypeScript Implementation Needed:**
```typescript
// utils/visualization/spiralLayout.ts
export interface SpiralLayoutConfig {
  ringRadii: { [tier: number]: number };
  tierLabels: { [tier: number]: string };
  colorPalette: string[];
}

export function computeSpiralLayout(
  nodes: GraphNode[],
  config?: SpiralLayoutConfig
): { x: number; y: number; spiral_radius: number; spiral_theta: number }[]

export function computeOrbitStrengthRatio(nodes: GraphNode[]): {
  strong: number;
  medium: number;
  weak: number;
}
```

**Files to Extract From**:
- `/home/coolhand/projects/blueballs/backend/app/analytics/swiss_analytics.py` (lines 1-242)

**Quick Wins**:
- Paste Python logic into TypeScript (minimal algorithm changes)
- Reuse existing PageRank scores from graph utilities
- Integrate with existing `orbitTier()` function

---

### 1.2 Force-Directed Graph Layout Presets ⭐ HIGH PRIORITY
**Source**: blueballs visualization library (20+ layout types)
**User Value**: Users can switch between 20 different network views without recalculating
**Impact**: 4/5 | **Effort**: 4/5 | **Priority**: 6.5

**Presets to Add:**
1. **Spiral Clusters** - Community-based spiral arms (3D version)
2. **3D Sphere** - Nodes arranged on globe surface
3. **3D Orbit Force** - Concentric orbital shells
4. **3D Layered Shells** - Concentric 3D shells sorted by centrality
5. **3D Helix Stream** - Helical arms for time-series networks
6. **Hive Map** - Cluster axis comparison
7. **Radial Rings** - Relationship clarity (3 concentric rings)
8. **Heat Force** - Influence heatmap coloring

**TypeScript Implementation Needed:**
```typescript
// utils/visualization/layoutPresets.ts
export type LayoutPreset =
  | 'spiralCluster'
  | '3dSphere'
  | '3dOrbitForce'
  | '3dLayeredShells'
  | '3dHelixStream'
  | 'hiveMap'
  | 'radialRings'
  | 'heatForce'
  | 'forceDirected'  // existing
  | 'circularArc'
  | 'sankey';

export function getLayoutPreset(preset: LayoutPreset): LayoutConfig

export interface LayoutConfig {
  forces: ForceSimulationConfig;
  positioning: PositioningStrategy;
  colorScheme: ColorScheme;
  metadata: LayoutMetadata;
}
```

**No Source Code Available** - These are documented in blueballs CLAUDE.md but not directly ported
**Complexity**: Medium - Requires D3.js force simulation knowledge

---

### 1.3 Swiss Design Grid System Integration
**Source**: blueballs Swiss Grid Analytics + design system standards
**User Value**: Consistent, minimalist aesthetic for embedded visualizations
**Impact**: 3/5 | **Effort**: 2/5 | **Priority**: 4.5

**What it includes:**
- 8px base grid
- Tailwind utility class integration
- Helvetica/system font standard
- Color palette (black, white, 3 accent colors)
- Component spacing presets

**TypeScript Implementation Needed:**
```typescript
// utils/design/swissGrid.ts
export const SWISS_GRID = {
  baseUnit: 8,
  ringRadii: {
    strongTier: 200,      // 25 grid modules
    mediumTier: 400,      // 50 grid modules
    weakTier: 600         // 75 grid modules
  },
  colors: {
    primary: '#000000',
    accent: '#0066cc',
    warning: '#dc2626',
    success: '#10b981',
    background: '#ffffff'
  }
} as const;
```

---

## CATEGORY 2: ADVANCED ANALYTICS ALGORITHMS

**Current State**: Basic engagement scoring, bot detection, cleanup priority
**Gap**: No cohort analysis, no temporal trends, no influence cascades

### 2.1 Follower Ranking by Influence ⭐ HIGH PRIORITY
**Source**: bluevibes/src/app.py + cli tools
**User Value**: Identify most influential followers to prioritize engagement
**Impact**: 4/5 | **Effort**: 2/5 | **Priority**: 7.0

**What it does:**
- Ranks followers by their own follower counts
- Groups by follower tier (10k+, 1k-10k, 100-1k, <100)
- Calculates influence score combining followers + engagement metrics
- Returns top N with metadata

**TypeScript Implementation Needed:**
```typescript
// utils/analytics/followerRanking.ts
export interface InfluenceMetrics {
  followersCount: number;
  followsCount: number;
  postsCount: number;
  ratio: number;
  engagementRate: number;
  influenceScore: number;
  tier: 'mega' | 'macro' | 'micro' | 'nano';
}

export function rankFollowersByInfluence(
  followers: Profile[],
  options?: RankingOptions
): Profile[] // sorted by influence score

export function getInfluenceTier(followersCount: number): InfluenceMetrics['tier']
```

**Source Code Location**:
- `/home/coolhand/projects/bluevibes/src/app.py` (lines 507-524 for top_followers route)

**Quick Wins:**
- Use existing `Profile` type from ProfileManager
- Leverage existing engagement scoring from AnalyticsManager
- Simple sort + grouping logic

---

### 2.2 Bot Detection Heuristics Enhancement ⭐ HIGH PRIORITY
**Source**: bluevibes/src/app.py (lines 1399-1490)
**User Value**: More accurate bot scoring beyond simple follower ratios
**Impact**: 4/5 | **Effort**: 2/5 | **Priority**: 6.5

**Additional Signals to Add:**
1. **Mass Following Pattern** - Following > 1000 with low followers
2. **Very Low Ratio** - Followers/Following < 0.02 with high following
3. **No Posts + Mass Follow** - 0 posts but following 100+ accounts
4. **Round Following Count** - Exactly 1000, 2000, 5000, 10000 (sign of automation)
5. **No Profile Info** - Missing display name AND bio
6. **Account Age** - Very new accounts (< 30 days) with many follows
7. **URL Pattern Analysis** - Suspicious link patterns in bio

**TypeScript Implementation Needed:**
```typescript
// utils/analytics/botDetection.ts
export interface BotIndicators {
  massFollowing: boolean;
  veryLowRatio: boolean;
  noPostsMassFollow: boolean;
  roundFollowingCount: boolean;
  noProfileInfo: boolean;
  newAccountMassFollow: boolean;
  suspiciousUrls: boolean;
  botScore: number;      // 0-10
  category: 'bot_likely' | 'low_quality' | 'legitimate';
  reasons: string[];
}

export function detectBotSignals(profile: Profile): BotIndicators

export function getBotScore(indicators: BotIndicators): number

export function categorizeAccount(score: number): BotIndicators['category']
```

**Source Code Location**:
- `/home/coolhand/projects/bluevibes/src/app.py` (lines 1427-1475)

---

### 2.3 Sentiment Trend Analysis
**Source**: bluevibes sentiment analysis + time-series data
**User Value**: See how user sentiment changes over time
**Impact**: 3/5 | **Effort**: 3/5 | **Priority**: 5.5

**What it includes:**
- Sentiment over time (hourly, daily, weekly aggregation)
- Sentiment by post type (text-only vs. with images/videos)
- Sentiment by thread (reply sentiment vs. original posts)
- Sentiment shift detection (sudden changes)

**TypeScript Implementation Needed:**
```typescript
// utils/analytics/sentimentTrends.ts
export interface SentimentTrend {
  timestamp: Date;
  sentimentScore: number;
  postCount: number;
  averageEngagement: number;
}

export interface SentimentByType {
  textOnly: { score: number; count: number };
  withMedia: { score: number; count: number };
  withQuotes: { score: number; count: number };
  withReplies: { score: number; count: number };
}

export function analyzeSentimentTrends(
  posts: PostWithEngagement[],
  window: 'hourly' | 'daily' | 'weekly'
): SentimentTrend[]

export function sentimentByPostType(posts: PostWithEngagement[]): SentimentByType

export function detectSentimentShifts(
  trends: SentimentTrend[],
  threshold: number
): { date: Date; changePercent: number }[]
```

---

### 2.4 Engagement Rate Benchmarking
**Source**: blueballs analytics + engagement analysis
**User Value**: Compare your engagement to follower tier averages
**Impact**: 3/5 | **Effort**: 2/5 | **Priority**: 5.0

**Metrics:**
- Likes per 1000 followers (by content type)
- Repost rate by follower count
- Reply rate percentile
- Comparison to tier average (top 1%, top 10%, top 50%, etc.)

**TypeScript Implementation Needed:**
```typescript
// utils/analytics/engagementBenchmark.ts
export interface BenchmarkMetrics {
  likesPerKFollowers: number;
  repostRate: number;
  replyRate: number;
  yourPercentile: {
    likes: number;        // 0-100
    reposts: number;
    replies: number;
  };
  tierAverage: {
    followerCount: number;
    likes: number;
    reposts: number;
    replies: number;
  };
}

export function getBenchmarkMetrics(
  account: Profile,
  posts: PostWithEngagement[]
): BenchmarkMetrics
```

---

### 2.5 Community Detection Enhancement
**Source**: blueballs graph analysis + NetworkX community algorithms
**User Value**: Better clustering when discovering network structure
**Impact**: 3/5 | **Effort**: 3/5 | **Priority**: 5.0

**Enhance existing `detectCommunities()` with:**
- Louvain algorithm refinement (better modularity)
- Greedy modularity as fallback
- Community silhouette score (quality metric)
- Temporal community tracking (changes over time)

**TypeScript Implementation Needed** - Likely needs NetworkX.js or jsnetworkx wrapper:
```typescript
// utils/graph/communityDetection.ts
export interface CommunityResult {
  communities: string[][];
  modularity: number;
  silhouetteScore: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export function detectCommunitiesAdvanced(
  graph: NetworkGraph,
  algorithm: 'louvain' | 'greedy'
): CommunityResult
```

---

### 2.6 Cascade Analysis (Engagement Propagation)
**Source**: blueballs graph analytics (edge weighting)
**User Value**: Track how posts spread through network
**Impact**: 3/5 | **Effort**: 3/5 | **Priority**: 4.5

**What it tracks:**
- Post path from original author to likes/reposts
- Speed of engagement spread (hours to reach tier)
- Which followers drive most engagement
- Cascade width (how many parallel paths)

**TypeScript Implementation Needed:**
```typescript
// utils/analytics/cascadeAnalysis.ts
export interface CascadeNode {
  userId: string;
  followerCount: number;
  followedAt: Date;
  engagementAt: Date;
  engagementType: 'like' | 'repost' | 'reply';
  cascadeDepth: number;
}

export interface EngagementCascade {
  postUri: string;
  totalNodes: number;
  cascadeDepth: number;
  cascadeWidth: number;
  spreadTime: number;      // hours
  spreadRate: number;      // engagements per hour
  pathsByTier: { [tier: string]: number };
}

export function analyzeEngagementCascade(
  post: PostWithEngagement,
  followers: Profile[]
): EngagementCascade
```

---

### 2.7 Hashtag Analytics
**Source**: bluesky/html utilities (hashtag extraction)
**User Value**: Trending hashtags, hashtag performance, co-occurrence
**Impact**: 3/5 | **Effort**: 2/5 | **Priority**: 4.5

**Metrics:**
- Hashtag frequency and trends
- Engagement per hashtag
- Co-occurrence patterns (which hashtags appear together)
- Hashtag authority (who uses it most effectively)

**TypeScript Implementation Needed:**
```typescript
// utils/analytics/hashtagAnalytics.ts
export interface HashtagMetrics {
  hashtag: string;
  frequency: number;
  avgEngagement: number;
  trend: 'rising' | 'stable' | 'falling';
  cooccurringHashtags: { [tag: string]: number };
}

export function analyzeHashtagPerformance(
  posts: PostWithEngagement[]
): HashtagMetrics[]

export function getHashtagCooccurrence(posts: PostWithEngagement[]): {
  [hashtag: string]: { [cooccurring: string]: number };
}
```

---

### 2.8 Language & Linguistic Analysis
**Source**: bluesky/unified sentiment extraction + language detection
**User Value**: Content analysis by language, multilingual insights
**Impact**: 2/5 | **Effort**: 2/5 | **Priority**: 3.5

**Add to existing SentimentService:**
- Detect post language (EN, JA, ZH, AR, RU, etc.)
- Sentiment analysis per language
- Code-switching detection (multilingual posts)
- Toxicity detection per language

**TypeScript Implementation Needed:**
```typescript
// utils/analytics/linguisticAnalysis.ts
export interface LinguisticProfile {
  languages: { [lang: string]: number };
  primaryLanguage: string;
  isCodeSwitching: boolean;
  toxicityScore: number;
  readabilityScore: number;  // 0-100
  averageWordLength: number;
}

export function analyzeLinguisticProfile(
  posts: PostWithEngagement[]
): LinguisticProfile
```

---

### 2.9 Growth & Retention Metrics
**Source**: bluevibes follower tracking
**User Value**: See if followers are growing, lost patterns, stickiness
**Impact**: 3/5 | **Effort**: 3/5 | **Priority**: 5.0

**Metrics:**
- Daily growth rate
- Churn (followers who stop engaging)
- New follower retention (% still following after X days)
- Win-back opportunities (recently unfollowed accounts)

**Requires Database Snapshots** - Would need to store historical follower data

---

## CATEGORY 3: FOLLOWER & NETWORK MANAGEMENT

**Current State**: Basic network queries, follow/unfollow in basic Post/Content managers
**Gap**: No bulk operations, no relationship analysis, no recommendation engine

### 3.1 Non-Followers Identification ⭐ HIGH PRIORITY
**Source**: bluevibes/src/app.py (lines 836-976)
**User Value**: Find accounts not following you back for cleanup
**Impact**: 4/5 | **Effort**: 1/5 | **Priority**: 7.5

**Already Exposed**: Partially in DeletionManager
**Enhancement Needed**: Better packaging + filtering options

**TypeScript Implementation Needed:**
```typescript
// managers/RelationshipManager.ts (NEW)
export class RelationshipManager extends ManagerBase {
  async getNonFollowers(handle: string): Promise<Profile[]>

  async getLoRatioFollowing(
    handle: string,
    minRatio?: number
  ): Promise<Profile[]>

  async getMutualFollows(handle: string): Promise<Profile[]>

  async getUnfollowedYou(handle: string): Promise<Profile[]>
}
```

**Quick Win**: Extract from bluevibes app.py, package into manager

---

### 3.2 Bulk Unfollow Operations with Rules
**Source**: bluevibes/src/app.py (lines 1143-1168, 1224-1256)
**User Value**: Unfollow multiple accounts at once by criteria
**Impact**: 4/5 | **Effort**: 2/5 | **Priority**: 6.5

**Rule Types:**
- Unfollow all bots (score > threshold)
- Unfollow by engagement (never interact with my posts)
- Unfollow by ratio (followers/following < X)
- Unfollow inactive accounts (no posts in 90 days)
- Unfollow accounts with no profile info

**Enhancement to DeletionManager or new UnfollowManager:**
```typescript
export interface UnfollowRule {
  type: 'bot' | 'lowRatio' | 'inactive' | 'noProfile' | 'noEngagement';
  threshold?: number;
  daysInactive?: number;
  dryRun?: boolean;
}

export async function bulkUnfollowByRule(
  handle: string,
  rules: UnfollowRule[]
): Promise<{ unfollowed: number; skipped: number; errors: number }>
```

---

### 3.3 Follower List Snapshots & Comparison
**Source**: bluevibes follower fetch logic
**User Value**: See who you gained/lost, when followers joined
**Impact**: 3/5 | **Effort**: 3/5 | **Priority**: 5.0

**Requires Periodic Snapshots** - Store follower list at intervals

**TypeScript Implementation Needed:**
```typescript
// utils/analytics/followerSnapshots.ts
export interface FollowerSnapshot {
  timestamp: Date;
  followersCount: number;
  followers: Profile[];
  hash: string;  // for diffing
}

export interface FollowerDiff {
  gained: Profile[];
  lost: Profile[];
  gainedCount: number;
  lostCount: number;
  netChange: number;
}

export function compareSnapshots(
  before: FollowerSnapshot,
  after: FollowerSnapshot
): FollowerDiff

export function analyzeFollowerChurn(
  snapshots: FollowerSnapshot[]
): { dailyChurn: number; retentionRate: number }
```

---

### 3.4 Mention Network Analysis
**Source**: bluesky/html mention extraction utilities
**User Value**: See who mentions you, reply patterns
**Impact**: 3/5 | **Effort**: 2/5 | **Priority**: 4.5

**Metrics:**
- Mention frequency by account
- @ reply threading analysis
- Mention sentiment (positive vs. negative mentions)
- Mutual mention patterns

---

### 3.5 DM Thread Analytics
**Source**: ChatManager (existing)
**User Value**: Analyze DM patterns, response times
**Impact**: 2/5 | **Effort**: 2/5 | **Priority**: 3.5

**Add to ChatManager:**
- Average response time
- Longest active conversations
- Sentiment in DMs vs. public
- Conversation summary generation

---

### 3.6 List Management Enhancement
**Source**: ListsManager (existing)
**User Value**: Better list organization, auto-population
**Impact**: 2/5 | **Effort**: 2/5 | **Priority**: 3.5

**Enhance ListsManager:**
- Create list from followers + filter criteria
- Auto-add followers matching bot profile
- List-based analytics (engagement within list vs. followers)
- Curated list ranking

---

### 3.7 Follow/Unfollow Patterns Tracking
**Source**: Bluevibes session logs + network history
**User Value**: Understand network growth patterns over time
**Impact**: 2/5 | **Effort**: 2/5 | **Priority**: 3.5

**Requires Snapshots**: Historical follow/unfollow data

---

## CATEGORY 4: REAL-TIME PROCESSING

**Current State**: Sentiment Service (batch), no streaming
**Gap**: No Jetstream integration, no live updates, no push notifications

### 4.1 Jetstream Firehose Integration ⭐ HIGH PRIORITY
**Source**: bluesky/html/firehose (Socket.IO + Jetstream streaming)
**User Value**: Real-time post stream from entire network
**Impact**: 4/5 | **Effort**: 3/5 | **Priority**: 6.5

**WebSocket Connection to Jetstream:**
```
wss://jetstream2.us-east.bsky.network
```

**TypeScript Implementation Needed:**
```typescript
// services/JetstreamService.ts (NEW)
export class JetstreamService {
  private websocket: WebSocket;
  private eventHandlers: Map<string, Function[]> = new Map();

  async connect(options?: JetstreamOptions): Promise<void>

  async disconnect(): Promise<void>

  on(event: 'post' | 'like' | 'repost' | 'follow' | 'error',
     handler: (data: any) => void): void

  off(event: string, handler: Function): void

  // Filter streams
  async streamFromHandle(handle: string): AsyncIterator<Post>

  async streamPostsWithHashtag(hashtag: string): AsyncIterator<Post>

  async streamPostsFromFollowing(): AsyncIterator<Post>
}
```

**Source Code Location**:
- `/home/coolhand/html/bluesky/firehose/` (Socket.IO server integration)

---

### 4.2 Real-time Mention Alerts
**Source**: JetstreamService + Jetstream post filtering
**User Value**: Get notified when mentioned in real-time
**Impact**: 3/5 | **Effort**: 2/5 | **Priority**: 5.5

**Extend JetstreamService:**
```typescript
async streamMentions(
  handle: string,
  options?: MentionFilterOptions
): AsyncIterator<{ post: Post; mentionedAt: Date }>

async onMentionReceived(
  callback: (mention: Mention) => void
): void
```

---

### 4.3 Engagement Notifications
**Source**: JetstreamService + activity tracking
**User Value**: Real-time likes, reposts, replies to your posts
**Impact**: 3/5 | **Effort**: 2/5 | **Priority**: 5.0

**Extend to track:**
- New likes on your posts
- New reposts
- New replies
- New follows
- Batch and notify on interval

---

### 4.4 Trending Detection
**Source**: blueballs + Jetstream post analysis
**User Value**: Detect what's trending in your network or globally
**Impact**: 3/5 | **Effort**: 3/5 | **Priority**: 5.0

**Add trending utility:**
```typescript
// utils/analytics/trendingDetection.ts
export interface TrendingItem {
  tag: string;  // #hashtag or @mention
  frequency: number;
  velocity: number;  // posts per hour
  sentiment: number;
  trend: 'emerging' | 'peak' | 'declining';
}

export function detectTrending(
  posts: Post[],
  window: number
): TrendingItem[]
```

---

### 4.5 Post Engagement Streak Tracking
**Source**: Engagement analytics + time-series
**User Value**: Track engagement momentum on posts
**Impact**: 2/5 | **Effort**: 2/5 | **Priority**: 4.0

**Track:**
- Time to first 10 likes (speed metric)
- Engagement velocity (likes per hour)
- Peak engagement time
- Engagement decay curve

---

### 4.6 Live Feed Composition Analysis
**Source**: Jetstream data + content analysis
**User Value**: Real-time analysis of your home feed
**Impact**: 2/5 | **Effort**: 2/5 | **Priority**: 3.5

**Analyze:**
- What % of feed is reposts vs. original
- Average sentiment of home feed
- Topics in feed vs. your content
- Engagement rate of feed posts

---

## CATEGORY 5: DATA EXPORT & IMPORT

**Current State**: BackupService (CAR files, JSON export)
**Gap**: No CSV export, no bulk import, no format conversion

### 5.1 Advanced CSV Export ⭐ MEDIUM PRIORITY
**Source**: BackupService + export utilities
**User Value**: Export posts/followers to spreadsheet for analysis
**Impact**: 3/5 | **Effort**: 2/5 | **Priority**: 5.5

**Export Formats:**
```typescript
export type ExportFormat =
  | 'json'
  | 'csv'
  | 'jsonl'
  | 'parquet'
  | 'sqlite';

export interface ExportOptions {
  format: ExportFormat;
  fields: string[];
  filter?: FilterCriteria;
  includeMetadata?: boolean;
}

export async function exportPosts(
  options: ExportOptions
): Promise<Blob>

export async function exportFollowers(
  options: ExportOptions
): Promise<Blob>
```

---

### 5.2 Bulk Post Import
**Source**: BackupService (CAR import logic)
**User Value**: Restore posts from backup or migrate
**Impact**: 2/5 | **Effort**: 3/5 | **Priority**: 4.0

**Import from:**
- JSON array
- JSONL (one per line)
- CSV with mappings
- CAR format (existing)

---

### 5.3 CSV to Follow List Converter
**Source**: CSV parsing + network operations
**User Value**: Import follows from spreadsheet (migration, bulk follow)
**Impact**: 2/5 | **Effort**: 2/5 | **Priority**: 4.0

**Parse CSV with columns:**
- handle
- did
- displayName
- reason (optional)

```typescript
export async function importFollowListFromCsv(
  csvContent: string,
  bulkFollow?: boolean
): Promise<{ imported: number; failed: number; errors: string[] }>
```

---

### 5.4 Data Archive & Cleanup
**Source**: BackupService + storage management
**User Value**: Archive old data to save storage
**Impact**: 2/5 | **Effort**: 2/5 | **Priority**: 4.0

**Policies:**
- Archive posts older than X days
- Compress old backups
- Remove cached data older than 30 days
- Database cleanup (vacuum, index optimize)

---

### 5.5 Format Conversion Pipeline
**Source**: Multiple export formats above
**User Value**: Convert between export formats
**Impact**: 1/5 | **Effort**: 2/5 | **Priority**: 2.5

**Conversions:**
- JSON ↔ CSV
- JSON ↔ JSONL
- JSON → SQLite
- CAR → JSON

---

## CATEGORY 6: CONTENT MODERATION

**Current State**: Basic DeletionManager, no moderation tools
**Gap**: No bulk deletion, no content filtering, no auto-moderation

### 6.1 Bulk Delete by Criteria ⭐ MEDIUM PRIORITY
**Source**: DeletionManager + filter logic
**User Value**: Delete multiple posts at once (e.g., all posts with 0 engagement)
**Impact**: 3/5 | **Effort**: 2/5 | **Priority**: 5.5

**Criteria:**
- Engagement threshold (likes < X)
- Date range (older than X days)
- Content type (replies, quote posts)
- Keyword match
- Combination of above

```typescript
export interface DeletionCriteria {
  type: 'engagement' | 'date' | 'contentType' | 'keyword' | 'sentiment';
  threshold?: number;
  dateRange?: { start: Date; end: Date };
  keywords?: string[];
  sentiment?: 'negative' | 'neutral' | 'positive';
  dryRun?: boolean;  // preview before delete
}

export async function bulkDeletePosts(
  criteria: DeletionCriteria
): Promise<{ deleted: number; skipped: number; errors: number }>
```

---

### 6.2 Privacy Review (PII Detection)
**Source**: Content filtering + regex patterns
**User Value**: Find posts containing sensitive info (phone, email, address)
**Impact**: 2/5 | **Effort**: 2/5 | **Priority**: 4.5

**Detect:**
- Email addresses
- Phone numbers
- Social security numbers
- Address patterns
- Credit card patterns

---

### 6.3 Hashtag Moderation Rules
**Source**: HashtagManager + filtering
**User Value**: Block, warn, or flag posts with certain hashtags
**Impact**: 2/5 | **Effort**: 1/5 | **Priority**: 3.5

**Rule Types:**
- Ban hashtags (don't post)
- Warn hashtags (will lower reach)
- Track hashtags (monitor usage)

---

### 6.4 Profanity & Toxicity Filtering
**Source**: SentimentService + toxicity models
**User Value**: Review posts with flagged language before posting
**Impact**: 2/5 | **Effort**: 2/5 | **Priority**: 4.0

**Extend SentimentService:**
```typescript
export interface ToxicityAnalysis {
  score: number;  // 0-1
  categories: {
    insult: number;
    profanity: number;
    threat: number;
    harassment: number;
  };
  flagged: boolean;
  suggestions: string[];
}

export async function analyzeToxicity(text: string): Promise<ToxicityAnalysis>
```

---

## CATEGORY 7: UI/UX COMPONENTS & UTILITIES

**Current State**: Minimal; relies on application code
**Gap**: No shared components library, no visualization helpers

### 7.1 React Component Library ⭐ LOW PRIORITY
**Source**: unified React components + post-visualizer
**User Value**: Reusable components for Bluesky UI
**Impact**: 2/5 | **Effort**: 3/5 | **Priority**: 4.0

**Components:**
- `<PostCard>` - Display post with engagement
- `<ThreadViewer>` - Recursive thread rendering
- `<ProfileHeader>` - User profile card
- `<EngagementChart>` - Visual engagement metrics
- `<ThreadAnalyzer>` - D3 force graph for threads

**Location**: Recommend new package `@skymarshal-core/react-components`

---

### 7.2 Visualization Presets Library
**Source**: blueballs visualization types (20+ presets)
**User Value**: Predefined, tested layouts for common viz patterns
**Impact**: 2/5 | **Effort**: 2/5 | **Priority**: 3.5

**Export preset configs as JSON:**
```typescript
export const VISUALIZATION_PRESETS = {
  forceDirected: { /* config */ },
  spiralCluster: { /* config */ },
  '3dSphere': { /* config */ },
  // ... 20+ more
} as const;
```

---

### 7.3 WCAG 2.1 AA Accessibility Utilities
**Source**: unified accessibility compliance
**User Value**: Helper functions for accessible components
**Impact**: 1/5 | **Effort**: 1/5 | **Priority**: 2.5

**Utilities:**
- `getAriaLabel()` - Generate ARIA labels
- `getContrast()` - Check color contrast ratios
- `keyboardHandler()` - Standardized keyboard events
- `focusManagement()` - Focus trap utilities

---

## CATEGORY 8: DATABASE & PERSISTENCE

**Current State**: IndexedDB provider (browser only)
**Gap**: No server-side DB models, no sync strategies

### 8.1 SQLite Integration for Node.js (Server-side)
**Source**: firehose + unified server SQLite usage
**User Value**: Persistent data storage for server-side tools
**Impact**: 2/5 | **Effort**: 2/5 | **Priority**: 4.0

**Add database provider:**
```typescript
// database/sqliteProvider.ts (NEW)
export class SQLiteProvider implements DatabaseProvider {
  async init(dbPath: string): Promise<void>

  async query<T>(sql: string, params: any[]): Promise<T[]>

  async run(sql: string, params: any[]): Promise<RunResult>

  async transaction<T>(fn: () => Promise<T>): Promise<T>
}

export async function initializeDataModels(): Promise<void>
```

**Data Models:**
- FollowerSnapshots (for historical tracking)
- PostMetrics (analytics cache)
- JetstreamEvents (real-time data)
- AnalysisCache (expensive computations)

---

## PRIORITIZED BACKLOG

### TIER 1: HIGH-VALUE, MEDIUM EFFORT (Implement First)

| Feature | Source | Impact | Effort | Est. Hours | Priority |
|---------|--------|--------|--------|-----------|----------|
| 1. **Follower Ranking** | bluevibes | 4/5 | 2/5 | 8-12 | 7.0 |
| 2. **Non-Followers List** | bluevibes | 4/5 | 1/5 | 4-8 | 7.5 |
| 3. **Spiral Layout Engine** | blueballs | 5/5 | 3/5 | 20-30 | 7.0 |
| 4. **Jetstream Integration** | firehose | 4/5 | 3/5 | 25-40 | 6.5 |
| 5. **Bot Detection Heuristics** | bluevibes | 4/5 | 2/5 | 8-15 | 6.5 |
| 6. **Advanced CSV Export** | BackupService | 3/5 | 2/5 | 12-16 | 5.5 |
| 7. **Real-time Mention Alerts** | JetstreamService | 3/5 | 2/5 | 10-15 | 5.5 |
| 8. **Bulk Unfollow Rules** | bluevibes | 4/5 | 2/5 | 10-15 | 6.5 |

**Total TIER 1**: ~97-151 hours (6-12 weeks full-time or 3-6 months part-time)

---

### TIER 2: MEDIUM-VALUE, MEDIUM EFFORT (Implement Second)

| Feature | Impact | Effort | Est. Hours | Priority |
|---------|--------|--------|-----------|----------|
| 1. Force-Directed Layout Presets (20+) | 4/5 | 4/5 | 40-60 | 6.5 |
| 2. Sentiment Trend Analysis | 3/5 | 3/5 | 15-25 | 5.5 |
| 3. Community Detection Enhancement | 3/5 | 3/5 | 15-25 | 5.0 |
| 4. Mention Network Analysis | 3/5 | 2/5 | 10-15 | 4.5 |
| 5. Hashtag Analytics | 3/5 | 2/5 | 12-18 | 4.5 |
| 6. Cascade Analysis | 3/5 | 3/5 | 15-25 | 4.5 |
| 7. Engagement Benchmarking | 3/5 | 2/5 | 10-15 | 5.0 |
| 8. Follower Snapshots & Comparison | 3/5 | 3/5 | 20-30 | 5.0 |

**Total TIER 2**: ~137-213 hours (9-14 weeks full-time)

---

### TIER 3: NICE-TO-HAVE (Implement When Time Permits)

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Real-time Engagement Notifications | 3/5 | 2/5 | 5.0 |
| Trending Detection | 3/5 | 3/5 | 5.0 |
| Swiss Design Grid System | 3/5 | 2/5 | 4.5 |
| Linguistic Analysis | 2/5 | 2/5 | 3.5 |
| DM Thread Analytics | 2/5 | 2/5 | 3.5 |
| Bulk Delete by Criteria | 3/5 | 2/5 | 5.5 |
| React Component Library | 2/5 | 3/5 | 4.0 |
| Privacy Review (PII Detection) | 2/5 | 2/5 | 4.5 |
| Profanity & Toxicity Filtering | 2/5 | 2/5 | 4.0 |
| List Management Enhancement | 2/5 | 2/5 | 3.5 |

---

## DEPENDENCY ANALYSIS

### Critical Dependencies

```
┌─ Jetstream Integration (4.1)
│  ├─ Real-time Mention Alerts (4.2)
│  ├─ Engagement Notifications (4.3)
│  ├─ Trending Detection (4.5)
│  └─ Live Feed Analysis (4.6)
│
├─ Follower Ranking (3.1) [INDEPENDENT]
│
├─ Bot Detection (2.2) [INDEPENDENT]
│
├─ Non-Followers List (3.1) ← Depends on NetworkManager
│
├─ Bulk Unfollow (3.2) ← Depends on Non-Followers + Bot Detection
│
├─ Spiral Layout (1.1) ← Graph utilities (existing)
│
├─ Layout Presets (1.2) ← Depends on Layout Engine
│
├─ Community Detection (2.5) ← Graph utilities (existing)
│
└─ Cascade Analysis (2.6) ← Depends on Network Graph + Engagement scoring
```

### Build-This-First Order

1. **Follower Ranking** (3.1) - No dependencies, high value, quick win
2. **Bot Detection** (2.2) - No dependencies, high value, quick win
3. **Non-Followers** (3.1) - Depends on FollowerRanking, quick win
4. **Bulk Unfollow** (3.2) - Depends on Non-Followers + Bot Detection
5. **Jetstream Integration** (4.1) - Foundation for real-time features
6. **Spiral Layout** (1.1) - Independent, complex but high value
7. **[Other features...]**

---

## IMPLEMENTATION STRATEGY

### Phase 1: Quick Wins (Weeks 1-3)

Focus on high-value, low-effort features that can be extracted from existing codebases:

1. **Week 1**: Follower Ranking (3.1) + Bot Detection Enhancement (2.2)
   - Extract from bluevibes/src/app.py
   - Create RelationshipManager or enhance existing managers
   - Add tests

2. **Week 2**: Non-Followers (3.1) + Bulk Unfollow (3.2)
   - Extract from bluevibes logic
   - Create filtering/rule engine
   - Add relationship manager methods

3. **Week 3**: CSV Export (5.1) + Data utilities
   - Extend BackupService with CSV format
   - Add export options and filtering

### Phase 2: Foundation (Weeks 4-8)

Build infrastructure for real-time and visualization:

1. **Week 4-5**: Jetstream Integration (4.1)
   - WebSocket connection management
   - Event streaming infrastructure
   - Unit tests

2. **Week 6-7**: Spiral Layout Engine (1.1)
   - Port Python to TypeScript
   - Integration with graph utilities
   - Layout presets system

3. **Week 8**: SQLite Server-side Provider (8.1)
   - Database schema
   - Migration system
   - Query builders

### Phase 3: Advanced Analytics (Weeks 9-14)

Build sophisticated analysis features:

1. **Weeks 9-10**: Sentiment Trend Analysis (2.3)
2. **Weeks 11-12**: Community Detection Enhancement (2.5)
3. **Weeks 13-14**: Cascade Analysis (2.6) + Hashtag Analytics (2.7)

---

## TESTING RECOMMENDATIONS

### Unit Tests
- Bot detection heuristics (parametrized tests for each signal)
- Engagement calculations and benchmarking
- CSV parsing and format conversion
- Layout algorithms (math verification)

### Integration Tests
- Jetstream connection and reconnection
- Database transactions
- API responses with mock data

### E2E Tests
- Full workflow: fetch followers → detect bots → bulk unfollow
- Real-time stream filtering
- Data export and import

---

## DOCUMENTATION ADDITIONS

1. **New Manager Guides**
   - RelationshipManager usage patterns
   - JetstreamService real-time examples

2. **Analytics Module Guide**
   - Follower ranking interpretation
   - Bot score thresholds
   - Cascade analysis reading

3. **Visualization Guide**
   - Spiral layout parameters
   - Layout preset selection
   - Customization options

4. **Real-time Guide**
   - Jetstream event types
   - Connection best practices
   - Error handling

---

## RISK ASSESSMENT

### High Risk
- **Jetstream Integration**: Network dependency, rate limiting
- **Cascade Analysis**: Complex graph traversal, performance at scale
- **Layout Presets**: 20+ algorithms to debug and test

### Medium Risk
- **Bot Detection**: False positives/negatives need tuning
- **Bulk Operations**: Unintended mass deletion/unfollow

### Low Risk
- **Follower Ranking**: Simple sort + grouping
- **CSV Export**: Standard format parsing
- **Hashtag Analytics**: Regex extraction + counting

---

## CONCLUSION

**Total Features**: 42 missing features identified
**High-Priority**: 8 features (Tier 1) - ~97-151 hours
**Medium-Priority**: 8 features (Tier 2) - ~137-213 hours
**Suggested Timeline**: 15-26 weeks (3-6 months) for comprehensive coverage

**Quick Wins**: Can implement Follower Ranking + Bot Detection + Non-Followers in first 2-3 weeks

**Recommended Approach**: Start with Tier 1 features (follower management), then build Jetstream infrastructure, then layer in advanced analytics.
