import { workspaceFetch as fetch } from '@/lib/workspace-query';
/**
 * Competitors API Hooks
 *
 * React Query hooks for the Competitors page.
 * Wired to real backend endpoints:
 * - GET /api/competitors — Full competitor list with position summary
 * - GET /api/competitors/by-platform — Per-platform rankings
 * - GET /api/competitors/:id/compare — Head-to-head comparison
 * - GET /api/competitors/metrics — Aggregated metrics for 5 cards
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CompetitorsResponse,
  CompetitorsByPlatformResponse,
  CompetitorCompareResponse,
  CompetitorSearchResponse,
  CompetitorMetricsResponse,
  TimeRangePreset,
} from '@shared/types';

// =============================================================================
// API Hooks
// =============================================================================

/**
 * Fetch full competitor list with position summary
 * Returns CompetitorsResponse with:
 * - position: Your rank, score, trend, gap to leader
 * - competitors: Array of CompetitorDetail with shareOfAnswer, highIntent, topPrompt
 * - insight: AI-generated insight text
 */
export function useCompetitors(timeRange: TimeRangePreset) {
  return useQuery<CompetitorsResponse>({
    queryKey: ['competitors', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/competitors?timeRange=${timeRange}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load competitors');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Fetch per-platform competitor rankings
 * Returns CompetitorsByPlatformResponse with rankings for each AI platform
 */
export function useCompetitorsByPlatform(timeRange: TimeRangePreset) {
  return useQuery<CompetitorsByPlatformResponse>({
    queryKey: ['competitors', 'by-platform', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/competitors/by-platform?timeRange=${timeRange}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load platform breakdown');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Fetch head-to-head comparison with a specific competitor
 * Returns CompetitorCompareResponse with:
 * - you: Your CompetitorDetail
 * - them: Their CompetitorDetail
 * - metrics: Array of metric comparisons
 * - platformComparison: Per-platform score deltas
 */
export function useCompetitorCompare(competitorId: string | null, timeRange: TimeRangePreset) {
  return useQuery<CompetitorCompareResponse>({
    queryKey: ['competitors', 'compare', competitorId, timeRange],
    queryFn: async () => {
      if (!competitorId) {
        throw new Error('No competitor selected');
      }
      const res = await fetch(`/api/competitors/${encodeURIComponent(competitorId)}/compare?timeRange=${timeRange}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load comparison');
      }
      return res.json();
    },
    enabled: !!competitorId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Search for a competitor by domain
 * Uses the Add Competitor Wizard SSE endpoint
 * TODO: Wire to POST /api/competitors/discover when search mode is added
 */
export function useCompetitorSearch() {
  const queryClient = useQueryClient();

  return useMutation<CompetitorSearchResponse, Error, string>({
    mutationFn: async (domain: string) => {
      // The search is currently handled by the Add Competitor Modal
      // which uses the SSE discover endpoint directly
      // This hook is a placeholder for a future search-only endpoint
      const normalized = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

      // For now, return a mock response
      // TODO: Wire to a dedicated search endpoint when available
      return {
        found: true,
        competitor: {
          name: normalized.split('.')[0].charAt(0).toUpperCase() + normalized.split('.')[0].slice(1),
          domain: normalized,
          score: 0,
          platforms: [],
          alreadyTracked: false,
        },
      };
    },
  });
}

/**
 * Add a competitor
 * Uses POST /api/competitors/add from the Add Competitor Wizard
 */
export function useAddCompetitor() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, { domain: string; name: string; score: number; platforms: string[] }>({
    mutationFn: async (data) => {
      const res = await fetch('/api/competitors/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: data.domain,
          name: data.name,
          initialScore: data.score,
          platformsFound: data.platforms,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to add competitor');
      }

      return { success: true };
    },
    onSuccess: () => {
      // Invalidate competitors queries to refetch
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
    },
  });
}

/**
 * Delete a competitor
 * Uses DELETE /api/competitors/:id
 */
export function useDeleteCompetitor() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: async (competitorId) => {
      const res = await fetch(`/api/competitors/${encodeURIComponent(competitorId)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete competitor');
      }

      return res.json();
    },
    onSuccess: () => {
      // Invalidate all competitors queries to refetch
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      queryClient.invalidateQueries({ queryKey: ['competitor-metrics'] });
    },
  });
}

// =============================================================================
// Competitor Metrics Hook
// =============================================================================

/**
 * Fetch aggregated competitor metrics for the 5 metric cards
 *
 * Returns CompetitorMetricsResponse with:
 * - yourRank: Ranking position and competitor list
 * - shareOfAnswer: Brand mention percentage across platforms
 * - highIntent: Coverage of buyer-intent prompts
 * - citationRate: How often your content is cited
 * - competitivePressure: Net wins/losses vs competitors
 */
export function useCompetitorMetrics(range: TimeRangePreset) {
  return useQuery<CompetitorMetricsResponse>({
    queryKey: ['competitor-metrics', range],
    queryFn: async () => {
      const res = await fetch(`/api/competitors/metrics?range=${range}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load competitor metrics');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// =============================================================================
// Competitor Trends Hook
// =============================================================================

/**
 * Response type for /api/competitors/trends
 */
export interface CompetitorTrendsResponse {
  points: Array<{
    date: string;
    competitorId: string;
    competitorName: string;
    isYou?: boolean;
    visibility: number;
    citations: number;
    position: number;
  }>;
  competitors: Array<{
    id: string;
    name: string;
    isYou?: boolean;
  }>;
  timeRange: string;
  interval: 'day' | 'week' | 'month';
}

/**
 * Fetch historical trend data for competitors chart
 *
 * Returns points grouped by date with visibility/citations/position for each competitor
 * Used by CompetitorTrendsChart
 */
export function useCompetitorTrends(timeRange: TimeRangePreset) {
  return useQuery<CompetitorTrendsResponse>({
    queryKey: ['competitors', 'trends', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/competitors/trends?timeRange=${timeRange}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load competitor trends');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
