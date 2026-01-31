/**
 * robots.txt Parser Service
 *
 * Fetches and parses a site's robots.txt file.
 * Checks AI bot permissions (GPTBot, ClaudeBot, etc.)
 */

import type { RobotsTxtStatus, AIBotConfig } from '@shared/types/site-health';
import { AI_BOTS } from '@shared/types/site-health';

interface RobotsRule {
  userAgent: string;
  rules: { type: 'allow' | 'disallow'; path: string }[];
}

/**
 * Parse robots.txt content into rules
 */
function parseRobotsTxt(content: string): RobotsRule[] {
  const lines = content.split('\n');
  const groups: RobotsRule[] = [];
  let currentGroup: RobotsRule | null = null;

  for (let line of lines) {
    // Remove comments and trim
    const commentIndex = line.indexOf('#');
    if (commentIndex !== -1) {
      line = line.slice(0, commentIndex);
    }
    line = line.trim();

    if (!line) continue;

    // Parse user-agent
    if (line.toLowerCase().startsWith('user-agent:')) {
      const userAgent = line.slice(11).trim();
      currentGroup = { userAgent, rules: [] };
      groups.push(currentGroup);
    }
    // Parse allow/disallow rules
    else if (currentGroup) {
      if (line.toLowerCase().startsWith('allow:')) {
        currentGroup.rules.push({
          type: 'allow',
          path: line.slice(6).trim() || '/',
        });
      } else if (line.toLowerCase().startsWith('disallow:')) {
        currentGroup.rules.push({
          type: 'disallow',
          path: line.slice(9).trim() || '/',
        });
      }
    }
  }

  return groups;
}

/**
 * Check if a bot is allowed based on rules
 */
function isBotAllowed(botUserAgent: string, groups: RobotsRule[]): { allowed: boolean; rules: string[] } {
  // Find applicable groups
  const applicableGroups: RobotsRule[] = [];

  for (const group of groups) {
    const ua = group.userAgent.toLowerCase();
    if (
      ua === '*' ||
      ua === botUserAgent.toLowerCase() ||
      botUserAgent.toLowerCase().includes(ua)
    ) {
      applicableGroups.push(group);
    }
  }

  // If no rules apply, bot is allowed
  if (applicableGroups.length === 0) {
    return { allowed: true, rules: ['No rules found (allowed by default)'] };
  }

  // Find the most specific group (exact match over wildcard)
  const exactMatch = applicableGroups.find(
    g => g.userAgent.toLowerCase() === botUserAgent.toLowerCase()
  );
  const targetGroup = exactMatch || applicableGroups.find(g => g.userAgent === '*');

  if (!targetGroup) {
    return { allowed: true, rules: ['No applicable rules'] };
  }

  // Check rules - last matching rule wins, but we simplify to check for root disallow
  const rules: string[] = [];
  let blocked = false;

  for (const rule of targetGroup.rules) {
    rules.push(`${rule.type === 'allow' ? 'Allow' : 'Disallow'}: ${rule.path}`);

    if (rule.type === 'disallow' && (rule.path === '/' || rule.path === '/*')) {
      blocked = true;
    } else if (rule.type === 'allow' && (rule.path === '/' || rule.path === '/*')) {
      blocked = false;
    }
  }

  // Empty Disallow means allowed
  if (targetGroup.rules.length === 1 && targetGroup.rules[0].type === 'disallow' && targetGroup.rules[0].path === '') {
    blocked = false;
  }

  return { allowed: !blocked, rules };
}

/**
 * Check a domain's robots.txt file for AI bot permissions
 */
export async function checkRobotsTxt(domain: string): Promise<RobotsTxtStatus> {
  const url = `https://${domain}/robots.txt`;
  const issues: string[] = [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OpenAEO-Bot/1.0',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      // No robots.txt means all bots are allowed
      return {
        exists: false,
        url: null,
        aiBots: AI_BOTS.map(bot => ({
          ...bot,
          allowed: true,
          rules: ['No robots.txt found (all bots allowed)'],
        })),
        issues: ['No robots.txt file found (all crawlers allowed by default)'],
      };
    }

    const content = await response.text();
    const groups = parseRobotsTxt(content);

    // Check each AI bot
    const aiBots: AIBotConfig[] = AI_BOTS.map(bot => {
      const { allowed, rules } = isBotAllowed(bot.userAgent, groups);
      return {
        ...bot,
        allowed,
        rules,
      };
    });

    // Generate issues
    const blockedBots = aiBots.filter(b => !b.allowed);
    const allowedBots = aiBots.filter(b => b.allowed);

    if (blockedBots.length === aiBots.length) {
      issues.push('All AI crawlers are blocked. Your content will not appear in AI responses.');
    } else if (blockedBots.length > 0) {
      const blockedNames = blockedBots.map(b => b.name).join(', ');
      issues.push(`Some AI crawlers are blocked: ${blockedNames}`);
    }

    // Check for common AI crawlers
    const importantBots = ['GPTBot', 'ClaudeBot', 'PerplexityBot'];
    const importantBlocked = blockedBots.filter(b => importantBots.includes(b.name));
    if (importantBlocked.length > 0 && importantBlocked.length < blockedBots.length) {
      issues.push(
        `Consider allowing ${importantBlocked.map(b => b.name).join(' and ')} for better AI visibility.`
      );
    }

    return {
      exists: true,
      url,
      aiBots,
      issues,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        exists: false,
        url,
        aiBots: AI_BOTS.map(bot => ({
          ...bot,
          allowed: true,
          rules: ['Timeout - assuming allowed'],
        })),
        issues: ['Request timed out while fetching robots.txt'],
      };
    }

    return {
      exists: false,
      url,
      aiBots: AI_BOTS.map(bot => ({
        ...bot,
        allowed: true,
        rules: ['Error fetching - assuming allowed'],
      })),
      issues: [`Failed to fetch robots.txt: ${error.message}`],
    };
  }
}

/**
 * Generate a robots.txt snippet to allow AI bots
 */
export function generateAIBotAllowSnippet(): string {
  const lines: string[] = [
    '# Allow AI crawlers for LLM visibility',
    '',
  ];

  for (const bot of AI_BOTS) {
    lines.push(`User-agent: ${bot.userAgent}`);
    lines.push('Allow: /');
    lines.push('');
  }

  return lines.join('\n');
}
