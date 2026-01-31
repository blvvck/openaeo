

// =============================================================================
// Status Types
// =============================================================================

/** Overall health status for summary indicators */
export type HealthStatus = 'good' | 'warning' | 'issue';

/** Individual check status */
export type CheckStatus = 'pass' | 'warn' | 'fail' | 'pending';

// =============================================================================
// Summary Types
// =============================================================================

/** Summary of site health across all categories */
export interface SiteHealthSummary {
  llmsTxt: HealthStatus;
  robotsTxt: HealthStatus;
  sitemap: HealthStatus;
  schema: HealthStatus;
  pageMeta: HealthStatus;
  lastAuditAt: string | null;
}

// =============================================================================
// Check Types
// =============================================================================

/** Individual health check result */
export interface HealthCheck {
  id: string;
  name: string;
  category: 'llms' | 'robots' | 'sitemap' | 'schema' | 'performance' | 'other';
  status: CheckStatus;
  details: string;
  action?: {
    label: string;
    type: 'link' | 'modal' | 'copy';
    value: string;
  };
}

/** Recommendation for improving site health */
export interface Recommendation {
  id: string;
  priority: number;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actions: {
    label: string;
    type: 'link' | 'modal' | 'copy';
    value: string;
  }[];
}

// =============================================================================
// llms.txt Types
// =============================================================================

/** llms.txt file check status */
export interface LlmsTxtStatus {
  exists: boolean;
  url: string | null;
  valid: boolean;
  sizeBytes: number | null;
  hasTitle: boolean;
  sections: string[];
  issues: string[];
}

// =============================================================================
// robots.txt Types
// =============================================================================

/** AI bot configuration from robots.txt */
export interface AIBotConfig {
  name: string;
  userAgent: string;
  platform: string;
  purpose: string;
  allowed: boolean;
  rules: string[];
}

/** robots.txt check status */
export interface RobotsTxtStatus {
  exists: boolean;
  url: string | null;
  aiBots: AIBotConfig[];
  issues: string[];
}

// =============================================================================
// Sitemap Types
// =============================================================================

/** Sitemap check status */
export interface SitemapStatus {
  exists: boolean;
  url: string | null;
  urlCount: number;
  lastmodPresent: boolean;
  lastmodDate: string | null;
  issues: string[];
}

// =============================================================================
// Schema Types
// =============================================================================

/** Schema type presence check */
export interface SchemaTypeCheck {
  type: string;
  found: boolean;
  pages: number;
  totalPages: number;
}

/** Meta tag info extracted from homepage */
export interface PageMetaInfo {
  hasCanonical: boolean;
  canonicalUrl: string | null;
  hasMetaDescription: boolean;
  metaDescription: string | null;
  hasOgTags: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  hasMetaRobots: boolean;
  metaRobotsContent: string | null;
  /** Whether meta robots blocks AI (noai, noimageai) */
  blocksAI: boolean;
}

/** Schema markup check status */
export interface SchemaStatus {
  types: SchemaTypeCheck[];
  issues: string[];
  pageMeta: PageMetaInfo;
}

// =============================================================================
// Audit Types
// =============================================================================

/** Full site health audit result */
export interface SiteHealthAudit {
  domain: string;
  summary: SiteHealthSummary;
  checks: HealthCheck[];
  recommendations: Recommendation[];
  auditedAt: string;
}

// =============================================================================
// API Response Types
// =============================================================================

/** POST /api/site-health/audit response */
export interface SiteHealthAuditResponse extends SiteHealthAudit {
  meta: {
    duration: number;
    cached: boolean;
  };
}

/** GET /api/site-health/status response */
export interface SiteHealthStatusResponse {
  hasAudit: boolean;
  audit: SiteHealthAudit | null;
  meta: {
    cacheAge: number;
    lastUpdated: string;
  };
}

/** Individual checker responses */
export interface LlmsTxtResponse extends LlmsTxtStatus {
  meta: { duration: number };
}

export interface RobotsTxtResponse extends RobotsTxtStatus {
  meta: { duration: number };
}

export interface SitemapResponse extends SitemapStatus {
  meta: { duration: number };
}

export interface SchemaResponse extends SchemaStatus {
  meta: { duration: number };
}

// =============================================================================
// Constants
// =============================================================================

/** AI bots to check in robots.txt */
export const AI_BOTS: Omit<AIBotConfig, 'allowed' | 'rules'>[] = [
  { name: 'GPTBot', userAgent: 'GPTBot', platform: 'chatgpt', purpose: 'OpenAI training + inference' },
  { name: 'ChatGPT-User', userAgent: 'ChatGPT-User', platform: 'chatgpt', purpose: 'ChatGPT browse mode' },
  { name: 'ClaudeBot', userAgent: 'ClaudeBot', platform: 'claude', purpose: 'Anthropic Claude' },
  { name: 'PerplexityBot', userAgent: 'PerplexityBot', platform: 'perplexity', purpose: 'Perplexity AI' },
  { name: 'Google-Extended', userAgent: 'Google-Extended', platform: 'gemini', purpose: 'Gemini training' },
  { name: 'Applebot-Extended', userAgent: 'Applebot-Extended', platform: 'apple', purpose: 'Apple AI features' },
  { name: 'CCBot', userAgent: 'CCBot', platform: 'common-crawl', purpose: 'Common Crawl (used by many)' },
];

/** Important schema types for AI visibility */
export const IMPORTANT_SCHEMA_TYPES = [
  'Organization',
  'Article',
  'BlogPosting',
  'FAQPage',
  'Product',
  'HowTo',
  'WebPage',
];
