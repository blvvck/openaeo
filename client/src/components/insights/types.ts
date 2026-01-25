/**
 * Insights Component Types
 *
 * UI-specific types for insight components.
 *
 * IMPORTANT: For API response types, use @shared/types/insights.ts instead.
 * These types are for UI rendering and extend the canonical API types.
 *
 * @deprecated For new code, prefer importing from '@shared/types' for API types.
 * Use these types only for UI-specific extensions.
 */

import type {
  Insight as ApiInsight,
  InsightType as ApiInsightType,
  InsightPriority,
  InsightStatus,
  TrendDirection,
} from '@shared/types';

// Re-export canonical types for backwards compatibility
export type { ApiInsight, ApiInsightType, InsightPriority, InsightStatus, TrendDirection };

// =============================================================================
// UI-Specific Types (extend API types for component rendering)
// =============================================================================

/**
 * UI insight type categories
 * More granular than API types for UI categorization
 *
 * @deprecated Migrate to InsightType from @shared/types
 */
export type InsightType = 'visibility' | 'competitor' | 'sentiment' | 'opportunity' | 'citation';

/**
 * UI severity levels (maps to priority in API)
 *
 * @deprecated Use InsightPriority from @shared/types
 */
export type InsightSeverity = 'info' | 'warning' | 'critical';

/**
 * UI action handler for interactive buttons
 */
export interface InsightAction {
  label: string;
  type: 'view_details' | 'dismiss' | 'custom';
  href?: string;
  onClick?: () => void;
}

/**
 * Metric display for insight cards
 */
export interface InsightMetric {
  label: string;
  value: string | number;
  change?: number;
  changeDirection?: TrendDirection;
}

/**
 * UI Insight - extends API insight with UI-specific fields
 *
 * @deprecated For API data, use Insight from @shared/types
 * This type is for UI rendering with additional UI-specific fields.
 */
export interface Insight {
  /** Unique identifier (string for new code, number for legacy) */
  id: number | string;
  /** UI category type */
  type: InsightType;
  /** UI severity (maps to priority) */
  severity: InsightSeverity;
  /** Display title */
  title: string;
  /** Detailed description */
  description: string;
  /** UI action handler */
  action?: InsightAction;
  /** Additional data for rendering */
  data?: Record<string, unknown>;
  /** Metrics to display */
  metrics?: InsightMetric[];
  /** Creation timestamp */
  createdAt: string;
  /** When dismissed (if dismissed) */
  dismissedAt?: string;
}

// =============================================================================
// Display Constants
// =============================================================================

/** Insight type display info */
export const INSIGHT_TYPE_INFO: Record<InsightType, { label: string; description: string }> = {
  visibility: {
    label: 'Visibility',
    description: 'Changes in your AI visibility score or position',
  },
  competitor: {
    label: 'Competitor',
    description: 'Competitor activity and competitive positioning',
  },
  sentiment: {
    label: 'Sentiment',
    description: 'Changes in sentiment or tone of AI responses',
  },
  opportunity: {
    label: 'Opportunity',
    description: 'Opportunities to improve your AI presence',
  },
  citation: {
    label: 'Citation',
    description: 'New or changed source citations',
  },
};

/** Severity display info */
export const INSIGHT_SEVERITY_INFO: Record<InsightSeverity, { label: string; color: string; bgClass: string; textClass: string }> = {
  info: {
    label: 'Info',
    color: 'hsl(var(--primary))',
    bgClass: 'bg-primary/10',
    textClass: 'text-primary',
  },
  warning: {
    label: 'Warning',
    color: 'hsl(var(--warning))',
    bgClass: 'bg-warning/10',
    textClass: 'text-warning',
  },
  critical: {
    label: 'Critical',
    color: 'hsl(var(--destructive))',
    bgClass: 'bg-destructive/10',
    textClass: 'text-destructive',
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get icon name for insight type
 */
export function getInsightTypeIcon(type: InsightType): string {
  const iconMap: Record<InsightType, string> = {
    visibility: 'Eye',
    competitor: 'Users',
    sentiment: 'Heart',
    opportunity: 'Lightbulb',
    citation: 'Link',
  };
  return iconMap[type];
}

/**
 * Map API insight type to UI type
 */
export function mapApiTypeToUiType(apiType: ApiInsightType): InsightType {
  const mapping: Record<ApiInsightType, InsightType> = {
    losing_prompt: 'visibility',
    content_gap: 'competitor',
    sentiment_drop: 'sentiment',
    position_loss: 'visibility',
    competitor_gain: 'competitor',
    opportunity: 'opportunity',
    success: 'opportunity',
  };
  return mapping[apiType];
}

/**
 * Map API priority to UI severity
 */
export function mapPriorityToSeverity(priority: InsightPriority): InsightSeverity {
  const mapping: Record<InsightPriority, InsightSeverity> = {
    high: 'critical',
    medium: 'warning',
    low: 'info',
  };
  return mapping[priority];
}

/**
 * Convert API Insight to UI Insight
 */
export function apiInsightToUiInsight(apiInsight: ApiInsight): Insight {
  return {
    id: apiInsight.id,
    type: mapApiTypeToUiType(apiInsight.type),
    severity: mapPriorityToSeverity(apiInsight.priority),
    title: apiInsight.title,
    description: apiInsight.description,
    action: apiInsight.action ? {
      label: 'Take Action',
      type: 'view_details',
    } : undefined,
    data: apiInsight.relatedData,
    createdAt: apiInsight.createdAt,
  };
}
