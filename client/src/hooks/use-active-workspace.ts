import { useQuery } from "@tanstack/react-query";
import { DEMO_CONFIG } from "@/config/app";
import { isDemoPreview } from "@/lib/demo-preview";
import { getActiveWorkspaceId, type WorkspaceListResponse } from "@/lib/workspace-query";

export function useActiveWorkspaceName(fallback = "Your organization"): string {
  const demoPreview = isDemoPreview();
  const { data } = useQuery<WorkspaceListResponse>({ queryKey: ["/api/workspaces"], enabled: !demoPreview });
  if (demoPreview) return DEMO_CONFIG.workspaceName;
  if (!data) return fallback;

  const activeId = getActiveWorkspaceId();
  const workspace = data.workspaces.find(({ id }) => id === activeId)
    ?? data.workspaces.find(({ id }) => id === data.currentWorkspaceId)
    ?? data.workspaces[0];

  return workspace?.name ?? fallback;
}
