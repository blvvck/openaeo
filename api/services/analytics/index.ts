/**
 * Analytics Services Exports
 */

export {
  analyzeTieredSentiment,
  getSimpleSentiment,
  compareSentiments,
  type SentimentScore,
  type SentimentResult,
  type KeyPhrase,
  type ParagraphSentiment,
  type EntitySentiment,
  type TieredSentimentAnalysis,
} from './sentiment-analyzer';

export {
  calculatePositionScore,
  analyzePosition,
  getSimplePositionScore,
  type PositionScore,
  type PositionAnalysis,
} from './position-scorer';

export {
  calculateVisibilityScore,
  getSimpleVisibilityScore,
  compareVisibility,
  PLATFORMS,
  type Platform,
  type PlatformVisibility,
  type VisibilityBreakdown,
  type VisibilityScore,
  type ResponseData,
} from './visibility-calculator';

export {
  extractCitations,
  aggregateBydomain,
  filterBrandCitations,
  analyzeCitations,
  getDomainInfluence,
  type Citation,
  type DomainInfluence,
  type CitationAnalysis,
} from './citation-tracker';

export {
  calculateTrend,
  compareperiods,
  getSimpleTrend,
  getPresetRange,
  getDefaultInterval,
  fillMissingDates,
  type TimeInterval,
  type TrendDirection,
  type TimePreset,
  type DataPoint,
  type TrendDataPoint,
  type TrendAnalysis,
  type TrendResult,
} from './trend-calculator';

export {
  detectCompetitors,
  compareCompetitors,
  analyzeCompetitors,
  type DetectedCompetitor,
  type CompetitorComparison,
  type CompetitorAnalysis,
} from './competitor-detector';

export {
  generateInsights,
  getTopInsights,
  type InsightSeverity,
  type InsightCategory,
  type Insight,
  type InsightsAnalysis,
  type ResponseWithMetrics,
} from './insights-generator';

export {
  generateAliases,
  createBrandConfig,
  findBrandMentions,
  isBrandMentioned,
  countBrandMentions,
  mergeConfigs,
  type BrandAlias,
  type BrandConfig,
  type MentionMatch,
} from './brand-alias';

export {
  scoreResponseQuality,
  shouldIncludeResponse,
  filterByQuality,
  getQualitySummary,
  type QualityLevel,
  type QualityIssue,
  type QualityScore,
} from './response-quality';
