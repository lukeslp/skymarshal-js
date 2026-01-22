/**
 * Graph analysis utilities for social network visualization
 * Ported from Python NetworkX-based implementation
 * Pure TypeScript with no external dependencies
 *
 * @module skymarshal-core/utils/graph
 */

/**
 * Graph node representing a user in the network
 */
export interface GraphNode {
  /** User identifier (DID or handle) */
  id: string;
  /** Display handle */
  handle?: string;
  /** Follower count */
  followers?: number;
  /** Following count */
  following?: number;
  /** Computed metrics (added by analysis) */
  degreeCentrality?: number;
  betweennessCentrality?: number;
  pagerank?: number;
  clusterId?: string;
  tier?: number;
  x?: number;
  y?: number;
}

/**
 * Graph edge representing a connection between users
 */
export interface GraphEdge {
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Edge weight (computed or provided) */
  weight?: number;
  /** Edge type (follow, mutual, etc.) */
  type?: string;
}

/**
 * Community/cluster information
 */
export interface Community {
  /** Cluster identifier */
  id: string;
  /** Node IDs in this cluster */
  nodes: string[];
  /** Display color */
  color?: string;
  /** Cluster size */
  size: number;
}

/**
 * Overall graph metrics
 */
export interface GraphMetrics {
  /** Network density (0-1) */
  density: number;
  /** Average clustering coefficient */
  averageClustering: number;
  /** Modularity score for detected communities */
  modularity: number | null;
  /** Number of detected clusters */
  clusterCount: number;
  /** Top nodes by degree centrality */
  topDegree: Array<{ node: string; value: number }>;
  /** Top nodes by PageRank */
  topPageRank: Array<{ node: string; value: number }>;
}

/**
 * Orbit tier classification
 */
export type OrbitTier = 0 | 1 | 2;

/**
 * Orbit strength distribution
 */
export interface OrbitDistribution {
  strong: number;  // Tier 0 percentage
  medium: number;  // Tier 1 percentage
  weak: number;    // Tier 2 percentage
}

/**
 * Internal adjacency list representation
 */
type AdjacencyList = Map<string, Set<string>>;

/**
 * Build adjacency list from edges
 */
function buildAdjacencyList(edges: GraphEdge[]): AdjacencyList {
  const adj = new Map<string, Set<string>>();

  for (const edge of edges) {
    // Skip self-loops
    if (edge.source === edge.target) continue;

    // Add bidirectional edges (undirected graph)
    if (!adj.has(edge.source)) adj.set(edge.source, new Set());
    if (!adj.has(edge.target)) adj.set(edge.target, new Set());

    adj.get(edge.source)!.add(edge.target);
    adj.get(edge.target)!.add(edge.source);
  }

  return adj;
}

/**
 * Get degree (number of connections) for a node
 */
function getDegree(adj: AdjacencyList, node: string): number {
  return adj.get(node)?.size ?? 0;
}

/**
 * Get neighbors of a node
 */
function getNeighbors(adj: AdjacencyList, node: string): Set<string> {
  return adj.get(node) ?? new Set();
}

/**
 * Calculate degree centrality for all nodes
 * Normalized by maximum possible degree (n-1)
 *
 * @param nodes - Array of graph nodes
 * @param edges - Array of graph edges
 * @returns Map of node ID to degree centrality (0-1)
 */
export function degreeCentrality(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Map<string, number> {
  const adj = buildAdjacencyList(edges);
  const centrality = new Map<string, number>();
  const n = nodes.length;

  if (n <= 1) {
    for (const node of nodes) {
      centrality.set(node.id, 0);
    }
    return centrality;
  }

  // Normalize by (n-1)
  for (const node of nodes) {
    const degree = getDegree(adj, node.id);
    centrality.set(node.id, degree / (n - 1));
  }

  return centrality;
}

/**
 * Calculate betweenness centrality (simplified version)
 * Measures how often a node appears on shortest paths
 *
 * @param nodes - Array of graph nodes
 * @param edges - Array of graph edges
 * @returns Map of node ID to betweenness centrality
 */
export function betweennessCentrality(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Map<string, number> {
  const adj = buildAdjacencyList(edges);
  const centrality = new Map<string, number>();
  const n = nodes.length;

  // Initialize centrality
  for (const node of nodes) {
    centrality.set(node.id, 0);
  }

  if (n <= 2) return centrality;

  // For each node as source
  for (const source of nodes) {
    // BFS to find shortest paths
    const queue: string[] = [source.id];
    const visited = new Set<string>([source.id]);
    const dist = new Map<string, number>([[source.id, 0]]);
    const paths = new Map<string, number>([[source.id, 1]]);
    const pred = new Map<string, string[]>();

    // BFS
    while (queue.length > 0) {
      const v = queue.shift()!;
      const vDist = dist.get(v)!;

      const vNeighbors = Array.from(getNeighbors(adj, v));
      for (const w of vNeighbors) {
        // First time visiting w
        if (!visited.has(w)) {
          visited.add(w);
          queue.push(w);
          dist.set(w, vDist + 1);
          paths.set(w, 0);
          pred.set(w, []);
        }

        // Shortest path to w via v
        if (dist.get(w) === vDist + 1) {
          paths.set(w, (paths.get(w) ?? 0) + (paths.get(v) ?? 0));
          pred.get(w)!.push(v);
        }
      }
    }

    // Accumulate betweenness (backtrack)
    const delta = new Map<string, number>();
    for (const node of nodes) {
      delta.set(node.id, 0);
    }

    // Process nodes in reverse order of distance
    const sortedNodes = Array.from(visited).sort((a, b) => (dist.get(b) ?? 0) - (dist.get(a) ?? 0));

    for (const w of sortedNodes) {
      if (w === source.id) continue;

      const predecessors = pred.get(w) ?? [];
      const wPaths = paths.get(w) ?? 1;
      const wDelta = delta.get(w) ?? 0;

      for (const v of predecessors) {
        const vPaths = paths.get(v) ?? 1;
        const contrib = (vPaths / wPaths) * (1 + wDelta);
        delta.set(v, (delta.get(v) ?? 0) + contrib);
      }

      if (w !== source.id) {
        centrality.set(w, (centrality.get(w) ?? 0) + (delta.get(w) ?? 0));
      }
    }
  }

  // Normalize (undirected graph)
  const normFactor = n > 2 ? 2.0 / ((n - 1) * (n - 2)) : 1.0;
  for (const [node, value] of Array.from(centrality.entries())) {
    centrality.set(node, value * normFactor);
  }

  return centrality;
}

/**
 * Calculate PageRank scores
 * Measures node importance based on link structure
 *
 * @param nodes - Array of graph nodes
 * @param edges - Array of graph edges
 * @param damping - Damping factor (default: 0.85)
 * @param iterations - Number of iterations (default: 20)
 * @returns Map of node ID to PageRank score
 */
export function calculatePageRank(
  nodes: GraphNode[],
  edges: GraphEdge[],
  damping: number = 0.85,
  iterations: number = 20
): Map<string, number> {
  const adj = buildAdjacencyList(edges);
  const pagerank = new Map<string, number>();
  const n = nodes.length;

  if (n === 0) return pagerank;

  // Initialize PageRank scores
  const initialValue = 1.0 / n;
  for (const node of nodes) {
    pagerank.set(node.id, initialValue);
  }

  // Power iteration
  for (let iter = 0; iter < iterations; iter++) {
    const newRank = new Map<string, number>();

    for (const node of nodes) {
      let rank = (1 - damping) / n;

      // Sum contributions from neighbors
      const neighbors = Array.from(getNeighbors(adj, node.id));
      for (const neighbor of neighbors) {
        const neighborDegree = getDegree(adj, neighbor);
        if (neighborDegree > 0) {
          rank += damping * (pagerank.get(neighbor) ?? 0) / neighborDegree;
        }
      }

      newRank.set(node.id, rank);
    }

    // Update ranks
    for (const [node, rank] of Array.from(newRank.entries())) {
      pagerank.set(node, rank);
    }
  }

  return pagerank;
}

/**
 * Detect communities using label propagation algorithm
 * Simplified version without randomization for deterministic results
 *
 * @param nodes - Array of graph nodes
 * @param edges - Array of graph edges
 * @param maxIterations - Maximum iterations (default: 30)
 * @returns Array of communities (arrays of node IDs)
 */
export function detectCommunities(
  nodes: GraphNode[],
  edges: GraphEdge[],
  maxIterations: number = 30
): Community[] {
  const adj = buildAdjacencyList(edges);

  // Handle small graphs
  if (nodes.length < 3) {
    return nodes.map((node, i) => ({
      id: `cluster-${i}`,
      nodes: [node.id],
      size: 1,
    }));
  }

  // Initialize each node with unique label
  const labels = new Map<string, string>();
  for (const node of nodes) {
    labels.set(node.id, node.id);
  }

  // Label propagation
  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    // Process nodes in consistent order
    for (const node of nodes) {
      const neighbors = Array.from(getNeighbors(adj, node.id));

      if (neighbors.length === 0) continue;

      // Count neighbor labels
      const labelCount = new Map<string, number>();
      for (const neighbor of neighbors) {
        const label = labels.get(neighbor) ?? neighbor;
        labelCount.set(label, (labelCount.get(label) ?? 0) + 1);
      }

      // Find most common label
      let maxCount = 0;
      let maxLabel = labels.get(node.id)!;

      // Sort for deterministic behavior
      const sortedLabels = Array.from(labelCount.entries()).sort((a, b) => a[0].localeCompare(b[0]));

      for (const [label, count] of sortedLabels) {
        if (count > maxCount) {
          maxCount = count;
          maxLabel = label;
        }
      }

      // Update label if changed
      if (maxLabel !== labels.get(node.id)) {
        labels.set(node.id, maxLabel);
        changed = true;
      }
    }

    // Converged
    if (!changed) break;
  }

  // Group nodes by label
  const communities = new Map<string, string[]>();
  for (const node of nodes) {
    const label = labels.get(node.id)!;
    if (!communities.has(label)) {
      communities.set(label, []);
    }
    communities.get(label)!.push(node.id);
  }

  // Convert to Community objects
  return Array.from(communities.entries())
    .map(([label, nodeIds], index) => ({
      id: `cluster-${index}`,
      nodes: nodeIds.sort(),
      size: nodeIds.length,
    }))
    .sort((a, b) => b.size - a.size); // Sort by size descending
}

/**
 * Calculate modularity for a given community structure
 * Measures quality of network partition
 *
 * @param nodes - Array of graph nodes
 * @param edges - Array of graph edges
 * @param communities - Detected communities
 * @returns Modularity score (-1 to 1, higher is better)
 */
export function calculateModularity(
  nodes: GraphNode[],
  edges: GraphEdge[],
  communities: Community[]
): number {
  const adj = buildAdjacencyList(edges);

  // Build community membership map
  const membership = new Map<string, string>();
  for (const community of communities) {
    for (const nodeId of community.nodes) {
      membership.set(nodeId, community.id);
    }
  }

  const m = edges.length; // Total edges
  if (m === 0) return 0;

  let modularity = 0;

  // For each edge
  for (const edge of edges) {
    if (edge.source === edge.target) continue;

    const sourceCommunity = membership.get(edge.source);
    const targetCommunity = membership.get(edge.target);

    // Delta function: 1 if same community, 0 otherwise
    const delta = sourceCommunity === targetCommunity ? 1 : 0;

    const kSource = getDegree(adj, edge.source);
    const kTarget = getDegree(adj, edge.target);

    // Weight contribution
    const weight = edge.weight ?? 1.0;

    modularity += weight * (delta - (kSource * kTarget) / (2 * m));
  }

  return modularity / (2 * m);
}

/**
 * Calculate network density
 * Ratio of actual edges to possible edges
 *
 * @param nodeCount - Number of nodes
 * @param edgeCount - Number of edges
 * @returns Density (0-1)
 */
export function networkDensity(nodeCount: number, edgeCount: number): number {
  if (nodeCount <= 1) return 0;
  const possibleEdges = (nodeCount * (nodeCount - 1)) / 2;
  return edgeCount / possibleEdges;
}

/**
 * Calculate average clustering coefficient
 * Measures how connected a node's neighbors are to each other
 *
 * @param nodes - Array of graph nodes
 * @param edges - Array of graph edges
 * @returns Average clustering coefficient (0-1)
 */
export function averageClustering(nodes: GraphNode[], edges: GraphEdge[]): number {
  const adj = buildAdjacencyList(edges);

  if (nodes.length === 0) return 0;

  let totalClustering = 0;
  let validNodes = 0;

  for (const node of nodes) {
    const neighbors = getNeighbors(adj, node.id);
    const k = neighbors.size;

    if (k < 2) continue; // Need at least 2 neighbors

    // Count edges between neighbors
    let edgeCount = 0;
    const neighborArray = Array.from(neighbors);

    for (let i = 0; i < neighborArray.length; i++) {
      for (let j = i + 1; j < neighborArray.length; j++) {
        const neighbors_i = Array.from(getNeighbors(adj, neighborArray[i]));
        if (neighbors_i.includes(neighborArray[j])) {
          edgeCount++;
        }
      }
    }

    // Clustering coefficient for this node
    const possibleEdges = (k * (k - 1)) / 2;
    totalClustering += edgeCount / possibleEdges;
    validNodes++;
  }

  return validNodes > 0 ? totalClustering / validNodes : 0;
}

/**
 * Determine orbit tier based on connection count
 * - Tier 0 (strong): >20 connections
 * - Tier 1 (medium): 5-20 connections
 * - Tier 2 (weak): <5 connections
 *
 * @param connections - Number of connections
 * @returns Orbit tier (0, 1, or 2)
 */
export function orbitTier(connections: number): OrbitTier {
  if (connections > 20) return 0;
  if (connections >= 5) return 1;
  return 2;
}

/**
 * Calculate orbit strength distribution
 * Percentage of nodes in each tier
 *
 * @param nodes - Array of nodes with tier property
 * @returns Distribution of orbit strengths
 */
export function orbitStrengthDistribution(nodes: GraphNode[]): OrbitDistribution {
  const total = nodes.length;

  if (total === 0) {
    return { strong: 0, medium: 0, weak: 0 };
  }

  let tier0 = 0;
  let tier1 = 0;
  let tier2 = 0;

  for (const node of nodes) {
    const tier = node.tier ?? 2;
    if (tier === 0) tier0++;
    else if (tier === 1) tier1++;
    else tier2++;
  }

  return {
    strong: tier0 / total,
    medium: tier1 / total,
    weak: tier2 / total,
  };
}

/**
 * Weight edges based on shared neighbors and degree similarity
 * Formula: weight = 1 + shared_neighbors + degree_ratio
 * where degree_ratio = min(deg_u, deg_v) / max(deg_u, deg_v)
 *
 * @param edges - Array of edges to weight
 * @param nodes - Array of nodes (for degree calculation)
 * @returns Edges with updated weights
 */
export function weightEdges(edges: GraphEdge[], nodes: GraphNode[]): GraphEdge[] {
  const adj = buildAdjacencyList(edges);
  const weightedEdges: GraphEdge[] = [];

  for (const edge of edges) {
    if (edge.source === edge.target) continue;

    // Count shared neighbors
    const sourceNeighbors = Array.from(getNeighbors(adj, edge.source));
    const targetNeighbors = getNeighbors(adj, edge.target);

    let sharedCount = 0;
    for (const neighbor of sourceNeighbors) {
      if (targetNeighbors.has(neighbor)) {
        sharedCount++;
      }
    }

    // Get degrees
    const degreeSource = getDegree(adj, edge.source);
    const degreeTarget = getDegree(adj, edge.target);

    // Calculate degree ratio
    const maxDegree = Math.max(degreeSource, degreeTarget);
    const minDegree = Math.min(degreeSource, degreeTarget);
    const degreeRatio = maxDegree > 0 ? minDegree / maxDegree : 0;

    // Calculate weight
    const weight = 1.0 + sharedCount + degreeRatio;

    weightedEdges.push({
      ...edge,
      weight,
    });
  }

  return weightedEdges;
}

/**
 * Compute comprehensive graph metrics
 *
 * @param nodes - Array of graph nodes
 * @param edges - Array of graph edges
 * @returns Complete set of graph metrics
 */
export function computeGraphMetrics(
  nodes: GraphNode[],
  edges: GraphEdge[]
): GraphMetrics {
  const communities = detectCommunities(nodes, edges);
  const degCentrality = degreeCentrality(nodes, edges);
  const pr = calculatePageRank(nodes, edges);

  const density = networkDensity(nodes.length, edges.length);
  const clustering = averageClustering(nodes, edges);
  const modularity = calculateModularity(nodes, edges, communities);

  // Top nodes by degree
  const topDegree = Array.from(degCentrality.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([node, value]) => ({ node, value }));

  // Top nodes by PageRank
  const topPageRank = Array.from(pr.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([node, value]) => ({ node, value }));

  return {
    density,
    averageClustering: clustering,
    modularity,
    clusterCount: communities.length,
    topDegree,
    topPageRank,
  };
}

/**
 * Get common neighbors between two nodes
 *
 * @param adj - Adjacency list
 * @param node1 - First node ID
 * @param node2 - Second node ID
 * @returns Set of common neighbor IDs
 */
function getCommonNeighbors(adj: AdjacencyList, node1: string, node2: string): Set<string> {
  const neighbors1 = Array.from(getNeighbors(adj, node1));
  const neighbors2 = getNeighbors(adj, node2);
  const common = new Set<string>();

  for (const neighbor of neighbors1) {
    if (neighbors2.has(neighbor)) {
      common.add(neighbor);
    }
  }

  return common;
}
