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
 * Storage interface for session persistence
 */
export interface SessionStorage {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
}
/**
 * In-memory session storage (default)
 */
export declare class MemoryStorage implements SessionStorage {
    private data;
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
}
/**
 * localStorage-based session storage (browser)
 */
export declare class LocalStorageAdapter implements SessionStorage {
    private prefix;
    constructor(prefix?: string);
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
}
/**
 * Authentication configuration options
 */
export interface AuthManagerOptions {
    /** Service URL (default: https://bsky.social) */
    service?: string;
    /** Session storage adapter */
    storage?: SessionStorage;
    /** Session storage key */
    sessionKey?: string;
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
export declare class AuthManager {
    private _agent;
    private _handle;
    private _did;
    private _storage;
    private _sessionKey;
    /**
     * Create a new AuthManager
     */
    constructor(options?: AuthManagerOptions);
    /**
     * Get the BskyAgent instance for direct API access
     */
    get agent(): BskyAgent;
    /**
     * Get current user's handle
     */
    get handle(): string | null;
    /**
     * Get current user's DID
     */
    get did(): string | null;
    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean;
    /**
     * Normalize handle: drop leading @ and append .bsky.social if missing domain
     */
    normalizeHandle(handle: string): string;
    /**
     * Login with handle and app password
     *
     * @param identifier - Handle or email
     * @param password - App password (NOT main password)
     * @returns true on success
     */
    login(identifier: string, password: string): Promise<boolean>;
    /**
     * Logout and clear session
     */
    logout(): Promise<void>;
    /**
     * Resume session from storage
     *
     * @returns true if session was restored
     */
    resumeSession(): Promise<boolean>;
    /**
     * Get user profile
     */
    getProfile(actor?: string): Promise<{
        did: string;
        handle: string;
        displayName?: string;
        description?: string;
        avatar?: string;
        followersCount: number;
        followsCount: number;
        postsCount: number;
    }>;
    /**
     * Handle session change events (persist to storage)
     */
    private handleSessionChange;
}
/**
 * Authentication error
 */
export declare class AuthenticationError extends Error {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
export default AuthManager;
//# sourceMappingURL=auth.d.ts.map