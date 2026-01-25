/**
 * Sentiment Analysis Components
 *
 * UI components for visualizing sentiment data from AI platform responses.
 */

// Components
export { SentimentBar, MiniSentimentBar } from './SentimentBar';
export { SentimentPill, SentimentBadge, SentimentPillGroup } from './SentimentPill';
export { SentimentTrend, SentimentSparkline } from './SentimentTrend';
export { QuoteCard, CompactQuoteCard } from './QuoteCard';

// Types
export type {
  Platform,
  SentimentCategory,
  SentimentDistribution,
  SentimentDataPoint,
  SentimentKeyword,
  SentimentQuote,
  SentimentSummary,
} from './types';

// Utilities
export {
  PLATFORM_INFO,
  getSentimentCategory,
  getSentimentColor,
  getSentimentTextClass,
  getSentimentBgClass,
} from './types';
