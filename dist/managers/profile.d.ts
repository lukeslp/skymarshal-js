/**
 * ProfileManager - Handles Bluesky profile operations
 *
 * Features:
 * - Get profile details
 * - Update profile (display name, bio, avatar, banner)
 * - Batch profile fetching
 */
import { BskyAgent } from '@atproto/api';
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
    labels?: {
        val: string;
        src: string;
    }[];
}
export interface ProfileUpdateInput {
    displayName?: string;
    description?: string;
    avatar?: Blob;
    banner?: Blob;
}
export declare class ProfileManager {
    private agent;
    constructor(agent: BskyAgent);
    /**
     * Get a single profile by handle or DID
     */
    getProfile(actor: string): Promise<Profile>;
    /**
     * Get multiple profiles in batch (up to 25 at a time)
     */
    getProfiles(actors: string[]): Promise<Profile[]>;
    /**
     * Update the authenticated user's profile
     */
    updateProfile(input: ProfileUpdateInput): Promise<Profile>;
    /**
     * Upload an image blob (for avatar or banner)
     */
    uploadImage(blob: Blob): Promise<{
        ref: unknown;
        mimeType: string;
    }>;
    /**
     * Search for profiles by query
     */
    searchProfiles(query: string, options?: {
        limit?: number;
        cursor?: string;
    }): Promise<{
        profiles: Profile[];
        cursor?: string;
    }>;
    /**
     * Get suggested profiles to follow
     */
    getSuggestions(options?: {
        limit?: number;
        cursor?: string;
    }): Promise<{
        profiles: Profile[];
        cursor?: string;
    }>;
    private mapProfile;
}
//# sourceMappingURL=profile.d.ts.map