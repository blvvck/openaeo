import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  getUser: vi.fn(),
  ensureDemoWorkspace: vi.fn(),
  prisma: {
    users: { upsert: vi.fn() },
    workspace_members: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
    workspaces: { findFirst: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
  },
  prismaRoot: { $transaction: vi.fn() },
}));

vi.mock("@clerk/express", () => ({ clerkClient: { users: { getUser: mocks.getUser } }, getAuth: mocks.getAuth }));
vi.mock("../prisma", () => ({ prisma: mocks.prisma, prismaRoot: mocks.prismaRoot }));
vi.mock("../context/workspace-context", () => ({ runInWorkspaceTransaction: (_client: unknown, _id: string, callback: () => unknown) => callback() }));
vi.mock("../services/auth/demo-workspace", () => ({
  demoSlug: () => "demo-slug",
  ensureDemoWorkspace: mocks.ensureDemoWorkspace,
  isDemoSlugConflict: () => false,
  isDemoWrite: () => false,
  isOwnedDemoWorkspace: () => false,
}));

import { workspaceContextMiddleware } from "./workspace-context";

describe("workspace context access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuth.mockReturnValue({ userId: "deactivated-user" });
    mocks.getUser.mockResolvedValue({
      emailAddresses: [{ id: "primary-email", emailAddress: "user@example.com" }],
      primaryEmailAddressId: "primary-email",
      firstName: "User",
      lastName: null,
      imageUrl: "",
    });
    mocks.prisma.workspace_members.findMany.mockResolvedValue([{
      workspaces: { id: "workspace-id", is_demo: false, deleted_at: null },
    }]);
    mocks.prisma.workspace_members.findUnique.mockResolvedValue({ status: "deactivated" });
    mocks.prisma.workspaces.findFirst.mockResolvedValue(null);
    mocks.prismaRoot.$transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback({}));
    mocks.ensureDemoWorkspace.mockResolvedValue({ id: "demo-id", is_demo: true, deleted_at: null });
  });

  it("checks membership status on each request despite a cached workspace list", async () => {
    const req = {
      path: "/workspaces/workspace-id/resource",
      originalUrl: "/api/workspaces/workspace-id/resource",
      method: "GET",
      header: vi.fn(),
    } as unknown as Request;
    const res = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      once: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    await workspaceContextMiddleware(req, res, next);

    expect(mocks.prisma.workspace_members.findUnique).toHaveBeenCalledWith({
      where: { workspace_id_user_id: { workspace_id: "workspace-id", user_id: "deactivated-user" } },
      select: { status: true },
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
