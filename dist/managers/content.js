/**
 * ContentManager - Manage posts, likes, and reposts
 * @module skymarshal-core/managers/content
 */
import { RichText } from '@atproto/api';
/**
 * Calculate engagement score for a post
 * Formula: likes + (2 × reposts) + (2.5 × replies)
 */
export function calculateEngagementScore(post) {
    const likes = post.likeCount || 0;
    const reposts = post.repostCount || 0;
    const replies = post.replyCount || 0;
    return likes + (2 * reposts) + (2.5 * replies);
}
/**
 * ContentManager - Manages posts, likes, and reposts for a Bluesky account
 */
export class ContentManager {
    agent;
    constructor(agent) {
        this.agent = agent;
    }
    /**
     * Get posts for a user
     * @param did - User DID
     * @param options - Fetch options
     */
    async getPosts(did, options = {}) {
        const { limit = 100, cursor, includeEngagement = true } = options;
        const response = await this.agent.com.atproto.repo.listRecords({
            repo: did,
            collection: 'app.bsky.feed.post',
            limit,
            cursor,
        });
        const posts = response.data.records.map((record) => ({
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
    async getAllPosts(did, options = {}) {
        const allPosts = [];
        let cursor;
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
    async getLikes(did, options = {}) {
        const { limit = 100, cursor } = options;
        const response = await this.agent.com.atproto.repo.listRecords({
            repo: did,
            collection: 'app.bsky.feed.like',
            limit,
            cursor,
        });
        const likes = response.data.records.map((record) => ({
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
    async getReposts(did, options = {}) {
        const { limit = 100, cursor } = options;
        const response = await this.agent.com.atproto.repo.listRecords({
            repo: did,
            collection: 'app.bsky.feed.repost',
            limit,
            cursor,
        });
        const reposts = response.data.records.map((record) => ({
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
    async createPost(text, options = {}) {
        // Process rich text for mentions, links, etc.
        const rt = new RichText({ text });
        await rt.detectFacets(this.agent);
        const record = {
            $type: 'app.bsky.feed.post',
            text: rt.text,
            facets: rt.facets,
            createdAt: new Date().toISOString(),
        };
        if (options.reply) {
            record.reply = options.reply;
        }
        if (options.embed) {
            record.embed = options.embed;
        }
        if (options.langs) {
            record.langs = options.langs;
        }
        if (options.labels) {
            record.labels = options.labels;
        }
        if (options.tags) {
            record.tags = options.tags;
        }
        const response = await this.agent.com.atproto.repo.createRecord({
            repo: this.agent.session.did,
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
    async deletePost(uri) {
        const { rkey } = this.parseUri(uri);
        await this.agent.com.atproto.repo.deleteRecord({
            repo: this.agent.session.did,
            collection: 'app.bsky.feed.post',
            rkey,
        });
    }
    /**
     * Like a post
     * @param uri - Post URI
     * @param cid - Post CID
     */
    async likePost(uri, cid) {
        const response = await this.agent.com.atproto.repo.createRecord({
            repo: this.agent.session.did,
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
    async unlikePost(likeUri) {
        const { rkey } = this.parseUri(likeUri);
        await this.agent.com.atproto.repo.deleteRecord({
            repo: this.agent.session.did,
            collection: 'app.bsky.feed.like',
            rkey,
        });
    }
    /**
     * Repost a post
     * @param uri - Post URI
     * @param cid - Post CID
     */
    async repost(uri, cid) {
        const response = await this.agent.com.atproto.repo.createRecord({
            repo: this.agent.session.did,
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
    async unrepost(repostUri) {
        const { rkey } = this.parseUri(repostUri);
        await this.agent.com.atproto.repo.deleteRecord({
            repo: this.agent.session.did,
            collection: 'app.bsky.feed.repost',
            rkey,
        });
    }
    /**
     * Hydrate posts with engagement metrics
     * @param uris - Post URIs to hydrate
     */
    async hydrateEngagement(uris) {
        const result = new Map();
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
            }
            catch (error) {
                console.error('Error hydrating engagement:', error);
            }
        }
        return result;
    }
    /**
     * Parse an AT URI into components
     */
    parseUri(uri) {
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
//# sourceMappingURL=content.js.map