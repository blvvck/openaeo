import { currentWorkspaceId } from "../context/workspace-context";
import { prisma } from "../prisma";
import type { BrandConfig } from "@shared/schema";

export async function getActiveBrandConfig(): Promise<BrandConfig | null> {
  const workspace_id = currentWorkspaceId();
  if (!workspace_id) throw new Error("Workspace context is required for data access");
  const row = await prisma.brand_config.findFirst({
    where: { workspace_id, is_active: true },
    orderBy: { created_at: "desc" },
  });
  if (!row) return null;
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
    value,
  ])) as BrandConfig;
}

export async function getRecentIntelligenceSearchDomain(): Promise<string | null> {
  const workspace_id = currentWorkspaceId();
  if (!workspace_id) throw new Error("Workspace context is required for data access");
  const row = await prisma.intelligence_searches.findFirst({
    where: { workspace_id },
    orderBy: { created_at: "desc" },
    select: { domain: true },
  });
  return row?.domain ?? null;
}
