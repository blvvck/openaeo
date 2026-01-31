/**
 * Queue Repository
 *
 * Handles persistence of queue requests to the database.
 * Provides CRUD operations and query methods for the request_queue table.
 */

import { prisma } from "../../prisma";
import { fromPrismaRow, requireWorkspaceId, toPrismaData } from "../../prisma-mapping";
import type { RequestQueueItem, InsertRequestQueueItem } from "@shared/schema";
import type { PlatformName } from '../platforms/types';

/**
 * Status values for queue items
 */
export type QueueItemStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Options for querying queue items
 */
export interface QueueQueryOptions {
  platform?: PlatformName;
  status?: QueueItemStatus | QueueItemStatus[];
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'scheduledFor' | 'priority';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Statistics about the queue
 */
export interface QueueStats {
  totalPending: number;
  totalProcessing: number;
  totalCompleted: number;
  totalFailed: number;
  byPlatform: Record<string, {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }>;
}

/**
 * Queue Repository class for database operations
 */
export class QueueRepository {
  /**
   * Create a new queue item
   */
  async create(item: InsertRequestQueueItem): Promise<RequestQueueItem> {
    const result = await prisma.request_queue.create({
      data: { ...toPrismaData(item), workspace_id: requireWorkspaceId() } as any,
    });
    return fromPrismaRow<RequestQueueItem>(result as unknown as Record<string, unknown>);
  }

  /**
   * Create multiple queue items in a batch
   */
  async createMany(items: InsertRequestQueueItem[]): Promise<RequestQueueItem[]> {
    if (items.length === 0) return [];
    const workspace_id = requireWorkspaceId();
    const rows = await prisma.request_queue.createManyAndReturn({
      data: items.map((item) => ({ ...toPrismaData(item), workspace_id } as any)),
    });
    return rows.map((row) => fromPrismaRow<RequestQueueItem>(row as unknown as Record<string, unknown>));
  }

  /**
   * Get a queue item by ID
   */
  async getById(id: number): Promise<RequestQueueItem | null> {
    const result = await prisma.request_queue.findFirst({ where: { id, workspace_id: requireWorkspaceId() } });
    return result ? fromPrismaRow<RequestQueueItem>(result as unknown as Record<string, unknown>) : null;
  }

  /**
   * Get pending requests, optionally filtered by platform
   */
  async getPending(platform?: PlatformName): Promise<RequestQueueItem[]> {
    const rows = await prisma.request_queue.findMany({
      where: { workspace_id: requireWorkspaceId(), status: "pending", ...(platform ? { platform } : {}) },
      orderBy: { created_at: "asc" },
    });
    rows.sort((a, b) => Number(b.priority === "high") - Number(a.priority === "high"));
    return rows.map((row) => fromPrismaRow<RequestQueueItem>(row as unknown as Record<string, unknown>));
  }

  /**
   * Get requests ready to process (pending and scheduled_for <= now)
   */
  async getReadyToProcess(platform?: PlatformName, limit: number = 10): Promise<RequestQueueItem[]> {
    const now = new Date();
    const rows = await prisma.request_queue.findMany({
      where: {
        workspace_id: requireWorkspaceId(), status: "pending",
        OR: [{ scheduled_for: null }, { scheduled_for: { lte: now } }],
        ...(platform ? { platform } : {}),
      },
      orderBy: { created_at: "asc" }, take: limit,
    });
    rows.sort((a, b) => Number(b.priority === "high") - Number(a.priority === "high"));
    return rows.map((row) => fromPrismaRow<RequestQueueItem>(row as unknown as Record<string, unknown>));
  }

  /**
   * Get requests by status
   */
  async getByStatus(
    status: QueueItemStatus | QueueItemStatus[],
    options: Omit<QueueQueryOptions, 'status'> = {}
  ): Promise<RequestQueueItem[]> {
    const statuses = Array.isArray(status) ? status : [status];
    const orderColumn = options.orderBy === "scheduledFor" ? "scheduled_for" : options.orderBy === "priority" ? "priority" : "created_at";
    const rows = await prisma.request_queue.findMany({
      where: {
        workspace_id: requireWorkspaceId(), status: { in: statuses },
        ...(options.platform ? { platform: options.platform } : {}),
      },
      orderBy: { [orderColumn]: options.orderDirection ?? "asc" },
      take: options.limit, skip: options.offset,
    });
    return rows.map((row) => fromPrismaRow<RequestQueueItem>(row as unknown as Record<string, unknown>));
  }

  /**
   * Mark a request as processing
   */
  async markProcessing(id: number): Promise<void> {
    await prisma.request_queue.updateMany({ where: { id, workspace_id: requireWorkspaceId() }, data: { status: "processing", started_at: new Date() } });
  }

  /**
   * Mark a request as completed
   */
  async markCompleted(id: number): Promise<void> {
    await prisma.request_queue.updateMany({ where: { id, workspace_id: requireWorkspaceId() }, data: { status: "completed", completed_at: new Date() } });
  }

  /**
   * Mark a request as failed
   */
  async markFailed(id: number, errorMessage: string): Promise<void> {
    await prisma.request_queue.updateMany({ where: { id, workspace_id: requireWorkspaceId() }, data: { status: "failed", error_message: errorMessage, completed_at: new Date() } });
  }

  /**
   * Increment retry count and optionally reschedule
   */
  async incrementRetry(id: number, scheduledFor?: Date): Promise<void> {
    await prisma.request_queue.updateMany({
      where: { id, workspace_id: requireWorkspaceId() },
      data: { retry_count: { increment: 1 }, status: "pending", ...(scheduledFor ? { scheduled_for: scheduledFor } : {}) },
    });
  }

  /**
   * Reset a failed request for retry
   */
  async resetForRetry(id: number, delayMs: number = 0): Promise<void> {
    const scheduledFor = delayMs > 0 ? new Date(Date.now() + delayMs) : null;

    await prisma.request_queue.updateMany({
      where: { id, workspace_id: requireWorkspaceId() },
      data: {
        status: "pending", started_at: null, completed_at: null, error_message: null,
        retry_count: { increment: 1 }, scheduled_for: scheduledFor,
      },
    });
  }

  /**
   * Delete a queue item
   */
  async delete(id: number): Promise<boolean> {
    const result = await prisma.request_queue.deleteMany({ where: { id, workspace_id: requireWorkspaceId() } });
    return result.count > 0;
  }

  /**
   * Clean up old completed/failed requests
   * @param olderThanDays Delete items completed more than this many days ago
   * @returns Number of deleted rows
   */
  async cleanupOld(olderThanDays: number = 7): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await prisma.request_queue.deleteMany({
      where: { workspace_id: requireWorkspaceId(), status: { in: ["completed", "failed"] }, completed_at: { lt: cutoff } },
    });
    return result.count;
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const items = await prisma.request_queue.findMany({ where: { workspace_id: requireWorkspaceId() } });

    const stats: QueueStats = {
      totalPending: 0,
      totalProcessing: 0,
      totalCompleted: 0,
      totalFailed: 0,
      byPlatform: {},
    };

    for (const rawItem of items) {
      const item = fromPrismaRow<RequestQueueItem>(rawItem as unknown as Record<string, unknown>);
      // Initialize platform if needed
      if (!stats.byPlatform[item.platform]) {
        stats.byPlatform[item.platform] = {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
        };
      }

      const platformStats = stats.byPlatform[item.platform];
      const status = item.status as QueueItemStatus;

      switch (status) {
        case 'pending':
          stats.totalPending++;
          platformStats.pending++;
          break;
        case 'processing':
          stats.totalProcessing++;
          platformStats.processing++;
          break;
        case 'completed':
          stats.totalCompleted++;
          platformStats.completed++;
          break;
        case 'failed':
          stats.totalFailed++;
          platformStats.failed++;
          break;
      }
    }

    return stats;
  }

  /**
   * Count items by status
   */
  async countByStatus(status: QueueItemStatus, platform?: PlatformName): Promise<number> {
    return prisma.request_queue.count({
      where: { workspace_id: requireWorkspaceId(), status, ...(platform ? { platform } : {}) },
    });
  }

  /**
   * Reset stale processing requests (e.g., after server restart)
   * Requests that have been processing for longer than the timeout are reset to pending
   * @param staleAfterMs Consider a request stale if processing for longer than this
   * @returns Number of reset rows
   */
  async resetStaleProcessing(staleAfterMs: number = 5 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - staleAfterMs);

    const result = await prisma.request_queue.updateMany({
      where: { workspace_id: requireWorkspaceId(), status: "processing", started_at: { lt: cutoff } },
      data: { status: "pending", started_at: null },
    });
    return result.count;
  }
}

// Singleton instance
let globalRepository: QueueRepository | null = null;

/**
 * Get the global queue repository instance
 */
export function getQueueRepository(): QueueRepository {
  if (!globalRepository) {
    globalRepository = new QueueRepository();
  }
  return globalRepository;
}

/**
 * Reset the global repository (for testing)
 */
export function resetGlobalQueueRepository(): void {
  globalRepository = null;
}
