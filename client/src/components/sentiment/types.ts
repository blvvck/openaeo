/**
 * Sentiment Analysis Types
 *
 * Types for sentiment visualization components.
 */

/** Platform type (reusing from citations) */
export type Platform = 'chatgpt' | 'claude' | 'perplexity' | 'gemini' | 'grok' | 'deepseek';

/** Sentiment category */
export type SentimentCategory = 'positive' | 'neutral' | 'negative';

/** Sentiment distribution */
export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
}

/** Sentiment data point for timeline */
export interface SentimentDataPoint {
  date: string;
  score: number;
  positive?: number;
  neutral?: number;
  negative?: number;
}

/** Keyword with sentiment */
export interface SentimentKeyword {
  keyword: string;
  score: number; // -1 to 1
  count?: number;
}

/** Quote/response with sentiment analysis */
export interface SentimentQuote {
  id: number;
  text: string;
  keywords: SentimentKeyword[];
  platform: Platform;
  date: string;
  overallScore: number;
}

/** Sentiment summary for a period */
export interface SentimentSummary {
  overall: number; // -1 to 1
  distribution: SentimentDistribution;
  trend: 'improving' | 'stable' | 'declining';
  topPositive: SentimentKeyword[];
  topNegative: SentimentKeyword[];
}

/** Platform display info */
export const PLATFORM_INFO: Record<Platform, { label: string; color: string }> = {
  chatgpt: { label: 'ChatGPT', color: '#10A37F' },
  claude: { label: 'Claude', color: '#D97706' },
  perplexity: { label: 'Perplexity', color: '#6366F1' },
  gemini: { label: 'Gemini', color: '#4285F4' },
  grok: { label: 'Grok', color: '#000000' },
  deepseek: { label: 'DeepSeek', color: '#2563EB' },
};

/**
 * Get sentiment category from score
 */
export function getSentimentCategory(score: number): SentimentCategory {
  if (score > 0.3) return 'positive';
  if (score < -0.3) return 'negative';
  return 'neutral';
}

/**
 * Get sentiment color based on score
 */
export function getSentimentColor(score: number): string {
  if (score > 0.3) return 'hsl(var(--success))';
  if (score < -0.3) return 'hsl(var(--destructive))';
  return 'hsl(var(--muted-foreground))';
}

/**
 * Get sentiment text color class
 */
export function getSentimentTextClass(score: number): string {
  if (score > 0.3) return 'text-success';
  if (score < -0.3) return 'text-destructive';
  return 'text-muted-foreground';
}

/**
 * Get sentiment background class
 */
export function getSentimentBgClass(score: number): string {
  if (score > 0.3) return 'bg-success/10';
  if (score < -0.3) return 'bg-destructive/10';
  return 'bg-muted';
}
