import type { Workspace, WorkspaceMember, WorkspaceRole } from "@shared/schema";
import { prisma } from "../../prisma";

export interface WorkspaceWithMembers extends Workspace {
  members: Array<WorkspaceMember & { user: { email: string; displayName: string | null; avatarUrl: string | null } | null }>;
}

export interface CreateWorkspaceParams {
  name: string;
  slug: string;
  ownerId: string;
  plan?: string;
}

export interface UpdateWorkspaceParams {
  name?: string;
  slug?: string;
  plan?: string;
}

export interface WorkspaceContext {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}

function camelCaseRow<T>(value: Record<string, unknown>): T {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
    item,
  ])) as T;
}

function mapWorkspace(value: Record<string, unknown>): Workspace {
  return camelCaseRow<Workspace>(value);
}

function mapMember(value: Record<string, unknown>): WorkspaceMember {
  return camelCaseRow<WorkspaceMember>(value);
}

export class WorkspaceService {
  async create(params: CreateWorkspaceParams): Promise<Workspace> {
    const workspace = await prisma.$transaction(async (transaction) => {
      const created = await transaction.workspaces.create({
        data: { name: params.name, slug: params.slug, owner_id: params.ownerId, plan: params.plan ?? "free" },
      });
      await transaction.workspace_members.create({
        data: { workspace_id: created.id, user_id: params.ownerId, role: "owner" },
      });
      return created;
    });
    return mapWorkspace(workspace);
  }

  async getById(id: string): Promise<Workspace | null> {
    const row = await prisma.workspaces.findFirst({ where: { id, deleted_at: null } });
    return row ? mapWorkspace(row) : null;
  }

  async getBySlug(slug: string): Promise<Workspace | null> {
    const row = await prisma.workspaces.findFirst({ where: { slug, deleted_at: null } });
    return row ? mapWorkspace(row) : null;
  }

  async getWithMembers(id: string): Promise<WorkspaceWithMembers | null> {
    const row = await prisma.workspaces.findFirst({
      where: { id, deleted_at: null },
      include: { workspace_members: { include: { users_workspace_members_user_idTousers: true } } },
    });
    if (!row) return null;
    const { workspace_members, ...workspace } = row;
    return {
      ...mapWorkspace(workspace),
      members: workspace_members.map(({ users_workspace_members_user_idTousers: user, ...member }) => ({
        ...mapMember(member),
        user: user ? { email: user.email, displayName: user.display_name, avatarUrl: user.avatar_url } : null,
      })),
    };
  }

  async getByUser(userId: string): Promise<Workspace[]> {
    const rows = await prisma.workspaces.findMany({
      where: { deleted_at: null, workspace_members: { some: { user_id: userId } } },
      orderBy: { created_at: "desc" },
    });
    return rows.map(mapWorkspace);
  }

  async update(id: string, params: UpdateWorkspaceParams): Promise<Workspace> {
    if (params.slug) {
      const existing = await prisma.workspaces.findFirst({ where: { slug: params.slug, deleted_at: null } });
      if (existing && existing.id !== id) throw new Error(`Workspace with slug "${params.slug}" already exists`);
    }
    const result = await prisma.workspaces.updateMany({
      where: { id, deleted_at: null },
      data: { ...params, updated_at: new Date() },
    });
    if (!result.count) throw new Error(`Workspace ${id} not found`);
    return (await this.getById(id))!;
  }

  async delete(id: string): Promise<void> {
    const result = await prisma.workspaces.updateMany({
      where: { id, deleted_at: null },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });
    if (!result.count) throw new Error(`Workspace ${id} not found`);
  }

  async userHasAccess(workspaceId: string, userId: string): Promise<boolean> {
    return (await prisma.workspace_members.count({ where: { workspace_id: workspaceId, user_id: userId } })) > 0;
  }

  async getUserRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const member = await prisma.workspace_members.findUnique({
      where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: userId } },
      select: { role: true },
    });
    return (member?.role as WorkspaceRole) ?? null;
  }

  async addMember(workspaceId: string, userId: string, role: WorkspaceRole, invitedBy?: string): Promise<WorkspaceMember> {
    const existing = await prisma.workspace_members.findUnique({
      where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: userId } },
    });
    if (existing) throw new Error(`User ${userId} is already a member of workspace ${workspaceId}`);
    const member = await prisma.workspace_members.create({
      data: { workspace_id: workspaceId, user_id: userId, role, invited_by: invitedBy },
    });
    return mapMember(member);
  }

  async updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void> {
    const where = { workspace_id_user_id: { workspace_id: workspaceId, user_id: userId } };
    const current = await prisma.workspace_members.findUnique({ where, select: { role: true } });
    if (!current) throw new Error(`User ${userId} is not a member of workspace ${workspaceId}`);
    if (current.role === "owner") throw new Error("Cannot change owner role. Transfer ownership first.");
    await prisma.workspace_members.update({ where, data: { role } });
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    const where = { workspace_id_user_id: { workspace_id: workspaceId, user_id: userId } };
    const member = await prisma.workspace_members.findUnique({ where, select: { role: true } });
    if (!member) throw new Error(`User ${userId} is not a member of workspace ${workspaceId}`);
    if (member.role === "owner") throw new Error("Cannot remove workspace owner. Transfer ownership first.");
    await prisma.workspace_members.delete({ where });
  }

  async transferOwnership(workspaceId: string, currentOwnerId: string, newOwnerId: string): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      const current = await transaction.workspace_members.findUnique({
        where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: currentOwnerId } },
      });
      if (current?.role !== "owner") throw new Error(`User ${currentOwnerId} is not the owner of workspace ${workspaceId}`);
      const next = await transaction.workspace_members.findUnique({
        where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: newOwnerId } },
      });
      if (!next) throw new Error(`User ${newOwnerId} is not a member of workspace ${workspaceId}`);
      await transaction.workspace_members.update({ where: { id: current.id }, data: { role: "admin" } });
      await transaction.workspace_members.update({ where: { id: next.id }, data: { role: "owner" } });
      await transaction.workspaces.update({ where: { id: workspaceId }, data: { owner_id: newOwnerId, updated_at: new Date() } });
    });
  }

  async getMembers(workspaceId: string): Promise<Array<WorkspaceMember & { user: { email: string; displayName: string | null } | null }>> {
    const rows = await prisma.workspace_members.findMany({
      where: { workspace_id: workspaceId },
      include: { users_workspace_members_user_idTousers: { select: { email: true, display_name: true } } },
    });
    return rows.map(({ users_workspace_members_user_idTousers: user, ...member }) => ({
      ...mapMember(member),
      user: user ? { email: user.email, displayName: user.display_name } : null,
    }));
  }

  async countMembers(workspaceId: string): Promise<number> {
    return prisma.workspace_members.count({ where: { workspace_id: workspaceId } });
  }
}

let workspaceService: WorkspaceService | null = null;

export function getWorkspaceService(): WorkspaceService {
  workspaceService ??= new WorkspaceService();
  return workspaceService;
}

export function resetWorkspaceService(): void {
  workspaceService = null;
}
