# Changelog

All notable changes to skymarshal will be documented in this file.

## [2.2.0] - 2026-01-22

### Added

#### Thread Utilities (`utils/threads.ts`)
- **PostCache** - TTL-based thread caching (5-minute default)
  - `set()`, `get()`, `clear()`, `has()`, `setTTL()`
- **fetchThread()** - Fetch post threads with configurable depth (default: 3 levels, 80 parent height)
  - Automatic caching with TTL
  - Returns simplified `ThreadPost` structure
- **fetchPreviewReplies()** - Lightweight preview loading (depth 1)
- **Thread utilities**:
  - `flattenThread()` - Convert tree to flat array (depth-first)
  - `countThreadPosts()` - Total post count in thread tree
  - `getThreadDepth()` - Maximum nesting depth
  - `findPostInThread()` - Search by AT-URI
  - `getThreadAuthors()` - Get unique participant DIDs
- **URL parsing**:
  - `parsePostUrl()` - Parse Bluesky URLs to handle + postId
  - `resolvePostUrl()` - Full URL → AT-URI conversion (with DID resolution)
  - `clearPostCache()` - Manual cache refresh

#### Graph Analysis Utilities (`utils/graph.ts`)
- **Pure TypeScript implementation** (no NetworkX dependency)
- **Centrality Metrics**:
  - `degreeCentrality()` - Normalized connection counts
  - `betweennessCentrality()` - Shortest path analysis (BFS-based)
  - `calculatePageRank()` - Importance scoring (damping: 0.85, 20 iterations)
- **Community Detection**:
  - `detectCommunities()` - Label propagation algorithm
  - `calculateModularity()` - Quality measurement for partitions
- **Network Metrics**:
  - `networkDensity()` - Ratio of actual to possible edges
  - `averageClustering()` - Neighbor connectivity measure
  - `computeGraphMetrics()` - All-in-one analysis (density, clustering, modularity, top nodes)
- **Orbit Classification**:
  - `orbitTier()` - Classify connections (0: >20, 1: 5-20, 2: <5)
  - `orbitStrengthDistribution()` - Tier percentages
- **Edge Weighting**:
  - `weightEdges()` - Calculate weights from shared neighbors and degree similarity
- **Types**: `GraphNode`, `GraphEdge`, `Community`, `GraphMetrics`, `OrbitDistribution`

#### Analytics Algorithms (`utils/analytics.ts`)
Ported from Python (bluebeam.py, blueye.py, bluefry.py) with **zero dependencies**

- **Engagement Scoring**:
  - `calculateEngagementScore()` - Weighted formula (likes: 1.0x, reposts: 3.0x, replies: 2.0x, quotes: 4.0x)
  - `calculateEngagementRate()` - Percentage of follower count
  - `analyzePostEngagement()` - Complete engagement analysis
- **Popularity Scoring**:
  - `calculateFollowerRatio()` - followers / following
  - `calculatePopularityScore()` - Weighted formula (followers: 0.5x, ratio: 0.3x, activity: 0.2x)
  - `analyzeAccountPopularity()` - Complete popularity analysis
- **Bot Detection / Cleanup Scoring**:
  - `calculateCleanupScore()` - Heuristic-based bot detection (80+ = likely bot)
    - No bio: +20, No display name: +15, No avatar: +10
    - Few followers (<10): +25, Poor ratio (<0.1): +30
    - No posts: +20, Few posts (<5): +10
    - Following many (>5000): +15, Suspicious pattern: +40
    - Legitimate bonus: -20
  - `isLikelyBot()` - Threshold check (default: 80)
  - `getCleanupPriority()` - Categorize (high/medium/low/none)
- **Post Classification**:
  - `classifyPostType()` - Detect type (photo, video, link, long_text, question, text)
  - `hasLinks()`, `extractHashtags()`, `extractMentions()` - Content analysis
- **Batch Analysis**:
  - `batchAnalyzePosts()`, `batchAnalyzeAccounts()`
  - `calculatePostSummary()`, `calculateAccountSummary()` - Aggregate statistics
- **Types**: `PostEngagement`, `AccountMetrics`, `AccountProfile`, `CleanupResult`, `PostType`

#### EngagementManager (`managers/engagement.ts`)
**TTL-based caching** for engagement metrics with intelligent refresh

- **Dynamic TTL** based on content age:
  - Recent (<1 day): 1 hour cache
  - Medium (1-7 days): 6 hour cache
  - Old (>7 days): 24 hour cache
- **Core Methods**:
  - `hydrateItems()` - Main entry point, mutates items in place with fresh engagement
  - `batchUpdateEngagement()` - Fetch multiple URIs with concurrency control (10 parallel max)
  - `getEngagement()` - Get cached metrics with TTL validation
  - `cacheEngagement()` - Store metrics with expiry
- **Performance Optimization**:
  - >75% cache hit rate target
  - 20-50ms delays for rate limiting
  - Automatic retry with exponential backoff (429 handling)
  - Graceful degradation on API errors
- **Statistics**:
  - `getStats()` - hits, misses, hitRate, apiCalls, errors
  - `resetStats()`, `clearCache()`
- **Types**: `EngagementMetrics` (includes cachedAt, expiresAt, source)

#### DeletionManager (`managers/deletion.ts`)
**Safe deletion workflows** with confirmation and backup support

- **Core Methods**:
  - `safeDelete()` - Main entry point with options (confirmation, backup, remote deletion)
  - `deleteFromRemote()` - Delete from Bluesky API (handles 404 gracefully)
  - `batchDelete()` - Process multiple deletions with progress tracking
  - `parseAtUri()` - AT-URI parser with validation
  - `previewDeletion()` - Dry run for confirmation dialogs
- **Options**: `DeletionOptions` (confirmationRequired, deleteFromRemote, createBackup, backupName)
- **Results**: `DeletionResult` (success count, failed count, errors array, backupId)
- **Error Handling**:
  - `ValidationError` - Invalid AT-URI format
  - `NetworkError` - API failures with status codes
  - Graceful handling of already-deleted content (404)
- **Types**: `ParsedAtUri` (repo, collection, rkey)

### Changed
- **Description**: Updated to include new features (thread caching, engagement tracking, deletion workflows, media uploads)
- **Keywords**: Added `threads`, `graph-analysis`, `social-graph`, `community-detection`, `centrality`, `pagerank`, `engagement-tracking`, `deletion`, `ttl-cache`, `media-upload`
- **Subpath Exports**: Added 6 new paths
  - `skymarshal/engagement` - EngagementManager
  - `skymarshal/deletion` - DeletionManager
  - `skymarshal/media` - MediaManager
  - `skymarshal/threads` - Thread utilities
  - `skymarshal/graph` - Graph analysis
  - `skymarshal/analytics-utils` - Analytics algorithms

### Performance Improvements
- Thread caching reduces redundant API calls (5-minute TTL)
- Engagement caching with age-based TTL (1-24 hour adaptive expiry)
- Batch operations with concurrency control (10 parallel max)
- Rate limiting (20-50ms delays) prevents API throttling
- Pure TypeScript graph algorithms (no external dependencies)

## [2.1.0] - 2026-01-21

### Added

#### Database Module (Browser IndexedDB Persistence)
- **IndexedDBProvider** - Full-featured IndexedDB wrapper for client-side storage
  - `init()`, `close()`, `destroy()` - Lifecycle management
  - `get()`, `getAll()`, `put()`, `delete()`, `clear()` - CRUD operations
  - `query()` - Index-based querying with range support
  - `count()` - Count items with optional filtering
  - `putBatch()`, `deleteBatch()` - Transactional batch operations
  - `getStorageEstimate()` - Browser storage quota checking

- **Database Schema** - 6 object stores with 11 indexes
  - `contentItems` - Posts, replies, likes, reposts with engagement scoring
  - `engagementCache` - TTL-based engagement metrics cache
  - `userSettings` - User preferences per handle
  - `searchHistory` - Search query history for UX
  - `backups` - Local snapshots of user data
  - `carFiles` - CAR file import metadata

- **Migrations System** - Schema versioning and upgrades
  - `runMigrations()` - Automatic migration execution
  - `validateMigrations()` - Migration integrity checking
  - Version-based incremental upgrades

#### Validation Utilities
- `isValidAtUri()` - AT-URI format validation
- `isValidHandle()` - Bluesky handle validation
- `isValidDid()` - DID format validation
- `validatePostText()` - Post text with grapheme counting (300 char limit)
- `validateImageFile()` - Image file validation (976KB, JPEG/PNG/WebP/HEIC)
- `validateAltText()` - Accessibility alt text validation
- `sanitizeText()` - Remove control characters and excessive whitespace
- `isValidPostUrl()`, `parsePostUrl()` - Bluesky URL parsing
- `detectSpamPatterns()` - Heuristic-based spam detection
- `truncateText()` - Word-boundary-aware truncation

#### Image Processing Utilities (Browser)
- `processImage()` - Complete image processing pipeline
- `resizeImage()` - Resize with aspect ratio preservation
- `optimizeForBluesky()` - Progressive quality reduction to fit 976KB limit
- `convertHEIC()` - HEIC to JPEG conversion (requires heic2any)
- `createPlaceholder()` - 300px preview generation
- `getImageDimensions()` - Dimension extraction
- `isImageFile()`, `formatFileSize()` - Helper utilities

### Changed
- Added new subpath exports: `skymarshal/database`, `skymarshal/validation`, `skymarshal/image`
- Updated package keywords for better discoverability
- Enhanced utils module with validation and image utilities

## [2.0.0] - 2026-01-21

### Added

#### New Managers
- **ContentManager** - Full CRUD for posts, likes, and reposts with engagement hydration
  - `getPosts()`, `getAllPosts()` - Fetch user posts with pagination
  - `getLikes()`, `getReposts()` - Fetch user interactions
  - `createPost()`, `deletePost()` - Post management
  - `likePost()`, `unlikePost()`, `repost()`, `unrepost()` - Engagement actions
  - `hydrateEngagement()` - Batch fetch engagement metrics

- **NetworkManager** - Social graph operations
  - `getFollowers()`, `getFollowing()`, `getAllFollowers()`, `getAllFollowing()`
  - `getMutuals()`, `getNonFollowers()`, `getNotFollowingBack()`
  - `follow()`, `unfollow()`, `block()`, `unblock()`, `mute()`, `unmute()`
  - `getProfile()`, `getProfiles()` - Profile fetching with batch support
  - `searchUsers()`, `getRelationship()` - Discovery and relationship analysis

- **ChatManager** - Full DM/conversation support via chat.bsky.convo API
  - `listConvos()`, `getConvo()`, `getOrCreateConvo()`
  - `getMessages()`, `sendMessage()`, `deleteMessage()`
  - `addReaction()`, `removeReaction()`
  - `muteConvo()`, `unmuteConvo()`, `leaveConvo()`
  - `updateRead()`, `updateAllRead()`
  - Automatic fallback to api.bsky.chat when PDS proxy fails

- **AnalyticsManager** - Bot detection and engagement analysis
  - `analyzeAccount()`, `batchAnalyze()` - Bot detection with ratio analysis
  - `getStatistics()` - Aggregate analysis statistics
  - `analyzeEngagement()`, `categorizeByEngagement()` - Post engagement analysis
  - `getTopPosts()`, `getDeadThreads()` - Content performance analysis
  - Engagement presets: dead, bombers, mid, bangers, viral

#### New Services
- **BackupService** - CAR file backup and restore
  - `exportRepo()`, `downloadBackup()` - Repository backup
  - `parseCarFile()`, `importRecords()` - CAR file handling
  - `getBackupInfo()` - Backup metadata

- **VisionService** - AI-powered alt text generation
  - `generateAltText()`, `analyzeImage()` - Image description
  - Multi-provider support: Ollama (local), OpenAI, Anthropic, xAI
  - `configureProvider()`, `setDefaultProvider()`, `getProviders()`

- **SentimentService** - VADER-style text sentiment analysis
  - `analyzeSentiment()`, `batchAnalyzeSentiment()`
  - `getSentimentScore()`, `categorizeSentiment()`
  - `getSentimentTrend()`, `findExtremes()`

#### New Utilities
- **EngagementCache** - TTL-based cache with age-aware expiry
- **PaginationHelper** - Async iterator for cursor-based pagination
- **ExportHelper** - CSV/JSON export with browser download support
- **DateUtils** - Relative time, age categories, time range checks
- **EngagementUtils** - Scoring formula, presets, percentile calculation
- **UriUtils** - AT URI parsing and building
- **BatchUtils** - Array chunking and batch processing

### Changed
- Updated package description to reflect comprehensive toolkit
- Added new exports for all managers, services, and utilities
- Updated tsconfig to include DOM lib for browser compatibility

### Breaking Changes
- Package version bumped to 2.0.0
- Some type exports reorganized for better tree-shaking

## [1.0.0] - 2025-01-15

### Added
- Initial release
- AuthManager for Bluesky authentication
- SearchManager for content filtering
- Basic models and types
