/**
 * ContentManager - Manage posts, likes, and reposts
 * @module skymarshal-core/managers/content
 */
import { AtpAgent } from '@atproto/api';
/** Options for fetching content */
export interface FetchOptions {
    limit?: number;
    cursor?: string;
    includeEngagement?: boolean;
}
/** Post with engagement metrics */
export interface PostWithEngagement {
    uri: string;
    cid: string;
    text: string;
    createdAt: string;
    replyCount?: number;
    repostCount?: number;
    likeCount?: number;
    quoteCount?: number;
    indexedAt?: string;
    embed?: unknown;
    facets?: unknown[];
    langs?: string[];
    labels?: unknown[];
    engagementScore?: number;
}
/** Like record */
export interface LikeRecord {
    uri: string;
    cid: string;
    subject: {
        uri: string;
        cid: string;
    };
    createdAt: string;
    indexedAt?: string;
}
/** Repost record */
export interface RepostRecord {
    uri: string;
    cid: string;
    subject: {
        uri: string;
        cid: string;
    };
    createdAt: string;
    indexedAt?: string;
}
/** Options for creating a post */
export interface CreatePostOptions {
    reply?: {
        root: {
            uri: string;
            cid: string;
        };
        parent: {
            uri: string;
            cid: string;
        };
    };
    embed?: unknown;
    langs?: string[];
    labels?: unknown;
    tags?: string[];
}
/** Paginated result */
export interface PaginatedResult<T> {
    records: T[];
    cursor?: string;
    hasMore: boolean;
}
/**
 * Calculate engagement score for a post
 * Formula: likes + (2 × reposts) + (2.5 × replies)
 */
export declare function calculateEngagementScore(post: PostWithEngagement): number;
/**
 * ContentManager - Manages posts, likes, and reposts for a Bluesky account
 */
export declare class ContentManager {
    private agent;
    constructor(agent: AtpAgent);
    /**
     * Get posts for a user
     * @param did - User DID
     * @param options - Fetch options
     */
    getPosts(did: string, options?: FetchOptions): Promise<PaginatedResult<PostWithEngagement>>;
    /**
     * Get all posts with automatic pagination
     * @param did - User DID
     * @param options - Fetch options
     */
    getAllPosts(did: string, options?: Omit<FetchOptions, 'cursor'>): Promise<PostWithEngagement[]>;
    /**
     * Get likes for a user
     * @param did - User DID
     * @param options - Fetch options
     */
    getLikes(did: string, options?: FetchOptions): Promise<PaginatedResult<LikeRecord>>;
    /**
     * Get reposts for a user
     * @param did - User DID
     * @param options - Fetch options
     */
    getReposts(did: string, options?: FetchOptions): Promise<PaginatedResult<RepostRecord>>;
    /**
     * Create a new post
     * @param text - Post text
     * @param options - Post options
     */
    createPost(text: string, options?: CreatePostOptions): Promise<{
        uri: string;
        cid: string;
    }>;
    /**
     * Delete a post
     * @param uri - Post URI
     */
    deletePost(uri: string): Promise<void>;
    /**
     * Like a post
     * @param uri - Post URI
     * @param cid - Post CID
     */
    likePost(uri: string, cid: string): Promise<{
        uri: string;
        cid: string;
    }>;
    /**
     * Unlike a post
     * @param likeUri - Like record URI
     */
    unlikePost(likeUri: string): Promise<void>;
    /**
     * Repost a post
     * @param uri - Post URI
     * @param cid - Post CID
     */
    repost(uri: string, cid: string): Promise<{
        uri: string;
        cid: string;
    }>;
    /**
     * Remove a repost
     * @param repostUri - Repost record URI
     */
    unrepost(repostUri: string): Promise<void>;
    /**
     * Hydrate posts with engagement metrics
     * @param uris - Post URIs to hydrate
     */
    hydrateEngagement(uris: string[]): Promise<Map<string, {
        likeCount: number;
        repostCount: number;
        replyCount: number;
        quoteCount: number;
    }>>;
    /**
     * Parse an AT URI into components
     */
    private parseUri;
}
export default ContentManager;
//# sourceMappingURL=content.d.ts.map