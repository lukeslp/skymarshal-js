/**
 * Example: Using thread fetching and caching utilities
 *
 * This example demonstrates how to use the thread utilities
 * ported from bluesky-accordion-client to fetch and manage
 * Bluesky post threads.
 */

import {
  AuthManager,
  fetchThread,
  fetchPreviewReplies,
  flattenThread,
  clearPostCache,
  getPostCache,
  countThreadPosts,
  getThreadDepth,
  findPostInThread,
  getThreadAuthors,
  resolvePostUrl,
  type ThreadPost,
} from 'skymarshal';

async function main() {
  // 1. Authenticate
  const auth = new AuthManager();
  await auth.login('your-handle.bsky.social', 'your-app-password');

  // 2. Fetch a thread with default depth (3)
  const postUri = 'at://did:plc:xxx/app.bsky.feed.post/abc123';
  const thread = await fetchThread(auth.agent, postUri);

  console.log('Thread root:', thread.record.text);
  console.log('Replies:', thread.replies?.length || 0);

  // 3. Get thread statistics
  const totalPosts = countThreadPosts(thread);
  const depth = getThreadDepth(thread);
  const authors = getThreadAuthors(thread);

  console.log(`\nThread stats:`);
  console.log(`- Total posts: ${totalPosts}`);
  console.log(`- Max depth: ${depth}`);
  console.log(`- Unique authors: ${authors.length}`);

  // 4. Flatten thread to array (useful for virtual scrolling)
  const allPosts = flattenThread(thread);
  console.log(`\nFlattened posts: ${allPosts.length}`);
  allPosts.forEach((post, i) => {
    console.log(`  ${i + 1}. @${post.author.handle}: ${post.record.text.slice(0, 50)}...`);
  });

  // 5. Fetch only preview replies (depth: 1) for lightweight loading
  const previewReplies = await fetchPreviewReplies(auth.agent, postUri);
  console.log(`\nPreview replies: ${previewReplies.length}`);

  // 6. Find a specific post within the thread
  const searchUri = 'at://did:plc:xxx/app.bsky.feed.post/def456';
  const foundPost = findPostInThread(thread, searchUri);
  if (foundPost) {
    console.log(`\nFound post by @${foundPost.author.handle}`);
  }

  // 7. Resolve a Bluesky URL to AT-URI
  const url = 'https://bsky.app/profile/user.bsky.social/post/abc123';
  try {
    const resolvedUri = await resolvePostUrl(auth.agent, url);
    console.log(`\nResolved URL to: ${resolvedUri}`);
  } catch (error) {
    console.error('Failed to resolve URL:', error);
  }

  // 8. Cache management
  const cache = getPostCache();
  console.log(`\nCache size: ${cache.size}`);
  console.log(`Cached: ${cache.has(postUri)}`);

  // Change cache TTL (default: 5 minutes)
  cache.setTTL(10 * 60 * 1000); // 10 minutes

  // Clear cache to force fresh fetches
  clearPostCache();
  console.log(`Cache cleared. Size: ${cache.size}`);

  // 9. Fetch deep thread (depth: 10) for complete conversation
  const deepThread = await fetchThread(auth.agent, postUri, 10);
  console.log(`\nDeep thread depth: ${getThreadDepth(deepThread)}`);

  // 10. Walk through thread tree recursively
  function walkThread(post: ThreadPost, indent: number = 0) {
    console.log(`${'  '.repeat(indent)}@${post.author.handle}: ${post.record.text.slice(0, 40)}`);
    if (post.replies) {
      post.replies.forEach((reply) => walkThread(reply, indent + 1));
    }
  }

  console.log('\nThread tree:');
  walkThread(thread);
}

// Run the example
main().catch(console.error);
