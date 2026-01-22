/**
 * Analytics utilities for Bluesky data analysis
 * Ported from Python analytics algorithms (bluebeam.py, blueye.py, bluefry.py)
 *
 * @module analytics
 */
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
export function calculateEngagementScore(engagement) {
    return (engagement.likes * 1.0 +
        engagement.reposts * 3.0 +
        engagement.replies * 2.0 +
        engagement.quotes * 4.0);
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
export function calculateEngagementRate(engagement, followerCount) {
    const totalEngagement = engagement.likes +
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
export function analyzePostEngagement(engagement, followerCount) {
    const totalEngagement = engagement.likes +
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
export function calculateFollowerRatio(followers, following) {
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
export function calculatePopularityScore(metrics) {
    const followerRatio = calculateFollowerRatio(metrics.followers, metrics.following);
    const activityBonus = Math.min(metrics.posts / 10, 100);
    return (metrics.followers * 0.5 +
        followerRatio * 1000 * 0.3 +
        activityBonus * 0.2);
}
/**
 * Calculate comprehensive popularity metrics for an account
 *
 * @param metrics - Account metrics
 * @returns Complete popularity analysis
 */
export function analyzeAccountPopularity(metrics) {
    return {
        ...metrics,
        followerRatio: calculateFollowerRatio(metrics.followers, metrics.following),
        popularityScore: calculatePopularityScore(metrics),
    };
}
// ============================================================================
// Bot Detection Utilities
// ============================================================================
/**
 * Check if handle matches default pattern (e.g., user12345.bsky.social)
 *
 * @param handle - Account handle
 * @returns True if handle matches default pattern
 */
export function hasDefaultHandle(handle) {
    if (!handle)
        return false;
    // Pattern: user followed by digits, optionally .bsky.social
    const defaultPattern = /^user\d+(?:\.bsky\.social)?$/i;
    return defaultPattern.test(handle);
}
/**
 * Check if bio contains suspicious URL patterns
 *
 * @param bio - Account bio text
 * @returns True if bio contains suspicious patterns
 */
export function hasSuspiciousUrls(bio) {
    if (!bio)
        return false;
    const suspiciousPatterns = [
        /bit\.ly/i, // URL shortener spam
        /tinyurl/i, // URL shortener spam
        /t\.co/i, // Twitter URL shortener (often spam)
        /crypto/i, // Crypto scam keywords
        /nft/i, // NFT scam keywords
        /airdrop/i, // Airdrop scam
        /giveaway/i, // Giveaway scam
        /discord\.gg/i, // Discord invite spam
        /telegram\.me/i, // Telegram spam
        /whatsapp/i, // WhatsApp spam
    ];
    return suspiciousPatterns.some(pattern => pattern.test(bio));
}
/**
 * Check if following count is exactly a round number (1000, 2000, 5000, 10000)
 *
 * @param following - Following count
 * @returns True if following is exactly a round number
 */
export function hasRoundFollowingCount(following) {
    return [1000, 2000, 5000, 10000].includes(following);
}
/**
 * Calculate account age in days
 *
 * @param createdAt - ISO timestamp of account creation
 * @returns Age in days, or null if createdAt invalid
 */
export function getAccountAgeInDays(createdAt) {
    if (!createdAt)
        return null;
    try {
        const created = new Date(createdAt);
        const now = new Date();
        const diffMs = now.getTime() - created.getTime();
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }
    catch {
        return null;
    }
}
// ============================================================================
// Enhanced Bot Detection with Signal Analysis
// ============================================================================
/**
 * Analyze account for bot signals with detailed breakdown
 *
 * Detects 13 bot/spam signals:
 * 1. massFollowing: Following > 1000 with followers < 100 (score: 3)
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
 * Categories:
 * - bot_likely: Score >= 8
 * - low_quality: Score >= 5
 * - suspicious: Score >= 3
 * - clean: Score < 3
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
export function analyzeBotSignals(profile) {
    const signals = [];
    let totalScore = 0;
    const followerRatio = calculateFollowerRatio(profile.followers, profile.following);
    const accountAge = getAccountAgeInDays(profile.createdAt);
    // Signal 1: Mass following with few followers
    const massFollowing = profile.following > 1000 && profile.followers < 100;
    if (massFollowing) {
        const score = 3;
        signals.push({
            name: 'massFollowing',
            detected: true,
            score,
            description: `Following ${profile.following} but only ${profile.followers} followers`,
        });
        totalScore += score;
    }
    // Signal 2: Very low ratio with high following
    const veryLowRatio = profile.following > 500 && followerRatio < 0.02;
    if (veryLowRatio) {
        const score = 2;
        signals.push({
            name: 'veryLowRatio',
            detected: true,
            score,
            description: `Follower ratio ${followerRatio.toFixed(3)} is extremely low`,
        });
        totalScore += score;
    }
    // Signal 3: No posts but mass following
    const noPostsMassFollow = profile.posts === 0 && profile.following > 100;
    if (noPostsMassFollow) {
        const score = 3;
        signals.push({
            name: 'noPostsMassFollow',
            detected: true,
            score,
            description: `No posts but following ${profile.following} accounts`,
        });
        totalScore += score;
    }
    // Signal 4: Round following count (bot pattern)
    const roundFollowing = hasRoundFollowingCount(profile.following);
    if (roundFollowing) {
        const score = 1;
        signals.push({
            name: 'roundFollowingCount',
            detected: true,
            score,
            description: `Following exactly ${profile.following} (suspicious round number)`,
        });
        totalScore += score;
    }
    // Signal 5: No profile info (missing both display name and bio)
    const noProfileInfo = !profile.displayName?.trim() && !profile.bio?.trim();
    if (noProfileInfo) {
        const score = 2;
        signals.push({
            name: 'noProfileInfo',
            detected: true,
            score,
            description: 'Missing both display name and bio',
        });
        totalScore += score;
    }
    // Signal 6: New account with mass following
    const newAccountMassFollow = accountAge !== null && accountAge < 30 && profile.following > 500;
    if (newAccountMassFollow) {
        const score = 2;
        signals.push({
            name: 'newAccountMassFollow',
            detected: true,
            score,
            description: `Account only ${accountAge} days old but following ${profile.following}`,
        });
        totalScore += score;
    }
    // Signal 7: Suspicious URLs in bio
    const suspiciousUrls = hasSuspiciousUrls(profile.bio);
    if (suspiciousUrls) {
        const score = 3;
        signals.push({
            name: 'suspiciousUrls',
            detected: true,
            score,
            description: 'Bio contains suspicious URL patterns (spam/scam)',
        });
        totalScore += score;
    }
    // Signal 8: Default handle pattern
    const defaultHandle = hasDefaultHandle(profile.handle);
    if (defaultHandle) {
        const score = 2;
        signals.push({
            name: 'defaultHandle',
            detected: true,
            score,
            description: `Handle "${profile.handle}" matches default pattern`,
        });
        totalScore += score;
    }
    // Signal 9: No bio (standalone check)
    if (!profile.bio?.trim()) {
        const score = 1;
        signals.push({
            name: 'noBio',
            detected: true,
            score,
            description: 'No bio',
        });
        totalScore += score;
    }
    // Signal 10: No avatar
    if (!profile.avatar) {
        const score = 1;
        signals.push({
            name: 'noAvatar',
            detected: true,
            score,
            description: 'No profile picture',
        });
        totalScore += score;
    }
    // Signal 11: Few followers
    if (profile.followers < 10) {
        const score = 2;
        signals.push({
            name: 'fewFollowers',
            detected: true,
            score,
            description: `Only ${profile.followers} followers`,
        });
        totalScore += score;
    }
    // Signal 12: Poor ratio (broader check)
    const poorRatio = followerRatio < 0.1 && profile.following > 100;
    if (poorRatio) {
        const score = 2;
        signals.push({
            name: 'poorRatio',
            detected: true,
            score,
            description: `Poor follower ratio ${followerRatio.toFixed(3)}`,
        });
        totalScore += score;
    }
    // Signal 13: Following many accounts
    if (profile.following > 5000) {
        const score = 1;
        signals.push({
            name: 'followingMany',
            detected: true,
            score,
            description: `Following ${profile.following} accounts`,
        });
        totalScore += score;
    }
    // Determine category based on total score
    let category;
    if (totalScore >= 8) {
        category = 'bot_likely';
    }
    else if (totalScore >= 5) {
        category = 'low_quality';
    }
    else if (totalScore >= 3) {
        category = 'suspicious';
    }
    else {
        category = 'clean';
    }
    // Check if account is legitimate (bonus criteria)
    const isLegitimate = profile.followers > 100 &&
        profile.posts > 10 &&
        !!profile.bio?.trim() &&
        !!profile.avatar &&
        followerRatio > 0.5;
    return {
        ...profile,
        signals,
        totalScore,
        category,
        isLegitimate,
    };
}
/**
 * Check if an account is likely a bot based on signal analysis
 *
 * @param profile - Account profile details
 * @param threshold - Score threshold (default: 8 for 'bot_likely')
 * @returns True if bot score >= threshold
 */
export function isLikelyBotEnhanced(profile, threshold = 8) {
    const result = analyzeBotSignals(profile);
    return result.totalScore >= threshold;
}
/**
 * Batch analyze multiple accounts for bot signals
 *
 * @param accounts - Array of account profiles
 * @returns Array of bot analysis results
 */
export function batchAnalyzeBotSignals(accounts) {
    return accounts.map(analyzeBotSignals);
}
/**
 * Calculate summary statistics for bot analysis results
 *
 * @param results - Array of bot analysis results
 * @returns Summary with category counts and common signals
 */
export function calculateBotAnalysisSummary(results) {
    const botLikely = results.filter(r => r.category === 'bot_likely').length;
    const lowQuality = results.filter(r => r.category === 'low_quality').length;
    const suspicious = results.filter(r => r.category === 'suspicious').length;
    const clean = results.filter(r => r.category === 'clean').length;
    const avgScore = results.length > 0
        ? results.reduce((sum, r) => sum + r.totalScore, 0) / results.length
        : 0;
    // Count common signals
    const commonSignals = {};
    results.forEach(result => {
        result.signals.forEach(signal => {
            if (signal.detected) {
                commonSignals[signal.name] = (commonSignals[signal.name] || 0) + 1;
            }
        });
    });
    return {
        totalAccounts: results.length,
        botLikely,
        lowQuality,
        suspicious,
        clean,
        avgScore,
        commonSignals,
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
export function calculateCleanupScore(profile) {
    let cleanupScore = 0;
    const issues = [];
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
    }
    else if (profile.posts < 5) {
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
    const isLegitimate = profile.followers > 100 &&
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
export function isLikelyBot(profile, threshold = 80) {
    const result = calculateCleanupScore(profile);
    return result.cleanupScore >= threshold;
}
/**
 * Categorize cleanup priority based on score
 *
 * @param cleanupScore - Calculated cleanup score
 * @returns Priority level
 */
export function getCleanupPriority(cleanupScore) {
    if (cleanupScore >= 80)
        return 'high';
    if (cleanupScore >= 50)
        return 'medium';
    if (cleanupScore >= 20)
        return 'low';
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
export function classifyPostType(content) {
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
export function hasLinks(text) {
    return text.includes('http') || text.includes('www.');
}
/**
 * Extract hashtags from text
 *
 * @param text - Text to analyze
 * @returns Array of hashtags (without # symbol)
 */
export function extractHashtags(text) {
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
export function extractMentions(text) {
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
export function batchAnalyzePosts(posts, followerCount) {
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
export function batchAnalyzeAccounts(accounts) {
    return accounts.map(calculateCleanupScore);
}
/**
 * Calculate summary statistics for a set of posts
 *
 * @param posts - Array of analyzed posts
 * @returns Summary statistics
 */
export function calculatePostSummary(posts) {
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
    const topPost = posts.reduce((top, p) => p.engagementScore > top.engagementScore ? p : top);
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
export function calculateAccountSummary(accounts) {
    const accountsWithIssues = accounts.filter(a => a.issues.length > 0);
    const highPriority = accounts.filter(a => a.cleanupScore >= 80).length;
    const mediumPriority = accounts.filter(a => a.cleanupScore >= 50 && a.cleanupScore < 80).length;
    const lowPriority = accounts.filter(a => a.cleanupScore >= 20 && a.cleanupScore < 50).length;
    // Count common issues
    const commonIssues = {};
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
//# sourceMappingURL=analytics.js.map