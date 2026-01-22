/**
 * JetstreamService - Real-time Bluesky firehose streaming via Jetstream WebSocket API
 * @module skymarshal-core/services/jetstream
 *
 * Browser-compatible WebSocket service for streaming Bluesky posts, likes, follows, etc.
 * Supports filtering by collection types and DIDs with auto-reconnect functionality.
 *
 * @example
 * ```typescript
 * const jetstream = new JetstreamService({
 *   wantedCollections: ['app.bsky.feed.post', 'app.bsky.feed.like'],
 *   reconnectOnError: true
 * });
 *
 * jetstream.on('commit', (event) => {
 *   console.log('New commit:', event);
 * });
 *
 * await jetstream.connect();
 *
 * // Async iterator for posts
 * for await (const post of jetstream.streamPosts()) {
 *   console.log('New post:', post.text);
 * }
 * ```
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Jetstream connection options
 */
export interface JetstreamOptions {
  /** WebSocket endpoint URL */
  endpoint?: string;
  /** Filter by specific collection types */
  wantedCollections?: string[];
  /** Filter by specific DIDs */
  wantedDids?: string[];
  /** Auto-reconnect on error or close */
  reconnectOnError?: boolean;
  /** Maximum reconnection attempts (0 = infinite) */
  maxReconnectAttempts?: number;
}

/**
 * Base Jetstream event
 */
export interface JetstreamBaseEvent {
  /** Event timestamp (microseconds) */
  time_us: number;
  /** User DID */
  did: string;
  /** Event type */
  kind: 'commit' | 'identity' | 'account';
}

/**
 * Commit event (repo changes)
 */
export interface JetstreamCommitEvent extends JetstreamBaseEvent {
  kind: 'commit';
  commit: {
    /** Revision string */
    rev: string;
    /** Operation type */
    operation: 'create' | 'update' | 'delete';
    /** Collection name (e.g., 'app.bsky.feed.post') */
    collection: string;
    /** Record key */
    rkey: string;
    /** Record data (only present on create/update) */
    record?: Record<string, unknown>;
    /** Content ID */
    cid?: string;
  };
}

/**
 * Identity event (handle/DID changes)
 */
export interface JetstreamIdentityEvent extends JetstreamBaseEvent {
  kind: 'identity';
  identity: {
    /** User DID */
    did: string;
    /** User handle */
    handle: string;
    /** Sequence number */
    seq: number;
    /** Timestamp */
    time: string;
  };
}

/**
 * Account event (account status changes)
 */
export interface JetstreamAccountEvent extends JetstreamBaseEvent {
  kind: 'account';
  account: {
    /** Account active status */
    active: boolean;
    /** Status reason */
    status?: string;
    /** Sequence number */
    seq: number;
    /** Timestamp */
    time: string;
  };
}

/**
 * Union type for all Jetstream events
 */
export type JetstreamEvent =
  | JetstreamCommitEvent
  | JetstreamIdentityEvent
  | JetstreamAccountEvent;

/**
 * Simplified post structure from commit events
 */
export interface JetstreamPost {
  /** Post URI (at://) */
  uri: string;
  /** Content ID */
  cid: string;
  /** Author DID */
  authorDid: string;
  /** Author handle (if resolved from identity cache) */
  authorHandle?: string;
  /** Post text */
  text: string;
  /** Creation timestamp */
  createdAt: string;
  /** Has embedded media */
  hasMedia?: boolean;
  /** Reply parent URI */
  replyParent?: string;
  /** Reply root URI */
  replyRoot?: string;
  /** Mentioned DIDs */
  mentions?: string[];
  /** Hashtags */
  tags?: string[];
  /** External links */
  links?: string[];
}

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (data: T) => void;

// ============================================================================
// JetstreamService Class
// ============================================================================

/**
 * Real-time streaming service for Bluesky Jetstream API
 *
 * Uses browser-native WebSocket API for compatibility across environments.
 * Implements EventEmitter-style API with on/off methods and async iterators.
 */
export class JetstreamService {
  // Configuration
  private readonly endpoint: string;
  private readonly wantedCollections: string[];
  private readonly wantedDids: string[];
  private readonly reconnectOnError: boolean;
  private readonly maxReconnectAttempts: number;

  // WebSocket connection
  private ws: WebSocket | null = null;
  private connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  // Reconnection state
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly INITIAL_RECONNECT_DELAY = 1000; // 1 second
  private readonly MAX_RECONNECT_DELAY = 30000; // 30 seconds

  // Identity cache (DID → handle mapping)
  private handleCache = new Map<string, string>();

  // Event listeners
  private listeners = new Map<string, Set<EventHandler>>();

  // Async iterator queues
  private postQueue: JetstreamPost[] = [];
  private postResolvers: Array<(value: IteratorResult<JetstreamPost>) => void> = [];
  private postIteratorActive = false;

  /**
   * Create a new JetstreamService instance
   *
   * @param options - Configuration options
   */
  constructor(options: JetstreamOptions = {}) {
    this.endpoint = options.endpoint || 'wss://jetstream2.us-east.bsky.network/subscribe';
    this.wantedCollections = options.wantedCollections || [];
    this.wantedDids = options.wantedDids || [];
    this.reconnectOnError = options.reconnectOnError !== false; // default true
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
  }

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  /**
   * Connect to Jetstream WebSocket
   *
   * @returns Promise that resolves when connected
   * @throws Error if connection fails
   */
  async connect(): Promise<void> {
    if (this.connectionState === 'connected') {
      console.warn('[JetstreamService] Already connected');
      return;
    }

    if (this.connectionState === 'connecting') {
      console.warn('[JetstreamService] Connection already in progress');
      return;
    }

    this.connectionState = 'connecting';

    return new Promise((resolve, reject) => {
      try {
        // Build WebSocket URL with query parameters
        const url = new URL(this.endpoint);

        if (this.wantedCollections.length > 0) {
          url.searchParams.append('wantedCollections', this.wantedCollections.join(','));
        }

        if (this.wantedDids.length > 0) {
          url.searchParams.append('wantedDids', this.wantedDids.join(','));
        }

        console.log('[JetstreamService] Connecting to:', url.toString());

        // Create WebSocket connection
        this.ws = new WebSocket(url.toString());

        // Connection opened
        this.ws.addEventListener('open', () => {
          console.log('[JetstreamService] Connected to Jetstream');
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          this.emit('connected', { timestamp: new Date().toISOString() });
          resolve();
        });

        // Message received
        this.ws.addEventListener('message', (event) => {
          this.handleMessage(event.data);
        });

        // Connection error
        this.ws.addEventListener('error', (event) => {
          console.error('[JetstreamService] WebSocket error:', event);
          this.emit('error', { error: 'WebSocket error', event });

          if (this.connectionState === 'connecting') {
            reject(new Error('WebSocket connection failed'));
          }
        });

        // Connection closed
        this.ws.addEventListener('close', (event) => {
          console.log(`[JetstreamService] Connection closed (code: ${event.code}, reason: ${event.reason})`);
          this.connectionState = 'disconnected';
          this.ws = null;
          this.emit('disconnected', { code: event.code, reason: event.reason });

          if (this.reconnectOnError && this.shouldReconnect()) {
            this.scheduleReconnect();
          }
        });

      } catch (error) {
        this.connectionState = 'disconnected';
        console.error('[JetstreamService] Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from Jetstream WebSocket
   *
   * @returns Promise that resolves when disconnected
   */
  async disconnect(): Promise<void> {
    console.log('[JetstreamService] Disconnecting...');

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectionState = 'disconnected';
    this.reconnectAttempts = 0;

    // Resolve pending async iterators
    this.resolveAllPendingIterators();
  }

  /**
   * Check if connected to Jetstream
   *
   * @returns True if connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws !== null;
  }

  // ==========================================================================
  // Reconnection Logic
  // ==========================================================================

  /**
   * Determine if reconnection should be attempted
   */
  private shouldReconnect(): boolean {
    if (this.maxReconnectAttempts === 0) {
      return true; // infinite attempts
    }
    return this.reconnectAttempts < this.maxReconnectAttempts;
  }

  /**
   * Schedule automatic reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Exponential backoff: min(initialDelay * 2^attempts, maxDelay)
    const delay = Math.min(
      this.INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      this.MAX_RECONNECT_DELAY
    );

    this.reconnectAttempts++;

    console.log(
      `[JetstreamService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts || '∞'})...`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('[JetstreamService] Reconnection failed:', error);

        if (this.shouldReconnect()) {
          this.scheduleReconnect();
        } else {
          console.error('[JetstreamService] Max reconnect attempts reached');
          this.emit('max_reconnect_reached', { attempts: this.reconnectAttempts });
        }
      });
    }, delay);
  }

  // ==========================================================================
  // Message Handling
  // ==========================================================================

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const event = JSON.parse(data) as JetstreamEvent;

      // Handle identity events to build handle cache
      if (event.kind === 'identity' && 'identity' in event) {
        this.handleCache.set(event.identity.did, event.identity.handle);
        this.emit('identity', event);
        return;
      }

      // Handle account events
      if (event.kind === 'account') {
        this.emit('account', event);
        return;
      }

      // Handle commit events
      if (event.kind === 'commit') {
        this.emit('commit', event);

        // Check if it's a post creation
        if (
          event.commit.operation === 'create' &&
          event.commit.collection === 'app.bsky.feed.post' &&
          event.commit.record
        ) {
          const post = this.parsePostFromCommit(event);
          if (post) {
            this.emit('post', post);
            this.enqueuePost(post);
          }
        }
      }
    } catch (error) {
      console.error('[JetstreamService] Error parsing message:', error);
      this.emit('parse_error', { error, data });
    }
  }

  /**
   * Parse a post from a commit event
   */
  private parsePostFromCommit(event: JetstreamCommitEvent): JetstreamPost | null {
    const record = event.commit.record;
    if (!record || typeof record !== 'object') {
      return null;
    }

    const text = record.text;
    if (typeof text !== 'string') {
      return null;
    }

    const uri = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
    const authorHandle = this.handleCache.get(event.did);

    return {
      uri,
      cid: event.commit.cid || '',
      authorDid: event.did,
      authorHandle,
      text,
      createdAt: (record.createdAt as string) || new Date().toISOString(),
      hasMedia: this.hasMedia(record),
      replyParent: this.extractReplyParent(record),
      replyRoot: this.extractReplyRoot(record),
      mentions: this.extractMentions(record),
      tags: this.extractTags(record),
      links: this.extractLinks(record),
    };
  }

  /**
   * Check if post has embedded media
   */
  private hasMedia(record: Record<string, unknown>): boolean {
    const embed = record.embed;
    if (!embed || typeof embed !== 'object') {
      return false;
    }
    const embedType = (embed as Record<string, unknown>).$type;
    return (
      embedType === 'app.bsky.embed.images' ||
      embedType === 'app.bsky.embed.video' ||
      embedType === 'app.bsky.embed.external'
    );
  }

  /**
   * Extract reply parent URI
   */
  private extractReplyParent(record: Record<string, unknown>): string | undefined {
    const reply = record.reply;
    if (reply && typeof reply === 'object') {
      const parent = (reply as Record<string, unknown>).parent;
      if (parent && typeof parent === 'object') {
        return (parent as Record<string, unknown>).uri as string;
      }
    }
    return undefined;
  }

  /**
   * Extract reply root URI
   */
  private extractReplyRoot(record: Record<string, unknown>): string | undefined {
    const reply = record.reply;
    if (reply && typeof reply === 'object') {
      const root = (reply as Record<string, unknown>).root;
      if (root && typeof root === 'object') {
        return (root as Record<string, unknown>).uri as string;
      }
    }
    return undefined;
  }

  /**
   * Extract mentioned DIDs from facets
   */
  private extractMentions(record: Record<string, unknown>): string[] {
    const facets = record.facets;
    if (!Array.isArray(facets)) {
      return [];
    }

    const mentions: string[] = [];
    for (const facet of facets) {
      if (typeof facet !== 'object' || !facet) continue;
      const features = (facet as Record<string, unknown>).features;
      if (!Array.isArray(features)) continue;

      for (const feature of features) {
        if (typeof feature !== 'object' || !feature) continue;
        const type = (feature as Record<string, unknown>).$type;
        if (type === 'app.bsky.richtext.facet#mention') {
          const did = (feature as Record<string, unknown>).did;
          if (typeof did === 'string') {
            mentions.push(did);
          }
        }
      }
    }
    return mentions;
  }

  /**
   * Extract hashtags from facets
   */
  private extractTags(record: Record<string, unknown>): string[] {
    const facets = record.facets;
    if (!Array.isArray(facets)) {
      return [];
    }

    const tags: string[] = [];
    for (const facet of facets) {
      if (typeof facet !== 'object' || !facet) continue;
      const features = (facet as Record<string, unknown>).features;
      if (!Array.isArray(features)) continue;

      for (const feature of features) {
        if (typeof feature !== 'object' || !feature) continue;
        const type = (feature as Record<string, unknown>).$type;
        if (type === 'app.bsky.richtext.facet#tag') {
          const tag = (feature as Record<string, unknown>).tag;
          if (typeof tag === 'string') {
            tags.push(tag);
          }
        }
      }
    }
    return tags;
  }

  /**
   * Extract external links from facets
   */
  private extractLinks(record: Record<string, unknown>): string[] {
    const facets = record.facets;
    if (!Array.isArray(facets)) {
      return [];
    }

    const links: string[] = [];
    for (const facet of facets) {
      if (typeof facet !== 'object' || !facet) continue;
      const features = (facet as Record<string, unknown>).features;
      if (!Array.isArray(features)) continue;

      for (const feature of features) {
        if (typeof feature !== 'object' || !feature) continue;
        const type = (feature as Record<string, unknown>).$type;
        if (type === 'app.bsky.richtext.facet#link') {
          const uri = (feature as Record<string, unknown>).uri;
          if (typeof uri === 'string') {
            links.push(uri);
          }
        }
      }
    }
    return links;
  }

  // ==========================================================================
  // Event Emitter Pattern
  // ==========================================================================

  /**
   * Register an event listener
   *
   * @param event - Event name
   * @param handler - Event handler function
   * @returns This instance for chaining
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler);
    return this;
  }

  /**
   * Remove an event listener
   *
   * @param event - Event name
   * @param handler - Event handler function
   * @returns This instance for chaining
   */
  off<T = unknown>(event: string, handler: EventHandler<T>): this {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
    return this;
  }

  /**
   * Emit an event to all registered listeners
   *
   * @param event - Event name
   * @param data - Event data
   */
  private emit(event: string, data?: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[JetstreamService] Error in ${event} handler:`, error);
        }
      });
    }
  }

  // ==========================================================================
  // Async Iterator Pattern
  // ==========================================================================

  /**
   * Stream posts as an async iterable
   *
   * @example
   * ```typescript
   * for await (const post of jetstream.streamPosts()) {
   *   console.log(post.text);
   * }
   * ```
   */
  async *streamPosts(): AsyncIterableIterator<JetstreamPost> {
    this.postIteratorActive = true;

    try {
      while (this.postIteratorActive && this.isConnected()) {
        // If queue has posts, yield immediately
        if (this.postQueue.length > 0) {
          const post = this.postQueue.shift()!;
          yield post;
          continue;
        }

        // Otherwise, wait for next post
        const result = await new Promise<IteratorResult<JetstreamPost>>((resolve) => {
          this.postResolvers.push(resolve);
        });

        if (result.done) {
          break;
        }

        yield result.value;
      }
    } finally {
      this.postIteratorActive = false;
    }
  }

  /**
   * Stream events from a specific DID
   *
   * @param did - User DID to filter by
   */
  async *streamFromDid(did: string): AsyncIterableIterator<JetstreamEvent> {
    const queue: JetstreamEvent[] = [];
    const resolvers: Array<(value: IteratorResult<JetstreamEvent>) => void> = [];
    let active = true;

    // Set up event handlers
    const commitHandler = (event: JetstreamCommitEvent) => {
      if (event.did === did) {
        if (resolvers.length > 0) {
          const resolve = resolvers.shift()!;
          resolve({ done: false, value: event });
        } else {
          queue.push(event);
        }
      }
    };

    const identityHandler = (event: JetstreamIdentityEvent) => {
      if (event.did === did) {
        if (resolvers.length > 0) {
          const resolve = resolvers.shift()!;
          resolve({ done: false, value: event });
        } else {
          queue.push(event);
        }
      }
    };

    const accountHandler = (event: JetstreamAccountEvent) => {
      if (event.did === did) {
        if (resolvers.length > 0) {
          const resolve = resolvers.shift()!;
          resolve({ done: false, value: event });
        } else {
          queue.push(event);
        }
      }
    };

    this.on<JetstreamCommitEvent>('commit', commitHandler);
    this.on<JetstreamIdentityEvent>('identity', identityHandler);
    this.on<JetstreamAccountEvent>('account', accountHandler);

    try {
      while (active && this.isConnected()) {
        if (queue.length > 0) {
          const event = queue.shift()!;
          yield event;
          continue;
        }

        const result = await new Promise<IteratorResult<JetstreamEvent>>((resolve) => {
          resolvers.push(resolve);
        });

        if (result.done) {
          break;
        }

        yield result.value;
      }
    } finally {
      active = false;
      this.off<JetstreamCommitEvent>('commit', commitHandler);
      this.off<JetstreamIdentityEvent>('identity', identityHandler);
      this.off<JetstreamAccountEvent>('account', accountHandler);
    }
  }

  /**
   * Stream posts mentioning a specific handle
   *
   * @param handle - Handle to filter by (e.g., 'user.bsky.social')
   */
  async *streamMentions(handle: string): AsyncIterableIterator<JetstreamPost> {
    const normalizedHandle = handle.toLowerCase();

    for await (const post of this.streamPosts()) {
      // Check if post text contains the handle
      if (post.text.toLowerCase().includes(`@${normalizedHandle}`)) {
        yield post;
        continue;
      }

      // Check if post mentions the handle's DID
      if (post.authorHandle?.toLowerCase() === normalizedHandle) {
        yield post;
        continue;
      }

      // Check facets for mentions
      // (In a real implementation, you'd resolve the handle to DID first)
    }
  }

  /**
   * Enqueue a post for async iterator consumption
   */
  private enqueuePost(post: JetstreamPost): void {
    if (this.postResolvers.length > 0) {
      const resolve = this.postResolvers.shift()!;
      resolve({ done: false, value: post });
    } else {
      this.postQueue.push(post);
    }
  }

  /**
   * Resolve all pending async iterators (called on disconnect)
   */
  private resolveAllPendingIterators(): void {
    // Resolve post iterators
    while (this.postResolvers.length > 0) {
      const resolve = this.postResolvers.shift()!;
      resolve({ done: true, value: undefined as unknown as JetstreamPost });
    }

    // Clear queues
    this.postQueue = [];
  }

  // ==========================================================================
  // Public Getters
  // ==========================================================================

  /**
   * Get the current handle cache (DID → handle mapping)
   */
  getHandleCache(): Map<string, string> {
    return new Map(this.handleCache);
  }

  /**
   * Get handle for a specific DID
   *
   * @param did - User DID
   * @returns Handle if cached, undefined otherwise
   */
  getHandle(did: string): string | undefined {
    return this.handleCache.get(did);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): 'disconnected' | 'connecting' | 'connected' {
    return this.connectionState;
  }

  /**
   * Get number of reconnection attempts
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}
