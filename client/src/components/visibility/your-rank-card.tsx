import { workspaceFetch as fetch } from '@/lib/workspace-query';

/**
 * YourRankCard — Mini competitive leaderboard for Overview Row 3.
 *
 * Shows up to 5 brands ranked by visibility score.
 * User's brand row is highlighted with bg-figma-blue-light.
 * Bottom insight compares current rank to previous period.
 *
 * API: GET /api/metrics/compare → CompetitorRank[]
 */

import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/shared/dashboard-card';
import { Skeleton } from '@/components/shared/skeleton-loader';
import { Lightbulb } from 'lucide-react';
import type { CompetitorRank, TimeRangePreset } from '@shared/types';

// ============================================================================
// Types
// ============================================================================

interface YourRankCardProps {
  timeRange: TimeRangePreset;
  brandName: string;
  className?: string;
}

interface RankResponse {
  competitors: CompetitorRank[];
}

// ============================================================================
// Data Hook
// ============================================================================

function useCompetitorRanks(timeRange: TimeRangePreset, brandName: string) {
  return useQuery<RankResponse>({
    queryKey: ['visibility', 'compare', timeRange, brandName],
    queryFn: async () => {
      const res = await fetch(`/api/metrics/compare?brand=${encodeURIComponent(brandName)}&timeRange=${timeRange}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load rank data');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

// ============================================================================
// Insight Logic
// ============================================================================

function getRankInsight(ranks: CompetitorRank[]): string {
  const you = ranks.find(r => r.isYou);
  if (!you) return 'Add competitors to see your ranking.';

  if (you.rank === 1) {
    return `You're leading the pack. ${you.trend > 0 ? `Score up ${you.trend.toFixed(1)}% this period.` : 'Maintain your position.'}`;
  }

  const leader = ranks[0];
  const gap = leader.score - you.score;

  if (you.trend > 0) {
    return `Closing the gap — ${gap} points behind ${leader.name}. Score trending up ${you.trend.toFixed(1)}%.`;
  }

  return `${gap} points behind ${leader.name}. Focus on platform coverage and citation rate to climb.`;
}

// ============================================================================
// Component
// ============================================================================

export function YourRankCard({ timeRange, brandName, className }: YourRankCardProps) {
  const { data, isLoading, error } = useCompetitorRanks(timeRange, brandName);

  // Loading
  if (isLoading) {
    return (
      <ContentCard title="Your rank" subtitle="Position among tracked brands" className={className}>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2 px-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 flex-1 rounded" />
              <Skeleton className="h-4 w-8 rounded" />
              <Skeleton className="h-4 w-12 rounded" />
            </div>
          ))}
        </div>
      </ContentCard>
    );
  }

  // Error or no data — show empty structure
  const ranks = data?.competitors?.slice(0, 5) ?? [];

  if (error || ranks.length === 0) {
    return (
      <ContentCard title="Your rank" subtitle="Position among tracked brands" className={className}>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2 px-2 rounded-lg">
              <span className="text-figma-xs font-medium text-figma-muted tabular-nums w-4">{i + 1}.</span>
              <span className="text-figma-sm text-figma-muted flex-1">--</span>
              <span className="text-figma-sm font-medium text-figma-muted tabular-nums">--</span>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-figma-hover rounded-lg p-3 flex items-start gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-figma-muted shrink-0 mt-0.5" />
          <p className="text-figma-xs text-figma-muted leading-relaxed">
            Add competitors to see your ranking here.
          </p>
        </div>
      </ContentCard>
    );
  }

  // Data present
  const insightText = getRankInsight(ranks);

  return (
    <ContentCard title="Your rank" subtitle="Position among tracked brands" className={className}>
      <div className="space-y-1">
        {ranks.map(rank => (
          <div
            key={rank.id}
            className={cn(
              'flex items-center gap-3 py-2 px-2 rounded-lg',
              rank.isYou && 'bg-figma-blue-light'
            )}
          >
            <span className="text-figma-xs font-medium text-figma-muted tabular-nums w-4">
              {rank.rank}.
            </span>
            <span className={cn(
              'text-figma-sm flex-1 truncate',
              rank.isYou ? 'font-semibold text-figma-primary' : 'font-normal text-figma-secondary'
            )}>
              {rank.name}
            </span>
            <span className="text-figma-sm font-medium text-figma-primary tabular-nums">
              {rank.score}
            </span>
            <span className={cn(
              'text-figma-xs tabular-nums w-[48px] text-right',
              rank.trend > 0 ? 'text-figma-trend-up' : rank.trend < 0 ? 'text-figma-trend-down' : 'text-figma-muted'
            )}>
              {rank.trend > 0 ? '+' : ''}{rank.trend.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* Bottom insight */}
      <div className="mt-4 bg-figma-hover rounded-lg p-3 flex items-start gap-2">
        <Lightbulb className="w-3.5 h-3.5 text-figma-secondary shrink-0 mt-0.5" />
        <p className="text-figma-xs text-figma-secondary leading-relaxed">
          {insightText}
        </p>
      </div>
    </ContentCard>
  );
}

export default YourRankCard;
