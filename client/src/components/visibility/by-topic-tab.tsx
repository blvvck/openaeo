import { workspaceFetch as fetch } from '@/lib/workspace-query';

/**
 * ByTopicTab — 4 cards (2x2 grid), each with a table inside.
 *
 * Layout:
 * - Row 1: Top Topics, Newly-won Topics
 * - Row 2: Underperforming Topics, Lost Topics
 *
 * Each card has a table with columns: Topic, Mentions, Position, Trend
 *
 * API: GET /api/visibility/topics
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/shared/skeleton-loader';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { TimeRangePreset } from '@shared/types';
import { Trophy, TrendingUp, AlertTriangle, TrendingDown, Loader2 } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface TopicItem {
  id: number;
  name: string;
  mentions: number;
  position: number | null;
  trend: number;
  trendLabel?: string;
  subtitle: string;
}

interface TopicsResponse {
  topTopics: TopicItem[];
  newlyWonTopics: TopicItem[];
  underperformingTopics: TopicItem[];
  lostTopics: TopicItem[];
  summary: {
    totalTopics: number;
    topicsWithMentions: number;
    averageTrend: number;
  };
}

interface ByTopicTabProps {
  timeRange: TimeRangePreset;
  brandName?: string;
  className?: string;
}

// ============================================================================
// Card Config
// ============================================================================

interface CardConfig {
  key: keyof Pick<TopicsResponse, 'topTopics' | 'newlyWonTopics' | 'underperformingTopics' | 'lostTopics'>;
  title: string;
  icon: React.ElementType;
  iconColor: string;
  emptyMessage: string;
}

const CARD_CONFIGS: CardConfig[] = [
  {
    key: 'topTopics',
    title: 'Top topics',
    icon: Trophy,
    iconColor: 'text-amber-500',
    emptyMessage: 'No top-ranking topics yet.',
  },
  {
    key: 'newlyWonTopics',
    title: 'Newly-won topics',
    icon: TrendingUp,
    iconColor: 'text-green-500',
    emptyMessage: 'No rising topics detected.',
  },
  {
    key: 'underperformingTopics',
    title: 'Under-performing topics',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
    emptyMessage: 'All topics performing well.',
  },
  {
    key: 'lostTopics',
    title: 'Lost topics',
    icon: TrendingDown,
    iconColor: 'text-red-500',
    emptyMessage: 'No topics lost in this period.',
  },
];

// ============================================================================
// Data Hook
// ============================================================================

function useTopicsAnalysis(timeRange: TimeRangePreset) {
  return useQuery<TopicsResponse>({
    queryKey: ['visibility', 'topics-categories', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/visibility/topics?timeRange=${timeRange}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load topics data');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

// ============================================================================
// Helpers
// ============================================================================

function formatTrend(trend: number): string {
  if (trend === 0) return '—';
  const prefix = trend > 0 ? '+' : '';
  if (Math.abs(trend) >= 1000) {
    return `${prefix}${Math.round(trend).toLocaleString()}%`;
  }
  return `${prefix}${trend}%`;
}

// ============================================================================
// Mini Table Header
// ============================================================================

function MiniTableHeader() {
  return (
    <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-figma-border-light">
      <div className="col-span-5 text-figma-2xs font-medium text-figma-secondary tracking-wide">
        Topic
      </div>
      <div className="col-span-2 text-figma-2xs font-medium text-figma-secondary tracking-wide text-right">
        Mentions
      </div>
      <div className="col-span-2 text-figma-2xs font-medium text-figma-secondary tracking-wide text-right">
        Position
      </div>
      <div className="col-span-3 text-figma-2xs font-medium text-figma-secondary tracking-wide text-right">
        Trend
      </div>
    </div>
  );
}

// ============================================================================
// Mini Table Row
// ============================================================================

function MiniTableRow({ topic }: { topic: TopicItem }) {
  const trendColor = topic.trend > 0
    ? 'text-figma-trend-up'
    : topic.trend < 0
      ? 'text-figma-trend-down'
      : 'text-figma-muted';

  return (
    <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-figma-border-light last:border-0 hover:bg-figma-hover/30 transition-colors">
      {/* Topic name */}
      <div className="col-span-5">
        <p className="text-figma-xs text-figma-primary truncate" title={topic.name}>
          {topic.name}
        </p>
      </div>

      {/* Mentions with hover */}
      <div className="col-span-2 flex items-center justify-end">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button className="text-figma-xs font-medium text-figma-primary tabular-nums hover:text-figma-accent transition-colors">
              {topic.mentions}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="p-2">
            <p className="text-figma-xs font-medium">{topic.mentions} mentions</p>
            {topic.position && (
              <p className="text-figma-2xs text-figma-muted mt-0.5">Rank #{topic.position}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Position */}
      <div className="col-span-2 flex items-center justify-end">
        <span className="text-figma-xs text-figma-secondary tabular-nums">
          {topic.position ? `#${topic.position}` : '—'}
        </span>
      </div>

      {/* Trend */}
      <div className="col-span-3 flex items-center justify-end">
        <span className={cn('text-figma-xs font-medium tabular-nums', trendColor)}>
          {formatTrend(topic.trend)}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Table Skeleton
// ============================================================================

function MiniTableSkeleton() {
  return (
    <>
      <MiniTableHeader />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2.5 border-b border-figma-border-light last:border-0">
          {/* Topic name */}
          <div className="col-span-5 flex items-center">
            <Skeleton className="h-5 w-3/4 rounded" />
          </div>
          {/* Mentions */}
          <div className="col-span-2 flex items-center justify-end">
            <Skeleton className="h-5 w-8 rounded" />
          </div>
          {/* Position */}
          <div className="col-span-2 flex items-center justify-end">
            <Skeleton className="h-5 w-8 rounded" />
          </div>
          {/* Trend */}
          <div className="col-span-3 flex items-center justify-end">
            <Skeleton className="h-5 w-12 rounded" />
          </div>
        </div>
      ))}
    </>
  );
}

// ============================================================================
// Table Empty State
// ============================================================================

function MiniTableEmpty({ message }: { message: string }) {
  return (
    <>
      <MiniTableHeader />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-figma-border-light last:border-0">
          {/* Topic name - show message on first row only */}
          <div className="col-span-5">
            <span className="text-figma-xs text-figma-muted">
              {i === 0 ? message : '—'}
            </span>
          </div>
          {/* Mentions */}
          <div className="col-span-2 flex items-center justify-end">
            <span className="text-figma-xs text-figma-muted">—</span>
          </div>
          {/* Position */}
          <div className="col-span-2 flex items-center justify-end">
            <span className="text-figma-xs text-figma-muted">—</span>
          </div>
          {/* Trend */}
          <div className="col-span-3 flex items-center justify-end">
            <span className="text-figma-xs text-figma-muted">—</span>
          </div>
        </div>
      ))}
    </>
  );
}

// ============================================================================
// Topic Card with Table
// ============================================================================

function TopicCard({
  config,
  topics,
  isLoading
}: {
  config: CardConfig;
  topics: TopicItem[];
  isLoading: boolean;
}) {
  const Icon = config.icon;

  return (
    <Card className="h-[320px] border-figma-border rounded-xl bg-figma-card flex flex-col">
      <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <Icon className={cn('w-4 h-4', config.iconColor)} />
          <h3 className="text-figma-sm font-semibold text-figma-primary">
            {config.title}
          </h3>
          {!isLoading && topics.length > 0 && (
            <span className="ml-auto text-figma-2xs text-figma-muted bg-figma-hover px-1.5 py-0.5 rounded">
              {topics.length}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-figma-border-light mx-4" />

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-0">
          <TooltipProvider>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-figma-muted" />
              </div>
            ) : topics.length === 0 ? (
              <MiniTableEmpty message={config.emptyMessage} />
            ) : (
              <>
                <MiniTableHeader />
                {topics.map(topic => (
                  <MiniTableRow key={topic.id} topic={topic} />
                ))}
              </>
            )}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ByTopicTab({ timeRange, className }: ByTopicTabProps) {
  const { data, isLoading, isFetching, error } = useTopicsAnalysis(timeRange);
  const isRefreshing = isFetching && !isLoading;

  if (error) {
    return (
      <div className={cn('py-12 text-center', className)}>
        <p className="text-figma-sm text-figma-muted">
          Failed to load topic data. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('transition-opacity duration-200', isRefreshing && 'opacity-60', className)}>
      {/* Refreshing indicator */}
      {isRefreshing && (
        <div className="flex items-center gap-2 text-figma-muted mb-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-figma-xs">Updating data...</span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CARD_CONFIGS.map(config => (
          <TopicCard
            key={config.key}
            config={config}
            topics={data?.[config.key] ?? []}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}

export default ByTopicTab;
