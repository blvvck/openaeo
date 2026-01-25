/**
 * Competitor Comparison Components
 *
 * UI components for comparing and analyzing competitor visibility.
 */

// Components
export { ComparisonTable } from './ComparisonTable';
export { CompetitorCard, CompetitorListItem } from './CompetitorCard';
export { AddCompetitorModal } from './AddCompetitorModal';
export { CompetitorTrendOverlay } from './CompetitorTrendOverlay';
export { CompetitorLeaderboard } from './competitor-leaderboard';
export { CompetitorTrendsChart, TrendMetricTabs } from './competitor-trends-chart';
export type { CompetitorTrendsData, TrendMetric } from './competitor-trends-chart';

// Types
export type {
  TrendDirection,
  Competitor,
  CompetitorTrendPoint,
  CompetitorWithTrend,
  CompetitorSuggestion,
  TimeRangeOption,
  CompetitorSortField,
  MetricType,
} from './types';

// Constants
export { METRIC_INFO, TIME_RANGE_INFO, getTrendDirection } from './types';
