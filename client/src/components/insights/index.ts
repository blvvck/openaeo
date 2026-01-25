/**
 * Insights Panel Components
 *
 * UI components for displaying AI-generated insights and recommendations.
 */

// Components
export { InsightCard, CompactInsightCard } from './InsightCard';
export { InsightsList } from './InsightsList';
export { InsightDetailModal } from './InsightDetailModal';

// Types
export type {
  InsightType,
  InsightSeverity,
  InsightAction,
  InsightMetric,
  Insight,
} from './types';

// Constants
export {
  INSIGHT_TYPE_INFO,
  INSIGHT_SEVERITY_INFO,
  getInsightTypeIcon,
} from './types';
