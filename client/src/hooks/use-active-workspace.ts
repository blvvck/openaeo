import { useQuery } from "@tanstack/react-query";
import { getActiveWorkspaceId, type WorkspaceListResponse } from "@/lib/workspace-query";

export function useActiveWorkspaceName(fallback = "Your organization"): string {
  const { data } = useQuery<WorkspaceListResponse>({ queryKey: ["/api/workspaces"] });
  if (!data) return fallback;

  const activeId = getActiveWorkspaceId();
  const workspace = data.workspaces.find(({ id }) => id === activeId)
    ?? data.workspaces.find(({ id }) => id === data.currentWorkspaceId)
    ?? data.workspaces[0];

  return workspace?.name ?? fallback;
}
