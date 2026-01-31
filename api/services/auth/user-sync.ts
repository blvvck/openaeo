import type { WorkspaceRole } from "@shared/schema";
import { prisma } from "../../prisma";

export interface CreateUserParams {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface UpdateUserParams {
  email?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface CreateWorkspaceParams {
  clerkOrgId: string;
  name: string;
  slug: string;
  createdByUserId: string;
}

export interface UpdateWorkspaceParams {
  name?: string;
  slug?: string;
}

export interface AddMemberParams {
  clerkOrgId: string;
  userId: string;
  role: WorkspaceRole;
}

export interface UpdateMemberParams {
  clerkOrgId: string;
  userId: string;
  role: WorkspaceRole;
}

export interface RemoveMemberParams {
  clerkOrgId: string;
  userId: string;
}

function toCamelCase<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
    value,
  ])) as T;
}

export class UserSyncService {
  private orgIdToWorkspaceId = new Map<string, string>();

  async createUser(params: CreateUserParams): Promise<void> {
    await prisma.users.upsert({
      where: { id: params.id },
      create: {
        id: params.id,
        email: params.email,
        display_name: params.displayName ?? null,
        avatar_url: params.avatarUrl ?? null,
      },
      update: {
        email: params.email,
        display_name: params.displayName ?? null,
        avatar_url: params.avatarUrl ?? null,
        updated_at: new Date(),
      },
    });
  }

  async updateUser(id: string, params: UpdateUserParams): Promise<void> {
    await prisma.users.updateMany({
      where: { id },
      data: {
        ...(params.email !== undefined ? { email: params.email } : {}),
        ...(params.displayName !== undefined ? { display_name: params.displayName } : {}),
        ...(params.avatarUrl !== undefined ? { avatar_url: params.avatarUrl } : {}),
        updated_at: new Date(),
      },
    });
  }

  async deleteUser(id: string): Promise<void> {
    await prisma.users.updateMany({ where: { id }, data: { deleted_at: new Date(), updated_at: new Date() } });
  }

  async createWorkspace(params: CreateWorkspaceParams): Promise<string> {
    const workspace = await prisma.workspaces.upsert({
      where: { slug: params.slug },
      create: { name: params.name, slug: params.slug, owner_id: params.createdByUserId, plan: "free" },
      update: {},
    });
    this.orgIdToWorkspaceId.set(params.clerkOrgId, workspace.id);
    await prisma.workspace_members.upsert({
      where: { workspace_id_user_id: { workspace_id: workspace.id, user_id: params.createdByUserId } },
      create: { workspace_id: workspace.id, user_id: params.createdByUserId, role: "owner" },
      update: {},
    });
    return workspace.id;
  }

  async updateWorkspace(clerkOrgId: string, params: UpdateWorkspaceParams): Promise<void> {
    const workspaceId = await this.getWorkspaceIdFromClerkOrg(clerkOrgId);
    if (!workspaceId) return;
    await prisma.workspaces.updateMany({
      where: { id: workspaceId },
      data: { ...params, updated_at: new Date() },
    });
  }

  async deleteWorkspace(clerkOrgId: string): Promise<void> {
    const workspaceId = await this.getWorkspaceIdFromClerkOrg(clerkOrgId);
    if (!workspaceId) return;
    await prisma.workspaces.updateMany({
      where: { id: workspaceId },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });
  }

  async addWorkspaceMember(params: AddMemberParams): Promise<void> {
    const workspaceId = await this.getWorkspaceIdFromClerkOrg(params.clerkOrgId);
    if (!workspaceId) return;
    await prisma.workspace_members.upsert({
      where: { workspace_id_user_id: { workspace_id: workspaceId, user_id: params.userId } },
      create: { workspace_id: workspaceId, user_id: params.userId, role: params.role },
      update: { role: params.role },
    });
  }

  async updateWorkspaceMember(params: UpdateMemberParams): Promise<void> {
    const workspaceId = await this.getWorkspaceIdFromClerkOrg(params.clerkOrgId);
    if (!workspaceId) return;
    await prisma.workspace_members.updateMany({
      where: { workspace_id: workspaceId, user_id: params.userId },
      data: { role: params.role },
    });
  }

  async removeWorkspaceMember(params: RemoveMemberParams): Promise<void> {
    const workspaceId = await this.getWorkspaceIdFromClerkOrg(params.clerkOrgId);
    if (!workspaceId) return;
    await prisma.workspace_members.deleteMany({ where: { workspace_id: workspaceId, user_id: params.userId } });
  }

  private async getWorkspaceIdFromClerkOrg(clerkOrgId: string): Promise<string | null> {
    return this.orgIdToWorkspaceId.get(clerkOrgId) ?? null;
  }

  async getUser(id: string) {
    const user = await prisma.users.findUnique({ where: { id } });
    return user ? toCamelCase(user) : null;
  }

  async getUserByEmail(email: string) {
    const user = await prisma.users.findUnique({ where: { email } });
    return user ? toCamelCase(user) : null;
  }
}

let userSyncService: UserSyncService | null = null;

export function getUserSyncService(): UserSyncService {
  userSyncService ??= new UserSyncService();
  return userSyncService;
}

export function resetUserSyncService(): void {
  userSyncService = null;
}
