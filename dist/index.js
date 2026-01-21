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
// Models - Core data structures
export { 
// Constants
DEFAULT_SETTINGS, 
// Functions
calculateEngagementScore, updateContentEngagement, parseDateTime, mergeContentItems, createContentItem, } from './models/index.js';
// Managers
export { 
// Auth
AuthManager, AuthenticationError, MemoryStorage, LocalStorageAdapter, 
// Search
SearchManager, } from './managers/index.js';
//# sourceMappingURL=index.js.map