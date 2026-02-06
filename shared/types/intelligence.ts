/**
 * Intelligence Types
 *
 * Types for the Intelligence wizard and H2H comparison features.
 * These are shared between frontend and backend.
 */

export type JourneyStage =
  | 'problem_aware'
  | 'exploring'
  | 'comparing_tradeoffs'
  | 'deciding'
  | 'onboarding'
  | 'power_user';

export type SentimentLabel = 'positive' | 'neutral' | 'negative';

/**
 * Single brand's metrics for H2H comparison
 */
export interface BrandMetrics {
  /** Percentage of prompts where brand was mentioned (0-100) */
  shareOfAnswer: number;
  /** Human readable detail e.g., "9 of 13 prompts" */
  shareOfAnswerDetail: string;
  /** Array of prompt texts where they appeared */
  shareOfAnswerPrompts: string[];
  /** Average ranking position when mentioned e.g., 2.1 */
  avgPosition: number;
  /** Human readable detail e.g., "#1 in 4 prompts" or "Range: #1-#5" */
  avgPositionDetail: string;
  /** Prompts where they ranked #1 */
  avgPositionPrompts: string[];
  /** Percentage of responses that cited their content (0-100) */
  citationRate: number;
  /** Human readable detail e.g., "47 citations" */
  citationRateDetail: string;
  /** Prompts where they got cited */
  citationRatePrompts: string[];
  /** Aggregate sentiment label */
  sentiment: SentimentLabel;
  /** Sentiment score 0-100 */
  sentimentScore: number;
  /** Representative quote showing the sentiment */
  sentimentQuote: string;
  /** Per-platform sentiment breakdown */
  platformSentiments: Array<{
    platformId: string;
    sentiment: SentimentLabel;
  }>;
}

/**
 * Head-to-Head metrics comparing target brand vs user's brand
 */
export interface H2HMetrics {
  /** Total number of prompts analyzed */
  totalPrompts: number;
  /** Target brand metrics (the competitor being researched) */
  target: BrandMetrics;
  /** User's brand metrics (for comparison) */
  you: BrandMetrics;
}

/**
 * Analysis response from POST /api/intelligence/analyze
 */
export interface IntelligenceAnalysisResponse {
  brand: {
    id?: string;
    name: string;
    domain: string;
    logo?: string;
    description: string;
    industries: string[];
    suggestedIndustries?: string[];
  };
  competitors: Array<{
    id: string;
    name: string;
    domain: string;
    logo?: string;
    reason: string;
  }>;
  prompts: Array<{
    id: string;
    text: string;
    stage: JourneyStage;
  }>;
  /** H2H metrics comparing target vs user's brand (optional for MVP) */
  h2hMetrics?: H2HMetrics;
}

// =============================================================================
// Research Results Types (for POST /api/intelligence/research)
// =============================================================================

/**
 * Per-platform results for research
 */
export interface PlatformResult {
  id: string;
  name: string;
  isActive: boolean;
  score: number;
  mentions: number;
  sentiment: 'positive' | 'mixed' | 'negative' | null;
  citationRate: number | null;
}

/**
 * Results for a single prompt across platforms
 */
export interface PromptResult {
  promptId: string;
  promptText: string;
  results: Array<{
    platformId: string;
    mentioned: boolean;
    position?: number;
    summary: string;
    sentiment: 'positive' | 'mixed' | 'negative' | null;
  }>;
}

/**
 * Competitor comparison in research results
 */
export interface CompetitorResult {
  id: string;
  name: string;
  isTarget: boolean;
  score: number;
  mentions: number;
  sentiment: 'positive' | 'mixed' | 'negative';
  deltaVsTarget: number;
}

/**
 * Brand profile with full details
 */
export interface BrandProfile {
  id: string;
  name: string;
  domain: string;
  logo?: string;
  description: string;
  industries: string[];
  suggestedIndustries: string[];
}

/**
 * Suggested competitor from LLM
 */
export interface SuggestedCompetitor {
  id: string;
  name: string;
  domain: string;
  logo?: string;
  reason: string;
}

/**
 * Customer prompt for research
 */
export interface CustomerPrompt {
  id: string;
  text: string;
  stage: JourneyStage;
}

/**
 * Full research results from POST /api/intelligence/research
 */
export interface ResearchResults {
  brand: BrandProfile;
  score: number;
  activePlatforms: number;
  platforms: PlatformResult[];
  promptResults: PromptResult[];
  yourPromptResults: PromptResult[];
  insights: {
    strengths: string[];
    gaps: string[];
    opportunities: string[];
  };
  yourInsights: {
    strengths: string[];
    gaps: string[];
    opportunities: string[];
  };
  competitorComparison: CompetitorResult[];
  h2hMetrics: H2HMetrics;
  completedAt: string;
  reportId?: string;
}

/**
 * Request body for POST /api/intelligence/research
 */
export interface ResearchRequest {
  targetBrand: BrandProfile;
  yourBrandId: string;
  prompts: CustomerPrompt[];
  platforms: string[];
  competitors?: SuggestedCompetitor[];
}
