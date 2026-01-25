/**
 * Competitor Comparison Types
 *
 * Types for competitor analysis and comparison components.
 */

/** Trend direction */
export type TrendDirection = 'up' | 'down' | 'stable';

/** Competitor data */
export interface Competitor {
  id: number;
  name: string;
  domain: string;
  mentions: number;
  visibility: number;
  position: number;
  trend: TrendDirection;
  trendValue?: number;
  isOwn?: boolean;
}

/** Competitor trend data point */
export interface CompetitorTrendPoint {
  date: string;
  value: number;
}

/** Competitor with trend data */
export interface CompetitorWithTrend extends Competitor {
  trendData: CompetitorTrendPoint[];
  color?: string;
}

/** Competitor search suggestion */
export interface CompetitorSuggestion {
  name: string;
  domain: string;
  category?: string;
}

/** Time range for trend data */
export type TimeRangeOption = '7d' | '30d' | '90d' | '6m' | '1y';

/** Sort field for comparison table */
export type CompetitorSortField = 'name' | 'mentions' | 'visibility' | 'position' | 'trend';

/** Comparison metric type */
export type MetricType = 'visibility' | 'mentions' | 'position' | 'sentiment';

/** Metric display info */
export const METRIC_INFO: Record<MetricType, { label: string; unit: string; higherIsBetter: boolean }> = {
  visibility: { label: 'Visibility', unit: '%', higherIsBetter: true },
  mentions: { label: 'Mentions', unit: '', higherIsBetter: true },
  position: { label: 'Position', unit: '', higherIsBetter: false },
  sentiment: { label: 'Sentiment', unit: '', higherIsBetter: true },
};

/** Time range display info */
export const TIME_RANGE_INFO: Record<TimeRangeOption, { label: string; days: number }> = {
  '7d': { label: '7 days', days: 7 },
  '30d': { label: '30 days', days: 30 },
  '90d': { label: '90 days', days: 90 },
  '6m': { label: '6 months', days: 180 },
  '1y': { label: '1 year', days: 365 },
};

/**
 * Get trend direction from values
 */
export function getTrendDirection(current: number, previous: number): TrendDirection {
  const diff = current - previous;
  if (Math.abs(diff) < 0.5) return 'stable';
  return diff > 0 ? 'up' : 'down';
}
