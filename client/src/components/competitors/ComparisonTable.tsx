import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/data-grid';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  type Competitor,
  type CompetitorSortField,
  type CompetitorTrendPoint,
  type TrendDirection,
} from './types';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface ComparisonTableProps {
  /** Competitor data */
  competitors: Competitor[];
  /** Name of your brand (to highlight) */
  ownBrandName?: string;
  /** Trend data for sparklines */
  trendData?: Record<number, CompetitorTrendPoint[]>;
  /** Click handler for competitor row */
  onSelectCompetitor?: (competitor: Competitor) => void;
  /** Additional classes */
  className?: string;
}

type SortOrder = 'asc' | 'desc';

/**
 * Get trend icon and color
 */
function getTrendDisplay(direction: TrendDirection, value?: number) {
  const config = {
    up: { icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
    down: { icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/10' },
    stable: { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted' },
  }[direction];

  return {
    ...config,
    formattedValue: value !== undefined
      ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
      : null,
  };
}

/**
 * Mini sparkline for trend visualization
 */
function TrendSparkline({
  data,
  color = 'hsl(var(--primary))',
  width = 60,
  height = 24,
}: {
  data: CompetitorTrendPoint[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (!data || data.length < 2) return null;

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * ComparisonTable - Table comparing brands by key metrics
 *
 * Features:
 * - Columns: Brand, Mentions, Visibility, Position, Trend (sparkline)
 * - Your brand highlighted
 * - Sort by any column
 * - Trend sparklines
 * - Row click handler
 */
export function ComparisonTable({
  competitors,
  ownBrandName,
  trendData = {},
  onSelectCompetitor,
  className,
}: ComparisonTableProps) {
  const [sortField, setSortField] = useState<CompetitorSortField>('visibility');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Sort competitors
  const sortedCompetitors = useMemo(() => {
    const sorted = [...competitors].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'mentions':
          comparison = a.mentions - b.mentions;
          break;
        case 'visibility':
          comparison = a.visibility - b.visibility;
          break;
        case 'position':
          comparison = a.position - b.position;
          break;
        case 'trend':
          comparison = (a.trendValue || 0) - (b.trendValue || 0);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    return sorted;
  }, [competitors, sortField, sortOrder]);

  const toggleSort = (field: CompetitorSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: CompetitorSortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-50" />;
    }
    return sortOrder === 'desc' ? (
      <ArrowDown className="w-3.5 h-3.5 ml-1" />
    ) : (
      <ArrowUp className="w-3.5 h-3.5 ml-1" />
    );
  };

  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className={className}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 font-medium hover:bg-transparent"
                onClick={() => toggleSort('name')}
              >
                Brand
                <SortIcon field="name" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 font-medium hover:bg-transparent"
                onClick={() => toggleSort('mentions')}
              >
                Mentions
                <SortIcon field="mentions" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 font-medium hover:bg-transparent"
                onClick={() => toggleSort('visibility')}
              >
                Visibility
                <SortIcon field="visibility" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 font-medium hover:bg-transparent"
                onClick={() => toggleSort('position')}
              >
                Position
                <SortIcon field="position" />
              </Button>
            </TableHead>
            <TableHead className="text-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 font-medium hover:bg-transparent"
                onClick={() => toggleSort('trend')}
              >
                Trend
                <SortIcon field="trend" />
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <motion.tbody
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="contents"
          >
            {sortedCompetitors.map((competitor, index) => {
              const isOwn =
                competitor.isOwn ||
                (ownBrandName &&
                  competitor.name.toLowerCase() === ownBrandName.toLowerCase());
              const trendDisplay = getTrendDisplay(competitor.trend, competitor.trendValue);
              const TrendIcon = trendDisplay.icon;
              const competitorTrendData = trendData[competitor.id];

              return (
                <motion.tr
                  key={competitor.id}
                  variants={staggerItem}
                  className={cn(
                    'cursor-pointer transition-colors',
                    isOwn && 'bg-primary/5 hover:bg-primary/10',
                    !isOwn && 'hover:bg-muted/50'
                  )}
                  onClick={() => onSelectCompetitor?.(competitor)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {isOwn && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Crown className="w-4 h-4 text-primary" />
                            </TooltipTrigger>
                            <TooltipContent>Your brand</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <span className={cn(isOwn && 'text-primary')}>
                        {competitor.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {competitor.mentions.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono">{competitor.visibility}</span>
                    <span className="text-muted-foreground text-xs ml-0.5">%</span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    #{competitor.position}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      {competitorTrendData && (
                        <TrendSparkline
                          data={competitorTrendData}
                          color={
                            competitor.trend === 'up'
                              ? 'hsl(var(--success))'
                              : competitor.trend === 'down'
                              ? 'hsl(var(--destructive))'
                              : 'hsl(var(--muted-foreground))'
                          }
                        />
                      )}
                      <div
                        className={cn(
                          'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                          trendDisplay.bg,
                          trendDisplay.color
                        )}
                      >
                        <TrendIcon className="w-3 h-3" />
                        {trendDisplay.formattedValue && (
                          <span>{trendDisplay.formattedValue}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                </motion.tr>
              );
            })}
          </motion.tbody>
        </TableBody>
      </Table>
    </motion.div>
  );
}
