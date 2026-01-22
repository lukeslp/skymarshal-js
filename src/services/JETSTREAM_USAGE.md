# JetstreamService Usage Guide

The `JetstreamService` provides real-time streaming of Bluesky posts, likes, follows, and other events via the Jetstream WebSocket API.

## Quick Start

```typescript
import { JetstreamService } from 'skymarshal/jetstream';

// Create service instance
const jetstream = new JetstreamService({
  wantedCollections: ['app.bsky.feed.post', 'app.bsky.feed.like'],
  reconnectOnError: true,
  maxReconnectAttempts: 5
});

// Connect to Jetstream
await jetstream.connect();

// Listen for events
jetstream.on('post', (post) => {
  console.log(`New post from ${post.authorHandle}: ${post.text}`);
});

// Disconnect when done
await jetstream.disconnect();
```

## Configuration Options

```typescript
interface JetstreamOptions {
  /** WebSocket endpoint URL (default: wss://jetstream2.us-east.bsky.network/subscribe) */
  endpoint?: string;

  /** Filter by specific collection types */
  wantedCollections?: string[];

  /** Filter by specific DIDs */
  wantedDids?: string[];

  /** Auto-reconnect on error or close (default: true) */
  reconnectOnError?: boolean;

  /** Maximum reconnection attempts (0 = infinite, default: 5) */
  maxReconnectAttempts?: number;
}
```

### Common Collections

```typescript
const collections = {
  posts: 'app.bsky.feed.post',
  likes: 'app.bsky.feed.like',
  reposts: 'app.bsky.feed.repost',
  follows: 'app.bsky.graph.follow',
  blocks: 'app.bsky.graph.block',
  listItems: 'app.bsky.graph.listitem',
  profile: 'app.bsky.actor.profile'
};
```

## Event Listener Pattern

### Available Events

```typescript
// Connection events
jetstream.on('connected', (data) => {
  console.log('Connected at:', data.timestamp);
});

jetstream.on('disconnected', (data) => {
  console.log('Disconnected:', data.code, data.reason);
});

jetstream.on('error', (data) => {
  console.error('WebSocket error:', data.error);
});

// Data events
jetstream.on('commit', (event: JetstreamCommitEvent) => {
  // Any repo commit (create, update, delete)
  console.log('Commit:', event.commit.collection, event.commit.operation);
});

jetstream.on('identity', (event: JetstreamIdentityEvent) => {
  // Handle or DID changes
  console.log('Identity:', event.identity.handle, event.identity.did);
});

jetstream.on('account', (event: JetstreamAccountEvent) => {
  // Account status changes
  console.log('Account:', event.account.active, event.account.status);
});

jetstream.on('post', (post: JetstreamPost) => {
  // Simplified post structure (only for create operations)
  console.log('Post:', post.authorHandle, post.text);
});

// Error events
jetstream.on('parse_error', (data) => {
  console.error('Failed to parse message:', data.error);
});

jetstream.on('max_reconnect_reached', (data) => {
  console.error('Max reconnect attempts reached:', data.attempts);
});
```

### Removing Event Listeners

```typescript
const postHandler = (post) => {
  console.log(post.text);
};

// Add listener
jetstream.on('post', postHandler);

// Remove listener
jetstream.off('post', postHandler);
```

## Async Iterator Pattern

### Stream All Posts

```typescript
// Continuously stream posts
for await (const post of jetstream.streamPosts()) {
  console.log(`${post.authorHandle}: ${post.text}`);

  // Break on condition
  if (post.text.includes('stop')) {
    break;
  }
}
```

### Stream Posts from Specific User

```typescript
const userDid = 'did:plc:...';

for await (const event of jetstream.streamFromDid(userDid)) {
  if (event.kind === 'commit') {
    console.log('User action:', event.commit.collection, event.commit.operation);
  }
}
```

### Stream Mentions of a Handle

```typescript
// Stream posts mentioning @alice.bsky.social
for await (const post of jetstream.streamMentions('alice.bsky.social')) {
  console.log(`${post.authorHandle} mentioned alice: ${post.text}`);
}
```

## Practical Examples

### Real-time Post Counter

```typescript
const jetstream = new JetstreamService({
  wantedCollections: ['app.bsky.feed.post']
});

let postCount = 0;

jetstream.on('post', () => {
  postCount++;
  if (postCount % 100 === 0) {
    console.log(`Processed ${postCount} posts`);
  }
});

await jetstream.connect();
```

### Hashtag Tracker

```typescript
const jetstream = new JetstreamService({
  wantedCollections: ['app.bsky.feed.post']
});

const hashtagCounts = new Map<string, number>();

jetstream.on('post', (post) => {
  if (post.tags) {
    post.tags.forEach(tag => {
      hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
    });
  }
});

await jetstream.connect();

// Log top hashtags every 10 seconds
setInterval(() => {
  const top10 = Array.from(hashtagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('Top hashtags:', top10);
}, 10000);
```

### Follow Graph Builder

```typescript
const jetstream = new JetstreamService({
  wantedCollections: ['app.bsky.graph.follow']
});

const followGraph = new Map<string, Set<string>>();

jetstream.on('commit', (event) => {
  if (event.commit.operation === 'create' && event.commit.collection === 'app.bsky.graph.follow') {
    const follower = event.did;
    const subject = event.commit.record?.subject as string;

    if (!followGraph.has(follower)) {
      followGraph.set(follower, new Set());
    }
    followGraph.get(follower)!.add(subject);
  }
});

await jetstream.connect();
```

### Sentiment Analysis Stream

```typescript
import { JetstreamService } from 'skymarshal/jetstream';
import { SentimentService } from 'skymarshal/sentiment';

const jetstream = new JetstreamService({
  wantedCollections: ['app.bsky.feed.post']
});

const sentiment = new SentimentService();

jetstream.on('post', (post) => {
  const score = sentiment.analyze(post.text);

  if (score.category === 'positive' && score.compound > 0.5) {
    console.log(`Very positive post from ${post.authorHandle}:`, post.text);
  }
});

await jetstream.connect();
```

### Track Specific Users

```typescript
const jetstream = new JetstreamService({
  wantedDids: [
    'did:plc:ragtjsm2j2vknwkz3zp4oxrd', // @pfrazee.com
    'did:plc:z72i7hdynmk6r22z27h6tvur'  // @bsky.app
  ]
});

jetstream.on('commit', (event) => {
  const handle = jetstream.getHandle(event.did);
  console.log(`${handle || event.did} performed action:`, event.commit.operation);
});

await jetstream.connect();
```

## Auto-Reconnection

The service automatically reconnects on connection loss with exponential backoff:

```typescript
const jetstream = new JetstreamService({
  reconnectOnError: true,
  maxReconnectAttempts: 10 // 0 = infinite
});

// Monitor reconnection
jetstream.on('disconnected', () => {
  console.log('Disconnected, will auto-reconnect...');
});

jetstream.on('connected', () => {
  console.log('Reconnected successfully');
});

jetstream.on('max_reconnect_reached', (data) => {
  console.error(`Failed to reconnect after ${data.attempts} attempts`);
  // Handle permanent failure
});

await jetstream.connect();
```

**Backoff schedule:**
- Attempt 1: 1 second
- Attempt 2: 2 seconds
- Attempt 3: 4 seconds
- Attempt 4: 8 seconds
- Attempt 5: 16 seconds
- Max: 30 seconds (capped)

## Handle Resolution

The service automatically caches DID → handle mappings from identity events:

```typescript
const jetstream = new JetstreamService();

await jetstream.connect();

// Wait for some identity events to populate cache
await new Promise(resolve => setTimeout(resolve, 5000));

// Get handle for a DID
const handle = jetstream.getHandle('did:plc:...');
console.log('Handle:', handle);

// Get entire cache
const cache = jetstream.getHandleCache();
console.log('Cached handles:', cache.size);
```

## Browser vs Node.js

The service uses the **browser-native WebSocket API** for compatibility:

```typescript
// ✅ Works in browser
const jetstream = new JetstreamService();
await jetstream.connect();

// ✅ Works in Node.js (with polyfill if needed)
// Node 18+ has native WebSocket support
const jetstream = new JetstreamService();
await jetstream.connect();
```

For Node.js < 18, install a WebSocket polyfill:
```bash
npm install ws
```

```typescript
// Polyfill for older Node.js
import WebSocket from 'ws';
globalThis.WebSocket = WebSocket as any;
```

## Connection State

Check connection status:

```typescript
const jetstream = new JetstreamService();

console.log(jetstream.getConnectionState()); // 'disconnected'
console.log(jetstream.isConnected()); // false

await jetstream.connect();

console.log(jetstream.getConnectionState()); // 'connected'
console.log(jetstream.isConnected()); // true

await jetstream.disconnect();

console.log(jetstream.getConnectionState()); // 'disconnected'
```

## Error Handling

```typescript
const jetstream = new JetstreamService();

try {
  await jetstream.connect();
} catch (error) {
  console.error('Failed to connect:', error);
}

// Handle runtime errors
jetstream.on('error', (data) => {
  console.error('WebSocket error:', data.error);
});

jetstream.on('parse_error', (data) => {
  console.error('Failed to parse message:', data.error);
  console.log('Raw data:', data.data);
});
```

## Performance Considerations

### Memory Management

The service uses **queue-based async iterators** to prevent memory leaks:

```typescript
// Posts are queued only until consumed
for await (const post of jetstream.streamPosts()) {
  // Process post immediately
  await processPost(post);
}

// If not consumed, posts pile up in memory
// So always consume the iterator or use event listeners
```

### Event Listener Cleanup

Always remove event listeners when done:

```typescript
const handler = (post) => console.log(post.text);

jetstream.on('post', handler);

// Later...
jetstream.off('post', handler);
```

### Filtering at Source

Use `wantedCollections` to reduce network traffic:

```typescript
// ❌ BAD: Receive everything, filter client-side
const jetstream = new JetstreamService();
jetstream.on('commit', (event) => {
  if (event.commit.collection === 'app.bsky.feed.post') {
    // Process posts only
  }
});

// ✅ GOOD: Filter at source
const jetstream = new JetstreamService({
  wantedCollections: ['app.bsky.feed.post']
});
jetstream.on('commit', (event) => {
  // Only receive posts
});
```

## Complete Example: Real-time Dashboard

```typescript
import { JetstreamService, JetstreamPost } from 'skymarshal/jetstream';

class BlueskyDashboard {
  private jetstream: JetstreamService;
  private stats = {
    totalPosts: 0,
    postsPerMinute: 0,
    topHashtags: new Map<string, number>()
  };

  constructor() {
    this.jetstream = new JetstreamService({
      wantedCollections: ['app.bsky.feed.post'],
      reconnectOnError: true
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Connection status
    this.jetstream.on('connected', () => {
      console.log('✅ Connected to Jetstream');
      this.updateUI('status', 'connected');
    });

    this.jetstream.on('disconnected', () => {
      console.log('❌ Disconnected from Jetstream');
      this.updateUI('status', 'disconnected');
    });

    // Process posts
    this.jetstream.on('post', (post: JetstreamPost) => {
      this.stats.totalPosts++;

      // Track hashtags
      post.tags?.forEach(tag => {
        this.stats.topHashtags.set(
          tag,
          (this.stats.topHashtags.get(tag) || 0) + 1
        );
      });

      // Update UI
      this.updatePostFeed(post);
    });
  }

  async start() {
    await this.jetstream.connect();

    // Update stats every second
    setInterval(() => {
      this.updateStatsDisplay();
    }, 1000);
  }

  async stop() {
    await this.jetstream.disconnect();
  }

  private updateUI(element: string, value: string) {
    // Update DOM or state management
    console.log(`[${element}]: ${value}`);
  }

  private updatePostFeed(post: JetstreamPost) {
    // Add post to feed UI
    console.log(`📝 ${post.authorHandle}: ${post.text.slice(0, 50)}...`);
  }

  private updateStatsDisplay() {
    console.log('📊 Stats:', {
      totalPosts: this.stats.totalPosts,
      topHashtags: Array.from(this.stats.topHashtags.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    });
  }
}

// Usage
const dashboard = new BlueskyDashboard();
await dashboard.start();

// Stop after 60 seconds
setTimeout(() => dashboard.stop(), 60000);
```

## TypeScript Types

All types are fully documented and exported:

```typescript
import type {
  JetstreamOptions,
  JetstreamEvent,
  JetstreamCommitEvent,
  JetstreamIdentityEvent,
  JetstreamAccountEvent,
  JetstreamPost,
  EventHandler
} from 'skymarshal/jetstream';
```

## API Reference

See inline TypeDoc comments in `JetstreamService.ts` for complete API documentation.

### Key Methods

- `connect(): Promise<void>` - Connect to Jetstream WebSocket
- `disconnect(): Promise<void>` - Disconnect and cleanup
- `isConnected(): boolean` - Check connection status
- `on<T>(event: string, handler: EventHandler<T>): this` - Add event listener
- `off<T>(event: string, handler: EventHandler<T>): this` - Remove event listener
- `streamPosts(): AsyncIterableIterator<JetstreamPost>` - Stream all posts
- `streamFromDid(did: string): AsyncIterableIterator<JetstreamEvent>` - Stream from specific user
- `streamMentions(handle: string): AsyncIterableIterator<JetstreamPost>` - Stream mentions
- `getHandle(did: string): string | undefined` - Get cached handle for DID
- `getHandleCache(): Map<string, string>` - Get all cached handles
- `getConnectionState(): 'disconnected' | 'connecting' | 'connected'` - Get connection state
- `getReconnectAttempts(): number` - Get current reconnect attempt count

## Resources

- [Jetstream Documentation](https://docs.bsky.app/blog/jetstream)
- [Jetstream GitHub](https://github.com/bluesky-social/jetstream)
- [AT Protocol Docs](https://atproto.com/)
- [Bluesky API Docs](https://docs.bsky.app/)
