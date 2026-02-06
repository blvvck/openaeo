import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getActiveWorkspaceId, requestWorkspaceApi, workspaceFetch } from '@/lib/workspace-query';
import type {
  InviteRole,
  Provider,
  QuotaView,
  WorkspaceIntegrationsResponse,
  WorkspaceMembersResponse,
  WorkspaceRoleView,
} from '@shared/types/workspace-admin';

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(detail.error || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function adminUrl(suffix: string): string {
  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) throw new Error('No active workspace');
  return `/api/workspaces/${encodeURIComponent(workspaceId)}${suffix}`;
}

export function useWorkspaceMembers() {
  const workspaceId = getActiveWorkspaceId();
  return useQuery<WorkspaceMembersResponse>({
    queryKey: ['workspace-admin', 'members', workspaceId],
    queryFn: async () => readJson<WorkspaceMembersResponse>(await workspaceFetch(adminUrl('/members'))),
    enabled: Boolean(workspaceId),
    staleTime: 30 * 1000,
  });
}

export function useWorkspaceIntegrations() {
  const workspaceId = getActiveWorkspaceId();
  return useQuery<WorkspaceIntegrationsResponse>({
    queryKey: ['workspace-admin', 'integrations', workspaceId],
    queryFn: async () => readJson<WorkspaceIntegrationsResponse>(await workspaceFetch(adminUrl('/integrations'))),
    enabled: Boolean(workspaceId),
    staleTime: 30 * 1000,
  });
}

export function useWorkspaceRole(): WorkspaceRoleView | null {
  const workspaceId = getActiveWorkspaceId();
  const { data } = useQuery<
    { workspaces: Array<{ id: string; role: WorkspaceRoleView }> },
    Error,
    WorkspaceRoleView | null
  >({
    queryKey: ['/api/workspaces'],
    queryFn: async () => readJson(await workspaceFetch('/api/workspaces')),
    enabled: Boolean(workspaceId),
    select: (value) => value.workspaces.find((workspace) => workspace.id === workspaceId)?.role ?? null,
  });
  return data ?? null;
}

export function useWorkspaceAdminAction() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['workspace-admin'] });
  return {
    invite: (email: string, role: InviteRole) => requestWorkspaceApi('POST', adminUrl('/members/invitations'), { email, role }).then(invalidate),
    resendInvite: (inviteId: string) => requestWorkspaceApi('POST', adminUrl(`/members/invitations/${inviteId}/resend`)).then(invalidate),
    cancelInvite: (inviteId: string) => requestWorkspaceApi('DELETE', adminUrl(`/members/invitations/${inviteId}`)).then(invalidate),
    updateRole: (memberId: string, role: InviteRole) => requestWorkspaceApi('PATCH', adminUrl(`/members/${memberId}/role`), { role }).then(invalidate),
    updateStatus: (memberId: string, status: 'active' | 'deactivated') => requestWorkspaceApi('PATCH', adminUrl(`/members/${memberId}/status`), { status }).then(invalidate),
    removeMember: (memberId: string) => requestWorkspaceApi('DELETE', adminUrl(`/members/${memberId}`)).then(invalidate),
    saveIntegrations: (keys: Partial<Record<Provider, string | null>>, quota: Partial<QuotaView>) =>
      requestWorkspaceApi('PATCH', adminUrl('/integrations'), { keys, quota }).then(invalidate),
  };
}
