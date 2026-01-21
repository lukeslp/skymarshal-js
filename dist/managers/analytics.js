/**
 * AnalyticsManager - Bot detection and engagement analysis
 * @module skymarshal-core/managers/analytics
 */
/** Ratio patterns for bot detection */
const RATIO_PATTERNS = {
    // Primary focus: Bad follow/follower ratios
    extreme_following_ratio: (f, fg) => fg > 50 && f < fg * 0.05, // Following 20x+ more than followers
    high_following_ratio: (f, fg) => fg > 100 && f < fg * 0.1, // Following 10x+ more than followers
    moderate_following_ratio: (f, fg) => fg > 200 && f < fg * 0.2, // Following 5x+ more than followers
    // Reverse ratios - potential engagement farmers
    extreme_follower_ratio: (f, fg) => f > 1000 && fg < f * 0.01, // 100x+ more followers than following
    high_follower_ratio: (f, fg) => f > 500 && fg < f * 0.05, // 20x+ more followers than following
    moderate_follower_ratio: (f, fg) => f > 200 && fg < f * 0.1, // 10x+ more followers than following
    // Additional quick checks
    mass_following: (_f, fg) => fg > 5000, // Very high following count
    no_engagement: (f, fg, posts) => (posts || 0) === 0 && fg > 100, // No posts but following many
};
/** Weights for ratio patterns */
const RATIO_WEIGHTS = {
    extreme_following_ratio: 0.8, // Almost certainly a bot
    high_following_ratio: 0.6, // Very likely a bot
    moderate_following_ratio: 0.4, // Suspicious
    extreme_follower_ratio: 0.7, // Likely engagement farmer
    high_follower_ratio: 0.5, // Suspicious engagement farmer
    moderate_follower_ratio: 0.3, // Potentially suspicious
    mass_following: 0.4, // Suspicious behavior
    no_engagement: 0.5, // Likely bot
};
/**
 * Calculate engagement score for a post
 * Formula: likes + (2 × reposts) + (2.5 × replies)
 */
export function calculateEngagementScore(likes, reposts, replies) {
    return likes + (2 * reposts) + (2.5 * replies);
}
/**
 * Get engagement preset based on score relative to user's average
 * @param score - Post engagement score
 * @param average - User's average engagement score
 */
export function getEngagementPreset(score, average) {
    if (average === 0) {
        return score === 0 ? 'dead' : 'bangers';
    }
    const ratio = score / average;
    if (ratio < 0.1)
        return 'dead'; // <10% of average
    if (ratio < 0.5)
        return 'bombers'; // 10-50% of average
    if (ratio < 1.0)
        return 'mid'; // 50-100% of average
    if (ratio < 5.0)
        return 'bangers'; // 100-500% of average
    return 'viral'; // >500% of average
}
/**
 * AnalyticsManager - Bot detection and engagement analysis
 */
export class AnalyticsManager {
    /**
     * Analyze a single account for bot-like behavior
     * @param profile - Profile data to analyze
     */
    analyzeAccount(profile) {
        const signals = [];
        // Normalize field names (handle both camelCase and snake_case)
        const followers = profile.followersCount ?? profile.followers_count ?? 0;
        const following = profile.followsCount ?? profile.follows_count ?? 0;
        const posts = profile.postsCount ?? profile.posts_count ?? 0;
        const handle = profile.handle || '';
        const did = profile.did || '';
        // Calculate ratios
        const followingToFollowerRatio = followers > 0
            ? following / followers
            : (following > 0 ? Infinity : 0);
        const followerToFollowingRatio = following > 0
            ? followers / following
            : (followers > 0 ? Infinity : 0);
        // Check each ratio pattern
        for (const [patternName, patternFunc] of Object.entries(RATIO_PATTERNS)) {
            const isMatch = patternFunc(followers, following, posts);
            if (isMatch) {
                let detail = '';
                if (patternName.includes('following_ratio')) {
                    detail = `${this.formatPatternName(patternName)}: Following ${following.toLocaleString()} but only ${followers.toLocaleString()} followers (ratio: ${followingToFollowerRatio.toFixed(1)}:1)`;
                }
                else if (patternName.includes('follower_ratio')) {
                    detail = `${this.formatPatternName(patternName)}: ${followers.toLocaleString()} followers but only following ${following.toLocaleString()} (ratio: ${followerToFollowingRatio.toFixed(1)}:1)`;
                }
                else if (patternName === 'mass_following') {
                    detail = `Mass following: Following ${following.toLocaleString()} accounts`;
                }
                else if (patternName === 'no_engagement') {
                    detail = `No engagement: ${posts} posts but following ${following.toLocaleString()} accounts`;
                }
                signals.push({
                    type: patternName.includes('following') ? 'following_ratio' :
                        patternName.includes('follower') ? 'follower_ratio' : patternName,
                    weight: RATIO_WEIGHTS[patternName],
                    detail,
                });
            }
        }
        // Calculate composite score (highest weighted signal)
        const botScore = signals.length > 0
            ? Math.max(...signals.map(s => s.weight))
            : 0;
        // Determine recommendation
        let recommendation;
        if (botScore >= 0.7) {
            recommendation = 'highly_suspicious';
        }
        else if (botScore >= 0.4) {
            recommendation = 'suspicious';
        }
        else if (botScore >= 0.3) {
            recommendation = 'potentially_suspicious';
        }
        else {
            recommendation = 'likely_human';
        }
        return {
            handle,
            did,
            botScore,
            signals,
            recommendation,
            signalCount: signals.length,
            followers,
            following,
            posts,
            followingToFollowerRatio,
            followerToFollowingRatio,
            analysisTimestamp: new Date().toISOString(),
        };
    }
    /**
     * Analyze multiple accounts in batch
     * @param profiles - Array of profiles to analyze
     */
    batchAnalyze(profiles) {
        const results = profiles.map(profile => this.analyzeAccount(profile));
        // Sort by bot score (highest first)
        results.sort((a, b) => b.botScore - a.botScore);
        return results;
    }
    /**
     * Get statistics from batch analysis
     * @param analyses - Array of account analyses
     */
    getStatistics(analyses) {
        const total = analyses.length;
        if (total === 0) {
            return {
                totalAnalyzed: 0,
                highlySuspicious: 0,
                suspicious: 0,
                potentiallySuspicious: 0,
                likelyHuman: 0,
                botPercentage: 0,
                averageBotScore: 0,
                signalDistribution: {},
                recommendations: {
                    unfollowCount: 0,
                    reviewCount: 0,
                },
            };
        }
        const highlySuspicious = analyses.filter(a => a.recommendation === 'highly_suspicious').length;
        const suspicious = analyses.filter(a => a.recommendation === 'suspicious').length;
        const potentiallySuspicious = analyses.filter(a => a.recommendation === 'potentially_suspicious').length;
        const likelyHuman = analyses.filter(a => a.recommendation === 'likely_human').length;
        // Signal type distribution
        const signalDistribution = {};
        for (const analysis of analyses) {
            for (const signal of analysis.signals) {
                signalDistribution[signal.type] = (signalDistribution[signal.type] || 0) + 1;
            }
        }
        return {
            totalAnalyzed: total,
            highlySuspicious,
            suspicious,
            potentiallySuspicious,
            likelyHuman,
            botPercentage: ((highlySuspicious + suspicious) / total) * 100,
            averageBotScore: analyses.reduce((sum, a) => sum + a.botScore, 0) / total,
            signalDistribution,
            recommendations: {
                unfollowCount: highlySuspicious,
                reviewCount: suspicious + potentiallySuspicious,
            },
        };
    }
    /**
     * Analyze engagement for a set of posts
     * @param posts - Array of posts with engagement metrics
     */
    analyzeEngagement(posts) {
        if (posts.length === 0)
            return [];
        // Calculate scores for all posts
        const scores = posts.map(post => ({
            uri: post.uri,
            score: calculateEngagementScore(post.likeCount || 0, post.repostCount || 0, post.replyCount || 0),
        }));
        // Calculate average
        const average = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
        // Sort for percentile calculation
        const sortedScores = [...scores].sort((a, b) => a.score - b.score);
        return scores.map(({ uri, score }) => {
            const rank = sortedScores.findIndex(s => s.uri === uri);
            const percentile = ((rank + 1) / scores.length) * 100;
            return {
                uri,
                score,
                preset: getEngagementPreset(score, average),
                percentile,
                isAboveAverage: score > average,
                relativeScore: average > 0 ? score / average : (score > 0 ? Infinity : 0),
            };
        });
    }
    /**
     * Categorize posts by engagement preset
     * @param posts - Array of posts with engagement metrics
     */
    categorizeByEngagement(posts) {
        const analyses = this.analyzeEngagement(posts);
        const categories = {
            dead: [],
            bombers: [],
            mid: [],
            bangers: [],
            viral: [],
        };
        for (const analysis of analyses) {
            categories[analysis.preset].push(analysis.uri);
        }
        return categories;
    }
    /**
     * Get top performing posts
     * @param posts - Array of posts with engagement metrics
     * @param limit - Number of top posts to return
     */
    getTopPosts(posts, limit = 10) {
        const analyses = this.analyzeEngagement(posts);
        return analyses
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
    /**
     * Get dead threads (posts with no engagement)
     * @param posts - Array of posts with engagement metrics
     */
    getDeadThreads(posts) {
        return posts
            .filter(post => (post.likeCount || 0) === 0 &&
            (post.repostCount || 0) === 0 &&
            (post.replyCount || 0) === 0)
            .map(post => post.uri);
    }
    /**
     * Format pattern name for display
     */
    formatPatternName(name) {
        return name
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}
export default AnalyticsManager;
//# sourceMappingURL=analytics.js.map