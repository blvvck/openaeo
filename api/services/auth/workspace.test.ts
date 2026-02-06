import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: {
    workspaces: { create: vi.fn() },
    workspace_members: { create: vi.fn() },
  },
  prisma: {
    $transaction: vi.fn(),
    workspaces: { findFirst: vi.fn(), updateMany: vi.fn() },
    workspace_members: { count: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('../../prisma', () => ({ prisma: mocks.prisma }));

import { WorkspaceService } from './workspace';

describe('WorkspaceService', () => {
  let service: WorkspaceService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation((callback) => callback(mocks.transaction));
    service = new WorkspaceService();
  });

  it('creates the workspace and its owner membership atomically', async () => {
    const row = {
      id: '3e8b9847-5c45-4e3b-aac2-cc80009ae66b',
      name: 'OpenAEO',
      slug: 'openaeo',
      owner_id: 'user-123',
      plan: 'free',
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mocks.transaction.workspaces.create.mockResolvedValue(row);
    mocks.transaction.workspace_members.create.mockResolvedValue({});

    const workspace = await service.create({ name: 'OpenAEO', slug: 'openaeo', ownerId: 'user-123' });

    expect(workspace.id).toBe(row.id);
    expect(workspace.ownerId).toBe('user-123');
    expect(mocks.transaction.workspace_members.create).toHaveBeenCalledWith({
      data: { workspace_id: row.id, user_id: 'user-123', role: 'owner' },
    });
  });

  it('returns no workspace for a deleted or unknown ID', async () => {
    mocks.prisma.workspaces.findFirst.mockResolvedValue(null);

    await expect(service.getById('3e8b9847-5c45-4e3b-aac2-cc80009ae66b')).resolves.toBeNull();
    expect(mocks.prisma.workspaces.findFirst).toHaveBeenCalledWith({
      where: { id: '3e8b9847-5c45-4e3b-aac2-cc80009ae66b', deleted_at: null },
    });
  });

  it('does not change the owner role', async () => {
    mocks.prisma.workspace_members.updateMany.mockResolvedValue({ count: 0 });
    mocks.prisma.workspace_members.findUnique.mockResolvedValue({ role: 'owner' });

    await expect(service.updateMemberRole('workspace-id', 'owner-id', 'member')).rejects.toThrow('Cannot change owner role');
    expect(mocks.prisma.workspace_members.updateMany).toHaveBeenCalledWith({
      where: { workspace_id: 'workspace-id', user_id: 'owner-id', role: { not: 'owner' } },
      data: { role: 'member' },
    });
  });

  it('does not remove the owner', async () => {
    mocks.prisma.workspace_members.deleteMany.mockResolvedValue({ count: 0 });
    mocks.prisma.workspace_members.findUnique.mockResolvedValue({ role: 'owner' });

    await expect(service.removeMember('workspace-id', 'owner-id')).rejects.toThrow('Cannot remove workspace owner');
    expect(mocks.prisma.workspace_members.deleteMany).toHaveBeenCalledWith({
      where: { workspace_id: 'workspace-id', user_id: 'owner-id', role: { not: 'owner' } },
    });
  });
});
