import { workspaceFetch as fetch } from '@/lib/workspace-query';

/**
 * By Platform Tab
 *
 * Answers: "Which AI platforms mention me most? Where am I strong vs weak?"
 *
 * Sections:
 *   2A. Platform Trend Chart — toggle chips + multi-line chart
 *   2B. Platform Table — all 8 platforms with metrics
 *   2C. Platform Comparison Insight — strongest + weakest + missing
 *
 * Data:
 *   GET /api/metrics/by-platform?brand={name}&from={date}&to={date}
 *   GET /api/metrics/trends?timeRange={range}&interval=day
 */

import { useState, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Lightbulb, HelpCircle, Loader2, Search } from 'lucide-react';
import { useActiveWorkspaceName } from '@/hooks/use-active-workspace';

// Shared components
import { ContentCard } from '@/components/shared/dashboard-card';
import { SentimentBadge } from '@/components/shared/sentiment-badge';
import { Skeleton, ChartSkeleton } from '@/components/shared/skeleton-loader';
import { CardEmptyState, ErrorState } from '@/components/shared/empty-state';
import { SimpleTooltip, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Chart
import { VisibilityTimeline } from '@/components/charts/visibility-timeline';

// Platform
import { PlatformIcon, PLATFORMS } from '@/components/ui/platform-icon';

// Types
import type { TimeRangePreset, TrendsResponse, TrendDataPoint, PlatformTrendDataPoint } from '@shared/types';

// ============================================================================
// Types
// ============================================================================

interface ByPlatformTabProps {
  timeRange: TimeRangePreset;
  brandName: string;
  onAdjustDateRange: () => void;
}

/** Shape returned by GET /api/metrics/by-platform */
interface PlatformApiMetric {
  platform: string;
  mentioned: boolean;
  mentionCount: number;
  visibilityScore: number;
  positionScore: number;
  sentimentScore: number;
  responseCount: number;
  /** Citations that link to the brand's own domain */
  ownedCitationCount: number;
  /** Citations that link to social media platforms */
  socialCitationCount: number;
  /** Citations that link to external domains (non-social) */
  thirdPartyCitationCount: number;
  /** Total prompts relevant to the brand's topics on this platform */
  relevantPromptCount: number;
}

interface PlatformApiResponse {
  brand: string;
  platforms: PlatformApiMetric[];
  summary: {
    totalPlatforms: number;
    platformsWithMention: number;
    bestPlatform: PlatformApiMetric | null;
  };
  timeRange: { from: string | null; to: string | null };
}

/** Normalized platform row for table + chart */
interface NormalizedPlatform {
  id: string;
  name: string;
  color: string;
  score: number;
  mentions: number;
  citationRate: number | null;
  /** % of citations that link to YOUR domain */
  ownedCitationRate: number | null;
  /** % of citations that link to social media platforms */
  socialCitationRate: number | null;
  /** % of citations that link to external domains (non-social) */
  thirdPartyCitationRate: number | null;
  /** % of relevant prompts where brand did NOT appear */
  missedOppRate: number | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  trend: number | null;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Map sentiment score (0-1) to a sentiment label.
 * sentimentScore from the API is typically 0-1 range.
 */
function scoresToSentiment(sentimentScore: number): 'positive' | 'neutral' | 'negative' | null {
  if (sentimentScore >= 0.6) return 'positive';
  if (sentimentScore >= 0.4) return 'neutral';
  if (sentimentScore > 0) return 'negative';
  return null;
}

/**
 * Get date range from TimeRangePreset for API calls
 */
function getDateRange(preset: TimeRangePreset): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  if (preset === 'all') from.setFullYear(2020, 0, 1);
  const days: Record<string, number> = {
    '1d': 1, '3d': 3, '7d': 7, '14d': 14, '30d': 30,
    '60d': 60, '90d': 90, '365d': 365,
  };
  if (preset !== 'all') from.setDate(from.getDate() - (days[preset] || 30));
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

/**
 * Normalize the API response into our table/chart format.
 * Maps API platform IDs to our PLATFORMS array.
 */
function normalizePlatforms(apiPlatforms: PlatformApiMetric[]): NormalizedPlatform[] {
  const apiMap = new Map<string, PlatformApiMetric>();
  for (const p of apiPlatforms) {
    const normalizedId = p.platform.toLowerCase().replace(/[\s_]+/g, '-');
    apiMap.set(normalizedId, p);
  }

  return PLATFORMS.map((plat) => {
    const api = apiMap.get(plat.id);
    // Calculate citation rate: mentions / responses (if both > 0)
    const citationRate = api && api.responseCount > 0 && api.mentionCount > 0
      ? Math.round((api.mentionCount / api.responseCount) * 100)
      : null;
    // Total citations = owned + social + third-party
    const totalCitations = (api?.ownedCitationCount ?? 0) + (api?.socialCitationCount ?? 0) + (api?.thirdPartyCitationCount ?? 0);
    // Owned citation rate: % of citations that link to brand's own domain
    const ownedCitationRate = totalCitations > 0 && api?.ownedCitationCount != null
      ? Math.round((api.ownedCitationCount / totalCitations) * 100)
      : null;
    // Social citation rate: % of citations that link to social media platforms
    const socialCitationRate = totalCitations > 0 && api?.socialCitationCount != null
      ? Math.round((api.socialCitationCount / totalCitations) * 100)
      : null;
    // Third-party citation rate: % of citations that link to external domains (non-social)
    const thirdPartyCitationRate = totalCitations > 0 && api?.thirdPartyCitationCount != null
      ? Math.round((api.thirdPartyCitationCount / totalCitations) * 100)
      : null;
    // Missed opportunity rate: % of relevant prompts where brand did NOT appear
    // Formula: ((relevantPrompts - mentionCount) / relevantPrompts) * 100
    const missedOppRate = api && api.relevantPromptCount > 0
      ? Math.round(((api.relevantPromptCount - api.mentionCount) / api.relevantPromptCount) * 100)
      : null;
    return {
      id: plat.id,
      name: plat.name,
      color: plat.color,
      score: api?.visibilityScore ?? 0,
      mentions: api?.mentionCount ?? 0,
      citationRate,
      ownedCitationRate,
      socialCitationRate,
      thirdPartyCitationRate,
      missedOppRate,
      sentiment: api ? scoresToSentiment(api.sentimentScore) : null,
      trend: null, // Not available from current API as a delta
    };
  }).sort((a, b) => b.score - a.score);
}

// ============================================================================
// Data hooks
// ============================================================================

function usePlatformMetrics(timeRange: TimeRangePreset) {
  const brandName = useActiveWorkspaceName();
  const { from, to } = getDateRange(timeRange);

  return useQuery<PlatformApiResponse>({
    queryKey: ['metrics', 'by-platform', brandName, timeRange],
    queryFn: async () => {
      const params = new URLSearchParams({ brand: brandName, from, to });
      const res = await fetch(`/api/metrics/by-platform?${params}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || error.error || 'Failed to load platform data');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

function useTrends(timeRange: TimeRangePreset, brandName: string) {
  return useQuery<TrendsResponse>({
    queryKey: ['visibility', 'trends', timeRange, brandName],
    queryFn: async () => {
      const res = await fetch(`/api/metrics/trends?timeRange=${timeRange}&interval=day&brand=${encodeURIComponent(brandName)}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || error.error || 'Failed to load trend data');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

// ============================================================================
// 2A. Platform Trend Chart
// ============================================================================

function PlatformTrendChart({
  platforms,
  trendsData,
  activePlatforms,
  onTogglePlatform,
  onAdjustDateRange,
}: {
  platforms: NormalizedPlatform[];
  trendsData: TrendsResponse | undefined;
  activePlatforms: string[];
  onTogglePlatform: (id: string) => void;
  onAdjustDateRange: () => void;
}) {
  const organizationName = useActiveWorkspaceName();

  // Build per-platform timeline data from the trends endpoint
  // The trends endpoint returns TrendDataPoint with date/score/mentions/sentiment
  // Plus byPlatform: { [platformId]: PlatformTrendDataPoint[] } for per-platform time series
  const { chartData, competitorLines } = useMemo(() => {
    const dataPoints = trendsData?.dataPoints ?? [];
    const byPlatform = trendsData?.byPlatform ?? {};

    // Primary line — overall aggregate
    const chartData = dataPoints.map((dp: TrendDataPoint) => ({
      date: dp.date,
      visibilityScore: dp.score,
      mentionCount: dp.mentions,
    }));

    // Per-platform lines — use real time series data from byPlatform
    const competitorLines = PLATFORMS
      .filter((p) => activePlatforms.includes(p.id))
      .map((plat) => {
        const platformData = platforms.find((pp) => pp.id === plat.id);
        const platformTimeSeries = byPlatform[plat.id] as PlatformTrendDataPoint[] | undefined;
        const mentions = platformData?.mentions ?? 0;

        // If we have real time series data for this platform, use it
        // Otherwise fall back to flat line at current score (for backward compatibility)
        if (platformTimeSeries && platformTimeSeries.length > 0) {
          return {
            name: plat.name,
            data: platformTimeSeries.map((dp: PlatformTrendDataPoint) => ({
              date: dp.date,
              visibilityScore: dp.score,
              mentionCount: dp.mentions,
            })),
            color: plat.color,
            mentions, // aggregate for legend
          };
        }

        // Fallback: flat line at current score (if no time series data available)
        const score = platformData?.score ?? 0;
        return {
          name: plat.name,
          data: dataPoints.map((dp: TrendDataPoint) => ({
            date: dp.date,
            visibilityScore: score,
          })),
          color: plat.color,
          mentions,
        };
      });

    return { chartData, competitorLines };
  }, [trendsData, activePlatforms, platforms]);

  const [, setLocation] = useLocation();

  const hasHistory = trendsData?.hasHistoricalData ?? false;
  const noDataForRange = hasHistory && trendsData?.hasDataInRange === false;
  const hasNoData = !hasHistory;
  const previewLines = useMemo(() => {
    const today = new Date();
    const dates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - index));
      return date.toISOString().split('T')[0];
    });

    return PLATFORMS
      .filter((platform) => activePlatforms.includes(platform.id))
      .map((platform, platformIndex) => ({
        name: platform.name,
        color: platform.color,
        data: dates.map((date, index) => ({
          date,
          visibilityScore: 42 + platformIndex * 2.25,
        })),
      }));
  }, [activePlatforms]);

  return (
    <ContentCard
      title="Platform visibility over time"
      subtitle="Score trend for each AI platform"
      actionLabel="View"
      onAction={() => setLocation('/prompts')}
    >
      {noDataForRange ? (
        <CardEmptyState
          icon={Search}
          title="No trend data for this period"
          description="Try a longer date range to see earlier platform results."
          action={{ label: 'Adjust date filter', onClick: onAdjustDateRange }}
          className="min-h-[280px]"
        />
      ) : (
        <>
          <div className="flex gap-4">
            <div className="flex-1 min-w-0">
              <SimpleTooltip
                disabled={!hasNoData}
                side="top"
                maxWidth="lg"
                content="Platform trend lines and scores will appear after AI responses are collected in the selected date range."
              >
                <div
                  role={hasNoData ? 'group' : undefined}
                  tabIndex={hasNoData ? 0 : undefined}
                  aria-label={hasNoData ? 'Sample platform visibility chart. Hover or focus for details.' : undefined}
                  className={hasNoData ? 'cursor-help rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-figma-blue' : undefined}
                >
                  <VisibilityTimeline
                    data={chartData}
                    height={320}
                    showArea={false}
                    showTimeRangeSelector={false}
                    brandName={organizationName}
                    isEmpty={hasNoData}
                    competitorData={hasNoData ? previewLines : competitorLines}
                    showComparisonControls={false}
                    defaultComparisonMode="competitor"
                    hideLegend
                    hidePrimaryLine
                    hideTooltip={hasNoData}
                  />
                </div>
              </SimpleTooltip>
            </div>

            <div className="w-[160px] shrink-0 max-h-[320px] overflow-y-auto border-l border-figma-border-light pl-4">
              <div className="flex flex-col gap-1.5">
                {PLATFORMS.map((platform) => {
                  const platformData = platforms.find((p) => p.id === platform.id);
                  const score = platformData?.score ?? 0;
                  const mentions = platformData?.mentions ?? 0;
                  return (
                    <button
                      key={platform.id}
                      onClick={() => onTogglePlatform(platform.id)}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1 rounded-md text-figma-xs font-medium transition-colors w-full text-left',
                        activePlatforms.includes(platform.id)
                          ? 'bg-figma-hover text-figma-primary'
                          : 'text-figma-muted hover:bg-figma-hover/50'
                      )}
                    >
                      <div
                        className={cn(
                          'w-2.5 h-2.5 rounded-full shrink-0',
                          !activePlatforms.includes(platform.id) && 'opacity-40'
                        )}
                        style={{ backgroundColor: platform.color }}
                      />
                      <span className="truncate flex-1 min-w-0" title={platform.name}>{platform.name}</span>
                      <span className={cn(
                        'shrink-0 text-figma-2xs tabular-nums',
                        activePlatforms.includes(platform.id) ? 'text-figma-secondary' : 'text-figma-muted'
                      )}>
                        {hasNoData ? '—' : `${score}% (${mentions})`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </ContentCard>
  );
}

// ============================================================================
// 2B. Platform Table
// ============================================================================

function PlatformTable({ platforms }: { platforms: NormalizedPlatform[] }) {
  const [, setLocation] = useLocation();

  return (
    <ContentCard
      title="Platform breakdown"
      subtitle="Performance metrics for each AI platform"
      actionLabel="View"
      onAction={() => setLocation('/prompts')}
    >
      {/* Inline table header with tooltip definitions */}
      <TooltipProvider delayDuration={0}>
        <div className="grid grid-cols-[1.5fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-2 pb-3 px-2 border-b border-figma-border-light">
          <span className="text-figma-2xs font-medium text-figma-secondary">Platform</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-figma-2xs font-medium text-figma-secondary text-right cursor-help flex items-center justify-end gap-1">
                Score <HelpCircle className="w-3 h-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <p className="text-figma-xs">Overall visibility score (0-100) based on mentions, position, and sentiment.</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-figma-2xs font-medium text-figma-secondary text-right cursor-help flex items-center justify-end gap-1">
                Mentions <HelpCircle className="w-3 h-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <p className="text-figma-xs">Times AI mentioned your brand in responses.</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-figma-2xs font-medium text-figma-secondary text-right cursor-help flex items-center justify-end gap-1">
                Citation <HelpCircle className="w-3 h-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px]">
              <p className="text-figma-xs">% of mentions that include a link to your site.</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-figma-2xs font-medium text-figma-secondary text-right cursor-help flex items-center justify-end gap-1">
                Owned <HelpCircle className="w-3 h-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px]">
              <p className="text-figma-xs">% of citations from your own domain.</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-figma-2xs font-medium text-figma-secondary text-right cursor-help flex items-center justify-end gap-1">
                3rd party <HelpCircle className="w-3 h-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px]">
              <p className="text-figma-xs">% of citations from third-party sites (news, blogs, and review sites).</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-figma-2xs font-medium text-figma-secondary text-right cursor-help flex items-center justify-end gap-1">
                Social <HelpCircle className="w-3 h-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px]">
              <p className="text-figma-xs">% of citations from social platforms (Reddit, Twitter, etc.).</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-figma-2xs font-medium text-figma-secondary text-right cursor-help flex items-center justify-end gap-1">
                Missed <HelpCircle className="w-3 h-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px]">
              <p className="text-figma-xs">% of relevant prompts where you didn't appear. High = coverage gaps.</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-figma-2xs font-medium text-figma-secondary text-right cursor-help flex items-center justify-end gap-1">
                Sentiment <HelpCircle className="w-3 h-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <p className="text-figma-xs">Overall tone of how AI describes your brand on this platform.</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Table rows with hover tooltips */}
      <TooltipProvider delayDuration={300}>
        <div>
          {platforms.map((p) => (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'grid grid-cols-[1.5fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-2 items-center py-3 px-2',
                    'border-b border-figma-border-light last:border-0',
                    'hover:bg-figma-hover cursor-pointer transition-colors'
                  )}
                >
                  {/* Platform name with icon */}
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={p.id} size="sm" />
                    <span className="text-figma-sm font-normal text-figma-primary">{p.name}</span>
                  </div>
                  {/* Score */}
                  <span className="text-figma-sm font-semibold text-figma-primary tabular-nums text-right">
                    {p.score || '--'}
                  </span>
                  {/* Mentions */}
                  <span className="text-figma-sm text-figma-secondary tabular-nums text-right">
                    {p.mentions > 0 ? p.mentions.toLocaleString() : '--'}
                  </span>
                  {/* Citation rate */}
                  <span className="text-figma-sm text-figma-secondary tabular-nums text-right">
                    {p.citationRate != null ? `${p.citationRate}%` : '--'}
                  </span>
                  {/* Owned citation % */}
                  <span className={cn(
                    "text-figma-sm tabular-nums text-right",
                    p.ownedCitationRate != null && p.ownedCitationRate >= 50 ? "text-figma-green font-medium" : "text-figma-secondary"
                  )}>
                    {p.ownedCitationRate != null ? `${p.ownedCitationRate}%` : '--'}
                  </span>
                  {/* Third-party citation % */}
                  <span className="text-figma-sm text-figma-secondary tabular-nums text-right">
                    {p.thirdPartyCitationRate != null ? `${p.thirdPartyCitationRate}%` : '--'}
                  </span>
                  {/* Social citation % */}
                  <span className="text-figma-sm text-figma-secondary tabular-nums text-right">
                    {p.socialCitationRate != null ? `${p.socialCitationRate}%` : '--'}
                  </span>
                  {/* Missed opp % */}
                  <span className={cn(
                    "text-figma-sm tabular-nums text-right",
                    p.missedOppRate != null && p.missedOppRate > 30 ? "text-figma-red" : "text-figma-secondary"
                  )}>
                    {p.missedOppRate != null ? `${p.missedOppRate}%` : '--'}
                  </span>
                  {/* Sentiment */}
                  <div className="flex justify-end">
                    {p.sentiment ? (
                      <SentimentBadge sentiment={p.sentiment} />
                    ) : (
                      <span className="text-figma-sm text-figma-muted">--</span>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="p-0 border-none shadow-2xl bg-transparent rounded-xl overflow-hidden"
              >
                <div className="bg-figma-card rounded-xl p-4 min-w-[240px] border border-figma-border shadow-lg">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <PlatformIcon platform={p.id} size="md" />
                    <span className="text-figma-base font-semibold text-figma-primary">{p.name}</span>
                    <span className="ml-auto text-figma-base font-semibold text-figma-green">{p.score}/100</span>
                  </div>
                  <div className="h-px bg-figma-border-light mb-3" />
                  {/* Stats */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-figma-sm">
                      <span className="text-figma-secondary">Mentions</span>
                      <span className="font-medium text-figma-primary">{p.mentions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-figma-sm">
                      <span className="text-figma-secondary">Citation rate</span>
                      <span className="font-medium text-figma-primary">{p.citationRate != null ? `${p.citationRate}%` : '--'}</span>
                    </div>
                    <div className="flex justify-between text-figma-sm">
                      <span className="text-figma-secondary">Owned citations</span>
                      <span className={cn(
                        "font-medium",
                        p.ownedCitationRate != null && p.ownedCitationRate >= 50 ? 'text-figma-green' : 'text-figma-primary'
                      )}>
                        {p.ownedCitationRate != null ? `${p.ownedCitationRate}%` : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between text-figma-sm">
                      <span className="text-figma-secondary">Third-party</span>
                      <span className="font-medium text-figma-primary">
                        {p.thirdPartyCitationRate != null ? `${p.thirdPartyCitationRate}%` : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between text-figma-sm">
                      <span className="text-figma-secondary">Social</span>
                      <span className="font-medium text-figma-primary">
                        {p.socialCitationRate != null ? `${p.socialCitationRate}%` : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between text-figma-sm">
                      <span className="text-figma-secondary">Missed opportunities</span>
                      <span className={cn(
                        "font-medium",
                        p.missedOppRate != null && p.missedOppRate > 30 ? 'text-figma-red' : 'text-figma-primary'
                      )}>
                        {p.missedOppRate != null ? `${p.missedOppRate}%` : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between text-figma-sm">
                      <span className="text-figma-secondary">Sentiment</span>
                      {p.sentiment ? (
                        <SentimentBadge sentiment={p.sentiment} />
                      ) : (
                        <span className="text-figma-muted">--</span>
                      )}
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </ContentCard>
  );
}

// ============================================================================
// 2C. Platform Comparison Insight
// ============================================================================

function PlatformInsight({ platforms }: { platforms: NormalizedPlatform[] }) {
  const activePlatforms = platforms.filter((p) => p.score > 0 || p.mentions > 0);
  const inactivePlatforms = platforms.filter((p) => p.score === 0 && p.mentions === 0);

  const strongest = activePlatforms[0];
  const weakestActive = activePlatforms.length > 1
    ? activePlatforms[activePlatforms.length - 1]
    : null;

  const inactiveNames = inactivePlatforms.map((p) => p.name).join(', ');

  // Empty data case
  if (!strongest) {
    return (
      <div className="bg-figma-hover rounded-lg p-4 flex items-start gap-3">
        <Lightbulb className="w-4 h-4 text-figma-secondary shrink-0 mt-0.5" />
        <p className="text-figma-sm text-figma-secondary leading-relaxed">
          Platform data will appear once mentions start flowing.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-figma-hover rounded-lg p-4 flex items-start gap-3">
      <Lightbulb className="w-4 h-4 text-figma-secondary shrink-0 mt-0.5" />
      <p className="text-figma-sm text-figma-secondary leading-relaxed">
        <strong className="text-figma-primary">{strongest.name}</strong> is your strongest platform
        ({strongest.score}, {strongest.mentions.toLocaleString()} mentions).
        {weakestActive && (
          <>
            {' '}
            <strong className="text-figma-primary">{weakestActive.name}</strong> has the most room
            for improvement ({weakestActive.score}).
          </>
        )}
        {inactivePlatforms.length > 0 && (
          <> You&apos;re not yet visible on {inactiveNames}.</>
        )}
      </p>
    </div>
  );
}

// ============================================================================
// Loading State
// ============================================================================

function ByPlatformLoading() {
  return (
    <div className="space-y-6">
      {/* Chart skeleton with side legend */}
      <ContentCard title="Platform visibility over time" subtitle="Score trend for each AI platform">
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <ChartSkeleton type="line" height={320} />
          </div>
          <div className="w-[160px] shrink-0 max-h-[320px] overflow-y-auto border-l border-figma-border-light pl-4">
            <div className="flex flex-col gap-2">
              {PLATFORMS.map((platform) => (
                <div
                  key={platform.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-figma-xs text-figma-muted w-full"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 opacity-40"
                    style={{ backgroundColor: platform.color }}
                  />
                  <PlatformIcon platform={platform.id} size="xs" className="shrink-0 opacity-40 grayscale" />
                  <span className="truncate">{platform.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ContentCard>

      {/* Table skeleton */}
      <ContentCard title="Platform breakdown" subtitle="Performance metrics for each AI platform">
        {/* Header */}
        <div className="grid grid-cols-[1.5fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-2 pb-3 px-2 border-b border-figma-border-light">
          <span className="text-figma-2xs font-medium text-figma-secondary">Platform</span>
          <span className="text-figma-2xs font-medium text-figma-secondary text-right">Score</span>
          <span className="text-figma-2xs font-medium text-figma-secondary text-right">Mentions</span>
          <span className="text-figma-2xs font-medium text-figma-secondary text-right">Citation</span>
          <span className="text-figma-2xs font-medium text-figma-secondary text-right">Owned</span>
          <span className="text-figma-2xs font-medium text-figma-secondary text-right">3rd party</span>
          <span className="text-figma-2xs font-medium text-figma-secondary text-right">Social</span>
          <span className="text-figma-2xs font-medium text-figma-secondary text-right">Missed</span>
          <span className="text-figma-2xs font-medium text-figma-secondary text-right">Sentiment</span>
        </div>
        {/* Skeleton rows */}
        <div>
          {PLATFORMS.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[1.5fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-2 items-center py-3 px-2 border-b border-figma-border-light last:border-0"
            >
              <div className="flex items-center gap-2">
                <PlatformIcon platform={p.id} size="sm" />
                <span className="text-figma-sm font-normal text-figma-primary">{p.name}</span>
              </div>
              <Skeleton className="h-4 w-8 rounded ml-auto" />
              <Skeleton className="h-4 w-8 rounded ml-auto" />
              <Skeleton className="h-4 w-8 rounded ml-auto" />
              <Skeleton className="h-4 w-8 rounded ml-auto" />
              <Skeleton className="h-4 w-8 rounded ml-auto" />
              <Skeleton className="h-4 w-8 rounded ml-auto" />
              <Skeleton className="h-4 w-8 rounded ml-auto" />
              <Skeleton className="h-4 w-12 rounded ml-auto" />
            </div>
          ))}
        </div>
      </ContentCard>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function ByPlatformEmpty() {
  const organizationName = useActiveWorkspaceName();
  const emptyPlatforms: NormalizedPlatform[] = PLATFORMS.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    score: 0,
    mentions: 0,
    citationRate: null,
    ownedCitationRate: null,
    socialCitationRate: null,
    thirdPartyCitationRate: null,
    missedOppRate: null,
    sentiment: null,
    trend: null,
  }));

  return (
    <div className="space-y-6">
      {/* Chart with grid lines but no data - with side legend */}
      <ContentCard title="Platform visibility over time" subtitle="Score trend for each AI platform">
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <VisibilityTimeline
              data={[]}
              height={320}
              showArea={false}
              showTimeRangeSelector={false}
              brandName={organizationName}
              isEmpty={true}
              showComparisonControls={false}
              hideLegend={true}
            />
          </div>
          <div className="w-[160px] shrink-0 max-h-[320px] overflow-y-auto border-l border-figma-border-light pl-4">
            <div className="flex flex-col gap-2">
              {PLATFORMS.map((platform) => (
                <div
                  key={platform.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-figma-xs text-figma-muted w-full"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 opacity-40"
                    style={{ backgroundColor: platform.color }}
                  />
                  <PlatformIcon platform={platform.id} size="xs" className="shrink-0 opacity-40 grayscale" />
                  <span className="truncate">{platform.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ContentCard>

      {/* Table with all 8 platforms showing "--" */}
      <PlatformTable platforms={emptyPlatforms} />

      {/* Insight */}
      <PlatformInsight platforms={emptyPlatforms} />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ByPlatformTab({ timeRange, brandName, onAdjustDateRange }: ByPlatformTabProps) {
  // Platform toggle state — all ON by default
  const [activePlatforms, setActivePlatforms] = useState<string[]>(
    PLATFORMS.map((p) => p.id)
  );

  const togglePlatform = (id: string) => {
    setActivePlatforms((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : [...prev, id]
    );
  };

  // Data fetching
  const {
    data: platformData,
    isLoading: platformLoading,
    isFetching: platformFetching,
    error: platformError,
    refetch: refetchPlatform,
  } = usePlatformMetrics(timeRange);

  const {
    data: trendsData,
    isLoading: trendsLoading,
    isFetching: trendsFetching,
    error: trendsError,
    refetch: refetchTrends,
  } = useTrends(timeRange, brandName);

  const isLoading = platformLoading || trendsLoading;
  const isFetching = platformFetching || trendsFetching;
  const isRefreshing = isFetching && !isLoading;
  const error = platformError || trendsError;

  const handleRetry = () => {
    refetchPlatform();
    refetchTrends();
  };

  // Normalize platform data
  const platforms = useMemo(() => {
    if (!platformData?.platforms) return [];
    return normalizePlatforms(platformData.platforms);
  }, [platformData]);

  // --- Error state ---
  if (error && !isLoading) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load platform data';
    return (
      <ErrorState
        title="Couldn't load platform data"
        error={errorMessage}
        onRetry={handleRetry}
      />
    );
  }

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-figma-muted" />
      </div>
    );
  }

  // --- Empty state ---
  if (!platformData?.platforms || platformData.platforms.length === 0) {
    return <ByPlatformEmpty />;
  }

  // --- Data present ---
  return (
    <div className={cn('space-y-6 transition-opacity duration-200', isRefreshing && 'opacity-60')}>
      {/* Refreshing indicator */}
      {isRefreshing && (
        <div className="flex items-center gap-2 text-figma-muted mb-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-figma-xs">Updating data...</span>
        </div>
      )}
      {/* 2A. Platform Trend Chart */}
      <PlatformTrendChart
        platforms={platforms}
        trendsData={trendsData}
        activePlatforms={activePlatforms}
        onTogglePlatform={togglePlatform}
        onAdjustDateRange={onAdjustDateRange}
      />

      {/* 2B. Platform Table */}
      <PlatformTable platforms={platforms} />
    </div>
  );
}

export default ByPlatformTab;
