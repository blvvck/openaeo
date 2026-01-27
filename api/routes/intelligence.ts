/**
 * Intelligence API Routes
 *
 * Endpoints for Intelligence wizard:
 * - POST /api/intelligence/brand — Step 2: Fetch brand profile from URL
 * - POST /api/intelligence/competitors — Step 3: Suggest competitors
 * - POST /api/intelligence/prompts — Step 4: Generate customer prompts
 * - POST /api/intelligence/research — Step 5: Run full research (THE BIG ONE)
 * - POST /api/intelligence/analyze — Legacy: Single LLM call for all steps
 * - GET /api/intelligence/recent — Recent searches
 * - POST /api/intelligence/searches — Save search
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { currentWorkspaceId } from '../context/workspace-context';
import { getActiveBrandConfig } from '../services/brand-config';
import { z } from 'zod';
import { GoogleGenerativeAI, DynamicRetrievalMode } from '@google/generative-ai';
import OpenAI from 'openai';
import { getLogo } from '../services/logo';
import { getSimpleSentiment } from '../services/analytics/sentiment-analyzer';
import { getSimplePositionScore } from '../services/analytics/position-scorer';
import { extractCitations } from '../services/analytics/citation-tracker';
import { getClient, getAvailableClients, hasApiAccess } from '../services/platforms/api-clients';
import { storage } from '../data';
import { countDuePromptRuns, getPromptFrequency, scheduleDuePromptRun } from '../services/prompts/prompt-tracking';
import type { PlatformName, PlatformResponse } from '../services/platforms/types';
import type {
  H2HMetrics,
  BrandMetrics,
  SentimentLabel,
  BrandProfile,
  SuggestedCompetitor,
  CustomerPrompt,
  ResearchResults,
  PlatformResult,
  PromptResult,
  CompetitorResult,
  JourneyStage,
} from '@shared/types/intelligence';

const router = Router();

// LLM clients
const geminiApiKey = process.env.GOOGLE_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || 'default_key',
});
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

// Supported platforms for H2H analysis
const PLATFORMS = ['chatgpt', 'claude', 'perplexity', 'gemini', 'grok', 'deepseek'] as const;

function normalizePromptText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function mapJourneyStage(stage?: JourneyStage): string | undefined {
  if (!stage) return undefined;
  const stageMap: Record<JourneyStage, string> = {
    problem_aware: 'problem-aware',
    exploring: 'solution-seeking',
    comparing_tradeoffs: 'comparing',
    deciding: 'buying',
    onboarding: 'using',
    power_user: 'using',
  };
  return stageMap[stage];
}

const trackedPromptInput = z.object({
  prompts: z.array(z.object({
    text: z.string().trim().min(1).max(500),
    stage: z.enum([
      'problem_aware',
      'exploring',
      'comparing_tradeoffs',
      'deciding',
      'onboarding',
      'power_user',
    ]),
  })).min(1).max(100),
});

// =============================================================================
// H2H Metrics Computation
// =============================================================================

/**
 * Get the user's configured brand from the database
 */
async function getUserBrand(): Promise<{ name: string; domain: string } | null> {
  try {
    const config = await getActiveBrandConfig();

    if (!config) return null;

    return {
      name: config.name,
      domain: config.domain || '',
    };
  } catch (error) {
    console.error('[Intelligence] Failed to get user brand:', error);
    return null;
  }
}

/**
 * Get responses from the last 30 days for analysis
 */
async function getRecentResponses(): Promise<Array<{
  id: number;
  text: string;
  platform: string;
  brandMentioned: boolean;
  promptText: string;
  promptId: number;
}>> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const workspace_id = currentWorkspaceId();
    if (!workspace_id) throw new Error('Workspace context is required for data access');
    const results = await prisma.responses.findMany({
      where: { workspace_id, created_at: { gte: thirtyDaysAgo } },
      include: { prompts: { select: { id: true, text: true } } },
      orderBy: { created_at: 'desc' },
    });

    return results.map(r => ({
      id: r.id,
      text: r.text,
      platform: r.platform || 'unknown',
      brandMentioned: r.brand_mentioned || false,
      promptText: r.prompts.text,
      promptId: r.prompts.id,
    }));
  } catch (error) {
    console.error('[Intelligence] Failed to get recent responses:', error);
    return [];
  }
}

/**
 * Compute brand metrics for a specific brand
 * Analyzes responses to calculate share of answer, position, citations, sentiment
 */
function computeBrandMetrics(
  brandName: string,
  responses: Array<{
    id: number;
    text: string;
    platform: string;
    brandMentioned: boolean;
    promptText: string;
    promptId: number;
  }>
): BrandMetrics {
  if (responses.length === 0) {
    return createEmptyBrandMetrics();
  }

  const brandLower = brandName.toLowerCase();

  // Group responses by prompt for unique prompt analysis
  const promptMap = new Map<number, {
    promptText: string;
    responses: typeof responses;
  }>();

  for (const r of responses) {
    if (!promptMap.has(r.promptId)) {
      promptMap.set(r.promptId, { promptText: r.promptText, responses: [] });
    }
    promptMap.get(r.promptId)!.responses.push(r);
  }

  const totalPrompts = promptMap.size;

  // Share of Answer: % of prompts where brand was mentioned
  const promptsWithMention: string[] = [];
  for (const [, data] of Array.from(promptMap)) {
    const mentioned = data.responses.some(
      (r: { text: string }) => r.text.toLowerCase().includes(brandLower)
    );
    if (mentioned) {
      promptsWithMention.push(data.promptText);
    }
  }
  const shareOfAnswer = totalPrompts > 0
    ? Math.round((promptsWithMention.length / totalPrompts) * 100)
    : 0;

  // Average Position: average ranking position when mentioned
  // Position scorer returns 0-100 where higher = better placement
  // Convert to ranking 1-10 where 1 = best position
  const positionScores: number[] = [];
  const topPositionPrompts: string[] = [];

  for (const [, data] of Array.from(promptMap)) {
    for (const r of data.responses) {
      if (r.text.toLowerCase().includes(brandLower)) {
        const score = getSimplePositionScore(r.text, brandName);
        positionScores.push(score);
        // Consider "top position" if score >= 70
        if (score >= 70) {
          if (!topPositionPrompts.includes(data.promptText)) {
            topPositionPrompts.push(data.promptText);
          }
        }
      }
    }
  }

  // Convert position score (0-100, higher=better) to ranking (1-10, lower=better)
  // Score 100 -> rank 1, score 0 -> rank 10
  const avgPositionScore = positionScores.length > 0
    ? positionScores.reduce((a, b) => a + b, 0) / positionScores.length
    : 0;
  const avgPosition = positionScores.length > 0
    ? Math.round((10 - (avgPositionScore / 100) * 9) * 10) / 10  // Maps 100->1, 0->10
    : 0;

  // Citation Rate: % of responses that cited brand's domain
  const citationPrompts: string[] = [];
  let totalCitations = 0;

  for (const [, data] of Array.from(promptMap)) {
    for (const r of data.responses) {
      const citations = extractCitations(r.text, r.platform);
      const brandCitations = citations.filter(c =>
        c.domain.includes(brandLower) || c.context.toLowerCase().includes(brandLower)
      );
      if (brandCitations.length > 0) {
        totalCitations += brandCitations.length;
        if (!citationPrompts.includes(data.promptText)) {
          citationPrompts.push(data.promptText);
        }
      }
    }
  }

  const citationRate = totalPrompts > 0
    ? Math.round((citationPrompts.length / totalPrompts) * 100)
    : 0;

  // Sentiment: aggregate sentiment across all mentions
  const sentimentScores: number[] = [];
  let representativeQuote = '';

  for (const r of responses) {
    if (r.text.toLowerCase().includes(brandLower)) {
      const sentiment = getSimpleSentiment(r.text);
      // Convert -1 to 1 range to 0-100
      const score = Math.round((sentiment.score + 1) * 50);
      sentimentScores.push(score);

      // Find a representative quote (sentence containing brand)
      if (!representativeQuote) {
        const sentences = r.text.split(/[.!?]+/);
        const brandSentence = sentences.find(s => s.toLowerCase().includes(brandLower));
        if (brandSentence) {
          representativeQuote = brandSentence.trim().slice(0, 100);
          if (representativeQuote.length < brandSentence.trim().length) {
            representativeQuote += '...';
          }
        }
      }
    }
  }

  const sentimentScore = sentimentScores.length > 0
    ? Math.round(sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length)
    : 50;

  const sentimentLabel: SentimentLabel =
    sentimentScore >= 60 ? 'positive' :
    sentimentScore <= 40 ? 'negative' : 'neutral';

  // Platform sentiments
  const platformSentiments: Array<{ platformId: string; sentiment: SentimentLabel }> = [];
  for (const platform of PLATFORMS) {
    const platformResponses = responses.filter(r =>
      r.platform === platform && r.text.toLowerCase().includes(brandLower)
    );
    if (platformResponses.length > 0) {
      const scores = platformResponses.map(r => {
        const s = getSimpleSentiment(r.text);
        return Math.round((s.score + 1) * 50);
      });
      const avgPlatformScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      platformSentiments.push({
        platformId: platform,
        sentiment: avgPlatformScore >= 60 ? 'positive' :
                   avgPlatformScore <= 40 ? 'negative' : 'neutral',
      });
    }
  }

  return {
    shareOfAnswer,
    shareOfAnswerDetail: `${promptsWithMention.length} of ${totalPrompts} prompts`,
    shareOfAnswerPrompts: promptsWithMention.slice(0, 5),
    avgPosition: positionScores.length > 0 ? (avgPosition || 0) : 0, // 0 means no data
    avgPositionDetail: positionScores.length > 0
      ? `Range: #${Math.min(...positionScores.map(s => Math.ceil(10 - s/10)))}–#${Math.max(...positionScores.map(s => Math.ceil(10 - s/10)))}`
      : 'No ranking data',
    avgPositionPrompts: topPositionPrompts.slice(0, 5),
    citationRate,
    citationRateDetail: `${totalCitations} citations`,
    citationRatePrompts: citationPrompts.slice(0, 5),
    sentiment: sentimentLabel,
    sentimentScore,
    sentimentQuote: representativeQuote || 'No sentiment data available',
    platformSentiments,
  };
}

/**
 * Create empty brand metrics when no data is available
 */
function createEmptyBrandMetrics(): BrandMetrics {
  return {
    shareOfAnswer: 0,
    shareOfAnswerDetail: '0 of 0 prompts',
    shareOfAnswerPrompts: [],
    avgPosition: 0,
    avgPositionDetail: 'No data',
    avgPositionPrompts: [],
    citationRate: 0,
    citationRateDetail: '0 citations',
    citationRatePrompts: [],
    sentiment: 'neutral',
    sentimentScore: 50,
    sentimentQuote: 'No sentiment data available',
    platformSentiments: [],
  };
}

/**
 * Compute H2H metrics comparing target brand vs user's brand
 */
async function computeH2HMetrics(targetBrandName: string): Promise<H2HMetrics | null> {
  try {
    // Get user's brand config
    const userBrand = await getUserBrand();

    // Get recent responses for analysis
    const recentResponses = await getRecentResponses();

    if (recentResponses.length === 0) {
      return null;
    }

    // Compute metrics for target brand (the competitor being researched)
    const targetMetrics = computeBrandMetrics(targetBrandName, recentResponses);

    // Compute metrics for user's brand
    const userMetrics = userBrand
      ? computeBrandMetrics(userBrand.name, recentResponses)
      : createEmptyBrandMetrics();

    // Count unique prompts
    const uniquePrompts = new Set(recentResponses.map(r => r.promptId));

    return {
      totalPrompts: uniquePrompts.size,
      target: targetMetrics,
      you: userMetrics,
    };
  } catch (error) {
    console.error('[Intelligence] Error computing H2H metrics:', error);
    return null;
  }
}

// =============================================================================
// Types for Analysis Response
// =============================================================================

interface AnalysisResponse {
  brand: {
    name: string;
    description: string;
    industries: string[];
  };
  competitors: Array<{
    name: string;
    domain: string;
    reason: string;
  }>;
  prompts: Array<{
    text: string;
    stage: 'problem_aware' | 'exploring' | 'comparing_tradeoffs' | 'deciding' | 'onboarding' | 'power_user';
  }>;
}

// =============================================================================
// LLM Analysis Functions
// =============================================================================

/**
 * Fetch website metadata for context
 */
async function fetchWebsiteMetadata(domain: string): Promise<{ title?: string; description?: string; content?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`https://${domain}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return {};

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

    let content = '';
    if (bodyMatch) {
      content = bodyMatch[1]
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '') // Remove nav (often just links)
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '') // Remove footer
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1000); // More content for better analysis
    }

    return {
      title: titleMatch?.[1]?.trim(),
      description: descMatch?.[1]?.trim(),
      content,
    };
  } catch {
    return {};
  }
}

/**
 * Primary: Gemini with web search grounding
 */
async function analyzeWithGemini(domain: string, metadata: { title?: string; description?: string; content?: string }): Promise<AnalysisResponse> {
  if (!genAI) {
    throw new Error('Gemini not configured');
  }

  const websiteContext = (metadata.title || metadata.description || metadata.content)
    ? `\n\nWebsite data:
${metadata.title ? `- Title: "${metadata.title}"` : ''}
${metadata.description ? `- Description: "${metadata.description}"` : ''}
${metadata.content ? `- Content: "${metadata.content.slice(0, 200)}..."` : ''}`
    : '';

  const prompt = `Analyze the company at "${domain}" for competitive intelligence.

Search the web to find accurate, current information.${websiteContext}

Return a JSON object with:
{
  "brand": {
    "name": "Company name (properly capitalized)",
    "description": "What they do (30-50 words, specific)",
    "industries": ["Industry1", "Industry2", "Industry3"]
  },
  "competitors": [
    {"name": "Competitor Name", "domain": "competitor.com", "reason": "Why they compete (1 sentence)"},
    // 4-6 real competitors
  ],
  "prompts": [
    {"text": "search query", "stage": "awareness|consideration|decision"},
    // 10-12 prompts across all stages
  ]
}

RULES:
- Search for real information about ${domain}
- Find REAL competitors in the same space
- Industries should be specific (not just "Technology")
- Prompts should be realistic customer searches across these 6 stages:
  * "problem_aware" — realizing they have a problem ("why is X hard", "issues with Y")
  * "exploring" — discovering solutions ("best tools for X", "top Y software", "options for Z")
  * "comparing_tradeoffs" — evaluating options ("X vs Y", "compare X and Y", "pros and cons")
  * "deciding" — ready to buy ("X pricing", "is X worth it", "should I buy X")
  * "onboarding" — getting started ("how to setup X", "X tutorial", "getting started with X")
  * "power_user" — advanced usage ("X API", "integrate X with Y", "automate X")
- Include 2-3 prompts per stage, mix branded and generic

Return ONLY valid JSON.`;

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
  const text = result.response.text();

  // Parse JSON
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
  if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);

  return JSON.parse(jsonStr.trim());
}

/**
 * Fallback: OpenAI (no web search)
 * Relies heavily on fetched website metadata since it can't search the web
 */
async function analyzeWithOpenAI(domain: string, metadata: { title?: string; description?: string; content?: string }): Promise<AnalysisResponse> {
  // Build rich context from website scraping
  const hasMetadata = metadata.title || metadata.description || metadata.content;

  const websiteContext = hasMetadata
    ? `
IMPORTANT - Use this website data to understand the company:
${metadata.title ? `Website Title: "${metadata.title}"` : ''}
${metadata.description ? `Meta Description: "${metadata.description}"` : ''}
${metadata.content ? `Page Content: "${metadata.content}"` : ''}`
    : '';

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a competitive intelligence analyst. Analyze companies based on their website content.

CRITICAL: Base your analysis on the ACTUAL website data provided. Do NOT make up generic descriptions.

Return JSON with:
{
  "brand": {
    "name": "Extract exact company name from website",
    "description": "Describe SPECIFICALLY what they do based on website content (30-50 words). Be concrete - mention their actual product/service.",
    "industries": ["3-4 SPECIFIC industries based on what they actually do"]
  },
  "competitors": [
    {"name": "Real competitor", "domain": "competitor.com", "reason": "Why they compete (based on what this company does)"}
  ],
  "prompts": [
    {"text": "realistic customer search query", "stage": "stage_name"}
  ]
}

For prompts, use exactly these 6 stages (2-3 prompts each):
- problem_aware: realizing they have a problem ("why is X hard", "issues with Y")
- exploring: discovering solutions ("best tools for X", "top Y software")
- comparing_tradeoffs: evaluating options ("X vs Y", "compare", "pros and cons")
- deciding: ready to buy ("pricing", "is X worth it", "should I buy")
- onboarding: getting started ("how to setup", "tutorial", "getting started")
- power_user: advanced usage ("API", "integrate", "automate")

RULES:
- Extract the ACTUAL company name and what they ACTUALLY do from website content
- DO NOT give generic descriptions like "provides innovative solutions"
- Industries must be SPECIFIC (e.g., "Invoice Automation" not just "SaaS")
- Competitors should be REAL companies in the same space
- Prompts should reference the company's ACTUAL product/service`,
      },
      {
        role: 'user',
        content: `Analyze the company at "${domain}".${websiteContext}

${hasMetadata ? 'Use the website data above to understand what this company actually does.' : 'I could not fetch their website. Provide best-effort analysis based on the domain name.'}

Return JSON only.`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 2000,
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

// =============================================================================
// NEW WIZARD ENDPOINTS (Step-by-Step)
// =============================================================================

/**
 * POST /api/intelligence/brand
 * Step 2: Fetch brand profile from URL
 * Input: { url: string }
 * Output: BrandProfile
 *
 * Optimized flow:
 * 1. Check recent cache (last 24h) — return immediately if found
 * 2. Start logo fetch + metadata fetch in PARALLEL
 * 3. Run LLM analysis (needs metadata) while logo continues
 * 4. Combine results — logo should be ready by now
 */
router.post('/brand', async (req: Request, res: Response) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Normalize domain from URL
  const normalized = url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .trim();

  const startTime = Date.now();

  try {

    // Note: Cache check removed — intelligenceSearches table doesn't store enough data
    // (no description, no industries) for a proper cache hit. The logo service has its
    // own 30-day cache, so logo fetches are fast after first request.
    // Main optimization here is PARALLELIZATION of logo + metadata fetch.

    // PARALLEL: Start logo fetch and metadata fetch simultaneously
    // Logo fetch can take 5-10s on cache miss (tries 3 sources)
    // Metadata fetch takes 2-3s
    // By running in parallel, we save ~5-10s
    const parallelStart = Date.now();

    const [logoResultSettled, metadataResult] = await Promise.all([
      // Logo fetch — start immediately, don't block on it
      getLogo(normalized).catch(err => {
        console.error(`[Intelligence/brand] Logo fetch failed:`, err);
        return { logoUrl: `https://www.google.com/s2/favicons?domain=${normalized}&sz=64`, source: 'google_favicon' as const };
      }),
      // Metadata fetch — needed for LLM analysis
      fetchWebsiteMetadata(normalized),
    ]);

    const logoResult = logoResultSettled;
    const metadata = metadataResult;


    // 3. LLM analysis — needs metadata, logo already fetching/fetched
    const llmStart = Date.now();

    let brandData: { name: string; description: string; industries: string[] };
    let llmSucceeded = false;

    try {
      const analysis = await analyzeWithGemini(normalized, metadata);
      brandData = analysis.brand;
      llmSucceeded = true;
    } catch (geminiError) {
      try {
        const analysis = await analyzeWithOpenAI(normalized, metadata);
        brandData = analysis.brand;
        llmSucceeded = true;
      } catch (openaiError) {
        // Both LLMs failed — return error, don't use fake placeholder data
        return res.status(503).json({
          error: 'Unable to reach AI services. Check your network connection.',
        });
      }
    }

    // 4. Combine results — logo should already be ready
    const totalTime = Date.now() - startTime;

    const response: BrandProfile = {
      id: `brand-${Date.now()}`,
      name: brandData.name,
      domain: normalized,
      logo: logoResult.logoUrl,
      description: brandData.description,
      industries: brandData.industries.slice(0, 3), // Default selected
      suggestedIndustries: brandData.industries,
    };

    res.json(response);
  } catch (error) {
    console.error('[Intelligence/brand] Error:', error);
    res.status(500).json({ error: 'Failed to fetch brand profile' });
  }
});

/**
 * POST /api/intelligence/competitors
 * Step 3: Suggest competitors based on brand profile
 * Input: { brand: BrandProfile }
 * Output: SuggestedCompetitor[]
 */
router.post('/competitors', async (req: Request, res: Response) => {
  const { brand } = req.body;

  if (!brand || !brand.name || !brand.domain) {
    return res.status(400).json({ error: 'Brand profile is required' });
  }

  try {

    // Generate competitor suggestions using LLM
    const prompt = `Find 5 direct competitors for "${brand.name}" (${brand.domain}).
Industry: ${brand.industries?.join(', ') || 'Technology'}
Description: ${brand.description}

Return JSON array:
[
  {"name": "Competitor Name", "domain": "competitor.com", "reason": "Why they compete (1 sentence)"}
]

Rules:
- Find REAL companies, not generic names
- Domain must be real and accessible
- Reason should be specific to why they compete
- Focus on direct competitors in the same space

Return ONLY valid JSON array.`;

    let competitorData: Array<{ name: string; domain: string; reason: string }> = [];
    let llmSucceeded = false;

    // Try Gemini first
    if (genAI) {
      try {
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
        let text = result.response.text().trim();
        if (text.startsWith('```json')) text = text.slice(7);
        if (text.startsWith('```')) text = text.slice(3);
        if (text.endsWith('```')) text = text.slice(0, -3);
        competitorData = JSON.parse(text.trim());
        llmSucceeded = competitorData.length > 0;
      } catch (e) {
      }
    }

    // Try OpenAI fallback
    if (!llmSucceeded) {
      try {
        const response = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: 'You are a competitive intelligence analyst. Return only valid JSON.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 1000,
        });
        const parsed = JSON.parse(response.choices[0].message.content || '[]');
        competitorData = Array.isArray(parsed) ? parsed : parsed.competitors || [];
        llmSucceeded = competitorData.length > 0;
      } catch (e) {
      }
    }

    // If LLM failed, return error — don't use fake placeholder data
    if (!llmSucceeded) {
      return res.status(503).json({
        error: 'Unable to reach AI services. Check your network connection.',
      });
    }

    // Fetch logos for all competitors in parallel
    const logoResults = await Promise.all(
      competitorData.slice(0, 5).map(c => getLogo(c.domain))
    );

    const competitors: SuggestedCompetitor[] = competitorData.slice(0, 5).map((c, i) => ({
      id: `comp-${i}`,
      name: c.name,
      domain: c.domain,
      logo: logoResults[i].logoUrl,
      reason: c.reason,
    }));

    res.json(competitors);
  } catch (error) {
    console.error('[Intelligence/competitors] Error:', error);
    res.status(500).json({ error: 'Failed to suggest competitors' });
  }
});

/**
 * POST /api/intelligence/prompts
 * Step 4: Generate customer journey prompts
 * Input: { brand: BrandProfile, competitors: string[] }
 * Output: CustomerPrompt[]
 */
router.post('/prompts', async (req: Request, res: Response) => {
  const { brand, competitors } = req.body;

  if (!brand || !brand.name) {
    return res.status(400).json({ error: 'Brand profile is required' });
  }

  try {

    const competitorList = (competitors || []).slice(0, 3).join(', ');

    // This prompt instructs the LLM to research REAL user questions from social platforms
    const prompt = `Research REAL questions and discussions people have about "${brand.name}" online.

SEARCH these sources for actual user language:
- Reddit (r/startups, r/entrepreneur, r/saas, industry subreddits)
- Twitter/X discussions and complaints
- Quora questions
- G2, Capterra, TrustRadius reviews
- LinkedIn discussions
- Hacker News threads
- Product Hunt comments

Brand: ${brand.name}
Industry: ${brand.industries?.join(', ') || 'Technology'}
Competitors: ${competitorList || 'various competitors'}

Find 13-15 REAL prompts that sound like actual humans, categorized by journey stage:

1. problem_aware (2-3): People realizing they have a problem
   Examples of REAL language: "Our sales process is a mess", "spending too much time on manual data entry", "losing track of customer conversations"

2. exploring (2-3): Discovering solutions exist
   Examples: "what CRM do y'all use for a 10 person team?", "looking for something simpler than Salesforce", "recommendations for marketing automation?"

3. comparing_tradeoffs (3-4): Evaluating specific options
   Examples: "${brand.name} vs [competitor] for small business?", "anyone switched from ${brand.name}? worth it?", "pros and cons of ${brand.name} in 2024"

4. deciding (2-3): Ready to buy, need final push
   Examples: "is ${brand.name} pricing worth it for startups?", "${brand.name} hidden costs?", "negotiate ${brand.name} contract?"

5. onboarding (2): Just purchased, getting started
   Examples: "just signed up for ${brand.name}, what should I set up first?", "${brand.name} implementation tips?"

6. power_user (2): Advanced users optimizing
   Examples: "${brand.name} API rate limits?", "automate ${brand.name} with Zapier?", "custom ${brand.name} workflows?"

Return JSON array with REAL human language (not generic templates):
[{"text": "actual question people ask", "stage": "stage_name"}]

CRITICAL RULES:
- These must sound like REAL people wrote them (casual, specific, with context)
- NO generic templates like "why is X important" or "best X alternatives"
- Include specific pain points, use cases, and comparisons people actually make
- Use conversational language, abbreviations, and real concerns
- Return ONLY valid JSON array`;

    let promptData: Array<{ text: string; stage: JourneyStage }> = [];
    let llmSucceeded = false;

    // Try Gemini first WITH web search enabled
    if (genAI) {
      try {
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
        let text = result.response.text().trim();
        if (text.startsWith('```json')) text = text.slice(7);
        if (text.startsWith('```')) text = text.slice(3);
        if (text.endsWith('```')) text = text.slice(0, -3);
        promptData = JSON.parse(text.trim());
        llmSucceeded = promptData.length > 0;
      } catch (e) {
      }
    }

    // Try OpenAI fallback
    if (!llmSucceeded) {
      try {
        const response = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are an expert at understanding how real customers talk about software products online.

Your job is to generate prompts that sound like REAL humans asking questions on Reddit, Twitter, Quora, or review sites.

NEVER use generic templates like:
- "why is X important"
- "best X alternatives"
- "X pros and cons"
- "what is X"

ALWAYS use specific, conversational language like:
- "just inherited a mess of spreadsheets, need a CRM that won't take 6 months to set up"
- "anyone actually happy with X pricing after the first year?"
- "X vs Y for a bootstrapped startup with 3 salespeople?"
- "is X overkill for a 5 person team?"

Return only valid JSON array.`
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7, // Higher temp for more creative/varied responses
          max_tokens: 2000,
        });
        const parsed = JSON.parse(response.choices[0].message.content || '[]');
        promptData = Array.isArray(parsed) ? parsed : parsed.prompts || [];
        llmSucceeded = promptData.length > 0;
      } catch (e) {
      }
    }

    // If LLM failed, use static fallback prompts
    if (!llmSucceeded) {
      const brandName = brand.name;
      promptData = [
        { text: `what's the best alternative to ${brandName}?`, stage: 'comparing_tradeoffs' as JourneyStage },
        { text: `${brandName} vs competitors - which is better for small teams?`, stage: 'comparing_tradeoffs' as JourneyStage },
        { text: `is ${brandName} worth it in 2024?`, stage: 'deciding' as JourneyStage },
        { text: `${brandName} pricing - any hidden costs?`, stage: 'deciding' as JourneyStage },
        { text: `anyone using ${brandName}? thoughts?`, stage: 'exploring' as JourneyStage },
        { text: `looking for something like ${brandName} but cheaper`, stage: 'exploring' as JourneyStage },
        { text: `${brandName} review - is it actually good?`, stage: 'comparing_tradeoffs' as JourneyStage },
        { text: `how does ${brandName} compare to the competition?`, stage: 'comparing_tradeoffs' as JourneyStage },
        { text: `just signed up for ${brandName}, any tips?`, stage: 'onboarding' as JourneyStage },
        { text: `${brandName} integrations - what works best?`, stage: 'power_user' as JourneyStage },
        { text: `frustrated with my current tool, is ${brandName} better?`, stage: 'problem_aware' as JourneyStage },
        { text: `${brandName} for startups - overkill or worth it?`, stage: 'deciding' as JourneyStage },
      ];
    }

    const customerPrompts: CustomerPrompt[] = promptData.map((p, i) => ({
      id: `prompt-${i}`,
      text: p.text,
      stage: p.stage,
    }));

    res.json(customerPrompts);
  } catch (error) {
    console.error('[Intelligence/prompts] Error:', error);
    res.status(500).json({ error: 'Failed to generate prompts' });
  }
});

router.post('/prompts/track', async (req: Request, res: Response) => {
  const parsed = trackedPromptInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Provide 1 to 100 valid prompts to track' });
  }

  try {
    const existingPrompts = await storage.getPrompts();
    const promptsByText = new Map(
      existingPrompts
        .filter(prompt => !prompt.archivedAt && prompt.text.trim())
        .map(prompt => [normalizePromptText(prompt.text), prompt]),
    );
    const submittedKeys = new Set<string>();
    const addedPromptIds: number[] = [];
    let addedCount = 0;
    let alreadyTrackedCount = 0;

    for (const customerPrompt of parsed.data.prompts) {
      const text = customerPrompt.text.trim();
      const key = normalizePromptText(text);
      if (submittedKeys.has(key)) continue;
      submittedKeys.add(key);

      if (promptsByText.has(key)) {
        alreadyTrackedCount++;
        continue;
      }

      const journeyStage = mapJourneyStage(customerPrompt.stage);
      const prompt = await storage.createPrompt({
        text,
        journeyStages: journeyStage ? [journeyStage] : undefined,
      });
      promptsByText.set(key, prompt);
      addedPromptIds.push(prompt.id);
      addedCount++;
    }

    const workspaceId = currentWorkspaceId();
    if (addedPromptIds.length && workspaceId) {
      await getPromptFrequency();
    }
    const queuedPrompts = workspaceId ? await countDuePromptRuns(addedPromptIds) : 0;
    res.json({ addedCount, alreadyTrackedCount, queuedPrompts });
    if (workspaceId && queuedPrompts) scheduleDuePromptRun(workspaceId, addedPromptIds);
  } catch (error) {
    console.error('[Intelligence/prompts/track] Error:', error);
    res.status(500).json({ error: 'Failed to add prompts to tracking' });
  }
});

/**
 * POST /api/intelligence/research
 * Step 5: Run full research across platforms — THE BIG ONE
 * Input: { targetBrand: BrandProfile, yourBrandId: string, prompts: CustomerPrompt[], platforms: string[], competitors?: SuggestedCompetitor[] }
 * Output: ResearchResults
 */
router.post('/research', async (req: Request, res: Response) => {
  const { targetBrand, yourBrandId, prompts: customerPrompts, platforms: requestedPlatforms, competitors } = req.body;

  if (!targetBrand || !targetBrand.name) {
    return res.status(400).json({ error: 'Target brand is required' });
  }

  if (!customerPrompts || !Array.isArray(customerPrompts) || customerPrompts.length === 0) {
    return res.status(400).json({ error: 'Prompts are required' });
  }

  try {

    // Get user's brand for comparison
    const userBrand = await getUserBrand();
    const yourBrandName = userBrand?.name || 'Your Brand';

    // Determine which platforms to query
    const availableClients = getAvailableClients();
    const availablePlatformNames = availableClients.map(c => c.name);
    const platformsToQuery: PlatformName[] = requestedPlatforms?.length
      ? requestedPlatforms.filter((p: string) => availablePlatformNames.includes(p as PlatformName))
      : availablePlatformNames;


    // Collect all responses across prompts and platforms
    const allResponses: Array<{
      promptId: string;
      promptText: string;
      platformId: string;
      response: PlatformResponse;
    }> = [];

    // Query each prompt across each platform
    // Rate limit: process 3 platforms concurrently, with delay between prompts
    for (const prompt of customerPrompts) {
      const platformPromises = platformsToQuery.map(async (platformName) => {
        try {
          const client = getClient(platformName);
          if (!client || !client.isAvailable()) {
            return null;
          }

          // Add small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));

          const response = await client.query(prompt.text);
          return {
            promptId: prompt.id,
            promptText: prompt.text,
            platformId: platformName,
            response,
          };
        } catch (error) {
          console.error(`[Intelligence/research] Error querying ${platformName} for prompt "${prompt.text.slice(0, 30)}...":`, error);
          return null;
        }
      });

      const results = await Promise.all(platformPromises);
      allResponses.push(...results.filter((r): r is NonNullable<typeof r> => r !== null));

      // Delay between prompts to avoid overwhelming APIs
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Compute platform results
    const platformResults: PlatformResult[] = platformsToQuery.map(platformId => {
      const platformResponses = allResponses.filter(r => r.platformId === platformId && r.response.success);
      const totalMentions = platformResponses.filter(r =>
        r.response.text.toLowerCase().includes(targetBrand.name.toLowerCase())
      ).length;

      // Calculate sentiment for this platform
      const sentimentScores = platformResponses.map(r => getSimpleSentiment(r.response.text).score);
      const avgSentiment = sentimentScores.length > 0
        ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
        : 0;

      // Calculate citation rate
      const responsesWithCitations = platformResponses.filter(r => {
        const citations = extractCitations(r.response.text, platformId);
        return citations.some(c =>
          c.domain.toLowerCase().includes(targetBrand.domain.toLowerCase()) ||
          c.context.toLowerCase().includes(targetBrand.name.toLowerCase())
        );
      });
      const citationRate = platformResponses.length > 0
        ? Math.round((responsesWithCitations.length / platformResponses.length) * 100)
        : null;

      // Calculate score based on mentions, sentiment, citations
      const score = Math.min(100, Math.round(
        (totalMentions / customerPrompts.length) * 50 +
        ((avgSentiment + 1) / 2) * 30 +
        (citationRate || 0) * 0.2
      ));

      return {
        id: platformId,
        name: getPlatformDisplayName(platformId),
        isActive: platformResponses.length > 0,
        score,
        mentions: totalMentions,
        sentiment: avgSentiment > 0.2 ? 'positive' : avgSentiment < -0.2 ? 'negative' : 'mixed',
        citationRate,
      };
    });

    // Compute prompt results
    const promptResults: PromptResult[] = customerPrompts.map(prompt => {
      const promptResponses = allResponses.filter(r => r.promptId === prompt.id && r.response.success);

      return {
        promptId: prompt.id,
        promptText: prompt.text,
        results: promptResponses.map(r => {
          const mentioned = r.response.text.toLowerCase().includes(targetBrand.name.toLowerCase());
          const position = mentioned ? getSimplePositionScore(r.response.text, targetBrand.name) : undefined;

          // Generate summary
          let summary = 'Not mentioned';
          if (mentioned) {
            const sentences = r.response.text.split(/[.!?]+/);
            const brandSentence = sentences.find(s => s.toLowerCase().includes(targetBrand.name.toLowerCase()));
            summary = brandSentence ? brandSentence.trim().slice(0, 100) + (brandSentence.length > 100 ? '...' : '') : 'Mentioned in response';
          }

          return {
            platformId: r.platformId,
            mentioned,
            position: position ? Math.ceil(10 - position / 10) : undefined, // Convert score to position 1-10
            summary,
          };
        }),
      };
    });

    // Compute H2H metrics
    const h2hMetrics = computeH2HFromResponses(
      allResponses,
      targetBrand.name,
      yourBrandName,
      customerPrompts.length
    );

    // Compute competitor comparison
    const allCompetitors = [
      { id: targetBrand.id || 'target', name: targetBrand.name, isTarget: true },
      ...(competitors || []).slice(0, 5).map((c: SuggestedCompetitor) => ({ id: c.id, name: c.name, isTarget: false })),
    ];

    const competitorComparison: CompetitorResult[] = allCompetitors.map(comp => {
      const mentions = allResponses.filter(r =>
        r.response.success && r.response.text.toLowerCase().includes(comp.name.toLowerCase())
      ).length;

      const sentimentScores = allResponses
        .filter(r => r.response.success && r.response.text.toLowerCase().includes(comp.name.toLowerCase()))
        .map(r => getSimpleSentiment(r.response.text).score);

      const avgSentiment = sentimentScores.length > 0
        ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
        : 0;

      const score = Math.min(100, Math.round((mentions / allResponses.length) * 100));
      const targetMentions = allResponses.filter(r =>
        r.response.success && r.response.text.toLowerCase().includes(targetBrand.name.toLowerCase())
      ).length;
      const targetScore = Math.min(100, Math.round((targetMentions / allResponses.length) * 100));

      return {
        id: comp.id,
        name: comp.name,
        isTarget: comp.isTarget,
        score,
        mentions,
        sentiment: avgSentiment > 0.2 ? 'positive' as const : avgSentiment < -0.2 ? 'negative' as const : 'mixed' as const,
        deltaVsTarget: comp.isTarget ? 0 : score - targetScore,
      };
    });

    // Generate insights using LLM
    const insights = await generateInsights(
      targetBrand,
      platformResults,
      h2hMetrics,
      allResponses
    );

    // Calculate overall score
    const activePlatforms = platformResults.filter(p => p.isActive).length;
    const overallScore = activePlatforms > 0
      ? Math.round(platformResults.filter(p => p.isActive).reduce((sum, p) => sum + p.score, 0) / activePlatforms)
      : 0;

    const results: ResearchResults = {
      brand: targetBrand,
      score: overallScore,
      activePlatforms,
      platforms: platformResults,
      promptResults,
      insights,
      competitorComparison,
      h2hMetrics,
      completedAt: new Date().toISOString(),
    };

    res.json(results);
  } catch (error) {
    console.error('[Intelligence/research] Error:', error);
    res.status(500).json({ error: 'Failed to run research' });
  }
});

/**
 * Helper: Get display name for platform
 */
function getPlatformDisplayName(platformId: string): string {
  const names: Record<string, string> = {
    'chatgpt': 'ChatGPT',
    'claude': 'Claude',
    'gemini': 'Gemini',
    'perplexity': 'Perplexity',
    'grok': 'Grok',
    'deepseek': 'DeepSeek',
    'google-ai-overview': 'AI Overview',
    'google-ai-mode': 'AI Mode',
  };
  return names[platformId] || platformId;
}

/**
 * Helper: Compute H2H metrics from raw responses
 */
function computeH2HFromResponses(
  responses: Array<{ promptId: string; promptText: string; platformId: string; response: PlatformResponse }>,
  targetName: string,
  yourName: string,
  totalPrompts: number
): H2HMetrics {
  const targetLower = targetName.toLowerCase();
  const yourLower = yourName.toLowerCase();

  // Helper to compute brand metrics
  const computeMetrics = (brandName: string, brandLower: string): BrandMetrics => {
    // Group by prompt
    const promptMap = new Map<string, { promptText: string; responses: typeof responses }>();
    for (const r of responses) {
      if (!promptMap.has(r.promptId)) {
        promptMap.set(r.promptId, { promptText: r.promptText, responses: [] });
      }
      promptMap.get(r.promptId)!.responses.push(r);
    }

    // Share of Answer
    const promptsWithMention: string[] = [];
    for (const [, data] of Array.from(promptMap)) {
      const mentioned = data.responses.some(r =>
        r.response.success && r.response.text.toLowerCase().includes(brandLower)
      );
      if (mentioned) promptsWithMention.push(data.promptText);
    }
    const shareOfAnswer = totalPrompts > 0
      ? Math.round((promptsWithMention.length / totalPrompts) * 100)
      : 0;

    // Position scores
    // Position scorer returns 0-100 where higher = better placement
    // Convert to ranking 1-10 where 1 = best position
    const positionScores: number[] = [];
    const topPositionPrompts: string[] = [];
    for (const [, data] of Array.from(promptMap)) {
      for (const r of data.responses) {
        if (r.response.success && r.response.text.toLowerCase().includes(brandLower)) {
          const score = getSimplePositionScore(r.response.text, brandName);
          positionScores.push(score);
          if (score >= 70 && !topPositionPrompts.includes(data.promptText)) {
            topPositionPrompts.push(data.promptText);
          }
        }
      }
    }
    // Convert position score (0-100, higher=better) to ranking (1-10, lower=better)
    // Score 100 -> rank 1, score 0 -> rank 10
    const avgPositionScore = positionScores.length > 0
      ? positionScores.reduce((a, b) => a + b, 0) / positionScores.length
      : 0;
    const avgPosition = positionScores.length > 0
      ? Math.round((10 - (avgPositionScore / 100) * 9) * 10) / 10  // Maps 100->1, 0->10
      : 5.0;

    // Citation rate
    const citationPrompts: string[] = [];
    let totalCitations = 0;
    for (const [, data] of Array.from(promptMap)) {
      for (const r of data.responses) {
        if (!r.response.success) continue;
        const citations = extractCitations(r.response.text, r.platformId);
        const brandCitations = citations.filter(c =>
          c.domain.includes(brandLower) || c.context.toLowerCase().includes(brandLower)
        );
        if (brandCitations.length > 0) {
          totalCitations += brandCitations.length;
          if (!citationPrompts.includes(data.promptText)) {
            citationPrompts.push(data.promptText);
          }
        }
      }
    }
    const citationRate = totalPrompts > 0
      ? Math.round((citationPrompts.length / totalPrompts) * 100)
      : 0;

    // Sentiment
    const sentimentScores: number[] = [];
    let representativeQuote = '';
    for (const r of responses) {
      if (!r.response.success) continue;
      if (r.response.text.toLowerCase().includes(brandLower)) {
        const sentiment = getSimpleSentiment(r.response.text);
        sentimentScores.push(Math.round((sentiment.score + 1) * 50));
        if (!representativeQuote) {
          const sentences = r.response.text.split(/[.!?]+/);
          const brandSentence = sentences.find(s => s.toLowerCase().includes(brandLower));
          if (brandSentence) {
            representativeQuote = brandSentence.trim().slice(0, 100);
            if (representativeQuote.length < brandSentence.trim().length) {
              representativeQuote += '...';
            }
          }
        }
      }
    }
    const sentimentScore = sentimentScores.length > 0
      ? Math.round(sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length)
      : 50;
    const sentimentLabel: SentimentLabel =
      sentimentScore >= 60 ? 'positive' : sentimentScore <= 40 ? 'negative' : 'neutral';

    // Platform sentiments
    const platformSentiments: Array<{ platformId: string; sentiment: SentimentLabel }> = [];
    for (const platform of PLATFORMS) {
      const platformResponses = responses.filter(r =>
        r.platformId === platform && r.response.success && r.response.text.toLowerCase().includes(brandLower)
      );
      if (platformResponses.length > 0) {
        const scores = platformResponses.map(r => {
          const s = getSimpleSentiment(r.response.text);
          return Math.round((s.score + 1) * 50);
        });
        const avgPlatformScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        platformSentiments.push({
          platformId: platform,
          sentiment: avgPlatformScore >= 60 ? 'positive' : avgPlatformScore <= 40 ? 'negative' : 'neutral',
        });
      }
    }

    return {
      shareOfAnswer,
      shareOfAnswerDetail: `${promptsWithMention.length} of ${totalPrompts} prompts`,
      shareOfAnswerPrompts: promptsWithMention.slice(0, 5),
      avgPosition: positionScores.length > 0 ? (avgPosition || 0) : 0,
      avgPositionDetail: positionScores.length > 0
        ? `Range: #${Math.min(...positionScores.map(s => Math.ceil(10 - s/10)))}–#${Math.max(...positionScores.map(s => Math.ceil(10 - s/10)))}`
        : 'No ranking data',
      avgPositionPrompts: topPositionPrompts.slice(0, 5),
      citationRate,
      citationRateDetail: `${totalCitations} citations`,
      citationRatePrompts: citationPrompts.slice(0, 5),
      sentiment: sentimentLabel,
      sentimentScore,
      sentimentQuote: representativeQuote || 'No sentiment data available',
      platformSentiments,
    };
  };

  return {
    totalPrompts,
    target: computeMetrics(targetName, targetLower),
    you: computeMetrics(yourName, yourLower),
  };
}

/**
 * Helper: Generate insights using LLM
 */
async function generateInsights(
  brand: BrandProfile,
  platformResults: PlatformResult[],
  h2hMetrics: H2HMetrics,
  _responses: Array<{ response: PlatformResponse }>
): Promise<{ strengths: string[]; gaps: string[]; opportunities: string[] }> {
  // Build context for LLM
  const activePlatforms = platformResults.filter(p => p.isActive);
  const strongPlatforms = activePlatforms.filter(p => p.score >= 70);
  const weakPlatforms = activePlatforms.filter(p => p.score < 40);
  const inactivePlatforms = platformResults.filter(p => !p.isActive);

  const prompt = `Analyze LLM visibility for "${brand.name}":

Platform Performance:
${activePlatforms.map(p => `- ${p.name}: Score ${p.score}, ${p.mentions} mentions, ${p.sentiment} sentiment`).join('\n')}

Inactive platforms: ${inactivePlatforms.map(p => p.name).join(', ') || 'None'}

H2H vs Competitor:
- Share of Answer: ${h2hMetrics.target.shareOfAnswer}% vs ${h2hMetrics.you.shareOfAnswer}%
- Citation Rate: ${h2hMetrics.target.citationRate}% vs ${h2hMetrics.you.citationRate}%
- Sentiment: ${h2hMetrics.target.sentiment} vs ${h2hMetrics.you.sentiment}

Generate 3-4 items for each category:
{
  "strengths": ["What's working well..."],
  "gaps": ["Where they're missing..."],
  "opportunities": ["Actionable recommendations..."]
}

Return ONLY valid JSON.`;

  try {
    let insightsData: { strengths: string[]; gaps: string[]; opportunities: string[] };

    if (genAI) {
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      if (text.startsWith('```json')) text = text.slice(7);
      if (text.startsWith('```')) text = text.slice(3);
      if (text.endsWith('```')) text = text.slice(0, -3);
      insightsData = JSON.parse(text.trim());
    } else {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are an LLM visibility analyst. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 800,
      });
      insightsData = JSON.parse(response.choices[0].message.content || '{}');
    }

    return {
      strengths: insightsData.strengths || [],
      gaps: insightsData.gaps || [],
      opportunities: insightsData.opportunities || [],
    };
  } catch (error) {
    console.error('[Intelligence/research] Failed to generate insights:', error);

    // Fallback insights based on data
    const strengths: string[] = [];
    const gaps: string[] = [];
    const opportunities: string[] = [];

    if (strongPlatforms.length > 0) {
      strengths.push(`Strong presence on ${strongPlatforms.map(p => p.name).join(', ')}`);
    }
    if (h2hMetrics.target.citationRate > 50) {
      strengths.push(`High citation rate (${h2hMetrics.target.citationRate}%) — content is trusted by AI`);
    }
    if (h2hMetrics.target.sentiment === 'positive') {
      strengths.push('Positive sentiment across platforms');
    }

    if (inactivePlatforms.length > 0) {
      gaps.push(`Not appearing on ${inactivePlatforms.map(p => p.name).join(', ')}`);
    }
    if (weakPlatforms.length > 0) {
      gaps.push(`Low visibility on ${weakPlatforms.map(p => p.name).join(', ')}`);
    }
    if (h2hMetrics.target.shareOfAnswer < h2hMetrics.you.shareOfAnswer) {
      gaps.push('Lower share of answer than competitors');
    }

    if (inactivePlatforms.length > 0) {
      opportunities.push(`Expand content targeting ${inactivePlatforms[0].name}`);
    }
    if (weakPlatforms.length > 0) {
      opportunities.push(`Improve positioning on ${weakPlatforms[0].name}`);
    }
    opportunities.push('Monitor emerging platforms for early visibility investment');

    return { strengths, gaps, opportunities };
  }
}

// =============================================================================
// LEGACY ENDPOINT (Single call for all steps)
// =============================================================================

/**
 * POST /api/intelligence/analyze
 * Single LLM call returns brand profile + competitors + prompts
 */
router.post('/analyze', async (req: Request, res: Response) => {
  const { domain } = req.body;

  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ error: 'Domain is required' });
  }

  const normalized = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim();

  try {
    // Fetch website metadata for context
    const metadata = await fetchWebsiteMetadata(normalized);

    let analysis: AnalysisResponse;

    // Try Gemini first
    try {
      analysis = await analyzeWithGemini(normalized, metadata);
    } catch (geminiError) {
      console.error('[Intelligence] Gemini failed:', geminiError);

      // Try OpenAI
      try {
        analysis = await analyzeWithOpenAI(normalized, metadata);
      } catch (openaiError) {
        console.error('[Intelligence] OpenAI failed:', openaiError);

        // Both LLMs failed — return error
        return res.status(503).json({
          error: 'Unable to reach AI services. Check your network connection.',
        });
      }
    }

    // Fetch logos using caching service (avoids repeated logo.dev API calls)
    const [brandLogo, competitorLogos, h2hMetrics] = await Promise.all([
      getLogo(normalized),
      Promise.all(analysis.competitors.map(c => getLogo(c.domain))),
      computeH2HMetrics(analysis.brand.name),
    ]);

    const response: Record<string, unknown> = {
      brand: {
        ...analysis.brand,
        domain: normalized,
        logo: brandLogo.logoUrl,
      },
      competitors: analysis.competitors.map((c, i) => ({
        id: `comp-${i}`,
        ...c,
        logo: competitorLogos[i].logoUrl,
      })),
      prompts: analysis.prompts.map((p, i) => ({
        id: `prompt-${i}`,
        ...p,
      })),
    };

    // Include H2H metrics if we have data
    if (h2hMetrics) {
      response.h2hMetrics = h2hMetrics;
    }

    res.json(response);
  } catch (error) {
    console.error('[Intelligence] Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze domain' });
  }
});

/**
 * GET /api/intelligence/recent
 * Returns last 10 searches (domain, date)
 */
router.get('/recent', async (_req: Request, res: Response) => {
  try {
    const workspace_id = currentWorkspaceId();
    if (!workspace_id) throw new Error('Workspace context is required for data access');
    const searches = await prisma.intelligence_searches.findMany({
      where: { workspace_id },
      select: { domain: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    // Transform to expected response format
    const response = searches.map(s => ({
      domain: s.domain,
      date: s.created_at ? s.created_at.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    }));

    res.json(response);
  } catch (error) {
    console.error('[Intelligence API] Error fetching recent searches:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to fetch recent searches',
    });
  }
});

/**
 * POST /api/intelligence/searches
 * Create a new search record
 */
router.post('/searches', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const bodySchema = z.object({
      domain: z.string().min(1, 'Domain is required'),
      brandName: z.string().optional(),
      brandLogo: z.string().url().optional().nullable(),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message || 'Invalid request body',
      });
    }

    const { domain, brandName, brandLogo } = parsed.data;

    // Insert the search record
    const workspace_id = currentWorkspaceId();
    if (!workspace_id) throw new Error('Workspace context is required for data access');
    const newSearch = await prisma.intelligence_searches.create({
      data: {
        workspace_id,
        domain,
        brand_name: brandName || null,
        brand_logo: brandLogo || null,
      },
    });

    res.status(201).json({
      id: newSearch.id,
      domain: newSearch.domain,
      brandName: newSearch.brand_name,
      brandLogo: newSearch.brand_logo,
      createdAt: newSearch.created_at?.toISOString(),
    });
  } catch (error) {
    console.error('[Intelligence API] Error creating search record:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to create search record',
    });
  }
});

/**
 * GET /api/intelligence/research/:id/pdf
 * Download research results as PDF (stub - not implemented yet)
 */
router.get('/research/:id/pdf', async (_req: Request, res: Response) => {
  // Stub endpoint - PDF export is a follow-up feature
  res.status(501).json({
    code: 'NOT_IMPLEMENTED',
    message: 'PDF export is not yet implemented. This feature is coming soon.',
  });
});

export default router;
