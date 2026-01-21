/**
 * SentimentService - Text sentiment analysis using VADER-style lexicon
 * @module skymarshal-core/services/sentiment
 */
/** Sentiment score result */
export interface SentimentScore {
    positive: number;
    negative: number;
    neutral: number;
    compound: number;
    category: 'positive' | 'negative' | 'neutral';
}
/** Batch sentiment result */
export interface BatchSentimentResult {
    texts: string[];
    scores: SentimentScore[];
    averageCompound: number;
    distribution: {
        positive: number;
        negative: number;
        neutral: number;
    };
}
/**
 * SentimentService - Analyzes text sentiment using VADER-style approach
 */
export declare class SentimentService {
    /**
     * Analyze sentiment of a single text
     * @param text - Text to analyze
     */
    analyzeSentiment(text: string): SentimentScore;
    /**
     * Analyze sentiment of multiple texts
     * @param texts - Array of texts to analyze
     */
    batchAnalyzeSentiment(texts: string[]): BatchSentimentResult;
    /**
     * Get just the compound score for a text
     * @param text - Text to analyze
     */
    getSentimentScore(text: string): number;
    /**
     * Categorize sentiment by compound score
     * @param compound - Compound score (-1 to 1)
     */
    categorizeSentiment(compound: number): 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
    /**
     * Get sentiment trend over time
     * @param texts - Array of texts in chronological order
     * @param windowSize - Rolling window size for smoothing
     */
    getSentimentTrend(texts: string[], windowSize?: number): number[];
    /**
     * Find most positive and negative texts
     * @param texts - Array of texts to analyze
     * @param topN - Number of top results to return
     */
    findExtremes(texts: string[], topN?: number): {
        mostPositive: Array<{
            text: string;
            score: SentimentScore;
        }>;
        mostNegative: Array<{
            text: string;
            score: SentimentScore;
        }>;
    };
}
export default SentimentService;
//# sourceMappingURL=sentiment.d.ts.map