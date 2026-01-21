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
import { AuthManager } from 'skymarshal/managers';
import { VisionService } from 'skymarshal/services';
import { EngagementCache } from 'skymarshal/utils';
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
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
} from 'skymarshal';
```

## Related Projects

- **[@atproto/api](https://www.npmjs.com/package/@atproto/api)** - AT Protocol client (peer dependency)
- **[skymarshal (PyPI)](https://pypi.org/project/skymarshal/)** - Python CLI version
- **[Skymarshal Web](https://github.com/lukeslp/bsky-follow-analyzer)** - Web UI built with this package

## License

MIT © Luke Steuber
