

import { Router, Request, Response } from 'express';
import { storage } from '../data';
import { getActiveBrandConfig } from '../services/brand-config';
import { getSimpleSentiment } from '../services/analytics/sentiment-analyzer';
import { analyzeCitations } from '../services/analytics/citation-tracker';
import { currentWorkspaceId } from '../context/workspace-context';
import { workspaceCacheKey } from '../services/analytics/workspace-cache-key';
import type {
  CitationType,
  CitationSentiment,
  CitationsOverview,
  CitationsOverviewResponse,
  CitationItem,
  CitationsListResponse,
  CitationDetail,
  CitationDetailResponse,
  CitationPlatformBreakdown,
  CitingPrompt,
} from '@shared/types/citations';

const router = Router();

// =============================================================================
// CONSTANTS
// =============================================================================

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

function getTimeWindow(timeRange: string): { start: Date; end: Date } {
  const now = new Date();
  const end = now;
  let start: Date;

  const match = timeRange.match(/^(\d+)d$/);
  if (match) {
    const days = parseInt(match[1]);
    start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  } else {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { start, end };
}

function classifyCitation(
  domain: string,
  brandDomains: string[]
): CitationType {
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

function getDominantSentiment(sentiments: CitationSentiment[]): CitationSentiment {
  const counts: Record<CitationSentiment, number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
    mixed: 0,
  };

  for (const s of sentiments) {
    counts[s]++;
  }

  // If mixed is dominant, return mixed
  if (counts.mixed >= counts.positive && counts.mixed >= counts.neutral && counts.mixed >= counts.negative) {
    return 'mixed';
  }
  if (counts.positive >= counts.neutral && counts.positive >= counts.negative) {
    return 'positive';
  }
  if (counts.negative >= counts.neutral) {
    return 'negative';
  }
  return 'neutral';
}

interface ParsedCitation {
  id: string;
  url: string;
  displayUrl: string;
  domain: string;
  type: CitationType;
  platforms: string[];
  count: number;
  sentiment: CitationSentiment;
  lastCited: string;
  promptIds: Set<number>;
  sentiments: CitationSentiment[];
  platformCounts: Map<string, { count: number; lastCited: Date }>;
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/citations/overview
 * Returns overview metrics for all citation types
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as string) || '30d';
    const cacheKey = workspaceCacheKey('citations', currentWorkspaceId() ?? 'unscoped', 'overview', timeRange);

    // Check cache
    const cached = getCached<CitationsOverviewResponse>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const { start, end } = getTimeWindow(timeRange);
    const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));

    // Get data
    const [
      currentResponses,
      previousResponses,
      activeBrandConfig,
    ] = await Promise.all([
      storage.getResponsesInTimeRange(start, end),
      storage.getResponsesInTimeRange(previousStart, start),
      getActiveBrandConfig(),
    ]);

    const brandName = activeBrandConfig?.name || 'Your Brand';
    const brandDomains = activeBrandConfig?.domain ? [activeBrandConfig.domain] : [];

    // Analyze citations for current period
    const currentCitations = analyzeCitations(
      currentResponses.map(r => ({ text: r.text, platform: r.platform || 'unknown' })),
      brandName,
      100
    );

    // Analyze citations for previous period
    const previousCitations = analyzeCitations(
      previousResponses.map(r => ({ text: r.text, platform: r.platform || 'unknown' })),
      brandName,
      100
    );

    // Categorize current citations
    let ownedCount = 0;
    let thirdPartyCount = 0;
    let socialCount = 0;
    const uniqueDomains = new Set<string>();
    let topSource: { url: string; displayUrl: string; domain: string; type: CitationType; count: number } | null = null;

    for (const c of currentCitations.domains) {
      const citationType = classifyCitation(c.domain, brandDomains);
      uniqueDomains.add(c.domain);

      switch (citationType) {
        case 'owned':
          ownedCount += c.citationCount;
          break;
        case 'social':
          socialCount += c.citationCount;
          break;
        case 'third-party':
          thirdPartyCount += c.citationCount;
          break;
      }

      if (!topSource || c.citationCount > topSource.count) {
        topSource = {
          url: `https://${c.domain}`,
          displayUrl: c.domain,
          domain: c.domain,
          type: citationType,
          count: c.citationCount,
        };
      }
    }

    // Categorize previous citations for trend calculation
    let prevOwnedCount = 0;
    let prevThirdPartyCount = 0;
    let prevSocialCount = 0;
    const prevUniqueDomains = new Set<string>();

    for (const c of previousCitations.domains) {
      const citationType = classifyCitation(c.domain, brandDomains);
      prevUniqueDomains.add(c.domain);

      switch (citationType) {
        case 'owned':
          prevOwnedCount += c.citationCount;
          break;
        case 'social':
          prevSocialCount += c.citationCount;
          break;
        case 'third-party':
          prevThirdPartyCount += c.citationCount;
          break;
      }
    }

    // Calculate totals and trends
    const totalCount = ownedCount + thirdPartyCount + socialCount;
    const prevTotalCount = prevOwnedCount + prevThirdPartyCount + prevSocialCount;

    const calcTrend = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const calcPercentage = (count: number, total: number): number => {
      return total > 0 ? Math.round((count / total) * 100) : 0;
    };

    const countPages = (citations: typeof currentCitations.citations) => {
      const counts = new Map<string, number>();
      for (const citation of citations) {
        if (classifyCitation(citation.domain, brandDomains) !== 'owned') continue;
        try {
          const url = citation.url.startsWith('http') ? citation.url : `https://${citation.url}`;
          const path = new URL(url).pathname || '/';
          counts.set(path, (counts.get(path) ?? 0) + 1);
        } catch {
          continue;
        }
      }
      return counts;
    };

    const ownedPageCounts = countPages(currentCitations.citations);
    const prevOwnedPageCounts = countPages(previousCitations.citations);
    const ownedTopPage = Array.from(ownedPageCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    const thirdPartyDomains = currentCitations.domains.filter(domain =>
      classifyCitation(domain.domain, brandDomains) === 'third-party'
    );
    const prevThirdPartyDomains = previousCitations.domains.filter(domain =>
      classifyCitation(domain.domain, brandDomains) === 'third-party'
    );
    const thirdPartySource = [...thirdPartyDomains].sort((a, b) => b.citationCount - a.citationCount)[0];

    const getSocialStats = (responses: typeof currentResponses) => {
      const promptIds = new Set<number>();
      const platformCounts = new Map<string, number>();
      const sentiments: CitationSentiment[] = [];

      for (const response of responses) {
        const citations = analyzeCitations(
          [{ text: response.text, platform: response.platform || 'unknown' }],
          brandName,
          100
        ).citations.filter(citation => classifyCitation(citation.domain, brandDomains) === 'social');
        if (citations.length === 0) continue;

        promptIds.add(response.promptId);
        sentiments.push(getSimpleSentiment(response.text).label);
        for (const citation of citations) {
          platformCounts.set(citation.platform, (platformCounts.get(citation.platform) ?? 0) + 1);
        }
      }

      const topPlatform = Array.from(platformCounts.entries()).sort((a, b) => b[1] - a[1])[0];
      return {
        topPlatform: topPlatform ? PLATFORM_NAMES[topPlatform[0]] || topPlatform[0] : null,
        platformCitations: topPlatform?.[1] ?? 0,
        promptsCiting: promptIds.size,
        sentiment: sentiments.length > 0 ? getDominantSentiment(sentiments) : null,
      };
    };

    const socialStats = getSocialStats(currentResponses);
    const prevSocialStats = getSocialStats(previousResponses);
    const ownedAverage = ownedPageCounts.size > 0 ? ownedCount / ownedPageCounts.size : null;
    const prevOwnedAverage = prevOwnedPageCounts.size > 0 ? prevOwnedCount / prevOwnedPageCounts.size : null;
    const thirdPartyAverage = thirdPartyDomains.length > 0 ? thirdPartyCount / thirdPartyDomains.length : null;
    const prevThirdPartyAverage = prevThirdPartyDomains.length > 0 ? prevThirdPartyCount / prevThirdPartyDomains.length : null;

    const overview: CitationsOverview = {
      total: {
        count: totalCount,
        trend: calcTrend(totalCount, prevTotalCount),
      },
      byType: {
        owned: {
          count: ownedCount,
          percentage: calcPercentage(ownedCount, totalCount),
          trend: calcTrend(ownedCount, prevOwnedCount),
        },
        thirdParty: {
          count: thirdPartyCount,
          percentage: calcPercentage(thirdPartyCount, totalCount),
          trend: calcTrend(thirdPartyCount, prevThirdPartyCount),
        },
        social: {
          count: socialCount,
          percentage: calcPercentage(socialCount, totalCount),
          trend: calcTrend(socialCount, prevSocialCount),
        },
      },
      topSource: topSource || {
        url: '',
        displayUrl: 'None',
        domain: '',
        type: 'third-party',
        count: 0,
      },
      uniqueSources: uniqueDomains.size,
      uniqueSourcesTrend: calcTrend(uniqueDomains.size, prevUniqueDomains.size),
      tabMetrics: {
        owned: {
          topPage: ownedTopPage?.[0] ?? null,
          pagesCited: ownedPageCounts.size,
          pagesTrend: calcTrend(ownedPageCounts.size, prevOwnedPageCounts.size),
          avgPerPage: ownedAverage === null ? null : Math.round(ownedAverage * 10) / 10,
          avgPerPageTrend: calcTrend(ownedAverage ?? 0, prevOwnedAverage ?? 0),
        },
        thirdParty: {
          topSource: thirdPartySource?.domain ?? null,
          topSourceCount: thirdPartySource?.citationCount ?? 0,
          uniqueSources: thirdPartyDomains.length,
          uniqueSourcesTrend: calcTrend(thirdPartyDomains.length, prevThirdPartyDomains.length),
          avgPerSource: thirdPartyAverage === null ? null : Math.round(thirdPartyAverage * 10) / 10,
          avgPerSourceTrend: calcTrend(thirdPartyAverage ?? 0, prevThirdPartyAverage ?? 0),
        },
        social: {
          ...socialStats,
          promptsTrend: calcTrend(socialStats.promptsCiting, prevSocialStats.promptsCiting),
        },
      },
    };

    const response: CitationsOverviewResponse = {
      ...overview,
      meta: {
        cacheAge: 0,
        lastUpdated: new Date().toISOString(),
        dataFreshness: 'live',
      },
    };

    setCache(cacheKey, response);
    res.json(response);
  } catch (error) {
    console.error('[Citations API] Error fetching overview:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to fetch citations overview',
    });
  }
});

/**
 * GET /api/citations
 * Returns paginated citation list with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      timeRange = '30d',
      type,
      platform,
      sentiment,
      search,
      sortBy = 'count',
      sortDir = 'desc',
      limit = '25',
      offset = '0',
    } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 25, 100);
    const offsetNum = parseInt(offset as string) || 0;

    const { start, end } = getTimeWindow(timeRange as string);
    const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));

    // Get data
    const [
      currentResponses,
      previousResponses,
      allPrompts,
      activeBrandConfig,
    ] = await Promise.all([
      storage.getResponsesInTimeRange(start, end),
      storage.getResponsesInTimeRange(previousStart, start),
      storage.getPromptsWithTopics(),
      getActiveBrandConfig(),
    ]);

    const brandName = activeBrandConfig?.name || 'Your Brand';
    const brandDomains = activeBrandConfig?.domain ? [activeBrandConfig.domain] : [];

    // Build a map of domain -> citation data
    const citationMap = new Map<string, ParsedCitation>();

    // Process current responses
    for (const response of currentResponses) {
      const citationAnalysis = analyzeCitations(
        [{ text: response.text, platform: response.platform || 'unknown' }],
        brandName,
        10
      );

      for (const c of citationAnalysis.citations) {
        const key = c.domain.toLowerCase();
        const citationType = classifyCitation(c.domain, brandDomains);
        const responseSentiment = getSimpleSentiment(response.text).label as CitationSentiment;
        const responseDate = response.createdAt ? new Date(response.createdAt) : new Date();

        if (!citationMap.has(key)) {
          citationMap.set(key, {
            id: key,
            url: `https://${c.domain}`,
            displayUrl: c.domain.length > 40 ? c.domain.slice(0, 37) + '...' : c.domain,
            domain: c.domain,
            type: citationType,
            platforms: [],
            count: 0,
            sentiment: 'neutral',
            lastCited: responseDate.toISOString(),
            promptIds: new Set(),
            sentiments: [],
            platformCounts: new Map(),
          });
        }

        const citation = citationMap.get(key)!;
        citation.count++;
        citation.promptIds.add(response.promptId);
        citation.sentiments.push(responseSentiment);

        // Update platforms
        const platId = response.platform || 'unknown';
        if (!citation.platforms.includes(platId)) {
          citation.platforms.push(platId);
        }

        // Track per-platform stats
        const platformStats = citation.platformCounts.get(platId) || { count: 0, lastCited: new Date(0) };
        platformStats.count++;
        if (responseDate > platformStats.lastCited) {
          platformStats.lastCited = responseDate;
        }
        citation.platformCounts.set(platId, platformStats);

        // Update lastCited
        if (responseDate.toISOString() > citation.lastCited) {
          citation.lastCited = responseDate.toISOString();
        }
      }
    }

    // Build previous period citation counts for trend calculation
    const prevCitationCounts = new Map<string, number>();
    for (const response of previousResponses) {
      const citationAnalysis = analyzeCitations(
        [{ text: response.text, platform: response.platform || 'unknown' }],
        brandName,
        10
      );

      for (const c of citationAnalysis.citations) {
        const key = c.domain.toLowerCase();
        prevCitationCounts.set(key, (prevCitationCounts.get(key) || 0) + 1);
      }
    }

    // Convert to array and compute final fields
    let citations: CitationItem[] = Array.from(citationMap.values()).map(c => {
      const prevCount = prevCitationCounts.get(c.id) || 0;
      const trend = prevCount > 0
        ? Math.round(((c.count - prevCount) / prevCount) * 100)
        : c.count > 0 ? 100 : 0;

      return {
        id: c.id,
        url: c.url,
        displayUrl: c.displayUrl,
        domain: c.domain,
        type: c.type,
        platforms: c.platforms,
        count: c.count,
        trend,
        sentiment: getDominantSentiment(c.sentiments),
        lastCited: c.lastCited,
      };
    });

    // Apply filters
    if (type) {
      citations = citations.filter(c => c.type === type);
    }

    if (platform) {
      citations = citations.filter(c => c.platforms.includes(platform as string));
    }

    if (sentiment) {
      citations = citations.filter(c => c.sentiment === sentiment);
    }

    if (search) {
      const searchLower = (search as string).toLowerCase();
      citations = citations.filter(c =>
        c.domain.toLowerCase().includes(searchLower) ||
        c.url.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    const sortDirection = sortDir === 'asc' ? 1 : -1;
    citations.sort((a, b) => {
      switch (sortBy) {
        case 'count':
          return (b.count - a.count) * sortDirection;
        case 'trend':
          return (b.trend - a.trend) * sortDirection;
        case 'domain':
          return a.domain.localeCompare(b.domain) * sortDirection;
        default:
          return (b.count - a.count) * sortDirection;
      }
    });

    // Paginate
    const total = citations.length;
    const paginatedCitations = citations.slice(offsetNum, offsetNum + limitNum);
    const hasMore = offsetNum + limitNum < total;

    const response: CitationsListResponse = {
      citations: paginatedCitations,
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
    console.error('[Citations API] Error fetching citations:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to fetch citations',
    });
  }
});

/**
 * GET /api/citations/:id
 * Returns detailed information for a single citation
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const citationId = req.params.id; // This is the domain
    const timeRange = (req.query.timeRange as string) || '30d';
    const { start, end } = getTimeWindow(timeRange);
    const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));

    // Get data
    const [
      currentResponses,
      previousResponses,
      allPrompts,
      activeBrandConfig,
    ] = await Promise.all([
      storage.getResponsesInTimeRange(start, end),
      storage.getResponsesInTimeRange(previousStart, start),
      storage.getPromptsWithTopics(),
      getActiveBrandConfig(),
    ]);

    const brandName = activeBrandConfig?.name || 'Your Brand';
    const brandDomains = activeBrandConfig?.domain ? [activeBrandConfig.domain] : [];
    const promptMap = new Map(allPrompts.map(p => [p.id, p]));

    // Find all responses that cite this domain
    const citingResponses: Array<{
      response: typeof currentResponses[0];
      sentiment: CitationSentiment;
    }> = [];

    for (const response of currentResponses) {
      const citationAnalysis = analyzeCitations(
        [{ text: response.text, platform: response.platform || 'unknown' }],
        brandName,
        10
      );

      const hasCitation = citationAnalysis.citations.some(
        c => c.domain.toLowerCase() === citationId.toLowerCase()
      );

      if (hasCitation) {
        citingResponses.push({
          response,
          sentiment: getSimpleSentiment(response.text).label as CitationSentiment,
        });
      }
    }

    if (citingResponses.length === 0) {
      return res.status(404).json({ error: 'Citation not found' });
    }

    // Calculate previous count for trend
    let prevCount = 0;
    for (const response of previousResponses) {
      const citationAnalysis = analyzeCitations(
        [{ text: response.text, platform: response.platform || 'unknown' }],
        brandName,
        10
      );

      const hasCitation = citationAnalysis.citations.some(
        c => c.domain.toLowerCase() === citationId.toLowerCase()
      );

      if (hasCitation) {
        prevCount++;
      }
    }

    // Build platform breakdown
    const platformStats = new Map<string, { count: number; lastCited: Date }>();
    const platforms: string[] = [];
    let lastCited = new Date(0);

    for (const { response } of citingResponses) {
      const platId = response.platform || 'unknown';
      const responseDate = response.createdAt ? new Date(response.createdAt) : new Date();

      if (!platforms.includes(platId)) {
        platforms.push(platId);
      }

      const stats = platformStats.get(platId) || { count: 0, lastCited: new Date(0) };
      stats.count++;
      if (responseDate > stats.lastCited) {
        stats.lastCited = responseDate;
      }
      platformStats.set(platId, stats);

      if (responseDate > lastCited) {
        lastCited = responseDate;
      }
    }

    const platformBreakdown: CitationPlatformBreakdown[] = Array.from(platformStats.entries())
      .map(([platformId, stats]) => ({
        platformId,
        platformName: PLATFORM_NAMES[platformId] || platformId,
        count: stats.count,
        lastCited: stats.lastCited.toISOString(),
      }))
      .sort((a, b) => b.count - a.count);

    // Build prompts citing this source
    const promptCounts = new Map<number, number>();
    for (const { response } of citingResponses) {
      promptCounts.set(response.promptId, (promptCounts.get(response.promptId) || 0) + 1);
    }

    const promptsCiting: CitingPrompt[] = Array.from(promptCounts.entries())
      .map(([promptId, count]) => {
        const prompt = promptMap.get(promptId);
        return {
          id: String(promptId),
          text: prompt?.text || `Prompt #${promptId}`,
          citationCount: count,
        };
      })
      .sort((a, b) => b.citationCount - a.citationCount)
      .slice(0, 10);

    // Calculate sentiment breakdown
    const sentiments = citingResponses.map(r => r.sentiment);
    const positiveCount = sentiments.filter(s => s === 'positive').length;
    const neutralCount = sentiments.filter(s => s === 'neutral').length;
    const negativeCount = sentiments.filter(s => s === 'negative').length;

    // Get sample snippet
    const firstCiting = citingResponses[0]?.response;
    let sampleSnippet: string | undefined;
    if (firstCiting) {
      const text = firstCiting.text;
      // Try to find the URL or domain mention
      const domainIndex = text.toLowerCase().indexOf(citationId.toLowerCase());
      if (domainIndex >= 0) {
        const snippetStart = Math.max(0, domainIndex - 50);
        const snippetEnd = Math.min(text.length, domainIndex + citationId.length + 100);
        sampleSnippet = (snippetStart > 0 ? '...' : '') +
          text.slice(snippetStart, snippetEnd).trim() +
          (snippetEnd < text.length ? '...' : '');
      } else {
        sampleSnippet = text.slice(0, 200) + (text.length > 200 ? '...' : '');
      }
    }

    const count = citingResponses.length;
    const trend = prevCount > 0
      ? Math.round(((count - prevCount) / prevCount) * 100)
      : count > 0 ? 100 : 0;

    const response: CitationDetailResponse = {
      id: citationId,
      url: `https://${citationId}`,
      displayUrl: citationId.length > 40 ? citationId.slice(0, 37) + '...' : citationId,
      domain: citationId,
      type: classifyCitation(citationId, brandDomains),
      platforms,
      count,
      trend,
      sentiment: getDominantSentiment(sentiments),
      lastCited: lastCited.toISOString(),
      platformBreakdown,
      promptsCiting,
      totalPromptsCiting: promptCounts.size,
      sampleSnippet,
      sentimentBreakdown: {
        positive: positiveCount,
        neutral: neutralCount,
        negative: negativeCount,
      },
      meta: {
        cacheAge: 0,
        lastUpdated: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error('[Citations API] Error fetching citation detail:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to fetch citation detail',
    });
  }
});

export default router;
