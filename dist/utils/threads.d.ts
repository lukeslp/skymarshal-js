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
import { BskyAgent } from '@atproto/api';
/**
 * Simplified thread post structure for caching and display
 */
export interface ThreadPost {
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
/**
 * PostCache - Simple in-memory cache with TTL
 *
 * Caches thread data to reduce API calls for frequently accessed posts.
 * Default TTL: 5 minutes
 */
export declare class PostCache {
    private cache;
    private ttl;
    /**
     * Store a post in cache
     */
    set(uri: string, data: ThreadPost): void;
    /**
     * Retrieve a post from cache if not expired
     * Returns null if not found or expired
     */
    get(uri: string): ThreadPost | null;
    /**
     * Clear all cached posts
     */
    clear(): void;
    /**
     * Get cache size
     */
    get size(): number;
    /**
     * Check if a URI is cached and not expired
     */
    has(uri: string): boolean;
    /**
     * Set custom TTL (in milliseconds)
     */
    setTTL(ttl: number): void;
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
export declare function fetchThread(agent: BskyAgent, uri: string, depth?: number, parentHeight?: number): Promise<ThreadPost>;
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
export declare function fetchPreviewReplies(agent: BskyAgent, uri: string): Promise<ThreadPost[]>;
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
export declare function flattenThread(thread: ThreadPost): ThreadPost[];
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
export declare function resolvePostUrl(agent: BskyAgent, url: string): Promise<string>;
/**
 * Clear the post cache (useful for manual refresh)
 *
 * @example
 * ```ts
 * clearPostCache(); // Force fresh fetches for all subsequent requests
 * ```
 */
export declare function clearPostCache(): void;
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
export declare function getPostCache(): PostCache;
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
export declare function countThreadPosts(thread: ThreadPost): number;
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
export declare function getThreadDepth(thread: ThreadPost): number;
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
export declare function findPostInThread(thread: ThreadPost, uri: string): ThreadPost | null;
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
export declare function getThreadAuthors(thread: ThreadPost): string[];
//# sourceMappingURL=threads.d.ts.map