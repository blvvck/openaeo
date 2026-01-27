

import type { TrendDirection, Insight } from './insights';
import type { TimeRangePreset, PlatformScore } from './dashboard';

// Re-export for convenience
export type { TrendDirection, TimeRangePreset, PlatformScore };

// =============================================================================
// Request Types
// =============================================================================

/**
 * Data granularity for time series
 */
export type Granularity = 'hourly' | 'daily' | 'weekly' | 'monthly';

/**
 * Request params for GET /api/visibility/overview
 */
export interface VisibilityOverviewRequest {
  timeRange: TimeRangePreset;
  startDate?: string;   // ISO date, required if timeRange='custom'
  endDate?: string;     // ISO date, required if timeRange='custom'
  workspaceId?: string;
}

/**
 * Request params for GET /api/metrics/by-platform
 */
export interface PlatformMetricsRequest {
  timeRange: TimeRangePreset;
  startDate?: string;
  endDate?: string;
  workspaceId?: string;
}

/**
 * Request params for GET /api/metrics/trends
 */
export interface TrendsRequest {
  timeRange: TimeRangePreset;
  startDate?: string;
  endDate?: string;
  granularity: Granularity;
  workspaceId?: string;
}

/**
 * Request params for GET /api/topics/analysis
 */
export interface TopicsAnalysisRequest {
  timeRange: TimeRangePreset;
  workspaceId?: string;
  search?: string;                  // filter by topic name
}

/**
 * Request params for GET /api/metrics/compare
 */
export interface CompareRequest {
  competitorId: string;
  timeRange: TimeRangePreset;
}

// =============================================================================
// Response Types - Overview
// =============================================================================

/**
 * What changed in visibility score
 */
export interface ChangeItem {
  metric: string;                   // "ChatGPT mentions", "Citation rate", etc.
  direction: TrendDirection;
  oldValue: number | string;
  newValue: number | string;
  message: string;                  // Human-readable: "Citation rate dropped from 23% to 18%"
}

/**
 * Content item (cited URLs)
 */
export interface ContentItem {
  url: string;
  path: string;                     // /blog/ai-guide
  title: string;
  citations: number;
  trend: number;                    // percentage change
  platforms?: string[];             // which platforms cite this
}

/**
 * Response for GET /api/visibility/overview
 */
export interface VisibilityOverviewResponse {
  score: number;                    // 0-100
  previousScore: number;            // for trend calculation
  trend: number;                    // percentage change
  trendDirection: TrendDirection;

  breakdown: {
    mentionCount: number;
    mentionsTrend: number;          // percentage change
    citationRate: number;           // 0-100 percentage
    citationRateTrend: number;
    citationSources?: string[];     // top cited domains
    sentimentBonus: number;         // points added/subtracted, can be negative
    sentimentTrend: TrendDirection;
    sentimentBreakdown?: {          // positive/neutral/negative counts
      positive: number;
      neutral: number;
      negative: number;
    };
    platformDiversity: {
      active: number;               // platforms with mentions
      total: number;                // total tracked platforms
    };
  };

  platforms: PlatformScore[];       // per-platform visibility breakdown

  whatChanged: ChangeItem[];        // what drove score change

  topContent: ContentItem[];        // most cited content

  relatedInsights: Insight[];       // relevant insights

  meta: {
    lastUpdated: string;            // ISO timestamp
    dataFreshness: 'live' | 'cached' | 'pending';
    cacheAge?: number;
  };
}

// =============================================================================
// Response Types - Platform Metrics
// =============================================================================

/**
 * Individual platform metric (for overview/dashboard)
 */
export interface PlatformMetric {
  id: string;
  name: string;                     // "ChatGPT", "Claude", etc.
  icon: string;
  score: number;                    // 0-100
  mentions: number;
  trend: number;                    // percentage change
  trendDirection: TrendDirection;
  lastSeen: string;                 // ISO timestamp
}

/**
 * Platform breakdown metric from GET /api/metrics/by-platform
 * More detailed than PlatformMetric, includes citation data
 */
export interface PlatformBreakdownMetric {
  platform: string;                 // Platform ID (e.g., "chatgpt", "claude")
  mentioned: boolean;               // Whether brand was mentioned on this platform
  mentionCount: number;             // Number of times brand was mentioned
  visibilityScore: number;          // 0-100
  positionScore: number;            // 0-100
  sentimentScore: number;           // 0-1 (normalized)
  responseCount: number;            // Total responses from this platform
  /** Citations that link to the brand's own domain */
  ownedCitationCount: number;
  /**
   * Total prompts relevant to the brand's topics on this platform.
   * Used to calculate missed opportunity rate:
   * missedOppRate = ((relevantPromptCount - mentionCount) / relevantPromptCount) * 100
   */
  relevantPromptCount: number;
}

/**
 * Radar chart data point
 */
export interface RadarDataPoint {
  platform: string;
  score: number;
}

/**
 * Platform-specific alert
 */
export interface PlatformAlert {
  platform: string;
  message: string;                  // "ChatGPT mentions are down 28% this week"
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Response for GET /api/metrics/by-platform
 */
export interface PlatformMetricsResponse {
  platforms: PlatformMetric[];
  radarData: RadarDataPoint[];      // for radar chart
  alerts: PlatformAlert[];          // significant changes
}

// =============================================================================
// Response Types - Trends
// =============================================================================

/**
 * Time series data point
 */
export interface TrendDataPoint {
  date: string;                     // ISO timestamp
  score: number;
  mentions: number;
  sentiment: number;
}

/**
 * Annotation on timeline
 */
export interface TrendAnnotation {
  date: string;
  type: 'drop_start' | 'spike' | 'anomaly' | 'event';
  label: string;                    // "Drop started Feb 1"
  magnitude?: number;
}

/**
 * Per-platform trend data point
 */
export interface PlatformTrendDataPoint {
  date: string;                     // ISO timestamp
  score: number;                    // 0-100
  mentions: number;
}

/**
 * Per-platform time series for the trends chart
 */
export interface PlatformTrendSeries {
  [platformId: string]: PlatformTrendDataPoint[];
}

/**
 * Response for GET /api/metrics/trends
 */
export interface TrendsResponse {
  dataPoints: TrendDataPoint[];
  annotations: TrendAnnotation[];
  /** Per-platform daily/weekly/monthly data for multi-line chart */
  byPlatform?: PlatformTrendSeries;
  hasHistoricalData?: boolean;
  hasDataInRange?: boolean;
}

// =============================================================================
// Response Types - Anomalies
// =============================================================================

/**
 * Detected anomaly
 */
export interface Anomaly {
  id: string;
  date: string;
  type: 'spike' | 'drop';
  magnitude: number;                // percentage deviation from normal
  message: string;                  // "Unusual drop of 15% detected"
  relatedPlatforms: string[];
  relatedTopics: string[];
}

/**
 * Response for GET /api/visibility/anomalies
 */
export interface AnomaliesResponse {
  anomalies: Anomaly[];
}

// =============================================================================
// Response Types - Events
// =============================================================================

/**
 * Event marker type
 */
export type EventMarkerType = 'algorithm_change' | 'content_published' | 'competitor_action' | 'custom';

/**
 * Event marker on timeline
 */
export interface EventMarker {
  id: string;
  date: string;
  label: string;
  type: EventMarkerType;
  description?: string;
  createdBy: string;                // user who created
}

/**
 * Response for GET /api/visibility/events
 */
export interface EventsResponse {
  events: EventMarker[];
}

/**
 * Request for POST /api/visibility/events
 */
export interface CreateEventRequest {
  date: string;                     // ISO date
  label: string;
  type: EventMarkerType;
  description?: string;
}

/**
 * Response for POST /api/visibility/events
 */
export interface CreateEventResponse {
  event: EventMarker;
}

// =============================================================================
// Response Types - Topics
// =============================================================================

/**
 * Topic metric
 */
export interface TopicMetric {
  id: string;
  name: string;
  visibilityScore: number;
  mentions: number;
  sentiment: number;                // -1 to 1
  trend: number;
  trendDirection: TrendDirection;
}

/**
 * Response for GET /api/topics/analysis
 */
export interface TopicsAnalysisResponse {
  topics: TopicMetric[];
  winning: TopicMetric[];           // topics where brand is winning
  toImprove: TopicMetric[];         // topics needing work
}

// =============================================================================
// Response Types - Sources
// =============================================================================

/**
 * Response for GET /api/sources/analysis
 */
export interface SourcesAnalysisResponse {
  content: ContentItem[];
}

// =============================================================================
// Response Types - Comparison
// =============================================================================

/**
 * Comparison data point
 */
export interface CompareDataPoint {
  date: string;
  yourScore: number;
  competitorScore: number;
}

/**
 * Response for GET /api/metrics/compare
 */
export interface CompareResponse {
  you: {
    score: number;
    mentions: number;
    sentiment: number;
    topPlatform: string;
  };
  competitor: {
    name: string;
    score: number;
    mentions: number;
    sentiment: number;
    topPlatform: string;
  };
  comparison: {
    scoreGap: number;               // positive = you're winning
    mentionsGap: number;
    sentimentGap: number;
  };
  timeline: CompareDataPoint[];
}

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Visibility-specific error codes
 */
export type VisibilityErrorCode =
  | 'NO_BRAND'
  | 'NO_DATA'
  | 'INVALID_TIME_RANGE'
  | 'TIME_RANGE_TOO_WIDE'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR';

/**
 * Visibility error response
 */
export interface VisibilityError {
  code: VisibilityErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
