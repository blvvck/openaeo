/**
 * Session Management Middleware Tests
 *
 * @vitest-environment node
 * Run with: npm test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  validateSession,
  optionalSession,
  checkWorkspaceAccess,
  setActiveWorkspace,
  getActiveWorkspace,
  clearActiveWorkspace,
  handleMemberRemoval,
  getSessionStore,
  invalidateUserSessions,
  createMockSessionToken,
  createEncodedSessionToken,
  SESSION_ERROR_CODES,
} from './session';
import { type WorkspaceRequest } from './tenant-isolation';
import { getWorkspaceService } from '../services/auth/workspace';

// Mock the workspace service
vi.mock('../services/auth/workspace', () => ({
  getWorkspaceService: vi.fn(),
}));

// Helper to create mock request
function mockRequest(overrides: Partial<WorkspaceRequest> = {}): WorkspaceRequest {
  return {
    params: {},
    query: {},
    headers: {},
    body: {},
    cookies: {},
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

describe('Session Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear session store before each test
    getSessionStore().clear();
  });

  afterEach(() => {
    getSessionStore().clear();
  });

  describe('Token Utilities', () => {
    describe('createMockSessionToken()', () => {
      it('creates a properly formatted mock token', () => {
        const token = createMockSessionToken('user-123', 'session-456');
        expect(token).toBe('mock_session_user-123_session-456');
      });
    });

    describe('createEncodedSessionToken()', () => {
      it('creates a base64 encoded token', () => {
        const token = createEncodedSessionToken({
          userId: 'user-123',
          sessionId: 'session-456',
        });

        // Should be valid base64
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        expect(decoded.userId).toBe('user-123');
        expect(decoded.sessionId).toBe('session-456');
      });

      it('includes optional fields', () => {
        const token = createEncodedSessionToken({
          userId: 'user-123',
          sessionId: 'session-456',
          orgId: 'org-789',
          orgRole: 'admin',
        });

        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        expect(decoded.orgId).toBe('org-789');
        expect(decoded.orgRole).toBe('admin');
      });
    });
  });

  describe('validateSession()', () => {
    it('returns 401 if no token is provided', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      await validateSession()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: SESSION_ERROR_CODES.AUTH_TOKEN_MISSING,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('extracts token from Authorization header', async () => {
      const token = createMockSessionToken('user-123', 'session-456');
      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = mockResponse();
      const next = mockNext();

      await validateSession()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.auth).toEqual({
        userId: 'user-123',
        sessionId: 'session-456',
        sessionClaims: undefined,
        orgId: undefined,
        orgRole: undefined,
      });
    });

    it('extracts token from cookie', async () => {
      const token = createMockSessionToken('user-123', 'session-456');
      const req = mockRequest({
        cookies: { __session: token },
      });
      const res = mockResponse();
      const next = mockNext();

      await validateSession()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.auth?.userId).toBe('user-123');
    });

    it('extracts token from query parameter', async () => {
      const token = createMockSessionToken('user-123', 'session-456');
      const req = mockRequest({
        query: { token },
      });
      const res = mockResponse();
      const next = mockNext();

      await validateSession()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.auth?.userId).toBe('user-123');
    });

    it('validates base64 encoded tokens', async () => {
      const token = createEncodedSessionToken({
        userId: 'user-encoded',
        sessionId: 'session-encoded',
        orgId: 'org-123',
      });
      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = mockResponse();
      const next = mockNext();

      await validateSession()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.auth).toMatchObject({
        userId: 'user-encoded',
        sessionId: 'session-encoded',
        orgId: 'org-123',
      });
    });

    it('returns 401 for invalid token format', async () => {
      const req = mockRequest({
        headers: { authorization: 'Bearer invalid_token_format' },
      });
      const res = mockResponse();
      const next = mockNext();

      await validateSession()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired session',
        code: SESSION_ERROR_CODES.AUTH_SESSION_INVALID,
      });
    });

    it('touches session store on successful validation', async () => {
      const token = createMockSessionToken('user-123', 'session-456');

      // First, set an active workspace
      const req1 = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res1 = mockResponse();
      const next1 = mockNext();
      await validateSession()(req1, res1, next1);

      // Set workspace
      setActiveWorkspace(req1, 'ws-123');

      // Validate again - should touch the session
      const req2 = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res2 = mockResponse();
      const next2 = mockNext();
      await validateSession()(req2, res2, next2);

      expect(next2).toHaveBeenCalled();
    });
  });

  describe('optionalSession()', () => {
    it('calls next without error if no token is provided', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      await optionalSession()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.auth).toBeUndefined();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('attaches auth context if valid token is provided', async () => {
      const token = createMockSessionToken('user-123', 'session-456');
      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = mockResponse();
      const next = mockNext();

      await optionalSession()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.auth?.userId).toBe('user-123');
    });

    it('continues without auth if token is invalid', async () => {
      const req = mockRequest({
        headers: { authorization: 'Bearer invalid_token' },
      });
      const res = mockResponse();
      const next = mockNext();

      await optionalSession()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.auth).toBeUndefined();
    });
  });

  describe('Active Workspace Tracking', () => {
    it('sets and gets active workspace', async () => {
      const token = createMockSessionToken('user-123', 'session-456');
      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = mockResponse();
      const next = mockNext();

      await validateSession()(req, res, next);

      setActiveWorkspace(req, 'ws-test-123');
      expect(getActiveWorkspace(req)).toBe('ws-test-123');
    });

    it('clears active workspace', async () => {
      const token = createMockSessionToken('user-123', 'session-789');
      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = mockResponse();
      const next = mockNext();

      await validateSession()(req, res, next);

      setActiveWorkspace(req, 'ws-test-456');
      expect(getActiveWorkspace(req)).toBe('ws-test-456');

      clearActiveWorkspace(req);
      expect(getActiveWorkspace(req)).toBeUndefined();
    });

    it('returns undefined if no session', () => {
      const req = mockRequest();
      expect(getActiveWorkspace(req)).toBeUndefined();
    });

    it('throws error when setting workspace without session', () => {
      const req = mockRequest();
      expect(() => setActiveWorkspace(req, 'ws-123')).toThrow(
        'Session required to set active workspace'
      );
    });
  });

  describe('handleMemberRemoval()', () => {
    it('invalidates sessions for removed user in specific workspace', async () => {
      // Create two sessions for user-123
      const token1 = createMockSessionToken('user-123', 'session-1');
      const token2 = createMockSessionToken('user-123', 'session-2');

      // Session 1 in workspace A
      const req1 = mockRequest({
        headers: { authorization: `Bearer ${token1}` },
      });
      await validateSession()(req1, mockResponse(), mockNext());
      setActiveWorkspace(req1, 'ws-A');

      // Session 2 in workspace B
      const req2 = mockRequest({
        headers: { authorization: `Bearer ${token2}` },
      });
      await validateSession()(req2, mockResponse(), mockNext());
      setActiveWorkspace(req2, 'ws-B');

      // Remove user from workspace A
      handleMemberRemoval('user-123', 'ws-A');

      // Session 1 should be gone, Session 2 should remain
      expect(getActiveWorkspace(req1)).toBeUndefined();
      expect(getActiveWorkspace(req2)).toBe('ws-B');
    });
  });

  describe('invalidateUserSessions()', () => {
    it('removes all sessions for a user', async () => {
      // Create two sessions for user-123
      const token1 = createMockSessionToken('user-123', 'session-a');
      const token2 = createMockSessionToken('user-123', 'session-b');

      const req1 = mockRequest({
        headers: { authorization: `Bearer ${token1}` },
      });
      await validateSession()(req1, mockResponse(), mockNext());
      setActiveWorkspace(req1, 'ws-1');

      const req2 = mockRequest({
        headers: { authorization: `Bearer ${token2}` },
      });
      await validateSession()(req2, mockResponse(), mockNext());
      setActiveWorkspace(req2, 'ws-2');

      // Invalidate all sessions
      invalidateUserSessions('user-123');

      expect(getActiveWorkspace(req1)).toBeUndefined();
      expect(getActiveWorkspace(req2)).toBeUndefined();
    });
  });

  describe('checkWorkspaceAccess()', () => {
    let mockWorkspaceService: {
      userHasAccess: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockWorkspaceService = {
        userHasAccess: vi.fn(),
      };
      vi.mocked(getWorkspaceService).mockReturnValue(mockWorkspaceService as any);
    });

    it('calls next if user still has access', async () => {
      const token = createMockSessionToken('user-123', 'session-check');
      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
        workspace: { workspaceId: 'ws-123', userId: 'user-123', role: 'member' },
      });

      // Validate session first
      await validateSession()(req, mockResponse(), mockNext());

      mockWorkspaceService.userHasAccess.mockResolvedValue(true);

      const res = mockResponse();
      const next = mockNext();

      await checkWorkspaceAccess()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 403 if user access was revoked', async () => {
      const token = createMockSessionToken('user-revoked', 'session-revoked');
      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
        workspace: { workspaceId: 'ws-123', userId: 'user-revoked', role: 'member' },
      });

      // Validate session first
      await validateSession()(req, mockResponse(), mockNext());

      mockWorkspaceService.userHasAccess.mockResolvedValue(false);

      const res = mockResponse();
      const next = mockNext();

      await checkWorkspaceAccess()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Your access to this workspace has been revoked',
        code: SESSION_ERROR_CODES.WORKSPACE_ACCESS_REVOKED,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next if no auth or workspace context', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = mockNext();

      await checkWorkspaceAccess()(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockWorkspaceService.userHasAccess).not.toHaveBeenCalled();
    });
  });

  describe('Session Store', () => {
    it('getSessionCount returns correct count', async () => {
      const store = getSessionStore();
      expect(store.getSessionCount()).toBe(0);

      // Add a session
      const token = createMockSessionToken('user-1', 'session-1');
      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      await validateSession()(req, mockResponse(), mockNext());
      setActiveWorkspace(req, 'ws-1');

      expect(store.getSessionCount()).toBe(1);
    });

    it('getUserSessions returns sessions for user', async () => {
      const token1 = createMockSessionToken('user-multi', 'session-m1');
      const token2 = createMockSessionToken('user-multi', 'session-m2');
      const token3 = createMockSessionToken('other-user', 'session-o1');

      const req1 = mockRequest({
        headers: { authorization: `Bearer ${token1}` },
      });
      await validateSession()(req1, mockResponse(), mockNext());
      setActiveWorkspace(req1, 'ws-1');

      const req2 = mockRequest({
        headers: { authorization: `Bearer ${token2}` },
      });
      await validateSession()(req2, mockResponse(), mockNext());
      setActiveWorkspace(req2, 'ws-2');

      const req3 = mockRequest({
        headers: { authorization: `Bearer ${token3}` },
      });
      await validateSession()(req3, mockResponse(), mockNext());
      setActiveWorkspace(req3, 'ws-3');

      const store = getSessionStore();
      const userSessions = store.getUserSessions('user-multi');

      expect(userSessions).toHaveLength(2);
      expect(userSessions.map((s) => s.sessionId)).toContain('session-m1');
      expect(userSessions.map((s) => s.sessionId)).toContain('session-m2');
    });

    it('cleanup removes expired sessions', async () => {
      const store = getSessionStore();

      // Create a session
      const token = createMockSessionToken('user-expire', 'session-expire');
      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      });
      await validateSession()(req, mockResponse(), mockNext());
      setActiveWorkspace(req, 'ws-1');

      expect(store.getSessionCount()).toBe(1);

      // Run cleanup (sessions won't expire immediately, but this tests the function)
      store.cleanup();

      // Session should still exist (not expired yet)
      expect(store.getSessionCount()).toBe(1);
    });

    it('clear removes all sessions', async () => {
      const store = getSessionStore();

      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        const token = createMockSessionToken(`user-${i}`, `session-${i}`);
        const req = mockRequest({
          headers: { authorization: `Bearer ${token}` },
        });
        await validateSession()(req, mockResponse(), mockNext());
        setActiveWorkspace(req, `ws-${i}`);
      }

      expect(store.getSessionCount()).toBe(3);

      store.clear();

      expect(store.getSessionCount()).toBe(0);
    });
  });

  describe('Error Codes', () => {
    it('exports all expected error codes', () => {
      expect(SESSION_ERROR_CODES).toEqual({
        AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
        AUTH_SESSION_INVALID: 'AUTH_SESSION_INVALID',
        AUTH_SESSION_ERROR: 'AUTH_SESSION_ERROR',
        WORKSPACE_ACCESS_REVOKED: 'WORKSPACE_ACCESS_REVOKED',
        ACCESS_CHECK_ERROR: 'ACCESS_CHECK_ERROR',
      });
    });
  });
});
