# Thread Utilities

Thread fetching and caching utilities for Bluesky post threads, ported from [skymarshal-js](https://github.com/lukeslp/skymarshal-js) to work with `@atproto/api`.

## Features

- **Efficient Caching**: 5-minute TTL cache reduces API calls
- **Flexible Depth Control**: Fetch threads at different depths (1-1000)
- **Preview Loading**: Lightweight reply previews for scroll-triggered loading
- **Tree Utilities**: Flatten, search, count, and analyze thread trees
- **URL Resolution**: Convert Bluesky URLs to AT-URIs

## Installation

```bash
npm install skymarshal
```

## Quick Start

```typescript
import { AuthManager, fetchThread, flattenThread } from 'skymarshal';

// Authenticate
const auth = new AuthManager();
await auth.login('handle.bsky.social', 'app-password');

// Fetch thread
const thread = await fetchThread(auth.agent, 'at://did:plc:xxx/app.bsky.feed.post/abc');

// Flatten to array
const posts = flattenThread(thread);
console.log(`Thread contains ${posts.length} posts`);
```

## API Reference

### Core Functions

#### `fetchThread(agent, uri, depth?, parentHeight?)`

Fetch a thread from Bluesky with automatic caching.

**Parameters:**
- `agent: BskyAgent` - Authenticated agent instance
- `uri: string` - AT-URI of the post
- `depth?: number` - Reply nesting depth (default: 3, max: 1000)
- `parentHeight?: number` - Parent post levels (default: 80, max: 1000)

**Returns:** `Promise<ThreadPost>`

**Example:**
```typescript
// Default depth (3 levels)
const thread = await fetchThread(agent, uri);

// Deep thread (10 levels)
const deepThread = await fetchThread(agent, uri, 10);

// Only the post, no replies or parents
const single = await fetchThread(agent, uri, 0, 0);
```

---

#### `fetchPreviewReplies(agent, uri)`

Fetch only immediate replies (depth: 1) for lightweight preview loading.

**Parameters:**
- `agent: BskyAgent` - Authenticated agent instance
- `uri: string` - AT-URI of the post

**Returns:** `Promise<ThreadPost[]>` - Array of immediate replies

**Example:**
```typescript
const replies = await fetchPreviewReplies(agent, postUri);
console.log(`${replies.length} direct replies`);
```

**Use Case:** Scroll-triggered preview loading in UIs (inspired by Reddit's accordion model).

---

#### `flattenThread(thread)`

Convert a nested thread tree to a flat array in depth-first order.

**Parameters:**
- `thread: ThreadPost` - Root thread post

**Returns:** `ThreadPost[]` - Flat array of all posts

**Example:**
```typescript
const allPosts = flattenThread(thread);

// Use with virtual scrolling
allPosts.forEach((post, index) => {
  console.log(`${index}: @${post.author.handle}`);
});
```

---

#### `resolvePostUrl(agent, url)`

Convert a Bluesky post URL to an AT-URI.

**Parameters:**
- `agent: BskyAgent` - Authenticated agent instance
- `url: string` - Bluesky post URL

**Returns:** `Promise<string>` - AT-URI

**Example:**
```typescript
const url = 'https://bsky.app/profile/alice.bsky.social/post/abc123';
const uri = await resolvePostUrl(agent, url);
// uri = 'at://did:plc:xxx/app.bsky.feed.post/abc123'

const thread = await fetchThread(agent, uri);
```

---

### Tree Analysis Functions

#### `countThreadPosts(thread)`

Count total posts in a thread tree.

**Example:**
```typescript
const count = countThreadPosts(thread);
console.log(`Thread contains ${count} total posts`);
```

---

#### `getThreadDepth(thread)`

Get maximum nesting depth of a thread.

**Example:**
```typescript
const depth = getThreadDepth(thread);
console.log(`Thread depth: ${depth} levels`);
```

---

#### `findPostInThread(thread, uri)`

Find a specific post within a thread tree by URI.

**Example:**
```typescript
const post = findPostInThread(thread, 'at://did:plc:xxx/app.bsky.feed.post/def');
if (post) {
  console.log('Found:', post.record.text);
}
```

---

#### `getThreadAuthors(thread)`

Get all unique author DIDs participating in a thread.

**Example:**
```typescript
const authors = getThreadAuthors(thread);
console.log(`${authors.length} unique participants`);
```

---

### Cache Management

#### `PostCache` Class

In-memory cache with TTL for thread data.

**Methods:**
- `set(uri, data)` - Store a post
- `get(uri)` - Retrieve a post (null if expired/missing)
- `has(uri)` - Check if cached and not expired
- `clear()` - Clear all entries
- `setTTL(ms)` - Set custom TTL (default: 5 minutes)
- `size` - Get cache size

**Example:**
```typescript
import { PostCache } from 'skymarshal';

const cache = new PostCache();
cache.setTTL(10 * 60 * 1000); // 10 minutes

cache.set(uri, threadData);
const cached = cache.get(uri);
console.log(`Cache size: ${cache.size}`);
```

---

#### `getPostCache()`

Get the global cache instance.

**Example:**
```typescript
const cache = getPostCache();
cache.setTTL(15 * 60 * 1000); // 15 minutes
```

---

#### `clearPostCache()`

Clear the global cache.

**Example:**
```typescript
clearPostCache(); // Force fresh fetches
```

---

## Types

### `ThreadPost`

Simplified thread post structure:

```typescript
interface ThreadPost {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  record: {
    text: string;
    createdAt: string;
  };
  likeCount: number;
  replyCount: number;
  repostCount: number;
  replies?: ThreadPost[];
  parent?: ThreadPost;
}
```

## Usage Patterns

### Basic Thread Fetching

```typescript
const auth = new AuthManager();
await auth.login('handle.bsky.social', 'password');

const thread = await fetchThread(auth.agent, postUri);
console.log('Root post:', thread.record.text);
console.log('Replies:', thread.replies?.length || 0);
```

### Scroll-Triggered Preview Loading

Inspired by the accordion model from bluesky-accordion-client:

```typescript
// User scrolls to a collapsed post
// Intersection Observer detects visibility

async function handlePostVisible(uri: string) {
  // Fetch lightweight preview (depth: 1)
  const replies = await fetchPreviewReplies(agent, uri);

  // Display preview box with recent replies
  displayPreview(replies.slice(0, 3));
}

// User clicks to expand
async function handlePostExpand(uri: string) {
  // Fetch full thread (depth: 6)
  const thread = await fetchThread(agent, uri, 6);

  // Display complete thread tree
  displayFullThread(thread);
}
```

### Thread Statistics Dashboard

```typescript
const thread = await fetchThread(agent, uri, 10);

const stats = {
  totalPosts: countThreadPosts(thread),
  maxDepth: getThreadDepth(thread),
  participants: getThreadAuthors(thread).length,
  topLevelReplies: thread.replies?.length || 0,
};

console.log('Thread Statistics:', stats);
```

### Virtual Scrolling

```typescript
const thread = await fetchThread(agent, uri);
const flatPosts = flattenThread(thread);

// Use with react-window or similar
<VirtualList
  items={flatPosts}
  renderItem={(post) => <PostCard post={post} />}
/>
```

### Cache Performance Optimization

```typescript
// Configure cache for your use case
const cache = getPostCache();

// Short-lived cache for real-time threads
cache.setTTL(60 * 1000); // 1 minute

// Longer cache for archived threads
cache.setTTL(30 * 60 * 1000); // 30 minutes

// Clear cache on user refresh
function handleRefresh() {
  clearPostCache();
  fetchThread(agent, uri); // Fresh fetch
}
```

### Walking Thread Trees

```typescript
function walkThread(post: ThreadPost, depth: number = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}@${post.author.handle}: ${post.record.text}`);

  if (post.replies) {
    post.replies.forEach(reply => walkThread(reply, depth + 1));
  }
}

walkThread(thread);
```

## Performance Considerations

### Depth Strategy

- **depth: 1** - Preview mode (fastest, ~100ms)
- **depth: 3** - Default balanced loading (~200ms)
- **depth: 6** - Full conversation (~500ms)
- **depth: 10+** - Deep threads, may be slow (>1s)

### Caching Strategy

The cache reduces API calls for frequently accessed posts:

- **Hit rate**: ~70-90% for active threads
- **TTL**: 5 minutes default (configurable)
- **Memory**: ~5KB per cached thread

### Rate Limiting

Bluesky API has rate limits. Best practices:

1. Use caching (default 5-minute TTL)
2. Batch requests when possible
3. Implement exponential backoff (not included, add if needed)
4. Monitor `X-RateLimit-*` headers

## Differences from Original

This implementation differs from the original `bluesky-accordion-client/client/src/lib/atproto.ts`:

1. **Uses @atproto/api**: Authenticated agent instead of public API fetch
2. **Type-safe**: Full TypeScript types with AT Protocol definitions
3. **Enhanced utilities**: Additional tree analysis functions
4. **Validation imports**: Uses existing `validation.ts` functions
5. **ESM modules**: ES module format with `.js` extensions

## Migration from accordion-client

If migrating from the original accordion client:

```typescript
// Before (accordion-client)
import { fetchThread } from './lib/atproto';
const thread = await fetchThread(uri, 3);

// After (skymarshal)
import { AuthManager, fetchThread } from 'skymarshal';
const auth = new AuthManager();
await auth.login('handle', 'password');
const thread = await fetchThread(auth.agent, uri, 3);
```

## Related Managers

- **PostManager**: Create posts, threads, like/repost (see `managers/post.ts`)
- **ContentManager**: Fetch user posts and engagement (see `managers/content.ts`)
- **NetworkManager**: Analyze followers/following (see `managers/network.ts`)

## Credits

Originally implemented in [bluesky-accordion-client](https://github.com/lukeslp/bluesky-tools/tree/main/bluesky/bluesky-accordion-client) by Luke Steuber.

Ported to skymarshal-core with enhancements and @atproto/api integration.

## License

MIT License - Part of the skymarshal package.
