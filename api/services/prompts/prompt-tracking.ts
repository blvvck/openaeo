import type { Prompt } from "@shared/schema";
import { randomUUID } from "node:crypto";
import { currentWorkspaceId, runInWorkspace, runInWorkspaceTransaction } from "../../context/workspace-context";
import { storage } from "../../data";
import { prisma, prismaRoot } from "../../prisma";
import { BrandMonitor } from "../analysis/brand-monitor";
import { canScheduleWorkspace } from "./scheduler-workspace";

export const PROMPT_FREQUENCIES = ["daily", "7d", "14d", "30d"] as const;
export type PromptFrequency = (typeof PROMPT_FREQUENCIES)[number];

const frequencyMs: Record<PromptFrequency, number> = {
  daily: 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "14d": 14 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const PROMPT_BATCH_SIZE = 10;
const LOCK_DURATION_MS = 30 * 60 * 1000;

function requireWorkspaceId(): string {
  const workspaceId = currentWorkspaceId();
  if (!workspaceId) throw new Error("Workspace context is required for prompt tracking");
  return workspaceId;
}

export async function getPromptFrequency(): Promise<PromptFrequency> {
  const workspaceId = requireWorkspaceId();
  const settings = await prisma.prompt_tracking_settings.upsert({
    where: { workspace_id: workspaceId },
    create: { workspace_id: workspaceId, frequency: "daily" },
    update: {},
  });
  return PROMPT_FREQUENCIES.includes(settings.frequency as PromptFrequency)
    ? settings.frequency as PromptFrequency
    : "daily";
}

export async function updatePromptFrequency(frequency: PromptFrequency): Promise<void> {
  const workspaceId = requireWorkspaceId();
  await prisma.prompt_tracking_settings.upsert({
    where: { workspace_id: workspaceId },
    create: { workspace_id: workspaceId, frequency },
    update: { frequency, updated_at: new Date() },
  });
}

async function findDuePrompts(frequency: PromptFrequency, forceIds: number[] = []): Promise<Prompt[]> {
  const workspaceId = requireWorkspaceId();
  const prompts = (await storage.getPrompts()).filter(prompt => !prompt.archivedAt);
  if (!prompts.length) return [];

  const responseRuns = await prisma.responses.groupBy({
    by: ["prompt_id"],
    where: { workspace_id: workspaceId, prompt_id: { in: prompts.map(prompt => prompt.id) } },
    _max: { created_at: true },
  });
  const lastResponseByPrompt = new Map(responseRuns.map(run => [run.prompt_id, run._max.created_at]));
  const cutoff = Date.now() - frequencyMs[frequency];
  const due = prompts.filter(prompt => {
    if (forceIds.includes(prompt.id)) return true;
    const lastRun = prompt.lastAttemptedAt ?? prompt.lastRefreshedAt ?? lastResponseByPrompt.get(prompt.id) ?? null;
    return !lastRun || lastRun.getTime() <= cutoff;
  });

  return due
    .sort((left, right) => {
      const leftRun = left.lastAttemptedAt ?? left.lastRefreshedAt ?? lastResponseByPrompt.get(left.id);
      const rightRun = right.lastAttemptedAt ?? right.lastRefreshedAt ?? lastResponseByPrompt.get(right.id);
      return (leftRun?.getTime() ?? 0) - (rightRun?.getTime() ?? 0);
    })
    .slice(0, forceIds.length ? forceIds.length : PROMPT_BATCH_SIZE);
}

export async function countDuePromptRuns(forceIds: number[] = []): Promise<number> {
  return (await findDuePrompts(await getPromptFrequency(), forceIds)).length;
}

export async function getNextPromptRunAt(frequency: PromptFrequency): Promise<Date | null> {
  const workspaceId = requireWorkspaceId();
  const prompts = (await storage.getPrompts()).filter(prompt => !prompt.archivedAt);
  if (!prompts.length) return null;

  const responseRuns = await prisma.responses.groupBy({
    by: ["prompt_id"],
    where: { workspace_id: workspaceId, prompt_id: { in: prompts.map(prompt => prompt.id) } },
    _max: { created_at: true },
  });
  const lastResponseByPrompt = new Map(responseRuns.map(run => [run.prompt_id, run._max.created_at]));
  const interval = frequencyMs[frequency];
  const nextRuns = prompts.map(prompt => {
    const lastRun = prompt.lastAttemptedAt ?? prompt.lastRefreshedAt ?? lastResponseByPrompt.get(prompt.id) ?? null;
    return lastRun ? new Date(lastRun.getTime() + interval) : new Date();
  });

  return new Date(Math.min(...nextRuns.map(date => date.getTime())));
}

export function scheduleDuePromptRun(workspaceId: string, forceIds: number[] = []): void {
  setTimeout(() => {
    queueDuePromptRun(workspaceId, forceIds).catch((error) => {
      console.error('Scheduled prompt run failed:', error);
    });
  }, 250);
}

async function claimDuePrompts(workspaceId: string, forceIds: number[] = []): Promise<{ prompts: Prompt[]; token: string | null }> {
  return runInWorkspaceTransaction(prismaRoot, workspaceId, async () => {
    const settings = await prisma.prompt_tracking_settings.upsert({
      where: { workspace_id: workspaceId },
      create: { workspace_id: workspaceId, frequency: "daily" },
      update: {},
    });
    if (settings.run_locked_until && settings.run_locked_until > new Date()) return { prompts: [], token: null };

    const frequency = PROMPT_FREQUENCIES.includes(settings.frequency as PromptFrequency)
      ? settings.frequency as PromptFrequency
      : "daily";
    const duePrompts = await findDuePrompts(frequency, forceIds);
    if (!duePrompts.length) return { prompts: [], token: null };

    const token = randomUUID();
    const lock = await prisma.prompt_tracking_settings.updateMany({
      where: {
        workspace_id: workspaceId,
        OR: [{ run_locked_until: null }, { run_locked_until: { lte: new Date() } }],
      },
      data: { run_lock_token: token, run_locked_until: new Date(Date.now() + LOCK_DURATION_MS) },
    });
    return lock.count ? { prompts: duePrompts, token } : { prompts: [], token: null };
  });
}

async function renewWorkspaceLock(workspaceId: string, token: string): Promise<void> {
  await runInWorkspaceTransaction(prismaRoot, workspaceId, async () => {
    await prisma.prompt_tracking_settings.updateMany({
      where: { workspace_id: workspaceId, run_lock_token: token },
      data: { run_locked_until: new Date(Date.now() + LOCK_DURATION_MS) },
    });
  });
}

async function releaseWorkspaceLock(workspaceId: string, token: string): Promise<void> {
  await runInWorkspaceTransaction(prismaRoot, workspaceId, async () => {
    await prisma.prompt_tracking_settings.updateMany({
      where: { workspace_id: workspaceId, run_lock_token: token },
      data: { run_locked_until: null, run_lock_token: null },
    });
  });
}

export async function queueDuePromptRun(workspaceId: string, forceIds: number[] = []): Promise<number> {
  const { prompts, token } = await claimDuePrompts(workspaceId, forceIds);
  if (!prompts.length || !token) return 0;

  const heartbeat = setInterval(() => {
    void renewWorkspaceLock(workspaceId, token).catch(error => {
      console.error("[Prompt tracking] Could not renew refresh lock:", error);
    });
  }, 60_000);
  void runInWorkspace(workspaceId, async () => {
    try {
      const monitor = new BrandMonitor();
      await monitor.runFullAnalysis(true, prompts);
    } catch (error) {
      console.error("[Prompt tracking] Refresh run failed:", error);
    } finally {
      clearInterval(heartbeat);
      await releaseWorkspaceLock(workspaceId, token);
    }
  }).catch(error => console.error("[Prompt tracking] Could not start refresh run:", error));

  return prompts.length;
}

let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let checkingWorkspaces = false;

async function checkDueWorkspaces(): Promise<void> {
  if (checkingWorkspaces) return;
  checkingWorkspaces = true;
  try {
    const workspaces = await prismaRoot.workspaces.findMany({
      where: { deleted_at: null, is_demo: false },
      select: { id: true, is_demo: true },
    });
    for (const workspace of workspaces) {
      if (!canScheduleWorkspace(workspace)) continue;
      try {
        await queueDuePromptRun(workspace.id);
      } catch (error) {
        console.error(`[Prompt tracking] Could not check workspace ${workspace.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[Prompt tracking] Scheduler check failed:", error);
  } finally {
    checkingWorkspaces = false;
  }
}

export function startPromptTrackingScheduler(): void {
  if (schedulerTimer) return;
  schedulerTimer = setInterval(() => void checkDueWorkspaces(), 60_000);
  void checkDueWorkspaces();
}
