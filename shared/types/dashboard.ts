

import type { TrendDirection, Insight, InsightType, InsightPriority, InsightStatus, TopInsightsResponse } from './insights';

// Re-export for convenience (backwards compatibility)
export type { Insight, InsightType, InsightPriority, InsightStatus, TopInsightsResponse };

// =============================================================================
// Recent Mentions Types
// =============================================================================

/**
 * Sentiment label for mentions
 */
export type MentionSentiment = 'positive' | 'neutral' | 'negative';

/**
 * Recent brand mention from AI platforms
 * Used in the dashboard to show real-time feed of brand mentions
 */
export interface RecentMention {
  /** Unique identifier (response ID) */
  id: string;
  /** AI platform (chatgpt, claude, perplexity, etc.) */
  platform: string;
  /** The prompt/question that was asked */
  prompt: string;
  /** Excerpt of the AI response mentioning the brand */
  snippet: string;
  /** Sentiment of the mention */
  sentiment: MentionSentiment;
  /** ISO timestamp when the mention occurred */
  timestamp: string;
}

// =============================================================================
// Request Types
// =============================================================================

/**
 * Time range options
 * Standard across all filters in the app
 */
export type TimeRangePreset = '1d' | '3d' | '7d' | '14d' | '30d' | '60d' | '90d' | '365d' | 'all' | 'custom';

/**
 * Query parameters for GET /api/dashboard
 */
export interface DashboardRequest {
  timeRange: TimeRangePreset;
  startDate?: string;   // ISO date, required if timeRange='custom'
  endDate?: string;     // ISO date, required if timeRange='custom'
  workspaceId?: string; // from auth context if not provided
}

/**
 * Query parameters for GET /api/insights/top
 */
export interface TopInsightsRequest {
  limit?: number; // default 3
}

/**
 * Query parameters for GET /api/alerts/recent
 */
export interface RecentAlertsRequest {
  limit?: number; // default 5
}

// =============================================================================
// Response Types
// =============================================================================

/**
 * Platform score for platform performance chart
 */
export interface PlatformScore {
  id: string;
  name: string;       // "ChatGPT", "Claude", etc.
  icon: string;       // icon identifier
  score: number;      // 0-100
  mentions: number;
  trend: number;      // percentage change
  citations: number;  // count of citations on this platform
  sentiment: 'positive' | 'neutral' | 'negative';  // dominant sentiment on this platform
}

/**
 * Competitor ranking for leaderboard
 */
export interface CompetitorRank {
  rank: number;
  id: string;
  name: string;
  score: number;
  trend: number;
  isYou: boolean;           // true for user's brand
  topPlatforms?: string[];  // top 3 platforms by score
  rankChange?: number;      // rank change vs previous period
}

/**
 * Onboarding step for setup checklist
 */
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  complete: boolean;
  skipped: boolean;   // true if user skipped this step
  href: string;       // where to go to complete
}

// =============================================================================
// Phase 2: Quick Win Computed Fields
// =============================================================================

/**
 * Mentions data — computed from existing responses table
 * Card 5: "LLM mentions"
 */
export interface MentionsData {
  /** COUNT(DISTINCT promptId) WHERE brandMentioned = true */
  promptCount: number;
  /** % change vs previous period */
  trend: number;
  /** Prompt with most brand mentions */
  topTrigger: { promptText: string; newMentions: number } | null;
  /** Prompts where createdAt >= timeWindow.start */
  newPromptCount: number;
}

/**
 * Position data — computed from existing compareCompetitors()
 * Card 2: "Competitor Rankings"
 */
export interface PositionData {
  /** Brand's rank from compareCompetitors() */
  rank: number;
  /** Total entities in comparison (competitors + brand) */
  total: number;
  /** #1 score - your score */
  gapToFirst: number;
  /** Name of #1 competitor (or brand if #1) */
  firstCompetitor: string;
  /** Top 3 from ranking */
  topThree: CompetitorRank[];
}

/**
 * Sentiment breakdown — computed from existing getSimpleSentiment()
 * Card 4: Sentiment Signal
 */
export interface SentimentBreakdown {
  /** % of responses with positive sentiment */
  positive: number;
  /** % of responses with neutral sentiment */
  neutral: number;
  /** % of responses with negative sentiment */
  negative: number;
  /** Change vs previous period */
  trend: number;
  /** Sample quote from a response */
  sampleQuote: { text: string; platform: string; date: string } | null;
  /** Per-platform sentiment breakdown — which platforms lean which way */
  platformSentiment?: Array<{
    id: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    percent: number;
  }>;
}

/**
 * Citation source entry — computed from existing analyzeCitations()
 * Card 7: "Citation Sources"
 * @deprecated Use CategorizedCitationSources instead
 */
export interface CitationSourceEntry {
  domain: string;
  citationCount: number;
  sentiment: string;
  /** Which LLM platforms cite this source (e.g. ['chatgpt', 'claude']) */
  platforms?: string[];
}

/**
 * Categorized citation sources for Citation Rate card
 * Groups sources into: owned (brand's domain), social (social media platforms), third-party (everything else)
 */
export interface CitationSourceCategory {
  /** Percentage of total citations (0-100) */
  percentage: number;
  /** Total citation count in this category */
  count: number;
  /** Top 3-4 domain names in this category */
  sites: string[];
}

/**
 * Categorized citation sources — grouped by ownership type
 * Card: "Citation Rate"
 */
export interface CategorizedCitationSources {
  /** Citations from brand's own domain */
  owned: CitationSourceCategory;
  /** Citations from third-party sites (blogs, news, etc.) */
  thirdParty: CitationSourceCategory;
  /** Citations from social media platforms */
  social: CitationSourceCategory;
}

/**
 * Bot visits data — derived from response counts per platform
 * Card: "Bot Visits"
 */
export interface BotVisitsData {
  /** Total bot visit count (response count in current period) */
  total: number;
  /** % change vs previous period */
  trend: number;
  /** Top bots by visit share */
  bots: { id: string; name: string; percentage: number; count: number }[];
}

/**
 * Platform summary — computed from existing platform scores
 * Card 5: "LLM mentions" platform breakdown
 */
export interface PlatformSummary {
  /** Platforms with score >= 70 */
  strong: number;
  /** Platforms with score >= 40 and < 70 */
  average: number;
  /** Platforms with score < 40 */
  weak: number;
}

/**
 * Contextual subtitles for Row 2 & 3 cards.
 * Backend-computed, data-driven one-liners (~40 chars max).
 * Frontend truncates with ellipsis if longer.
 *
 * Patterns:
 *   llmMentions:         "Across 8 platforms · Claude leads"
 *   competitorRankings:  "Leading by 22 pts" | "22 pts behind TechCorp"
 *   citationSources:     "76 citations from 5 sources"
 *   sentimentSignal:     "Mostly neutral · trending down"
 */
export interface CardSubtitles {
  llmMentions: string;
  competitorRankings: string;
  citationSources: string;
  citationFooter: string;
  sentimentSignal: string;
}

/**
 * Main dashboard response
 *
 * NOTE: trendDirection uses 'stable' not 'neutral' per canonical TrendDirection
 */
export interface DashboardResponse {
  brandName?: string;  // Current brand name for display
  cardSubtitles: CardSubtitles;
  visibility: {
    score: number;                    // 0-100
    previousScore: number;            // for trend calculation
    trend: number;                    // percentage change
    trendDirection: TrendDirection;   // 'up' | 'down' | 'stable'
  };

  metrics: {
    totalMentions: number;
    mentionsTrend: number;            // percentage change
    avgSentiment: number;             // -1 to 1
    sentimentTrend: number;
    topPlatform: {
      id: string;
      name: string;
      icon: string;
    };
    activeAlerts: number;
  };

  platforms: PlatformScore[];
  competitors: CompetitorRank[];

  // Phase 2: Quick win computed fields
  mentions: MentionsData;
  position: PositionData;
  sentiment: SentimentBreakdown;
  /** Categorized citation sources (owned, third-party, social) - for Citation Rate card */
  citationSources: CategorizedCitationSources;
  /** Flat list of citation sources with domain/sentiment - for Citation Sources card */
  citationSourcesList: CitationSourceEntry[];
  platformSummary: PlatformSummary;
  botVisits: BotVisitsData;
  insightCount: number;

  /** Recent brand mentions across AI platforms (last 7 days, limit 15) */
  recentMentions: RecentMention[];

  onboarding: {
    complete: boolean;
    currentStep: number;
    totalSteps: number;
    steps: OnboardingStep[];
  };

  meta: {
    lastUpdated: string;              // ISO timestamp
    dataFreshness: 'live' | 'cached' | 'pending';
    cacheAge?: number;                // seconds if cached
  };
}

// =============================================================================
// Alert Types
// =============================================================================

/**
 * Alert type for dashboard
 */
export type AlertType = 'visibility_drop' | 'brand_removal' | 'competitor_surge' | 'sentiment_shift';

/**
 * Alert severity level
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Alert object for recent alerts list
 */
export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  triggeredAt: string;                // ISO timestamp
  read: boolean;
  data: Record<string, unknown>;      // type-specific payload
}

/**
 * Response for GET /api/alerts/recent
 */
export interface RecentAlertsResponse {
  alerts: Alert[];
  hasMore: boolean;
}

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Dashboard-specific error codes
 */
export type DashboardErrorCode =
  | 'NO_BRAND'
  | 'NO_DATA'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR';

/**
 * Error response shape
 */
export interface DashboardError {
  code: DashboardErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
