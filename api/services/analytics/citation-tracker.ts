/**
 * Citation Influence Tracker
 *
 * Extracts and analyzes URLs/citations from LLM responses to understand
 * which sources influence AI recommendations.
 *
 * Uses a tiered approach for URL extraction:
 * 1. Primary: linkify-it (robust URL detection including bare domains)
 * 2. Fallback: regex patterns (if linkify-it fails)
 */

import LinkifyIt from 'linkify-it';

// Initialize linkify-it with sensible defaults for citation extraction
const linkify = new LinkifyIt();

// Configure linkify-it for our use case
linkify
  .add('ftp:', null)     // Disable FTP (not relevant for citations)
  .set({ fuzzyEmail: false });  // Disable email matching (we don't want emails)

export interface Citation {
  /** Full URL */
  url: string;
  /** Domain extracted from URL */
  domain: string;
  /** Text context around the citation */
  context: string;
  /** Platform that cited this source */
  platform: string;
  /** Position in response (0-1, lower = earlier) */
  position: number;
}

export interface DomainInfluence {
  /** Domain name */
  domain: string;
  /** Total citations across all responses */
  citationCount: number;
  /** Unique platforms that cite this domain */
  platforms: string[];
  /** Platform diversity score (0-1) */
  platformDiversity: number;
  /** Average position score (higher = cited earlier) */
  avgPositionScore: number;
  /** Overall influence score (0-100) */
  influenceScore: number;
}

export interface CitationAnalysis {
  /** All extracted citations */
  citations: Citation[];
  /** Domain-level aggregation */
  domains: DomainInfluence[];
  /** Citations that mention the brand */
  brandRelatedCitations: Citation[];
  /** Top influential domains */
  topDomains: DomainInfluence[];
  /** Metadata */
  metadata: {
    totalCitations: number;
    uniqueDomains: number;
    platformsCovered: number;
    analyzedAt: Date;
  };
}

// URL extraction patterns
const URL_PATTERNS = [
  // Standard URLs
  /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,
  // Domain mentions without protocol
  /(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`\[\]]*)?/gi,
];

// Common citation indicators
const CITATION_INDICATORS = [
  /according to/i,
  /source[sd]?:/i,
  /reference[sd]?:/i,
  /based on/i,
  /as reported by/i,
  /from [\w]+\.(?:com|org|net|io|co)/i,
  /\[[\d]+\]/,  // Numbered citations
  /\([\w\s]+,\s*\d{4}\)/, // Academic citations
];

// Markdown link pattern for extracting URLs from [text](url) format
const MARKDOWN_LINK_PATTERN = /\[([^\]]*)\]\(([^)]+)\)/g;

/**
 * Primary URL extraction using linkify-it
 * Handles: full URLs, www prefixed, bare domains with paths
 */
function extractUrlsLinkify(text: string): string[] {
  try {
    const matches = linkify.match(text);
    if (matches && matches.length > 0) {
      return matches.map(m => m.url);
    }
  } catch (e) {
    console.warn('[Citation] linkify-it failed:', e);
  }
  return [];
}

/**
 * Fallback URL extraction using regex patterns
 */
function extractUrlsRegex(text: string): string[] {
  const urls: string[] = [];
  const seenUrls = new Set<string>();

  for (const pattern of URL_PATTERNS) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      const url = match[0];
      if (!seenUrls.has(url.toLowerCase())) {
        seenUrls.add(url.toLowerCase());
        urls.push(url);
      }
    }
  }

  return urls;
}

/**
 * Extract URLs from markdown links [text](url)
 */
function extractMarkdownUrls(text: string): string[] {
  const urls: string[] = [];
  let match;
  while ((match = MARKDOWN_LINK_PATTERN.exec(text)) !== null) {
    urls.push(match[2]); // The URL is in capture group 2
  }
  return urls;
}

/**
 * Main URL extraction function - tiered approach
 * 1. Markdown links (explicit URLs in markdown format)
 * 2. linkify-it (robust URL detection)
 * 3. Regex fallback (if linkify-it finds nothing)
 */
function extractUrls(text: string): string[] {
  const seenUrls = new Set<string>();
  const urls: string[] = [];

  // First: extract markdown links (these are always intentional URLs)
  for (const url of extractMarkdownUrls(text)) {
    const lower = url.toLowerCase();
    if (!seenUrls.has(lower)) {
      seenUrls.add(lower);
      urls.push(url);
    }
  }

  // Primary: linkify-it
  const linkifyUrls = extractUrlsLinkify(text);
  if (linkifyUrls.length > 0) {
    for (const url of linkifyUrls) {
      const lower = url.toLowerCase();
      if (!seenUrls.has(lower)) {
        seenUrls.add(lower);
        urls.push(url);
      }
    }
    return urls;
  }

  // Fallback: regex patterns (only if linkify-it found nothing)
  for (const url of extractUrlsRegex(text)) {
    const lower = url.toLowerCase();
    if (!seenUrls.has(lower)) {
      seenUrls.add(lower);
      urls.push(url);
    }
  }

  return urls;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    // Add protocol if missing
    let normalizedUrl = url;
    if (!url.startsWith('http')) {
      normalizedUrl = 'https://' + url;
    }

    const urlObj = new URL(normalizedUrl);
    let domain = urlObj.hostname;

    // Remove www prefix
    if (domain.startsWith('www.')) {
      domain = domain.slice(4);
    }

    return domain.toLowerCase();
  } catch {
    // Fallback: extract domain-like pattern
    const match = url.match(/(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,})/);
    return match ? match[1].toLowerCase() : url.toLowerCase();
  }
}

/**
 * Get context around a URL mention (surrounding text)
 */
function getContext(text: string, url: string, contextLength: number = 100): string {
  const index = text.indexOf(url);
  if (index === -1) return '';

  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + url.length + contextLength);

  let context = text.slice(start, end);

  // Clean up partial words at boundaries
  if (start > 0) {
    const firstSpace = context.indexOf(' ');
    if (firstSpace > 0 && firstSpace < 20) {
      context = '...' + context.slice(firstSpace + 1);
    }
  }
  if (end < text.length) {
    const lastSpace = context.lastIndexOf(' ');
    if (lastSpace > context.length - 20) {
      context = context.slice(0, lastSpace) + '...';
    }
  }

  return context.trim();
}

/**
 * Extract all citations from a text
 */
export function extractCitations(
  text: string,
  platform: string
): Citation[] {
  const citations: Citation[] = [];
  const seenUrls = new Set<string>();

  // Use the tiered URL extraction
  const urls = extractUrls(text);

  for (const url of urls) {
    // Skip if already seen
    if (seenUrls.has(url.toLowerCase())) continue;
    seenUrls.add(url.toLowerCase());

    // Skip common non-citation URLs
    if (isNonCitationUrl(url)) continue;

    const domain = extractDomain(url);
    const index = text.indexOf(url);
    const position = index >= 0 ? index / text.length : 0;
    const context = getContext(text, url);

    citations.push({
      url,
      domain,
      context,
      platform,
      position,
    });
  }

  return citations;
}

/**
 * Check if URL is likely not a meaningful citation
 */
function isNonCitationUrl(url: string): boolean {
  const skipPatterns = [
    /example\.com/i,
    /localhost/i,
    /127\.0\.0\.1/i,
    /placeholder/i,
    /test\.com/i,
    /\.(jpg|jpeg|png|gif|svg|css|js)$/i,
  ];

  return skipPatterns.some(p => p.test(url));
}

/**
 * Calculate influence score for a domain
 */
function calculateInfluenceScore(
  citationCount: number,
  platformDiversity: number,
  avgPositionScore: number
): number {
  // Weights: citations (40%), platform diversity (35%), position (25%)
  const citationScore = Math.min(40, citationCount * 8); // Max 40 at 5+ citations
  const diversityScore = platformDiversity * 35;
  const positionScore = avgPositionScore * 25;

  return Math.round(citationScore + diversityScore + positionScore);
}

/**
 * Aggregate citations by domain
 */
export function aggregateBydomain(
  citations: Citation[],
  totalPlatforms: number = 6
): DomainInfluence[] {
  const domainMap = new Map<string, {
    citations: Citation[];
    platforms: Set<string>;
  }>();

  for (const citation of citations) {
    if (!domainMap.has(citation.domain)) {
      domainMap.set(citation.domain, {
        citations: [],
        platforms: new Set(),
      });
    }

    const entry = domainMap.get(citation.domain)!;
    entry.citations.push(citation);
    entry.platforms.add(citation.platform);
  }

  const domains: DomainInfluence[] = [];

  for (const [domain, data] of Array.from(domainMap.entries())) {
    const platforms: string[] = Array.from(data.platforms);
    const platformDiversity = platforms.length / totalPlatforms;

    // Average position score (inverted - earlier = higher)
    const avgPosition = data.citations.reduce((s: number, c: Citation) => s + c.position, 0) / data.citations.length;
    const avgPositionScore = 1 - avgPosition;

    const influenceScore = calculateInfluenceScore(
      data.citations.length,
      platformDiversity,
      avgPositionScore
    );

    domains.push({
      domain,
      citationCount: data.citations.length,
      platforms,
      platformDiversity: Math.round(platformDiversity * 100) / 100,
      avgPositionScore: Math.round(avgPositionScore * 100) / 100,
      influenceScore,
    });
  }

  // Sort by influence score
  domains.sort((a, b) => b.influenceScore - a.influenceScore);

  return domains;
}

/**
 * Filter citations that mention a specific brand
 */
export function filterBrandCitations(
  citations: Citation[],
  brandName: string
): Citation[] {
  const lowerBrand = brandName.toLowerCase();

  return citations.filter(c =>
    c.context.toLowerCase().includes(lowerBrand) ||
    c.domain.includes(lowerBrand)
  );
}

/**
 * Analyze citations from multiple responses
 */
export function analyzeCitations(
  responses: Array<{ text: string; platform: string }>,
  brandName?: string,
  totalPlatforms: number = 6
): CitationAnalysis {
  // Extract all citations
  const allCitations: Citation[] = [];

  for (const response of responses) {
    const citations = extractCitations(response.text, response.platform);
    allCitations.push(...citations);
  }

  // Aggregate by domain
  const domains = aggregateBydomain(allCitations, totalPlatforms);

  // Find brand-related citations
  const brandRelatedCitations = brandName
    ? filterBrandCitations(allCitations, brandName)
    : [];

  // Get unique platforms
  const uniquePlatforms = new Set(allCitations.map(c => c.platform));

  return {
    citations: allCitations,
    domains,
    brandRelatedCitations,
    topDomains: domains.slice(0, 10),
    metadata: {
      totalCitations: allCitations.length,
      uniqueDomains: domains.length,
      platformsCovered: uniquePlatforms.size,
      analyzedAt: new Date(),
    },
  };
}

/**
 * Get simple influence score for a domain (0-100)
 */
export function getDomainInfluence(
  responses: Array<{ text: string; platform: string }>,
  domain: string
): number {
  const analysis = analyzeCitations(responses);
  const domainData = analysis.domains.find(d => d.domain === domain);
  return domainData?.influenceScore || 0;
}
