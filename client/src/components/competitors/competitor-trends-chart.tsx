/**
 * Competitor Trends Chart
 *
 * Multi-metric trend visualization for competitor performance over time.
 * Tabs: Visibility | Citations | Position
 *
 * Layout matches by-platform-tab.tsx: chart on left, vertical legend on right.
 */

import { useState, useMemo, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { rechartsProps, getSeriesColor } from '@/components/charts/chart-theme';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tab-set';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { CardEmptyState } from '@/components/shared/empty-state';
import { Search } from 'lucide-react';
import type { TimeRangePreset } from '@shared/types';

// =============================================================================
// Metric Tabs (for card header)
// =============================================================================

interface TrendMetricTabsProps {
  value: TrendMetric;
  onChange: (metric: TrendMetric) => void;
}

export function TrendMetricTabs({ value, onChange }: TrendMetricTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as TrendMetric)}>
      <TabsList className="inline-flex items-center gap-1 bg-figma-hover rounded-lg p-1 h-auto">
        <TabsTrigger
          value="visibility"
          className="px-3 py-1.5 text-figma-xs font-medium rounded-md data-[state=active]:bg-white data-[state=active]:text-figma-primary data-[state=active]:shadow-sm text-figma-secondary hover:text-figma-primary transition-colors"
        >
          Visibility
        </TabsTrigger>
        <TabsTrigger
          value="citations"
          className="px-3 py-1.5 text-figma-xs font-medium rounded-md data-[state=active]:bg-white data-[state=active]:text-figma-primary data-[state=active]:shadow-sm text-figma-secondary hover:text-figma-primary transition-colors"
        >
          Citations
        </TabsTrigger>
        <TabsTrigger
          value="position"
          className="px-3 py-1.5 text-figma-xs font-medium rounded-md data-[state=active]:bg-white data-[state=active]:text-figma-primary data-[state=active]:shadow-sm text-figma-secondary hover:text-figma-primary transition-colors"
        >
          Position
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

// =============================================================================
// Types
// =============================================================================

export type TrendMetric = 'visibility' | 'citations' | 'position';

export interface CompetitorTrendPoint {
  date: string;
  competitorId: string;
  competitorName: string;
  isYou?: boolean;
  visibility: number;      // 0-100 score
  citations: number;       // count or percentage
  position: number;        // rank (1 = best)
}

export interface CompetitorTrendsData {
  /** All data points grouped by date */
  points: CompetitorTrendPoint[];
  /** Unique competitors in the data */
  competitors: Array<{
    id: string;
    name: string;
    isYou?: boolean;
    color?: string;
  }>;
}

interface CompetitorTrendsChartProps {
  data: CompetitorTrendsData;
  height?: number;
  className?: string;
  /** Current metric (controlled) */
  metric?: TrendMetric;
  /** Metric change handler (controlled) */
  onMetricChange?: (metric: TrendMetric) => void;
  /** Initial metric to show (uncontrolled) */
  defaultMetric?: TrendMetric;
  /** Brand name for "You" label */
  brandName?: string;
  /** Show empty state placeholder */
  isEmpty?: boolean;
  noDataForRange?: boolean;
  onAdjustDateRange?: () => void;
  /** Time range for proper x-axis intervals */
  timeRange?: TimeRangePreset;
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatMetricValue(value: number, metric: TrendMetric, isEmpty?: boolean): string {
  switch (metric) {
    case 'visibility': return isEmpty ? '—' : `${Math.round(value)}%`;
    case 'citations': return isEmpty ? '—' : `${Math.round(value)}`;
    // Position is meaningless in empty state (always #1 with no competitors)
    case 'position': return isEmpty ? '—' : `#${Math.round(value)}`;
  }
}

function getTimeRangeDays(timeRange?: TimeRangePreset): number {
  switch (timeRange) {
    case '1d': return 1;
    case '3d': return 3;
    case '7d': return 7;
    case '14d': return 14;
    case '30d': return 30;
    case '60d': return 60;
    case '90d': return 90;
    case '365d': return 365;
    case 'all': return 90;
    default: return 7;
  }
}

function generatePlaceholderData(brandName: string = 'Your Brand', timeRange?: TimeRangePreset): CompetitorTrendsData {
  const points: CompetitorTrendPoint[] = [];
  const today = new Date();
  const competitors = [
    { id: 'you', name: brandName, isYou: true },
    { id: 'comp1', name: 'Competitor 1' },
    { id: 'comp2', name: 'Competitor 2' },
  ];

  const numDays = getTimeRangeDays(timeRange);

  for (let i = numDays - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    competitors.forEach((comp, idx) => {
      const trend = Math.sin((i + idx) / 3 * Math.PI);
      points.push({
        date: dateStr,
        competitorId: comp.id,
        competitorName: comp.name,
        isYou: comp.isYou,
        visibility: 50 + trend * 15,
        citations: 20 + trend * 5,
        position: 3 - trend * 0.6,
      });
    });
  }

  return { points, competitors };
}

// =============================================================================
// Custom Tooltip
// =============================================================================

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  metric: TrendMetric;
  competitors: CompetitorTrendsData['competitors'];
  brandName: string;
  isEmpty?: boolean;
}

function CustomTooltip({ active, payload, label, metric, competitors, brandName, isEmpty }: TooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  const dateStr = data?.date;

  return (
    <div className="bg-figma-card border border-figma-border rounded-xl p-3 shadow-xl min-w-[180px]">
      <div className="text-figma-2xs font-medium text-figma-secondary tracking-wide mb-2">
        {formatFullDate(dateStr)}
      </div>
      <div className="border-t border-figma-border-light mb-2" />
      <div className="space-y-1.5">
        {payload.map((entry: any, idx: number) => {
          const comp = competitors.find(c => c.name === entry.name);
          const value = entry.value;
          const formattedValue = formatMetricValue(value, metric, isEmpty);
          // Use brandName prop for "You" entries to ensure consistency
          const displayName = comp?.isYou ? `${brandName} (You)` : entry.name;

          return (
            <div key={idx} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className={cn(
                  "text-figma-sm truncate",
                  comp?.isYou ? "font-semibold text-figma-primary" : "text-figma-secondary"
                )}>
                  {displayName}
                </span>
              </div>
              <span className="text-figma-sm font-medium text-figma-primary tabular-nums shrink-0">
                {formattedValue}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function CompetitorTrendsChart({
  data,
  height = 280,
  className,
  metric: controlledMetric,
  onMetricChange,
  defaultMetric = 'visibility',
  brandName = 'Your Brand',
  isEmpty = false,
  noDataForRange = false,
  onAdjustDateRange,
  timeRange,
}: CompetitorTrendsChartProps) {
  const [internalMetric, setInternalMetric] = useState<TrendMetric>(defaultMetric);
  const [activeCompetitors, setActiveCompetitors] = useState<string[]>([]);

  // Support both controlled and uncontrolled modes
  const metric = controlledMetric ?? internalMetric;

  const displayData = isEmpty ? generatePlaceholderData(brandName, timeRange) : data;
  const { points, competitors } = displayData;

  // Sync active competitors when competitors list changes
  useEffect(() => {
    if (competitors.length > 0) {
      setActiveCompetitors(competitors.map(c => c.id));
    }
  }, [competitors.map(c => c.id).join(',')]);

  const toggleCompetitor = (id: string) => {
    setActiveCompetitors((prev) =>
      prev.includes(id)
        ? prev.filter((c) => c !== id)
        : [...prev, id]
    );
  };

  // Transform data for Recharts
  const chartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, any>>();

    points.forEach(point => {
      if (!dateMap.has(point.date)) {
        dateMap.set(point.date, {
          date: point.date,
          displayDate: formatDate(point.date),
        });
      }
      const entry = dateMap.get(point.date)!;
      entry[point.competitorName] = point[metric];
    });

    return Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [points, metric]);

  // Get current metric values for legend display
  const currentValues = useMemo(() => {
    const latest = chartData[chartData.length - 1] || {};
    return competitors.map(comp => ({
      ...comp,
      value: latest[comp.name] ?? 0,
      color: comp.color || (comp.isYou ? 'var(--primary)' : getSeriesColor(competitors.indexOf(comp))),
    }));
  }, [chartData, competitors]);

  // Y-axis domain
  const yDomain = useMemo(() => {
    if (metric === 'visibility') return [0, 100];
    if (metric === 'position') {
      const maxRank = Math.max(...points.map(p => p.position), 5);
      return [1, maxRank];
    }
    const maxCitations = Math.max(...points.map(p => p.citations), 10);
    return [0, isEmpty ? 30 : Math.ceil(maxCitations * 1.1)];
  }, [points, metric, isEmpty]);

  const yTicks = isEmpty
    ? metric === 'visibility'
      ? [0, 25, 50, 75, 100]
      : metric === 'citations'
        ? [0, 10, 20, 30]
        : [1, 2, 3, 4, 5]
    : undefined;

  const isPositionMetric = metric === 'position';

  if (noDataForRange) {
    return (
      <CardEmptyState
        icon={Search}
        title="No trend data for this period"
        description="Change the date range to look for earlier competitor results."
        action={onAdjustDateRange ? { label: 'Adjust date filter', onClick: onAdjustDateRange } : undefined}
        className="min-h-[280px]"
      />
    );
  }

  const chart = (
    <div className="flex gap-4">
      {/* Chart area */}
      <div className="flex-1 min-w-0" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              {...rechartsProps.cartesianGrid}
              strokeOpacity={isEmpty ? 0.6 : rechartsProps.cartesianGrid.strokeOpacity}
            />
            <XAxis
              dataKey="displayDate"
              {...rechartsProps.xAxis}
              padding={{ left: 40, right: 10 }}
              interval={chartData.length <= 7 ? 0 : Math.max(0, Math.floor(chartData.length / 7) - 1)}
              minTickGap={40}
            />
            <YAxis
              domain={yDomain}
              reversed={isPositionMetric}
              {...rechartsProps.yAxis}
              width={45}
              ticks={yTicks}
              interval={0}
              tickFormatter={(value) => {
                if (metric === 'visibility') return `${value}%`;
                if (metric === 'position') return `#${value}`;
                return String(value);
              }}
            />
            {!isEmpty && (
              <Tooltip
                content={(
                  <CustomTooltip
                    metric={metric}
                    competitors={competitors}
                    brandName={brandName}
                  />
                )}
                cursor={{
                  stroke: 'var(--figma-border)',
                  strokeWidth: 1,
                  strokeDasharray: '4 4',
                }}
                isAnimationActive={false}
              />
            )}

            {currentValues
              .filter(comp => activeCompetitors.includes(comp.id))
              .map((comp) => (
                <Line
                  key={comp.id}
                  type="monotone"
                  dataKey={comp.name}
                  name={comp.name}
                  stroke={comp.color}
                  strokeWidth={comp.isYou ? 2.5 : 2}
                  strokeDasharray={isEmpty ? '4 4' : undefined}
                  strokeOpacity={isEmpty ? 0.5 : 1}
                  dot={false}
                  activeDot={isEmpty ? false : {
                    r: comp.isYou ? 5 : 4,
                    fill: comp.color,
                    stroke: 'var(--background)',
                    strokeWidth: 2,
                  }}
                  animationDuration={800}
                  animationEasing="ease-out"
                  isAnimationActive={false}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="w-[160px] shrink-0 border-l border-figma-border-light pl-4">
        <div className="flex flex-col gap-1.5">
          {currentValues.map((comp) => {
            const isActive = activeCompetitors.includes(comp.id);
            const displayValue = formatMetricValue(comp.value, metric, isEmpty);

            return (
              <button
                key={comp.id}
                onClick={() => toggleCompetitor(comp.id)}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-md text-figma-xs font-medium transition-colors w-full text-left',
                  isActive
                    ? 'bg-figma-hover text-figma-primary'
                    : 'text-figma-muted hover:bg-figma-hover/50'
                )}
              >
                <div
                  className={cn(
                    'w-2.5 h-2.5 rounded-full shrink-0',
                    !isActive && 'opacity-40'
                  )}
                  style={{ backgroundColor: comp.color }}
                />
                <span className="truncate flex-1 min-w-0" title={comp.isYou ? `${brandName} (You)` : comp.name}>
                  {comp.isYou ? `${brandName} (You)` : comp.name}
                </span>
                <span className={cn(
                  'shrink-0 text-figma-2xs tabular-nums',
                  isActive ? 'text-figma-secondary' : 'text-figma-muted'
                )}>
                  {displayValue}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (isEmpty) {
    return (
      <SimpleTooltip
        side="top"
        maxWidth="lg"
        content="Trend lines and metric values will appear after your brand and at least one competitor have analysis results in the selected date range."
      >
        <div
          role="group"
          tabIndex={0}
          aria-label="Sample competitor trend chart. Focus or hover for details."
          className={cn('w-full cursor-help rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-figma-blue', className)}
        >
          {chart}
        </div>
      </SimpleTooltip>
    );
  }

  return (
    <div className={cn('w-full', className)}>{chart}</div>
  );
}

export default CompetitorTrendsChart;
