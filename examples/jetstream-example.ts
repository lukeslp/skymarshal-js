/**
 * JetstreamService Example - Real-time Bluesky firehose streaming
 *
 * This example demonstrates how to use the JetstreamService to stream
 * real-time posts from the Bluesky network.
 *
 * Run with: tsx examples/jetstream-example.ts
 */

import { JetstreamService, type JetstreamPost } from '../src/services/JetstreamService.js';

// ============================================================================
// Example 1: Basic Post Streaming
// ============================================================================

async function example1_basicPostStreaming() {
  console.log('\n=== Example 1: Basic Post Streaming ===\n');

  const jetstream = new JetstreamService({
    wantedCollections: ['app.bsky.feed.post'],
    reconnectOnError: true,
    maxReconnectAttempts: 3
  });

  let postCount = 0;

  // Listen for connection events
  jetstream.on('connected', () => {
    console.log('✅ Connected to Jetstream');
  });

  jetstream.on('disconnected', (data) => {
    console.log(`❌ Disconnected (code: ${data.code})`);
  });

  // Listen for posts
  jetstream.on('post', (post: JetstreamPost) => {
    postCount++;
    const preview = post.text.slice(0, 60).replace(/\n/g, ' ');
    console.log(`[${postCount}] ${post.authorHandle || post.authorDid}: ${preview}...`);

    // Display hashtags if present
    if (post.tags && post.tags.length > 0) {
      console.log(`   Tags: ${post.tags.join(', ')}`);
    }
  });

  // Connect and run for 30 seconds
  await jetstream.connect();

  await new Promise(resolve => setTimeout(resolve, 30000));

  console.log(`\n📊 Received ${postCount} posts in 30 seconds`);
  console.log(`   Average: ${(postCount / 30).toFixed(1)} posts/second`);

  await jetstream.disconnect();
}

// ============================================================================
// Example 2: Async Iterator Pattern
// ============================================================================

async function example2_asyncIterator() {
  console.log('\n=== Example 2: Async Iterator Pattern ===\n');

  const jetstream = new JetstreamService({
    wantedCollections: ['app.bsky.feed.post']
  });

  await jetstream.connect();

  console.log('Streaming posts with async iterator (will stop after 20 posts)...\n');

  let count = 0;

  for await (const post of jetstream.streamPosts()) {
    count++;
    console.log(`[${count}] ${post.authorHandle || 'Unknown'}: ${post.text.slice(0, 50)}...`);

    // Stop after 20 posts
    if (count >= 20) {
      break;
    }
  }

  await jetstream.disconnect();
  console.log('\n✅ Done');
}

// ============================================================================
// Example 3: Hashtag Tracker
// ============================================================================

async function example3_hashtagTracker() {
  console.log('\n=== Example 3: Hashtag Tracker ===\n');

  const jetstream = new JetstreamService({
    wantedCollections: ['app.bsky.feed.post']
  });

  const hashtagCounts = new Map<string, number>();
  let totalPosts = 0;

  jetstream.on('post', (post: JetstreamPost) => {
    totalPosts++;

    if (post.tags) {
      post.tags.forEach(tag => {
        const normalized = tag.toLowerCase();
        hashtagCounts.set(normalized, (hashtagCounts.get(normalized) || 0) + 1);
      });
    }
  });

  await jetstream.connect();

  // Log top hashtags every 10 seconds
  const interval = setInterval(() => {
    const top10 = Array.from(hashtagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('\n📊 Top 10 Hashtags:');
    top10.forEach(([tag, count], index) => {
      console.log(`   ${index + 1}. #${tag}: ${count} posts`);
    });
    console.log(`   Total posts analyzed: ${totalPosts}`);
  }, 10000);

  // Run for 60 seconds
  await new Promise(resolve => setTimeout(resolve, 60000));

  clearInterval(interval);
  await jetstream.disconnect();

  console.log('\n✅ Tracking complete');
}

// ============================================================================
// Example 4: Multi-Event Handling
// ============================================================================

async function example4_multiEventHandling() {
  console.log('\n=== Example 4: Multi-Event Handling ===\n');

  const jetstream = new JetstreamService({
    wantedCollections: [
      'app.bsky.feed.post',
      'app.bsky.feed.like',
      'app.bsky.graph.follow'
    ]
  });

  const stats = {
    posts: 0,
    likes: 0,
    follows: 0,
    identities: 0
  };

  // Handle all commit events
  jetstream.on('commit', (event) => {
    if (event.commit.operation === 'create') {
      if (event.commit.collection === 'app.bsky.feed.post') {
        stats.posts++;
      } else if (event.commit.collection === 'app.bsky.feed.like') {
        stats.likes++;
      } else if (event.commit.collection === 'app.bsky.graph.follow') {
        stats.follows++;
      }
    }
  });

  // Track identity events
  jetstream.on('identity', (event) => {
    stats.identities++;
    console.log(`🆔 Identity: ${event.identity.handle} → ${event.identity.did}`);
  });

  await jetstream.connect();

  // Display stats every 5 seconds
  const interval = setInterval(() => {
    console.log('\n📊 Activity Stats:');
    console.log(`   Posts: ${stats.posts}`);
    console.log(`   Likes: ${stats.likes}`);
    console.log(`   Follows: ${stats.follows}`);
    console.log(`   Identity updates: ${stats.identities}`);
  }, 5000);

  // Run for 30 seconds
  await new Promise(resolve => setTimeout(resolve, 30000));

  clearInterval(interval);
  await jetstream.disconnect();

  console.log('\n✅ Complete');
}

// ============================================================================
// Example 5: Handle Cache Usage
// ============================================================================

async function example5_handleCache() {
  console.log('\n=== Example 5: Handle Cache Usage ===\n');

  const jetstream = new JetstreamService({
    wantedCollections: ['app.bsky.feed.post']
  });

  await jetstream.connect();

  console.log('Building handle cache from identity events...\n');

  // Wait 10 seconds to populate cache
  await new Promise(resolve => setTimeout(resolve, 10000));

  const cache = jetstream.getHandleCache();
  console.log(`\n📇 Cached ${cache.size} handle mappings`);

  // Show first 10 entries
  console.log('\nSample entries:');
  Array.from(cache.entries()).slice(0, 10).forEach(([did, handle]) => {
    console.log(`   ${handle} → ${did.slice(0, 30)}...`);
  });

  await jetstream.disconnect();
}

// ============================================================================
// Example 6: Error Handling and Reconnection
// ============================================================================

async function example6_errorHandling() {
  console.log('\n=== Example 6: Error Handling & Reconnection ===\n');

  const jetstream = new JetstreamService({
    wantedCollections: ['app.bsky.feed.post'],
    reconnectOnError: true,
    maxReconnectAttempts: 3
  });

  // Monitor connection lifecycle
  jetstream.on('connected', () => {
    console.log('✅ Connected');
  });

  jetstream.on('disconnected', (data) => {
    console.log(`⚠️  Disconnected (code: ${data.code}, reason: ${data.reason})`);
  });

  jetstream.on('error', (data) => {
    console.error('❌ Error:', data.error);
  });

  jetstream.on('max_reconnect_reached', (data) => {
    console.error(`🛑 Max reconnection attempts reached: ${data.attempts}`);
  });

  // Log connection state changes
  let lastState = jetstream.getConnectionState();
  const stateInterval = setInterval(() => {
    const currentState = jetstream.getConnectionState();
    if (currentState !== lastState) {
      console.log(`State change: ${lastState} → ${currentState}`);
      lastState = currentState;
    }
  }, 1000);

  await jetstream.connect();

  // Run for 30 seconds
  await new Promise(resolve => setTimeout(resolve, 30000));

  clearInterval(stateInterval);
  await jetstream.disconnect();

  console.log('\n✅ Done');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('🚀 JetstreamService Examples\n');
  console.log('Choose an example to run:\n');
  console.log('1. Basic Post Streaming (30s)');
  console.log('2. Async Iterator Pattern (20 posts)');
  console.log('3. Hashtag Tracker (60s)');
  console.log('4. Multi-Event Handling (30s)');
  console.log('5. Handle Cache Usage (10s)');
  console.log('6. Error Handling & Reconnection (30s)');

  // Get example number from command line args
  const exampleNum = process.argv[2] ? parseInt(process.argv[2]) : 1;

  switch (exampleNum) {
    case 1:
      await example1_basicPostStreaming();
      break;
    case 2:
      await example2_asyncIterator();
      break;
    case 3:
      await example3_hashtagTracker();
      break;
    case 4:
      await example4_multiEventHandling();
      break;
    case 5:
      await example5_handleCache();
      break;
    case 6:
      await example6_errorHandling();
      break;
    default:
      console.log(`\nInvalid example number: ${exampleNum}`);
      console.log('Please choose 1-6');
      process.exit(1);
  }

  console.log('\n✨ Example complete\n');
  process.exit(0);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
