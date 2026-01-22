/**
 * skymarshal-core 2.2.0
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
// Errors - Centralized error hierarchy (v2.2.0+)
// ============================================================================
export {
  // Base error
  SkymarshalError,

  // Specific errors
  AuthenticationError as SkymarshalAuthenticationError,
  NetworkError as SkymarshalNetworkError,
  ValidationError as SkymarshalValidationError,
  RateLimitError,
  NotFoundError,
  PermissionError,
  TimeoutError,
  ServerError,

  // Helper functions
  isRetryableError,
} from './errors/index.js';

// ============================================================================
// Models - Core data structures
// ============================================================================
export {
  // Types
  type DeleteMode,
  type ContentType,
  type ContentItem,
  type UserSettings,
  type SearchFilters,
  type SessionData,
  type EngagementStats,

  // Constants
  DEFAULT_SETTINGS,

  // Functions
  calculateEngagementScore as calcEngagement,
  updateContentEngagement,
  parseDateTime,
  mergeContentItems,
  createContentItem,
} from './models/index.js';

// ============================================================================
// Managers - Core functionality
// ============================================================================
export {
  // Auth
  AuthManager,
  AuthenticationError,
  MemoryStorage,
  LocalStorageAdapter,
  type SessionStorage,
  type AuthManagerOptions,

  // Search
  SearchManager,
  type SearchManagerOptions,
  type SortMode,

  // Content
  ContentManager,
  calculateEngagementScore,
  type FetchOptions,
  type PostWithEngagement,
  type LikeRecord,
  type RepostRecord,
  type CreatePostOptions,
  type PaginatedResult,

  // Network
  NetworkManager,
  type Profile,
  type Relationship,

  // Chat
  ChatManager,
  type Conversation,
  type ConversationMember,
  type Message,
  type Reaction,
  type MessageFetchOptions,

  // Analytics
  AnalyticsManager,
  getEngagementPreset,
  type BotSignal,
  type AccountAnalysis,
  type EngagementPreset,
  type EngagementAnalysis,
  type AnalysisStatistics,

  // Notifications
  NotificationManager,
  type Notification,
  type NotificationListOptions,
  type NotificationListResult,

  // Profile
  ProfileManager,
  type ProfileData,
  type ProfileUpdateInput,

  // Post
  PostManager,
  type PostImage,
  type PostLink,
  type CreatePostInput,
  type Post,

  // Lists
  ListsManager,
  type ListPurpose,
  type List,
  type ListMember,
  type CreateListInput,

  // Feeds
  FeedsManager,
  type FeedGenerator,
  type FeedPost,
  type SavedFeed,

  // Media
  MediaManager,
  type UploadedBlob,
  type ImageUploadOptions,
  type VideoUploadOptions,
  type EmbedImage,
  type ImageEmbed,

  // Deletion (v2.2.0)
  DeletionManager,
  ValidationError,
  NetworkError,
  type DeletionOptions,
  type DeletionResult,
  type ParsedAtUri,

  // Engagement (v2.2.0)
  EngagementManager,
  type EngagementMetrics,
} from './managers/index.js';

// ============================================================================
// Services - Extended functionality
// ============================================================================
export {
  // Backup
  BackupService,
  type BackupOptions,
  type BackupProgress,
  type BackupResult,
  type ImportOptions,
  type ImportProgress,
  type ImportResult,
  type CarRecord,

  // Vision/Alt Text
  VisionService,
  type VisionProvider,
  type ProviderConfig,
  type AltTextOptions,
  type AltTextResult,
  type ImageAnalysis,

  // Sentiment
  SentimentService,
  type SentimentScore,
  type BatchSentimentResult,
} from './services/index.js';

// ============================================================================
// Utilities
// ============================================================================
export {
  // Cache
  EngagementCache,
  DEFAULT_TTL,
  type TTLConfig,

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
  BatchUtils,

  // Validation utilities
  isValidAtUri,
  isValidHandle,
  isValidDid,
  validatePostText,
  validateImageFile,
  sanitizeText,
  isValidPostUrl,
  parsePostUrl,
  detectSpamPatterns,
  truncateText,
  validateAltText,
  type ValidationResult,
  type PostTextValidation,
  type SpamDetectionResult,
  type ParsedPostUrl,

  // Image processing utilities
  BLUESKY_MAX_SIZE,
  ACCEPTED_IMAGE_TYPES,
  getImageDimensions,
  createPlaceholder,
  convertHEIC,
  optimizeForBluesky,
  resizeImage,
  processImage,
  isImageFile,
  formatFileSize,
  type ProcessedImage,
  type ResizeOptions,
  type ResizedImage,

  // Thread utilities (v2.2.0)
  PostCache,
  fetchThread,
  fetchPreviewReplies,
  flattenThread,
  clearPostCache,
  getPostCache,
  countThreadPosts,
  getThreadDepth,
  findPostInThread,
  getThreadAuthors,
  resolvePostUrl,
  type ThreadPost,

  // Graph analysis utilities (v2.2.0)
  degreeCentrality,
  betweennessCentrality,
  calculatePageRank,
  detectCommunities,
  calculateModularity,
  networkDensity,
  averageClustering,
  orbitTier,
  orbitStrengthDistribution,
  weightEdges,
  computeGraphMetrics,
  type GraphNode,
  type GraphEdge,
  type Community,
  type GraphMetrics,
  type OrbitTier,
  type OrbitDistribution,

  // Analytics algorithms (v2.2.0)
  calculateEngagementRate,
  analyzePostEngagement,
  calculateFollowerRatio,
  calculatePopularityScore,
  analyzeAccountPopularity,
  calculateCleanupScore,
  isLikelyBot,
  getCleanupPriority,
  classifyPostType,
  hasLinks,
  extractHashtags,
  extractMentions,
  batchAnalyzePosts,
  batchAnalyzeAccounts,
  calculatePostSummary,
  calculateAccountSummary,
  type PostEngagement,
  type PostEngagementResult,
  type AccountMetrics,
  type PopularityResult,
  type AccountProfile,
  type CleanupResult,
  type PostContent,
  type PostType,
} from './utils/index.js';

// ============================================================================
// Database (Browser-only IndexedDB persistence)
// ============================================================================
export {
  // Schema
  SCHEMA,
  STORE_NAMES,
  type DatabaseSchema,
  type ObjectStoreDefinition,
  type StoreIndex,
  type StoreName,

  // IndexedDB Provider
  IndexedDBProvider,
  getDefaultProvider,
  type IndexedDBProviderConfig,
  type QueryRange,
  type OperationResult,

  // Migrations
  runMigrations,
  getLatestVersion,
  hasMigration,
  getMigration,
  validateMigrations,
  migrations,
  type DBMigration,
} from './database/index.js';
