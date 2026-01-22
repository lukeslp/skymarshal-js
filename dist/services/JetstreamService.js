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
    endpoint;
    wantedCollections;
    wantedDids;
    reconnectOnError;
    maxReconnectAttempts;
    // WebSocket connection
    ws = null;
    connectionState = 'disconnected';
    // Reconnection state
    reconnectAttempts = 0;
    reconnectTimer = null;
    INITIAL_RECONNECT_DELAY = 1000; // 1 second
    MAX_RECONNECT_DELAY = 30000; // 30 seconds
    // Identity cache (DID → handle mapping)
    handleCache = new Map();
    // Event listeners
    listeners = new Map();
    // Async iterator queues
    postQueue = [];
    postResolvers = [];
    postIteratorActive = false;
    /**
     * Create a new JetstreamService instance
     *
     * @param options - Configuration options
     */
    constructor(options = {}) {
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
    async connect() {
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
            }
            catch (error) {
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
    async disconnect() {
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
    isConnected() {
        return this.connectionState === 'connected' && this.ws !== null;
    }
    // ==========================================================================
    // Reconnection Logic
    // ==========================================================================
    /**
     * Determine if reconnection should be attempted
     */
    shouldReconnect() {
        if (this.maxReconnectAttempts === 0) {
            return true; // infinite attempts
        }
        return this.reconnectAttempts < this.maxReconnectAttempts;
    }
    /**
     * Schedule automatic reconnection with exponential backoff
     */
    scheduleReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        // Exponential backoff: min(initialDelay * 2^attempts, maxDelay)
        const delay = Math.min(this.INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts), this.MAX_RECONNECT_DELAY);
        this.reconnectAttempts++;
        console.log(`[JetstreamService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts || '∞'})...`);
        this.reconnectTimer = setTimeout(() => {
            this.connect().catch((error) => {
                console.error('[JetstreamService] Reconnection failed:', error);
                if (this.shouldReconnect()) {
                    this.scheduleReconnect();
                }
                else {
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
    handleMessage(data) {
        try {
            const event = JSON.parse(data);
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
                if (event.commit.operation === 'create' &&
                    event.commit.collection === 'app.bsky.feed.post' &&
                    event.commit.record) {
                    const post = this.parsePostFromCommit(event);
                    if (post) {
                        this.emit('post', post);
                        this.enqueuePost(post);
                    }
                }
            }
        }
        catch (error) {
            console.error('[JetstreamService] Error parsing message:', error);
            this.emit('parse_error', { error, data });
        }
    }
    /**
     * Parse a post from a commit event
     */
    parsePostFromCommit(event) {
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
            createdAt: record.createdAt || new Date().toISOString(),
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
    hasMedia(record) {
        const embed = record.embed;
        if (!embed || typeof embed !== 'object') {
            return false;
        }
        const embedType = embed.$type;
        return (embedType === 'app.bsky.embed.images' ||
            embedType === 'app.bsky.embed.video' ||
            embedType === 'app.bsky.embed.external');
    }
    /**
     * Extract reply parent URI
     */
    extractReplyParent(record) {
        const reply = record.reply;
        if (reply && typeof reply === 'object') {
            const parent = reply.parent;
            if (parent && typeof parent === 'object') {
                return parent.uri;
            }
        }
        return undefined;
    }
    /**
     * Extract reply root URI
     */
    extractReplyRoot(record) {
        const reply = record.reply;
        if (reply && typeof reply === 'object') {
            const root = reply.root;
            if (root && typeof root === 'object') {
                return root.uri;
            }
        }
        return undefined;
    }
    /**
     * Extract mentioned DIDs from facets
     */
    extractMentions(record) {
        const facets = record.facets;
        if (!Array.isArray(facets)) {
            return [];
        }
        const mentions = [];
        for (const facet of facets) {
            if (typeof facet !== 'object' || !facet)
                continue;
            const features = facet.features;
            if (!Array.isArray(features))
                continue;
            for (const feature of features) {
                if (typeof feature !== 'object' || !feature)
                    continue;
                const type = feature.$type;
                if (type === 'app.bsky.richtext.facet#mention') {
                    const did = feature.did;
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
    extractTags(record) {
        const facets = record.facets;
        if (!Array.isArray(facets)) {
            return [];
        }
        const tags = [];
        for (const facet of facets) {
            if (typeof facet !== 'object' || !facet)
                continue;
            const features = facet.features;
            if (!Array.isArray(features))
                continue;
            for (const feature of features) {
                if (typeof feature !== 'object' || !feature)
                    continue;
                const type = feature.$type;
                if (type === 'app.bsky.richtext.facet#tag') {
                    const tag = feature.tag;
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
    extractLinks(record) {
        const facets = record.facets;
        if (!Array.isArray(facets)) {
            return [];
        }
        const links = [];
        for (const facet of facets) {
            if (typeof facet !== 'object' || !facet)
                continue;
            const features = facet.features;
            if (!Array.isArray(features))
                continue;
            for (const feature of features) {
                if (typeof feature !== 'object' || !feature)
                    continue;
                const type = feature.$type;
                if (type === 'app.bsky.richtext.facet#link') {
                    const uri = feature.uri;
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
    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(handler);
        return this;
    }
    /**
     * Remove an event listener
     *
     * @param event - Event name
     * @param handler - Event handler function
     * @returns This instance for chaining
     */
    off(event, handler) {
        const handlers = this.listeners.get(event);
        if (handlers) {
            handlers.delete(handler);
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
    emit(event, data) {
        const handlers = this.listeners.get(event);
        if (handlers) {
            handlers.forEach((handler) => {
                try {
                    handler(data);
                }
                catch (error) {
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
    async *streamPosts() {
        this.postIteratorActive = true;
        try {
            while (this.postIteratorActive && this.isConnected()) {
                // If queue has posts, yield immediately
                if (this.postQueue.length > 0) {
                    const post = this.postQueue.shift();
                    yield post;
                    continue;
                }
                // Otherwise, wait for next post
                const result = await new Promise((resolve) => {
                    this.postResolvers.push(resolve);
                });
                if (result.done) {
                    break;
                }
                yield result.value;
            }
        }
        finally {
            this.postIteratorActive = false;
        }
    }
    /**
     * Stream events from a specific DID
     *
     * @param did - User DID to filter by
     */
    async *streamFromDid(did) {
        const queue = [];
        const resolvers = [];
        let active = true;
        // Set up event handlers
        const commitHandler = (event) => {
            if (event.did === did) {
                if (resolvers.length > 0) {
                    const resolve = resolvers.shift();
                    resolve({ done: false, value: event });
                }
                else {
                    queue.push(event);
                }
            }
        };
        const identityHandler = (event) => {
            if (event.did === did) {
                if (resolvers.length > 0) {
                    const resolve = resolvers.shift();
                    resolve({ done: false, value: event });
                }
                else {
                    queue.push(event);
                }
            }
        };
        const accountHandler = (event) => {
            if (event.did === did) {
                if (resolvers.length > 0) {
                    const resolve = resolvers.shift();
                    resolve({ done: false, value: event });
                }
                else {
                    queue.push(event);
                }
            }
        };
        this.on('commit', commitHandler);
        this.on('identity', identityHandler);
        this.on('account', accountHandler);
        try {
            while (active && this.isConnected()) {
                if (queue.length > 0) {
                    const event = queue.shift();
                    yield event;
                    continue;
                }
                const result = await new Promise((resolve) => {
                    resolvers.push(resolve);
                });
                if (result.done) {
                    break;
                }
                yield result.value;
            }
        }
        finally {
            active = false;
            this.off('commit', commitHandler);
            this.off('identity', identityHandler);
            this.off('account', accountHandler);
        }
    }
    /**
     * Stream posts mentioning a specific handle
     *
     * @param handle - Handle to filter by (e.g., 'user.bsky.social')
     */
    async *streamMentions(handle) {
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
    enqueuePost(post) {
        if (this.postResolvers.length > 0) {
            const resolve = this.postResolvers.shift();
            resolve({ done: false, value: post });
        }
        else {
            this.postQueue.push(post);
        }
    }
    /**
     * Resolve all pending async iterators (called on disconnect)
     */
    resolveAllPendingIterators() {
        // Resolve post iterators
        while (this.postResolvers.length > 0) {
            const resolve = this.postResolvers.shift();
            resolve({ done: true, value: undefined });
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
    getHandleCache() {
        return new Map(this.handleCache);
    }
    /**
     * Get handle for a specific DID
     *
     * @param did - User DID
     * @returns Handle if cached, undefined otherwise
     */
    getHandle(did) {
        return this.handleCache.get(did);
    }
    /**
     * Get current connection state
     */
    getConnectionState() {
        return this.connectionState;
    }
    /**
     * Get number of reconnection attempts
     */
    getReconnectAttempts() {
        return this.reconnectAttempts;
    }
}
//# sourceMappingURL=JetstreamService.js.map