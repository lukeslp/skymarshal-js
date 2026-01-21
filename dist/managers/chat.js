/**
 * ChatManager - Manage DMs and conversations
 * @module skymarshal-core/managers/chat
 */
/** Chat proxy header for Bluesky chat API */
const CHAT_PROXY_HEADER = { 'Atproto-Proxy': 'did:web:api.bsky.chat#bsky_chat' };
/**
 * ChatManager - Manages DMs and conversations for a Bluesky account
 * Uses the chat.bsky.convo namespace with proxy headers
 */
export class ChatManager {
    agent;
    serviceUrl;
    constructor(agent) {
        this.agent = agent;
        this.serviceUrl = 'https://bsky.social';
    }
    /**
     * Make a chat API call with proper headers
     */
    async chatApiCall(endpoint, method = 'GET', body) {
        const baseUrl = this.serviceUrl.replace(/\/$/, '');
        let url = `${baseUrl}/xrpc/${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.agent.session.accessJwt}`,
            ...CHAT_PROXY_HEADER,
        };
        const fetchOptions = {
            method,
            headers,
        };
        if (method === 'GET' && body) {
            const params = new URLSearchParams();
            Object.entries(body).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach((v) => params.append(key, String(v)));
                }
                else if (value !== undefined && value !== null) {
                    params.append(key, String(value));
                }
            });
            url = `${url}?${params.toString()}`;
        }
        else if (method === 'POST' && body) {
            fetchOptions.body = JSON.stringify(body);
        }
        const response = await fetch(url, fetchOptions);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || 'Unknown Error';
            // Fallback to api.bsky.chat if PDS proxy fails
            if (response.status === 404 ||
                response.status === 502 ||
                response.status === 503 ||
                errorMessage === 'XRPCNotSupported' ||
                errorMessage.includes('not found')) {
                return this.chatApiFallback(endpoint, method, body);
            }
            throw new Error(errorMessage);
        }
        return response.json();
    }
    /**
     * Fallback to api.bsky.chat when PDS proxy fails
     */
    async chatApiFallback(endpoint, method, body) {
        let url = `https://api.bsky.chat/xrpc/${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.agent.session.accessJwt}`,
        };
        const fetchOptions = {
            method,
            headers,
        };
        if (method === 'GET' && body) {
            const params = new URLSearchParams();
            Object.entries(body).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach((v) => params.append(key, String(v)));
                }
                else if (value !== undefined && value !== null) {
                    params.append(key, String(value));
                }
            });
            url = `${url}?${params.toString()}`;
        }
        else if (method === 'POST' && body) {
            fetchOptions.body = JSON.stringify(body);
        }
        const response = await fetch(url, fetchOptions);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.error || `Chat API error: ${response.status}`);
        }
        return response.json();
    }
    /**
     * List all conversations
     */
    async listConvos() {
        const response = await this.chatApiCall('chat.bsky.convo.listConvos');
        return (response.convos || []).map(this.mapConversation);
    }
    /**
     * Get a specific conversation
     * @param convoId - Conversation ID
     */
    async getConvo(convoId) {
        const response = await this.chatApiCall('chat.bsky.convo.getConvo', 'GET', { convoId });
        return this.mapConversation(response.convo);
    }
    /**
     * Get or create a conversation with specific members
     * @param members - Array of member DIDs
     */
    async getOrCreateConvo(members) {
        const response = await this.chatApiCall('chat.bsky.convo.getConvoForMembers', 'GET', { members });
        return this.mapConversation(response.convo);
    }
    /**
     * Get messages in a conversation
     * @param convoId - Conversation ID
     * @param options - Fetch options
     */
    async getMessages(convoId, options = {}) {
        const { limit = 50, cursor } = options;
        const response = await this.chatApiCall('chat.bsky.convo.getMessages', 'GET', { convoId, limit, cursor });
        const messages = (response.messages || []).reverse().map(this.mapMessage);
        return {
            records: messages,
            cursor: response.cursor,
            hasMore: !!response.cursor,
        };
    }
    /**
     * Send a message in a conversation
     * @param convoId - Conversation ID
     * @param text - Message text
     */
    async sendMessage(convoId, text) {
        const response = await this.chatApiCall('chat.bsky.convo.sendMessage', 'POST', {
            convoId,
            message: { text },
        });
        return this.mapMessage(response);
    }
    /**
     * Delete a message (for self only)
     * @param convoId - Conversation ID
     * @param messageId - Message ID
     */
    async deleteMessage(convoId, messageId) {
        await this.chatApiCall('chat.bsky.convo.deleteMessageForSelf', 'POST', {
            convoId,
            messageId,
        });
    }
    /**
     * Add a reaction to a message
     * @param convoId - Conversation ID
     * @param messageId - Message ID
     * @param emoji - Reaction emoji
     */
    async addReaction(convoId, messageId, emoji) {
        await this.chatApiCall('chat.bsky.convo.addReaction', 'POST', {
            convoId,
            messageId,
            value: emoji,
        });
    }
    /**
     * Remove a reaction from a message
     * @param convoId - Conversation ID
     * @param messageId - Message ID
     * @param emoji - Reaction emoji
     */
    async removeReaction(convoId, messageId, emoji) {
        await this.chatApiCall('chat.bsky.convo.removeReaction', 'POST', {
            convoId,
            messageId,
            value: emoji,
        });
    }
    /**
     * Mark a conversation as read
     * @param convoId - Conversation ID
     * @param messageId - Last read message ID
     */
    async updateRead(convoId, messageId) {
        await this.chatApiCall('chat.bsky.convo.updateRead', 'POST', {
            convoId,
            messageId,
        });
    }
    /**
     * Mark all conversations as read
     */
    async updateAllRead() {
        await this.chatApiCall('chat.bsky.convo.updateAllRead', 'POST', {});
    }
    /**
     * Mute a conversation
     * @param convoId - Conversation ID
     */
    async muteConvo(convoId) {
        await this.chatApiCall('chat.bsky.convo.muteConvo', 'POST', { convoId });
    }
    /**
     * Unmute a conversation
     * @param convoId - Conversation ID
     */
    async unmuteConvo(convoId) {
        await this.chatApiCall('chat.bsky.convo.unmuteConvo', 'POST', { convoId });
    }
    /**
     * Leave a conversation
     * @param convoId - Conversation ID
     */
    async leaveConvo(convoId) {
        await this.chatApiCall('chat.bsky.convo.leaveConvo', 'POST', { convoId });
    }
    /**
     * Map raw conversation data to Conversation type
     */
    mapConversation(convo) {
        return {
            id: convo.id,
            rev: convo.rev,
            members: (convo.members || []).map((m) => ({
                did: m.did,
                handle: m.handle,
                displayName: m.displayName,
                avatar: m.avatar,
            })),
            lastMessage: convo.lastMessage ? this.mapMessage(convo.lastMessage) : undefined,
            unreadCount: convo.unreadCount || 0,
            muted: convo.muted || false,
            opened: convo.opened || false,
        };
    }
    /**
     * Map raw message data to Message type
     */
    mapMessage(msg) {
        return {
            id: msg.id,
            rev: msg.rev,
            text: msg.text || '',
            sender: {
                did: msg.sender?.did || '',
                handle: msg.sender?.handle || '',
                displayName: msg.sender?.displayName,
                avatar: msg.sender?.avatar,
            },
            sentAt: msg.sentAt,
            reactions: msg.reactions?.map((r) => ({
                value: r.value,
                sender: {
                    did: r.sender?.did || '',
                    handle: r.sender?.handle || '',
                    displayName: r.sender?.displayName,
                    avatar: r.sender?.avatar,
                },
            })),
        };
    }
}
export default ChatManager;
//# sourceMappingURL=chat.js.map