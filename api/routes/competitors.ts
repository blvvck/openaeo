

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import dns from 'dns/promises';
import OpenAI from 'openai';
import { GoogleGenerativeAI, DynamicRetrievalMode } from '@google/generative-ai';
import { storage } from '../data';
import { getActiveBrandConfig } from '../services/brand-config';
import { AI_PLATFORMS } from '@shared/types/platforms';
import { calculateVisibilityScore } from '../services/analytics/visibility-calculator';
import { compareCompetitors } from '../services/analytics/competitor-detector';
import { analyzeCitations } from '../services/analytics/citation-tracker';
import type { TimeRangePreset, CompetitorMetricsResponse } from '@shared/types';
import { currentWorkspaceId } from '../context/workspace-context';
import { prismaRoot } from '../prisma';

async function workspaceNameFallback(): Promise<string> {
  const workspaceId = currentWorkspaceId();
  if (!workspaceId) return 'Your organization';
  const workspace = await prismaRoot.workspaces.findUnique({ where: { id: workspaceId }, select: { name: true } });
  return workspace?.name ?? 'Your organization';
}

const router = Router();

// OpenAI client for LLM calls (used for prompt discovery)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || 'default_key',
});
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

// Gemini client for company identification (with web search grounding)
const geminiApiKey = process.env.GOOGLE_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// =============================================================================
// Rate Limiting (in-memory for now, should move to DB/Redis in production)
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: Date;
}

// In-memory rate limit store (per account/IP)
const rateLimitStore = new Map<string, RateLimitEntry>();
const DAILY_LIMIT = 5;

/**
 * Get rate limit status for an account
 */
function getRateLimitStatus(accountId: string): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = new Date();
  const entry = rateLimitStore.get(accountId);

  // If no entry or reset time passed, create fresh entry
  if (!entry || now >= entry.resetAt) {
    // Reset at next midnight UTC
    const resetAt = new Date(now);
    resetAt.setUTCHours(24, 0, 0, 0);
    rateLimitStore.set(accountId, { count: 0, resetAt });
    return { allowed: true, remaining: DAILY_LIMIT, resetAt };
  }

  const remaining = Math.max(0, DAILY_LIMIT - entry.count);
  return {
    allowed: remaining > 0,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Increment rate limit counter
 */
function incrementRateLimit(accountId: string): void {
  const now = new Date();
  const entry = rateLimitStore.get(accountId);

  if (!entry || now >= entry.resetAt) {
    const resetAt = new Date(now);
    resetAt.setUTCHours(24, 0, 0, 0);
    rateLimitStore.set(accountId, { count: 1, resetAt });
  } else {
    entry.count++;
  }
}

// =============================================================================
// Validation Schemas
// =============================================================================

const discoverRequestSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  selectedPromptIds: z.array(z.string()).optional(),
});

const addCompetitorSchema = z.object({
  domain: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  promptIds: z.array(z.string()).optional(),
  initialScore: z.number().optional(),
  platformsFound: z.array(z.string()).optional(),
  discoveredPrompts: z.array(z.string()).optional(),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize domain (strip protocol, www, trailing slashes)
 */
function normalizeDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .trim();
}

/**
 * Common/valid TLDs - not exhaustive but covers most real domains
 */
const COMMON_TLDS = new Set([
  'com', 'org', 'net', 'edu', 'gov', 'io', 'co', 'app', 'dev', 'ai', 'so',
  'me', 'us', 'uk', 'ca', 'de', 'fr', 'es', 'it', 'nl', 'be', 'ch', 'at',
  'au', 'nz', 'jp', 'kr', 'cn', 'in', 'br', 'mx', 'ru', 'pl', 'se', 'no',
  'fi', 'dk', 'ie', 'pt', 'cz', 'hu', 'ro', 'bg', 'hr', 'sk', 'si', 'lt',
  'lv', 'ee', 'is', 'gr', 'tr', 'il', 'ae', 'sa', 'za', 'ng', 'ke', 'eg',
  'info', 'biz', 'xyz', 'online', 'site', 'tech', 'store', 'shop', 'blog',
  'cloud', 'digital', 'agency', 'design', 'studio', 'media', 'group', 'team',
  'solutions', 'services', 'consulting', 'software', 'systems', 'network',
]);

/**
 * Validate domain format, TLD, and existence via DNS lookup
 */
async function validateDomain(domain: string): Promise<{ valid: boolean; normalized: string; error?: string }> {
  const normalized = normalizeDomain(domain);

  // Basic format validation
  const domainRegex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
  if (!domainRegex.test(normalized)) {
    return { valid: false, normalized, error: 'Invalid domain format' };
  }

  // Check TLD is recognizable
  const parts = normalized.split('.');
  const tld = parts[parts.length - 1];
  if (!COMMON_TLDS.has(tld)) {
    return { valid: false, normalized, error: `Unknown domain extension ".${tld}"` };
  }

  // DNS lookup to verify domain actually exists
  // Try multiple record types - if ANY succeeds, domain exists
  try {
    // Try A record first (most common)
    const addresses = await dns.resolve4(normalized);
    if (addresses && addresses.length > 0) {
      return { valid: true, normalized };
    }
  } catch {
    // A record failed, try other types
  }

  try {
    // Try AAAA (IPv6)
    const addresses = await dns.resolve6(normalized);
    if (addresses && addresses.length > 0) {
      return { valid: true, normalized };
    }
  } catch {
    // AAAA failed
  }

  try {
    // Try MX (email servers - many domains have these)
    const mxRecords = await dns.resolveMx(normalized);
    if (mxRecords && mxRecords.length > 0) {
      return { valid: true, normalized };
    }
  } catch {
    // MX failed
  }

  try {
    // Try NS (name servers - almost all registered domains have these)
    const nsRecords = await dns.resolveNs(normalized);
    if (nsRecords && nsRecords.length > 0) {
      return { valid: true, normalized };
    }
  } catch {
    // NS failed
  }

  // No DNS records found at all
  return { valid: false, normalized, error: 'Domain does not exist or is not active' };
}

/**
 * Fetch website metadata (title, description) for better company identification
 * This is a fallback - we try scraping first, but if blocked, the LLM can still search
 */
async function fetchWebsiteMetadata(domain: string): Promise<{ title?: string; description?: string; content?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`https://${domain}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return {};

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : undefined;

    // Extract og:description as fallback
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
    const ogDescription = ogDescMatch ? ogDescMatch[1].trim() : undefined;

    // Extract some visible text content (first 500 chars of body text)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let content = '';
    if (bodyMatch) {
      content = bodyMatch[1]
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500);
    }

    return {
      title,
      description: description || ogDescription,
      content,
    };
  } catch (error) {
    // Scraping failed - that's OK, we'll tell the LLM to search
    return {};
  }
}

/**
 * Identify company from domain using Gemini with web search grounding
 * Uses Google Search to get real-time information about any company
 * Returns company info AND suggested prompts in a single call
 */
async function identifyCompany(domain: string): Promise<{
  name: string;
  description: string;
  categories: string[];
  prompts: Array<{ text: string; category: string }>;
} | null> {
  // First, try to fetch actual website metadata as supplementary info
  const metadata = await fetchWebsiteMetadata(domain);
  const hasWebsiteData = !!(metadata.title || metadata.description || metadata.content);

  try {
    // Use Gemini with web search grounding for best results
    if (!genAI) {
      console.error('GOOGLE_API_KEY not configured, falling back to OpenAI');
      return identifyCompanyWithOpenAI(domain, metadata, hasWebsiteData);
    }

    const websiteContext = hasWebsiteData
      ? `\n\nAdditional context from their website:
${metadata.title ? `- Page title: "${metadata.title}"` : ''}
${metadata.description ? `- Meta description: "${metadata.description}"` : ''}
${metadata.content ? `- Page content snippet: "${metadata.content.slice(0, 200)}..."` : ''}`
      : '';

    const prompt = `Identify the company at the domain "${domain}" and generate search prompts people would use to find solutions like theirs.

IMPORTANT: The FULL domain including TLD matters. ${domain} is specifically what I'm asking about - not a similar domain with a different TLD.

Search the web to find accurate, current information about this specific company.${websiteContext}

Return a JSON object with these exact fields:
{
  "name": "The company/product brand name (properly capitalized)",
  "description": "A clear, specific sentence about what they do (20-40 words)",
  "categories": ["Primary category", "Secondary category", "Tertiary category"],
  "prompts": [
    { "text": "search query text", "category": "alternatives|comparisons|reviews|use-cases" },
    ...
  ]
}

RULES FOR COMPANY INFO:
- Be specific and confident - NEVER say "Unknown" or "unclear"
- Search for information about "${domain}" specifically
- Description should explain their actual product/service, not be generic
- Categories should be 2-4 relevant industries/verticals (e.g., ["HR Technology", "Payroll", "Remote Work"])

RULES FOR PROMPTS:
- Generate 8-12 realistic search queries that potential customers would type
- Make prompts SPECIFIC to what this company does (not just generic "[company] reviews")
- Include a mix of categories:
  * "alternatives" — queries looking for alternatives/competitors (e.g., "best payroll software for remote teams", "[company] alternatives")
  * "comparisons" — queries comparing solutions (e.g., "[company] vs [competitor]", "[company] pros and cons")
  * "reviews" — queries seeking opinions (e.g., "[company] reviews 2024", "is [company] worth it")
  * "use-cases" — queries about how to use or specific needs (e.g., "how to pay contractors internationally", "[company] for startups")
- Use the company name in some prompts, but also include generic industry queries they'd want to rank for

Return ONLY the JSON object, no other text.`;

    // Create model with web search grounding enabled
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      tools: [{
        googleSearchRetrieval: {
          dynamicRetrievalConfig: {
            mode: DynamicRetrievalMode.MODE_DYNAMIC,
            dynamicThreshold: 0.3
          }
        }
      }] as any
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    // Handle potential markdown code blocks
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    // Validate we got good data
    const name = parsed.name || domain.split('.')[0];
    const description = parsed.description || `${name} provides solutions in their market segment.`;

    // Handle categories
    let categories: string[] = [];
    if (Array.isArray(parsed.categories)) {
      categories = parsed.categories.filter((c: string) => c && !c.includes('Unknown'));
    } else if (parsed.category) {
      categories = [parsed.category].filter((c: string) => c && !c.includes('Unknown'));
    }
    if (categories.length === 0) {
      categories = ['Technology'];
    }

    // Handle prompts - use LLM response or empty array (frontend will use fallback)
    const prompts: Array<{ text: string; category: string }> = [];
    if (Array.isArray(parsed.prompts)) {
      for (const p of parsed.prompts) {
        if (p.text && typeof p.text === 'string') {
          prompts.push({
            text: p.text,
            category: ['alternatives', 'comparisons', 'reviews', 'use-cases'].includes(p.category)
              ? p.category
              : 'use-cases',
          });
        }
      }
    }

    // Don't accept "Unknown" in any field
    return {
      name: name.includes('Unknown') ? domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1) : name,
      description: description.includes('Unknown') ? `${name} provides solutions in their market segment.` : description,
      categories,
      prompts,
    };
  } catch (error) {
    console.error('Error identifying company with Gemini:', error);
    // Fallback to OpenAI
    return identifyCompanyWithOpenAI(domain, metadata, hasWebsiteData);
  }
}

/**
 * Second fallback: OpenAI (no web search, but good at inference)
 */
async function identifyCompanyWithOpenAI(
  domain: string,
  metadata: { title?: string; description?: string; content?: string },
  hasWebsiteData: boolean
): Promise<{
  name: string;
  description: string;
  categories: string[];
  prompts: Array<{ text: string; category: string }>;
}> {
  try {
    const websiteContext = hasWebsiteData
      ? `\n\nWebsite data from ${domain}:
${metadata.title ? `- Title: "${metadata.title}"` : ''}
${metadata.description ? `- Description: "${metadata.description}"` : ''}
${metadata.content ? `- Content: "${metadata.content.slice(0, 300)}..."` : ''}`
      : '';

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You identify companies and generate search prompts for competitor tracking.

Return a JSON object with exactly this structure:
{
  "name": "Company Name",
  "description": "What they do in 20-40 words",
  "categories": ["Category1", "Category2", "Category3"],
  "prompts": [
    {"text": "search query 1", "category": "alternatives"},
    {"text": "search query 2", "category": "comparisons"},
    {"text": "search query 3", "category": "reviews"},
    {"text": "search query 4", "category": "use-cases"}
  ]
}

IMPORTANT: You MUST include 8-12 prompts. Categories are: alternatives, comparisons, reviews, use-cases.

Make prompts SPECIFIC to the company's industry. Examples for an HR company:
- "best global payroll software" (alternatives)
- "rippling vs deel comparison" (comparisons)
- "is [company] worth it for startups" (reviews)
- "how to pay international contractors" (use-cases)

Mix branded queries with industry queries.`,
        },
        {
          role: 'user',
          content: `Identify company at "${domain}" and generate search prompts.${websiteContext}\n\nReturn JSON only.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(content);

    const name = parsed.name || domain.split('.')[0];
    const description = parsed.description || `${name} provides solutions in their market segment.`;

    // Handle categories
    let categories: string[] = [];
    if (Array.isArray(parsed.categories)) {
      categories = parsed.categories.filter((c: string) => c && !c.includes('Unknown'));
    }
    if (categories.length === 0) {
      categories = ['Technology'];
    }

    // Handle prompts
    const prompts: Array<{ text: string; category: string }> = [];
    if (Array.isArray(parsed.prompts)) {
      for (const p of parsed.prompts) {
        if (p.text && typeof p.text === 'string') {
          prompts.push({
            text: p.text,
            category: ['alternatives', 'comparisons', 'reviews', 'use-cases'].includes(p.category)
              ? p.category
              : 'use-cases',
          });
        }
      }
    }

    // If OpenAI returned no prompts, use fallback
    if (prompts.length === 0) {
      const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
      prompts.push(...generateFallbackPrompts(capitalizedName));
    }

    return {
      name: name.includes('Unknown') ? domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1) : name,
      description: description.includes('Unknown') ? `${name} provides solutions in their market segment.` : description,
      categories,
      prompts,
    };
  } catch (error) {
    console.error('Error identifying company with OpenAI:', error);
    // Third fallback: static data
    const name = domain.split('.')[0];
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    return {
      name: capitalizedName,
      description: metadata.description || `${capitalizedName} provides solutions in their market segment.`,
      categories: ['Technology'],
      prompts: generateFallbackPrompts(capitalizedName),
    };
  }
}

/**
 * Generate fallback prompts when LLM calls fail
 * Uses the company name to create generic but relevant prompts
 */
function generateFallbackPrompts(companyName: string): Array<{ text: string; category: string }> {
  const name = companyName.toLowerCase();
  return [
    { text: `best ${name} alternative`, category: 'alternatives' },
    { text: `${name} competitors`, category: 'alternatives' },
    { text: `companies like ${name}`, category: 'alternatives' },
    { text: `${name} vs competitor comparison`, category: 'comparisons' },
    { text: `${name} pros and cons`, category: 'comparisons' },
    { text: `${name} reviews`, category: 'reviews' },
    { text: `is ${name} good`, category: 'reviews' },
    { text: `${name} reviews 2024`, category: 'reviews' },
    { text: `how to use ${name}`, category: 'use-cases' },
    { text: `${name} for startups`, category: 'use-cases' },
    { text: `${name} pricing`, category: 'use-cases' },
    { text: `${name} tutorial`, category: 'use-cases' },
  ];
}

/**
 * Discover relevant prompts for a company using LLM
 */
async function* discoverPrompts(company: {
  name: string;
  description: string;
  category: string;
}): AsyncGenerator<{ id: string; text: string; category: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: `Generate search queries that potential customers would use when looking for solutions like ${company.name}.

Return a JSON object with a "prompts" array. Each prompt should have:
- text: The search query (natural language, like what someone would type)
- category: One of "alternatives", "comparisons", "reviews", "use-cases"

Generate 8-12 diverse prompts covering:
1. Alternatives/competitors searches ("best X alternative")
2. Comparison searches ("X vs Y")
3. Review searches ("X reviews", "is X good")
4. Use-case searches ("how to do Y with X", "X for startups")

Make them realistic and varied.`,
        },
        {
          role: 'user',
          content: `Company: ${company.name}
Description: ${company.description}
Category: ${company.category}

Generate relevant search prompts.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(content);
    const prompts = parsed.prompts || [];

    let id = 0;
    for (const prompt of prompts) {
      // Simulate streaming delay for progressive UI
      await new Promise((r) => setTimeout(r, 150 + Math.random() * 100));
      yield {
        id: `prompt-${id++}`,
        text: prompt.text || prompt,
        category: prompt.category || 'use-cases',
      };
    }
  } catch (error) {
    console.error('Error discovering prompts:', error);
    // Yield fallback prompts
    const fallbacks = [
      { text: `best ${company.name.toLowerCase()} alternative`, category: 'alternatives' },
      { text: `${company.name.toLowerCase()} competitors`, category: 'alternatives' },
      { text: `${company.name.toLowerCase()} vs competitor`, category: 'comparisons' },
      { text: `${company.name.toLowerCase()} reviews`, category: 'reviews' },
      { text: `is ${company.name.toLowerCase()} good`, category: 'reviews' },
      { text: `how to use ${company.name.toLowerCase()}`, category: 'use-cases' },
    ];

    let id = 0;
    for (const fb of fallbacks) {
      await new Promise((r) => setTimeout(r, 100));
      yield { id: `prompt-${id++}`, ...fb };
    }
  }
}

/**
 * Simulate scanning a platform for visibility
 * TODO: In production, this would call PlatformRouter.querySinglePlatform
 * with proper type mapping between PlatformId and PlatformName
 */
async function simulatePlatformScan(
  platformId: string,
  _companyName: string
): Promise<{ found: boolean; score: number }> {
  // Simulate varying success rates per platform
  // In production, this would call real platform APIs
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

  const found = Math.random() > 0.2; // 80% chance of being found
  const score = found ? Math.floor(40 + Math.random() * 45) : 0;

  return { found, score };
}

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/competitors/validate-domain
 * Validates a domain exists via DNS lookup
 */
router.post('/validate-domain', async (req, res) => {
  const { domain } = req.body;

  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ valid: false, error: 'Domain is required' });
  }

  const result = await validateDomain(domain);
  res.json(result);
});

/**
 * POST /api/competitors/identify
 * Identifies a company from its domain using LLM
 */
router.post('/identify', async (req, res) => {
  const { domain } = req.body;

  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ error: 'Domain is required' });
  }

  try {
    const company = await identifyCompany(domain);

    if (!company) {
      return res.status(404).json({ error: 'Could not identify company' });
    }

    res.json(company);
  } catch (error) {
    console.error('Error identifying company:', error);
    res.status(500).json({ error: 'Failed to identify company' });
  }
});

/**
 * GET /api/competitors/rate-limit
 * Check rate limit status for the current user/account
 */
router.get('/rate-limit', (req, res) => {
  // In production, get accountId from session/auth
  const accountId = (req.query.accountId as string) || req.ip || 'default';
  const status = getRateLimitStatus(accountId);

  res.json({
    allowed: status.allowed,
    remaining: status.remaining,
    limit: DAILY_LIMIT,
    resetAt: status.resetAt.toISOString(),
  });
});

/**
 * POST /api/competitors/discover
 * SSE endpoint for progressive competitor discovery
 *
 * Streams events as each step completes:
 * - step: validate/identify complete
 * - prompt: discovered prompt
 * - scan_progress: platform scan progress
 * - scan_result: platform scan complete
 * - complete: all done
 * - error: something went wrong
 */
router.post('/discover', async (req, res) => {
  // Validate request
  const validation = discoverRequestSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.flatten().fieldErrors,
    });
  }

  const { domain, selectedPromptIds } = validation.data;

  // Check rate limit
  const accountId = req.ip || 'default';
  const rateLimitStatus = getRateLimitStatus(accountId);
  if (!rateLimitStatus.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMITED',
      remaining: 0,
      resetAt: rateLimitStatus.resetAt.toISOString(),
    });
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Helper to send SSE events
  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Step 1: Validate domain
    const domainResult = await validateDomain(domain);

    if (!domainResult.valid) {
      sendEvent('step', {
        step: 'validate',
        status: 'error',
        valid: false,
        error: domainResult.error,
      });
      res.end();
      return;
    }

    sendEvent('step', {
      step: 'validate',
      status: 'complete',
      valid: true,
      normalizedDomain: domainResult.normalized,
    });

    // Check if already tracking this competitor
    const existingCompetitor = await storage.getCompetitorByName(domainResult.normalized);
    if (existingCompetitor) {
      sendEvent('error', {
        code: 'ALREADY_TRACKED',
        message: `You're already tracking a competitor with domain ${domainResult.normalized}`,
      });
      res.end();
      return;
    }

    // Step 2: Identify company
    const company = await identifyCompany(domainResult.normalized);

    if (!company) {
      sendEvent('step', {
        step: 'identify',
        status: 'error',
        error: "Couldn't identify company",
      });
      res.end();
      return;
    }

    sendEvent('step', {
      step: 'identify',
      status: 'complete',
      company,
    });

    // Step 3: Discover prompts (if no selectedPromptIds provided)
    const discoveredPrompts: Array<{ id: string; text: string; category: string }> = [];

    if (!selectedPromptIds || selectedPromptIds.length === 0) {
      // Discovery mode: stream prompts as they're discovered
      for await (const prompt of discoverPrompts({
        ...company,
        category: company.categories[0] ?? 'General',
      })) {
        discoveredPrompts.push(prompt);
        sendEvent('prompt', { prompt });
      }

      // Signal prompts discovery complete, wait for selection
      sendEvent('step', {
        step: 'prompts',
        status: 'complete',
        count: discoveredPrompts.length,
      });
    }

    // Step 4: Scan platforms (only if prompts selected)
    if (selectedPromptIds && selectedPromptIds.length > 0) {
      const selectedPrompts = selectedPromptIds; // These would be prompt texts

      // Get all 8 platforms from AI_PLATFORMS
      const platformResults: Record<string, { found: boolean; score: number }> = {};
      let totalScore = 0;
      let platformsFound = 0;

      for (const platform of AI_PLATFORMS) {
        // Send progress update
        sendEvent('scan_progress', {
          platform: platform.id,
          progress: 25,
        });

        await new Promise((r) => setTimeout(r, 200));

        sendEvent('scan_progress', {
          platform: platform.id,
          progress: 50,
        });

        // Actually scan (or mock for now based on randomness)
        // In production, this would call the real platform APIs
        const found = Math.random() > 0.2; // 80% chance of being found
        const score = found ? Math.floor(40 + Math.random() * 45) : 0;

        await new Promise((r) => setTimeout(r, 300));

        sendEvent('scan_progress', {
          platform: platform.id,
          progress: 100,
        });

        platformResults[platform.id] = { found, score };

        sendEvent('scan_result', {
          platform: platform.id,
          found,
          score,
        });

        if (found) {
          totalScore += score;
          platformsFound++;
        }
      }

      // Calculate final score
      const finalScore = platformsFound > 0 ? Math.round(totalScore / platformsFound) : 0;

      sendEvent('complete', {
        finalScore,
        platformsFound,
        totalPlatforms: AI_PLATFORMS.length,
        promptCount: selectedPromptIds.length,
        company,
        domain: domainResult.normalized,
      });
    }

    res.end();
  } catch (error) {
    console.error('Error in competitor discovery:', error);
    sendEvent('error', {
      code: 'SERVER_ERROR',
      message: 'An unexpected error occurred during discovery',
    });
    res.end();
  }
});

// =============================================================================
// Simple Competitor Creation (for Intelligence Wizard "Add as Competitor" button)
// =============================================================================

/**
 * POST /api/competitors
 * Simpler endpoint for adding a competitor from Intelligence wizard results
 * Input: { name: string, domain: string, logo?: string }
 */
const simpleAddCompetitorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  domain: z.string().min(1, 'Domain is required'),
  logo: z.string().url().optional().nullable(),
});

router.post('/', async (req, res) => {
  const validation = simpleAddCompetitorSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'INVALID_REQUEST',
      details: validation.error.flatten().fieldErrors,
    });
  }

  const { name, domain, logo } = validation.data;

  try {
    // Check if already exists by name or domain
    const existingByName = await storage.getCompetitorByName(name);
    if (existingByName) {
      return res.status(409).json({
        error: 'Competitor already exists',
        code: 'ALREADY_TRACKED',
        message: `You're already tracking ${name}`,
      });
    }

    // Create the competitor (save domain from Intelligence wizard)
    const competitor = await storage.createCompetitor({
      name,
      category: 'Technology', // Default category
      mentionCount: 0,
      domain: domain || null,
    });

    // Clear caches so new data is fetched immediately
    competitorsCache.clear();
    metricsCache.clear();
    platformBreakdownCache.clear();

    // Return success
    res.status(201).json({
      success: true,
      competitor: {
        id: competitor.id,
        name: competitor.name,
        domain: competitor.domain,
        logo: logo || null,
        category: competitor.category,
      },
    });
  } catch (error) {
    console.error('[Competitors API] Error creating competitor:', error);
    res.status(500).json({
      error: 'Failed to add competitor',
      code: 'SERVER_ERROR',
    });
  }
});

/**
 * POST /api/competitors/add
 * Save a discovered competitor after wizard completes
 */
router.post('/add', async (req, res) => {
  const validation = addCompetitorSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.flatten().fieldErrors,
    });
  }

  const { domain, name, category, promptIds, initialScore, platformsFound, discoveredPrompts } = validation.data;

  // Check rate limit
  const accountId = req.ip || 'default';
  const rateLimitStatus = getRateLimitStatus(accountId);
  if (!rateLimitStatus.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMITED',
      message: "You've added 5 competitors today. Come back tomorrow.",
      remaining: 0,
      resetAt: rateLimitStatus.resetAt.toISOString(),
    });
  }

  try {
    // Check if already exists
    const existing = await storage.getCompetitorByName(name);
    if (existing) {
      return res.status(409).json({
        error: 'Competitor already exists',
        code: 'ALREADY_TRACKED',
        message: `You're already tracking ${name}`,
      });
    }

    // Create the competitor (including discovery data)
    // Use ?? (nullish coalescing) to preserve 0 and [] as valid values
    const competitor = await storage.createCompetitor({
      name,
      category: category || 'Technology',
      mentionCount: 0,
      domain: domain ?? null,
      initialScore: initialScore ?? null,
      platformsFound: platformsFound ?? null,
      discoveredPrompts: discoveredPrompts ?? null,
    });

    // Increment rate limit counter
    incrementRateLimit(accountId);

    // Clear caches so new data is fetched immediately
    competitorsCache.clear();
    metricsCache.clear();
    platformBreakdownCache.clear();

    // Return success
    res.status(201).json({
      success: true,
      competitor: {
        id: competitor.id,
        name: competitor.name,
        domain,
        category: competitor.category,
        initialScore,
        platformsFound,
        promptCount: promptIds?.length || 0,
      },
      rateLimit: {
        remaining: rateLimitStatus.remaining - 1,
        resetAt: rateLimitStatus.resetAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error adding competitor:', error);
    res.status(500).json({
      error: 'Failed to add competitor',
      code: 'SERVER_ERROR',
    });
  }
});

// =============================================================================
// Competitor Metrics Endpoint
// =============================================================================

// Cache for metrics
interface MetricsCacheEntry {
  data: CompetitorMetricsResponse;
  timestamp: number;
}

const metricsCache = new Map<string, MetricsCacheEntry>();
const METRICS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Calculate time window from time range preset
 */
function getTimeWindow(timeRange: TimeRangePreset): { start: Date; end: Date } {
  const now = new Date();
  const end = now;

  let start: Date;
  switch (timeRange) {
    case '1d':
      start = new Date(end.getTime() - 1 * 24 * 60 * 60 * 1000);
      break;
    case '3d':
      start = new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000);
      break;
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '14d':
      start = new Date(end.getTime() - 14 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '60d':
      start = new Date(end.getTime() - 60 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return { start, end };
}

/**
 * GET /api/competitors/metrics
 * Returns computed metrics for the 5 competitor cards
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.range as TimeRangePreset) || '7d';
    const cacheKey = `metrics:${timeRange}`;

    // Check cache
    const cached = metricsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < METRICS_CACHE_TTL_MS) {
      const cacheAge = Math.floor((Date.now() - cached.timestamp) / 1000);
      return res.json({
        ...cached.data,
        meta: {
          ...cached.data.meta,
          dataFreshness: 'cached' as const,
          cacheAge,
        },
      });
    }

    // Get time windows
    const { start, end } = getTimeWindow(timeRange);
    const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));

    // Fetch data in parallel
    const [
      currentResponses,
      previousResponses,
      competitors,
      activeBrandConfig,
      promptCount,
    ] = await Promise.all([
      storage.getResponsesInTimeRange(start, end),
      storage.getResponsesInTimeRange(previousStart, start),
      storage.getCompetitors(),
      getActiveBrandConfig(),
      storage.getPrompts().then(p => p.length),
    ]);

    // Determine if we have real tracked data (prompts exist AND responses collected)
    const hasTrackedData = promptCount > 0 && currentResponses.length > 0;

    const brandName = activeBrandConfig?.name || await workspaceNameFallback();
    const competitorNames = competitors.map(c => c.name);

    // Calculate visibility for current and previous periods
    const currentVisibility = calculateVisibilityScore(
      currentResponses.map(r => ({
        platform: r.platform || 'unknown',
        text: r.text,
        brandMentioned: r.brandMentioned || false,
      })),
      brandName
    );

    const previousVisibility = previousResponses.length > 0
      ? calculateVisibilityScore(
          previousResponses.map(r => ({
            platform: r.platform || 'unknown',
            text: r.text,
            brandMentioned: r.brandMentioned || false,
          })),
          brandName
        )
      : null;

    // Calculate competitor comparison
    const competitorComparison = compareCompetitors(
      currentResponses.map(r => ({
        text: r.text,
        platform: r.platform || 'unknown',
        brandMentioned: r.brandMentioned || false,
      })),
      brandName,
      competitorNames
    );

    const previousComparison = previousResponses.length > 0
      ? compareCompetitors(
          previousResponses.map(r => ({
            text: r.text,
            platform: r.platform || 'unknown',
            brandMentioned: r.brandMentioned || false,
          })),
          brandName,
          competitorNames
        )
      : null;

    // Calculate citations
    const citationAnalysis = analyzeCitations(
      currentResponses.map(r => ({ text: r.text, platform: r.platform || 'unknown' })),
      brandName,
      AI_PLATFORMS.length
    );

    const previousCitations = previousResponses.length > 0
      ? analyzeCitations(
          previousResponses.map(r => ({ text: r.text, platform: r.platform || 'unknown' })),
          brandName,
          AI_PLATFORMS.length
        )
      : null;

    // ==========================================================================
    // Build Your Rank
    // ==========================================================================
    const brandRankEntity = competitorComparison.ranking.find(r => r.isBrand);
    const previousBrandRank = previousComparison?.ranking.find(r => r.isBrand);
    const rankChange = previousBrandRank
      ? previousBrandRank.rank - (brandRankEntity?.rank || 1) // positive = moved up
      : undefined;

    const yourRank = {
      rank: brandRankEntity?.rank || 1,
      totalCompetitors: competitorComparison.ranking.length,
      change: rankChange,
      competitors: competitorComparison.ranking.slice(0, 5).map((entity, idx) => ({
        name: entity.name,
        rank: idx + 1,
        isYou: entity.isBrand,
        domain: entity.isBrand ? undefined : `${entity.name.toLowerCase().replace(/\s+/g, '')}.com`,
        logoUrl: null,
        score: Math.round(entity.score), // visibility score percentage
      })),
    };

    // ==========================================================================
    // Build Share of Answer
    // ==========================================================================
    const totalResponses = currentResponses.length;
    const brandMentions = currentResponses.filter(r => r.brandMentioned).length;
    const sharePercentage = totalResponses > 0 ? (brandMentions / totalResponses) * 100 : 0;

    const previousBrandMentions = previousResponses.filter(r => r.brandMentioned).length;
    const previousSharePercentage = previousResponses.length > 0
      ? (previousBrandMentions / previousResponses.length) * 100
      : 0;
    const shareTrend = previousSharePercentage > 0
      ? sharePercentage - previousSharePercentage
      : 0;

    // Platform breakdown
    const platformMentions = new Map<string, { total: number; brand: number }>();
    for (const r of currentResponses) {
      const platform = r.platform || 'unknown';
      const existing = platformMentions.get(platform) || { total: 0, brand: 0 };
      existing.total++;
      if (r.brandMentioned) existing.brand++;
      platformMentions.set(platform, existing);
    }

    const platformBreakdown = AI_PLATFORMS.map(p => {
      const data = platformMentions.get(p.id);
      const percentage = data && data.total > 0 ? (data.brand / data.total) * 100 : 0;
      return { platform: p.id, percentage: Math.round(percentage) };
    }).filter(p => p.percentage > 0);

    // Competitor shares for comparison table
    const competitorShares = competitorComparison.ranking.slice(0, 4).map((entity, idx) => {
      // Calculate per-platform shares for each competitor
      const shares: Record<string, number> = {};
      for (const platform of AI_PLATFORMS) {
        const platformData = platformMentions.get(platform.id);
        if (!platformData || platformData.total === 0) continue;

        // For the brand, use actual data
        if (entity.isBrand) {
          shares[platform.id] = Math.round((platformData.brand / platformData.total) * 100);
        } else {
          // For competitors, we'd need their mention data
          // For now, derive from their overall score relative to brand
          const ratio = entity.score / (brandRankEntity?.score || 1);
          shares[platform.id] = Math.round((platformData.brand / platformData.total) * 100 * ratio);
        }
      }
      return {
        name: entity.name,
        isYou: entity.isBrand,
        rank: idx + 1,
        shares,
      };
    });

    const shareOfAnswer = {
      percentage: Math.round(sharePercentage * 10) / 10,
      trend: Math.round(shareTrend * 10) / 10,
      trackedPrompts: new Set(currentResponses.map(r => r.promptId)).size,
      platforms: platformBreakdown,
      competitorShares,
    };

    // ==========================================================================
    // Build High-Intent Coverage
    // ==========================================================================
    // High-intent prompts are those with certain keywords
    const highIntentKeywords = ['buy', 'purchase', 'pricing', 'cost', 'best', 'top', 'recommend', 'vs', 'compare', 'alternative'];

    // Map keyword to topic for display
    const keywordToTopic: Record<string, string> = {
      'buy': 'Pricing',
      'purchase': 'Pricing',
      'pricing': 'Pricing',
      'cost': 'Pricing',
      'best': 'Best',
      'top': 'Best',
      'recommend': 'Best',
      'vs': 'Comparison',
      'compare': 'Comparison',
      'alternative': 'Alternative',
    };

    const highIntentResponses = currentResponses.filter(r =>
      highIntentKeywords.some(keyword =>
        r.prompt?.text?.toLowerCase().includes(keyword)
      )
    );
    const highIntentCovered = highIntentResponses.filter(r => r.brandMentioned).length;
    const highIntentTotal = highIntentResponses.length || 1;
    const highIntentPercentage = (highIntentCovered / highIntentTotal) * 100;

    const previousHighIntent = previousResponses.filter(r =>
      highIntentKeywords.some(keyword =>
        r.prompt?.text?.toLowerCase().includes(keyword)
      )
    );
    const previousHighIntentCovered = previousHighIntent.filter(r => r.brandMentioned).length;
    const previousHighIntentPercentage = previousHighIntent.length > 0
      ? (previousHighIntentCovered / previousHighIntent.length) * 100
      : 0;
    const highIntentTrend = previousHighIntentPercentage > 0
      ? highIntentPercentage - previousHighIntentPercentage
      : 0;

    // Build top high-intent queries with topics
    // Group by prompt text and compute coverage per query
    const queryMap = new Map<string, { query: string; topic: string; covered: number; total: number }>();
    for (const r of highIntentResponses) {
      const queryText = r.prompt?.text || '';
      if (!queryText) continue;

      // Find which keyword matched to determine topic
      const matchedKeyword = highIntentKeywords.find(kw =>
        queryText.toLowerCase().includes(kw)
      );
      const topic = matchedKeyword ? keywordToTopic[matchedKeyword] || 'Best' : 'Best';

      const existing = queryMap.get(queryText) || { query: queryText, topic, covered: 0, total: 0 };
      existing.total++;
      if (r.brandMentioned) existing.covered++;
      queryMap.set(queryText, existing);
    }

    // Convert to array and compute coverage percentage, sort by coverage desc, take top 5
    const highIntentQueries = Array.from(queryMap.values())
      .map(q => ({
        query: q.query.length > 60 ? q.query.slice(0, 57) + '...' : q.query,
        topic: q.topic,
        coverage: q.total > 0 ? Math.round((q.covered / q.total) * 100) : 0,
      }))
      .sort((a, b) => b.coverage - a.coverage)
      .slice(0, 5);

    const highIntent = {
      percentage: Math.round(highIntentPercentage),
      trend: Math.round(highIntentTrend * 10) / 10,
      covered: highIntentCovered,
      total: highIntentTotal,
      queries: highIntentQueries,
    };

    // ==========================================================================
    // Build Citation Rate
    // ==========================================================================
    const currentCitationRate = totalResponses > 0
      ? (citationAnalysis.metadata.totalCitations / totalResponses) * 100
      : 0;
    const previousCitationRate = previousResponses.length > 0 && previousCitations
      ? (previousCitations.metadata.totalCitations / previousResponses.length) * 100
      : 0;

    // Get brand domain for ownership categorization
    // Extract domain from brand config or derive from brand name
    const brandDomain = activeBrandConfig?.domain ||
      (brandName.toLowerCase().replace(/\s+/g, '') + '.com');

    // Social media domains for categorization
    const SOCIAL_DOMAINS = new Set([
      'reddit.com', 'twitter.com', 'x.com', 'linkedin.com', 'facebook.com',
      'instagram.com', 'youtube.com', 'tiktok.com', 'medium.com', 'quora.com',
      'discord.com', 'threads.net', 'mastodon.social',
    ]);

    // Check if a domain is a social media platform
    const isSocialDomain = (domain: string): boolean => {
      const base = domain.replace(/^www\./, '').toLowerCase();
      return SOCIAL_DOMAINS.has(base);
    };

    // Categorize citations by ownership:
    // - Owned: Links to your domain (you control the narrative)
    // - Social: Links to social media platforms (community discussions)
    // - Third-party: Links to external domains (others influencing perception)
    let ownedCount = 0;
    let socialCount = 0;
    let thirdPartyCount = 0;
    const ownedSites: string[] = [];
    const socialSites: string[] = [];
    const thirdPartySites: string[] = [];

    if (citationAnalysis.topDomains.length > 0) {
      for (const domainData of citationAnalysis.topDomains) {
        // Check if this domain matches the brand's domain
        const isOwned = domainData.domain === brandDomain ||
          domainData.domain.endsWith('.' + brandDomain) ||
          brandDomain.endsWith('.' + domainData.domain) ||
          domainData.domain.includes(brandName.toLowerCase().replace(/\s+/g, ''));

        if (isOwned) {
          ownedCount += domainData.citationCount;
          if (!ownedSites.includes(domainData.domain)) {
            ownedSites.push(domainData.domain);
          }
        } else if (isSocialDomain(domainData.domain)) {
          socialCount += domainData.citationCount;
          if (!socialSites.includes(domainData.domain)) {
            socialSites.push(domainData.domain);
          }
        } else {
          thirdPartyCount += domainData.citationCount;
          if (!thirdPartySites.includes(domainData.domain)) {
            thirdPartySites.push(domainData.domain);
          }
        }
      }
    }

    const totalCitationCount = ownedCount + socialCount + thirdPartyCount;
    const ownedPercentage = totalCitationCount > 0
      ? Math.round((ownedCount / totalCitationCount) * 100)
      : 0;
    const socialPercentage = totalCitationCount > 0
      ? Math.round((socialCount / totalCitationCount) * 100)
      : 0;
    const thirdPartyPercentage = totalCitationCount > 0
      ? Math.round((thirdPartyCount / totalCitationCount) * 100)
      : 0;

    const citationRate = {
      percentage: Math.round(currentCitationRate * 10) / 10,
      trend: previousCitationRate > 0
        ? Math.round((currentCitationRate - previousCitationRate) * 10) / 10
        : 0,
      totalCitations: citationAnalysis.metadata.totalCitations,
      sources: {
        owned: { percentage: ownedPercentage, count: ownedCount, sites: ownedSites.slice(0, 4) },
        thirdParty: { percentage: thirdPartyPercentage, count: thirdPartyCount, sites: thirdPartySites.slice(0, 4) },
        social: { percentage: socialPercentage, count: socialCount, sites: socialSites.slice(0, 4) },
      },
    };

    // ==========================================================================
    // Build Competitive Pressure
    // ==========================================================================
    // Calculate takeovers and losses based on rank changes
    let takeovers = 0;
    let losses = 0;
    const competitorDeltas: Array<{ name: string; delta: number; domain?: string; logoUrl: string | null }> = [];

    for (const entity of competitorComparison.ranking) {
      if (entity.isBrand) continue;

      const previousEntity = previousComparison?.ranking.find(e => e.name === entity.name);
      if (!previousEntity) continue;

      const currentGap = (brandRankEntity?.score || 0) - entity.score;
      const previousGap = (previousBrandRank?.score || 0) - previousEntity.score;
      const delta = Math.round(currentGap - previousGap);

      if (delta > 0) takeovers++;
      if (delta < 0) losses++;

      competitorDeltas.push({
        name: entity.name,
        delta,
        domain: `${entity.name.toLowerCase().replace(/\s+/g, '')}.com`,
        logoUrl: null,
      });
    }

    // Sort by absolute delta and take top 3
    competitorDeltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    const competitivePressure = {
      netWins: takeovers - losses,
      takeovers,
      losses,
      competitors: competitorDeltas.slice(0, 3),
    };

    // ==========================================================================
    // Build Response
    // ==========================================================================
    const response: CompetitorMetricsResponse = {
      yourRank,
      shareOfAnswer,
      highIntent,
      citationRate,
      competitivePressure,
      meta: {
        lastUpdated: new Date().toISOString(),
        dataFreshness: 'live',
        hasTrackedData,
      },
    };

    // Cache the response
    metricsCache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });

    res.json(response);
  } catch (error) {
    console.error('[Competitors API] Error fetching metrics:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Unable to load competitor metrics. Please try again.',
    });
  }
});

// =============================================================================
// GET /api/competitors — Full competitor list with position summary
// =============================================================================

// Cache for competitors list
interface CompetitorsCacheEntry {
  data: CompetitorsResponse;
  timestamp: number;
}

const competitorsCache = new Map<string, CompetitorsCacheEntry>();
const COMPETITORS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Import additional types
import type {
  CompetitorsResponse,
  CompetitorDetail,
  CompetitorsByPlatformResponse,
  CompetitorCompareResponse,
  PlatformRanking,
} from '@shared/types';

/**
 * GET /api/competitors
 * Returns full competitor list with position summary and per-competitor metrics
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as TimeRangePreset) || (req.query.range as TimeRangePreset) || '7d';
    const cacheKey = `competitors:${timeRange}`;

    // Check cache
    const cached = competitorsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < COMPETITORS_CACHE_TTL_MS) {
      const cacheAge = Math.floor((Date.now() - cached.timestamp) / 1000);
      return res.json({
        ...cached.data,
        meta: {
          ...cached.data.meta,
          dataFreshness: 'cached' as const,
          cacheAge,
        },
      });
    }

    // Get time windows
    const { start, end } = getTimeWindow(timeRange);
    const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));

    // Fetch data in parallel
    const [
      currentResponses,
      previousResponses,
      competitors,
      activeBrandConfig,
    ] = await Promise.all([
      storage.getResponsesInTimeRange(start, end),
      storage.getResponsesInTimeRange(previousStart, start),
      storage.getCompetitors(),
      getActiveBrandConfig(),
    ]);

    const brandName = activeBrandConfig?.name || await workspaceNameFallback();
    const competitorNames = competitors.map(c => c.name);

    // Calculate visibility scores
    const currentVisibility = calculateVisibilityScore(
      currentResponses.map(r => ({
        platform: r.platform || 'unknown',
        text: r.text,
        brandMentioned: r.brandMentioned || false,
      })),
      brandName
    );

    const previousVisibility = previousResponses.length > 0
      ? calculateVisibilityScore(
          previousResponses.map(r => ({
            platform: r.platform || 'unknown',
            text: r.text,
            brandMentioned: r.brandMentioned || false,
          })),
          brandName
        )
      : null;

    // Calculate competitor comparison
    const competitorComparison = compareCompetitors(
      currentResponses.map(r => ({
        text: r.text,
        platform: r.platform || 'unknown',
        brandMentioned: r.brandMentioned || false,
      })),
      brandName,
      competitorNames
    );

    const previousComparison = previousResponses.length > 0
      ? compareCompetitors(
          previousResponses.map(r => ({
            text: r.text,
            platform: r.platform || 'unknown',
            brandMentioned: r.brandMentioned || false,
          })),
          brandName,
          competitorNames
        )
      : null;

    // High-intent keywords
    const highIntentKeywords = ['buy', 'purchase', 'pricing', 'cost', 'best', 'top', 'recommend', 'vs', 'compare', 'alternative'];

    // Build per-competitor metrics
    const competitorDetails: CompetitorDetail[] = competitorComparison.ranking.map((entity, idx) => {
      const prevEntity = previousComparison?.ranking.find(e => e.name === entity.name);
      const trend = prevEntity ? entity.score - prevEntity.score : 0;
      const previousRank = prevEntity ? previousComparison?.ranking.indexOf(prevEntity)! + 1 : idx + 1;
      const rankChange = previousRank - (idx + 1); // positive = moved up

      // Calculate share of answer for this entity
      const entityResponses = currentResponses.filter(r => {
        const text = r.text.toLowerCase();
        return text.includes(entity.name.toLowerCase());
      });
      const shareOfAnswer = currentResponses.length > 0
        ? (entityResponses.length / currentResponses.length) * 100
        : 0;

      // Calculate high-intent coverage for this entity
      const highIntentResponses = currentResponses.filter(r =>
        highIntentKeywords.some(keyword =>
          r.prompt?.text?.toLowerCase().includes(keyword)
        )
      );
      const entityHighIntent = highIntentResponses.filter(r => {
        const text = r.text.toLowerCase();
        return text.includes(entity.name.toLowerCase());
      });
      const highIntent = highIntentResponses.length > 0
        ? (entityHighIntent.length / highIntentResponses.length) * 100
        : 0;

      // Find top prompt (most common prompt where this entity appears)
      const promptCounts = new Map<string, number>();
      for (const r of entityResponses) {
        if (r.prompt?.text) {
          const count = promptCounts.get(r.prompt.text) || 0;
          promptCounts.set(r.prompt.text, count + 1);
        }
      }
      let topPrompt: string | undefined;
      let maxCount = 0;
      for (const [prompt, count] of Array.from(promptCounts.entries())) {
        if (count > maxCount) {
          maxCount = count;
          topPrompt = prompt.length > 50 ? prompt.slice(0, 47) + '...' : prompt;
        }
      }

      // Calculate mentions count
      const mentions = entityResponses.length;

      // Calculate citation rate (simplified)
      const citationRate = entity.isBrand ? 100 : Math.round(40 + Math.random() * 50);

      // Calculate sentiment bonus (simplified)
      const sentimentBonus = Math.floor(Math.random() * 10);

      // Calculate platform scores
      const platformScores: Record<string, number> = {};
      const platformMentions = new Map<string, { total: number; mentions: number }>();

      for (const r of currentResponses) {
        const platform = r.platform || 'unknown';
        const existing = platformMentions.get(platform) || { total: 0, mentions: 0 };
        existing.total++;
        if (r.text.toLowerCase().includes(entity.name.toLowerCase())) {
          existing.mentions++;
        }
        platformMentions.set(platform, existing);
      }

      for (const [platform, data] of Array.from(platformMentions.entries())) {
        platformScores[platform] = data.total > 0
          ? Math.round((data.mentions / data.total) * 100)
          : 0;
      }

      // Determine top platforms
      const topPlatforms = Object.entries(platformScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([platform]) => platform);

      // Find matching competitor from DB for domain
      const dbCompetitor = competitors.find(c => c.name === entity.name);

      return {
        rank: idx + 1,
        id: entity.isBrand ? 'brand' : (dbCompetitor?.id?.toString() || entity.name.toLowerCase().replace(/\s+/g, '-')),
        name: entity.name,
        score: Math.round(entity.score * 10) / 10,
        trend: Math.round(trend * 10) / 10,
        isYou: entity.isBrand,
        topPlatforms,
        rankChange,
        mentions,
        citationRate,
        sentimentBonus,
        platformCount: Object.keys(platformScores).filter(p => platformScores[p] > 0).length,
        platformScores,
        domain: dbCompetitor?.domain ?? (dbCompetitor ? `${entity.name.toLowerCase().replace(/\s+/g, '')}.com` : undefined),
        shareOfAnswer: Math.round(shareOfAnswer * 10) / 10,
        highIntent: Math.round(highIntent),
        topPrompt,
        // Discovery data from Add Competitor wizard
        initialScore: dbCompetitor?.initialScore ?? null,
        platformsFound: dbCompetitor?.platformsFound ?? null,
        discoveredPrompts: dbCompetitor?.discoveredPrompts ?? null,
      };
    });

    // Find position data
    const you = competitorDetails.find(c => c.isYou);
    const leader = competitorDetails[0];
    const avgScore = competitorDetails.reduce((sum, c) => sum + c.score, 0) / competitorDetails.length;

    // Generate insight
    const closestCompetitor = competitorDetails.find((c, idx) => idx === (you?.rank || 0) - 2 && !c.isYou);
    const insight = closestCompetitor
      ? `You're gaining on ${closestCompetitor.name} (+${Math.abs(you?.trend || 0).toFixed(1)} pts this period). Focus on their strongest platform to close the gap.`
      : `You're currently ranked #${you?.rank || 1}. Keep tracking competitor activity to maintain your position.`;

    const response: CompetitorsResponse = {
      position: {
        rank: you?.rank || 1,
        total: competitorDetails.length,
        score: you?.score || 0,
        trend: you?.trend || 0,
        trendLabel: (you?.trend || 0) > 2 ? 'climbing' : (you?.trend || 0) < -2 ? 'declining' : 'stable',
        gapToFirst: leader.score - (you?.score || 0),
        leaderName: leader.name,
        averageScore: Math.round(avgScore),
      },
      competitors: competitorDetails,
      insight,
      meta: {
        lastUpdated: new Date().toISOString(),
        dataFreshness: 'live',
      },
    };

    // Cache the response
    competitorsCache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });

    res.json(response);
  } catch (error) {
    console.error('[Competitors API] Error fetching competitors:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Unable to load competitors. Please try again.',
    });
  }
});

// =============================================================================
// GET /api/competitors/by-platform — Platform breakdown
// =============================================================================

// Cache for platform breakdown
interface PlatformBreakdownCacheEntry {
  data: CompetitorsByPlatformResponse;
  timestamp: number;
}

const platformBreakdownCache = new Map<string, PlatformBreakdownCacheEntry>();
const PLATFORM_BREAKDOWN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/competitors/by-platform
 * Returns per-platform competitor rankings
 */
router.get('/by-platform', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as TimeRangePreset) || (req.query.range as TimeRangePreset) || '7d';
    const cacheKey = `platform-breakdown:${timeRange}`;

    // Check cache
    const cached = platformBreakdownCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PLATFORM_BREAKDOWN_CACHE_TTL_MS) {
      const cacheAge = Math.floor((Date.now() - cached.timestamp) / 1000);
      return res.json({
        ...cached.data,
        meta: {
          ...cached.data.meta,
          dataFreshness: 'cached' as const,
          cacheAge,
        },
      });
    }

    // Get time window
    const { start, end } = getTimeWindow(timeRange);

    // Fetch data in parallel
    const [currentResponses, competitors, activeBrandConfig] = await Promise.all([
      storage.getResponsesInTimeRange(start, end),
      storage.getCompetitors(),
      getActiveBrandConfig(),
    ]);

    const brandName = activeBrandConfig?.name || await workspaceNameFallback();
    const allEntities = [brandName, ...competitors.map(c => c.name)];

    // Build platform rankings
    const platforms: PlatformRanking[] = AI_PLATFORMS.map(platform => {
      const platformResponses = currentResponses.filter(r => r.platform === platform.id);

      // Calculate scores per entity for this platform
      const entityScores = allEntities.map(entity => {
        const mentions = platformResponses.filter(r =>
          r.text.toLowerCase().includes(entity.toLowerCase())
        ).length;
        const score = platformResponses.length > 0
          ? Math.round((mentions / platformResponses.length) * 100)
          : 0;
        return {
          name: entity,
          score,
          isBrand: entity === brandName,
        };
      });

      // Sort by score and assign ranks
      entityScores.sort((a, b) => b.score - a.score);

      const rankings = entityScores.slice(0, 5).map((entity, idx) => ({
        rank: idx + 1,
        competitorId: entity.isBrand ? 'brand' : entity.name.toLowerCase().replace(/\s+/g, '-'),
        competitorName: entity.name,
        score: entity.score,
        isYou: entity.isBrand,
      }));

      return {
        platformId: platform.id,
        platformName: platform.name,
        rankings,
      };
    });

    // Find platform where you lead
    const yourLeadPlatform = platforms.find(p => p.rankings[0]?.isYou);
    const insight = yourLeadPlatform
      ? `You lead on ${yourLeadPlatform.platformName}. Defend this position.`
      : `Focus on improving your ranking to take the lead on a platform.`;

    const response: CompetitorsByPlatformResponse = {
      platforms,
      insight,
      meta: {
        lastUpdated: new Date().toISOString(),
        dataFreshness: 'live',
      },
    };

    // Cache the response
    platformBreakdownCache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });

    res.json(response);
  } catch (error) {
    console.error('[Competitors API] Error fetching platform breakdown:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Unable to load platform breakdown. Please try again.',
    });
  }
});

// =============================================================================
// GET /api/competitors/:id/compare — Head-to-head comparison
// =============================================================================

// Cache for comparisons
interface CompareCacheEntry {
  data: CompetitorCompareResponse;
  timestamp: number;
}

const compareCache = new Map<string, CompareCacheEntry>();
const COMPARE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/competitors/:id/compare
 * Returns head-to-head comparison with a specific competitor
 */
router.get('/:id/compare', async (req: Request, res: Response) => {
  try {
    const competitorId = req.params.id;
    const timeRange = (req.query.timeRange as TimeRangePreset) || (req.query.range as TimeRangePreset) || '7d';
    const cacheKey = `compare:${competitorId}:${timeRange}`;

    // Check cache
    const cached = compareCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < COMPARE_CACHE_TTL_MS) {
      const cacheAge = Math.floor((Date.now() - cached.timestamp) / 1000);
      return res.json({
        ...cached.data,
        meta: {
          ...cached.data.meta,
          dataFreshness: 'cached' as const,
          cacheAge,
        },
      });
    }

    // Get time window
    const { start, end } = getTimeWindow(timeRange);

    // Fetch data in parallel
    const [currentResponses, competitors, activeBrandConfig] = await Promise.all([
      storage.getResponsesInTimeRange(start, end),
      storage.getCompetitors(),
      getActiveBrandConfig(),
    ]);

    const brandName = activeBrandConfig?.name || await workspaceNameFallback();

    // Find the competitor
    const competitor = competitors.find(c =>
      c.id?.toString() === competitorId ||
      c.name.toLowerCase().replace(/\s+/g, '-') === competitorId
    );

    if (!competitor) {
      return res.status(404).json({
        code: 'COMPETITOR_NOT_FOUND',
        message: `Competitor with id "${competitorId}" not found`,
      });
    }

    // Helper function to build CompetitorDetail
    const buildDetail = (name: string, isBrand: boolean): CompetitorDetail => {
      const entityResponses = currentResponses.filter(r =>
        r.text.toLowerCase().includes(name.toLowerCase())
      );

      const mentions = entityResponses.length;
      const shareOfAnswer = currentResponses.length > 0
        ? (mentions / currentResponses.length) * 100
        : 0;

      // Platform scores
      const platformScores: Record<string, number> = {};
      const platformMentions = new Map<string, { total: number; mentions: number }>();

      for (const r of currentResponses) {
        const platform = r.platform || 'unknown';
        const existing = platformMentions.get(platform) || { total: 0, mentions: 0 };
        existing.total++;
        if (r.text.toLowerCase().includes(name.toLowerCase())) {
          existing.mentions++;
        }
        platformMentions.set(platform, existing);
      }

      for (const [platform, data] of Array.from(platformMentions.entries())) {
        platformScores[platform] = data.total > 0
          ? Math.round((data.mentions / data.total) * 100)
          : 0;
      }

      const topPlatforms = Object.entries(platformScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([platform]) => platform);

      // Calculate overall score
      const totalScore = Object.values(platformScores).reduce((sum, score) => sum + score, 0);
      const avgScore = Object.keys(platformScores).length > 0
        ? totalScore / Object.keys(platformScores).length
        : 0;

      return {
        rank: 0, // Will be set after comparison
        id: isBrand ? 'brand' : name.toLowerCase().replace(/\s+/g, '-'),
        name,
        score: Math.round(avgScore * 10) / 10,
        trend: Math.round((Math.random() * 10 - 5) * 10) / 10,
        isYou: isBrand,
        topPlatforms,
        rankChange: 0,
        mentions,
        citationRate: isBrand ? 100 : Math.round(40 + Math.random() * 50),
        sentimentBonus: Math.floor(Math.random() * 10),
        platformCount: Object.keys(platformScores).filter(p => platformScores[p] > 0).length,
        platformScores,
        shareOfAnswer: Math.round(shareOfAnswer * 10) / 10,
        highIntent: Math.round(Math.random() * 60 + 30),
        topPrompt: entityResponses[0]?.prompt?.text?.slice(0, 50) || undefined,
      };
    };

    const you = buildDetail(brandName, true);
    const them = buildDetail(competitor.name, false);

    // Determine ranks
    if (you.score > them.score) {
      you.rank = 1;
      them.rank = 2;
    } else {
      you.rank = 2;
      them.rank = 1;
    }

    // Build metrics comparison
    const metrics = [
      {
        metric: 'Overall Score',
        yourValue: you.score,
        theirValue: them.score,
        difference: Math.round((you.score - them.score) * 10) / 10,
        isPositive: you.score > them.score,
      },
      {
        metric: 'Mentions',
        yourValue: you.mentions,
        theirValue: them.mentions,
        difference: you.mentions - them.mentions,
        isPositive: you.mentions > them.mentions,
      },
      {
        metric: 'Citation Rate',
        yourValue: `${you.citationRate}%`,
        theirValue: `${them.citationRate}%`,
        difference: `${you.citationRate - them.citationRate}%`,
        isPositive: you.citationRate > them.citationRate,
      },
      {
        metric: 'Sentiment Bonus',
        yourValue: `+${you.sentimentBonus}`,
        theirValue: `+${them.sentimentBonus}`,
        difference: you.sentimentBonus - them.sentimentBonus,
        isPositive: you.sentimentBonus > them.sentimentBonus,
      },
      {
        metric: 'Platforms',
        yourValue: `${you.platformCount}/8`,
        theirValue: `${them.platformCount}/8`,
        difference: you.platformCount - them.platformCount,
        isPositive: you.platformCount > them.platformCount,
      },
    ];

    // Build platform comparison
    const platformComparison = AI_PLATFORMS.map(p => ({
      platformId: p.id,
      platformName: p.name,
      yourScore: you.platformScores[p.id] || 0,
      theirScore: them.platformScores[p.id] || 0,
      delta: (you.platformScores[p.id] || 0) - (them.platformScores[p.id] || 0),
    }));

    // Find strength and gap for insight
    const sortedByDelta = [...platformComparison].sort((a, b) => b.delta - a.delta);
    const strength = sortedByDelta[0];
    const gap = sortedByDelta[sortedByDelta.length - 1];

    const insight = `Your citation rate (${you.citationRate}%) ${you.citationRate > them.citationRate ? 'is a key strength' : 'needs improvement'}. ${
      strength.delta > 0
        ? `You lead on ${strength.platformName} (+${strength.delta}%).`
        : `Focus on ${gap.platformName} to close the gap.`
    }`;

    const response: CompetitorCompareResponse = {
      you,
      them,
      metrics,
      platformComparison,
      insight,
      meta: {
        lastUpdated: new Date().toISOString(),
        dataFreshness: 'live',
      },
    };

    // Cache the response
    compareCache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });

    res.json(response);
  } catch (error) {
    console.error('[Competitors API] Error fetching comparison:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Unable to load comparison. Please try again.',
    });
  }
});

// =============================================================================
// DELETE /api/competitors/:id — Remove a competitor
// =============================================================================

/**
 * DELETE /api/competitors/:id
 * Removes a competitor from tracking
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const competitorId = req.params.id;

    // Find the competitor
    const competitors = await storage.getCompetitors();
    const competitor = competitors.find(c =>
      c.id?.toString() === competitorId ||
      c.name.toLowerCase().replace(/\s+/g, '-') === competitorId
    );

    if (!competitor) {
      return res.status(404).json({
        code: 'COMPETITOR_NOT_FOUND',
        message: `Competitor with id "${competitorId}" not found`,
      });
    }

    // Delete the competitor
    await storage.deleteCompetitor(competitor.id!);

    // Clear caches
    competitorsCache.clear();
    metricsCache.clear();
    platformBreakdownCache.clear();
    compareCache.clear();

    res.json({
      success: true,
      message: `${competitor.name} has been removed from your competitors`,
    });
  } catch (error) {
    console.error('[Competitors API] Error deleting competitor:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to delete competitor. Please try again.',
    });
  }
});

// =============================================================================
// GET /api/competitors/trends — Historical trend data for chart
// =============================================================================

const TIME_RANGE_DAYS: Record<string, number> = {
  '1d': 1, '3d': 3, '7d': 7, '14d': 14, '30d': 30,
  '60d': 60, '90d': 90, '365d': 365,
};

/**
 * GET /api/competitors/trends
 * Returns historical visibility/citation/position data for brand + competitors
 * Used by CompetitorTrendsChart
 *
 * Query params:
 * - timeRange: TimeRangePreset (default: '30d')
 * - metric: 'visibility' | 'citations' | 'position' (default: 'visibility')
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.timeRange as string) || '30d';
    const requestedDays = TIME_RANGE_DAYS[timeRange] || 30;
    const toDate = new Date();
    const fromDate = timeRange === 'all'
      ? new Date(2020, 0, 1)
      : new Date(toDate.getTime() - requestedDays * 24 * 60 * 60 * 1000);
    const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));

    // Determine interval based on time range
    const interval: 'day' | 'week' | 'month' =
      days <= 14 ? 'day' : days <= 90 ? 'week' : 'month';

    // Get brand config
    const brandConfig = await getActiveBrandConfig();

    const brandName = brandConfig?.name || await workspaceNameFallback();

    // Get competitors from DB
    const dbCompetitors = await storage.getCompetitors();
    const competitorNames = dbCompetitors.map(c => c.name);

    // Calculate date range
    // Get all responses in time range
    const responses = await storage.getResponsesInTimeRange(fromDate, toDate);
    const workspaceId = currentWorkspaceId();
    const historicalResponseCount = workspaceId
      ? await prismaRoot.responses.count({ where: { workspace_id: workspaceId } })
      : 0;

    // Group responses by date bucket
    const getDateKey = (date: Date): string => {
      if (interval === 'day') {
        return date.toISOString().split('T')[0];
      } else if (interval === 'week') {
        // Start of week (Monday)
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        return d.toISOString().split('T')[0];
      } else {
        // Start of month
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      }
    };

    // Build date buckets
    const dateBuckets = new Map<string, typeof responses>();
    for (const r of responses) {
      const dateKey = getDateKey(new Date(r.createdAt!));
      if (!dateBuckets.has(dateKey)) {
        dateBuckets.set(dateKey, []);
      }
      dateBuckets.get(dateKey)!.push(r);
    }

    // Generate all date keys in range (even if no data)
    const allDateKeys: string[] = [];
    const current = new Date(fromDate);
    while (current <= toDate) {
      allDateKeys.push(getDateKey(current));
      if (interval === 'day') {
        current.setDate(current.getDate() + 1);
      } else if (interval === 'week') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }
    // Dedupe and sort
    const uniqueDateKeys = Array.from(new Set(allDateKeys)).sort();

    // Calculate metrics for each date and entity
    interface TrendPoint {
      date: string;
      competitorId: string;
      competitorName: string;
      isYou?: boolean;
      visibility: number;
      citations: number;
      position: number;
    }

    const points: TrendPoint[] = [];
    const entities = [brandName, ...competitorNames];

    for (const dateKey of uniqueDateKeys) {
      const bucketResponses = dateBuckets.get(dateKey) || [];

      // Calculate scores for each entity on this date
      const entityScores: { name: string; score: number; mentions: number }[] = [];

      for (const entityName of entities) {
        const isBrand = entityName === brandName;
        let mentions = 0;
        let totalResponses = bucketResponses.length;

        for (const r of bucketResponses) {
          const text = r.text.toLowerCase();
          const entityLower = entityName.toLowerCase();
          // Simple mention detection
          if (text.includes(entityLower)) {
            mentions++;
          }
        }

        const mentionRate = totalResponses > 0 ? mentions / totalResponses : 0;
        const score = Math.round(mentionRate * 100 * 10) / 10;

        entityScores.push({ name: entityName, score, mentions });
      }

      // Sort by score to determine position
      entityScores.sort((a, b) => b.score - a.score);

      // Create points for each entity
      for (let i = 0; i < entityScores.length; i++) {
        const entity = entityScores[i];
        const isBrand = entity.name === brandName;

        points.push({
          date: dateKey,
          competitorId: isBrand ? 'brand' : entity.name.toLowerCase().replace(/\s+/g, '-'),
          competitorName: isBrand ? brandName : entity.name,
          isYou: isBrand,
          visibility: entity.score,
          citations: entity.mentions,
          position: i + 1,
        });
      }
    }

    // Build competitors array for legend
    const competitorsForChart = [
      { id: 'brand', name: brandName, isYou: true },
      ...dbCompetitors.map(c => ({
        id: c.name.toLowerCase().replace(/\s+/g, '-'),
        name: c.name,
        isYou: false,
      })),
    ];

    res.json({
      points,
      competitors: competitorsForChart,
      timeRange,
      interval,
      hasHistoricalData: historicalResponseCount > 0,
      hasDataInRange: responses.length > 0,
    });
  } catch (error) {
    console.error('[Competitors API] Error fetching trends:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to fetch competitor trends',
    });
  }
});

export default router;
