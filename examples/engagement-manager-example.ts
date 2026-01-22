/**
 * EngagementManager Usage Example
 *
 * Demonstrates TTL-based caching for Bluesky engagement metrics
 */

import { AtpAgent } from '@atproto/api';
import { EngagementManager, ContentManager } from '../src/managers/index.js';

async function main() {
  // Initialize agent
  const agent = new AtpAgent({ service: 'https://bsky.social' });

  // Login (replace with your credentials)
  await agent.login({
    identifier: 'your.handle.bsky.social',
    password: 'your-app-password'
  });

  // Initialize managers
  const contentManager = new ContentManager(agent);
  const engagementManager = new EngagementManager(agent);

  // Example 1: Fetch posts and hydrate with engagement metrics
  console.log('Fetching posts with engagement metrics...');

  const { records: posts } = await contentManager.getPosts(
    agent.session!.did,
    { limit: 10, includeEngagement: false } // We'll add engagement ourselves
  );

  console.log(`Fetched ${posts.length} posts`);

  // Hydrate posts with engagement (uses cache when available)
  await engagementManager.hydrateItems(posts);

  // Display posts with engagement
  posts.forEach((post, i) => {
    console.log(`\nPost ${i + 1}:`);
    console.log(`  Text: ${post.text.substring(0, 50)}...`);
    console.log(`  Likes: ${post.likeCount || 0}`);
    console.log(`  Reposts: ${post.repostCount || 0}`);
    console.log(`  Replies: ${post.replyCount || 0}`);
    console.log(`  Engagement Score: ${post.engagementScore || 0}`);
  });

  // Example 2: Check cache statistics
  const stats = engagementManager.getStats();
  console.log('\nCache Statistics:');
  console.log(`  Hits: ${stats.hits}`);
  console.log(`  Misses: ${stats.misses}`);
  console.log(`  Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
  console.log(`  API Calls: ${stats.apiCalls}`);
  console.log(`  Errors: ${stats.errors}`);

  // Example 3: Manual cache operations
  const testUri = 'at://did:plc:test/app.bsky.feed.post/123';

  // Check if cached
  const cached = engagementManager.getEngagement(testUri);
  console.log(`\nIs ${testUri} cached?`, cached !== null);

  // Calculate TTL for different post ages
  const now = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  console.log('\nTTL for different post ages:');
  console.log(`  New post (now): ${engagementManager.calculateTTL(now) / 1000 / 60} minutes`);
  console.log(`  1 day old: ${engagementManager.calculateTTL(oneDayAgo) / 1000 / 60 / 60} hours`);
  console.log(`  7 days old: ${engagementManager.calculateTTL(sevenDaysAgo) / 1000 / 60 / 60} hours`);
  console.log(`  30 days old: ${engagementManager.calculateTTL(thirtyDaysAgo) / 1000 / 60 / 60} hours`);

  // Example 4: Batch update engagement
  const uris = posts.map(p => p.uri);
  console.log(`\nBatch updating engagement for ${uris.length} posts...`);

  const engagementMap = await engagementManager.batchUpdateEngagement(uris);
  console.log(`Updated ${engagementMap.size} posts`);

  // Example 5: Clear cache (optional)
  // engagementManager.clearCache();
  // console.log('\nCache cleared');
}

// Run example
main().catch(console.error);
