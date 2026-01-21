# skymarshal-core

**Comprehensive Bluesky/AT Protocol toolkit for TypeScript/JavaScript**

skymarshal-core provides everything you need to build Bluesky applications: authentication, content management, network analysis, chat/DMs, bot detection, backup, AI-powered alt text, and sentiment analysis.

## Installation

```bash
npm install skymarshal-core @atproto/api
```

## Quick Start

```typescript
import {
  AuthManager,
  ContentManager,
  NetworkManager,
  ChatManager,
  AnalyticsManager,
} from 'skymarshal-core';

// Authenticate
const auth = new AuthManager();
await auth.login('myhandle.bsky.social', 'my-app-password');

// Content management
const content = new ContentManager(auth.agent);
const posts = await content.getPosts(auth.did!);
await content.createPost('Hello from skymarshal!');

// Network analysis
const network = new NetworkManager(auth.agent);
const mutuals = await network.getMutuals(auth.did!);
const nonFollowers = await network.getNonFollowers(auth.did!);

// Chat/DMs
const chat = new ChatManager(auth.agent);
const convos = await chat.listConvos();
await chat.sendMessage(convos[0].id, 'Hello!');

// Bot detection
const analytics = new AnalyticsManager();
const analysis = analytics.batchAnalyze(mutuals);
console.log(\`Found \${analysis.filter(a => a.botScore > 0.5).length} suspicious accounts\`);
```

## Features

| Category | Components | Description |
|----------|------------|-------------|
| **Managers** | AuthManager, ContentManager, NetworkManager, ChatManager, AnalyticsManager, SearchManager | Core functionality for authentication, content CRUD, social graph, DMs, bot detection, and filtering |
| **Services** | BackupService, VisionService, SentimentService | Extended features for CAR backup, AI alt text, and text sentiment |
| **Utilities** | EngagementCache, PaginationHelper, ExportHelper, DateUtils, BatchUtils | Shared helpers for caching, pagination, export, and batch processing |

## Related Packages

- **[@atproto/api](https://www.npmjs.com/package/@atproto/api)** - AT Protocol client (peer dependency)
- **[skymarshal](https://pypi.org/project/skymarshal/)** - Python CLI version

## License

MIT © Luke Steuber
