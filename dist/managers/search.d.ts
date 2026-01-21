/**
 * Skymarshal Search Manager
 *
 * Advanced content search, filtering, and analysis operations.
 * Core library port - no CLI dependencies.
 *
 * @packageDocumentation
 */
import type { ContentItem, SearchFilters, UserSettings, EngagementStats } from '../models/index.js';
/**
 * Sort mode options
 */
export type SortMode = 'newest' | 'oldest' | 'eng_desc' | 'eng_asc' | 'likes_desc' | 'replies_desc' | 'reposts_desc';
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
export declare class SearchManager {
    private settings;
    constructor(options?: SearchManagerOptions);
    /**
     * Update settings
     */
    updateSettings(settings: Partial<UserSettings>): void;
    /**
     * Filter content using search filters
     *
     * @param items - Content items to filter
     * @param filters - Search filter criteria
     * @returns Filtered content items
     */
    filterContent(items: ContentItem[], filters: SearchFilters): ContentItem[];
    /**
     * Sort results by specified criteria
     *
     * @param items - Content items to sort
     * @param mode - Sort mode
     * @returns Sorted content items
     */
    sortResults(items: ContentItem[], mode: SortMode): ContentItem[];
    /**
     * Get available sort options with display names
     */
    getSortOptions(): Record<SortMode, string>;
    /**
     * Calculate engagement presets based on user's average likes
     *
     * @returns Preset thresholds for categorizing content
     */
    getEngagementPresets(): {
        dead: {
            maxLikes: number;
            maxEngagement: number;
        };
        bombers: {
            minLikes: number;
            maxLikes: number;
        };
        mid: {
            minLikes: number;
            maxLikes: number;
        };
        bangers: {
            minLikes: number;
        };
        viral: {
            minLikes: number;
        };
    };
    /**
     * Calculate comprehensive statistics for content items
     *
     * @param items - Content items to analyze
     * @returns Engagement statistics
     */
    calculateStatistics(items: ContentItem[]): EngagementStats;
    /**
     * Compile search patterns with support for operators
     *
     * Supported operators:
     * - "exact phrase" - Case-sensitive exact phrase
     * - -keyword - Exclude content containing keyword
     * - +keyword - Required (must contain keyword)
     * - Plain keyword - Case-insensitive substring
     */
    private compileSearchPatterns;
    /**
     * Check if text passes keyword filter criteria
     */
    private passesKeywordFilters;
    /**
     * Escape special regex characters
     */
    private escapeRegex;
}
export default SearchManager;
//# sourceMappingURL=search.d.ts.map