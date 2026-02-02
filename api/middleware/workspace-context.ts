import { clerkClient, getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import { createHash } from "node:crypto";
import type { workspaces } from "@prisma/client";
import { prisma, prismaRoot } from "../prisma";
import { runInWorkspaceTransaction } from "../context/workspace-context";
import { demoSlug, ensureDemoWorkspace, isDemoSlugConflict, isDemoWrite, isOwnedDemoWorkspace } from "../services/auth/demo-workspace";

const LEGACY_OWNER_ID = "openaeo-legacy-owner";
const LEGACY_WORKSPACE_SLUG = "openaeo-legacy";

const WORKSPACE_RESOLUTION_TTL_MS = 30_000;
const workspaceResolutionCache = new Map<string, { resolvedAt: number; workspaces: Awaited<ReturnType<typeof resolveWorkspaceForUser>> }>();

async function getOrCreateWorkspace(userId: string) {
  const cached = workspaceResolutionCache.get(userId);
  if (cached && Date.now() - cached.resolvedAt < WORKSPACE_RESOLUTION_TTL_MS) {
    return cached.workspaces;
  }

  const workspaces = await resolveWorkspaceForUser(userId);
  workspaceResolutionCache.set(userId, { resolvedAt: Date.now(), workspaces });
  return workspaces;
}

async function resolveWorkspaceForUser(userId: string) {
  const clerkUser = await clerkClient.users.getUser(userId);
  const primaryEmail = clerkUser.emailAddresses.find(
    (email) => email.id === clerkUser.primaryEmailAddressId,
  )?.emailAddress;

  if (!primaryEmail) throw new Error("Authenticated Clerk user has no primary email address");

  const displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
  await prisma.users.upsert({
    where: { id: userId },
    create: { id: userId, email: primaryEmail, display_name: displayName, avatar_url: clerkUser.imageUrl },
    update: { email: primaryEmail, display_name: displayName, avatar_url: clerkUser.imageUrl, updated_at: new Date() },
  });

  const findMemberships = () => prisma.workspace_members.findMany({
    where: { user_id: userId, workspaces: { deleted_at: null } },
    include: { workspaces: true },
  });

  const memberships = await findMemberships();
  const legacyWorkspace = await prisma.workspaces.findFirst({
    where: { slug: LEGACY_WORKSPACE_SLUG, owner_id: LEGACY_OWNER_ID, deleted_at: null },
  });

  if (legacyWorkspace) {
    const claimed = await prisma.workspaces.updateMany({
      where: { id: legacyWorkspace.id, owner_id: LEGACY_OWNER_ID },
      data: { owner_id: userId, updated_at: new Date() },
    });

    if (claimed.count) {
      await prisma.workspace_members.updateMany({
        where: { workspace_id: legacyWorkspace.id, user_id: LEGACY_OWNER_ID },
        data: { user_id: userId },
      });
      const claimedWorkspace = await prisma.workspaces.findUniqueOrThrow({ where: { id: legacyWorkspace.id } });
      return withDemoWorkspace(
        [claimedWorkspace, ...memberships.map(({ workspaces }) => workspaces).filter(({ id }) => id !== claimedWorkspace.id)],
        userId,
      );
    }
  }

  if (memberships.length) return withDemoWorkspace(memberships.map(({ workspaces }) => workspaces), userId);

  const concurrentMemberships = await findMemberships();
  if (concurrentMemberships.length) return withDemoWorkspace(concurrentMemberships.map(({ workspaces }) => workspaces), userId);

  const slug = `ws-${createHash("sha256").update(userId).digest("hex").slice(0, 20)}`;
  const workspace = await prisma.workspaces.upsert({
    where: { slug },
    create: { name: clerkUser.firstName || "My organization", slug, owner_id: userId, plan: "free" },
    update: {},
  });

  await prisma.workspace_members.upsert({
    where: { workspace_id_user_id: { workspace_id: workspace.id, user_id: userId } },
    create: { workspace_id: workspace.id, user_id: userId, role: "owner" },
    update: {},
  });

  return withDemoWorkspace([workspace], userId);
}

async function withDemoWorkspace(
  workspaces: workspaces[],
  userId: string,
) {
  const slug = demoSlug(userId);
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const demo = await prismaRoot.$transaction((transaction) => ensureDemoWorkspace(transaction, userId));
      return [...workspaces.filter(({ id }) => id !== demo.id), demo];
    } catch (error) {
      if (!isDemoSlugConflict(error)) throw error;
      const existing = await prismaRoot.workspaces.findUnique({ where: { slug } });
      if (existing && isOwnedDemoWorkspace(existing, userId)) {
        await prismaRoot.workspace_members.upsert({
          where: { workspace_id_user_id: { workspace_id: existing.id, user_id: userId } },
          create: { workspace_id: existing.id, user_id: userId, role: "owner" },
          update: {},
        });
        return [...workspaces.filter(({ id }) => id !== existing.id), existing];
      }
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    }
  }
  throw new Error("Demo workspace provisioning did not complete");
}

export async function workspaceContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.path === "/test" || req.path.startsWith("/webhooks/cdn") || req.path.startsWith("/export/public/")) {
    next();
    return;
  }

  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
    return;
  }

  try {
    const resolveStartedAt = Date.now();
    const workspaces = await getOrCreateWorkspace(userId);
    const resolveMs = Date.now() - resolveStartedAt;
    if (resolveMs > 40) {
      console.info(`[perf] workspace resolve ${resolveMs}ms ${req.method} ${req.originalUrl}`);
    }

    const requestedWorkspaceId = req.header("x-workspace-id");
    const workspace = requestedWorkspaceId
      ? workspaces.find((candidate) => candidate.id === requestedWorkspaceId)
      : workspaces[0];

    if (!workspace) {
      res.status(403).json({ error: "Workspace access denied", code: "WORKSPACE_ACCESS_DENIED" });
      return;
    }

    if (workspace.is_demo && isDemoWrite(req.method)) {
      res.status(403).json({
        error: "Demo workspace is read-only",
        code: "DEMO_WORKSPACE_READ_ONLY",
      });
      return;
    }

    res.setHeader("X-Workspace-Id", workspace.id);
    await runInWorkspaceTransaction(prismaRoot, workspace.id, () => new Promise<void>((resolve, reject) => {
      res.once("finish", resolve);
      res.once("close", resolve);
      try {
        next();
      } catch (error) {
        reject(error);
      }
    }));
  } catch (error) {
    console.error("[Workspace] Context resolution failed:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Workspace context unavailable", code: "WORKSPACE_CONTEXT_ERROR" });
    }
  }
}
