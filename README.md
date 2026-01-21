# skymarshal-core

Bluesky content management toolkit for TypeScript/JavaScript. Provides authentication, content filtering, search, and engagement analysis for Bluesky/AT Protocol applications.

## Installation

```bash
npm install skymarshal-core
```

## Features

- **AuthManager** - Bluesky authentication with session persistence
- **SearchManager** - Advanced content filtering and search
- **Engagement Analysis** - Statistics, scoring, and categorization
- **TypeScript** - Full type definitions included

## Quick Start

```typescript
import { AuthManager, SearchManager } from 'skymarshal-core';

// Authenticate with Bluesky
const auth = new AuthManager();
await auth.login('myhandle.bsky.social', 'my-app-password');

console.log(`Logged in as ${auth.handle}`);

// Access the underlying BskyAgent for API calls
const agent = auth.agent;
const profile = await agent.getProfile({ actor: auth.did! });
```

## Authentication

### Basic Login

```typescript
import { AuthManager } from 'skymarshal-core';

const auth = new AuthManager({
  service: 'https://bsky.social', // default
});

// Login with handle and app password
await auth.login('username.bsky.social', 'xxxx-xxxx-xxxx-xxxx');

// Check authentication status
if (auth.isAuthenticated()) {
  console.log(`DID: ${auth.did}`);
  console.log(`Handle: ${auth.handle}`);
}

// Get profile
const profile = await auth.getProfile();

// Logout
await auth.logout();
```

### Session Persistence

```typescript
import { AuthManager, LocalStorageAdapter } from 'skymarshal-core';

// Browser: Use localStorage
const auth = new AuthManager({
  storage: new LocalStorageAdapter('myapp_'),
});

// Resume previous session
const resumed = await auth.resumeSession();
if (resumed) {
  console.log('Session restored');
} else {
  await auth.login('handle', 'password');
}
```

### Custom Storage

```typescript
import { AuthManager, SessionStorage } from 'skymarshal-core';

// Implement custom storage (e.g., for React Native)
class SecureStorage implements SessionStorage {
  async get(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  }
  async set(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  }
  async remove(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  }
}

const auth = new AuthManager({
  storage: new SecureStorage(),
});
```

## Content Search & Filtering

### Basic Filtering

```typescript
import { SearchManager, ContentItem, SearchFilters } from 'skymarshal-core';

const search = new SearchManager();

// Filter by engagement
const filters: SearchFilters = {
  minLikes: 10,
  contentType: 'posts',
};

const results = search.filterContent(items, filters);
```

### Advanced Search

```typescript
// Keyword search with operators
const filters: SearchFilters = {
  keywords: [
    'typescript',       // case-insensitive match
    '"exact phrase"',   // exact match (case-sensitive)
    '-spam',            // exclude items containing "spam"
    '+required',        // must contain "required"
  ],
  minEngagement: 5,
  maxEngagement: 1000,
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  contentType: 'posts',
};

const results = search.filterContent(items, filters);
```

### Sorting

```typescript
// Sort by various criteria
const sorted = search.sortResults(results, 'eng_desc');

// Available sort modes:
// 'newest', 'oldest', 'eng_desc', 'eng_asc',
// 'likes_desc', 'replies_desc', 'reposts_desc'
```

### Engagement Presets

```typescript
// Get preset thresholds based on user's average engagement
search.updateSettings({ avgLikesPerPost: 15 });
const presets = search.getEngagementPresets();

// Apply preset filter
const deadThreads = search.filterContent(items, presets.dead);
const bangers = search.filterContent(items, presets.bangers);
```

## Engagement Analysis

### Calculate Statistics

```typescript
import { SearchManager } from 'skymarshal-core';

const search = new SearchManager();
const stats = search.calculateStatistics(items);

console.log(`Total items: ${stats.totalItems}`);
console.log(`Total likes: ${stats.totalLikes}`);
console.log(`Average engagement: ${stats.avgEngagement}`);
console.log(`Top performers: ${stats.topItems.length}`);
console.log(`Dead threads: ${stats.deadItems.length}`);
```

### Engagement Scoring

```typescript
import { calculateEngagementScore } from 'skymarshal-core';

// Weighted formula: likes + (2 × reposts) + (2.5 × replies)
const score = calculateEngagementScore(10, 5, 3);
// = 10 + (2 × 5) + (2.5 × 3) = 27.5
```

## Data Models

### ContentItem

```typescript
interface ContentItem {
  uri: string;           // AT Protocol URI
  cid: string;           // Content identifier
  contentType: ContentType;
  text?: string;
  createdAt?: string;    // ISO timestamp
  replyCount: number;
  repostCount: number;
  likeCount: number;
  engagementScore: number;
  rawData?: Record<string, unknown>;
}
```

### SearchFilters

```typescript
interface SearchFilters {
  keywords?: string[];
  minEngagement?: number;
  maxEngagement?: number;
  minLikes?: number;
  maxLikes?: number;
  minReposts?: number;
  maxReposts?: number;
  minReplies?: number;
  maxReplies?: number;
  contentType?: ContentType;
  startDate?: string;
  endDate?: string;
  subjectContains?: string;
  subjectHandleContains?: string;
}
```

## Related Packages

- **[@atproto/api](https://www.npmjs.com/package/@atproto/api)** - AT Protocol client (peer dependency)
- **[skymarshal](https://pypi.org/project/skymarshal/)** - Python CLI version

## License

MIT © Luke Steuber
