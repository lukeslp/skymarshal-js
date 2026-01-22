/**
 * Thread fetching and caching utilities for Bluesky post threads
 *
 * Provides efficient thread management with TTL-based caching:
 * - PostCache class with 5-minute TTL
 * - fetchThread(uri, depth) - fetch nested thread trees
 * - fetchPreviewReplies(uri) - lightweight reply preview (depth 1)
 * - flattenThread(thread) - convert tree to flat array
 * - clearPostCache() - cache management
 *
 * Ported from bluesky-accordion-client to work with @atproto/api.
 */
import { AppBskyFeedDefs } from '@atproto/api';
import { parsePostUrl } from './validation.js';
/**
 * PostCache - Simple in-memory cache with TTL
 *
 * Caches thread data to reduce API calls for frequently accessed posts.
 * Default TTL: 5 minutes
 */
export class PostCache {
    cache = new Map();
    ttl = 5 * 60 * 1000; // 5 minutes
    /**
     * Store a post in cache
     */
    set(uri, data) {
        this.cache.set(uri, { data, timestamp: Date.now() });
    }
    /**
     * Retrieve a post from cache if not expired
     * Returns null if not found or expired
     */
    get(uri) {
        const entry = this.cache.get(uri);
        if (!entry)
            return null;
        const isExpired = Date.now() - entry.timestamp > this.ttl;
        if (isExpired) {
            this.cache.delete(uri);
            return null;
        }
        return entry.data;
    }
    /**
     * Clear all cached posts
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Get cache size
     */
    get size() {
        return this.cache.size;
    }
    /**
     * Check if a URI is cached and not expired
     */
    has(uri) {
        return this.get(uri) !== null;
    }
    /**
     * Set custom TTL (in milliseconds)
     */
    setTTL(ttl) {
        this.ttl = ttl;
    }
}
// Global cache instance
const postCache = new PostCache();
/**
 * Map AT Protocol thread response to simplified ThreadPost structure
 */
function mapThreadPost(thread) {
    const post = thread.post;
    const threadPost = {
        uri: post.uri,
        cid: post.cid,
        author: {
            did: post.author.did,
            handle: post.author.handle,
            displayName: post.author.displayName,
            avatar: post.author.avatar,
        },
        record: {
            text: post.record?.text || '',
            createdAt: post.record?.createdAt || post.indexedAt,
        },
        likeCount: post.likeCount || 0,
        replyCount: post.replyCount || 0,
        repostCount: post.repostCount || 0,
    };
    // Map parent if present
    if (thread.parent && AppBskyFeedDefs.isThreadViewPost(thread.parent)) {
        threadPost.parent = mapThreadPost(thread.parent);
    }
    // Map replies if present
    if (thread.replies && Array.isArray(thread.replies)) {
        threadPost.replies = thread.replies
            .filter((r) => AppBskyFeedDefs.isThreadViewPost(r))
            .map((r) => mapThreadPost(r));
    }
    return threadPost;
}
/**
 * Fetch a thread from Bluesky using authenticated agent
 *
 * @param agent - Authenticated BskyAgent instance
 * @param uri - AT-URI of the post (e.g., at://did:plc:xxx/app.bsky.feed.post/abc123)
 * @param depth - How many levels of reply depth to include (default: 3, max: 1000)
 * @param parentHeight - How many parent posts to include (default: 80, max: 1000)
 * @returns Promise<ThreadPost> - The thread tree
 *
 * @example
 * ```ts
 * const auth = new AuthManager();
 * await auth.login('handle.bsky.social', 'app-password');
 * const thread = await fetchThread(auth.agent, 'at://did:plc:xxx/app.bsky.feed.post/abc');
 * ```
 */
export async function fetchThread(agent, uri, depth = 3, parentHeight = 80) {
    // Check cache first
    const cached = postCache.get(uri);
    if (cached) {
        return cached;
    }
    // Fetch from API
    const response = await agent.getPostThread({
        uri,
        depth,
        parentHeight,
    });
    if (!AppBskyFeedDefs.isThreadViewPost(response.data.thread)) {
        throw new Error('Post not found, blocked, or not a thread view post');
    }
    const thread = mapThreadPost(response.data.thread);
    // Cache the result
    postCache.set(uri, thread);
    return thread;
}
/**
 * Fetch only immediate replies (preview) for a collapsed post
 * Uses depth: 1 for lightweight preview loading
 *
 * @param agent - Authenticated BskyAgent instance
 * @param uri - AT-URI of the post
 * @returns Promise<ThreadPost[]> - Array of immediate replies
 *
 * @example
 * ```ts
 * const replies = await fetchPreviewReplies(auth.agent, postUri);
 * console.log(`${replies.length} immediate replies`);
 * ```
 */
export async function fetchPreviewReplies(agent, uri) {
    const thread = await fetchThread(agent, uri, 1, 0);
    return thread.replies || [];
}
/**
 * Extract a flat list of all posts from a thread tree (for virtual scrolling)
 * Traverses in depth-first order
 *
 * @param thread - Root thread post
 * @returns Array of all posts in depth-first order
 *
 * @example
 * ```ts
 * const thread = await fetchThread(agent, uri);
 * const allPosts = flattenThread(thread);
 * console.log(`Total posts: ${allPosts.length}`);
 * ```
 */
export function flattenThread(thread) {
    const result = [thread];
    function traverse(post) {
        if (post.replies) {
            for (const reply of post.replies) {
                result.push(reply);
                traverse(reply);
            }
        }
    }
    traverse(thread);
    return result;
}
// Note: isValidAtUri and parsePostUrl are exported from validation.ts
// Import them if needed: import { isValidAtUri, parsePostUrl } from './validation.js';
/**
 * Resolve a Bluesky post URL to an AT-URI
 * Handles the full conversion: URL → handle + postId → DID → AT-URI
 *
 * @param agent - Authenticated BskyAgent instance
 * @param url - Bluesky post URL
 * @returns AT-URI string
 * @throws Error if URL is invalid or handle cannot be resolved
 *
 * @example
 * ```ts
 * const uri = await resolvePostUrl(agent, 'https://bsky.app/profile/user.bsky.social/post/abc');
 * const thread = await fetchThread(agent, uri);
 * ```
 */
export async function resolvePostUrl(agent, url) {
    const parsed = parsePostUrl(url);
    if (!parsed) {
        throw new Error('Invalid Bluesky post URL format');
    }
    const { data } = await agent.resolveHandle({ handle: parsed.handle });
    return `at://${data.did}/app.bsky.feed.post/${parsed.postId}`;
}
/**
 * Clear the post cache (useful for manual refresh)
 *
 * @example
 * ```ts
 * clearPostCache(); // Force fresh fetches for all subsequent requests
 * ```
 */
export function clearPostCache() {
    postCache.clear();
}
/**
 * Get the global post cache instance
 * Useful for advanced cache management
 *
 * @returns PostCache instance
 *
 * @example
 * ```ts
 * const cache = getPostCache();
 * cache.setTTL(10 * 60 * 1000); // 10 minutes
 * console.log(`Cache size: ${cache.size}`);
 * ```
 */
export function getPostCache() {
    return postCache;
}
/**
 * Count total posts in a thread tree
 *
 * @param thread - Root thread post
 * @returns Total number of posts including all nested replies
 *
 * @example
 * ```ts
 * const thread = await fetchThread(agent, uri);
 * console.log(`Thread contains ${countThreadPosts(thread)} total posts`);
 * ```
 */
export function countThreadPosts(thread) {
    let count = 1;
    function traverse(post) {
        if (post.replies) {
            count += post.replies.length;
            post.replies.forEach(traverse);
        }
    }
    traverse(thread);
    return count;
}
/**
 * Get maximum depth of a thread tree
 *
 * @param thread - Root thread post
 * @returns Maximum nesting depth
 *
 * @example
 * ```ts
 * const thread = await fetchThread(agent, uri);
 * console.log(`Thread depth: ${getThreadDepth(thread)}`);
 * ```
 */
export function getThreadDepth(thread) {
    function traverse(post, currentDepth) {
        if (!post.replies || post.replies.length === 0) {
            return currentDepth;
        }
        const childDepths = post.replies.map((reply) => traverse(reply, currentDepth + 1));
        return Math.max(...childDepths);
    }
    return traverse(thread, 0);
}
/**
 * Find a post by URI within a thread tree
 *
 * @param thread - Root thread post
 * @param uri - AT-URI to find
 * @returns ThreadPost if found, null otherwise
 *
 * @example
 * ```ts
 * const thread = await fetchThread(agent, rootUri);
 * const post = findPostInThread(thread, specificUri);
 * if (post) console.log(post.record.text);
 * ```
 */
export function findPostInThread(thread, uri) {
    if (thread.uri === uri) {
        return thread;
    }
    if (thread.replies) {
        for (const reply of thread.replies) {
            const found = findPostInThread(reply, uri);
            if (found)
                return found;
        }
    }
    return null;
}
/**
 * Get all unique authors in a thread
 *
 * @param thread - Root thread post
 * @returns Array of unique author DIDs
 *
 * @example
 * ```ts
 * const thread = await fetchThread(agent, uri);
 * const authors = getThreadAuthors(thread);
 * console.log(`${authors.length} unique participants`);
 * ```
 */
export function getThreadAuthors(thread) {
    const authorDids = new Set();
    function traverse(post) {
        authorDids.add(post.author.did);
        if (post.replies) {
            post.replies.forEach(traverse);
        }
    }
    traverse(thread);
    return Array.from(authorDids);
}
//# sourceMappingURL=threads.js.map