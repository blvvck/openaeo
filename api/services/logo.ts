/**
 * Logo Caching Service
 *
 * Fetches and caches company logos to avoid repeated external API calls.
 * Uses a 30-day cache expiry with fallback chain:
 * 1. logo.dev (best quality, costs money)
 * 2. Clearbit (good quality, free)
 * 3. Google Favicon (always available, lower quality)
 */

import { prisma } from '../prisma';
import type { Logo, LogoSource } from '@shared/schema';

function mapLogo(row: Record<string, unknown>): Logo {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
    value,
  ])) as Logo;
}

const LOGO_DEV_TOKEN = process.env.LOGO_DEV_TOKEN;

// Cache duration: 30 days in milliseconds
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Check if a URL returns a valid image
 */
async function isValidImageUrl(url: string): Promise<{ valid: boolean; contentType?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { valid: false };
    }

    const contentType = response.headers.get('content-type') || '';
    const isImage = contentType.startsWith('image/');

    return { valid: isImage, contentType: isImage ? contentType : undefined };
  } catch {
    return { valid: false };
  }
}

/**
 * Fetch logo from logo.dev (best quality)
 */
async function fetchFromLogoDev(domain: string): Promise<{ url: string; contentType?: string } | null> {
  if (!LOGO_DEV_TOKEN) return null;
  const url = `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}`;
  const result = await isValidImageUrl(url);

  if (result.valid) {
    return { url, contentType: result.contentType };
  }
  return null;
}

/**
 * Fetch logo from Clearbit (good quality, free)
 */
async function fetchFromClearbit(domain: string): Promise<{ url: string; contentType?: string } | null> {
  const url = `https://logo.clearbit.com/${domain}`;
  const result = await isValidImageUrl(url);

  if (result.valid) {
    return { url, contentType: result.contentType };
  }
  return null;
}

/**
 * Fetch logo from Google Favicon (always available)
 */
async function fetchFromGoogleFavicon(domain: string): Promise<{ url: string; contentType?: string } | null> {
  const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  const result = await isValidImageUrl(url);

  if (result.valid) {
    return { url, contentType: result.contentType };
  }
  return null;
}

/**
 * Check if cached logo is stale (older than 30 days)
 */
function isCacheStale(fetchedAt: Date): boolean {
  const now = Date.now();
  const fetchedTime = fetchedAt.getTime();
  return now - fetchedTime > CACHE_DURATION_MS;
}

/**
 * Get logo for a domain (with caching)
 *
 * @param domain - The company domain (e.g., "hubspot.com")
 * @returns Logo URL and metadata
 */
export async function getLogo(domain: string): Promise<{ logoUrl: string; source: LogoSource }> {
  // Normalize domain
  const normalizedDomain = domain
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .trim();

  // 1. Check cache
  const cachedRow = await prisma.logos.findUnique({ where: { domain: normalizedDomain } });
  const cached = cachedRow ? mapLogo(cachedRow) : undefined;

  if (cached && !isCacheStale(cached.fetchedAt)) {
    console.info(`[Logo] Cache hit for ${normalizedDomain}`);
    return {
      logoUrl: cached.logoUrl,
      source: cached.source as LogoSource,
    };
  }

  console.info(`[Logo] Cache miss for ${normalizedDomain}, fetching...`);

  // 2. Try logo.dev first (best quality)
  let result = await fetchFromLogoDev(normalizedDomain);
  let source: LogoSource = 'logo_dev';

  // 3. Fallback to Clearbit
  if (!result) {
    console.info(`[Logo] logo.dev failed for ${normalizedDomain}, trying Clearbit...`);
    result = await fetchFromClearbit(normalizedDomain);
    source = 'clearbit';
  }

  // 4. Fallback to Google Favicon
  if (!result) {
    console.info(`[Logo] Clearbit failed for ${normalizedDomain}, trying Google Favicon...`);
    result = await fetchFromGoogleFavicon(normalizedDomain);
    source = 'google_favicon';
  }

  // 5. If all sources fail, use a placeholder
  if (!result) {
    console.info(`[Logo] All sources failed for ${normalizedDomain}, using placeholder`);
    // Use Google Favicon URL anyway as a fallback (it usually returns something)
    result = {
      url: `https://www.google.com/s2/favicons?domain=${normalizedDomain}&sz=64`,
      contentType: 'image/png',
    };
    source = 'google_favicon';
  }

  // 6. Store in cache (upsert)
  await prisma.logos.upsert({
    where: { domain: normalizedDomain },
    create: {
      domain: normalizedDomain,
      logo_url: result.url,
      source,
      fetched_at: new Date(),
      content_type: result.contentType || null,
    },
    update: {
      logo_url: result.url,
      source,
      fetched_at: new Date(),
      content_type: result.contentType || null,
    },
  });

  console.info(`[Logo] Cached ${normalizedDomain} from ${source}`);

  return {
    logoUrl: result.url,
    source,
  };
}

/**
 * Get multiple logos at once (batch operation)
 *
 * @param domains - Array of company domains
 * @returns Map of domain to logo data
 */
export async function getLogos(domains: string[]): Promise<Map<string, { logoUrl: string; source: LogoSource }>> {
  const results = new Map<string, { logoUrl: string; source: LogoSource }>();

  // Process in parallel with concurrency limit
  const CONCURRENCY = 5;
  const chunks: string[][] = [];

  for (let i = 0; i < domains.length; i += CONCURRENCY) {
    chunks.push(domains.slice(i, i + CONCURRENCY));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (domain) => {
      const result = await getLogo(domain);
      results.set(domain, result);
    });
    await Promise.all(promises);
  }

  return results;
}

/**
 * Invalidate cached logo for a domain
 * Forces re-fetch on next request
 */
export async function invalidateLogo(domain: string): Promise<void> {
  const normalizedDomain = domain
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .trim();

  await prisma.logos.deleteMany({ where: { domain: normalizedDomain } });
  console.info(`[Logo] Invalidated cache for ${normalizedDomain}`);
}

/**
 * Get cache statistics
 */
export async function getLogoStats(): Promise<{
  totalCached: number;
  bySource: Record<LogoSource, number>;
  staleCount: number;
}> {
  const all = (await prisma.logos.findMany()).map(mapLogo);

  const staleThreshold = new Date(Date.now() - CACHE_DURATION_MS);
  const staleCount = all.filter((l) => l.fetchedAt < staleThreshold).length;

  const bySource: Record<LogoSource, number> = {
    logo_dev: 0,
    clearbit: 0,
    google_favicon: 0,
  };

  for (const logo of all) {
    const source = logo.source as LogoSource;
    if (source in bySource) {
      bySource[source]++;
    }
  }

  return {
    totalCached: all.length,
    bySource,
    staleCount,
  };
}
