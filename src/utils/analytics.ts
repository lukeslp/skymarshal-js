/**
 * Analytics utilities for Bluesky data analysis
 * Ported from Python analytics algorithms (bluebeam.py, blueye.py, bluefry.py)
 *
 * @module analytics
 */

// ============================================================================
// Type Definitions
// ============================================================================

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
export type PostType =
  | 'photo'
  | 'video'
  | 'link'
  | 'long_text'
  | 'question'
  | 'text';

// ============================================================================
// Engagement Scoring (from bluebeam.py)
// ============================================================================

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
export function calculateEngagementScore(engagement: PostEngagement): number {
  return (
    engagement.likes * 1.0 +
    engagement.reposts * 3.0 +
    engagement.replies * 2.0 +
    engagement.quotes * 4.0
  );
}

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
export function calculateEngagementRate(
  engagement: PostEngagement,
  followerCount: number
): number {
  const totalEngagement =
    engagement.likes +
    engagement.reposts +
    engagement.replies +
    engagement.quotes;

  return (totalEngagement / Math.max(followerCount, 1)) * 100;
}

/**
 * Calculate comprehensive engagement metrics for a post
 *
 * @param engagement - Post engagement metrics
 * @param followerCount - Number of followers
 * @returns Complete engagement analysis
 */
export function analyzePostEngagement(
  engagement: PostEngagement,
  followerCount: number
): PostEngagementResult {
  const totalEngagement =
    engagement.likes +
    engagement.reposts +
    engagement.replies +
    engagement.quotes;

  return {
    ...engagement,
    totalEngagement,
    engagementScore: calculateEngagementScore(engagement),
    engagementRate: calculateEngagementRate(engagement, followerCount),
  };
}

// ============================================================================
// Popularity Scoring (from blueye.py)
// ============================================================================

/**
 * Calculate follower ratio (followers / following)
 *
 * Higher ratio indicates more influential account
 *
 * @param followers - Number of followers
 * @param following - Number of accounts following
 * @returns Follower ratio (minimum 1 following to avoid division by zero)
 */
export function calculateFollowerRatio(
  followers: number,
  following: number
): number {
  return followers / Math.max(following, 1);
}

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
export function calculatePopularityScore(metrics: AccountMetrics): number {
  const followerRatio = calculateFollowerRatio(metrics.followers, metrics.following);
  const activityBonus = Math.min(metrics.posts / 10, 100);

  return (
    metrics.followers * 0.5 +
    followerRatio * 1000 * 0.3 +
    activityBonus * 0.2
  );
}

/**
 * Calculate comprehensive popularity metrics for an account
 *
 * @param metrics - Account metrics
 * @returns Complete popularity analysis
 */
export function analyzeAccountPopularity(metrics: AccountMetrics): PopularityResult {
  return {
    ...metrics,
    followerRatio: calculateFollowerRatio(metrics.followers, metrics.following),
    popularityScore: calculatePopularityScore(metrics),
  };
}

// ============================================================================
// Cleanup/Bot Scoring (from bluefry.py)
// ============================================================================

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
export function calculateCleanupScore(profile: AccountProfile): CleanupResult {
  let cleanupScore = 0;
  const issues: string[] = [];

  // Check bio
  if (!profile.bio?.trim()) {
    issues.push('No bio');
    cleanupScore += 20;
  }

  // Check display name
  if (!profile.displayName?.trim()) {
    issues.push('No display name');
    cleanupScore += 15;
  }

  // Check avatar
  if (!profile.avatar) {
    issues.push('No profile picture');
    cleanupScore += 10;
  }

  // Check follower count
  if (profile.followers < 10) {
    issues.push('Very few followers (<10)');
    cleanupScore += 25;
  }

  // Check follower ratio
  const followerRatio = calculateFollowerRatio(profile.followers, profile.following);
  if (followerRatio < 0.1 && profile.following > 100) {
    issues.push('Poor follower ratio');
    cleanupScore += 30;
  }

  // Check post activity
  if (profile.posts === 0) {
    issues.push('No posts');
    cleanupScore += 20;
  } else if (profile.posts < 5) {
    issues.push('Very few posts (<5)');
    cleanupScore += 10;
  }

  // Check following count
  if (profile.following > 5000) {
    issues.push('Following many accounts (>5K)');
    cleanupScore += 15;
  }

  // Check suspicious pattern
  if (profile.following > 1000 && followerRatio < 0.05) {
    issues.push('Suspicious follow pattern');
    cleanupScore += 40;
  }

  // Check if account is legitimate (bonus reduction)
  const isLegitimate =
    profile.followers > 100 &&
    profile.posts > 10 &&
    !!profile.bio?.trim() &&
    !!profile.avatar;

  if (isLegitimate) {
    cleanupScore = Math.max(0, cleanupScore - 20);
  }

  return {
    ...profile,
    cleanupScore,
    issues,
    isLegitimate,
  };
}

/**
 * Check if an account is likely a bot based on cleanup score threshold
 *
 * @param profile - Account profile details
 * @param threshold - Score threshold (default: 80)
 * @returns True if likely bot
 */
export function isLikelyBot(profile: AccountProfile, threshold = 80): boolean {
  const result = calculateCleanupScore(profile);
  return result.cleanupScore >= threshold;
}

/**
 * Categorize cleanup priority based on score
 *
 * @param cleanupScore - Calculated cleanup score
 * @returns Priority level
 */
export function getCleanupPriority(
  cleanupScore: number
): 'high' | 'medium' | 'low' | 'none' {
  if (cleanupScore >= 80) return 'high';
  if (cleanupScore >= 50) return 'medium';
  if (cleanupScore >= 20) return 'low';
  return 'none';
}

// ============================================================================
// Post Type Classification
// ============================================================================

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
export function classifyPostType(content: PostContent): PostType {
  // Check media types first
  if (content.hasImages) {
    return 'photo';
  }

  if (content.hasVideo) {
    return 'video';
  }

  if (content.hasExternal) {
    return 'link';
  }

  // Check for links in content
  if (content.hasLinks) {
    return 'link';
  }

  // Check text length
  if (content.text.length > 200) {
    return 'long_text';
  }

  // Check for questions
  if (content.text.includes('?')) {
    return 'question';
  }

  // Default to text
  return 'text';
}

/**
 * Detect if text contains links
 *
 * @param text - Text to analyze
 * @returns True if text contains URLs
 */
export function hasLinks(text: string): boolean {
  return text.includes('http') || text.includes('www.');
}

/**
 * Extract hashtags from text
 *
 * @param text - Text to analyze
 * @returns Array of hashtags (without # symbol)
 */
export function extractHashtags(text: string): string[] {
  const regex = /#(\w+)/g;
  const matches = text.matchAll(regex);
  return Array.from(matches, m => m[1]);
}

/**
 * Extract mentions from text
 *
 * @param text - Text to analyze
 * @returns Array of mentions (with @ symbol)
 */
export function extractMentions(text: string): string[] {
  const regex = /@([\w.]+)/g;
  const matches = text.matchAll(regex);
  return Array.from(matches, m => `@${m[1]}`);
}

// ============================================================================
// Batch Analysis Utilities
// ============================================================================

/**
 * Analyze multiple posts in batch
 *
 * @param posts - Array of post engagement and content data
 * @param followerCount - Account's follower count
 * @returns Array of analyzed posts with scores
 */
export function batchAnalyzePosts(
  posts: Array<PostEngagement & Partial<PostContent>>,
  followerCount: number
): Array<PostEngagementResult & { postType?: PostType }> {
  return posts.map(post => {
    const engagement = analyzePostEngagement(post, followerCount);

    // Add post type if content info available
    if (post.text !== undefined) {
      return {
        ...engagement,
        postType: classifyPostType({
          text: post.text,
          hasImages: post.hasImages,
          hasVideo: post.hasVideo,
          hasExternal: post.hasExternal,
          hasLinks: post.hasLinks,
        }),
      };
    }

    return engagement;
  });
}

/**
 * Analyze multiple accounts in batch
 *
 * @param accounts - Array of account profiles
 * @returns Array of analyzed accounts with scores
 */
export function batchAnalyzeAccounts(
  accounts: AccountProfile[]
): CleanupResult[] {
  return accounts.map(calculateCleanupScore);
}

/**
 * Calculate summary statistics for a set of posts
 *
 * @param posts - Array of analyzed posts
 * @returns Summary statistics
 */
export function calculatePostSummary(posts: PostEngagementResult[]): {
  totalPosts: number;
  totalLikes: number;
  totalReposts: number;
  totalReplies: number;
  totalQuotes: number;
  avgEngagementScore: number;
  avgEngagementRate: number;
  topPost: PostEngagementResult | null;
} {
  if (posts.length === 0) {
    return {
      totalPosts: 0,
      totalLikes: 0,
      totalReposts: 0,
      totalReplies: 0,
      totalQuotes: 0,
      avgEngagementScore: 0,
      avgEngagementRate: 0,
      topPost: null,
    };
  }

  const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
  const totalReposts = posts.reduce((sum, p) => sum + p.reposts, 0);
  const totalReplies = posts.reduce((sum, p) => sum + p.replies, 0);
  const totalQuotes = posts.reduce((sum, p) => sum + p.quotes, 0);
  const avgEngagementScore = posts.reduce((sum, p) => sum + p.engagementScore, 0) / posts.length;
  const avgEngagementRate = posts.reduce((sum, p) => sum + p.engagementRate, 0) / posts.length;
  const topPost = posts.reduce((top, p) =>
    p.engagementScore > top.engagementScore ? p : top
  );

  return {
    totalPosts: posts.length,
    totalLikes,
    totalReposts,
    totalReplies,
    totalQuotes,
    avgEngagementScore,
    avgEngagementRate,
    topPost,
  };
}

/**
 * Calculate summary statistics for a set of accounts
 *
 * @param accounts - Array of analyzed accounts
 * @returns Summary statistics
 */
export function calculateAccountSummary(accounts: CleanupResult[]): {
  totalAccounts: number;
  cleanAccounts: number;
  accountsWithIssues: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  commonIssues: Record<string, number>;
} {
  const accountsWithIssues = accounts.filter(a => a.issues.length > 0);
  const highPriority = accounts.filter(a => a.cleanupScore >= 80).length;
  const mediumPriority = accounts.filter(a => a.cleanupScore >= 50 && a.cleanupScore < 80).length;
  const lowPriority = accounts.filter(a => a.cleanupScore >= 20 && a.cleanupScore < 50).length;

  // Count common issues
  const commonIssues: Record<string, number> = {};
  accounts.forEach(account => {
    account.issues.forEach(issue => {
      commonIssues[issue] = (commonIssues[issue] || 0) + 1;
    });
  });

  return {
    totalAccounts: accounts.length,
    cleanAccounts: accounts.length - accountsWithIssues.length,
    accountsWithIssues: accountsWithIssues.length,
    highPriority,
    mediumPriority,
    lowPriority,
    commonIssues,
  };
}
