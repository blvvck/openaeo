import { useQuery } from "@tanstack/react-query";
import { getActiveWorkspaceId, isActiveWorkspaceDemo, type WorkspaceListResponse } from "@/lib/workspace-query";

export function useActiveWorkspaceName(fallback = "Your organization"): string {
  const { data } = useQuery<WorkspaceListResponse>({ queryKey: ["/api/workspaces"] });
  if (!data) return fallback;

  const activeId = getActiveWorkspaceId();
  const workspace = data.workspaces.find(({ id }) => id === activeId)
    ?? data.workspaces.find(({ id }) => id === data.currentWorkspaceId)
    ?? data.workspaces[0];

  return workspace?.name ?? fallback;
}

export function useIsDemoWorkspace(): boolean {
  const { data } = useQuery<WorkspaceListResponse>({ queryKey: ["/api/workspaces"] });
  if (data) {
    const activeId = getActiveWorkspaceId() ?? data.currentWorkspaceId;
    return data.workspaces.some(({ id, is_demo }) => id === activeId && is_demo);
  }
  return isActiveWorkspaceDemo();
}
