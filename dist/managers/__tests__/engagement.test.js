/**
 * Tests for EngagementManager
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { AtpAgent } from '@atproto/api';
import { EngagementManager } from '../engagement.js';
describe('EngagementManager', () => {
    let agent;
    let manager;
    beforeEach(() => {
        agent = new AtpAgent({ service: 'https://bsky.social' });
        manager = new EngagementManager(agent);
    });
    describe('calculateTTL', () => {
        it('should return 1 hour TTL for posts < 1 day old', () => {
            const yesterday = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
            const ttl = manager.calculateTTL(yesterday);
            assert.strictEqual(ttl, 60 * 60 * 1000); // 1 hour
        });
        it('should return 6 hour TTL for posts 1-7 days old', () => {
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
            const ttl = manager.calculateTTL(threeDaysAgo);
            assert.strictEqual(ttl, 6 * 60 * 60 * 1000); // 6 hours
        });
        it('should return 24 hour TTL for posts > 7 days old', () => {
            const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
            const ttl = manager.calculateTTL(tenDaysAgo);
            assert.strictEqual(ttl, 24 * 60 * 60 * 1000); // 24 hours
        });
    });
    describe('isStale', () => {
        it('should return true if cached data exceeds TTL', () => {
            const cachedAt = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
            const ttl = 60 * 60 * 1000; // 1 hour TTL
            assert.strictEqual(manager.isStale(cachedAt, ttl), true);
        });
        it('should return false if cached data is within TTL', () => {
            const cachedAt = Date.now() - 30 * 60 * 1000; // 30 minutes ago
            const ttl = 60 * 60 * 1000; // 1 hour TTL
            assert.strictEqual(manager.isStale(cachedAt, ttl), false);
        });
    });
    describe('cacheEngagement and getEngagement', () => {
        it('should cache and retrieve engagement metrics', () => {
            const uri = 'at://did:plc:test/app.bsky.feed.post/123';
            const metrics = {
                uri,
                likeCount: 10,
                repostCount: 5,
                replyCount: 3,
                quoteCount: 2,
                cachedAt: Date.now(),
                expiresAt: Date.now() + 60 * 60 * 1000,
                source: 'api'
            };
            manager.cacheEngagement(uri, metrics);
            const retrieved = manager.getEngagement(uri);
            assert.deepStrictEqual(retrieved, metrics);
        });
        it('should return null for non-existent URI', () => {
            const retrieved = manager.getEngagement('at://did:plc:test/app.bsky.feed.post/nonexistent');
            assert.strictEqual(retrieved, null);
        });
        it('should return null and delete expired entries', () => {
            const uri = 'at://did:plc:test/app.bsky.feed.post/expired';
            const metrics = {
                uri,
                likeCount: 10,
                repostCount: 5,
                replyCount: 3,
                cachedAt: Date.now() - 2 * 60 * 60 * 1000,
                expiresAt: Date.now() - 60 * 60 * 1000, // Expired 1 hour ago
                source: 'api'
            };
            manager.cacheEngagement(uri, metrics);
            const retrieved = manager.getEngagement(uri);
            assert.strictEqual(retrieved, null);
        });
    });
    describe('getStats', () => {
        it('should track cache hits and misses', () => {
            const uri = 'at://did:plc:test/app.bsky.feed.post/stats';
            const metrics = {
                uri,
                likeCount: 10,
                repostCount: 5,
                replyCount: 3,
                cachedAt: Date.now(),
                expiresAt: Date.now() + 60 * 60 * 1000,
                source: 'api'
            };
            // Cache miss
            manager.getEngagement(uri);
            // Cache hit
            manager.cacheEngagement(uri, metrics);
            manager.getEngagement(uri);
            const stats = manager.getStats();
            assert.strictEqual(stats.hits, 1);
            assert.strictEqual(stats.misses, 1);
            assert.strictEqual(stats.hitRate, 0.5);
        });
        it('should reset stats', () => {
            manager.getEngagement('at://did:plc:test/app.bsky.feed.post/test');
            manager.resetStats();
            const stats = manager.getStats();
            assert.strictEqual(stats.hits, 0);
            assert.strictEqual(stats.misses, 0);
        });
    });
    describe('clearCache', () => {
        it('should clear all cached data and stats', () => {
            const uri = 'at://did:plc:test/app.bsky.feed.post/clear';
            const metrics = {
                uri,
                likeCount: 10,
                repostCount: 5,
                replyCount: 3,
                cachedAt: Date.now(),
                expiresAt: Date.now() + 60 * 60 * 1000,
                source: 'api'
            };
            manager.cacheEngagement(uri, metrics);
            manager.clearCache();
            const retrieved = manager.getEngagement(uri);
            const stats = manager.getStats();
            assert.strictEqual(retrieved, null);
            assert.strictEqual(stats.hits, 0);
            assert.strictEqual(stats.misses, 1);
        });
    });
    describe('hydrateItems', () => {
        it('should update items with cached engagement', async () => {
            const uri = 'at://did:plc:test/app.bsky.feed.post/hydrate';
            const items = [{
                    uri,
                    cid: 'cid123',
                    text: 'Test post',
                    createdAt: new Date().toISOString()
                }];
            const metrics = {
                uri,
                likeCount: 10,
                repostCount: 5,
                replyCount: 3,
                quoteCount: 2,
                cachedAt: Date.now(),
                expiresAt: Date.now() + 60 * 60 * 1000,
                source: 'api'
            };
            manager.cacheEngagement(uri, metrics);
            await manager.hydrateItems(items);
            assert.strictEqual(items[0].likeCount, 10);
            assert.strictEqual(items[0].repostCount, 5);
            assert.strictEqual(items[0].replyCount, 3);
            assert.strictEqual(items[0].quoteCount, 2);
            assert.ok(items[0].engagementCachedAt !== undefined);
        });
        it('should handle empty items array', async () => {
            await assert.doesNotReject(async () => {
                await manager.hydrateItems([]);
            });
        });
    });
});
//# sourceMappingURL=engagement.test.js.map