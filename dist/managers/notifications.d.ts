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
export declare class NotificationManager {
    private agent;
    constructor(agent: BskyAgent);
    /**
     * List notifications with optional filtering
     */
    listNotifications(options?: NotificationListOptions): Promise<NotificationListResult>;
    /**
     * Get unread notification count
     */
    getUnreadCount(): Promise<number>;
    /**
     * Mark all notifications as read up to a specific time
     */
    markAllRead(seenAt?: string): Promise<void>;
    /**
     * Get notifications grouped by type
     */
    getGroupedNotifications(options?: NotificationListOptions): Promise<{
        likes: Notification[];
        reposts: Notification[];
        follows: Notification[];
        mentions: Notification[];
        replies: Notification[];
        quotes: Notification[];
    }>;
    /**
     * Get recent notification summary
     */
    getSummary(): Promise<{
        unreadCount: number;
        recentLikes: number;
        recentReposts: number;
        recentFollows: number;
        recentMentions: number;
        recentReplies: number;
    }>;
}
//# sourceMappingURL=notifications.d.ts.map