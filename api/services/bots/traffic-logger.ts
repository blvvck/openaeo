/**
 * Bot Traffic Logger Service
 *
 * Logs and analyzes AI bot visits received via webhook from CDN.
 * Classifies bots by user agent and provides aggregated statistics.
 */

import { prisma } from "../../prisma";
import { fromPrismaRow, requireWorkspaceId } from "../../prisma-mapping";
import type { BotVisit } from "@shared/schema";

// Known AI and search bots
export const BOT_PATTERNS: Array<{ name: string; pattern: RegExp; category: 'ai' | 'search' | 'social' | 'other' }> = [
  // AI Bots
  { name: 'GPTBot', pattern: /GPTBot/i, category: 'ai' },
  { name: 'ClaudeBot', pattern: /ClaudeBot|anthropic-ai/i, category: 'ai' },
  { name: 'PerplexityBot', pattern: /PerplexityBot/i, category: 'ai' },
  { name: 'Google-Extended', pattern: /Google-Extended/i, category: 'ai' },
  { name: 'ChatGPT-User', pattern: /ChatGPT-User/i, category: 'ai' },
  { name: 'Cohere-ai', pattern: /cohere-ai/i, category: 'ai' },
  { name: 'CCBot', pattern: /CCBot/i, category: 'ai' }, // Common Crawl (used by AI)

  // Search Engine Bots
  { name: 'Googlebot', pattern: /Googlebot/i, category: 'search' },
  { name: 'Bingbot', pattern: /bingbot/i, category: 'search' },
  { name: 'DuckDuckBot', pattern: /DuckDuckBot/i, category: 'search' },
  { name: 'Yandex', pattern: /YandexBot/i, category: 'search' },
  { name: 'Baidu', pattern: /Baiduspider/i, category: 'search' },

  // Social Media Bots
  { name: 'Twitterbot', pattern: /Twitterbot/i, category: 'social' },
  { name: 'facebookexternalhit', pattern: /facebookexternalhit/i, category: 'social' },
  { name: 'LinkedInBot', pattern: /LinkedInBot/i, category: 'social' },
  { name: 'Slackbot', pattern: /Slackbot/i, category: 'social' },
];

export interface BotClassification {
  botType: string;
  category: 'ai' | 'search' | 'social' | 'other' | 'unknown';
  isAIBot: boolean;
}

export interface BotVisitMetadata {
  statusCode?: number;
  responseTimeMs?: number;
  contentType?: string;
  contentLengthBytes?: number;
}

export interface BotStats {
  botType: string;
  category: string;
  visitCount: number;
  uniqueUrls: number;
  lastVisit: Date | null;
}

export interface TrafficSummary {
  totalVisits: number;
  aiVisits: number;
  searchVisits: number;
  socialVisits: number;
  otherVisits: number;
  byBot: BotStats[];
  period: {
    from: Date;
    to: Date;
    hasHistoricalData: boolean;
    hasDataInRange: boolean;
  };
}

export interface BotTimelineDay {
  date: string;
  visits: Record<string, number>;
}

/**
 * Classify a bot by its user agent string
 */
export function classifyBot(userAgent: string): BotClassification {
  for (let i = 0; i < BOT_PATTERNS.length; i++) {
    const bot = BOT_PATTERNS[i];
    if (bot.pattern.test(userAgent)) {
      return {
        botType: bot.name,
        category: bot.category,
        isAIBot: bot.category === 'ai',
      };
    }
  }

  // Check for generic bot patterns
  if (/bot|crawler|spider|scraper/i.test(userAgent)) {
    return {
      botType: 'Unknown Bot',
      category: 'other',
      isAIBot: false,
    };
  }

  return {
    botType: 'Unknown',
    category: 'unknown',
    isAIBot: false,
  };
}

/**
 * Log a bot visit
 */
export async function logBotVisit(
  userAgent: string,
  url: string,
  visitedAt: Date,
  metadata?: BotVisitMetadata
): Promise<BotVisit> {
  const classification = classifyBot(userAgent);

  const visitData = {
    workspace_id: requireWorkspaceId(),
    botType: classification.botType,
    userAgent,
    url,
    visitedAt,
    statusCode: metadata?.statusCode ?? null,
    responseTimeMs: metadata?.responseTimeMs ?? null,
    contentType: metadata?.contentType ?? null,
    contentLengthBytes: metadata?.contentLengthBytes ?? null,
  };

  const saved = await prisma.bot_visits.create({
    data: {
      workspace_id: visitData.workspace_id, bot_type: visitData.botType, user_agent: visitData.userAgent,
      url: visitData.url, visited_at: visitData.visitedAt, status_code: visitData.statusCode,
      response_time_ms: visitData.responseTimeMs, content_type: visitData.contentType,
      content_length_bytes: visitData.contentLengthBytes,
    },
  });
  return fromPrismaRow<BotVisit>(saved as unknown as Record<string, unknown>);
}

/**
 * Log multiple bot visits (batch insert)
 */
export async function logBotVisitsBatch(
  visits: Array<{ userAgent: string; url: string; visitedAt: Date; metadata?: BotVisitMetadata }>
): Promise<BotVisit[]> {
  if (visits.length === 0) return [];

  const workspace_id = requireWorkspaceId();
  const visitDataArray = [];
  for (let i = 0; i < visits.length; i++) {
    const visit = visits[i];
    const classification = classifyBot(visit.userAgent);
    visitDataArray.push({
      workspace_id,
      bot_type: classification.botType,
      user_agent: visit.userAgent,
      url: visit.url,
      visited_at: visit.visitedAt,
      status_code: visit.metadata?.statusCode ?? null,
      response_time_ms: visit.metadata?.responseTimeMs ?? null,
      content_type: visit.metadata?.contentType ?? null,
      content_length_bytes: visit.metadata?.contentLengthBytes ?? null,
    });
  }

  const saved = await prisma.bot_visits.createManyAndReturn({ data: visitDataArray });
  return saved.map((row) => fromPrismaRow<BotVisit>(row as unknown as Record<string, unknown>));
}

/**
 * Get bot visit statistics
 */
export async function getBotStats(
  fromDate?: Date,
  toDate?: Date
): Promise<TrafficSummary> {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  const from = fromDate || defaultFrom;
  const to = toDate || now;

  // Get all visits in the period
  const workspaceId = requireWorkspaceId();
  const [rawVisits, historicalVisitCount] = await Promise.all([
    prisma.bot_visits.findMany({
      where: { workspace_id: workspaceId, visited_at: { gte: from, lte: to } },
      orderBy: { visited_at: "desc" },
    }),
    prisma.bot_visits.count({ where: { workspace_id: workspaceId } }),
  ]);
  const visits = rawVisits.map((row) => fromPrismaRow<BotVisit>(row as unknown as Record<string, unknown>));

  // Aggregate by bot type
  const botStatsMap = new Map<string, {
    category: string;
    visitCount: number;
    urls: Set<string>;
    lastVisit: Date | null;
  }>();

  let aiVisits = 0;
  let searchVisits = 0;
  let socialVisits = 0;
  let otherVisits = 0;

  for (let i = 0; i < visits.length; i++) {
    const visit = visits[i];
    const classification = classifyBot(visit.userAgent);

    // Count by category
    if (classification.category === 'ai') aiVisits++;
    else if (classification.category === 'search') searchVisits++;
    else if (classification.category === 'social') socialVisits++;
    else otherVisits++;

    // Aggregate by bot type
    const existing = botStatsMap.get(visit.botType);
    if (existing) {
      existing.visitCount++;
      existing.urls.add(visit.url);
      if (!existing.lastVisit || (visit.visitedAt && visit.visitedAt > existing.lastVisit)) {
        existing.lastVisit = visit.visitedAt;
      }
    } else {
      const urls = new Set<string>();
      urls.add(visit.url);
      botStatsMap.set(visit.botType, {
        category: classification.category,
        visitCount: 1,
        urls,
        lastVisit: visit.visitedAt,
      });
    }
  }

  // Convert to array
  const byBot: BotStats[] = [];
  const entries = Array.from(botStatsMap.entries());
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    byBot.push({
      botType: entry[0],
      category: entry[1].category,
      visitCount: entry[1].visitCount,
      uniqueUrls: entry[1].urls.size,
      lastVisit: entry[1].lastVisit,
    });
  }

  // Sort by visit count descending
  byBot.sort(function(a, b) { return b.visitCount - a.visitCount; });

  return {
    totalVisits: visits.length,
    aiVisits,
    searchVisits,
    socialVisits,
    otherVisits,
    byBot,
    period: {
      from,
      to,
      hasHistoricalData: historicalVisitCount > 0,
      hasDataInRange: visits.length > 0,
    },
  };
}

/**
 * Get AI bot visits specifically
 */
export async function getAIBotStats(
  fromDate?: Date,
  toDate?: Date
): Promise<BotStats[]> {
  const summary = await getBotStats(fromDate, toDate);
  return summary.byBot.filter(function(bot) {
    const classification = BOT_PATTERNS.find(function(p) { return p.name === bot.botType; });
    return classification && classification.category === 'ai';
  });
}

export async function getBotTimeline(from: Date, to: Date): Promise<BotTimelineDay[]> {
  const rows = await prisma.bot_visits.findMany({
    where: { workspace_id: requireWorkspaceId(), visited_at: { gte: from, lte: to } },
    select: { bot_type: true, visited_at: true },
    orderBy: { visited_at: "asc" },
  });
  const daily = new Map<string, Record<string, number>>();
  const start = new Date(from);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);

  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    daily.set(date.toISOString().slice(0, 10), {});
  }

  for (const row of rows) {
    const date = row.visited_at.toISOString().slice(0, 10);
    const visits = daily.get(date);
    if (visits) visits[row.bot_type] = (visits[row.bot_type] ?? 0) + 1;
  }

  return Array.from(daily, ([date, visits]) => ({ date, visits }));
}

/**
 * Get recent bot visits
 */
export async function getRecentBotVisits(
  limit: number = 100,
  botType?: string,
  from?: Date,
  to?: Date
): Promise<BotVisit[]> {
  // Build conditions array
  const rows = await prisma.bot_visits.findMany({
    where: {
      workspace_id: requireWorkspaceId(),
      ...(botType ? { bot_type: botType } : {}),
      ...(from || to ? { visited_at: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    orderBy: { visited_at: "desc" }, take: limit,
  });
  return rows.map((row) => fromPrismaRow<BotVisit>(row as unknown as Record<string, unknown>));
}

/**
 * Get visits for a specific URL
 */
export async function getVisitsForUrl(
  url: string,
  limit: number = 50
): Promise<BotVisit[]> {
  const rows = await prisma.bot_visits.findMany({
    where: { workspace_id: requireWorkspaceId(), url }, orderBy: { visited_at: "desc" }, take: limit,
  });
  return rows.map((row) => fromPrismaRow<BotVisit>(row as unknown as Record<string, unknown>));
}

/**
 * Clean up old bot visit records
 */
export async function cleanupOldVisits(
  olderThanDays: number = 90
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await prisma.bot_visits.deleteMany({
    where: { workspace_id: requireWorkspaceId(), visited_at: { lt: cutoffDate } },
  });
  return result.count;
}
