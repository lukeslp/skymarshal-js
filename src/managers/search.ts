/**
 * Skymarshal Search Manager
 *
 * Advanced content search, filtering, and analysis operations.
 * Core library port - no CLI dependencies.
 *
 * @packageDocumentation
 */

import type {
  ContentItem,
  ContentType,
  SearchFilters,
  UserSettings,
  EngagementStats,
} from '../models/index.js';
import {
  calculateEngagementScore,
  parseDateTime,
  DEFAULT_SETTINGS,
} from '../models/index.js';

/**
 * Sort mode options
 */
export type SortMode =
  | 'newest'
  | 'oldest'
  | 'eng_desc'
  | 'eng_asc'
  | 'likes_desc'
  | 'replies_desc'
  | 'reposts_desc';

/**
 * Compiled keyword patterns for search
 */
interface CompiledPatterns {
  positive: {
    caseSensitive?: RegExp;
    caseInsensitive?: RegExp;
  };
  negative: RegExp[];
  required: RegExp[];
}

/**
 * Search manager configuration
 */
export interface SearchManagerOptions {
  /** User settings for filtering behavior */
  settings?: Partial<UserSettings>;
}

/**
 * Manages content search, filtering, and statistics
 *
 * @example
 * ```ts
 * const search = new SearchManager();
 *
 * // Filter content
 * const filters: SearchFilters = {
 *   minLikes: 10,
 *   contentType: 'posts',
 * };
 * const results = search.filterContent(content, filters);
 *
 * // Sort results
 * const sorted = search.sortResults(results, 'eng_desc');
 *
 * // Get statistics
 * const stats = search.calculateStatistics(results);
 * ```
 */
export class SearchManager {
  private settings: UserSettings;

  constructor(options: SearchManagerOptions = {}) {
    this.settings = { ...DEFAULT_SETTINGS, ...options.settings };
  }

  /**
   * Update settings
   */
  updateSettings(settings: Partial<UserSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Filter content using search filters
   *
   * @param items - Content items to filter
   * @param filters - Search filter criteria
   * @returns Filtered content items
   */
  filterContent(items: ContentItem[], filters: SearchFilters): ContentItem[] {
    let filtered = [...items];

    // Parse date filters
    const startDate = filters.startDate ? parseDateTime(filters.startDate) : null;
    const endDate = filters.endDate ? parseDateTime(filters.endDate) : null;

    const useSubject = this.settings.useSubjectEngagementForReposts;

    // Helper to get engagement counts (handles repost subject engagement)
    const getCounts = (item: ContentItem): [number, number, number] => {
      if (item.contentType === 'reposts' && useSubject && item.rawData) {
        const likes = Number(item.rawData.subject_like_count ?? 0);
        const reposts = Number(item.rawData.subject_repost_count ?? 0);
        const replies = Number(item.rawData.subject_reply_count ?? 0);
        return [likes, reposts, replies];
      }
      return [item.likeCount, item.repostCount, item.replyCount];
    };

    // Compile keyword patterns
    const patterns = filters.keywords?.length
      ? this.compileSearchPatterns(filters.keywords)
      : null;

    // Apply keyword filter
    if (patterns) {
      filtered = filtered.filter((item) =>
        this.passesKeywordFilters(item.text, patterns)
      );
    }

    // Apply engagement and date filters
    filtered = filtered.filter((item) => {
      const [likes, reposts, replies] = getCounts(item);
      const engagement = calculateEngagementScore(likes, reposts, replies);

      // Date range filter
      if (startDate || endDate) {
        const itemDate = parseDateTime(item.createdAt);
        if (!itemDate) return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
      }

      // Engagement filters
      const minEng = filters.minEngagement ?? 0;
      const maxEng = filters.maxEngagement ?? Number.MAX_SAFE_INTEGER;
      const minLikes = filters.minLikes ?? 0;
      const maxLikes = filters.maxLikes ?? Number.MAX_SAFE_INTEGER;
      const minReposts = filters.minReposts ?? 0;
      const maxReposts = filters.maxReposts ?? Number.MAX_SAFE_INTEGER;
      const minReplies = filters.minReplies ?? 0;
      const maxReplies = filters.maxReplies ?? Number.MAX_SAFE_INTEGER;

      return (
        engagement >= minEng &&
        engagement <= maxEng &&
        likes >= minLikes &&
        likes <= maxLikes &&
        reposts >= minReposts &&
        reposts <= maxReposts &&
        replies >= minReplies &&
        replies <= maxReplies
      );
    });

    // Content type filter
    if (filters.contentType && filters.contentType !== 'all') {
      filtered = filtered.filter((item) => {
        switch (filters.contentType) {
          case 'posts':
            return item.contentType === 'posts';
          case 'replies':
          case 'comments':
            return item.contentType === 'replies' || item.contentType === 'comments';
          case 'reposts':
            return item.contentType === 'reposts';
          case 'likes':
            return item.contentType === 'likes';
          default:
            return true;
        }
      });
    }

    // Subject URI filter (for likes/reposts)
    if (filters.subjectContains) {
      const subLower = filters.subjectContains.toLowerCase();
      filtered = filtered.filter((item) => {
        if (item.contentType !== 'likes' && item.contentType !== 'reposts') {
          return true;
        }
        const subjectUri = item.rawData?.subject_uri as string | undefined;
        return subjectUri && subjectUri.toLowerCase().includes(subLower);
      });
    }

    // Subject handle filter (for likes/reposts)
    if (filters.subjectHandleContains) {
      const handleLower = filters.subjectHandleContains.toLowerCase();
      filtered = filtered.filter((item) => {
        if (item.contentType !== 'likes' && item.contentType !== 'reposts') {
          return true;
        }
        const subjectHandle = item.rawData?.subject_handle as string | undefined;
        return subjectHandle && subjectHandle.toLowerCase().includes(handleLower);
      });
    }

    // Sort by creation date
    const order = this.settings.fetchOrder;
    filtered.sort((a, b) => {
      const dateA = parseDateTime(a.createdAt)?.getTime() ?? 0;
      const dateB = parseDateTime(b.createdAt)?.getTime() ?? 0;
      return order === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }

  /**
   * Sort results by specified criteria
   *
   * @param items - Content items to sort
   * @param mode - Sort mode
   * @returns Sorted content items
   */
  sortResults(items: ContentItem[], mode: SortMode): ContentItem[] {
    const sorted = [...items];

    const getDate = (item: ContentItem): number =>
      parseDateTime(item.createdAt)?.getTime() ?? 0;

    const getEngagement = (item: ContentItem): number =>
      calculateEngagementScore(item.likeCount, item.repostCount, item.replyCount);

    switch (mode) {
      case 'newest':
        sorted.sort((a, b) => getDate(b) - getDate(a));
        break;
      case 'oldest':
        sorted.sort((a, b) => getDate(a) - getDate(b));
        break;
      case 'eng_desc':
        sorted.sort((a, b) => getEngagement(b) - getEngagement(a));
        break;
      case 'eng_asc':
        sorted.sort((a, b) => getEngagement(a) - getEngagement(b));
        break;
      case 'likes_desc':
        sorted.sort((a, b) => b.likeCount - a.likeCount);
        break;
      case 'replies_desc':
        sorted.sort((a, b) => b.replyCount - a.replyCount);
        break;
      case 'reposts_desc':
        sorted.sort((a, b) => b.repostCount - a.repostCount);
        break;
    }

    return sorted;
  }

  /**
   * Get available sort options with display names
   */
  getSortOptions(): Record<SortMode, string> {
    return {
      newest: 'Newest first',
      oldest: 'Oldest first',
      eng_desc: 'Most engagement',
      eng_asc: 'Least engagement',
      likes_desc: 'Most likes',
      replies_desc: 'Most replies',
      reposts_desc: 'Most reposts',
    };
  }

  /**
   * Calculate engagement presets based on user's average likes
   *
   * @returns Preset thresholds for categorizing content
   */
  getEngagementPresets(): {
    dead: { maxLikes: number; maxEngagement: number };
    bombers: { minLikes: number; maxLikes: number };
    mid: { minLikes: number; maxLikes: number };
    bangers: { minLikes: number };
    viral: { minLikes: number };
  } {
    const avgLikes = this.settings.avgLikesPerPost || 0;
    const half = Math.floor(Math.max(0, avgLikes * 0.5));
    const oneHalf = Math.floor(Math.max(1, avgLikes * 1.5));
    const double = Math.floor(Math.max(1, avgLikes * 2.0));
    const viralRelative = Math.floor(Math.max(10, avgLikes * 10));
    const viralThreshold = Math.max(viralRelative, 2000);

    return {
      dead: { maxLikes: 0, maxEngagement: 0 },
      bombers: { minLikes: 0, maxLikes: Math.max(0, half) },
      mid: { minLikes: Math.max(0, half), maxLikes: Math.max(1, oneHalf) },
      bangers: { minLikes: Math.max(1, double) },
      viral: { minLikes: viralThreshold },
    };
  }

  /**
   * Calculate comprehensive statistics for content items
   *
   * @param items - Content items to analyze
   * @returns Engagement statistics
   */
  calculateStatistics(items: ContentItem[]): EngagementStats {
    if (!items.length) {
      return {
        totalItems: 0,
        totalLikes: 0,
        totalReposts: 0,
        totalReplies: 0,
        avgEngagement: 0,
        maxEngagement: 0,
        minEngagement: 0,
        topItems: [],
        deadItems: [],
      };
    }

    // Separate by type - posts and replies can have engagement
    const postsAndReplies = items.filter(
      (item) => item.contentType === 'posts' || item.contentType === 'replies'
    );

    // Calculate totals
    let totalLikes = 0;
    let totalReposts = 0;
    let totalReplies = 0;
    const engagementScores: { item: ContentItem; score: number }[] = [];

    for (const item of postsAndReplies) {
      totalLikes += item.likeCount;
      totalReposts += item.repostCount;
      totalReplies += item.replyCount;

      const score = calculateEngagementScore(
        item.likeCount,
        item.repostCount,
        item.replyCount
      );
      engagementScores.push({ item, score });
    }

    // Calculate averages
    const count = postsAndReplies.length || 1;
    const avgEngagement = engagementScores.reduce((sum, e) => sum + e.score, 0) / count;

    // Find min/max
    const scores = engagementScores.map((e) => e.score);
    const maxEngagement = scores.length ? Math.max(...scores) : 0;
    const minEngagement = scores.length ? Math.min(...scores) : 0;

    // Get high engagement threshold
    const highThreshold = Math.max(10, avgEngagement * 2);

    // Top items (high engagement)
    const topItems = engagementScores
      .filter((e) => e.score >= highThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((e) => e.item);

    // Dead items (zero engagement)
    const deadItems = engagementScores
      .filter((e) => e.score === 0)
      .map((e) => e.item);

    return {
      totalItems: items.length,
      totalLikes,
      totalReposts,
      totalReplies,
      avgEngagement,
      maxEngagement,
      minEngagement,
      topItems,
      deadItems,
    };
  }

  /**
   * Compile search patterns with support for operators
   *
   * Supported operators:
   * - "exact phrase" - Case-sensitive exact phrase
   * - -keyword - Exclude content containing keyword
   * - +keyword - Required (must contain keyword)
   * - Plain keyword - Case-insensitive substring
   */
  private compileSearchPatterns(keywords: string[]): CompiledPatterns {
    const caseSensitivePatterns: string[] = [];
    const caseInsensitivePatterns: string[] = [];
    const negativePatterns: { caseSensitive: boolean; pattern: string }[] = [];
    const requiredPatterns: { caseSensitive: boolean; pattern: string }[] = [];

    for (let keyword of keywords) {
      keyword = keyword.trim();
      if (!keyword) continue;

      // Handle negation (-keyword)
      if (keyword.startsWith('-') && keyword.length > 1) {
        const negKeyword = keyword.slice(1);
        if (negKeyword.startsWith('"') && negKeyword.endsWith('"') && negKeyword.length > 2) {
          // Exact phrase negation: -"exact phrase"
          negativePatterns.push({
            caseSensitive: true,
            pattern: this.escapeRegex(negKeyword.slice(1, -1)),
          });
        } else {
          // Regular negation (case-insensitive)
          negativePatterns.push({
            caseSensitive: false,
            pattern: this.escapeRegex(negKeyword),
          });
        }
        continue;
      }

      // Handle required (+keyword)
      if (keyword.startsWith('+') && keyword.length > 1) {
        const reqKeyword = keyword.slice(1);
        if (reqKeyword.startsWith('"') && reqKeyword.endsWith('"') && reqKeyword.length > 2) {
          // Required exact phrase: +"exact phrase"
          requiredPatterns.push({
            caseSensitive: true,
            pattern: this.escapeRegex(reqKeyword.slice(1, -1)),
          });
        } else {
          // Required keyword (case-insensitive)
          requiredPatterns.push({
            caseSensitive: false,
            pattern: this.escapeRegex(reqKeyword),
          });
        }
        continue;
      }

      // Handle exact phrase ("exact phrase")
      if (keyword.startsWith('"') && keyword.endsWith('"') && keyword.length > 2) {
        caseSensitivePatterns.push(this.escapeRegex(keyword.slice(1, -1)));
        continue;
      }

      // Regular keyword (case-insensitive)
      caseInsensitivePatterns.push(this.escapeRegex(keyword));
    }

    // Compile regexes
    const positive: CompiledPatterns['positive'] = {};
    if (caseSensitivePatterns.length) {
      positive.caseSensitive = new RegExp(caseSensitivePatterns.join('|'));
    }
    if (caseInsensitivePatterns.length) {
      positive.caseInsensitive = new RegExp(caseInsensitivePatterns.join('|'), 'i');
    }

    const negative = negativePatterns.map((p) =>
      new RegExp(p.pattern, p.caseSensitive ? '' : 'i')
    );

    const required = requiredPatterns.map((p) =>
      new RegExp(p.pattern, p.caseSensitive ? '' : 'i')
    );

    return { positive, negative, required };
  }

  /**
   * Check if text passes keyword filter criteria
   */
  private passesKeywordFilters(
    text: string | undefined,
    patterns: CompiledPatterns
  ): boolean {
    if (!text) {
      // If no text and we have positive/required patterns, fail
      return (
        !patterns.positive.caseSensitive &&
        !patterns.positive.caseInsensitive &&
        !patterns.required.length
      );
    }

    // Check negative patterns (exclusions)
    for (const neg of patterns.negative) {
      if (neg.test(text)) return false;
    }

    // Check required patterns (all must match)
    for (const req of patterns.required) {
      if (!req.test(text)) return false;
    }

    // Check positive patterns (at least one must match if any exist)
    const hasPositive =
      patterns.positive.caseSensitive || patterns.positive.caseInsensitive;

    if (hasPositive) {
      const matchesSensitive =
        patterns.positive.caseSensitive?.test(text) ?? false;
      const matchesInsensitive =
        patterns.positive.caseInsensitive?.test(text) ?? false;
      return matchesSensitive || matchesInsensitive;
    }

    return true;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export default SearchManager;
