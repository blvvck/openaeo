/**
 * Bot Traffic API Routes
 *
 * Webhook endpoint for CDN integration and statistics endpoints
 * for analyzing AI bot traffic.
 */

import { Router, Request, Response } from 'express';
import {
  logBotVisit,
  logBotVisitsBatch,
  getBotStats,
  getAIBotStats,
  getBotTimeline,
  getRecentBotVisits,
  getVisitsForUrl,
  cleanupOldVisits,
  classifyBot,
} from '../services/bots';

const router = Router();

/**
 * Optional CDN metadata fields for bot visits
 */
interface BotVisitMetadata {
  statusCode?: number;
  responseTimeMs?: number;
  contentType?: string;
  contentLengthBytes?: number;
}

/**
 * POST /api/webhooks/bot-traffic
 * Receive bot visit data from CDN
 * Body: { userAgent: string, url: string, visitedAt?: string, statusCode?: number, responseTimeMs?: number, contentType?: string, contentLengthBytes?: number }
 * Or batch: { visits: Array<{ userAgent: string, url: string, visitedAt?: string, statusCode?: number, responseTimeMs?: number, contentType?: string, contentLengthBytes?: number }> }
 */
router.post('/webhooks/bot-traffic', async (req: Request, res: Response) => {
  try {
    const { userAgent, url, visitedAt, statusCode, responseTimeMs, contentType, contentLengthBytes, visits } = req.body;

    // Handle batch submission
    if (Array.isArray(visits)) {
      const visitData: Array<{ userAgent: string; url: string; visitedAt: Date; metadata?: BotVisitMetadata }> = [];

      for (let i = 0; i < visits.length; i++) {
        const v = visits[i];
        if (!v.userAgent || typeof v.userAgent !== 'string') {
          return res.status(400).json({
            error: 'Each visit must have a userAgent',
            index: i,
          });
        }
        if (!v.url || typeof v.url !== 'string') {
          return res.status(400).json({
            error: 'Each visit must have a url',
            index: i,
          });
        }

        visitData.push({
          userAgent: v.userAgent,
          url: v.url,
          visitedAt: v.visitedAt ? new Date(v.visitedAt) : new Date(),
          metadata: {
            statusCode: v.statusCode,
            responseTimeMs: v.responseTimeMs,
            contentType: v.contentType,
            contentLengthBytes: v.contentLengthBytes,
          },
        });
      }

      const saved = await logBotVisitsBatch(visitData);

      res.status(201).json({
        success: true,
        count: saved.length,
        message: `Logged ${saved.length} bot visits`,
      });
      return;
    }

    // Handle single submission
    if (!userAgent || typeof userAgent !== 'string') {
      return res.status(400).json({ error: 'userAgent is required' });
    }

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required' });
    }

    const parsedVisitedAt = visitedAt ? new Date(visitedAt) : new Date();

    const metadata: BotVisitMetadata = {
      statusCode,
      responseTimeMs,
      contentType,
      contentLengthBytes,
    };

    const visit = await logBotVisit(userAgent, url, parsedVisitedAt, metadata);

    const classification = classifyBot(userAgent);

    res.status(201).json({
      success: true,
      visit: {
        id: visit.id,
        botType: visit.botType,
        url: visit.url,
        visitedAt: visit.visitedAt,
        statusCode: visit.statusCode,
        responseTimeMs: visit.responseTimeMs,
        contentType: visit.contentType,
        contentLengthBytes: visit.contentLengthBytes,
        classification,
      },
    });
  } catch (error: any) {
    console.error('[Bot Traffic API] Webhook error:', error);
    res.status(500).json({
      error: 'Failed to log bot visit',
      message: error.message || 'Unknown error',
    });
  }
});

/**
 * GET /api/bot-traffic/stats
 * Get aggregated bot traffic statistics
 * Query params: from (ISO date), to (ISO date)
 *
 * Response includes CDN configuration status:
 *   - cdnConfigured: true if ANY provider (Cloudflare, Vercel, Netlify) has its webhook secret set
 *   - configuredProviders: list of provider names that are set up
 */
router.get('/bot-traffic/stats', async (req: Request, res: Response) => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    // Validate dates if provided
    if (from && isNaN(from.getTime())) {
      return res.status(400).json({ error: 'Invalid from date' });
    }
    if (to && isNaN(to.getTime())) {
      return res.status(400).json({ error: 'Invalid to date' });
    }

    const stats = await getBotStats(from, to);
    const periodEnd = to ?? new Date();
    const periodStart = from ?? new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodLength = periodEnd.getTime() - periodStart.getTime();
    const previous = await getBotStats(
      new Date(periodStart.getTime() - periodLength),
      periodStart,
    );
    const percentChange = (current: number, prior: number) => prior === 0
      ? 0
      : Math.round(((current - prior) / prior) * 1000) / 10;
    const botByType = (items: typeof stats.byBot) => new Map(items.map(bot => [bot.botType, bot]));
    const currentBots = botByType(stats.byBot);
    const previousBots = botByType(previous.byBot);

    // Determine CDN configuration status from environment variables.
    // Mirrors the logic in /api/webhooks/cdn/health — no secrets are exposed.
    const configuredProviders: string[] = [];
    if (process.env.CLOUDFLARE_WEBHOOK_SECRET) configuredProviders.push('cloudflare');
    if (process.env.VERCEL_WEBHOOK_SECRET) configuredProviders.push('vercel');
    if (process.env.NETLIFY_WEBHOOK_SECRET) configuredProviders.push('netlify');

    const cdnConfigured = configuredProviders.length > 0;

    res.json({
      ...stats,
      cdnConfigured,
      configuredProviders,
      trends: {
        totalVisits: percentChange(stats.totalVisits, previous.totalVisits),
        aiVisits: percentChange(stats.aiVisits, previous.aiVisits),
        searchVisits: percentChange(stats.searchVisits, previous.searchVisits),
        socialVisits: percentChange(stats.socialVisits, previous.socialVisits),
        otherVisits: percentChange(stats.otherVisits, previous.otherVisits),
        uniqueAiPages: percentChange(
          stats.byBot.filter(bot => bot.category === 'ai').reduce((total, bot) => total + bot.uniqueUrls, 0),
          previous.byBot.filter(bot => bot.category === 'ai').reduce((total, bot) => total + bot.uniqueUrls, 0),
        ),
        byBot: Object.fromEntries(Array.from(currentBots, ([botType, bot]) => [
          botType,
          percentChange(bot.visitCount, previousBots.get(botType)?.visitCount ?? 0),
        ])),
      },
    });
  } catch (error: any) {
    console.error('[Bot Traffic API] Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch bot traffic stats' });
  }
});

router.get('/bot-traffic/timeline', async (req: Request, res: Response) => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : null;
    const to = req.query.to ? new Date(req.query.to as string) : null;
    if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      return res.status(400).json({ error: 'Valid from and to dates are required' });
    }
    res.json({ points: await getBotTimeline(from, to) });
  } catch (error: any) {
    console.error('[Bot Traffic API] Timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch bot traffic timeline' });
  }
});

/**
 * GET /api/bot-traffic/ai-bots
 * Get AI bot-specific statistics
 * Query params: from (ISO date), to (ISO date)
 */
router.get('/bot-traffic/ai-bots', async (req: Request, res: Response) => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const stats = await getAIBotStats(from, to);

    res.json({
      aiBots: stats,
      totalAIVisits: stats.reduce(function(sum, bot) { return sum + bot.visitCount; }, 0),
    });
  } catch (error: any) {
    console.error('[Bot Traffic API] AI bots stats error:', error);
    res.status(500).json({ error: 'Failed to fetch AI bot stats' });
  }
});

/**
 * GET /api/bot-traffic/recent
 * Get recent bot visits
 * Query params: limit (number), botType (string), from (ISO date), to (ISO date)
 */
router.get('/bot-traffic/recent', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const botType = req.query.botType as string | undefined;
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return res.status(400).json({ error: 'Invalid limit (1-1000)' });
    }

    const visits = await getRecentBotVisits(limit, botType, from, to);

    res.json({
      visits,
      count: visits.length,
    });
  } catch (error: any) {
    console.error('[Bot Traffic API] Recent visits error:', error);
    res.status(500).json({ error: 'Failed to fetch recent bot visits' });
  }
});

/**
 * GET /api/bot-traffic/url/:encodedUrl
 * Get bot visits for a specific URL
 */
router.get('/bot-traffic/url/:encodedUrl', async (req: Request, res: Response) => {
  try {
    const url = decodeURIComponent(req.params.encodedUrl);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const visits = await getVisitsForUrl(url, limit);

    // Group by bot type
    const byBotType: Record<string, number> = {};
    for (let i = 0; i < visits.length; i++) {
      const botType = visits[i].botType;
      byBotType[botType] = (byBotType[botType] || 0) + 1;
    }

    res.json({
      url,
      visits,
      summary: {
        totalVisits: visits.length,
        byBotType,
      },
    });
  } catch (error: any) {
    console.error('[Bot Traffic API] URL visits error:', error);
    res.status(500).json({ error: 'Failed to fetch bot visits for URL' });
  }
});

/**
 * POST /api/bot-traffic/cleanup
 * Clean up old bot visit records
 * Body: { olderThanDays?: number }
 */
router.post('/bot-traffic/cleanup', async (req: Request, res: Response) => {
  try {
    const { olderThanDays = 90 } = req.body;

    if (typeof olderThanDays !== 'number' || olderThanDays < 1) {
      return res.status(400).json({ error: 'Invalid olderThanDays value' });
    }

    const deletedCount = await cleanupOldVisits(olderThanDays);

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old bot visit records`,
      deletedCount,
    });
  } catch (error: any) {
    console.error('[Bot Traffic API] Cleanup error:', error);
    res.status(500).json({ error: 'Failed to clean up bot visits' });
  }
});

/**
 * POST /api/bot-traffic/classify
 * Classify a user agent string (utility endpoint)
 * Body: { userAgent: string }
 */
router.post('/bot-traffic/classify', async (req: Request, res: Response) => {
  try {
    const { userAgent } = req.body;

    if (!userAgent || typeof userAgent !== 'string') {
      return res.status(400).json({ error: 'userAgent is required' });
    }

    const classification = classifyBot(userAgent);

    res.json(classification);
  } catch (error: any) {
    console.error('[Bot Traffic API] Classify error:', error);
    res.status(500).json({ error: 'Failed to classify user agent' });
  }
});

export default router;
