/**
 * Sitemap Checker Service
 *
 * Fetches and validates a site's sitemap.xml file.
 * Checks URL count and lastmod freshness.
 */

import type { SitemapStatus } from '@shared/types/site-health';

/**
 * Simple XML parser for sitemap
 */
function extractSitemapInfo(xml: string): { urls: string[]; lastmod: string | null } {
  const urls: string[] = [];
  let mostRecentLastmod: string | null = null;

  // Extract all <loc> tags
  const locMatches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
  for (const match of locMatches) {
    const url = match.replace(/<\/?loc>/g, '').trim();
    if (url) urls.push(url);
  }

  // Extract all <lastmod> tags and find the most recent
  const lastmodMatches = xml.match(/<lastmod>([^<]+)<\/lastmod>/g) || [];
  for (const match of lastmodMatches) {
    const date = match.replace(/<\/?lastmod>/g, '').trim();
    if (date && (!mostRecentLastmod || date > mostRecentLastmod)) {
      mostRecentLastmod = date;
    }
  }

  return { urls, lastmod: mostRecentLastmod };
}

/**
 * Check a domain's sitemap.xml file
 */
export async function checkSitemap(domain: string): Promise<SitemapStatus> {
  const possiblePaths = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemap/',
  ];

  for (const path of possiblePaths) {
    const url = `https://${domain}${path}`;
    const issues: string[] = [];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'OpenAEO-Bot/1.0',
          'Accept': 'application/xml, text/xml, */*',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        continue; // Try next path
      }

      const content = await response.text();

      // Check if it's valid XML
      if (!content.includes('<?xml') && !content.includes('<urlset') && !content.includes('<sitemapindex')) {
        issues.push('File does not appear to be valid XML');
        continue;
      }

      // Parse sitemap
      const { urls, lastmod } = extractSitemapInfo(content);

      // Check URL count
      if (urls.length === 0) {
        issues.push('Sitemap contains no URLs');
      }

      // Check lastmod freshness
      let lastmodDate: string | null = null;
      if (lastmod) {
        lastmodDate = lastmod;
        const lastmodTime = new Date(lastmod).getTime();
        const now = Date.now();
        const daysSinceUpdate = Math.floor((now - lastmodTime) / (24 * 60 * 60 * 1000));

        if (daysSinceUpdate > 90) {
          issues.push(`Sitemap lastmod is ${daysSinceUpdate} days old. AI prefers fresh content.`);
        } else if (daysSinceUpdate > 30) {
          issues.push(`Sitemap lastmod is ${daysSinceUpdate} days old. Consider updating more frequently.`);
        }
      } else {
        issues.push('No lastmod dates found. AI systems use these to prioritize fresh content.');
      }

      // Check for sitemap index
      if (content.includes('<sitemapindex')) {
        // This is a sitemap index, count child sitemaps
        const sitemapMatches = content.match(/<sitemap>/g) || [];
        if (sitemapMatches.length > 0) {
          issues.push(`This is a sitemap index with ${sitemapMatches.length} child sitemaps.`);
        }
      }

      return {
        exists: true,
        url,
        urlCount: urls.length,
        lastmodPresent: lastmod !== null,
        lastmodDate,
        issues,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          exists: false,
          url,
          urlCount: 0,
          lastmodPresent: false,
          lastmodDate: null,
          issues: ['Request timed out while fetching sitemap'],
        };
      }
      // Continue to next path on error
      continue;
    }
  }

  // No sitemap found at any path
  return {
    exists: false,
    url: null,
    urlCount: 0,
    lastmodPresent: false,
    lastmodDate: null,
    issues: [
      'No sitemap.xml found. AI crawlers use sitemaps to discover your content.',
      'Create a sitemap at /sitemap.xml to improve AI visibility.',
    ],
  };
}

/**
 * Calculate days since a date string
 */
export function daysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
}
