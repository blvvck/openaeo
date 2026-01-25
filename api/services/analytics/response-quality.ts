/**
 * Response Quality Scorer
 *
 * Evaluates LLM response quality to determine if responses should be
 * included in analytics calculations. Detects:
 * - Too short responses
 * - Refusals to answer
 * - Excessive hedging
 * - Off-topic responses
 * - Technical errors
 */

export type QualityLevel = 'good' | 'acceptable' | 'poor' | 'excluded';
export type QualityIssue =
  | 'too_short'
  | 'refusal'
  | 'hedging'
  | 'off_topic'
  | 'technical_error'
  | 'no_content'
  | 'repetitive'
  | 'truncated';

export interface QualityScore {
  /** Overall quality level */
  level: QualityLevel;
  /** Numeric score (0-100) */
  score: number;
  /** Whether to include in metrics calculations */
  includeInMetrics: boolean;
  /** Detected issues */
  issues: QualityIssue[];
  /** Detailed breakdown */
  breakdown: {
    lengthScore: number;      // 0-25
    contentScore: number;     // 0-25
    relevanceScore: number;   // 0-25
    structureScore: number;   // 0-25
  };
  /** Human-readable reason if excluded */
  reason?: string;
}

// Minimum acceptable response length (characters)
const MIN_LENGTH = 100;
const IDEAL_MIN_LENGTH = 250;

// Refusal patterns
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

// Hedging patterns
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

// Off-topic indicators
const OFF_TOPIC_PATTERNS = [
  /(?:unrelated|off.?topic|not relevant)/i,
  /(?:i|let me) (?:change|switch|redirect)/i,
  /(?:back to|returning to) (?:the|your) (?:question|topic)/i,
];

// Technical error patterns
const ERROR_PATTERNS = [
  /error (?:occurred|happened)/i,
  /something went wrong/i,
  /(?:unable|failed) to (?:process|complete|generate)/i,
  /request (?:timed out|failed)/i,
  /internal (?:error|issue)/i,
  /try again later/i,
];

// Truncation indicators
const TRUNCATION_PATTERNS = [
  /\.{3,}$/,  // Trailing ellipsis
  /(?:continued|continues|to be continued)/i,
  /(?:the rest|remaining)/i,
  /(?:cut off|truncated)/i,
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
  // Check first 500 chars where refusals typically appear
  const startText = text.slice(0, 500);
  return countPatternMatches(startText, REFUSAL_PATTERNS) >= 1;
}

/**
 * Calculate hedging level (0-1)
 */
function calculateHedgingLevel(text: string): number {
  const hedgingCount = countPatternMatches(text, HEDGING_PATTERNS);
  const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim()).length;

  if (sentenceCount === 0) return 0;

  // Hedging ratio: count of hedging phrases per sentence
  const ratio = hedgingCount / sentenceCount;

  // Normalize to 0-1 (more than 0.5 hedging per sentence = high hedging)
  return Math.min(1, ratio * 2);
}

/**
 * Calculate length score (0-25)
 */
function calculateLengthScore(text: string): { score: number; issue?: QualityIssue } {
  const length = text.trim().length;

  if (length < 50) {
    return { score: 0, issue: 'too_short' };
  }
  if (length < MIN_LENGTH) {
    return { score: 10, issue: 'too_short' };
  }
  if (length < IDEAL_MIN_LENGTH) {
    return { score: 18 };
  }

  return { score: 25 };
}

/**
 * Calculate content quality score (0-25)
 */
function calculateContentScore(text: string): { score: number; issues: QualityIssue[] } {
  const issues: QualityIssue[] = [];
  let score = 25;

  // Check for refusal
  if (detectRefusal(text)) {
    issues.push('refusal');
    score -= 20;
  }

  // Check for errors
  if (countPatternMatches(text, ERROR_PATTERNS) >= 1) {
    issues.push('technical_error');
    score -= 15;
  }

  // Check for truncation
  if (countPatternMatches(text, TRUNCATION_PATTERNS) >= 1) {
    issues.push('truncated');
    score -= 5;
  }

  // Check for no real content
  const words = text.split(/\s+/).filter(w => w.length > 2);
  if (words.length < 20) {
    issues.push('no_content');
    score -= 10;
  }

  return { score: Math.max(0, score), issues };
}

/**
 * Calculate relevance score (0-25)
 */
function calculateRelevanceScore(text: string): { score: number; issues: QualityIssue[] } {
  const issues: QualityIssue[] = [];
  let score = 25;

  // Check hedging level
  const hedgingLevel = calculateHedgingLevel(text);
  if (hedgingLevel > 0.6) {
    issues.push('hedging');
    score -= Math.round(hedgingLevel * 15);
  }

  // Check for off-topic
  if (countPatternMatches(text, OFF_TOPIC_PATTERNS) >= 1) {
    issues.push('off_topic');
    score -= 10;
  }

  return { score: Math.max(0, score), issues };
}

/**
 * Calculate structure score (0-25)
 */
function calculateStructureScore(text: string): { score: number; issues: QualityIssue[] } {
  const issues: QualityIssue[] = [];
  let score = 25;

  // Check for repetitive content
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));

  if (sentences.length > 3 && uniqueSentences.size < sentences.length * 0.7) {
    issues.push('repetitive');
    score -= 10;
  }

  // Check for proper structure (paragraphs, lists, etc.)
  const hasParagraphs = text.includes('\n\n');
  const hasList = /(?:^|\n)[•\-\d]\s/m.test(text);

  if (!hasParagraphs && !hasList && text.length > 500) {
    // Long response with no structure
    score -= 5;
  }

  return { score: Math.max(0, score), issues };
}

/**
 * Determine quality level from score
 */
function getQualityLevel(score: number, issues: QualityIssue[]): QualityLevel {
  // Immediate exclusions
  if (issues.includes('refusal') || issues.includes('technical_error')) {
    return 'excluded';
  }

  if (score >= 80) return 'good';
  if (score >= 60) return 'acceptable';
  if (score >= 40) return 'poor';
  return 'excluded';
}

/**
 * Determine if response should be included in metrics
 */
function shouldIncludeInMetrics(level: QualityLevel, issues: QualityIssue[]): boolean {
  if (level === 'excluded') return false;
  if (issues.includes('refusal')) return false;
  if (issues.includes('technical_error')) return false;
  if (issues.includes('no_content')) return false;

  return true;
}

/**
 * Generate human-readable reason for exclusion
 */
function generateReason(issues: QualityIssue[]): string | undefined {
  if (issues.length === 0) return undefined;

  const reasons: Record<QualityIssue, string> = {
    too_short: 'Response too short to analyze',
    refusal: 'LLM refused to answer the question',
    hedging: 'Response contains excessive hedging',
    off_topic: 'Response appears off-topic',
    technical_error: 'Technical error in response',
    no_content: 'Response lacks meaningful content',
    repetitive: 'Response contains repetitive content',
    truncated: 'Response appears truncated',
  };

  const primaryIssue = issues[0];
  return reasons[primaryIssue];
}

/**
 * Score response quality
 */
export function scoreResponseQuality(text: string): QualityScore {
  // Calculate individual scores
  const lengthResult = calculateLengthScore(text);
  const contentResult = calculateContentScore(text);
  const relevanceResult = calculateRelevanceScore(text);
  const structureResult = calculateStructureScore(text);

  // Collect all issues
  const issues: QualityIssue[] = [
    ...(lengthResult.issue ? [lengthResult.issue] : []),
    ...contentResult.issues,
    ...relevanceResult.issues,
    ...structureResult.issues,
  ];

  // Calculate total score
  const totalScore = lengthResult.score + contentResult.score +
    relevanceResult.score + structureResult.score;

  // Determine quality level
  const level = getQualityLevel(totalScore, issues);

  // Determine if should include in metrics
  const includeInMetrics = shouldIncludeInMetrics(level, issues);

  return {
    level,
    score: totalScore,
    includeInMetrics,
    issues,
    breakdown: {
      lengthScore: lengthResult.score,
      contentScore: contentResult.score,
      relevanceScore: relevanceResult.score,
      structureScore: structureResult.score,
    },
    reason: includeInMetrics ? undefined : generateReason(issues),
  };
}

/**
 * Quick check if response should be included
 */
export function shouldIncludeResponse(text: string): boolean {
  return scoreResponseQuality(text).includeInMetrics;
}

/**
 * Filter responses by quality
 */
export function filterByQuality<T extends { text: string }>(
  responses: T[],
  minLevel: QualityLevel = 'acceptable'
): T[] {
  const levelOrder: QualityLevel[] = ['excluded', 'poor', 'acceptable', 'good'];
  const minIndex = levelOrder.indexOf(minLevel);

  return responses.filter(r => {
    const quality = scoreResponseQuality(r.text);
    return levelOrder.indexOf(quality.level) >= minIndex;
  });
}

/**
 * Get quality summary for a batch of responses
 */
export function getQualitySummary(responses: Array<{ text: string }>): {
  total: number;
  good: number;
  acceptable: number;
  poor: number;
  excluded: number;
  includedPercentage: number;
  commonIssues: Array<{ issue: QualityIssue; count: number }>;
} {
  const counts = { good: 0, acceptable: 0, poor: 0, excluded: 0 };
  const issueCounts = new Map<QualityIssue, number>();

  for (const response of responses) {
    const quality = scoreResponseQuality(response.text);
    counts[quality.level]++;

    for (const issue of quality.issues) {
      issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1);
    }
  }

  const included = counts.good + counts.acceptable + counts.poor;

  return {
    total: responses.length,
    ...counts,
    includedPercentage: responses.length > 0
      ? Math.round((included / responses.length) * 100)
      : 0,
    commonIssues: Array.from(issueCounts.entries())
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count),
  };
}
