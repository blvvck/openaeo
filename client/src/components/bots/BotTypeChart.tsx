import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  chartColors,
  rechartsProps,
} from '@/components/charts/chart-theme';

type BotCategory = 'ai' | 'search' | 'social' | 'other';

interface BotTypeData {
  /** Bot category */
  category: BotCategory;
  /** Number of visits */
  count: number;
  /** Percentage of total */
  percentage?: number;
}

interface BotTypeChartProps {
  /** Bot type distribution data */
  data: BotTypeData[];
  /** Chart type */
  chartType?: 'pie' | 'bar';
  /** Chart height */
  height?: number;
  /** Card title */
  title?: string;
  /** Show legend */
  showLegend?: boolean;
  /** Additional classes */
  className?: string;
}

const CATEGORY_COLORS: Record<BotCategory, string> = {
  ai: '#10B981',      // Green for AI bots
  search: '#3B82F6',  // Blue for search bots
  social: '#8B5CF6',  // Purple for social bots
  other: chartColors.muted, // Gray for other
};

const CATEGORY_LABELS: Record<BotCategory, string> = {
  ai: 'AI Bots',
  search: 'Search Bots',
  social: 'Social Bots',
  other: 'Other',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: BotTypeData & { name: string };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const percentage = data.percentage ?? 0;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="font-medium text-foreground">{data.name}</p>
      <div className="space-y-1 mt-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Visits:</span>
          <span className="font-medium">{data.count.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Share:</span>
          <span className="font-medium">{percentage.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

/**
 * BotTypeChart - Distribution of bot visits by type
 *
 * Features:
 * - Pie or bar chart options
 * - Category-based coloring
 * - Custom tooltip with counts and percentages
 * - Uses design system chart theme
 */
export function BotTypeChart({
  data,
  chartType = 'pie',
  height = 300,
  title = 'Bot Distribution',
  showLegend = true,
  className,
}: BotTypeChartProps) {
  // Calculate totals and percentages
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const chartData = data.map((d) => ({
    ...d,
    name: CATEGORY_LABELS[d.category],
    percentage: total > 0 ? (d.count / total) * 100 : 0,
    color: CATEGORY_COLORS[d.category],
  }));

  // Sort by count descending
  chartData.sort((a, b) => b.count - a.count);

  if (chartType === 'bar') {
    return (
      <Card className={cn('', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <XAxis type="number" {...rechartsProps.xAxis} />
                <YAxis
                  type="category"
                  dataKey="name"
                  {...rechartsProps.yAxis}
                  width={75}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              {showLegend && (
                <Legend
                  {...rechartsProps.legend}
                  formatter={(value) => (
                    <span className="text-sm text-foreground">{value}</span>
                  )}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Center label for pie chart */}
        {chartType === 'pie' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold">{total.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Visits</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Simple donut chart for compact display
 */
export function CompactBotTypeChart({
  data,
  size = 80,
  className,
}: {
  data: BotTypeData[];
  size?: number;
  className?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const chartData = data.map((d) => ({
    ...d,
    name: CATEGORY_LABELS[d.category],
    color: CATEGORY_COLORS[d.category],
  }));

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={size * 0.35}
            outerRadius={size * 0.48}
            paddingAngle={2}
            strokeWidth={0}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold">{total}</span>
      </div>
    </div>
  );
}

/**
 * Legend component for use outside the chart
 */
export function BotTypeLegend({
  data,
  className,
}: {
  data: BotTypeData[];
  className?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className={cn('space-y-2', className)}>
      {data.map((item) => {
        const percentage = total > 0 ? (item.count / total) * 100 : 0;
        return (
          <div key={item.category} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
            />
            <span className="text-sm flex-1">{CATEGORY_LABELS[item.category]}</span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {percentage.toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
