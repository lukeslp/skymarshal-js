/**
 * Skymarshal Data Models
 *
 * Core data structures for Bluesky content management.
 * Ported from Python skymarshal package.
 *
 * @packageDocumentation
 */

/**
 * Deletion approval modes
 */
export type DeleteMode = 'all' | 'individual' | 'batch' | 'cancel';

/**
 * Content type categories
 */
export type ContentType = 'all' | 'posts' | 'replies' | 'comments' | 'reposts' | 'likes';

/**
 * Represents a piece of content from Bluesky
 */
export interface ContentItem {
  /** AT Protocol URI (at://did:plc:xxx/collection/rkey) */
  uri: string;
  /** Content identifier */
  cid: string;
  /** Type of content */
  contentType: ContentType;
  /** Post text content */
  text?: string;
  /** ISO timestamp of creation */
  createdAt?: string;
  /** Number of replies */
  replyCount: number;
  /** Number of reposts */
  repostCount: number;
  /** Number of likes */
  likeCount: number;
  /** Computed engagement score */
  engagementScore: number;
  /** Original API response data */
  rawData?: Record<string, unknown>;
}

/**
 * User-adjustable settings and defaults
 */
export interface UserSettings {
  /** Default download limit for content fetching */
  downloadLimitDefault: number;
  /** Default content categories to fetch */
  defaultCategories: ContentType[];
  /** Page size for API pagination */
  recordsPageSize: number;
  /** Batch size for engagement hydration */
  hydrateBatchSize: number;
  /** Number of concurrent category workers */
  categoryWorkers: number;
  /** Enable engagement caching */
  engagementCacheEnabled: boolean;
  /** Cache TTL for posts < 7 days old (seconds) */
  engagementCacheTtlRecent: number;
  /** Cache TTL for posts 7-30 days old (seconds) */
  engagementCacheTtlMedium: number;
  /** Cache TTL for posts > 30 days old (seconds) */
  engagementCacheTtlOld: number;
  /** Page size for file listings */
  fileListPageSize: number;
  /** Engagement threshold for "high engagement" classification */
  highEngagementThreshold: number;
  /** Use subject engagement for reposts */
  useSubjectEngagementForReposts: boolean;
  /** Fetch order: 'newest' or 'oldest' */
  fetchOrder: 'newest' | 'oldest';
  /** Computed: average likes per post */
  avgLikesPerPost: number;
  /** Computed: average engagement per post */
  avgEngagementPerPost: number;
}

/**
 * Search and filter criteria
 */
export interface SearchFilters {
  /** Keywords to match in content */
  keywords?: string[];
  /** Minimum engagement score */
  minEngagement?: number;
  /** Maximum engagement score */
  maxEngagement?: number;
  /** Minimum likes */
  minLikes?: number;
  /** Maximum likes */
  maxLikes?: number;
  /** Minimum reposts */
  minReposts?: number;
  /** Maximum reposts */
  maxReposts?: number;
  /** Minimum replies */
  minReplies?: number;
  /** Maximum replies */
  maxReplies?: number;
  /** Content type filter */
  contentType?: ContentType;
  /** Start date (ISO string) */
  startDate?: string;
  /** End date (ISO string) */
  endDate?: string;
  /** Subject URI contains */
  subjectContains?: string;
  /** Subject handle contains */
  subjectHandleContains?: string;
}

/**
 * Session data for authentication persistence
 */
export interface SessionData {
  /** User's handle */
  handle: string;
  /** User's DID */
  did: string;
  /** Access token */
  accessJwt: string;
  /** Refresh token */
  refreshJwt: string;
}

/**
 * Engagement statistics for a set of content
 */
export interface EngagementStats {
  /** Total items */
  totalItems: number;
  /** Total likes */
  totalLikes: number;
  /** Total reposts */
  totalReposts: number;
  /** Total replies */
  totalReplies: number;
  /** Average engagement score */
  avgEngagement: number;
  /** Maximum engagement score */
  maxEngagement: number;
  /** Minimum engagement score */
  minEngagement: number;
  /** Top performing items (by engagement) */
  topItems: ContentItem[];
  /** Items with zero engagement */
  deadItems: ContentItem[];
}

/**
 * Default user settings
 */
export const DEFAULT_SETTINGS: UserSettings = {
  downloadLimitDefault: 500,
  defaultCategories: ['posts', 'likes', 'reposts'],
  recordsPageSize: 100,
  hydrateBatchSize: 100,
  categoryWorkers: 3,
  engagementCacheEnabled: true,
  engagementCacheTtlRecent: 3600,    // 1 hour
  engagementCacheTtlMedium: 21600,   // 6 hours
  engagementCacheTtlOld: 86400,      // 24 hours
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
export function calculateEngagementScore(likes: number, reposts: number, replies: number): number {
  return likes + (2 * reposts) + (2.5 * replies);
}

/**
 * Update engagement score on a content item
 */
export function updateContentEngagement(item: ContentItem): ContentItem {
  return {
    ...item,
    engagementScore: calculateEngagementScore(item.likeCount, item.repostCount, item.replyCount),
  };
}

/**
 * Parse ISO date string to Date object
 */
export function parseDateTime(dateStr?: string): Date | null {
  if (!dateStr) return null;

  try {
    // Handle Z timezone marker
    const normalized = dateStr.replace('Z', '+00:00');
    return new Date(normalized);
  } catch {
    return null;
  }
}

/**
 * Merge and deduplicate content items
 */
export function mergeContentItems(
  newItems: ContentItem[],
  existingItems: ContentItem[],
  fetchOrder: 'newest' | 'oldest' = 'newest'
): ContentItem[] {
  // Merge by URI, new items overwrite existing
  const merged = new Map<string, ContentItem>();

  for (const item of existingItems) {
    if (item.uri) merged.set(item.uri, item);
  }
  for (const item of newItems) {
    if (item.uri) merged.set(item.uri, item);
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
export function createContentItem(
  uri: string,
  cid: string,
  contentType: ContentType,
  rawData?: Record<string, unknown>
): ContentItem {
  const item: ContentItem = {
    uri,
    cid,
    contentType,
    text: rawData?.text as string | undefined,
    createdAt: rawData?.createdAt as string | undefined,
    replyCount: (rawData?.replyCount as number) ?? 0,
    repostCount: (rawData?.repostCount as number) ?? 0,
    likeCount: (rawData?.likeCount as number) ?? 0,
    engagementScore: 0,
    rawData,
  };

  return updateContentEngagement(item);
}
