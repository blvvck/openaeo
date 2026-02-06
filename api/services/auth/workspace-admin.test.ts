import { afterEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  workspace_invitations: { findFirst: vi.fn(), updateMany: vi.fn() },
  users: { upsert: vi.fn() },
  workspace_members: { upsert: vi.fn() },
}));
const prisma = vi.hoisted(() => ({
  workspace_invitations: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  workspace_members: { findMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
}));
const prismaRoot = vi.hoisted(() => ({ $transaction: vi.fn() }));

vi.mock("../../prisma", () => ({ prisma, prismaRoot }));
vi.mock("../../context/workspace-context", () => ({ currentWorkspaceId: () => "workspace-id" }));
vi.mock("./workspace", () => ({ getWorkspaceService: vi.fn() }));

import { decryptWorkspaceKey, encryptWorkspaceKey, hashInviteToken, scanQuotaExceeded, WorkspaceAdminService } from "./workspace-admin";

describe("workspace admin security helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    delete process.env.ALERT_EMAIL_FROM;
    delete process.env.WORKSPACE_KEY_ENCRYPTION_KEY;
  });

  it("encrypts and decrypts provider keys with authenticated encryption", () => {
    process.env.WORKSPACE_KEY_ENCRYPTION_KEY = Buffer.alloc(32, 8).toString("base64");
    const encrypted = encryptWorkspaceKey("sk-live-provider-secret");

    expect(encrypted.encrypted_key).not.toContain("sk-live-provider-secret");
    expect(decryptWorkspaceKey(encrypted)).toBe("sk-live-provider-secret");
  });

  it("stores invitation tokens only as one-way hashes", () => {
    const token = "random-invitation-token";
    const first = hashInviteToken(token);

    expect(first).toHaveLength(64);
    expect(first).not.toBe(token);
    expect(hashInviteToken(token)).toBe(first);
  });

  it("accepts a matching invitation once and creates its membership", async () => {
    const token = "invite-token-value";
    const now = new Date(Date.now() + 60_000);
    tx.workspace_invitations.findFirst.mockResolvedValue({
      id: "invite-id", workspace_id: "workspace-id", email: "person@example.com", role: "member",
      invited_by: "inviter-id", expires_at: now, accepted_at: null, status: "invited",
    });
    tx.workspace_invitations.updateMany.mockResolvedValue({ count: 1 });
    prismaRoot.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));

    const workspaceId = await new WorkspaceAdminService().acceptInvitation(token, "user-id", "person@example.com", "Person");

    expect(workspaceId).toBe("workspace-id");
    expect(tx.workspace_invitations.findFirst).toHaveBeenCalledWith({ where: { token_hash: hashInviteToken(token), accepted_at: null, status: { in: ["invited", "reminder_sent"] } } });
    expect(tx.workspace_invitations.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ accepted_at: expect.any(Date) }) }));
    expect(tx.workspace_members.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ workspace_id: "workspace-id", user_id: "user-id", role: "member" }),
      update: { status: "active" },
    }));
  });

  it("reports persisted member status and keeps canceled invitations visible", async () => {
    prisma.workspace_members.findMany.mockResolvedValue([{
      id: "member-id", user_id: "member-user", role: "member", status: "deactivated", joined_at: new Date(0),
      users_workspace_members_user_idTousers: { email: "member@example.com", display_name: "Member" },
    }]);
    prisma.workspace_invitations.findMany.mockResolvedValue([{
      id: "invite-id", email: "invite@example.com", role: "viewer", status: "canceled",
      sent_at: new Date(0), expires_at: new Date(60_000),
    }]);

    const result = await new WorkspaceAdminService().getMembers();

    expect(result.members[0].status).toBe("deactivated");
    expect(result.invitations[0].status).toBe("canceled");
    expect(prisma.workspace_invitations.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { workspace_id: "workspace-id", accepted_at: null, status: { in: ["invited", "reminder_sent", "canceled"] } },
    }));
  });

  it("marks resent invitations as reminders and refreshes their send time", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.ALERT_EMAIL_FROM = "team@example.com";
    const invitation = {
      id: "invite-id", email: "invite@example.com", role: "member", status: "reminder_sent",
      sent_at: new Date(), expires_at: new Date(Date.now() + 60_000),
    };
    prisma.workspace_invitations.findFirst.mockResolvedValueOnce({ id: "invite-id" }).mockResolvedValueOnce(invitation);
    prisma.workspace_invitations.updateMany.mockResolvedValue({ count: 1 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    const result = await new WorkspaceAdminService().resendInvitation("invite-id");

    expect(prisma.workspace_invitations.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "reminder_sent", sent_at: expect.any(Date), reminded_at: expect.any(Date) }),
    }));
    expect(result.status).toBe("reminder_sent");
    vi.unstubAllGlobals();
  });

  it("creates invitations in the invited state", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.ALERT_EMAIL_FROM = "team@example.com";
    prisma.workspace_invitations.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "invite-id", email: data.email, role: data.role, status: data.status,
      sent_at: data.sent_at, expires_at: data.expires_at,
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    const result = await new WorkspaceAdminService().createInvitation("invite@example.com", "member", "inviter-id");

    expect(prisma.workspace_invitations.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "invited" }),
    }));
    expect(result.status).toBe("invited");
  });

  it("cancels an invitation without deleting its row", async () => {
    prisma.workspace_invitations.updateMany.mockResolvedValue({ count: 1 });

    const canceled = await new WorkspaceAdminService().deleteInvitation("invite-id");

    expect(canceled).toBe(true);
    expect(prisma.workspace_invitations.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ workspace_id: "workspace-id", accepted_at: null }),
      data: { status: "canceled", canceled_at: expect.any(Date) },
    }));
  });

  it("does not allow the owner to be deactivated", async () => {
    prisma.workspace_members.findFirst.mockResolvedValue({ role: "owner", user_id: "owner-id", workspaces: { owner_id: "owner-id" } });

    await expect(new WorkspaceAdminService().updateMemberStatus("owner-id", "deactivated"))
      .rejects.toThrow("Cannot deactivate workspace owner");
    expect(prisma.workspace_members.updateMany).not.toHaveBeenCalled();
  });

  it("returns the updated member status", async () => {
    prisma.workspace_members.findFirst
      .mockResolvedValueOnce({ role: "member", user_id: "member-user", workspaces: { owner_id: "owner-user" } })
      .mockResolvedValueOnce({
        id: "member-id", user_id: "member-user", role: "member", status: "deactivated", joined_at: new Date(0),
        users_workspace_members_user_idTousers: { email: "member@example.com", display_name: "Member" },
      });
    prisma.workspace_members.updateMany.mockResolvedValue({ count: 1 });

    const result = await new WorkspaceAdminService().updateMemberStatus("member-id", "deactivated");

    expect(result.status).toBe("deactivated");
    expect(prisma.workspace_members.updateMany).toHaveBeenCalledWith({
      where: {
        id: "member-id", workspace_id: "workspace-id", role: { not: "owner" },
        workspaces: { isNot: { owner_id: "member-user" } },
      },
      data: { status: "deactivated" },
    });
  });

  it("blocks scan requests at the hourly limit", () => {
    expect(scanQuotaExceeded(9, 10)).toBe(false);
    expect(scanQuotaExceeded(10, 10)).toBe(true);
  });
});
