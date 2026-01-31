/**
 * Performance Tracker Service
 *
 * Tracks and analyzes prompt performance metrics including:
 * - Execution counts and success rates
 * - Visibility and position scores
 * - Brand mention rates
 * - Response time tracking
 */

import { prisma } from "../../prisma";
import { fromPrismaRow, requireWorkspaceId } from "../../prisma-mapping";
import type { PromptPerformanceMetrics, Prompt } from "../../../shared/schema";

/**
 * Performance summary for a prompt
 */
export interface PerformanceSummary {
  promptId: number;
  promptText: string;
  executionCount: number;
  brandMentionRate: number;
  avgVisibilityScore: number | null;
  avgPosition: number | null;
  successRate: number | null;
  lastExecutedAt: Date | null;
  trend: 'improving' | 'stable' | 'declining' | 'unknown';
}

/**
 * Top performer result
 */
export interface TopPerformer {
  prompt: Prompt;
  metrics: PromptPerformanceMetrics;
  rank: number;
}

/**
 * Performance comparison result
 */
export interface PerformanceComparison {
  promptId: number;
  currentPeriod: PerformancePeriodData;
  previousPeriod: PerformancePeriodData;
  change: PerformanceChange;
}

export interface PerformancePeriodData {
  executionCount: number;
  brandMentionRate: number;
  avgVisibilityScore: number | null;
}

export interface PerformanceChange {
  executionCountChange: number;
  brandMentionRateChange: number;
  visibilityChange: number | null;
}

/**
 * Performance Tracker class
 */
export class PerformanceTracker {
  /**
   * Record an execution for a prompt
   */
  async recordExecution(
    promptId: number,
    data: {
      brandMentioned: boolean;
      visibilityScore?: number;
      position?: number;
      sentiment?: number;
      responseTimeMs?: number;
      success: boolean;
    }
  ): Promise<PromptPerformanceMetrics> {
    // Get or create metrics record
    const workspace_id = requireWorkspaceId();
    let metricsRow = await prisma.prompt_performance_metrics.findFirst({ where: { workspace_id, prompt_id: promptId } });

    if (!metricsRow) {
      // Create new metrics record
      const created = await prisma.prompt_performance_metrics.create({
        data: { workspace_id, prompt_id: promptId, execution_count: 0, brand_mention_count: 0 },
      });
      metricsRow = created;
    }
    const metrics = fromPrismaRow<PromptPerformanceMetrics>(metricsRow as unknown as Record<string, unknown>);

    // Update metrics incrementally
    const newExecutionCount = (metrics.executionCount || 0) + 1;
    const newBrandMentionCount = (metrics.brandMentionCount || 0) + (data.brandMentioned ? 1 : 0);

    // Calculate rolling averages
    const oldCount = metrics.executionCount || 0;

    let newAvgVisibility = metrics.avgVisibilityScore;
    if (data.visibilityScore !== undefined) {
      if (newAvgVisibility === null) {
        newAvgVisibility = data.visibilityScore;
      } else {
        newAvgVisibility = ((newAvgVisibility * oldCount) + data.visibilityScore) / newExecutionCount;
      }
    }

    let newAvgPosition = metrics.avgPosition;
    if (data.position !== undefined) {
      if (newAvgPosition === null) {
        newAvgPosition = data.position;
      } else {
        newAvgPosition = ((newAvgPosition * oldCount) + data.position) / newExecutionCount;
      }
    }

    let newAvgSentiment = metrics.avgSentiment;
    if (data.sentiment !== undefined) {
      if (newAvgSentiment === null) {
        newAvgSentiment = data.sentiment;
      } else {
        newAvgSentiment = ((newAvgSentiment * oldCount) + data.sentiment) / newExecutionCount;
      }
    }

    let newAvgResponseTime = metrics.avgResponseTimeMs;
    if (data.responseTimeMs !== undefined) {
      if (newAvgResponseTime === null) {
        newAvgResponseTime = data.responseTimeMs;
      } else {
        newAvgResponseTime = Math.round(((newAvgResponseTime * oldCount) + data.responseTimeMs) / newExecutionCount);
      }
    }

    // Calculate success rate
    const successCount = data.success
      ? Math.round((metrics.successRate || 1) * oldCount) + 1
      : Math.round((metrics.successRate || 1) * oldCount);
    const newSuccessRate = successCount / newExecutionCount;

    // Update the record
    const updated = await prisma.prompt_performance_metrics.update({
      where: { id: metricsRow.id },
      data: {
        execution_count: newExecutionCount, brand_mention_count: newBrandMentionCount,
        avg_visibility_score: newAvgVisibility, avg_position: newAvgPosition, avg_sentiment: newAvgSentiment,
        avg_response_time_ms: newAvgResponseTime, success_rate: newSuccessRate,
        last_executed_at: new Date(), last_calculated_at: new Date(), updated_at: new Date(),
      },
    });
    return fromPrismaRow<PromptPerformanceMetrics>(updated as unknown as Record<string, unknown>);
  }

  /**
   * Get metrics for a prompt
   */
  async getMetrics(promptId: number): Promise<PromptPerformanceMetrics | null> {
    const metrics = await prisma.prompt_performance_metrics.findFirst({
      where: { prompt_id: promptId, workspace_id: requireWorkspaceId() },
    });
    return metrics ? fromPrismaRow<PromptPerformanceMetrics>(metrics as unknown as Record<string, unknown>) : null;
  }

  /**
   * Get performance summary for a prompt
   */
  async getPerformanceSummary(promptId: number): Promise<PerformanceSummary | null> {
    const promptRow = await prisma.prompts.findFirst({ where: { id: promptId, workspace_id: requireWorkspaceId() } });
    const prompt = promptRow ? fromPrismaRow<Prompt>(promptRow as unknown as Record<string, unknown>) : null;
    if (!prompt) {
      return null;
    }

    const metrics = await this.getMetrics(promptId);
    if (!metrics) {
      return {
        promptId,
        promptText: prompt.text,
        executionCount: 0,
        brandMentionRate: 0,
        avgVisibilityScore: null,
        avgPosition: null,
        successRate: null,
        lastExecutedAt: null,
        trend: 'unknown',
      };
    }

    const brandMentionRate = metrics.executionCount && metrics.executionCount > 0
      ? (metrics.brandMentionCount || 0) / metrics.executionCount
      : 0;

    return {
      promptId,
      promptText: prompt.text,
      executionCount: metrics.executionCount || 0,
      brandMentionRate,
      avgVisibilityScore: metrics.avgVisibilityScore,
      avgPosition: metrics.avgPosition,
      successRate: metrics.successRate,
      lastExecutedAt: metrics.lastExecutedAt,
      trend: this.determineTrend(metrics),
    };
  }

  /**
   * Get top performing prompts
   */
  async getTopPerformers(options: {
    limit?: number;
    metric?: 'visibility' | 'mentions' | 'success';
    minExecutions?: number;
  } = {}): Promise<TopPerformer[]> {
    const { limit = 10, metric = 'visibility', minExecutions = 5 } = options;

    const rawMetrics = await prisma.prompt_performance_metrics.findMany({
      where: { workspace_id: requireWorkspaceId(), execution_count: { gte: minExecutions } },
    });
    const metricsResults = rawMetrics.map((row) => fromPrismaRow<PromptPerformanceMetrics>(row as unknown as Record<string, unknown>));
    const score = (item: PromptPerformanceMetrics) => metric === "mentions"
      ? (item.brandMentionCount ?? 0) / (item.executionCount || 1)
      : metric === "success" ? (item.successRate ?? 0) : (item.avgVisibilityScore ?? 0);
    metricsResults.sort((a, b) => score(b) - score(a));

    const results: TopPerformer[] = [];
    for (let i = 0; i < metricsResults.length; i++) {
      const m = metricsResults[i];
      const promptRow = await prisma.prompts.findFirst({ where: { id: m.promptId, workspace_id: requireWorkspaceId() } });
      const prompt = promptRow ? fromPrismaRow<Prompt>(promptRow as unknown as Record<string, unknown>) : null;
      if (prompt) {
        results.push({
          prompt,
          metrics: m,
          rank: i + 1,
        });
      }
    }

    return results;
  }

  /**
   * Get worst performing prompts
   */
  async getWorstPerformers(options: {
    limit?: number;
    metric?: 'visibility' | 'mentions' | 'success';
    minExecutions?: number;
  } = {}): Promise<TopPerformer[]> {
    const { limit = 10, metric = 'visibility', minExecutions = 5 } = options;

    const rawMetrics = await prisma.prompt_performance_metrics.findMany({
      where: { workspace_id: requireWorkspaceId(), execution_count: { gte: minExecutions } },
    });
    const metricsResults = rawMetrics.map((row) => fromPrismaRow<PromptPerformanceMetrics>(row as unknown as Record<string, unknown>));
    const score = (item: PromptPerformanceMetrics) => metric === "mentions"
      ? (item.brandMentionCount ?? 0) / (item.executionCount || 1)
      : metric === "success" ? (item.successRate ?? 0) : (item.avgVisibilityScore ?? 0);
    metricsResults.sort((a, b) => score(a) - score(b));

    const results: TopPerformer[] = [];
    for (let i = 0; i < metricsResults.length; i++) {
      const m = metricsResults[i];
      const promptRow = await prisma.prompts.findFirst({ where: { id: m.promptId, workspace_id: requireWorkspaceId() } });
      const prompt = promptRow ? fromPrismaRow<Prompt>(promptRow as unknown as Record<string, unknown>) : null;
      if (prompt) {
        results.push({
          prompt,
          metrics: m,
          rank: i + 1,
        });
      }
    }

    return results;
  }

  /**
   * Get prompts that need optimization (low performance)
   */
  async getPromptsNeedingOptimization(options: {
    visibilityThreshold?: number;
    successRateThreshold?: number;
    minExecutions?: number;
    limit?: number;
  } = {}): Promise<Array<{ prompt: Prompt; metrics: PromptPerformanceMetrics; issues: string[] }>> {
    const {
      visibilityThreshold = 30,
      successRateThreshold = 0.7,
      minExecutions = 5,
      limit = 20,
    } = options;

    const rows = await prisma.prompt_performance_metrics.findMany({
      where: { workspace_id: requireWorkspaceId(), execution_count: { gte: minExecutions } },
    });
    const allMetrics = rows.map((row) => fromPrismaRow<PromptPerformanceMetrics>(row as unknown as Record<string, unknown>));

    const results: Array<{ prompt: Prompt; metrics: PromptPerformanceMetrics; issues: string[] }> = [];

    for (const m of allMetrics) {
      const issues: string[] = [];

      if (m.avgVisibilityScore !== null && m.avgVisibilityScore < visibilityThreshold) {
        issues.push(`Low visibility score: ${m.avgVisibilityScore.toFixed(1)}`);
      }

      if (m.successRate !== null && m.successRate < successRateThreshold) {
        issues.push(`Low success rate: ${(m.successRate * 100).toFixed(1)}%`);
      }

      const mentionRate = m.executionCount && m.executionCount > 0
        ? (m.brandMentionCount || 0) / m.executionCount
        : 0;
      if (mentionRate < 0.2) {
        issues.push(`Low brand mention rate: ${(mentionRate * 100).toFixed(1)}%`);
      }

      if (issues.length > 0) {
        const promptRow = await prisma.prompts.findFirst({ where: { id: m.promptId, workspace_id: requireWorkspaceId() } });
        const prompt = promptRow ? fromPrismaRow<Prompt>(promptRow as unknown as Record<string, unknown>) : null;
        if (prompt && !prompt.archivedAt) {
          results.push({ prompt, metrics: m, issues });
        }
      }

      if (results.length >= limit) break;
    }

    return results;
  }

  /**
   * Recalculate metrics from response history
   */
  async recalculateMetrics(promptId: number): Promise<PromptPerformanceMetrics | null> {
    // Get all responses for this prompt
    const promptResponses = await prisma.responses.findMany({
      where: { prompt_id: promptId, workspace_id: requireWorkspaceId() },
    });

    if (promptResponses.length === 0) {
      return null;
    }

    const executionCount = promptResponses.length;
    const brandMentionCount = promptResponses.filter((response) => response.brand_mentioned).length;

    // Get or create metrics record
    const workspace_id = requireWorkspaceId();
    const metrics = await prisma.prompt_performance_metrics.findFirst({ where: { workspace_id, prompt_id: promptId } });

    const updates = {
      executionCount,
      brandMentionCount,
      lastCalculatedAt: new Date(),
      updatedAt: new Date(),
    };

    if (metrics) {
      const updated = await prisma.prompt_performance_metrics.update({
        where: { id: metrics.id }, data: { execution_count: executionCount, brand_mention_count: brandMentionCount, last_calculated_at: updates.lastCalculatedAt, updated_at: updates.updatedAt },
      });
      return fromPrismaRow<PromptPerformanceMetrics>(updated as unknown as Record<string, unknown>);
    } else {
      const created = await prisma.prompt_performance_metrics.create({
        data: { workspace_id, prompt_id: promptId, execution_count: executionCount, brand_mention_count: brandMentionCount, last_calculated_at: updates.lastCalculatedAt, updated_at: updates.updatedAt },
      });
      return fromPrismaRow<PromptPerformanceMetrics>(created as unknown as Record<string, unknown>);
    }
  }

  /**
   * Recalculate all metrics
   */
  async recalculateAllMetrics(): Promise<{ updated: number; errors: number }> {
    const allPrompts = await prisma.prompts.findMany({ where: { workspace_id: requireWorkspaceId(), archived_at: null } });
    let updated = 0;
    let errors = 0;

    for (const prompt of allPrompts) {
      try {
        await this.recalculateMetrics(prompt.id);
        updated++;
      } catch (error) {
        errors++;
      }
    }

    return { updated, errors };
  }

  /**
   * Get aggregate statistics
   */
  async getAggregateStats(): Promise<{
    totalPrompts: number;
    totalExecutions: number;
    avgVisibilityScore: number | null;
    avgBrandMentionRate: number;
    avgSuccessRate: number | null;
    topCategory: string | null;
  }> {
    const rawMetrics = await prisma.prompt_performance_metrics.findMany({ where: { workspace_id: requireWorkspaceId() } });
    const allMetrics = rawMetrics.map((row) => fromPrismaRow<PromptPerformanceMetrics>(row as unknown as Record<string, unknown>));

    if (allMetrics.length === 0) {
      return {
        totalPrompts: 0,
        totalExecutions: 0,
        avgVisibilityScore: null,
        avgBrandMentionRate: 0,
        avgSuccessRate: null,
        topCategory: null,
      };
    }

    const totalExecutions = allMetrics.reduce((sum, m) => sum + (m.executionCount || 0), 0);
    const totalBrandMentions = allMetrics.reduce((sum, m) => sum + (m.brandMentionCount || 0), 0);

    const visibilityScores = allMetrics
      .filter(m => m.avgVisibilityScore !== null)
      .map(m => m.avgVisibilityScore as number);
    const avgVisibilityScore = visibilityScores.length > 0
      ? visibilityScores.reduce((a, b) => a + b, 0) / visibilityScores.length
      : null;

    const successRates = allMetrics
      .filter(m => m.successRate !== null)
      .map(m => m.successRate as number);
    const avgSuccessRate = successRates.length > 0
      ? successRates.reduce((a, b) => a + b, 0) / successRates.length
      : null;

    return {
      totalPrompts: allMetrics.length,
      totalExecutions,
      avgVisibilityScore,
      avgBrandMentionRate: totalExecutions > 0 ? totalBrandMentions / totalExecutions : 0,
      avgSuccessRate,
      topCategory: null, // Would need to join with prompts/topics
    };
  }

  /**
   * Delete metrics for a prompt
   */
  async deleteMetrics(promptId: number): Promise<boolean> {
    const result = await prisma.prompt_performance_metrics.deleteMany({
      where: { workspace_id: requireWorkspaceId(), prompt_id: promptId },
    });
    return result.count > 0;
  }

  /**
   * Determine performance trend
   */
  private determineTrend(metrics: PromptPerformanceMetrics): 'improving' | 'stable' | 'declining' | 'unknown' {
    // Simple trend determination based on available data
    // In a real implementation, this would compare recent vs historical performance
    if (!metrics.avgVisibilityScore || !metrics.executionCount || metrics.executionCount < 5) {
      return 'unknown';
    }

    // Placeholder - would need historical data for real trend analysis
    if (metrics.avgVisibilityScore >= 70) {
      return 'improving';
    } else if (metrics.avgVisibilityScore >= 40) {
      return 'stable';
    } else {
      return 'declining';
    }
  }
}

// Singleton instance
let globalPerformanceTracker: PerformanceTracker | null = null;

export function getPerformanceTracker(): PerformanceTracker {
  if (!globalPerformanceTracker) {
    globalPerformanceTracker = new PerformanceTracker();
  }
  return globalPerformanceTracker;
}

export function resetGlobalPerformanceTracker(): void {
  globalPerformanceTracker = null;
}
