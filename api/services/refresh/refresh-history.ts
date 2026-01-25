/**
 * Refresh History Service
 *
 * Tracks refresh operations on prompts for auditing and debugging.
 */

import { prisma } from '../../prisma';
import { currentWorkspaceId } from '../../context/workspace-context';
import type { RefreshHistory } from '@shared/schema';
import { getPriorityManager } from './priority-manager';

function workspaceId(): string {
  const id = currentWorkspaceId();
  if (!id) throw new Error('Workspace context is required for data access');
  return id;
}

function mapHistory(row: Record<string, unknown>): RefreshHistory {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
    value,
  ])) as RefreshHistory;
}

export type RefreshStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Refresh History Service
 */
export class RefreshHistoryService {
  /**
   * Log a refresh operation
   */
  async logRefresh(
    promptId: number,
    status: RefreshStatus,
    error?: string
  ): Promise<RefreshHistory> {
    const now = new Date();
    const history = await prisma.refresh_history.create({
      data: {
        workspace_id: workspaceId(),
        prompt_id: promptId,
        status,
        scheduled_for: now,
        started_at: status !== 'pending' ? now : undefined,
        completed_at: status === 'completed' || status === 'failed' ? now : undefined,
        error,
      },
    });

    // If completed successfully, update the prompt's lastRefreshedAt
    if (status === 'completed') {
      const priorityManager = getPriorityManager();
      await priorityManager.markRefreshed(promptId);
    }

    return mapHistory(history);
  }

  /**
   * Update refresh status
   */
  async updateStatus(
    historyId: number,
    status: RefreshStatus,
    error?: string
  ): Promise<RefreshHistory | undefined> {
    const now = new Date();
    const updates: Record<string, unknown> = { status };

    if (status === 'processing') {
      updates.started_at = now;
    }

    if (status === 'completed' || status === 'failed') {
      updates.completed_at = now;
      if (error) {
        updates.error = error;
      }
    }

    const result = await prisma.refresh_history.updateMany({
      where: { id: historyId, workspace_id: workspaceId() },
      data: updates as any,
    });
    const updated = result.count
      ? await prisma.refresh_history.findFirst({ where: { id: historyId, workspace_id: workspaceId() } })
      : null;

    // If completed successfully, update the prompt's lastRefreshedAt
    if (updated && status === 'completed') {
      const priorityManager = getPriorityManager();
      if (updated.prompt_id) {
        await priorityManager.markRefreshed(updated.prompt_id!);
      }
    }

    return updated ? mapHistory(updated) : undefined;
  }

  /**
   * Get refresh history for a specific prompt
   */
  async getRefreshHistory(promptId: number, limit: number = 10): Promise<RefreshHistory[]> {
    return (await prisma.refresh_history.findMany({
      where: { prompt_id: promptId, workspace_id: workspaceId() },
      orderBy: { created_at: 'desc' },
      take: limit,
    })).map(mapHistory);
  }

  /**
   * Get recent refresh operations across all prompts
   */
  async getRecentRefreshes(limit: number = 50): Promise<RefreshHistory[]> {
    return (await prisma.refresh_history.findMany({
      where: { workspace_id: workspaceId() },
      orderBy: { created_at: 'desc' },
      take: limit,
    })).map(mapHistory);
  }

  /**
   * Get refresh by ID
   */
  async getById(id: number): Promise<RefreshHistory | undefined> {
    const record = await prisma.refresh_history.findFirst({ where: { id, workspace_id: workspaceId() } });
    return record ? mapHistory(record) : undefined;
  }

  /**
   * Get pending refresh operations
   */
  async getPendingRefreshes(): Promise<RefreshHistory[]> {
    return (await prisma.refresh_history.findMany({
      where: { workspace_id: workspaceId(), status: 'pending' },
      orderBy: { scheduled_for: 'asc' },
    })).map(mapHistory);
  }

  /**
   * Get failed refresh operations
   */
  async getFailedRefreshes(limit: number = 50): Promise<RefreshHistory[]> {
    return (await prisma.refresh_history.findMany({
      where: { workspace_id: workspaceId(), status: 'failed' },
      orderBy: { created_at: 'desc' },
      take: limit,
    })).map(mapHistory);
  }

  /**
   * Get refresh statistics
   */
  async getRefreshStats(): Promise<{
    totalRefreshes: number;
    pendingCount: number;
    processingCount: number;
    completedCount: number;
    failedCount: number;
    recentSuccessRate: number;
  }> {
    const allRecords = (await prisma.refresh_history.findMany({
      where: { workspace_id: workspaceId() },
      orderBy: { created_at: 'desc' },
    })).map(mapHistory);

    const stats = {
      totalRefreshes: allRecords.length,
      pendingCount: allRecords.filter(r => r.status === 'pending').length,
      processingCount: allRecords.filter(r => r.status === 'processing').length,
      completedCount: allRecords.filter(r => r.status === 'completed').length,
      failedCount: allRecords.filter(r => r.status === 'failed').length,
      recentSuccessRate: 0,
    };

    // Calculate recent success rate (last 100 completed operations)
    const recentCompleted = allRecords
      .filter(r => r.status === 'completed' || r.status === 'failed')
      .slice(0, 100);

    if (recentCompleted.length > 0) {
      const successes = recentCompleted.filter(r => r.status === 'completed').length;
      stats.recentSuccessRate = (successes / recentCompleted.length) * 100;
    }

    return stats;
  }

  /**
   * Clean up old refresh history records
   */
  async cleanupOld(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.refresh_history.deleteMany({
      where: { workspace_id: workspaceId(), created_at: { lte: cutoffDate }, status: { in: ['completed', 'failed'] } },
    });
    return result.count;
  }

  /**
   * Retry a failed refresh
   */
  async retryRefresh(historyId: number): Promise<RefreshHistory | undefined> {
    const record = await this.getById(historyId);
    if (!record || record.status !== 'failed' || !record.promptId) {
      return undefined;
    }

    // Create a new refresh record
    return await this.logRefresh(record.promptId, 'pending');
  }
}

// Singleton instance
let refreshHistoryInstance: RefreshHistoryService | null = null;

export function getRefreshHistoryService(): RefreshHistoryService {
  if (!refreshHistoryInstance) {
    refreshHistoryInstance = new RefreshHistoryService();
  }
  return refreshHistoryInstance;
}

export default RefreshHistoryService;
