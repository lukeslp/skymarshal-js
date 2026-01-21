/**
 * skymarshal-core 2.0.0
 *
 * Comprehensive Bluesky/AT Protocol toolkit for TypeScript/JavaScript.
 *
 * Provides authentication, content management, network analysis, chat,
 * analytics, backup, vision AI, and sentiment analysis.
 *
 * @example
 * ```ts
 * import {
 *   AuthManager,
 *   ContentManager,
 *   NetworkManager,
 *   ChatManager,
 *   AnalyticsManager,
 *   SearchManager,
 * } from 'skymarshal-core';
 *
 * // Authenticate
 * const auth = new AuthManager();
 * await auth.login('myhandle.bsky.social', 'my-app-password');
 *
 * // Content management
 * const content = new ContentManager(auth.agent);
 * const posts = await content.getPosts(auth.did!);
 * await content.createPost('Hello from skymarshal!');
 *
 * // Network analysis
 * const network = new NetworkManager(auth.agent);
 * const mutuals = await network.getMutuals(auth.did!);
 * const nonFollowers = await network.getNonFollowers(auth.did!);
 *
 * // Chat/DMs
 * const chat = new ChatManager(auth.agent);
 * const convos = await chat.listConvos();
 * await chat.sendMessage(convos[0].id, 'Hello!');
 *
 * // Bot detection & analytics
 * const analytics = new AnalyticsManager();
 * const analysis = analytics.batchAnalyze(mutuals);
 * const stats = analytics.getStatistics(analysis);
 *
 * // Search & filter
 * const search = new SearchManager();
 * const filtered = search.filterContent(posts, { minLikes: 10 });
 * ```
 *
 * @packageDocumentation
 */
// ============================================================================
// Models - Core data structures
// ============================================================================
export { 
// Constants
DEFAULT_SETTINGS, 
// Functions
calculateEngagementScore as calcEngagement, updateContentEngagement, parseDateTime, mergeContentItems, createContentItem, } from './models/index.js';
// ============================================================================
// Managers - Core functionality
// ============================================================================
export { 
// Auth
AuthManager, AuthenticationError, MemoryStorage, LocalStorageAdapter, 
// Search
SearchManager, 
// Content
ContentManager, calculateEngagementScore, 
// Network
NetworkManager, 
// Chat
ChatManager, 
// Analytics
AnalyticsManager, getEngagementPreset, } from './managers/index.js';
// ============================================================================
// Services - Extended functionality
// ============================================================================
export { 
// Backup
BackupService, 
// Vision/Alt Text
VisionService, 
// Sentiment
SentimentService, } from './services/index.js';
// ============================================================================
// Utilities
// ============================================================================
export { 
// Cache
EngagementCache, DEFAULT_TTL, 
// Pagination
PaginationHelper, 
// Export
ExportHelper, 
// Date utilities
DateUtils, 
// Engagement utilities
EngagementUtils, 
// URI utilities
UriUtils, 
// Batch processing
BatchUtils, } from './utils/index.js';
//# sourceMappingURL=index.js.map