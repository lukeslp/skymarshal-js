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
export { type DeleteMode, type ContentType, type ContentItem, type UserSettings, type SearchFilters, type SessionData, type EngagementStats, DEFAULT_SETTINGS, calculateEngagementScore as calcEngagement, updateContentEngagement, parseDateTime, mergeContentItems, createContentItem, } from './models/index.js';
export { AuthManager, AuthenticationError, MemoryStorage, LocalStorageAdapter, type SessionStorage, type AuthManagerOptions, SearchManager, type SearchManagerOptions, type SortMode, ContentManager, calculateEngagementScore, type FetchOptions, type PostWithEngagement, type LikeRecord, type RepostRecord, type CreatePostOptions, type PaginatedResult, NetworkManager, type Profile, type Relationship, ChatManager, type Conversation, type ConversationMember, type Message, type Reaction, type MessageFetchOptions, AnalyticsManager, getEngagementPreset, type BotSignal, type AccountAnalysis, type EngagementPreset, type EngagementAnalysis, type AnalysisStatistics, } from './managers/index.js';
export { BackupService, type BackupOptions, type BackupProgress, type BackupResult, type ImportOptions, type ImportProgress, type ImportResult, type CarRecord, VisionService, type VisionProvider, type ProviderConfig, type AltTextOptions, type AltTextResult, type ImageAnalysis, SentimentService, type SentimentScore, type BatchSentimentResult, } from './services/index.js';
export { EngagementCache, DEFAULT_TTL, type TTLConfig, PaginationHelper, ExportHelper, DateUtils, EngagementUtils, UriUtils, BatchUtils, isValidAtUri, isValidHandle, isValidDid, validatePostText, validateImageFile, sanitizeText, isValidPostUrl, parsePostUrl, detectSpamPatterns, truncateText, validateAltText, type ValidationResult, type PostTextValidation, type SpamDetectionResult, type ParsedPostUrl, BLUESKY_MAX_SIZE, ACCEPTED_IMAGE_TYPES, getImageDimensions, createPlaceholder, convertHEIC, optimizeForBluesky, resizeImage, processImage, isImageFile, formatFileSize, type ProcessedImage, type ResizeOptions, type ResizedImage, } from './utils/index.js';
export { SCHEMA, STORE_NAMES, type DatabaseSchema, type ObjectStoreDefinition, type StoreIndex, type StoreName, IndexedDBProvider, getDefaultProvider, type IndexedDBProviderConfig, type QueryRange, type OperationResult, runMigrations, getLatestVersion, hasMigration, getMigration, validateMigrations, migrations, type DBMigration, } from './database/index.js';
//# sourceMappingURL=index.d.ts.map