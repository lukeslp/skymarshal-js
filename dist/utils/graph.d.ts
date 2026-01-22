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
    topDegree: Array<{
        node: string;
        value: number;
    }>;
    /** Top nodes by PageRank */
    topPageRank: Array<{
        node: string;
        value: number;
    }>;
}
/**
 * Orbit tier classification
 */
export type OrbitTier = 0 | 1 | 2;
/**
 * Orbit strength distribution
 */
export interface OrbitDistribution {
    strong: number;
    medium: number;
    weak: number;
}
/**
 * Calculate degree centrality for all nodes
 * Normalized by maximum possible degree (n-1)
 *
 * @param nodes - Array of graph nodes
 * @param edges - Array of graph edges
 * @returns Map of node ID to degree centrality (0-1)
 */
export declare function degreeCentrality(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number>;
/**
 * Calculate betweenness centrality (simplified version)
 * Measures how often a node appears on shortest paths
 *
 * @param nodes - Array of graph nodes
 * @param edges - Array of graph edges
 * @returns Map of node ID to betweenness centrality
 */
export declare function betweennessCentrality(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number>;
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
export declare function calculatePageRank(nodes: GraphNode[], edges: GraphEdge[], damping?: number, iterations?: number): Map<string, number>;
/**
 * Detect communities using label propagation algorithm
 * Simplified version without randomization for deterministic results
 *
 * @param nodes - Array of graph nodes
 * @param edges - Array of graph edges
 * @param maxIterations - Maximum iterations (default: 30)
 * @returns Array of communities (arrays of node IDs)
 */
export declare function detectCommunities(nodes: GraphNode[], edges: GraphEdge[], maxIterations?: number): Community[];
/**
 * Calculate modularity for a given community structure
 * Measures quality of network partition
 *
 * @param nodes - Array of graph nodes
 * @param edges - Array of graph edges
 * @param communities - Detected communities
 * @returns Modularity score (-1 to 1, higher is better)
 */
export declare function calculateModularity(nodes: GraphNode[], edges: GraphEdge[], communities: Community[]): number;
/**
 * Calculate network density
 * Ratio of actual edges to possible edges
 *
 * @param nodeCount - Number of nodes
 * @param edgeCount - Number of edges
 * @returns Density (0-1)
 */
export declare function networkDensity(nodeCount: number, edgeCount: number): number;
/**
 * Calculate average clustering coefficient
 * Measures how connected a node's neighbors are to each other
 *
 * @param nodes - Array of graph nodes
 * @param edges - Array of graph edges
 * @returns Average clustering coefficient (0-1)
 */
export declare function averageClustering(nodes: GraphNode[], edges: GraphEdge[]): number;
/**
 * Determine orbit tier based on connection count
 * - Tier 0 (strong): >20 connections
 * - Tier 1 (medium): 5-20 connections
 * - Tier 2 (weak): <5 connections
 *
 * @param connections - Number of connections
 * @returns Orbit tier (0, 1, or 2)
 */
export declare function orbitTier(connections: number): OrbitTier;
/**
 * Calculate orbit strength distribution
 * Percentage of nodes in each tier
 *
 * @param nodes - Array of nodes with tier property
 * @returns Distribution of orbit strengths
 */
export declare function orbitStrengthDistribution(nodes: GraphNode[]): OrbitDistribution;
/**
 * Weight edges based on shared neighbors and degree similarity
 * Formula: weight = 1 + shared_neighbors + degree_ratio
 * where degree_ratio = min(deg_u, deg_v) / max(deg_u, deg_v)
 *
 * @param edges - Array of edges to weight
 * @param nodes - Array of nodes (for degree calculation)
 * @returns Edges with updated weights
 */
export declare function weightEdges(edges: GraphEdge[], nodes: GraphNode[]): GraphEdge[];
/**
 * Compute comprehensive graph metrics
 *
 * @param nodes - Array of graph nodes
 * @param edges - Array of graph edges
 * @returns Complete set of graph metrics
 */
export declare function computeGraphMetrics(nodes: GraphNode[], edges: GraphEdge[]): GraphMetrics;
//# sourceMappingURL=graph.d.ts.map