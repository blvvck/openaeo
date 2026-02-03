

// =============================================================================
// Citation Type Classification
// =============================================================================

/**
 * Citation type classification
 * Note: Imported from prompts.ts to avoid duplication
 */
// CitationType is already defined in prompts.ts - we re-export it here for convenience
// but the canonical definition is in prompts.ts

// Import shared types from prompts.ts
import type { CitationType, Sentiment } from './prompts';

// Re-export for convenience
export type { CitationType };

/** Citation sentiment - alias for Sentiment from prompts.ts */
export type CitationSentiment = Sentiment;

// =============================================================================
// Overview Metrics (Row 1 Cards)
// =============================================================================

/** Overview metrics for the Citations page */
export interface CitationsOverview {
  total: {
    count: number;
    trend: number;
  };
  byType: {
    owned: { count: number; percentage: number; trend: number };
    thirdParty: { count: number; percentage: number; trend: number };
    social: { count: number; percentage: number; trend: number };
  };
  topSource: {
    url: string;
    displayUrl: string;
    domain: string;
    type: CitationType;
    count: number;
  };
  uniqueSources: number;
  uniqueSourcesTrend: number;
  tabMetrics: {
    owned: {
      topPage: string | null;
      pagesCited: number;
      pagesTrend: number;
      avgPerPage: number | null;
      avgPerPageTrend: number;
    };
    thirdParty: {
      topSource: string | null;
      topSourceCount: number;
      uniqueSources: number;
      uniqueSourcesTrend: number;
      avgPerSource: number | null;
      avgPerSourceTrend: number;
    };
    social: {
      topPlatform: string | null;
      platformCitations: number;
      promptsCiting: number;
      promptsTrend: number;
      sentiment: CitationSentiment | null;
    };
  };
}

/** Tab-specific metrics */
export interface TabMetrics {
  primary: { value: number | string; trend?: number; label: string; subtitle?: string };
  secondary: { value: number | string; trend?: number; label: string; subtitle?: string };
  tertiary: { value: number | string; trend?: number; label: string; subtitle?: string };
  quaternary: { value: number | string; trend?: number; label: string; subtitle?: string };
}

// =============================================================================
// Citation List (Table Rows)
// =============================================================================

/** Citation list item (table row) */
export interface CitationItem {
  id: string;
  url: string;                     // Full URL
  displayUrl: string;              // Truncated for display (e.g., "g2.com/products/acme")
  domain: string;                  // Root domain (e.g., "g2.com")
  type: CitationType;
  platforms: string[];             // Platform IDs that cite this source
  count: number;                   // Total citation count
  trend: number;                   // Change vs previous period (%)
  sentiment: CitationSentiment;    // Dominant sentiment of responses citing this
  lastCited: string;               // ISO date of most recent citation
}

// =============================================================================
// Citation Detail (Drawer)
// =============================================================================

/** Platform breakdown for citation detail */
export interface CitationPlatformBreakdown {
  platformId: string;
  platformName: string;
  count: number;
  lastCited: string;
}

/** Prompt that cites this source */
export interface CitingPrompt {
  id: string;
  text: string;
  citationCount: number;
}

/** Detailed citation view (drawer) */
export interface CitationDetail extends CitationItem {
  /** Citations breakdown by platform */
  platformBreakdown: CitationPlatformBreakdown[];
  /** Prompts that cite this source */
  promptsCiting: CitingPrompt[];
  /** Total prompts citing this source */
  totalPromptsCiting: number;
  /** Sample snippet showing how AI cites this source */
  sampleSnippet?: string;
  /** Sentiment breakdown of responses citing this source */
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

// =============================================================================
// API Response Types
// =============================================================================

/** Citations overview response */
export interface CitationsOverviewResponse extends CitationsOverview {
  meta: {
    cacheAge: number;
    lastUpdated: string;
    dataFreshness: 'live' | 'cached' | 'pending';
  };
}

/** Citations list response */
export interface CitationsListResponse {
  citations: CitationItem[];
  total: number;
  hasMore: boolean;
  meta: {
    cacheAge: number;
    lastUpdated: string;
    dataFreshness: 'live' | 'cached' | 'pending';
  };
}

/** Single citation detail response */
export interface CitationDetailResponse extends CitationDetail {
  meta: {
    cacheAge: number;
    lastUpdated: string;
  };
}
