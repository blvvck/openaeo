/**
 * RBAC Middleware Tests
 *
 * @vitest-environment node
 * Run with: npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response, NextFunction } from 'express';
import {
  hasPermission,
  meetsRoleRequirement,
  getRolePermissions,
  isRoleAbove,
  getRoleLevel,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireOwner,
  requireAdmin,
  requireMember,
  isSelfAction,
  requireSelfOrPermission,
  requireSelfOrRole,
  RBAC_ERROR_CODES,
} from './rbac';
import { type WorkspaceRequest } from './tenant-isolation';

// Helper to create mock request
function mockRequest(overrides: Partial<WorkspaceRequest> = {}): WorkspaceRequest {
  return {
    params: {},
    query: {},
    headers: {},
    body: {},
    auth: undefined,
    workspace: undefined,
    ...overrides,
  } as WorkspaceRequest;
}

// Helper to create mock response
function mockResponse() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

// Helper to create mock next function
function mockNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

describe('RBAC Permission Utilities', () => {
  describe('hasPermission()', () => {
    describe('Owner role', () => {
      it('owner has all permissions via wildcard', () => {
        expect(hasPermission('owner', 'brands:read')).toBe(true);
        expect(hasPermission('owner', 'brands:write')).toBe(true);
        expect(hasPermission('owner', 'members:delete')).toBe(true);
        expect(hasPermission('owner', 'anything:anything')).toBe(true);
      });
    });

    describe('Admin role', () => {
      it('admin has workspace update and data write permissions', () => {
        expect(hasPermission('admin', 'workspace:update')).toBe(true);
        expect(hasPermission('admin', 'data:write')).toBe(true);
      });

      it('admin has members:invite and members:remove', () => {
        expect(hasPermission('admin', 'members:invite')).toBe(true);
        expect(hasPermission('admin', 'members:remove')).toBe(true);
      });

      it('admin has workspace read and update permissions', () => {
        expect(hasPermission('admin', 'workspace:read')).toBe(true);
        expect(hasPermission('admin', 'workspace:update')).toBe(true);
      });
    });

    describe('Member role', () => {
      it('member has data read and write permissions', () => {
        expect(hasPermission('member', 'data:read')).toBe(true);
        expect(hasPermission('member', 'data:write')).toBe(true);
      });

      it('member can read workspace and members', () => {
        expect(hasPermission('member', 'workspace:read')).toBe(true);
        expect(hasPermission('member', 'members:read')).toBe(true);
      });

      it('member does NOT have members:invite', () => {
        expect(hasPermission('member', 'members:invite')).toBe(false);
      });
    });

    describe('Viewer role', () => {
      it('viewer has workspace read access', () => {
        expect(hasPermission('viewer', 'workspace:read')).toBe(true);
      });

      it('viewer does NOT have data write access', () => {
        expect(hasPermission('viewer', 'data:write')).toBe(false);
      });

      it('viewer has data read access', () => {
        expect(hasPermission('viewer', 'data:read')).toBe(true);
      });

      it('viewer does NOT have member invite access', () => {
        expect(hasPermission('viewer', 'members:invite')).toBe(false);
      });
    });

    it('returns false for invalid role', () => {
      expect(hasPermission('invalid' as any, 'brands:read')).toBe(false);
    });
  });

  describe('meetsRoleRequirement()', () => {
    it('owner meets all role requirements', () => {
      expect(meetsRoleRequirement('owner', 'owner')).toBe(true);
      expect(meetsRoleRequirement('owner', 'admin')).toBe(true);
      expect(meetsRoleRequirement('owner', 'member')).toBe(true);
      expect(meetsRoleRequirement('owner', 'viewer')).toBe(true);
    });

    it('admin meets admin and below', () => {
      expect(meetsRoleRequirement('admin', 'owner')).toBe(false);
      expect(meetsRoleRequirement('admin', 'admin')).toBe(true);
      expect(meetsRoleRequirement('admin', 'member')).toBe(true);
      expect(meetsRoleRequirement('admin', 'viewer')).toBe(true);
    });

    it('member meets member and below', () => {
      expect(meetsRoleRequirement('member', 'owner')).toBe(false);
      expect(meetsRoleRequirement('member', 'admin')).toBe(false);
      expect(meetsRoleRequirement('member', 'member')).toBe(true);
      expect(meetsRoleRequirement('member', 'viewer')).toBe(true);
    });

    it('viewer only meets viewer', () => {
      expect(meetsRoleRequirement('viewer', 'owner')).toBe(false);
      expect(meetsRoleRequirement('viewer', 'admin')).toBe(false);
      expect(meetsRoleRequirement('viewer', 'member')).toBe(false);
      expect(meetsRoleRequirement('viewer', 'viewer')).toBe(true);
    });
  });

  describe('getRolePermissions()', () => {
    it('returns permissions for owner', () => {
      const perms = getRolePermissions('owner');
      expect(perms).toContain('*');
    });

    it('returns permissions for admin', () => {
      const perms = getRolePermissions('admin');
      expect(perms).toContain('workspace:update');
      expect(perms).toContain('members:invite');
    });

    it('returns permissions for member', () => {
      const perms = getRolePermissions('member');
      expect(perms).toContain('data:read');
      expect(perms).toContain('data:write');
    });

    it('returns permissions for viewer', () => {
      const perms = getRolePermissions('viewer');
      expect(perms).toContain('data:read');
    });

    it('returns empty array for invalid role', () => {
      const perms = getRolePermissions('invalid' as any);
      expect(perms).toEqual([]);
    });
  });

  describe('isRoleAbove()', () => {
    it('owner is above all other roles', () => {
      expect(isRoleAbove('owner', 'admin')).toBe(true);
      expect(isRoleAbove('owner', 'member')).toBe(true);
      expect(isRoleAbove('owner', 'viewer')).toBe(true);
    });

    it('owner is NOT above owner', () => {
      expect(isRoleAbove('owner', 'owner')).toBe(false);
    });

    it('admin is above member and viewer', () => {
      expect(isRoleAbove('admin', 'member')).toBe(true);
      expect(isRoleAbove('admin', 'viewer')).toBe(true);
    });

    it('admin is NOT above owner or admin', () => {
      expect(isRoleAbove('admin', 'owner')).toBe(false);
      expect(isRoleAbove('admin', 'admin')).toBe(false);
    });

    it('member is above viewer only', () => {
      expect(isRoleAbove('member', 'viewer')).toBe(true);
      expect(isRoleAbove('member', 'member')).toBe(false);
      expect(isRoleAbove('member', 'admin')).toBe(false);
    });

    it('viewer is not above any role', () => {
      expect(isRoleAbove('viewer', 'viewer')).toBe(false);
      expect(isRoleAbove('viewer', 'member')).toBe(false);
    });
  });

  describe('getRoleLevel()', () => {
    it('returns correct levels for all roles', () => {
      expect(getRoleLevel('owner')).toBe(4);
      expect(getRoleLevel('admin')).toBe(3);
      expect(getRoleLevel('member')).toBe(2);
      expect(getRoleLevel('viewer')).toBe(1);
    });

    it('returns 0 for invalid role', () => {
      expect(getRoleLevel('invalid' as any)).toBe(0);
    });
  });
});

describe('RBAC Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requirePermission()', () => {
    it('returns 401 if workspace context is missing', () => {
      const req = mockRequest({ workspace: undefined });
      const res = mockResponse();
      const next = mockNext();

      requirePermission('data:write')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Workspace context required',
        code: RBAC_ERROR_CODES.WORKSPACE_CONTEXT_REQUIRED,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 if user lacks required permission', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'u-1', role: 'viewer' },
      });
      const res = mockResponse();
      const next = mockNext();

      requirePermission('data:write')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Permission denied. Required: data:write',
        code: RBAC_ERROR_CODES.PERMISSION_DENIED,
        required: { permission: 'data:write' },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next if user has required permission', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'u-1', role: 'admin' },
      });
      const res = mockResponse();
      const next = mockNext();

      requirePermission('data:write')(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('owner passes any permission check', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'u-1', role: 'owner' },
      });
      const res = mockResponse();
      const next = mockNext();

      requirePermission('anything:anything')(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireAnyPermission()', () => {
    it('allows if user has any one of the permissions', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'u-1', role: 'viewer' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireAnyPermission(['data:write', 'data:read'])(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('denies if user has none of the permissions', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'u-1', role: 'viewer' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireAnyPermission(['data:write', 'members:invite'])(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAllPermissions()', () => {
    it('allows if user has all permissions', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'u-1', role: 'admin' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireAllPermissions(['data:read', 'data:write'])(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('denies if user is missing any permission', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'u-1', role: 'member' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireAllPermissions(['data:write', 'members:invite'])(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('members:invite'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole()', () => {
    it('allows if user meets role requirement', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'u-1', role: 'admin' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireRole('member')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('denies if user does not meet role requirement', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'u-1', role: 'member' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireRole('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Insufficient role. Required: admin or higher',
        code: RBAC_ERROR_CODES.INSUFFICIENT_ROLE,
        required: { role: 'admin' },
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireOwner()', () => {
    it('allows owner', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'u-1', role: 'owner' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireOwner()(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('denies admin', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'u-1', role: 'admin' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireOwner()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireAdmin()', () => {
    it('allows admin', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'u-1', role: 'admin' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireAdmin()(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('allows owner', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'u-1', role: 'owner' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireAdmin()(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('denies member', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'u-1', role: 'member' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireAdmin()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireMember()', () => {
    it('allows member', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'u-1', role: 'member' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireMember()(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('allows admin and owner', () => {
      const adminReq = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'u-1', role: 'admin' },
      });
      const ownerReq = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'u-1', role: 'owner' },
      });
      const res1 = mockResponse();
      const res2 = mockResponse();
      const next1 = mockNext();
      const next2 = mockNext();

      requireMember()(adminReq, res1, next1);
      requireMember()(ownerReq, res2, next2);

      expect(next1).toHaveBeenCalled();
      expect(next2).toHaveBeenCalled();
    });

    it('denies viewer', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'u-1', role: 'viewer' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireMember()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});

describe('Self-Action Utilities', () => {
  describe('isSelfAction()', () => {
    it('returns true when acting on self', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'user-123', role: 'member' },
      });

      expect(isSelfAction(req, 'user-123')).toBe(true);
    });

    it('returns false when acting on another user', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'user-123', role: 'member' },
      });

      expect(isSelfAction(req, 'user-456')).toBe(false);
    });

    it('returns false when workspace context is missing', () => {
      const req = mockRequest({ workspace: undefined });

      expect(isSelfAction(req, 'user-123')).toBe(false);
    });
  });

  describe('requireSelfOrPermission()', () => {
    it('allows action when user is acting on self', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'user-123', role: 'viewer' },
        params: { userId: 'user-123' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireSelfOrPermission('members:update')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('allows action when user has permission to act on others', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'admin-user', role: 'admin' },
        params: { userId: 'other-user' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireSelfOrPermission('members:remove')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('denies action when not self and lacks permission', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'user-123', role: 'viewer' },
        params: { userId: 'other-user' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireSelfOrPermission('members:update')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('checks body.userId if params.userId is not present', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'user-123', role: 'viewer' },
        body: { userId: 'user-123' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireSelfOrPermission('members:update')(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireSelfOrRole()', () => {
    it('allows action when user is acting on self', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'user-123', role: 'viewer' },
        params: { userId: 'user-123' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireSelfOrRole('admin')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('allows action when user has required role', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'admin-user', role: 'admin' },
        params: { userId: 'other-user' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireSelfOrRole('admin')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('denies action when not self and lacks role', () => {
      const req = mockRequest({
        workspace: { workspaceId: 'ws-1', userId: 'user-123', role: 'member' },
        params: { userId: 'other-user' },
      });
      const res = mockResponse();
      const next = mockNext();

      requireSelfOrRole('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe('Error Codes', () => {
  it('exports all expected error codes', () => {
    expect(RBAC_ERROR_CODES).toEqual({
      WORKSPACE_CONTEXT_REQUIRED: 'WORKSPACE_CONTEXT_REQUIRED',
      PERMISSION_DENIED: 'PERMISSION_DENIED',
      INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',
    });
  });
});
