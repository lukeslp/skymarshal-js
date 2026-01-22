# Analytics Utilities

Analytics modules for Bluesky profile and engagement analysis.

## Modules

### followerRanking.ts

**Influence scoring and ranking for Bluesky profiles.**

Calculates composite influence scores based on follower counts, ratios, and engagement patterns. Provides tier-based classifications (mega/macro/micro/nano) and ranking capabilities.

#### Key Interfaces

```typescript
interface InfluenceMetrics {
  followersCount: number;
  followsCount: number;
  postsCount: number;
  ratio: number;                // Follower-to-following ratio
  engagementRate: number;       // Posts per follower × 100
  influenceScore: number;       // Composite score (0-100 scale)
  tier: InfluenceTier;          // 'mega' | 'macro' | 'micro' | 'nano'
}

interface RankableProfile {
  did: string;
  handle: string;
  displayName?: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
}

interface RankedProfile extends RankableProfile {
  metrics: InfluenceMetrics;
  rank?: number;  // 1-based ranking
}
```

#### Influence Tiers

| Tier | Follower Range | Description |
|------|----------------|-------------|
| **mega** | 100,000+ | Major influencers with massive reach |
| **macro** | 10,000-99,999 | Established voices with significant following |
| **micro** | 1,000-9,999 | Engaged communities and niche experts |
| **nano** | 0-999 | Emerging voices and new accounts |

#### Influence Score Formula

```
score = log10(followers + 1) × ratio_factor × engagement_factor × 20
```

Where:
- `ratio_factor = min(1, ratio / 0.5)` - Rewards follower-to-following ratio ≥0.5
- `engagement_factor = min(1, engagement_rate / 50)` - Rewards ~50 posts per follower
- Logarithmic follower scaling prevents mega-influencers from dominating
- Normalized to ~0-100 scale for interpretability

#### Core Functions

##### Calculate Metrics

```typescript
import { calculateInfluenceMetrics } from 'skymarshal-core/utils';

const metrics = calculateInfluenceMetrics({
  did: 'did:plc:xyz',
  handle: 'user.bsky.social',
  followersCount: 5000,
  followsCount: 2000,
  postsCount: 1000,
});

// {
//   followersCount: 5000,
//   ratio: 2.5,
//   engagementRate: 20,
//   influenceScore: 45.6,
//   tier: 'micro'
// }
```

##### Rank Profiles

```typescript
import { rankByInfluence } from 'skymarshal-core/utils';

const ranked = rankByInfluence(profiles);

ranked.forEach(profile => {
  console.log(`#${profile.rank}: ${profile.handle} (${profile.metrics.influenceScore})`);
});
```

##### Group by Tier

```typescript
import { groupByTier } from 'skymarshal-core/utils';

const grouped = groupByTier(profiles);

console.log(`Mega influencers: ${grouped.mega.length}`);
console.log(`Macro influencers: ${grouped.macro.length}`);
```

##### Get Top Influencers

```typescript
import { getTopInfluencers } from 'skymarshal-core/utils';

const top10 = getTopInfluencers(profiles, 10);
```

##### Filter Profiles

```typescript
import { filterByTier, filterByMinScore } from 'skymarshal-core/utils';

// Get only major influencers
const major = filterByTier(profiles, ['mega', 'macro']);

// Get high-influence profiles
const highInfluence = filterByMinScore(profiles, 50);
```

##### Get Statistics

```typescript
import { getInfluenceStats } from 'skymarshal-core/utils';

const stats = getInfluenceStats(profiles);

console.log(`Average score: ${stats.averageScore}`);
console.log(`Median score: ${stats.medianScore}`);
console.log(`Tier distribution:`, stats.tierCounts);
```

##### Compare Profiles

```typescript
import { compareInfluence } from 'skymarshal-core/utils';

const comparison = compareInfluence(profileA, profileB);

if (comparison.winner === 'a') {
  console.log(`Profile A wins by ${comparison.scoreDiff} points`);
}
```

#### Usage Example

```typescript
import { AtpAgent } from '@atproto/api';
import { rankByInfluence, getTopInfluencers } from 'skymarshal-core/utils';

const agent = new AtpAgent({ service: 'https://bsky.social' });

// Fetch followers
const { data } = await agent.getFollowers({ actor: 'user.bsky.social', limit: 100 });

// Rank by influence
const ranked = rankByInfluence(data.followers);

// Get top 10
const top10 = getTopInfluencers(data.followers, 10);

console.log('Top 10 Influential Followers:');
top10.forEach((follower, i) => {
  console.log(`${i + 1}. @${follower.handle} - Score: ${follower.metrics.influenceScore}`);
});
```

#### Reference Implementation

Based on the follower ranking logic from the bluevibes Flask application:
- `/home/coolhand/projects/bluevibes/src/app.py` (top_followers route)
- Uses logarithmic scaling for follower counts
- Combines ratio and engagement factors for composite score
- Efficient sorting and filtering for large datasets

#### See Also

- [Example Code](../../../examples/followerRanking.ts) - Complete examples
- [Utils Index](../index.ts) - Full utilities reference
- [Analytics Module](../analytics.ts) - Post engagement analytics
