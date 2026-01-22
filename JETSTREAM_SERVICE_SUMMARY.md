# JetstreamService Implementation Summary

## Overview

Created a comprehensive real-time streaming service for the Bluesky network via the Jetstream WebSocket API. The service is browser-compatible, fully typed, and provides both EventEmitter-style and async iterator patterns for consuming the firehose.

## Files Created

### 1. Core Service (`src/services/JetstreamService.ts`)
**Lines:** 900+
**Features:**
- Browser-native WebSocket API (no Node.js `ws` dependency)
- Auto-reconnection with exponential backoff
- EventEmitter pattern (`on`/`off` methods)
- Async iterator support (`streamPosts()`, `streamFromDid()`, `streamMentions()`)
- DID → handle caching from identity events
- Filter by collections and DIDs at source
- Full TypeScript types with JSDoc comments
- Memory-safe queue-based iterators

**Key Methods:**
```typescript
connect(): Promise<void>
disconnect(): Promise<void>
isConnected(): boolean
on<T>(event: string, handler: EventHandler<T>): this
off<T>(event: string, handler: EventHandler<T>): this
streamPosts(): AsyncIterableIterator<JetstreamPost>
streamFromDid(did: string): AsyncIterableIterator<JetstreamEvent>
streamMentions(handle: string): AsyncIterableIterator<JetstreamPost>
getHandle(did: string): string | undefined
getHandleCache(): Map<string, string>
getConnectionState(): 'disconnected' | 'connecting' | 'connected'
getReconnectAttempts(): number
```

**Event Types:**
- `connected` - Connection established
- `disconnected` - Connection closed
- `error` - WebSocket error
- `commit` - Any repo commit (create/update/delete)
- `identity` - Handle/DID changes
- `account` - Account status changes
- `post` - New post created (simplified)
- `parse_error` - Failed to parse message
- `max_reconnect_reached` - Reconnection limit hit

### 2. Usage Guide (`src/services/JETSTREAM_USAGE.md`)
**Lines:** 800+
**Content:**
- Quick start examples
- Configuration options
- Event listener patterns
- Async iterator patterns
- Practical examples (hashtag tracker, follow graph, sentiment analysis)
- Auto-reconnection documentation
- Handle resolution details
- Browser vs Node.js compatibility
- Performance considerations
- Complete API reference

**Examples Included:**
- Real-time post counter
- Hashtag tracker
- Follow graph builder
- Sentiment analysis stream
- Track specific users
- Real-time dashboard (complete example)

### 3. Example Code (`examples/jetstream-example.ts`)
**Lines:** 500+
**Examples:**
1. Basic Post Streaming (30s runtime)
2. Async Iterator Pattern (20 posts)
3. Hashtag Tracker (60s runtime)
4. Multi-Event Handling (posts + likes + follows)
5. Handle Cache Usage
6. Error Handling & Reconnection

**Run Examples:**
```bash
# Example 1: Basic streaming
tsx examples/jetstream-example.ts 1

# Example 3: Hashtag tracker
tsx examples/jetstream-example.ts 3
```

### 4. Package Configuration Updates

#### `src/services/index.ts`
Added exports:
```typescript
export {
  JetstreamService,
  type JetstreamOptions,
  type JetstreamEvent,
  type JetstreamCommitEvent,
  type JetstreamIdentityEvent,
  type JetstreamAccountEvent,
  type JetstreamPost,
  type EventHandler,
} from './JetstreamService.js';
```

#### `package.json`
Added subpath export:
```json
"./jetstream": {
  "types": "./dist/services/JetstreamService.d.ts",
  "import": "./dist/services/JetstreamService.js"
}
```

#### `README.md`
- Added JetstreamService to services table
- Included detailed usage section with code examples
- Added to subpath imports documentation
- Linked to JETSTREAM_USAGE.md

## TypeScript Types

All types are fully documented and exported:

```typescript
// Configuration
interface JetstreamOptions {
  endpoint?: string;
  wantedCollections?: string[];
  wantedDids?: string[];
  reconnectOnError?: boolean;
  maxReconnectAttempts?: number;
}

// Events
interface JetstreamCommitEvent {
  kind: 'commit';
  did: string;
  time_us: number;
  commit: {
    rev: string;
    operation: 'create' | 'update' | 'delete';
    collection: string;
    rkey: string;
    record?: Record<string, unknown>;
    cid?: string;
  };
}

interface JetstreamIdentityEvent {
  kind: 'identity';
  did: string;
  time_us: number;
  identity: {
    did: string;
    handle: string;
    seq: number;
    time: string;
  };
}

interface JetstreamAccountEvent {
  kind: 'account';
  did: string;
  time_us: number;
  account: {
    active: boolean;
    status?: string;
    seq: number;
    time: string;
  };
}

type JetstreamEvent =
  | JetstreamCommitEvent
  | JetstreamIdentityEvent
  | JetstreamAccountEvent;

// Simplified post structure
interface JetstreamPost {
  uri: string;
  cid: string;
  authorDid: string;
  authorHandle?: string;
  text: string;
  createdAt: string;
  hasMedia?: boolean;
  replyParent?: string;
  replyRoot?: string;
  mentions?: string[];
  tags?: string[];
  links?: string[];
}
```

## Implementation Patterns

### 1. EventEmitter Pattern
```typescript
const jetstream = new JetstreamService();

jetstream.on('post', (post) => {
  console.log(post.text);
});

jetstream.on('commit', (event) => {
  console.log(event.commit.collection);
});

await jetstream.connect();
```

### 2. Async Iterator Pattern
```typescript
const jetstream = new JetstreamService();
await jetstream.connect();

for await (const post of jetstream.streamPosts()) {
  console.log(post.text);
  if (shouldStop) break;
}
```

### 3. Auto-Reconnection
```typescript
const jetstream = new JetstreamService({
  reconnectOnError: true,
  maxReconnectAttempts: 5
});

// Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
```

### 4. Handle Caching
```typescript
// Automatically builds cache from identity events
jetstream.on('identity', (event) => {
  // Cache updated internally: DID → handle
});

// Retrieve cached handle
const handle = jetstream.getHandle('did:plc:...');
```

## Integration with Existing Patterns

The service follows patterns from the firehose implementations:

### Ported from `/html/bluesky/unified/server/src/socket/jetstream.ts`
- WebSocket connection management
- Stats tracking
- Reconnection logic
- Event emission patterns

### Ported from `/html/firehose/server/firehose.ts`
- Identity caching
- Handle resolution
- Sentiment/feature extraction patterns (adapted)
- Event-driven architecture

### Browser Compatibility
Unlike the Node.js firehose implementations that use the `ws` package, this service uses the **native WebSocket API** available in browsers and Node.js 18+.

## Features Not Implemented

The following features are intentionally NOT included (can be added later if needed):

1. **Database persistence** - Service is streaming-only
2. **Sentiment analysis** - Use SentimentService separately
3. **Stats aggregation** - Consumers handle their own stats
4. **Message filtering** - Filter at source via `wantedCollections`
5. **Collection windows** - No time-windowed sampling

These were deliberately excluded to keep the service focused on streaming only. Consumers can compose additional functionality using the event/iterator patterns.

## Usage in Projects

### Import in Browser
```typescript
import { JetstreamService } from 'skymarshal/jetstream';
```

### Import in Node.js
```typescript
import { JetstreamService } from 'skymarshal/jetstream';
// Node.js 18+ has native WebSocket
```

### With Build Tool (Vite/Webpack)
```typescript
import { JetstreamService } from 'skymarshal/jetstream';
// Tree-shakes automatically
```

## Testing

TypeScript compilation verified:
```bash
npx tsc --noEmit src/services/JetstreamService.ts
# ✅ No errors
```

Pre-existing errors in `src/utils/index.ts` are unrelated to JetstreamService.

## Next Steps

To use the service in production:

1. **Build the package:**
   ```bash
   pnpm build
   ```

2. **Publish to npm:**
   ```bash
   npm version patch
   npm publish
   ```

3. **Use in applications:**
   ```bash
   npm install skymarshal
   ```

4. **Import and use:**
   ```typescript
   import { JetstreamService } from 'skymarshal/jetstream';
   const jetstream = new JetstreamService();
   await jetstream.connect();
   ```

## Documentation

- **Main docs:** `README.md` (updated with JetstreamService section)
- **Detailed guide:** `src/services/JETSTREAM_USAGE.md` (800+ lines)
- **Code examples:** `examples/jetstream-example.ts` (6 examples)
- **JSDoc comments:** Inline in `src/services/JetstreamService.ts`

## API Compatibility

Follows the official Jetstream API specification:
- **Endpoint:** `wss://jetstream2.us-east.bsky.network/subscribe`
- **Docs:** https://docs.bsky.app/blog/jetstream
- **GitHub:** https://github.com/bluesky-social/jetstream

## Collections Reference

Common collections for filtering:

| Collection | Description |
|-----------|-------------|
| `app.bsky.feed.post` | Posts |
| `app.bsky.feed.like` | Likes |
| `app.bsky.feed.repost` | Reposts |
| `app.bsky.graph.follow` | Follows |
| `app.bsky.graph.block` | Blocks |
| `app.bsky.graph.listitem` | List items |
| `app.bsky.actor.profile` | Profile updates |

## Performance Characteristics

- **Memory:** Queue-based iterators prevent unbounded growth
- **Reconnection:** Exponential backoff (1s → 30s max)
- **Filtering:** Server-side via query parameters
- **Parsing:** JSON.parse per message (~1-5KB each)
- **Throughput:** 10-50 posts/second typical, 100+ posts/second peak

## Credits

Implementation inspired by:
- `/html/bluesky/unified/server/src/socket/jetstream.ts` (Socket.IO integration)
- `/html/firehose/server/firehose.ts` (FirehoseService patterns)
- Jetstream official docs and examples

Created for skymarshal-core package by Luke Steuber.
