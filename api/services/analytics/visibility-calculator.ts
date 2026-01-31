/**
 * Visibility Score Calculator
 *
 * Aggregates sentiment, position, mention rate, and platform coverage
 * into a single visibility score (0-100).
 *
 * Formula:
 * Visibility = (MentionRate * 0.30) + (PositionScore * 0.25) +
 *              (SentimentScore * 0.20) + (PlatformCoverage * 0.25)
 */

import { getSimpleSentiment, type SentimentResult } from './sentiment-analyzer';
import { getSimplePositionScore, type PositionScore, calculatePositionScore } from './position-scorer';

export interface PlatformVisibility {
  platform: string;
  /** Whether brand was mentioned on this platform */
  mentioned: boolean;
  /** Number of mentions */
  mentionCount: number;
  /** Position score (0-100) */
  positionScore: number;
  /** Sentiment score (-1 to 1) */
  sentimentScore: number;
  /** Platform-specific visibility score (0-100) */
  visibilityScore: number;
}

export interface VisibilityBreakdown {
  /** Mention rate component (0-30) */
  mentionRate: number;
  /** Position score component (0-25) */
  position: number;
  /** Sentiment score component (0-20) */
  sentiment: number;
  /** Platform coverage component (0-25) */
  platformCoverage: number;
}

export interface VisibilityScore {
  /** Overall visibility score (0-100) */
  score: number;
  /** Score breakdown by component */
  breakdown: VisibilityBreakdown;
  /** Per-platform visibility */
  platforms: PlatformVisibility[];
  /** Analysis metadata */
  metadata: {
    totalResponses: number;
    responsesWithMention: number;
    platformsCovered: number;
    totalPlatforms: number;
    averageSentiment: number;
    averagePosition: number;
    calculatedAt: Date;
  };
}

export interface ResponseData {
  platform: string;
  text: string;
  brandMentioned: boolean;
}

// Supported platforms
export const PLATFORMS = [
  'chatgpt',
  'claude',
  'perplexity',
  'gemini',
  'grok',
  'deepseek',
  'ai_mode',
  'ai_overview',
] as const;

export type Platform = typeof PLATFORMS[number];

// Weight configuration
const WEIGHTS = {
  mentionRate: 0.30,
  position: 0.25,
  sentiment: 0.20,
  platformCoverage: 0.25,
};

/**
 * Calculate mention rate score (0-30)
 * Based on percentage of responses that mention the brand
 */
function calculateMentionRateScore(
  responsesWithMention: number,
  totalResponses: number
): number {
  if (totalResponses === 0) return 0;
  const rate = responsesWithMention / totalResponses;
  return Math.round(rate * 30);
}

/**
 * Calculate platform coverage score (0-25)
 * Based on how many platforms mention the brand
 */
function calculatePlatformCoverageScore(
  platformsCovered: number,
  totalPlatforms: number
): number {
  if (totalPlatforms === 0) return 0;
  const coverage = platformsCovered / totalPlatforms;
  return Math.round(coverage * 25);
}

/**
 * Calculate position component score (0-25)
 * Normalized from position scores
 */
function calculatePositionComponent(averagePosition: number): number {
  // averagePosition is 0-100, scale to 0-25
  return Math.round((averagePosition / 100) * 25);
}

/**
 * Calculate sentiment component score (0-20)
 * Normalized from sentiment scores (-1 to 1)
 */
function calculateSentimentComponent(averageSentiment: number): number {
  // Convert -1 to 1 range to 0-20
  // -1 = 0, 0 = 10, 1 = 20
  const normalized = (averageSentiment + 1) / 2;
  return Math.round(normalized * 20);
}

/**
 * Calculate visibility for a single platform
 */
function calculatePlatformVisibility(
  platform: string,
  responses: ResponseData[],
  brand: string
): PlatformVisibility {
  const platformResponses = responses.filter((r) => r.platform === platform);

  if (platformResponses.length === 0) {
    return {
      platform,
      mentioned: false,
      mentionCount: 0,
      positionScore: 0,
      sentimentScore: 0,
      visibilityScore: 0,
    };
  }

  // Count mentions
  const responsesWithMention = platformResponses.filter((r) => r.brandMentioned);
  const mentionCount = responsesWithMention.length;
  const mentioned = mentionCount > 0;

  if (!mentioned) {
    return {
      platform,
      mentioned: false,
      mentionCount: 0,
      positionScore: 0,
      sentimentScore: 0,
      visibilityScore: 0,
    };
  }

  // Calculate average position score
  const positionScores = responsesWithMention.map((r) =>
    getSimplePositionScore(r.text, brand)
  );
  const avgPosition = positionScores.reduce((a, b) => a + b, 0) / positionScores.length;

  // Calculate average sentiment
  const sentimentScores = responsesWithMention.map((r) =>
    getSimpleSentiment(r.text).score
  );
  const avgSentiment = sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length;

  // Calculate platform visibility score
  const mentionRate = mentionCount / platformResponses.length;
  const visibilityScore = Math.round(
    mentionRate * 40 + // Mention rate contributes 40
    (avgPosition / 100) * 35 + // Position contributes 35
    ((avgSentiment + 1) / 2) * 25 // Sentiment contributes 25
  );

  return {
    platform,
    mentioned: true,
    mentionCount,
    positionScore: Math.round(avgPosition),
    sentimentScore: Math.round(avgSentiment * 100) / 100,
    visibilityScore: Math.min(100, visibilityScore),
  };
}

/**
 * Calculate overall visibility score
 */
export function calculateVisibilityScore(
  responses: ResponseData[],
  brand: string
): VisibilityScore {
  if (responses.length === 0) {
    return {
      score: 0,
      breakdown: {
        mentionRate: 0,
        position: 0,
        sentiment: 0,
        platformCoverage: 0,
      },
      platforms: PLATFORMS.map((p) => ({
        platform: p,
        mentioned: false,
        mentionCount: 0,
        positionScore: 0,
        sentimentScore: 0,
        visibilityScore: 0,
      })),
      metadata: {
        totalResponses: 0,
        responsesWithMention: 0,
        platformsCovered: 0,
        totalPlatforms: PLATFORMS.length,
        averageSentiment: 0,
        averagePosition: 0,
        calculatedAt: new Date(),
      },
    };
  }

  // Calculate per-platform visibility
  const platformVisibilities = PLATFORMS.map((platform) =>
    calculatePlatformVisibility(platform, responses, brand)
  );

  // Aggregate metrics
  const responsesWithMention = responses.filter((r) => r.brandMentioned);
  const platformsCovered = platformVisibilities.filter((p) => p.mentioned).length;

  // If no mentions at all, return 0 score
  if (responsesWithMention.length === 0) {
    return {
      score: 0,
      breakdown: {
        mentionRate: 0,
        position: 0,
        sentiment: 0,
        platformCoverage: 0,
      },
      platforms: platformVisibilities,
      metadata: {
        totalResponses: responses.length,
        responsesWithMention: 0,
        platformsCovered: 0,
        totalPlatforms: PLATFORMS.length,
        averageSentiment: 0,
        averagePosition: 0,
        calculatedAt: new Date(),
      },
    };
  }

  // Calculate averages from platforms that have mentions
  const mentionedPlatforms = platformVisibilities.filter((p) => p.mentioned);

  const avgPosition = mentionedPlatforms.length > 0
    ? mentionedPlatforms.reduce((sum, p) => sum + p.positionScore, 0) / mentionedPlatforms.length
    : 0;

  const avgSentiment = mentionedPlatforms.length > 0
    ? mentionedPlatforms.reduce((sum, p) => sum + p.sentimentScore, 0) / mentionedPlatforms.length
    : 0;

  // Calculate breakdown
  const mentionRateScore = calculateMentionRateScore(
    responsesWithMention.length,
    responses.length
  );
  const positionScore = calculatePositionComponent(avgPosition);
  const sentimentScore = calculateSentimentComponent(avgSentiment);
  const platformCoverageScore = calculatePlatformCoverageScore(
    platformsCovered,
    PLATFORMS.length
  );

  const totalScore = mentionRateScore + positionScore + sentimentScore + platformCoverageScore;

  return {
    score: Math.min(100, totalScore),
    breakdown: {
      mentionRate: mentionRateScore,
      position: positionScore,
      sentiment: sentimentScore,
      platformCoverage: platformCoverageScore,
    },
    platforms: platformVisibilities,
    metadata: {
      totalResponses: responses.length,
      responsesWithMention: responsesWithMention.length,
      platformsCovered,
      totalPlatforms: PLATFORMS.length,
      averageSentiment: Math.round(avgSentiment * 100) / 100,
      averagePosition: Math.round(avgPosition),
      calculatedAt: new Date(),
    },
  };
}

/**
 * Get simple visibility score (0-100)
 */
export function getSimpleVisibilityScore(
  responses: ResponseData[],
  brand: string
): number {
  return calculateVisibilityScore(responses, brand).score;
}

/**
 * Compare visibility between brand and competitors
 */
export function compareVisibility(
  responses: ResponseData[],
  brand: string,
  competitors: string[]
): {
  brand: { name: string; score: VisibilityScore };
  competitors: Array<{ name: string; score: VisibilityScore }>;
  ranking: { position: number; total: number };
} {
  const brandScore = calculateVisibilityScore(responses, brand);

  const competitorScores = competitors.map((name) => ({
    name,
    score: calculateVisibilityScore(
      responses.map((r) => ({
        ...r,
        brandMentioned: r.text.toLowerCase().includes(name.toLowerCase()),
      })),
      name
    ),
  }));

  // Calculate ranking
  const allScores = [
    { name: brand, score: brandScore.score },
    ...competitorScores.map((c) => ({ name: c.name, score: c.score.score })),
  ].sort((a, b) => b.score - a.score);

  const position = allScores.findIndex((s) => s.name === brand) + 1;

  return {
    brand: { name: brand, score: brandScore },
    competitors: competitorScores,
    ranking: { position, total: allScores.length },
  };
}
