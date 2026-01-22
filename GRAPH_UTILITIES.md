# Graph Analysis Utilities

Pure TypeScript implementation of social network graph analysis algorithms, ported from Python NetworkX-based implementation. No external dependencies.

## Features

### Centrality Measures
- **Degree Centrality** - Normalized degree per node
- **Betweenness Centrality** - Nodes on shortest paths (simplified algorithm)
- **PageRank** - Link analysis ranking algorithm

### Community Detection
- **Label Propagation** - Simple, deterministic community detection
- **Modularity** - Quality measure for network partitioning

### Network Metrics
- **Density** - Ratio of actual to possible edges
- **Clustering Coefficient** - How connected neighbors are
- **Orbit Metrics** - Tier classification (strong/medium/weak connections)

### Edge Weighting
- Shared neighbors and degree similarity
- Formula: `weight = 1 + shared_neighbors + degree_ratio`

## Installation

```bash
npm install skymarshal
```

## Usage

### Import

```typescript
import {
  // Types
  GraphNode,
  GraphEdge,
  Community,
  GraphMetrics,
  OrbitTier,
  OrbitDistribution,

  // Centrality
  degreeCentrality,
  betweennessCentrality,
  calculatePageRank,

  // Community Detection
  detectCommunities,
  calculateModularity,

  // Network Metrics
  networkDensity,
  averageClustering,
  computeGraphMetrics,

  // Orbit Analysis
  orbitTier,
  orbitStrengthDistribution,

  // Edge Weighting
  weightEdges,
} from 'skymarshal/graph';
```

### Basic Example

```typescript
// Define nodes (users in social network)
const nodes: GraphNode[] = [
  { id: 'user1', handle: 'alice', followers: 100, following: 50 },
  { id: 'user2', handle: 'bob', followers: 200, following: 75 },
  { id: 'user3', handle: 'charlie', followers: 150, following: 60 },
  { id: 'user4', handle: 'diana', followers: 300, following: 100 },
];

// Define edges (connections between users)
const edges: GraphEdge[] = [
  { source: 'user1', target: 'user2' },
  { source: 'user1', target: 'user3' },
  { source: 'user2', target: 'user3' },
  { source: 'user2', target: 'user4' },
  { source: 'user3', target: 'user4' },
];

// Calculate degree centrality
const degrees = degreeCentrality(nodes, edges);
console.log('Degree centrality:', degrees);
// Map { 'user1' => 0.667, 'user2' => 1.0, 'user3' => 1.0, 'user4' => 0.667 }

// Calculate PageRank
const pagerank = calculatePageRank(nodes, edges);
console.log('PageRank:', pagerank);

// Detect communities
const communities = detectCommunities(nodes, edges);
console.log('Communities:', communities);
// [{ id: 'cluster-0', nodes: ['user1', 'user2', 'user3', 'user4'], size: 4 }]

// Calculate modularity
const modularity = calculateModularity(nodes, edges, communities);
console.log('Modularity:', modularity);

// Weight edges based on shared neighbors
const weightedEdges = weightEdges(edges, nodes);
console.log('Weighted edges:', weightedEdges);
```

### Complete Network Analysis

```typescript
// Compute all graph metrics at once
const metrics = computeGraphMetrics(nodes, edges);

console.log('Network density:', metrics.density);
console.log('Average clustering:', metrics.averageClustering);
console.log('Modularity:', metrics.modularity);
console.log('Cluster count:', metrics.clusterCount);
console.log('Top by degree:', metrics.topDegree);
console.log('Top by PageRank:', metrics.topPageRank);
```

### Orbit Analysis

```typescript
// Classify nodes by connection strength
const nodesWithTiers = nodes.map(node => {
  const connections = edges.filter(
    e => e.source === node.id || e.target === node.id
  ).length;

  return {
    ...node,
    tier: orbitTier(connections),
  };
});

// Calculate distribution
const distribution = orbitStrengthDistribution(nodesWithTiers);
console.log('Orbit distribution:', distribution);
// { strong: 0.25, medium: 0.5, weak: 0.25 }
```

### Betweenness Centrality

```typescript
// Find nodes that connect different parts of the network
const betweenness = betweennessCentrality(nodes, edges);

const bridgeNodes = Array.from(betweenness.entries())
  .filter(([_, score]) => score > 0.5)
  .map(([id, score]) => ({ id, score }));

console.log('Bridge nodes:', bridgeNodes);
```

## API Reference

### Types

#### GraphNode
```typescript
interface GraphNode {
  id: string;                    // User identifier
  handle?: string;               // Display handle
  followers?: number;            // Follower count
  following?: number;            // Following count
  degreeCentrality?: number;     // Computed metric
  betweennessCentrality?: number;
  pagerank?: number;
  clusterId?: string;
  tier?: number;
  x?: number;
  y?: number;
}
```

#### GraphEdge
```typescript
interface GraphEdge {
  source: string;  // Source node ID
  target: string;  // Target node ID
  weight?: number; // Edge weight (computed or provided)
  type?: string;   // Edge type (follow, mutual, etc.)
}
```

#### Community
```typescript
interface Community {
  id: string;       // Cluster identifier
  nodes: string[];  // Node IDs in this cluster
  color?: string;   // Display color
  size: number;     // Cluster size
}
```

#### GraphMetrics
```typescript
interface GraphMetrics {
  density: number;              // Network density (0-1)
  averageClustering: number;    // Average clustering coefficient
  modularity: number | null;    // Modularity score
  clusterCount: number;         // Number of clusters
  topDegree: Array<{ node: string; value: number }>;
  topPageRank: Array<{ node: string; value: number }>;
}
```

### Functions

#### degreeCentrality(nodes, edges)
Calculate normalized degree centrality for all nodes.

**Returns:** `Map<string, number>` - Node ID to centrality (0-1)

#### betweennessCentrality(nodes, edges)
Calculate betweenness centrality (simplified BFS-based algorithm).

**Returns:** `Map<string, number>` - Node ID to centrality score

#### calculatePageRank(nodes, edges, damping?, iterations?)
Calculate PageRank scores using power iteration.

**Parameters:**
- `damping` - Damping factor (default: 0.85)
- `iterations` - Number of iterations (default: 20)

**Returns:** `Map<string, number>` - Node ID to PageRank score

#### detectCommunities(nodes, edges, maxIterations?)
Detect communities using label propagation algorithm.

**Parameters:**
- `maxIterations` - Maximum iterations (default: 30)

**Returns:** `Community[]` - Detected communities

#### calculateModularity(nodes, edges, communities)
Calculate modularity for a given community structure.

**Returns:** `number` - Modularity score (-1 to 1, higher is better)

#### networkDensity(nodeCount, edgeCount)
Calculate network density.

**Returns:** `number` - Density (0-1)

#### averageClustering(nodes, edges)
Calculate average clustering coefficient.

**Returns:** `number` - Average clustering (0-1)

#### orbitTier(connections)
Determine orbit tier based on connection count.

**Returns:** `0 | 1 | 2`
- Tier 0 (strong): >20 connections
- Tier 1 (medium): 5-20 connections
- Tier 2 (weak): <5 connections

#### orbitStrengthDistribution(nodes)
Calculate orbit strength distribution.

**Returns:** `{ strong: number; medium: number; weak: number }`

#### weightEdges(edges, nodes)
Weight edges based on shared neighbors and degree similarity.

**Returns:** `GraphEdge[]` - Edges with updated weights

#### computeGraphMetrics(nodes, edges)
Compute comprehensive graph metrics.

**Returns:** `GraphMetrics` - Complete set of graph metrics

## Algorithm Details

### Betweenness Centrality
Simplified BFS-based algorithm that measures how often a node appears on shortest paths between other nodes. Complexity: O(VE) where V = nodes, E = edges.

### PageRank
Power iteration algorithm with damping factor. Runs for fixed number of iterations (default: 20). Complexity: O(k·E) where k = iterations.

### Label Propagation
Deterministic community detection. Each node adopts the most common label among neighbors. Converges when no labels change. Complexity: O(k·E) where k = iterations until convergence.

### Modularity
Measures quality of network partition. Score of 0.3+ indicates strong community structure. Range: -1 to 1.

## Performance

- **Pure TypeScript** - No external dependencies
- **Efficient algorithms** - Optimized for social networks (1k-10k nodes)
- **Memory conscious** - Uses adjacency lists, not matrices
- **Deterministic** - Same input always produces same output

## Use Cases

- **Social Network Analysis** - Identify influential users and communities
- **Bot Detection** - Unusual centrality patterns may indicate bots
- **Recommendation Systems** - Community-based recommendations
- **Network Visualization** - Position nodes by importance/community
- **Content Discovery** - Find related users through graph structure

## Limitations

- Simplified algorithms for performance (not research-grade precision)
- Best for undirected graphs (treats all edges as bidirectional)
- Not optimized for very large graphs (>100k nodes)
- No support for weighted input edges (weights are computed)

## Credits

Ported from Python NetworkX-based implementation in blueballs project.

Author: Luke Steuber <luke@lukesteuber.com>

## License

MIT
