import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "node:crypto";
import { storage } from "./data";
import { analyzer, BrandMonitor, type AnalysisProgress } from "./services/analysis/brand-monitor";
import { findBrandCompetitors } from "./services/ai/brand-research";
import { profileBrandWebsite } from "./services/site-intelligence/site-profiler";
import { getQueueManager, getRateLimiter, getQueueRepository } from "./services/queue";
import { getSimpleSentiment } from "./services/analytics/sentiment-analyzer";
import type { TopicsAnalysisResponse, TopicMetric } from "@shared/types/visibility";
import type { TrendDirection } from "@shared/types/insights";
import metricsRoutes from "./routes/metrics";
import tagsRoutes from "./routes/tags";
import personasRoutes from "./routes/personas";
import variantsRoutes from "./routes/variants";
import exportRoutes from "./routes/export";
import auditRoutes from "./routes/audit";
import botsRoutes from "./routes/bots";
import schedulesRoutes from "./routes/schedules";
import alertsRoutes from "./routes/alerts";
import promptsRoutes from "./routes/prompts";
import platformsRoutes from "./routes/platforms";
import dashboardRoutes from "./routes/dashboard";
import insightsRoutes from "./routes/insights";
import visibilityRoutes from "./routes/visibility";
import utilsRoutes from "./routes/utils";
import intelligenceRoutes from "./routes/intelligence";
import competitorsRoutes from "./routes/competitors";
import logosRoutes from "./routes/logos";
import discoveryRoutes from "./routes/discovery";
import citationsRoutes from "./routes/citations";
import siteHealthRoutes from "./routes/site-health";
import searchRoutes from "./routes/search";
import cdnWebhooksRoutes from "./routes/webhooks/cdn";
import { getPriorityManager } from "./services/refresh/priority-manager";
import { getRefreshHistoryService } from "./services/refresh/refresh-history";
import { currentWorkspaceId, runInWorkspace } from "./context/workspace-context";
import { prismaRoot } from "./prisma";
import { getAuth } from "@clerk/express";
import type { Prompt } from "@shared/schema";

const activeAnalysisRuns = new Map<string, AnalysisProgress>();

function withApiFailure(message: string, handle: (request: Request, response: Response) => Promise<unknown>) {
  return async (request: Request, response: Response) => {
    try {
      await handle(request, response);
    } catch (error) {
      console.error(`[api] ${message}`, error);
      if (!response.headersSent) response.status(500).json({ error: message });
    }
  };
}

function progressKey(workspaceId: string, sessionId: string): string {
  return `${workspaceId}:${sessionId}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/workspaces", withApiFailure("Failed to fetch workspaces", async (request, response) => {
    const { userId } = getAuth(request);
    if (!userId) {
      response.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      return;
    }

    const memberships = await prismaRoot.workspace_members.findMany({
      where: { user_id: userId, workspaces: { deleted_at: null } },
      select: {
        role: true,
        workspaces: { select: { id: true, name: true, slug: true, is_demo: true, onboarding_completed_at: true } },
      },
      orderBy: { joined_at: "asc" },
    });

    response.json({
      workspaces: memberships.map(({ role, workspaces }) => ({ ...workspaces, role })),
      currentWorkspaceId: currentWorkspaceId(),
    });
  }));

  app.patch("/api/workspaces/current", withApiFailure("Failed to update workspace", async (request, response) => {
    const { userId } = getAuth(request);
    if (!userId) {
      response.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      return;
    }

    const requestedName = typeof request.body?.name === "string" ? request.body.name.trim() : "";
    if (requestedName.length < 2 || requestedName.length > 50) {
      response.status(400).json({ error: "Organization name must be between 2 and 50 characters" });
      return;
    }

    const workspaceId = currentWorkspaceId();
    if (!workspaceId) {
      response.status(400).json({ error: "No active workspace for this request" });
      return;
    }

    const membership = await prismaRoot.workspace_members.findUnique({
      where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: userId } },
      select: { role: true },
    });
    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      response.status(403).json({ error: "Only workspace owners and admins can rename it" });
      return;
    }

    const workspace = await prismaRoot.workspaces.update({
      where: { id: workspaceId },
      data: { name: requestedName, onboarding_completed_at: new Date(), updated_at: new Date() },
      select: { id: true, name: true, slug: true, onboarding_completed_at: true },
    });

    response.json({ workspace });
  }));

  // Overview metrics endpoint
  app.get("/api/metrics", withApiFailure("Failed to fetch metrics", async (_request, response) => {
    response.json(await analyzer.getOverviewMetrics());
  }));

  // Total counts endpoint for accurate statistics
  app.get("/api/counts", withApiFailure("Failed to fetch counts", async (_request, response) => {
    const [responses, prompts, topics, competitors, sources] = await Promise.all([
      storage.getResponsesWithPrompts(),
      storage.getPrompts(),
      storage.getTopics(),
      storage.getCompetitors(),
      storage.getSources(),
    ]);
    const brandMentions = responses.filter((item) => item.brandMentioned).length;

    response.json({
      totalResponses: responses.length,
      totalPrompts: prompts.length,
      totalTopics: topics.length,
      totalCompetitors: competitors.length,
      totalSources: sources.length,
      brandMentions,
      brandMentionRate: responses.length ? brandMentions / responses.length * 100 : 0,
    });
  }));

  // Topic analysis endpoint
  app.get("/api/topics", withApiFailure("Failed to fetch topics", async (_request, response) => {
    response.json(await storage.getTopics());
  }));

  app.get("/api/topics/analysis", withApiFailure("Failed to fetch topic analysis", async (_request, response) => {
      // Get raw topic analysis from storage
      const rawAnalysis = await analyzer.getTopicAnalysis();
      const allResponses = await storage.getResponsesWithPrompts();
      const topics = await storage.getTopics();

      // Calculate previous period data for trend comparison (last 30 days vs prior 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const currentResponses = allResponses.filter(r =>
        r.createdAt && new Date(r.createdAt) >= thirtyDaysAgo
      );
      const previousResponses = allResponses.filter(r =>
        r.createdAt && new Date(r.createdAt) >= sixtyDaysAgo && new Date(r.createdAt) < thirtyDaysAgo
      );

      // Transform to TopicMetric[] with computed fields
      const topicMetrics: TopicMetric[] = rawAnalysis.map(ta => {
        const topic = topics.find(t => t.id === ta.topicId);

        // Current period responses for this topic
        const currentTopicResponses = currentResponses.filter(
          r => r.prompt?.topicId === ta.topicId
        );
        const previousTopicResponses = previousResponses.filter(
          r => r.prompt?.topicId === ta.topicId
        );

        // Compute visibilityScore from mentionRate (0-100)
        const visibilityScore = Math.round(ta.brandResponseMentionRate);

        // Compute sentiment from brand-mentioned responses for this topic
        const brandResponses = currentTopicResponses.filter(r => r.brandMentioned);
        const sentimentScores = brandResponses.map(r => getSimpleSentiment(r.text).score);
        const avgSentiment = sentimentScores.length > 0
          ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
          : 0;

        // Compute trend: compare current vs previous period mentions
        const currentMentions = currentTopicResponses.filter(r => r.brandMentioned).length;
        const previousMentions = previousTopicResponses.filter(r => r.brandMentioned).length;
        const trend = previousMentions > 0
          ? Math.round(((currentMentions - previousMentions) / previousMentions) * 100 * 10) / 10
          : 0;

        // Compute trendDirection from trend value
        let trendDirection: TrendDirection = 'stable';
        if (trend > 1) trendDirection = 'up';
        else if (trend < -1) trendDirection = 'down';

        return {
          id: String(ta.topicId),
          name: ta.topicLabel,
          visibilityScore,
          mentions: ta.brandMentionedResponseCount,
          sentiment: Math.round(avgSentiment * 100) / 100,
          trend,
          trendDirection,
        };
      });

      // Split into winning (positive trend or high score) and toImprove (negative trend or low score)
      const winning = topicMetrics.filter(t =>
        t.trendDirection === 'up' || (t.trendDirection === 'stable' && t.visibilityScore >= 50)
      );
      const toImprove = topicMetrics.filter(t =>
        t.trendDirection === 'down' || (t.trendDirection === 'stable' && t.visibilityScore < 50)
      );

      const payload: TopicsAnalysisResponse = {
        topics: topicMetrics,
        winning,
        toImprove,
      };

      response.json(payload);
  }));

  // NOTE: Competitor endpoints moved to api/routes/competitors.ts
  // - GET /api/competitors now returns CompetitorsResponse with full metrics
  // - GET /api/competitors/analysis is available via useCompetitorMetrics hook
  // See: app.use('/api/competitors', competitorsRoutes);

  // Sources endpoints
  app.get("/api/sources", withApiFailure("Failed to fetch sources", async (_request, response) => {
    response.json(await storage.getSources());
  }));

  app.get("/api/sources/analysis", withApiFailure("Failed to fetch source analysis", async (_request, response) => {
    response.json(await analyzer.getSourceAnalysis());
  }));

  // Prompts endpoint - MOVED to routes/prompts.ts

  // Prompt results endpoints - supports full dataset access
  app.get("/api/responses", withApiFailure("Failed to fetch responses", async (request, response) => {
    const parsedLimit = Number.parseInt(String(request.query.limit ?? "10"), 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;
    const rows = request.query.full === "true" || limit > 100
      ? await storage.getResponsesWithPrompts()
      : await storage.getLatestResponses();

    response.json(rows.slice(0, limit));
  }));

  app.get("/api/responses/:id", withApiFailure("Failed to fetch response", async (request, response) => {
    const id = Number.parseInt(request.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      response.status(400).json({ error: "Response ID must be a positive integer" });
      return;
    }

    const record = await storage.getResponseById(id);
    if (!record) {
      response.status(404).json({ error: "No response exists with that ID in this workspace" });
      return;
    }

    response.json(record);
  }));

  // Manual prompt testing
  // Manual prompt testing - MOVED to routes/prompts.ts

  // Bulk CSV import for prompts
  // Prompt management routes - MOVED to routes/prompts.ts

  // Data management endpoints
  app.post("/api/data/clear", withApiFailure("Failed to clear data", async (request, response) => {
    const clearers: Record<string, () => Promise<void>> = {
      all: async () => {
        const workspaceCollections = [
          storage.clearAllPrompts,
          storage.clearAllResponses,
          storage.clearAllCompetitors,
        ];
        for (const clearCollection of workspaceCollections) await clearCollection.call(storage);
      },
      prompts: () => storage.clearAllPrompts(),
      responses: () => storage.clearAllResponses(),
    };
    const type = request.body?.type;
    const clear = clearers[type];

    if (!clear) {
      response.status(400).json({ error: "Choose all, prompts, or responses" });
      return;
    }

    await clear();
    response.json({ success: true, cleared: type });
  }));

  app.post("/api/analyze-brand", withApiFailure("Brand discovery failed", async (request, response) => {
    const website = request.body?.url;
    if (typeof website !== "string" || !website.trim()) {
      response.status(400).json({ error: "A website URL is required" });
      return;
    }

    const profile = await profileBrandWebsite(website.trim());
    response.json({ competitors: await findBrandCompetitors(profile) });
  }));

  // Generate prompts endpoint - MOVED to routes/prompts.ts

  app.post("/api/save-and-analyze", withApiFailure("Unable to prepare analysis", async (request, response) => {
    const topics = request.body?.topics;
    if (!Array.isArray(topics) || topics.some((topic) =>
      !topic || typeof topic.name !== "string" || !Array.isArray(topic.prompts)
    )) {
      response.status(400).json({ error: "Provide topics with names and prompt lists" });
      return;
    }

    const existingTopics = new Map((await storage.getTopics()).map((topic) => [topic.name, topic]));
    const allPrompts: Prompt[] = [];
    for (const topic of topics) {
      let topicRecord = existingTopics.get(topic.name);
      if (!topicRecord) {
        topicRecord = await storage.createTopic({ name: topic.name, description: topic.description });
        existingTopics.set(topicRecord.name, topicRecord);
      }

      const created = await Promise.all(topic.prompts.map((text: string) =>
        storage.createPrompt({ text, topicId: topicRecord!.id })
      ));
      allPrompts.push(...created);
    }

    const workspaceId = currentWorkspaceId();
    if (!workspaceId) throw new Error("Workspace context is required for analysis");
    const sessionId = randomUUID();
    const key = progressKey(workspaceId, sessionId);
    const worker = new BrandMonitor((progress) => activeAnalysisRuns.set(key, progress));
    await storage.clearAllResponses();
    response.status(202).json({ sessionId, promptsCreated: allPrompts.length, status: "queued" });
    setTimeout(() => {
      void runInWorkspace(workspaceId, () => worker.runFullAnalysis(false, allPrompts)).catch((error) => {
        console.error("Analysis failed:", error);
        activeAnalysisRuns.set(key, { status: "error", message: error.message, progress: 0 });
      });
    }, 250);
  }));

  app.post("/api/analysis/start", withApiFailure("Could not queue analysis", async (request, response) => {
      const settings = request.body?.settings;
      const workspaceId = currentWorkspaceId();
      if (!workspaceId) throw new Error("Workspace context is required for analysis");
      const sessionId = randomUUID();
      const key = progressKey(workspaceId, sessionId);
      const existingPrompts = await storage.getPrompts();
      const useExistingPrompts = existingPrompts.length > 0;
      const analysisWorker = new BrandMonitor((progress) => {
        activeAnalysisRuns.set(key, progress);
      });
      const plannedPromptCount = settings?.promptsPerTopic * settings?.numberOfTopics || 100;
      response.status(202).json({
        sessionId,
        status: "queued",
        promptSource: useExistingPrompts ? "workspace" : "generated",
        plannedPromptCount,
      });
      setTimeout(() => {
        void runInWorkspace(workspaceId, () => analysisWorker.runFullAnalysis(useExistingPrompts, undefined, settings)).catch((error) => {
          console.error("Analysis failed:", error);
          activeAnalysisRuns.set(key, { status: "error", message: error.message, progress: 0 });
        });
      }, 250);
  }));

  // Get analysis progress
  app.get("/api/analysis/:sessionId/progress", (req, res) => {
    const workspaceId = currentWorkspaceId();
    if (!workspaceId) {
      res.status(401).json({ error: "Workspace context is required" });
      return;
    }
    const progress = activeAnalysisRuns.get(progressKey(workspaceId, req.params.sessionId));
    if (!progress) {
      res.status(404).json({ error: "No analysis run matches that session" });
      return;
    }
    res.json(progress);
  });

  app.get("/api/export", withApiFailure("Could not create workspace export", async (_request, response) => {
      const [topics, prompts, responses, competitors, sources, analytics] = await Promise.all([
        storage.getTopics(),
        storage.getPrompts(),
        storage.getResponses(),
        storage.getCompetitors(),
        storage.getSources(),
        storage.getLatestAnalytics(),
      ]);
      const snapshot = { exportedAt: new Date().toISOString(), analytics, topics, prompts, responses, competitors, sources };
      response.attachment(`openaeo-export-${Date.now()}.json`).json(snapshot);
  }));

  // Generate prompts for a single custom topic
  // Generate topic prompts endpoint - MOVED to routes/prompts.ts

  // =====================================================
  // Metrics API Routes
  // =====================================================
  app.use('/api/metrics', metricsRoutes);

  // =====================================================
  // Tags API Routes
  // =====================================================
  app.use('/api/tags', tagsRoutes);

  // =====================================================
  // Personas API Routes
  // =====================================================
  app.use('/api/personas', personasRoutes);

  // =====================================================
  // Variants API Routes (A/B Testing)
  // =====================================================
  app.use('/api', variantsRoutes);

  // =====================================================
  // Export API Routes (CSV)
  // =====================================================
  app.use('/api/export', exportRoutes);

  // =====================================================
  // Audit API Routes (Site Audit for AI Bot Accessibility)
  // =====================================================
  app.use('/api/audit', auditRoutes);

  // =====================================================
  // Bot Traffic API Routes (Webhook + Stats)
  // =====================================================
  app.use('/api', botsRoutes);

  // =====================================================
  // Schedules API Routes (Scheduled Scans)
  // =====================================================
  app.use('/api/schedules', schedulesRoutes);

  // =====================================================
  // Alerts API Routes (Rules, Channels, History)
  // =====================================================
  app.use('/api/alerts', alertsRoutes);

  // =====================================================
  // Prompts API Routes
  // =====================================================
  app.use("/api/prompts", promptsRoutes);

  // =====================================================

  // =====================================================
  app.use('/api/platforms', platformsRoutes);

  // =====================================================


  // =====================================================
  app.use('/api/dashboard', dashboardRoutes);

  // =====================================================


  // =====================================================
  app.use('/api/insights', insightsRoutes);

  // =====================================================


  // =====================================================
  app.use('/api/visibility', visibilityRoutes);

  // =====================================================
  // Utility API Routes (domain validation, etc.)
  // =====================================================
  app.use('/api/utils', utilsRoutes);

  // =====================================================
  // Intelligence API Routes (search history)
  // =====================================================
  app.use('/api/intelligence', intelligenceRoutes);

  // =====================================================
  // Competitors API Routes (Add Competitor Wizard)

  // =====================================================
  app.use('/api/competitors', competitorsRoutes);

  // =====================================================
  // Logos API Routes (Logo Caching Service)
  // Caches company logos to avoid repeated logo.dev API calls
  // =====================================================
  app.use('/api/logos', logosRoutes);

  // =====================================================
  // Discovery API Routes (Prompts & Topics Page)

  // =====================================================
  app.use('/api/discovery', discoveryRoutes);

  // =====================================================
  // Citations API Routes (Citations Page)

  // =====================================================
  app.use('/api/citations', citationsRoutes);

  // =====================================================
  // Site Health API Routes (Bot Traffic > Site Health)

  // =====================================================
  app.use('/api/site-health', siteHealthRoutes);

  app.use('/api/search', searchRoutes);

  // =====================================================
  // CDN Webhook Receivers (Cloudflare, Vercel, Netlify)
  // Receives bot traffic data from CDN log drains

  // =====================================================
  app.use('/api/webhooks/cdn', cdnWebhooksRoutes);

  // =====================================================
  // Priority and Refresh API Endpoints
  // =====================================================

  /**
   * PATCH /api/prompts/:id/priority
   * Toggle priority status for a prompt
   */
  app.patch("/api/prompts/:id/priority", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid prompt ID" });
      }

      const { isPriority } = req.body;
      if (typeof isPriority !== 'boolean') {
        return res.status(400).json({ error: "isPriority must be a boolean" });
      }

      const priorityManager = getPriorityManager();
      const prompt = await priorityManager.togglePriority(id, isPriority);

      if (!prompt) {
        return res.status(404).json({ error: "Prompt not found" });
      }

      res.json(prompt);
    } catch (error) {
      console.error("Error toggling priority:", error);
      res.status(500).json({ error: "Failed to toggle priority" });
    }
  });

  /**
   * GET /api/prompts/priority
   * Get all priority prompts
   */
  app.get("/api/prompts/priority", async (_req, res) => {
    try {
      const priorityManager = getPriorityManager();
      const prompts = await priorityManager.getPriorityPrompts();
      res.json(prompts);
    } catch (error) {
      console.error("Error fetching priority prompts:", error);
      res.status(500).json({ error: "Failed to fetch priority prompts" });
    }
  });

  /**
   * GET /api/prompts/stale
   * Get stale prompts (not refreshed in N days)
   */
  app.get("/api/prompts/stale", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string, 10) || 7;
      const priorityManager = getPriorityManager();
      const prompts = await priorityManager.getStalePrompts(days);
      res.json(prompts);
    } catch (error) {
      console.error("Error fetching stale prompts:", error);
      res.status(500).json({ error: "Failed to fetch stale prompts" });
    }
  });

  /**
   * GET /api/prompts/:id/refresh-history
   * Get refresh history for a prompt
   */
  app.get("/api/prompts/:id/refresh-history", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid prompt ID" });
      }

      const limit = parseInt(req.query.limit as string, 10) || 10;
      const refreshHistoryService = getRefreshHistoryService();
      const history = await refreshHistoryService.getRefreshHistory(id, limit);

      res.json(history);
    } catch (error) {
      console.error("Error fetching refresh history:", error);
      res.status(500).json({ error: "Failed to fetch refresh history" });
    }
  });

  /**
   * POST /api/prompts/:id/refresh
   * Manually trigger a refresh for a prompt
   */
  app.post("/api/prompts/:id/refresh", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid prompt ID" });
      }

      const refreshHistoryService = getRefreshHistoryService();
      const history = await refreshHistoryService.logRefresh(id, 'pending');

      res.json({
        success: true,
        message: "Refresh queued",
        historyId: history.id,
      });
    } catch (error) {
      console.error("Error triggering refresh:", error);
      res.status(500).json({ error: "Failed to trigger refresh" });
    }
  });

  /**
   * GET /api/refresh/recent
   * Get recent refresh operations
   */
  app.get("/api/refresh/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const refreshHistoryService = getRefreshHistoryService();
      const history = await refreshHistoryService.getRecentRefreshes(limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching recent refreshes:", error);
      res.status(500).json({ error: "Failed to fetch recent refreshes" });
    }
  });

  /**
   * GET /api/refresh/stats
   * Get refresh statistics
   */
  app.get("/api/refresh/stats", async (_req, res) => {
    try {
      const refreshHistoryService = getRefreshHistoryService();
      const priorityManager = getPriorityManager();

      const refreshStats = await refreshHistoryService.getRefreshStats();
      const promptStats = await priorityManager.getRefreshStats();

      res.json({
        refresh: refreshStats,
        prompts: promptStats,
      });
    } catch (error) {
      console.error("Error fetching refresh stats:", error);
      res.status(500).json({ error: "Failed to fetch refresh stats" });
    }
  });

  // =====================================================
  // Queue Status API Endpoints
  // =====================================================

  /**
   * GET /api/queue/status
   * Returns current queue status including pending/running/completed counts
   */
  app.get("/api/queue/status", async (req, res) => {
    try {
      const queueManager = getQueueManager();
      const rateLimiter = getRateLimiter();
      const queueRepo = getQueueRepository();

      // Get status from in-memory queue manager
      const queueStatus = queueManager.getStatus();

      // Get counts from database for persistence accuracy
      const dbStats = await queueRepo.getStats();

      // Calculate overall progress
      const total = dbStats.totalPending + dbStats.totalProcessing +
        dbStats.totalCompleted + dbStats.totalFailed;
      const progressPercent = total === 0 ? 100 :
        Math.round(((dbStats.totalCompleted + dbStats.totalFailed) / total) * 100);

      // Determine overall status
      let status: 'idle' | 'processing' | 'paused' = 'idle';
      if (dbStats.totalProcessing > 0 || dbStats.totalPending > 0) {
        // Check if all platforms are paused
        const allPaused = Object.values(queueStatus.platforms).every(p => p.paused);
        status = allPaused ? 'paused' : 'processing';
      }

      // Build platform-specific status
      const platforms: Record<string, any> = {};
      for (const [platform, memStatus] of Object.entries(queueStatus.platforms)) {
        const platformDbStats = dbStats.byPlatform[platform] || {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
        };

        platforms[platform] = {
          pending: platformDbStats.pending || memStatus.pending,
          running: platformDbStats.processing || memStatus.processing,
          completed: platformDbStats.completed,
          failed: platformDbStats.failed,
          paused: memStatus.paused,
          rateLimit: {
            active: memStatus.rateLimit.activeCount,
            available: memStatus.rateLimit.availableSlots,
            isLimited: memStatus.rateLimit.isLimited,
          },
        };
      }

      // Estimate time remaining (rough: 2 seconds per pending request)
      const estimatedTimeRemaining = dbStats.totalPending * 2;

      const response = {
        status,
        overall: {
          pending: dbStats.totalPending,
          running: dbStats.totalProcessing,
          completed: dbStats.totalCompleted,
          failed: dbStats.totalFailed,
          progressPercent,
        },
        platforms,
        estimatedTimeRemaining,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching queue status:", error);
      res.status(500).json({ error: "Failed to fetch queue status" });
    }
  });

  /**
   * POST /api/queue/retry/:id
   * Retry a failed queue item
   */
  app.post("/api/queue/retry/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const queueId = parseInt(id, 10);

      if (isNaN(queueId)) {
        return res.status(400).json({ error: "Invalid queue item ID" });
      }

      const queueRepo = getQueueRepository();
      const item = await queueRepo.getById(queueId);

      if (!item) {
        return res.status(404).json({ error: "Queue item not found" });
      }

      if (item.status !== 'failed') {
        return res.status(400).json({
          error: "Can only retry failed items",
          currentStatus: item.status,
        });
      }

      // Reset the item for retry
      await queueRepo.resetForRetry(queueId, 0);

      // Trigger queue processing for this platform
      const queueManager = getQueueManager();
      queueManager.triggerProcessing(item.platform as any);

      res.json({
        success: true,
        message: "Retry queued",
        itemId: queueId,
        platform: item.platform,
      });
    } catch (error) {
      console.error("Error retrying queue item:", error);
      res.status(500).json({ error: "Failed to retry queue item" });
    }
  });

  /**
   * POST /api/queue/pause/:platform?
   * Pause queue processing (all platforms or specific platform)
   */
  app.post("/api/queue/pause/:platform?", async (req, res) => {
    try {
      const { platform } = req.params;
      const queueManager = getQueueManager();

      if (platform) {
        queueManager.pause(platform as any);
        res.json({ success: true, message: `Queue paused for ${platform}` });
      } else {
        queueManager.pauseAll();
        res.json({ success: true, message: "All queues paused" });
      }
    } catch (error) {
      console.error("Error pausing queue:", error);
      res.status(500).json({ error: "Failed to pause queue" });
    }
  });

  /**
   * POST /api/queue/resume/:platform?
   * Resume queue processing (all platforms or specific platform)
   */
  app.post("/api/queue/resume/:platform?", async (req, res) => {
    try {
      const { platform } = req.params;
      const queueManager = getQueueManager();

      if (platform) {
        queueManager.resume(platform as any);
        res.json({ success: true, message: `Queue resumed for ${platform}` });
      } else {
        queueManager.resumeAll();
        res.json({ success: true, message: "All queues resumed" });
      }
    } catch (error) {
      console.error("Error resuming queue:", error);
      res.status(500).json({ error: "Failed to resume queue" });
    }
  });

  /**
   * DELETE /api/queue/clear/:platform?
   * Clear queue (all platforms or specific platform)
   */
  app.delete("/api/queue/clear/:platform?", async (req, res) => {
    try {
      const { platform } = req.params;
      const queueManager = getQueueManager();

      if (platform) {
        queueManager.clearQueue(platform as any);
        res.json({ success: true, message: `Queue cleared for ${platform}` });
      } else {
        queueManager.clearAllQueues();
        res.json({ success: true, message: "All queues cleared" });
      }
    } catch (error) {
      console.error("Error clearing queue:", error);
      res.status(500).json({ error: "Failed to clear queue" });
    }
  });

  /**
   * POST /api/queue/cleanup
   * Clean up old completed/failed queue items
   */
  app.post("/api/queue/cleanup", async (req, res) => {
    try {
      const { olderThanDays = 7 } = req.body;
      const queueRepo = getQueueRepository();

      const deletedCount = await queueRepo.cleanupOld(olderThanDays);

      res.json({
        success: true,
        message: `Cleaned up ${deletedCount} old queue items`,
        deletedCount,
      });
    } catch (error) {
      console.error("Error cleaning up queue:", error);
      res.status(500).json({ error: "Failed to clean up queue" });
    }
  });

  return createServer(app);
}
