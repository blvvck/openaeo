/**
 * Scheduler Service
 *
 * Manages scheduled scans with simple in-memory timer.
 * Supports daily and weekly scan frequencies.
 */

import { prisma } from "../../prisma";
import { runInWorkspaceTransaction } from "../../context/workspace-context";
import { fromPrismaRow, requireWorkspaceId, toPrismaData } from "../../prisma-mapping";
import type { ScanSchedule, InsertScanSchedule } from "@shared/schema";

export type ScanFrequency = 'daily' | 'weekly';

/**
 * Calculate next run time based on frequency
 */
export function calculateNextRun(frequency: ScanFrequency, fromDate?: Date): Date {
  const now = fromDate || new Date();
  const nextRun = new Date(now);

  switch (frequency) {
    case 'daily':
      // Next run is 24 hours from now
      nextRun.setDate(nextRun.getDate() + 1);
      // Set to 2am local time for daily scans
      nextRun.setHours(2, 0, 0, 0);
      break;
    case 'weekly':
      // Next run is 7 days from now
      nextRun.setDate(nextRun.getDate() + 7);
      // Set to 2am Sunday for weekly scans
      nextRun.setHours(2, 0, 0, 0);
      break;
    default:
      // Default to daily
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(2, 0, 0, 0);
  }

  return nextRun;
}

/**
 * Scheduler class for managing scan schedules
 */
export class Scheduler {
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private scanCallback: ((schedule: ScanSchedule) => Promise<void>) | null = null;

  /**
   * Create a new scan schedule
   */
  async createSchedule(data: InsertScanSchedule): Promise<ScanSchedule> {
    const nextRun = calculateNextRun(data.frequency as ScanFrequency);

    const schedule = await prisma.scan_schedules.create({
      data: {
        ...toPrismaData(data), workspace_id: requireWorkspaceId(), next_run: nextRun,
        enabled: data.enabled !== false,
      } as any,
    });
    return fromPrismaRow<ScanSchedule>(schedule as unknown as Record<string, unknown>);
  }

  /**
   * Get all schedules
   */
  async getAllSchedules(): Promise<ScanSchedule[]> {
    const rows = await prisma.scan_schedules.findMany({ where: { workspace_id: requireWorkspaceId() } });
    return rows.map((row) => fromPrismaRow<ScanSchedule>(row as unknown as Record<string, unknown>));
  }

  /**
   * Get schedule by ID
   */
  async getScheduleById(id: number): Promise<ScanSchedule | undefined> {
    const schedule = await prisma.scan_schedules.findFirst({ where: { id, workspace_id: requireWorkspaceId() } });
    return schedule ? fromPrismaRow<ScanSchedule>(schedule as unknown as Record<string, unknown>) : undefined;
  }

  /**
   * Get all enabled schedules
   */
  async getEnabledSchedules(): Promise<ScanSchedule[]> {
    const rows = await prisma.scan_schedules.findMany({ where: { workspace_id: requireWorkspaceId(), enabled: true } });
    return rows.map((row) => fromPrismaRow<ScanSchedule>(row as unknown as Record<string, unknown>));
  }

  /**
   * Get schedules that are due to run
   */
  async getDueSchedules(): Promise<ScanSchedule[]> {
    const now = new Date();
    const rows = await prisma.scan_schedules.findMany({
      where: { workspace_id: requireWorkspaceId(), enabled: true, OR: [{ next_run: { lte: now } }, { next_run: null }] },
    });
    return rows.map((row) => fromPrismaRow<ScanSchedule>(row as unknown as Record<string, unknown>));
  }

  /**
   * Update a schedule
   */
  async updateSchedule(id: number, data: Partial<InsertScanSchedule>): Promise<ScanSchedule | undefined> {
    // If frequency changes, recalculate next run
    let nextRun: Date | undefined;
    if (data.frequency) {
      nextRun = calculateNextRun(data.frequency as ScanFrequency);
    }

    const updateData: Record<string, unknown> = toPrismaData(data);
    if (nextRun !== undefined) updateData.next_run = nextRun;
    const result = await prisma.scan_schedules.updateMany({
      where: { id, workspace_id: requireWorkspaceId() }, data: updateData as any,
    });
    return result.count ? this.getScheduleById(id) : undefined;
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(id: number): Promise<boolean> {
    const result = await prisma.scan_schedules.deleteMany({ where: { id, workspace_id: requireWorkspaceId() } });
    return result.count > 0;
  }

  /**
   * Update last run time and calculate next run
   */
  async updateLastRun(id: number): Promise<ScanSchedule | undefined> {
    const schedule = await this.getScheduleById(id);
    if (!schedule) return undefined;

    const now = new Date();
    const nextRun = calculateNextRun(schedule.frequency as ScanFrequency, now);

    const result = await prisma.scan_schedules.updateMany({
      where: { id, workspace_id: requireWorkspaceId() }, data: { last_run: now, next_run: nextRun },
    });
    return result.count ? this.getScheduleById(id) : undefined;
  }

  /**
   * Start the scheduler
   */
  start(scanCallback: (schedule: ScanSchedule) => Promise<void>): void {
    if (this.isRunning) {
      console.log('[Scheduler] Already running');
      return;
    }

    this.scanCallback = scanCallback;
    this.isRunning = true;

    // Check for due schedules every minute
    this.checkInterval = setInterval(() => {
      this.checkAndExecute();
    }, 60 * 1000);

    // Run initial check
    this.checkAndExecute();

    console.log('[Scheduler] Started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    this.scanCallback = null;
    console.log('[Scheduler] Stopped');
  }

  /**
   * Check for due schedules and execute them
   */
  private async checkAndExecute(): Promise<void> {
    if (!this.scanCallback) return;

    try {
      const workspaces = await prisma.workspaces.findMany({ select: { id: true } });
      for (const workspace of workspaces) {
        await runInWorkspaceTransaction(prisma, workspace.id, async () => {
          const dueSchedules = await this.getDueSchedules();
          for (const schedule of dueSchedules) {
            try {
              await this.scanCallback!(schedule);
              await this.updateLastRun(schedule.id);
            } catch (error) {
              console.error(`[Scheduler] Error executing schedule ${schedule.id}:`, error);
            }
          }
        });
      }
    } catch (error) {
      console.error('[Scheduler] Error checking schedules:', error);
    }
  }

  /**
   * Manual trigger - run a schedule immediately
   */
  async runNow(id: number): Promise<{ success: boolean; message: string }> {
    const schedule = await this.getScheduleById(id);
    if (!schedule) {
      return { success: false, message: 'Schedule not found' };
    }

    if (!this.scanCallback) {
      return { success: false, message: 'Scheduler not started' };
    }

    try {
      await this.scanCallback(schedule);
      await this.updateLastRun(schedule.id);
      return { success: true, message: 'Scan triggered successfully' };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Scan failed: ${msg}` };
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { running: boolean } {
    return { running: this.isRunning };
  }
}

// Singleton instance
let schedulerInstance: Scheduler | null = null;

export function getScheduler(): Scheduler {
  if (!schedulerInstance) {
    schedulerInstance = new Scheduler();
  }
  return schedulerInstance;
}

export default Scheduler;
