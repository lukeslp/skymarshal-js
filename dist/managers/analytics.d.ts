/**
 * AnalyticsManager - Bot detection and engagement analysis
 * @module skymarshal-core/managers/analytics
 */
import type { Profile } from './network.js';
/** Bot detection signal */
export interface BotSignal {
    type: string;
    weight: number;
    detail: string;
}
/** Account analysis result */
export interface AccountAnalysis {
    handle: string;
    did: string;
    botScore: number;
    signals: BotSignal[];
    recommendation: 'highly_suspicious' | 'suspicious' | 'potentially_suspicious' | 'likely_human';
    signalCount: number;
    followers: number;
    following: number;
    posts: number;
    followingToFollowerRatio: number;
    followerToFollowingRatio: number;
    analysisTimestamp: string;
}
/** Engagement preset category */
export type EngagementPreset = 'dead' | 'bombers' | 'mid' | 'bangers' | 'viral';
/** Post engagement analysis */
export interface EngagementAnalysis {
    uri: string;
    score: number;
    preset: EngagementPreset;
    percentile: number;
    isAboveAverage: boolean;
    relativeScore: number;
}
/** Batch analysis statistics */
export interface AnalysisStatistics {
    totalAnalyzed: number;
    highlySuspicious: number;
    suspicious: number;
    potentiallySuspicious: number;
    likelyHuman: number;
    botPercentage: number;
    averageBotScore: number;
    signalDistribution: Record<string, number>;
    recommendations: {
        unfollowCount: number;
        reviewCount: number;
    };
}
/**
 * Calculate engagement score for a post
 * Formula: likes + (2 × reposts) + (2.5 × replies)
 */
export declare function calculateEngagementScore(likes: number, reposts: number, replies: number): number;
/**
 * Get engagement preset based on score relative to user's average
 * @param score - Post engagement score
 * @param average - User's average engagement score
 */
export declare function getEngagementPreset(score: number, average: number): EngagementPreset;
/**
 * AnalyticsManager - Bot detection and engagement analysis
 */
export declare class AnalyticsManager {
    /**
     * Analyze a single account for bot-like behavior
     * @param profile - Profile data to analyze
     */
    analyzeAccount(profile: Profile | {
        did: string;
        handle: string;
        followersCount?: number;
        followsCount?: number;
        postsCount?: number;
        followers_count?: number;
        follows_count?: number;
        posts_count?: number;
    }): AccountAnalysis;
    /**
     * Analyze multiple accounts in batch
     * @param profiles - Array of profiles to analyze
     */
    batchAnalyze(profiles: Array<Profile | any>): AccountAnalysis[];
    /**
     * Get statistics from batch analysis
     * @param analyses - Array of account analyses
     */
    getStatistics(analyses: AccountAnalysis[]): AnalysisStatistics;
    /**
     * Analyze engagement for a set of posts
     * @param posts - Array of posts with engagement metrics
     */
    analyzeEngagement(posts: Array<{
        uri: string;
        likeCount?: number;
        repostCount?: number;
        replyCount?: number;
    }>): EngagementAnalysis[];
    /**
     * Categorize posts by engagement preset
     * @param posts - Array of posts with engagement metrics
     */
    categorizeByEngagement(posts: Array<{
        uri: string;
        likeCount?: number;
        repostCount?: number;
        replyCount?: number;
    }>): Record<EngagementPreset, string[]>;
    /**
     * Get top performing posts
     * @param posts - Array of posts with engagement metrics
     * @param limit - Number of top posts to return
     */
    getTopPosts(posts: Array<{
        uri: string;
        likeCount?: number;
        repostCount?: number;
        replyCount?: number;
    }>, limit?: number): EngagementAnalysis[];
    /**
     * Get dead threads (posts with no engagement)
     * @param posts - Array of posts with engagement metrics
     */
    getDeadThreads(posts: Array<{
        uri: string;
        likeCount?: number;
        repostCount?: number;
        replyCount?: number;
    }>): string[];
    /**
     * Format pattern name for display
     */
    private formatPatternName;
}
export default AnalyticsManager;
//# sourceMappingURL=analytics.d.ts.map