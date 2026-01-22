/**
 * RelationshipManager - Analyze and manage social relationships
 * @module skymarshal-core/managers/relationship
 */
import { AtpAgent } from '@atproto/api';
import { Profile } from './network.js';
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
export declare class RelationshipManager {
    private agent;
    private networkManager;
    constructor(agent: AtpAgent);
    /**
     * Get accounts you follow that don't follow back
     * @param did - User DID to analyze
     * @returns Array of profiles that don't follow back
     */
    getNonFollowers(did: string): Promise<Profile[]>;
    /**
     * Get count of accounts that don't follow back
     * @param did - User DID to analyze
     * @returns Count of non-followers
     */
    getNonFollowersCount(did: string): Promise<number>;
    /**
     * Get accounts you follow with low follower ratio
     * @param did - User DID to analyze
     * @param maxRatio - Maximum follower/following ratio (default: 0.1)
     * @param minFollowing - Minimum following count to qualify (default: 100)
     * @returns Array of profiles with low ratios
     */
    getLowRatioFollowing(did: string, maxRatio?: number, minFollowing?: number): Promise<Profile[]>;
    /**
     * Get mutual followers (accounts that follow each other)
     * @param did - User DID to analyze
     * @returns Array of mutual follower profiles
     */
    getMutuals(did: string): Promise<Profile[]>;
    /**
     * Get count of mutual followers
     * @param did - User DID to analyze
     * @returns Count of mutual followers
     */
    getMutualsCount(did: string): Promise<number>;
    /**
     * Unfollow multiple accounts in bulk
     * @param dids - Array of DIDs to unfollow
     * @param options - Bulk operation options
     * @returns Result of bulk operation
     */
    bulkUnfollow(dids: string[], options?: BulkUnfollowOptions): Promise<BulkOperationResult>;
    /**
     * Unfollow accounts based on rules
     * @param did - User DID to analyze
     * @param rules - Array of unfollow rules to apply
     * @param options - Bulk operation options
     * @returns Result of bulk operation
     */
    bulkUnfollowByRule(did: string, rules: UnfollowRule[], options?: UnfollowByRuleOptions): Promise<BulkOperationResult>;
    /**
     * Detect bot-like patterns in a profile
     * @param profile - Profile to analyze
     * @returns True if bot patterns detected
     */
    private detectBotPattern;
    /**
     * Check if profile has low follower ratio
     * @param profile - Profile to check
     * @param maxRatio - Maximum acceptable ratio
     * @param minFollowing - Minimum following count
     * @returns True if ratio is low
     */
    private hasLowRatio;
    /**
     * Check if profile appears inactive
     * @param profile - Profile to check
     * @returns True if likely inactive
     */
    private isInactive;
    /**
     * Check if profile has minimal profile information
     * @param profile - Profile to check
     * @returns True if profile is incomplete
     */
    private hasNoProfile;
    /**
     * Helper function to delay execution
     * @param ms - Milliseconds to delay
     * @returns Promise that resolves after delay
     */
    private delay;
}
export default RelationshipManager;
//# sourceMappingURL=relationship.d.ts.map