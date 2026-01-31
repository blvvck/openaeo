import type {
  Analytics,
  Competitor,
  CompetitorVisibilityMetric,
  InsertAnalytics,
  InsertCompetitor,
  InsertPrompt,
  InsertResponse,
  InsertScrapeAttempt,
  InsertSource,
  InsertTopic,
  Prompt,
  TopicPromptContext,
  Response as PromptResponse,
  PromptResponseContext,
  ScrapeAttempt,
  Source,
  CitationSourceMetric,
  Topic,
  TopicVisibilityMetric,
} from "@shared/schema";
import { currentWorkspaceId } from "../context/workspace-context";
import { prisma } from "../prisma";
import type { WorkspaceRepository } from "./contracts";

type DbRow = Record<string, unknown>;

function workspaceId(): string {
  const id = currentWorkspaceId();
  if (!id) throw new Error("Workspace context is required for data access");
  return id;
}

function toPrismaData(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
    item,
  ]));
}

function fromPrismaRow<T>(value: DbRow): T {
  return Object.fromEntries(Object.entries(value)
    .map(([key, item]) => [key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()), item])) as T;
}

function toTopicPromptContext(value: DbRow & { topics: DbRow | null }): TopicPromptContext {
  const { topics: topic, ...prompt } = value;
  return { ...fromPrismaRow<Prompt>(prompt), topic: topic ? fromPrismaRow<Topic>(topic) : null };
}

function toPromptResponseContext(value: DbRow & { prompts: (DbRow & { topics: DbRow | null }) | null }): PromptResponseContext {
  const { prompts: prompt, ...response } = value;
  return {
    ...fromPrismaRow<PromptResponse>(response),
    prompt: prompt ? toTopicPromptContext(prompt) : null,
  } as PromptResponseContext;
}

export class PrismaRepository implements WorkspaceRepository {
  async getTopics(): Promise<Topic[]> {
    return (await prisma.topics.findMany({ where: { workspace_id: workspaceId() } })).map((row) => fromPrismaRow<Topic>(row));
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    const row = await prisma.topics.create({ data: { ...toPrismaData(topic), workspace_id: workspaceId() } as any });
    return fromPrismaRow<Topic>(row);
  }

  async getTopicById(id: number): Promise<Topic | undefined> {
    const row = await prisma.topics.findFirst({ where: { id, workspace_id: workspaceId() } });
    return row ? fromPrismaRow<Topic>(row) : undefined;
  }

  async getPrompts(): Promise<Prompt[]> {
    return (await prisma.prompts.findMany({ where: { workspace_id: workspaceId() } })).map((row) => fromPrismaRow<Prompt>(row));
  }

  async createPrompt(prompt: InsertPrompt): Promise<Prompt> {
    const row = await prisma.prompts.create({ data: { ...toPrismaData(prompt), workspace_id: workspaceId() } as any });
    return fromPrismaRow<Prompt>(row);
  }

  async getPromptById(id: number): Promise<Prompt | undefined> {
    const row = await prisma.prompts.findFirst({ where: { id, workspace_id: workspaceId() } });
    return row ? fromPrismaRow<Prompt>(row) : undefined;
  }

  async getPromptsWithTopics(): Promise<TopicPromptContext[]> {
    const rows = await prisma.prompts.findMany({ where: { workspace_id: workspaceId() }, include: { topics: true } });
    return rows.map((row) => toTopicPromptContext(row as unknown as DbRow & { topics: DbRow | null }));
  }

  async getPromptsByTopic(topicId: number): Promise<Prompt[]> {
    const rows = await prisma.prompts.findMany({ where: { topic_id: topicId, workspace_id: workspaceId() } });
    return rows.map((row) => fromPrismaRow<Prompt>(row));
  }

  async updatePrompt(id: number, update: Partial<InsertPrompt>): Promise<Prompt | undefined> {
    const result = await prisma.prompts.updateMany({
      where: { id, workspace_id: workspaceId() },
      data: toPrismaData(update) as any,
    });
    if (!result.count) return undefined;
    return this.getPromptById(id);
  }

  async deletePrompt(id: number): Promise<boolean> {
    const result = await prisma.prompts.deleteMany({ where: { id, workspace_id: workspaceId() } });
    return result.count > 0;
  }

  async getResponses(): Promise<PromptResponse[]> {
    return (await prisma.responses.findMany({ where: { workspace_id: workspaceId() } })).map((row) => fromPrismaRow<PromptResponse>(row));
  }

  async createResponse(response: InsertResponse): Promise<PromptResponse> {
    const row = await prisma.responses.create({ data: { ...toPrismaData(response), workspace_id: workspaceId() } as any });
    return fromPrismaRow<PromptResponse>(row);
  }

  async getResponseById(id: number): Promise<PromptResponse | undefined> {
    const row = await prisma.responses.findFirst({ where: { id, workspace_id: workspaceId() } });
    return row ? fromPrismaRow<PromptResponse>(row) : undefined;
  }

  async getResponsesWithPrompts(): Promise<PromptResponseContext[]> {
    const rows = await prisma.responses.findMany({
      where: { workspace_id: workspaceId() },
      include: { prompts: { include: { topics: true } } },
    });
    return rows.map((row) => toPromptResponseContext(row as unknown as DbRow & { prompts: (DbRow & { topics: DbRow | null }) | null }));
  }

  async getRecentResponses(limit = 10): Promise<PromptResponseContext[]> {
    const rows = await prisma.responses.findMany({
      where: { workspace_id: workspaceId() },
      include: { prompts: { include: { topics: true } } },
      orderBy: { created_at: "desc" },
      ...(limit > 1000 ? {} : { take: limit }),
    });
    return rows.map((row) => toPromptResponseContext(row as unknown as DbRow & { prompts: (DbRow & { topics: DbRow | null }) | null }));
  }

  async getResponsesInTimeRange(startDate: Date, endDate: Date): Promise<PromptResponseContext[]> {
    const rows = await prisma.responses.findMany({
      where: { workspace_id: workspaceId(), created_at: { gte: startDate, lte: endDate } },
      include: { prompts: { include: { topics: true } } },
      orderBy: { created_at: "desc" },
    });
    return rows.map((row) => toPromptResponseContext(row as unknown as DbRow & { prompts: (DbRow & { topics: DbRow | null }) | null }));
  }

  async getTrendCounts(startDate: Date, endDate: Date, interval: "day" | "week" | "month" = "day") {
    const format = interval === "month" ? "YYYY-MM" : "YYYY-MM-DD";
    const trunc = interval === "week" ? "week" : null;
    const rows = trunc
      ? await prisma.$queryRaw<Array<{ date: string; total: bigint; mentions: bigint }>>`
          SELECT to_char(date_trunc('week', created_at), ${format}) AS date,
                 count(*)::bigint AS total,
                 count(*) FILTER (WHERE brand_mentioned = true)::bigint AS mentions
          FROM responses
          WHERE workspace_id = ${workspaceId()}::uuid AND created_at >= ${startDate} AND created_at <= ${endDate}
          GROUP BY 1 ORDER BY 1`
      : await prisma.$queryRaw<Array<{ date: string; total: bigint; mentions: bigint }>>`
          SELECT to_char(created_at, ${format}) AS date,
                 count(*)::bigint AS total,
                 count(*) FILTER (WHERE brand_mentioned = true)::bigint AS mentions
          FROM responses
          WHERE workspace_id = ${workspaceId()}::uuid AND created_at >= ${startDate} AND created_at <= ${endDate}
          GROUP BY 1 ORDER BY 1`;
    return rows.map((row) => ({ date: row.date, total: Number(row.total), mentions: Number(row.mentions) }));
  }

  async getTrendCountsByPlatform(startDate: Date, endDate: Date, interval: "day" | "week" | "month" = "day") {
    const format = interval === "month" ? "YYYY-MM" : "YYYY-MM-DD";
    const dateExpr = interval === "week" ? `to_char(date_trunc('week', created_at), '${format}')` : `to_char(created_at, '${format}')`;
    const rows = await prisma.$queryRawUnsafe<Array<{ date: string; platform: string | null; total: bigint; mentions: bigint }>>(
      `SELECT ${dateExpr} AS date, platform, count(*)::bigint AS total,
              count(*) FILTER (WHERE brand_mentioned = true)::bigint AS mentions
       FROM responses
       WHERE workspace_id = $1::uuid AND created_at >= $2 AND created_at <= $3
       GROUP BY 1, platform ORDER BY 1, platform`,
      workspaceId(), startDate, endDate,
    );
    return rows.map((row) => ({ date: row.date, platform: row.platform || "unknown", total: Number(row.total), mentions: Number(row.mentions) }));
  }

  async getCompetitors(): Promise<Competitor[]> {
    return (await prisma.competitors.findMany({ where: { workspace_id: workspaceId() } })).map((row) => fromPrismaRow<Competitor>(row));
  }

  async createCompetitor(competitor: InsertCompetitor): Promise<Competitor> {
    const row = await prisma.competitors.create({ data: { ...toPrismaData(competitor), workspace_id: workspaceId() } as any });
    return fromPrismaRow<Competitor>(row);
  }

  async getCompetitorByName(name: string): Promise<Competitor | undefined> {
    const row = await prisma.competitors.findFirst({ where: { name, workspace_id: workspaceId() } });
    return row ? fromPrismaRow<Competitor>(row) : undefined;
  }

  async updateCompetitorMentionCount(name: string, increment: number): Promise<void> {
    await prisma.competitors.updateMany({
      where: { name, workspace_id: workspaceId() },
      data: { mention_count: { increment } },
    });
  }

  async deleteCompetitor(id: number): Promise<boolean> {
    const result = await prisma.competitors.deleteMany({ where: { id, workspace_id: workspaceId() } });
    return result.count > 0;
  }

  async getSources(): Promise<Source[]> {
    return (await prisma.sources.findMany({ where: { workspace_id: workspaceId() } })).map((row) => fromPrismaRow<Source>(row));
  }

  async createSource(source: InsertSource): Promise<Source> {
    const row = await prisma.sources.create({ data: { ...toPrismaData(source), workspace_id: workspaceId() } as any });
    return fromPrismaRow<Source>(row);
  }

  async getSourceByDomain(domain: string): Promise<Source | undefined> {
    const row = await prisma.sources.findFirst({ where: { domain, workspace_id: workspaceId() } });
    return row ? fromPrismaRow<Source>(row) : undefined;
  }

  async updateSourceCitationCount(domain: string, increment: number): Promise<void> {
    await prisma.sources.updateMany({
      where: { domain, workspace_id: workspaceId() },
      data: { citation_count: { increment } },
    });
  }

  async getLatestAnalytics(): Promise<Analytics | undefined> {
    const row = await prisma.analytics.findFirst({ where: { workspace_id: workspaceId() }, orderBy: { date: "desc" } });
    return row ? fromPrismaRow<Analytics>(row) : undefined;
  }

  async createAnalytics(value: InsertAnalytics): Promise<Analytics> {
    const row = await prisma.analytics.create({ data: { ...toPrismaData(value), workspace_id: workspaceId() } as any });
    return fromPrismaRow<Analytics>(row);
  }

  async getTopicAnalysis(): Promise<TopicVisibilityMetric[]> {
    const rows = await prisma.$queryRaw<Array<{ topicId: number; topicLabel: string; promptCount: bigint; brandMentionedResponseCount: bigint }>>`
      SELECT t.id AS "topicId", t.name AS "topicLabel", count(DISTINCT p.id)::bigint AS "promptCount",
             count(r.id) FILTER (WHERE r.brand_mentioned = true)::bigint AS "brandMentionedResponseCount"
      FROM topics t LEFT JOIN prompts p ON p.topic_id = t.id AND p.workspace_id = t.workspace_id
      LEFT JOIN responses r ON r.prompt_id = p.id AND r.workspace_id = p.workspace_id
      WHERE t.workspace_id = ${workspaceId()}::uuid
      GROUP BY t.id, t.name`;
    return rows.map((row) => ({
      topicId: row.topicId,
      topicLabel: row.topicLabel,
      promptCount: Number(row.promptCount),
      brandMentionedResponseCount: Number(row.brandMentionedResponseCount),
      brandResponseMentionRate: Number(row.promptCount) ? Number(row.brandMentionedResponseCount) / Number(row.promptCount) * 100 : 0,
    }));
  }

  async getCompetitorAnalysis(): Promise<CompetitorVisibilityMetric[]> {
    const [competitors, totalResponses] = await Promise.all([this.getCompetitors(), prisma.responses.count({ where: { workspace_id: workspaceId() } })]);
    return competitors.map((competitor) => ({
      competitorId: competitor.id,
      competitorName: competitor.name,
      category: competitor.category,
      observedMentionCount: competitor.mentionCount || 0,
      responseSharePercent: totalResponses ? (competitor.mentionCount || 0) / totalResponses * 100 : 0,
      periodChangePercent: 0,
    }));
  }

  async getSourceAnalysis(): Promise<CitationSourceMetric[]> {
    return (await this.getSources()).map((source) => ({
      sourceId: source.id,
      sourceDomain: source.domain,
      observedCitationCount: source.citationCount || 0,
      citedUrls: [source.url],
    }));
  }

  async getLatestResponses(): Promise<PromptResponseContext[]> {
    return this.getRecentResponses(1000);
  }

  async getLatestPrompts(): Promise<Prompt[]> {
    return (await prisma.prompts.findMany({ where: { workspace_id: workspaceId() }, orderBy: { created_at: "desc" } })).map((row) => fromPrismaRow<Prompt>(row));
  }

  async clearAllPrompts(): Promise<void> {
    const workspace_id = workspaceId();
    await prisma.$transaction([
      prisma.responses.deleteMany({ where: { workspace_id } }),
      prisma.prompts.deleteMany({ where: { workspace_id } }),
    ]);
  }

  async clearAllResponses(): Promise<void> {
    await prisma.responses.deleteMany({ where: { workspace_id: workspaceId() } });
  }

  async clearAllCompetitors(): Promise<void> {
    await prisma.competitors.deleteMany({ where: { workspace_id: workspaceId() } });
  }

  async logScrapeAttempt(attempt: InsertScrapeAttempt): Promise<ScrapeAttempt> {
    const row = await prisma.scrape_attempts.create({ data: { ...toPrismaData(attempt), workspace_id: workspaceId() } as any });
    return fromPrismaRow<ScrapeAttempt>(row);
  }
}
