/**
 * NotificationManager - Handles Bluesky notifications
 * 
 * Features:
 * - List notifications with filtering
 * - Mark notifications as read
 * - Get unread count
 * - Notification type filtering (likes, reposts, follows, mentions, replies, quotes)
 */

import { BskyAgent } from '@atproto/api';

export interface Notification {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  reason: 'like' | 'repost' | 'follow' | 'mention' | 'reply' | 'quote';
  reasonSubject?: string;
  record: unknown;
  isRead: boolean;
  indexedAt: string;
}

export interface NotificationListOptions {
  limit?: number;
  cursor?: string;
  types?: ('like' | 'repost' | 'follow' | 'mention' | 'reply' | 'quote')[];
}

export interface NotificationListResult {
  notifications: Notification[];
  cursor?: string;
  seenAt?: string;
}

export class NotificationManager {
  constructor(private agent: BskyAgent) {}

  /**
   * List notifications with optional filtering
   */
  async listNotifications(options: NotificationListOptions = {}): Promise<NotificationListResult> {
    const { limit = 50, cursor, types } = options;

    const response = await this.agent.listNotifications({
      limit,
      cursor,
    });

    let notifications: Notification[] = response.data.notifications.map((n) => ({
      uri: n.uri,
      cid: n.cid,
      author: {
        did: n.author.did,
        handle: n.author.handle,
        displayName: n.author.displayName,
        avatar: n.author.avatar,
      },
      reason: n.reason as Notification['reason'],
      reasonSubject: n.reasonSubject,
      record: n.record,
      isRead: n.isRead,
      indexedAt: n.indexedAt,
    }));

    // Filter by types if specified
    if (types && types.length > 0) {
      notifications = notifications.filter((n) => types.includes(n.reason));
    }

    return {
      notifications,
      cursor: response.data.cursor,
      seenAt: response.data.seenAt,
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await this.agent.countUnreadNotifications();
    return response.data.count;
  }

  /**
   * Mark all notifications as read up to a specific time
   */
  async markAllRead(seenAt?: string): Promise<void> {
    const timestamp = seenAt || new Date().toISOString();
    await this.agent.updateSeenNotifications({ seenAt: timestamp as `${string}-${string}-${string}T${string}:${string}:${string}Z` });
  }

  /**
   * Get notifications grouped by type
   */
  async getGroupedNotifications(options: NotificationListOptions = {}): Promise<{
    likes: Notification[];
    reposts: Notification[];
    follows: Notification[];
    mentions: Notification[];
    replies: Notification[];
    quotes: Notification[];
  }> {
    const { notifications } = await this.listNotifications(options);

    return {
      likes: notifications.filter((n) => n.reason === 'like'),
      reposts: notifications.filter((n) => n.reason === 'repost'),
      follows: notifications.filter((n) => n.reason === 'follow'),
      mentions: notifications.filter((n) => n.reason === 'mention'),
      replies: notifications.filter((n) => n.reason === 'reply'),
      quotes: notifications.filter((n) => n.reason === 'quote'),
    };
  }

  /**
   * Get recent notification summary
   */
  async getSummary(): Promise<{
    unreadCount: number;
    recentLikes: number;
    recentReposts: number;
    recentFollows: number;
    recentMentions: number;
    recentReplies: number;
  }> {
    const [unreadCount, { notifications }] = await Promise.all([
      this.getUnreadCount(),
      this.listNotifications({ limit: 100 }),
    ]);

    const unread = notifications.filter((n) => !n.isRead);

    return {
      unreadCount,
      recentLikes: unread.filter((n) => n.reason === 'like').length,
      recentReposts: unread.filter((n) => n.reason === 'repost').length,
      recentFollows: unread.filter((n) => n.reason === 'follow').length,
      recentMentions: unread.filter((n) => n.reason === 'mention').length,
      recentReplies: unread.filter((n) => n.reason === 'reply').length,
    };
  }
}
