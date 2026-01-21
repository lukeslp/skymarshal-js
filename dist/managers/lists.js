/**
 * ListsManager - Handles Bluesky list operations
 *
 * Features:
 * - Create, update, delete lists
 * - Add/remove members from lists
 * - Get list details and members
 * - Subscribe/unsubscribe to lists
 */
export class ListsManager {
    agent;
    constructor(agent) {
        this.agent = agent;
    }
    /**
     * Create a new list
     */
    async createList(input) {
        const { name, purpose, description, avatar } = input;
        let avatarRef;
        if (avatar) {
            const response = await this.agent.uploadBlob(avatar, {
                encoding: avatar.type || 'image/jpeg',
            });
            avatarRef = response.data.blob;
        }
        const response = await this.agent.com.atproto.repo.createRecord({
            repo: this.agent.session?.did || '',
            collection: 'app.bsky.graph.list',
            record: {
                $type: 'app.bsky.graph.list',
                purpose: purpose === 'curatelist'
                    ? 'app.bsky.graph.defs#curatelist'
                    : 'app.bsky.graph.defs#modlist',
                name,
                description,
                avatar: avatarRef,
                createdAt: new Date().toISOString(),
            },
        });
        return { uri: response.data.uri, cid: response.data.cid };
    }
    /**
     * Delete a list
     */
    async deleteList(listUri) {
        const { rkey } = this.parseUri(listUri);
        await this.agent.com.atproto.repo.deleteRecord({
            repo: this.agent.session?.did || '',
            collection: 'app.bsky.graph.list',
            rkey,
        });
    }
    /**
     * Get a list by URI
     */
    async getList(listUri) {
        const response = await this.agent.app.bsky.graph.getList({
            list: listUri,
            limit: 1,
        });
        return this.mapList(response.data.list);
    }
    /**
     * Get lists created by a user
     */
    async getLists(actor, options = {}) {
        const { limit = 50, cursor } = options;
        const response = await this.agent.app.bsky.graph.getLists({
            actor,
            limit,
            cursor,
        });
        return {
            lists: response.data.lists.map(this.mapList),
            cursor: response.data.cursor,
        };
    }
    /**
     * Get members of a list
     */
    async getListMembers(listUri, options = {}) {
        const { limit = 100, cursor } = options;
        const response = await this.agent.app.bsky.graph.getList({
            list: listUri,
            limit,
            cursor,
        });
        return {
            members: response.data.items.map((item) => ({
                uri: item.uri,
                subject: {
                    did: item.subject.did,
                    handle: item.subject.handle,
                    displayName: item.subject.displayName,
                    avatar: item.subject.avatar,
                },
            })),
            cursor: response.data.cursor,
        };
    }
    /**
     * Add a member to a list
     */
    async addMember(listUri, subjectDid) {
        const response = await this.agent.com.atproto.repo.createRecord({
            repo: this.agent.session?.did || '',
            collection: 'app.bsky.graph.listitem',
            record: {
                $type: 'app.bsky.graph.listitem',
                subject: subjectDid,
                list: listUri,
                createdAt: new Date().toISOString(),
            },
        });
        return { uri: response.data.uri };
    }
    /**
     * Remove a member from a list
     */
    async removeMember(listItemUri) {
        const { rkey } = this.parseUri(listItemUri);
        await this.agent.com.atproto.repo.deleteRecord({
            repo: this.agent.session?.did || '',
            collection: 'app.bsky.graph.listitem',
            rkey,
        });
    }
    /**
     * Add multiple members to a list
     */
    async addMembers(listUri, subjectDids) {
        const results = [];
        for (const did of subjectDids) {
            const result = await this.addMember(listUri, did);
            results.push(result);
        }
        return results;
    }
    /**
     * Mute a list (for modlists)
     */
    async muteList(listUri) {
        await this.agent.muteModList(listUri);
    }
    /**
     * Unmute a list
     */
    async unmuteList(listUri) {
        await this.agent.unmuteModList(listUri);
    }
    /**
     * Block a list (for modlists)
     */
    async blockList(listUri) {
        const response = await this.agent.blockModList(listUri);
        return { uri: response.uri };
    }
    /**
     * Unblock a list
     */
    async unblockList(blockUri) {
        await this.agent.unblockModList(blockUri);
    }
    /**
     * Get lists the user is subscribed to (muted/blocked)
     */
    async getListMutes(options = {}) {
        const { limit = 50, cursor } = options;
        const response = await this.agent.app.bsky.graph.getListMutes({
            limit,
            cursor,
        });
        return {
            lists: response.data.lists.map(this.mapList),
            cursor: response.data.cursor,
        };
    }
    /**
     * Get lists the user has blocked
     */
    async getListBlocks(options = {}) {
        const { limit = 50, cursor } = options;
        const response = await this.agent.app.bsky.graph.getListBlocks({
            limit,
            cursor,
        });
        return {
            lists: response.data.lists.map(this.mapList),
            cursor: response.data.cursor,
        };
    }
    mapList(data) {
        return {
            uri: data.uri,
            cid: data.cid,
            name: data.name,
            purpose: data.purpose?.includes('modlist') ? 'modlist' : 'curatelist',
            description: data.description,
            avatar: data.avatar,
            creator: {
                did: data.creator.did,
                handle: data.creator.handle,
                displayName: data.creator.displayName,
                avatar: data.creator.avatar,
            },
            indexedAt: data.indexedAt,
            listItemCount: data.listItemCount,
        };
    }
    parseUri(uri) {
        const parts = uri.replace('at://', '').split('/');
        return {
            repo: parts[0],
            collection: parts[1],
            rkey: parts[2],
        };
    }
}
//# sourceMappingURL=lists.js.map