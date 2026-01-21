/**
 * skymarshal-core
 *
 * Bluesky content management toolkit for TypeScript/JavaScript.
 *
 * Provides authentication, content filtering, search, and engagement analysis
 * for Bluesky/AT Protocol applications.
 *
 * @example
 * ```ts
 * import {
 *   AuthManager,
 *   SearchManager,
 *   calculateEngagementScore
 * } from '@skymarshal/core';
 *
 * // Authenticate
 * const auth = new AuthManager();
 * await auth.login('myhandle.bsky.social', 'my-app-password');
 *
 * // Access the BskyAgent for API calls
 * const agent = auth.agent;
 * const feed = await agent.getAuthorFeed({ actor: auth.did! });
 *
 * // Filter and analyze content
 * const search = new SearchManager();
 * const filtered = search.filterContent(items, { minLikes: 10 });
 * const stats = search.calculateStatistics(filtered);
 * ```
 *
 * @packageDocumentation
 */
export { type DeleteMode, type ContentType, type ContentItem, type UserSettings, type SearchFilters, type SessionData, type EngagementStats, DEFAULT_SETTINGS, calculateEngagementScore, updateContentEngagement, parseDateTime, mergeContentItems, createContentItem, } from './models/index.js';
export { AuthManager, AuthenticationError, MemoryStorage, LocalStorageAdapter, type SessionStorage, type AuthManagerOptions, SearchManager, type SearchManagerOptions, type SortMode, } from './managers/index.js';
//# sourceMappingURL=index.d.ts.map