/**
 * ChatManager - Manage DMs and conversations
 * @module skymarshal-core/managers/chat
 */
import { AtpAgent } from '@atproto/api';
/** Conversation summary */
export interface Conversation {
    id: string;
    rev: string;
    members: ConversationMember[];
    lastMessage?: Message;
    unreadCount: number;
    muted: boolean;
    opened: boolean;
}
/** Conversation member */
export interface ConversationMember {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
}
/** Chat message */
export interface Message {
    id: string;
    rev: string;
    text: string;
    sender: ConversationMember;
    sentAt: string;
    reactions?: Reaction[];
}
/** Message reaction */
export interface Reaction {
    value: string;
    sender: ConversationMember;
}
/** Fetch options for messages */
export interface MessageFetchOptions {
    limit?: number;
    cursor?: string;
}
/** Paginated result */
export interface PaginatedResult<T> {
    records: T[];
    cursor?: string;
    hasMore: boolean;
}
/**
 * ChatManager - Manages DMs and conversations for a Bluesky account
 * Uses the chat.bsky.convo namespace with proxy headers
 */
export declare class ChatManager {
    private agent;
    private serviceUrl;
    constructor(agent: AtpAgent);
    /**
     * Make a chat API call with proper headers
     */
    private chatApiCall;
    /**
     * Fallback to api.bsky.chat when PDS proxy fails
     */
    private chatApiFallback;
    /**
     * List all conversations
     */
    listConvos(): Promise<Conversation[]>;
    /**
     * Get a specific conversation
     * @param convoId - Conversation ID
     */
    getConvo(convoId: string): Promise<Conversation>;
    /**
     * Get or create a conversation with specific members
     * @param members - Array of member DIDs
     */
    getOrCreateConvo(members: string[]): Promise<Conversation>;
    /**
     * Get messages in a conversation
     * @param convoId - Conversation ID
     * @param options - Fetch options
     */
    getMessages(convoId: string, options?: MessageFetchOptions): Promise<PaginatedResult<Message>>;
    /**
     * Send a message in a conversation
     * @param convoId - Conversation ID
     * @param text - Message text
     */
    sendMessage(convoId: string, text: string): Promise<Message>;
    /**
     * Delete a message (for self only)
     * @param convoId - Conversation ID
     * @param messageId - Message ID
     */
    deleteMessage(convoId: string, messageId: string): Promise<void>;
    /**
     * Add a reaction to a message
     * @param convoId - Conversation ID
     * @param messageId - Message ID
     * @param emoji - Reaction emoji
     */
    addReaction(convoId: string, messageId: string, emoji: string): Promise<void>;
    /**
     * Remove a reaction from a message
     * @param convoId - Conversation ID
     * @param messageId - Message ID
     * @param emoji - Reaction emoji
     */
    removeReaction(convoId: string, messageId: string, emoji: string): Promise<void>;
    /**
     * Mark a conversation as read
     * @param convoId - Conversation ID
     * @param messageId - Last read message ID
     */
    updateRead(convoId: string, messageId: string): Promise<void>;
    /**
     * Mark all conversations as read
     */
    updateAllRead(): Promise<void>;
    /**
     * Mute a conversation
     * @param convoId - Conversation ID
     */
    muteConvo(convoId: string): Promise<void>;
    /**
     * Unmute a conversation
     * @param convoId - Conversation ID
     */
    unmuteConvo(convoId: string): Promise<void>;
    /**
     * Leave a conversation
     * @param convoId - Conversation ID
     */
    leaveConvo(convoId: string): Promise<void>;
    /**
     * Map raw conversation data to Conversation type
     */
    private mapConversation;
    /**
     * Map raw message data to Message type
     */
    private mapMessage;
}
export default ChatManager;
//# sourceMappingURL=chat.d.ts.map