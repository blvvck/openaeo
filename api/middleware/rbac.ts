/**
 * RBAC (Role-Based Access Control) Middleware
 *
 * Permission system based on workspace roles.
 * Roles: owner > admin > member > viewer
 *
 * @module api/middleware/rbac
 */

import { Response, NextFunction } from 'express';
import { type WorkspaceRequest } from './tenant-isolation';
import { type WorkspaceRole, ROLE_PERMISSIONS } from '@shared/schema';

// ============================================================================
// Types
// ============================================================================

/**
 * Permission string format: "resource:action" or "resource:*"
 * Examples: "brands:read", "brands:write", "members:*"
 */
export type Permission = string;

/**
 * Role hierarchy for comparison
 * Higher number = more permissions
 */
const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

/**
 * Response shape for permission errors
 */
interface PermissionErrorResponse {
  error: string;
  code: string;
  required?: {
    permission?: Permission;
    role?: WorkspaceRole;
  };
}

// ============================================================================
// Permission Checking Utilities
// ============================================================================

/**
 * Check if a role has a specific permission
 *
 * @param role - The user's role in the workspace
 * @param permission - The permission to check (e.g., "brands:write")
 * @returns true if the role has the permission
 *
 * @example
 * hasPermission('admin', 'brands:write') // true
 * hasPermission('viewer', 'brands:write') // false
 * hasPermission('owner', 'anything') // true (owner has '*')
 */
export function hasPermission(role: WorkspaceRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];

  if (!rolePermissions) {
    return false;
  }

  // Owner has all permissions
  if (rolePermissions.includes('*')) {
    return true;
  }

  // Check exact match
  if (rolePermissions.includes(permission)) {
    return true;
  }

  // Check wildcard match (e.g., "brands:*" matches "brands:read")
  const [resource] = permission.split(':');
  if (rolePermissions.includes(`${resource}:*`)) {
    return true;
  }

  return false;
}

/**
 * Check if role meets minimum required role level
 *
 * @param role - The user's role
 * @param requiredRole - The minimum required role
 * @returns true if user's role is >= required role
 *
 * @example
 * meetsRoleRequirement('admin', 'member') // true (admin > member)
 * meetsRoleRequirement('viewer', 'member') // false (viewer < member)
 * meetsRoleRequirement('owner', 'owner') // true (owner == owner)
 */
export function meetsRoleRequirement(role: WorkspaceRole, requiredRole: WorkspaceRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Get all permissions for a role
 *
 * @param role - The role to get permissions for
 * @returns Array of permission strings
 */
export function getRolePermissions(role: WorkspaceRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if role is above another role
 *
 * @param role - The role to check
 * @param otherRole - The role to compare against
 * @returns true if role is strictly above otherRole
 */
export function isRoleAbove(role: WorkspaceRole, otherRole: WorkspaceRole): boolean {
  return ROLE_HIERARCHY[role] > ROLE_HIERARCHY[otherRole];
}

/**
 * Get role level as a number (for sorting/comparison)
 *
 * @param role - The role
 * @returns The hierarchy level
 */
export function getRoleLevel(role: WorkspaceRole): number {
  return ROLE_HIERARCHY[role] || 0;
}

// ============================================================================
// Middleware Functions
// ============================================================================

/**
 * Require a specific permission
 *
 * Use after requireWorkspace middleware.
 *
 * @param permission - Required permission (e.g., "brands:write")
 *
 * @example
 * router.post('/brands',
 *   requireWorkspace(),
 *   requirePermission('brands:write'),
 *   createBrand
 * );
 */
export function requirePermission(permission: Permission) {
  return (
    req: WorkspaceRequest,
    res: Response<PermissionErrorResponse>,
    next: NextFunction
  ): void => {
    if (!req.workspace) {
      res.status(401).json({
        error: 'Workspace context required',
        code: 'WORKSPACE_CONTEXT_REQUIRED',
      });
      return;
    }

    const { role } = req.workspace;

    if (!hasPermission(role, permission)) {
      res.status(403).json({
        error: `Permission denied. Required: ${permission}`,
        code: 'PERMISSION_DENIED',
        required: { permission },
      });
      return;
    }

    next();
  };
}

/**
 * Require any one of multiple permissions
 *
 * @param permissions - Array of permissions (any one is sufficient)
 *
 * @example
 * router.get('/reports',
 *   requireWorkspace(),
 *   requireAnyPermission(['reports:read', 'admin']),
 *   getReports
 * );
 */
export function requireAnyPermission(permissions: Permission[]) {
  return (
    req: WorkspaceRequest,
    res: Response<PermissionErrorResponse>,
    next: NextFunction
  ): void => {
    if (!req.workspace) {
      res.status(401).json({
        error: 'Workspace context required',
        code: 'WORKSPACE_CONTEXT_REQUIRED',
      });
      return;
    }

    const { role } = req.workspace;

    const hasAny = permissions.some((p) => hasPermission(role, p));

    if (!hasAny) {
      res.status(403).json({
        error: `Permission denied. Required one of: ${permissions.join(', ')}`,
        code: 'PERMISSION_DENIED',
        required: { permission: permissions.join(' | ') },
      });
      return;
    }

    next();
  };
}

/**
 * Require all specified permissions
 *
 * @param permissions - Array of permissions (all must be met)
 *
 * @example
 * router.delete('/brands/:id',
 *   requireWorkspace(),
 *   requireAllPermissions(['brands:delete', 'settings:write']),
 *   deleteBrand
 * );
 */
export function requireAllPermissions(permissions: Permission[]) {
  return (
    req: WorkspaceRequest,
    res: Response<PermissionErrorResponse>,
    next: NextFunction
  ): void => {
    if (!req.workspace) {
      res.status(401).json({
        error: 'Workspace context required',
        code: 'WORKSPACE_CONTEXT_REQUIRED',
      });
      return;
    }

    const { role } = req.workspace;

    const missingPermissions = permissions.filter((p) => !hasPermission(role, p));

    if (missingPermissions.length > 0) {
      res.status(403).json({
        error: `Permission denied. Missing: ${missingPermissions.join(', ')}`,
        code: 'PERMISSION_DENIED',
        required: { permission: missingPermissions.join(', ') },
      });
      return;
    }

    next();
  };
}

/**
 * Require minimum role level
 *
 * Use when you need role-based access without specific permissions.
 *
 * @param minRole - Minimum required role
 *
 * @example
 * router.put('/settings',
 *   requireWorkspace(),
 *   requireRole('admin'),
 *   updateSettings
 * );
 */
export function requireRole(minRole: WorkspaceRole) {
  return (
    req: WorkspaceRequest,
    res: Response<PermissionErrorResponse>,
    next: NextFunction
  ): void => {
    if (!req.workspace) {
      res.status(401).json({
        error: 'Workspace context required',
        code: 'WORKSPACE_CONTEXT_REQUIRED',
      });
      return;
    }

    const { role } = req.workspace;

    if (!meetsRoleRequirement(role, minRole)) {
      res.status(403).json({
        error: `Insufficient role. Required: ${minRole} or higher`,
        code: 'INSUFFICIENT_ROLE',
        required: { role: minRole },
      });
      return;
    }

    next();
  };
}

/**
 * Require owner role
 *
 * Shorthand for requireRole('owner').
 *
 * @example
 * router.delete('/workspace',
 *   requireWorkspace(),
 *   requireOwner(),
 *   deleteWorkspace
 * );
 */
export function requireOwner() {
  return requireRole('owner');
}

/**
 * Require admin role or higher
 *
 * Shorthand for requireRole('admin').
 *
 * @example
 * router.post('/invite',
 *   requireWorkspace(),
 *   requireAdmin(),
 *   inviteMember
 * );
 */
export function requireAdmin() {
  return requireRole('admin');
}

/**
 * Require member role or higher
 *
 * Shorthand for requireRole('member').
 *
 * @example
 * router.post('/brands',
 *   requireWorkspace(),
 *   requireMember(),
 *   createBrand
 * );
 */
export function requireMember() {
  return requireRole('member');
}

// ============================================================================
// Self-Action Utilities
// ============================================================================

/**
 * Check if user is acting on themselves
 *
 * Useful for actions like "member can update own profile".
 *
 * @param req - The request with workspace context
 * @param targetUserId - The user ID being acted upon
 * @returns true if acting on self
 */
export function isSelfAction(req: WorkspaceRequest, targetUserId: string): boolean {
  return req.workspace?.userId === targetUserId;
}

/**
 * Allow action if user is self OR has required permission
 *
 * @param permission - Required permission for non-self actions
 *
 * @example
 * // User can update their own profile, or admin can update anyone's
 * router.put('/members/:userId',
 *   requireWorkspace(),
 *   requireSelfOrPermission('members:update'),
 *   updateMember
 * );
 */
export function requireSelfOrPermission(permission: Permission) {
  return (
    req: WorkspaceRequest,
    res: Response<PermissionErrorResponse>,
    next: NextFunction
  ): void => {
    if (!req.workspace) {
      res.status(401).json({
        error: 'Workspace context required',
        code: 'WORKSPACE_CONTEXT_REQUIRED',
      });
      return;
    }

    const targetUserId = req.params.userId || req.body?.userId;
    const { role, userId } = req.workspace;

    // Allow if acting on self
    if (targetUserId && userId === targetUserId) {
      next();
      return;
    }

    // Otherwise require permission
    if (!hasPermission(role, permission)) {
      res.status(403).json({
        error: `Permission denied. Required: ${permission} (or be the target user)`,
        code: 'PERMISSION_DENIED',
        required: { permission },
      });
      return;
    }

    next();
  };
}

/**
 * Allow action if user is self OR meets role requirement
 *
 * @param minRole - Required role for non-self actions
 */
export function requireSelfOrRole(minRole: WorkspaceRole) {
  return (
    req: WorkspaceRequest,
    res: Response<PermissionErrorResponse>,
    next: NextFunction
  ): void => {
    if (!req.workspace) {
      res.status(401).json({
        error: 'Workspace context required',
        code: 'WORKSPACE_CONTEXT_REQUIRED',
      });
      return;
    }

    const targetUserId = req.params.userId || req.body?.userId;
    const { role, userId } = req.workspace;

    // Allow if acting on self
    if (targetUserId && userId === targetUserId) {
      next();
      return;
    }

    // Otherwise require role
    if (!meetsRoleRequirement(role, minRole)) {
      res.status(403).json({
        error: `Insufficient role. Required: ${minRole} or higher (or be the target user)`,
        code: 'INSUFFICIENT_ROLE',
        required: { role: minRole },
      });
      return;
    }

    next();
  };
}

// ============================================================================
// Error Codes
// ============================================================================

export const RBAC_ERROR_CODES = {
  WORKSPACE_CONTEXT_REQUIRED: 'WORKSPACE_CONTEXT_REQUIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',
} as const;

export type RBACErrorCode = typeof RBAC_ERROR_CODES[keyof typeof RBAC_ERROR_CODES];
