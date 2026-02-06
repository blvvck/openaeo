import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { workspaceFetch } from '@/lib/workspace-query';
import { timeRangeParams, timeRangeQuery } from '@/lib/time-range-query';
import type { TimeRange } from '@/components/charts/time-range-selector';
import type {
  FunnelCoverageResponse,
  PromptsResponse,
  PromptDetailResponse,
  TopicsResponse,
  TrendingPromptsResponse,
  BuyerJourneyStage,
  TimeRangePreset,
} from '@shared/types';

export type PromptTrackingFrequency = 'daily' | '7d' | '14d' | '30d';

export function usePromptTrackingFrequency() {
  return useQuery<{ frequency: PromptTrackingFrequency }>({
    queryKey: ['prompt-tracking-frequency'],
    queryFn: async () => {
      const response = await workspaceFetch('/api/prompts/tracking-frequency');
      if (!response.ok) throw new Error('Failed to load tracking frequency');
      return response.json();
    },
    staleTime: Infinity,
  });
}

export function useSavePromptTrackingFrequency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (frequency: PromptTrackingFrequency) => {
      const response = await workspaceFetch('/api/prompts/tracking-frequency', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency }),
      });
      if (!response.ok) throw new Error('Failed to update tracking frequency');
      return response.json() as Promise<{ frequency: PromptTrackingFrequency; queuedPrompts: number; nextRunAt: string | null }>;
    },
    onSuccess: ({ frequency }) => queryClient.setQueryData(['prompt-tracking-frequency'], { frequency }),
  });
}

export function useRunPromptsNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await workspaceFetch('/api/prompts/run-now', { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? 'Could not start prompt refresh');
      return payload as { queuedPrompts: number };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discovery'] }),
  });
}

export function useFunnelCoverage(timeRange: TimeRangePreset, range?: TimeRange) {
  return useQuery<FunnelCoverageResponse>({
    queryKey: ['discovery', 'funnel-coverage', timeRange, timeRangeQuery(range)],
    queryFn: async () => {
      const res = await workspaceFetch(`/api/discovery/overview?timeRange=${timeRange}${timeRangeQuery(range)}`);
      if (!res.ok) throw new Error('Failed to load funnel coverage');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

export function usePrompts(params: {
  timeRange: TimeRangePreset;
  range?: TimeRange;
  stage?: BuyerJourneyStage;
  topic?: string;
  search?: string;
  sentiment?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}) {
  const { timeRange, range, stage, topic, search, sentiment, limit = 25, offset = 0, sortBy, sortDir } = params;
  return useQuery<PromptsResponse>({
    queryKey: ['discovery', 'prompts', timeRange, timeRangeQuery(range), stage, topic, search, sentiment, limit, offset, sortBy, sortDir],
    queryFn: async () => {
      const queryParams = timeRangeParams(range);
      queryParams.set('timeRange', timeRange);
      queryParams.set('limit', String(limit));
      queryParams.set('offset', String(offset));
      if (stage) queryParams.set('stage', stage);
      if (topic) queryParams.set('topic', topic);
      if (search) queryParams.set('search', search);
      if (sentiment) queryParams.set('sentiment', sentiment);
      if (sortBy) queryParams.set('sortBy', sortBy);
      if (sortDir) queryParams.set('sortDir', sortDir);
      const res = await workspaceFetch(`/api/discovery/prompts?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to load prompts');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

export function useTrendingPrompts(timeRange: TimeRangePreset, range?: TimeRange) {
  return useQuery<TrendingPromptsResponse>({
    queryKey: ['discovery', 'trending', timeRange, timeRangeQuery(range)],
    queryFn: async () => {
      const res = await workspaceFetch(`/api/discovery/trending?timeRange=${timeRange}${timeRangeQuery(range)}`);
      if (!res.ok) throw new Error('Failed to load trending prompts');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

export function useTopics() {
  return useQuery<TopicsResponse>({
    queryKey: ['discovery', 'topics'],
    queryFn: async () => {
      const res = await workspaceFetch('/api/discovery/topics');
      if (!res.ok) throw new Error('Failed to load topics');
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
}

export function usePromptDetail(promptId: string | null, range?: TimeRange) {
  return useQuery<PromptDetailResponse>({
    queryKey: ['discovery', 'prompt', promptId, timeRangeQuery(range)],
    queryFn: async () => {
      if (!promptId) throw new Error('No prompt selected');
      const params = timeRangeParams(range);
      const suffix = params.toString() ? `?${params.toString()}` : '';
      const res = await workspaceFetch(`/api/discovery/prompts/${encodeURIComponent(promptId)}${suffix}`);
      if (!res.ok) throw new Error('Failed to load prompt detail');
      return res.json();
    },
    enabled: !!promptId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
