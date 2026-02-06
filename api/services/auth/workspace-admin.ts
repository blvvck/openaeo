import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { prisma, prismaRoot } from "../../prisma";
import { currentWorkspaceId } from "../../context/workspace-context";
import { getWorkspaceService } from "./workspace";
import type { InviteRole, Provider, QuotaView, WorkspaceInvitationView, WorkspaceIntegrationsResponse, WorkspaceMemberView } from "@shared/types/workspace-admin";

const providers: Provider[] = ["openai", "anthropic", "perplexity", "gemini", "xai", "deepseek"];
const envKeys: Record<Provider, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
  gemini: "GOOGLE_API_KEY",
  xai: "XAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
};

function workspaceId(): string {
  const id = currentWorkspaceId();
  if (!id) throw new Error("Workspace context is required");
  return id;
}

function encryptionKey(): Buffer {
  const configured = process.env.WORKSPACE_KEY_ENCRYPTION_KEY;
  if (!configured) throw new Error("Set WORKSPACE_KEY_ENCRYPTION_KEY to manage workspace provider keys");
  const key = /^[0-9a-f]{64}$/i.test(configured) ? Buffer.from(configured, "hex") : Buffer.from(configured, "base64");
  if (key.length !== 32) throw new Error("WORKSPACE_KEY_ENCRYPTION_KEY must encode exactly 32 bytes as hex or base64");
  return key;
}

export function encryptWorkspaceKey(value: string): { encrypted_key: string; iv: string; auth_tag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted_key = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]).toString("base64");
  return { encrypted_key, iv: iv.toString("hex"), auth_tag: cipher.getAuthTag().toString("hex") };
}

export function decryptWorkspaceKey(value: { encrypted_key: string; iv: string; auth_tag: string }): string {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(value.iv, "hex"));
  decipher.setAuthTag(Buffer.from(value.auth_tag, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(value.encrypted_key, "base64")), decipher.final()]).toString("utf8");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function scanQuotaExceeded(used: number, maximum: number): boolean {
  return used >= maximum;
}

function maskKey(value: string): string {
  return `••••${value.slice(-4)}`;
}

function invitationView(row: { id: string; email: string; role: string; status: string; sent_at: Date; expires_at: Date }): WorkspaceInvitationView {
  return {
    id: row.id,
    email: row.email,
    role: row.role as InviteRole,
    status: row.status as WorkspaceInvitationView["status"],
    sentAt: row.sent_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
  };
}

function memberView(row: { id: string; user_id: string; role: string; status: string; joined_at: Date | null; users_workspace_members_user_idTousers: { email: string; display_name: string | null } }): WorkspaceMemberView {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.users_workspace_members_user_idTousers.display_name ?? "",
    email: row.users_workspace_members_user_idTousers.email,
    role: row.role as WorkspaceMemberView["role"],
    status: row.status as WorkspaceMemberView["status"],
    joinedAt: (row.joined_at ?? new Date(0)).toISOString(),
  };
}

export class WorkspaceAdminService {
  async getMembers() {
    const id = workspaceId();
    const [members, invitations] = await Promise.all([
      prisma.workspace_members.findMany({
        where: { workspace_id: id },
        include: { users_workspace_members_user_idTousers: { select: { email: true, display_name: true } } },
        orderBy: { joined_at: "asc" },
      }),
      prisma.workspace_invitations.findMany({
        where: { workspace_id: id, accepted_at: null, status: { in: ["invited", "reminder_sent", "canceled"] } },
        orderBy: { sent_at: "desc" },
      }),
    ]);
    return { members: members.map(memberView), invitations: invitations.map(invitationView) };
  }

  async createInvitation(email: string, role: InviteRole, invitedBy: string) {
    if (role === ("owner" as InviteRole)) throw new Error("Owner invitations are not allowed");
    this.requireEmailConfig();
    const token = randomBytes(32).toString("base64url");
    const now = new Date();
    const row = await prisma.workspace_invitations.create({ data: {
      workspace_id: workspaceId(), email: email.toLowerCase(), role, token_hash: hashInviteToken(token),
      status: "invited", sent_at: now, expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), invited_by: invitedBy,
    } });
    try {
      await this.sendInvitation(row.email, row.role, token);
    } catch (error) {
      await prisma.workspace_invitations.deleteMany({ where: { id: row.id, workspace_id: workspaceId() } });
      throw error;
    }
    return invitationView(row);
  }

  async resendInvitation(id: string) {
    this.requireEmailConfig();
    const workspace = workspaceId();
    const prior = await prisma.workspace_invitations.findFirst({ where: { id, workspace_id: workspace, accepted_at: null, status: { in: ["invited", "reminder_sent"] } } });
    if (!prior) throw new Error("Invitation not found");
    const token = randomBytes(32).toString("base64url");
    const now = new Date();
    const rotated = await prisma.workspace_invitations.updateMany({
      where: { id, workspace_id: workspace, accepted_at: null, status: { in: ["invited", "reminder_sent"] } },
      data: { token_hash: hashInviteToken(token), sent_at: now, reminded_at: now, status: "reminder_sent", expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
    });
    if (!rotated.count) throw new Error("Invitation not found or already accepted");
    const row = await prisma.workspace_invitations.findFirst({ where: { id, workspace_id: workspace } });
    if (!row) throw new Error("Invitation not found");
    await this.sendInvitation(row.email, row.role, token);
    return invitationView(row);
  }

  async deleteInvitation(id: string): Promise<boolean> {
    return (await prisma.workspace_invitations.updateMany({
      where: { id, workspace_id: workspaceId(), accepted_at: null, status: { in: ["invited", "reminder_sent"] } },
      data: { status: "canceled", canceled_at: new Date() },
    })).count > 0;
  }

  async updateMember(id: string, role: InviteRole): Promise<WorkspaceMemberView> {
    const workspace = workspaceId();
    const member = await prisma.workspace_members.findFirst({ where: { id, workspace_id: workspace }, select: { user_id: true, role: true } });
    if (!member) throw new Error("Workspace member not found");
    if (member.role === "owner") throw new Error("Cannot change owner role. Transfer ownership first.");
    await getWorkspaceService().updateMemberRole(workspace, member.user_id, role);
    const updated = await prisma.workspace_members.findFirst({
      where: { id, workspace_id: workspace },
      include: { users_workspace_members_user_idTousers: { select: { email: true, display_name: true } } },
    });
    if (!updated) throw new Error("Workspace member not found");
    return memberView(updated);
  }

  async updateMemberStatus(id: string, status: WorkspaceMemberView["status"]): Promise<WorkspaceMemberView> {
    const workspace = workspaceId();
    const member = await prisma.workspace_members.findFirst({
      where: { id, workspace_id: workspace },
      select: { role: true, user_id: true, workspaces: { select: { owner_id: true } } },
    });
    if (!member) throw new Error("Workspace member not found");
    if (status === "deactivated" && (member.role === "owner" || member.workspaces.owner_id === member.user_id)) {
      throw new Error("Cannot deactivate workspace owner. Transfer ownership first.");
    }
    const updatedCount = await prisma.workspace_members.updateMany({
      where: {
        id,
        workspace_id: workspace,
        ...(status === "deactivated" ? {
          role: { not: "owner" },
          workspaces: { isNot: { owner_id: member.user_id } },
        } : {}),
      },
      data: { status },
    });
    if (!updatedCount.count) throw new Error("Workspace member not found or ownership changed");
    const updated = await prisma.workspace_members.findFirst({
      where: { id, workspace_id: workspace },
      include: { users_workspace_members_user_idTousers: { select: { email: true, display_name: true } } },
    });
    if (!updated) throw new Error("Workspace member not found");
    return memberView(updated);
  }

  async deleteMember(id: string): Promise<boolean> {
    const workspace = workspaceId();
    const member = await prisma.workspace_members.findFirst({ where: { id, workspace_id: workspace }, select: { role: true, user_id: true } });
    if (!member) return false;
    if (member.role === "owner") throw new Error("Cannot remove workspace owner. Transfer ownership first.");
    await getWorkspaceService().removeMember(workspace, member.user_id);
    return true;
  }

  async getIntegrations(): Promise<WorkspaceIntegrationsResponse> {
    const workspace = workspaceId();
    const [keys, settings] = await Promise.all([
      prisma.workspace_provider_keys.findMany({ where: { workspace_id: workspace } }),
      prisma.workspace_integration_settings.findUnique({ where: { workspace_id: workspace } }),
    ]);
    const stored = new Map(keys.map((item) => [item.provider as Provider, item]));
    return {
      keys: providers.map((provider) => {
        const key = stored.get(provider);
        if (key) {
          const masked = process.env.WORKSPACE_KEY_ENCRYPTION_KEY ? maskKey(decryptWorkspaceKey(key)) : "Encrypted key stored";
          return { provider, configured: true, source: "workspace" as const, masked };
        }
        const env = process.env[envKeys[provider]];
        return { provider, configured: Boolean(env), source: env ? "env" as const : "none" as const, masked: env ? maskKey(env) : "" };
      }),
      quota: this.quotaView(settings),
    };
  }

  async updateIntegrations(input: { keys?: Partial<Record<Provider, string | null>>; quota?: Partial<QuotaView> }): Promise<WorkspaceIntegrationsResponse> {
    const workspace = workspaceId();
    if (input.keys && Object.keys(input.keys).length) {
      encryptionKey();
      for (const [provider, value] of Object.entries(input.keys) as Array<[Provider, string | null]>) {
        if (!providers.includes(provider)) throw new Error("Unsupported provider");
        if (value === null) {
          await prisma.workspace_provider_keys.deleteMany({ where: { workspace_id: workspace, provider } });
        } else if (typeof value === "string" && value.trim()) {
          await prisma.workspace_provider_keys.upsert({
            where: { workspace_id_provider: { workspace_id: workspace, provider } },
            create: { workspace_id: workspace, provider, ...encryptWorkspaceKey(value.trim()) },
            update: { ...encryptWorkspaceKey(value.trim()), updated_at: new Date() },
          });
        } else {
          throw new Error("Provider keys must be non-empty strings or null");
        }
      }
    }
    if (input.quota && Object.keys(input.quota).length) {
      await prisma.workspace_integration_settings.upsert({
        where: { workspace_id: workspace },
        create: { workspace_id: workspace, max_prompts_per_scan: input.quota.maxPromptsPerScan ?? null, max_scans_per_hour: input.quota.maxScansPerHour ?? null },
        update: {
          ...(input.quota.maxPromptsPerScan !== undefined ? { max_prompts_per_scan: input.quota.maxPromptsPerScan } : {}),
          ...(input.quota.maxScansPerHour !== undefined ? { max_scans_per_hour: input.quota.maxScansPerHour } : {}),
          updated_at: new Date(),
        },
      });
    }
    return this.getIntegrations();
  }

  async getProviderKey(provider: Provider): Promise<string | undefined> {
    const id = currentWorkspaceId();
    if (id) {
      const stored = await prisma.workspace_provider_keys.findUnique({ where: { workspace_id_provider: { workspace_id: id, provider } } });
      if (stored) return decryptWorkspaceKey(stored);
    }
    return process.env[envKeys[provider]];
  }

  async hasProviderKey(): Promise<boolean> {
    if (providers.some((provider) => Boolean(process.env[envKeys[provider]]))) return true;
    return Boolean(await prisma.workspace_provider_keys.findFirst({ where: { workspace_id: workspaceId() }, select: { provider: true } }));
  }

  async getQuota(): Promise<QuotaView> {
    const settings = await prisma.workspace_integration_settings.findUnique({ where: { workspace_id: workspaceId() } });
    return this.quotaView(settings);
  }

  async countScansSince(since: Date): Promise<number> {
    return prisma.workspace_scan_usage.count({ where: { workspace_id: workspaceId(), scanned_at: { gte: since } } });
  }

  async lockScanQuota(): Promise<void> {
    const workspace = workspaceId();
    await prisma.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${workspace}, 0))`;
  }

  async recordScan(): Promise<void> {
    await prisma.workspace_scan_usage.create({ data: { workspace_id: workspaceId() } });
  }

  async acceptInvitation(token: string, userId: string, email: string, name: string | null): Promise<string> {
    const tokenHash = hashInviteToken(token);
    return prismaRoot.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.invitation_token_hash', ${tokenHash}, true)`;
      const invitation = await tx.workspace_invitations.findFirst({ where: { token_hash: tokenHash, accepted_at: null, status: { in: ["invited", "reminder_sent"] } } });
      if (!invitation || invitation.expires_at <= new Date()) throw new Error("Invitation is invalid or expired");
      if (invitation.email.toLowerCase() !== email.toLowerCase()) throw new Error("Invitation email does not match the authenticated account");
      await tx.$executeRaw`SELECT set_config('app.current_workspace_id', ${invitation.workspace_id}, true)`;
      const claimed = await tx.workspace_invitations.updateMany({
        where: { id: invitation.id, workspace_id: invitation.workspace_id, accepted_at: null, status: { in: ["invited", "reminder_sent"] }, expires_at: { gt: new Date() } },
        data: { accepted_at: new Date() },
      });
      if (!claimed.count) throw new Error("Invitation has already been accepted or expired");
      await tx.users.upsert({
        where: { id: userId },
        create: { id: userId, email: invitation.email, display_name: name },
        update: { email: invitation.email, display_name: name ?? undefined, updated_at: new Date() },
      });
      await tx.workspace_members.upsert({
        where: { workspace_id_user_id: { workspace_id: invitation.workspace_id, user_id: userId } },
        create: { workspace_id: invitation.workspace_id, user_id: userId, role: invitation.role, invited_by: invitation.invited_by, status: "active" },
        update: { status: "active" },
      });
      return invitation.workspace_id;
    });
  }

  private quotaView(settings: { max_prompts_per_scan: number | null; max_scans_per_hour: number | null } | null): QuotaView {
    return {
      maxPromptsPerScan: settings?.max_prompts_per_scan ?? this.envLimit("SCAN_MAX_PROMPTS", 5),
      maxScansPerHour: settings?.max_scans_per_hour ?? this.envLimit("SCAN_MAX_SCANS_PER_HOUR", 10),
    };
  }

  private envLimit(name: string, fallback: number): number {
    const parsed = Number.parseInt(process.env[name] ?? "", 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private requireEmailConfig(): void {
    if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set; configure it before sending invitations");
    if (!process.env.ALERT_EMAIL_FROM) throw new Error("ALERT_EMAIL_FROM is not set; configure a verified Resend sender before sending invitations");
  }

  private async sendInvitation(email: string, role: string, token: string): Promise<void> {
    const base = process.env.APP_URL || process.env.CLIENT_URL || "http://localhost:3000";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.ALERT_EMAIL_FROM,
        to: [email],
        subject: "You have been invited to OpenAEO",
        text: `You have been invited to join a workspace as ${role}. Accept your invitation: ${base.replace(/\/$/, "")}/invitations/${token}`,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(payload?.message || `Invitation email delivery failed with status ${response.status}`);
    }
  }
}

const workspaceAdmin = new WorkspaceAdminService();

export function getWorkspaceProviderKey(provider: Provider): Promise<string | undefined> {
  return workspaceAdmin.getProviderKey(provider);
}
