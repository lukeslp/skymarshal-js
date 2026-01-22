/**
 * Quick test for enhanced bot detection
 */
import {
  analyzeBotSignals,
  isLikelyBotEnhanced,
  batchAnalyzeBotSignals,
  calculateBotAnalysisSummary,
  hasDefaultHandle,
  hasSuspiciousUrls,
  hasRoundFollowingCount,
  getAccountAgeInDays,
} from './src/utils/analytics.js';

// Test utility functions
console.log('=== Testing Utility Functions ===');
console.log('hasDefaultHandle("user12345.bsky.social"):', hasDefaultHandle('user12345.bsky.social'));
console.log('hasDefaultHandle("lukesteuber.bsky.social"):', hasDefaultHandle('lukesteuber.bsky.social'));
console.log('hasSuspiciousUrls("Check my crypto airdrop!"):', hasSuspiciousUrls('Check my crypto airdrop!'));
console.log('hasSuspiciousUrls("I love hiking"):', hasSuspiciousUrls('I love hiking'));
console.log('hasRoundFollowingCount(1000):', hasRoundFollowingCount(1000));
console.log('hasRoundFollowingCount(1001):', hasRoundFollowingCount(1001));
console.log('getAccountAgeInDays("2024-01-01T00:00:00Z"):', getAccountAgeInDays('2024-01-01T00:00:00Z'));

// Test bot account
console.log('\n=== Testing Bot Account ===');
const botAccount = {
  followers: 5,
  following: 1000,
  posts: 0,
  bio: 'Join my crypto airdrop! bit.ly/scam',
  displayName: '',
  handle: 'user12345.bsky.social',
  createdAt: '2024-01-15T00:00:00Z',
};

const botResult = analyzeBotSignals(botAccount);
console.log('Bot Account Analysis:');
console.log('  Total Score:', botResult.totalScore);
console.log('  Category:', botResult.category);
console.log('  Signals Detected:', botResult.signals.length);
botResult.signals.forEach(s => {
  console.log(`    - ${s.name} (score: ${s.score}): ${s.description}`);
});

// Test legitimate account
console.log('\n=== Testing Legitimate Account ===');
const legitAccount = {
  followers: 500,
  following: 300,
  posts: 150,
  bio: 'Software engineer interested in AI and design',
  displayName: 'John Doe',
  avatar: 'https://example.com/avatar.jpg',
  handle: 'johndoe.bsky.social',
  createdAt: '2023-05-01T00:00:00Z',
};

const legitResult = analyzeBotSignals(legitAccount);
console.log('Legitimate Account Analysis:');
console.log('  Total Score:', legitResult.totalScore);
console.log('  Category:', legitResult.category);
console.log('  Is Legitimate:', legitResult.isLegitimate);
console.log('  Signals Detected:', legitResult.signals.length);
if (legitResult.signals.length > 0) {
  legitResult.signals.forEach(s => {
    console.log(`    - ${s.name} (score: ${s.score}): ${s.description}`);
  });
}

// Test batch analysis
console.log('\n=== Testing Batch Analysis ===');
const accounts = [botAccount, legitAccount];
const batchResults = batchAnalyzeBotSignals(accounts);
const summary = calculateBotAnalysisSummary(batchResults);

console.log('Summary:');
console.log('  Total Accounts:', summary.totalAccounts);
console.log('  Bot Likely:', summary.botLikely);
console.log('  Low Quality:', summary.lowQuality);
console.log('  Suspicious:', summary.suspicious);
console.log('  Clean:', summary.clean);
console.log('  Avg Score:', summary.avgScore.toFixed(2));
console.log('  Common Signals:', Object.entries(summary.commonSignals).map(([k, v]) => `${k}(${v})`).join(', '));

console.log('\n=== All Tests Completed ===');
