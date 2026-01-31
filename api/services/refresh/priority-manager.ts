/**
 * Priority Manager Service
 *
 * Manages prompt priority status and tracks stale prompts.
 */

import { prisma } from "../../prisma";
import { fromPrismaRow, requireWorkspaceId } from "../../prisma-mapping";
import type { Prompt } from "@shared/schema";

/**
 * Priority Manager class for managing prompt priorities
 */
export class PriorityManager {
  /**
   * Get all priority prompts
   */
  async getPriorityPrompts(): Promise<Prompt[]> {
    const rows = await prisma.prompts.findMany({
      where: { workspace_id: requireWorkspaceId(), is_priority: true, archived_at: null },
      orderBy: { last_refreshed_at: "desc" },
    });
    return rows.map((row) => fromPrismaRow<Prompt>(row as unknown as Record<string, unknown>));
  }

  /**
   * Toggle priority status for a prompt
   */
  async togglePriority(promptId: number, isPriority: boolean): Promise<Prompt | undefined> {
    const result = await prisma.prompts.updateMany({
      where: { id: promptId, workspace_id: requireWorkspaceId() }, data: { is_priority: isPriority },
    });
    return result.count ? this.getPromptById(promptId) : undefined;
  }

  /**
   * Get prompts that haven't been refreshed in N days
   */
  async getStalePrompts(days: number): Promise<Prompt[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const rows = await prisma.prompts.findMany({
      where: { workspace_id: requireWorkspaceId(), archived_at: null, OR: [{ last_refreshed_at: { lte: cutoffDate } }, { last_refreshed_at: null }] },
      orderBy: { last_refreshed_at: "asc" },
    });
    return rows.map((row) => fromPrismaRow<Prompt>(row as unknown as Record<string, unknown>));
  }

  /**
   * Mark a prompt as refreshed
   */
  async markRefreshed(promptId: number): Promise<Prompt | undefined> {
    const prompt = await this.getPromptById(promptId);
    const currentCount = prompt?.refreshCount || 0;

    const result = await prisma.prompts.updateMany({
      where: { id: promptId, workspace_id: requireWorkspaceId() },
      data: { last_refreshed_at: new Date(), refresh_count: currentCount + 1 },
    });
    return result.count ? this.getPromptById(promptId) : undefined;
  }

  /**
   * Get prompt by ID
   */
  private async getPromptById(promptId: number): Promise<Prompt | undefined> {
    const prompt = await prisma.prompts.findFirst({ where: { id: promptId, workspace_id: requireWorkspaceId() } });
    return prompt ? fromPrismaRow<Prompt>(prompt as unknown as Record<string, unknown>) : undefined;
  }

  /**
   * Bulk mark prompts as priority
   */
  async bulkSetPriority(promptIds: number[], isPriority: boolean): Promise<number> {
    const result = await prisma.prompts.updateMany({
      where: { workspace_id: requireWorkspaceId(), id: { in: promptIds } },
      data: { is_priority: isPriority },
    });
    return result.count;
  }

  /**
   * Get prompts sorted by priority and staleness
   */
  async getPromptsByRefreshPriority(limit: number = 50): Promise<Prompt[]> {
    // Get priority prompts first (ordered by oldest refresh)
    const workspace_id = requireWorkspaceId();
    const priorityRows = await prisma.prompts.findMany({
      where: { workspace_id, is_priority: true, archived_at: null },
      orderBy: { last_refreshed_at: "asc" }, take: limit,
    });
    const priorityPrompts = priorityRows.map((row) => fromPrismaRow<Prompt>(row as unknown as Record<string, unknown>));

    if (priorityPrompts.length >= limit) {
      return priorityPrompts;
    }

    // Fill remaining slots with non-priority stale prompts
    const remaining = limit - priorityPrompts.length;
    const priorityIds = priorityPrompts.map(p => p.id);

    // Get non-priority prompts, ordered by oldest refresh
    const nonPriorityRows = await prisma.prompts.findMany({
      where: { workspace_id, is_priority: false, archived_at: null },
      orderBy: { last_refreshed_at: "asc" }, take: remaining,
    });
    const nonPriorityPrompts = nonPriorityRows.map((row) => fromPrismaRow<Prompt>(row as unknown as Record<string, unknown>));

    // Filter out any that might have been marked priority in between
    const filtered = nonPriorityPrompts.filter(p => !priorityIds.includes(p.id));

    return priorityPrompts.concat(filtered);
  }

  /**
   * Get refresh statistics
   */
  async getRefreshStats(): Promise<{
    totalPrompts: number;
    priorityPrompts: number;
    neverRefreshed: number;
    refreshedLast7Days: number;
    refreshedLast30Days: number;
  }> {
    const rows = await prisma.prompts.findMany({ where: { workspace_id: requireWorkspaceId(), archived_at: null } });
    const allPrompts = rows.map((row) => fromPrismaRow<Prompt>(row as unknown as Record<string, unknown>));

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = {
      totalPrompts: allPrompts.length,
      priorityPrompts: allPrompts.filter(p => p.isPriority === true).length,
      neverRefreshed: allPrompts.filter(p => p.lastRefreshedAt === null).length,
      refreshedLast7Days: allPrompts.filter(p =>
        p.lastRefreshedAt !== null && p.lastRefreshedAt >= sevenDaysAgo
      ).length,
      refreshedLast30Days: allPrompts.filter(p =>
        p.lastRefreshedAt !== null && p.lastRefreshedAt >= thirtyDaysAgo
      ).length,
    };

    return stats;
  }
}

// Singleton instance
let priorityManagerInstance: PriorityManager | null = null;

export function getPriorityManager(): PriorityManager {
  if (!priorityManagerInstance) {
    priorityManagerInstance = new PriorityManager();
  }
  return priorityManagerInstance;
}

export default PriorityManager;
