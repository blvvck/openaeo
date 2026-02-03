

import { Router, Request, Response } from 'express';
import { getActiveBrandConfig, getRecentIntelligenceSearchDomain } from '../services/brand-config';
import { checkLlmsTxt, generateStarterLlmsTxt } from '../services/site-health/llms-txt-checker';
import { checkRobotsTxt, generateAIBotAllowSnippet } from '../services/site-health/robots-txt-parser';
import { checkSitemap, daysSince } from '../services/site-health/sitemap-checker';
import { checkSchema, generateOrganizationSchema } from '../services/site-health/schema-checker';
import { currentWorkspaceId } from '../context/workspace-context';
import { workspaceCacheKey } from '../services/analytics/workspace-cache-key';
import type {
  HealthStatus,
  CheckStatus,
  SiteHealthSummary,
  HealthCheck,
  Recommendation,
  SiteHealthAudit,
  SiteHealthAuditResponse,
  SiteHealthStatusResponse,
  LlmsTxtResponse,
  RobotsTxtResponse,
  SitemapResponse,
  SchemaResponse,
} from '@shared/types/site-health';

const router = Router();

// =============================================================================
// CACHE
// =============================================================================

interface CacheEntry {
  data: SiteHealthAudit;
  timestamp: number;
}

const auditCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCachedAudit(cacheKey: string): SiteHealthAudit | null {
  const entry = auditCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    auditCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

function setCachedAudit(cacheKey: string, audit: SiteHealthAudit): void {
  auditCache.set(cacheKey, { data: audit, timestamp: Date.now() });
}

// =============================================================================
// HELPERS
// =============================================================================

function statusToHealth(checkResults: CheckStatus[]): HealthStatus {
  if (checkResults.includes('fail')) return 'issue';
  if (checkResults.includes('warn')) return 'warning';
  return 'good';
}

function normalizeDomain(value?: string): string | undefined {
  return value?.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * POST /api/site-health/audit
 * Run a full site health audit
 */
router.post('/audit', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const activeBrandConfig = await getActiveBrandConfig();

    // Get domain from request body or brand config
    const explicitDomain = req.body.domain as string | undefined;
    let domain = explicitDomain;
    let domainFromBrand = false;

    if (!domain) {
      // Fallback 1: brand config
      if (activeBrandConfig?.domain) {
        domain = activeBrandConfig.domain;
        domainFromBrand = true;
      }
    }

    if (!domain) {
      // Fallback 2: most recent intelligence search domain
      const recentSearchDomain = await getRecentIntelligenceSearchDomain();

      if (recentSearchDomain) {
        domain = recentSearchDomain;
      }
    }

    if (!domain) {
      return res.status(400).json({
        code: 'NO_DOMAIN',
        message: 'No domain provided and no brand configured',
      });
    }

    // Clean domain
    domain = normalizeDomain(domain) as string;
    const activeDomain = normalizeDomain(activeBrandConfig?.domain || undefined);
    const useBrandContext = domainFromBrand || activeDomain === domain;
    const starterName = useBrandContext ? activeBrandConfig?.name || domain : domain;
    const organizationName = starterName;
    const auditUrl = `https://${domain}`;
    const starterDescription = useBrandContext && activeBrandConfig?.industry
      ? `${activeBrandConfig.name} provides ${activeBrandConfig.industry} products and services.`
      : `A guide to ${starterName}.`;

    // Run all checks in parallel
    const [llmsTxt, robotsTxt, sitemap, schema] = await Promise.all([
      checkLlmsTxt(domain),
      checkRobotsTxt(domain),
      checkSitemap(domain),
      checkSchema(domain),
    ]);

    // Build checks array
    const checks: HealthCheck[] = [];
    const starterLlmsTxt = generateStarterLlmsTxt(
      starterName,
      starterDescription,
      [],
    );
    const organizationSchema = generateOrganizationSchema(organizationName, auditUrl);
    const llmsCopyFeedback = {
      title: `${organizationName} llms.txt starter copied`,
      description: `Paste this into ${auditUrl}/llms.txt, customize the page list, publish it, then rerun the audit.`,
    };
    const robotsCopyFeedback = {
      title: `${organizationName} AI crawler rules copied`,
      description: `Paste these rules into ${auditUrl}/robots.txt, review the bots you want to allow, publish the file, then rerun the audit.`,
    };
    const schemaCopyFeedback = {
      title: `${organizationName} Organization schema copied`,
      description: `Add this JSON-LD to the homepage head at ${auditUrl}, publish the page, then rerun the audit.`,
    };

    // llms.txt checks
    checks.push({
      id: 'llms-txt-present',
      name: 'llms.txt present',
      category: 'llms',
      status: llmsTxt.exists ? 'pass' : 'fail',
      details: llmsTxt.exists
        ? `Found at ${llmsTxt.url}`
        : 'File not found at /llms.txt',
      action: llmsTxt.exists
        ? { label: 'View', type: 'link', value: llmsTxt.url || '' }
        : { label: 'Copy starter', type: 'copy', value: starterLlmsTxt, copyFeedback: llmsCopyFeedback },
    });

    if (llmsTxt.exists) {
      checks.push({
        id: 'llms-txt-valid',
        name: 'llms.txt valid',
        category: 'llms',
        status: llmsTxt.valid ? 'pass' : 'warn',
        details: llmsTxt.valid
          ? `${llmsTxt.sizeBytes ? (llmsTxt.sizeBytes / 1024).toFixed(1) + 'KB' : 'Valid'}, well-formed`
          : llmsTxt.issues[0] || 'Validation issues found',
      });
    }

    // robots.txt checks
    checks.push({
      id: 'robots-txt-present',
      name: 'robots.txt present',
      category: 'robots',
      status: robotsTxt.exists ? 'pass' : 'warn',
      details: robotsTxt.exists
        ? `Found at ${robotsTxt.url}`
        : 'No robots.txt (all bots allowed by default)',
    });

    const blockedBots = robotsTxt.aiBots.filter(b => !b.allowed);
    const allowedBots = robotsTxt.aiBots.filter(b => b.allowed);

    checks.push({
      id: 'robots-txt-ai-bots',
      name: 'AI crawlers allowed',
      category: 'robots',
      status: blockedBots.length === 0 ? 'pass' : blockedBots.length === robotsTxt.aiBots.length ? 'fail' : 'warn',
      details: blockedBots.length === 0
        ? `All ${allowedBots.length} AI bots allowed`
        : `${blockedBots.length} of ${robotsTxt.aiBots.length} blocked`,
      action: blockedBots.length > 0
        ? { label: 'Fix', type: 'copy', value: generateAIBotAllowSnippet(), copyFeedback: robotsCopyFeedback }
        : undefined,
    });

    // sitemap checks
    checks.push({
      id: 'sitemap-present',
      name: 'sitemap.xml present',
      category: 'sitemap',
      status: sitemap.exists ? 'pass' : 'fail',
      details: sitemap.exists
        ? `${sitemap.urlCount} URLs indexed`
        : 'Sitemap not found',
      action: sitemap.exists && sitemap.url
        ? { label: 'View', type: 'link', value: sitemap.url }
        : undefined,
    });

    if (sitemap.exists) {
      const sitemapFreshness = sitemap.lastmodDate
        ? daysSince(sitemap.lastmodDate)
        : null;

      checks.push({
        id: 'sitemap-freshness',
        name: 'Sitemap freshness',
        category: 'sitemap',
        status: !sitemapFreshness ? 'warn' : sitemapFreshness <= 30 ? 'pass' : sitemapFreshness <= 90 ? 'warn' : 'fail',
        details: sitemapFreshness
          ? `lastmod ${sitemapFreshness} days ago`
          : 'No lastmod dates found',
      });
    }

    // schema checks — report all important types
    const schemaTypeFound = (type: string) => schema.types.find(t => t.type === type)?.found;

    checks.push({
      id: 'schema-organization',
      name: 'Organization schema',
      category: 'schema',
      status: schemaTypeFound('Organization') ? 'pass' : 'fail',
      details: schemaTypeFound('Organization')
        ? 'Found on homepage'
        : 'Not found on homepage',
      action: !schemaTypeFound('Organization')
        ? { label: 'Add', type: 'copy', value: organizationSchema, copyFeedback: schemaCopyFeedback }
        : undefined,
    });

    const hasArticle = schemaTypeFound('Article') || schemaTypeFound('BlogPosting');
    checks.push({
      id: 'schema-content',
      name: 'Content schema',
      category: 'schema',
      status: hasArticle ? 'pass' : 'warn',
      details: hasArticle
        ? 'Article/BlogPosting found'
        : 'No Article/BlogPosting schema',
    });

    checks.push({
      id: 'schema-faq',
      name: 'FAQ / HowTo schema',
      category: 'schema',
      status: schemaTypeFound('FAQPage') || schemaTypeFound('HowTo') ? 'pass' : 'warn',
      details: schemaTypeFound('FAQPage')
        ? 'FAQPage schema found (great for AI)'
        : schemaTypeFound('HowTo')
          ? 'HowTo schema found'
          : 'No FAQ or HowTo schema',
    });

    checks.push({
      id: 'schema-product',
      name: 'Product schema',
      category: 'schema',
      status: schemaTypeFound('Product') ? 'pass' : 'warn',
      details: schemaTypeFound('Product')
        ? 'Product schema found'
        : 'No Product schema on homepage',
    });

    checks.push({
      id: 'schema-webpage',
      name: 'WebPage schema',
      category: 'schema',
      status: schemaTypeFound('WebPage') ? 'pass' : 'warn',
      details: schemaTypeFound('WebPage')
        ? 'WebPage schema found'
        : 'No WebPage schema',
    });

    // Meta tag checks (from homepage HTML — free data)
    const { pageMeta } = schema;

    if (pageMeta.blocksAI) {
      checks.push({
        id: 'meta-robots-ai',
        name: 'Meta robots AI access',
        category: 'other',
        status: 'fail',
        details: `Meta robots contains: ${pageMeta.metaRobotsContent}`,
      });
    }

    checks.push({
      id: 'meta-description',
      name: 'Meta description',
      category: 'other',
      status: pageMeta.hasMetaDescription ? 'pass' : 'warn',
      details: pageMeta.hasMetaDescription
        ? `Present (${pageMeta.metaDescription?.slice(0, 60)}...)`
        : 'Missing — AI uses this for context',
    });

    checks.push({
      id: 'og-tags',
      name: 'Open Graph tags',
      category: 'other',
      status: pageMeta.hasOgTags ? 'pass' : 'warn',
      details: pageMeta.hasOgTags
        ? 'OG title/description found'
        : 'Missing — AI pulls context from OG tags',
    });

    checks.push({
      id: 'canonical-url',
      name: 'Canonical URL',
      category: 'other',
      status: pageMeta.hasCanonical ? 'pass' : 'warn',
      details: pageMeta.hasCanonical
        ? `Set to ${pageMeta.canonicalUrl}`
        : 'Missing — AI may cite wrong URL without canonical',
    });

    // Build summary
    const llmsChecks = checks.filter(c => c.category === 'llms').map(c => c.status);
    const robotsChecks = checks.filter(c => c.category === 'robots').map(c => c.status);
    const sitemapChecks = checks.filter(c => c.category === 'sitemap').map(c => c.status);
    const schemaChecks = checks.filter(c => c.category === 'schema').map(c => c.status);
    const otherChecks = checks.filter(c => c.category === 'other').map(c => c.status);

    const summary: SiteHealthSummary = {
      llmsTxt: statusToHealth(llmsChecks),
      robotsTxt: statusToHealth(robotsChecks),
      sitemap: statusToHealth(sitemapChecks),
      schema: statusToHealth(schemaChecks),
      pageMeta: statusToHealth(otherChecks),
      lastAuditAt: new Date().toISOString(),
    };

    // Build recommendations
    const recommendations: Recommendation[] = [];
    let priority = 1;

    // High priority: Organization schema
    if (!schemaTypeFound('Organization')) {
      recommendations.push({
        id: 'add-organization-schema',
        priority: priority++,
        title: 'Add Organization schema markup',
        description: 'AI systems use this to verify your brand identity.',
        impact: 'high',
        actions: [
          { label: 'View guide', type: 'link', value: 'https://schema.org/Organization' },
          { label: 'Copy snippet', type: 'copy', value: organizationSchema, copyFeedback: schemaCopyFeedback },
        ],
      });
    }

    // High priority: Blocked AI bots
    if (blockedBots.length > 0) {
      recommendations.push({
        id: 'unblock-ai-bots',
        priority: priority++,
        title: `Unblock ${blockedBots.map(b => b.name).join(', ')} in robots.txt`,
        description: `You're missing visibility on ${blockedBots.length} AI platform${blockedBots.length > 1 ? 's' : ''}.`,
        impact: 'high',
        actions: [
          { label: 'View robots.txt', type: 'link', value: robotsTxt.url || `https://${domain}/robots.txt` },
          { label: 'Copy fix', type: 'copy', value: generateAIBotAllowSnippet(), copyFeedback: robotsCopyFeedback },
        ],
      });
    }

    // Medium priority: llms.txt missing
    if (!llmsTxt.exists) {
      recommendations.push({
        id: 'add-llms-txt',
        priority: priority++,
        title: 'Add an llms.txt file',
        description: 'Help AI systems understand your site structure and priorities.',
        impact: 'medium',
        actions: [
          { label: 'View guide', type: 'link', value: 'https://llmstxt.org' },
          { label: 'Copy starter', type: 'copy', value: starterLlmsTxt, copyFeedback: llmsCopyFeedback },
        ],
      });
    }

    // Medium priority: Stale sitemap
    if (sitemap.exists && sitemap.lastmodDate) {
      const freshness = daysSince(sitemap.lastmodDate);
      if (freshness > 30) {
        recommendations.push({
          id: 'update-sitemap',
          priority: priority++,
          title: 'Update sitemap lastmod dates',
          description: `AI prefers fresh content. Your dates are ${freshness} days stale.`,
          impact: 'medium',
          actions: [
            { label: 'View sitemap', type: 'link', value: sitemap.url || `https://${domain}/sitemap.xml` },
          ],
        });
      }
    }

    // Low priority: Missing sitemap
    if (!sitemap.exists) {
      recommendations.push({
        id: 'add-sitemap',
        priority: priority++,
        title: 'Create a sitemap.xml file',
        description: 'AI crawlers use sitemaps to discover your content.',
        impact: 'medium',
        actions: [
          { label: 'View guide', type: 'link', value: 'https://www.sitemaps.org/protocol.html' },
        ],
      });
    }

    // Medium priority: Meta robots blocking AI
    if (pageMeta.blocksAI) {
      recommendations.push({
        id: 'fix-meta-robots',
        priority: priority++,
        title: 'Remove AI-blocking meta robots tag',
        description: `Your homepage has "${pageMeta.metaRobotsContent}" which blocks AI crawlers.`,
        impact: 'high',
        actions: [],
      });
    }

    // Low priority: Missing meta description
    if (!pageMeta.hasMetaDescription) {
      recommendations.push({
        id: 'add-meta-description',
        priority: priority++,
        title: 'Add a meta description',
        description: 'AI systems use meta descriptions for context when generating responses about your brand.',
        impact: 'low',
        actions: [],
      });
    }

    // Low priority: Missing OG tags
    if (!pageMeta.hasOgTags) {
      recommendations.push({
        id: 'add-og-tags',
        priority: priority++,
        title: 'Add Open Graph tags',
        description: 'OG tags help AI systems understand your content when it\'s shared or referenced.',
        impact: 'low',
        actions: [],
      });
    }

    // Build audit result
    const audit: SiteHealthAudit = {
      domain,
      summary,
      checks,
      recommendations: recommendations.slice(0, 5), // Top 5 recommendations
      auditedAt: new Date().toISOString(),
    };

    // Cache the result
    const cacheKey = workspaceCacheKey('site-health', currentWorkspaceId() ?? 'unscoped', 'audit', domain);
    setCachedAudit(cacheKey, audit);

    const response: SiteHealthAuditResponse = {
      ...audit,
      meta: {
        duration: Date.now() - startTime,
        cached: false,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('[Site Health API] Error running audit:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to run site health audit',
    });
  }
});

/**
 * GET /api/site-health/status
 * Get cached audit results or null if none
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Get domain from brand config or intelligence searches
    const activeBrandConfig = await getActiveBrandConfig();

    let domain = activeBrandConfig?.domain?.replace(/^https?:\/\//, '').replace(/\/$/, '');

    if (!domain) {
      const recentSearchDomain = await getRecentIntelligenceSearchDomain();

      domain = recentSearchDomain?.replace(/^https?:\/\//, '').replace(/\/$/, '') || undefined;
    }

    if (!domain) {
      return res.json({
        hasAudit: false,
        audit: null,
        meta: {
          cacheAge: 0,
          lastUpdated: new Date().toISOString(),
        },
      });
    }

    const cacheKey = workspaceCacheKey('site-health', currentWorkspaceId() ?? 'unscoped', 'audit', domain);
    const cachedAudit = getCachedAudit(cacheKey);
    const cacheEntry = auditCache.get(cacheKey);

    const response: SiteHealthStatusResponse = {
      hasAudit: cachedAudit !== null,
      audit: cachedAudit,
      meta: {
        cacheAge: cacheEntry ? Math.floor((Date.now() - cacheEntry.timestamp) / 1000) : 0,
        lastUpdated: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error('[Site Health API] Error fetching status:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to fetch site health status',
    });
  }
});

/**
 * GET /api/site-health/llms-txt
 * Check llms.txt file only
 */
router.get('/llms-txt', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    let domain = req.query.domain as string | undefined;

    if (!domain) {
      const activeBrandConfig = await getActiveBrandConfig();

      domain = activeBrandConfig?.domain?.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }

    if (!domain) {
      return res.status(400).json({
        code: 'NO_DOMAIN',
        message: 'No domain provided',
      });
    }

    const result = await checkLlmsTxt(domain);

    const response: LlmsTxtResponse = {
      ...result,
      meta: { duration: Date.now() - startTime },
    };

    res.json(response);
  } catch (error) {
    console.error('[Site Health API] Error checking llms.txt:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to check llms.txt',
    });
  }
});

/**
 * GET /api/site-health/robots-txt
 * Check robots.txt file only
 */
router.get('/robots-txt', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    let domain = req.query.domain as string | undefined;

    if (!domain) {
      const activeBrandConfig = await getActiveBrandConfig();

      domain = activeBrandConfig?.domain?.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }

    if (!domain) {
      return res.status(400).json({
        code: 'NO_DOMAIN',
        message: 'No domain provided',
      });
    }

    const result = await checkRobotsTxt(domain);

    const response: RobotsTxtResponse = {
      ...result,
      meta: { duration: Date.now() - startTime },
    };

    res.json(response);
  } catch (error) {
    console.error('[Site Health API] Error checking robots.txt:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to check robots.txt',
    });
  }
});

/**
 * GET /api/site-health/sitemap
 * Check sitemap.xml only
 */
router.get('/sitemap', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    let domain = req.query.domain as string | undefined;

    if (!domain) {
      const activeBrandConfig = await getActiveBrandConfig();

      domain = activeBrandConfig?.domain?.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }

    if (!domain) {
      return res.status(400).json({
        code: 'NO_DOMAIN',
        message: 'No domain provided',
      });
    }

    const result = await checkSitemap(domain);

    const response: SitemapResponse = {
      ...result,
      meta: { duration: Date.now() - startTime },
    };

    res.json(response);
  } catch (error) {
    console.error('[Site Health API] Error checking sitemap:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to check sitemap',
    });
  }
});

/**
 * GET /api/site-health/schema
 * Check schema markup only
 */
router.get('/schema', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    let domain = req.query.domain as string | undefined;

    if (!domain) {
      const activeBrandConfig = await getActiveBrandConfig();

      domain = activeBrandConfig?.domain?.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }

    if (!domain) {
      return res.status(400).json({
        code: 'NO_DOMAIN',
        message: 'No domain provided',
      });
    }

    const result = await checkSchema(domain);

    const response: SchemaResponse = {
      ...result,
      meta: { duration: Date.now() - startTime },
    };

    res.json(response);
  } catch (error) {
    console.error('[Site Health API] Error checking schema:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to check schema',
    });
  }
});

export default router;
