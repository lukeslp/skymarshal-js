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
  labels?: { val: string; src: string }[];
}

export interface ProfileUpdateInput {
  displayName?: string;
  description?: string;
  avatar?: Blob;
  banner?: Blob;
}

export class ProfileManager {
  constructor(private agent: BskyAgent) {}

  /**
   * Get a single profile by handle or DID
   */
  async getProfile(actor: string): Promise<Profile> {
    const response = await this.agent.getProfile({ actor });
    return this.mapProfile(response.data);
  }

  /**
   * Get multiple profiles in batch (up to 25 at a time)
   */
  async getProfiles(actors: string[]): Promise<Profile[]> {
    if (actors.length === 0) return [];

    // AT Protocol limits to 25 actors per request
    const batches: string[][] = [];
    for (let i = 0; i < actors.length; i += 25) {
      batches.push(actors.slice(i, i + 25));
    }

    const results: Profile[] = [];
    for (const batch of batches) {
      const response = await this.agent.getProfiles({ actors: batch });
      results.push(...response.data.profiles.map(this.mapProfile));
    }

    return results;
  }

  /**
   * Update the authenticated user's profile
   */
  async updateProfile(input: ProfileUpdateInput): Promise<Profile> {
    // Get current profile to preserve existing values
    const currentProfile = await this.agent.getProfile({
      actor: this.agent.session?.did || '',
    });

    let avatarRef: unknown = currentProfile.data.avatar;
    let bannerRef: unknown = currentProfile.data.banner;

    // Upload new avatar if provided
    if (input.avatar) {
      const uploadResponse = await this.agent.uploadBlob(input.avatar, {
        encoding: input.avatar.type || 'image/jpeg',
      });
      avatarRef = uploadResponse.data.blob;
    }

    // Upload new banner if provided
    if (input.banner) {
      const uploadResponse = await this.agent.uploadBlob(input.banner, {
        encoding: input.banner.type || 'image/jpeg',
      });
      bannerRef = uploadResponse.data.blob;
    }

    // Update profile record
    await this.agent.upsertProfile((existing) => ({
      ...existing,
      displayName: input.displayName ?? existing?.displayName,
      description: input.description ?? existing?.description,
      avatar: avatarRef as any,
      banner: bannerRef as any,
    }));

    // Return updated profile
    return this.getProfile(this.agent.session?.did || '');
  }

  /**
   * Upload an image blob (for avatar or banner)
   */
  async uploadImage(blob: Blob): Promise<{ ref: unknown; mimeType: string }> {
    const response = await this.agent.uploadBlob(blob, {
      encoding: blob.type || 'image/jpeg',
    });
    return {
      ref: response.data.blob,
      mimeType: blob.type || 'image/jpeg',
    };
  }

  /**
   * Search for profiles by query
   */
  async searchProfiles(
    query: string,
    options: { limit?: number; cursor?: string } = {}
  ): Promise<{ profiles: Profile[]; cursor?: string }> {
    const { limit = 25, cursor } = options;

    const response = await this.agent.searchActors({
      q: query,
      limit,
      cursor,
    });

    return {
      profiles: response.data.actors.map(this.mapProfile),
      cursor: response.data.cursor,
    };
  }

  /**
   * Get suggested profiles to follow
   */
  async getSuggestions(options: { limit?: number; cursor?: string } = {}): Promise<{
    profiles: Profile[];
    cursor?: string;
  }> {
    const { limit = 25, cursor } = options;

    const response = await this.agent.getSuggestions({
      limit,
      cursor,
    });

    return {
      profiles: response.data.actors.map(this.mapProfile),
      cursor: response.data.cursor,
    };
  }

  private mapProfile(data: any): Profile {
    return {
      did: data.did,
      handle: data.handle,
      displayName: data.displayName,
      description: data.description,
      avatar: data.avatar,
      banner: data.banner,
      followersCount: data.followersCount || 0,
      followsCount: data.followsCount || 0,
      postsCount: data.postsCount || 0,
      indexedAt: data.indexedAt,
      labels: data.labels?.map((l: any) => ({ val: l.val, src: l.src })),
    };
  }
}
