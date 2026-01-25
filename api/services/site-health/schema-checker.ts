/**
 * Schema Markup Checker Service
 *
 * Fetches a page and checks for JSON-LD schema markup.
 * Looks for important schema types for AI visibility.
 */

import type { SchemaStatus, SchemaTypeCheck, PageMetaInfo } from '@shared/types/site-health';
import { IMPORTANT_SCHEMA_TYPES } from '@shared/types/site-health';

/**
 * Extract JSON-LD schema from HTML
 */
function extractJsonLd(html: string): any[] {
  const schemas: any[] = [];

  // Match all <script type="application/ld+json"> tags
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const jsonContent = match[1].trim();
      const parsed = JSON.parse(jsonContent);

      // Handle @graph arrays
      if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
        schemas.push(...parsed['@graph']);
      } else if (Array.isArray(parsed)) {
        schemas.push(...parsed);
      } else {
        schemas.push(parsed);
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  }

  return schemas;
}

/**
 * Get all schema types from a list of schema objects
 */
function getSchemaTypes(schemas: any[]): Set<string> {
  const types = new Set<string>();

  function extractTypes(obj: any) {
    if (!obj || typeof obj !== 'object') return;

    if (obj['@type']) {
      if (Array.isArray(obj['@type'])) {
        obj['@type'].forEach((t: string) => types.add(t));
      } else {
        types.add(obj['@type']);
      }
    }

    // Recursively check nested objects
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key])) {
        obj[key].forEach(extractTypes);
      } else if (typeof obj[key] === 'object') {
        extractTypes(obj[key]);
      }
    }
  }

  schemas.forEach(extractTypes);
  return types;
}

/**
 * Extract meta tag info from HTML
 */
function extractPageMeta(html: string): PageMetaInfo {
  // Canonical
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  const hasCanonical = !!canonicalMatch;
  const canonicalUrl = canonicalMatch?.[1] || null;

  // Meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  const hasMetaDescription = !!descMatch;
  const metaDescription = descMatch?.[1] || null;

  // Open Graph
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  const hasOgTags = !!(ogTitleMatch || ogDescMatch);

  // Meta robots
  const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']robots["']/i);
  const hasMetaRobots = !!robotsMatch;
  const metaRobotsContent = robotsMatch?.[1] || null;
  const blocksAI = metaRobotsContent
    ? /noai|noimageai/i.test(metaRobotsContent)
    : false;

  return {
    hasCanonical,
    canonicalUrl,
    hasMetaDescription,
    metaDescription,
    hasOgTags,
    ogTitle: ogTitleMatch?.[1] || null,
    ogDescription: ogDescMatch?.[1] || null,
    hasMetaRobots,
    metaRobotsContent,
    blocksAI,
  };
}

const EMPTY_PAGE_META: PageMetaInfo = {
  hasCanonical: false, canonicalUrl: null,
  hasMetaDescription: false, metaDescription: null,
  hasOgTags: false, ogTitle: null, ogDescription: null,
  hasMetaRobots: false, metaRobotsContent: null, blocksAI: false,
};

/**
 * Check a domain's homepage for schema markup
 */
export async function checkSchema(domain: string): Promise<SchemaStatus> {
  const url = `https://${domain}`;
  const issues: string[] = [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OpenAEO-Bot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        types: IMPORTANT_SCHEMA_TYPES.map(type => ({
          type,
          found: false,
          pages: 0,
          totalPages: 1,
        })),
        issues: [`Failed to fetch homepage: HTTP ${response.status}`],
        pageMeta: EMPTY_PAGE_META,
      };
    }

    const html = await response.text();
    const pageMeta = extractPageMeta(html);
    const schemas = extractJsonLd(html);
    const foundTypes = getSchemaTypes(schemas);

    // Check each important schema type
    const typeChecks: SchemaTypeCheck[] = IMPORTANT_SCHEMA_TYPES.map(type => {
      const found = foundTypes.has(type);
      return {
        type,
        found,
        pages: found ? 1 : 0,
        totalPages: 1,
      };
    });

    // Generate issues
    const missingCritical: string[] = [];
    const missingRecommended: string[] = [];

    // Organization is critical
    if (!foundTypes.has('Organization')) {
      missingCritical.push('Organization');
      issues.push('Missing Organization schema. AI systems use this to verify your brand identity.');
    }

    // WebPage or WebSite is expected
    if (!foundTypes.has('WebPage') && !foundTypes.has('WebSite')) {
      missingRecommended.push('WebPage');
    }

    // FAQPage is highly recommended for AI
    if (!foundTypes.has('FAQPage') && !foundTypes.has('HowTo')) {
      issues.push('Consider adding FAQPage or HowTo schema. AI systems frequently cite Q&A content.');
    }

    // Check for any schema at all
    if (schemas.length === 0) {
      issues.unshift('No JSON-LD schema markup found on homepage.');
    } else if (foundTypes.size === 0) {
      issues.unshift('Schema markup found but no valid @type detected.');
    }

    // Check for common content schemas
    const contentSchemas = ['Article', 'BlogPosting', 'NewsArticle', 'Product'];
    const hasContentSchema = contentSchemas.some(t => foundTypes.has(t));
    if (!hasContentSchema && foundTypes.size > 0) {
      issues.push('No content schema (Article, BlogPosting, Product) found on homepage. Add these to content pages.');
    }

    return {
      types: typeChecks,
      issues,
      pageMeta,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        types: IMPORTANT_SCHEMA_TYPES.map(type => ({
          type,
          found: false,
          pages: 0,
          totalPages: 1,
        })),
        issues: ['Request timed out while fetching homepage'],
        pageMeta: EMPTY_PAGE_META,
      };
    }

    return {
      types: IMPORTANT_SCHEMA_TYPES.map(type => ({
        type,
        found: false,
        pages: 0,
        totalPages: 1,
      })),
      issues: [`Failed to check schema: ${error.message}`],
      pageMeta: EMPTY_PAGE_META,
    };
  }
}

/**
 * Generate a basic Organization schema snippet
 */
export function generateOrganizationSchema(
  name: string,
  url: string,
  description?: string,
  logo?: string
): string {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
  };

  if (description) {
    schema.description = description;
  }

  if (logo) {
    schema.logo = logo;
  }

  return JSON.stringify(schema, null, 2);
}
