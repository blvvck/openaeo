import { afterEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  workspace_provider_keys: { findMany: vi.fn() },
  workspace_integration_settings: { findUnique: vi.fn() },
}));

vi.mock("../../prisma", () => ({ prisma, prismaRoot: {} }));
vi.mock("../../context/workspace-context", () => ({ currentWorkspaceId: () => "workspace-id" }));
vi.mock("./workspace", () => ({ getWorkspaceService: vi.fn() }));

import { WorkspaceAdminService } from "./workspace-admin";

describe("integration settings read without a master key", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.WORKSPACE_KEY_ENCRYPTION_KEY;
  });

  it("returns env fallback and default quota", async () => {
    prisma.workspace_provider_keys.findMany.mockResolvedValue([]);
    prisma.workspace_integration_settings.findUnique.mockResolvedValue(null);

    const result = await new WorkspaceAdminService().getIntegrations();

    expect(result.keys).toHaveLength(6);
    expect(result.quota).toEqual({ maxPromptsPerScan: 5, maxScansPerHour: 10 });
  });

  it("reports stored keys without decrypting them", async () => {
    prisma.workspace_provider_keys.findMany.mockResolvedValue([{
      workspace_id: "workspace-id",
      provider: "openai",
      encrypted_key: "ciphertext",
      iv: "00",
      auth_tag: "00",
      updated_at: new Date(),
    }]);
    prisma.workspace_integration_settings.findUnique.mockResolvedValue(null);

    const result = await new WorkspaceAdminService().getIntegrations();
    const openai = result.keys.find((entry) => entry.provider === "openai");

    expect(openai).toMatchObject({ configured: true, source: "workspace", masked: "Encrypted key stored" });
  });
});
