/**
 * Competitor Detector
 *
 * Auto-detects competitors from LLM responses and provides
 * comparison metrics between brand and competitors.
 *
 * Uses compromise NLP for Named Entity Recognition with regex fallback.
 */

import nlp from 'compromise';

export interface DetectedCompetitor {
  /** Competitor name */
  name: string;
  /** Number of responses mentioning this competitor */
  mentionCount: number;
  /** Platforms where competitor appears */
  platforms: string[];
  /** Detection confidence (0-1) */
  confidence: number;
  /** How competitor was detected */
  source: 'auto-detected' | 'user-added';
  /** Whether competitor is active for tracking */
  isActive: boolean;
}

export interface CompetitorComparison {
  /** Brand being tracked */
  brand: string;
  /** Competitors being compared */
  competitors: Array<{
    name: string;
    visibilityScore: number;
    mentionRate: number;
    avgPosition: number;
    avgSentiment: number;
  }>;
  /** Overall ranking */
  ranking: Array<{
    name: string;
    rank: number;
    score: number;
    isBrand: boolean;
  }>;
  /** Brand's position in ranking */
  brandRank: number;
  /** Summary stats */
  summary: {
    totalCompetitors: number;
    brandScore: number;
    avgCompetitorScore: number;
    brandVsAverage: number;
  };
}

export interface CompetitorAnalysis {
  /** Detected competitors */
  detected: DetectedCompetitor[];
  /** Comparison if brand provided */
  comparison?: CompetitorComparison;
  /** Metadata */
  metadata: {
    responsesAnalyzed: number;
    uniqueEntitiesFound: number;
    analyzedAt: Date;
  };
}

// Common patterns that indicate competitor mentions
const COMPETITOR_PATTERNS = [
  /(?:compared to|vs\.?|versus|or|alternatively|like|similar to|such as|including)\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)/gi,
  /([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)\s+(?:is|are)\s+(?:also|another|a popular|a leading)/gi,
  /(?:options include|alternatives include|competitors include|other options)\s*[:\-]?\s*([A-Z][a-zA-Z0-9,\s]+)/gi,
];

// Words that look like names but aren't competitors
const EXCLUSION_LIST = new Set([
  // Common words that get capitalized
  'The', 'This', 'That', 'These', 'Those', 'They', 'Their', 'There',
  'When', 'Where', 'What', 'Which', 'While', 'With', 'Would', 'Will',
  'Some', 'Many', 'Most', 'Much', 'More', 'Less', 'Few', 'Several',
  'First', 'Second', 'Third', 'One', 'Two', 'Three',
  'Yes', 'No', 'Not', 'But', 'And', 'Or', 'For', 'From', 'Into',
  'Here', 'There', 'Now', 'Then', 'Today', 'Tomorrow',
  'You', 'Your', 'I', 'We', 'Our', 'My', 'It', 'Its',
  'Similar', 'Compared', 'Like', 'Unlike', 'However', 'Also',
  // Common tech/business words
  'API', 'SDK', 'UI', 'UX', 'AI', 'ML', 'SaaS', 'PaaS', 'IaaS',
  'Enterprise', 'Business', 'Professional', 'Premium', 'Free',
  'Open Source', 'Cloud', 'Server', 'Client', 'Web', 'Mobile',
  'Basic', 'Standard', 'Advanced', 'Pro', 'Plus', 'Lite',
  'CRM', 'ERP', 'CMS', 'LMS', 'SEO', 'B2B', 'B2C',
]);

/**
 * Check if a proper noun is likely a company name
 */
function isLikelyCompany(text: string): boolean {
  const companyIndicators = /\b(inc|corp|llc|ltd|co|company|technologies|software|systems|labs|studio|group)\b/i;
  return companyIndicators.test(text);
}

/**
 * Clean entity name by removing trailing punctuation and normalizing
 */
function cleanEntityName(name: string): string {
  return name
    .trim()
    .replace(/[.,;:!?]+$/, '') // Remove trailing punctuation
    .replace(/^[.,;:!?]+/, '') // Remove leading punctuation
    .trim();
}

/**
 * Extract company names using compromise NLP
 * Primary extraction method with better NER capabilities
 */
function extractCompanyNamesNLP(text: string): string[] {
  const companies = new Set<string>();

  try {
    const doc = nlp(text);

    // Get organizations detected by compromise
    const orgs = doc.organizations().out('array') as string[];
    orgs.forEach((org: string) => {
      const cleaned = cleanEntityName(org);
      if (cleaned.length >= 2 && !EXCLUSION_LIST.has(cleaned)) {
        companies.add(cleaned);
      }
    });

    // Also check for proper nouns that might be companies
    // (compromise sometimes misses newer companies like HubSpot, Salesforce)
    const properNouns = doc.match('#ProperNoun+').out('array') as string[];
    properNouns.forEach((noun: string) => {
      // Split on commas for lists like "Google, Amazon,"
      const parts = noun.split(/,\s*/);
      for (const part of parts) {
        const cleaned = cleanEntityName(part);
        if (cleaned.length >= 2 && !EXCLUSION_LIST.has(cleaned) && isLikelyCompany(cleaned)) {
          companies.add(cleaned);
        }
      }
    });
  } catch (e) {
    console.warn('[CompetitorDetector] compromise NLP failed:', e);
  }

  return Array.from(companies);
}

/**
 * Extract company names using regex patterns (fallback)
 * Used when NLP misses entities or for specific patterns
 */
function extractCompanyNamesRegex(text: string): string[] {
  const entities = new Set<string>();

  // Pattern 1: Capitalized words (potential brand names)
  const capitalizedPattern = /\b([A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*)?)\b/g;
  let match;

  while ((match = capitalizedPattern.exec(text)) !== null) {
    const entity = cleanEntityName(match[1]);
    if (entity.length >= 2 && !EXCLUSION_LIST.has(entity)) {
      entities.add(entity);
    }
  }

  // Pattern 2: Context-based extraction (competitor mention patterns)
  for (const pattern of COMPETITOR_PATTERNS) {
    const contextMatches = Array.from(text.matchAll(pattern));
    for (const contextMatch of contextMatches) {
      const extracted = contextMatch[1];
      if (extracted) {
        // Split on commas for lists
        const parts = extracted.split(/,\s*|,?\s+and\s+/);
        for (const part of parts) {
          const cleaned = cleanEntityName(part);
          if (cleaned.length >= 2 && !EXCLUSION_LIST.has(cleaned)) {
            entities.add(cleaned);
          }
        }
      }
    }
  }

  return Array.from(entities);
}

/**
 * Extract potential company/entity names from text
 * Uses a tiered approach: compromise NLP (primary) + regex (fallback)
 */
function extractCompanyNames(text: string): string[] {
  const companies = new Set<string>();

  // Primary: compromise NLP for better Named Entity Recognition
  const nlpMatches = extractCompanyNamesNLP(text);
  nlpMatches.forEach(c => companies.add(c));

  // Fallback: regex patterns for known company patterns and edge cases
  const regexMatches = extractCompanyNamesRegex(text);
  regexMatches.forEach(c => companies.add(c));

  return Array.from(companies);
}

/**
 * Calculate confidence score for competitor detection
 */
function calculateConfidence(
  mentionCount: number,
  platformCount: number,
  totalResponses: number,
  totalPlatforms: number
): number {
  // Base confidence from mention frequency
  const mentionRatio = mentionCount / totalResponses;
  const platformRatio = platformCount / totalPlatforms;

  // Weight: 60% mention frequency, 40% platform diversity
  const confidence = mentionRatio * 0.6 + platformRatio * 0.4;

  // Boost if mentioned in multiple platforms
  const boost = platformCount > 1 ? 0.1 : 0;

  return Math.min(1, confidence + boost);
}

/**
 * Auto-detect competitors from response texts
 */
export function detectCompetitors(
  responses: Array<{ text: string; platform: string }>,
  brandName: string,
  options: {
    minMentions?: number;
    minConfidence?: number;
    maxCompetitors?: number;
  } = {}
): DetectedCompetitor[] {
  const {
    minMentions = 2,
    minConfidence = 0.1,
    maxCompetitors = 20,
  } = options;

  const entityCounts = new Map<string, {
    count: number;
    platforms: Set<string>;
  }>();

  // Extract company names from all responses using NLP + regex
  for (const response of responses) {
    const entities = extractCompanyNames(response.text);

    for (const entity of entities) {
      // Skip the brand itself
      if (entity.toLowerCase() === brandName.toLowerCase()) continue;

      if (!entityCounts.has(entity)) {
        entityCounts.set(entity, { count: 0, platforms: new Set() });
      }

      const data = entityCounts.get(entity)!;
      data.count++;
      data.platforms.add(response.platform);
    }
  }

  // Convert to competitor list
  const totalPlatforms = new Set(responses.map(r => r.platform)).size;
  const competitors: DetectedCompetitor[] = [];

  for (const [name, data] of Array.from(entityCounts.entries())) {
    if (data.count < minMentions) continue;

    const confidence = calculateConfidence(
      data.count,
      data.platforms.size,
      responses.length,
      totalPlatforms
    );

    if (confidence < minConfidence) continue;

    competitors.push({
      name,
      mentionCount: data.count,
      platforms: Array.from(data.platforms),
      confidence: Math.round(confidence * 100) / 100,
      source: 'auto-detected',
      isActive: true,
    });
  }

  // Sort by confidence and limit
  competitors.sort((a, b) => b.confidence - a.confidence);
  return competitors.slice(0, maxCompetitors);
}

/**
 * Compare brand against competitors
 */
export function compareCompetitors(
  responses: Array<{ text: string; platform: string; brandMentioned: boolean }>,
  brandName: string,
  competitors: string[]
): CompetitorComparison {
  // Import visibility calculator functions
  const calculateEntityMetrics = (
    responses: Array<{ text: string; platform: string; brandMentioned: boolean }>,
    entityName: string,
    isBrand = false
  ) => {
    const entityResponses = responses.filter(r =>
      (isBrand && r.brandMentioned) || r.text.toLowerCase().includes(entityName.toLowerCase())
    );

    if (entityResponses.length === 0) {
      return {
        visibilityScore: 0,
        mentionRate: 0,
        avgPosition: 0,
        avgSentiment: 0,
      };
    }

    const mentionRate = entityResponses.length / responses.length;

    const terms = isBrand
      ? [entityName.toLowerCase(), entityName.toLowerCase().split(/\s+/)[0]]
      : [entityName.toLowerCase()];
    const positions = entityResponses.map(r => {
      const lower = r.text.toLowerCase();
      const index = Math.min(...terms.map(term => {
        const found = lower.indexOf(term);
        return found >= 0 ? found : Number.MAX_SAFE_INTEGER;
      }));
      return index === Number.MAX_SAFE_INTEGER ? 0.5 : index / r.text.length;
    });
    const avgPosition = 1 - (positions.reduce((s, p) => s + p, 0) / positions.length);

    // Simplified visibility score
    const visibilityScore = Math.round(mentionRate * 40 + avgPosition * 40 + 20);

    return {
      visibilityScore: Math.min(100, visibilityScore),
      mentionRate: Math.round(mentionRate * 100) / 100,
      avgPosition: Math.round(avgPosition * 100) / 100,
      avgSentiment: 0, // Would need sentiment analyzer
    };
  };

  // Calculate brand metrics
  const brandMetrics = calculateEntityMetrics(responses, brandName, true);

  // Calculate competitor metrics
  const competitorMetrics = competitors.map(name => ({
    name,
    ...calculateEntityMetrics(responses, name),
  }));

  // Create ranking
  const allEntities = [
    { name: brandName, score: brandMetrics.visibilityScore, isBrand: true },
    ...competitorMetrics.map(c => ({ name: c.name, score: c.visibilityScore, isBrand: false })),
  ];

  allEntities.sort((a, b) => b.score - a.score);

  const ranking = allEntities.map((e, index) => ({
    ...e,
    rank: index + 1,
  }));

  const brandRank = ranking.find(r => r.isBrand)?.rank || 0;

  // Calculate summary
  const competitorScores = competitorMetrics.map(c => c.visibilityScore);
  const avgCompetitorScore = competitorScores.length > 0
    ? competitorScores.reduce((s, v) => s + v, 0) / competitorScores.length
    : 0;

  return {
    brand: brandName,
    competitors: competitorMetrics,
    ranking,
    brandRank,
    summary: {
      totalCompetitors: competitors.length,
      brandScore: brandMetrics.visibilityScore,
      avgCompetitorScore: Math.round(avgCompetitorScore),
      brandVsAverage: Math.round(brandMetrics.visibilityScore - avgCompetitorScore),
    },
  };
}

/**
 * Full competitor analysis: detect and compare
 */
export function analyzeCompetitors(
  responses: Array<{ text: string; platform: string; brandMentioned: boolean }>,
  brandName: string,
  userCompetitors: string[] = []
): CompetitorAnalysis {
  // Auto-detect competitors
  const detected = detectCompetitors(responses, brandName);

  // Merge with user-provided competitors
  const allCompetitors = [...userCompetitors];
  for (const d of detected) {
    if (!allCompetitors.some(c => c.toLowerCase() === d.name.toLowerCase())) {
      allCompetitors.push(d.name);
    }
  }

  // Compare if we have competitors
  const comparison = allCompetitors.length > 0
    ? compareCompetitors(responses, brandName, allCompetitors)
    : undefined;

  // Mark user-added competitors
  const fullDetected = [
    ...userCompetitors.map(name => ({
      name,
      mentionCount: responses.filter(r => r.text.toLowerCase().includes(name.toLowerCase())).length,
      platforms: Array.from(new Set(
        responses
          .filter(r => r.text.toLowerCase().includes(name.toLowerCase()))
          .map(r => r.platform)
      )),
      confidence: 1,
      source: 'user-added' as const,
      isActive: true,
    })),
    ...detected.filter(d => !userCompetitors.some(u => u.toLowerCase() === d.name.toLowerCase())),
  ];

  return {
    detected: fullDetected,
    comparison,
    metadata: {
      responsesAnalyzed: responses.length,
      uniqueEntitiesFound: detected.length,
      analyzedAt: new Date(),
    },
  };
}
