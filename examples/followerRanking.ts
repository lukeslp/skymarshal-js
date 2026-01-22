/**
 * Follower Ranking Example
 *
 * Demonstrates how to use the follower ranking analytics module
 * to analyze and rank Bluesky profiles by influence.
 *
 * @example
 * ```bash
 * ts-node examples/followerRanking.ts
 * ```
 */

import {
  type RankableProfile,
  type InfluenceTier,
  calculateInfluenceMetrics,
  rankByInfluence,
  groupByTier,
  getTopInfluencers,
  getInfluenceStats,
  compareInfluence,
  filterByTier,
  filterByMinScore,
} from '../src/utils/analytics/followerRanking.js';

// Example profiles with varying influence levels
const exampleProfiles: RankableProfile[] = [
  {
    did: 'did:plc:mega1',
    handle: 'megainfluencer.bsky.social',
    displayName: 'Mega Influencer',
    followersCount: 250000,
    followsCount: 500,
    postsCount: 15000,
    description: 'Major voice in the community',
  },
  {
    did: 'did:plc:macro1',
    handle: 'macrovoice.bsky.social',
    displayName: 'Macro Voice',
    followersCount: 45000,
    followsCount: 8000,
    postsCount: 5000,
    description: 'Established content creator',
  },
  {
    did: 'did:plc:micro1',
    handle: 'microinfluencer.bsky.social',
    displayName: 'Micro Influencer',
    followersCount: 3500,
    followsCount: 1200,
    postsCount: 1800,
    description: 'Growing community presence',
  },
  {
    did: 'did:plc:nano1',
    handle: 'emergingvoice.bsky.social',
    displayName: 'Emerging Voice',
    followersCount: 750,
    followsCount: 500,
    postsCount: 200,
    description: 'New to the platform',
  },
  {
    did: 'did:plc:macro2',
    handle: 'establishedcreator.bsky.social',
    displayName: 'Established Creator',
    followersCount: 18000,
    followsCount: 3000,
    postsCount: 4200,
    description: 'Consistent quality content',
  },
  {
    did: 'did:plc:micro2',
    handle: 'nichevoice.bsky.social',
    displayName: 'Niche Voice',
    followersCount: 2200,
    followsCount: 800,
    postsCount: 900,
    description: 'Specialized content focus',
  },
];

/**
 * Example 1: Calculate metrics for a single profile
 */
function example1() {
  console.log('=== Example 1: Individual Profile Metrics ===\n');

  const profile = exampleProfiles[0];
  const metrics = calculateInfluenceMetrics(profile);

  console.log(`Profile: ${profile.displayName} (@${profile.handle})`);
  console.log(`Followers: ${metrics.followersCount.toLocaleString()}`);
  console.log(`Following: ${metrics.followsCount.toLocaleString()}`);
  console.log(`Posts: ${metrics.postsCount.toLocaleString()}`);
  console.log(`Ratio: ${metrics.ratio.toFixed(2)}`);
  console.log(`Engagement Rate: ${metrics.engagementRate.toFixed(2)}`);
  console.log(`Influence Score: ${metrics.influenceScore.toFixed(2)}`);
  console.log(`Tier: ${metrics.tier}`);
  console.log();
}

/**
 * Example 2: Rank all profiles by influence
 */
function example2() {
  console.log('=== Example 2: Ranked Profiles ===\n');

  const ranked = rankByInfluence(exampleProfiles);

  ranked.forEach((profile) => {
    console.log(
      `#${profile.rank} ${profile.displayName} (@${profile.handle})` +
        ` - Score: ${profile.metrics.influenceScore.toFixed(2)} (${profile.metrics.tier})`
    );
  });
  console.log();
}

/**
 * Example 3: Group profiles by tier
 */
function example3() {
  console.log('=== Example 3: Grouped by Tier ===\n');

  const grouped = groupByTier(exampleProfiles);

  const tiers: InfluenceTier[] = ['mega', 'macro', 'micro', 'nano'];

  tiers.forEach((tier) => {
    console.log(`${tier.toUpperCase()} (${grouped[tier].length} profiles):`);
    grouped[tier].forEach((profile) => {
      console.log(`  - ${profile.displayName} (score: ${profile.metrics.influenceScore.toFixed(2)})`);
    });
    console.log();
  });
}

/**
 * Example 4: Get top influencers
 */
function example4() {
  console.log('=== Example 4: Top 3 Influencers ===\n');

  const top3 = getTopInfluencers(exampleProfiles, 3);

  top3.forEach((profile, index) => {
    console.log(
      `${index + 1}. ${profile.displayName} - ` +
        `${profile.followersCount.toLocaleString()} followers, ` +
        `score: ${profile.metrics.influenceScore.toFixed(2)}`
    );
  });
  console.log();
}

/**
 * Example 5: Get influence statistics
 */
function example5() {
  console.log('=== Example 5: Influence Statistics ===\n');

  const stats = getInfluenceStats(exampleProfiles);

  console.log(`Total Profiles: ${stats.totalProfiles}`);
  console.log(`Average Score: ${stats.averageScore.toFixed(2)}`);
  console.log(`Median Score: ${stats.medianScore.toFixed(2)}`);
  console.log(`Min Score: ${stats.minScore.toFixed(2)}`);
  console.log(`Max Score: ${stats.maxScore.toFixed(2)}`);
  console.log(`Average Followers: ${stats.averageFollowers.toLocaleString()}`);
  console.log(`Average Ratio: ${stats.averageRatio.toFixed(2)}`);
  console.log('\nTier Distribution:');
  console.log(`  Mega: ${stats.tierCounts.mega}`);
  console.log(`  Macro: ${stats.tierCounts.macro}`);
  console.log(`  Micro: ${stats.tierCounts.micro}`);
  console.log(`  Nano: ${stats.tierCounts.nano}`);
  console.log();
}

/**
 * Example 6: Compare two profiles
 */
function example6() {
  console.log('=== Example 6: Profile Comparison ===\n');

  const profileA = exampleProfiles[1]; // Macro influencer
  const profileB = exampleProfiles[2]; // Micro influencer

  const comparison = compareInfluence(profileA, profileB);

  console.log(`Profile A: ${profileA.displayName}`);
  console.log(`  Score: ${comparison.metricsA.influenceScore.toFixed(2)} (${comparison.metricsA.tier})`);
  console.log();
  console.log(`Profile B: ${profileB.displayName}`);
  console.log(`  Score: ${comparison.metricsB.influenceScore.toFixed(2)} (${comparison.metricsB.tier})`);
  console.log();

  if (comparison.winner === 'tie') {
    console.log('Result: Tied influence scores');
  } else {
    const winnerProfile = comparison.winner === 'a' ? profileA : profileB;
    console.log(
      `Winner: ${winnerProfile.displayName} (by ${comparison.scoreDiff.toFixed(2)} points)`
    );
  }
  console.log();
}

/**
 * Example 7: Filter by tier
 */
function example7() {
  console.log('=== Example 7: Filter Major Influencers (Macro + Mega) ===\n');

  const majorInfluencers = filterByTier(exampleProfiles, ['macro', 'mega']);

  majorInfluencers.forEach((profile) => {
    console.log(
      `${profile.displayName} - ` +
        `${profile.followersCount.toLocaleString()} followers, ` +
        `tier: ${profile.metrics.tier}`
    );
  });
  console.log();
}

/**
 * Example 8: Filter by minimum score
 */
function example8() {
  console.log('=== Example 8: High Influence Profiles (score ≥ 40) ===\n');

  const highInfluence = filterByMinScore(exampleProfiles, 40);

  highInfluence.forEach((profile) => {
    console.log(
      `${profile.displayName} - ` +
        `score: ${profile.metrics.influenceScore.toFixed(2)}`
    );
  });
  console.log();
}

/**
 * Run all examples
 */
function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          Follower Ranking Analytics Examples              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  example1();
  example2();
  example3();
  example4();
  example5();
  example6();
  example7();
  example8();

  console.log('✓ All examples completed successfully!');
}

// Run examples if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
