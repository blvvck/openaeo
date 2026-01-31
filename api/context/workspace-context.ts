import { AsyncLocalStorage } from "node:async_hooks";
import type { Prisma, PrismaClient } from "@prisma/client";

interface WorkspaceStore {
  workspaceId: string;
  transaction?: Prisma.TransactionClient;
}

const workspaceContext = new AsyncLocalStorage<WorkspaceStore>();

export function currentWorkspaceId(): string | null {
  return workspaceContext.getStore()?.workspaceId ?? null;
}

export function currentPrismaTransaction(): Prisma.TransactionClient | null {
  return workspaceContext.getStore()?.transaction ?? null;
}

export function runInWorkspace<T>(workspaceId: string, callback: () => T): T {
  return workspaceContext.run({ workspaceId }, callback);
}

export async function runInWorkspaceTransaction<T>(
  client: PrismaClient,
  workspaceId: string,
  callback: () => Promise<T>,
): Promise<T> {
  return client.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT set_config('app.current_workspace_id', ${workspaceId}, true)`;
    return workspaceContext.run({ workspaceId, transaction }, callback);
  });
}

export async function runInPublicReportTransaction<T>(
  client: PrismaClient,
  publicId: string,
  callback: (workspaceId: string) => Promise<T>,
): Promise<T | null> {
  return client.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT set_config('app.public_report_id', ${publicId}, true)`;
    const report = await transaction.shared_reports.findUnique({ where: { public_id: publicId } });
    if (!report) return null;

    await transaction.$executeRaw`SELECT set_config('app.current_workspace_id', ${report.workspace_id}, true)`;
    return workspaceContext.run({ workspaceId: report.workspace_id, transaction }, () => callback(report.workspace_id));
  });
}
