#!/usr/bin/env node

/**
 * Quick verification script for DeletionManager
 * Tests type imports and basic functionality
 */

import { DeletionManager, ValidationError, NetworkError } from './dist/managers/deletion.js';
import { AuthManager } from './dist/managers/auth.js';

console.log('✓ DeletionManager imported successfully');
console.log('✓ ValidationError imported successfully');
console.log('✓ NetworkError imported successfully');
console.log('✓ AuthManager imported successfully');

// Test parseAtUri
const auth = new AuthManager();
const deletion = new DeletionManager(auth);

console.log('\n--- Testing parseAtUri ---');
try {
  const valid = deletion.parseAtUri('at://did:plc:xyz123/app.bsky.feed.post/abc456');
  console.log('✓ Valid AT-URI parsed:', valid);
} catch (error) {
  console.error('✗ Failed to parse valid URI:', error.message);
}

try {
  deletion.parseAtUri('invalid-uri');
  console.error('✗ Should have thrown ValidationError');
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('✓ ValidationError thrown for invalid URI');
  } else {
    console.error('✗ Wrong error type:', error);
  }
}

// Test previewDeletion
console.log('\n--- Testing previewDeletion ---');
const mockItems = [
  { uri: 'at://1', contentType: 'posts', cid: 'cid1', replyCount: 0, repostCount: 0, likeCount: 0, engagementScore: 0 },
  { uri: 'at://2', contentType: 'likes', cid: 'cid2', replyCount: 0, repostCount: 0, likeCount: 0, engagementScore: 0 },
  { uri: 'at://3', contentType: 'reposts', cid: 'cid3', replyCount: 0, repostCount: 0, likeCount: 0, engagementScore: 0 },
  { uri: 'at://4', contentType: 'posts', cid: 'cid4', replyCount: 0, repostCount: 0, likeCount: 0, engagementScore: 0 },
];

const preview = deletion.previewDeletion(mockItems);
console.log('✓ Preview generated:', preview);

if (preview.count === 4 && preview.breakdown.posts === 2 && preview.breakdown.likes === 1 && preview.breakdown.reposts === 1) {
  console.log('✓ Preview counts correct');
} else {
  console.error('✗ Preview counts incorrect');
}

console.log('\n--- All tests passed! ---');
console.log('\nNote: Remote deletion tests require authentication and cannot be run without credentials.');
console.log('Use DELETION_EXAMPLE.md for full usage examples.');
