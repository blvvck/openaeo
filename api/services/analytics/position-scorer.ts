/**
 * Position Scorer
 *
 * Calculates position scores for brand mentions in LLM responses.
 * Higher scores indicate more prominent placement.
 *
 * Factors:
 * - Position in response (early = higher)
 * - Prominence (heading vs body, recommendation vs mention)
 * - Context (positive framing, first recommendation, etc.)
 */

export interface PositionScore {
  /** Overall position score (0-100) */
  score: number;
  /** Breakdown of score components */
  breakdown: {
    /** Score from position in text (0-40) */
    positionScore: number;
    /** Score from prominence/context (0-30) */
    prominenceScore: number;
    /** Score from recommendation status (0-30) */
    recommendationScore: number;
  };
  /** Position details */
  details: {
    /** First mention position (0-1, lower = earlier) */
    firstMentionPosition: number;
    /** Total mentions in response */
    mentionCount: number;
    /** Whether brand is in first paragraph */
    inFirstParagraph: boolean;
    /** Whether brand appears in a heading/title context */
    inHeading: boolean;
    /** Whether brand is explicitly recommended */
    isRecommended: boolean;
    /** Whether brand is listed first among alternatives */
    isFirstChoice: boolean;
  };
}

export interface PositionAnalysis {
  brand: string;
  positionScore: PositionScore;
  competitorScores: Array<{
    name: string;
    score: PositionScore;
  }>;
  ranking: {
    brandRank: number;
    totalCompetitors: number;
  };
}

// Patterns that indicate recommendation
const RECOMMENDATION_PATTERNS = [
  /\brecommend(?:ed|s|ing)?\b/i,
  /\bbest\s+(?:choice|option|pick)\b/i,
  /\btop\s+(?:choice|option|pick|recommendation)\b/i,
  /\bgo[\s-]?to\s+(?:choice|option|solution)\b/i,
  /\bpreferred\b/i,
  /\bmy\s+(?:top\s+)?(?:choice|pick|recommendation)\b/i,
  /\bi(?:'d|\s+would)\s+(?:suggest|recommend)\b/i,
  /\bstanding\s+out\b/i,
  /\bleading\s+(?:choice|option|solution)\b/i,
];

// Patterns that indicate first/primary position in a list
const FIRST_POSITION_PATTERNS = [
  /^(?:\d+\.?\s*|[-•*]\s*)/m, // List item at start
  /\bfirst(?:ly)?\b/i,
  /\bprimarily\b/i,
  /\bmost\s+importantly\b/i,
];

// Heading indicators
const HEADING_PATTERNS = [
  /^#{1,6}\s+.*$/m, // Markdown headings
  /\*\*[^*]+\*\*/,  // Bold text (often used as pseudo-headings)
  /^[A-Z][^.!?]*:$/m, // Title case followed by colon
];

/**
 * Find all positions of a term in text (case-insensitive)
 */
function findMentionPositions(text: string, term: string): number[] {
  const positions: number[] = [];
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  let index = 0;

  while ((index = lowerText.indexOf(lowerTerm, index)) !== -1) {
    positions.push(index);
    index += lowerTerm.length;
  }

  return positions;
}

/**
 * Check if term appears in first paragraph
 */
function isInFirstParagraph(text: string, term: string): boolean {
  const paragraphs = text.split(/\n\n+/);
  if (paragraphs.length === 0) return false;

  const firstPara = paragraphs[0].toLowerCase();
  return firstPara.includes(term.toLowerCase());
}

/**
 * Check if term appears in a heading context
 */
function isInHeading(text: string, term: string): boolean {
  const lowerTerm = term.toLowerCase();

  for (const pattern of HEADING_PATTERNS) {
    const matches = text.match(new RegExp(pattern, 'gm')) || [];
    for (const match of matches) {
      if (match.toLowerCase().includes(lowerTerm)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if term is explicitly recommended
 */
function isRecommended(text: string, term: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();

  // Check if recommendation patterns appear near the term
  for (const pattern of RECOMMENDATION_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      // Check if recommendation is within ~100 chars of term mention
      for (const match of matches) {
        const matchIndex = lowerText.indexOf(match.toLowerCase());
        const termPositions = findMentionPositions(text, term);

        for (const termPos of termPositions) {
          if (Math.abs(matchIndex - termPos) < 150) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Check if term is listed first among alternatives
 */
function isFirstInList(text: string, term: string, competitors: string[]): boolean {
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();

  // Find the first mention of the term
  const termIndex = lowerText.indexOf(lowerTerm);
  if (termIndex === -1) return false;

  // Check if any competitor appears before the term in the same context
  for (const competitor of competitors) {
    const compIndex = lowerText.indexOf(competitor.toLowerCase());
    if (compIndex !== -1 && compIndex < termIndex) {
      // Check if they're in the same paragraph/section
      const textBetween = text.substring(compIndex, termIndex);
      if (!textBetween.includes('\n\n')) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Calculate position score for an entity
 */
export function calculatePositionScore(
  text: string,
  entity: string,
  competitors: string[] = []
): PositionScore {
  const positions = findMentionPositions(text, entity);

  if (positions.length === 0) {
    return {
      score: 0,
      breakdown: {
        positionScore: 0,
        prominenceScore: 0,
        recommendationScore: 0,
      },
      details: {
        firstMentionPosition: 1,
        mentionCount: 0,
        inFirstParagraph: false,
        inHeading: false,
        isRecommended: false,
        isFirstChoice: false,
      },
    };
  }

  // Position score (0-40): Based on how early the first mention appears
  const firstPosition = positions[0] / text.length;
  const positionScore = Math.round((1 - firstPosition) * 40);

  // Prominence score (0-30): Based on heading presence, first paragraph, mention count
  let prominenceScore = 0;
  const inFirstParagraph = isInFirstParagraph(text, entity);
  const inHeading = isInHeading(text, entity);

  if (inFirstParagraph) prominenceScore += 10;
  if (inHeading) prominenceScore += 10;
  prominenceScore += Math.min(10, positions.length * 2); // Up to 10 for multiple mentions

  // Recommendation score (0-30): Based on recommendation context
  let recommendationScore = 0;
  const recommended = isRecommended(text, entity);
  const firstChoice = isFirstInList(text, entity, competitors);

  if (recommended) recommendationScore += 20;
  if (firstChoice) recommendationScore += 10;

  const totalScore = positionScore + prominenceScore + recommendationScore;

  return {
    score: Math.min(100, totalScore),
    breakdown: {
      positionScore,
      prominenceScore,
      recommendationScore,
    },
    details: {
      firstMentionPosition: Math.round(firstPosition * 100) / 100,
      mentionCount: positions.length,
      inFirstParagraph,
      inHeading,
      isRecommended: recommended,
      isFirstChoice: firstChoice,
    },
  };
}

/**
 * Analyze position for brand and competitors
 */
export function analyzePosition(
  text: string,
  brand: string,
  competitors: string[] = []
): PositionAnalysis {
  const brandScore = calculatePositionScore(text, brand, competitors);

  const competitorScores = competitors.map((name) => ({
    name,
    score: calculatePositionScore(text, name, [brand, ...competitors.filter(c => c !== name)]),
  }));

  // Calculate ranking
  const allScores = [
    { name: brand, score: brandScore.score },
    ...competitorScores.map((c) => ({ name: c.name, score: c.score.score })),
  ].sort((a, b) => b.score - a.score);

  const brandRank = allScores.findIndex((s) => s.name === brand) + 1;

  return {
    brand,
    positionScore: brandScore,
    competitorScores,
    ranking: {
      brandRank: brandScore.score > 0 ? brandRank : 0,
      totalCompetitors: competitorScores.filter((c) => c.score.score > 0).length + (brandScore.score > 0 ? 1 : 0),
    },
  };
}

/**
 * Get a simple position score (0-100) for quick analysis
 */
export function getSimplePositionScore(text: string, entity: string): number {
  return calculatePositionScore(text, entity).score;
}
