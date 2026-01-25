/**
 * Tenant Isolation Middleware
 *
 * Ensures all API requests are scoped to the current workspace.
 * Extracts workspace context from request and attaches to req.workspace.
 *
 * @module api/middleware/tenant-isolation
 */

import { Request, Response, NextFunction } from 'express';
import { getWorkspaceService, type WorkspaceContext } from '../services/auth/workspace';
import { type WorkspaceRole } from '@shared/schema';

// ============================================================================
// Types
// ============================================================================

/**
 * Auth context from session middleware
 */
export interface AuthContext {
  userId: string;
  sessionId: string;
  sessionClaims?: Record<string, unknown>;
  orgId?: string;
  orgRole?: string;
}

/**
 * Extended Request with workspace context
 */
export interface WorkspaceRequest extends Request {
  workspace?: WorkspaceContext;
  auth?: AuthContext;
}

/**
 * Response shape for errors
 */
interface ErrorResponse {
  error: string;
  code: string;
}

// ============================================================================
// Middleware Functions
// ============================================================================

/**
 * Extract workspace ID from request
 *
 * Priority order:
 * 1. URL parameter (:workspaceId)
 * 2. Query parameter (?workspaceId=)
 * 3. Header (X-Workspace-Id)
 */
function extractWorkspaceId(req: Request): string | null {
  // URL parameter (e.g., /api/workspaces/:workspaceId/...)
  if (req.params.workspaceId) {
    return req.params.workspaceId;
  }

  // Query parameter
  if (typeof req.query.workspaceId === 'string') {
    return req.query.workspaceId;
  }

  // Header
  const headerWorkspaceId = req.headers['x-workspace-id'];
  if (typeof headerWorkspaceId === 'string') {
    return headerWorkspaceId;
  }

  return null;
}

/**
 * Tenant isolation middleware
 *
 * Validates that:
 * 1. User is authenticated
 * 2. Workspace ID is provided
 * 3. User has access to the workspace
 *
 * Attaches workspace context to request for downstream handlers.
 */
export function requireWorkspace() {
  return async (
    req: WorkspaceRequest,
    res: Response<ErrorResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check if user is authenticated
      if (!req.auth?.userId) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const userId = req.auth.userId;
      const workspaceId = extractWorkspaceId(req);

      if (!workspaceId) {
        res.status(400).json({
          error: 'Workspace ID is required',
          code: 'WORKSPACE_REQUIRED',
        });
        return;
      }

      // Validate workspace exists and user has access
      const workspaceService = getWorkspaceService();
      const workspace = await workspaceService.getById(workspaceId);

      if (!workspace) {
        res.status(404).json({
          error: 'Workspace not found',
          code: 'WORKSPACE_NOT_FOUND',
        });
        return;
      }

      const role = await workspaceService.getUserRole(workspaceId, userId);

      if (!role) {
        res.status(403).json({
          error: 'Access denied to this workspace',
          code: 'WORKSPACE_ACCESS_DENIED',
        });
        return;
      }

      // Attach workspace context to request
      req.workspace = {
        workspaceId,
        userId,
        role: role as WorkspaceRole,
      };

      next();
    } catch (error) {
      console.error('[TenantIsolation] Error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

/**
 * Optional workspace middleware
 *
 * Like requireWorkspace but doesn't fail if no workspace is provided.
 * Useful for routes that can work with or without workspace context.
 */
export function optionalWorkspace() {
  return async (
    req: WorkspaceRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // No user = no workspace context possible
      if (!req.auth?.userId) {
        next();
        return;
      }

      const userId = req.auth.userId;
      const workspaceId = extractWorkspaceId(req);

      // No workspace provided - that's okay
      if (!workspaceId) {
        next();
        return;
      }

      const workspaceService = getWorkspaceService();
      const workspace = await workspaceService.getById(workspaceId);

      // Workspace doesn't exist - ignore
      if (!workspace) {
        next();
        return;
      }

      const role = await workspaceService.getUserRole(workspaceId, userId);

      // User doesn't have access - ignore (don't fail)
      if (!role) {
        next();
        return;
      }

      // Attach workspace context
      req.workspace = {
        workspaceId,
        userId,
        role: role as WorkspaceRole,
      };

      next();
    } catch (error) {
      console.error('[TenantIsolation] Error in optional middleware:', error);
      // Don't fail on optional middleware errors
      next();
    }
  };
}

export function scopeToWorkspace(workspaceId: string) {
  return <T extends { workspaceId: any }>(table: T) => {
    return { eq: table.workspaceId, value: workspaceId };
  };
}

/**
 * Assert workspace context exists
 *
 * Use in route handlers after requireWorkspace middleware.
 * Provides type narrowing for req.workspace.
 */
export function assertWorkspace(
  req: WorkspaceRequest
): asserts req is WorkspaceRequest & { workspace: WorkspaceContext } {
  if (!req.workspace) {
    throw new Error('Workspace context not found. Did you forget requireWorkspace middleware?');
  }
}

// ============================================================================
// Error Codes
// ============================================================================

export const TENANT_ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  WORKSPACE_REQUIRED: 'WORKSPACE_REQUIRED',
  WORKSPACE_NOT_FOUND: 'WORKSPACE_NOT_FOUND',
  WORKSPACE_ACCESS_DENIED: 'WORKSPACE_ACCESS_DENIED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type TenantErrorCode = typeof TENANT_ERROR_CODES[keyof typeof TENANT_ERROR_CODES];
