/**
 * Insights Generator
 *
 * Analyzes brand visibility data to generate actionable insights:
 * - Losing prompts (where brand doesn't appear but should)
 * - Content gaps (topics where competitors dominate)
 * - Sentiment drops (declining brand perception)
 * - Opportunities (areas to improve)
 */

import { createHash } from "node:crypto";

export type InsightSeverity = 'high' | 'medium' | 'low';
export type InsightCategory =
  | 'losing_prompt'
  | 'content_gap'
  | 'sentiment_drop'
  | 'position_loss'
  | 'competitor_gain'
  | 'opportunity'
  | 'success';

export interface Insight {
  /** Unique identifier */
  id: string;
  /** Insight category */
  category: InsightCategory;
  /** Severity level */
  severity: InsightSeverity;
  /** Short title */
  title: string;
  /** Detailed description */
  description: string;
  /** Affected platform(s) */
  platforms: string[];
  /** Related data */
  data: Record<string, any>;
  /** Suggested action */
  action?: string;
  /** When insight was generated */
  generatedAt: Date;
}

export interface InsightsAnalysis {
  /** All generated insights */
  insights: Insight[];
  /** Insights by severity */
  bySeverity: {
    high: Insight[];
    medium: Insight[];
    low: Insight[];
  };
  /** Insights by category */
  byCategory: Record<InsightCategory, Insight[]>;
  /** Summary stats */
  summary: {
    totalInsights: number;
    criticalCount: number;
    actionableCount: number;
  };
  /** Analysis metadata */
  metadata: {
    brandName: string;
    responsesAnalyzed: number;
    analyzedAt: Date;
  };
}

export interface ResponseWithMetrics {
  text: string;
  platform: string;
  promptText: string;
  brandMentioned: boolean;
  visibilityScore?: number;
  sentimentScore?: number;
  positionScore?: number;
  createdAt?: Date;
}

function insightId(category: InsightCategory, parts: string[]): string {
  const key = [category, ...parts].join('|');
  return `insight_${createHash('sha256').update(key).digest('hex').slice(0, 16)}`;
}

/**
 * Detect prompts where brand is not mentioned but competitors are
 */
function detectLosingPrompts(
  responses: ResponseWithMetrics[],
  brandName: string,
  competitors: string[]
): Insight[] {
  const insights: Insight[] = [];
  const promptGroups = new Map<string, ResponseWithMetrics[]>();

  // Group by prompt
  for (const r of responses) {
    const key = r.promptText;
    if (!promptGroups.has(key)) {
      promptGroups.set(key, []);
    }
    promptGroups.get(key)!.push(r);
  }

  // Find prompts where brand is missing but competitors appear
  for (const [prompt, promptResponses] of Array.from(promptGroups.entries())) {
    const brandAppears = promptResponses.some((r: ResponseWithMetrics) => r.brandMentioned);

    if (brandAppears) continue;

    // Check if competitors appear
    const competitorsFound: string[] = [];
    for (const comp of competitors) {
      const compAppears = promptResponses.some((r: ResponseWithMetrics) =>
        r.text.toLowerCase().includes(comp.toLowerCase())
      );
      if (compAppears) {
        competitorsFound.push(comp);
      }
    }

    if (competitorsFound.length > 0) {
      const platforms = Array.from(new Set(promptResponses.map((r: ResponseWithMetrics) => r.platform)));
      const severity: InsightSeverity = competitorsFound.length >= 3 ? 'high' :
        competitorsFound.length >= 2 ? 'medium' : 'low';

      insights.push({
        id: insightId('losing_prompt', [brandName, prompt]),
        category: 'losing_prompt',
        severity,
        title: `Missing from "${prompt.slice(0, 50)}..."`,
        description: `${brandName} is not mentioned in responses to this prompt, but ${competitorsFound.join(', ')} appear instead.`,
        platforms,
        data: {
          prompt,
          competitorsFound,
          responseCount: promptResponses.length,
        },
        action: `Consider creating content that positions ${brandName} as a relevant answer for this type of query.`,
        generatedAt: new Date(),
      });
    }
  }

  return insights;
}

/**
 * Detect content gaps where competitors dominate
 */
function detectContentGaps(
  responses: ResponseWithMetrics[],
  brandName: string,
  competitors: string[]
): Insight[] {
  const insights: Insight[] = [];

  // Check each platform for competitor dominance
  const platforms = Array.from(new Set(responses.map(r => r.platform)));

  for (const platform of platforms) {
    const platformResponses = responses.filter(r => r.platform === platform);
    const brandMentions = platformResponses.filter(r => r.brandMentioned).length;
    const brandRate = brandMentions / platformResponses.length;

    // Check each competitor's presence
    for (const comp of competitors) {
      const compMentions = platformResponses.filter(r =>
        r.text.toLowerCase().includes(comp.toLowerCase())
      ).length;
      const compRate = compMentions / platformResponses.length;

      // Competitor significantly outperforms brand
      if (compRate > brandRate + 0.2 && compRate > 0.3) {
        insights.push({
          id: insightId('content_gap', [brandName, platform, comp]),
          category: 'content_gap',
          severity: compRate > 0.6 ? 'high' : compRate > 0.4 ? 'medium' : 'low',
          title: `${comp} dominates on ${platform}`,
          description: `${comp} appears in ${Math.round(compRate * 100)}% of ${platform} responses, while ${brandName} only appears in ${Math.round(brandRate * 100)}%.`,
          platforms: [platform],
          data: {
            competitor: comp,
            competitorRate: compRate,
            brandRate,
            gap: compRate - brandRate,
          },
          action: `Analyze why ${platform} recommends ${comp} more frequently and optimize your content for this platform.`,
          generatedAt: new Date(),
        });
      }
    }
  }

  return insights;
}

/**
 * Detect sentiment drops (requires historical data)
 */
function detectSentimentDrops(
  currentResponses: ResponseWithMetrics[],
  previousResponses: ResponseWithMetrics[],
  brandName: string
): Insight[] {
  const insights: Insight[] = [];

  if (previousResponses.length === 0) return insights;

  // Calculate current vs previous sentiment
  const currentWithSentiment = currentResponses.filter(r => r.sentimentScore !== undefined);
  const previousWithSentiment = previousResponses.filter(r => r.sentimentScore !== undefined);

  if (currentWithSentiment.length === 0 || previousWithSentiment.length === 0) {
    return insights;
  }

  const currentAvg = currentWithSentiment.reduce((s, r) => s + (r.sentimentScore || 0), 0) / currentWithSentiment.length;
  const previousAvg = previousWithSentiment.reduce((s, r) => s + (r.sentimentScore || 0), 0) / previousWithSentiment.length;

  const drop = previousAvg - currentAvg;

  if (drop > 0.1) {
    // Check which platforms dropped most
    const platforms = Array.from(new Set(currentResponses.map(r => r.platform)));
    const droppedPlatforms: string[] = [];

    for (const platform of platforms) {
      const curr = currentWithSentiment.filter(r => r.platform === platform);
      const prev = previousWithSentiment.filter(r => r.platform === platform);

      if (curr.length > 0 && prev.length > 0) {
        const currAvg = curr.reduce((s, r) => s + (r.sentimentScore || 0), 0) / curr.length;
        const prevAvg = prev.reduce((s, r) => s + (r.sentimentScore || 0), 0) / prev.length;

        if (prevAvg - currAvg > 0.1) {
          droppedPlatforms.push(platform);
        }
      }
    }

    insights.push({
      id: insightId('sentiment_drop', [brandName]),
      category: 'sentiment_drop',
      severity: drop > 0.3 ? 'high' : drop > 0.2 ? 'medium' : 'low',
      title: 'Sentiment declining',
      description: `${brandName}'s average sentiment score dropped by ${Math.round(drop * 100)}% compared to the previous period.`,
      platforms: droppedPlatforms.length > 0 ? droppedPlatforms : platforms,
      data: {
        currentSentiment: Math.round(currentAvg * 100) / 100,
        previousSentiment: Math.round(previousAvg * 100) / 100,
        drop: Math.round(drop * 100) / 100,
      },
      action: 'Review recent responses for negative mentions and identify potential reputation issues.',
      generatedAt: new Date(),
    });
  }

  return insights;
}

/**
 * Detect position losses
 */
function detectPositionLosses(
  currentResponses: ResponseWithMetrics[],
  previousResponses: ResponseWithMetrics[],
  brandName: string
): Insight[] {
  const insights: Insight[] = [];

  if (previousResponses.length === 0) return insights;

  const platforms = Array.from(new Set(currentResponses.map(r => r.platform)));

  for (const platform of platforms) {
    const currPlatform = currentResponses.filter(r => r.platform === platform && r.positionScore !== undefined);
    const prevPlatform = previousResponses.filter(r => r.platform === platform && r.positionScore !== undefined);

    if (currPlatform.length === 0 || prevPlatform.length === 0) continue;

    const currAvg = currPlatform.reduce((s, r) => s + (r.positionScore || 0), 0) / currPlatform.length;
    const prevAvg = prevPlatform.reduce((s, r) => s + (r.positionScore || 0), 0) / prevPlatform.length;

    const drop = prevAvg - currAvg;

    if (drop > 10) {
      insights.push({
        id: insightId('position_loss', [brandName, platform]),
        category: 'position_loss',
        severity: drop > 25 ? 'high' : drop > 15 ? 'medium' : 'low',
        title: `Position dropped on ${platform}`,
        description: `${brandName}'s average position score on ${platform} decreased from ${Math.round(prevAvg)} to ${Math.round(currAvg)}.`,
        platforms: [platform],
        data: {
          currentPosition: Math.round(currAvg),
          previousPosition: Math.round(prevAvg),
          drop: Math.round(drop),
        },
        action: `Investigate why ${platform} is ranking ${brandName} lower. Consider content optimizations for this platform.`,
        generatedAt: new Date(),
      });
    }
  }

  return insights;
}

/**
 * Detect opportunities (good performance areas)
 */
function detectOpportunities(
  responses: ResponseWithMetrics[],
  brandName: string
): Insight[] {
  const insights: Insight[] = [];

  const platforms = Array.from(new Set(responses.map(r => r.platform)));

  for (const platform of platforms) {
    const platformResponses = responses.filter(r => r.platform === platform);
    const brandMentions = platformResponses.filter(r => r.brandMentioned);
    const mentionRate = brandMentions.length / platformResponses.length;

    // High mention rate but could be higher
    if (mentionRate >= 0.5 && mentionRate < 0.8) {
      insights.push({
        id: insightId('opportunity', [brandName, platform]),
        category: 'opportunity',
        severity: 'low',
        title: `Strong on ${platform} - room to grow`,
        description: `${brandName} appears in ${Math.round(mentionRate * 100)}% of ${platform} responses. With optimization, this could reach 80%+.`,
        platforms: [platform],
        data: {
          mentionRate,
          responseCount: platformResponses.length,
          mentionCount: brandMentions.length,
        },
        action: `Analyze high-performing prompts on ${platform} and replicate successful patterns.`,
        generatedAt: new Date(),
      });
    }

    // Excellent performance
    if (mentionRate >= 0.8) {
      insights.push({
        id: insightId('success', [brandName, platform]),
        category: 'success',
        severity: 'low',
        title: `Excellent visibility on ${platform}`,
        description: `${brandName} appears in ${Math.round(mentionRate * 100)}% of ${platform} responses - well above average.`,
        platforms: [platform],
        data: {
          mentionRate,
          responseCount: platformResponses.length,
        },
        generatedAt: new Date(),
      });
    }
  }

  return insights;
}

/**
 * Generate all insights for brand visibility
 */
export function generateInsights(
  currentResponses: ResponseWithMetrics[],
  brandName: string,
  options: {
    competitors?: string[];
    previousResponses?: ResponseWithMetrics[];
  } = {}
): InsightsAnalysis {
  const { competitors = [], previousResponses = [] } = options;

  const allInsights: Insight[] = [];

  // Run all detection functions
  allInsights.push(...detectLosingPrompts(currentResponses, brandName, competitors));
  allInsights.push(...detectContentGaps(currentResponses, brandName, competitors));
  allInsights.push(...detectSentimentDrops(currentResponses, previousResponses, brandName));
  allInsights.push(...detectPositionLosses(currentResponses, previousResponses, brandName));
  allInsights.push(...detectOpportunities(currentResponses, brandName));

  // Sort by severity
  const severityOrder: Record<InsightSeverity, number> = { high: 0, medium: 1, low: 2 };
  allInsights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Group by severity
  const bySeverity = {
    high: allInsights.filter(i => i.severity === 'high'),
    medium: allInsights.filter(i => i.severity === 'medium'),
    low: allInsights.filter(i => i.severity === 'low'),
  };

  // Group by category
  const byCategory: Record<InsightCategory, Insight[]> = {
    losing_prompt: [],
    content_gap: [],
    sentiment_drop: [],
    position_loss: [],
    competitor_gain: [],
    opportunity: [],
    success: [],
  };

  for (const insight of allInsights) {
    byCategory[insight.category].push(insight);
  }

  return {
    insights: allInsights,
    bySeverity,
    byCategory,
    summary: {
      totalInsights: allInsights.length,
      criticalCount: bySeverity.high.length,
      actionableCount: allInsights.filter(i => i.action).length,
    },
    metadata: {
      brandName,
      responsesAnalyzed: currentResponses.length,
      analyzedAt: new Date(),
    },
  };
}

/**
 * Get top actionable insights
 */
export function getTopInsights(
  currentResponses: ResponseWithMetrics[],
  brandName: string,
  options: {
    competitors?: string[];
    previousResponses?: ResponseWithMetrics[];
    limit?: number;
  } = {}
): Insight[] {
  const { limit = 5, ...restOptions } = options;
  const analysis = generateInsights(currentResponses, brandName, restOptions);

  // Return high severity first, then medium
  const actionable = analysis.insights.filter(i => i.action && i.category !== 'success');
  return actionable.slice(0, limit);
}
