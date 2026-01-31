

// =============================================================================
// Trend Direction (CANONICAL)
// =============================================================================

/**
 * Trend direction - CANONICAL definition
 * Use 'stable' not 'neutral' for consistency with UI language
 */
export type TrendDirection = 'up' | 'down' | 'stable';

// =============================================================================
// Insight Types
// =============================================================================

/**
 * Insight type/category - what kind of insight is this?
 * These map to detection functions in insights-generator.ts
 */
export type InsightType =
  | 'losing_prompt'     // Brand missing from responses where competitors appear
  | 'content_gap'       // Competitor dominates on a platform
  | 'sentiment_drop'    // Declining brand perception
  | 'position_loss'     // Lower ranking in responses
  | 'competitor_gain'   // Competitor visibility increased
  | 'opportunity'       // Area to improve
  | 'success';          // Good performance to maintain

/**
 * Insight priority level
 * Used for sorting and display prominence
 */
export type InsightPriority = 'high' | 'medium' | 'low';

/**
 * Insight status for tracking action taken
 */
export type InsightStatus = 'active' | 'completed' | 'dismissed';

// =============================================================================
// Core Insight Interface
// =============================================================================

/**
 * Core insight data - API response shape
 *
 * This is what the API returns and what gets stored.
 * UI components may extend this with additional fields.
 */
export interface Insight {
  /** Unique identifier (string UUID or prefixed ID) */
  id: string;

  /** Category of insight */
  type: InsightType;

  /** Priority for sorting/display */
  priority: InsightPriority;

  /** Short title for display */
  title: string;

  /** Detailed description */
  description: string;

  /** Potential impact (e.g., "Could improve visibility by 15%") */
  impact: string;

  /** Recommended action text */
  action: string;

  /** When the insight was generated */
  createdAt: string;

  /** Current status */
  status: InsightStatus;

  /** Related entities for filtering/navigation */
  relatedData?: {
    platforms?: string[];
    competitors?: string[];
    topics?: string[];
  };
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Response for GET /api/insights/top
 */
export interface TopInsightsResponse {
  insights: Insight[];
  totalCount: number;
}

/**
 * Request params for GET /api/insights
 */
export interface InsightsRequest {
  limit?: number;
  offset?: number;
  type?: InsightType;
  priority?: InsightPriority;
  status?: InsightStatus;
}

/**
 * Response for GET /api/insights (paginated)
 */
export interface InsightsResponse {
  insights: Insight[];
  total: number;
  hasMore: boolean;
}

// =============================================================================
// UI Extension Types (for frontend-only use)
// =============================================================================

/**
 * Action handler for UI interactions
 * Extends basic action string with interactive behavior
 */
export interface InsightActionHandler {
  /** Button label */
  label: string;
  /** Action type for routing/handling */
  actionType: 'view_details' | 'dismiss' | 'navigate' | 'custom';
  /** Navigation URL if actionType is 'navigate' */
  href?: string;
  /** Custom click handler */
  onClick?: () => void;
}

/**
 * Insight with UI-specific extensions
 * Use this in components that need interactive actions
 */
export interface InsightWithAction extends Insight {
  /** UI action handler (extends the basic action string) */
  actionHandler?: InsightActionHandler;
}

/**
 * Insight metric for dashboard cards
 */
export interface InsightMetric {
  label: string;
  value: string | number;
  change?: number;
  changeDirection?: TrendDirection;
}

/**
 * Insight with metrics for detailed display
 */
export interface InsightWithMetrics extends Insight {
  metrics?: InsightMetric[];
}

// =============================================================================
// Display Helpers (for UI)
// =============================================================================

/**
 * Display info for insight types
 */
export const INSIGHT_TYPE_DISPLAY: Record<InsightType, { label: string; icon: string; description: string }> = {
  losing_prompt: {
    label: 'Losing Prompt',
    icon: 'AlertTriangle',
    description: 'Brand not appearing where competitors do',
  },
  content_gap: {
    label: 'Content Gap',
    icon: 'FileWarning',
    description: 'Competitor dominates on this platform',
  },
  sentiment_drop: {
    label: 'Sentiment Drop',
    icon: 'TrendingDown',
    description: 'Declining brand perception',
  },
  position_loss: {
    label: 'Position Loss',
    icon: 'ArrowDown',
    description: 'Lower ranking in AI responses',
  },
  competitor_gain: {
    label: 'Competitor Gain',
    icon: 'Users',
    description: 'Competitor visibility increased',
  },
  opportunity: {
    label: 'Opportunity',
    icon: 'Lightbulb',
    description: 'Area to improve visibility',
  },
  success: {
    label: 'Success',
    icon: 'CheckCircle',
    description: 'Strong performance to maintain',
  },
};

/**
 * Display info for priority levels
 */
export const INSIGHT_PRIORITY_DISPLAY: Record<InsightPriority, { label: string; color: string; bgClass: string }> = {
  high: {
    label: 'High Priority',
    color: 'hsl(var(--destructive))',
    bgClass: 'bg-destructive/10 text-destructive',
  },
  medium: {
    label: 'Medium Priority',
    color: 'hsl(var(--warning))',
    bgClass: 'bg-warning/10 text-warning',
  },
  low: {
    label: 'Low Priority',
    color: 'hsl(var(--primary))',
    bgClass: 'bg-primary/10 text-primary',
  },
};
