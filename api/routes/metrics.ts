/**
 * Metrics API Routes
 *
 * Provides endpoints for visibility scores, platform metrics, and trends.
 */

import { Router, type Request, type Response } from 'express';
import { storage } from '../data';
import { getActiveBrandConfig } from '../services/brand-config';
import {
  calculateVisibilityScore,
  compareVisibility,
  type ResponseData,
} from '../services/analytics';
import { extractCitations } from '../services/analytics/citation-tracker';
import { compareCompetitors } from '../services/analytics/competitor-detector';
import { getSimpleSentiment } from '../services/analytics/sentiment-analyzer';
import type { CompetitorRank } from '@shared/types/dashboard';
import type { TrendsResponse, TrendDataPoint, TrendAnnotation, TopicsAnalysisResponse, TopicMetric, PlatformTrendSeries, PlatformTrendDataPoint } from '@shared/types/visibility';
import type { TrendDirection } from '@shared/types/insights';

const router = Router();

/**
 * Known social media domains for citation categorization
 * Must match SOCIAL_DOMAINS in dashboard.ts for consistency
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

/**
 * Check if a domain is a social media platform
 */
function isSocialDomain(domain: string): boolean {
  const normalizedDomain = domain.toLowerCase();
  for (const social of Array.from(SOCIAL_DOMAINS.values())) {
    if (normalizedDomain === social || normalizedDomain.endsWith(`.${social}`)) {
      return true;
    }
  }
  return false;
}

/**
 * Convert database responses to ResponseData format
 */
function toResponseData(dbResponses: any[]): ResponseData[] {
  return dbResponses.map((r) => ({
    platform: r.platform || 'chatgpt', // Default platform if not set
    text: r.text,
    brandMentioned: r.brandMentioned ?? false,
  }));
}

/**
 * GET /api/metrics/visibility-score
 * Returns overall visibility score and breakdown
 *
 * Query params:
 * - brand: Brand name to calculate score for (required)
 * - from: Start date (ISO string)
 * - to: End date (ISO string)
 */
router.get('/visibility-score', async (req: Request, res: Response) => {
  try {
    const { brand, from, to } = req.query;

    if (!brand || typeof brand !== 'string') {
      return res.status(400).json({ error: 'Brand parameter is required' });
    }

    // Get responses from storage
    const allResponses = await storage.getResponsesWithPrompts();

    // Filter by date if provided
    let filteredResponses = allResponses;
    if (from) {
      const fromDate = new Date(from as string);
      filteredResponses = filteredResponses.filter(
        (r) => r.createdAt && new Date(r.createdAt) >= fromDate
      );
    }
    if (to) {
      const toDate = new Date(to as string);
      filteredResponses = filteredResponses.filter(
        (r) => r.createdAt && new Date(r.createdAt) <= toDate
      );
    }

    const responseData = toResponseData(filteredResponses);
    const visibilityScore = calculateVisibilityScore(responseData, brand);

    res.json({
      brand,
      ...visibilityScore,
      timeRange: {
        from: from || null,
        to: to || null,
      },
    });
  } catch (error) {
    console.error('Error calculating visibility score:', error);
    res.status(500).json({ error: 'Failed to calculate visibility score' });
  }
});

/**
 * GET /api/metrics/by-platform
 * Returns visibility metrics broken down by platform
 *
 * Query params:
 * - brand: Brand name (required)
 * - from: Start date (ISO string)
 * - to: End date (ISO string)
 */
router.get('/by-platform', async (req: Request, res: Response) => {
  try {
    const { brand, from, to } = req.query;

    if (!brand || typeof brand !== 'string') {
      return res.status(400).json({ error: 'Brand parameter is required' });
    }

    // Fetch brand config to get the brand's domain for owned citation calculation
    const brandConfig = await getActiveBrandConfig();

    // Normalize brand domain for comparison (e.g., "acme.com" from "https://www.acme.com")
    const brandDomain = brandConfig?.domain
      ? brandConfig.domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')
      : null;

    const allResponses = await storage.getResponsesWithPrompts();

    let filteredResponses = allResponses;
    if (from) {
      const fromDate = new Date(from as string);
      filteredResponses = filteredResponses.filter(
        (r) => r.createdAt && new Date(r.createdAt) >= fromDate
      );
    }
    if (to) {
      const toDate = new Date(to as string);
      filteredResponses = filteredResponses.filter(
        (r) => r.createdAt && new Date(r.createdAt) <= toDate
      );
    }

    const responseData = toResponseData(filteredResponses);
    const visibilityScore = calculateVisibilityScore(responseData, brand);

    // Count owned, social, and third-party citations per platform
    // Owned = links to brand's domain
    // Social = links to social media platforms
    // Third-party = everything else (news, blogs, etc.)
    const ownedCitationsByPlatform = new Map<string, number>();
    const socialCitationsByPlatform = new Map<string, number>();
    const thirdPartyCitationsByPlatform = new Map<string, number>();

    for (const response of filteredResponses) {
      const platform = (response as any).platform || 'unknown';
      const citations = extractCitations(response.text, platform);

      let ownedCount = 0;
      let socialCount = 0;
      let thirdPartyCount = 0;

      for (const c of citations) {
        const citationDomain = c.domain.toLowerCase();
        const isOwned = brandDomain && (citationDomain === brandDomain || citationDomain.endsWith(`.${brandDomain}`));
        if (isOwned) {
          ownedCount++;
        } else if (isSocialDomain(citationDomain)) {
          socialCount++;
        } else {
          thirdPartyCount++;
        }
      }

      ownedCitationsByPlatform.set(
        platform,
        (ownedCitationsByPlatform.get(platform) || 0) + ownedCount
      );
      socialCitationsByPlatform.set(
        platform,
        (socialCitationsByPlatform.get(platform) || 0) + socialCount
      );
      thirdPartyCitationsByPlatform.set(
        platform,
        (thirdPartyCitationsByPlatform.get(platform) || 0) + thirdPartyCount
      );
    }

    // Count relevant prompts per platform
    // Relevant = distinct prompts that have at least one response on that platform
    // This represents the total opportunity pool for each platform
    const relevantPromptsByPlatform = new Map<string, Set<number>>();
    for (const response of filteredResponses) {
      const platform = (response as any).platform || 'unknown';
      const promptId = response.promptId;
      if (!relevantPromptsByPlatform.has(platform)) {
        relevantPromptsByPlatform.set(platform, new Set());
      }
      relevantPromptsByPlatform.get(platform)!.add(promptId);
    }

    // Return just the platform breakdown with more detail
    const platformMetrics = visibilityScore.platforms.map((p) => ({
      platform: p.platform,
      mentioned: p.mentioned,
      mentionCount: p.mentionCount,
      visibilityScore: p.visibilityScore,
      positionScore: p.positionScore,
      sentimentScore: p.sentimentScore,
      responseCount: filteredResponses.filter(
        (r) => (r as any).platform === p.platform
      ).length,
      // Owned citation count: how many citations link to the brand's own domain
      ownedCitationCount: ownedCitationsByPlatform.get(p.platform) || 0,
      // Social citation count: how many citations link to social media platforms
      socialCitationCount: socialCitationsByPlatform.get(p.platform) || 0,
      // Third-party citation count: how many citations link to external domains (non-social)
      thirdPartyCitationCount: thirdPartyCitationsByPlatform.get(p.platform) || 0,
      // Relevant prompt count: distinct prompts with responses on this platform
      relevantPromptCount: relevantPromptsByPlatform.get(p.platform)?.size || 0,
    }));

    res.json({
      brand,
      platforms: platformMetrics,
      summary: {
        totalPlatforms: platformMetrics.length,
        platformsWithMention: platformMetrics.filter((p) => p.mentioned).length,
        bestPlatform: platformMetrics.reduce(
          (best, p) => (p.visibilityScore > (best?.visibilityScore || 0) ? p : best),
          null as typeof platformMetrics[0] | null
        ),
      },
      timeRange: { from: from || null, to: to || null },
    });
  } catch (error) {
    console.error('Error fetching platform metrics:', error);
    res.status(500).json({ error: 'Failed to fetch platform metrics' });
  }
});

/**
 * GET /api/metrics/trends
 * Returns visibility score trends over time
 *
 * Returns TrendsResponse = { dataPoints: TrendDataPoint[], annotations: TrendAnnotation[] }
 * matching shared/types/visibility.ts
 *
 * Query params:
 * - brand: Brand name (required)
 * - from: Start date (ISO string)
 * - to: End date (ISO string)
 * - interval: 'day' | 'week' | 'month' (default: 'day')
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const { brand, from, to, timeRange, interval = 'day' } = req.query;

    if (!brand || typeof brand !== 'string') {
      return res.status(400).json({ error: 'Brand parameter is required' });
    }

    // Calculate date range from timeRange preset or from/to params
    const toDate = to ? new Date(to as string) : new Date();
    let fromDate: Date;

    if (from) {
      fromDate = new Date(from as string);
    } else if (timeRange && typeof timeRange === 'string') {
      // Parse timeRange preset (1d, 3d, 7d, 14d, 30d, 60d, 90d, 365d, all)
      const match = timeRange.match(/^(\d+)d$/);
      if (match) {
        const days = parseInt(match[1], 10);
        fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
      } else if (timeRange === 'all') {
        fromDate = new Date(2020, 0, 1); // Start from 2020
      } else {
        fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30d
      }
    } else {
      fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30d
    }

    // PERF: Use SQL aggregation instead of fetching all records
    const intervalType = (interval === 'week' ? 'week' : interval === 'month' ? 'month' : 'day') as 'day' | 'week' | 'month';
    const trendCounts = await storage.getTrendCounts(fromDate, toDate, intervalType);

    // Convert to TrendDataPoint format
    const dataPoints: TrendDataPoint[] = trendCounts.map(({ date, total, mentions }) => {
      const mentionRate = total > 0 ? mentions / total : 0;
      const score = Math.round(mentionRate * 100 * 10) / 10;

      return {
        date,
        score,
        mentions,
        sentiment: 0, // Skip sentiment for perf - not used in chart
      };
    });

    // Detect annotations: significant daily changes (>5% score change)
    const annotations: TrendAnnotation[] = [];
    for (let i = 1; i < dataPoints.length; i++) {
      const prev = dataPoints[i - 1];
      const curr = dataPoints[i];

      if (prev.score === 0) continue;
      const dailyChange = ((curr.score - prev.score) / prev.score) * 100;

      if (Math.abs(dailyChange) > 5) {
        const isSpike = dailyChange > 0;
        annotations.push({
          date: curr.date,
          type: isSpike ? 'spike' : 'drop_start',
          label: isSpike
            ? `Score spike +${Math.round(dailyChange)}%`
            : `Score drop ${Math.round(dailyChange)}%`,
          magnitude: Math.round(Math.abs(dailyChange) * 10) / 10,
        });
      }
    }

    // Get per-platform trend data for multi-line charts
    const platformTrendCounts = await storage.getTrendCountsByPlatform(fromDate, toDate, intervalType);

    // Group by platform and convert to PlatformTrendSeries
    const byPlatform: PlatformTrendSeries = {};
    for (const { date, platform, total, mentions } of platformTrendCounts) {
      const normalizedPlatform = platform.toLowerCase().replace(/[\s_]+/g, '-');
      if (!byPlatform[normalizedPlatform]) {
        byPlatform[normalizedPlatform] = [];
      }
      const mentionRate = total > 0 ? mentions / total : 0;
      const score = Math.round(mentionRate * 100 * 10) / 10;
      byPlatform[normalizedPlatform].push({
        date,
        score,
        mentions,
      });
    }

    // Sort each platform's data points by date
    for (const platformId of Object.keys(byPlatform)) {
      byPlatform[platformId].sort((a, b) => a.date.localeCompare(b.date));
    }

    const response: TrendsResponse = {
      dataPoints,
      annotations,
      byPlatform,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

/**
 * GET /api/metrics/compare
 * Compare brand visibility against competitors
 *
 * Returns { competitors: CompetitorRank[] } matching shared/types/dashboard.ts
 *
 * Query params:
 * - brand: Brand name (required)
 * - competitors: Comma-separated competitor names
 * - from: Start date (ISO string)
 * - to: End date (ISO string)
 */
router.get('/compare', async (req: Request, res: Response) => {
  try {
    const { brand, competitors, from, to } = req.query;

    if (!brand || typeof brand !== 'string') {
      return res.status(400).json({ error: 'Brand parameter is required' });
    }

    // If competitors not provided, fetch from database
    let competitorList: string[];
    if (competitors) {
      competitorList = (competitors as string).split(',').map((c) => c.trim());
    } else {
      const dbCompetitors = await storage.getCompetitors();
      competitorList = dbCompetitors.map(c => c.name);
    }

    const allResponses = await storage.getResponsesWithPrompts();

    // Calculate time window for current period
    const toDate = to ? new Date(to as string) : new Date();
    const fromDate = from
      ? new Date(from as string)
      : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate previous period for trend comparison
    const periodLength = toDate.getTime() - fromDate.getTime();
    const previousStart = new Date(fromDate.getTime() - periodLength);
    const previousEnd = new Date(fromDate.getTime());

    // Filter current period responses
    const currentResponses = allResponses.filter(
      (r) =>
        r.createdAt &&
        new Date(r.createdAt) >= fromDate &&
        new Date(r.createdAt) <= toDate
    );

    // Filter previous period responses
    const previousResponses = allResponses.filter(
      (r) =>
        r.createdAt &&
        new Date(r.createdAt) >= previousStart &&
        new Date(r.createdAt) < previousEnd
    );

    // Compare current period
    const currentComparison = compareCompetitors(
      currentResponses.map((r) => ({
        text: r.text,
        platform: (r as any).platform || 'unknown',
        brandMentioned: r.brandMentioned || false,
      })),
      brand,
      competitorList
    );

    // Compare previous period for trend computation
    const previousComparison = previousResponses.length > 0
      ? compareCompetitors(
          previousResponses.map((r) => ({
            text: r.text,
            platform: (r as any).platform || 'unknown',
            brandMentioned: r.brandMentioned || false,
          })),
          brand,
          competitorList
        )
      : null;

    // Build CompetitorRank[] with real trend data
    const competitorRanks: CompetitorRank[] = currentComparison.ranking.map((entity, index) => {
      // Compute real trend: current score - previous score
      let trend = 0;
      if (previousComparison) {
        const previousEntity = previousComparison.ranking.find(
          (e) => e.name === entity.name
        );
        if (previousEntity && previousEntity.score > 0) {
          trend = Math.round(((entity.score - previousEntity.score) / previousEntity.score) * 100 * 10) / 10;
        }
      }

      return {
        rank: index + 1,
        id: entity.isBrand ? 'your-brand' : entity.name.toLowerCase().replace(/\s+/g, '-'),
        name: entity.name,
        score: entity.score,
        trend,
        isYou: entity.isBrand,
      };
    });

    res.json({
      competitors: competitorRanks,
    });
  } catch (error) {
    console.error('Error comparing visibility:', error);
    res.status(500).json({ error: 'Failed to compare visibility' });
  }
});

export default router;
