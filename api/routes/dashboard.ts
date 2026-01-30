

import { Router, Request, Response } from 'express';
import { storage } from '../data';
import { currentWorkspaceId } from '../context/workspace-context';
import { prismaRoot } from '../prisma';

async function workspaceNameFallback(): Promise<string> {
  const workspaceId = currentWorkspaceId();
  if (!workspaceId) return 'Your organization';
  const workspace = await prismaRoot.workspaces.findUnique({ where: { id: workspaceId }, select: { name: true } });
  return workspace?.name ?? 'Your organization';
}

import { getActiveBrandConfig } from '../services/brand-config';
import { calculateVisibilityScore, PLATFORMS, type VisibilityScore } from '../services/analytics/visibility-calculator';
import { compareCompetitors } from '../services/analytics/competitor-detector';
import { getSimpleSentiment, type SentimentResult } from '../services/analytics/sentiment-analyzer';
import { analyzeCitations } from '../services/analytics/citation-tracker';
import { getTopInsights } from '../services/analytics/insights-generator';
import { getAlertRulesEngine } from '../services/alerts';
import type { PromptResponseContext } from '@shared/schema';
import type {
  DashboardRequest,
  DashboardResponse,
  PlatformScore,
  CompetitorRank,
  OnboardingStep,
  MentionsData,
  PositionData,
  SentimentBreakdown,
  CategorizedCitationSources,
  CitationSourceEntry,
  PlatformSummary,
  BotVisitsData,
  RecentMention,
  MentionSentiment,
} from '@shared/types/dashboard';

const router = Router();

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

interface CacheEntry {
  data: DashboardResponse;
  timestamp: number;
}

const dashboardCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes (extended from 5)
const STALE_TTL_MS = 30 * 60 * 1000; // Serve stale for up to 30 min while refreshing

// Background refresh tracking
const refreshInProgress = new Set<string>();

// ============================================================================
// CONSTANTS
// ============================================================================

const PLATFORM_ICONS: Record<string, string> = {
  chatgpt: 'chatgpt',
  claude: 'claude',
  perplexity: 'perplexity',
  gemini: 'gemini',
  grok: 'grok',
  deepseek: 'deepseek',
  ai_mode: 'ai_mode',
  ai_overview: 'ai_overview',
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

const BOT_NAME_MAP: Record<string, string> = {
  chatgpt: 'GPTBot',
  claude: 'ClaudeBot',
  gemini: 'Googlebot',
  perplexity: 'PerplexityBot',
  grok: 'GrokBot',
  deepseek: 'DeepSeekBot',
  ai_mode: 'GoogleBot-AI',
  ai_overview: 'GoogleBot-AO',
};

/**
 * Known social media domains for citation categorization
 * These are classified as "social" in the citation sources breakdown
 */
const SOCIAL_DOMAINS = new Set([
  'reddit.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'facebook.com',
  'youtube.com',
  'instagram.com',
  'tiktok.com',
  'medium.com',
  'quora.com',
  'threads.net',
  'mastodon.social',
  'bsky.app',
  'discord.com',
  'slack.com',
  'pinterest.com',
  'tumblr.com',
  'snapchat.com',
  'twitch.tv',
]);

// ============================================================================
// HELPER TYPES
// ============================================================================

interface PrecomputedSentiment {
  score: number;
  label: 'positive' | 'negative' | 'neutral';
}

interface ResponseWithSentiment extends PromptResponseContext {
  _sentiment?: PrecomputedSentiment;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate time window from time range
 */
function getTimeWindow(
  timeRange: DashboardRequest['timeRange'],
  startDate?: string,
  endDate?: string
): { start: Date; end: Date } {
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
      start = new Date(2020, 0, 1);
      break;
    case 'custom':
      start = startDate ? new Date(startDate) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return { start, end };
}

/**
 * Get cached data with stale-while-revalidate support
 */
function getCachedData(cacheKey: string): { data: DashboardResponse | null; isStale: boolean } {
  const cached = dashboardCache.get(cacheKey);
  if (!cached) return { data: null, isStale: false };

  const age = Date.now() - cached.timestamp;

  // Fresh cache - return immediately
  if (age <= CACHE_TTL_MS) {
    return { data: cached.data, isStale: false };
  }

  // Stale but usable - return with flag
  if (age <= STALE_TTL_MS) {
    return { data: cached.data, isStale: true };
  }

  // Too old - delete and return null
  dashboardCache.delete(cacheKey);
  return { data: null, isStale: false };
}

/**
 * Cache dashboard data
 */
function setCachedData(cacheKey: string, data: DashboardResponse): void {
  dashboardCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Pre-compute sentiment for all responses (PERFORMANCE: compute once, use many)
 * Returns responses with _sentiment property attached
 */
function precomputeSentiment(responses: PromptResponseContext[]): ResponseWithSentiment[] {
  return responses.map(r => {
    const sentiment = getSimpleSentiment(r.text);
    return {
      ...r,
      _sentiment: {
        score: sentiment.score,
        label: sentiment.label,
      },
    };
  });
}

/**
 * Get onboarding steps with completion status (lightweight - uses counts)
 */
async function getOnboardingSteps(hasResponses: boolean): Promise<{
  steps: OnboardingStep[];
  complete: boolean;
  currentStep: number;
  totalSteps: number;
}> {
  // Parallelize these lightweight queries
  const alertRulesEngine = getAlertRulesEngine();
  const [brandConfig, competitors, alertRules] = await Promise.all([
    storage.getLatestAnalytics(),
    storage.getCompetitors(),
    alertRulesEngine.getRules(),
  ]);

  const steps: OnboardingStep[] = [
    {
      id: 'brand',
      title: 'Configure your brand',
      description: 'Tell us about your brand',
      complete: !!brandConfig,
      skipped: false,
      href: '/app/settings/brand',
    },
    {
      id: 'competitors',
      title: 'Add competitors',
      description: 'See how you compare',
      complete: competitors.length > 0,
      skipped: false,
      href: '/app/settings/competitors',
    },
    {
      id: 'alerts',
      title: 'Set up alerts',
      description: 'Get notified about changes',
      complete: alertRules.length > 0,
      skipped: false,
      href: '/app/alerts',
    },
    {
      id: 'visibility',
      title: 'Explore visibility',
      description: 'See how AI talks about you',
      complete: hasResponses,
      skipped: false,
      href: '/app/visibility',
    },
    {
      id: 'audit',
      title: 'Run site audit',
      description: 'Check your AI readiness',
      complete: false,
      skipped: false,
      href: '/app/audit',
    },
  ];

  const completedCount = steps.filter(s => s.complete).length;
  const complete = completedCount === steps.length;
  const currentStep = complete ? steps.length : steps.findIndex(s => !s.complete) + 1;

  return { steps, complete, currentStep, totalSteps: steps.length };
}

/**
 * Build platform scores from pre-computed visibility data
 * PERFORMANCE: Uses already-computed platform visibility from calculateVisibilityScore
 *
 * BF-002: Added citations per platform (computed from citation analysis)
 * BF-003: Added sentiment per platform (computed from pre-computed sentiment)
 */
function buildPlatformScores(
  currentVisibility: VisibilityScore,
  previousVisibility: VisibilityScore | null,
  responses: ResponseWithSentiment[],
  citationsByPlatform: Map<string, number>
): PlatformScore[] {
  return PLATFORMS.map(platformId => {
    const currentPlatform = currentVisibility.platforms.find(p => p.platform === platformId);
    const previousPlatform = previousVisibility?.platforms.find(p => p.platform === platformId);

    const score = currentPlatform?.visibilityScore || 0;
    const prevScore = previousPlatform?.visibilityScore || 0;
    const trend = prevScore > 0 ? ((score - prevScore) / prevScore) * 100 : 0;

    // BF-002: Get actual citations for this platform
    const citations = citationsByPlatform.get(platformId) || 0;

    // BF-003: Calculate dominant sentiment for this platform
    const platformResponses = responses.filter(r => (r.platform || 'unknown') === platformId && r.brandMentioned);
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (platformResponses.length > 0) {
      const positiveCount = platformResponses.filter(r => r._sentiment?.label === 'positive').length;
      const negativeCount = platformResponses.filter(r => r._sentiment?.label === 'negative').length;
      const neutralCount = platformResponses.filter(r => r._sentiment?.label === 'neutral').length;

      if (positiveCount >= neutralCount && positiveCount >= negativeCount) {
        sentiment = 'positive';
      } else if (negativeCount >= positiveCount && negativeCount >= neutralCount) {
        sentiment = 'negative';
      }
      // else stays neutral
    }

    return {
      id: platformId,
      name: PLATFORM_NAMES[platformId] || platformId,
      icon: PLATFORM_ICONS[platformId] || platformId,
      score,
      mentions: currentPlatform?.mentionCount || 0,
      trend: Math.round(trend * 10) / 10,
      citations,
      sentiment,
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Compute sentiment breakdown from pre-computed sentiments
 */
function computeSentimentBreakdown(
  currentResponses: ResponseWithSentiment[],
  previousResponses: ResponseWithSentiment[]
): SentimentBreakdown {
  const brandResponses = currentResponses.filter(r => r.brandMentioned);
  const total = brandResponses.length;

  if (total === 0) {
    return {
      positive: 0,
      neutral: 0,
      negative: 0,
      trend: 0,
      sampleQuote: null,
    };
  }

  // Count using pre-computed sentiment
  const positiveCount = brandResponses.filter(r => r._sentiment?.label === 'positive').length;
  const neutralCount = brandResponses.filter(r => r._sentiment?.label === 'neutral').length;
  const negativeCount = brandResponses.filter(r => r._sentiment?.label === 'negative').length;

  // Largest remainder method for exact 100%
  const rawPos = (positiveCount / total) * 100;
  const rawNeu = (neutralCount / total) * 100;
  const rawNeg = (negativeCount / total) * 100;
  const floors = [Math.floor(rawPos), Math.floor(rawNeu), Math.floor(rawNeg)];
  const remainders = [rawPos - floors[0], rawNeu - floors[1], rawNeg - floors[2]];
  let deficit = 100 - (floors[0] + floors[1] + floors[2]);
  const indices = [0, 1, 2].sort((a, b) => remainders[b] - remainders[a]);
  for (const i of indices) {
    if (deficit <= 0) break;
    floors[i]++;
    deficit--;
  }

  // Find dominant and sample quote
  const dominantLabel =
    positiveCount >= neutralCount && positiveCount >= negativeCount
      ? 'positive'
      : negativeCount >= positiveCount && negativeCount >= neutralCount
        ? 'negative'
        : 'neutral';

  const sampleEntry = brandResponses.find(r => r._sentiment?.label === dominantLabel) || brandResponses[0];
  const sampleQuote = sampleEntry
    ? {
        text: sampleEntry.text.slice(0, 200),
        platform: sampleEntry.platform || 'unknown',
        date: sampleEntry.createdAt ? new Date(sampleEntry.createdAt).toISOString() : new Date().toISOString(),
      }
    : null;

  // Compute trend using pre-computed sentiment
  const prevBrandResponses = previousResponses.filter(r => r.brandMentioned);
  const currentPositiveRate = (positiveCount / total) * 100;
  const prevPositiveCount = prevBrandResponses.filter(r => r._sentiment?.label === 'positive').length;
  const prevPositiveRate = prevBrandResponses.length > 0 ? (prevPositiveCount / prevBrandResponses.length) * 100 : 0;
  const trend = prevPositiveRate > 0 ? currentPositiveRate - prevPositiveRate : 0;

  // Compute per-platform sentiment breakdown
  const platformSentimentMap = new Map<string, { positive: number; neutral: number; negative: number; total: number }>();

  for (const r of brandResponses) {
    const platform = r.platform || 'unknown';
    if (!platformSentimentMap.has(platform)) {
      platformSentimentMap.set(platform, { positive: 0, neutral: 0, negative: 0, total: 0 });
    }
    const stats = platformSentimentMap.get(platform)!;
    stats.total++;
    if (r._sentiment?.label === 'positive') stats.positive++;
    else if (r._sentiment?.label === 'negative') stats.negative++;
    else stats.neutral++;
  }

  // Convert to array with dominant sentiment per platform
  const platformSentiment = Array.from(platformSentimentMap.entries())
    .filter(([_, stats]) => stats.total > 0)
    .map(([id, stats]) => {
      // Determine dominant sentiment for this platform
      const dominantSentiment: 'positive' | 'neutral' | 'negative' =
        stats.positive >= stats.neutral && stats.positive >= stats.negative
          ? 'positive'
          : stats.negative >= stats.positive && stats.negative >= stats.neutral
            ? 'negative'
            : 'neutral';

      // Percent of that dominant sentiment
      const dominantCount = stats[dominantSentiment];
      const percent = Math.round((dominantCount / stats.total) * 100);

      return { id, sentiment: dominantSentiment, percent };
    })
    // Sort by total responses (most active platforms first)
    .sort((a, b) => {
      const aTotal = platformSentimentMap.get(a.id)?.total || 0;
      const bTotal = platformSentimentMap.get(b.id)?.total || 0;
      return bTotal - aTotal;
    });

  return {
    positive: floors[0],
    neutral: floors[1],
    negative: floors[2],
    trend: Math.round(trend * 10) / 10,
    sampleQuote,
    platformSentiment,
  };
}

/**
 * Build recent mentions from responses with brand mentions
 * Returns the most recent 15 mentions from the last 7 days
 */
function buildRecentMentions(
  responses: ResponseWithSentiment[],
  brandName: string
): RecentMention[] {
  // Filter to brand mentions only
  const brandMentionResponses = responses.filter(r => r.brandMentioned);

  // Sort by timestamp descending (most recent first)
  const sorted = brandMentionResponses.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  // Take the most recent 15
  const recent = sorted.slice(0, 15);

  // Map to RecentMention shape
  return recent.map(r => {
    // Extract a snippet around the brand mention (max 200 chars)
    const text = r.text;
    const brandIndex = text.toLowerCase().indexOf(brandName.toLowerCase());
    let snippet: string;

    if (brandIndex >= 0) {
      // Extract context around the brand mention
      const start = Math.max(0, brandIndex - 50);
      const end = Math.min(text.length, brandIndex + brandName.length + 150);
      snippet = (start > 0 ? '...' : '') + text.slice(start, end).trim() + (end < text.length ? '...' : '');
    } else {
      // Fallback to first 200 chars
      snippet = text.slice(0, 200) + (text.length > 200 ? '...' : '');
    }

    // Use pre-computed sentiment
    const sentiment: MentionSentiment = r._sentiment?.label || 'neutral';

    return {
      id: String(r.id),
      platform: r.platform || 'unknown',
      prompt: r.prompt?.text || 'Unknown prompt',
      snippet,
      sentiment,
      timestamp: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    };
  });
}

/**
 * Extract base domain from a full domain string
 * e.g., "www.reddit.com" -> "reddit.com", "old.reddit.com" -> "reddit.com"
 */
function getBaseDomain(domain: string): string {
  // Remove www. prefix
  let base = domain.replace(/^www\./, '');
  // Handle subdomains for known social platforms
  for (const social of Array.from(SOCIAL_DOMAINS)) {
    if (base.endsWith(social) || base === social) {
      return social;
    }
  }
  return base;
}

/**
 * Check if a domain belongs to the brand (owned)
 */
function isOwnedDomain(domain: string, brandDomain: string | null | undefined): boolean {
  if (!brandDomain) return false;
  const baseDomain = getBaseDomain(domain);
  const baseBrandDomain = getBaseDomain(brandDomain);
  // Exact match or subdomain of brand domain
  return baseDomain === baseBrandDomain || baseDomain.endsWith(`.${baseBrandDomain}`);
}

/**
 * Check if a domain is a known social media platform
 */
function isSocialDomain(domain: string): boolean {
  const baseDomain = getBaseDomain(domain);
  return SOCIAL_DOMAINS.has(baseDomain);
}

/**
 * Categorize citation sources into owned, social, and third-party
 */
function categorizeCitationSources(
  citationDomains: Array<{ domain: string; citationCount: number }>,
  brandDomain: string | null | undefined
): CategorizedCitationSources {
  const owned: { count: number; sites: string[] } = { count: 0, sites: [] };
  const social: { count: number; sites: string[] } = { count: 0, sites: [] };
  const thirdParty: { count: number; sites: string[] } = { count: 0, sites: [] };

  let totalCitations = 0;

  for (const { domain, citationCount } of citationDomains) {
    totalCitations += citationCount;

    if (isOwnedDomain(domain, brandDomain)) {
      owned.count += citationCount;
      if (owned.sites.length < 4) owned.sites.push(domain);
    } else if (isSocialDomain(domain)) {
      social.count += citationCount;
      if (social.sites.length < 4) social.sites.push(domain);
    } else {
      thirdParty.count += citationCount;
      if (thirdParty.sites.length < 4) thirdParty.sites.push(domain);
    }
  }

  // Calculate percentages (guard against division by zero)
  const calcPercentage = (count: number) =>
    totalCitations > 0 ? Math.round((count / totalCitations) * 100) : 0;

  return {
    owned: {
      percentage: calcPercentage(owned.count),
      count: owned.count,
      sites: owned.sites,
    },
    thirdParty: {
      percentage: calcPercentage(thirdParty.count),
      count: thirdParty.count,
      sites: thirdParty.sites,
    },
    social: {
      percentage: calcPercentage(social.count),
      count: social.count,
      sites: social.sites,
    },
  };
}

/**
 * Build contextual card subtitles
 */
function buildCardSubtitles(brandName: string): DashboardResponse['cardSubtitles'] {
  return {
    llmMentions: 'Brand mentions across AI platforms',
    competitorRankings: `How ${brandName} compares with competitors`,
    citationSources: `Sources cited in AI answers about ${brandName}`,
    citationFooter: '',
    sentimentSignal: `Sentiment in AI responses about ${brandName}`,
  };
}

/**
 * Core dashboard computation (extracted for background refresh)
 */
async function computeDashboardData(
  timeRange: DashboardRequest['timeRange'],
  startDate?: string,
  endDate?: string
): Promise<DashboardResponse> {
  const { start, end } = getTimeWindow(timeRange, startDate, endDate);
  const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
  const workspaceId = currentWorkspaceId();

  // =========================================================================
  // PHASE 1: Parallel data fetching (with time-filtered queries)
  // =========================================================================
  const alertRulesEngine = getAlertRulesEngine();
  const [
    currentResponsesRaw,
    previousResponsesRaw,
    competitors,
    activeBrandConfig,
    alertHistory,
    historicalResponseCount,
  ] = await Promise.all([
    // Time-filtered queries at DB level
    storage.getResponsesInTimeRange(start, end),
    storage.getResponsesInTimeRange(previousStart, start),
    storage.getCompetitors(),
    getActiveBrandConfig(),
    alertRulesEngine.getAlertHistory(100),
    workspaceId ? prismaRoot.responses.count({ where: { workspace_id: workspaceId } }) : Promise.resolve(0),
  ]);

  // Check for empty state early
  const hasResponses = currentResponsesRaw.length > 0 || previousResponsesRaw.length > 0;
  if (!hasResponses) {
    const onboarding = await getOnboardingSteps(false);
    return createEmptyResponse(onboarding, historicalResponseCount > 0);
  }

  // =========================================================================
  // PHASE 2: Pre-compute sentiment ONCE for all responses
  // =========================================================================
  const currentResponses = precomputeSentiment(currentResponsesRaw);
  const previousResponses = precomputeSentiment(previousResponsesRaw);

  const brandName = activeBrandConfig?.name || await workspaceNameFallback();
  const competitorNames = competitors.map(c => c.name);

  // =========================================================================
  // PHASE 3: Calculate visibility scores (only 2 calls total, not 10+)
  // =========================================================================
  const currentVisibility = calculateVisibilityScore(
    currentResponses.map(r => ({
      platform: r.platform || 'unknown',
      text: r.text,
      brandMentioned: r.brandMentioned || false,
    })),
    brandName
  );

  const previousVisibility =
    previousResponses.length > 0
      ? calculateVisibilityScore(
          previousResponses.map(r => ({
            platform: r.platform || 'unknown',
            text: r.text,
            brandMentioned: r.brandMentioned || false,
          })),
          brandName
        )
      : null;

  const visibilityTrend =
    previousVisibility && previousVisibility.score > 0
      ? ((currentVisibility.score - previousVisibility.score) / previousVisibility.score) * 100
      : 0;

  // =========================================================================
  // PHASE 3.5: Pre-compute citations by platform (BF-002)
  // Move citation analysis early so we can include per-platform citations in platformScores
  // =========================================================================
  const citationAnalysis = analyzeCitations(
    currentResponses.map(r => ({ text: r.text, platform: r.platform || 'unknown' })),
    brandName,
    PLATFORMS.length
  );

  // Count citations per platform from the raw citations array
  const citationsByPlatform = new Map<string, number>();
  for (const citation of citationAnalysis.citations) {
    const platform = citation.platform || 'unknown';
    citationsByPlatform.set(platform, (citationsByPlatform.get(platform) || 0) + 1);
  }

  // =========================================================================
  // PHASE 4: Build platform scores from existing visibility data (NO recalc)
  // Now includes BF-002 (citations) and BF-003 (sentiment) per platform
  // =========================================================================
  const platformScores = buildPlatformScores(
    currentVisibility,
    previousVisibility,
    currentResponses,
    citationsByPlatform
  );
  const topPlatform = platformScores[0] || { id: 'chatgpt', name: 'ChatGPT', icon: 'chatgpt' };

  // =========================================================================
  // PHASE 5: Calculate competitor rankings
  // =========================================================================
  const competitorComparison = compareCompetitors(
    currentResponses.map(r => ({
      text: r.text,
      platform: r.platform || 'unknown',
      brandMentioned: r.brandMentioned || false,
    })),
    brandName,
    competitorNames
  );

  const previousCompetitorComparison =
    previousResponses.length > 0
      ? compareCompetitors(
          previousResponses.map(r => ({
            text: r.text,
            platform: r.platform || 'unknown',
            brandMentioned: r.brandMentioned || false,
          })),
          brandName,
          competitorNames
        )
      : null;

  // BF-004: Pre-compute platform mentions per entity for topPlatforms field
  const entityPlatformMentions = new Map<string, Map<string, number>>();

  for (const entity of competitorComparison.ranking) {
    const platformCounts = new Map<string, number>();
    const entityName = entity.name.toLowerCase();

    for (const r of currentResponses) {
      const text = r.text.toLowerCase();
      const platform = r.platform || 'unknown';

      // Check if entity is mentioned in this response
      const isMentioned = entity.isBrand
        ? r.brandMentioned
        : text.includes(entityName);

      if (isMentioned) {
        platformCounts.set(platform, (platformCounts.get(platform) || 0) + 1);
      }
    }

    entityPlatformMentions.set(entity.name, platformCounts);
  }

  const competitorRanks: CompetitorRank[] = competitorComparison.ranking.map((entity, index) => {
    let trend = 0;
    if (previousCompetitorComparison) {
      const previousEntity = previousCompetitorComparison.ranking.find(e => e.name === entity.name);
      if (previousEntity && previousEntity.score > 0) {
        trend = Math.round(((entity.score - previousEntity.score) / previousEntity.score) * 100 * 10) / 10;
      }
    }

    // BF-004: Compute topPlatforms - the 3 platforms where this entity appears most
    const platformCounts = entityPlatformMentions.get(entity.name) || new Map();
    const topPlatforms = Array.from(platformCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([platform]) => platform);

    return {
      rank: index + 1,
      id: entity.isBrand ? 'your-brand' : entity.name.toLowerCase().replace(/\s+/g, '-'),
      name: entity.name,
      domain: entity.isBrand ? activeBrandConfig?.domain || undefined : competitors.find(competitor => competitor.name === entity.name)?.domain || undefined,
      score: entity.score,
      trend,
      isYou: entity.isBrand,
      topPlatforms: topPlatforms.length > 0 ? topPlatforms : undefined,
    };
  });

  // =========================================================================
  // PHASE 6: Metrics from pre-computed data
  // =========================================================================
  const currentMentions = currentResponses.filter(r => r.brandMentioned).length;
  const previousMentions = previousResponses.filter(r => r.brandMentioned).length;
  const mentionsTrend = previousMentions > 0 ? ((currentMentions - previousMentions) / previousMentions) * 100 : 0;

  // Use pre-computed sentiment
  const brandResponsesWithSentiment = currentResponses.filter(r => r.brandMentioned);
  const sentimentScores = brandResponsesWithSentiment.map(r => r._sentiment?.score || 0);
  const avgSentiment = sentimentScores.length > 0 ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length : 0;

  const previousBrandWithSentiment = previousResponses.filter(r => r.brandMentioned);
  const previousSentimentScores = previousBrandWithSentiment.map(r => r._sentiment?.score || 0);
  const previousAvgSentiment =
    previousSentimentScores.length > 0 ? previousSentimentScores.reduce((a, b) => a + b, 0) / previousSentimentScores.length : 0;
  const sentimentTrend =
    previousAvgSentiment !== 0 ? ((avgSentiment - previousAvgSentiment) / Math.abs(previousAvgSentiment)) * 100 : 0;

  // =========================================================================
  // PHASE 7: Mentions data
  // =========================================================================
  const brandResponses = currentResponses.filter(r => r.brandMentioned);
  const distinctPromptIds = new Set(brandResponses.map(r => r.promptId));
  const previousBrandResponses = previousResponses.filter(r => r.brandMentioned);
  const previousDistinctPromptIds = new Set(previousBrandResponses.map(r => r.promptId));
  const mentionsPromptTrend =
    previousDistinctPromptIds.size > 0 ? ((distinctPromptIds.size - previousDistinctPromptIds.size) / previousDistinctPromptIds.size) * 100 : 0;

  const promptMentionCounts = new Map<number, { text: string; count: number }>();
  for (const r of brandResponses) {
    const existing = promptMentionCounts.get(r.promptId);
    if (existing) {
      existing.count++;
    } else {
      promptMentionCounts.set(r.promptId, { text: r.prompt?.text || `Prompt #${r.promptId}`, count: 1 });
    }
  }

  let topTrigger: MentionsData['topTrigger'] = null;
  let maxCount = 0;
  for (const [, entry] of Array.from(promptMentionCounts.entries())) {
    if (entry.count > maxCount) {
      maxCount = entry.count;
      topTrigger = { promptText: entry.text, newMentions: entry.count };
    }
  }

  const newPromptCount = Array.from(new Set(currentResponses.filter(r => r.createdAt && new Date(r.createdAt) >= start).map(r => r.promptId)))
    .length;

  const mentionsData: MentionsData = {
    promptCount: distinctPromptIds.size,
    trend: Math.round(mentionsPromptTrend * 10) / 10,
    topTrigger,
    newPromptCount,
  };

  // =========================================================================
  // PHASE 8: Position data
  // =========================================================================
  const firstEntity = competitorComparison.ranking[0];
  const brandEntity = competitorComparison.ranking.find(r => r.isBrand);
  const brandScore = brandEntity?.score || 0;
  const firstScore = firstEntity?.score || 0;
  const gapToFirst = brandEntity?.rank === 1 ? 0 : firstScore - brandScore;

  const positionData: PositionData = {
    rank: competitorComparison.brandRank,
    total: competitorComparison.ranking.length,
    gapToFirst: Math.round(gapToFirst),
    firstCompetitor: firstEntity?.name || '',
    topThree: competitorRanks.slice(0, 3),
  };

  // =========================================================================
  // PHASE 9: Sentiment breakdown (uses pre-computed)
  // =========================================================================
  const sentimentBreakdown = computeSentimentBreakdown(currentResponses, previousResponses);

  // =========================================================================
  // PHASE 10: Citation sources - categorized by ownership type
  // NOTE: citationAnalysis already computed in PHASE 3.5 (BF-002 fix)
  // =========================================================================

  // Get brand domain for categorization (owned vs third-party)
  const brandDomain = activeBrandConfig?.domain || null;

  // Categorize citations into owned, social, and third-party
  const citationSources: CategorizedCitationSources = categorizeCitationSources(
    citationAnalysis.topDomains,
    brandDomain
  );

  // Flat list of citation sources for CitationSourcesCard
  const citationSourcesList: CitationSourceEntry[] = citationAnalysis.topDomains.slice(0, 10).map(d => {
    const domainCitations = citationAnalysis.citations.filter((c: { domain: string; context: string }) => c.domain === d.domain);
    const domainTexts = domainCitations.map((c: { domain: string; context: string }) => c.context);
    const avgDomainSentiment =
      domainTexts.length > 0
        ? domainTexts.reduce((sum, text) => sum + getSimpleSentiment(text).score, 0) / domainTexts.length
        : 0;
    return {
      domain: d.domain,
      citationCount: d.citationCount,
      sentiment: avgDomainSentiment > 0.2 ? 'positive' : avgDomainSentiment < -0.2 ? 'negative' : 'neutral',
      platforms: d.platforms || [],
    };
  });

  // =========================================================================
  // PHASE 11: Platform summary and bot visits
  // =========================================================================
  const platformSummary: PlatformSummary = {
    strong: platformScores.filter(p => p.score >= 70).length,
    average: platformScores.filter(p => p.score >= 40 && p.score < 70).length,
    weak: platformScores.filter(p => p.score < 40).length,
  };

  const platformCounts = new Map<string, number>();
  for (const r of currentResponses) {
    const p = r.platform || 'unknown';
    platformCounts.set(p, (platformCounts.get(p) || 0) + 1);
  }
  const totalBotVisits = currentResponses.length;
  const previousTotalBotVisits = previousResponses.length;
  const botVisitsTrend =
    previousTotalBotVisits > 0 ? Math.round(((totalBotVisits - previousTotalBotVisits) / previousTotalBotVisits) * 100 * 10) / 10 : 0;

  const botsList = Array.from(platformCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({
      id,
      name: BOT_NAME_MAP[id] || id,
      percentage: totalBotVisits > 0 ? Math.round((count / totalBotVisits) * 100) : 0,
      count,
    }));

  const botVisitsData: BotVisitsData = { total: totalBotVisits, trend: botVisitsTrend, bots: botsList };

  // =========================================================================
  // PHASE 12: Insights count
  // =========================================================================
  const responsesForInsights = currentResponses.map(r => ({
    text: r.text,
    platform: r.platform || 'unknown',
    promptText: r.prompt?.text || '',
    brandMentioned: r.brandMentioned || false,
  }));
  const insights = getTopInsights(responsesForInsights, brandName, { competitors: competitorNames });
  const insightCount = insights.length;

  // =========================================================================
  // PHASE 12.5: Recent mentions (real-time feed of brand mentions)
  // =========================================================================
  const recentMentions = buildRecentMentions(currentResponses, brandName);

  // =========================================================================
  // PHASE 13: Onboarding and subtitles
  // =========================================================================
  const [onboarding, cardSubtitles] = await Promise.all([
    getOnboardingSteps(hasResponses),
    Promise.resolve(buildCardSubtitles(brandName)),
  ]);

  const activeAlerts = alertHistory.filter(a => a.status === 'pending').length;

  // =========================================================================
  // BUILD FINAL RESPONSE
  // =========================================================================
  return {
    brandName,
    period: {
      hasHistoricalData: historicalResponseCount > 0,
      hasDataInRange: currentResponsesRaw.length > 0,
    },
    cardSubtitles,
    visibility: {
      score: Math.round(currentVisibility.score),
      previousScore: Math.round(previousVisibility?.score || 0),
      trend: Math.round(visibilityTrend * 10) / 10,
      trendDirection: visibilityTrend > 1 ? 'up' : visibilityTrend < -1 ? 'down' : 'stable',
    },
    metrics: {
      totalMentions: currentMentions,
      mentionsTrend: Math.round(mentionsTrend * 10) / 10,
      avgSentiment: Math.round(avgSentiment * 100) / 100,
      sentimentTrend: Math.round(sentimentTrend * 10) / 10,
      topPlatform: { id: topPlatform.id, name: topPlatform.name, icon: topPlatform.icon },
      activeAlerts,
    },
    platforms: platformScores,
    competitors: competitorRanks,
    mentions: mentionsData,
    position: positionData,
    sentiment: sentimentBreakdown,
    citationSources,
    citationSourcesList,
    platformSummary,
    botVisits: botVisitsData,
    insightCount,
    recentMentions,
    onboarding,
    meta: {
      lastUpdated: new Date().toISOString(),
      dataFreshness: 'live',
    },
  };
}

/**
 * Create empty dashboard response
 */
function createEmptyResponse(onboarding: Awaited<ReturnType<typeof getOnboardingSteps>>, hasHistoricalData = false): DashboardResponse {
  return {
    brandName: undefined,
    period: { hasHistoricalData, hasDataInRange: false },
    cardSubtitles: {
      llmMentions: 'Brand mentions across AI platforms',
      competitorRankings: 'How your brand compares with competitors',
      citationSources: 'Sources cited in AI answers about your brand',
      citationFooter: '',
      sentimentSignal: 'Sentiment in AI responses about your brand',
    },
    visibility: { score: 0, previousScore: 0, trend: 0, trendDirection: 'stable' },
    metrics: {
      totalMentions: 0,
      mentionsTrend: 0,
      avgSentiment: 0,
      sentimentTrend: 0,
      topPlatform: { id: 'chatgpt', name: 'ChatGPT', icon: 'chatgpt' },
      activeAlerts: 0,
    },
    platforms: [],
    competitors: [],
    mentions: { promptCount: 0, trend: 0, topTrigger: null, newPromptCount: 0 },
    position: { rank: 0, total: 0, gapToFirst: 0, firstCompetitor: '', topThree: [] },
    sentiment: { positive: 0, neutral: 0, negative: 0, trend: 0, sampleQuote: null },
    citationSources: {
      owned: { percentage: 0, count: 0, sites: [] },
      thirdParty: { percentage: 0, count: 0, sites: [] },
      social: { percentage: 0, count: 0, sites: [] },
    },
    citationSourcesList: [],
    platformSummary: { strong: 0, average: 0, weak: 0 },
    botVisits: { total: 0, trend: 0, bots: [] },
    insightCount: 0,
    recentMentions: [],
    onboarding,
    meta: { lastUpdated: new Date().toISOString(), dataFreshness: 'pending' },
  };
}

/**
 * Background refresh function
 */
async function backgroundRefresh(cacheKey: string, timeRange: DashboardRequest['timeRange'], startDate?: string, endDate?: string): Promise<void> {
  if (refreshInProgress.has(cacheKey)) return;
  refreshInProgress.add(cacheKey);

  try {
    const freshData = await computeDashboardData(timeRange, startDate, endDate);
    setCachedData(cacheKey, freshData);
  } catch (error) {
    console.error('[Dashboard API] Background refresh failed:', error);
  } finally {
    refreshInProgress.delete(cacheKey);
  }
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

/**
 * GET /api/dashboard
 * Unified dashboard data endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as DashboardRequest['timeRange']) || '7d';
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const workspaceId = req.query.workspaceId as string | undefined;

    // Validate custom time range
    if (timeRange === 'custom' && (!startDate || !endDate)) {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: 'startDate and endDate are required for custom time range',
      });
    }

    const cacheKey = `dashboard:${timeRange}:${startDate || ''}:${endDate || ''}:${workspaceId || 'default'}`;

    // Check cache with stale-while-revalidate
    const { data: cachedData, isStale } = getCachedData(cacheKey);

    if (cachedData) {
      // If stale, trigger background refresh
      if (isStale) {
        backgroundRefresh(cacheKey, timeRange, startDate, endDate);
      }

      // Return cached data immediately
      const cacheAge = Math.floor((Date.now() - (dashboardCache.get(cacheKey)?.timestamp || 0)) / 1000);
      return res.json({
        ...cachedData,
        meta: {
          ...cachedData.meta,
          dataFreshness: isStale ? 'stale' : 'cached',
          cacheAge,
        },
      });
    }

    // No cache - compute fresh
    const response = await computeDashboardData(timeRange, startDate, endDate);

    // Cache the response
    setCachedData(cacheKey, response);

    res.json(response);
  } catch (error) {
    console.error('[Dashboard API] Error fetching dashboard data:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Unable to load dashboard. Please try again.',
    });
  }
});

export default router;
