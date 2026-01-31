/**
 * Tiered Sentiment Analyzer
 *
 * Analyzes sentiment at three levels:
 * - Document: Overall sentiment of the entire response
 * - Paragraph: Sentiment of paragraphs mentioning the brand
 * - Entity: Sentiment specifically about the brand/entity
 *
 * Uses a tiered fallback approach:
 * 1. Primary: `sentiment` (AFINN-165) - simple, reliable, handles emojis
 * 2. Fallback: `vader-sentiment` (VADER) - better for social media, handles negation
 * 3. Last resort: Custom lexicon - our word-list approach
 */

import Sentiment from 'sentiment';
import vader from 'vader-sentiment';

// Initialize sentiment analyzer (AFINN-165)
const sentimentAnalyzer = new Sentiment();

export type SentimentScore = number; // -1 (negative) to 1 (positive)

export interface SentimentResult {
  score: SentimentScore;
  confidence: number; // 0 to 1
  label: 'positive' | 'negative' | 'neutral';
}

export interface KeyPhrase {
  text: string;
  sentiment: SentimentResult;
  startIndex: number;
  endIndex: number;
}

export interface ParagraphSentiment {
  text: string;
  index: number;
  sentiment: SentimentResult;
  mentionsBrand: boolean;
  keyPhrases: KeyPhrase[];
}

export interface EntitySentiment {
  entity: string;
  mentions: number;
  sentiment: SentimentResult;
  contexts: string[]; // Sentences where entity appears
}

export interface TieredSentimentAnalysis {
  /** Overall document sentiment */
  document: SentimentResult;
  /** Sentiment per paragraph */
  paragraphs: ParagraphSentiment[];
  /** Brand-specific sentiment */
  brandSentiment: EntitySentiment | null;
  /** Competitor sentiments */
  competitorSentiments: EntitySentiment[];
  /** Key phrases with sentiment */
  keyPhrases: KeyPhrase[];
  /** Analysis metadata */
  metadata: {
    analyzedAt: Date;
    textLength: number;
    paragraphCount: number;
    brandMentionCount: number;
  };
}

// Sentiment word lists (simplified - production would use ML model)
const POSITIVE_WORDS = new Set([
  'best', 'excellent', 'great', 'amazing', 'outstanding', 'fantastic', 'wonderful',
  'superior', 'recommended', 'leading', 'top', 'preferred', 'innovative', 'reliable',
  'trusted', 'popular', 'loved', 'praised', 'acclaimed', 'renowned', 'exceptional',
  'impressive', 'remarkable', 'brilliant', 'perfect', 'ideal', 'premium', 'quality',
  'efficient', 'effective', 'powerful', 'advanced', 'cutting-edge', 'revolutionary',
  'helpful', 'useful', 'valuable', 'beneficial', 'positive', 'strong', 'robust'
]);

const NEGATIVE_WORDS = new Set([
  'worst', 'terrible', 'poor', 'bad', 'awful', 'horrible', 'disappointing',
  'inferior', 'unreliable', 'problematic', 'flawed', 'weak', 'limited', 'outdated',
  'expensive', 'overpriced', 'complicated', 'difficult', 'confusing', 'frustrating',
  'slow', 'buggy', 'unstable', 'risky', 'controversial', 'criticized', 'lacking',
  'mediocre', 'subpar', 'inadequate', 'insufficient', 'negative', 'failed', 'broken'
]);

const INTENSIFIERS = new Set([
  'very', 'extremely', 'incredibly', 'highly', 'absolutely', 'completely', 'totally',
  'really', 'particularly', 'especially', 'remarkably', 'exceptionally'
]);

const NEGATORS = new Set([
  'not', 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere', 'hardly',
  'barely', 'scarcely', "don't", "doesn't", "didn't", "won't", "wouldn't",
  "can't", "cannot", "couldn't", "shouldn't"
]);

/**
 * Analyze sentiment using our custom lexicon (fallback method)
 */
function analyzeSentimentLexicon(text: string): SentimentResult {
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  let wordCount = 0;
  let negateNext = false;
  let intensifyNext = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-z]/g, '');

    if (NEGATORS.has(word)) {
      negateNext = true;
      continue;
    }

    if (INTENSIFIERS.has(word)) {
      intensifyNext = true;
      continue;
    }

    let wordScore = 0;
    if (POSITIVE_WORDS.has(word)) {
      wordScore = 1;
    } else if (NEGATIVE_WORDS.has(word)) {
      wordScore = -1;
    }

    if (wordScore !== 0) {
      if (negateNext) {
        wordScore *= -1;
        negateNext = false;
      }
      if (intensifyNext) {
        wordScore *= 1.5;
        intensifyNext = false;
      }
      score += wordScore;
      wordCount++;
    }
  }

  // Normalize score to -1 to 1 range
  const normalizedScore = wordCount > 0 ? Math.max(-1, Math.min(1, score / Math.sqrt(wordCount))) : 0;

  // Calculate confidence based on word count and score magnitude
  const confidence = Math.min(1, (wordCount / 10) * Math.abs(normalizedScore) + 0.3);

  return {
    score: Math.round(normalizedScore * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    label: normalizedScore > 0.1 ? 'positive' : normalizedScore < -0.1 ? 'negative' : 'neutral'
  };
}

/**
 * Analyze sentiment using tiered approach:
 * 1. Try AFINN (sentiment library) first
 * 2. Fallback to VADER for better negation/social media handling
 * 3. Use custom lexicon as last resort
 */
function analyzeSentiment(text: string): SentimentResult {
  // Skip empty or very short text
  if (!text || text.trim().length < 3) {
    return { score: 0, confidence: 0, label: 'neutral' };
  }

  // Try sentiment (AFINN-165) first
  try {
    const result = sentimentAnalyzer.analyze(text);
    const tokens = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
    const sentimentWords = new Set(result.words.map((word) => word.toLowerCase()));
    const hasIntensifiedSentiment = tokens.some((token, index) =>
      INTENSIFIERS.has(token) && tokens.slice(index + 1, index + 3).some((next) => sentimentWords.has(next))
    );
    // result.comparative is normalized score (roughly -5 to +5, clamp to -1 to 1)
    const score = Math.max(-1, Math.min(1, result.comparative * (hasIntensifiedSentiment ? 1.5 : 1)));

    // If we got a clear signal (non-zero score or enough tokens analyzed), return it
    if (Math.abs(score) > 0.05 || result.tokens.length > 3) {
      return {
        score: Math.round(score * 100) / 100,
        confidence: Math.min(1, Math.round((result.tokens.length / 20) * 100) / 100 + 0.3),
        label: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral'
      };
    }
  } catch (e) {
    console.warn('[Sentiment] AFINN failed:', e);
  }

  // Try VADER second (better for social media text, handles negation well)
  try {
    const intensity = vader.SentimentIntensityAnalyzer.polarity_scores(text);
    const score = intensity.compound; // Already -1 to +1

    // If VADER got a clear signal, return it
    if (Math.abs(score) > 0.05) {
      return {
        score: Math.round(score * 100) / 100,
        confidence: Math.round(Math.max(intensity.pos, intensity.neg, intensity.neu) * 100) / 100,
        label: score >= 0.05 ? 'positive' : score <= -0.05 ? 'negative' : 'neutral'
      };
    }
  } catch (e) {
    console.warn('[Sentiment] VADER failed:', e);
  }

  // Fallback to our custom lexicon
  return analyzeSentimentLexicon(text);
}

/**
 * Extract key phrases from text with their sentiment
 */
function extractKeyPhrases(text: string, brandName?: string): KeyPhrase[] {
  const phrases: KeyPhrase[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());

  let currentIndex = 0;
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 10) continue;

    const startIndex = text.indexOf(trimmed, currentIndex);
    const endIndex = startIndex + trimmed.length;
    currentIndex = endIndex;

    // Check if sentence contains brand or sentiment words
    const lower = trimmed.toLowerCase();
    const hasBrand = brandName && lower.includes(brandName.toLowerCase());
    const hasSentiment = Array.from(POSITIVE_WORDS).concat(Array.from(NEGATIVE_WORDS)).some(w => lower.includes(w));

    if (hasBrand || hasSentiment) {
      phrases.push({
        text: trimmed,
        sentiment: analyzeSentiment(trimmed),
        startIndex,
        endIndex
      });
    }
  }

  return phrases.slice(0, 10); // Limit to top 10 phrases
}

/**
 * Split text into paragraphs
 */
function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/**
 * Analyze entity sentiment within text
 */
function analyzeEntitySentiment(text: string, entity: string): EntitySentiment | null {
  const lower = text.toLowerCase();
  const entityLower = entity.toLowerCase();

  if (!lower.includes(entityLower)) {
    return null;
  }

  // Find sentences mentioning the entity
  const sentences = text.split(/[.!?]+/).filter(s =>
    s.toLowerCase().includes(entityLower)
  );

  if (sentences.length === 0) {
    return null;
  }

  // Analyze sentiment of sentences mentioning the entity
  const sentimentScores = sentences.map(s => analyzeSentiment(s));
  const avgScore = sentimentScores.reduce((sum, s) => sum + s.score, 0) / sentimentScores.length;
  const avgConfidence = sentimentScores.reduce((sum, s) => sum + s.confidence, 0) / sentimentScores.length;

  return {
    entity,
    mentions: sentences.length,
    sentiment: {
      score: Math.round(avgScore * 100) / 100,
      confidence: Math.round(avgConfidence * 100) / 100,
      label: avgScore > 0.1 ? 'positive' : avgScore < -0.1 ? 'negative' : 'neutral'
    },
    contexts: sentences.slice(0, 5).map(s => s.trim())
  };
}

/**
 * Perform tiered sentiment analysis on text
 */
export function analyzeTieredSentiment(
  text: string,
  brandName?: string,
  competitors: string[] = []
): TieredSentimentAnalysis {
  const paragraphs = splitIntoParagraphs(text);

  // Document-level sentiment
  const documentSentiment = analyzeSentiment(text);

  // Paragraph-level sentiment
  const paragraphSentiments: ParagraphSentiment[] = paragraphs.map((para, index) => {
    const mentionsBrand = brandName ? para.toLowerCase().includes(brandName.toLowerCase()) : false;
    return {
      text: para,
      index,
      sentiment: analyzeSentiment(para),
      mentionsBrand,
      keyPhrases: extractKeyPhrases(para, brandName)
    };
  });

  // Brand sentiment
  const brandSentiment = brandName ? analyzeEntitySentiment(text, brandName) : null;

  // Competitor sentiments
  const competitorSentiments = competitors
    .map(comp => analyzeEntitySentiment(text, comp))
    .filter((s): s is EntitySentiment => s !== null);

  // Overall key phrases
  const keyPhrases = extractKeyPhrases(text, brandName);

  // Count brand mentions
  const brandMentionCount = brandName
    ? (text.toLowerCase().match(new RegExp(brandName.toLowerCase(), 'g')) || []).length
    : 0;

  return {
    document: documentSentiment,
    paragraphs: paragraphSentiments,
    brandSentiment,
    competitorSentiments,
    keyPhrases,
    metadata: {
      analyzedAt: new Date(),
      textLength: text.length,
      paragraphCount: paragraphs.length,
      brandMentionCount
    }
  };
}

/**
 * Get a simple sentiment score for quick analysis
 */
export function getSimpleSentiment(text: string): SentimentResult {
  return analyzeSentiment(text);
}

/**
 * Compare sentiment between brand and competitors
 */
export function compareSentiments(
  text: string,
  brandName: string,
  competitors: string[]
): {
  brand: EntitySentiment | null;
  competitors: EntitySentiment[];
  comparison: {
    brandRank: number;
    totalEntities: number;
    brandVsAverage: number;
  };
} {
  const brand = analyzeEntitySentiment(text, brandName);
  const competitorResults = competitors
    .map(c => analyzeEntitySentiment(text, c))
    .filter((s): s is EntitySentiment => s !== null);

  // Calculate rankings
  const allEntities = brand ? [brand, ...competitorResults] : competitorResults;
  allEntities.sort((a, b) => b.sentiment.score - a.sentiment.score);

  const brandRank = brand ? allEntities.findIndex(e => e.entity === brandName) + 1 : 0;
  const avgScore = allEntities.length > 0
    ? allEntities.reduce((sum, e) => sum + e.sentiment.score, 0) / allEntities.length
    : 0;

  return {
    brand,
    competitors: competitorResults,
    comparison: {
      brandRank,
      totalEntities: allEntities.length,
      brandVsAverage: brand ? Math.round((brand.sentiment.score - avgScore) * 100) / 100 : 0
    }
  };
}
