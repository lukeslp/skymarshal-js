/**
 * PostManager - Handles Bluesky post creation and management
 *
 * Features:
 * - Create posts with text, images, and links
 * - Create threads (multiple connected posts)
 * - Delete posts
 * - Like/unlike posts
 * - Repost/unrepost posts
 * - Quote posts
 */
import { BskyAgent } from '@atproto/api';
export interface PostImage {
    data: Blob;
    alt: string;
    mimeType?: string;
    aspectRatio?: {
        width: number;
        height: number;
    };
}
export interface PostLink {
    uri: string;
    title?: string;
    description?: string;
    thumb?: Blob;
}
export interface CreatePostInput {
    text: string;
    images?: PostImage[];
    link?: PostLink;
    replyTo?: {
        uri: string;
        cid: string;
    };
    quote?: {
        uri: string;
        cid: string;
    };
    langs?: string[];
    labels?: string[];
}
export interface Post {
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
}
export interface ThreadPost extends Post {
    parent?: ThreadPost;
    replies?: ThreadPost[];
}
export declare class PostManager {
    private agent;
    constructor(agent: BskyAgent);
    /**
     * Create a new post
     */
    createPost(input: CreatePostInput): Promise<{
        uri: string;
        cid: string;
    }>;
    /**
     * Create a thread (multiple connected posts)
     */
    createThread(posts: CreatePostInput[]): Promise<{
        uri: string;
        cid: string;
    }[]>;
    /**
     * Delete a post
     */
    deletePost(uri: string): Promise<void>;
    /**
     * Like a post
     */
    likePost(uri: string, cid: string): Promise<{
        uri: string;
    }>;
    /**
     * Unlike a post
     */
    unlikePost(likeUri: string): Promise<void>;
    /**
     * Repost a post
     */
    repost(uri: string, cid: string): Promise<{
        uri: string;
    }>;
    /**
     * Unrepost a post
     */
    unrepost(repostUri: string): Promise<void>;
    /**
     * Get a post by URI
     */
    getPost(uri: string): Promise<Post>;
    /**
     * Get a post thread with replies
     */
    getPostThread(uri: string, depth?: number): Promise<ThreadPost>;
    /**
     * Get posts by a specific author
     */
    getAuthorPosts(actor: string, options?: {
        limit?: number;
        cursor?: string;
        filter?: 'posts_with_replies' | 'posts_no_replies' | 'posts_with_media';
    }): Promise<{
        posts: Post[];
        cursor?: string;
    }>;
    private mapPost;
    private mapThreadPost;
}
//# sourceMappingURL=post.d.ts.map