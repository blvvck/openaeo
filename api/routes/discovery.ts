

import { Router, Request, Response } from 'express';
import { storage } from '../data';
import { getActiveBrandConfig } from '../services/brand-config';
import { currentWorkspaceId } from '../context/workspace-context';
import { getSimpleSentiment } from '../services/analytics/sentiment-analyzer';
import { analyzeCitations, type Citation as AnalysisCitation } from '../services/analytics/citation-tracker';
import type {
  BuyerJourneyStage,
  BUYER_JOURNEY_STAGE_NAMES,
  Prompt as PromptType,
  PromptDetail,
  FunnelCoverage,
  FunnelStage,
  TrendingPrompt,
  Topic,
  Sentiment,
  PromptsResponse,
  PromptDetailResponse,
  FunnelCoverageResponse,
  TopicsResponse,
  TrendingPromptsResponse,
  Citation,
  PromptCitations,
  PlatformMention,
  PromptCompetitor,
} from '@shared/types/prompts';

const router = Router();

// =============================================================================
// CONSTANTS
// =============================================================================

const BUYER_JOURNEY_STAGES: BuyerJourneyStage[] = [
  'problem-aware',
  'solution-seeking',
  'comparing',
  'buying',
  'using',
];

const STAGE_NAMES: Record<BuyerJourneyStage, string> = {
  'problem-aware': 'Problem aware',
  'solution-seeking': 'Solution seeking',
  'comparing': 'Comparing',
  'buying': 'Buying',
  'using': 'Using',
};

const PLATFORM_NAMES: Record<string, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  grok: 'Grok',
  deepseek: 'DeepSeek',
  ai_mode: 'AI Mode',
  ai_overview: 'AI Overview',
};

// Social domains for citation classification
const SOCIAL_DOMAINS = new Set([
  'reddit.com', 'twitter.com', 'x.com', 'linkedin.com',
  'facebook.com', 'news.ycombinator.com', 'quora.com',
  'discord.com', 'slack.com', 'medium.com', 'substack.com',
  'youtube.com', 'instagram.com', 'tiktok.com',
]);

// =============================================================================
// CACHE
// =============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// =============================================================================
// HELPERS
// =============================================================================

function getTimeWindow(timeRange: string, startDate?: unknown, endDate?: unknown): { start: Date; end: Date; error?: string } {
  const now = new Date();
  const end = endDate ? new Date(String(endDate)) : now;
  let start: Date;

  if (timeRange === 'all') {
    start = new Date(2020, 0, 1);
  } else if (timeRange === 'custom') {
    if (!startDate || !endDate) return { start: now, end: now, error: 'INVALID_TIME_RANGE' };
    start = new Date(String(startDate));
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return { start: now, end: now, error: 'INVALID_TIME_RANGE' };
    }
    return { start, end };
  } else {
    const match = timeRange.match(/^(\d+)d$/);
    start = match
      ? new Date(end.getTime() - parseInt(match[1], 10) * 24 * 60 * 60 * 1000)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { start, end };
}

function getDominantSentiment(sentiments: Sentiment[]): Sentiment {
  const counts: Record<Sentiment, number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
    mixed: 0,
  };

  for (const s of sentiments) {
    counts[s]++;
  }

  // Prioritize negative (surface problems first), then positive, then neutral
  if (counts.negative >= counts.positive && counts.negative >= counts.neutral) {
    return counts.negative > 0 ? 'negative' : 'neutral';
  }
  if (counts.positive >= counts.neutral) {
    return counts.positive > 0 ? 'positive' : 'neutral';
  }
  return 'neutral';
}

function classifyCitation(
  domain: string,
  brandDomains: string[]
): 'owned' | 'third-party' | 'social' | 'other' {
  const lowerDomain = domain.toLowerCase();

  // Check if owned
  for (const brandDomain of brandDomains) {
    if (lowerDomain.endsWith(brandDomain.toLowerCase())) {
      return 'owned';
    }
  }

  // Check if social
  for (const socialDomain of Array.from(SOCIAL_DOMAINS)) {
    if (lowerDomain.endsWith(socialDomain) || lowerDomain === socialDomain) {
      return 'social';
    }
  }

  // Everything else is third-party
  return 'third-party';
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/discovery/overview
 * Returns funnel coverage statistics
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as string) || '30d';
    const workspaceId = currentWorkspaceId();
    if (!workspaceId) return res.status(401).json({ message: 'Workspace context is required' });
    const cacheKey = `discovery:overview:${workspaceId}:${timeRange}:${String(req.query.startDate ?? '')}:${String(req.query.endDate ?? '')}`;

    // Check cache
    const cached = getCached<FunnelCoverageResponse>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const { start, end, error } = getTimeWindow(timeRange, req.query.startDate, req.query.endDate);
    if (error) return res.status(400).json({ code: error, message: 'Invalid custom time range' });
    const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));

    // Get data
    const [
      currentResponses,
      previousResponses,
      allPrompts,
    ] = await Promise.all([
      storage.getResponsesInTimeRange(start, end),
      storage.getResponsesInTimeRange(previousStart, start),
      storage.getPromptsWithTopics(),
    ]);

    // Build prompt-to-stage mapping
    const promptStages = new Map<number, BuyerJourneyStage>();
    for (const prompt of allPrompts) {
      const stages = (prompt as any).journeyStages as string[] | undefined;
      if (stages && stages.length > 0) {
        // Use the first stage as the primary stage
        promptStages.set(prompt.id, stages[0] as BuyerJourneyStage);
      }
    }

    // Calculate coverage per stage
    const stages: FunnelStage[] = BUYER_JOURNEY_STAGES.map(stageId => {
      // Get prompts for this stage
      const stagePrompts = allPrompts.filter(p => {
        const stages = (p as any).journeyStages as string[] | undefined;
        return stages?.includes(stageId);
      });
      const stagePromptIds = new Set(stagePrompts.map(p => p.id));

      const currentMentions = new Set(currentResponses
        .filter(r => stagePromptIds.has(r.promptId) && r.brandMentioned)
        .map(r => r.promptId)).size;

      const previousMentions = new Set(previousResponses
        .filter(r => stagePromptIds.has(r.promptId) && r.brandMentioned)
        .map(r => r.promptId)).size;

      // Calculate coverage
      const promptCount = stagePrompts.length;
      const mentionCount = currentMentions;
      const coverage = promptCount > 0
        ? Math.round((mentionCount / promptCount) * 100)
        : 0;

      // Calculate trend
      const trend = previousMentions > 0
        ? Math.round(((currentMentions - previousMentions) / previousMentions) * 100)
        : currentMentions > 0 ? 100 : 0;

      return {
        id: stageId,
        name: STAGE_NAMES[stageId],
        coverage,
        promptCount,
        mentionCount,
        trend,
      };
    });

    // Find strongest and weakest stages
    const sortedByPriorityForWeakest = [...stages]
      .filter(s => s.promptCount > 0)
      .sort((a, b) => a.coverage - b.coverage);

    const sortedByPriorityForStrongest = [...stages]
      .filter(s => s.promptCount > 0)
      .sort((a, b) => b.coverage - a.coverage);

    const strongestStage = sortedByPriorityForStrongest[0]?.id || 'comparing';
    const weakestStage = sortedByPriorityForWeakest[0]?.id || 'problem-aware';

    // Generate insight
    const strongest = stages.find(s => s.id === strongestStage);
    const weakest = stages.find(s => s.id === weakestStage);
    let insight: string | undefined;

    if (strongest && weakest && strongest.coverage > 0) {
      if (strongest.coverage >= 60) {
        insight = `Strong in ${strongest.name.toLowerCase()} queries (${strongest.coverage}%). Focus on ${weakest.name.toLowerCase()} content to capture buyers earlier in their journey.`;
      } else if (strongest.coverage >= 30) {
        insight = `Balanced coverage across stages. Maintain content freshness to stay competitive.`;
      } else {
        insight = `Weak across all stages. Start with ${strongestStage === 'comparing' ? 'comparison' : strongest.name.toLowerCase()} queries where purchase intent is highest.`;
      }
    }

    const response: FunnelCoverageResponse = {
      stages,
      totalPrompts: allPrompts.length,
      totalMentions: currentResponses.filter(r => r.brandMentioned).length,
      strongestStage,
      weakestStage,
      insight,
      meta: {
        cacheAge: 0,
        lastUpdated: new Date().toISOString(),
        dataFreshness: 'live',
      },
    };

    setCache(cacheKey, response);
    res.json(response);
  } catch (error) {
    console.error('[Discovery API] Error fetching overview:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to fetch funnel coverage',
    });
  }
});

/**
 * GET /api/discovery/prompts
 * Returns paginated prompt list with filters
 */
router.get('/prompts', async (req: Request, res: Response) => {
  try {
    const {
      timeRange = '30d',
      stage,
      topic,
      sentiment,
      search,
      sortBy = 'mentions',
      sortDir = 'desc',
      limit = '25',
      offset = '0',
    } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 25, 100);
    const offsetNum = parseInt(offset as string) || 0;

    const { start, end, error } = getTimeWindow(timeRange as string, req.query.startDate, req.query.endDate);
    if (error) return res.status(400).json({ code: error, message: 'Invalid custom time range' });
    const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));

    // Get data in parallel
    const [
      currentResponses,
      previousResponses,
      allPrompts,
      topics,
      activeBrandConfig,
    ] = await Promise.all([
      storage.getResponsesInTimeRange(start, end),
      storage.getResponsesInTimeRange(previousStart, start),
      storage.getPromptsWithTopics(),
      storage.getTopics(),
      getActiveBrandConfig(),
    ]);

    const topicMap = new Map(topics.map(t => [t.id, t.name]));
    const brandName = activeBrandConfig?.name || 'Your Brand';

    // Build prompt metrics
    const promptMetrics: PromptType[] = allPrompts.map(prompt => {
      const promptResponses = currentResponses.filter(r => r.promptId === prompt.id);
      const previousPromptResponses = previousResponses.filter(r => r.promptId === prompt.id);

      const mentionResponses = promptResponses.filter(r => r.brandMentioned);
      const previousMentionResponses = previousPromptResponses.filter(r => r.brandMentioned);

      const mentions = mentionResponses.length;
      const previousMentions = previousMentionResponses.length;
      const trend = previousMentions > 0
        ? Math.round(((mentions - previousMentions) / previousMentions) * 100)
        : mentions > 0 ? 100 : 0;

      // Get platforms where brand is mentioned
      const mentionedPlatforms = Array.from(
        new Set(mentionResponses.map(r => r.platform || 'unknown').filter(Boolean))
      );

      // Calculate dominant sentiment
      const sentiments = mentionResponses.map(r => {
        const result = getSimpleSentiment(r.text);
        return result.label as Sentiment;
      });
      const dominantSentiment = getDominantSentiment(sentiments);

      // Count citations
      const citationCount = promptResponses.filter(r =>
        r.text && (r.text.includes('http://') || r.text.includes('https://'))
      ).length;

      // Get journey stages
      const journeyStages = (prompt as any).journeyStages as string[] | undefined;
      const primaryStage = journeyStages?.[0] as BuyerJourneyStage | undefined;

      // Get topic info
      const topicIds = (prompt as any).topicIds ?? (prompt.topicId ? [prompt.topicId] : []);
      const topicName = topicIds.length > 0 ? topicMap.get(topicIds[0]) : undefined;

      // Get dates
      const responseDates = promptResponses.map(r => r.createdAt).filter(Boolean);
      const firstSeen = responseDates.length > 0
        ? new Date(Math.min(...responseDates.map(d => new Date(d!).getTime()))).toISOString()
        : prompt.createdAt?.toISOString() || new Date().toISOString();
      const lastSeen = responseDates.length > 0
        ? new Date(Math.max(...responseDates.map(d => new Date(d!).getTime()))).toISOString()
        : prompt.createdAt?.toISOString() || new Date().toISOString();

      return {
        id: String(prompt.id),
        text: prompt.text,
        stage: primaryStage || 'problem-aware',
        stageName: primaryStage ? STAGE_NAMES[primaryStage] : 'Problem aware',
        topic: topicIds[0] ? String(topicIds[0]) : undefined,
        topicName,
        platforms: mentionedPlatforms,
        mentions,
        trend,
        firstSeen,
        lastSeen,
        dominantSentiment,
        citationCount,
      };
    });

    // Apply filters
    let filtered = promptMetrics;

    if (stage) {
      filtered = filtered.filter(p => p.stage === stage);
    }

    if (topic) {
      filtered = filtered.filter(p => p.topic === topic);
    }

    if (sentiment) {
      filtered = filtered.filter(p => p.dominantSentiment === sentiment);
    }

    if (search) {
      const searchLower = (search as string).toLowerCase();
      filtered = filtered.filter(p => p.text.toLowerCase().includes(searchLower));
    }

    // Sort
    const sortDirection = sortDir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'mentions':
          return (b.mentions - a.mentions) * sortDirection;
        case 'trend':
          return (b.trend - a.trend) * sortDirection;
        case 'date':
          return (new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()) * sortDirection;
        case 'sentiment':
          const sentimentOrder: Record<Sentiment, number> = {
            negative: 3,
            positive: 2,
            neutral: 1,
            mixed: 0,
          };
          return (sentimentOrder[b.dominantSentiment] - sentimentOrder[a.dominantSentiment]) * sortDirection;
        default:
          return (b.mentions - a.mentions) * sortDirection;
      }
    });

    // Paginate
    const total = filtered.length;
    const prompts = filtered.slice(offsetNum, offsetNum + limitNum);
    const hasMore = offsetNum + limitNum < total;

    const response: PromptsResponse = {
      prompts,
      total,
      hasMore,
      meta: {
        cacheAge: 0,
        lastUpdated: new Date().toISOString(),
        dataFreshness: 'live',
      },
    };

    res.json(response);
  } catch (error) {
    console.error('[Discovery API] Error fetching prompts:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to fetch prompts',
    });
  }
});

/**
 * GET /api/discovery/prompts/:id
 * Returns detailed information for a single prompt
 */
router.get('/prompts/:id', async (req: Request, res: Response) => {
  try {
    const promptId = parseInt(req.params.id);
    if (isNaN(promptId)) {
      return res.status(400).json({ error: 'Invalid prompt ID' });
    }

    const timeRange = (req.query.timeRange as string) || '30d';
    const { start, end, error } = getTimeWindow(timeRange, req.query.startDate, req.query.endDate);
    if (error) return res.status(400).json({ code: error, message: 'Invalid custom time range' });

    // Get data
    const [
      prompt,
      allPrompts,
      responses,
      competitors,
      topics,
      activeBrandConfig,
    ] = await Promise.all([
      storage.getPromptById(promptId),
      storage.getPromptsWithTopics(),
      storage.getResponsesInTimeRange(start, end),
      storage.getCompetitors(),
      storage.getTopics(),
      getActiveBrandConfig(),
    ]);

    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    const brandName = activeBrandConfig?.name || 'Your Brand';
    const brandDomains = activeBrandConfig?.domain ? [activeBrandConfig.domain] : [];
    const topicMap = new Map(topics.map(t => [t.id, t.name]));

    // Get responses for this prompt
    const promptResponses = responses.filter(r => r.promptId === promptId);
    const mentionResponses = promptResponses.filter(r => r.brandMentioned);

    // Build platform details with sentiment
    const platformsWithData = new Map<string, {
      responses: typeof promptResponses;
      mentioned: boolean;
    }>();

    for (const r of promptResponses) {
      const platform = r.platform || 'unknown';
      if (!platformsWithData.has(platform)) {
        platformsWithData.set(platform, { responses: [], mentioned: false });
      }
      const data = platformsWithData.get(platform)!;
      data.responses.push(r);
      if (r.brandMentioned) {
        data.mentioned = true;
      }
    }

    const platformDetails: PlatformMention[] = Array.from(platformsWithData.entries()).map(
      ([platformId, data]) => {
        const mentionedResponses = data.responses.filter(r => r.brandMentioned);
        let sentiment: Sentiment | undefined;
        let snippet: string | undefined;

        if (mentionedResponses.length > 0) {
          // Get sentiment
          const sentiments = mentionedResponses.map(r =>
            getSimpleSentiment(r.text).label as Sentiment
          );
          sentiment = getDominantSentiment(sentiments);

          // Get snippet
          const firstMention = mentionedResponses[0];
          const brandIndex = firstMention.text.toLowerCase().indexOf(brandName.toLowerCase());
          if (brandIndex >= 0) {
            const snippetStart = Math.max(0, brandIndex - 50);
            const snippetEnd = Math.min(firstMention.text.length, brandIndex + brandName.length + 100);
            snippet = (snippetStart > 0 ? '...' : '') +
              firstMention.text.slice(snippetStart, snippetEnd).trim() +
              (snippetEnd < firstMention.text.length ? '...' : '');
          } else {
            snippet = firstMention.text.slice(0, 150) + (firstMention.text.length > 150 ? '...' : '');
          }
        }

        // Get citations for this platform
        const platformCitations: Citation[] = [];
        const citationAnalysis = analyzeCitations(
          data.responses.map(r => ({ text: r.text, platform: platformId })),
          brandName,
          1
        );
        for (const c of citationAnalysis.citations) {
          const citationType = classifyCitation(c.domain, brandDomains);
          platformCitations.push({
            url: `https://${c.domain}`,
            displayUrl: c.domain,
            domain: c.domain,
            type: citationType,
            platforms: [platformId],
          });
        }

        return {
          platformId,
          platformName: PLATFORM_NAMES[platformId] || platformId,
          mentioned: data.mentioned,
          snippet,
          sentiment,
          citations: platformCitations.length > 0 ? platformCitations : undefined,
        };
      }
    );

    // Analyze citations across all responses
    const citationAnalysis = analyzeCitations(
      promptResponses.map(r => ({ text: r.text, platform: r.platform || 'unknown' })),
      brandName,
      10
    );

    // Categorize citations
    const ownedCitations: Citation[] = [];
    const thirdPartyCitations: Citation[] = [];
    const socialCitations: Citation[] = [];
    const otherCitations: Citation[] = [];

    for (const c of citationAnalysis.citations) {
      const citationType = classifyCitation(c.domain, brandDomains);
      const citation: Citation = {
        url: `https://${c.domain}`,
        displayUrl: c.domain,
        domain: c.domain,
        type: citationType,
        platforms: [c.platform],
      };

      switch (citationType) {
        case 'owned':
          ownedCitations.push(citation);
          break;
        case 'social':
          socialCitations.push(citation);
          break;
        case 'third-party':
          thirdPartyCitations.push(citation);
          break;
        default:
          otherCitations.push(citation);
      }
    }

    const totalCitations = ownedCitations.length + thirdPartyCitations.length +
      socialCitations.length + otherCitations.length;

    const citations: PromptCitations = {
      owned: ownedCitations,
      thirdParty: thirdPartyCitations,
      social: socialCitations,
      other: otherCitations,
      summary: {
        owned: {
          count: ownedCitations.length,
          percentage: totalCitations > 0 ? Math.round((ownedCitations.length / totalCitations) * 100) : 0,
        },
        thirdParty: {
          count: thirdPartyCitations.length,
          percentage: totalCitations > 0 ? Math.round((thirdPartyCitations.length / totalCitations) * 100) : 0,
        },
        social: {
          count: socialCitations.length,
          percentage: totalCitations > 0 ? Math.round((socialCitations.length / totalCitations) * 100) : 0,
        },
        other: {
          count: otherCitations.length,
          percentage: totalCitations > 0 ? Math.round((otherCitations.length / totalCitations) * 100) : 0,
        },
      },
    };

    // Build competitors list
    const competitorMentions = new Map<string, {
      platforms: Set<string>;
      sentiments: Sentiment[];
    }>();

    // Add brand first
    competitorMentions.set(brandName, {
      platforms: new Set(mentionResponses.map(r => r.platform || 'unknown')),
      sentiments: mentionResponses.map(r => getSimpleSentiment(r.text).label as Sentiment),
    });

    // Check each competitor
    for (const comp of competitors) {
      const compNameLower = comp.name.toLowerCase();
      const compResponses = promptResponses.filter(r =>
        r.text.toLowerCase().includes(compNameLower)
      );

      if (compResponses.length > 0) {
        competitorMentions.set(comp.name, {
          platforms: new Set(compResponses.map(r => r.platform || 'unknown')),
          sentiments: compResponses.map(r => getSimpleSentiment(r.text).label as Sentiment),
        });
      }
    }

    const promptCompetitors: PromptCompetitor[] = Array.from(competitorMentions.entries())
      .map(([name, data]) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        platformCount: data.platforms.size,
        isYou: name === brandName,
        dominantSentiment: getDominantSentiment(data.sentiments),
      }))
      .sort((a, b) => b.platformCount - a.platformCount);

    // Calculate sentiment breakdown
    const allSentiments = mentionResponses.map(r => getSimpleSentiment(r.text).label);
    const positiveCount = allSentiments.filter(s => s === 'positive').length;
    const neutralCount = allSentiments.filter(s => s === 'neutral').length;
    const negativeCount = allSentiments.filter(s => s === 'negative').length;
    const sentimentTotal = positiveCount + neutralCount + negativeCount;

    const sentimentBreakdown = {
      positive: sentimentTotal > 0 ? Math.round((positiveCount / sentimentTotal) * 100) : 0,
      neutral: sentimentTotal > 0 ? Math.round((neutralCount / sentimentTotal) * 100) : 0,
      negative: sentimentTotal > 0 ? Math.round((negativeCount / sentimentTotal) * 100) : 0,
    };

    // Get related prompts (same stage or topic)
    const journeyStages = (prompt as any).journeyStages as string[] | undefined;
    const primaryStage = journeyStages?.[0] as BuyerJourneyStage | undefined;
    const topicIds = (prompt as any).topicIds ?? (prompt.topicId ? [prompt.topicId] : []);

    const relatedPrompts: PromptType[] = allPrompts
      .filter(p => {
        if (p.id === promptId) return false;
        const pStages = (p as any).journeyStages as string[] | undefined;
        const pTopicIds = (p as any).topicIds ?? (p.topicId ? [p.topicId] : []);
        return (
          (primaryStage && pStages?.includes(primaryStage)) ||
          topicIds.some((tid: number) => pTopicIds.includes(tid))
        );
      })
      .slice(0, 5)
      .map(p => {
        const pResponses = responses.filter(r => r.promptId === p.id && r.brandMentioned);
        const pStages = (p as any).journeyStages as string[] | undefined;
        const pTopicIds = (p as any).topicIds ?? (p.topicId ? [p.topicId] : []);
        const pSentiments = pResponses.map(r => getSimpleSentiment(r.text).label as Sentiment);

        return {
          id: String(p.id),
          text: p.text,
          stage: (pStages?.[0] as BuyerJourneyStage) || 'problem-aware',
          stageName: pStages?.[0] ? STAGE_NAMES[pStages[0] as BuyerJourneyStage] : 'Problem aware',
          topic: pTopicIds[0] ? String(pTopicIds[0]) : undefined,
          topicName: pTopicIds[0] ? topicMap.get(pTopicIds[0]) : undefined,
          platforms: Array.from(new Set(pResponses.map(r => r.platform || 'unknown'))),
          mentions: pResponses.length,
          trend: 0,
          firstSeen: p.createdAt?.toISOString() || new Date().toISOString(),
          lastSeen: p.createdAt?.toISOString() || new Date().toISOString(),
          dominantSentiment: getDominantSentiment(pSentiments),
          citationCount: 0,
        };
      });

    // Build response
    const mentionedPlatforms = Array.from(
      new Set(mentionResponses.map(r => r.platform || 'unknown'))
    );

    const response: PromptDetailResponse = {
      id: String(prompt.id),
      text: prompt.text,
      stage: primaryStage || 'problem-aware',
      stageName: primaryStage ? STAGE_NAMES[primaryStage] : 'Problem aware',
      topic: topicIds[0] ? String(topicIds[0]) : undefined,
      topicName: topicIds[0] ? topicMap.get(topicIds[0]) : undefined,
      platforms: mentionedPlatforms,
      mentions: mentionResponses.length,
      trend: 0,
      firstSeen: prompt.createdAt?.toISOString() || new Date().toISOString(),
      lastSeen: prompt.createdAt?.toISOString() || new Date().toISOString(),
      dominantSentiment: getDominantSentiment(
        mentionResponses.map(r => getSimpleSentiment(r.text).label as Sentiment)
      ),
      citationCount: totalCitations,
      platformDetails,
      competitors: promptCompetitors,
      relatedPrompts,
      citations,
      sentimentBreakdown,
      meta: {
        cacheAge: 0,
        lastUpdated: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error('[Discovery API] Error fetching prompt detail:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to fetch prompt detail',
    });
  }
});

/**
 * GET /api/discovery/topics
 * Returns available topic filters
 */
router.get('/topics', async (_req: Request, res: Response) => {
  try {
    const [topics, allPrompts] = await Promise.all([
      storage.getTopics(),
      storage.getPromptsWithTopics(),
    ]);

    // Count prompts per topic
    const topicCounts = new Map<number, number>();
    for (const prompt of allPrompts) {
      const topicIds = (prompt as any).topicIds ?? (prompt.topicId ? [prompt.topicId] : []);
      for (const tid of topicIds) {
        topicCounts.set(tid, (topicCounts.get(tid) || 0) + 1);
      }
    }

    const response: TopicsResponse = {
      topics: topics.map(t => ({
        id: String(t.id),
        name: t.name,
        promptCount: topicCounts.get(t.id) || 0,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error('[Discovery API] Error fetching topics:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to fetch topics',
    });
  }
});

/**
 * GET /api/discovery/trending
 * Returns trending prompts (fastest growing mentions)
 */
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as string) || '30d';
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);

    const { start, end, error } = getTimeWindow(timeRange, req.query.startDate, req.query.endDate);
    if (error) return res.status(400).json({ code: error, message: 'Invalid custom time range' });
    const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));

    const [
      currentResponses,
      previousResponses,
      allPrompts,
      topics,
    ] = await Promise.all([
      storage.getResponsesInTimeRange(start, end),
      storage.getResponsesInTimeRange(previousStart, start),
      storage.getPromptsWithTopics(),
      storage.getTopics(),
    ]);

    const topicMap = new Map(topics.map(t => [t.id, t.name]));

    // Calculate trends for all prompts
    const trendingPrompts: TrendingPrompt[] = allPrompts.map(prompt => {
      const currentMentions = currentResponses.filter(
        r => r.promptId === prompt.id && r.brandMentioned
      ).length;
      const previousMentions = previousResponses.filter(
        r => r.promptId === prompt.id && r.brandMentioned
      ).length;

      const trend = previousMentions > 0
        ? Math.round(((currentMentions - previousMentions) / previousMentions) * 100)
        : currentMentions > 0 ? 100 : 0;

      const mentionResponses = currentResponses.filter(
        r => r.promptId === prompt.id && r.brandMentioned
      );
      const platforms = Array.from(
        new Set(mentionResponses.map(r => r.platform || 'unknown'))
      );
      const sentiments = mentionResponses.map(r =>
        getSimpleSentiment(r.text).label as Sentiment
      );

      const journeyStages = (prompt as any).journeyStages as string[] | undefined;
      const primaryStage = journeyStages?.[0] as BuyerJourneyStage | undefined;
      const topicIds = (prompt as any).topicIds ?? (prompt.topicId ? [prompt.topicId] : []);

      return {
        id: String(prompt.id),
        text: prompt.text,
        stage: primaryStage || 'problem-aware',
        stageName: primaryStage ? STAGE_NAMES[primaryStage] : 'Problem aware',
        topic: topicIds[0] ? String(topicIds[0]) : undefined,
        topicName: topicIds[0] ? topicMap.get(topicIds[0]) : undefined,
        platforms,
        mentions: currentMentions,
        trend,
        firstSeen: prompt.createdAt?.toISOString() || new Date().toISOString(),
        lastSeen: prompt.createdAt?.toISOString() || new Date().toISOString(),
        dominantSentiment: getDominantSentiment(sentiments),
        citationCount: 0,
        trendRank: 0,
      };
    })
      .filter(p => p.trend > 0)
      .sort((a, b) => b.trend - a.trend)
      .slice(0, limit)
      .map((p, index) => ({ ...p, trendRank: index + 1 }));

    const response: TrendingPromptsResponse = {
      prompts: trendingPrompts,
    };

    res.json(response);
  } catch (error) {
    console.error('[Discovery API] Error fetching trending prompts:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to fetch trending prompts',
    });
  }
});

export default router;
