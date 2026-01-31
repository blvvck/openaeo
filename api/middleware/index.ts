/**
 * Middleware Index
 *
 * Exports all middleware functions.
 */

// Tenant Isolation
export {
  requireWorkspace,
  optionalWorkspace,
  scopeToWorkspace,
  assertWorkspace,
  TENANT_ERROR_CODES,
  type WorkspaceRequest,
  type AuthContext,
  type TenantErrorCode,
} from './tenant-isolation';

// RBAC (Role-Based Access Control)
export {
  // Permission utilities
  hasPermission,
  meetsRoleRequirement,
  getRolePermissions,
  isRoleAbove,
  getRoleLevel,
  // Middleware
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireOwner,
  requireAdmin,
  requireMember,
  // Self-action utilities
  isSelfAction,
  requireSelfOrPermission,
  requireSelfOrRole,
  // Error codes
  RBAC_ERROR_CODES,
  type Permission,
  type RBACErrorCode,
} from './rbac';

// Session Management
export {
  // Middleware
  validateSession,
  optionalSession,
  checkWorkspaceAccess,
  // Active workspace tracking
  setActiveWorkspace,
  getActiveWorkspace,
  clearActiveWorkspace,
  // Member removal handling
  handleMemberRemoval,
  // Utilities
  getSessionStore,
  invalidateUserSessions,
  createMockSessionToken,
  createEncodedSessionToken,
  // Error codes
  SESSION_ERROR_CODES,
  type AuthenticatedRequest,
  type SessionErrorCode,
} from './session';
