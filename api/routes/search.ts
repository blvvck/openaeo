import { Router } from "express";
import { z } from "zod";
import type { GlobalSearchResponse, GlobalSearchResult } from "@shared/types/search";
import { currentWorkspaceId } from "../context/workspace-context";
import { prisma } from "../prisma";

const router = Router();
const searchQuery = z.string().trim().max(100).optional();

async function readSearchPart<T>(operation: Promise<T>, name: string): Promise<T | undefined> {
  try {
    return await operation;
  } catch (error) {
    console.error(`[Search API] Failed to read ${name}`, error);
    return undefined;
  }
}

router.get("/", async (req, res) => {
  try {
    const parsed = searchQuery.safeParse(req.query.q);
    if (!parsed.success) {
      res.json({ results: [] } satisfies GlobalSearchResponse);
      return;
    }

    const workspaceId = currentWorkspaceId();
    if (!workspaceId) {
      res.status(400).json({ error: "No active workspace for this request" });
      return;
    }

    const query = parsed.data ?? "";
    const [prompts, topics, competitors, sources] = await Promise.all([
      readSearchPart(prisma.prompts.findMany({
        where: {
          workspace_id: workspaceId,
          archived_at: null,
          ...(query ? { text: { contains: query, mode: "insensitive" as const } } : {}),
        },
        select: { id: true, text: true },
        take: query ? 10 : 5,
        orderBy: { created_at: "desc" },
      }), "prompts"),
      readSearchPart(prisma.topics.findMany({
        where: {
          workspace_id: workspaceId,
          ...(query ? { name: { contains: query, mode: "insensitive" as const } } : {}),
        },
        select: { id: true, name: true },
        take: query ? 10 : 5,
        orderBy: { name: "asc" },
      }), "topics"),
      readSearchPart(prisma.competitors.findMany({
        where: {
          workspace_id: workspaceId,
          ...(query ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { domain: { contains: query, mode: "insensitive" as const } },
            ],
          } : {}),
        },
        select: { id: true, name: true, domain: true },
        take: query ? 10 : 5,
        orderBy: { name: "asc" },
      }), "competitors"),
      readSearchPart(prisma.sources.findMany({
        where: {
          workspace_id: workspaceId,
          ...(query ? {
            OR: [
              { domain: { contains: query, mode: "insensitive" as const } },
              { title: { contains: query, mode: "insensitive" as const } },
              { url: { contains: query, mode: "insensitive" as const } },
            ],
          } : {}),
        },
        select: { id: true, domain: true, title: true, url: true },
        take: query ? 10 : 5,
        orderBy: { citation_count: "desc" },
      }), "sources"),
    ]);

    const results: GlobalSearchResult[] = [
      ...(prompts ?? []).map((prompt) => ({
        id: `prompt-${prompt.id}`,
        kind: "prompt" as const,
        title: prompt.text,
        description: "Tracked prompt",
        href: `/app/prompts?search=${encodeURIComponent(prompt.text)}`,
      })),
      ...(topics ?? []).map((topic) => ({
        id: `topic-${topic.id}`,
        kind: "topic" as const,
        title: topic.name,
        description: "Prompt topic",
        href: `/app/prompts?topic=${topic.id}`,
      })),
      ...(competitors ?? []).map((competitor) => ({
        id: `competitor-${competitor.id}`,
        kind: "competitor" as const,
        title: competitor.name,
        description: competitor.domain || "Competitor",
        href: `/app/competitors?competitorId=${competitor.id}`,
      })),
      ...(sources ?? []).map((source) => ({
        id: `source-${source.id}`,
        kind: "source" as const,
        title: source.title || source.domain,
        description: source.domain,
        href: `/app/citations?search=${encodeURIComponent(source.domain)}`,
      })),
    ];

    res.json({ results } satisfies GlobalSearchResponse);
  } catch (error) {
    console.error("[Search API] Failed to search workspace", error);
    res.status(500).json({ error: "Could not search this workspace" });
  }
});

export default router;
