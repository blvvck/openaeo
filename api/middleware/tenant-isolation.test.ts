/**
 * Tenant Isolation Middleware Tests
 *
 * @vitest-environment node
 * Run with: npm test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  requireWorkspace,
  optionalWorkspace,
  assertWorkspace,
  TENANT_ERROR_CODES,
  type WorkspaceRequest,
} from './tenant-isolation';
import { getWorkspaceService, resetWorkspaceService } from '../services/auth/workspace';

// Mock the workspace service
vi.mock('../services/auth/workspace', () => ({
  getWorkspaceService: vi.fn(),
  resetWorkspaceService: vi.fn(),
}));

// Helper to create mock request
function mockRequest(overrides: Partial<WorkspaceRequest> = {}): WorkspaceRequest {
  return {
    params: {},
    query: {},
    headers: {},
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

describe('Tenant Isolation Middleware', () => {
  let mockWorkspaceService: {
    getById: ReturnType<typeof vi.fn>;
    getUserRole: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockWorkspaceService = {
      getById: vi.fn(),
      getUserRole: vi.fn(),
    };

    vi.mocked(getWorkspaceService).mockReturnValue(mockWorkspaceService as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('requireWorkspace()', () => {
    describe('Authentication Check', () => {
      it('returns 401 if user is not authenticated', async () => {
        const req = mockRequest({ auth: undefined });
        const res = mockResponse();
        const next = mockNext();

        await requireWorkspace()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Authentication required',
          code: TENANT_ERROR_CODES.AUTH_REQUIRED,
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('returns 401 if auth.userId is missing', async () => {
        const req = mockRequest({ auth: { userId: '' } as any });
        const res = mockResponse();
        const next = mockNext();

        await requireWorkspace()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
      });
    });

    describe('Workspace ID Extraction', () => {
      it('extracts workspaceId from URL params', async () => {
        const req = mockRequest({
          auth: { userId: 'user-123' },
          params: { workspaceId: 'ws-from-param' },
        });
        const res = mockResponse();
        const next = mockNext();

        mockWorkspaceService.getById.mockResolvedValue({ id: 'ws-from-param' });
        mockWorkspaceService.getUserRole.mockResolvedValue('member');

        await requireWorkspace()(req, res, next);

        expect(mockWorkspaceService.getById).toHaveBeenCalledWith('ws-from-param');
        expect(next).toHaveBeenCalled();
      });

      it('extracts workspaceId from query params', async () => {
        const req = mockRequest({
          auth: { userId: 'user-123' },
          query: { workspaceId: 'ws-from-query' },
        });
        const res = mockResponse();
        const next = mockNext();

        mockWorkspaceService.getById.mockResolvedValue({ id: 'ws-from-query' });
        mockWorkspaceService.getUserRole.mockResolvedValue('admin');

        await requireWorkspace()(req, res, next);

        expect(mockWorkspaceService.getById).toHaveBeenCalledWith('ws-from-query');
        expect(next).toHaveBeenCalled();
      });

      it('extracts workspaceId from header', async () => {
        const req = mockRequest({
          auth: { userId: 'user-123' },
          headers: { 'x-workspace-id': 'ws-from-header' },
        });
        const res = mockResponse();
        const next = mockNext();

        mockWorkspaceService.getById.mockResolvedValue({ id: 'ws-from-header' });
        mockWorkspaceService.getUserRole.mockResolvedValue('owner');

        await requireWorkspace()(req, res, next);

        expect(mockWorkspaceService.getById).toHaveBeenCalledWith('ws-from-header');
        expect(next).toHaveBeenCalled();
      });

      it('prioritizes URL param over query and header', async () => {
        const req = mockRequest({
          auth: { userId: 'user-123' },
          params: { workspaceId: 'ws-param' },
          query: { workspaceId: 'ws-query' },
          headers: { 'x-workspace-id': 'ws-header' },
        });
        const res = mockResponse();
        const next = mockNext();

        mockWorkspaceService.getById.mockResolvedValue({ id: 'ws-param' });
        mockWorkspaceService.getUserRole.mockResolvedValue('member');

        await requireWorkspace()(req, res, next);

        expect(mockWorkspaceService.getById).toHaveBeenCalledWith('ws-param');
      });

      it('returns 400 if no workspaceId provided', async () => {
        const req = mockRequest({ auth: { userId: 'user-123' } });
        const res = mockResponse();
        const next = mockNext();

        await requireWorkspace()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Workspace ID is required',
          code: TENANT_ERROR_CODES.WORKSPACE_REQUIRED,
        });
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('Workspace Validation', () => {
      it('returns 404 if workspace not found', async () => {
        const req = mockRequest({
          auth: { userId: 'user-123' },
          params: { workspaceId: 'non-existent' },
        });
        const res = mockResponse();
        const next = mockNext();

        mockWorkspaceService.getById.mockResolvedValue(null);

        await requireWorkspace()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Workspace not found',
          code: TENANT_ERROR_CODES.WORKSPACE_NOT_FOUND,
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('returns 403 if user does not have access', async () => {
        const req = mockRequest({
          auth: { userId: 'user-123' },
          params: { workspaceId: 'ws-123' },
        });
        const res = mockResponse();
        const next = mockNext();

        mockWorkspaceService.getById.mockResolvedValue({ id: 'ws-123' });
        mockWorkspaceService.getUserRole.mockResolvedValue(null);

        await requireWorkspace()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Access denied to this workspace',
          code: TENANT_ERROR_CODES.WORKSPACE_ACCESS_DENIED,
        });
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('Context Attachment', () => {
      it('attaches workspace context to request for owner', async () => {
        const req = mockRequest({
          auth: { userId: 'user-123' },
          params: { workspaceId: 'ws-123' },
        });
        const res = mockResponse();
        const next = mockNext();

        mockWorkspaceService.getById.mockResolvedValue({ id: 'ws-123' });
        mockWorkspaceService.getUserRole.mockResolvedValue('owner');

        await requireWorkspace()(req, res, next);

        expect(req.workspace).toEqual({
          workspaceId: 'ws-123',
          userId: 'user-123',
          role: 'owner',
        });
        expect(next).toHaveBeenCalled();
      });

      it('attaches workspace context to request for admin', async () => {
        const req = mockRequest({
          auth: { userId: 'user-456' },
          params: { workspaceId: 'ws-123' },
        });
        const res = mockResponse();
        const next = mockNext();

        mockWorkspaceService.getById.mockResolvedValue({ id: 'ws-123' });
        mockWorkspaceService.getUserRole.mockResolvedValue('admin');

        await requireWorkspace()(req, res, next);

        expect(req.workspace?.role).toBe('admin');
      });

      it('attaches workspace context to request for member', async () => {
        const req = mockRequest({
          auth: { userId: 'user-789' },
          params: { workspaceId: 'ws-123' },
        });
        const res = mockResponse();
        const next = mockNext();

        mockWorkspaceService.getById.mockResolvedValue({ id: 'ws-123' });
        mockWorkspaceService.getUserRole.mockResolvedValue('member');

        await requireWorkspace()(req, res, next);

        expect(req.workspace?.role).toBe('member');
      });

      it('attaches workspace context to request for viewer', async () => {
        const req = mockRequest({
          auth: { userId: 'user-viewer' },
          params: { workspaceId: 'ws-123' },
        });
        const res = mockResponse();
        const next = mockNext();

        mockWorkspaceService.getById.mockResolvedValue({ id: 'ws-123' });
        mockWorkspaceService.getUserRole.mockResolvedValue('viewer');

        await requireWorkspace()(req, res, next);

        expect(req.workspace?.role).toBe('viewer');
      });
    });

    describe('Error Handling', () => {
      it('returns 500 on unexpected error', async () => {
        const req = mockRequest({
          auth: { userId: 'user-123' },
          params: { workspaceId: 'ws-123' },
        });
        const res = mockResponse();
        const next = mockNext();

        mockWorkspaceService.getById.mockRejectedValue(new Error('Database error'));

        await requireWorkspace()(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Internal server error',
          code: TENANT_ERROR_CODES.INTERNAL_ERROR,
        });
      });
    });
  });

  describe('optionalWorkspace()', () => {
    it('calls next without context if user not authenticated', async () => {
      const req = mockRequest({ auth: undefined });
      const res = mockResponse();
      const next = mockNext();

      await optionalWorkspace()(req, res, next);

      expect(req.workspace).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('calls next without context if no workspaceId provided', async () => {
      const req = mockRequest({ auth: { userId: 'user-123' } });
      const res = mockResponse();
      const next = mockNext();

      await optionalWorkspace()(req, res, next);

      expect(req.workspace).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('calls next without context if workspace not found', async () => {
      const req = mockRequest({
        auth: { userId: 'user-123' },
        params: { workspaceId: 'non-existent' },
      });
      const res = mockResponse();
      const next = mockNext();

      mockWorkspaceService.getById.mockResolvedValue(null);

      await optionalWorkspace()(req, res, next);

      expect(req.workspace).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('calls next without context if user has no access', async () => {
      const req = mockRequest({
        auth: { userId: 'user-123' },
        params: { workspaceId: 'ws-123' },
      });
      const res = mockResponse();
      const next = mockNext();

      mockWorkspaceService.getById.mockResolvedValue({ id: 'ws-123' });
      mockWorkspaceService.getUserRole.mockResolvedValue(null);

      await optionalWorkspace()(req, res, next);

      expect(req.workspace).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('attaches context if user has access', async () => {
      const req = mockRequest({
        auth: { userId: 'user-123' },
        params: { workspaceId: 'ws-123' },
      });
      const res = mockResponse();
      const next = mockNext();

      mockWorkspaceService.getById.mockResolvedValue({ id: 'ws-123' });
      mockWorkspaceService.getUserRole.mockResolvedValue('member');

      await optionalWorkspace()(req, res, next);

      expect(req.workspace).toEqual({
        workspaceId: 'ws-123',
        userId: 'user-123',
        role: 'member',
      });
      expect(next).toHaveBeenCalled();
    });

    it('continues on error without failing', async () => {
      const req = mockRequest({
        auth: { userId: 'user-123' },
        params: { workspaceId: 'ws-123' },
      });
      const res = mockResponse();
      const next = mockNext();

      mockWorkspaceService.getById.mockRejectedValue(new Error('Database error'));

      await optionalWorkspace()(req, res, next);

      expect(req.workspace).toBeUndefined();
      expect(next).toHaveBeenCalled();
      // Should not fail
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('assertWorkspace()', () => {
    it('does not throw if workspace context exists', () => {
      const req = mockRequest({
        workspace: {
          workspaceId: 'ws-123',
          userId: 'user-123',
          role: 'member',
        },
      });

      expect(() => assertWorkspace(req)).not.toThrow();
    });

    it('throws if workspace context is missing', () => {
      const req = mockRequest({ workspace: undefined });

      expect(() => assertWorkspace(req)).toThrow(
        'Workspace context not found. Did you forget requireWorkspace middleware?'
      );
    });
  });

  describe('Error Codes', () => {
    it('exports all expected error codes', () => {
      expect(TENANT_ERROR_CODES).toEqual({
        AUTH_REQUIRED: 'AUTH_REQUIRED',
        WORKSPACE_REQUIRED: 'WORKSPACE_REQUIRED',
        WORKSPACE_NOT_FOUND: 'WORKSPACE_NOT_FOUND',
        WORKSPACE_ACCESS_DENIED: 'WORKSPACE_ACCESS_DENIED',
        INTERNAL_ERROR: 'INTERNAL_ERROR',
      });
    });
  });
});
