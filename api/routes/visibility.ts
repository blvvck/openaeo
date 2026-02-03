

import { Router, Request, Response } from 'express';
import { storage } from '../data';
import { getActiveBrandConfig } from '../services/brand-config';
import {
  calculateVisibilityScore,
  PLATFORMS,
  type ResponseData,
} from '../services/analytics/visibility-calculator';
import { getTopInsights, type ResponseWithMetrics } from '../services/analytics/insights-generator';
import { analyzeCitations } from '../services/analytics/citation-tracker';
import { getSimpleSentiment } from '../services/analytics/sentiment-analyzer';
import { getSimplePositionScore } from '../services/analytics/position-scorer';
import type {
  VisibilityOverviewRequest,
  VisibilityOverviewResponse,
  ChangeItem,
  ContentItem,
  TrendDirection,
  VisibilityErrorCode,
  PlatformScore,
} from '@shared/types/visibility';
import type { Insight } from '@shared/types/insights';

/**
 * Platform icon mapping
 */
const PLATFORM_ICONS: Record<string, string> = {
  chatgpt: 'chatgpt',
  claude: 'claude',
  perplexity: 'perplexity',
  gemini: 'gemini',
  grok: 'grok',
  deepseek: 'deepseek',
};

/**
 * Platform display names
 */
const PLATFORM_NAMES: Record<string, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  grok: 'Grok',
  deepseek: 'DeepSeek',
};

const router = Router();

function firstTextIndex(text: string, terms: string[]): number {
  const lowerText = text.toLowerCase();
  return terms.reduce((earliest, term) => {
    const index = lowerText.indexOf(term.toLowerCase());
    return index >= 0 && index < earliest ? index : earliest;
  }, Number.POSITIVE_INFINITY);
}

function getObservedPosition(
  responses: Array<{ promptId: number; text: string; brandMentioned: boolean | null }>,
  promptIds: Set<number>,
  brandTerms: string[],
  competitorTerms: string[],
): { position: number | null; samples: number } {
  const positions = responses.flatMap((response) => {
    if (!promptIds.has(response.promptId) || !response.brandMentioned) return [];
    const brandIndex = firstTextIndex(response.text, brandTerms);
    if (!Number.isFinite(brandIndex)) return [];
    const competitorIndexes = competitorTerms
      .map((term) => firstTextIndex(response.text, [term]))
      .filter((index) => Number.isFinite(index));
    if (competitorIndexes.length === 0) return [];
    return [1 + competitorIndexes.filter((index) => index < brandIndex).length];
  }).sort((a, b) => a - b);

  if (positions.length < 2) return { position: null, samples: positions.length };
  const middle = Math.floor(positions.length / 2);
  const position = positions.length % 2 === 0
    ? Math.round((positions[middle - 1] + positions[middle]) / 2)
    : positions[middle];
  return { position, samples: positions.length };
}

// Cache for visibility overview (5 minute TTL)
interface CacheEntry {
  data: VisibilityOverviewResponse;
  timestamp: number;
}

const visibilityCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Maximum time range allowed (prevent expensive queries)
const MAX_TIME_RANGE_DAYS = 365;

/**
 * Calculate time window from time range
 */
function getTimeWindow(
  timeRange: VisibilityOverviewRequest['timeRange'],
  startDate?: string,
  endDate?: string
): { start: Date; end: Date; error?: string } {
  const now = new Date();
  const end = endDate ? new Date(endDate) : now;

  let start: Date;
  switch (timeRange) {
    case '1d':
      start = new Date(end.getTime() - 1 * 24 * 60 * 60 * 1000);
      break;
    case '3d':
      start = new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000);
      break;
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '14d':
      start = new Date(end.getTime() - 14 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '60d':
      start = new Date(end.getTime() - 60 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '365d':
      start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
      start = new Date('2020-01-01');
      break;
    case 'custom':
      if (!startDate || !endDate) {
        return { start: now, end: now, error: 'INVALID_TIME_RANGE' };
      }
      start = new Date(startDate);
      // Validate the dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { start: now, end: now, error: 'INVALID_TIME_RANGE' };
      }
      // Check range isn't too wide
      const daysDiff = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
      if (daysDiff > MAX_TIME_RANGE_DAYS) {
        return { start: now, end: now, error: 'TIME_RANGE_TOO_WIDE' };
      }
      break;
    default:
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return { start, end };
}

/**
 * Get cached data or null if expired/not found
 */
function getCachedData(cacheKey: string): VisibilityOverviewResponse | null {
  const cached = visibilityCache.get(cacheKey);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL_MS) {
    visibilityCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

/**
 * Cache visibility data
 */
function setCachedData(cacheKey: string, data: VisibilityOverviewResponse): void {
  visibilityCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Calculate trend direction from numeric change
 */
function getTrendDirection(current: number, previous: number): TrendDirection {
  if (previous === 0) return 'stable';
  const change = ((current - previous) / previous) * 100;
  if (change > 1) return 'up';
  if (change < -1) return 'down';
  return 'stable';
}

/**
 * Generate what changed items by comparing current vs previous metrics
 */
function generateWhatChanged(
  currentVisibility: ReturnType<typeof calculateVisibilityScore>,
  previousVisibility: ReturnType<typeof calculateVisibilityScore>,
  currentMentions: number,
  previousMentions: number,
  currentCitationRate: number,
  previousCitationRate: number
): ChangeItem[] {
  const changes: ChangeItem[] = [];

  // Score change
  if (Math.abs(currentVisibility.score - previousVisibility.score) > 2) {
    const direction = getTrendDirection(currentVisibility.score, previousVisibility.score);
    changes.push({
      metric: 'Visibility Score',
      direction,
      oldValue: previousVisibility.score,
      newValue: currentVisibility.score,
      message: direction === 'up'
        ? `Visibility score improved from ${previousVisibility.score} to ${currentVisibility.score}`
        : direction === 'down'
        ? `Visibility score dropped from ${previousVisibility.score} to ${currentVisibility.score}`
        : `Visibility score stable at ${currentVisibility.score}`,
    });
  }

  // Mention count change
  if (previousMentions > 0 && Math.abs(currentMentions - previousMentions) > 0) {
    const direction = getTrendDirection(currentMentions, previousMentions);
    const changePercent = Math.round(((currentMentions - previousMentions) / previousMentions) * 100);
    changes.push({
      metric: 'Total Mentions',
      direction,
      oldValue: previousMentions,
      newValue: currentMentions,
      message: direction === 'up'
        ? `Mentions increased by ${changePercent}% (${previousMentions} → ${currentMentions})`
        : direction === 'down'
        ? `Mentions decreased by ${Math.abs(changePercent)}% (${previousMentions} → ${currentMentions})`
        : `Mentions stable at ${currentMentions}`,
    });
  }

  // Citation rate change
  if (Math.abs(currentCitationRate - previousCitationRate) > 1) {
    const direction = getTrendDirection(currentCitationRate, previousCitationRate);
    changes.push({
      metric: 'Citation Rate',
      direction,
      oldValue: `${previousCitationRate}%`,
      newValue: `${currentCitationRate}%`,
      message: direction === 'up'
        ? `Citation rate improved from ${previousCitationRate}% to ${currentCitationRate}%`
        : direction === 'down'
        ? `Citation rate dropped from ${previousCitationRate}% to ${currentCitationRate}%`
        : `Citation rate stable at ${currentCitationRate}%`,
    });
  }

  // Platform coverage change
  const currentPlatformCount = currentVisibility.metadata.platformsCovered;
  const previousPlatformCount = previousVisibility.metadata.platformsCovered;
  if (currentPlatformCount !== previousPlatformCount) {
    const direction = getTrendDirection(currentPlatformCount, previousPlatformCount);
    changes.push({
      metric: 'Platform Coverage',
      direction,
      oldValue: previousPlatformCount,
      newValue: currentPlatformCount,
      message: direction === 'up'
        ? `Now mentioned on ${currentPlatformCount} platforms (was ${previousPlatformCount})`
        : `Platform presence dropped to ${currentPlatformCount} (was ${previousPlatformCount})`,
    });
  }

  return changes.slice(0, 5); // Limit to top 5 changes
}

/**
 * Transform generator insight to API insight format
 */
function transformInsightForVisibility(generatorInsight: any): Insight {
  return {
    id: generatorInsight.id,
    type: generatorInsight.category,
    priority: generatorInsight.severity,
    title: generatorInsight.title,
    description: generatorInsight.description,
    impact: generatorInsight.action || 'Review recommended',
    action: generatorInsight.action || 'Review the data and take appropriate action.',
    createdAt: generatorInsight.generatedAt.toISOString(),
    status: 'active',
    relatedData: {
      platforms: generatorInsight.platforms,
    },
  };
}

/**
 * GET /api/visibility/overview
 * Unified visibility data for Overview tab
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as VisibilityOverviewRequest['timeRange']) || '7d';
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const workspaceId = req.query.workspaceId as string | undefined;

    // Validate time range
    const timeWindow = getTimeWindow(timeRange, startDate, endDate);
    if (timeWindow.error) {
      const errorCode = timeWindow.error as VisibilityErrorCode;
      return res.status(400).json({
        code: errorCode,
        message: errorCode === 'TIME_RANGE_TOO_WIDE'
          ? `Time range cannot exceed ${MAX_TIME_RANGE_DAYS} days`
          : 'Invalid time range. Provide valid startDate and endDate for custom range.',
      });
    }

    const { start, end } = timeWindow;

    // Check cache
    const cacheKey = `visibility:overview:${timeRange}:${startDate || ''}:${endDate || ''}:${workspaceId || 'default'}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      // Update meta to reflect cache status
      cachedData.meta.dataFreshness = 'cached';
      cachedData.meta.cacheAge = Math.floor((Date.now() - (visibilityCache.get(cacheKey)?.timestamp || 0)) / 1000);
      return res.json(cachedData);
    }

    // Calculate previous period for comparison
    const periodLength = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - periodLength);
    const previousEnd = new Date(start.getTime());

    // Fetch all data in parallel (Promise.all - NO N+1)
    const [allResponses, competitors, activeBrandConfig, sources] = await Promise.all([
      storage.getResponsesWithPrompts(),
      storage.getCompetitors(),
      getActiveBrandConfig(),
      storage.getSources(),
    ]);

    // Check if brand is configured
    if (!activeBrandConfig) {
      return res.status(404).json({
        code: 'NO_BRAND' as VisibilityErrorCode,
        message: 'No brand configured for this workspace',
      });
    }

    const brandName = activeBrandConfig.name || 'Your Brand';

    // Filter responses by time window
    const currentResponses = allResponses.filter(r =>
      r.createdAt && new Date(r.createdAt) >= start && new Date(r.createdAt) <= end
    );
    const previousResponses = allResponses.filter(r =>
      r.createdAt && new Date(r.createdAt) >= previousStart && new Date(r.createdAt) < previousEnd
    );

    // If no data at all, return pending state
    if (allResponses.length === 0) {
      const emptyResponse: VisibilityOverviewResponse = {
        score: 0,
        previousScore: 0,
        trend: 0,
        trendDirection: 'stable',
        breakdown: {
          mentionCount: 0,
          mentionsTrend: 0,
          citationRate: 0,
          citationRateTrend: 0,
          sentimentBonus: 0,
          sentimentTrend: 'stable',
          platformDiversity: {
            active: 0,
            total: PLATFORMS.length,
          },
        },
        platforms: [],
        whatChanged: [],
        topContent: [],
        relatedInsights: [],
        meta: {
          lastUpdated: new Date().toISOString(),
          dataFreshness: 'pending',
        },
      };
      return res.json(emptyResponse);
    }

    // Transform responses for visibility calculator
    const toResponseData = (responses: typeof currentResponses): ResponseData[] =>
      responses.map(r => ({
        platform: (r as any).platform || 'chatgpt',
        text: r.text,
        brandMentioned: r.brandMentioned || false,
      }));

    // Calculate visibility scores for both periods
    const currentVisibility = calculateVisibilityScore(toResponseData(currentResponses), brandName);
    const previousVisibility = previousResponses.length > 0
      ? calculateVisibilityScore(toResponseData(previousResponses), brandName)
      : { score: 0, breakdown: { mentionRate: 0, position: 0, sentiment: 0, platformCoverage: 0 }, platforms: [], metadata: { totalResponses: 0, responsesWithMention: 0, platformsCovered: 0, totalPlatforms: PLATFORMS.length, averageSentiment: 0, averagePosition: 0, calculatedAt: new Date() } };

    // Calculate trend
    const visibilityTrend = previousVisibility.score > 0
      ? ((currentVisibility.score - previousVisibility.score) / previousVisibility.score) * 100
      : 0;
    const trendDirection = getTrendDirection(currentVisibility.score, previousVisibility.score);

    // Calculate mention metrics
    const currentMentions = currentResponses.filter(r => r.brandMentioned).length;
    const previousMentions = previousResponses.filter(r => r.brandMentioned).length;
    const mentionsTrend = previousMentions > 0
      ? ((currentMentions - previousMentions) / previousMentions) * 100
      : 0;

    // Analyze citations
    const citationAnalysis = analyzeCitations(
      currentResponses.map(r => ({ text: r.text, platform: (r as any).platform || 'chatgpt' })),
      brandName,
      PLATFORMS.length
    );

    // Calculate citation rate (responses with citations / total responses)
    const responsesWithCitations = currentResponses.filter(r =>
      citationAnalysis.citations.some(c => c.context.toLowerCase().includes(brandName.toLowerCase()))
    ).length;
    const currentCitationRate = currentResponses.length > 0
      ? Math.round((responsesWithCitations / currentResponses.length) * 100)
      : 0;

    // Previous period citation rate
    const previousCitationAnalysis = previousResponses.length > 0
      ? analyzeCitations(
          previousResponses.map(r => ({ text: r.text, platform: (r as any).platform || 'chatgpt' })),
          brandName,
          PLATFORMS.length
        )
      : { citations: [] };
    const previousResponsesWithCitations = previousResponses.filter(r =>
      previousCitationAnalysis.citations.some(c => c.context.toLowerCase().includes(brandName.toLowerCase()))
    ).length;
    const previousCitationRate = previousResponses.length > 0
      ? Math.round((previousResponsesWithCitations / previousResponses.length) * 100)
      : 0;
    const citationRateTrend = previousCitationRate > 0
      ? ((currentCitationRate - previousCitationRate) / previousCitationRate) * 100
      : 0;

    // Calculate sentiment bonus
    const brandMentionResponses = currentResponses.filter(r => r.brandMentioned);
    const sentimentScores = brandMentionResponses.map(r => getSimpleSentiment(r.text).score);
    const avgSentiment = sentimentScores.length > 0
      ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
      : 0;
    const sentimentBonus = Math.round(avgSentiment * 10); // -10 to +10 range

    const previousBrandMentionResponses = previousResponses.filter(r => r.brandMentioned);
    const previousSentimentScores = previousBrandMentionResponses.map(r => getSimpleSentiment(r.text).score);
    const previousAvgSentiment = previousSentimentScores.length > 0
      ? previousSentimentScores.reduce((a, b) => a + b, 0) / previousSentimentScores.length
      : 0;
    const sentimentTrend = getTrendDirection(avgSentiment, previousAvgSentiment);

    // Sentiment breakdown using labels from sentiment analyzer
    const sentimentResults = brandMentionResponses.map(r => getSimpleSentiment(r.text));
    const sentimentBreakdown = {
      positive: sentimentResults.filter(s => s.label === 'positive').length,
      neutral: sentimentResults.filter(s => s.label === 'neutral').length,
      negative: sentimentResults.filter(s => s.label === 'negative').length,
    };

    // Top citation sources (domains)
    const citationSources = citationAnalysis.topDomains.slice(0, 4).map(d => d.domain);

    // Platform diversity
    const activePlatforms = currentVisibility.platforms.filter(p => p.mentioned).length;

    // Pre-compute citations by platform
    const citationsByPlatform = new Map<string, number>();
    for (const citation of citationAnalysis.citations) {
      const platform = citation.platform || 'unknown';
      citationsByPlatform.set(platform, (citationsByPlatform.get(platform) || 0) + 1);
    }

    // Build platform scores for pills display
    const platformScores: PlatformScore[] = PLATFORMS.map(platformId => {
      const platformData = currentVisibility.platforms.find(p => p.platform === platformId);
      const prevPlatformData = previousVisibility.platforms?.find(p => p.platform === platformId);

      const score = platformData?.visibilityScore || 0;
      const prevScore = prevPlatformData?.visibilityScore || 0;
      const trend = prevScore > 0 ? ((score - prevScore) / prevScore) * 100 : 0;

      // Calculate citations for this platform
      const citations = citationsByPlatform.get(platformId) || 0;

      // Calculate sentiment for this platform
      const platformResponses = brandMentionResponses.filter(r => (r as any).platform === platformId);
      let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
      if (platformResponses.length > 0) {
        const platformSentiments = platformResponses.map(r => getSimpleSentiment(r.text));
        const positiveCount = platformSentiments.filter(s => s.label === 'positive').length;
        const negativeCount = platformSentiments.filter(s => s.label === 'negative').length;
        const neutralCount = platformSentiments.filter(s => s.label === 'neutral').length;

        if (positiveCount >= neutralCount && positiveCount >= negativeCount) {
          sentiment = 'positive';
        } else if (negativeCount >= positiveCount && negativeCount >= neutralCount) {
          sentiment = 'negative';
        }
      }

      return {
        id: platformId,
        name: PLATFORM_NAMES[platformId] || platformId,
        icon: PLATFORM_ICONS[platformId] || platformId,
        score: Math.round(score),
        mentions: platformData?.mentionCount || 0,
        trend: Math.round(trend * 10) / 10,
        citations,
        sentiment,
      };
    })
      .filter(p => p.score > 0 || p.mentions > 0)  // Only include platforms with activity
      .sort((a, b) => b.score - a.score);          // Sort by score descending

    // Generate what changed
    const whatChanged = generateWhatChanged(
      currentVisibility,
      previousVisibility,
      currentMentions,
      previousMentions,
      currentCitationRate,
      previousCitationRate
    );

    // Get top content (from sources or citations)
    const topContent: ContentItem[] = citationAnalysis.topDomains.slice(0, 5).map(d => ({
      url: `https://${d.domain}`,
      path: '/',
      title: d.domain,
      citations: d.citationCount,
      trend: 0, // Would need historical comparison
    }));

    // Generate insights
    const competitorNames = competitors.map(c => c.name);
    const responsesForInsights: ResponseWithMetrics[] = currentResponses.map(r => ({
      text: r.text,
      platform: (r as any).platform || 'chatgpt',
      promptText: r.prompt?.text || '',
      brandMentioned: r.brandMentioned || false,
      sentimentScore: getSimpleSentiment(r.text).score,
      positionScore: r.brandMentioned ? getSimplePositionScore(r.text, brandName) : 0,
    }));

    const previousForInsights: ResponseWithMetrics[] = previousResponses.map(r => ({
      text: r.text,
      platform: (r as any).platform || 'chatgpt',
      promptText: r.prompt?.text || '',
      brandMentioned: r.brandMentioned || false,
      sentimentScore: getSimpleSentiment(r.text).score,
      positionScore: r.brandMentioned ? getSimplePositionScore(r.text, brandName) : 0,
    }));

    const topInsights = getTopInsights(responsesForInsights, brandName, {
      competitors: competitorNames,
      previousResponses: previousForInsights,
      limit: 3,
    });

    const relatedInsights: Insight[] = topInsights.map(transformInsightForVisibility);

    // Build response
    const response: VisibilityOverviewResponse = {
      score: Math.round(currentVisibility.score),
      previousScore: Math.round(previousVisibility.score),
      trend: Math.round(visibilityTrend * 10) / 10,
      trendDirection,
      breakdown: {
        mentionCount: currentMentions,
        mentionsTrend: Math.round(mentionsTrend * 10) / 10,
        citationRate: currentCitationRate,
        citationRateTrend: Math.round(citationRateTrend * 10) / 10,
        citationSources,
        sentimentBonus,
        sentimentTrend,
        sentimentBreakdown,
        platformDiversity: {
          active: activePlatforms,
          total: PLATFORMS.length,
        },
      },
      platforms: platformScores,
      whatChanged,
      topContent,
      relatedInsights,
      meta: {
        lastUpdated: new Date().toISOString(),
        dataFreshness: 'live',
      },
    };

    // Cache the response
    setCachedData(cacheKey, response);

    res.json(response);
  } catch (error) {
    console.error('[Visibility API] Error fetching visibility overview:', error);
    res.status(500).json({
      code: 'SERVER_ERROR' as VisibilityErrorCode,
      message: 'Unable to load visibility data. Please try again.',
    });
  }
});

/**
 * GET /api/visibility/topics
 * Topic-level visibility data for By Topic tab
 * Returns 4 categories: top, newly-won, underperforming, lost
 */
router.get('/topics', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as string) || '30d';

    // Calculate date ranges
    const now = new Date();
    const match = timeRange.match(/^(\d+)d$/);
    const days = match ? parseInt(match[1]) : 30;
    const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousFromDate = new Date(fromDate.getTime() - days * 24 * 60 * 60 * 1000);

    const [topics, currentResponses, previousResponses, prompts, competitors, brandConfig] = await Promise.all([
      storage.getTopics(),
      storage.getResponsesInTimeRange(fromDate, now),
      storage.getResponsesInTimeRange(previousFromDate, fromDate),
      storage.getLatestPrompts(),
      storage.getCompetitors(),
      getActiveBrandConfig(),
    ]);
    const configuredCompetitors = Array.isArray(brandConfig?.competitorList)
      ? brandConfig.competitorList.filter((name): name is string => typeof name === 'string')
      : [];
    const competitorTerms = Array.from(new Set([...competitors.map(({ name }) => name), ...configuredCompetitors]));
    const brandAliases = Array.isArray(brandConfig?.aliases)
      ? brandConfig.aliases.filter((name): name is string => typeof name === 'string')
      : [];
    const brandTerms = Array.from(new Set([brandConfig?.name, ...brandAliases].filter((name): name is string => Boolean(name))));
    const topicCoverage = new Map<number, { current: number; previous: number; previousMentions: number }>();

    interface TopicMetricItem {
      id: number;
      name: string;
      mentions: number;
      position: number | null;
      trend: number;
      previousPosition?: number;
      trendLabel?: string;
    }

    // Build topic metrics
    const topicMetrics: TopicMetricItem[] = topics.map(topic => {
      // Find prompts for this topic
      const topicPromptIdList = prompts
        .filter(p => p.topicId === topic.id || (p as any).topicIds?.includes(topic.id))
        .map(p => p.id);

      // Count mentions in current period
      const currentMentions = currentResponses.filter(
        r => topicPromptIdList.includes(r.promptId) && r.brandMentioned
      ).length;

      // Count mentions in previous period
      const previousMentions = previousResponses.filter(
        r => topicPromptIdList.includes(r.promptId) && r.brandMentioned
      ).length;

      // Calculate trend
      const trend = previousMentions > 0
        ? Math.round(((currentMentions - previousMentions) / previousMentions) * 100)
        : currentMentions > 0 ? 100 : 0;

      const topicPromptIds = new Set(topicPromptIdList);
      const currentPosition = getObservedPosition(currentResponses, topicPromptIds, brandTerms, competitorTerms);
      const previousPosition = getObservedPosition(previousResponses, topicPromptIds, brandTerms, competitorTerms);
      const currentResponseCount = currentResponses.filter((r) => topicPromptIds.has(r.promptId)).length;
      const previousResponseCount = previousResponses.filter((r) => topicPromptIds.has(r.promptId)).length;
      topicCoverage.set(topic.id, { current: currentResponseCount, previous: previousResponseCount, previousMentions });

      // Generate trend label
      let trendLabel = 'Stable';
      if (trend > 10) trendLabel = `+${trend}%`;
      else if (trend < -10) trendLabel = `${trend}%`;

      return {
        id: topic.id,
        name: topic.name,
        mentions: currentMentions,
        position: currentPosition.position,
        trend,
        previousPosition: previousPosition.position ?? undefined,
        trendLabel,
      };
    });

    const sortedByPosition = [...topicMetrics].sort((a, b) => {
      if (a.position === null) return 1;
      if (b.position === null) return -1;
      return a.position - b.position || b.mentions - a.mentions;
    });

    // Top Topics: Observed position 1-3
    const topTopics = sortedByPosition
      .filter(t => t.position !== null && t.position <= 3)
      .slice(0, 7)
      .map(t => ({
        ...t,
        subtitle: `#${t.position} rank • ${t.mentions} mentions`,
      }));

    // Newly-won Topics: Entered the top three positions with prior response coverage
    const newlyWonTopics = sortedByPosition
      .filter(t => {
        const coverage = topicCoverage.get(t.id);
        if (t.position === null || t.position > 3 || !coverage || coverage.previous < 2) return false;
        if (t.previousPosition !== undefined) return t.previousPosition > 3;
        return coverage.previousMentions === 0;
      })
      .sort((a, b) => (a.position ?? 99) - (b.position ?? 99) || b.trend - a.trend)
      .slice(0, 7)
      .map(t => ({
        ...t,
        subtitle: `${t.trend > 0 ? '+' : ''}${t.trend}% growth`,
      }));

    // Underperforming Topics: Adequate response coverage but outside the top three or unranked
    const underperformingTopics = topicMetrics
      .filter(t => {
        const hasPrompts = prompts.some(p => p.topicId === t.id || (p as any).topicIds?.includes(t.id));
        const coverage = topicCoverage.get(t.id);
        if (!hasPrompts || !coverage || coverage.current < 2) return false;
        return t.position !== null ? t.position > 3 : t.mentions === 0;
      })
      .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
      .slice(0, 7)
      .map(t => ({
        ...t,
        subtitle: t.position ? `#${t.position} rank • Needs attention` : 'No mentions yet',
      }));

    // Lost Topics: Fell from the top three to a lower or unranked position
    const lostTopics = topicMetrics
      .filter(t => {
        const coverage = topicCoverage.get(t.id);
        if (!t.previousPosition || t.previousPosition > 3) return false;
        if (t.position !== null) return t.position > 3;
        return t.mentions === 0 && Boolean(coverage && coverage.current >= 2);
      })
      .sort((a, b) => (b.previousPosition ?? 0) - (a.previousPosition ?? 0))
      .slice(0, 7)
      .map(t => ({
        ...t,
        subtitle: `Dropped from #${t.previousPosition} to ${t.position ? `#${t.position}` : 'unranked'}`,
      }));

    res.json({
      topTopics,
      newlyWonTopics,
      underperformingTopics,
      lostTopics,
      summary: {
        totalTopics: topics.length,
        topicsWithMentions: topicMetrics.filter(t => t.mentions > 0).length,
        averageTrend: topicMetrics.length > 0
          ? Math.round(topicMetrics.reduce((sum, t) => sum + t.trend, 0) / topicMetrics.length)
          : 0,
      },
    });
  } catch (error) {
    console.error('[Visibility API] Error fetching topic analysis:', error);
    res.status(500).json({
      code: 'SERVER_ERROR' as VisibilityErrorCode,
      message: 'Failed to fetch topic analysis',
    });
  }
});

export default router;
