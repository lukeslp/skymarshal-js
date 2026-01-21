/**
 * Skymarshal Managers
 *
 * @packageDocumentation
 */

export {
  AuthManager,
  AuthenticationError,
  MemoryStorage,
  LocalStorageAdapter,
  type SessionStorage,
  type AuthManagerOptions,
} from './auth.js';

export {
  SearchManager,
  type SearchManagerOptions,
  type SortMode,
} from './search.js';

export {
  ContentManager,
  calculateEngagementScore,
  type FetchOptions,
  type PostWithEngagement,
  type LikeRecord,
  type RepostRecord,
  type CreatePostOptions,
  type PaginatedResult,
} from './content.js';

export {
  NetworkManager,
  type Profile,
  type Relationship,
} from './network.js';

export {
  ChatManager,
  type Conversation,
  type ConversationMember,
  type Message,
  type Reaction,
  type MessageFetchOptions,
} from './chat.js';

export {
  AnalyticsManager,
  getEngagementPreset,
  type BotSignal,
  type AccountAnalysis,
  type EngagementPreset,
  type EngagementAnalysis,
  type AnalysisStatistics,
} from './analytics.js';
