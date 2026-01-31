

// =============================================================================
// Journey Stage Types
// =============================================================================

/**
 * Buyer journey stage IDs for the Prompts/Discovery page.
 * Named BuyerJourneyStage to avoid conflict with JourneyStage in intelligence.ts
 */
export type BuyerJourneyStage =
  | 'problem-aware'
  | 'solution-seeking'
  | 'comparing'
  | 'buying'
  | 'using';

/** Human-readable stage names */
export const BUYER_JOURNEY_STAGE_NAMES: Record<BuyerJourneyStage, string> = {
  'problem-aware': 'Problem aware',
  'solution-seeking': 'Solution seeking',
  'comparing': 'Comparing',
  'buying': 'Buying',
  'using': 'Using',
};

/** Stage badge colors */
export const BUYER_STAGE_BADGE_COLORS: Record<BuyerJourneyStage, string> = {
  'problem-aware': 'bg-purple-50 text-purple-600',
  'solution-seeking': 'bg-blue-50 text-figma-blue',
  'comparing': 'bg-green-50 text-figma-green',
  'buying': 'bg-amber-50 text-figma-orange',
  'using': 'bg-slate-100 text-figma-secondary',
};

// =============================================================================
// Sentiment Types
// =============================================================================

/** Sentiment classification */
export type Sentiment = 'positive' | 'neutral' | 'negative' | 'mixed';

/** Short labels for table display */
export const SENTIMENT_SHORT_LABELS: Record<Sentiment, string> = {
  positive: 'Pos',
  neutral: 'Neu',
  negative: 'Neg',
  mixed: 'Mix',
};

// =============================================================================
// Funnel Coverage Types
// =============================================================================

/** Single stage in the funnel */
export interface FunnelStage {
  id: BuyerJourneyStage;
  name: string;
  /** Coverage percentage (0-100) */
  coverage: number;
  /** Total prompts tracked in this stage */
  promptCount: number;
  /** Prompts where brand appears */
  mentionCount: number;
  /** Change vs previous period */
  trend: number;
}

/** Full funnel coverage response */
export interface FunnelCoverage {
  stages: FunnelStage[];
  totalPrompts: number;
  totalMentions: number;
  strongestStage: BuyerJourneyStage;
  weakestStage: BuyerJourneyStage;
  insight?: string;
}

// =============================================================================
// Prompt Types
// =============================================================================

/** Prompt list item (table row) */
export interface Prompt {
  id: string;
  text: string;
  stage: BuyerJourneyStage;
  stageName: string;
  topic?: string;
  topicName?: string;
  /** Platform IDs where brand appears */
  platforms: string[];
  /** Total times brand mentioned */
  mentions: number;
  /** Change vs previous period */
  trend: number;
  firstSeen: string;
  lastSeen: string;
  /** Dominant sentiment across platforms */
  dominantSentiment: Sentiment;
  /** Total citations across all platforms */
  citationCount: number;
}

/** Trending prompt with rank */
export interface TrendingPrompt extends Prompt {
  trendRank: number;
}

/** Topic filter option */
export interface Topic {
  id: string;
  name: string;
  promptCount: number;
}

// =============================================================================
// Citation Types
// =============================================================================

/** Citation type classification */
export type CitationType = 'owned' | 'third-party' | 'social' | 'other';

/** Citation list item */
export interface Citation {
  url: string;
  displayUrl: string;
  domain: string;
  type: CitationType;
  /** Platform IDs that cite this source */
  platforms: string[];
}

/** Citations grouped by type */
export interface PromptCitations {
  owned: Citation[];
  thirdParty: Citation[];
  social: Citation[];
  other: Citation[];
  summary: {
    owned: { count: number; percentage: number };
    thirdParty: { count: number; percentage: number };
    social: { count: number; percentage: number };
    other: { count: number; percentage: number };
  };
}

// =============================================================================
// Platform Detail Types
// =============================================================================

/** Platform-specific mention details */
export interface PlatformMention {
  platformId: string;
  platformName: string;
  mentioned: boolean;
  snippet?: string;
  sentiment?: Sentiment;
  citations?: Citation[];
}

// =============================================================================
// Prompt Detail Types (Drawer)
// =============================================================================

/** Competitor in prompt context */
export interface PromptCompetitor {
  id: string;
  name: string;
  platformCount: number;
  isYou: boolean;
  dominantSentiment: Sentiment;
}

/** Full prompt detail (for drawer) */
export interface PromptDetail extends Prompt {
  platformDetails: PlatformMention[];
  competitors: PromptCompetitor[];
  relatedPrompts: Prompt[];
  citations: PromptCitations;
  citationInsight?: string;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

// =============================================================================
// API Response Types
// =============================================================================

/** Prompts list response */
export interface PromptsResponse {
  prompts: Prompt[];
  total: number;
  hasMore: boolean;
  meta: {
    cacheAge: number;
    lastUpdated: string;
    dataFreshness: 'live' | 'cached' | 'pending';
  };
}

/** Topics list response */
export interface TopicsResponse {
  topics: Topic[];
}

/** Trending prompts response */
export interface TrendingPromptsResponse {
  prompts: TrendingPrompt[];
}

/** Single prompt detail response */
export interface PromptDetailResponse extends PromptDetail {
  meta: {
    cacheAge: number;
    lastUpdated: string;
  };
}

/** Funnel coverage response */
export interface FunnelCoverageResponse extends FunnelCoverage {
  meta: {
    cacheAge: number;
    lastUpdated: string;
    dataFreshness: 'live' | 'cached' | 'pending';
  };
}
