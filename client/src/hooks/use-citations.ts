import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { workspaceFetch } from '@/lib/workspace-query';
import { timeRangeParams, timeRangeQuery } from '@/lib/time-range-query';
import type { TimeRange } from '@/components/charts/time-range-selector';
import type {
  CitationsOverviewResponse,
  CitationsListResponse,
  CitationDetailResponse,
  CitationType,
  CitationSentiment,
  TimeRangePreset,
} from '@shared/types';

export function useCitationsOverview(timeRange: TimeRangePreset, range?: TimeRange) {
  return useQuery<CitationsOverviewResponse>({
    queryKey: ['citations', 'overview', timeRange, timeRangeQuery(range)],
    queryFn: async () => {
      const res = await workspaceFetch(`/api/citations/overview?timeRange=${timeRange}${timeRangeQuery(range)}`);
      if (!res.ok) throw new Error('Failed to load citations overview');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

export function useCitations(params: {
  timeRange: TimeRangePreset;
  range?: TimeRange;
  type?: CitationType;
  platform?: string;
  sentiment?: CitationSentiment;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}) {
  const { timeRange, range, type, platform, sentiment, search, limit = 25, offset = 0, sortBy, sortDir } = params;

  return useQuery<CitationsListResponse>({
    queryKey: ['citations', 'list', timeRange, timeRangeQuery(range), type, platform, sentiment, search, limit, offset, sortBy, sortDir],
    queryFn: async () => {
      const query = timeRangeParams(range);
      query.set('timeRange', timeRange);
      query.set('limit', String(limit));
      query.set('offset', String(offset));
      if (type) query.set('type', type);
      if (platform) query.set('platform', platform);
      if (sentiment) query.set('sentiment', sentiment);
      if (search) query.set('search', search);
      if (sortBy) query.set('sortBy', sortBy);
      if (sortDir) query.set('sortDir', sortDir);

      const res = await workspaceFetch(`/api/citations?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to load citations');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

export function useCitationDetail(citationId: string | null, range?: TimeRange) {
  return useQuery<CitationDetailResponse>({
    queryKey: ['citations', 'detail', citationId, timeRangeQuery(range)],
    queryFn: async () => {
      if (!citationId) throw new Error('No citation selected');
      const params = timeRangeParams(range);
      const suffix = params.toString() ? `?${params.toString()}` : '';
      const res = await workspaceFetch(`/api/citations/${encodeURIComponent(citationId)}${suffix}`);
      if (!res.ok) throw new Error('Failed to load citation detail');
      return res.json();
    },
    enabled: !!citationId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
