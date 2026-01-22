# TypeScript Patterns & Conventions

This document defines the TypeScript patterns and conventions used in skymarshal-core. All new code should follow these patterns to maintain consistency.

**Status**: Active Reference
**Last Updated**: 2026-01-22
**Package Version**: 2.2.0

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Module System](#module-system)
3. [Manager Pattern](#manager-pattern)
4. [Service Pattern](#service-pattern)
5. [Utility Pattern](#utility-pattern)
6. [Type Definitions](#type-definitions)
7. [Error Handling](#error-handling)
8. [JSDoc Conventions](#jsdoc-conventions)
9. [Export Patterns](#export-patterns)
10. [Naming Conventions](#naming-conventions)
11. [Code Organization](#code-organization)

---

## Project Structure

```
src/
├── managers/          # Core functionality managers (auth, search, content, etc.)
├── services/          # Extended functionality services (backup, vision, sentiment)
├── utils/             # Utility functions and helpers
├── models/            # Data models and type definitions
├── database/          # IndexedDB persistence layer
└── index.ts           # Main package entry point
```

**Directory Purpose**:
- **managers/**: Business logic coordinators that manage agent state and orchestrate operations
- **services/**: Standalone functionality that can operate independently
- **utils/**: Pure functions, helpers, and reusable algorithms
- **models/**: Type definitions, interfaces, and data structures
- **database/**: Persistence layer (browser-only IndexedDB)

---

## Module System

### Configuration

TypeScript config (`tsconfig.json`):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "DOM"]
  }
}
```

### Import/Export Rules

**ALWAYS use `.js` extensions in imports** (TypeScript requirement for NodeNext):

```typescript
// ✅ CORRECT
import { AuthManager } from './auth.js';
import type { SessionData } from '../models/index.js';

// ❌ WRONG - will fail to compile
import { AuthManager } from './auth';
import type { SessionData } from '../models/index';
```

**Type-only imports** when importing only types:

```typescript
// ✅ CORRECT - type-only import
import type { ContentItem, SearchFilters } from '../models/index.js';

// ⚠️ ACCEPTABLE - but less explicit
import { ContentItem, SearchFilters } from '../models/index.js';
```

---

## Manager Pattern

Managers coordinate state and orchestrate operations. They typically wrap a `BskyAgent` instance.

### Structure

```typescript
/**
 * [ManagerName] - [Brief description]
 *
 * [Detailed description of purpose and responsibilities]
 *
 * @packageDocumentation
 */

/**
 * Configuration options for [ManagerName]
 */
export interface [ManagerName]Options {
  /** Option description */
  optionName?: Type;
}

/**
 * [ManagerName class description]
 *
 * @example
 * ```ts
 * const manager = new ManagerName(agent, options);
 * const result = await manager.doSomething();
 * ```
 */
export class [ManagerName] {
  private agent: BskyAgent;
  private internalState: Type;

  constructor(agent: BskyAgent, options: [ManagerName]Options = {}) {
    this.agent = agent;
    this.internalState = options.value ?? defaultValue;
  }

  /**
   * Public method description
   *
   * @param param - Parameter description
   * @returns Return value description
   */
  async publicMethod(param: Type): Promise<Result> {
    // Implementation
  }

  /**
   * Private helper method
   */
  private helperMethod(): void {
    // Implementation
  }
}

export default [ManagerName];
```

### Key Patterns

**Private State**: Use private fields with `_` prefix for internal state:

```typescript
export class AuthManager {
  private _agent: BskyAgent;
  private _handle: string | null = null;
  private _did: string | null = null;
  private _storage: SessionStorage;

  get agent(): BskyAgent {
    return this._agent;
  }

  get handle(): string | null {
    return this._handle;
  }
}
```

**Constructor Pattern**: Accept options object with defaults:

```typescript
constructor(options: ManagerOptions = {}) {
  const service = options.service ?? 'https://bsky.social';
  this._storage = options.storage ?? new MemoryStorage();
  this._sessionKey = options.sessionKey ?? 'session';
}
```

**Agent Dependency**: Most managers require `BskyAgent`:

```typescript
export class ContentManager {
  private agent: BskyAgent;

  constructor(agent: BskyAgent, options: ContentManagerOptions = {}) {
    this.agent = agent;
  }
}
```

**Options Interface**: Always define a separate options interface:

```typescript
export interface SearchManagerOptions {
  /** User settings for filtering behavior */
  settings?: Partial<UserSettings>;
}

export class SearchManager {
  constructor(options: SearchManagerOptions = {}) {
    // ...
  }
}
```

---

## Service Pattern

Services provide standalone functionality without managing state across calls.

### Structure

```typescript
/**
 * [ServiceName] - [Brief description]
 *
 * @packageDocumentation
 */

export interface [ServiceName]Options {
  /** Configuration option */
  option?: Type;
}

export interface [ServiceName]Result {
  /** Result field */
  field: Type;
}

/**
 * [ServiceName] provides [functionality description]
 *
 * @example
 * ```ts
 * const service = new ServiceName(options);
 * const result = await service.process(input);
 * ```
 */
export class [ServiceName] {
  private config: ConfigType;

  constructor(options: [ServiceName]Options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };
  }

  /**
   * Primary service method
   */
  async process(input: InputType): Promise<ResultType> {
    // Implementation
  }
}

export default [ServiceName];
```

### Key Differences from Managers

- **Stateless or minimal state**: Services don't maintain agent state
- **Self-contained**: Can operate independently
- **No agent dependency**: Don't require `BskyAgent` (usually)
- **Focused purpose**: Single, well-defined responsibility

**Example** (BackupService, VisionService, SentimentService):

```typescript
// Service - no agent dependency, standalone functionality
export class VisionService {
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async generateAltText(imageUrl: string, options: AltTextOptions): Promise<AltTextResult> {
    // Vision AI processing
  }
}

// Manager - manages agent state, orchestrates operations
export class ContentManager {
  private agent: BskyAgent;

  constructor(agent: BskyAgent) {
    this.agent = agent;
  }

  async getPosts(actor: string): Promise<ContentItem[]> {
    // Uses agent to fetch content
  }
}
```

---

## Utility Pattern

Utilities are pure functions, helper classes, or standalone algorithms.

### Organization

```typescript
/**
 * [Utility category] utilities
 * @module utils/[category]
 */

/**
 * Type definitions for utility functions
 */
export interface UtilityResult {
  field: Type;
}

/**
 * Pure function description
 *
 * @param input - Input description
 * @returns Output description
 *
 * @example
 * ```ts
 * const result = utilityFunction(input);
 * ```
 */
export function utilityFunction(input: InputType): OutputType {
  // Pure function implementation
}

/**
 * Helper class for [purpose]
 */
export class HelperClass {
  /**
   * Static method description
   */
  static helperMethod(input: InputType): OutputType {
    // Implementation
  }
}

/**
 * Constant utilities object
 */
export const UtilityObject = {
  method1(input: Type): Type {
    // Implementation
  },

  method2(input: Type): Type {
    // Implementation
  },
};
```

### Utility Categories

**Pure Functions** (validation, parsing):

```typescript
export function isValidAtUri(uri: string): boolean {
  return /^at:\/\/did:[a-z0-9]+:[a-zA-Z0-9._%-]+\//.test(uri);
}

export function parseDateTime(dateStr?: string): Date | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr.replace('Z', '+00:00'));
  } catch {
    return null;
  }
}
```

**Helper Classes** (caching, pagination):

```typescript
export class EngagementCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();

  get(key: string): T | undefined {
    // Implementation
  }

  set(key: string, value: T, createdAt?: string | Date): void {
    // Implementation
  }
}

export class PaginationHelper {
  static async *iterate<T>(
    fetcher: (cursor?: string) => Promise<{ records: T[]; cursor?: string }>,
    options: { maxPages?: number; delayMs?: number } = {}
  ): AsyncGenerator<T[], void, unknown> {
    // Implementation
  }
}
```

**Constant Objects** (grouped utilities):

```typescript
export const DateUtils = {
  relativeTime(date: string | Date): string {
    // Implementation
  },

  isWithin(date: string | Date, range: number): boolean {
    // Implementation
  },
};

export const UriUtils = {
  parse(uri: string): { repo: string; collection: string; rkey: string } | null {
    // Implementation
  },

  build(repo: string, collection: string, rkey: string): string {
    return `at://${repo}/${collection}/${rkey}`;
  },
};
```

---

## Type Definitions

### Models

Models are defined in `src/models/index.ts`:

```typescript
/**
 * Type description
 */
export type TypeName = 'value1' | 'value2' | 'value3';

/**
 * Interface description
 */
export interface InterfaceName {
  /** Field description */
  field: Type;
  /** Optional field */
  optionalField?: Type;
}

/**
 * Constants
 */
export const CONSTANT_VALUE: Type = {
  // ...
};
```

### Type Conventions

**Use `type` for**:
- Union types
- String literal unions
- Type aliases

```typescript
export type ContentType = 'all' | 'posts' | 'replies' | 'comments' | 'reposts' | 'likes';
export type DeleteMode = 'all' | 'individual' | 'batch' | 'cancel';
export type SortMode = 'newest' | 'oldest' | 'eng_desc' | 'eng_asc';
```

**Use `interface` for**:
- Object shapes
- Classes
- Extensible structures

```typescript
export interface ContentItem {
  uri: string;
  cid: string;
  contentType: ContentType;
  text?: string;
  createdAt?: string;
  replyCount: number;
  repostCount: number;
  likeCount: number;
  engagementScore: number;
  rawData?: Record<string, unknown>;
}

export interface UserSettings {
  downloadLimitDefault: number;
  defaultCategories: ContentType[];
  fetchOrder: 'newest' | 'oldest';
}
```

**Optional Fields**: Use `?` for optional fields:

```typescript
export interface SearchFilters {
  keywords?: string[];
  minEngagement?: number;
  maxEngagement?: number;
  contentType?: ContentType;
}
```

**Nullable Types**: Use `null` explicitly when needed:

```typescript
export interface AuthManager {
  handle: string | null;
  did: string | null;
}
```

---

## Error Handling

### Custom Error Classes

Define custom errors extending `Error`:

```typescript
/**
 * [ErrorName] description
 */
export class [ErrorName] extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = '[ErrorName]';
  }
}
```

**Examples**:

```typescript
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly details?: Record<string, string>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}
```

### Try-Catch Pattern

**Silent failures** (return null/false):

```typescript
async resumeSession(): Promise<boolean> {
  try {
    const sessionJson = await this._storage.get(this._sessionKey);
    if (!sessionJson) return false;

    const session: SessionData = JSON.parse(sessionJson);
    await this._agent.resumeSession(session);

    return true;
  } catch {
    return false;
  }
}
```

**Throwing with context**:

```typescript
async login(identifier: string, password: string): Promise<boolean> {
  try {
    const response = await this._agent.login({
      identifier: this.normalizeHandle(identifier),
      password,
    });

    this._handle = response.data.handle;
    this._did = response.data.did;

    return true;
  } catch (error) {
    this._handle = null;
    this._did = null;
    throw new AuthenticationError('Login failed', error);
  }
}
```

**Validation checks**:

```typescript
async getProfile(actor?: string): Promise<ProfileData> {
  if (!this.isAuthenticated()) {
    throw new AuthenticationError('Not authenticated');
  }

  const targetActor = actor ?? this._did!;
  const response = await this._agent.getProfile({ actor: targetActor });

  return {
    did: response.data.did,
    handle: response.data.handle,
    // ...
  };
}
```

---

## JSDoc Conventions

### File Headers

Every file starts with a module-level JSDoc:

```typescript
/**
 * [Module Name] - [Brief description]
 *
 * [Detailed description of module purpose]
 *
 * @packageDocumentation
 */
```

**Examples**:

```typescript
/**
 * Skymarshal Authentication Manager
 *
 * Handles Bluesky authentication, session management, and client operations.
 * Uses @atproto/api for AT Protocol communication.
 *
 * @packageDocumentation
 */
```

```typescript
/**
 * Validation utilities for Bluesky data
 * Input validation, format checking, content moderation helpers
 *
 * @module utils/validation
 */
```

### Class Documentation

```typescript
/**
 * [ClassName] - [Brief description]
 *
 * [Detailed description]
 *
 * @example
 * ```ts
 * const instance = new ClassName(options);
 * const result = await instance.method();
 * ```
 */
export class ClassName {
  // ...
}
```

### Method Documentation

```typescript
/**
 * [Method description]
 *
 * @param paramName - Parameter description
 * @param optionalParam - Optional parameter description
 * @returns Return value description
 * @throws {ErrorType} When [error condition]
 *
 * @example
 * ```ts
 * const result = await instance.method(param);
 * ```
 */
async method(paramName: Type, optionalParam?: Type): Promise<ReturnType> {
  // Implementation
}
```

### Type/Interface Documentation

```typescript
/**
 * [Type/Interface description]
 */
export interface InterfaceName {
  /** Field description */
  field: Type;

  /** Optional field description */
  optionalField?: Type;

  /**
   * Complex field with detailed description.
   * Can span multiple lines.
   */
  complexField: ComplexType;
}
```

### Function Documentation

```typescript
/**
 * [Function description]
 *
 * @param input - Input description
 * @returns Output description
 *
 * @example
 * ```ts
 * const result = functionName(input);
 * ```
 */
export function functionName(input: InputType): OutputType {
  // Implementation
}
```

### Inline Comments

Use inline comments for complex logic:

```typescript
// Compile keyword patterns with operator support
const patterns = filters.keywords?.length
  ? this.compileSearchPatterns(filters.keywords)
  : null;

// Calculate totals
let totalLikes = 0;
let totalReposts = 0;
let totalReplies = 0;

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
```

---

## Export Patterns

### Module Exports (index.ts files)

**Named exports with types**:

```typescript
/**
 * [Module Name]
 *
 * @packageDocumentation
 */

export {
  ClassName,
  functionName,
  type InterfaceName,
  type TypeName,
} from './file.js';
```

**Grouping by category**:

```typescript
// ============================================================================
// Managers - Core functionality
// ============================================================================
export {
  // Auth
  AuthManager,
  AuthenticationError,
  type SessionStorage,
  type AuthManagerOptions,

  // Search
  SearchManager,
  type SearchManagerOptions,
  type SortMode,

  // Content
  ContentManager,
  type FetchOptions,
  type PostWithEngagement,
} from './managers/index.js';

// ============================================================================
// Services - Extended functionality
// ============================================================================
export {
  BackupService,
  type BackupOptions,
  type BackupResult,
} from './services/index.js';
```

### Re-export Patterns

**Selective re-export** (avoid duplicates):

```typescript
// Re-export validation utilities (primary source)
export * from './validation.js';

// Re-export thread utilities (excluding duplicates from validation.js)
export {
  type ThreadPost,
  PostCache,
  fetchThread,
  fetchPreviewReplies,
  flattenThread,
  // ... specific exports only
} from './threads.js';
```

**Default export** (optional, for convenience):

```typescript
export class AuthManager {
  // ...
}

export default AuthManager;
```

---

## Naming Conventions

### Files

- **PascalCase** for class files: `AuthManager.ts`, `SearchManager.ts`
- **camelCase** for utility files: `validation.ts`, `analytics.ts`
- **index.ts** for module entry points

### Classes & Interfaces

- **PascalCase** for classes: `AuthManager`, `EngagementCache`
- **PascalCase** for interfaces: `ContentItem`, `SearchFilters`
- **Suffix patterns**:
  - `Manager` for managers: `ContentManager`, `NetworkManager`
  - `Service` for services: `BackupService`, `VisionService`
  - `Options` for config: `AuthManagerOptions`, `SearchManagerOptions`
  - `Result` for outputs: `BackupResult`, `DeletionResult`
  - `Error` for errors: `AuthenticationError`, `ValidationError`

### Functions & Methods

- **camelCase** for functions: `calculateEngagementScore`, `parseDateTime`
- **Verb-noun pattern**: `getProfile`, `createPost`, `updateSettings`
- **Boolean predicates**: `isValid`, `hasPermission`, `canDelete`

### Constants

- **SCREAMING_SNAKE_CASE** for constants: `DEFAULT_SETTINGS`, `BLUESKY_MAX_SIZE`
- **PascalCase** for constant objects: `DateUtils`, `UriUtils`

### Type Names

- **PascalCase** for types: `ContentType`, `DeleteMode`, `SortMode`
- **Descriptive suffixes**: `Type`, `Mode`, `Options`, `Result`, `Data`

### Variables

- **camelCase** for variables: `userName`, `postCount`, `isAuthenticated`
- **Private fields**: Prefix with `_`: `_agent`, `_handle`, `_storage`

---

## Code Organization

### File Structure Template

```typescript
/**
 * Module header
 * @packageDocumentation
 */

// ============================================================================
// Imports
// ============================================================================
import { External } from '@external/package';
import type { ExternalType } from '@external/package';
import { LocalClass } from '../local/file.js';
import type { LocalType } from '../models/index.js';

// ============================================================================
// Types & Interfaces
// ============================================================================
export interface ConfigOptions {
  // ...
}

export type Mode = 'mode1' | 'mode2';

// ============================================================================
// Constants
// ============================================================================
export const DEFAULT_CONFIG: ConfigOptions = {
  // ...
};

// ============================================================================
// Main Class/Function
// ============================================================================
export class ClassName {
  // Private fields
  private field: Type;

  // Constructor
  constructor(options: ConfigOptions = {}) {
    // ...
  }

  // Public methods
  async publicMethod(): Promise<Result> {
    // ...
  }

  // Private methods
  private helperMethod(): void {
    // ...
  }
}

// ============================================================================
// Helper Functions (if needed)
// ============================================================================
function helperFunction(): void {
  // ...
}

// ============================================================================
// Exports
// ============================================================================
export default ClassName;
```

### Import Order

1. External dependencies (`@atproto/api`, etc.)
2. Type-only imports (use `import type`)
3. Local imports (relative paths)
4. Blank line between groups

```typescript
import { BskyAgent, AtpSessionData } from '@atproto/api';
import type { ContentItem, SearchFilters } from '../models/index.js';
import { calculateEngagementScore } from '../utils/index.js';
```

### Method Order in Classes

1. Constructor
2. Getters/Setters
3. Public methods (alphabetical or logical grouping)
4. Private methods (alphabetical or logical grouping)

```typescript
export class AuthManager {
  // Fields
  private _agent: BskyAgent;
  private _handle: string | null = null;

  // Constructor
  constructor(options: AuthManagerOptions = {}) {
    // ...
  }

  // Getters
  get agent(): BskyAgent {
    return this._agent;
  }

  get handle(): string | null {
    return this._handle;
  }

  // Public methods
  async login(identifier: string, password: string): Promise<boolean> {
    // ...
  }

  async logout(): Promise<void> {
    // ...
  }

  isAuthenticated(): boolean {
    // ...
  }

  // Private methods
  private normalizeHandle(handle: string): string {
    // ...
  }

  private async handleSessionChange(evt: AtpSessionEvent): Promise<void> {
    // ...
  }
}
```

---

## Additional Patterns

### Async/Await

- Always use `async/await` over promises
- Use `Promise<Type>` return types
- Handle errors with try-catch

```typescript
async login(identifier: string, password: string): Promise<boolean> {
  try {
    const response = await this._agent.login({ identifier, password });
    this._handle = response.data.handle;
    return true;
  } catch (error) {
    throw new AuthenticationError('Login failed', error);
  }
}
```

### Generics

Use generics for reusable, type-safe components:

```typescript
export class EngagementCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();

  get(key: string): T | undefined {
    // ...
  }

  set(key: string, value: T): void {
    // ...
  }
}

// Usage
const cache = new EngagementCache<PostData>();
```

### Nullish Coalescing & Optional Chaining

Use `??` and `?.` for safety:

```typescript
const service = options.service ?? 'https://bsky.social';
const count = item.rawData?.subject_like_count ?? 0;
const handle = response.data?.handle;
```

### Array Methods

Prefer functional array methods:

```typescript
// Filter
const filtered = items.filter(item => item.likeCount > 10);

// Map
const handles = users.map(u => u.handle);

// Reduce
const total = items.reduce((sum, item) => sum + item.likeCount, 0);

// Sort (with copy)
const sorted = [...items].sort((a, b) => b.likeCount - a.likeCount);
```

### Type Guards

Use type guards for narrowing:

```typescript
function isContentItem(obj: unknown): obj is ContentItem {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'uri' in obj &&
    'contentType' in obj
  );
}

// Usage
if (isContentItem(data)) {
  console.log(data.uri); // Type-safe
}
```

---

## Summary Checklist

When creating new code, ensure:

- [ ] File has JSDoc header with `@packageDocumentation`
- [ ] All imports use `.js` extensions
- [ ] Classes follow Manager/Service/Utility pattern
- [ ] Options interfaces defined for constructors
- [ ] Private fields prefixed with `_`
- [ ] Public methods have JSDoc with examples
- [ ] Error classes extend `Error`
- [ ] Types use appropriate `type` vs `interface`
- [ ] Exports follow module patterns
- [ ] Naming conventions followed (PascalCase, camelCase, etc.)
- [ ] Code organized with clear sections
- [ ] Async functions return `Promise<Type>`
- [ ] Nullish coalescing used for defaults

---

## References

- **Example Managers**: `src/managers/auth.ts`, `src/managers/search.ts`
- **Example Services**: `src/services/backup.ts`, `src/services/vision.ts`
- **Example Utilities**: `src/utils/validation.ts`, `src/utils/index.ts`
- **Example Models**: `src/models/index.ts`
- **Main Entry**: `src/index.ts`

---

**Maintained by**: Luke Steuber
**Package**: skymarshal-core
**License**: MIT
