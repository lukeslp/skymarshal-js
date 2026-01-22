/**
 * RelationshipManager - Analyze and manage social relationships
 * @module skymarshal-core/managers/relationship
 */

import { AtpAgent } from '@atproto/api';
import { NetworkManager, Profile } from './network.js';

/** Unfollow rule types */
export type UnfollowRule = 'bot' | 'lowRatio' | 'inactive' | 'noProfile' | 'noEngagement';

/** Options for bulk unfollow operations */
export interface BulkUnfollowOptions {
  /** Delay between unfollows in milliseconds (default: 500) */
  delayMs?: number;
  /** Stop on first error (default: false) */
  stopOnError?: boolean;
}

/** Result of a bulk operation */
export interface BulkOperationResult {
  /** Total number of accounts processed */
  processed: number;
  /** Number of successful operations */
  successful: number;
  /** Number of failed operations */
  failed: number;
  /** Array of error messages */
  errors: Array<{
    did: string;
    handle?: string;
    error: string;
  }>;
}

/** Options for unfollow by rule */
export interface UnfollowByRuleOptions extends BulkUnfollowOptions {
  /** Minimum follower ratio for 'lowRatio' rule (default: 0.1) */
  minRatio?: number;
  /** Minimum following count to apply 'lowRatio' rule (default: 100) */
  minFollowingForRatio?: number;
}

/**
 * RelationshipManager - Analyzes and manages social relationships
 */
export class RelationshipManager {
  private agent: AtpAgent;
  private networkManager: NetworkManager;

  constructor(agent: AtpAgent) {
    this.agent = agent;
    this.networkManager = new NetworkManager(agent);
  }

  /**
   * Get accounts you follow that don't follow back
   * @param did - User DID to analyze
   * @returns Array of profiles that don't follow back
   */
  async getNonFollowers(did: string): Promise<Profile[]> {
    return this.networkManager.getNonFollowers(did);
  }

  /**
   * Get count of accounts that don't follow back
   * @param did - User DID to analyze
   * @returns Count of non-followers
   */
  async getNonFollowersCount(did: string): Promise<number> {
    const nonFollowers = await this.getNonFollowers(did);
    return nonFollowers.length;
  }

  /**
   * Get accounts you follow with low follower ratio
   * @param did - User DID to analyze
   * @param maxRatio - Maximum follower/following ratio (default: 0.1)
   * @param minFollowing - Minimum following count to qualify (default: 100)
   * @returns Array of profiles with low ratios
   */
  async getLowRatioFollowing(
    did: string,
    maxRatio: number = 0.1,
    minFollowing: number = 100
  ): Promise<Profile[]> {
    const following = await this.networkManager.getAllFollowing(did);

    return following.filter((profile) => {
      const followsCount = profile.followsCount || 1; // Avoid division by zero
      const followersCount = profile.followersCount || 0;
      const ratio = followersCount / followsCount;

      return followsCount >= minFollowing && ratio < maxRatio;
    });
  }

  /**
   * Get mutual followers (accounts that follow each other)
   * @param did - User DID to analyze
   * @returns Array of mutual follower profiles
   */
  async getMutuals(did: string): Promise<Profile[]> {
    return this.networkManager.getMutuals(did);
  }

  /**
   * Get count of mutual followers
   * @param did - User DID to analyze
   * @returns Count of mutual followers
   */
  async getMutualsCount(did: string): Promise<number> {
    const mutuals = await this.getMutuals(did);
    return mutuals.length;
  }

  /**
   * Unfollow multiple accounts in bulk
   * @param dids - Array of DIDs to unfollow
   * @param options - Bulk operation options
   * @returns Result of bulk operation
   */
  async bulkUnfollow(
    dids: string[],
    options: BulkUnfollowOptions = {}
  ): Promise<BulkOperationResult> {
    const { delayMs = 500, stopOnError = false } = options;

    const result: BulkOperationResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (const did of dids) {
      result.processed++;

      try {
        // Get profile to find handle
        const profile = await this.networkManager.getProfile(did);

        // Unfollow
        await this.networkManager.unfollowByDid(did);
        result.successful++;

        // Rate limiting delay
        if (result.processed < dids.length) {
          await this.delay(delayMs);
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          did,
          error: error instanceof Error ? error.message : String(error),
        });

        if (stopOnError) {
          break;
        }
      }
    }

    return result;
  }

  /**
   * Unfollow accounts based on rules
   * @param did - User DID to analyze
   * @param rules - Array of unfollow rules to apply
   * @param options - Bulk operation options
   * @returns Result of bulk operation
   */
  async bulkUnfollowByRule(
    did: string,
    rules: UnfollowRule[],
    options: UnfollowByRuleOptions = {}
  ): Promise<BulkOperationResult> {
    const {
      minRatio = 0.1,
      minFollowingForRatio = 100,
      delayMs = 500,
      stopOnError = false,
    } = options;

    // Get all following
    const following = await this.networkManager.getAllFollowing(did);

    // Collect DIDs to unfollow based on rules
    const toUnfollow = new Set<string>();

    for (const profile of following) {
      for (const rule of rules) {
        let shouldUnfollow = false;

        switch (rule) {
          case 'bot':
            shouldUnfollow = this.detectBotPattern(profile);
            break;

          case 'lowRatio':
            shouldUnfollow = this.hasLowRatio(profile, minRatio, minFollowingForRatio);
            break;

          case 'inactive':
            shouldUnfollow = this.isInactive(profile);
            break;

          case 'noProfile':
            shouldUnfollow = this.hasNoProfile(profile);
            break;

          case 'noEngagement':
            shouldUnfollow = profile.postsCount === 0;
            break;
        }

        if (shouldUnfollow) {
          toUnfollow.add(profile.did);
          break; // Don't need to check other rules for this profile
        }
      }
    }

    // Perform bulk unfollow
    return this.bulkUnfollow(Array.from(toUnfollow), { delayMs, stopOnError });
  }

  /**
   * Detect bot-like patterns in a profile
   * @param profile - Profile to analyze
   * @returns True if bot patterns detected
   */
  private detectBotPattern(profile: Profile): boolean {
    const followersCount = profile.followersCount || 0;
    const followsCount = profile.followsCount || 0;
    const postsCount = profile.postsCount || 0;
    const displayName = profile.displayName || '';
    const description = profile.description || '';

    // Bot indicators
    const massFollowing = followsCount > 1000 && followersCount < followsCount * 0.05;
    const veryLowRatio = followsCount > 500 && followersCount / Math.max(followsCount, 1) < 0.02;
    const noPostsMassFollow = postsCount === 0 && followsCount > 100;
    const noProfileInfo = !displayName && !description;
    const roundFollowingCount = [1000, 2000, 5000, 10000].includes(followsCount);

    // Score bot likelihood
    let botScore = 0;
    if (massFollowing) botScore += 3;
    if (veryLowRatio) botScore += 2;
    if (noPostsMassFollow) botScore += 3;
    if (noProfileInfo) botScore += 1;
    if (roundFollowingCount) botScore += 1;

    return botScore >= 4; // Threshold for bot classification
  }

  /**
   * Check if profile has low follower ratio
   * @param profile - Profile to check
   * @param maxRatio - Maximum acceptable ratio
   * @param minFollowing - Minimum following count
   * @returns True if ratio is low
   */
  private hasLowRatio(profile: Profile, maxRatio: number, minFollowing: number): boolean {
    const followsCount = profile.followsCount || 1;
    const followersCount = profile.followersCount || 0;
    const ratio = followersCount / followsCount;

    return followsCount >= minFollowing && ratio < maxRatio;
  }

  /**
   * Check if profile appears inactive
   * @param profile - Profile to check
   * @returns True if likely inactive
   */
  private isInactive(profile: Profile): boolean {
    const handle = profile.handle || '';
    const displayName = profile.displayName || '';
    const followersCount = profile.followersCount || 0;
    const followsCount = profile.followsCount || 0;
    const postsCount = profile.postsCount || 0;

    // Check for deleted/invalid accounts
    if (!handle || handle.endsWith('.invalid') || handle === 'handle.invalid') {
      return true;
    }

    // Check for deactivated/suspended - no activity and no profile data
    if (followersCount === 0 && followsCount === 0 && postsCount === 0 && !displayName) {
      return true;
    }

    return false;
  }

  /**
   * Check if profile has minimal profile information
   * @param profile - Profile to check
   * @returns True if profile is incomplete
   */
  private hasNoProfile(profile: Profile): boolean {
    return !profile.displayName && !profile.description && !profile.avatar;
  }

  /**
   * Helper function to delay execution
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default RelationshipManager;
