# skymarshal

**Comprehensive Bluesky/AT Protocol toolkit for TypeScript/JavaScript**

skymarshal provides everything you need to build Bluesky applications: authentication, content management, network analysis, chat/DMs, notifications, profile management, lists, feeds, bot detection, backup, AI-powered alt text, and sentiment analysis.

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
  AnalyticsManager,
} from 'skymarshal';

// Authenticate
const auth = new AuthManager();
await auth.login('myhandle.bsky.social', 'my-app-password');

// Content management
const content = new ContentManager(auth.agent);
const posts = await content.getPosts(auth.did!);

// Create posts with rich text, images, and threads
const post = new PostManager(auth.agent);
await post.createPost({ text: 'Hello from skymarshal!' });
await post.createThread([
  { text: 'Thread part 1' },
  { text: 'Thread part 2' },
]);

// Network analysis
const network = new NetworkManager(auth.agent);
const mutuals = await network.getMutuals(auth.did!);
const nonFollowers = await network.getNonFollowers(auth.did!);

// Chat/DMs
const chat = new ChatManager(auth.agent);
const convos = await chat.listConvos();
await chat.sendMessage(convos[0].id, 'Hello!');

// Notifications
const notifications = new NotificationManager(auth.agent);
const { notifications: notifs } = await notifications.listNotifications();
const unread = await notifications.getUnreadCount();

// Profile management
const profile = new ProfileManager(auth.agent);
await profile.updateProfile({ displayName: 'New Name', description: 'Updated bio' });

// Lists
const lists = new ListsManager(auth.agent);
await lists.createList({ name: 'My List', purpose: 'curatelist' });

// Feeds
const feeds = new FeedsManager(auth.agent);
const timeline = await feeds.getTimeline();
const savedFeeds = await feeds.getSavedFeeds();

// Bot detection
const analytics = new AnalyticsManager();
const analysis = analytics.batchAnalyze(mutuals);
console.log(`Found ${analysis.filter(a => a.botScore > 0.5).length} suspicious accounts`);
```

## Managers

| Manager | Description |
|---------|-------------|
| **AuthManager** | Session management, login/logout, token refresh |
| **ContentManager** | Get posts, likes, reposts with engagement scoring |
| **NetworkManager** | Following/followers, mutuals, follow/unfollow/block/mute |
| **ChatManager** | List conversations, send messages, reactions, mute/leave |
| **NotificationManager** | List notifications, mark read, get unread count, filter by type |
| **ProfileManager** | Get/update profile, avatar, banner, search profiles |
| **PostManager** | Create posts/threads, delete, like/unlike, repost/unrepost |
| **ListsManager** | Create/delete lists, add/remove members, mute/block lists |
| **FeedsManager** | Timeline, custom feeds, save/pin feeds, search feeds |
| **AnalyticsManager** | Bot detection, engagement analysis, dead thread detection |
| **SearchManager** | Keyword search with operators, engagement filtering |

## Services

| Service | Description |
|---------|-------------|
| **BackupService** | CAR file export for account backup |
| **VisionService** | AI-powered alt text generation (OpenAI, Anthropic, Ollama) |
| **SentimentService** | VADER-based text sentiment analysis |

## Utilities

| Utility | Description |
|---------|-------------|
| **EngagementCache** | Age-based TTL caching for engagement data |
| **PaginationHelper** | Cursor-based pagination helpers |
| **ExportHelper** | CSV/JSON export utilities |
| **DateUtils** | Date formatting and relative time |
| **BatchUtils** | Batch processing with concurrency control |
| **UriUtils** | AT URI parsing utilities |

## Subpath Imports

Import only what you need:

```typescript
import { AuthManager } from 'skymarshal/auth';
import { PostManager } from 'skymarshal/post';
import { NotificationManager } from 'skymarshal/notifications';
import { ListsManager } from 'skymarshal/lists';
import { FeedsManager } from 'skymarshal/feeds';
```

## Related Packages

- **[@atproto/api](https://www.npmjs.com/package/@atproto/api)** - AT Protocol client (peer dependency)
- **[skymarshal (PyPI)](https://pypi.org/project/skymarshal/)** - Python CLI version

## License

MIT © Luke Steuber
