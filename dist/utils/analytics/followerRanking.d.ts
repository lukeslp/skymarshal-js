/**
 * Follower Ranking Analytics Module
 *
 * Provides influence scoring and ranking capabilities for Bluesky profiles.
 * Calculates composite influence scores based on follower counts, ratios,
 * and engagement patterns.
 *
 * @module skymarshal-core/utils/analytics/followerRanking
 */
/**
 * Influence tier classifications based on follower count
 * - mega: 100,000+ followers (major influencers)
 * - macro: 10,000-100,000 followers (established voices)
 * - micro: 1,000-10,000 followers (engaged communities)
 * - nano: <1,000 followers (emerging voices)
 */
export type InfluenceTier = 'mega' | 'macro' | 'micro' | 'nano';
/**
 * Profile interface for ranking calculations
 * Minimal interface to support various data sources
 */
export interface RankableProfile {
    /** Profile DID */
    did: string;
    /** Profile handle */
    handle: string;
    /** Display name (optional) */
    displayName?: string;
    /** Number of followers */
    followersCount: number;
    /** Number of accounts following */
    followsCount: number;
    /** Number of posts */
    postsCount: number;
    /** Profile description (optional) */
    description?: string;
}
/**
 * Comprehensive influence metrics for a profile
 *
 * Includes raw counts, computed ratios, engagement estimates,
 * composite influence score, and tier classification.
 */
export interface InfluenceMetrics {
    /** Number of followers */
    followersCount: number;
    /** Number of accounts following */
    followsCount: number;
    /** Number of posts */
    postsCount: number;
    /** Follower-to-following ratio (higher = more influential) */
    ratio: number;
    /** Estimated engagement rate (posts per follower) */
    engagementRate: number;
    /** Composite influence score (0-100 scale) */
    influenceScore: number;
    /** Influence tier classification */
    tier: InfluenceTier;
}
/**
 * Extended profile with influence metrics attached
 */
export interface RankedProfile extends RankableProfile {
    /** Computed influence metrics */
    metrics: InfluenceMetrics;
    /** Rank position (1-based, lower is better) */
    rank?: number;
}
/**
 * Grouped profiles by influence tier
 */
export type ProfilesByTier = Record<InfluenceTier, RankedProfile[]>;
/**
 * Calculate follower-to-following ratio
 *
 * @param followersCount - Number of followers
 * @param followsCount - Number of accounts following
 * @returns Ratio (handles division by zero)
 *
 * @example
 * ```ts
 * calculateRatio(1000, 500); // 2.0
 * calculateRatio(100, 0);    // 100.0 (special case)
 * ```
 */
export declare function calculateRatio(followersCount: number, followsCount: number): number;
/**
 * Calculate engagement rate estimate
 *
 * Estimates how actively a profile posts relative to their follower base.
 * Higher values indicate more consistent posting.
 *
 * @param postsCount - Number of posts
 * @param followersCount - Number of followers
 * @returns Engagement rate (posts per follower × 100)
 *
 * @example
 * ```ts
 * calculateEngagementRate(500, 1000);  // 50
 * calculateEngagementRate(0, 1000);    // 0
 * ```
 */
export declare function calculateEngagementRate(postsCount: number, followersCount: number): number;
/**
 * Determine influence tier based on follower count
 *
 * Tier thresholds:
 * - mega: 100,000+ followers
 * - macro: 10,000-99,999 followers
 * - micro: 1,000-9,999 followers
 * - nano: 0-999 followers
 *
 * @param followersCount - Number of followers
 * @returns Influence tier classification
 *
 * @example
 * ```ts
 * getInfluenceTier(150000);  // 'mega'
 * getInfluenceTier(50000);   // 'macro'
 * getInfluenceTier(5000);    // 'micro'
 * getInfluenceTier(500);     // 'nano'
 * ```
 */
export declare function getInfluenceTier(followersCount: number): InfluenceTier;
/**
 * Calculate composite influence score
 *
 * Formula:
 * ```
 * score = log10(followers + 1) × ratio_factor × engagement_factor
 * ```
 *
 * Where:
 * - `ratio_factor = min(1, ratio / 0.5)` - Rewards healthy follower ratios
 * - `engagement_factor = min(1, engagement_rate / 50)` - Rewards consistent posting
 *
 * The score uses logarithmic scaling for follower count to prevent
 * mega-influencers from dominating, while still rewarding growth.
 * Normalized to roughly 0-100 scale for interpretability.
 *
 * @param profile - Profile with follower metrics
 * @returns Influence score (typically 0-100, higher is better)
 *
 * @example
 * ```ts
 * const profile = {
 *   followersCount: 10000,
 *   followsCount: 5000,
 *   postsCount: 2000
 * };
 * calculateInfluenceScore(profile); // ~40-50 range
 * ```
 */
export declare function calculateInfluenceScore(profile: Pick<RankableProfile, 'followersCount' | 'followsCount' | 'postsCount'>): number;
/**
 * Calculate comprehensive influence metrics for a profile
 *
 * Computes all metrics in a single pass for efficiency.
 *
 * @param profile - Profile to analyze
 * @returns Complete influence metrics
 *
 * @example
 * ```ts
 * const profile = {
 *   did: 'did:plc:xyz',
 *   handle: 'user.bsky.social',
 *   followersCount: 5000,
 *   followsCount: 2000,
 *   postsCount: 1000
 * };
 *
 * const metrics = calculateInfluenceMetrics(profile);
 * // {
 * //   followersCount: 5000,
 * //   followsCount: 2000,
 * //   postsCount: 1000,
 * //   ratio: 2.5,
 * //   engagementRate: 20,
 * //   influenceScore: 45.6,
 * //   tier: 'micro'
 * // }
 * ```
 */
export declare function calculateInfluenceMetrics(profile: RankableProfile): InfluenceMetrics;
/**
 * Rank profiles by influence score (descending)
 *
 * Calculates influence metrics for all profiles and sorts by score.
 * Adds rank position (1-based) to each profile.
 *
 * @param profiles - Array of profiles to rank
 * @returns Sorted array with rank annotations
 *
 * @example
 * ```ts
 * const profiles = [
 *   { did: '1', handle: 'user1', followersCount: 1000, followsCount: 500, postsCount: 200 },
 *   { did: '2', handle: 'user2', followersCount: 5000, followsCount: 2000, postsCount: 1000 },
 *   { did: '3', handle: 'user3', followersCount: 500, followsCount: 1000, postsCount: 50 },
 * ];
 *
 * const ranked = rankByInfluence(profiles);
 * // ranked[0].rank === 1 (user2 - highest score)
 * // ranked[1].rank === 2 (user1)
 * // ranked[2].rank === 3 (user3 - lowest score)
 * ```
 */
export declare function rankByInfluence(profiles: RankableProfile[]): RankedProfile[];
/**
 * Group profiles by influence tier
 *
 * Organizes ranked profiles into tier-based buckets for analysis.
 * Profiles within each tier are sorted by influence score.
 *
 * @param profiles - Array of profiles (will be ranked if not already)
 * @returns Profiles grouped by tier
 *
 * @example
 * ```ts
 * const grouped = groupByTier(profiles);
 *
 * console.log(grouped.mega.length);   // Number of mega influencers
 * console.log(grouped.macro[0].rank); // Highest ranked macro influencer
 * ```
 */
export declare function groupByTier(profiles: RankableProfile[]): ProfilesByTier;
/**
 * Get top N influencers by score
 *
 * Returns the most influential profiles, ranked by composite score.
 * More efficient than ranking all profiles when only top results are needed.
 *
 * @param profiles - Array of profiles to analyze
 * @param n - Number of top influencers to return
 * @returns Top N profiles ranked by influence
 *
 * @example
 * ```ts
 * const topInfluencers = getTopInfluencers(profiles, 10);
 *
 * topInfluencers.forEach((profile, i) => {
 *   console.log(`#${i + 1}: ${profile.handle} (score: ${profile.metrics.influenceScore})`);
 * });
 * ```
 */
export declare function getTopInfluencers(profiles: RankableProfile[], n: number): RankedProfile[];
/**
 * Filter profiles by minimum influence score
 *
 * Returns only profiles meeting or exceeding the score threshold.
 *
 * @param profiles - Array of profiles to filter
 * @param minScore - Minimum influence score (inclusive)
 * @returns Filtered and ranked profiles
 *
 * @example
 * ```ts
 * // Get only highly influential profiles
 * const highInfluence = filterByMinScore(profiles, 50);
 * ```
 */
export declare function filterByMinScore(profiles: RankableProfile[], minScore: number): RankedProfile[];
/**
 * Filter profiles by tier(s)
 *
 * Returns only profiles in specified tier(s).
 *
 * @param profiles - Array of profiles to filter
 * @param tiers - Tier(s) to include
 * @returns Filtered and ranked profiles
 *
 * @example
 * ```ts
 * // Get only macro and mega influencers
 * const majorInfluencers = filterByTier(profiles, ['macro', 'mega']);
 *
 * // Get only nano influencers
 * const emerging = filterByTier(profiles, 'nano');
 * ```
 */
export declare function filterByTier(profiles: RankableProfile[], tiers: InfluenceTier | InfluenceTier[]): RankedProfile[];
/**
 * Get influence distribution statistics
 *
 * Provides summary statistics across all profiles for analysis.
 *
 * @param profiles - Array of profiles to analyze
 * @returns Distribution statistics
 *
 * @example
 * ```ts
 * const stats = getInfluenceStats(profiles);
 * console.log(`Average score: ${stats.averageScore}`);
 * console.log(`Median score: ${stats.medianScore}`);
 * console.log(`${stats.tierCounts.mega} mega influencers`);
 * ```
 */
export declare function getInfluenceStats(profiles: RankableProfile[]): {
    totalProfiles: number;
    averageScore: number;
    medianScore: number;
    minScore: number;
    maxScore: number;
    tierCounts: Record<InfluenceTier, number>;
    averageFollowers: number;
    averageRatio: number;
};
/**
 * Compare two profiles' influence
 *
 * Returns comparison metrics showing which profile is more influential
 * and by how much.
 *
 * @param profileA - First profile
 * @param profileB - Second profile
 * @returns Comparison object
 *
 * @example
 * ```ts
 * const comparison = compareInfluence(user1, user2);
 *
 * if (comparison.winner === 'a') {
 *   console.log(`${user1.handle} is more influential by ${comparison.scoreDiff} points`);
 * }
 * ```
 */
export declare function compareInfluence(profileA: RankableProfile, profileB: RankableProfile): {
    winner: 'a' | 'b' | 'tie';
    scoreDiff: number;
    metricsA: InfluenceMetrics;
    metricsB: InfluenceMetrics;
};
//# sourceMappingURL=followerRanking.d.ts.map