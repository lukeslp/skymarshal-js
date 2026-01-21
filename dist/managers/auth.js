/**
 * Skymarshal Authentication Manager
 *
 * Handles Bluesky authentication, session management, and client operations.
 * Uses @atproto/api for AT Protocol communication.
 *
 * @packageDocumentation
 */
import { BskyAgent } from '@atproto/api';
/**
 * In-memory session storage (default)
 */
export class MemoryStorage {
    data = new Map();
    async get(key) {
        return this.data.get(key) ?? null;
    }
    async set(key, value) {
        this.data.set(key, value);
    }
    async remove(key) {
        this.data.delete(key);
    }
}
/**
 * localStorage-based session storage (browser)
 */
export class LocalStorageAdapter {
    prefix;
    constructor(prefix = 'skymarshal_') {
        this.prefix = prefix;
    }
    async get(key) {
        if (typeof localStorage === 'undefined')
            return null;
        return localStorage.getItem(this.prefix + key);
    }
    async set(key, value) {
        if (typeof localStorage === 'undefined')
            return;
        localStorage.setItem(this.prefix + key, value);
    }
    async remove(key) {
        if (typeof localStorage === 'undefined')
            return;
        localStorage.removeItem(this.prefix + key);
    }
}
/**
 * Manages Bluesky authentication state and operations
 *
 * @example
 * ```ts
 * const auth = new AuthManager();
 *
 * // Login with credentials
 * await auth.login('myhandle.bsky.social', 'my-app-password');
 *
 * // Check authentication
 * if (auth.isAuthenticated()) {
 *   console.log(`Logged in as ${auth.handle}`);
 * }
 *
 * // Get the agent for API calls
 * const agent = auth.agent;
 * const profile = await agent.getProfile({ actor: auth.did! });
 * ```
 */
export class AuthManager {
    _agent;
    _handle = null;
    _did = null;
    _storage;
    _sessionKey;
    /**
     * Create a new AuthManager
     */
    constructor(options = {}) {
        const service = options.service ?? 'https://bsky.social';
        this._storage = options.storage ?? new MemoryStorage();
        this._sessionKey = options.sessionKey ?? 'session';
        this._agent = new BskyAgent({
            service,
            persistSession: (evt, sess) => {
                this.handleSessionChange(evt, sess);
            },
        });
    }
    /**
     * Get the BskyAgent instance for direct API access
     */
    get agent() {
        return this._agent;
    }
    /**
     * Get current user's handle
     */
    get handle() {
        return this._handle;
    }
    /**
     * Get current user's DID
     */
    get did() {
        return this._did;
    }
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this._agent.hasSession && this._handle !== null;
    }
    /**
     * Normalize handle: drop leading @ and append .bsky.social if missing domain
     */
    normalizeHandle(handle) {
        if (!handle)
            return handle;
        let h = handle.trim().replace(/^@/, '');
        if (!h.includes('.')) {
            h = `${h}.bsky.social`;
        }
        return h;
    }
    /**
     * Login with handle and app password
     *
     * @param identifier - Handle or email
     * @param password - App password (NOT main password)
     * @returns true on success
     */
    async login(identifier, password) {
        try {
            const normalizedHandle = this.normalizeHandle(identifier);
            const response = await this._agent.login({
                identifier: normalizedHandle,
                password,
            });
            this._handle = response.data.handle;
            this._did = response.data.did;
            return true;
        }
        catch (error) {
            this._handle = null;
            this._did = null;
            throw new AuthenticationError('Login failed', error);
        }
    }
    /**
     * Logout and clear session
     */
    async logout() {
        this._handle = null;
        this._did = null;
        await this._storage.remove(this._sessionKey);
    }
    /**
     * Resume session from storage
     *
     * @returns true if session was restored
     */
    async resumeSession() {
        try {
            const sessionJson = await this._storage.get(this._sessionKey);
            if (!sessionJson)
                return false;
            const session = JSON.parse(sessionJson);
            await this._agent.resumeSession({
                did: session.did,
                handle: session.handle,
                accessJwt: session.accessJwt,
                refreshJwt: session.refreshJwt,
                active: true,
            });
            this._handle = session.handle;
            this._did = session.did;
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get user profile
     */
    async getProfile(actor) {
        if (!this.isAuthenticated()) {
            throw new AuthenticationError('Not authenticated');
        }
        const targetActor = actor ?? this._did;
        const response = await this._agent.getProfile({ actor: targetActor });
        return {
            did: response.data.did,
            handle: response.data.handle,
            displayName: response.data.displayName,
            description: response.data.description,
            avatar: response.data.avatar,
            followersCount: response.data.followersCount ?? 0,
            followsCount: response.data.followsCount ?? 0,
            postsCount: response.data.postsCount ?? 0,
        };
    }
    /**
     * Handle session change events (persist to storage)
     */
    async handleSessionChange(evt, sess) {
        if (evt === 'create' || evt === 'update') {
            if (sess) {
                const sessionData = {
                    did: sess.did,
                    handle: sess.handle,
                    accessJwt: sess.accessJwt,
                    refreshJwt: sess.refreshJwt,
                };
                await this._storage.set(this._sessionKey, JSON.stringify(sessionData));
            }
        }
        else if (evt === 'expired') {
            await this._storage.remove(this._sessionKey);
            this._handle = null;
            this._did = null;
        }
    }
}
/**
 * Authentication error
 */
export class AuthenticationError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'AuthenticationError';
    }
}
export default AuthManager;
//# sourceMappingURL=auth.js.map