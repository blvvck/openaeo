/**
 * Quality Scoring Service
 *
 * S088: Quality score calculation service with configurable weights
 * S089: Response grading (accuracy, relevance, recency, completeness)
 *
 * Extends the existing response-quality.ts with database persistence
 * and configurable scoring weights.
 */

import { prisma } from '../../prisma';
import { currentWorkspaceId } from '../../context/workspace-context';
import type { ResponseQualityScore, QualityLevelType } from '@shared/schema';

function workspaceId(): string {
  const id = currentWorkspaceId();
  if (!id) throw new Error('Workspace context is required for data access');
  return id;
}

function mapScore(row: Record<string, unknown>): ResponseQualityScore {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
    value,
  ])) as ResponseQualityScore;
}

/** Quality issue types */
export type QualityIssue =
  | 'too_short'
  | 'refusal'
  | 'hedging'
  | 'off_topic'
  | 'technical_error'
  | 'no_content'
  | 'repetitive'
  | 'truncated'
  | 'outdated'
  | 'incomplete'
  | 'inaccurate';

/** Configuration for quality scoring weights */
export interface QualityScoringConfig {
  /** Weight for accuracy dimension (0-1, should sum to 1) */
  accuracyWeight: number;
  /** Weight for relevance dimension */
  relevanceWeight: number;
  /** Weight for recency dimension */
  recencyWeight: number;
  /** Weight for completeness dimension */
  completenessWeight: number;
  /** Minimum length for responses */
  minLength: number;
  /** Ideal minimum length for full scores */
  idealMinLength: number;
  /** Threshold for 'good' quality */
  goodThreshold: number;
  /** Threshold for 'acceptable' quality */
  acceptableThreshold: number;
  /** Threshold for 'poor' quality (below this is excluded) */
  poorThreshold: number;
}

/** Default scoring configuration */
export const DEFAULT_SCORING_CONFIG: QualityScoringConfig = {
  accuracyWeight: 0.25,
  relevanceWeight: 0.25,
  recencyWeight: 0.25,
  completenessWeight: 0.25,
  minLength: 100,
  idealMinLength: 250,
  goodThreshold: 80,
  acceptableThreshold: 60,
  poorThreshold: 40,
};

/** Scoring result for a single response */
export interface QualityScoringResult {
  overallScore: number;
  qualityLevel: QualityLevelType;
  accuracyScore: number;
  relevanceScore: number;
  recencyScore: number;
  completenessScore: number;
  issues: QualityIssue[];
  includeInMetrics: boolean;
  exclusionReason?: string;
}

// Pattern definitions for quality detection
const REFUSAL_PATTERNS = [
  /i (?:cannot|can't|won't|will not|am not able to) (?:provide|give|offer|make|share)/i,
  /i'm (?:not able|unable) to (?:provide|answer|help|assist)/i,
  /(?:sorry|unfortunately),? (?:i|but i) (?:cannot|can't)/i,
  /i (?:don't|do not) have (?:information|data|access)/i,
  /(?:as an ai|i'm an ai),? i (?:cannot|can't|don't)/i,
  /(?:i'?m )?not (?:able|capable|equipped) to/i,
  /(?:that's|this is) (?:outside|beyond) (?:my|the scope)/i,
  /i must decline/i,
  /against (?:my|our) (?:policy|policies|guidelines)/i,
];

const HEDGING_PATTERNS = [
  /i'm not (?:sure|certain)/i,
  /(?:i|it) (?:may|might|could) be/i,
  /it's (?:hard|difficult) to say/i,
  /(?:possibly|perhaps|maybe)/i,
  /i (?:think|believe|suppose) (?:that )?(?:maybe|perhaps)/i,
  /(?:generally|typically|usually) speaking/i,
  /in (?:some|certain|many) cases/i,
  /(?:it )?depends on/i,
  /(?:hard|difficult) to (?:determine|know|say)/i,
];

const ERROR_PATTERNS = [
  /error (?:occurred|happened)/i,
  /something went wrong/i,
  /(?:unable|failed) to (?:process|complete|generate)/i,
  /request (?:timed out|failed)/i,
  /internal (?:error|issue)/i,
  /try again later/i,
];

const TRUNCATION_PATTERNS = [
  /\.{3,}$/,
  /(?:continued|continues|to be continued)/i,
  /(?:the rest|remaining)/i,
  /(?:cut off|truncated)/i,
];

const OUTDATED_PATTERNS = [
  /as of (?:my|the) (?:last|knowledge) (?:update|cutoff)/i,
  /(?:in|as of) (?:2022|2021|2020|2019|earlier)/i,
  /(?:i )?(?:don't|do not) have (?:access to )?(?:real.?time|current|latest)/i,
  /my (?:training|knowledge) (?:data|cutoff)/i,
];

/**
 * Count pattern matches in text
 */
function countPatternMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => {
    const matches = text.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);
}

/**
 * Check if response is a refusal
 */
function detectRefusal(text: string): boolean {
  const startText = text.slice(0, 500);
  return countPatternMatches(startText, REFUSAL_PATTERNS) >= 1;
}

/**
 * Calculate hedging level (0-1)
 */
function calculateHedgingLevel(text: string): number {
  const hedgingCount = countPatternMatches(text, HEDGING_PATTERNS);
  const sentenceCount = text.split(/[.!?]+/).filter((s) => s.trim()).length;

  if (sentenceCount === 0) return 0;
  const ratio = hedgingCount / sentenceCount;
  return Math.min(1, ratio * 2);
}

/**
 * Quality Scorer Class
 */
export class QualityScorer {
  private static instance: QualityScorer | null = null;
  private config: QualityScoringConfig;

  constructor(config: Partial<QualityScoringConfig> = {}) {
    this.config = { ...DEFAULT_SCORING_CONFIG, ...config };
  }

  static getInstance(config?: Partial<QualityScoringConfig>): QualityScorer {
    if (!QualityScorer.instance) {
      QualityScorer.instance = new QualityScorer(config);
    }
    return QualityScorer.instance;
  }

  /**
   * Update scoring configuration
   */
  updateConfig(config: Partial<QualityScoringConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): QualityScoringConfig {
    return { ...this.config };
  }

  // ==================== Score Calculations (S089) ====================

  /**
   * Calculate accuracy score (0-25)
   * Evaluates factual correctness indicators
   */
  private calculateAccuracyScore(
    text: string,
    promptText?: string
  ): { score: number; issues: QualityIssue[] } {
    const issues: QualityIssue[] = [];
    let score = 25;

    // Check for hedging (reduces confidence in accuracy)
    const hedgingLevel = calculateHedgingLevel(text);
    if (hedgingLevel > 0.4) {
      issues.push('hedging');
      score -= Math.round(hedgingLevel * 10);
    }

    // Check for technical errors
    if (countPatternMatches(text, ERROR_PATTERNS) >= 1) {
      issues.push('technical_error');
      score -= 15;
    }

    // Check for refusal (can't verify accuracy of refused response)
    if (detectRefusal(text)) {
      issues.push('refusal');
      score -= 20;
    }

    // Bonus for citations/references (indicates verifiable info)
    const urlPattern = /https?:\/\/\S+/gi;
    const urlCount = (text.match(urlPattern) || []).length;
    if (urlCount > 0) {
      score = Math.min(25, score + Math.min(5, urlCount));
    }

    return { score: Math.max(0, score), issues };
  }

  /**
   * Calculate relevance score (0-25)
   * Evaluates how relevant the response is to the prompt
   */
  private calculateRelevanceScore(
    text: string,
    promptText?: string
  ): { score: number; issues: QualityIssue[] } {
    const issues: QualityIssue[] = [];
    let score = 25;

    // Check for off-topic indicators
    const offTopicPatterns = [
      /(?:unrelated|off.?topic|not relevant)/i,
      /(?:i|let me) (?:change|switch|redirect)/i,
      /(?:back to|returning to) (?:the|your) (?:question|topic)/i,
    ];

    if (countPatternMatches(text, offTopicPatterns) >= 1) {
      issues.push('off_topic');
      score -= 15;
    }

    // If prompt is provided, check for keyword overlap
    if (promptText) {
      const promptKeywords = promptText
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3);
      const responseWords = text.toLowerCase().split(/\W+/);
      const overlap = promptKeywords.filter((k) => responseWords.includes(k));
      const overlapRate = promptKeywords.length > 0 ? overlap.length / promptKeywords.length : 0;

      if (overlapRate < 0.2) {
        // Low keyword overlap
        score -= 10;
      } else if (overlapRate > 0.5) {
        // High keyword overlap (bonus)
        score = Math.min(25, score + 3);
      }
    }

    return { score: Math.max(0, score), issues };
  }

  /**
   * Calculate recency score (0-25)
   * Evaluates how up-to-date the information appears
   */
  private calculateRecencyScore(text: string): { score: number; issues: QualityIssue[] } {
    const issues: QualityIssue[] = [];
    let score = 25;

    // Check for outdated indicators
    if (countPatternMatches(text, OUTDATED_PATTERNS) >= 1) {
      issues.push('outdated');
      score -= 15;
    }

    // Check for recent date mentions (bonus)
    const currentYear = new Date().getFullYear();
    const recentYearPattern = new RegExp(`\\b(${currentYear}|${currentYear - 1})\\b`, 'g');
    const recentMentions = (text.match(recentYearPattern) || []).length;
    if (recentMentions > 0) {
      score = Math.min(25, score + Math.min(5, recentMentions));
    }

    return { score: Math.max(0, score), issues };
  }

  /**
   * Calculate completeness score (0-25)
   * Evaluates how comprehensive the response is
   */
  private calculateCompletenessScore(text: string): { score: number; issues: QualityIssue[] } {
    const issues: QualityIssue[] = [];
    let score = 25;

    const length = text.trim().length;

    // Length checks
    if (length < 50) {
      issues.push('too_short');
      score = 0;
    } else if (length < this.config.minLength) {
      issues.push('too_short');
      score = 10;
    } else if (length < this.config.idealMinLength) {
      score = 18;
    }

    // Check for truncation
    if (countPatternMatches(text, TRUNCATION_PATTERNS) >= 1) {
      issues.push('truncated');
      score -= 5;
    }

    // Check for no real content
    const words = text.split(/\s+/).filter((w) => w.length > 2);
    if (words.length < 20) {
      if (!issues.includes('too_short')) {
        issues.push('no_content');
      }
      score -= 10;
    }

    // Check structure (paragraphs, lists = more complete)
    const hasParagraphs = text.includes('\n\n');
    const hasList = /(?:^|\n)[•\-\d]\s/m.test(text);
    if (!hasParagraphs && !hasList && text.length > 500) {
      issues.push('incomplete');
      score -= 5;
    }

    // Check for repetitive content
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    const uniqueSentences = new Set(sentences.map((s) => s.trim().toLowerCase()));
    if (sentences.length > 3 && uniqueSentences.size < sentences.length * 0.7) {
      issues.push('repetitive');
      score -= 10;
    }

    return { score: Math.max(0, score), issues };
  }

  /**
   * Score a response and return the full result
   */
  scoreResponse(responseText: string, promptText?: string): QualityScoringResult {
    const accuracy = this.calculateAccuracyScore(responseText, promptText);
    const relevance = this.calculateRelevanceScore(responseText, promptText);
    const recency = this.calculateRecencyScore(responseText);
    const completeness = this.calculateCompletenessScore(responseText);

    // Collect all issues
    const issues: QualityIssue[] = [
      ...accuracy.issues,
      ...relevance.issues,
      ...recency.issues,
      ...completeness.issues,
    ];

    // Calculate weighted overall score
    const overallScore = Math.round(
      accuracy.score * this.config.accuracyWeight * 4 +
        relevance.score * this.config.relevanceWeight * 4 +
        recency.score * this.config.recencyWeight * 4 +
        completeness.score * this.config.completenessWeight * 4
    );

    // Determine quality level
    let qualityLevel: QualityLevelType;
    if (issues.includes('refusal') || issues.includes('technical_error')) {
      qualityLevel = 'excluded';
    } else if (overallScore >= this.config.goodThreshold) {
      qualityLevel = 'good';
    } else if (overallScore >= this.config.acceptableThreshold) {
      qualityLevel = 'acceptable';
    } else if (overallScore >= this.config.poorThreshold) {
      qualityLevel = 'poor';
    } else {
      qualityLevel = 'excluded';
    }

    // Determine if should be included in metrics
    const includeInMetrics =
      qualityLevel !== 'excluded' &&
      !issues.includes('refusal') &&
      !issues.includes('technical_error') &&
      !issues.includes('no_content');

    // Generate exclusion reason if needed
    let exclusionReason: string | undefined;
    if (!includeInMetrics) {
      const reasonMap: Record<QualityIssue, string> = {
        too_short: 'Response too short to analyze',
        refusal: 'LLM refused to answer the question',
        hedging: 'Response contains excessive hedging',
        off_topic: 'Response appears off-topic',
        technical_error: 'Technical error in response',
        no_content: 'Response lacks meaningful content',
        repetitive: 'Response contains repetitive content',
        truncated: 'Response appears truncated',
        outdated: 'Response contains outdated information',
        incomplete: 'Response is incomplete',
        inaccurate: 'Response appears inaccurate',
      };
      exclusionReason = issues.length > 0 ? reasonMap[issues[0]] : 'Quality below threshold';
    }

    return {
      overallScore,
      qualityLevel,
      accuracyScore: accuracy.score,
      relevanceScore: relevance.score,
      recencyScore: recency.score,
      completenessScore: completeness.score,
      issues,
      includeInMetrics,
      exclusionReason,
    };
  }

  // ==================== Database Operations (S088) ====================

  /**
   * Score a response and save to database
   */
  async scoreAndSave(
    responseId: number,
    responseText: string,
    promptText?: string
  ): Promise<ResponseQualityScore> {
    const result = this.scoreResponse(responseText, promptText);

    const workspace_id = workspaceId();
    const response = await prisma.responses.findFirst({ where: { id: responseId, workspace_id }, select: { id: true } });
    if (!response) throw new Error('Response not found in this workspace');
    const data = {
      workspace_id,
      response_id: responseId,
      overall_score: result.overallScore,
      quality_level: result.qualityLevel,
      accuracy_score: result.accuracyScore,
      relevance_score: result.relevanceScore,
      recency_score: result.recencyScore,
      completeness_score: result.completenessScore,
      issues: result.issues,
      include_in_metrics: result.includeInMetrics,
      exclusion_reason: result.exclusionReason,
    };
    const created = await prisma.response_quality_scores.upsert({
      where: { response_id: responseId },
      create: data,
      update: Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'workspace_id')),
    });
    return mapScore(created);
  }

  /**
   * Get quality score for a response
   */
  async getScoreByResponseId(responseId: number): Promise<ResponseQualityScore | undefined> {
    const score = await prisma.response_quality_scores.findFirst({
      where: { response_id: responseId, workspace_id: workspaceId() },
    });
    return score ? mapScore(score) : undefined;
  }

  /**
   * Get all quality scores with pagination
   */
  async getScores(options: {
    limit?: number;
    offset?: number;
    qualityLevel?: QualityLevelType;
    includeInMetrics?: boolean;
  } = {}): Promise<ResponseQualityScore[]> {
    const { limit = 50, offset = 0, qualityLevel, includeInMetrics } = options;

    const rows = await prisma.response_quality_scores.findMany({
      where: {
        workspace_id: workspaceId(),
        ...(qualityLevel ? { quality_level: qualityLevel } : {}),
        ...(includeInMetrics !== undefined ? { include_in_metrics: includeInMetrics } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map(mapScore);
  }

  /**
   * Batch score multiple responses
   */
  async batchScore(
    responseIds: number[],
    fetchResponseText: (id: number) => Promise<{ text: string; promptText?: string } | null>
  ): Promise<ResponseQualityScore[]> {
    const results: ResponseQualityScore[] = [];

    for (const responseId of responseIds) {
      const data = await fetchResponseText(responseId);
      if (data) {
        const score = await this.scoreAndSave(responseId, data.text, data.promptText);
        results.push(score);
      }
    }

    return results;
  }

  /**
   * Get quality summary statistics
   */
  async getQualitySummary(options: {
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{
    total: number;
    good: number;
    acceptable: number;
    poor: number;
    excluded: number;
    avgOverallScore: number;
    avgAccuracyScore: number;
    avgRelevanceScore: number;
    avgRecencyScore: number;
    avgCompletenessScore: number;
    inclusionRate: number;
  }> {
    const { startDate, endDate } = options;

    const [result] = await prisma.$queryRaw<Array<{
      total: bigint;
      good: bigint;
      acceptable: bigint;
      poor: bigint;
      excluded: bigint;
      avgOverallScore: number | null;
      avgAccuracyScore: number | null;
      avgRelevanceScore: number | null;
      avgRecencyScore: number | null;
      avgCompletenessScore: number | null;
      included: bigint;
    }>>`
      SELECT count(*)::bigint AS total,
             count(*) FILTER (WHERE quality_level = 'good')::bigint AS good,
             count(*) FILTER (WHERE quality_level = 'acceptable')::bigint AS acceptable,
             count(*) FILTER (WHERE quality_level = 'poor')::bigint AS poor,
             count(*) FILTER (WHERE quality_level = 'excluded')::bigint AS excluded,
             avg(overall_score)::float8 AS "avgOverallScore",
             avg(accuracy_score)::float8 AS "avgAccuracyScore",
             avg(relevance_score)::float8 AS "avgRelevanceScore",
             avg(recency_score)::float8 AS "avgRecencyScore",
             avg(completeness_score)::float8 AS "avgCompletenessScore",
             count(*) FILTER (WHERE include_in_metrics = true)::bigint AS included
      FROM response_quality_scores
      WHERE workspace_id = ${workspaceId()}::uuid
        AND (${startDate ?? null}::timestamp IS NULL OR created_at >= ${startDate ?? null})
        AND (${endDate ?? null}::timestamp IS NULL OR created_at <= ${endDate ?? null})`;

    const total = Number(result.total) || 0;
    const included = Number(result.included) || 0;

    return {
      total,
      good: Number(result.good) || 0,
      acceptable: Number(result.acceptable) || 0,
      poor: Number(result.poor) || 0,
      excluded: Number(result.excluded) || 0,
      avgOverallScore: result.avgOverallScore || 0,
      avgAccuracyScore: result.avgAccuracyScore || 0,
      avgRelevanceScore: result.avgRelevanceScore || 0,
      avgRecencyScore: result.avgRecencyScore || 0,
      avgCompletenessScore: result.avgCompletenessScore || 0,
      inclusionRate: total > 0 ? (included / total) * 100 : 0,
    };
  }
}

/** Singleton getter */
let qualityScorer: QualityScorer | null = null;

export function getQualityScorer(config?: Partial<QualityScoringConfig>): QualityScorer {
  if (!qualityScorer) {
    qualityScorer = QualityScorer.getInstance(config);
  }
  return qualityScorer;
}
