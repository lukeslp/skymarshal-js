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
export type JetstreamEvent = JetstreamCommitEvent | JetstreamIdentityEvent | JetstreamAccountEvent;
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
/**
 * Real-time streaming service for Bluesky Jetstream API
 *
 * Uses browser-native WebSocket API for compatibility across environments.
 * Implements EventEmitter-style API with on/off methods and async iterators.
 */
export declare class JetstreamService {
    private readonly endpoint;
    private readonly wantedCollections;
    private readonly wantedDids;
    private readonly reconnectOnError;
    private readonly maxReconnectAttempts;
    private ws;
    private connectionState;
    private reconnectAttempts;
    private reconnectTimer;
    private readonly INITIAL_RECONNECT_DELAY;
    private readonly MAX_RECONNECT_DELAY;
    private handleCache;
    private listeners;
    private postQueue;
    private postResolvers;
    private postIteratorActive;
    /**
     * Create a new JetstreamService instance
     *
     * @param options - Configuration options
     */
    constructor(options?: JetstreamOptions);
    /**
     * Connect to Jetstream WebSocket
     *
     * @returns Promise that resolves when connected
     * @throws Error if connection fails
     */
    connect(): Promise<void>;
    /**
     * Disconnect from Jetstream WebSocket
     *
     * @returns Promise that resolves when disconnected
     */
    disconnect(): Promise<void>;
    /**
     * Check if connected to Jetstream
     *
     * @returns True if connected
     */
    isConnected(): boolean;
    /**
     * Determine if reconnection should be attempted
     */
    private shouldReconnect;
    /**
     * Schedule automatic reconnection with exponential backoff
     */
    private scheduleReconnect;
    /**
     * Handle incoming WebSocket message
     */
    private handleMessage;
    /**
     * Parse a post from a commit event
     */
    private parsePostFromCommit;
    /**
     * Check if post has embedded media
     */
    private hasMedia;
    /**
     * Extract reply parent URI
     */
    private extractReplyParent;
    /**
     * Extract reply root URI
     */
    private extractReplyRoot;
    /**
     * Extract mentioned DIDs from facets
     */
    private extractMentions;
    /**
     * Extract hashtags from facets
     */
    private extractTags;
    /**
     * Extract external links from facets
     */
    private extractLinks;
    /**
     * Register an event listener
     *
     * @param event - Event name
     * @param handler - Event handler function
     * @returns This instance for chaining
     */
    on<T = unknown>(event: string, handler: EventHandler<T>): this;
    /**
     * Remove an event listener
     *
     * @param event - Event name
     * @param handler - Event handler function
     * @returns This instance for chaining
     */
    off<T = unknown>(event: string, handler: EventHandler<T>): this;
    /**
     * Emit an event to all registered listeners
     *
     * @param event - Event name
     * @param data - Event data
     */
    private emit;
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
    streamPosts(): AsyncIterableIterator<JetstreamPost>;
    /**
     * Stream events from a specific DID
     *
     * @param did - User DID to filter by
     */
    streamFromDid(did: string): AsyncIterableIterator<JetstreamEvent>;
    /**
     * Stream posts mentioning a specific handle
     *
     * @param handle - Handle to filter by (e.g., 'user.bsky.social')
     */
    streamMentions(handle: string): AsyncIterableIterator<JetstreamPost>;
    /**
     * Enqueue a post for async iterator consumption
     */
    private enqueuePost;
    /**
     * Resolve all pending async iterators (called on disconnect)
     */
    private resolveAllPendingIterators;
    /**
     * Get the current handle cache (DID → handle mapping)
     */
    getHandleCache(): Map<string, string>;
    /**
     * Get handle for a specific DID
     *
     * @param did - User DID
     * @returns Handle if cached, undefined otherwise
     */
    getHandle(did: string): string | undefined;
    /**
     * Get current connection state
     */
    getConnectionState(): 'disconnected' | 'connecting' | 'connected';
    /**
     * Get number of reconnection attempts
     */
    getReconnectAttempts(): number;
}
//# sourceMappingURL=JetstreamService.d.ts.map