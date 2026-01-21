/**
 * FeedsManager - Handles Bluesky feed operations
 *
 * Features:
 * - Get timeline feed
 * - Get custom feeds
 * - Save/unsave feeds
 * - Get feed generators
 * - Manage feed preferences
 */
import { BskyAgent } from '@atproto/api';
export interface FeedGenerator {
    uri: string;
    cid: string;
    did: string;
    displayName: string;
    description?: string;
    avatar?: string;
    likeCount?: number;
    creator: {
        did: string;
        handle: string;
        displayName?: string;
        avatar?: string;
    };
    indexedAt: string;
}
export interface FeedPost {
    uri: string;
    cid: string;
    text: string;
    createdAt: string;
    author: {
        did: string;
        handle: string;
        displayName?: string;
        avatar?: string;
    };
    embed?: unknown;
    replyCount: number;
    repostCount: number;
    likeCount: number;
    indexedAt: string;
    reason?: {
        type: 'repost';
        by: {
            did: string;
            handle: string;
            displayName?: string;
        };
        indexedAt: string;
    };
}
export interface SavedFeed {
    type: 'feed' | 'list' | 'timeline';
    value: string;
    pinned: boolean;
    id: string;
}
export declare class FeedsManager {
    private agent;
    constructor(agent: BskyAgent);
    /**
     * Get the user's timeline feed
     */
    getTimeline(options?: {
        limit?: number;
        cursor?: string;
    }): Promise<{
        posts: FeedPost[];
        cursor?: string;
    }>;
    /**
     * Get posts from a custom feed
     */
    getFeed(feedUri: string, options?: {
        limit?: number;
        cursor?: string;
    }): Promise<{
        posts: FeedPost[];
        cursor?: string;
    }>;
    /**
     * Get a feed generator by URI
     */
    getFeedGenerator(feedUri: string): Promise<FeedGenerator>;
    /**
     * Get multiple feed generators
     */
    getFeedGenerators(feedUris: string[]): Promise<FeedGenerator[]>;
    /**
     * Search for feed generators
     */
    searchFeeds(query: string, options?: {
        limit?: number;
        cursor?: string;
    }): Promise<{
        feeds: FeedGenerator[];
        cursor?: string;
    }>;
    /**
     * Get popular/suggested feeds
     */
    getSuggestedFeeds(options?: {
        limit?: number;
        cursor?: string;
    }): Promise<{
        feeds: FeedGenerator[];
        cursor?: string;
    }>;
    /**
     * Get feeds created by a user
     */
    getActorFeeds(actor: string, options?: {
        limit?: number;
        cursor?: string;
    }): Promise<{
        feeds: FeedGenerator[];
        cursor?: string;
    }>;
    /**
     * Like a feed generator
     */
    likeFeed(feedUri: string, feedCid: string): Promise<{
        uri: string;
    }>;
    /**
     * Unlike a feed generator
     */
    unlikeFeed(likeUri: string): Promise<void>;
    /**
     * Get the user's saved feeds
     */
    getSavedFeeds(): Promise<SavedFeed[]>;
    /**
     * Add a feed to saved feeds
     */
    saveFeed(feedUri: string, pinned?: boolean): Promise<void>;
    /**
     * Remove a feed from saved feeds
     */
    unsaveFeed(feedUri: string): Promise<void>;
    /**
     * Pin a saved feed
     */
    pinFeed(feedUri: string): Promise<void>;
    /**
     * Unpin a saved feed
     */
    unpinFeed(feedUri: string): Promise<void>;
    /**
     * Get the user's feed preferences
     */
    getFeedPreferences(): Promise<{
        savedFeeds: SavedFeed[];
        pinnedFeeds: string[];
    }>;
    private mapFeedPost;
    private mapFeedGenerator;
}
//# sourceMappingURL=feeds.d.ts.map