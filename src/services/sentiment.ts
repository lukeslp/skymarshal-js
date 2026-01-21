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

/** Word sentiment entry */
interface LexiconEntry {
  word: string;
  score: number;
}

/**
 * VADER-style lexicon for sentiment analysis
 * Scores range from -4 (most negative) to +4 (most positive)
 */
const LEXICON: LexiconEntry[] = [
  // Positive words
  { word: 'good', score: 1.9 },
  { word: 'great', score: 3.1 },
  { word: 'excellent', score: 3.2 },
  { word: 'amazing', score: 3.1 },
  { word: 'awesome', score: 3.1 },
  { word: 'fantastic', score: 3.0 },
  { word: 'wonderful', score: 2.8 },
  { word: 'love', score: 3.2 },
  { word: 'loved', score: 2.9 },
  { word: 'loving', score: 2.5 },
  { word: 'like', score: 1.5 },
  { word: 'liked', score: 1.5 },
  { word: 'happy', score: 2.7 },
  { word: 'joy', score: 2.8 },
  { word: 'joyful', score: 2.6 },
  { word: 'beautiful', score: 2.6 },
  { word: 'best', score: 3.0 },
  { word: 'better', score: 1.9 },
  { word: 'brilliant', score: 2.8 },
  { word: 'cool', score: 1.3 },
  { word: 'fun', score: 2.0 },
  { word: 'funny', score: 2.1 },
  { word: 'hilarious', score: 2.5 },
  { word: 'nice', score: 1.8 },
  { word: 'perfect', score: 3.0 },
  { word: 'positive', score: 1.5 },
  { word: 'pretty', score: 1.3 },
  { word: 'super', score: 2.3 },
  { word: 'thanks', score: 1.8 },
  { word: 'thank', score: 1.8 },
  { word: 'wow', score: 2.0 },
  { word: 'yes', score: 0.6 },
  { word: 'yay', score: 2.0 },
  { word: 'excited', score: 2.5 },
  { word: 'exciting', score: 2.3 },
  { word: 'impressive', score: 2.2 },
  { word: 'incredible', score: 2.8 },
  { word: 'outstanding', score: 2.9 },
  { word: 'recommend', score: 1.8 },
  { word: 'success', score: 2.2 },
  { word: 'successful', score: 2.3 },
  { word: 'win', score: 2.0 },
  { word: 'winning', score: 2.1 },
  { word: 'won', score: 2.0 },
  { word: 'congrats', score: 2.4 },
  { word: 'congratulations', score: 2.5 },
  
  // Negative words
  { word: 'bad', score: -2.5 },
  { word: 'terrible', score: -3.2 },
  { word: 'horrible', score: -3.1 },
  { word: 'awful', score: -3.0 },
  { word: 'hate', score: -3.4 },
  { word: 'hated', score: -3.2 },
  { word: 'hating', score: -3.0 },
  { word: 'sad', score: -2.1 },
  { word: 'sadness', score: -2.2 },
  { word: 'angry', score: -2.5 },
  { word: 'anger', score: -2.3 },
  { word: 'annoying', score: -2.0 },
  { word: 'annoyed', score: -1.9 },
  { word: 'boring', score: -1.8 },
  { word: 'bored', score: -1.5 },
  { word: 'disappointed', score: -2.4 },
  { word: 'disappointing', score: -2.3 },
  { word: 'disgust', score: -2.8 },
  { word: 'disgusting', score: -3.0 },
  { word: 'dumb', score: -2.0 },
  { word: 'fail', score: -2.2 },
  { word: 'failed', score: -2.3 },
  { word: 'failure', score: -2.5 },
  { word: 'fear', score: -2.0 },
  { word: 'fearful', score: -2.1 },
  { word: 'frustrated', score: -2.2 },
  { word: 'frustrating', score: -2.3 },
  { word: 'hurt', score: -2.1 },
  { word: 'hurts', score: -2.1 },
  { word: 'negative', score: -1.5 },
  { word: 'no', score: -0.5 },
  { word: 'not', score: -0.5 },
  { word: 'poor', score: -1.9 },
  { word: 'problem', score: -1.5 },
  { word: 'problems', score: -1.6 },
  { word: 'stupid', score: -2.5 },
  { word: 'sucks', score: -2.5 },
  { word: 'suck', score: -2.3 },
  { word: 'ugly', score: -2.2 },
  { word: 'upset', score: -2.0 },
  { word: 'waste', score: -2.0 },
  { word: 'wasted', score: -2.1 },
  { word: 'worst', score: -3.1 },
  { word: 'wrong', score: -1.8 },
  { word: 'broken', score: -2.0 },
  { word: 'crash', score: -2.2 },
  { word: 'crashed', score: -2.3 },
  { word: 'bug', score: -1.5 },
  { word: 'bugs', score: -1.6 },
  
  // Intensifiers (modify adjacent words)
  { word: 'very', score: 0.3 },
  { word: 'really', score: 0.3 },
  { word: 'extremely', score: 0.4 },
  { word: 'absolutely', score: 0.4 },
  { word: 'totally', score: 0.3 },
  { word: 'completely', score: 0.3 },
  { word: 'so', score: 0.2 },
  { word: 'too', score: 0.2 },
  { word: 'quite', score: 0.1 },
  { word: 'rather', score: 0.1 },
  
  // Negators (flip sentiment)
  { word: "don't", score: 0 },
  { word: "doesn't", score: 0 },
  { word: "didn't", score: 0 },
  { word: "won't", score: 0 },
  { word: "wouldn't", score: 0 },
  { word: "couldn't", score: 0 },
  { word: "shouldn't", score: 0 },
  { word: 'never', score: 0 },
  { word: 'neither', score: 0 },
  { word: 'nobody', score: 0 },
  { word: 'nothing', score: 0 },
  { word: 'nowhere', score: 0 },
];

/** Negator words that flip sentiment */
const NEGATORS = new Set([
  "don't", "doesn't", "didn't", "won't", "wouldn't", "couldn't", "shouldn't",
  'never', 'neither', 'nobody', 'nothing', 'nowhere', 'not', "isn't", "aren't",
  "wasn't", "weren't", "haven't", "hasn't", "hadn't", "cannot", "can't"
]);

/** Intensifier multipliers */
const INTENSIFIERS: Record<string, number> = {
  'very': 1.3,
  'really': 1.3,
  'extremely': 1.5,
  'absolutely': 1.5,
  'totally': 1.3,
  'completely': 1.4,
  'so': 1.2,
  'too': 1.2,
  'quite': 1.1,
  'rather': 1.1,
  'incredibly': 1.4,
  'remarkably': 1.3,
  'particularly': 1.2,
  'especially': 1.3,
};

/** Build lexicon map for fast lookup */
const LEXICON_MAP = new Map<string, number>();
for (const entry of LEXICON) {
  LEXICON_MAP.set(entry.word.toLowerCase(), entry.score);
}

/**
 * Normalize compound score to -1 to 1 range
 */
function normalizeScore(score: number, alpha: number = 15): number {
  return score / Math.sqrt(score * score + alpha);
}

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * SentimentService - Analyzes text sentiment using VADER-style approach
 */
export class SentimentService {
  /**
   * Analyze sentiment of a single text
   * @param text - Text to analyze
   */
  analyzeSentiment(text: string): SentimentScore {
    const words = tokenize(text);
    
    if (words.length === 0) {
      return {
        positive: 0,
        negative: 0,
        neutral: 1,
        compound: 0,
        category: 'neutral',
      };
    }

    let positiveSum = 0;
    let negativeSum = 0;
    let totalScore = 0;
    let wordCount = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let score = LEXICON_MAP.get(word) || 0;

      if (score === 0) continue;

      // Check for negation in previous 3 words
      let negated = false;
      for (let j = Math.max(0, i - 3); j < i; j++) {
        if (NEGATORS.has(words[j])) {
          negated = true;
          break;
        }
      }

      // Check for intensifiers in previous 2 words
      let intensifier = 1;
      for (let j = Math.max(0, i - 2); j < i; j++) {
        const mult = INTENSIFIERS[words[j]];
        if (mult) {
          intensifier = mult;
          break;
        }
      }

      // Apply modifications
      score *= intensifier;
      if (negated) {
        score *= -0.74; // VADER negation coefficient
      }

      // Accumulate scores
      if (score > 0) {
        positiveSum += score;
      } else if (score < 0) {
        negativeSum += Math.abs(score);
      }

      totalScore += score;
      wordCount++;
    }

    // Calculate proportions
    const total = positiveSum + negativeSum + 0.001; // Avoid division by zero
    const positive = positiveSum / total;
    const negative = negativeSum / total;
    const neutral = 1 - positive - negative;

    // Normalize compound score
    const compound = normalizeScore(totalScore);

    // Determine category
    let category: 'positive' | 'negative' | 'neutral';
    if (compound >= 0.05) {
      category = 'positive';
    } else if (compound <= -0.05) {
      category = 'negative';
    } else {
      category = 'neutral';
    }

    return {
      positive: Math.round(positive * 1000) / 1000,
      negative: Math.round(negative * 1000) / 1000,
      neutral: Math.round(neutral * 1000) / 1000,
      compound: Math.round(compound * 1000) / 1000,
      category,
    };
  }

  /**
   * Analyze sentiment of multiple texts
   * @param texts - Array of texts to analyze
   */
  batchAnalyzeSentiment(texts: string[]): BatchSentimentResult {
    const scores = texts.map(text => this.analyzeSentiment(text));
    
    const distribution = {
      positive: 0,
      negative: 0,
      neutral: 0,
    };

    let compoundSum = 0;

    for (const score of scores) {
      distribution[score.category]++;
      compoundSum += score.compound;
    }

    return {
      texts,
      scores,
      averageCompound: texts.length > 0 ? compoundSum / texts.length : 0,
      distribution,
    };
  }

  /**
   * Get just the compound score for a text
   * @param text - Text to analyze
   */
  getSentimentScore(text: string): number {
    return this.analyzeSentiment(text).compound;
  }

  /**
   * Categorize sentiment by compound score
   * @param compound - Compound score (-1 to 1)
   */
  categorizeSentiment(compound: number): 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative' {
    if (compound >= 0.5) return 'very_positive';
    if (compound >= 0.05) return 'positive';
    if (compound <= -0.5) return 'very_negative';
    if (compound <= -0.05) return 'negative';
    return 'neutral';
  }

  /**
   * Get sentiment trend over time
   * @param texts - Array of texts in chronological order
   * @param windowSize - Rolling window size for smoothing
   */
  getSentimentTrend(texts: string[], windowSize: number = 5): number[] {
    const scores = texts.map(text => this.getSentimentScore(text));
    
    if (scores.length < windowSize) {
      return scores;
    }

    const trend: number[] = [];
    
    for (let i = 0; i <= scores.length - windowSize; i++) {
      const window = scores.slice(i, i + windowSize);
      const avg = window.reduce((a, b) => a + b, 0) / windowSize;
      trend.push(Math.round(avg * 1000) / 1000);
    }

    return trend;
  }

  /**
   * Find most positive and negative texts
   * @param texts - Array of texts to analyze
   * @param topN - Number of top results to return
   */
  findExtremes(texts: string[], topN: number = 5): {
    mostPositive: Array<{ text: string; score: SentimentScore }>;
    mostNegative: Array<{ text: string; score: SentimentScore }>;
  } {
    const analyzed = texts.map(text => ({
      text,
      score: this.analyzeSentiment(text),
    }));

    const sorted = [...analyzed].sort((a, b) => b.score.compound - a.score.compound);

    return {
      mostPositive: sorted.slice(0, topN),
      mostNegative: sorted.slice(-topN).reverse(),
    };
  }
}

export default SentimentService;
