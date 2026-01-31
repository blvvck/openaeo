/**
 * Session Management Middleware
 *
 * Handles session validation with Clerk SDK.
 * Provides active workspace tracking and session management.
 *
 * @module api/middleware/session
 */

import { Request, Response, NextFunction } from 'express';
import { type WorkspaceRequest, type AuthContext } from './tenant-isolation';
import { getWorkspaceService } from '../services/auth/workspace';

// ============================================================================
// Types
// ============================================================================

// Re-export AuthContext from tenant-isolation
export type { AuthContext };

/**
 * Request with auth context
 */
export interface AuthenticatedRequest extends Request {
  auth: AuthContext;
}

/**
 * Active workspace session data stored in memory
 */
interface ActiveSession {
  userId: string;
  sessionId: string;
  workspaceId: string;
  createdAt: Date;
  lastActivityAt: Date;
}

/**
 * Response for auth errors
 */
interface AuthErrorResponse {
  error: string;
  code: string;
}

// ============================================================================
// Session Store (In-Memory)
// ============================================================================

/**
 * In-memory session store for active workspace tracking
 * Maps sessionId -> ActiveSession
 *
 * Note: In production, this should be Redis-backed for multi-instance support
 */
class SessionStore {
  private sessions = new Map<string, ActiveSession>();
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Set active workspace for a session
   */
  setActiveWorkspace(sessionId: string, userId: string, workspaceId: string): void {
    const now = new Date();
    this.sessions.set(sessionId, {
      userId,
      sessionId,
      workspaceId,
      createdAt: now,
      lastActivityAt: now,
    });
    console.log(`[Session] Set active workspace ${workspaceId} for session ${sessionId}`);
  }

  /**
   * Get active session for a session ID
   */
  getSession(sessionId: string): ActiveSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    // Check if session has expired
    const now = Date.now();
    if (now - session.lastActivityAt.getTime() > this.SESSION_TIMEOUT_MS) {
      this.sessions.delete(sessionId);
      console.log(`[Session] Session ${sessionId} expired`);
      return undefined;
    }

    return session;
  }

  /**
   * Update last activity timestamp
   */
  touch(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = new Date();
    }
  }

  /**
   * Remove session
   */
  remove(sessionId: string): void {
    this.sessions.delete(sessionId);
    console.log(`[Session] Removed session ${sessionId}`);
  }

  /**
   * Remove all sessions for a user
   */
  removeUserSessions(userId: string): void {
    const entries = Array.from(this.sessions.entries());
    for (const [sessionId, session] of entries) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
      }
    }
    console.log(`[Session] Removed all sessions for user ${userId}`);
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: string): ActiveSession[] {
    const userSessions: ActiveSession[] = [];
    const now = Date.now();

    const sessions = Array.from(this.sessions.values());
    for (const session of sessions) {
      if (session.userId === userId) {
        // Check if not expired
        if (now - session.lastActivityAt.getTime() <= this.SESSION_TIMEOUT_MS) {
          userSessions.push(session);
        }
      }
    }

    return userSessions;
  }

  /**
   * Get session count (for debugging/monitoring)
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Clean up expired sessions
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    const entries = Array.from(this.sessions.entries());
    for (const [sessionId, session] of entries) {
      if (now - session.lastActivityAt.getTime() > this.SESSION_TIMEOUT_MS) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Session] Cleaned up ${cleaned} expired sessions`);
    }
  }

  /**
   * Clear all sessions (for testing)
   */
  clear(): void {
    this.sessions.clear();
  }
}

// Singleton session store
const sessionStore = new SessionStore();

// Run cleanup every 5 minutes
setInterval(() => sessionStore.cleanup(), 5 * 60 * 1000);

// ============================================================================
// Clerk SDK Mock (for development/testing)
// ============================================================================

/**
 * Mock Clerk session validation
 * In production, use @clerk/express middleware
 */
interface ClerkSession {
  userId: string;
  sessionId: string;
  claims?: Record<string, unknown>;
  orgId?: string;
  orgRole?: string;
}

/**
 * Validate session token (mock implementation)
 * Replace with actual Clerk SDK in production
 */
async function validateClerkSession(token: string): Promise<ClerkSession | null> {
  // In development, parse mock tokens
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    // Mock token format: "mock_session_userId_sessionId"
    if (token.startsWith('mock_session_')) {
      const parts = token.split('_');
      if (parts.length >= 4) {
        return {
          userId: parts[2],
          sessionId: parts[3],
        };
      }
    }

    // Also accept JSON tokens for testing
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      if (decoded.userId && decoded.sessionId) {
        return decoded;
      }
    } catch {
      // Not a valid JSON token
    }
  }

  // Production: Use Clerk SDK
  try {
    // This would be:
    // import { verifyToken } from '@clerk/backend';
    // const session = await verifyToken(token);
    // return session;

    // For now, return null for invalid tokens
    console.warn('[Session] Invalid session token');
    return null;
  } catch (error) {
    console.error('[Session] Token validation error:', error);
    return null;
  }
}

// ============================================================================
// Middleware Functions
// ============================================================================

/**
 * Extract authorization token from request
 */
function extractToken(req: Request): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookie
  const cookies = req.cookies;
  if (cookies?.['__session']) {
    return cookies['__session'];
  }

  // Check query parameter (for WebSocket upgrades)
  if (typeof req.query.token === 'string') {
    return req.query.token;
  }

  return null;
}

/**
 * Session validation middleware
 *
 * Validates Clerk session and attaches auth context to request.
 * Use as first middleware in auth-protected routes.
 *
 * @example
 * router.use(validateSession());
 * router.get('/profile', getProfile);
 */
export function validateSession() {
  return async (
    req: WorkspaceRequest,
    res: Response<AuthErrorResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const token = extractToken(req);

      if (!token) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_TOKEN_MISSING',
        });
        return;
      }

      const session = await validateClerkSession(token);

      if (!session) {
        res.status(401).json({
          error: 'Invalid or expired session',
          code: 'AUTH_SESSION_INVALID',
        });
        return;
      }

      // Attach auth context to request
      req.auth = {
        userId: session.userId,
        sessionId: session.sessionId,
        sessionClaims: session.claims,
        orgId: session.orgId,
        orgRole: session.orgRole,
      };

      // Update session activity
      sessionStore.touch(session.sessionId);

      next();
    } catch (error) {
      console.error('[Session] Validation error:', error);
      res.status(500).json({
        error: 'Session validation failed',
        code: 'AUTH_SESSION_ERROR',
      });
    }
  };
}

/**
 * Optional session middleware
 *
 * Like validateSession but doesn't fail if no token is provided.
 * Useful for public routes that can optionally have auth.
 */
export function optionalSession() {
  return async (
    req: WorkspaceRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const token = extractToken(req);

      if (!token) {
        // No token - that's OK for optional session
        next();
        return;
      }

      const session = await validateClerkSession(token);

      if (session) {
        req.auth = {
          userId: session.userId,
          sessionId: session.sessionId,
          sessionClaims: session.claims,
          orgId: session.orgId,
          orgRole: session.orgRole,
        };
        sessionStore.touch(session.sessionId);
      }

      next();
    } catch (error) {
      console.error('[Session] Optional validation error:', error);
      // Don't fail for optional session
      next();
    }
  };
}

// ============================================================================
// Active Workspace Tracking
// ============================================================================

/**
 * Set active workspace for current session
 */
export function setActiveWorkspace(
  req: WorkspaceRequest,
  workspaceId: string
): void {
  if (!req.auth) {
    throw new Error('Session required to set active workspace');
  }

  sessionStore.setActiveWorkspace(
    req.auth.sessionId,
    req.auth.userId,
    workspaceId
  );
}

/**
 * Get active workspace for current session
 */
export function getActiveWorkspace(req: WorkspaceRequest): string | undefined {
  if (!req.auth) {
    return undefined;
  }

  const session = sessionStore.getSession(req.auth.sessionId);
  return session?.workspaceId;
}

/**
 * Clear active workspace for current session
 */
export function clearActiveWorkspace(req: WorkspaceRequest): void {
  if (req.auth) {
    sessionStore.remove(req.auth.sessionId);
  }
}

// ============================================================================
// Member Removal Handling
// ============================================================================

/**
 * Handle member removal from workspace
 *
 * When a user is removed from a workspace, invalidate their sessions
 * for that workspace to prevent further access.
 *
 * @param userId - The user being removed
 * @param workspaceId - The workspace they're being removed from
 */
export function handleMemberRemoval(userId: string, workspaceId: string): void {
  const userSessions = sessionStore.getUserSessions(userId);

  for (const session of userSessions) {
    if (session.workspaceId === workspaceId) {
      sessionStore.remove(session.sessionId);
      console.log(
        `[Session] Invalidated session ${session.sessionId} for removed member ${userId}`
      );
    }
  }
}

/**
 * Middleware to check if user still has workspace access
 *
 * Use after workspace context is established to verify the user
 * hasn't been removed mid-session.
 */
export function checkWorkspaceAccess() {
  return async (
    req: WorkspaceRequest,
    res: Response<AuthErrorResponse>,
    next: NextFunction
  ): Promise<void> => {
    if (!req.auth || !req.workspace) {
      next();
      return;
    }

    try {
      const workspaceService = getWorkspaceService();
      const hasAccess = await workspaceService.userHasAccess(
        req.workspace.workspaceId,
        req.auth.userId
      );

      if (!hasAccess) {
        // User was removed from workspace mid-session
        sessionStore.remove(req.auth.sessionId);

        res.status(403).json({
          error: 'Your access to this workspace has been revoked',
          code: 'WORKSPACE_ACCESS_REVOKED',
        });
        return;
      }

      next();
    } catch (error) {
      console.error('[Session] Access check error:', error);
      res.status(500).json({
        error: 'Failed to verify workspace access',
        code: 'ACCESS_CHECK_ERROR',
      });
    }
  };
}

// ============================================================================
// Session Utilities
// ============================================================================

/**
 * Get session store (for testing/monitoring)
 */
export function getSessionStore(): SessionStore {
  return sessionStore;
}

/**
 * Invalidate all sessions for a user
 *
 * Use when user is deleted or security concerns arise.
 */
export function invalidateUserSessions(userId: string): void {
  sessionStore.removeUserSessions(userId);
}

/**
 * Create mock session token (for testing)
 */
export function createMockSessionToken(
  userId: string,
  sessionId: string
): string {
  return `mock_session_${userId}_${sessionId}`;
}

/**
 * Create base64 encoded session token (for testing)
 */
export function createEncodedSessionToken(session: {
  userId: string;
  sessionId: string;
  orgId?: string;
  orgRole?: string;
}): string {
  return Buffer.from(JSON.stringify(session)).toString('base64');
}

// ============================================================================
// Error Codes
// ============================================================================

export const SESSION_ERROR_CODES = {
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_SESSION_INVALID: 'AUTH_SESSION_INVALID',
  AUTH_SESSION_ERROR: 'AUTH_SESSION_ERROR',
  WORKSPACE_ACCESS_REVOKED: 'WORKSPACE_ACCESS_REVOKED',
  ACCESS_CHECK_ERROR: 'ACCESS_CHECK_ERROR',
} as const;

export type SessionErrorCode = typeof SESSION_ERROR_CODES[keyof typeof SESSION_ERROR_CODES];
