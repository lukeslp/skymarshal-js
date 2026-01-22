# Changelog

All notable changes to skymarshal will be documented in this file.

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
