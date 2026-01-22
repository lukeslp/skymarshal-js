# skymarshal

**Comprehensive Bluesky/AT Protocol toolkit for TypeScript/JavaScript**

skymarshal provides everything you need to build Bluesky applications: authentication, content management, network analysis, chat/DMs, notifications, profile management, posts, lists, feeds, media uploads, bot detection, backup, alt text generation, and sentiment analysis.

[![npm version](https://badge.fury.io/js/skymarshal.svg)](https://www.npmjs.com/package/skymarshal)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install skymarshal @atproto/api
```

## Quick Start

```typescript
import {
  AuthManager,
  ContentManager,
  NetworkManager,
  ChatManager,
  NotificationManager,
  ProfileManager,
  PostManager,
  ListsManager,
  FeedsManager,
  MediaManager,
  AnalyticsManager,
  SearchManager,
} from 'skymarshal';

// Authenticate
const auth = new AuthManager();
await auth.login('myhandle.bsky.social', 'my-app-password');

// Content management
const content = new ContentManager(auth.agent);
const posts = await content.getPosts(auth.did!);
const likes = await content.getLikes(auth.did!);
const reposts = await content.getReposts(auth.did!);

// Create posts with rich text, images, and threads
const post = new PostManager(auth.agent);
await post.createPost({ text: 'Hello from skymarshal!' });
await post.createThread([
  { text: 'Thread part 1' },
  { text: 'Thread part 2' },
]);

// Upload media
const media = new MediaManager(auth.agent);
const blob = await media.uploadImage({
  data: imageBuffer,
  mimeType: 'image/jpeg',
  altText: 'A beautiful sunset',
});

// Network analysis
const network = new NetworkManager(auth.agent);
const mutuals = await network.getMutuals(auth.did!);
const nonFollowers = await network.getNonFollowers(auth.did!);
const followers = await network.getFollowers(auth.did!);
const following = await network.getFollowing(auth.did!);

// Graph operations
await network.follow('did:plc:example');
await network.unfollow('did:plc:example');
await network.block('did:plc:example');
await network.mute('did:plc:example');

// Chat/DMs
const chat = new ChatManager(auth.agent);
const convos = await chat.listConvos();
const messages = await chat.getMessages(convos[0].id);
await chat.sendMessage(convos[0].id, 'Hello!');
await chat.muteConvo(convos[0].id);

// Notifications
const notifications = new NotificationManager(auth.agent);
const { notifications: notifs } = await notifications.listNotifications();
const unread = await notifications.getUnreadCount();
await notifications.markAllRead();

// Filter notifications by type
const likesOnly = await notifications.listNotifications({ 
  filter: ['like'] 
});

// Profile management
const profile = new ProfileManager(auth.agent);
const myProfile = await profile.getProfile(auth.did!);
await profile.updateProfile({ 
  displayName: 'New Name', 
  description: 'Updated bio' 
});

// Lists
const lists = new ListsManager(auth.agent);
const myLists = await lists.getLists(auth.did!);
await lists.createList({ 
  name: 'My List', 
  purpose: 'curatelist',
  description: 'People I follow closely'
});
await lists.addMember(listUri, 'did:plc:example');

// Feeds
const feeds = new FeedsManager(auth.agent);
const timeline = await feeds.getTimeline();
const savedFeeds = await feeds.getSavedFeeds();
const popularFeeds = await feeds.searchFeeds('science');
await feeds.saveFeed(feedUri);
await feeds.pinFeed(feedUri);

// Search with advanced operators
const search = new SearchManager(auth.agent);
const results = await search.searchPosts({
  query: '"exact phrase" -exclude +required',
  sort: 'engagement',
});

// Bot detection & analytics
const analytics = new AnalyticsManager();
const analysis = analytics.analyzeAccount(profile);
console.log(`Bot score: ${analysis.botScore}`);
console.log(`Signals: ${analysis.signals.map(s => s.type).join(', ')}`);

// Batch analysis
const batchResults = analytics.batchAnalyze(mutuals);
const suspicious = batchResults.filter(a => a.botScore > 0.5);
```

## v2.2.0 Features

### Thread Management

Fetch and analyze post threads with built-in caching:

```typescript
import { fetchThread, flattenThread, PostCache, countThreadPosts } from 'skymarshal/threads';

// Thread fetching with cache (5-minute TTL)
const thread = await fetchThread(auth.agent, 'at://did:plc:xyz/app.bsky.feed.post/abc');

// Flatten nested thread for analysis
const allPosts = flattenThread(thread);
console.log(`Thread contains ${countThreadPosts(thread)} posts`);

// Get unique participants
import { getThreadAuthors } from 'skymarshal/threads';
const participants = getThreadAuthors(thread);

// Parse Bluesky URLs
import { parsePostUrl, resolvePostUrl } from 'skymarshal/threads';
const { handle, postId } = parsePostUrl('https://bsky.app/profile/user.bsky.social/post/abc123');
const atUri = await resolvePostUrl(auth.agent, 'https://bsky.app/profile/user.bsky.social/post/abc123');
```

### Analytics & Scoring

Ported from Python (bluebeam, blueye, bluefry) with zero dependencies:

```typescript
import {
  calculateEngagementScore,
  calculateEngagementRate,
  calculatePopularityScore,
  calculateCleanupScore,
  isLikelyBot,
  getCleanupPriority,
  classifyPostType,
} from 'skymarshal/analytics-utils';

// Engagement scoring (weighted: likes 1×, reposts 3×, replies 2×, quotes 4×)
const score = calculateEngagementScore({
  likes: 50, reposts: 8, replies: 10, quotes: 3
}); // = 50 + 24 + 20 + 12 = 106

// Engagement rate as percentage of followers
const rate = calculateEngagementRate(score, 1000); // 10.6%

// Popularity scoring (50% followers, 30% ratio, 20% activity)
const popularity = calculatePopularityScore({
  followers: 5000, following: 200, postsCount: 500
});

// Bot detection (9 heuristic signals, 0-100+ scale)
const botScore = calculateCleanupScore(profile);
const isBot = isLikelyBot(profile); // threshold: 80
const priority = getCleanupPriority(profile); // 'high' | 'medium' | 'low' | 'none'

// Post type classification
const type = classifyPostType(post); // 'photo' | 'video' | 'link' | 'long_text' | 'question' | 'text'
```

### Graph Analysis

Pure TypeScript social graph analysis (no NetworkX dependency):

```typescript
import {
  degreeCentrality,
  betweennessCentrality,
  calculatePageRank,
  detectCommunities,
  calculateModularity,
  networkDensity,
  averageClustering,
  computeGraphMetrics,
  orbitTier,
} from 'skymarshal/graph';

// Build graph from followers/following
const nodes = followers.map(f => ({ id: f.did, handle: f.handle }));
const edges = relationships.map(r => ({ source: r.from, target: r.to }));

// Centrality metrics
const degree = degreeCentrality(nodes, edges);
const betweenness = betweennessCentrality(nodes, edges);
const pagerank = calculatePageRank(nodes, edges, { damping: 0.85, iterations: 20 });

// Community detection (label propagation)
const communities = detectCommunities(nodes, edges);
const quality = calculateModularity(nodes, edges, communities);

// All-in-one analysis
const metrics = computeGraphMetrics(nodes, edges);
console.log(`Density: ${metrics.density}, Clustering: ${metrics.clustering}`);

// Orbit classification (0: >20 connections, 1: 5-20, 2: <5)
const tier = orbitTier(connectionCount);
```

### Engagement Manager

TTL-based caching with intelligent refresh:

```typescript
import { EngagementManager } from 'skymarshal/engagement';

const em = new EngagementManager(auth.agent, {
  // Dynamic TTL based on content age:
  // - Recent (<1 day): 1 hour cache
  // - Medium (1-7 days): 6 hour cache
  // - Old (>7 days): 24 hour cache
});

// Hydrate posts with fresh engagement metrics
const posts = await content.getPosts(auth.did!);
await em.hydrateItems(posts);

// Batch update with concurrency control (10 parallel max)
await em.batchUpdateEngagement(postUris);

// Check cache statistics
const stats = em.getStats();
console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
```

### Deletion Manager

Safe deletion workflows with backup support:

```typescript
import { DeletionManager } from 'skymarshal/deletion';

const dm = new DeletionManager(auth.agent);

// Preview deletion (dry run)
const preview = await dm.previewDeletion(postUri);
console.log(`Will delete: ${preview.uri}`);

// Safe delete with options
await dm.safeDelete(postUri, {
  confirmationRequired: true,
  deleteFromRemote: true,
  createBackup: true,
});

// Batch delete with progress tracking
const result = await dm.batchDelete(postUris, {
  onProgress: (completed, total) => console.log(`${completed}/${total}`)
});
console.log(`Deleted: ${result.success}, Failed: ${result.failed}`);

// Parse AT-URIs
import { parseAtUri } from 'skymarshal/deletion';
const { repo, collection, rkey } = parseAtUri('at://did:plc:xyz/app.bsky.feed.post/abc');
```

## Managers

| Manager | Description |
|---------|-------------|
| **AuthManager** | Session management, login/logout, token refresh, profile fetch |
| **ContentManager** | Get posts, likes, reposts with engagement scoring and presets |
| **NetworkManager** | Following/followers, mutuals, non-followers, follow/unfollow/block/mute |
| **ChatManager** | List conversations, get/send messages, reactions, mute/unmute, leave |
| **NotificationManager** | List notifications, mark read, unread count, filter by type |
| **ProfileManager** | Get/update profile, avatar, banner, search profiles |
| **PostManager** | Create posts/threads, delete, like/unlike, repost/unrepost |
| **ListsManager** | Create/delete lists, add/remove members, mute/block lists |
| **FeedsManager** | Timeline, custom feeds, save/pin/unpin feeds, search feeds |
| **MediaManager** | Upload images/videos, create embeds, validate dimensions |
| **AnalyticsManager** | Bot detection, engagement analysis, dead thread detection |
| **SearchManager** | Keyword search with operators (`"exact"`, `-exclude`, `+required`) |
| **EngagementManager** | TTL-based engagement caching with age-aware expiry (v2.2.0) |
| **DeletionManager** | Safe deletion workflows with backup and confirmation (v2.2.0) |

## Services

| Service | Description |
|---------|-------------|
| **BackupService** | CAR file export for account backup |
| **VisionService** | Alt text generation (Ollama, OpenAI, Anthropic, xAI/Grok) |
| **SentimentService** | VADER-based text sentiment analysis |

### VisionService Providers

```typescript
import { VisionService } from 'skymarshal';

// Local with Ollama (no API key needed)
const vision = new VisionService({ provider: 'ollama' });

// Cloud providers
const vision = new VisionService([
  { provider: 'openai', apiKey: process.env.OPENAI_API_KEY },
  { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY },
  { provider: 'xai', apiKey: process.env.XAI_API_KEY },
]);

// Generate alt text
const result = await vision.generateAltText(imageUrl);
console.log(result.text);

// Detailed analysis
const analysis = await vision.analyzeImage(imageUrl, { detailed: true });
console.log(analysis.description);
console.log(analysis.objects);
console.log(analysis.accessibility.altText);
```

| Provider | Default Model | Notes |
|----------|---------------|-------|
| Ollama | llava-phi3 | Local/self-hosted |
| OpenAI | gpt-4o-mini | Cloud API |
| Anthropic | claude-3-haiku | Cloud API |
| xAI/Grok | grok-2-vision-1212 | Cloud API |

## Utilities

| Utility | Description |
|---------|-------------|
| **EngagementCache** | Age-based TTL caching (1hr recent, 6hr medium, 24hr old) |
| **PaginationHelper** | Cursor-based pagination with batch fetching |
| **ExportHelper** | CSV/JSON export for posts, followers, analytics |
| **DateUtils** | Date formatting, relative time ("2 hours ago") |
| **BatchUtils** | Batch processing with concurrency control |
| **UriUtils** | AT URI parsing (extract DID, collection, rkey) |
| **PostCache** | Thread caching with 5-minute TTL (v2.2.0) |
| **GraphMetrics** | Centrality, PageRank, community detection (v2.2.0) |
| **AnalyticsUtils** | Engagement/popularity scoring, bot detection (v2.2.0) |

### Engagement Scoring

```typescript
import { calculateEngagementScore, getEngagementPreset } from 'skymarshal';

// Score formula: likes + (2 × reposts) + (2.5 × replies)
const score = calculateEngagementScore(post);

// Presets based on user's average engagement
const preset = getEngagementPreset(score, userAverageScore);
// Returns: 'dead' | 'low' | 'mid' | 'banger' | 'viral'
```

## Subpath Imports

Import only what you need for smaller bundle sizes:

```typescript
// Managers
import { AuthManager } from 'skymarshal/auth';
import { ContentManager } from 'skymarshal/content';
import { NetworkManager } from 'skymarshal/network';
import { EngagementManager } from 'skymarshal/engagement';
import { DeletionManager } from 'skymarshal/deletion';

// Services
import { VisionService } from 'skymarshal/vision';
import { BackupService } from 'skymarshal/backup';
import { SentimentService } from 'skymarshal/sentiment';

// Utilities (v2.2.0)
import { fetchThread, PostCache, flattenThread } from 'skymarshal/threads';
import { degreeCentrality, calculatePageRank, detectCommunities } from 'skymarshal/graph';
import { calculateEngagementScore, isLikelyBot, classifyPostType } from 'skymarshal/analytics-utils';

// Database (browser IndexedDB)
import { IndexedDBProvider } from 'skymarshal/database';

// Validation
import { isValidAtUri, isValidHandle, validatePostText } from 'skymarshal/validation';

// Image processing (browser)
import { processImage, optimizeForBluesky } from 'skymarshal/image';
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  // Core types
  Profile,
  Post,
  Notification,
  Conversation,
  Message,
  List,
  FeedGenerator,
  AccountAnalysis,
  BotSignal,
  EngagementPreset,

  // Thread types (v2.2.0)
  ThreadPost,

  // Graph types (v2.2.0)
  GraphNode,
  GraphEdge,
  Community,
  GraphMetrics,
  OrbitDistribution,

  // Analytics types (v2.2.0)
  PostEngagement,
  AccountMetrics,
  AccountProfile,
  CleanupResult,
  PostType,

  // Manager types (v2.2.0)
  EngagementMetrics,
  DeletionOptions,
  DeletionResult,
  ParsedAtUri,
} from 'skymarshal';
```

## Related Projects

- **[@atproto/api](https://www.npmjs.com/package/@atproto/api)** - AT Protocol client (peer dependency)
- **[skymarshal (PyPI)](https://pypi.org/project/skymarshal/)** - Python CLI version
- **[Skymarshal Web](https://github.com/lukeslp/bsky-follow-analyzer)** - Web UI built with this package

## License

MIT © Luke Steuber
