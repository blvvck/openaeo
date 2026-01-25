import { workspaceFetch as fetch } from '@/lib/workspace-query';

/**
 * Trends Tab
 *
 * Answers: "Is my visibility getting better or worse? What caused changes?"
 *
 * Sections:
 *   4A. Trend Chart — full-height chart with previous period overlay
 *   4B. Anomalies Detected — auto-detected score changes > 5%
 *   4C. Period Comparison — current vs previous metrics
 *   4D. Metric Trends Table — 4 rows with current/previous/change/mini bar
 *
 * Data:
 *   GET /api/metrics/trends?timeRange={range}&granularity=daily&brand={name}
 *   GET /api/visibility/overview?timeRange={range}
 *
 * HANDOFF LESSONS APPLIED:
 *   - NEVER use hsl(var(--primary)) in SVG — use var(--primary) directly
 *   - Platform IDs normalized with /[\s_]+/g -> hyphens
 *   - TrendIndicator with previousValue={0} = broken (div by zero)
 *   - Zero trends: pass undefined instead of 0
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Lightbulb } from 'lucide-react';
import { DEMO_CONFIG } from '@/config/app';

// Shared components
import { ContentCard } from '@/components/shared/dashboard-card';
import { CardFooterSummary } from '@/components/shared/card-footer-summary';
import { Skeleton, ChartSkeleton } from '@/components/shared/skeleton-loader';
import { ErrorState } from '@/components/shared/empty-state';

// Chart
import { VisibilityTimeline } from '@/components/charts/visibility-timeline';

// Types
import type {
  TimeRangePreset,
  TrendsResponse,
  TrendDataPoint,
  TrendAnnotation,
  VisibilityOverviewResponse,
} from '@shared/types';

// ============================================================================
// Types
// ============================================================================

interface TrendsTabProps {
  timeRange: TimeRangePreset;
  brandName: string;
}

/** Anomaly derived from TrendAnnotation + computed description */
interface DisplayAnomaly {
  date: string;
  type: 'spike' | 'drop' | 'shift';
  headline: string;
  description: string;
  magnitude: number;
}

/** Period comparison metric */
interface PeriodMetric {
  label: string;
  current: string;
  previous: string;
  change: number;
  changePercent: number;
  suffix?: string;
}

/** Metric trend row for the bottom table */
interface MetricTrendRow {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  suffix?: string;
}

// ============================================================================
// Data Hooks
// ============================================================================

function useTrends(timeRange: TimeRangePreset, brandName: string) {
  return useQuery<TrendsResponse>({
    queryKey: ['visibility', 'trends', timeRange, brandName],
    queryFn: async () => {
      const res = await fetch(
        `/api/metrics/trends?timeRange=${timeRange}&granularity=daily&brand=${encodeURIComponent(brandName)}`
      );
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || error.error || 'Failed to load trend data');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

function useVisibilityOverview(timeRange: TimeRangePreset) {
  return useQuery<VisibilityOverviewResponse>({
    queryKey: ['visibility', 'overview', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/visibility/overview?timeRange=${timeRange}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load visibility data');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Compute the "previous period" data by shifting the data points.
 * For period comparison overlay: take the first half of data as "previous"
 * and align it with the second half dates.
 *
 * Alternative approach: split data in half for overlay comparison.
 * If we have 30 days, days 1-15 = previous, days 16-30 = current.
 * The overlay shows both on the same x-axis.
 *
 * We produce a shifted copy of the first half with the dates of the second half.
 */
function computePreviousPeriodData(
  dataPoints: TrendDataPoint[]
): TrendDataPoint[] {
  if (dataPoints.length < 4) return [];

  const halfLen = Math.floor(dataPoints.length / 2);
  const previousHalf = dataPoints.slice(0, halfLen);
  const currentHalf = dataPoints.slice(dataPoints.length - halfLen);

  return currentHalf.map((curr, i) => ({
    date: curr.date,
    score: previousHalf[i]?.score ?? 0,
    mentions: previousHalf[i]?.mentions ?? 0,
    sentiment: previousHalf[i]?.sentiment ?? 0,
  }));
}

/**
 * Transform annotations into display anomalies with descriptions.
 */
function buildAnomalies(
  annotations: TrendAnnotation[],
  dataPoints: TrendDataPoint[]
): DisplayAnomaly[] {
  if (!annotations || annotations.length === 0) return [];

  return annotations
    .slice(0, 5)
    .map((ann) => {
      // Find the data point and its predecessor to build description
      const dpIndex = dataPoints.findIndex((dp) => dp.date === ann.date);
      const curr = dpIndex >= 0 ? dataPoints[dpIndex] : null;
      const prev = dpIndex > 0 ? dataPoints[dpIndex - 1] : null;

      const isSpike = ann.type === 'spike';
      const type = isSpike ? ('spike' as const) : ('drop' as const);

      let description = ann.label;
      if (curr && prev) {
        description = `Score moved from ${prev.score} to ${curr.score} (${isSpike ? '+' : ''}${(curr.score - prev.score).toFixed(1)} pts)`;
      }

      return {
        date: formatDate(ann.date),
        type,
        headline: ann.label,
        description,
        magnitude: ann.magnitude ?? 0,
      };
    });
}

/**
 * Compute period comparison metrics.
 * Splits data into two halves (previous vs current period).
 */
function computePeriodComparison(
  dataPoints: TrendDataPoint[],
  overviewData?: VisibilityOverviewResponse
): {
  periodMetrics: PeriodMetric[];
  metricTrends: MetricTrendRow[];
  bestDay: { date: string; score: number } | null;
  worstDay: { date: string; score: number } | null;
  overallDirection: 'up' | 'down' | 'stable';
} {
  if (dataPoints.length < 2) {
    return {
      periodMetrics: [],
      metricTrends: [],
      bestDay: null,
      worstDay: null,
      overallDirection: 'stable',
    };
  }

  const halfLen = Math.floor(dataPoints.length / 2);
  const previousHalf = dataPoints.slice(0, halfLen);
  const currentHalf = dataPoints.slice(dataPoints.length - halfLen);

  // Aggregates
  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  const currAvgScore = avg(currentHalf.map((d) => d.score));
  const prevAvgScore = avg(previousHalf.map((d) => d.score));
  const currTotalMentions = sum(currentHalf.map((d) => d.mentions));
  const prevTotalMentions = sum(previousHalf.map((d) => d.mentions));
  const currAvgMentions = avg(currentHalf.map((d) => d.mentions));
  const prevAvgMentions = avg(previousHalf.map((d) => d.mentions));
  const currAvgSentiment = avg(currentHalf.map((d) => d.sentiment));
  const prevAvgSentiment = avg(previousHalf.map((d) => d.sentiment));

  // Best and worst days
  const allPoints = [...dataPoints].sort((a, b) => b.score - a.score);
  const bestDay = allPoints[0]
    ? { date: formatDate(allPoints[0].date), score: allPoints[0].score }
    : null;
  const worstDay = allPoints[allPoints.length - 1]
    ? {
        date: formatDate(allPoints[allPoints.length - 1].date),
        score: allPoints[allPoints.length - 1].score,
      }
    : null;

  // Score change %
  const scoreChange = prevAvgScore > 0
    ? ((currAvgScore - prevAvgScore) / prevAvgScore) * 100
    : 0;
  const mentionsChange = prevAvgMentions > 0
    ? ((currAvgMentions - prevAvgMentions) / prevAvgMentions) * 100
    : 0;

  // Use overview data for current/previous overall score if available
  const overallCurrentScore = overviewData?.score ?? Math.round(currAvgScore);
  const overallPreviousScore = overviewData?.previousScore ?? Math.round(prevAvgScore);
  const overallScoreChange = overallPreviousScore > 0
    ? ((overallCurrentScore - overallPreviousScore) / overallPreviousScore) * 100
    : 0;

  const periodMetrics: PeriodMetric[] = [
    {
      label: 'Overall score',
      current: String(overallCurrentScore),
      previous: String(overallPreviousScore),
      change: overallCurrentScore - overallPreviousScore,
      changePercent: overallScoreChange,
    },
    {
      label: 'Avg mentions/day',
      current: currAvgMentions.toFixed(1),
      previous: prevAvgMentions.toFixed(1),
      change: currAvgMentions - prevAvgMentions,
      changePercent: mentionsChange,
    },
    {
      label: 'Best day',
      current: bestDay ? `${bestDay.date} (${bestDay.score})` : '--',
      previous: '--',
      change: 0,
      changePercent: 0,
    },
    {
      label: 'Worst day',
      current: worstDay ? `${worstDay.date} (${worstDay.score})` : '--',
      previous: '--',
      change: 0,
      changePercent: 0,
    },
  ];

  // Get overview breakdown for richer metric trends
  const currMentions = overviewData?.breakdown?.mentionCount ?? Math.round(currTotalMentions);
  const prevMentions = Math.round(prevTotalMentions);
  const currCitation = overviewData?.breakdown?.citationRate ?? 0;
  const prevCitationApprox = currCitation; // No previous period citation available, use same
  const currSentiment = overviewData?.breakdown?.sentimentBonus ?? Math.round(currAvgSentiment * 100);
  const prevSentimentApprox = Math.round(prevAvgSentiment * 100);
  const currPlatforms = overviewData?.breakdown?.platformDiversity?.active ?? 0;

  const metricTrends: MetricTrendRow[] = [
    {
      metric: 'Mentions',
      current: currMentions,
      previous: prevMentions,
      change: currMentions - prevMentions,
      changePercent: prevMentions > 0
        ? ((currMentions - prevMentions) / prevMentions) * 100
        : 0,
    },
    {
      metric: 'Citation rate',
      current: currCitation,
      previous: prevCitationApprox,
      change: currCitation - prevCitationApprox,
      changePercent: 0,
      suffix: '%',
    },
    {
      metric: 'Sentiment bonus',
      current: currSentiment,
      previous: prevSentimentApprox,
      change: currSentiment - prevSentimentApprox,
      changePercent: prevSentimentApprox !== 0
        ? ((currSentiment - prevSentimentApprox) / Math.abs(prevSentimentApprox)) * 100
        : 0,
      suffix: ' pts',
    },
    {
      metric: 'Platform count',
      current: currPlatforms,
      previous: currPlatforms, // No historical platform count available
      change: 0,
      changePercent: 0,
    },
  ];

  const overallDirection: 'up' | 'down' | 'stable' =
    overallScoreChange > 1 ? 'up' : overallScoreChange < -1 ? 'down' : 'stable';

  return { periodMetrics, metricTrends, bestDay, worstDay, overallDirection };
}

// ============================================================================
// 4A. Trend Chart
// ============================================================================

function TrendChart({
  trendsData,
  brandName,
}: {
  trendsData: TrendsResponse;
  brandName: string;
}) {
  const { chartData, previousPeriodData } = useMemo(() => {
    const dataPoints = trendsData?.dataPoints ?? [];

    const chartData = dataPoints.map((dp: TrendDataPoint) => ({
      date: dp.date,
      visibilityScore: dp.score,
      mentionCount: dp.mentions,
    }));

    const previousPeriodData = computePreviousPeriodData(dataPoints).map(
      (dp) => ({
        date: dp.date,
        visibilityScore: dp.score,
        mentionCount: dp.mentions,
      })
    );

    return { chartData, previousPeriodData };
  }, [trendsData]);

  return (
    <ContentCard
      title="Visibility trend"
      subtitle="Score over time with period comparison"
    >
      <VisibilityTimeline
        data={chartData}
        height={360}
        showArea={false}
        showTimeRangeSelector={false}
        brandName={brandName}
        previousPeriodData={
          previousPeriodData.length > 0 ? previousPeriodData : undefined
        }
        showComparisonControls={true}
        isEmpty={chartData.length === 0}
      />
    </ContentCard>
  );
}

// ============================================================================
// 4B. Anomalies Detected Card
// ============================================================================

function AnomaliesCard({ anomalies }: { anomalies: DisplayAnomaly[] }) {
  if (anomalies.length === 0) {
    return (
      <ContentCard
        title="Anomalies detected (0)"
        subtitle="Significant score changes"
      >
        <div className="py-6 text-center">
          <p className="text-figma-sm text-figma-muted">
            No significant score changes detected this period.
          </p>
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard
      title={`Anomalies detected (${anomalies.length})`}
      subtitle="Significant score changes"
    >
      <div>
        {anomalies.map((anomaly, i) => (
          <div
            key={`${anomaly.date}-${i}`}
            className={cn(
              'py-3',
              i < anomalies.length - 1 && 'border-b border-figma-border-light'
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  anomaly.type === 'drop'
                    ? 'bg-figma-red'
                    : anomaly.type === 'spike'
                      ? 'bg-figma-green'
                      : 'bg-figma-orange'
                )}
              />
              <span className="text-figma-sm font-medium text-figma-primary">
                {anomaly.date}: {anomaly.headline}
              </span>
            </div>
            <p className="text-figma-xs text-figma-muted mt-1 ml-4">
              {anomaly.description}
            </p>
          </div>
        ))}
      </div>
    </ContentCard>
  );
}

// ============================================================================
// 4C. Period Comparison Card
// ============================================================================

function PeriodComparisonCard({
  periodMetrics,
  overallDirection,
  overallChangePercent,
}: {
  periodMetrics: PeriodMetric[];
  overallDirection: 'up' | 'down' | 'stable';
  overallChangePercent: number;
}) {
  if (periodMetrics.length === 0) {
    return (
      <ContentCard
        title="Period comparison"
        subtitle="This period vs previous"
      >
        <div className="py-6 text-center">
          <p className="text-figma-sm text-figma-muted">
            Need at least two data periods for comparison.
          </p>
        </div>
      </ContentCard>
    );
  }

  const directionLabel =
    overallDirection === 'up'
      ? 'Trending upward'
      : overallDirection === 'down'
        ? 'Trending downward'
        : 'Holding steady';

  const changeLabel =
    overallDirection === 'stable'
      ? 'score unchanged vs last period'
      : `score ${overallDirection === 'up' ? 'improved' : 'declined'} ${Math.abs(overallChangePercent).toFixed(1)}% vs last period`;

  return (
    <ContentCard
      title="Period comparison"
      subtitle="This period vs previous"
      footer={
        <CardFooterSummary
          dotColor={
            overallDirection === 'up'
              ? 'bg-figma-green'
              : overallDirection === 'down'
                ? 'bg-figma-red'
                : 'bg-figma-orange'
          }
        >
          {directionLabel} — {changeLabel}
        </CardFooterSummary>
      }
    >
      <div>
        {periodMetrics.map((metric, i) => {
          const showChange = metric.change !== 0 && metric.label !== 'Best day' && metric.label !== 'Worst day';
          return (
            <div
              key={metric.label}
              className={cn(
                'flex items-center justify-between py-3',
                i < periodMetrics.length - 1 &&
                  'border-b border-figma-border-light'
              )}
            >
              <span className="text-figma-sm text-figma-secondary">
                {metric.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-figma-sm font-semibold text-figma-primary tabular-nums">
                  {metric.current}
                </span>
                {metric.label !== 'Best day' && metric.label !== 'Worst day' && (
                  <>
                    <span className="text-figma-xs text-figma-muted">vs</span>
                    <span className="text-figma-sm text-figma-muted tabular-nums">
                      {metric.previous}
                    </span>
                  </>
                )}
                {showChange && (
                  <span
                    className={cn(
                      'text-figma-xs tabular-nums',
                      metric.changePercent > 0
                        ? 'text-figma-trend-up'
                        : metric.changePercent < 0
                          ? 'text-figma-trend-down'
                          : 'text-figma-muted'
                    )}
                  >
                    {metric.changePercent > 0 ? '+' : ''}
                    {metric.changePercent.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ContentCard>
  );
}

// ============================================================================
// 4D. Metric Trends Table
// ============================================================================

function MetricTrendsTable({
  metricTrends,
}: {
  metricTrends: MetricTrendRow[];
}) {
  if (metricTrends.length === 0) {
    return (
      <ContentCard
        title="Metric trends"
        subtitle="Factor-by-factor period comparison"
      >
        <div className="py-6 text-center">
          <p className="text-figma-sm text-figma-muted">
            Metric trend data will appear after your second analysis period.
          </p>
        </div>
      </ContentCard>
    );
  }

  // Identify improving vs declining
  const improving = metricTrends.filter((r) => r.change > 0).map((r) => r.metric);
  const declining = metricTrends.filter((r) => r.change < 0).map((r) => r.metric);

  let footerText = '';
  if (improving.length > 0 && declining.length > 0) {
    footerText = `${improving.join(', ')} improving; ${declining.join(', ')} declining`;
  } else if (improving.length > 0) {
    footerText = `${improving.join(', ')} improving this period`;
  } else if (declining.length > 0) {
    footerText = `${declining.join(', ')} declining this period`;
  } else {
    footerText = 'All metrics holding steady';
  }

  return (
    <ContentCard
      title="Metric trends"
      subtitle="Factor-by-factor period comparison"
      footer={
        <CardFooterSummary
          dotColor={
            declining.length > improving.length
              ? 'bg-figma-red'
              : improving.length > 0
                ? 'bg-figma-green'
                : 'bg-figma-orange'
          }
        >
          {footerText}
        </CardFooterSummary>
      }
    >
      {/* Table header */}
      <div className="grid grid-cols-[1fr_80px_80px_80px_60px] gap-3 pb-3 px-2 border-b border-figma-border-light">
        <span className="text-figma-2xs font-medium text-figma-secondary uppercase">
          Metric
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">
          Current
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">
          Previous
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">
          Change
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">
          Trend
        </span>
      </div>

      {/* Table rows */}
      <div>
        {metricTrends.map((row) => {
          const suffix = row.suffix ?? '';
          const changeDisplay =
            row.change === 0
              ? '--'
              : `${row.change > 0 ? '+' : ''}${row.change}${suffix}`;

          return (
            <div
              key={row.metric}
              className={cn(
                'grid grid-cols-[1fr_80px_80px_80px_60px] gap-3 items-center py-3 px-2',
                'border-b border-figma-border-light last:border-0'
              )}
            >
              {/* Metric name */}
              <span className="text-figma-sm text-figma-primary">
                {row.metric}
              </span>
              {/* Current */}
              <span className="text-figma-sm font-semibold text-figma-primary tabular-nums text-right">
                {row.current}
                {suffix}
              </span>
              {/* Previous */}
              <span className="text-figma-sm text-figma-muted tabular-nums text-right">
                {row.previous}
                {suffix}
              </span>
              {/* Change */}
              <span
                className={cn(
                  'text-figma-sm tabular-nums text-right',
                  row.change > 0
                    ? 'text-figma-trend-up'
                    : row.change < 0
                      ? 'text-figma-trend-down'
                      : 'text-figma-muted'
                )}
              >
                {changeDisplay}
              </span>
              {/* Trend mini bar + arrow */}
              <div className="flex items-center gap-1 justify-end">
                {row.change !== 0 && (
                  <>
                    <div
                      className={cn(
                        'h-1 rounded-full',
                        row.change > 0 ? 'bg-figma-green' : 'bg-figma-red'
                      )}
                      style={{
                        width: `${Math.min(Math.abs(row.changePercent), 100) * 0.4}px`,
                        minWidth: '4px',
                      }}
                    />
                    <span
                      className={cn(
                        'text-figma-2xs',
                        row.change > 0
                          ? 'text-figma-trend-up'
                          : 'text-figma-trend-down'
                      )}
                    >
                      {row.change > 0 ? '\u25B2' : '\u25BC'}
                    </span>
                  </>
                )}
                {row.change === 0 && (
                  <span className="text-figma-2xs text-figma-muted">--</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ContentCard>
  );
}

// ============================================================================
// Loading State
// ============================================================================

function TrendsLoading() {
  return (
    <div className="space-y-6">
      {/* Chart skeleton */}
      <ContentCard
        title="Visibility trend"
        subtitle="Score over time with period comparison"
      >
        <ChartSkeleton height={360} />
      </ContentCard>

      {/* Row 2: Two cards side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContentCard
          title="Anomalies detected"
          subtitle="Significant score changes"
        >
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 py-3">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-4 flex-1 rounded" />
              </div>
            ))}
          </div>
        </ContentCard>
        <ContentCard
          title="Period comparison"
          subtitle="This period vs previous"
        >
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3"
              >
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            ))}
          </div>
        </ContentCard>
      </div>

      {/* Table skeleton */}
      <ContentCard
        title="Metric trends"
        subtitle="Factor-by-factor period comparison"
      >
        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_80px_80px_60px] gap-3 pb-3 px-2 border-b border-figma-border-light">
          <span className="text-figma-2xs font-medium text-figma-secondary uppercase">
            Metric
          </span>
          <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">
            Current
          </span>
          <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">
            Previous
          </span>
          <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">
            Change
          </span>
          <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">
            Trend
          </span>
        </div>
        {/* Skeleton rows */}
        <div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_80px_80px_80px_60px] gap-3 items-center py-3 px-2 border-b border-figma-border-light last:border-0"
            >
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-4 w-10 rounded ml-auto" />
              <Skeleton className="h-4 w-10 rounded ml-auto" />
              <Skeleton className="h-4 w-10 rounded ml-auto" />
              <Skeleton className="h-4 w-8 rounded ml-auto" />
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

function TrendsEmpty({ brandName }: { brandName: string }) {
  return (
    <div className="space-y-6">
      {/* Chart with empty grid */}
      <ContentCard
        title="Visibility trend"
        subtitle="Score over time with period comparison"
      >
        <VisibilityTimeline
          data={[]}
          height={360}
          showArea={false}
          showTimeRangeSelector={false}
          brandName={brandName}
          isEmpty={true}
          showComparisonControls={false}
        />
      </ContentCard>

      {/* Row 2: Anomalies + Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContentCard
          title="Anomalies detected (0)"
          subtitle="Significant score changes"
        >
          <div className="py-6 text-center">
            <p className="text-figma-sm text-figma-muted">
              Trend data will appear after your second analysis period.
            </p>
          </div>
        </ContentCard>
        <ContentCard
          title="Period comparison"
          subtitle="This period vs previous"
        >
          <div className="py-6 text-center">
            <p className="text-figma-sm text-figma-muted">
              Trend data will appear after your second analysis period.
            </p>
          </div>
        </ContentCard>
      </div>

      {/* Empty metric trends table */}
      <ContentCard
        title="Metric trends"
        subtitle="Factor-by-factor period comparison"
      >
        {/* Header visible */}
        <div className="grid grid-cols-[1fr_80px_80px_80px_60px] gap-3 pb-3 px-2 border-b border-figma-border-light">
          <span className="text-figma-2xs font-medium text-figma-secondary uppercase">
            Metric
          </span>
          <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">
            Current
          </span>
          <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">
            Previous
          </span>
          <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">
            Change
          </span>
          <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">
            Trend
          </span>
        </div>
        <div className="py-6 text-center">
          <p className="text-figma-sm text-figma-muted">
            Metric trend data will appear after your second analysis period.
          </p>
        </div>
      </ContentCard>
    </div>
  );
}

// ============================================================================
// Trend Insight
// ============================================================================

function TrendInsight({
  anomalies,
  overallDirection,
}: {
  anomalies: DisplayAnomaly[];
  overallDirection: 'up' | 'down' | 'stable';
}) {
  let insightText: string;

  if (anomalies.length > 0) {
    const drops = anomalies.filter((a) => a.type === 'drop');
    const spikes = anomalies.filter((a) => a.type === 'spike');
    if (drops.length > spikes.length) {
      insightText = `${drops.length} significant drop${drops.length > 1 ? 's' : ''} detected this period. Review platform-specific performance to identify the cause.`;
    } else if (spikes.length > 0) {
      insightText = `${spikes.length} positive spike${spikes.length > 1 ? 's' : ''} detected. Your visibility efforts are showing results.`;
    } else {
      insightText = `${anomalies.length} notable change${anomalies.length > 1 ? 's' : ''} detected this period.`;
    }
  } else if (overallDirection === 'up') {
    insightText =
      'Visibility is trending upward with no major anomalies. Consistent growth across the period.';
  } else if (overallDirection === 'down') {
    insightText =
      'Visibility is trending downward. Consider reviewing your content strategy and platform-specific performance.';
  } else {
    insightText =
      'Visibility is holding steady. Consider expanding to new platforms or topics to drive growth.';
  }

  return (
    <div className="bg-figma-hover rounded-lg p-4 flex items-start gap-3">
      <Lightbulb className="w-4 h-4 text-figma-secondary shrink-0 mt-0.5" />
      <p className="text-figma-sm text-figma-secondary leading-relaxed">
        {insightText}
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TrendsTab({ timeRange, brandName }: TrendsTabProps) {
  // Data fetching
  const {
    data: trendsData,
    isLoading: trendsLoading,
    error: trendsError,
    refetch: refetchTrends,
  } = useTrends(timeRange, brandName);

  const {
    data: overviewData,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useVisibilityOverview(timeRange);

  const isLoading = trendsLoading || overviewLoading;
  const error = trendsError || overviewError;

  const handleRetry = () => {
    refetchTrends();
    refetchOverview();
  };

  // Compute derived data
  const { anomalies, periodMetrics, metricTrends, overallDirection, overallChangePercent } =
    useMemo(() => {
      if (!trendsData?.dataPoints || trendsData.dataPoints.length === 0) {
        return {
          anomalies: [] as DisplayAnomaly[],
          periodMetrics: [] as PeriodMetric[],
          metricTrends: [] as MetricTrendRow[],
          overallDirection: 'stable' as const,
          overallChangePercent: 0,
        };
      }

      const anomalies = buildAnomalies(
        trendsData.annotations ?? [],
        trendsData.dataPoints
      );
      const { periodMetrics, metricTrends, overallDirection } =
        computePeriodComparison(trendsData.dataPoints, overviewData);

      const overallChangePercent =
        periodMetrics.length > 0 ? periodMetrics[0].changePercent : 0;

      return {
        anomalies,
        periodMetrics,
        metricTrends,
        overallDirection,
        overallChangePercent,
      };
    }, [trendsData, overviewData]);

  // --- Error state ---
  if (error && !isLoading) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to load trend data';
    return (
      <ErrorState
        title="Couldn't load trend data"
        error={errorMessage}
        onRetry={handleRetry}
      />
    );
  }

  // --- Loading state ---
  if (isLoading) {
    return <TrendsLoading />;
  }

  // --- Empty state ---
  if (
    !trendsData?.dataPoints ||
    trendsData.dataPoints.length === 0
  ) {
    return <TrendsEmpty brandName={brandName} />;
  }

  // --- Data present ---
  return (
    <div className="space-y-6">
      {/* 4A. Trend Chart */}
      <TrendChart trendsData={trendsData} brandName={brandName} />

      {/* 4B + 4C. Anomalies + Period Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnomaliesCard anomalies={anomalies} />
        <PeriodComparisonCard
          periodMetrics={periodMetrics}
          overallDirection={overallDirection}
          overallChangePercent={overallChangePercent}
        />
      </div>

      {/* 4D. Metric Trends Table */}
      <MetricTrendsTable metricTrends={metricTrends} />

      {/* Bottom insight */}
      <TrendInsight
        anomalies={anomalies}
        overallDirection={overallDirection}
      />
    </div>
  );
}

export default TrendsTab;
