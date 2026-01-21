/**
 * NetworkManager - Manage social graph operations
 * @module skymarshal-core/managers/network
 */
/**
 * NetworkManager - Manages social graph for a Bluesky account
 */
export class NetworkManager {
    agent;
    constructor(agent) {
        this.agent = agent;
    }
    /**
     * Get profile for an actor
     * @param actor - DID or handle
     */
    async getProfile(actor) {
        const response = await this.agent.app.bsky.actor.getProfile({ actor });
        return {
            did: response.data.did,
            handle: response.data.handle,
            displayName: response.data.displayName,
            description: response.data.description,
            avatar: response.data.avatar,
            banner: response.data.banner,
            followersCount: response.data.followersCount || 0,
            followsCount: response.data.followsCount || 0,
            postsCount: response.data.postsCount || 0,
            indexedAt: response.data.indexedAt,
            createdAt: response.data.createdAt,
            viewer: response.data.viewer,
            labels: response.data.labels,
        };
    }
    /**
     * Get profiles for multiple actors (batch)
     * @param actors - Array of DIDs or handles
     */
    async getProfiles(actors) {
        const profiles = [];
        // Batch in groups of 25
        const batchSize = 25;
        for (let i = 0; i < actors.length; i += batchSize) {
            const batch = actors.slice(i, i + batchSize);
            const response = await this.agent.app.bsky.actor.getProfiles({ actors: batch });
            for (const profile of response.data.profiles) {
                profiles.push({
                    did: profile.did,
                    handle: profile.handle,
                    displayName: profile.displayName,
                    description: profile.description,
                    avatar: profile.avatar,
                    banner: profile.banner,
                    followersCount: profile.followersCount || 0,
                    followsCount: profile.followsCount || 0,
                    postsCount: profile.postsCount || 0,
                    indexedAt: profile.indexedAt,
                    createdAt: profile.createdAt,
                    viewer: profile.viewer,
                    labels: profile.labels,
                });
            }
        }
        return profiles;
    }
    /**
     * Get followers for a user
     * @param actor - DID or handle
     * @param options - Fetch options
     */
    async getFollowers(actor, options = {}) {
        const { limit = 100, cursor } = options;
        const response = await this.agent.app.bsky.graph.getFollowers({
            actor,
            limit,
            cursor,
        });
        const followers = response.data.followers.map((f) => ({
            did: f.did,
            handle: f.handle,
            displayName: f.displayName,
            description: f.description,
            avatar: f.avatar,
            followersCount: f.followersCount || 0,
            followsCount: f.followsCount || 0,
            postsCount: f.postsCount || 0,
            indexedAt: f.indexedAt,
            viewer: f.viewer,
            labels: f.labels,
        }));
        return {
            records: followers,
            cursor: response.data.cursor,
            hasMore: !!response.data.cursor,
        };
    }
    /**
     * Get all followers with automatic pagination
     * @param actor - DID or handle
     */
    async getAllFollowers(actor) {
        const allFollowers = [];
        let cursor;
        do {
            const result = await this.getFollowers(actor, { cursor });
            allFollowers.push(...result.records);
            cursor = result.cursor;
        } while (cursor);
        return allFollowers;
    }
    /**
     * Get accounts a user is following
     * @param actor - DID or handle
     * @param options - Fetch options
     */
    async getFollowing(actor, options = {}) {
        const { limit = 100, cursor } = options;
        const response = await this.agent.app.bsky.graph.getFollows({
            actor,
            limit,
            cursor,
        });
        const following = response.data.follows.map((f) => ({
            did: f.did,
            handle: f.handle,
            displayName: f.displayName,
            description: f.description,
            avatar: f.avatar,
            followersCount: f.followersCount || 0,
            followsCount: f.followsCount || 0,
            postsCount: f.postsCount || 0,
            indexedAt: f.indexedAt,
            viewer: f.viewer,
            labels: f.labels,
        }));
        return {
            records: following,
            cursor: response.data.cursor,
            hasMore: !!response.data.cursor,
        };
    }
    /**
     * Get all following with automatic pagination
     * @param actor - DID or handle
     */
    async getAllFollowing(actor) {
        const allFollowing = [];
        let cursor;
        do {
            const result = await this.getFollowing(actor, { cursor });
            allFollowing.push(...result.records);
            cursor = result.cursor;
        } while (cursor);
        return allFollowing;
    }
    /**
     * Get mutual followers (users who follow back)
     * @param actor - DID or handle
     */
    async getMutuals(actor) {
        const [followers, following] = await Promise.all([
            this.getAllFollowers(actor),
            this.getAllFollowing(actor),
        ]);
        const followerDids = new Set(followers.map(f => f.did));
        return following.filter(f => followerDids.has(f.did));
    }
    /**
     * Get accounts that don't follow back
     * @param actor - DID or handle
     */
    async getNonFollowers(actor) {
        const [followers, following] = await Promise.all([
            this.getAllFollowers(actor),
            this.getAllFollowing(actor),
        ]);
        const followerDids = new Set(followers.map(f => f.did));
        return following.filter(f => !followerDids.has(f.did));
    }
    /**
     * Get accounts that follow you but you don't follow back
     * @param actor - DID or handle
     */
    async getNotFollowingBack(actor) {
        const [followers, following] = await Promise.all([
            this.getAllFollowers(actor),
            this.getAllFollowing(actor),
        ]);
        const followingDids = new Set(following.map(f => f.did));
        return followers.filter(f => !followingDids.has(f.did));
    }
    /**
     * Follow a user
     * @param did - User DID to follow
     */
    async follow(did) {
        const response = await this.agent.com.atproto.repo.createRecord({
            repo: this.agent.session.did,
            collection: 'app.bsky.graph.follow',
            record: {
                $type: 'app.bsky.graph.follow',
                subject: did,
                createdAt: new Date().toISOString(),
            },
        });
        return {
            uri: response.data.uri,
            cid: response.data.cid,
        };
    }
    /**
     * Unfollow a user
     * @param followUri - Follow record URI
     */
    async unfollow(followUri) {
        const { rkey } = this.parseUri(followUri);
        await this.agent.com.atproto.repo.deleteRecord({
            repo: this.agent.session.did,
            collection: 'app.bsky.graph.follow',
            rkey,
        });
    }
    /**
     * Unfollow a user by DID (finds and deletes the follow record)
     * @param did - User DID to unfollow
     */
    async unfollowByDid(did) {
        // Get the follow record
        const profile = await this.getProfile(did);
        if (profile.viewer?.following) {
            await this.unfollow(profile.viewer.following);
        }
    }
    /**
     * Block a user
     * @param did - User DID to block
     */
    async block(did) {
        const response = await this.agent.com.atproto.repo.createRecord({
            repo: this.agent.session.did,
            collection: 'app.bsky.graph.block',
            record: {
                $type: 'app.bsky.graph.block',
                subject: did,
                createdAt: new Date().toISOString(),
            },
        });
        return {
            uri: response.data.uri,
            cid: response.data.cid,
        };
    }
    /**
     * Unblock a user
     * @param blockUri - Block record URI
     */
    async unblock(blockUri) {
        const { rkey } = this.parseUri(blockUri);
        await this.agent.com.atproto.repo.deleteRecord({
            repo: this.agent.session.did,
            collection: 'app.bsky.graph.block',
            rkey,
        });
    }
    /**
     * Unblock a user by DID
     * @param did - User DID to unblock
     */
    async unblockByDid(did) {
        const profile = await this.getProfile(did);
        if (profile.viewer?.blocking) {
            await this.unblock(profile.viewer.blocking);
        }
    }
    /**
     * Mute a user
     * @param did - User DID to mute
     */
    async mute(did) {
        await this.agent.app.bsky.graph.muteActor({ actor: did });
    }
    /**
     * Unmute a user
     * @param did - User DID to unmute
     */
    async unmute(did) {
        await this.agent.app.bsky.graph.unmuteActor({ actor: did });
    }
    /**
     * Search for users
     * @param query - Search query
     * @param limit - Max results
     */
    async searchUsers(query, limit = 50) {
        const response = await this.agent.app.bsky.actor.searchActors({
            q: query,
            limit,
        });
        return response.data.actors.map((actor) => ({
            did: actor.did,
            handle: actor.handle,
            displayName: actor.displayName,
            description: actor.description,
            avatar: actor.avatar,
            followersCount: actor.followersCount || 0,
            followsCount: actor.followsCount || 0,
            postsCount: actor.postsCount || 0,
            indexedAt: actor.indexedAt,
            viewer: actor.viewer,
            labels: actor.labels,
        }));
    }
    /**
     * Get relationship details between current user and another user
     * @param did - User DID to check relationship with
     */
    async getRelationship(did) {
        const profile = await this.getProfile(did);
        return {
            did: profile.did,
            handle: profile.handle,
            displayName: profile.displayName,
            avatar: profile.avatar,
            followersCount: profile.followersCount,
            followsCount: profile.followsCount,
            postsCount: profile.postsCount,
            isFollowing: !!profile.viewer?.following,
            isFollowedBy: !!profile.viewer?.followedBy,
            isMutual: !!profile.viewer?.following && !!profile.viewer?.followedBy,
        };
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
export default NetworkManager;
//# sourceMappingURL=network.js.map