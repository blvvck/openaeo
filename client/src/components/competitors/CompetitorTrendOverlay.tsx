import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/check-control';
import { Label } from '@/components/ui/field-label';
import { ScrollArea } from '@/components/ui/scroll-container';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/option-picker';
import { rechartsProps, getSeriesColor } from '@/components/charts/chart-theme';
import {
  type CompetitorWithTrend,
  type TimeRangeOption,
  type MetricType,
  TIME_RANGE_INFO,
  METRIC_INFO,
} from './types';

interface CompetitorTrendOverlayProps {
  /** Competitors with trend data */
  competitors: CompetitorWithTrend[];
  /** Name of your brand (to highlight) */
  ownBrandName?: string;
  /** Chart height */
  height?: number;
  /** Default time range */
  defaultTimeRange?: TimeRangeOption;
  /** Time range change handler */
  onTimeRangeChange?: (range: TimeRangeOption) => void;
  /** Metric to display */
  metric?: MetricType;
  /** Metric change handler */
  onMetricChange?: (metric: MetricType) => void;
  /** Additional classes */
  className?: string;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Custom tooltip for multi-line chart
 */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[160px]">
      <p className="font-medium text-foreground mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.name} className="flex justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
            <span className="font-medium">{entry.value.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * CompetitorTrendOverlay - Multi-line chart comparing competitors over time
 *
 * Features:
 * - Multi-line Recharts chart
 * - Toggle competitors on/off
 * - Legend with colors
 * - Time range selector
 * - Metric selector
 */
export function CompetitorTrendOverlay({
  competitors,
  ownBrandName,
  height = 350,
  defaultTimeRange = '30d',
  onTimeRangeChange,
  metric = 'visibility',
  onMetricChange,
  className,
}: CompetitorTrendOverlayProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>(defaultTimeRange);
  const [selectedCompetitors, setSelectedCompetitors] = useState<Set<number>>(
    new Set(competitors.map((c) => c.id))
  );

  const handleTimeRangeChange = (range: TimeRangeOption) => {
    setTimeRange(range);
    onTimeRangeChange?.(range);
  };

  const toggleCompetitor = (id: number) => {
    const newSelected = new Set(selectedCompetitors);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCompetitors(newSelected);
  };

  const selectAll = () => {
    setSelectedCompetitors(new Set(competitors.map((c) => c.id)));
  };

  const selectNone = () => {
    setSelectedCompetitors(new Set());
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    const activeCompetitors = competitors.filter((c) =>
      selectedCompetitors.has(c.id)
    );

    if (activeCompetitors.length === 0) return [];

    // Get all unique dates
    const allDates = new Set<string>();
    for (const comp of activeCompetitors) {
      for (const point of comp.trendData) {
        allDates.add(point.date);
      }
    }

    // Build data points
    const sortedDates = Array.from(allDates).sort();
    return sortedDates.map((date) => {
      const point: Record<string, string | number> = {
        date,
        displayDate: formatDate(date),
      };
      for (const comp of activeCompetitors) {
        const dataPoint = comp.trendData.find((d) => d.date === date);
        if (dataPoint) {
          point[comp.name] = dataPoint.value;
        }
      }
      return point;
    });
  }, [competitors, selectedCompetitors]);

  // Assign colors to competitors
  const competitorColors = useMemo(() => {
    const colors: Record<number, string> = {};
    competitors.forEach((comp, index) => {
      colors[comp.id] =
        comp.color ||
        (comp.name.toLowerCase() === ownBrandName?.toLowerCase()
          ? 'hsl(var(--primary))'
          : getSeriesColor(index));
    });
    return colors;
  }, [competitors, ownBrandName]);

  const metricInfo = METRIC_INFO[metric];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Metric selector */}
        <Select value={metric} onValueChange={(v) => onMetricChange?.(v as MetricType)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(METRIC_INFO).map(([key, info]) => (
              <SelectItem key={key} value={key}>
                {info.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Time range selector */}
        <div className="flex gap-1">
          {(Object.keys(TIME_RANGE_INFO) as TimeRangeOption[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleTimeRangeChange(range)}
            >
              {TIME_RANGE_INFO[range].label}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid {...rechartsProps.cartesianGrid} />
              <XAxis
                dataKey="displayDate"
                {...rechartsProps.xAxis}
                interval="preserveStartEnd"
              />
              <YAxis
                {...rechartsProps.yAxis}
                domain={metricInfo.higherIsBetter ? [0, 'auto'] : ['auto', 0]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="circle"
                iconSize={8}
              />

              {competitors
                .filter((c) => selectedCompetitors.has(c.id))
                .map((comp) => (
                  <Line
                    key={comp.id}
                    type="monotone"
                    dataKey={comp.name}
                    name={comp.name}
                    stroke={competitorColors[comp.id]}
                    strokeWidth={
                      comp.name.toLowerCase() === ownBrandName?.toLowerCase()
                        ? 3
                        : 2
                    }
                    dot={false}
                    animationDuration={1000}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select competitors to compare
          </div>
        )}
      </div>

      {/* Legend / Toggle */}
      <div className="border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Competitors</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              All
            </Button>
            <Button variant="ghost" size="sm" onClick={selectNone}>
              None
            </Button>
          </div>
        </div>
        <ScrollArea className="max-h-32">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {competitors.map((comp) => {
              const isOwn =
                ownBrandName &&
                comp.name.toLowerCase() === ownBrandName.toLowerCase();
              return (
                <div
                  key={comp.id}
                  className="flex items-center gap-2"
                >
                  <Checkbox
                    id={`competitor-${comp.id}`}
                    checked={selectedCompetitors.has(comp.id)}
                    onCheckedChange={() => toggleCompetitor(comp.id)}
                  />
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: competitorColors[comp.id] }}
                  />
                  <Label
                    htmlFor={`competitor-${comp.id}`}
                    className={cn(
                      'text-sm cursor-pointer truncate',
                      isOwn && 'font-medium'
                    )}
                  >
                    {comp.name}
                    {isOwn && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (You)
                      </span>
                    )}
                  </Label>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
