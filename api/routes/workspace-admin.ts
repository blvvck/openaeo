import { Router, type NextFunction, type Request, type Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { z } from "zod";
import { requireWorkspace, type WorkspaceRequest } from "../middleware/tenant-isolation";
import { requireRole } from "../middleware/rbac";
import { WorkspaceAdminService } from "../services/auth/workspace-admin";
import type { Provider, QuotaView } from "@shared/types/workspace-admin";

const router = Router();
const service = new WorkspaceAdminService();
const providerNames = ["openai", "anthropic", "perplexity", "gemini", "xai", "deepseek"] as const;
const inviteRole = z.enum(["admin", "member", "viewer"]);
const quotaSchema = z.object({
  maxPromptsPerScan: z.number().int().min(1).max(1000).optional(),
  maxScansPerHour: z.number().int().min(1).max(10000).optional(),
}).strict();

function authContext(req: Request, _res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const workspaceReq = req as WorkspaceRequest;
  if (auth.userId) {
    workspaceReq.auth = {
      userId: auth.userId,
      sessionId: auth.sessionId ?? "",
      sessionClaims: auth.sessionClaims as Record<string, unknown> | undefined,
    };
  }
  next();
}

function withFailure(handler: (req: WorkspaceRequest, res: Response) => Promise<unknown>) {
  return async (request: Request, response: Response) => {
    try {
      const result = await handler(request as WorkspaceRequest, response);
      if (!response.headersSent && result !== undefined) response.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      const status = /not found/i.test(message) ? 404 : /already|owner|match|invalid|expired|must be|unsupported|set WORKSPACE|WORKSPACE_KEY_ENCRYPTION_KEY/i.test(message) ? 400 : 500;
      response.status(status).json({ error: message });
    }
  };
}

async function getMembers() { return service.getMembers(); }

async function createInvitation(req: WorkspaceRequest, res: Response) {
  const parsed = z.object({ email: z.string().email().max(255), role: z.string() }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid invitation request", details: parsed.error.flatten() });
  if (parsed.data.role === "owner") return res.status(400).json({ error: "Owner invitations are not allowed" });
  const role = inviteRole.safeParse(parsed.data.role);
  if (!role.success) return res.status(400).json({ error: "Role must be admin, member, or viewer" });
  const invite = await service.createInvitation(parsed.data.email, role.data, req.workspace!.userId);
  res.status(201);
  return invite;
}

async function resendInvitation(req: WorkspaceRequest) { return service.resendInvitation(req.params.inviteId); }

async function deleteInvitation(req: WorkspaceRequest, res: Response) {
  const deleted = await service.deleteInvitation(req.params.inviteId);
  if (!deleted) return res.status(404).json({ error: "Invitation not found" });
  return { success: true as const };
}

async function updateMember(req: WorkspaceRequest, res: Response) {
  const parsed = z.object({ role: z.string() }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid member role" });
  if (parsed.data.role === "owner") return res.status(400).json({ error: "Owner role cannot be assigned here" });
  const role = inviteRole.safeParse(parsed.data.role);
  if (!role.success) return res.status(400).json({ error: "Role must be admin, member, or viewer" });
  return service.updateMember(req.params.memberId, role.data);
}

async function updateMemberStatus(req: WorkspaceRequest, res: Response) {
  const parsed = z.object({ status: z.enum(["active", "deactivated"]) }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Status must be active or deactivated" });
  return service.updateMemberStatus(req.params.memberId, parsed.data.status);
}

async function deleteMember(req: WorkspaceRequest, res: Response) {
  const deleted = await service.deleteMember(req.params.memberId);
  if (!deleted) return res.status(404).json({ error: "Workspace member not found" });
  return { success: true as const };
}

async function getIntegrations() { return service.getIntegrations(); }

async function updateIntegrations(req: WorkspaceRequest, res: Response) {
  const parsed = z.object({
    keys: z.record(z.enum(providerNames), z.string().nullable()).optional(),
    quota: quotaSchema.optional(),
  }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid integrations settings", details: parsed.error.flatten() });
  const quota: Partial<QuotaView> | undefined = parsed.data.quota;
  return service.updateIntegrations({ keys: parsed.data.keys as Partial<Record<Provider, string | null>> | undefined, quota });
}

async function acceptInvitation(req: Request, res: Response) {
  const auth = getAuth(req);
  if (!auth.userId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
  try {
    const user = await clerkClient.users.getUser(auth.userId);
    const email = user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress;
    if (!email) return res.status(403).json({ error: "Authenticated account email is unavailable" });
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
    const workspaceId = await service.acceptInvitation(req.params.token, auth.userId, email, name);
    return res.json({ workspaceId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invitation could not be accepted";
    return res.status(400).json({ error: message });
  }
}

router.use("/workspaces/:workspaceId", authContext, requireWorkspace(), requireRole("admin"));
router.get("/workspaces/:workspaceId/members", withFailure(getMembers));
router.post("/workspaces/:workspaceId/members/invitations", withFailure(createInvitation));
router.post("/workspaces/:workspaceId/members/invitations/:inviteId/resend", withFailure(resendInvitation));
router.delete("/workspaces/:workspaceId/members/invitations/:inviteId", withFailure(deleteInvitation));
router.patch("/workspaces/:workspaceId/members/:memberId/role", withFailure(updateMember));
router.patch("/workspaces/:workspaceId/members/:memberId/status", withFailure(updateMemberStatus));
router.delete("/workspaces/:workspaceId/members/:memberId", withFailure(deleteMember));
router.get("/workspaces/:workspaceId/integrations", withFailure(getIntegrations));
router.patch("/workspaces/:workspaceId/integrations", withFailure(updateIntegrations));
router.post("/invitations/:token/accept", acceptInvitation);

export default router;
