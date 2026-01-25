

import type { TimeRangePreset, CompetitorRank, CategorizedCitationSources } from './dashboard';

// Re-export for convenience
export type { CompetitorRank };

// =============================================================================
// Request Types
// =============================================================================

/**
 * Request params for GET /api/competitors
 */
export interface CompetitorsRequest {
  timeRange: TimeRangePreset;
  workspaceId?: string;
}

/**
 * Request params for GET /api/competitors/:id/compare
 */
export interface CompetitorCompareRequest {
  competitorId: string;
  timeRange: TimeRangePreset;
}

/**
 * Request params for GET /api/competitors/by-platform
 */
export interface CompetitorsByPlatformRequest {
  timeRange: TimeRangePreset;
  workspaceId?: string;
}

/**
 * Request params for POST /api/competitors/search
 */
export interface CompetitorSearchRequest {
  domain: string;
}

/**
 * Detailed competitor info
 */
export interface CompetitorDetail extends CompetitorRank {
  domain?: string;
  mentions: number;
  citationRate: number;
  sentimentBonus: number;
  platformCount: number;
  platformScores: Record<string, number>;
  /** Share of answer percentage */
  shareOfAnswer?: number;
  /** High-intent prompt coverage percentage */
  highIntent?: number;
  /** Top performing prompt text */
  topPrompt?: string;
  /** Discovery data: initial visibility score from wizard */
  initialScore?: number | null;
  /** Discovery data: platforms where competitor was found during wizard */
  platformsFound?: string[] | null;
  /** Discovery data: prompts discovered during wizard */
  discoveredPrompts?: string[] | null;
}

/**
 * Your position summary
 */
export interface PositionSummary {
  rank: number;
  total: number;
  score: number;
  trend: number;
  trendLabel: 'climbing' | 'stable' | 'declining';
  gapToFirst: number;
  leaderName: string;
  averageScore: number;
}

/**
 * Response for GET /api/competitors
 */
export interface CompetitorsResponse {
  position: PositionSummary;
  competitors: CompetitorDetail[];
  insight: string;
  meta: {
    lastUpdated: string;
    dataFreshness: 'live' | 'cached' | 'pending';
    cacheAge?: number;
  };
}

// =============================================================================
// Response Types - Platform Breakdown
// =============================================================================

/**
 * Ranking entry for a single platform
 */
export interface PlatformRankingEntry {
  rank: number;
  competitorId: string;
  competitorName: string;
  score: number;
  isYou: boolean;
}

/**
 * Per-platform ranking data
 */
export interface PlatformRanking {
  platformId: string;
  platformName: string;
  rankings: PlatformRankingEntry[];
}

/**
 * Response for GET /api/competitors/by-platform
 */
export interface CompetitorsByPlatformResponse {
  platforms: PlatformRanking[];
  insight: string;
  meta: {
    lastUpdated: string;
    dataFreshness: 'live' | 'cached' | 'pending';
    cacheAge?: number;
  };
}

// =============================================================================
// Response Types - Head-to-Head Comparison
// =============================================================================

/**
 * Metric comparison
 */
export interface MetricComparison {
  metric: string;
  yourValue: number | string;
  theirValue: number | string;
  difference: number | string;
  isPositive: boolean;
}

/**
 * Platform comparison entry
 */
export interface PlatformComparison {
  platformId: string;
  platformName: string;
  yourScore: number;
  theirScore: number;
  delta: number;
}

/**
 * Response for GET /api/competitors/:id/compare
 */
export interface CompetitorCompareResponse {
  you: CompetitorDetail;
  them: CompetitorDetail;
  metrics: MetricComparison[];
  platformComparison: PlatformComparison[];
  insight: string;
  meta: {
    lastUpdated: string;
    dataFreshness: 'live' | 'cached' | 'pending';
    cacheAge?: number;
  };
}

// =============================================================================
// Response Types - Search
// =============================================================================

/**
 * Search result for a potential competitor
 */
export interface CompetitorSearchResult {
  name: string;
  domain: string;
  score: number;
  platforms: string[];
  alreadyTracked: boolean;
}

/**
 * Response for POST /api/competitors/search
 */
export interface CompetitorSearchResponse {
  found: boolean;
  competitor?: CompetitorSearchResult;
  message?: string;
}

// =============================================================================
// Competitor Metrics Types (for metric cards)
// =============================================================================

/**
 * Your Rank card data
 * Shows ranking position among tracked competitors
 */
export interface YourRankMetric {
  rank: number;
  totalCompetitors: number;
  change?: number; // position change vs last period (negative = moved up)
  competitors: Array<{
    name: string;
    rank: number;
    isYou?: boolean;
    domain?: string;
    logoUrl?: string | null;
    score?: number;  // visibility score percentage
  }>;
}

/**
 * Share of Answer card data
 * Shows what % of responses mention your brand
 */
export interface ShareOfAnswerMetric {
  percentage: number;           // Your share of answer overall
  trend: number;                // Change vs last period
  trackedPrompts: number;       // Total prompts tracked
  platforms?: Array<{           // Your breakdown by platform
    platform: string;
    percentage: number;
  }>;
  competitorShares?: Array<{    // Competitor comparison table
    name: string;
    isYou?: boolean;
    rank: number;
    shares: Record<string, number>; // platformId -> percentage
  }>;
}

/**
 * High-intent query for the footer table
 */
export interface HighIntentQuery {
  query: string;        // The prompt/query text (truncated to ~60 chars)
  topic: string;        // Category: 'Comparison', 'Best', 'Alternative', 'Pricing', 'Review'
  coverage: number;     // Coverage percentage (0-100)
}

/**
 * High-Intent Coverage card data
 * Shows coverage of buyer-intent prompts
 */
export interface HighIntentMetric {
  percentage: number;   // % of buyer-intent prompts you appear in
  trend: number;
  covered: number;      // Count of covered prompts
  total: number;        // Total buyer-intent prompts
  queries?: HighIntentQuery[];  // Top high-intent queries for the footer table
}

/**
 * Citation source breakdown
 */
export interface CitationSource {
  type: string;         // 'Owned' (your content) or 'Third-party' (external authority)
  percentage: number;
  color: string;        // Owned: #22C55E (green), Third-party: #6B7280 (gray)
  sites?: string[];     // List of citing domains (up to 4)
}

/**
 * Citation Rate card data
 * Shows how often LLM mentions include a link to your site
 */
export interface CitationRateMetric {
  percentage: number;   // % of mentions that include a link to your site
  trend: number;
  totalCitations: number;
  sources?: CategorizedCitationSources;  // Breakdown by citation ownership (owned, thirdParty, social)
}

/**
 * Competitive Pressure card data
 * Shows net wins/losses vs competitors
 */
export interface CompetitivePressureMetric {
  netWins: number;      // takeovers - losses
  takeovers: number;    // Prompts where you overtook competitor
  losses: number;       // Prompts where competitor overtook you
  competitors?: Array<{
    name: string;
    delta: number;      // Net change vs this competitor
    domain?: string;
    logoUrl?: string | null;
  }>;
}

/**
 * Response for GET /api/competitors/metrics
 */
export interface CompetitorMetricsResponse {
  yourRank: YourRankMetric;
  shareOfAnswer: ShareOfAnswerMetric;
  highIntent: HighIntentMetric;
  citationRate: CitationRateMetric;
  competitivePressure: CompetitivePressureMetric;
  meta: {
    lastUpdated: string;
    dataFreshness: 'live' | 'cached' | 'stale';
    cacheAge?: number;
    /** True if prompts are tracked and responses exist */
    hasTrackedData: boolean;
  };
}

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Competitor-specific error codes
 */
export type CompetitorErrorCode =
  | 'NO_BRAND'
  | 'NO_DATA'
  | 'COMPETITOR_NOT_FOUND'
  | 'ALREADY_TRACKED'
  | 'LIMIT_REACHED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR';

/**
 * Competitor error response
 */
export interface CompetitorError {
  code: CompetitorErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
