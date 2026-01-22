# Follower Ranking Module

**Location:** `src/utils/analytics/followerRanking.ts`

Comprehensive influence scoring and ranking system for Bluesky profiles based on follower metrics, engagement patterns, and composite scoring algorithms.

## Overview

This module provides TypeScript implementations of follower analysis algorithms originally developed in the bluevibes Flask application. It calculates composite influence scores that balance follower count, follower-to-following ratio, and posting activity to provide nuanced influence rankings.

## Key Features

✅ **Influence Scoring** - Logarithmic scaling with ratio and engagement factors
✅ **Tier Classification** - Mega/macro/micro/nano categorization (100k/10k/1k thresholds)
✅ **Profile Ranking** - Sort profiles by composite influence score
✅ **Tier Grouping** - Organize profiles into influence tiers
✅ **Top N Selection** - Efficient extraction of top influencers
✅ **Filtering** - By tier, minimum score, or custom criteria
✅ **Statistics** - Distribution analysis and summary metrics
✅ **Comparison** - Head-to-head profile influence comparison
✅ **Full TypeScript** - Complete type safety with JSDoc documentation

## Installation

Already included in `skymarshal-core` package:

```typescript
import {
  calculateInfluenceMetrics,
  rankByInfluence,
  getTopInfluencers,
  groupByTier,
  getInfluenceStats,
  compareInfluence,
  filterByTier,
  filterByMinScore,
} from 'skymarshal-core/utils';
```

## Influence Score Formula

```
score = log10(followers + 1) × ratio_factor × engagement_factor × 20
```

**Components:**
- **Base Score**: `log10(followers + 1)` - Logarithmic scaling prevents mega-influencers from dominating
- **Ratio Factor**: `min(1, ratio / 0.5)` - Rewards follower-to-following ratio ≥ 0.5
- **Engagement Factor**: `min(1, engagement_rate / 50)` - Rewards ~50 posts per follower
- **Scale**: Multiplied by 20 to normalize to ~0-100 range

**Example Scores:**
- 10,000 followers, 2:1 ratio, 2000 posts → Score: ~40-50
- 100,000 followers, 1:1 ratio, 5000 posts → Score: ~50-60
- 1,000,000 followers, 0.5:1 ratio, 50000 posts → Score: ~60-70

## Influence Tiers

| Tier | Followers | Description |
|------|-----------|-------------|
| **mega** | 100,000+ | Major influencers with massive reach |
| **macro** | 10,000-99,999 | Established voices with significant following |
| **micro** | 1,000-9,999 | Engaged communities and niche experts |
| **nano** | 0-999 | Emerging voices and new accounts |

## Quick Start

### Calculate Metrics for a Single Profile

```typescript
import { calculateInfluenceMetrics } from 'skymarshal-core/utils';

const metrics = calculateInfluenceMetrics({
  did: 'did:plc:xyz',
  handle: 'user.bsky.social',
  followersCount: 5000,
  followsCount: 2000,
  postsCount: 1000,
});

console.log(metrics);
// {
//   followersCount: 5000,
//   followsCount: 2000,
//   postsCount: 1000,
//   ratio: 2.5,
//   engagementRate: 20,
//   influenceScore: 45.6,
//   tier: 'micro'
// }
```

### Rank Profiles by Influence

```typescript
import { rankByInfluence } from 'skymarshal-core/utils';

const ranked = rankByInfluence(profiles);

ranked.forEach(profile => {
  console.log(
    `#${profile.rank}: @${profile.handle} ` +
    `(score: ${profile.metrics.influenceScore}, tier: ${profile.metrics.tier})`
  );
});
```

### Get Top Influencers

```typescript
import { getTopInfluencers } from 'skymarshal-core/utils';

const top10 = getTopInfluencers(profiles, 10);
```

### Group by Tier

```typescript
import { groupByTier } from 'skymarshal-core/utils';

const grouped = groupByTier(profiles);

console.log(`Mega: ${grouped.mega.length}`);
console.log(`Macro: ${grouped.macro.length}`);
console.log(`Micro: ${grouped.micro.length}`);
console.log(`Nano: ${grouped.nano.length}`);
```

## API Reference

### Types

#### `InfluenceTier`
```typescript
type InfluenceTier = 'mega' | 'macro' | 'micro' | 'nano';
```

#### `RankableProfile`
```typescript
interface RankableProfile {
  did: string;
  handle: string;
  displayName?: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  description?: string;
}
```

#### `InfluenceMetrics`
```typescript
interface InfluenceMetrics {
  followersCount: number;
  followsCount: number;
  postsCount: number;
  ratio: number;
  engagementRate: number;
  influenceScore: number;
  tier: InfluenceTier;
}
```

#### `RankedProfile`
```typescript
interface RankedProfile extends RankableProfile {
  metrics: InfluenceMetrics;
  rank?: number;  // 1-based
}
```

### Functions

#### `calculateRatio(followersCount, followsCount)`
Calculate follower-to-following ratio.

#### `getInfluenceTier(followersCount)`
Determine tier based on follower count.

#### `calculateInfluenceScore(profile)`
Calculate composite influence score.

#### `calculateInfluenceMetrics(profile)`
Calculate all metrics for a profile.

#### `rankByInfluence(profiles)`
Rank profiles by influence score (descending).

#### `groupByTier(profiles)`
Group profiles into tier buckets.

#### `getTopInfluencers(profiles, n)`
Get top N influencers.

#### `filterByMinScore(profiles, minScore)`
Filter profiles by minimum score.

#### `filterByTier(profiles, tiers)`
Filter profiles by tier(s).

#### `getInfluenceStats(profiles)`
Get distribution statistics.

#### `compareInfluence(profileA, profileB)`
Compare two profiles' influence.

## Examples

See `examples/followerRanking.ts` for comprehensive examples including:
1. Individual profile metrics
2. Full profile ranking
3. Tier-based grouping
4. Top influencer selection
5. Statistical analysis
6. Profile comparison
7. Tier filtering
8. Score-based filtering

Run examples:
```bash
ts-node examples/followerRanking.ts
```

## Integration with Bluesky API

```typescript
import { AtpAgent } from '@atproto/api';
import { rankByInfluence } from 'skymarshal-core/utils';

const agent = new AtpAgent({ service: 'https://bsky.social' });

// Fetch followers
const { data } = await agent.getFollowers({
  actor: 'user.bsky.social',
  limit: 100
});

// Rank by influence
const ranked = rankByInfluence(data.followers);

// Display top 10
const top10 = ranked.slice(0, 10);
top10.forEach((follower, i) => {
  console.log(
    `${i + 1}. @${follower.handle} - ` +
    `Score: ${follower.metrics.influenceScore.toFixed(2)} ` +
    `(${follower.metrics.tier})`
  );
});
```

## Reference Implementation

Based on the follower ranking algorithm from:
- **Source:** `/home/coolhand/projects/bluevibes/src/app.py`
- **Route:** `top_followers`
- **Method:** Background analysis with progress tracking

Key adaptations:
- Ported from Python to TypeScript
- Enhanced with full type safety
- Added comprehensive filtering and analysis functions
- Optimized for batch processing
- Extended with comparison and statistics utilities

## Performance Considerations

- **Logarithmic Scaling**: Prevents dominance by mega-influencers
- **Single Pass Metrics**: All metrics calculated together
- **Efficient Sorting**: Native array sort with custom comparator
- **Lazy Evaluation**: Functions return sorted results without caching
- **Batch Processing**: Designed for large follower lists (1000+ profiles)

## Use Cases

1. **Follower Analysis** - Identify your most influential followers
2. **Community Management** - Segment followers by influence tier
3. **Outreach Prioritization** - Focus on high-influence accounts
4. **Network Analysis** - Understand influence distribution
5. **Growth Strategy** - Track influence changes over time
6. **Bot Detection** - Low engagement/ratio profiles often indicate bots
7. **Partnership Selection** - Find macro/mega influencers for collaboration

## Future Enhancements

- [ ] Temporal analysis (influence changes over time)
- [ ] Network effects (mutual connections)
- [ ] Content quality signals (beyond post count)
- [ ] Domain-specific influence (niche expertise)
- [ ] Engagement velocity (trending vs. established)

## Documentation

- **Module:** `src/utils/analytics/followerRanking.ts`
- **README:** `src/utils/analytics/README.md`
- **Examples:** `examples/followerRanking.ts`
- **Exports:** `src/utils/index.ts`

## Credits

Algorithm designed and implemented by Luke Steuber.
Reference implementation: bluevibes Flask application.
TypeScript port: skymarshal-core package.
