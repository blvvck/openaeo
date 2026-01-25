/**
 * Auth Services Module
 *
 * Re-exports all auth-related services.
 */

export {
  UserSyncService,
  getUserSyncService,
  resetUserSyncService,
  type CreateUserParams,
  type UpdateUserParams,
  type CreateWorkspaceParams as CreateWorkspaceFromClerkParams,
  type UpdateWorkspaceParams as UpdateWorkspaceFromClerkParams,
  type AddMemberParams,
  type UpdateMemberParams,
  type RemoveMemberParams,
} from './user-sync';

export {
  WorkspaceService,
  getWorkspaceService,
  resetWorkspaceService,
  type WorkspaceWithMembers,
  type CreateWorkspaceParams,
  type UpdateWorkspaceParams,
  type WorkspaceContext,
} from './workspace';
