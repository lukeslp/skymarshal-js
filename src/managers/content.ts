/**
 * ContentManager - Manage posts, likes, and reposts
 * @module skymarshal-core/managers/content
 */

import { AtpAgent, RichText } from '@atproto/api';
import type { 
  AppBskyFeedPost,
  AppBskyFeedLike,
  AppBskyFeedRepost,
  ComAtprotoRepoListRecords
} from '@atproto/api';

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
  engagementCachedAt?: number;
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
    root: { uri: string; cid: string };
    parent: { uri: string; cid: string };
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
export function calculateEngagementScore(post: PostWithEngagement): number {
  const likes = post.likeCount || 0;
  const reposts = post.repostCount || 0;
  const replies = post.replyCount || 0;
  return likes + (2 * reposts) + (2.5 * replies);
}

/**
 * ContentManager - Manages posts, likes, and reposts for a Bluesky account
 */
export class ContentManager {
  private agent: AtpAgent;

  constructor(agent: AtpAgent) {
    this.agent = agent;
  }

  /**
   * Get posts for a user
   * @param did - User DID
   * @param options - Fetch options
   */
  async getPosts(did: string, options: FetchOptions = {}): Promise<PaginatedResult<PostWithEngagement>> {
    const { limit = 100, cursor, includeEngagement = true } = options;

    const response = await this.agent.com.atproto.repo.listRecords({
      repo: did,
      collection: 'app.bsky.feed.post',
      limit,
      cursor,
    });

    const posts: PostWithEngagement[] = response.data.records.map((record: any) => ({
      uri: record.uri,
      cid: record.cid,
      text: record.value.text || '',
      createdAt: record.value.createdAt,
      embed: record.value.embed,
      facets: record.value.facets,
      langs: record.value.langs,
      labels: record.value.labels,
    }));

    // Hydrate with engagement if requested
    if (includeEngagement && posts.length > 0) {
      const uris = posts.map(p => p.uri);
      const hydrated = await this.hydrateEngagement(uris);
      
      for (const post of posts) {
        const engagement = hydrated.get(post.uri);
        if (engagement) {
          post.likeCount = engagement.likeCount;
          post.repostCount = engagement.repostCount;
          post.replyCount = engagement.replyCount;
          post.quoteCount = engagement.quoteCount;
          post.engagementScore = calculateEngagementScore(post);
        }
      }
    }

    return {
      records: posts,
      cursor: response.data.cursor,
      hasMore: !!response.data.cursor,
    };
  }

  /**
   * Get all posts with automatic pagination
   * @param did - User DID
   * @param options - Fetch options
   */
  async getAllPosts(did: string, options: Omit<FetchOptions, 'cursor'> = {}): Promise<PostWithEngagement[]> {
    const allPosts: PostWithEngagement[] = [];
    let cursor: string | undefined;

    do {
      const result = await this.getPosts(did, { ...options, cursor });
      allPosts.push(...result.records);
      cursor = result.cursor;
    } while (cursor);

    return allPosts;
  }

  /**
   * Get likes for a user
   * @param did - User DID
   * @param options - Fetch options
   */
  async getLikes(did: string, options: FetchOptions = {}): Promise<PaginatedResult<LikeRecord>> {
    const { limit = 100, cursor } = options;

    const response = await this.agent.com.atproto.repo.listRecords({
      repo: did,
      collection: 'app.bsky.feed.like',
      limit,
      cursor,
    });

    const likes: LikeRecord[] = response.data.records.map((record: any) => ({
      uri: record.uri,
      cid: record.cid,
      subject: record.value.subject,
      createdAt: record.value.createdAt,
    }));

    return {
      records: likes,
      cursor: response.data.cursor,
      hasMore: !!response.data.cursor,
    };
  }

  /**
   * Get reposts for a user
   * @param did - User DID
   * @param options - Fetch options
   */
  async getReposts(did: string, options: FetchOptions = {}): Promise<PaginatedResult<RepostRecord>> {
    const { limit = 100, cursor } = options;

    const response = await this.agent.com.atproto.repo.listRecords({
      repo: did,
      collection: 'app.bsky.feed.repost',
      limit,
      cursor,
    });

    const reposts: RepostRecord[] = response.data.records.map((record: any) => ({
      uri: record.uri,
      cid: record.cid,
      subject: record.value.subject,
      createdAt: record.value.createdAt,
    }));

    return {
      records: reposts,
      cursor: response.data.cursor,
      hasMore: !!response.data.cursor,
    };
  }

  /**
   * Create a new post
   * @param text - Post text
   * @param options - Post options
   */
  async createPost(text: string, options: CreatePostOptions = {}): Promise<{ uri: string; cid: string }> {
    // Process rich text for mentions, links, etc.
    const rt = new RichText({ text });
    await rt.detectFacets(this.agent);

    const record: Partial<AppBskyFeedPost.Record> = {
      $type: 'app.bsky.feed.post',
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    };

    if (options.reply) {
      record.reply = options.reply;
    }
    if (options.embed) {
      record.embed = options.embed as any;
    }
    if (options.langs) {
      record.langs = options.langs;
    }
    if (options.labels) {
      record.labels = options.labels as any;
    }
    if (options.tags) {
      record.tags = options.tags;
    }

    const response = await this.agent.com.atproto.repo.createRecord({
      repo: this.agent.session!.did,
      collection: 'app.bsky.feed.post',
      record,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
    };
  }

  /**
   * Delete a post
   * @param uri - Post URI
   */
  async deletePost(uri: string): Promise<void> {
    const { rkey } = this.parseUri(uri);
    await this.agent.com.atproto.repo.deleteRecord({
      repo: this.agent.session!.did,
      collection: 'app.bsky.feed.post',
      rkey,
    });
  }

  /**
   * Like a post
   * @param uri - Post URI
   * @param cid - Post CID
   */
  async likePost(uri: string, cid: string): Promise<{ uri: string; cid: string }> {
    const response = await this.agent.com.atproto.repo.createRecord({
      repo: this.agent.session!.did,
      collection: 'app.bsky.feed.like',
      record: {
        $type: 'app.bsky.feed.like',
        subject: { uri, cid },
        createdAt: new Date().toISOString(),
      },
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
    };
  }

  /**
   * Unlike a post
   * @param likeUri - Like record URI
   */
  async unlikePost(likeUri: string): Promise<void> {
    const { rkey } = this.parseUri(likeUri);
    await this.agent.com.atproto.repo.deleteRecord({
      repo: this.agent.session!.did,
      collection: 'app.bsky.feed.like',
      rkey,
    });
  }

  /**
   * Repost a post
   * @param uri - Post URI
   * @param cid - Post CID
   */
  async repost(uri: string, cid: string): Promise<{ uri: string; cid: string }> {
    const response = await this.agent.com.atproto.repo.createRecord({
      repo: this.agent.session!.did,
      collection: 'app.bsky.feed.repost',
      record: {
        $type: 'app.bsky.feed.repost',
        subject: { uri, cid },
        createdAt: new Date().toISOString(),
      },
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
    };
  }

  /**
   * Remove a repost
   * @param repostUri - Repost record URI
   */
  async unrepost(repostUri: string): Promise<void> {
    const { rkey } = this.parseUri(repostUri);
    await this.agent.com.atproto.repo.deleteRecord({
      repo: this.agent.session!.did,
      collection: 'app.bsky.feed.repost',
      rkey,
    });
  }

  /**
   * Hydrate posts with engagement metrics
   * @param uris - Post URIs to hydrate
   */
  async hydrateEngagement(uris: string[]): Promise<Map<string, { likeCount: number; repostCount: number; replyCount: number; quoteCount: number }>> {
    const result = new Map<string, { likeCount: number; repostCount: number; replyCount: number; quoteCount: number }>();
    
    // Batch fetch in groups of 25
    const batchSize = 25;
    for (let i = 0; i < uris.length; i += batchSize) {
      const batch = uris.slice(i, i + batchSize);
      
      try {
        const response = await this.agent.app.bsky.feed.getPosts({ uris: batch });
        
        for (const post of response.data.posts) {
          result.set(post.uri, {
            likeCount: post.likeCount || 0,
            repostCount: post.repostCount || 0,
            replyCount: post.replyCount || 0,
            quoteCount: post.quoteCount || 0,
          });
        }
      } catch (error) {
        console.error('Error hydrating engagement:', error);
      }
    }

    return result;
  }

  /**
   * Parse an AT URI into components
   */
  private parseUri(uri: string): { repo: string; collection: string; rkey: string } {
    const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (!match) {
      throw new Error(`Invalid AT URI: ${uri}`);
    }
    return {
      repo: match[1],
      collection: match[2],
      rkey: match[3],
    };
  }
}

export default ContentManager;
