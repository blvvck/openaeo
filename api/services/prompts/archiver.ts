/**
 * Prompt Archiver Service
 *
 * Handles soft delete (archiving) of prompts.
 * Archived prompts are excluded from normal queries but data is preserved.
 */

import { prisma } from "../../prisma";
import { fromPrismaRow, requireWorkspaceId } from "../../prisma-mapping";
import type { Prompt } from "../../../shared/schema";

/**
 * Archive result
 */
export interface ArchiveResult {
  success: boolean;
  promptId: number;
  archivedAt?: Date;
  message: string;
}

/**
 * Archive a prompt (soft delete)
 * Sets archived_at timestamp
 */
export async function archivePrompt(promptId: number): Promise<ArchiveResult> {
  const workspace_id = requireWorkspaceId();
  const prompt = await prisma.prompts.findFirst({ where: { id: promptId, workspace_id } });

  if (!prompt) {
    return {
      success: false,
      promptId,
      message: 'Prompt not found',
    };
  }

  if (prompt.archived_at) {
    return {
      success: false,
      promptId,
      archivedAt: prompt.archived_at,
      message: 'Prompt is already archived',
    };
  }

  const now = new Date();
  await prisma.prompts.updateMany({ where: { id: promptId, workspace_id }, data: { archived_at: now } });

  return {
    success: true,
    promptId,
    archivedAt: now,
    message: 'Prompt archived successfully',
  };
}

/**
 * Restore an archived prompt
 * Clears archived_at timestamp
 */
export async function restorePrompt(promptId: number): Promise<ArchiveResult> {
  const workspace_id = requireWorkspaceId();
  const prompt = await prisma.prompts.findFirst({ where: { id: promptId, workspace_id } });

  if (!prompt) {
    return {
      success: false,
      promptId,
      message: 'Prompt not found',
    };
  }

  if (!prompt.archived_at) {
    return {
      success: false,
      promptId,
      message: 'Prompt is not archived',
    };
  }

  await prisma.prompts.updateMany({ where: { id: promptId, workspace_id }, data: { archived_at: null } });

  return {
    success: true,
    promptId,
    message: 'Prompt restored successfully',
  };
}

/**
 * Get all active (non-archived) prompts
 */
export async function getActivePrompts(): Promise<Prompt[]> {
  const rows = await prisma.prompts.findMany({ where: { workspace_id: requireWorkspaceId(), archived_at: null } });
  return rows.map((row) => fromPrismaRow<Prompt>(row as unknown as Record<string, unknown>));
}

/**
 * Get all archived prompts
 */
export async function getArchivedPrompts(): Promise<Prompt[]> {
  const rows = await prisma.prompts.findMany({ where: { workspace_id: requireWorkspaceId(), archived_at: { not: null } } });
  return rows.map((row) => fromPrismaRow<Prompt>(row as unknown as Record<string, unknown>));
}

/**
 * Check if a prompt is archived
 */
export async function isPromptArchived(promptId: number): Promise<boolean> {
  const prompt = await prisma.prompts.findFirst({
    where: { id: promptId, workspace_id: requireWorkspaceId() },
    select: { archived_at: true },
  });
  return prompt?.archived_at != null;
}

/**
 * Bulk archive prompts
 */
export async function archivePrompts(promptIds: number[]): Promise<{ archived: number; alreadyArchived: number; notFound: number }> {
  let archived = 0;
  let alreadyArchived = 0;
  let notFound = 0;

  for (const id of promptIds) {
    const result = await archivePrompt(id);
    if (result.success) {
      archived++;
    } else if (result.message.includes('already')) {
      alreadyArchived++;
    } else {
      notFound++;
    }
  }

  return { archived, alreadyArchived, notFound };
}

/**
 * Bulk restore prompts
 */
export async function restorePrompts(promptIds: number[]): Promise<{ restored: number; notArchived: number; notFound: number }> {
  let restored = 0;
  let notArchived = 0;
  let notFound = 0;

  for (const id of promptIds) {
    const result = await restorePrompt(id);
    if (result.success) {
      restored++;
    } else if (result.message.includes('not archived')) {
      notArchived++;
    } else {
      notFound++;
    }
  }

  return { restored, notArchived, notFound };
}

/**
 * Permanently delete archived prompts older than a certain date
 * Use with caution - this is a hard delete
 */
export async function purgeArchivedPrompts(olderThan: Date): Promise<number> {
  const result = await prisma.prompts.deleteMany({
    where: { workspace_id: requireWorkspaceId(), archived_at: { lt: olderThan } },
  });
  return result.count;
}
