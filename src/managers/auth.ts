/**
 * Skymarshal Authentication Manager
 *
 * Handles Bluesky authentication, session management, and client operations.
 * Uses @atproto/api for AT Protocol communication.
 *
 * @packageDocumentation
 */

import { BskyAgent, AtpSessionData, AtpSessionEvent } from '@atproto/api';
import type { SessionData } from '../models/index.js';

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
export class MemoryStorage implements SessionStorage {
  private data = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }
}

/**
 * localStorage-based session storage (browser)
 */
export class LocalStorageAdapter implements SessionStorage {
  constructor(private prefix = 'skymarshal_') {}

  async get(key: string): Promise<string | null> {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.prefix + key);
  }

  async set(key: string, value: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.prefix + key, value);
  }

  async remove(key: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.prefix + key);
  }
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
export class AuthManager {
  private _agent: BskyAgent;
  private _handle: string | null = null;
  private _did: string | null = null;
  private _storage: SessionStorage;
  private _sessionKey: string;

  /**
   * Create a new AuthManager
   */
  constructor(options: AuthManagerOptions = {}) {
    const service = options.service ?? 'https://bsky.social';
    this._storage = options.storage ?? new MemoryStorage();
    this._sessionKey = options.sessionKey ?? 'session';

    this._agent = new BskyAgent({
      service,
      persistSession: (evt: AtpSessionEvent, sess?: AtpSessionData) => {
        this.handleSessionChange(evt, sess);
      },
    });
  }

  /**
   * Get the BskyAgent instance for direct API access
   */
  get agent(): BskyAgent {
    return this._agent;
  }

  /**
   * Get current user's handle
   */
  get handle(): string | null {
    return this._handle;
  }

  /**
   * Get current user's DID
   */
  get did(): string | null {
    return this._did;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this._agent.hasSession && this._handle !== null;
  }

  /**
   * Normalize handle: drop leading @ and append .bsky.social if missing domain
   */
  normalizeHandle(handle: string): string {
    if (!handle) return handle;
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
  async login(identifier: string, password: string): Promise<boolean> {
    try {
      const normalizedHandle = this.normalizeHandle(identifier);
      const response = await this._agent.login({
        identifier: normalizedHandle,
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

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    this._handle = null;
    this._did = null;
    await this._storage.remove(this._sessionKey);
  }

  /**
   * Resume session from storage
   *
   * @returns true if session was restored
   */
  async resumeSession(): Promise<boolean> {
    try {
      const sessionJson = await this._storage.get(this._sessionKey);
      if (!sessionJson) return false;

      const session: SessionData = JSON.parse(sessionJson);
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
    } catch {
      return false;
    }
  }

  /**
   * Get user profile
   */
  async getProfile(actor?: string): Promise<{
    did: string;
    handle: string;
    displayName?: string;
    description?: string;
    avatar?: string;
    followersCount: number;
    followsCount: number;
    postsCount: number;
  }> {
    if (!this.isAuthenticated()) {
      throw new AuthenticationError('Not authenticated');
    }

    const targetActor = actor ?? this._did!;
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
  private async handleSessionChange(
    evt: AtpSessionEvent,
    sess?: AtpSessionData
  ): Promise<void> {
    if (evt === 'create' || evt === 'update') {
      if (sess) {
        const sessionData: SessionData = {
          did: sess.did,
          handle: sess.handle,
          accessJwt: sess.accessJwt,
          refreshJwt: sess.refreshJwt,
        };
        await this._storage.set(this._sessionKey, JSON.stringify(sessionData));
      }
    } else if (evt === 'expired') {
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
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export default AuthManager;
