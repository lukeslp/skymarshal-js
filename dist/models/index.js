/**
 * Skymarshal Data Models
 *
 * Core data structures for Bluesky content management.
 * Ported from Python skymarshal package.
 *
 * @packageDocumentation
 */
/**
 * Default user settings
 */
export const DEFAULT_SETTINGS = {
    downloadLimitDefault: 500,
    defaultCategories: ['posts', 'likes', 'reposts'],
    recordsPageSize: 100,
    hydrateBatchSize: 100,
    categoryWorkers: 3,
    engagementCacheEnabled: true,
    engagementCacheTtlRecent: 3600, // 1 hour
    engagementCacheTtlMedium: 21600, // 6 hours
    engagementCacheTtlOld: 86400, // 24 hours
    fileListPageSize: 10,
    highEngagementThreshold: 20,
    useSubjectEngagementForReposts: true,
    fetchOrder: 'newest',
    avgLikesPerPost: 0,
    avgEngagementPerPost: 0,
};
/**
 * Calculate engagement score for content
 *
 * Weighting: Likes (1x) + Reposts (2x) + Replies (2.5x)
 * Rationale: Replies require most effort, reposts show strong approval
 */
export function calculateEngagementScore(likes, reposts, replies) {
    return likes + (2 * reposts) + (2.5 * replies);
}
/**
 * Update engagement score on a content item
 */
export function updateContentEngagement(item) {
    return {
        ...item,
        engagementScore: calculateEngagementScore(item.likeCount, item.repostCount, item.replyCount),
    };
}
/**
 * Parse ISO date string to Date object
 */
export function parseDateTime(dateStr) {
    if (!dateStr)
        return null;
    try {
        // Handle Z timezone marker
        const normalized = dateStr.replace('Z', '+00:00');
        return new Date(normalized);
    }
    catch {
        return null;
    }
}
/**
 * Merge and deduplicate content items
 */
export function mergeContentItems(newItems, existingItems, fetchOrder = 'newest') {
    // Merge by URI, new items overwrite existing
    const merged = new Map();
    for (const item of existingItems) {
        if (item.uri)
            merged.set(item.uri, item);
    }
    for (const item of newItems) {
        if (item.uri)
            merged.set(item.uri, item);
    }
    const items = Array.from(merged.values());
    // Sort by creation date
    items.sort((a, b) => {
        const dateA = parseDateTime(a.createdAt)?.getTime() ?? 0;
        const dateB = parseDateTime(b.createdAt)?.getTime() ?? 0;
        return fetchOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    return items;
}
/**
 * Create a ContentItem from raw API data
 */
export function createContentItem(uri, cid, contentType, rawData) {
    const item = {
        uri,
        cid,
        contentType,
        text: rawData?.text,
        createdAt: rawData?.createdAt,
        replyCount: rawData?.replyCount ?? 0,
        repostCount: rawData?.repostCount ?? 0,
        likeCount: rawData?.likeCount ?? 0,
        engagementScore: 0,
        rawData,
    };
    return updateContentEngagement(item);
}
//# sourceMappingURL=index.js.map