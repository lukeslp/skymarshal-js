/**
 * Analytics utilities for Bluesky data analysis
 * Ported from Python analytics algorithms (bluebeam.py, blueye.py, bluefry.py)
 *
 * @module analytics
 */
/**
 * Post engagement metrics interface
 */
export interface PostEngagement {
    likes: number;
    reposts: number;
    replies: number;
    quotes: number;
}
/**
 * Post engagement result with calculated scores
 */
export interface PostEngagementResult extends PostEngagement {
    totalEngagement: number;
    engagementScore: number;
    engagementRate: number;
}
/**
 * Account metrics interface
 */
export interface AccountMetrics {
    followers: number;
    following: number;
    posts: number;
}
/**
 * Account popularity result with calculated scores
 */
export interface PopularityResult extends AccountMetrics {
    followerRatio: number;
    popularityScore: number;
}
/**
 * Account profile details for bot/cleanup scoring
 */
export interface AccountProfile extends AccountMetrics {
    bio?: string;
    displayName?: string;
    avatar?: string;
    handle?: string;
    createdAt?: string;
}
/**
 * Individual bot signal detection result
 */
export interface BotSignal {
    name: string;
    detected: boolean;
    score: number;
    description: string;
}
/**
 * Enhanced bot detection result with signal breakdown
 */
export interface BotAnalysisResult extends AccountProfile {
    signals: BotSignal[];
    totalScore: number;
    category: 'bot_likely' | 'low_quality' | 'suspicious' | 'clean';
    isLegitimate: boolean;
}
/**
 * Cleanup/bot detection result
 */
export interface CleanupResult extends AccountProfile {
    cleanupScore: number;
    issues: string[];
    isLegitimate: boolean;
}
/**
 * Post content details for type classification
 */
export interface PostContent {
    text: string;
    hasImages?: boolean;
    hasVideo?: boolean;
    hasExternal?: boolean;
    hasLinks?: boolean;
}
/**
 * Valid post type classifications
 */
export type PostType = 'photo' | 'video' | 'link' | 'long_text' | 'question' | 'text';
/**
 * Calculate engagement score for a post using weighted metrics
 *
 * Formula:
 * - Likes: 1.0x weight
 * - Reposts: 3.0x weight
 * - Replies: 2.0x weight
 * - Quotes: 4.0x weight
 *
 * @param engagement - Post engagement metrics
 * @returns Weighted engagement score
 *
 * @example
 * ```ts
 * const score = calculateEngagementScore({
 *   likes: 100,
 *   reposts: 10,
 *   replies: 5,
 *   quotes: 2
 * });
 * // Returns: 148 (100*1 + 10*3 + 5*2 + 2*4)
 * ```
 */
export declare function calculateEngagementScore(engagement: PostEngagement): number;
/**
 * Calculate engagement rate as a percentage of follower count
 *
 * Formula: (total_engagement / follower_count) * 100
 *
 * @param engagement - Post engagement metrics
 * @param followerCount - Number of followers
 * @returns Engagement rate as percentage
 *
 * @example
 * ```ts
 * const rate = calculateEngagementRate({
 *   likes: 50,
 *   reposts: 5,
 *   replies: 3,
 *   quotes: 2
 * }, 1000);
 * // Returns: 6.0 (60 total engagement / 1000 followers * 100)
 * ```
 */
export declare function calculateEngagementRate(engagement: PostEngagement, followerCount: number): number;
/**
 * Calculate comprehensive engagement metrics for a post
 *
 * @param engagement - Post engagement metrics
 * @param followerCount - Number of followers
 * @returns Complete engagement analysis
 */
export declare function analyzePostEngagement(engagement: PostEngagement, followerCount: number): PostEngagementResult;
/**
 * Calculate follower ratio (followers / following)
 *
 * Higher ratio indicates more influential account
 *
 * @param followers - Number of followers
 * @param following - Number of accounts following
 * @returns Follower ratio (minimum 1 following to avoid division by zero)
 */
export declare function calculateFollowerRatio(followers: number, following: number): number;
/**
 * Calculate popularity score for an account
 *
 * Formula:
 * - Raw followers: 0.5x weight
 * - Follower ratio (scaled): 0.3x weight (scaled by 1000)
 * - Activity bonus: 0.2x weight (posts/10, capped at 100)
 *
 * @param metrics - Account metrics
 * @returns Popularity score
 *
 * @example
 * ```ts
 * const score = calculatePopularityScore({
 *   followers: 1000,
 *   following: 500,
 *   posts: 200
 * });
 * // Returns: 1120 (1000*0.5 + (1000/500)*1000*0.3 + min(200/10,100)*0.2)
 * ```
 */
export declare function calculatePopularityScore(metrics: AccountMetrics): number;
/**
 * Calculate comprehensive popularity metrics for an account
 *
 * @param metrics - Account metrics
 * @returns Complete popularity analysis
 */
export declare function analyzeAccountPopularity(metrics: AccountMetrics): PopularityResult;
/**
 * Check if handle matches default pattern (e.g., user12345.bsky.social)
 *
 * @param handle - Account handle
 * @returns True if handle matches default pattern
 */
export declare function hasDefaultHandle(handle?: string): boolean;
/**
 * Check if bio contains suspicious URL patterns
 *
 * @param bio - Account bio text
 * @returns True if bio contains suspicious patterns
 */
export declare function hasSuspiciousUrls(bio?: string): boolean;
/**
 * Check if following count is exactly a round number (1000, 2000, 5000, 10000)
 *
 * @param following - Following count
 * @returns True if following is exactly a round number
 */
export declare function hasRoundFollowingCount(following: number): boolean;
/**
 * Calculate account age in days
 *
 * @param createdAt - ISO timestamp of account creation
 * @returns Age in days, or null if createdAt invalid
 */
export declare function getAccountAgeInDays(createdAt?: string): number | null;
/**
 * Analyze account for bot signals with detailed breakdown
 *
 * Detects 13 bot/spam signals (ported from bluevibes.py):
 * 1. massFollowing: Following > 1000 with followers < following * 0.05 (score: 3)
 * 2. veryLowRatio: Ratio < 0.02 with following > 500 (score: 2)
 * 3. noPostsMassFollow: 0 posts but following > 100 (score: 3)
 * 4. roundFollowingCount: Exactly 1000, 2000, 5000, or 10000 following (score: 1)
 * 5. noProfileInfo: Missing both displayName AND bio (score: 2)
 * 6. newAccountMassFollow: Account < 30 days old with following > 500 (score: 2)
 * 7. suspiciousUrls: Bio contains spam/scam URL patterns (score: 3)
 * 8. defaultHandle: Handle matches user12345 pattern (score: 2)
 * 9. noBio: Missing bio (score: 1)
 * 10. noAvatar: Missing profile picture (score: 1)
 * 11. fewFollowers: < 10 followers (score: 2)
 * 12. poorRatio: Ratio < 0.1 with following > 100 (score: 2)
 * 13. followingMany: Following > 5000 (score: 1)
 *
 * Categories (aligned with bluevibes):
 * - bot_likely: Score >= 4
 * - low_quality: Score >= 2
 * - suspicious: Score >= 1
 * - clean: Score < 1
 *
 * @param profile - Account profile with metrics and metadata
 * @returns Detailed bot analysis with signal breakdown
 *
 * @example
 * ```ts
 * const result = analyzeBotSignals({
 *   followers: 5,
 *   following: 1000,
 *   posts: 0,
 *   bio: '',
 *   displayName: '',
 *   handle: 'user12345.bsky.social',
 *   createdAt: '2024-01-15T00:00:00Z'
 * });
 * // Returns high bot score with multiple signals detected
 * ```
 */
export declare function analyzeBotSignals(profile: AccountProfile): BotAnalysisResult;
/**
 * Check if an account is likely a bot based on signal analysis
 *
 * @param profile - Account profile details
 * @param threshold - Score threshold (default: 4 for 'bot_likely', aligned with bluevibes)
 * @returns True if bot score >= threshold
 */
export declare function isLikelyBotEnhanced(profile: AccountProfile, threshold?: number): boolean;
/**
 * Batch analyze multiple accounts for bot signals
 *
 * @param accounts - Array of account profiles
 * @returns Array of bot analysis results
 */
export declare function batchAnalyzeBotSignals(accounts: AccountProfile[]): BotAnalysisResult[];
/**
 * Calculate summary statistics for bot analysis results
 *
 * @param results - Array of bot analysis results
 * @returns Summary with category counts and common signals
 */
export declare function calculateBotAnalysisSummary(results: BotAnalysisResult[]): {
    totalAccounts: number;
    botLikely: number;
    lowQuality: number;
    suspicious: number;
    clean: number;
    avgScore: number;
    commonSignals: Record<string, number>;
};
/**
 * Calculate cleanup score for an account (higher = more likely bot/low-value)
 *
 * Scoring system:
 * - No bio: +20
 * - No display name: +15
 * - No avatar: +10
 * - Few followers (<10): +25
 * - Poor ratio (<0.1 && following>100): +30
 * - No posts: +20
 * - Few posts (<5): +10
 * - Following many (>5000): +15
 * - Suspicious pattern (following>1000 && ratio<0.05): +40
 * - Legitimate account bonus: -20 (if followers>100 && posts>10 && bio && avatar)
 *
 * @param profile - Account profile details
 * @returns Cleanup analysis with score and issues
 *
 * @example
 * ```ts
 * const result = calculateCleanupScore({
 *   followers: 5,
 *   following: 1000,
 *   posts: 0,
 *   bio: '',
 *   displayName: '',
 *   avatar: ''
 * });
 * // High cleanup score with multiple issues
 * ```
 */
export declare function calculateCleanupScore(profile: AccountProfile): CleanupResult;
/**
 * Check if an account is likely a bot based on cleanup score threshold
 *
 * @param profile - Account profile details
 * @param threshold - Score threshold (default: 80)
 * @returns True if likely bot
 */
export declare function isLikelyBot(profile: AccountProfile, threshold?: number): boolean;
/**
 * Categorize cleanup priority based on score
 *
 * @param cleanupScore - Calculated cleanup score
 * @returns Priority level
 */
export declare function getCleanupPriority(cleanupScore: number): 'high' | 'medium' | 'low' | 'none';
/**
 * Classify post type based on content characteristics
 *
 * Classification logic:
 * 1. Has images → 'photo'
 * 2. Has video → 'video'
 * 3. Has external link → 'link'
 * 4. Has links → 'link'
 * 5. Text > 200 chars → 'long_text'
 * 6. Contains '?' → 'question'
 * 7. Default → 'text'
 *
 * @param content - Post content details
 * @returns Classified post type
 *
 * @example
 * ```ts
 * classifyPostType({
 *   text: 'Check out this cool photo!',
 *   hasImages: true
 * }); // Returns: 'photo'
 *
 * classifyPostType({
 *   text: 'What do you think about this?'
 * }); // Returns: 'question'
 * ```
 */
export declare function classifyPostType(content: PostContent): PostType;
/**
 * Detect if text contains links
 *
 * @param text - Text to analyze
 * @returns True if text contains URLs
 */
export declare function hasLinks(text: string): boolean;
/**
 * Extract hashtags from text
 *
 * @param text - Text to analyze
 * @returns Array of hashtags (without # symbol)
 */
export declare function extractHashtags(text: string): string[];
/**
 * Extract mentions from text
 *
 * @param text - Text to analyze
 * @returns Array of mentions (with @ symbol)
 */
export declare function extractMentions(text: string): string[];
/**
 * Analyze multiple posts in batch
 *
 * @param posts - Array of post engagement and content data
 * @param followerCount - Account's follower count
 * @returns Array of analyzed posts with scores
 */
export declare function batchAnalyzePosts(posts: Array<PostEngagement & Partial<PostContent>>, followerCount: number): Array<PostEngagementResult & {
    postType?: PostType;
}>;
/**
 * Analyze multiple accounts in batch
 *
 * @param accounts - Array of account profiles
 * @returns Array of analyzed accounts with scores
 */
export declare function batchAnalyzeAccounts(accounts: AccountProfile[]): CleanupResult[];
/**
 * Calculate summary statistics for a set of posts
 *
 * @param posts - Array of analyzed posts
 * @returns Summary statistics
 */
export declare function calculatePostSummary(posts: PostEngagementResult[]): {
    totalPosts: number;
    totalLikes: number;
    totalReposts: number;
    totalReplies: number;
    totalQuotes: number;
    avgEngagementScore: number;
    avgEngagementRate: number;
    topPost: PostEngagementResult | null;
};
/**
 * Calculate summary statistics for a set of accounts
 *
 * @param accounts - Array of analyzed accounts
 * @returns Summary statistics
 */
export declare function calculateAccountSummary(accounts: CleanupResult[]): {
    totalAccounts: number;
    cleanAccounts: number;
    accountsWithIssues: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    commonIssues: Record<string, number>;
};
//# sourceMappingURL=analytics.d.ts.map