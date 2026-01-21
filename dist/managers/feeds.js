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
export class FeedsManager {
    agent;
    constructor(agent) {
        this.agent = agent;
    }
    /**
     * Get the user's timeline feed
     */
    async getTimeline(options = {}) {
        const { limit = 50, cursor } = options;
        const response = await this.agent.getTimeline({
            limit,
            cursor,
        });
        return {
            posts: response.data.feed.map(this.mapFeedPost),
            cursor: response.data.cursor,
        };
    }
    /**
     * Get posts from a custom feed
     */
    async getFeed(feedUri, options = {}) {
        const { limit = 50, cursor } = options;
        const response = await this.agent.app.bsky.feed.getFeed({
            feed: feedUri,
            limit,
            cursor,
        });
        return {
            posts: response.data.feed.map(this.mapFeedPost),
            cursor: response.data.cursor,
        };
    }
    /**
     * Get a feed generator by URI
     */
    async getFeedGenerator(feedUri) {
        const response = await this.agent.app.bsky.feed.getFeedGenerator({
            feed: feedUri,
        });
        return this.mapFeedGenerator(response.data.view);
    }
    /**
     * Get multiple feed generators
     */
    async getFeedGenerators(feedUris) {
        const response = await this.agent.app.bsky.feed.getFeedGenerators({
            feeds: feedUris,
        });
        return response.data.feeds.map(this.mapFeedGenerator);
    }
    /**
     * Search for feed generators
     */
    async searchFeeds(query, options = {}) {
        const { limit = 25, cursor } = options;
        const response = await this.agent.app.bsky.unspecced.getPopularFeedGenerators({
            limit,
            cursor,
            query,
        });
        return {
            feeds: response.data.feeds.map(this.mapFeedGenerator),
            cursor: response.data.cursor,
        };
    }
    /**
     * Get popular/suggested feeds
     */
    async getSuggestedFeeds(options = {}) {
        const { limit = 25, cursor } = options;
        const response = await this.agent.app.bsky.feed.getSuggestedFeeds({
            limit,
            cursor,
        });
        return {
            feeds: response.data.feeds.map(this.mapFeedGenerator),
            cursor: response.data.cursor,
        };
    }
    /**
     * Get feeds created by a user
     */
    async getActorFeeds(actor, options = {}) {
        const { limit = 50, cursor } = options;
        const response = await this.agent.app.bsky.feed.getActorFeeds({
            actor,
            limit,
            cursor,
        });
        return {
            feeds: response.data.feeds.map(this.mapFeedGenerator),
            cursor: response.data.cursor,
        };
    }
    /**
     * Like a feed generator
     */
    async likeFeed(feedUri, feedCid) {
        const response = await this.agent.like(feedUri, feedCid);
        return { uri: response.uri };
    }
    /**
     * Unlike a feed generator
     */
    async unlikeFeed(likeUri) {
        await this.agent.deleteLike(likeUri);
    }
    /**
     * Get the user's saved feeds
     */
    async getSavedFeeds() {
        const response = await this.agent.app.bsky.actor.getPreferences();
        const savedFeedsPref = response.data.preferences.find((pref) => pref.$type === 'app.bsky.actor.defs#savedFeedsPrefV2');
        if (!savedFeedsPref?.items) {
            return [];
        }
        return savedFeedsPref.items.map((item) => ({
            type: item.type,
            value: item.value,
            pinned: item.pinned || false,
            id: item.id,
        }));
    }
    /**
     * Add a feed to saved feeds
     */
    async saveFeed(feedUri, pinned = false) {
        // Use preferences API to add saved feed
        const prefs = await this.agent.app.bsky.actor.getPreferences();
        const savedFeedsPref = prefs.data.preferences.find((p) => p.$type === 'app.bsky.actor.defs#savedFeedsPrefV2');
        const items = savedFeedsPref?.items || [];
        items.push({
            type: 'feed',
            value: feedUri,
            pinned,
            id: `feed-${Date.now()}`,
        });
        await this.agent.app.bsky.actor.putPreferences({
            preferences: [
                ...prefs.data.preferences.filter((p) => p.$type !== 'app.bsky.actor.defs#savedFeedsPrefV2'),
                { $type: 'app.bsky.actor.defs#savedFeedsPrefV2', items },
            ],
        });
    }
    /**
     * Remove a feed from saved feeds
     */
    async unsaveFeed(feedUri) {
        const prefs = await this.agent.app.bsky.actor.getPreferences();
        const savedFeedsPref = prefs.data.preferences.find((p) => p.$type === 'app.bsky.actor.defs#savedFeedsPrefV2');
        const items = (savedFeedsPref?.items || []).filter((i) => i.value !== feedUri);
        await this.agent.app.bsky.actor.putPreferences({
            preferences: [
                ...prefs.data.preferences.filter((p) => p.$type !== 'app.bsky.actor.defs#savedFeedsPrefV2'),
                { $type: 'app.bsky.actor.defs#savedFeedsPrefV2', items },
            ],
        });
    }
    /**
     * Pin a saved feed
     */
    async pinFeed(feedUri) {
        const prefs = await this.agent.app.bsky.actor.getPreferences();
        const savedFeedsPref = prefs.data.preferences.find((p) => p.$type === 'app.bsky.actor.defs#savedFeedsPrefV2');
        const items = (savedFeedsPref?.items || []).map((i) => i.value === feedUri ? { ...i, pinned: true } : i);
        await this.agent.app.bsky.actor.putPreferences({
            preferences: [
                ...prefs.data.preferences.filter((p) => p.$type !== 'app.bsky.actor.defs#savedFeedsPrefV2'),
                { $type: 'app.bsky.actor.defs#savedFeedsPrefV2', items },
            ],
        });
    }
    /**
     * Unpin a saved feed
     */
    async unpinFeed(feedUri) {
        const prefs = await this.agent.app.bsky.actor.getPreferences();
        const savedFeedsPref = prefs.data.preferences.find((p) => p.$type === 'app.bsky.actor.defs#savedFeedsPrefV2');
        const items = (savedFeedsPref?.items || []).map((i) => i.value === feedUri ? { ...i, pinned: false } : i);
        await this.agent.app.bsky.actor.putPreferences({
            preferences: [
                ...prefs.data.preferences.filter((p) => p.$type !== 'app.bsky.actor.defs#savedFeedsPrefV2'),
                { $type: 'app.bsky.actor.defs#savedFeedsPrefV2', items },
            ],
        });
    }
    /**
     * Get the user's feed preferences
     */
    async getFeedPreferences() {
        const savedFeeds = await this.getSavedFeeds();
        return {
            savedFeeds,
            pinnedFeeds: savedFeeds.filter((f) => f.pinned).map((f) => f.value),
        };
    }
    mapFeedPost(item) {
        const post = {
            uri: item.post.uri,
            cid: item.post.cid,
            text: item.post.record?.text || '',
            createdAt: item.post.record?.createdAt || item.post.indexedAt,
            author: {
                did: item.post.author.did,
                handle: item.post.author.handle,
                displayName: item.post.author.displayName,
                avatar: item.post.author.avatar,
            },
            embed: item.post.embed,
            replyCount: item.post.replyCount || 0,
            repostCount: item.post.repostCount || 0,
            likeCount: item.post.likeCount || 0,
            indexedAt: item.post.indexedAt,
        };
        // Add repost reason if present
        if (item.reason?.$type === 'app.bsky.feed.defs#reasonRepost') {
            post.reason = {
                type: 'repost',
                by: {
                    did: item.reason.by.did,
                    handle: item.reason.by.handle,
                    displayName: item.reason.by.displayName,
                },
                indexedAt: item.reason.indexedAt,
            };
        }
        return post;
    }
    mapFeedGenerator(data) {
        return {
            uri: data.uri,
            cid: data.cid,
            did: data.did,
            displayName: data.displayName,
            description: data.description,
            avatar: data.avatar,
            likeCount: data.likeCount,
            creator: {
                did: data.creator.did,
                handle: data.creator.handle,
                displayName: data.creator.displayName,
                avatar: data.creator.avatar,
            },
            indexedAt: data.indexedAt,
        };
    }
}
//# sourceMappingURL=feeds.js.map