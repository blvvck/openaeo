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
  LabelList,
  ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';
import { rechartsProps, getSeriesColor } from './chart-theme';
import { TrendingUp, TrendingDown, Minus, Crown, Medal } from 'lucide-react';

interface CompetitorScore {
  name: string;
  score: number;
  isBrand?: boolean;
  previousScore?: number;
  mentionCount?: number;
}

interface CompetitorPositionChartProps {
  /** Brand and competitor scores */
  data: CompetitorScore[];
  /** Chart height */
  height?: number;
  /** Show rank numbers */
  showRank?: boolean;
  /** Highlight brand bar */
  highlightBrand?: boolean;
  /** Click handler */
  onBarClick?: (name: string) => void;
  /** Additional classes */
  className?: string;
  /** Show empty state with placeholder chart */
  isEmpty?: boolean;
}

/**
 * Default competitors for empty state
 */
const EMPTY_STATE_COMPETITORS: CompetitorScore[] = [
  { name: 'Your Brand', score: 0, isBrand: true },
  { name: 'Competitor 1', score: 0 },
  { name: 'Competitor 2', score: 0 },
  { name: 'Competitor 3', score: 0 },
];

/**
 * Empty state tooltip - Premium Stripe-inspired design
 */
function EmptyTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload as CompetitorScore & { rank: number };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08),0_2px_8px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)] min-w-[160px]">
      <p className="font-medium text-gray-900 dark:text-gray-100 text-[13px] mb-3">
        {data.name}
        {data.isBrand && (
          <span className="ml-2 text-[11px] text-teal-600 dark:text-teal-400 font-normal">(You)</span>
        )}
      </p>
      <div className="space-y-2">
        <div className="flex justify-between items-center gap-6">
          <span className="text-gray-400 dark:text-gray-500 text-xs font-light">Score</span>
          <span className="text-gray-300 dark:text-gray-600 text-sm">--</span>
        </div>
      </div>
      <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 font-light">
        No data yet
      </p>
    </div>
  );
}

function getTrendIcon(current: number, previous?: number) {
  if (previous === undefined) return null;
  const diff = current - previous;
  // Smaller, softer icons for premium feel
  if (diff > 2) return <TrendingUp className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />;
  if (diff < -2) return <TrendingDown className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />;
  return <Minus className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />;
}

function getRankIcon(rank: number) {
  // Smaller, softer icons for premium feel
  if (rank === 1) return <Crown className="w-3.5 h-3.5 text-amber-400" />;
  if (rank === 2) return <Medal className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />;
  if (rank === 3) return <Medal className="w-3.5 h-3.5 text-orange-400 dark:text-orange-500" />;
  return null;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

/**
 * Premium tooltip design - Stripe-inspired
 * - Soft layered shadow
 * - Generous padding
 * - Light font weights
 * - Subtle rank badges
 */
function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload as CompetitorScore & { rank: number };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08),0_2px_8px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)] min-w-[180px]">
      {/* Header with rank badge */}
      <div className="flex items-center gap-2 mb-3">
        {/* Subtle rank indicator */}
        <span className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium",
          data.rank === 1 && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
          data.rank === 2 && "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
          data.rank === 3 && "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
          data.rank > 3 && "bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500"
        )}>
          {data.rank}
        </span>
        <p className="font-medium text-gray-900 dark:text-gray-100 text-[13px]">
          {data.name}
          {data.isBrand && (
            <span className="ml-2 text-[11px] text-teal-600 dark:text-teal-400 font-normal">(You)</span>
          )}
        </p>
      </div>

      {/* Values with light weights */}
      <div className="space-y-2">
        <div className="flex justify-between items-center gap-6">
          <span className="text-gray-400 dark:text-gray-500 text-xs font-light">Score</span>
          <span className="text-gray-900 dark:text-gray-100 text-sm tabular-nums font-medium">{data.score}</span>
        </div>

        {data.previousScore !== undefined && (
          <div className="flex justify-between items-center gap-6">
            <span className="text-gray-400 dark:text-gray-500 text-xs font-light">Change</span>
            <div className="flex items-center gap-1">
              {getTrendIcon(data.score, data.previousScore)}
              <span className={cn(
                "text-sm tabular-nums",
                data.score > data.previousScore ? "text-emerald-600 dark:text-emerald-400" :
                data.score < data.previousScore ? "text-rose-600 dark:text-rose-400" :
                "text-gray-500"
              )}>
                {data.score > data.previousScore ? '+' : ''}
                {(data.score - data.previousScore).toFixed(1)}
              </span>
            </div>
          </div>
        )}

        {data.mentionCount !== undefined && (
          <div className="flex justify-between items-center gap-6">
            <span className="text-gray-400 dark:text-gray-500 text-xs font-light">Mentions</span>
            <span className="text-gray-900 dark:text-gray-100 text-sm tabular-nums">{data.mentionCount.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Subtle footer */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <span className="text-[10px] text-gray-300 dark:text-gray-600 font-light">
          Click for details
        </span>
      </div>
    </div>
  );
}

export function CompetitorPositionChart({
  data,
  height = 400,
  showRank = true,
  highlightBrand = true,
  onBarClick,
  className,
  isEmpty = false,
}: CompetitorPositionChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Use placeholder data for empty state
  const displayData = isEmpty ? EMPTY_STATE_COMPETITORS : data;

  // Sort by score descending and add rank
  const sortedData = (isEmpty
    ? displayData.map((item, index) => ({
        ...item,
        rank: index + 1,
        // Give empty bars a minimal height so they're visible
        score: 8,
      }))
    : [...displayData]
        .sort((a, b) => b.score - a.score)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
        }))
  );

  const handleClick = (data: any) => {
    if (onBarClick && data?.name) {
      onBarClick(data.name);
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

  /**
   * Get bar color - SOFTER, more premium palette
   * Brand gets subtle teal, competitors get sophisticated grays/colors
   */
  const getBarColor = (entry: typeof sortedData[0]) => {
    // Use muted color for empty state
    if (isEmpty) {
      return entry.isBrand ? '#A1A1AA' : '#E5E5E5';
    }
    if (highlightBrand && entry.isBrand) {
      return '#2DD4BF';  // Soft teal for brand
    }
    // Softer, more muted gradient based on score
    const normalizedScore = entry.score / 100;
    if (normalizedScore >= 0.7) return '#4ADE80';  // Soft green
    if (normalizedScore >= 0.4) return '#FBBF24';  // Soft amber
    return '#A1A1AA';  // Soft gray
  };

  return (
    <div className={cn('w-full overflow-hidden touch-pan-y', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 8, right: 48, left: 100, bottom: 8 }}
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

          {/* Tracking line on hover */}
          {activeIndex !== null && sortedData[activeIndex] && (
            <ReferenceLine
              y={sortedData[activeIndex].name}
              stroke="#D4D4D8"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}

          <XAxis
            type="number"
            domain={[0, 100]}
            {...rechartsProps.xAxis}
            tick={{ fontSize: 11, fill: '#A1A1AA', fontWeight: 300 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            {...rechartsProps.yAxis}
            width={95}
            axisLine={false}
            tickLine={false}
            tick={({ x, y, payload }) => {
              const item = sortedData.find((d) => d.name === payload.value);
              const isBrand = item?.isBrand;
              const isActive = activeIndex !== null && sortedData[activeIndex]?.name === payload.value;
              // Softer colors, light weights
              const textColor = isEmpty
                ? '#A1A1AA'
                : isBrand
                  ? '#0D9488'  // Teal for brand
                  : '#71717A';  // Muted for others
              return (
                <g transform={`translate(${x},${y})`}>
                  <text
                    x={-5}
                    y={0}
                    dy={4}
                    textAnchor="end"
                    fill={textColor}
                    fontSize={11}
                    fontWeight={isBrand && !isEmpty ? 500 : 400}  // Lighter weights
                    opacity={activeIndex === null || isActive ? 1 : 0.5}
                    style={{ transition: 'opacity 150ms ease' }}
                  >
                    {showRank && (
                      <tspan fill="#A1A1AA" fontWeight={300}>#{item?.rank} </tspan>
                    )}
                    {payload.value}
                  </text>
                </g>
              );
            }}
          />
          <Tooltip
            content={isEmpty ? <EmptyTooltip /> : <CustomTooltip />}
            cursor={false}
          />
          <Bar
            dataKey="score"
            radius={[0, 6, 6, 0]}
            onClick={isEmpty ? undefined : handleClick}
            cursor={onBarClick && !isEmpty ? 'pointer' : 'default'}
            animationDuration={400}
            animationEasing="ease-out"
          >
            {sortedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry)}
                fillOpacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                stroke={entry.isBrand && !isEmpty ? '#0D9488' : 'transparent'}
                strokeWidth={entry.isBrand && !isEmpty ? 1.5 : 0}
                style={{ transition: 'fill-opacity 150ms ease' }}
              />
            ))}
            <LabelList
              dataKey="score"
              position="right"
              fill="#A1A1AA"
              fontSize={11}
              fontWeight={400}
              formatter={(value: number) => value.toFixed(0)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Compact ranking list for sidebar/card display
 * Premium, refined styling - Stripe-inspired
 */
interface RankingListProps {
  data: CompetitorScore[];
  limit?: number;
  showScores?: boolean;
  className?: string;
}

export function RankingList({
  data,
  limit = 5,
  showScores = true,
  className,
}: RankingListProps) {
  const sortedData = [...data]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return (
    <div className={cn('space-y-1.5', className)}>
      {sortedData.map((item, index) => (
        <div
          key={item.name}
          className={cn(
            'flex items-center justify-between p-3 rounded-lg transition-colors duration-150',
            item.isBrand
              ? 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200/50 dark:border-teal-800/50'
              : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          <div className="flex items-center gap-3">
            {/* Subtle rank badge */}
            <span className={cn(
              "w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-medium",
              index === 0 && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
              index === 1 && "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
              index === 2 && "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
              index > 2 && "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
            )}>
              {index + 1}
            </span>
            <span
              className={cn(
                'text-sm',
                item.isBrand ? 'font-medium text-teal-700 dark:text-teal-300' : 'text-gray-700 dark:text-gray-300 font-normal'
              )}
            >
              {item.name}
            </span>
            {item.isBrand && (
              <span className="text-[10px] text-teal-500 dark:text-teal-400 font-light">(You)</span>
            )}
          </div>
          {showScores && (
            <div className="flex items-center gap-2">
              {getTrendIcon(item.score, item.previousScore)}
              <span className="text-sm tabular-nums text-gray-900 dark:text-gray-100">{item.score}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
