export type WorkspaceRoleView = "owner" | "admin" | "member" | "viewer";
export type InviteRole = "admin" | "member" | "viewer";
export type Provider = "openai" | "anthropic" | "perplexity" | "gemini" | "xai" | "deepseek";

export interface WorkspaceMemberView {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRoleView;
  status: "active" | "deactivated";
  joinedAt: string;
}

export interface WorkspaceInvitationView {
  id: string;
  email: string;
  role: InviteRole;
  status: "invited" | "reminder_sent" | "canceled";
  sentAt: string;
  expiresAt: string;
}

export interface WorkspaceMembersResponse {
  members: WorkspaceMemberView[];
  invitations: WorkspaceInvitationView[];
}

export interface ProviderKeyView {
  provider: Provider;
  configured: boolean;
  source: "workspace" | "env" | "none";
  masked: string;
}

export interface QuotaView {
  maxPromptsPerScan: number;
  maxScansPerHour: number;
}

export interface WorkspaceIntegrationsResponse {
  keys: ProviderKeyView[];
  quota: QuotaView;
}
