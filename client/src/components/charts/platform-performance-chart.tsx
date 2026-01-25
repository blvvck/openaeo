import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';
import { platformColors, rechartsProps, getSeriesColor, chartColors } from './chart-theme';
import { PlatformIcon } from '@/components/ui/platform-icon';

interface RecentMention {
  text: string;
  date: string;
}

interface PlatformData {
  platform: string;
  visibilityScore: number;
  mentionCount?: number;
  positionScore?: number;
  sentimentScore?: number;
  /** Recent mentions for enhanced tooltip (future API) */
  recentMentions?: RecentMention[];
}

interface PlatformPerformanceChartProps {
  /** Platform visibility data */
  data: PlatformData[];
  /** Chart height */
  height?: number;
  /** Show horizontal bars instead of vertical */
  horizontal?: boolean;
  /** Additional classes */
  className?: string;
  /** Click handler for bars */
  onBarClick?: (platform: string) => void;
  /** Show empty state with placeholder chart */
  isEmpty?: boolean;
}

/**
 * Default platforms for empty state
 * Shows chart structure with realistic placeholder bar heights
 * Values represent "what data could look like" - varied to show chart shape
 */
const EMPTY_STATE_PLATFORMS: PlatformData[] = [
  { platform: 'chatgpt', visibilityScore: 78 },
  { platform: 'claude', visibilityScore: 65 },
  { platform: 'perplexity', visibilityScore: 52 },
  { platform: 'gemini', visibilityScore: 41 },
];

/**
 * Platform-specific empty state tint colors
 * Subtle, muted versions of brand colors for premium empty state appearance
 */
const EMPTY_STATE_PLATFORM_TINTS: Record<string, string> = {
  chatgpt: '#D1FAE5',    // Very light emerald tint
  claude: '#FEF3C7',     // Very light amber tint
  perplexity: '#E0E7FF', // Very light indigo tint
  gemini: '#DBEAFE',     // Very light blue tint
  grok: '#E5E5E5',       // Neutral gray
  deepseek: '#DBEAFE',   // Very light blue tint
};

/**
 * Empty state tooltip - compact design
 * Icon + name + "--" all inline, single message below
 */
function EmptyTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload as PlatformData;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2.5 shadow-lg min-w-[180px]">
      {/* Header: icon + name + score inline */}
      <div className="flex items-center gap-2 mb-2">
        <PlatformIcon platform={data.platform} size="xs" />
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {getPlatformLabel(data.platform)}
        </span>
        <span className="text-sm text-gray-300 dark:text-gray-600 ml-auto tabular-nums">
          --
        </span>
      </div>
      {/* Simple message */}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Your LLM mentions will appear here
      </p>
    </div>
  );
}

const PLATFORM_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  grok: 'Grok',
  deepseek: 'DeepSeek',
};

function getPlatformLabel(platform: string): string {
  return PLATFORM_LABELS[platform.toLowerCase()] || platform;
}

function getPlatformColor(platform: string): string {
  return platformColors[platform.toLowerCase()] || getSeriesColor(0);
}

function getEmptyStatePlatformTint(platform: string): string {
  return EMPTY_STATE_PLATFORM_TINTS[platform.toLowerCase()] || '#E5E5E5';
}

/**
 * Format relative date for recent mentions
 */
function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

/**
 * Premium tooltip design - Stripe-inspired
 * Softer shadows, generous padding, subtle borders
 * Shows platform logo prominently + key metrics + recent mentions preview
 */
function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload as PlatformData;
  const platformColor = getPlatformColor(data.platform);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100/80 dark:border-gray-800/80 rounded-2xl p-5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.06),0_4px_16px_-4px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] min-w-[260px] max-w-[320px] backdrop-blur-sm">
      {/* Header with large platform icon */}
      <div className="flex items-center gap-4 mb-4">
        <div
          className="p-2.5 rounded-xl"
          style={{ backgroundColor: `${platformColor}15` }}
        >
          <PlatformIcon platform={data.platform} size="lg" showBackground={false} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-900 dark:text-gray-100 text-base tracking-tight">
            {getPlatformLabel(data.platform)}
          </p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100 tabular-nums tracking-tight">
              {data.visibilityScore}
            </p>
            <span className="text-lg text-gray-400 dark:text-gray-500 font-normal">%</span>
          </div>
        </div>
      </div>

      {/* Metrics section with improved visual hierarchy */}
      <div className="space-y-2.5 pt-4 border-t border-gray-100/80 dark:border-gray-800/60">
        {data.mentionCount !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 text-sm font-light">Total mentions</span>
            <span className="text-gray-900 dark:text-gray-100 text-sm font-medium tabular-nums">
              {data.mentionCount.toLocaleString()}
            </span>
          </div>
        )}
        {data.sentimentScore !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 text-sm font-light">Avg. sentiment</span>
            <span className={cn(
              "text-sm font-medium tabular-nums px-2 py-0.5 rounded-md",
              data.sentimentScore > 0
                ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30"
                : data.sentimentScore < 0
                  ? "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30"
                  : "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50"
            )}>
              {data.sentimentScore > 0 ? '+' : ''}
              {data.sentimentScore.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Recent mentions preview - shows when available (future API) */}
      {data.recentMentions && data.recentMentions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100/80 dark:border-gray-800/60">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
            Recent mentions
          </p>
          <div className="space-y-2">
            {data.recentMentions.slice(0, 3).map((mention, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div
                  className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: platformColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                    {mention.text}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {formatRelativeDate(mention.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Placeholder for recent mentions when not available */}
      {(!data.recentMentions || data.recentMentions.length === 0) && (
        <div className="mt-4 pt-4 border-t border-gray-100/80 dark:border-gray-800/60">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
            Recent mentions
          </p>
          <p className="text-xs text-gray-300 dark:text-gray-600 italic">
            Coming soon...
          </p>
        </div>
      )}

      {/* Footer hint - more subtle */}
      <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-800/40">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-light text-center">
          Click bar to explore mentions
        </p>
      </div>
    </div>
  );
}

export function PlatformPerformanceChart({
  data,
  height = 300,
  horizontal = false,
  className,
  onBarClick,
  isEmpty = false,
}: PlatformPerformanceChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Use placeholder data for empty state
  const displayData = isEmpty ? EMPTY_STATE_PLATFORMS : data;

  // Sort by visibility score descending (for real data) or keep platform order (for empty)
  const sortedData = isEmpty
    ? displayData
    : [...displayData].sort((a, b) => b.visibilityScore - a.visibilityScore);

  // Transform data for chart with SOFTER colors
  // Empty state uses subtle platform-specific tints instead of uniform gray
  const chartData = sortedData.map((d) => ({
    ...d,
    name: getPlatformLabel(d.platform),
    // Use subtle platform-specific tints for empty state (premium feel)
    color: isEmpty ? getEmptyStatePlatformTint(d.platform) : getPlatformColor(d.platform),
    // Keep actual visibility scores (placeholder data already has realistic values)
  }));

  const handleClick = (data: any) => {
    if (onBarClick && data?.platform) {
      onBarClick(data.platform);
    }
  };

  // Track mouse position for hover effects
  const handleMouseMove = (state: any) => {
    if (state?.activeTooltipIndex !== undefined) {
      setActiveIndex(state.activeTooltipIndex);
    }
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
  };

  if (horizontal) {
    // Custom tick component with platform icon + name, left-aligned with card title
    const CustomYAxisTick = (props: any) => {
      const { x, y, payload } = props;
      // Find the platform ID from the display name
      const platformEntry = chartData.find(d => d.name === payload.value);
      const platformId = platformEntry?.platform || payload.value.toLowerCase();

      return (
        <foreignObject x={0} y={y - 12} width={100} height={24}>
          <div className="flex items-center gap-2">
            <PlatformIcon platform={platformId} size="xs" showBackground={true} />
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {payload.value}
            </span>
          </div>
        </foreignObject>
      );
    };

    return (
      <div className={cn('w-full overflow-hidden touch-pan-y', className)} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 4, bottom: 8 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Ultra-subtle grid - Stripe style */}
            <CartesianGrid
              {...rechartsProps.cartesianGrid}
              horizontal={true}
              vertical={false}
              stroke="#E5E5E5"
              strokeDasharray="2 2"
              strokeOpacity={0.5}
            />

            {/* Tracking line on hover - dashed vertical line */}
            {activeIndex !== null && chartData[activeIndex] && (
              <ReferenceLine
                y={chartData[activeIndex].name}
                stroke="#D4D4D8"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
            )}

            <XAxis
              type="number"
              domain={[0, 100]}
              {...rechartsProps.xAxis}
              tick={false}
              axisLine={false}
              tickLine={false}
              hide={true}
            />
            <YAxis
              type="category"
              dataKey="name"
              {...rechartsProps.yAxis}
              width={100}
              tick={<CustomYAxisTick />}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={isEmpty ? <EmptyTooltip /> : <CustomTooltip />}
              cursor={false}
            />
            <Bar
              dataKey="visibilityScore"
              radius={[0, 6, 6, 0]}
              onClick={isEmpty ? undefined : handleClick}
              cursor={onBarClick && !isEmpty ? 'pointer' : 'default'}
              animationDuration={400}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  fillOpacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                  style={{ transition: 'fill-opacity 150ms ease' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className={cn('w-full overflow-hidden touch-pan-y', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 8, bottom: 32 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Ultra-subtle grid - Stripe style */}
          <CartesianGrid
            {...rechartsProps.cartesianGrid}
            stroke="#E5E5E5"
            strokeDasharray="2 2"
            strokeOpacity={0.5}
            vertical={false}
          />

          {/* Tracking line on hover - dashed vertical line */}
          {activeIndex !== null && chartData[activeIndex] && (
            <ReferenceLine
              x={chartData[activeIndex].name}
              stroke="#D4D4D8"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}

          <XAxis
            dataKey="name"
            {...rechartsProps.xAxis}
            angle={-45}
            textAnchor="end"
            height={60}
            tick={{ fontSize: 11, fill: '#71717A', fontWeight: 400 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            {...rechartsProps.yAxis}
            tick={{ fontSize: 11, fill: '#A1A1AA', fontWeight: 300 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={isEmpty ? <EmptyTooltip /> : <CustomTooltip />}
            cursor={false}
          />
          <Bar
            dataKey="visibilityScore"
            radius={[6, 6, 0, 0]}
            onClick={isEmpty ? undefined : handleClick}
            cursor={onBarClick && !isEmpty ? 'pointer' : 'default'}
            animationDuration={400}
            animationEasing="ease-out"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                fillOpacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                style={{ transition: 'fill-opacity 150ms ease' }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
