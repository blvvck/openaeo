/**
 * Citations API Hooks
 *
 * React Query hooks for the Citations page.
 * Uses mock data generators until backend endpoints are implemented.
 *
 * Endpoints (when ready):
 * - GET /api/citations/overview — Tab metrics
 * - GET /api/citations — Paginated citation list
 * - GET /api/citations/:id — Single citation detail
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { workspaceFetch } from '@/lib/workspace-query';
import type {
  CitationsOverviewResponse,
  CitationsListResponse,
  CitationDetailResponse,
  CitationType,
  CitationSentiment,
  CitationItem,
  TimeRangePreset,
} from '@shared/types';

// =============================================================================
// Mock Data Generators
// =============================================================================

function generateMockOverview(): CitationsOverviewResponse {
  return {
    total: { count: 342, trend: 12 },
    byType: {
      owned: { count: 127, percentage: 37, trend: 8 },
      thirdParty: { count: 156, percentage: 46, trend: 15 },
      social: { count: 59, percentage: 17, trend: -3 },
    },
    topSource: {
      url: 'https://g2.com/products/acme-reviews',
      displayUrl: 'g2.com/products/acme',
      domain: 'g2.com',
      type: 'third-party',
      count: 47,
    },
    uniqueSources: 86,
    uniqueSourcesTrend: 4,
    meta: {
      cacheAge: 120,
      lastUpdated: new Date().toISOString(),
      dataFreshness: 'live',
    },
  };
}

const SAMPLE_CITATIONS: Omit<CitationItem, 'id'>[] = [
  {
    url: 'https://g2.com/products/acme-reviews',
    displayUrl: 'g2.com/products/acme',
    domain: 'g2.com',
    type: 'third-party',
    platforms: ['chatgpt', 'claude', 'perplexity', 'gemini'],
    count: 47,
    trend: 12,
    sentiment: 'positive',
    lastCited: new Date().toISOString(),
  },
  {
    url: 'https://acme.com/pricing',
    displayUrl: 'acme.com/pricing',
    domain: 'acme.com',
    type: 'owned',
    platforms: ['chatgpt', 'claude', 'perplexity'],
    count: 38,
    trend: 8,
    sentiment: 'positive',
    lastCited: new Date().toISOString(),
  },
  {
    url: 'https://reddit.com/r/crm/comments/acme-review',
    displayUrl: 'reddit.com/r/crm/acme-review',
    domain: 'reddit.com',
    type: 'social',
    platforms: ['chatgpt', 'perplexity'],
    count: 31,
    trend: -5,
    sentiment: 'mixed',
    lastCited: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    url: 'https://capterra.com/acme-reviews',
    displayUrl: 'capterra.com/acme-reviews',
    domain: 'capterra.com',
    type: 'third-party',
    platforms: ['chatgpt', 'claude'],
    count: 28,
    trend: 6,
    sentiment: 'positive',
    lastCited: new Date().toISOString(),
  },
  {
    url: 'https://acme.com/features',
    displayUrl: 'acme.com/features',
    domain: 'acme.com',
    type: 'owned',
    platforms: ['chatgpt', 'claude', 'gemini'],
    count: 25,
    trend: 15,
    sentiment: 'positive',
    lastCited: new Date().toISOString(),
  },
  {
    url: 'https://twitter.com/acme_crm/status/review-thread',
    displayUrl: 'twitter.com/acme_crm/review',
    domain: 'twitter.com',
    type: 'social',
    platforms: ['perplexity'],
    count: 18,
    trend: 2,
    sentiment: 'neutral',
    lastCited: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    url: 'https://forbes.com/sites/tech/best-crm-2026',
    displayUrl: 'forbes.com/best-crm-2026',
    domain: 'forbes.com',
    type: 'third-party',
    platforms: ['chatgpt', 'perplexity'],
    count: 22,
    trend: 18,
    sentiment: 'positive',
    lastCited: new Date().toISOString(),
  },
  {
    url: 'https://acme.com/blog/crm-guide',
    displayUrl: 'acme.com/blog/crm-guide',
    domain: 'acme.com',
    type: 'owned',
    platforms: ['claude'],
    count: 15,
    trend: 3,
    sentiment: 'positive',
    lastCited: new Date().toISOString(),
  },
  {
    url: 'https://trustpilot.com/review/acme.com',
    displayUrl: 'trustpilot.com/review/acme',
    domain: 'trustpilot.com',
    type: 'third-party',
    platforms: ['chatgpt', 'gemini'],
    count: 19,
    trend: -2,
    sentiment: 'mixed',
    lastCited: new Date().toISOString(),
  },
  {
    url: 'https://linkedin.com/company/acme/posts',
    displayUrl: 'linkedin.com/company/acme',
    domain: 'linkedin.com',
    type: 'social',
    platforms: ['perplexity'],
    count: 10,
    trend: 5,
    sentiment: 'positive',
    lastCited: new Date().toISOString(),
  },
];

function generateMockCitations(params: {
  type?: CitationType;
  platform?: string;
  sentiment?: CitationSentiment;
  search?: string;
  limit: number;
  offset: number;
}): CitationsListResponse {
  let filtered = [...SAMPLE_CITATIONS];

  // Filter by type
  if (params.type) {
    filtered = filtered.filter(c => c.type === params.type);
  }

  // Filter by platform
  if (params.platform) {
    filtered = filtered.filter(c => c.platforms.includes(params.platform!));
  }

  // Filter by sentiment
  if (params.sentiment) {
    filtered = filtered.filter(c => c.sentiment === params.sentiment);
  }

  // Filter by search
  if (params.search) {
    const lowerSearch = params.search.toLowerCase();
    filtered = filtered.filter(
      c => c.displayUrl.toLowerCase().includes(lowerSearch) ||
           c.domain.toLowerCase().includes(lowerSearch)
    );
  }

  // Generate more citations if needed for pagination
  while (filtered.length < params.limit + params.offset + 10) {
    const base = SAMPLE_CITATIONS[filtered.length % SAMPLE_CITATIONS.length];
    filtered.push({
      ...base,
      url: `${base.url}-${filtered.length}`,
      displayUrl: `${base.displayUrl}-${filtered.length}`,
      count: Math.max(1, base.count - filtered.length),
    });
  }

  const citations = filtered.slice(params.offset, params.offset + params.limit).map((c, i) => ({
    ...c,
    id: `citation-${params.offset + i}`,
  }));

  return {
    citations,
    total: filtered.length,
    hasMore: params.offset + params.limit < filtered.length,
    meta: {
      cacheAge: 120,
      lastUpdated: new Date().toISOString(),
      dataFreshness: 'live',
    },
  };
}

function generateMockCitationDetail(citationId: string): CitationDetailResponse {
  const base = SAMPLE_CITATIONS[0];

  return {
    id: citationId,
    ...base,
    platformBreakdown: [
      { platformId: 'chatgpt', platformName: 'ChatGPT', count: 23, lastCited: new Date().toISOString() },
      { platformId: 'claude', platformName: 'Claude', count: 15, lastCited: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      { platformId: 'perplexity', platformName: 'Perplexity', count: 6, lastCited: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { platformId: 'gemini', platformName: 'Gemini', count: 3, lastCited: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
    ],
    promptsCiting: [
      { id: 'p1', text: 'best CRM software for small business', citationCount: 12 },
      { id: 'p2', text: 'acme reviews and ratings', citationCount: 8 },
      { id: 'p3', text: 'salesforce vs acme comparison', citationCount: 6 },
      { id: 'p4', text: 'CRM pricing comparison 2026', citationCount: 5 },
      { id: 'p5', text: 'top rated CRM tools', citationCount: 4 },
    ],
    totalPromptsCiting: 18,
    sampleSnippet: 'According to G2 reviews, Acme has a 4.5/5 rating with users praising its ease of use and integrations. Many reviewers highlight the intuitive interface and responsive customer support.',
    sentimentBreakdown: {
      positive: 72,
      neutral: 18,
      negative: 10,
    },
    meta: {
      cacheAge: 120,
      lastUpdated: new Date().toISOString(),
    },
  };
}

// =============================================================================
// API Hooks
// =============================================================================

/**
 * Fetch citations overview metrics
 */
export function useCitationsOverview(timeRange: TimeRangePreset) {
  return useQuery<CitationsOverviewResponse>({
    queryKey: ['citations', 'overview', timeRange],
    queryFn: async () => {
      const res = await workspaceFetch(`/api/citations/overview?timeRange=${timeRange}`);
      if (!res.ok) throw new Error('Failed to load citations overview');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

/**
 * Fetch paginated citations list
 */
export function useCitations(params: {
  timeRange: TimeRangePreset;
  type?: CitationType;
  platform?: string;
  sentiment?: CitationSentiment;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}) {
  const { timeRange, type, platform, sentiment, search, limit = 25, offset = 0, sortBy, sortDir } = params;

  return useQuery<CitationsListResponse>({
    queryKey: ['citations', 'list', timeRange, type, platform, sentiment, search, limit, offset, sortBy, sortDir],
    queryFn: async () => {
      const params = new URLSearchParams({ timeRange, limit: String(limit), offset: String(offset) });
      if (type) params.set('type', type);
      if (platform) params.set('platform', platform);
      if (sentiment) params.set('sentiment', sentiment);
      if (search) params.set('search', search);
      if (sortBy) params.set('sortBy', sortBy);
      if (sortDir) params.set('sortDir', sortDir);

      const res = await workspaceFetch(`/api/citations?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load citations');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

/**
 * Fetch single citation detail
 */
export function useCitationDetail(citationId: string | null) {
  return useQuery<CitationDetailResponse>({
    queryKey: ['citations', 'detail', citationId],
    queryFn: async () => {
      if (!citationId) throw new Error('No citation selected');

      const res = await workspaceFetch(`/api/citations/${encodeURIComponent(citationId)}`);
      if (!res.ok) throw new Error('Failed to load citation detail');
      return res.json();
    },
    enabled: !!citationId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
