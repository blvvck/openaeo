/**
 * Site Audit Service
 *
 * Checks websites for AI bot accessibility and generates recommendations.
 * Checks include:
 * - robots.txt for AI bot access (GPTBot, ClaudeBot, PerplexityBot, Google-Extended)
 * - Page load time (<5s threshold)
 * - Content length (2000+ words recommended)
 * - Meta description presence
 * - Schema markup presence
 */

import { prisma } from "../../prisma";
import { fromPrismaRow, requireWorkspaceId } from "../../prisma-mapping";
import type { SiteAudit } from "@shared/schema";

// AI bots to check in robots.txt
export const AI_BOTS = [
  'GPTBot',
  'ClaudeBot',
  'PerplexityBot',
  'Google-Extended',
] as const;

export type AIBot = typeof AI_BOTS[number];

export interface RobotsTxtCheck {
  bot: AIBot;
  allowed: boolean;
  rule: string | null;
}

export interface AuditCheck {
  name: string;
  passed: boolean;
  score: number;
  maxScore: number;
  details: string;
  value?: string | number | boolean;
}

export interface AuditResult {
  url: string;
  score: number;
  checks: AuditCheck[];
  recommendations: string[];
  auditedAt: Date;
}

// Check weights for final score calculation
const CHECK_WEIGHTS = {
  robotsTxt: 30,      // AI bot accessibility is critical
  pageLoadTime: 20,   // Fast pages are important for crawling
  contentLength: 20,  // Substantial content helps AI understand
  metaDescription: 15, // Meta helps with context
  schemaMarkup: 15,    // Structured data improves understanding
};

/**
 * Fetch and parse robots.txt for a domain
 */
async function fetchRobotsTxt(url: string): Promise<string | null> {
  try {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

    const controller = new AbortController();
    const timeout = setTimeout(function() { controller.abort(); }, 10000);

    try {
      const response = await fetch(robotsUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'LLMBrandTracker/1.0 (Site Audit)',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      return await response.text();
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error('[SiteAuditor] Failed to fetch robots.txt:', error);
    return null;
  }
}

/**
 * Check if a specific bot is allowed in robots.txt
 */
function checkBotInRobotsTxt(robotsTxt: string, bot: AIBot): RobotsTxtCheck {
  const lines = robotsTxt.split('\n');
  let currentUserAgent = '';
  let isAllowed = true; // Default to allowed if no explicit rule
  let matchedRule: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().toLowerCase();

    // Skip comments and empty lines
    if (line.startsWith('#') || line === '') {
      continue;
    }

    // Check for User-agent directive
    if (line.startsWith('user-agent:')) {
      currentUserAgent = line.replace('user-agent:', '').trim();
    }

    // Check for Disallow directive
    if (line.startsWith('disallow:')) {
      const path = line.replace('disallow:', '').trim();

      // Check if this applies to our bot or all bots
      if (currentUserAgent === bot.toLowerCase() || currentUserAgent === '*') {
        if (path === '/' || path === '/*') {
          isAllowed = false;
          matchedRule = `${currentUserAgent}: Disallow: ${path}`;
        }
      }
    }

    // Check for Allow directive (overrides Disallow)
    if (line.startsWith('allow:')) {
      const path = line.replace('allow:', '').trim();

      if (currentUserAgent === bot.toLowerCase() || currentUserAgent === '*') {
        if (path === '/' || path === '/*') {
          isAllowed = true;
          matchedRule = `${currentUserAgent}: Allow: ${path}`;
        }
      }
    }
  }

  return {
    bot,
    allowed: isAllowed,
    rule: matchedRule,
  };
}

/**
 * Check robots.txt for all AI bots
 */
async function checkRobotsTxt(url: string): Promise<AuditCheck> {
  const robotsTxt = await fetchRobotsTxt(url);

  if (robotsTxt === null) {
    // No robots.txt means all bots are allowed
    return {
      name: 'AI Bot Access (robots.txt)',
      passed: true,
      score: CHECK_WEIGHTS.robotsTxt,
      maxScore: CHECK_WEIGHTS.robotsTxt,
      details: 'No robots.txt found - all AI bots are allowed by default',
      value: true,
    };
  }

  const botChecks: RobotsTxtCheck[] = [];
  for (let i = 0; i < AI_BOTS.length; i++) {
    botChecks.push(checkBotInRobotsTxt(robotsTxt, AI_BOTS[i]));
  }

  const allowedBots = botChecks.filter(function(check) { return check.allowed; });
  const blockedBots = botChecks.filter(function(check) { return !check.allowed; });

  const scoreRatio = allowedBots.length / AI_BOTS.length;
  const score = Math.round(CHECK_WEIGHTS.robotsTxt * scoreRatio);

  let details: string;
  if (blockedBots.length === 0) {
    details = 'All AI bots are allowed';
  } else if (allowedBots.length === 0) {
    details = 'All AI bots are blocked: ' + blockedBots.map(function(b) { return b.bot; }).join(', ');
  } else {
    details = 'Allowed: ' + allowedBots.map(function(b) { return b.bot; }).join(', ') +
              '. Blocked: ' + blockedBots.map(function(b) { return b.bot; }).join(', ');
  }

  return {
    name: 'AI Bot Access (robots.txt)',
    passed: blockedBots.length === 0,
    score,
    maxScore: CHECK_WEIGHTS.robotsTxt,
    details,
    value: blockedBots.length === 0,
  };
}

/**
 * Check page load time
 */
async function checkPageLoadTime(url: string): Promise<AuditCheck> {
  const THRESHOLD_MS = 5000; // 5 seconds

  try {
    const startTime = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(function() { controller.abort(); }, 15000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'LLMBrandTracker/1.0 (Site Audit)',
        },
      });

      clearTimeout(timeout);

      // Read the full response to get accurate load time
      await response.text();

      const loadTime = Date.now() - startTime;
      const passed = loadTime < THRESHOLD_MS;

      // Score based on load time (faster is better)
      let score: number;
      if (loadTime < 1000) {
        score = CHECK_WEIGHTS.pageLoadTime; // Excellent
      } else if (loadTime < 2000) {
        score = Math.round(CHECK_WEIGHTS.pageLoadTime * 0.9); // Good
      } else if (loadTime < 3000) {
        score = Math.round(CHECK_WEIGHTS.pageLoadTime * 0.7); // Okay
      } else if (loadTime < 5000) {
        score = Math.round(CHECK_WEIGHTS.pageLoadTime * 0.5); // Slow
      } else {
        score = Math.round(CHECK_WEIGHTS.pageLoadTime * 0.2); // Very slow
      }

      return {
        name: 'Page Load Time',
        passed,
        score,
        maxScore: CHECK_WEIGHTS.pageLoadTime,
        details: passed
          ? `Page loaded in ${loadTime}ms (under ${THRESHOLD_MS}ms threshold)`
          : `Page loaded in ${loadTime}ms (exceeds ${THRESHOLD_MS}ms threshold)`,
        value: loadTime,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: any) {
    return {
      name: 'Page Load Time',
      passed: false,
      score: 0,
      maxScore: CHECK_WEIGHTS.pageLoadTime,
      details: `Failed to load page: ${error.message || 'Unknown error'}`,
      value: -1,
    };
  }
}

/**
 * Check content length
 */
async function checkContentLength(url: string): Promise<AuditCheck> {
  const MIN_WORDS = 2000;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(function() { controller.abort(); }, 15000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'LLMBrandTracker/1.0 (Site Audit)',
        },
      });

      clearTimeout(timeout);

      const html = await response.text();

      // Strip HTML tags and count words
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const words = text.split(' ').filter(function(w) { return w.length > 0; });
      const wordCount = words.length;
      const passed = wordCount >= MIN_WORDS;

      // Score based on word count
      let score: number;
      const ratio = wordCount / MIN_WORDS;
      if (ratio >= 1) {
        score = CHECK_WEIGHTS.contentLength;
      } else if (ratio >= 0.75) {
        score = Math.round(CHECK_WEIGHTS.contentLength * 0.8);
      } else if (ratio >= 0.5) {
        score = Math.round(CHECK_WEIGHTS.contentLength * 0.5);
      } else {
        score = Math.round(CHECK_WEIGHTS.contentLength * ratio * 0.5);
      }

      return {
        name: 'Content Length',
        passed,
        score,
        maxScore: CHECK_WEIGHTS.contentLength,
        details: passed
          ? `Page has ${wordCount} words (meets ${MIN_WORDS} word recommendation)`
          : `Page has only ${wordCount} words (${MIN_WORDS}+ recommended for comprehensive AI understanding)`,
        value: wordCount,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: any) {
    return {
      name: 'Content Length',
      passed: false,
      score: 0,
      maxScore: CHECK_WEIGHTS.contentLength,
      details: `Failed to analyze content: ${error.message || 'Unknown error'}`,
      value: 0,
    };
  }
}

/**
 * Check meta description presence
 */
async function checkMetaDescription(url: string): Promise<AuditCheck> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(function() { controller.abort(); }, 15000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'LLMBrandTracker/1.0 (Site Audit)',
        },
      });

      clearTimeout(timeout);

      const html = await response.text();

      // Look for meta description
      const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i);

      const hasMetaDescription = metaMatch !== null && metaMatch[1].trim().length > 0;
      const metaContent = hasMetaDescription ? metaMatch![1].trim() : '';

      // Check meta description quality
      let score: number;
      let details: string;

      if (!hasMetaDescription) {
        score = 0;
        details = 'No meta description found';
      } else if (metaContent.length < 50) {
        score = Math.round(CHECK_WEIGHTS.metaDescription * 0.5);
        details = `Meta description is too short (${metaContent.length} chars, 50-160 recommended)`;
      } else if (metaContent.length > 160) {
        score = Math.round(CHECK_WEIGHTS.metaDescription * 0.8);
        details = `Meta description is too long (${metaContent.length} chars, may be truncated)`;
      } else {
        score = CHECK_WEIGHTS.metaDescription;
        details = `Meta description found (${metaContent.length} chars)`;
      }

      return {
        name: 'Meta Description',
        passed: hasMetaDescription,
        score,
        maxScore: CHECK_WEIGHTS.metaDescription,
        details,
        value: hasMetaDescription,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: any) {
    return {
      name: 'Meta Description',
      passed: false,
      score: 0,
      maxScore: CHECK_WEIGHTS.metaDescription,
      details: `Failed to check meta description: ${error.message || 'Unknown error'}`,
      value: false,
    };
  }
}

/**
 * Check schema markup presence
 */
async function checkSchemaMarkup(url: string): Promise<AuditCheck> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(function() { controller.abort(); }, 15000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'LLMBrandTracker/1.0 (Site Audit)',
        },
      });

      clearTimeout(timeout);

      const html = await response.text();

      // Check for JSON-LD structured data
      const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>/gi);
      const hasJsonLd = jsonLdMatch !== null && jsonLdMatch.length > 0;

      // Check for microdata
      const hasMicrodata = html.includes('itemscope') || html.includes('itemtype');

      // Check for RDFa
      const hasRdfa = html.includes('vocab=') || html.includes('typeof=');

      const hasSchemaMarkup = hasJsonLd || hasMicrodata || hasRdfa;

      const schemaTypes: string[] = [];
      if (hasJsonLd) schemaTypes.push('JSON-LD');
      if (hasMicrodata) schemaTypes.push('Microdata');
      if (hasRdfa) schemaTypes.push('RDFa');

      const score = hasSchemaMarkup ? CHECK_WEIGHTS.schemaMarkup : 0;

      return {
        name: 'Schema Markup',
        passed: hasSchemaMarkup,
        score,
        maxScore: CHECK_WEIGHTS.schemaMarkup,
        details: hasSchemaMarkup
          ? `Schema markup found: ${schemaTypes.join(', ')}`
          : 'No schema markup found (JSON-LD, Microdata, or RDFa recommended)',
        value: hasSchemaMarkup,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: any) {
    return {
      name: 'Schema Markup',
      passed: false,
      score: 0,
      maxScore: CHECK_WEIGHTS.schemaMarkup,
      details: `Failed to check schema markup: ${error.message || 'Unknown error'}`,
      value: false,
    };
  }
}

/**
 * Generate recommendations based on audit checks
 */
function generateRecommendations(checks: AuditCheck[]): string[] {
  const recommendations: string[] = [];

  for (let i = 0; i < checks.length; i++) {
    const check = checks[i];
    if (!check.passed) {
      switch (check.name) {
        case 'AI Bot Access (robots.txt)':
          recommendations.push(
            'Update your robots.txt to allow AI bots (GPTBot, ClaudeBot, PerplexityBot, Google-Extended). ' +
            'This enables AI assistants to understand and recommend your content.'
          );
          break;

        case 'Page Load Time':
          recommendations.push(
            'Improve page load time to under 5 seconds. Consider optimizing images, ' +
            'enabling compression, using a CDN, and minimizing JavaScript.'
          );
          break;

        case 'Content Length':
          recommendations.push(
            'Add more content to your page (2000+ words recommended). ' +
            'Comprehensive content helps AI systems better understand your offering.'
          );
          break;

        case 'Meta Description':
          recommendations.push(
            'Add a meta description tag (50-160 characters). ' +
            'This helps AI systems understand your page\'s purpose.'
          );
          break;

        case 'Schema Markup':
          recommendations.push(
            'Add structured data (JSON-LD recommended) to help AI systems understand your content. ' +
            'Include Organization, Product, or Service schemas as appropriate.'
          );
          break;
      }
    }
  }

  return recommendations;
}

/**
 * Run a full site audit
 */
export async function runSiteAudit(url: string): Promise<AuditResult> {
  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  // Run all checks in parallel
  const [
    robotsCheck,
    loadTimeCheck,
    contentCheck,
    metaCheck,
    schemaCheck,
  ] = await Promise.all([
    checkRobotsTxt(url),
    checkPageLoadTime(url),
    checkContentLength(url),
    checkMetaDescription(url),
    checkSchemaMarkup(url),
  ]);

  const checks = [robotsCheck, loadTimeCheck, contentCheck, metaCheck, schemaCheck];

  // Calculate total score
  let totalScore = 0;
  for (let i = 0; i < checks.length; i++) {
    totalScore += checks[i].score;
  }

  const recommendations = generateRecommendations(checks);

  const result: AuditResult = {
    url,
    score: totalScore,
    checks,
    recommendations,
    auditedAt: new Date(),
  };

  return result;
}

/**
 * Save audit result to database
 */
export async function saveAuditResult(result: AuditResult): Promise<SiteAudit> {
  const saved = await prisma.site_audits.create({
    data: {
      workspace_id: requireWorkspaceId(),
    url: result.url,
    score: result.score,
    checks: result.checks,
    recommendations: result.recommendations,
    } as any,
  });
  return fromPrismaRow<SiteAudit>(saved as unknown as Record<string, unknown>);
}

/**
 * Get audit by ID
 */
export async function getAuditById(id: number): Promise<SiteAudit | undefined> {
  const audit = await prisma.site_audits.findFirst({ where: { id, workspace_id: requireWorkspaceId() } });
  return audit ? fromPrismaRow<SiteAudit>(audit as unknown as Record<string, unknown>) : undefined;
}

/**
 * Get recent audits for a URL
 */
export async function getAuditsForUrl(url: string, limit: number = 10): Promise<SiteAudit[]> {
  const rows = await prisma.site_audits.findMany({
    where: { workspace_id: requireWorkspaceId(), url },
    orderBy: { created_at: "desc" },
    take: limit,
  });
  return rows.map((row) => fromPrismaRow<SiteAudit>(row as unknown as Record<string, unknown>));
}

/**
 * Get all recent audits
 */
export async function getRecentAudits(limit: number = 20): Promise<SiteAudit[]> {
  const rows = await prisma.site_audits.findMany({
    where: { workspace_id: requireWorkspaceId() },
    orderBy: { created_at: "desc" },
    take: limit,
  });
  return rows.map((row) => fromPrismaRow<SiteAudit>(row as unknown as Record<string, unknown>));
}
