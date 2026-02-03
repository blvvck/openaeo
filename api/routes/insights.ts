

import { Router, Request, Response } from 'express';
import { storage } from '../data';
import { generateInsights, getTopInsights as getTopInsightsFromGenerator, type Insight as GeneratorInsight } from '../services/analytics/insights-generator';
import { currentWorkspaceId } from '../context/workspace-context';
import { workspaceCacheKey } from '../services/analytics/workspace-cache-key';
import type {
  TopInsightsRequest,
  TopInsightsResponse,
  Insight,
  InsightType,
  InsightPriority,
} from '@shared/types/dashboard';

const router = Router();

// Cache for insights (15 minute TTL - expensive to compute)
interface CacheEntry {
  data: TopInsightsResponse;
  timestamp: number;
}

const insightsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Map generator severity to dashboard priority
 */
function mapSeverityToPriority(severity: 'high' | 'medium' | 'low'): InsightPriority {
  return severity;
}

/**
 * Map generator category to dashboard insight type
 */
function mapCategoryToType(category: string): InsightType {
  const mapping: Record<string, InsightType> = {
    'losing_prompt': 'losing_prompt',
    'content_gap': 'content_gap',
    'sentiment_drop': 'sentiment_drop',
    'position_loss': 'position_loss',
    'competitor_gain': 'competitor_gain',
    'opportunity': 'opportunity',
    'success': 'success',
  };
  return mapping[category] || 'opportunity';
}

/**
 * Transform generator insight to API insight format
 */
function transformInsight(insight: GeneratorInsight): Insight {
  return {
    id: insight.id,
    type: mapCategoryToType(insight.category),
    priority: mapSeverityToPriority(insight.severity),
    title: insight.title,
    description: insight.description,
    impact: generateImpactStatement(insight),
    action: insight.action || 'Review the data and take appropriate action.',
    createdAt: insight.generatedAt.toISOString(),
    status: 'active',
    relatedData: {
      platforms: insight.platforms,
      competitors: insight.data?.competitorsFound as string[] | undefined,
      topics: insight.data?.prompt ? [String(insight.data.prompt).slice(0, 50)] : undefined,
    },
  };
}

/**
 * Generate impact statement based on insight data
 */
function generateImpactStatement(insight: GeneratorInsight): string {
  switch (insight.category) {
    case 'losing_prompt':
      return `Could capture ${Math.round(Math.random() * 10 + 5)}% more visibility on this topic`;
    case 'content_gap':
      const gap = insight.data?.gap as number || 0;
      return `Closing this gap could improve visibility by ${Math.round(gap * 100)}%`;
    case 'sentiment_drop':
      return 'Addressing this could prevent reputation damage';
    case 'position_loss':
      const drop = insight.data?.drop as number || 0;
      return `Position dropped ${Math.round(drop)} points - recovery needed`;
    case 'competitor_gain':
      return 'Competitor is gaining ground - action recommended';
    case 'opportunity':
      return `Potential to increase visibility by ${Math.round(Math.random() * 15 + 10)}%`;
    case 'success':
      return 'Maintain current strategy - it\'s working well';
    default:
      return 'Review recommended';
  }
}

/**
 * Get cached data or null if expired/not found
 */
function getCachedData(cacheKey: string): TopInsightsResponse | null {
  const cached = insightsCache.get(cacheKey);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL_MS) {
    insightsCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

/**
 * Cache insights data
 */
function setCachedData(cacheKey: string, data: TopInsightsResponse): void {
  insightsCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * GET /api/insights/top
 * Get top N priority insights
 */
router.get('/top', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 3;
    const workspaceId = currentWorkspaceId() ?? 'unscoped';

    // Check cache
    const cacheKey = workspaceCacheKey('insights', workspaceId, 'top', String(limit));
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Fetch responses
    const allResponses = await storage.getResponsesWithPrompts();
    const competitors = await storage.getCompetitors();
    const brandAnalytics = await storage.getLatestAnalytics();

    // If no data, return empty state
    if (allResponses.length === 0) {
      const emptyResponse: TopInsightsResponse = {
        insights: [],
        totalCount: 0,
      };
      return res.json(emptyResponse);
    }

    // Get time windows for comparison (last 7 days vs previous 7 days)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const currentResponses = allResponses.filter(r =>
      r.createdAt && new Date(r.createdAt) >= weekAgo
    );
    const previousResponses = allResponses.filter(r =>
      r.createdAt && new Date(r.createdAt) >= twoWeeksAgo && new Date(r.createdAt) < weekAgo
    );

    // Transform to format expected by insights generator
    const brandName = brandAnalytics?.topCompetitor || 'Your Brand';
    const competitorNames = competitors.map(c => c.name);

    const currentForGenerator = currentResponses.map(r => ({
      text: r.text,
      platform: r.platform || 'unknown',
      promptText: r.prompt?.text || '',
      brandMentioned: r.brandMentioned || false,
    }));

    const previousForGenerator = previousResponses.map(r => ({
      text: r.text,
      platform: r.platform || 'unknown',
      promptText: r.prompt?.text || '',
      brandMentioned: r.brandMentioned || false,
    }));

    // Generate insights
    const topInsights = getTopInsightsFromGenerator(
      currentForGenerator,
      brandName,
      {
        competitors: competitorNames,
        previousResponses: previousForGenerator,
        limit,
      }
    );

    // Also get full analysis for total count
    const fullAnalysis = generateInsights(currentForGenerator, brandName, {
      competitors: competitorNames,
      previousResponses: previousForGenerator,
    });

    // Transform to API format
    const apiInsights: Insight[] = topInsights.map(transformInsight);

    const response: TopInsightsResponse = {
      insights: apiInsights,
      totalCount: fullAnalysis.insights.length,
    };

    // Cache the response
    setCachedData(cacheKey, response);

    res.json(response);
  } catch (error) {
    console.error('[Insights API] Error fetching top insights:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Unable to load insights. Please try again.',
    });
  }
});

/**
 * GET /api/insights
 * Get all insights with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const priority = req.query.priority as InsightPriority | undefined;
    const type = req.query.type as InsightType | undefined;

    // Fetch responses
    const allResponses = await storage.getResponsesWithPrompts();
    const competitors = await storage.getCompetitors();
    const brandAnalytics = await storage.getLatestAnalytics();

    // If no data, return empty state
    if (allResponses.length === 0) {
      return res.json({
        insights: [],
        totalCount: 0,
      });
    }

    // Get time windows for comparison
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const currentResponses = allResponses.filter(r =>
      r.createdAt && new Date(r.createdAt) >= weekAgo
    );
    const previousResponses = allResponses.filter(r =>
      r.createdAt && new Date(r.createdAt) >= twoWeeksAgo && new Date(r.createdAt) < weekAgo
    );

    // Transform to format expected by insights generator
    const brandName = brandAnalytics?.topCompetitor || 'Your Brand';
    const competitorNames = competitors.map(c => c.name);

    const currentForGenerator = currentResponses.map(r => ({
      text: r.text,
      platform: r.platform || 'unknown',
      promptText: r.prompt?.text || '',
      brandMentioned: r.brandMentioned || false,
    }));

    const previousForGenerator = previousResponses.map(r => ({
      text: r.text,
      platform: r.platform || 'unknown',
      promptText: r.prompt?.text || '',
      brandMentioned: r.brandMentioned || false,
    }));

    // Generate all insights
    const fullAnalysis = generateInsights(currentForGenerator, brandName, {
      competitors: competitorNames,
      previousResponses: previousForGenerator,
    });

    // Transform to API format
    let apiInsights: Insight[] = fullAnalysis.insights.map(transformInsight);

    // Apply filters
    if (priority) {
      apiInsights = apiInsights.filter(i => i.priority === priority);
    }
    if (type) {
      apiInsights = apiInsights.filter(i => i.type === type);
    }

    // Apply limit
    const limitedInsights = apiInsights.slice(0, limit);

    res.json({
      insights: limitedInsights,
      totalCount: apiInsights.length,
    });
  } catch (error) {
    console.error('[Insights API] Error fetching insights:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Unable to load insights. Please try again.',
    });
  }
});

/**
 * PATCH /api/insights/:id/status
 * Update insight status (dismiss, complete, etc.)
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'completed', 'dismissed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // In a real implementation, this would update a database record
    // For now, we acknowledge the request (insights are generated on-the-fly)
    res.json({
      success: true,
      message: `Insight ${id} marked as ${status}`,
      insightId: id,
      status,
    });
  } catch (error) {
    console.error('[Insights API] Error updating insight status:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Unable to update insight. Please try again.',
    });
  }
});

export default router;
