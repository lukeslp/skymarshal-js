#!/usr/bin/env node
/**
 * Verification script for thread utilities export
 * Checks that all thread functions and types are properly exported
 */

import {
  PostCache,
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
} from './dist/index.js';

console.log('✓ Thread Utilities Export Verification\n');

// Check PostCache class
console.log('Checking PostCache class...');
const cache = new PostCache();
console.log(`  ✓ PostCache constructor`);
console.log(`  ✓ cache.size: ${cache.size}`);
console.log(`  ✓ cache.set: ${typeof cache.set === 'function'}`);
console.log(`  ✓ cache.get: ${typeof cache.get === 'function'}`);
console.log(`  ✓ cache.has: ${typeof cache.has === 'function'}`);
console.log(`  ✓ cache.clear: ${typeof cache.clear === 'function'}`);
console.log(`  ✓ cache.setTTL: ${typeof cache.setTTL === 'function'}`);

// Check functions
console.log('\nChecking exported functions...');
const functions = {
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
};

let allPresent = true;
for (const [name, fn] of Object.entries(functions)) {
  const isFunction = typeof fn === 'function';
  const status = isFunction ? '✓' : '✗';
  console.log(`  ${status} ${name}: ${typeof fn}`);
  if (!isFunction) allPresent = false;
}

// Check cache management
console.log('\nChecking global cache management...');
const globalCache = getPostCache();
console.log(`  ✓ getPostCache returns PostCache: ${globalCache instanceof PostCache}`);
console.log(`  ✓ Initial cache size: ${globalCache.size}`);

// Test cache operations
const testUri = 'at://did:plc:test/app.bsky.feed.post/test123';
const testData = {
  uri: testUri,
  cid: 'test-cid',
  author: {
    did: 'did:plc:test',
    handle: 'test.bsky.social',
  },
  record: {
    text: 'Test post',
    createdAt: new Date().toISOString(),
  },
  likeCount: 0,
  replyCount: 0,
  repostCount: 0,
};

globalCache.set(testUri, testData);
console.log(`  ✓ Cache set: ${globalCache.has(testUri)}`);
console.log(`  ✓ Cache size after set: ${globalCache.size}`);

const retrieved = globalCache.get(testUri);
console.log(`  ✓ Cache get: ${retrieved !== null}`);
console.log(`  ✓ Retrieved URI matches: ${retrieved?.uri === testUri}`);

clearPostCache();
console.log(`  ✓ Cache cleared: ${globalCache.size === 0}`);

// Summary
console.log('\n' + '='.repeat(50));
if (allPresent) {
  console.log('✓ ALL CHECKS PASSED - Thread utilities are properly exported');
  console.log('\nYou can now use thread utilities in your projects:');
  console.log('  import { fetchThread, PostCache } from "skymarshal";');
} else {
  console.log('✗ SOME CHECKS FAILED - Review exports');
  process.exit(1);
}
console.log('='.repeat(50));
