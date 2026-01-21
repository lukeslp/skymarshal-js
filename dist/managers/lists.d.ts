/**
 * ListsManager - Handles Bluesky list operations
 *
 * Features:
 * - Create, update, delete lists
 * - Add/remove members from lists
 * - Get list details and members
 * - Subscribe/unsubscribe to lists
 */
import { BskyAgent } from '@atproto/api';
export type ListPurpose = 'curatelist' | 'modlist';
export interface List {
    uri: string;
    cid: string;
    name: string;
    purpose: ListPurpose;
    description?: string;
    avatar?: string;
    creator: {
        did: string;
        handle: string;
        displayName?: string;
        avatar?: string;
    };
    indexedAt: string;
    listItemCount?: number;
}
export interface ListMember {
    uri: string;
    subject: {
        did: string;
        handle: string;
        displayName?: string;
        avatar?: string;
    };
}
export interface CreateListInput {
    name: string;
    purpose: ListPurpose;
    description?: string;
    avatar?: Blob;
}
export declare class ListsManager {
    private agent;
    constructor(agent: BskyAgent);
    /**
     * Create a new list
     */
    createList(input: CreateListInput): Promise<{
        uri: string;
        cid: string;
    }>;
    /**
     * Delete a list
     */
    deleteList(listUri: string): Promise<void>;
    /**
     * Get a list by URI
     */
    getList(listUri: string): Promise<List>;
    /**
     * Get lists created by a user
     */
    getLists(actor: string, options?: {
        limit?: number;
        cursor?: string;
    }): Promise<{
        lists: List[];
        cursor?: string;
    }>;
    /**
     * Get members of a list
     */
    getListMembers(listUri: string, options?: {
        limit?: number;
        cursor?: string;
    }): Promise<{
        members: ListMember[];
        cursor?: string;
    }>;
    /**
     * Add a member to a list
     */
    addMember(listUri: string, subjectDid: string): Promise<{
        uri: string;
    }>;
    /**
     * Remove a member from a list
     */
    removeMember(listItemUri: string): Promise<void>;
    /**
     * Add multiple members to a list
     */
    addMembers(listUri: string, subjectDids: string[]): Promise<{
        uri: string;
    }[]>;
    /**
     * Mute a list (for modlists)
     */
    muteList(listUri: string): Promise<void>;
    /**
     * Unmute a list
     */
    unmuteList(listUri: string): Promise<void>;
    /**
     * Block a list (for modlists)
     */
    blockList(listUri: string): Promise<{
        uri: string;
    }>;
    /**
     * Unblock a list
     */
    unblockList(blockUri: string): Promise<void>;
    /**
     * Get lists the user is subscribed to (muted/blocked)
     */
    getListMutes(options?: {
        limit?: number;
        cursor?: string;
    }): Promise<{
        lists: List[];
        cursor?: string;
    }>;
    /**
     * Get lists the user has blocked
     */
    getListBlocks(options?: {
        limit?: number;
        cursor?: string;
    }): Promise<{
        lists: List[];
        cursor?: string;
    }>;
    private mapList;
    private parseUri;
}
//# sourceMappingURL=lists.d.ts.map