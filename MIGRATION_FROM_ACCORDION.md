# Migration Guide: accordion-client → skymarshal

Quick reference for migrating from `bluesky-accordion-client/client/src/lib/atproto.ts` to `skymarshal` thread utilities.

## Installation

```bash
# Before (accordion-client)
# Functions were part of the client source code

# After (skymarshal)
npm install skymarshal
```

## Authentication

### Before (accordion-client)
```typescript
// Used public API, no authentication required
import { fetchThread } from './lib/atproto';

const thread = await fetchThread(uri, depth);
```

### After (skymarshal)
```typescript
// Requires authenticated agent
import { AuthManager, fetchThread } from 'skymarshal';

const auth = new AuthManager();
await auth.login('handle.bsky.social', 'app-password');

const thread = await fetchThread(auth.agent, uri, depth);
```

## Function Signatures

### fetchThread

**Before:**
```typescript
function fetchThread(uri: string, depth?: number): Promise<ThreadPost>
```

**After:**
```typescript
function fetchThread(
  agent: BskyAgent,
  uri: string,
  depth?: number,
  parentHeight?: number
): Promise<ThreadPost>
```

**Migration:**
```typescript
// Before
const thread = await fetchThread(postUri, 3);

// After
const thread = await fetchThread(auth.agent, postUri, 3);
```

### fetchPreviewReplies

**Before:**
```typescript
function fetchPreviewReplies(uri: string): Promise<ThreadPost[]>
```

**After:**
```typescript
function fetchPreviewReplies(
  agent: BskyAgent,
  uri: string
): Promise<ThreadPost[]>
```

**Migration:**
```typescript
// Before
const replies = await fetchPreviewReplies(postUri);

// After
const replies = await fetchPreviewReplies(auth.agent, postUri);
```

### flattenThread

**No change required:**
```typescript
// Before and After - same signature
const flat = flattenThread(thread);
```

### isValidAtUri

**No change required - now imported from validation:**
```typescript
// Before
import { isValidAtUri } from './lib/atproto';

// After
import { isValidAtUri } from 'skymarshal';
// or
import { isValidAtUri } from 'skymarshal/validation';
```

### parsePostUrl

**Before:**
```typescript
// Returned { handle, postId } or null
const parsed = parsePostUrl(url);
// { handle: 'user.bsky.social', postId: 'abc123' }
```

**After:**
```typescript
// Same return type, now imported from validation
import { parsePostUrl } from 'skymarshal';
const parsed = parsePostUrl(url);
```

**New enhanced function:**
```typescript
// Full URL → AT-URI resolution
import { resolvePostUrl } from 'skymarshal';
const uri = await resolvePostUrl(auth.agent, url);
// 'at://did:plc:xxx/app.bsky.feed.post/abc123'
```

### Cache Management

**Before:**
```typescript
import { clearPostCache } from './lib/atproto';
clearPostCache();
```

**After:**
```typescript
import { clearPostCache, getPostCache } from 'skymarshal';

// Clear cache
clearPostCache();

// Access cache instance for advanced operations
const cache = getPostCache();
cache.setTTL(10 * 60 * 1000); // 10 minutes
console.log(`Cache size: ${cache.size}`);
```

## New Utilities (Not in Original)

### countThreadPosts
```typescript
import { countThreadPosts } from 'skymarshal';
const total = countThreadPosts(thread);
```

### getThreadDepth
```typescript
import { getThreadDepth } from 'skymarshal';
const depth = getThreadDepth(thread);
```

### findPostInThread
```typescript
import { findPostInThread } from 'skymarshal';
const post = findPostInThread(thread, searchUri);
```

### getThreadAuthors
```typescript
import { getThreadAuthors } from 'skymarshal';
const authorDids = getThreadAuthors(thread);
```

## Type Definitions

### ThreadPost

**Before:**
```typescript
interface ThreadPost {
  uri: string;
  cid: string;
  author: { did, handle, displayName?, avatar? };
  record: { text, createdAt };
  likeCount: number;
  replyCount: number;
  repostCount: number;
  replies?: ThreadPost[];
}
```

**After:**
```typescript
// Same structure, now includes optional parent
interface ThreadPost {
  uri: string;
  cid: string;
  author: { did, handle, displayName?, avatar? };
  record: { text, createdAt };
  likeCount: number;
  replyCount: number;
  repostCount: number;
  replies?: ThreadPost[];
  parent?: ThreadPost;  // NEW
}
```

## Complete Migration Example

### Before (accordion-client)
```typescript
import {
  fetchThread,
  fetchPreviewReplies,
  flattenThread,
  clearPostCache,
  isValidAtUri,
} from './lib/atproto';

// Direct API usage
const thread = await fetchThread(postUri, 3);
const replies = await fetchPreviewReplies(postUri);
const flat = flattenThread(thread);

if (isValidAtUri(someUri)) {
  clearPostCache();
  const fresh = await fetchThread(someUri, 10);
}
```

### After (skymarshal)
```typescript
import {
  AuthManager,
  fetchThread,
  fetchPreviewReplies,
  flattenThread,
  clearPostCache,
  isValidAtUri,
  countThreadPosts,
  getThreadDepth,
} from 'skymarshal';

// Setup authentication
const auth = new AuthManager();
await auth.login('handle.bsky.social', 'app-password');

// Same functionality with agent
const thread = await fetchThread(auth.agent, postUri, 3);
const replies = await fetchPreviewReplies(auth.agent, postUri);
const flat = flattenThread(thread);

// Additional utilities
const stats = {
  total: countThreadPosts(thread),
  depth: getThreadDepth(thread),
};

if (isValidAtUri(someUri)) {
  clearPostCache();
  const fresh = await fetchThread(auth.agent, someUri, 10);
}
```

## Error Handling

### Before
```typescript
try {
  const thread = await fetchThread(uri);
} catch (error) {
  // HTTP errors from fetch
  if (error.message.includes('404')) {
    console.log('Post not found');
  }
}
```

### After
```typescript
try {
  const thread = await fetchThread(agent, uri);
} catch (error) {
  // @atproto/api errors
  if (error.message.includes('Post not found')) {
    console.log('Post not found or blocked');
  }
}
```

## Import Paths

### Named Imports (Recommended)
```typescript
import {
  AuthManager,
  fetchThread,
  PostCache,
} from 'skymarshal';
```

### Subpath Imports
```typescript
// Direct thread utilities
import { fetchThread } from 'skymarshal/threads';

// Validation utilities
import { isValidAtUri } from 'skymarshal/validation';

// All utilities
import * as utils from 'skymarshal/utils';
```

## Key Differences Summary

| Feature | accordion-client | skymarshal |
|---------|-----------------|------------|
| **Authentication** | Public API (no auth) | Requires BskyAgent |
| **Import path** | Relative `./lib/atproto` | npm package `skymarshal` |
| **Function signature** | `fetchThread(uri, depth)` | `fetchThread(agent, uri, depth)` |
| **Type safety** | Basic types | Full @atproto/api types |
| **Additional utilities** | None | 6+ tree analysis functions |
| **Cache access** | Only clear | Full cache management |
| **URL resolution** | Partial | Full URL → AT-URI |
| **Module format** | Client bundle | ESM with type definitions |

## Breaking Changes

1. **Authentication required**: Must provide `BskyAgent` to all fetch functions
2. **Function signatures**: All fetch functions now take `agent` as first parameter
3. **Import path**: Changed from relative path to npm package
4. **Error types**: Now uses @atproto/api error types instead of fetch errors

## Non-Breaking Changes

- `flattenThread()` signature unchanged
- `isValidAtUri()` signature unchanged (now from validation)
- `clearPostCache()` signature unchanged
- `ThreadPost` interface mostly unchanged (added optional `parent`)
- Cache TTL still defaults to 5 minutes

## Recommended Migration Steps

1. **Install skymarshal**: `npm install skymarshal`
2. **Add authentication**: Create AuthManager and login
3. **Update imports**: Change from relative to package imports
4. **Add agent parameter**: Pass `auth.agent` to fetch functions
5. **Update error handling**: Handle @atproto/api errors
6. **Test thoroughly**: Verify thread fetching works as expected
7. **Consider new utilities**: Use tree analysis functions if helpful

## Benefits of Migration

1. **Type safety**: Full TypeScript types from @atproto/api
2. **Maintainability**: Updates via npm instead of copying code
3. **Additional features**: 6+ new utility functions
4. **Better errors**: Structured error types instead of HTTP errors
5. **Cache management**: Full control over cache behavior
6. **Authentication**: Access to private posts (with proper auth)
7. **Integration**: Works with other skymarshal managers

## Support

For issues or questions:
- GitHub: https://github.com/lukeslp/skymarshal-js
- Docs: `docs/THREADS.md` in package
- Examples: `examples/threads-example.ts`
