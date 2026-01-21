/**
 * NetworkManager - Manage social graph operations
 * @module skymarshal-core/managers/network
 */
import { AtpAgent } from '@atproto/api';
/** Profile data */
export interface Profile {
    did: string;
    handle: string;
    displayName?: string;
    description?: string;
    avatar?: string;
    banner?: string;
    followersCount: number;
    followsCount: number;
    postsCount: number;
    indexedAt?: string;
    createdAt?: string;
    viewer?: {
        muted?: boolean;
        blockedBy?: boolean;
        blocking?: string;
        following?: string;
        followedBy?: string;
    };
    labels?: unknown[];
}
/** Fetch options for paginated requests */
export interface FetchOptions {
    limit?: number;
    cursor?: string;
}
/** Paginated result */
export interface PaginatedResult<T> {
    records: T[];
    cursor?: string;
    hasMore: boolean;
}
/** Relationship between two users */
export interface Relationship {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
    followersCount: number;
    followsCount: number;
    postsCount: number;
    isFollowing: boolean;
    isFollowedBy: boolean;
    isMutual: boolean;
}
/**
 * NetworkManager - Manages social graph for a Bluesky account
 */
export declare class NetworkManager {
    private agent;
    constructor(agent: AtpAgent);
    /**
     * Get profile for an actor
     * @param actor - DID or handle
     */
    getProfile(actor: string): Promise<Profile>;
    /**
     * Get profiles for multiple actors (batch)
     * @param actors - Array of DIDs or handles
     */
    getProfiles(actors: string[]): Promise<Profile[]>;
    /**
     * Get followers for a user
     * @param actor - DID or handle
     * @param options - Fetch options
     */
    getFollowers(actor: string, options?: FetchOptions): Promise<PaginatedResult<Profile>>;
    /**
     * Get all followers with automatic pagination
     * @param actor - DID or handle
     */
    getAllFollowers(actor: string): Promise<Profile[]>;
    /**
     * Get accounts a user is following
     * @param actor - DID or handle
     * @param options - Fetch options
     */
    getFollowing(actor: string, options?: FetchOptions): Promise<PaginatedResult<Profile>>;
    /**
     * Get all following with automatic pagination
     * @param actor - DID or handle
     */
    getAllFollowing(actor: string): Promise<Profile[]>;
    /**
     * Get mutual followers (users who follow back)
     * @param actor - DID or handle
     */
    getMutuals(actor: string): Promise<Profile[]>;
    /**
     * Get accounts that don't follow back
     * @param actor - DID or handle
     */
    getNonFollowers(actor: string): Promise<Profile[]>;
    /**
     * Get accounts that follow you but you don't follow back
     * @param actor - DID or handle
     */
    getNotFollowingBack(actor: string): Promise<Profile[]>;
    /**
     * Follow a user
     * @param did - User DID to follow
     */
    follow(did: string): Promise<{
        uri: string;
        cid: string;
    }>;
    /**
     * Unfollow a user
     * @param followUri - Follow record URI
     */
    unfollow(followUri: string): Promise<void>;
    /**
     * Unfollow a user by DID (finds and deletes the follow record)
     * @param did - User DID to unfollow
     */
    unfollowByDid(did: string): Promise<void>;
    /**
     * Block a user
     * @param did - User DID to block
     */
    block(did: string): Promise<{
        uri: string;
        cid: string;
    }>;
    /**
     * Unblock a user
     * @param blockUri - Block record URI
     */
    unblock(blockUri: string): Promise<void>;
    /**
     * Unblock a user by DID
     * @param did - User DID to unblock
     */
    unblockByDid(did: string): Promise<void>;
    /**
     * Mute a user
     * @param did - User DID to mute
     */
    mute(did: string): Promise<void>;
    /**
     * Unmute a user
     * @param did - User DID to unmute
     */
    unmute(did: string): Promise<void>;
    /**
     * Search for users
     * @param query - Search query
     * @param limit - Max results
     */
    searchUsers(query: string, limit?: number): Promise<Profile[]>;
    /**
     * Get relationship details between current user and another user
     * @param did - User DID to check relationship with
     */
    getRelationship(did: string): Promise<Relationship>;
    /**
     * Parse an AT URI into components
     */
    private parseUri;
}
export default NetworkManager;
//# sourceMappingURL=network.d.ts.map