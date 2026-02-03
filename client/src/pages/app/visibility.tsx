import { workspaceFetch as fetch } from '@/lib/workspace-query';



import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useSearch, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useActiveWorkspaceName } from '@/hooks/use-active-workspace';
import { formatRankBadge } from '@/lib/formatters';

// UI Components
import { Card } from '@/components/ui/card';
import { ContentCard } from '@/components/shared/dashboard-card';
import { CardDivider } from '@/components/shared/stat-metric';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tab-set';
// Skeleton imports removed — using spinner approach
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/empty-state';

// Chart Components
import { VisibilityTimeline } from '@/components/charts/visibility-timeline';
import { ChartContainer } from '@/components/ui/data-visualization';
import { Area, AreaChart, CartesianGrid, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  TimeRangeSelector,
  useTimeRange,
  type TimeRange,
} from '@/components/charts/time-range-selector';

// Feature Components
import {
  ScoreBreakdownCard,
  ScoreBreakdownCardEmpty,
} from '@/components/visibility/score-breakdown-card';
import { ByPlatformTab } from '@/components/visibility/by-platform-tab';
import { ByTopicTab } from '@/components/visibility/by-topic-tab';
import { YourRankCard } from '@/components/visibility/your-rank-card';
import { WhatChangedCard } from '@/components/visibility/what-changed-card';
import { TopPromptsPreview } from '@/components/visibility/top-prompts-preview';

// Shared page components
import { PageHeader, StaleDataWarning, RankBadge } from '@/components/shared';

// Types from shared (CANONICAL source)
import type {
  VisibilityOverviewResponse,
  TrendsResponse,
  TrendDataPoint,
  TimeRangePreset,
  TrendDirection,
  CompareResponse,
} from '@shared/types';

// Icons
import {
  RefreshCw,
  AlertCircle,
  Sparkles,
  Loader2,
  HelpCircle,
} from 'lucide-react';

// Platform Icons
import {
  PlatformIcon,
  PLATFORMS,
} from '@/components/ui/platform-icon';

// ============================================================================
// API Hooks
// ============================================================================

function emptyVisibilityOverview(): VisibilityOverviewResponse {
  return {
    score: 0,
    previousScore: 0,
    trend: 0,
    trendDirection: 'stable',
    breakdown: {
      mentionCount: 0,
      mentionsTrend: 0,
      citationRate: 0,
      citationRateTrend: 0,
      sentimentBonus: 0,
      sentimentTrend: 'stable',
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
      platformDiversity: { active: 0, total: 0 },
    },
    platforms: [],
    whatChanged: [],
    topContent: [],
    relatedInsights: [],
    meta: { lastUpdated: '', dataFreshness: 'live' },
  };
}

function useVisibilityOverview(timeRange: TimeRangePreset) {
  return useQuery<VisibilityOverviewResponse>({
    queryKey: ['visibility', 'overview', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/visibility/overview?timeRange=${timeRange}`);
      if (res.status === 404) return emptyVisibilityOverview();
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load visibility data');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData, // Keep showing old data while new data loads
    retry: 2,
  });
}

/** Get optimal interval based on time range to avoid too many/few data points */
function getIntervalForTimeRange(timeRange: TimeRangePreset): 'day' | 'week' | 'month' {
  const days = parseInt(timeRange.replace('d', ''), 10);
  if (isNaN(days) || days <= 14) return 'day';      // 1-14 days → daily
  if (days <= 90) return 'week';                     // 15-90 days → weekly
  return 'month';                                    // 91-365 days → monthly (12 points for year)
}

/** Get display label for interval comparison */
function getIntervalLabel(interval: 'day' | 'week' | 'month'): string {
  switch (interval) {
    case 'month': return 'vs prev month';
    case 'week': return 'vs prev week';
    default: return 'vs prev day';
  }
}

function useVisibilityTrends(timeRange: TimeRangePreset, brandName: string) {
  const interval = getIntervalForTimeRange(timeRange);

  return useQuery<TrendsResponse>({
    queryKey: ['visibility', 'trends', timeRange, brandName, interval],
    queryFn: async () => {
      const res = await fetch(`/api/metrics/trends?timeRange=${timeRange}&interval=${interval}&brand=${encodeURIComponent(brandName)}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load trend data');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

function useCompareData(timeRange: TimeRangePreset, brandName: string) {
  return useQuery<CompareResponse>({
    queryKey: ['metrics', 'compare', timeRange, brandName],
    queryFn: async () => {
      const res = await fetch(`/api/metrics/compare?brand=${encodeURIComponent(brandName)}&timeRange=${timeRange}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load comparison data');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

/** Fetch competitor rankings from dashboard endpoint */
function useCompetitorRankings(timeRange: TimeRangePreset) {
  return useQuery<{ rank: number | null; total: number }>({
    queryKey: ['dashboard', 'competitors', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard?range=${timeRange}`);
      if (!res.ok) return { rank: null, total: 0 };
      const data = await res.json();
      const you = data.competitors?.find((c: { isYou?: boolean }) => c.isYou);
      return {
        rank: you?.rank ?? null,
        total: data.competitors?.length ?? 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

// ============================================================================
// Sub-Components
// ============================================================================

// NOTE: VisibilityHeader and RankBadge moved to /components/shared/

/**
 * Contextual sentence below score badge — data-driven, never hardcoded
 */
function ScoreContext({ data }: { data: VisibilityOverviewResponse }) {
  const activePlatforms = data.breakdown.platformDiversity.active;
  const totalPlatforms = data.breakdown.platformDiversity.total;
  const citationRate = data.breakdown.citationRate;
  const sentimentBonus = data.breakdown.sentimentBonus;

  let message: string;
  if (activePlatforms < 6) {
    message = `Active on ${activePlatforms} of ${totalPlatforms} platforms. Expanding coverage could boost your score.`;
  } else if (citationRate < 30) {
    message = `Mentioned often but rarely cited (${citationRate}%). Improving structured content helps LLMs cite you.`;
  } else if (sentimentBonus < 0) {
    message = `Sentiment pulling score down (${sentimentBonus} pts). Review negative mentions for improvement.`;
  } else if (data.score >= 67) {
    message = `Strong presence across ${activePlatforms} platforms with ${citationRate}% citation rate.`;
  } else {
    message = `Mentioned across ${activePlatforms} platforms. Growing citation rate will improve your score.`;
  }

  return (
    <p className="text-figma-xs text-figma-secondary leading-relaxed text-center px-2">
      {message}
    </p>
  );
}

// ============================================================================
// Tab Content Components
// ============================================================================

/**
 * Overview Tab - Main visibility metrics
 */
function OverviewTab({
  data,
  trendsData,
  timeRange,
  isLoading,
  isPending,
  brandName,
  onTabChange,
  onNavigate,
  rank,
  competitorCount,
  interval,
}: {
  data: VisibilityOverviewResponse | undefined;
  trendsData: TrendsResponse | undefined;
  timeRange: TimeRange;
  isLoading: boolean;
  isPending: boolean;
  brandName: string;
  onTabChange: (tab: string) => void;
  onNavigate: (path: string) => void;
  rank: number | null;
  competitorCount: number;
  interval: 'day' | 'week' | 'month';
}) {
  const timeRangePreset = timeRange.preset as TimeRangePreset;
  const intervalLabel = getIntervalLabel(interval);

  // Transform trends data for timeline
  const timelineData = trendsData?.dataPoints?.map((dp: TrendDataPoint) => ({
    date: dp.date,
    visibilityScore: dp.score,
    mentionCount: dp.mentions,
  })) || [];

  // Platform scores for multi-line chart
  const platformScores = data?.platforms?.reduce((acc, p) => {
    const platformId = p.id.toLowerCase().replace(/[\s_]+/g, '-');
    acc[platformId] = p.score;
    return acc;
  }, {} as Record<string, number>) ?? {};

  // Top 4 platforms by score for chart lines
  const sortedPlatforms = PLATFORMS
    .map(p => ({ ...p, score: platformScores[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .filter(p => p.score > 0);
  const topPlatforms = sortedPlatforms.slice(0, 4);

  // Build platform comparison lines for chart
  const platformLines = topPlatforms.map(platform => ({
    name: platform.name,
    data: timelineData.map(dp => ({
      date: dp.date,
      visibilityScore: dp.visibilityScore,
    })),
    color: platform.color,
  }));

  // Loading state - centered spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-figma-muted" />
      </div>
    );
  }

  // Empty/pending data state - shows structure with placeholder values
  if (isPending || !data) {
    return (
      <div className="space-y-6">
        {/* Score + Breakdown row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Score Card Empty State */}
          <Card className="lg:col-span-1 border-figma-border rounded-xl bg-figma-card flex flex-col min-h-[320px] overflow-hidden">
            <div className="pt-5 px-5 pb-1 flex items-start justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-figma-md font-semibold text-figma-primary">Visibility score</span>
                <div className="w-4 h-4 rounded-full bg-figma-border flex items-center justify-center">
                  <span className="text-[9px] font-medium text-figma-muted">i</span>
                </div>
              </div>
              <span className="inline-flex text-figma-xs font-medium px-3 py-0.5 rounded-full bg-figma-hover text-figma-muted">
                No data
              </span>
            </div>
            <div className="px-5 flex items-center gap-3 justify-center py-4">
              <span className="text-[72px] font-bold text-figma-muted tabular-nums leading-none">—</span>
              <div className="flex flex-col">
                <span className="text-figma-base font-semibold text-figma-muted">—</span>
                <span className="text-figma-2xs text-figma-muted">vs last period</span>
              </div>
            </div>
            {/* Empty chart area - curvy dashed line with hover tooltip */}
            <div className="flex-1 min-h-[140px] mt-auto">
              <ChartContainer
                config={{ score: { label: "Score", color: '#9CA3AF' } }}
                className="h-full w-full"
              >
                <AreaChart
                  data={[
                    { date: '1', visibilityScore: 40 },
                    { date: '2', visibilityScore: 55 },
                    { date: '3', visibilityScore: 45 },
                    { date: '4', visibilityScore: 60 },
                    { date: '5', visibilityScore: 50 },
                  ]}
                  margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                >
                  <CartesianGrid stroke="#E5E7EB" strokeWidth={1} strokeDasharray="2 2" strokeOpacity={0.6} vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={[0, 100]} />
                  <RechartsTooltip
                    content={() => (
                      <div className="bg-figma-card border border-figma-border rounded-lg px-3 py-2 shadow-lg">
                        <p className="text-figma-2xs text-figma-muted">No data yet</p>
                        <p className="text-figma-base font-semibold text-figma-muted mt-0.5 text-right">—</p>
                        <div className="inline-flex items-center rounded-full px-2 py-0.5 mt-1.5 bg-figma-hover">
                          <span className="text-figma-2xs font-medium text-figma-muted">— vs last period</span>
                        </div>
                      </div>
                    )}
                    cursor={{ stroke: '#E5E7EB', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="visibilityScore" stroke="#D1D5DB" strokeWidth={1.5} strokeDasharray="4 4" fill="none" activeDot={false} />
                </AreaChart>
              </ChartContainer>
            </div>
          </Card>
          <div className="lg:col-span-2">
            <ScoreBreakdownCardEmpty />
          </div>
        </div>

        {/* Row 2: Top Prompts - empty state with table header */}
        <ContentCard
          title={`Top prompts mentioning ${brandName}`}
          actionLabel="View all prompts"
          onAction={() => onNavigate('/app/prompts')}
          contentClassName="pt-0"
        >
          {/* Table Header with info tooltips */}
          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-figma-border-light">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="col-span-4 text-figma-2xs font-medium text-figma-secondary cursor-help inline-flex items-center gap-1">
                    Prompt <HelpCircle className="w-3 h-3 text-figma-muted" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px]">
                  <p className="text-figma-xs">The user query that triggered an AI response mentioning your brand.</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="col-span-2 text-figma-2xs font-medium text-figma-secondary cursor-help inline-flex items-center gap-1">
                    Topic <HelpCircle className="w-3 h-3 text-figma-muted" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p className="text-figma-xs">The category or subject area the prompt relates to.</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="col-span-1 text-figma-2xs font-medium text-figma-secondary cursor-help inline-flex items-center gap-1">
                    Mentions <HelpCircle className="w-3 h-3 text-figma-muted" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p className="text-figma-xs">How many times AI mentioned your brand in responses to this prompt.</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="col-span-1 text-figma-2xs font-medium text-figma-secondary text-right cursor-help inline-flex items-center justify-end gap-1">
                    Citations <HelpCircle className="w-3 h-3 text-figma-muted" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p className="text-figma-xs">Number of responses that included a link to your site.</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="col-span-1 text-figma-2xs font-medium text-figma-secondary text-right cursor-help inline-flex items-center justify-end gap-1">
                    Position <HelpCircle className="w-3 h-3 text-figma-muted" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px]">
                  <p className="text-figma-xs">Your brand's rank in the AI response — #1 means you were mentioned first.</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="col-span-2 text-figma-2xs font-medium text-figma-secondary pl-4 cursor-help inline-flex items-center gap-1">
                    Competitors <HelpCircle className="w-3 h-3 text-figma-muted" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px]">
                  <p className="text-figma-xs">Other brands the AI mentioned alongside yours in responses.</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="col-span-1 text-figma-2xs font-medium text-figma-secondary text-right cursor-help inline-flex items-center justify-end gap-1">
                    Stage <HelpCircle className="w-3 h-3 text-figma-muted" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px]">
                  <p className="text-figma-xs">Where the user is in their buying journey when asking this question.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
          {/* Empty rows */}
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 px-4 py-4 border-b border-figma-border-light last:border-0">
                <span className="col-span-4 text-figma-sm font-normal text-figma-primary">Your prompts will appear here</span>
                <span className="col-span-2 text-figma-sm text-figma-muted">—</span>
                <span className="col-span-1 text-figma-sm text-figma-muted">—</span>
                <span className="col-span-1 text-figma-sm text-figma-muted text-right">—</span>
                <span className="col-span-1 text-figma-sm text-figma-muted text-right">—</span>
                <span className="col-span-2 text-figma-sm text-figma-muted pl-4">—</span>
                <span className="col-span-1 text-figma-sm text-figma-muted text-right">—</span>
              </div>
            ))}
          </div>
        </ContentCard>
      </div>
    );
  }

  // Trend calculation — use point difference like dashboard (score - previousScore)
  const scoreDiff = data.score - data.previousScore;
  const diffSign = scoreDiff > 0 ? '+' : '';
  const isPositive = scoreDiff > 0;
  const trendColor = isPositive
    ? 'text-figma-trend-up'
    : scoreDiff < 0
      ? 'text-figma-trend-down'
      : 'text-figma-muted';

  // Data present — full content
  return (
    <div className="space-y-6">
      {/* Row 1: Score Card + Score Factors */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* 1A. Visibility Score Card — Score + Delta + Area Chart */}
        <Card className="lg:col-span-1 border-figma-border rounded-xl bg-figma-card flex flex-col min-h-[320px] overflow-hidden relative">
          {/* Header row: Title left, Badge right */}
          <div className="pt-5 px-5 pb-1 flex items-start justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-figma-md font-semibold text-figma-primary">Visibility score</span>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <div className="w-4 h-4 rounded-full bg-figma-border flex items-center justify-center cursor-help">
                      <span className="text-[9px] font-medium text-figma-muted">i</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="text-figma-xs max-w-[220px]">
                    Measures how often AI platforms mention your brand when users ask relevant questions.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <RankBadge rank={rank} total={competitorCount} />
          </div>

          {/* Score + Delta centered */}
          <div className="px-5 flex items-center gap-3 justify-center py-4">
            <span className="text-[72px] font-bold text-figma-primary tabular-nums leading-none">
              {data.score}
            </span>
            <div className="flex flex-col">
              <span className={cn('text-figma-base font-semibold tabular-nums', trendColor)}>
                {diffSign}{scoreDiff}%
              </span>
              <span className="text-figma-2xs text-figma-muted">vs last period</span>
            </div>
          </div>

          {/* Area Chart — controlled height */}
          <div className="flex-1 min-h-[140px] mt-auto relative">
            {timelineData.length === 0 && (
              /* Overlay text when no trend data - positioned below the line */
              <div className="absolute inset-0 flex items-end justify-center z-10 pb-6">
                <p className="text-figma-2xs text-figma-muted bg-figma-card/80 px-2 py-1 rounded">No trend data for this period</p>
              </div>
            )}
            {timelineData.length === 0 ? (
              /* Flat muted line chart for empty state */
              <ChartContainer
                config={{
                  score: {
                    label: "Score",
                    color: '#9CA3AF',
                  },
                }}
                className="h-full w-full [&_.recharts-cartesian-grid]:hidden"
              >
                <AreaChart
                  data={[
                    { date: '1', visibilityScore: 65 },
                    { date: '2', visibilityScore: 65 },
                    { date: '3', visibilityScore: 65 },
                    { date: '4', visibilityScore: 65 },
                    { date: '5', visibilityScore: 65 },
                  ]}
                  margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="emptyFillGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9CA3AF" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#9CA3AF" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={[0, 100]} />
                  <Area
                    type="monotone"
                    dataKey="visibilityScore"
                    stroke="#D1D5DB"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fill="url(#emptyFillGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <ChartContainer
                config={{
                  score: {
                    label: "Score",
                    color: '#17A34A',
                  },
                }}
                className="h-full w-full [&_.recharts-cartesian-grid]:hidden"
              >
                <AreaChart
                  data={timelineData}
                  margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                >
                  <defs>
                    {/* Neutral blue - chart shows data, tooltip shows sentiment */}
                    <linearGradient id="strokeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                    <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        const idx = timelineData.findIndex(p => p.date === d.date);
                        const prev = idx > 0 ? timelineData[idx - 1].visibilityScore : 0;
                        const delta = d.visibilityScore - prev;
                        const isUp = delta > 0;
                        const isDown = delta < 0;
                        const pillBg = isUp ? 'bg-green-50' : isDown ? 'bg-red-50' : 'bg-figma-hover';
                        const pillText = isUp ? 'text-figma-green' : isDown ? 'text-figma-red' : 'text-figma-muted';

                        // Format date based on interval
                        const dateObj = new Date(d.date);
                        let dateLabel: string;
                        if (interval === 'month') {
                          dateLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                        } else if (interval === 'week') {
                          dateLabel = `Week of ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                        } else {
                          dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }

                        return (
                          <div className="bg-figma-card border border-figma-border rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-figma-2xs text-figma-muted">{dateLabel}</p>
                            <p className="text-figma-base font-semibold text-figma-primary mt-0.5 text-right">{d.visibilityScore}</p>
                            <div className={cn('inline-flex items-center rounded-full px-2 py-0.5 mt-1.5', pillBg)}>
                              <span className={cn('text-figma-2xs font-medium', pillText)}>
                                {delta > 0 ? '+' : ''}{delta.toFixed(1)}% {intervalLabel}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visibilityScore"
                    stroke="url(#strokeGradient)"
                    strokeWidth={2}
                    fill="url(#fillGradient)"
                    activeDot={{ r: 4, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </div>
        </Card>

        {/* 1B. Score Factors */}
        <div className="lg:col-span-2">
          <ScoreBreakdownCard
            mentionCount={data.breakdown.mentionCount}
            mentionsTrend={data.breakdown.mentionsTrend || undefined}
            citationRate={data.breakdown.citationRate}
            citationRateTrend={data.breakdown.citationRateTrend || undefined}
            citationSources={data.breakdown.citationSources}
            sentimentBonus={data.breakdown.sentimentBonus}
            sentimentTrend={data.breakdown.sentimentTrend}
            sentimentBreakdown={data.breakdown.sentimentBreakdown}
            platformDiversity={data.breakdown.platformDiversity}
            platforms={data.platforms}
            onNavigateTab={onTabChange}
          />
        </div>
      </div>

      {/* Row 2: Top Prompts Preview */}
      <TopPromptsPreview
        timeRange={timeRangePreset}
        brandName={brandName}
        onViewAll={() => onTabChange('topic')}
      />

    </div>
  );
}


function ComingSoonTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-12">
      <EmptyState
        icon={Sparkles}
        title={title}
        description={description}
      />
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export function VisibilityPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { range, setRange } = useTimeRange('30d');
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const timeRangePreset = range.preset as TimeRangePreset;

  // Get initial tab from URL or default to 'overview'
  const urlParams = new URLSearchParams(search);
  const initialTab = urlParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  const brandName = useActiveWorkspaceName();

  // Data fetching
  const {
    data: overviewData,
    isLoading: overviewLoading,
    isFetching: overviewFetching,
    error: overviewError,
    refetch: refetchOverview,
  } = useVisibilityOverview(timeRangePreset);

  const {
    data: trendsData,
    isLoading: trendsLoading,
    isFetching: trendsFetching,
    error: trendsError,
    refetch: refetchTrends,
  } = useVisibilityTrends(timeRangePreset, brandName);

  const {
    data: compareData,
  } = useCompareData(timeRangePreset, brandName);

  // Fetch full competitor rankings (same data as dashboard)
  const { data: rankData } = useCompetitorRankings(timeRangePreset);
  const rank = rankData?.rank ?? null;
  const competitorCount = rankData?.total ?? 0;

  // Get interval for trend display
  const interval = getIntervalForTimeRange(timeRangePreset);

  // Event handlers
  const handleTimeRangeChange = (newRange: TimeRange) => {
    setRange(newRange);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Update URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  };

  const handleRetry = () => {
    refetchOverview();
    refetchTrends();
  };

  // Check for NO_BRAND error - show pending structure instead of blocking empty state
  const isNoBrandError = !!(overviewError && (
    overviewError instanceof Error && (
      overviewError.message.includes('No brand configured') ||
      overviewError.message.includes('NO_BRAND')
    )
  ));

  // Determine loading/error states
  const isLoading = overviewLoading || trendsLoading;
  const isFetching = overviewFetching || trendsFetching;
  const isRefreshing = isFetching && !isLoading; // Has data but fetching new
  const isPending = overviewData?.meta?.dataFreshness === 'pending' || isNoBrandError;

  // Error state (but not for NO_BRAND - that shows pending structure)
  if (overviewError && !overviewLoading && !isNoBrandError) {
    const errorMessage = overviewError instanceof Error
      ? overviewError.message
      : 'Failed to load visibility data';

    return (
      <main role="main" aria-label="Visibility">
        <PageHeader
          title="Visibility"
          subtitle="Track your brand's presence across AI platforms"
          action={<TimeRangeSelector value={range} onChange={handleTimeRangeChange} />}
        />
        <ErrorState
          title="Couldn't load visibility data"
          error={errorMessage}
          onRetry={handleRetry}
        />
      </main>
    );
  }

  // Stale data warning
  // NOTE: Stale warning threshold now handled by StaleDataWarning component

  return (
    <main role="main" aria-label="Visibility">
      {/* Page Header */}
      <PageHeader
        title="Visibility"
        subtitle="Track your brand's presence across AI platforms"
        action={
          <div className="flex items-center gap-3">
            {isRefreshing && (
              <div className="flex items-center gap-2 text-figma-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-figma-xs">Updating...</span>
              </div>
            )}
            <TimeRangeSelector
              value={range}
              onChange={handleTimeRangeChange}
              open={dateFilterOpen}
              onOpenChange={setDateFilterOpen}
            />
          </div>
        }
      />

      {/* Stale data warning */}
      <StaleDataWarning cacheAge={overviewData?.meta?.cacheAge} onRefresh={handleRetry} />

      {/* Tabs - subtle opacity when refreshing to indicate data is updating */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className={cn('w-full transition-opacity duration-200', isRefreshing && 'opacity-60')}
      >
        <TabsList className="mb-6 inline-flex items-center gap-6 bg-transparent rounded-none p-0 h-auto border-b border-figma-border-light w-full justify-start">
          <TabsTrigger value="overview" className="rounded-none px-0 pb-2 pt-0 text-figma-sm font-normal text-figma-secondary border-b-2 border-transparent data-[state=active]:border-figma-blue data-[state=active]:text-figma-primary data-[state=active]:font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-figma-primary transition-colors">Overview</TabsTrigger>
          <TabsTrigger value="platform" className="rounded-none px-0 pb-2 pt-0 text-figma-sm font-normal text-figma-secondary border-b-2 border-transparent data-[state=active]:border-figma-blue data-[state=active]:text-figma-primary data-[state=active]:font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-figma-primary transition-colors">By platform</TabsTrigger>
          <TabsTrigger value="topic" className="rounded-none px-0 pb-2 pt-0 text-figma-sm font-normal text-figma-secondary border-b-2 border-transparent data-[state=active]:border-figma-blue data-[state=active]:text-figma-primary data-[state=active]:font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-figma-primary transition-colors">By topic</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            data={overviewData}
            trendsData={trendsData}
            timeRange={range}
            isLoading={isLoading}
            isPending={isPending}
            brandName={brandName}
            onTabChange={handleTabChange}
            onNavigate={navigate}
            rank={rank}
            competitorCount={competitorCount}
            interval={interval}
          />
        </TabsContent>

        <TabsContent value="platform">
          <ByPlatformTab
            timeRange={timeRangePreset}
            brandName={brandName}
            onAdjustDateRange={() => setDateFilterOpen(true)}
          />
        </TabsContent>

        <TabsContent value="topic">
          <ByTopicTab
            timeRange={timeRangePreset}
            brandName={brandName}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}

export default VisibilityPage;
