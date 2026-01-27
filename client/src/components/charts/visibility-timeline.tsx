import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { rechartsProps, getSeriesColor } from './chart-theme';
import { TimeRangeSelector, useTimeRange, type TimeRange } from './time-range-selector';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PlatformTooltipRow, PLATFORMS } from '@/components/ui/platform-icon';

interface TimelineDataPoint {
  date: string;
  visibilityScore: number;
  mentionRate?: number;
  responseCount?: number;
  mentionCount?: number;
  /** Platform scores for tooltip breakdown (optional) */
  platformScores?: Record<string, number>;
}

interface ComparisonData {
  name: string;
  data: TimelineDataPoint[];
  color?: string;
  /** Raw mention count for display in tooltip */
  mentions?: number;
}

type ComparisonMode = 'none' | 'competitor' | 'period';

interface VisibilityTimelineProps {
  /** Timeline data points */
  data: TimelineDataPoint[];
  /** Chart height */
  height?: number;
  /** Show area fill under line */
  showArea?: boolean;
  /** Show time range selector */
  showTimeRangeSelector?: boolean;
  /** Current time range */
  timeRange?: TimeRange;
  /** Time range change handler */
  onTimeRangeChange?: (range: TimeRange) => void;
  /** Competitor data for comparison */
  competitorData?: ComparisonData[];
  /** Previous period data for comparison */
  previousPeriodData?: TimelineDataPoint[];
  /** Show comparison controls */
  showComparisonControls?: boolean;
  /** Default comparison mode */
  defaultComparisonMode?: ComparisonMode;
  /** Brand name for legend */
  brandName?: string;
  /** Additional classes */
  className?: string;
  /** Show empty state with placeholder chart instead of no data */
  isEmpty?: boolean;
  /** Show platform breakdown in tooltip with icons */
  showPlatformBreakdown?: boolean;
  /** Hide the built-in Recharts legend (use external legend instead) */
  hideLegend?: boolean;
  /** Hide the primary/aggregate line (useful when showing only competitor lines) */
  hidePrimaryLine?: boolean;
  /** Hide the point tooltip when an outer sample-preview tooltip is used */
  hideTooltip?: boolean;
}

/**
 * Generate placeholder data for empty state
 * Gentle wave pattern to show chart structure without suggesting real values
 */
function generatePlaceholderData(days: number = 7): TimelineDataPoint[] {
  const data: TimelineDataPoint[] = [];
  const today = new Date();

  // Gentle sine wave pattern centered around 50
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const waveValue = 50 + Math.sin((i / days) * Math.PI * 2) * 15;
    data.push({
      date: date.toISOString().split('T')[0],
      visibilityScore: Math.round(waveValue),
      mentionCount: 0,
    });
  }

  return data;
}

/**
 * Custom tooltip for empty state - clean placeholder design
 * Shows date + score on same line, then platform breakdown
 */
function EmptyTooltip({ active, payload }: {
  active?: boolean;
  payload?: any[];
}) {
  if (!active || !payload || !payload.length) return null;

  // Get the original date from the payload data
  const data = payload[0]?.payload;
  const dateStr = data?.date;
  if (!dateStr) return null;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-xl min-w-[200px] max-w-[220px]">
      {/* Date + Score header on same line */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground tracking-wide">
          {formatFullDate(dateStr)}
        </span>
        <span className="text-lg font-semibold text-muted-foreground/50 tabular-nums">--</span>
      </div>

      {/* Divider */}
      <div className="border-t border-border/50 mb-2" />

      {/* Platform breakdown - no header, just the list */}
      <div className="space-y-1.5">
        {PLATFORMS.map(platform => (
          <PlatformTooltipRow
            key={platform.id}
            platform={platform.id}
            value={null}
          />
        ))}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  // Parse ISO date string (YYYY-MM-DD) correctly by adding time component
  // This prevents timezone issues that can cause wrong year display
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatFullDate(dateStr: string): string {
  // Parse ISO date string (YYYY-MM-DD) correctly by adding time component
  // This prevents timezone issues that can cause wrong year display
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  comparisonMode: ComparisonMode;
  brandName?: string;
  /** Show platform breakdown with icons */
  showPlatformBreakdown?: boolean;
  /** Competitor data for looking up mentions */
  competitorData?: ComparisonData[];
}

function TrendIcon({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return null;
  const diff = current - previous;
  if (diff > 2) return <TrendingUp className="w-3 h-3 text-success inline ml-1" />;
  if (diff < -2) return <TrendingDown className="w-3 h-3 text-destructive inline ml-1" />;
  return <Minus className="w-3 h-3 text-muted-foreground inline ml-1" />;
}

function CustomTooltip({ active, payload, label, comparisonMode, brandName, showPlatformBreakdown, competitorData = [] }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const primaryData = payload.find(p => p.dataKey === 'visibilityScore');
  // Get data from primaryData or fallback to first payload item
  const data = (primaryData?.payload || payload[0]?.payload) as TimelineDataPoint & { previousScore?: number };

  if (!data) return null;

  // Calculate trend if we have previous score
  const hasTrend = comparisonMode === 'period' && data?.previousScore !== undefined;
  const trendValue = hasTrend ? (data?.visibilityScore ?? 0) - (data?.previousScore || 0) : 0;
  const trendIsPositive = trendValue > 0;
  const trendIsNegative = trendValue < 0;

  return (
    <div className="bg-popover border border-border rounded-xl p-3 shadow-xl min-w-[200px] max-w-[220px] isolate z-50">
      {/* Date + Aggregate Score on same line */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="text-xs font-medium text-muted-foreground tracking-wide">
          {formatFullDate(data.date)}
        </span>
        {data.visibilityScore !== undefined && (
          <div className="flex items-center gap-1">
            <span className="text-lg font-semibold tabular-nums">{Math.round(data.visibilityScore)}%</span>
            {hasTrend && (
              <TrendIcon current={data.visibilityScore} previous={data.previousScore} />
            )}
          </div>
        )}
      </div>

      {/* Platform breakdown with icons - show all 8 platforms */}
      {showPlatformBreakdown && (
        <>
          <div className="border-t border-border/50 mb-2" />
          <div className="space-y-1.5">
            {PLATFORMS.map(platform => (
              <PlatformTooltipRow
                key={platform.id}
                platform={platform.id}
                value={data.platformScores?.[platform.id] ?? null}
              />
            ))}
          </div>
        </>
      )}

      {/* Previous period comparison - only show if in period comparison mode */}
      {comparisonMode === 'period' && data.previousScore !== undefined && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-muted-foreground">Previous period</span>
            <span className="text-sm tabular-nums text-muted-foreground">{data.previousScore}%</span>
          </div>
          <div className={`text-xs font-medium ${
            trendIsPositive ? 'text-success' : trendIsNegative ? 'text-destructive' : 'text-muted-foreground'
          }`}>
            {trendIsPositive ? '+' : ''}{trendValue.toFixed(1)} pts vs previous
          </div>
        </div>
      )}

      {/* Competitor scores */}
      {comparisonMode === 'competitor' && (
        <>
          <div className="border-t border-border/50 mb-2" />
          <div className="space-y-1.5">
            {payload
              .filter(p => p.dataKey !== 'visibilityScore' && p.dataKey !== 'previousScore')
              .map((p, i) => {
                const compData = competitorData.find(c => c.name === p.name);
                // Get the daily mention count for this specific date, not aggregate
                const dailyDataPoint = compData?.data.find(d => d.date === data.date);
                const mentions = dailyDataPoint?.mentionCount ?? compData?.mentions ?? 0;
                return (
                  <div key={i} className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-sm text-muted-foreground truncate">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-sm font-medium tabular-nums">{Math.round(p.value)}%</span>
                      <span className="text-xs text-muted-foreground tabular-nums">({mentions})</span>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </>
      )}

      {/* Additional metrics */}
      {data.mentionRate !== undefined && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Mention Rate</span>
            <span className="text-sm font-medium tabular-nums">
              {(data.mentionRate * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function VisibilityTimeline({
  data,
  height = 300,
  showArea = true,
  showTimeRangeSelector = true,
  timeRange,
  onTimeRangeChange,
  competitorData = [],
  previousPeriodData,
  showComparisonControls = false,
  defaultComparisonMode = 'none',
  brandName = 'Brand',
  className,
  isEmpty = false,
  showPlatformBreakdown = false,
  hideLegend = false,
  hidePrimaryLine = false,
  hideTooltip = false,
}: VisibilityTimelineProps) {
  const { range, setRange } = useTimeRange('30d');
  const currentRange = timeRange || range;
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>(defaultComparisonMode);

  const handleRangeChange = (newRange: TimeRange) => {
    setRange(newRange);
    onTimeRangeChange?.(newRange);
  };

  // Use placeholder data for empty state
  const displayData = isEmpty ? generatePlaceholderData(7) : data;

  // Transform data for chart
  const chartData = displayData.map((d, i) => {
    const point: Record<string, any> = {
      ...d,
      displayDate: formatDate(d.date),
    };

    // Add previous period data if in period comparison mode
    if (comparisonMode === 'period' && previousPeriodData?.[i]) {
      point.previousScore = previousPeriodData[i].visibilityScore;
    }

    // Add competitor data
    if (comparisonMode === 'competitor') {
      for (const comp of competitorData) {
        const compPoint = comp.data.find(cd => cd.date === d.date);
        if (compPoint) {
          point[comp.name] = compPoint.visibilityScore;
        }
      }
    }

    return point;
  });

  const ChartComponent = showArea ? AreaChart : LineChart;
  const hasComparison = comparisonMode !== 'none';

  return (
    <div className={cn('w-full', className)}>
      {/* Controls row */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {/* Comparison mode toggle */}
        {showComparisonControls && (
          <div className="flex gap-1">
            <Button
              variant={comparisonMode === 'none' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setComparisonMode('none')}
            >
              Solo
            </Button>
            {competitorData.length > 0 && (
              <Button
                variant={comparisonMode === 'competitor' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setComparisonMode('competitor')}
              >
                vs Competitors
              </Button>
            )}
            {previousPeriodData && previousPeriodData.length > 0 && (
              <Button
                variant={comparisonMode === 'period' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setComparisonMode('period')}
              >
                vs Previous
              </Button>
            )}
          </div>
        )}

        {/* Time range selector */}
        {showTimeRangeSelector && (
          <TimeRangeSelector
            value={currentRange}
            onChange={handleRangeChange}
            variant="buttons"
            presets={['7d', '30d', '90d']}
          />
        )}
      </div>

      <div style={{ height }} className="touch-pan-y">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent
            data={chartData}
            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
          >
            <defs>
              {/* Primary gradient - vibrant fill visible at all zoom levels */}
              <linearGradient id="visibilityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--primary)"
                  stopOpacity={0.45}
                />
                <stop
                  offset="50%"
                  stopColor="var(--primary)"
                  stopOpacity={0.2}
                />
                <stop
                  offset="100%"
                  stopColor="var(--primary)"
                  stopOpacity={0.03}
                />
              </linearGradient>
              {/* Previous period gradient - subtle comparison */}
              <linearGradient id="previousGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--muted-foreground)"
                  stopOpacity={0.2}
                />
                <stop
                  offset="100%"
                  stopColor="var(--muted-foreground)"
                  stopOpacity={0}
                />
              </linearGradient>
              {/* Empty state gradient - subtle placeholder */}
              <linearGradient id="emptyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--muted-foreground)"
                  stopOpacity={0.08}
                />
                <stop
                  offset="100%"
                  stopColor="var(--muted-foreground)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              {...rechartsProps.cartesianGrid}
              strokeOpacity={isEmpty ? 0.6 : rechartsProps.cartesianGrid.strokeOpacity}
            />
            <XAxis
              dataKey="displayDate"
              {...rechartsProps.xAxis}
              padding={{ left: 40, right: 10 }}
              interval={Math.max(0, Math.floor(chartData.length / 7) - 1)}
              minTickGap={40}
            />
            <YAxis
              domain={[0, 100]}
              {...rechartsProps.yAxis}
              width={45}
              ticks={isEmpty ? [0, 25, 50, 75, 100] : undefined}
              interval={isEmpty ? 0 : undefined}
              tickFormatter={(value) => `${value}%`}
            />
            {!hideTooltip && <Tooltip
              content={
                isEmpty ? (
                  <EmptyTooltip />
                ) : (
                  <CustomTooltip
                    comparisonMode={comparisonMode}
                    brandName={brandName}
                    showPlatformBreakdown={showPlatformBreakdown}
                    competitorData={competitorData}
                  />
                )
              }
              cursor={{
                stroke: 'var(--border)',
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
              isAnimationActive={false}
              allowEscapeViewBox={{ x: false, y: false }}
              wrapperStyle={{
                zIndex: 1000,
                pointerEvents: 'none',
                visibility: 'visible',
              }}
              offset={15}
            />}

            {hasComparison && !hideLegend && (
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="circle"
                iconSize={8}
              />
            )}

            {/* Previous period line (render first so it's behind) */}
            {comparisonMode === 'period' && previousPeriodData && (
              showArea ? (
                <Area
                  type="monotone"
                  dataKey="previousScore"
                  name="Previous Period"
                  stroke="var(--muted-foreground)"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  fill="url(#previousGradient)"
                  animationDuration={1000}
                />
              ) : (
                <Line
                  type="monotone"
                  dataKey="previousScore"
                  name="Previous Period"
                  stroke="var(--muted-foreground)"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  animationDuration={1000}
                />
              )
            )}

            {/* Competitor lines */}
            {comparisonMode === 'competitor' && competitorData.map((comp, i) => (
              <Line
                key={comp.name}
                type="monotone"
                dataKey={comp.name}
                name={comp.name}
                stroke={comp.color || getSeriesColor(i + 1)}
                strokeWidth={isEmpty ? 1.5 : 2}
                strokeDasharray={isEmpty ? '5 5' : undefined}
                strokeOpacity={isEmpty ? 0.45 : 1}
                dot={false}
                animationDuration={1000}
              />
            ))}

            {/* Primary brand line/area (render last so it's on top) */}
            {!hidePrimaryLine && showArea && (
              <Area
                type="monotone"
                dataKey="visibilityScore"
                name={brandName}
                stroke={isEmpty ? '#D1D5DB' : 'var(--primary)'}
                strokeWidth={isEmpty ? 1.5 : 2}
                strokeDasharray={isEmpty ? '4 4' : undefined}
                fill={isEmpty ? 'none' : 'url(#visibilityGradient)'}
                animationDuration={800}
                animationEasing="ease-out"
                dot={false}
                activeDot={isEmpty ? false : {
                  r: 5,
                  fill: 'var(--primary)',
                  stroke: 'var(--background)',
                  strokeWidth: 2,
                }}
              />
            )}
            {!hidePrimaryLine && !showArea && (
              <Line
                type="monotone"
                dataKey="visibilityScore"
                name={brandName}
                stroke={isEmpty ? '#D1D5DB' : 'var(--primary)'}
                strokeWidth={isEmpty ? 1.5 : 2.5}
                strokeDasharray={isEmpty ? '4 4' : undefined}
                dot={false}
                activeDot={isEmpty ? false : {
                  r: 6,
                  fill: 'var(--primary)',
                  stroke: 'var(--background)',
                  strokeWidth: 3,
                }}
                animationDuration={800}
                animationEasing="ease-out"
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
