# Bot Detection Test Examples

Quick reference for testing the enhanced bot detection logic.

## Test Cases

### Case 1: Classic Bot Account

```typescript
const classicBot = {
  followers: 5,
  following: 1000,
  posts: 0,
  bio: '',
  displayName: '',
  handle: 'user12345.bsky.social',
  createdAt: '2024-01-15T00:00:00Z'
};

// Expected signals:
// - massFollowing: 3 (1000 following, 5 followers = 0.5% ratio)
// - noPostsMassFollow: 3 (0 posts, 1000 following)
// - noProfileInfo: 2 (no display name, no bio)
// - defaultHandle: 2 (user12345 pattern)
// - noBio: 1
// - fewFollowers: 2 (< 10)
// - poorRatio: 2 (ratio 0.005 < 0.1)
// Total: 15
// Category: bot_likely
```

### Case 2: Crypto Scammer

```typescript
const cryptoScammer = {
  followers: 50,
  following: 2000,
  posts: 5,
  bio: 'Check out this crypto opportunity! bit.ly/xyz',
  displayName: 'John Crypto',
  createdAt: '2026-01-10T00:00:00Z' // 12 days old
};

// Expected signals:
// - massFollowing: 3 (2000 following, 50 followers = 2.5% ratio)
// - suspiciousUrls: 3 (bit.ly in bio)
// - newAccountMassFollow: 2 (12 days old, 2000 following)
// - poorRatio: 2 (ratio 0.025 < 0.1)
// Total: 10
// Category: bot_likely
```

### Case 3: Low Quality Account

```typescript
const lowQuality = {
  followers: 8,
  following: 200,
  posts: 2,
  displayName: 'User',
  createdAt: '2025-12-01T00:00:00Z'
};

// Expected signals:
// - fewFollowers: 2 (< 10)
// - poorRatio: 2 (ratio 0.04 < 0.1)
// - noBio: 1
// Total: 5
// Category: low_quality
```

### Case 4: Suspicious New Account

```typescript
const suspiciousNew = {
  followers: 100,
  following: 600,
  posts: 10,
  bio: 'New here!',
  displayName: 'NewUser',
  avatar: 'https://example.com/avatar.jpg',
  createdAt: '2026-01-15T00:00:00Z' // 7 days old
};

// Expected signals:
// - newAccountMassFollow: 2 (7 days old, 600 following)
// Total: 2
// Category: low_quality
```

### Case 5: Round Number Follower

```typescript
const roundNumberBot = {
  followers: 50,
  following: 1000, // Exactly 1000
  posts: 20,
  bio: 'Just a normal person',
  displayName: 'Normal User',
  createdAt: '2024-06-01T00:00:00Z'
};

// Expected signals:
// - massFollowing: 3 (1000 following, 50 followers = 5% ratio - threshold)
// - roundFollowingCount: 1 (exactly 1000)
// - poorRatio: 2 (ratio 0.05 < 0.1)
// Total: 6
// Category: bot_likely
```

### Case 6: Clean Legitimate Account

```typescript
const legitimateUser = {
  followers: 500,
  following: 200,
  posts: 150,
  bio: 'Software developer and musician',
  displayName: 'Jane Smith',
  avatar: 'https://example.com/avatar.jpg',
  handle: 'janesmith.bsky.social',
  createdAt: '2023-06-01T00:00:00Z'
};

// Expected signals: None
// Total: 0
// Category: clean
// isLegitimate: true (>100 followers, >10 posts, has bio, has avatar, ratio 2.5 > 0.5)
```

### Case 7: Borderline Suspicious

```typescript
const borderline = {
  followers: 150,
  following: 800,
  posts: 50,
  bio: 'Just tweeting thoughts',
  displayName: 'Thinker',
  avatar: 'https://example.com/avatar.jpg',
  createdAt: '2023-01-01T00:00:00Z'
};

// Expected signals: None
// Total: 0
// Category: clean
// Note: Ratio is 0.1875, which is > 0.1, so no poorRatio signal
```

### Case 8: Mass Follower Just Under Threshold

```typescript
const underThreshold = {
  followers: 51,
  following: 1000,
  posts: 10,
  bio: 'Hello world',
  displayName: 'User123',
  createdAt: '2024-01-01T00:00:00Z'
};

// Expected signals:
// - roundFollowingCount: 1 (exactly 1000)
// - poorRatio: 2 (ratio 0.051 < 0.1)
// Total: 3
// Category: suspicious
// Note: 51 followers is just above the 5% threshold (50), so no massFollowing signal
```

## Running Tests

### Using TypeScript

```typescript
import { analyzeBotSignals } from './utils/analytics';

// Test classic bot
const result = analyzeBotSignals(classicBot);
console.log(`Score: ${result.totalScore}`);
console.log(`Category: ${result.category}`);
console.log('Signals:', result.signals.map(s => `${s.name} (${s.score})`));
```

### Quick Verification

```typescript
import { isLikelyBotEnhanced } from './utils/analytics';

console.log(isLikelyBotEnhanced(classicBot));         // true (score 15 >= 4)
console.log(isLikelyBotEnhanced(cryptoScammer));      // true (score 10 >= 4)
console.log(isLikelyBotEnhanced(lowQuality));         // true (score 5 >= 4)
console.log(isLikelyBotEnhanced(suspiciousNew));      // false (score 2 < 4)
console.log(isLikelyBotEnhanced(legitimateUser));     // false (score 0 < 4)
```

### Custom Thresholds

```typescript
// More aggressive detection (catch low quality)
console.log(isLikelyBotEnhanced(lowQuality, 2));      // true (score 5 >= 2)
console.log(isLikelyBotEnhanced(suspiciousNew, 2));   // true (score 2 >= 2)

// Less aggressive (only high confidence)
console.log(isLikelyBotEnhanced(classicBot, 10));     // true (score 15 >= 10)
console.log(isLikelyBotEnhanced(cryptoScammer, 10));  // true (score 10 >= 10)
console.log(isLikelyBotEnhanced(lowQuality, 10));     // false (score 5 < 10)
```

## Batch Analysis

```typescript
import { batchAnalyzeBotSignals, calculateBotAnalysisSummary } from './utils/analytics';

const accounts = [
  classicBot,
  cryptoScammer,
  lowQuality,
  suspiciousNew,
  legitimateUser,
  borderline
];

const results = batchAnalyzeBotSignals(accounts);
const summary = calculateBotAnalysisSummary(results);

console.log(summary);
// {
//   totalAccounts: 6,
//   botLikely: 3,      // classicBot, cryptoScammer, lowQuality
//   lowQuality: 1,     // suspiciousNew
//   suspicious: 0,
//   clean: 2,          // legitimateUser, borderline
//   avgScore: 5.33,
//   commonSignals: {
//     massFollowing: 2,
//     noPostsMassFollow: 1,
//     noProfileInfo: 1,
//     defaultHandle: 1,
//     noBio: 2,
//     fewFollowers: 2,
//     poorRatio: 3,
//     suspiciousUrls: 1,
//     newAccountMassFollow: 1,
//     roundFollowingCount: 1
//   }
// }
```

## Edge Cases

### Exactly at Threshold

```typescript
const exactThreshold = {
  followers: 50,      // Exactly 5% of 1000
  following: 1000,
  posts: 10,
  bio: 'User',
  displayName: 'Test',
  createdAt: '2024-01-01T00:00:00Z'
};

// 50 < 1000 * 0.05 (50 < 50) = false
// No massFollowing signal!
```

### Zero Following (Edge Case)

```typescript
const zeroFollowing = {
  followers: 0,
  following: 0,
  posts: 0
};

// followerRatio = 0 / max(0, 1) = 0 / 1 = 0
// No signals except potentially noBio, noAvatar, fewFollowers
```

### Very High Legitimate Account

```typescript
const celebrity = {
  followers: 100000,
  following: 500,
  posts: 5000,
  bio: 'Public figure',
  displayName: 'Celebrity',
  avatar: 'https://example.com/avatar.jpg',
  createdAt: '2020-01-01T00:00:00Z'
};

// followerRatio = 200
// No signals, completely clean
// isLegitimate: true
```

## Debugging Tips

1. **Check followerRatio**: Log the ratio to understand threshold triggers
2. **Inspect signals array**: See which specific patterns were detected
3. **Account age**: Verify createdAt parsing for newAccountMassFollow
4. **Handle patterns**: Test defaultHandle regex with various formats
5. **URL detection**: Test hasSuspiciousUrls with different bio content

## Notes

- Threshold at exactly 5% does NOT trigger massFollowing (uses <, not <=)
- Multiple signals can compound (one account can trigger many)
- isLegitimate requires ALL criteria (followers AND posts AND bio AND avatar AND ratio)
- Account age calculation uses floor division (partial days rounded down)
