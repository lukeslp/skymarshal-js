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

import { BskyAgent, RichText, AppBskyFeedPost } from '@atproto/api';

export interface PostImage {
  data: Blob;
  alt: string;
  mimeType?: string;
  aspectRatio?: { width: number; height: number };
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
  replyTo?: { uri: string; cid: string };
  quote?: { uri: string; cid: string };
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

export class PostManager {
  constructor(private agent: BskyAgent) {}

  /**
   * Create a new post
   */
  async createPost(input: CreatePostInput): Promise<{ uri: string; cid: string }> {
    const { text, images, link, replyTo, quote, langs, labels } = input;

    // Process rich text (mentions, links, hashtags)
    const rt = new RichText({ text });
    await rt.detectFacets(this.agent);

    // Build the post record
    const record: Partial<AppBskyFeedPost.Record> = {
      $type: 'app.bsky.feed.post',
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    };

    // Add language tags
    if (langs && langs.length > 0) {
      record.langs = langs;
    }

    // Add reply reference
    if (replyTo) {
      const parent = await this.getPostThread(replyTo.uri);
      record.reply = {
        root: parent.parent ? { uri: parent.parent.uri, cid: parent.parent.cid } : replyTo,
        parent: replyTo,
      };
    }

    // Add images embed
    if (images && images.length > 0) {
      const uploadedImages = await Promise.all(
        images.map(async (img) => {
          const blob = img.data;
          const response = await this.agent.uploadBlob(blob, {
            encoding: img.mimeType || 'image/jpeg',
          });
          return {
            alt: img.alt,
            image: response.data.blob,
            aspectRatio: img.aspectRatio,
          };
        })
      );

      record.embed = {
        $type: 'app.bsky.embed.images',
        images: uploadedImages,
      };
    }

    // Add link embed (external)
    if (link && !images) {
      let thumbBlob;
      if (link.thumb) {
        const blob = link.thumb;
        const response = await this.agent.uploadBlob(blob, {
          encoding: 'image/jpeg',
        });
        thumbBlob = response.data.blob;
      }

      record.embed = {
        $type: 'app.bsky.embed.external',
        external: {
          uri: link.uri,
          title: link.title || '',
          description: link.description || '',
          thumb: thumbBlob,
        },
      };
    }

    // Add quote embed
    if (quote) {
      if (record.embed) {
        // Combine with existing embed (images + quote)
        record.embed = {
          $type: 'app.bsky.embed.recordWithMedia',
          record: {
            $type: 'app.bsky.embed.record',
            record: quote,
          },
          media: record.embed,
        };
      } else {
        record.embed = {
          $type: 'app.bsky.embed.record',
          record: quote,
        };
      }
    }

    // Add content labels (self-labels)
    if (labels && labels.length > 0) {
      record.labels = {
        $type: 'com.atproto.label.defs#selfLabels',
        values: labels.map((val) => ({ val })),
      };
    }

    const response = await this.agent.post(record as AppBskyFeedPost.Record);
    return { uri: response.uri, cid: response.cid };
  }

  /**
   * Create a thread (multiple connected posts)
   */
  async createThread(posts: CreatePostInput[]): Promise<{ uri: string; cid: string }[]> {
    const results: { uri: string; cid: string }[] = [];

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      
      // Link to previous post in thread
      if (i > 0 && results.length > 0) {
        post.replyTo = results[i - 1];
      }

      const result = await this.createPost(post);
      results.push(result);
    }

    return results;
  }

  /**
   * Delete a post
   */
  async deletePost(uri: string): Promise<void> {
    await this.agent.deletePost(uri);
  }

  /**
   * Like a post
   */
  async likePost(uri: string, cid: string): Promise<{ uri: string }> {
    const response = await this.agent.like(uri, cid);
    return { uri: response.uri };
  }

  /**
   * Unlike a post
   */
  async unlikePost(likeUri: string): Promise<void> {
    await this.agent.deleteLike(likeUri);
  }

  /**
   * Repost a post
   */
  async repost(uri: string, cid: string): Promise<{ uri: string }> {
    const response = await this.agent.repost(uri, cid);
    return { uri: response.uri };
  }

  /**
   * Unrepost a post
   */
  async unrepost(repostUri: string): Promise<void> {
    await this.agent.deleteRepost(repostUri);
  }

  /**
   * Get a post by URI
   */
  async getPost(uri: string): Promise<Post> {
    const response = await this.agent.getPostThread({ uri, depth: 0 });
    const thread = response.data.thread;
    
    if (!('post' in thread)) {
      throw new Error('Post not found or blocked');
    }

    return this.mapPost(thread.post);
  }

  /**
   * Get a post thread with replies
   */
  async getPostThread(uri: string, depth: number = 6): Promise<ThreadPost> {
    const response = await this.agent.getPostThread({ uri, depth });
    const thread = response.data.thread;
    
    if (!('post' in thread)) {
      throw new Error('Post not found or blocked');
    }

    return this.mapThreadPost(thread);
  }

  /**
   * Get posts by a specific author
   */
  async getAuthorPosts(
    actor: string,
    options: { limit?: number; cursor?: string; filter?: 'posts_with_replies' | 'posts_no_replies' | 'posts_with_media' } = {}
  ): Promise<{ posts: Post[]; cursor?: string }> {
    const { limit = 50, cursor, filter = 'posts_with_replies' } = options;

    const response = await this.agent.getAuthorFeed({
      actor,
      limit,
      cursor,
      filter,
    });

    return {
      posts: response.data.feed.map((item) => this.mapPost(item.post)),
      cursor: response.data.cursor,
    };
  }

  private mapPost(data: any): Post {
    return {
      uri: data.uri,
      cid: data.cid,
      text: data.record?.text || '',
      createdAt: data.record?.createdAt || data.indexedAt,
      author: {
        did: data.author.did,
        handle: data.author.handle,
        displayName: data.author.displayName,
        avatar: data.author.avatar,
      },
      embed: data.embed,
      replyCount: data.replyCount || 0,
      repostCount: data.repostCount || 0,
      likeCount: data.likeCount || 0,
      indexedAt: data.indexedAt,
    };
  }

  private mapThreadPost(thread: any): ThreadPost {
    const post = this.mapPost(thread.post) as ThreadPost;

    if (thread.parent && 'post' in thread.parent) {
      post.parent = this.mapThreadPost(thread.parent);
    }

    if (thread.replies && Array.isArray(thread.replies)) {
      post.replies = thread.replies
        .filter((r: any) => 'post' in r)
        .map((r: any) => this.mapThreadPost(r));
    }

    return post;
  }
}
