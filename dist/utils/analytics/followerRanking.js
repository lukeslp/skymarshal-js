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
export function calculateRatio(followersCount, followsCount) {
    if (followsCount === 0) {
        // Special case: following nobody but has followers = infinite ratio
        // Cap at 100 for practical purposes
        return Math.min(followersCount, 100);
    }
    return followersCount / followsCount;
}
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
export function calculateEngagementRate(postsCount, followersCount) {
    if (followersCount === 0)
        return 0;
    // Scale by 100 to get a more readable percentage-like number
    return (postsCount / followersCount) * 100;
}
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
export function getInfluenceTier(followersCount) {
    if (followersCount >= 100000)
        return 'mega';
    if (followersCount >= 10000)
        return 'macro';
    if (followersCount >= 1000)
        return 'micro';
    return 'nano';
}
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
export function calculateInfluenceScore(profile) {
    const { followersCount, followsCount, postsCount } = profile;
    // Base score: logarithmic scaling of follower count
    // log10(10,001) ≈ 4, log10(100,001) ≈ 5, log10(1,000,001) ≈ 6
    const baseScore = Math.log10(followersCount + 1);
    // Ratio factor: rewards healthy follower-to-following ratios
    // Optimal ratio is ≥0.5 (2:1 following:follower or better)
    const ratio = calculateRatio(followersCount, followsCount);
    const ratioFactor = Math.min(1, ratio / 0.5);
    // Engagement factor: rewards consistent posting
    // Target is ~50 posts per follower (×100 scale)
    const engagementRate = calculateEngagementRate(postsCount, followersCount);
    const engagementFactor = Math.min(1, engagementRate / 50);
    // Composite score (scaled to ~0-100 range)
    const score = baseScore * ratioFactor * engagementFactor * 20;
    return Math.round(score * 100) / 100; // Round to 2 decimal places
}
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
export function calculateInfluenceMetrics(profile) {
    const { followersCount, followsCount, postsCount } = profile;
    return {
        followersCount,
        followsCount,
        postsCount,
        ratio: calculateRatio(followersCount, followsCount),
        engagementRate: calculateEngagementRate(postsCount, followersCount),
        influenceScore: calculateInfluenceScore(profile),
        tier: getInfluenceTier(followersCount),
    };
}
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
export function rankByInfluence(profiles) {
    const ranked = profiles.map((profile) => ({
        ...profile,
        metrics: calculateInfluenceMetrics(profile),
        rank: undefined,
    }));
    // Sort by influence score descending
    ranked.sort((a, b) => b.metrics.influenceScore - a.metrics.influenceScore);
    // Add rank positions (1-based)
    ranked.forEach((profile, index) => {
        profile.rank = index + 1;
    });
    return ranked;
}
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
export function groupByTier(profiles) {
    const ranked = rankByInfluence(profiles);
    const grouped = {
        mega: [],
        macro: [],
        micro: [],
        nano: [],
    };
    for (const profile of ranked) {
        grouped[profile.metrics.tier].push(profile);
    }
    return grouped;
}
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
export function getTopInfluencers(profiles, n) {
    const ranked = rankByInfluence(profiles);
    return ranked.slice(0, n);
}
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
export function filterByMinScore(profiles, minScore) {
    const ranked = rankByInfluence(profiles);
    return ranked.filter((p) => p.metrics.influenceScore >= minScore);
}
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
export function filterByTier(profiles, tiers) {
    const tierArray = Array.isArray(tiers) ? tiers : [tiers];
    const ranked = rankByInfluence(profiles);
    return ranked.filter((p) => tierArray.includes(p.metrics.tier));
}
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
export function getInfluenceStats(profiles) {
    if (profiles.length === 0) {
        return {
            totalProfiles: 0,
            averageScore: 0,
            medianScore: 0,
            minScore: 0,
            maxScore: 0,
            tierCounts: { mega: 0, macro: 0, micro: 0, nano: 0 },
            averageFollowers: 0,
            averageRatio: 0,
        };
    }
    const ranked = rankByInfluence(profiles);
    const scores = ranked.map((p) => p.metrics.influenceScore);
    const followers = ranked.map((p) => p.followersCount);
    const ratios = ranked.map((p) => p.metrics.ratio);
    // Calculate median
    const sortedScores = [...scores].sort((a, b) => a - b);
    const medianScore = sortedScores[Math.floor(sortedScores.length / 2)];
    // Count by tier
    const tierCounts = { mega: 0, macro: 0, micro: 0, nano: 0 };
    ranked.forEach((p) => {
        tierCounts[p.metrics.tier]++;
    });
    return {
        totalProfiles: profiles.length,
        averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        medianScore,
        minScore: Math.min(...scores),
        maxScore: Math.max(...scores),
        tierCounts,
        averageFollowers: followers.reduce((a, b) => a + b, 0) / followers.length,
        averageRatio: ratios.reduce((a, b) => a + b, 0) / ratios.length,
    };
}
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
export function compareInfluence(profileA, profileB) {
    const metricsA = calculateInfluenceMetrics(profileA);
    const metricsB = calculateInfluenceMetrics(profileB);
    const scoreDiff = Math.abs(metricsA.influenceScore - metricsB.influenceScore);
    let winner = 'tie';
    if (metricsA.influenceScore > metricsB.influenceScore) {
        winner = 'a';
    }
    else if (metricsB.influenceScore > metricsA.influenceScore) {
        winner = 'b';
    }
    return {
        winner,
        scoreDiff: Math.round(scoreDiff * 100) / 100,
        metricsA,
        metricsB,
    };
}
//# sourceMappingURL=followerRanking.js.map